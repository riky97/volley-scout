import type { Id } from '../entities/common';
import type { EventOutcome, RallyEvent, ScoutEvent, Skill } from '../entities/event';
import { isAllowedOutcome } from '../entities/event';
import type { Match } from '../entities/match';

/** null means "no denominator", rendered as N/D. Never 0, never NaN. */
export type Ratio = number | null;

export function safeRatio(numerator: number, denominator: number): Ratio {
  return denominator === 0 ? null : numerator / denominator;
}

export type StatsScope =
  | { readonly kind: 'match' }
  | { readonly kind: 'set'; readonly setIndex: number };

export interface PlayerStatistics {
  readonly playerId: Id;
  /** false when the id is no longer in the roster. */
  readonly isKnownPlayer: boolean;

  readonly totalActions: number;
  readonly points: number;
  readonly errors: number;

  readonly attackAttempts: number;
  readonly kills: number;
  readonly attackErrors: number;
  readonly attackEfficiency: Ratio;
  readonly killRate: Ratio;

  readonly serves: number;
  readonly aces: number;
  readonly serveErrors: number;
  readonly aceRate: Ratio;
  readonly serveErrorRate: Ratio;

  readonly receptions: number;
  readonly positiveReceptions: number;
  readonly negativeReceptions: number;
  readonly receptionErrors: number;
  readonly receptionPositivity: Ratio;
  readonly receptionErrorRate: Ratio;

  readonly blockPoints: number;
  readonly blockErrors: number;
  readonly digs: number;
  readonly digErrors: number;
  /** Actions with the `set` skill, not won sets. */
  readonly sets: number;
  readonly setErrors: number;
}

export interface TeamStatistics {
  readonly scope: StatsScope;
  readonly totalActions: number;
  readonly pointsScored: number;
  readonly pointsConceded: number;
  readonly pointsFromActions: number;
  readonly errors: number;
  readonly opponentPoints: number;
  readonly attackAttempts: number;
  readonly kills: number;
  readonly attackErrors: number;
  readonly attackEfficiency: Ratio;
  readonly serves: number;
  readonly aces: number;
  readonly serveErrors: number;
  readonly receptions: number;
  readonly positiveReceptions: number;
  readonly negativeReceptions: number;
  readonly receptionPositivity: Ratio;
  readonly blockPoints: number;
  readonly timeoutsUsed: number;
  readonly substitutionsUsed: number;
}

export interface MatchStatistics {
  readonly team: TeamStatistics;
  readonly players: readonly PlayerStatistics[];
  /** Indexed by set index. */
  readonly perSetTeam: readonly TeamStatistics[];
  readonly perSetPlayers: readonly (readonly PlayerStatistics[])[];
}

/** Only valid rally events feed the per-skill counters. */
function isCountableRally(event: ScoutEvent): event is RallyEvent {
  return event.type === 'rally' && isAllowedOutcome(event.skill, event.outcome);
}

function countRally(
  events: readonly ScoutEvent[],
  predicate: (event: RallyEvent) => boolean,
): number {
  let total = 0;
  for (const event of events) {
    if (isCountableRally(event) && predicate(event)) total += 1;
  }
  return total;
}

const bySkill =
  (skill: Skill, outcomes?: readonly EventOutcome[]) =>
  (event: RallyEvent): boolean =>
    event.skill === skill && (outcomes === undefined || outcomes.includes(event.outcome));

export function computePlayerStatistics(
  events: readonly ScoutEvent[],
  playerId: Id,
  isKnownPlayer: boolean,
): PlayerStatistics {
  const own = events.filter(
    (event): event is RallyEvent => isCountableRally(event) && event.playerId === playerId,
  );

  const count = (predicate: (event: RallyEvent) => boolean): number =>
    countRally(own, predicate);

  const attackAttempts = count(bySkill('attack'));
  const kills = count(bySkill('attack', ['point']));
  const attackErrors = count(bySkill('attack', ['error']));

  const serves = count(bySkill('serve'));
  const aces = count(bySkill('serve', ['point']));
  const serveErrors = count(bySkill('serve', ['error']));

  const receptions = count(bySkill('reception'));
  const positiveReceptions = count(bySkill('reception', ['positive']));
  const negativeReceptions = count(bySkill('reception', ['negative', 'error']));
  const receptionErrors = count(bySkill('reception', ['error']));

  return {
    playerId,
    isKnownPlayer,
    totalActions: own.length,
    points: count((event) => event.outcome === 'point'),
    errors: count((event) => event.outcome === 'error'),
    attackAttempts,
    kills,
    attackErrors,
    attackEfficiency: safeRatio(kills - attackErrors, attackAttempts),
    killRate: safeRatio(kills, attackAttempts),
    serves,
    aces,
    serveErrors,
    aceRate: safeRatio(aces, serves),
    serveErrorRate: safeRatio(serveErrors, serves),
    receptions,
    positiveReceptions,
    negativeReceptions,
    receptionErrors,
    receptionPositivity: safeRatio(positiveReceptions, receptions),
    receptionErrorRate: safeRatio(receptionErrors, receptions),
    blockPoints: count(bySkill('block', ['point'])),
    blockErrors: count(bySkill('block', ['error'])),
    digs: count(bySkill('dig')),
    digErrors: count(bySkill('dig', ['error'])),
    sets: count(bySkill('set')),
    setErrors: count(bySkill('set', ['error'])),
  };
}

