import type { Id, Score, TeamSide } from '../entities/common';
import { ZERO_SCORE } from '../entities/common';
import type { Lineup, ScoutEvent } from '../entities/event';
import { isRallyAffecting } from '../entities/event';
import type { MatchSettings } from '../entities/settings';
import type { SetState } from '../entities/set';
import type { TerminalResult } from './scoring';
import { applyPoint, isSetWon, isTerminalOutcome, isTieBreakSet, targetForSet } from './scoring';
import { nextServingTeam } from './serving';
import { nextRotationOffset } from './rotation';

export type MatchWarningCode =
  /** A stored set_end no longer matches the recomputed score, so the set was reopened. */
  | 'SET_REOPENED'
  /** An event arrived with no live set and was ignored by the fold. */
  | 'ORPHAN_EVENT';

export interface MatchWarning {
  readonly code: MatchWarningCode;
  readonly setIndex: number | null;
  readonly eventId: Id | null;
}

export interface FoldResult {
  readonly sets: readonly SetState[];
  /** Events with their rally fields recomputed, so the log always agrees with the score. */
  readonly events: readonly ScoutEvent[];
  readonly warnings: readonly MatchWarning[];
}

interface MutableSet {
  index: number;
  status: SetState['status'];
  ourPoints: number;
  theirPoints: number;
  winner: TeamSide | null;
  servingTeam: TeamSide;
  rotationOffset: number;
  lineup: Lineup | null;
  timeoutsUsed: { us: number; them: number };
  substitutionsUsed: number;
  startedAt: string | null;
  endedAt: string | null;
  isTieBreak: boolean;
  target: number;
}

function freeze(set: MutableSet): SetState {
  return {
    index: set.index,
    status: set.status,
    ourPoints: set.ourPoints,
    theirPoints: set.theirPoints,
    winner: set.winner,
    servingTeam: set.servingTeam,
    rotationOffset: set.rotationOffset,
    lineup: set.lineup,
    timeoutsUsed: { us: set.timeoutsUsed.us, them: set.timeoutsUsed.them },
    substitutionsUsed: set.substitutionsUsed,
    startedAt: set.startedAt,
    endedAt: set.endedAt,
    isTieBreak: set.isTieBreak,
    target: set.target,
  };
}

function scoreOf(set: MutableSet): Score {
  return { us: set.ourPoints, them: set.theirPoints };
}

/**
 * Single source of truth: replays the whole event log and derives every set.
 * The fold is authoritative — stored score/serving/rotation fields on events are recomputed,
 * never trusted, so a corrupt or hand-edited log can never desynchronise the scoreboard.
 */
