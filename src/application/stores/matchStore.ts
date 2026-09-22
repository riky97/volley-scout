import { create } from 'zustand';
import type {
  EventOutcome,
  Id,
  Lineup,
  Match,
  MatchInfo,
  MatchSettings,
  MatchSnapshot,
  Player,
  ScoutEvent,
  Skill,
  TeamSide,
} from '@domain/index';
import {
  DomainError,
  abandonMatch,
  appendNote,
  appendOpponentPoint,
  appendOurPoint,
  appendRallyEvent,
  appendSubstitution,
  appendTimeout,
  buildSnapshot,
  canUndo,
  deleteEvent as deleteEventRule,
  editEvent as editEventRule,
  endMatch,
  endSet,
  isDomainError,
  redoEvent,
  removeSet as removeSetRule,
  reopenMatch,
  startSet as startSetRule,
  undoLastEvent,
} from '@domain/index';
import type { EventPatch } from '@domain/rules/undo';
import { createRepository } from '@infrastructure/storage';
import type { LoadOutcome } from '@infrastructure/storage';
import type { SaveState } from '../services/saveQueue';
import { SaveQueue } from '../services/saveQueue';
import { newId, nowIso } from '../clock';

const repository = createRepository();

export interface MatchStoreState {
  readonly match: Match | null;
  readonly snapshot: MatchSnapshot | null;
  readonly saveState: SaveState;
  /** Domain error code of the last rejected action; the UI turns it into Italian copy. */
  readonly lastErrorCode: string | null;
  readonly redoBuffer: ScoutEvent | null;
  readonly isLoading: boolean;

  setMatch: (match: Match) => void;
  loadMatch: (id: Id) => Promise<LoadOutcome<Match>>;
  resumeLastMatch: () => Promise<boolean>;
  clearMatch: () => void;
  clearError: () => void;

  updateInfo: (info: MatchInfo) => void;
  updateSettings: (settings: MatchSettings) => void;
  updateRoster: (roster: readonly Player[]) => void;

  startSet: (lineup: Lineup, servingTeam?: TeamSide) => void;
  recordRally: (input: {
    playerId: Id;
    skill: Skill;
    outcome: EventOutcome;
    comment?: string;
  }) => void;
  recordOurPoint: () => void;
  recordOpponentPoint: () => void;
  recordTimeout: (team: TeamSide) => void;
  recordSubstitution: (playerOutId: Id, playerInId: Id) => void;
  addNote: (text: string) => void;

  endCurrentSet: () => void;
  finishMatch: () => void;
  abandonCurrentMatch: () => void;
  reopenCurrentMatch: () => void;

  undo: () => void;
  redo: () => void;
  deleteEvent: (eventId: Id) => void;
  editEvent: (eventId: Id, patch: EventPatch) => void;
  removeSet: (setIndex: number) => void;

  flushPendingSave: () => Promise<void>;
  hasUnsavedChanges: () => boolean;
}

const saveQueue = new SaveQueue<Match>(
  async (match) => {
    await repository.saveMatch(match);
  },
  (state, error) => {
    useMatchStore.setState({ saveState: state });
    if (state === 'error') {
      // Logged locally only; nothing leaves the machine.
      console.error('Match save failed', error);
    }
  },
);

/** Applies a new match version: updates the projection and persists it. */
function commit(match: Match, critical: boolean): void {
  useMatchStore.setState({
    match,
    snapshot: buildSnapshot(match),
    lastErrorCode: null,
  });
  if (critical) saveQueue.flushNow(match);
  else saveQueue.schedule(match);
}

/** Runs a domain mutation, turning a DomainError into a displayable code instead of a crash. */
function mutate(run: (match: Match) => Match, critical = true): void {
  const current = useMatchStore.getState().match;
  if (current === null) return;
  try {
    commit(run(current), critical);
  } catch (error) {
    if (isDomainError(error)) {
      useMatchStore.setState({ lastErrorCode: error.code });
      return;
    }
    throw error;
  }
}

