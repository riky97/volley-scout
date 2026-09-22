import type { Id, IsoTimestamp, Score, TeamSide } from './common';

export type Skill = 'serve' | 'reception' | 'attack' | 'block' | 'dig' | 'set';

export type EventOutcome = 'point' | 'positive' | 'neutral' | 'negative' | 'error';

export const SKILLS: readonly Skill[] = [
  'serve',
  'reception',
  'attack',
  'block',
  'dig',
  'set',
] as const;

export const OUTCOMES: readonly EventOutcome[] = [
  'point',
  'positive',
  'neutral',
  'negative',
  'error',
] as const;

/** Combinations the action pad offers. Anything else is rejected at event creation. */
export const ALLOWED_OUTCOMES: Readonly<Record<Skill, readonly EventOutcome[]>> = {
  serve: ['point', 'positive', 'neutral', 'negative', 'error'],
  reception: ['positive', 'neutral', 'negative', 'error'],
  attack: ['point', 'positive', 'neutral', 'negative', 'error'],
  block: ['point', 'positive', 'neutral', 'error'],
  dig: ['positive', 'neutral', 'negative', 'error'],
  set: ['positive', 'neutral', 'negative', 'error'],
} as const;

export function isAllowedOutcome(skill: Skill, outcome: EventOutcome): boolean {
  return ALLOWED_OUTCOMES[skill].includes(outcome);
}

/** Rotational positions, volleyball numbering. P1 = right back and serving position. */
export type CourtPosition = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6';

export const COURT_POSITIONS: readonly CourtPosition[] = [
  'P1',
  'P2',
  'P3',
  'P4',
  'P5',
  'P6',
] as const;

/**
 * Six player ids in *initial* court order: index 0 started the set in P1, index 5 in P6.
 * The array never rotates; rotation is expressed by SetState.rotationOffset.
 * A substitution replaces the id in place, at the slot of the outgoing player.
 */
export type Lineup = readonly [Id, Id, Id, Id, Id, Id];

interface ScoutEventBase {
  readonly id: Id;
  readonly timestamp: IsoTimestamp;
  /** 0-based set this event belongs to. */
  readonly setIndex: number;
  /** Monotonic position in the match-wide log, re-densified after a delete. */
  readonly sequence: number;
}

/** Fields that make the log self-describing for every rally-affecting event. */
export interface RallyAffecting {
  readonly scoreBefore: Score;
  readonly scoreAfter: Score;
  /** Which side got the point; null while the rally continues. */
  readonly pointTo: TeamSide | null;
  readonly servingBefore: TeamSide;
  readonly servingAfter: TeamSide;
  readonly rotationBefore: number;
  readonly rotationAfter: number;
}

export interface RallyEvent extends ScoutEventBase, RallyAffecting {
  readonly type: 'rally';
  /** Acting player of our team. */
  readonly playerId: Id;
  readonly skill: Skill;
  readonly outcome: EventOutcome;
  /** Mirrors pointTo !== null. */
  readonly isTerminal: boolean;
  readonly comment: string;
}

/** Opponent winner, or any point we do not attribute to one of our players. */
export interface OpponentPointEvent extends ScoutEventBase, RallyAffecting {
  readonly type: 'opponent_point';
  readonly pointTo: 'them';
  readonly comment: string;
}

/** Point won by us with no detail recorded: keeps the scoreboard fast when detail is not needed. */
export interface OurPointEvent extends ScoutEventBase, RallyAffecting {
  readonly type: 'our_point';
  readonly pointTo: 'us';
  readonly comment: string;
}

export interface TimeoutEvent extends ScoutEventBase {
  readonly type: 'timeout';
  readonly team: TeamSide;
  readonly atScore: Score;
}

export interface SubstitutionEvent extends ScoutEventBase {
  readonly type: 'substitution';
  readonly playerOutId: Id;
  readonly playerInId: Id;
  /** Lineup slot (0..5) that changed. */
  readonly lineupSlot: number;
  readonly atScore: Score;
}

export interface SetStartEvent extends ScoutEventBase {
  readonly type: 'set_start';
  readonly lineup: Lineup;
  readonly servingTeam: TeamSide;
  /** Points needed to win this set, frozen at start. */
  readonly target: number;
}

export interface SetEndEvent extends ScoutEventBase {
  readonly type: 'set_end';
  readonly winner: TeamSide;
  readonly finalScore: Score;
  /** Sets won by each side after this set closed. */
  readonly setsAfter: Readonly<Record<TeamSide, number>>;
  readonly endsMatch: boolean;
}

export interface NoteEvent extends ScoutEventBase {
  readonly type: 'note';
  readonly text: string;
  readonly atScore: Score;
}

export type ScoutEvent =
  | RallyEvent
  | OurPointEvent
  | OpponentPointEvent
  | TimeoutEvent
  | SubstitutionEvent
  | SetStartEvent
  | SetEndEvent
  | NoteEvent;

export type ScoutEventType = ScoutEvent['type'];

export function isRallyAffecting(
  event: ScoutEvent,
): event is RallyEvent | OurPointEvent | OpponentPointEvent {
  return event.type === 'rally' || event.type === 'our_point' || event.type === 'opponent_point';
}
