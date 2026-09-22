import type { Id, IsoTimestamp } from '../entities/common';
import type { EventOutcome, ScoutEvent, Skill } from '../entities/event';
import { isAllowedOutcome } from '../entities/event';
import type { Match } from '../entities/match';
import { isMatchClosed } from '../entities/match';
import { DomainError } from '../errors';
import { rebuildMatch } from './lifecycle';

/** A set_start is never undone by the undo button: it would orphan a whole set. */
export function isUndoable(event: ScoutEvent): boolean {
  return event.type !== 'set_start';
}

export function lastEventOf(match: Match): ScoutEvent | null {
  return match.events.at(-1) ?? null;
}

export function canUndo(match: Match): boolean {
  if (isMatchClosed(match)) return false;
  const last = lastEventOf(match);
  return last !== null && isUndoable(last);
}

/** Pops the last event and refolds the match from scratch. */
export function undoLastEvent(match: Match, timestamp: IsoTimestamp): Match {
  if (!canUndo(match)) return match;
  return rebuildMatch({ ...match, events: match.events.slice(0, -1) }, timestamp);
}

/** Re-appends an event that was just undone. The caller keeps the single-slot redo buffer. */
export function redoEvent(match: Match, event: ScoutEvent, timestamp: IsoTimestamp): Match {
  if (isMatchClosed(match)) throw new DomainError('MATCH_CLOSED');
  // Only events undo can pop may come back: re-appending a set_start would open a second set.
  if (!isUndoable(event)) throw new DomainError('SET_ALREADY_LIVE');
  return rebuildMatch(
    { ...match, events: [...match.events, { ...event, sequence: match.events.length }] },
    timestamp,
  );
}

function densify(events: readonly ScoutEvent[]): readonly ScoutEvent[] {
  return events.map((event, index) => ({ ...event, sequence: index }));
}

/** Events that belong to the same set as the given set_start, that one included. */
export function eventsOfSetStartingAt(
  events: readonly ScoutEvent[],
  setStartId: Id,
): readonly ScoutEvent[] {
  const startIndex = events.findIndex((event) => event.id === setStartId);
  if (startIndex < 0) return [];
  const nextStart = events.findIndex(
    (event, index) => index > startIndex && event.type === 'set_start',
  );
  const endIndex = nextStart < 0 ? events.length : nextStart;
  return events.slice(startIndex, endIndex);
}

/** How many later events a deletion would recompute; shown in the confirmation dialog. */
export function affectedEventCount(match: Match, eventId: Id): number {
  const index = match.events.findIndex((event) => event.id === eventId);
  if (index < 0) return 0;
  return match.events.length - index - 1;
}

export function deleteEvent(match: Match, eventId: Id, timestamp: IsoTimestamp): Match {
  const target = match.events.find((event) => event.id === eventId);
  if (target === undefined) throw new DomainError('EVENT_NOT_FOUND');
  if (isMatchClosed(match)) throw new DomainError('MATCH_CLOSED');

  const removedIds =
    target.type === 'set_start'
      ? new Set(eventsOfSetStartingAt(match.events, eventId).map((event) => event.id))
      : new Set([eventId]);

  const remaining = match.events.filter((event) => !removedIds.has(event.id));
  return rebuildMatch({ ...match, events: densify(remaining) }, timestamp);
}

/** Removes a whole set: its set_start and every event recorded in it. */
export function removeSet(match: Match, setIndex: number, timestamp: IsoTimestamp): Match {
  if (isMatchClosed(match)) throw new DomainError('MATCH_CLOSED');
  const setStart = match.events.find(
    (event) => event.type === 'set_start' && event.setIndex === setIndex,
  );
  if (setStart === undefined) throw new DomainError('EVENT_NOT_FOUND');
  return deleteEvent(match, setStart.id, timestamp);
}

export interface EventPatch {
  readonly playerId?: Id;
  readonly skill?: Skill;
  readonly outcome?: EventOutcome;
  readonly comment?: string;
  readonly text?: string;
}

/**
 * Edits one event and refolds: every later event gets its score, serving team and rotation
 * recomputed, which may even change who won a set.
 */
export function editEvent(
  match: Match,
  eventId: Id,
  patch: EventPatch,
  timestamp: IsoTimestamp,
): Match {
  if (isMatchClosed(match)) throw new DomainError('MATCH_CLOSED');
  const index = match.events.findIndex((event) => event.id === eventId);
  if (index < 0) throw new DomainError('EVENT_NOT_FOUND');
  const target = match.events[index];
  if (target === undefined) throw new DomainError('EVENT_NOT_FOUND');

  let updated: ScoutEvent;
  switch (target.type) {
    case 'rally': {
      const skill = patch.skill ?? target.skill;
      const outcome = patch.outcome ?? target.outcome;
      if (!isAllowedOutcome(skill, outcome)) throw new DomainError('INVALID_OUTCOME');
      const playerId = patch.playerId ?? target.playerId;
      if (!match.roster.some((player) => player.id === playerId)) {
        throw new DomainError('PLAYER_NOT_IN_ROSTER');
      }
      updated = {
        ...target,
        playerId,
        skill,
        outcome,
        comment: patch.comment ?? target.comment,
      };
      break;
    }
    case 'opponent_point':
    case 'our_point':
      updated = { ...target, comment: patch.comment ?? target.comment };
      break;
    case 'note':
      updated = { ...target, text: patch.text ?? target.text };
      break;
    case 'timeout':
    case 'substitution':
    case 'set_start':
    case 'set_end':
      // Structural events are removed and re-created, never patched in place.
      throw new DomainError('EVENT_NOT_FOUND');
  }

  const events = [...match.events];
  events[index] = updated;
  return rebuildMatch({ ...match, events }, timestamp);
}
