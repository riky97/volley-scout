import type {
  EventOutcome,
  Id,
  IsoTimestamp,
  Lineup,
  Match,
  MatchSettings,
  Player,
  Skill,
  TeamSide,
} from '@domain/index';
import {
  DEFAULT_MATCH_SETTINGS,
  appendOpponentPoint,
  appendRallyEvent,
  createMatch,
  createPlayer,
  startSet,
} from '@domain/index';

/** Deterministic id generator: id-0, id-1, ... Reset per test by creating a new instance. */
export function makeIdGenerator(prefix = 'id'): () => Id {
  let counter = 0;
  return () => `${prefix}-${counter++}`;
}

/** A fixed base timestamp; each call advances by one second so ordering is stable. */
export function makeClock(startIso = '2026-01-10T18:00:00.000+01:00'): () => IsoTimestamp {
  const start = new Date(startIso).getTime();
  let elapsedSeconds = 0;
  return () => {
    const value = new Date(start + elapsedSeconds * 1000).toISOString();
    elapsedSeconds += 1;
    return value;
  };
}

/** Builds a roster of `count` available players with distinct shirt numbers 1..count. */
export function makeRoster(count: number, idGen: () => Id = makeIdGenerator('player')): Player[] {
  const players: Player[] = [];
  for (let shirtNumber = 1; shirtNumber <= count; shirtNumber += 1) {
    players.push(
      createPlayer({
        id: idGen(),
        shirtNumber,
        name: `Player ${shirtNumber}`,
      }),
    );
  }
  return players;
}

export interface MakeMatchOverrides {
  readonly roster?: readonly Player[];
  readonly settings?: Partial<MatchSettings>;
  readonly id?: Id;
  readonly timestamp?: IsoTimestamp;
}

/** A freshly-created match in `setup` status, with a 6+ player roster by default. */
export function makeMatch(overrides: MakeMatchOverrides = {}): Match {
  const roster = overrides.roster ?? makeRoster(7);
  const settings: MatchSettings = { ...DEFAULT_MATCH_SETTINGS, ...overrides.settings };
  return createMatch({
    id: overrides.id ?? 'match-1',
    ourTeamId: 'team-us',
    opponentTeamId: 'team-them',
    ourTeamName: 'Us',
    opponentTeamName: 'Them',
    date: '2026-01-10',
    venue: '',
    competition: '',
    notes: '',
    settings,
    roster,
    timestamp: overrides.timestamp ?? '2026-01-10T18:00:00.000+01:00',
  });
}

/** The first six roster players' ids, in P1..P6 order, as a `Lineup` tuple. */
export function lineupFrom(roster: readonly Player[]): Lineup {
  const ids = roster.slice(0, 6).map((player) => player.id);
  if (ids.length !== 6) throw new Error('roster needs at least six players for a lineup');
  return [ids[0], ids[1], ids[2], ids[3], ids[4], ids[5]] as Lineup;
}

export interface StartedMatchOptions {
  readonly match?: Match;
  readonly lineup?: Lineup;
  readonly servingTeam?: TeamSide;
  readonly idGen?: () => Id;
  readonly clock?: () => IsoTimestamp;
}

/** A match with set 0 already live, using the first six roster players as the lineup. */
export function startedMatch(options: StartedMatchOptions = {}): Match {
  const match = options.match ?? makeMatch();
  const lineup = options.lineup ?? lineupFrom(match.roster);
  const idGen = options.idGen ?? makeIdGenerator('evt');
  const clock = options.clock ?? makeClock();
  return startSet({
    match,
    lineup,
    servingTeam: options.servingTeam,
    id: idGen(),
    timestamp: clock(),
  });
}

export interface PlayRallyInput {
  readonly match: Match;
  readonly player: Id;
  readonly skill: Skill;
  readonly outcome: EventOutcome;
  readonly idGen?: () => Id;
  readonly clock?: () => IsoTimestamp;
  readonly comment?: string;
}

/** Appends one rally event for one of our players. */
export function playRally(input: PlayRallyInput): Match {
  const idGen = input.idGen ?? makeIdGenerator('evt');
  const clock = input.clock ?? makeClock();
  return appendRallyEvent({
    match: input.match,
    playerId: input.player,
    skill: input.skill,
    outcome: input.outcome,
    comment: input.comment,
    id: idGen(),
    timestamp: clock(),
  });
}

/**
 * Appends `n` terminal points to `side` in the fastest legal way: our points via a `serve`/`point`
 * rally by the current server, their points via `opponent_point`. Useful to drive a set to its end
 * without caring about who is on court.
 */
export function playPoints(
  match: Match,
  side: TeamSide,
  n: number,
  options: { readonly idGen?: () => Id; readonly clock?: () => IsoTimestamp } = {},
): Match {
  const idGen = options.idGen ?? makeIdGenerator('evt');
  const clock = options.clock ?? makeClock();
  let current = match;
  for (let i = 0; i < n; i += 1) {
    if (side === 'us') {
      const set = current.sets.at(-1);
      const scorer = set?.lineup?.[0] ?? current.roster[0]?.id;
      if (scorer === undefined) throw new Error('no player available to score');
      current = appendRallyEvent({
        match: current,
        playerId: scorer,
        skill: 'attack',
        outcome: 'point',
        id: idGen(),
        timestamp: clock(),
      });
    } else {
      current = appendOpponentPoint({
        match: current,
        id: idGen(),
        timestamp: clock(),
      });
    }
  }
  return current;
}