export interface TeamStatisticsInput {
  readonly events: readonly ScoutEvent[];
  readonly scope: StatsScope;
  readonly pointsScored: number;
  readonly pointsConceded: number;
}

export function computeTeamStatistics(input: TeamStatisticsInput): TeamStatistics {
  const { events, scope } = input;
  const count = (predicate: (event: RallyEvent) => boolean): number =>
    countRally(events, predicate);

  const attackAttempts = count(bySkill('attack'));
  const kills = count(bySkill('attack', ['point']));
  const attackErrors = count(bySkill('attack', ['error']));
  const receptions = count(bySkill('reception'));
  const positiveReceptions = count(bySkill('reception', ['positive']));

  return {
    scope,
    // Invalid rally events still count as actions performed.
    totalActions: events.filter((event) => event.type === 'rally').length,
    pointsScored: input.pointsScored,
    pointsConceded: input.pointsConceded,
    // A generic "our point" is still a point from play, just without a player attached.
    pointsFromActions:
      count((event) => event.outcome === 'point') +
      events.filter((event) => event.type === 'our_point').length,
    errors: count((event) => event.outcome === 'error'),
    opponentPoints: events.filter((event) => event.type === 'opponent_point').length,
    attackAttempts,
    kills,
    attackErrors,
    attackEfficiency: safeRatio(kills - attackErrors, attackAttempts),
    serves: count(bySkill('serve')),
    aces: count(bySkill('serve', ['point'])),
    serveErrors: count(bySkill('serve', ['error'])),
    receptions,
    positiveReceptions,
    negativeReceptions: count(bySkill('reception', ['negative', 'error'])),
    receptionPositivity: safeRatio(positiveReceptions, receptions),
    blockPoints: count(bySkill('block', ['point'])),
    timeoutsUsed: events.filter((event) => event.type === 'timeout' && event.team === 'us').length,
    substitutionsUsed: events.filter((event) => event.type === 'substitution').length,
  };
}

/** Every player id seen in the match: roster first, then ids only present in the log. */
export function playerIdsOf(match: Match): readonly { id: Id; isKnown: boolean }[] {
  const known = match.roster.map((player) => ({ id: player.id, isKnown: true }));
  const knownIds = new Set(known.map((entry) => entry.id));
  const unknown: { id: Id; isKnown: boolean }[] = [];
  for (const event of match.events) {
    if (event.type === 'rally' && !knownIds.has(event.playerId)) {
      knownIds.add(event.playerId);
      unknown.push({ id: event.playerId, isKnown: false });
    }
  }
  return [...known, ...unknown];
}

function sortPlayers(
  stats: readonly PlayerStatistics[],
  match: Match,
): readonly PlayerStatistics[] {
  const shirtOf = (playerId: Id): number =>
    match.roster.find((player) => player.id === playerId)?.shirtNumber ?? Number.MAX_SAFE_INTEGER;
  return [...stats].sort((a, b) => {
    if (a.isKnownPlayer !== b.isKnownPlayer) return a.isKnownPlayer ? -1 : 1;
    return shirtOf(a.playerId) - shirtOf(b.playerId);
  });
}

export function computeMatchStatistics(match: Match): MatchStatistics {
  const identities = playerIdsOf(match);

  const players = sortPlayers(
    identities.map((entry) => computePlayerStatistics(match.events, entry.id, entry.isKnown)),
    match,
  );

  const totalScored = match.sets.reduce((sum, set) => sum + set.ourPoints, 0);
  const totalConceded = match.sets.reduce((sum, set) => sum + set.theirPoints, 0);

  const team = computeTeamStatistics({
    events: match.events,
    scope: { kind: 'match' },
    pointsScored: totalScored,
    pointsConceded: totalConceded,
  });

  const perSetTeam: TeamStatistics[] = [];
  const perSetPlayers: (readonly PlayerStatistics[])[] = [];

  match.sets.forEach((set) => {
    const setEvents = match.events.filter((event) => event.setIndex === set.index);
    perSetTeam.push(
      computeTeamStatistics({
        events: setEvents,
        scope: { kind: 'set', setIndex: set.index },
        pointsScored: set.ourPoints,
        pointsConceded: set.theirPoints,
      }),
    );
    perSetPlayers.push(
      sortPlayers(
        identities.map((entry) => computePlayerStatistics(setEvents, entry.id, entry.isKnown)),
        match,
      ),
    );
  });

  return { team, players, perSetTeam, perSetPlayers };
}
