import type { Id, IsoTimestamp, TeamSide } from '../entities/common';
import type { EventOutcome, Lineup, ScoutEvent, Skill } from '../entities/event';
import { isAllowedOutcome } from '../entities/event';
import type { Match } from '../entities/match';
import { isMatchClosed } from '../entities/match';
import type { SetState } from '../entities/set';
import { DomainError } from '../errors';
import { foldEvents, setsWonFrom } from './fold';
import { evaluateSetEnd, isMatchWon, targetForSet } from './scoring';
import { isPlayerOnCourt, slotAtPosition } from './rotation';
import { firstServerOfSet } from './serving';
import { COURT_POSITIONS } from '../entities/event';

/** Rebuilds sets, event fields and status from the event log. Every mutator ends with this. */
export function rebuildMatch(match: Match, timestamp: IsoTimestamp): Match {
  const folded = foldEvents(match.settings, match.events);
  const hasClosingSetEnd = folded.events.some(
    (event) => event.type === 'set_end' && event.endsMatch,
  );

  let status = match.status;
  if (match.status !== 'abandoned') {
    if (folded.sets.length === 0) {
      status = 'setup';
    } else if (match.status === 'finished' && !hasClosingSetEnd) {
      // An undo or an edit invalidated the result: the match goes back to being playable.
      status = 'live';
    } else if (match.status === 'setup') {
      status = 'live';
    }
  }

  return {
    ...match,
    status,
    sets: folded.sets,
    events: folded.events,
    updatedAt: timestamp,
    closedAt: status === 'finished' || status === 'abandoned' ? match.closedAt : null,
  };
}

export function currentSetOf(match: Match): SetState | null {
  return match.sets.at(-1) ?? null;
}

export function liveSetOf(match: Match): SetState | null {
  const set = currentSetOf(match);
  return set !== null && set.status === 'live' ? set : null;
}

function assertOpen(match: Match): void {
  if (isMatchClosed(match)) throw new DomainError('MATCH_CLOSED');
}

function requireLiveSet(match: Match): SetState {
  const set = liveSetOf(match);
  if (set === null) throw new DomainError('NO_LIVE_SET');
  return set;
}

function nextSequence(match: Match): number {
  return match.events.length;
}

function append(match: Match, event: ScoutEvent, timestamp: IsoTimestamp): Match {
  return rebuildMatch({ ...match, events: [...match.events, event] }, timestamp);
}

export interface StartSetInput {
  readonly match: Match;
  readonly lineup: Lineup;
  /** Defaults to the alternating first server when omitted. */
  readonly servingTeam?: TeamSide | undefined;
  readonly id: Id;
  readonly timestamp: IsoTimestamp;
}

export function startSet(input: StartSetInput): Match {
  const { match, lineup, id, timestamp } = input;
  assertOpen(match);

  const current = currentSetOf(match);
  if (current !== null && current.status === 'live') {
    throw new DomainError('SET_ALREADY_LIVE');
  }

  const setsWon = setsWonFrom(match.sets);
  if (isMatchWon(setsWon.us, match.settings.bestOf) || isMatchWon(setsWon.them, match.settings.bestOf)) {
    throw new DomainError('MATCH_ALREADY_WON');
  }

  validateLineup(match, lineup);

  const setIndex = match.sets.length;
  const event: ScoutEvent = {
    type: 'set_start',
    id,
    timestamp,
    setIndex,
    sequence: nextSequence(match),
    lineup,
    servingTeam: input.servingTeam ?? firstServerOfSet(match.settings, setIndex),
    target: targetForSet(match.settings, setIndex),
  };
  return append(match, event, timestamp);
}

export function validateLineup(match: Match, lineup: Lineup): void {
  if (lineup.length !== 6) throw new DomainError('INVALID_LINEUP');
  const unique = new Set(lineup);
  if (unique.size !== 6) throw new DomainError('INVALID_LINEUP');
  for (const playerId of lineup) {
    const player = match.roster.find((candidate) => candidate.id === playerId);
    if (player === undefined) throw new DomainError('PLAYER_NOT_IN_ROSTER');
    if (!player.isAvailable) throw new DomainError('PLAYER_UNAVAILABLE');
  }
}