export const useMatchStore = create<MatchStoreState>((set, get) => ({
  match: null,
  snapshot: null,
  saveState: 'idle',
  lastErrorCode: null,
  redoBuffer: null,
  isLoading: false,

  setMatch: (match) => {
    set({ match, snapshot: buildSnapshot(match), redoBuffer: null, lastErrorCode: null });
    saveQueue.flushNow(match);
  },

  loadMatch: async (id) => {
    set({ isLoading: true });
    const outcome = await repository.loadMatch(id);
    if (outcome.kind === 'ok') {
      set({
        match: outcome.value,
        snapshot: buildSnapshot(outcome.value),
        redoBuffer: null,
        lastErrorCode: null,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
    return outcome;
  },

  resumeLastMatch: async () => {
    set({ isLoading: true });
    const match = await repository.findResumableMatch();
    if (match === null) {
      set({ isLoading: false });
      return false;
    }
    set({
      match,
      snapshot: buildSnapshot(match),
      redoBuffer: null,
      lastErrorCode: null,
      isLoading: false,
    });
    return true;
  },

  clearMatch: () => {
    set({ match: null, snapshot: null, redoBuffer: null, lastErrorCode: null });
  },

  clearError: () => {
    set({ lastErrorCode: null });
  },

  updateInfo: (info) => {
    mutate((match) => ({ ...match, info, updatedAt: nowIso() }), false);
  },

  updateSettings: (settings) => {
    mutate((match) => {
      if (match.status !== 'setup') throw new DomainError('SETTINGS_LOCKED');
      return { ...match, settings, updatedAt: nowIso() };
    }, false);
  },

  updateRoster: (roster) => {
    mutate((match) => ({ ...match, roster, updatedAt: nowIso() }), false);
  },

  startSet: (lineup, servingTeam) => {
    mutate((match) =>
      startSetRule({ match, lineup, servingTeam, id: newId(), timestamp: nowIso() }),
    );
  },

  recordRally: (input) => {
    set({ redoBuffer: null });
    mutate((match) =>
      appendRallyEvent({
        match,
        playerId: input.playerId,
        skill: input.skill,
        outcome: input.outcome,
        comment: input.comment,
        id: newId(),
        timestamp: nowIso(),
      }),
    );
  },

  recordOurPoint: () => {
    set({ redoBuffer: null });
    mutate((match) => appendOurPoint({ match, id: newId(), timestamp: nowIso() }));
  },

  recordOpponentPoint: () => {
    set({ redoBuffer: null });
    mutate((match) => appendOpponentPoint({ match, id: newId(), timestamp: nowIso() }));
  },

  recordTimeout: (team) => {
    mutate((match) => appendTimeout({ match, team, id: newId(), timestamp: nowIso() }));
  },

  recordSubstitution: (playerOutId, playerInId) => {
    mutate((match) =>
      appendSubstitution({ match, playerOutId, playerInId, id: newId(), timestamp: nowIso() }),
    );
  },

  addNote: (text) => {
    mutate((match) => appendNote({ match, text, id: newId(), timestamp: nowIso() }));
  },

  endCurrentSet: () => {
    mutate((match) => endSet(match, newId(), nowIso()));
  },

  finishMatch: () => {
    mutate((match) => endMatch(match, nowIso()));
  },

  abandonCurrentMatch: () => {
    mutate((match) => abandonMatch(match, nowIso()));
  },

  reopenCurrentMatch: () => {
    mutate((match) => reopenMatch(match, nowIso()));
  },

  undo: () => {
    const current = get().match;
    // Buffering the last event unconditionally would let redo re-append an event that undo
    // refused to pop — a set_start, which would start a second live set.
    if (current === null || !canUndo(current)) return;
    const last = current.events.at(-1) ?? null;
    mutate((match) => undoLastEvent(match, nowIso()));
    set({ redoBuffer: last });
  },

  redo: () => {
    const buffered = get().redoBuffer;
    if (buffered === null) return;
    mutate((match) => redoEvent(match, buffered, nowIso()));
    set({ redoBuffer: null });
  },

  deleteEvent: (eventId) => {
    set({ redoBuffer: null });
    mutate((match) => deleteEventRule(match, eventId, nowIso()));
  },

  editEvent: (eventId, patch) => {
    set({ redoBuffer: null });
    mutate((match) => editEventRule(match, eventId, patch, nowIso()));
  },

  removeSet: (setIndex) => {
    set({ redoBuffer: null });
    mutate((match) => removeSetRule(match, setIndex, nowIso()));
  },

  flushPendingSave: async () => {
    await saveQueue.waitForIdle();
  },

  hasUnsavedChanges: () => saveQueue.hasPendingWork,
}));

export { repository };