export function foldEvents(
  settings: MatchSettings,
  events: readonly ScoutEvent[],
): FoldResult {
  const sets: MutableSet[] = [];
  const normalised: ScoutEvent[] = [];
  const warnings: MatchWarning[] = [];

  const liveSet = (): MutableSet | null => {
    const last = sets.at(-1);
    return last !== undefined && last.status === 'live' ? last : null;
  };

  const ordered = [...events].sort((a, b) => a.sequence - b.sequence);

  ordered.forEach((event, position) => {
    const sequence = position;

    if (event.type === 'set_start') {
      const index = sets.length;
      sets.push({
        index,
        status: 'live',
        ourPoints: 0,
        theirPoints: 0,
        winner: null,
        servingTeam: event.servingTeam,
        rotationOffset: 0,
        lineup: event.lineup,
        timeoutsUsed: { us: 0, them: 0 },
        substitutionsUsed: 0,
        startedAt: event.timestamp,
        endedAt: null,
        isTieBreak: isTieBreakSet(settings, index),
        target: event.target > 0 ? event.target : targetForSet(settings, index),
      });
      normalised.push({ ...event, sequence, setIndex: index });
      return;
    }

    if (event.type === 'note') {
      // A note may also be written between sets: it attaches to the last started set.
      const lastSet = sets.at(-1);
      if (lastSet === undefined) {
        warnings.push({ code: 'ORPHAN_EVENT', setIndex: null, eventId: event.id });
        return;
      }
      normalised.push({
        ...event,
        sequence,
        setIndex: lastSet.index,
        atScore: scoreOf(lastSet),
      });
      return;
    }

    const set = liveSet();
    if (set === null) {
      warnings.push({ code: 'ORPHAN_EVENT', setIndex: null, eventId: event.id });
      return;
    }

    if (isRallyAffecting(event)) {
      const scoreBefore = scoreOf(set);
      const servingBefore = set.servingTeam;
      const rotationBefore = set.rotationOffset;

      const terminal: TerminalResult =
        event.type === 'rally'
          ? isTerminalOutcome(event.skill, event.outcome)
          : { isTerminal: true, pointTo: event.type === 'our_point' ? 'us' : 'them' };

      if (!terminal.isTerminal || terminal.pointTo === null) {
        // Non-terminal quality event: nothing about the set changes.
        if (event.type === 'rally') {
          normalised.push({
            ...event,
            sequence,
            setIndex: set.index,
            scoreBefore,
            scoreAfter: scoreBefore,
            pointTo: null,
            servingBefore,
            servingAfter: servingBefore,
            rotationBefore,
            rotationAfter: rotationBefore,
            isTerminal: false,
          });
        }
        return;
      }

      const pointTo = terminal.pointTo;
      const scoreAfter = applyPoint(scoreBefore, pointTo);
      const rotationAfter = nextRotationOffset(rotationBefore, servingBefore, pointTo);
      const servingAfter = nextServingTeam(servingBefore, pointTo);

      set.ourPoints = scoreAfter.us;
      set.theirPoints = scoreAfter.them;
      set.rotationOffset = rotationAfter;
      set.servingTeam = servingAfter;

      const rallyFields = {
        sequence,
        setIndex: set.index,
        scoreBefore,
        scoreAfter,
        servingBefore,
        servingAfter,
        rotationBefore,
        rotationAfter,
      } as const;

      if (event.type === 'rally') {
        normalised.push({ ...event, ...rallyFields, pointTo, isTerminal: true });
      } else if (event.type === 'our_point') {
        normalised.push({ ...event, ...rallyFields, pointTo: 'us' });
      } else {
        normalised.push({ ...event, ...rallyFields, pointTo: 'them' });
      }
      return;
    }

    switch (event.type) {
      case 'timeout': {
        set.timeoutsUsed[event.team] += 1;
        normalised.push({ ...event, sequence, setIndex: set.index, atScore: scoreOf(set) });
        return;
      }
      case 'substitution': {
        if (set.lineup !== null && event.lineupSlot >= 0 && event.lineupSlot < 6) {
          set.lineup = replaceInLineup(set.lineup, event.lineupSlot, event.playerInId);
        }
        set.substitutionsUsed += 1;
        normalised.push({ ...event, sequence, setIndex: set.index, atScore: scoreOf(set) });
        return;
      }
      case 'set_end': {
        const winnerStillValid = isSetWon(
          event.winner === 'us' ? set.ourPoints : set.theirPoints,
          event.winner === 'us' ? set.theirPoints : set.ourPoints,
          set.target,
          settings.winByTwo,
        );
        if (!winnerStillValid) {
          // The score changed under an already closed set (an event was edited or deleted):
          // the set stays open and the operator is warned instead of keeping a wrong winner.
          warnings.push({ code: 'SET_REOPENED', setIndex: set.index, eventId: event.id });
          return;
        }
        set.status = 'finished';
        set.winner = event.winner;
        set.endedAt = event.timestamp;

        const setsAfter = countSetsWon(sets);
        normalised.push({
          ...event,
          sequence,
          setIndex: set.index,
          finalScore: scoreOf(set),
          setsAfter,
          endsMatch: isMatchOverWith(setsAfter, settings),
        });
        return;
      }
    }
  });

  return {
    sets: sets.map(freeze),
    events: normalised,
    warnings,
  };
}

/** Replaces one slot of a lineup without losing the six-element tuple type. */
export function replaceInLineup(lineup: Lineup, slot: number, playerId: Id): Lineup {
  return [
    slot === 0 ? playerId : lineup[0],
    slot === 1 ? playerId : lineup[1],
    slot === 2 ? playerId : lineup[2],
    slot === 3 ? playerId : lineup[3],
    slot === 4 ? playerId : lineup[4],
    slot === 5 ? playerId : lineup[5],
  ];
}

function countSetsWon(sets: readonly MutableSet[]): Readonly<Record<TeamSide, number>> {
  let us = 0;
  let them = 0;
  for (const set of sets) {
    if (set.winner === 'us') us += 1;
    if (set.winner === 'them') them += 1;
  }
  return { us, them };
}

function isMatchOverWith(
  setsWon: Readonly<Record<TeamSide, number>>,
  settings: MatchSettings,
): boolean {
  const needed = Math.floor(settings.bestOf / 2) + 1;
  return setsWon.us >= needed || setsWon.them >= needed;
}

export function setsWonFrom(sets: readonly SetState[]): Readonly<Record<TeamSide, number>> {
  let us = 0;
  let them = 0;
  for (const set of sets) {
    if (set.winner === 'us') us += 1;
    if (set.winner === 'them') them += 1;
  }
  return { us, them };
}

export const EMPTY_SCORE: Score = ZERO_SCORE;