export interface AppendRallyInput {
  readonly match: Match;
  readonly playerId: Id;
  readonly skill: Skill;
  readonly outcome: EventOutcome;
  readonly comment?: string | undefined;
  readonly id: Id;
  readonly timestamp: IsoTimestamp;
}

export function appendRallyEvent(input: AppendRallyInput): Match {
  const { match, playerId, skill, outcome, id, timestamp } = input;
  assertOpen(match);
  const set = requireLiveSet(match);

  if (!isAllowedOutcome(skill, outcome)) throw new DomainError('INVALID_OUTCOME');
  if (!match.roster.some((player) => player.id === playerId)) {
    throw new DomainError('PLAYER_NOT_IN_ROSTER');
  }

  const event: ScoutEvent = {
    type: 'rally',
    id,
    timestamp,
    setIndex: set.index,
    sequence: nextSequence(match),
    playerId,
    skill,
    outcome,
    comment: input.comment ?? '',
    // The fold recomputes every field below; these are placeholders for a well-formed object.
    isTerminal: false,
    pointTo: null,
    scoreBefore: { us: set.ourPoints, them: set.theirPoints },
    scoreAfter: { us: set.ourPoints, them: set.theirPoints },
    servingBefore: set.servingTeam,
    servingAfter: set.servingTeam,
    rotationBefore: set.rotationOffset,
    rotationAfter: set.rotationOffset,
  };
  return append(match, event, timestamp);
}

export interface AppendOpponentPointInput {
  readonly match: Match;
  readonly comment?: string | undefined;
  readonly id: Id;
  readonly timestamp: IsoTimestamp;
}

export function appendOpponentPoint(input: AppendOpponentPointInput): Match {
  const { match, id, timestamp } = input;
  assertOpen(match);
  const set = requireLiveSet(match);

  const event: ScoutEvent = {
    type: 'opponent_point',
    id,
    timestamp,
    setIndex: set.index,
    sequence: nextSequence(match),
    comment: input.comment ?? '',
    pointTo: 'them',
    scoreBefore: { us: set.ourPoints, them: set.theirPoints },
    scoreAfter: { us: set.ourPoints, them: set.theirPoints + 1 },
    servingBefore: set.servingTeam,
    servingAfter: 'them',
    rotationBefore: set.rotationOffset,
    rotationAfter: set.rotationOffset,
  };
  return append(match, event, timestamp);
}

export interface AppendOurPointInput {
  readonly match: Match;
  readonly comment?: string | undefined;
  readonly id: Id;
  readonly timestamp: IsoTimestamp;
}

/** A point for us with no detail: the fastest way to keep the scoreboard true. */
export function appendOurPoint(input: AppendOurPointInput): Match {
  const { match, id, timestamp } = input;
  assertOpen(match);
  const set = requireLiveSet(match);

  const event: ScoutEvent = {
    type: 'our_point',
    id,
    timestamp,
    setIndex: set.index,
    sequence: nextSequence(match),
    comment: input.comment ?? '',
    pointTo: 'us',
    scoreBefore: { us: set.ourPoints, them: set.theirPoints },
    scoreAfter: { us: set.ourPoints + 1, them: set.theirPoints },
    servingBefore: set.servingTeam,
    servingAfter: 'us',
    rotationBefore: set.rotationOffset,
    rotationAfter: set.rotationOffset,
  };
  return append(match, event, timestamp);
}

export interface AppendTimeoutInput {
  readonly match: Match;
  readonly team: TeamSide;
  readonly id: Id;
  readonly timestamp: IsoTimestamp;
}

export function appendTimeout(input: AppendTimeoutInput): Match {
  const { match, team, id, timestamp } = input;
  assertOpen(match);
  const set = requireLiveSet(match);

  const event: ScoutEvent = {
    type: 'timeout',
    id,
    timestamp,
    setIndex: set.index,
    sequence: nextSequence(match),
    team,
    atScore: { us: set.ourPoints, them: set.theirPoints },
  };
  return append(match, event, timestamp);
}

export interface AppendSubstitutionInput {
  readonly match: Match;
  readonly playerOutId: Id;
  readonly playerInId: Id;
  readonly id: Id;
  readonly timestamp: IsoTimestamp;
}

export function appendSubstitution(input: AppendSubstitutionInput): Match {
  const { match, playerOutId, playerInId, id, timestamp } = input;
  assertOpen(match);
  const set = requireLiveSet(match);

  if (set.lineup === null) throw new DomainError('INVALID_LINEUP');
  if (!isPlayerOnCourt(set, playerOutId)) throw new DomainError('PLAYER_NOT_ON_COURT');
  if (isPlayerOnCourt(set, playerInId)) throw new DomainError('PLAYER_ALREADY_ON_COURT');

  const incoming = match.roster.find((player) => player.id === playerInId);
  if (incoming === undefined) throw new DomainError('PLAYER_NOT_IN_ROSTER');
  if (!incoming.isAvailable) throw new DomainError('PLAYER_UNAVAILABLE');

  const lineupSlot = set.lineup.indexOf(playerOutId);
  if (lineupSlot < 0) throw new DomainError('PLAYER_NOT_ON_COURT');

  const event: ScoutEvent = {
    type: 'substitution',
    id,
    timestamp,
    setIndex: set.index,
    sequence: nextSequence(match),
    playerOutId,
    playerInId,
    lineupSlot,
    atScore: { us: set.ourPoints, them: set.theirPoints },
  };
  return append(match, event, timestamp);
}

export interface AppendNoteInput {
  readonly match: Match;
  readonly text: string;
  readonly id: Id;
  readonly timestamp: IsoTimestamp;
}

/** Notes are allowed between sets too: they attach to the last started set. */
export function appendNote(input: AppendNoteInput): Match {
  const { match, text, id, timestamp } = input;
  assertOpen(match);
  const set = currentSetOf(match);
  if (set === null) throw new DomainError('NO_LIVE_SET');

  const event: ScoutEvent = {
    type: 'note',
    id,
    timestamp,
    setIndex: set.index,
    sequence: nextSequence(match),
    text,
    atScore: { us: set.ourPoints, them: set.theirPoints },
  };
  return append(match, event, timestamp);
}

/** Closes the live set. The caller must have confirmed with the operator first. */
export function endSet(match: Match, id: Id, timestamp: IsoTimestamp): Match {
  assertOpen(match);
  const set = requireLiveSet(match);

  const winner = evaluateSetEnd(set, match.settings);
  if (winner === null) throw new DomainError('NO_LIVE_SET');

  const setsAfter = countAfter(setsWonFrom(match.sets), winner);
  const event: ScoutEvent = {
    type: 'set_end',
    id,
    timestamp,
    setIndex: set.index,
    sequence: nextSequence(match),
    winner,
    finalScore: { us: set.ourPoints, them: set.theirPoints },
    setsAfter,
    endsMatch: isMatchWon(setsAfter[winner], match.settings.bestOf),
  };
  return append(match, event, timestamp);
}

function countAfter(
  before: Readonly<Record<TeamSide, number>>,
  winner: TeamSide,
): Readonly<Record<TeamSide, number>> {
  return winner === 'us'
    ? { us: before.us + 1, them: before.them }
    : { us: before.us, them: before.them + 1 };
}

export function matchWinnerOf(match: Match): TeamSide | null {
  const setsWon = setsWonFrom(match.sets);
  if (isMatchWon(setsWon.us, match.settings.bestOf)) return 'us';
  if (isMatchWon(setsWon.them, match.settings.bestOf)) return 'them';
  return null;
}

export function endMatch(match: Match, timestamp: IsoTimestamp): Match {
  assertOpen(match);
  if (matchWinnerOf(match) === null) throw new DomainError('NO_LIVE_SET');
  return { ...match, status: 'finished', closedAt: timestamp, updatedAt: timestamp };
}

/** Closes a match that was interrupted, with no winner. */
export function abandonMatch(match: Match, timestamp: IsoTimestamp): Match {
  assertOpen(match);
  return { ...match, status: 'abandoned', closedAt: timestamp, updatedAt: timestamp };
}

export function reopenMatch(match: Match, timestamp: IsoTimestamp): Match {
  if (!isMatchClosed(match)) return match;
  return { ...match, status: 'live', closedAt: null, updatedAt: timestamp };
}

/** The lineup slot currently standing in each court position, for the substitution dialog. */
export function courtSlots(set: SetState): readonly number[] {
  return COURT_POSITIONS.map((position) => slotAtPosition(set.rotationOffset, position));
}
