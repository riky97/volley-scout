import { describe, expect, it } from 'vitest';
import type {
  EventOutcome,
  Id,
  Lineup,
  Match,
  PlayerStatistics,
  ScoutEvent,
  Skill,
  TeamSide,
} from '@domain/index';
import {
  computeMatchStatistics,
  computePlayerStatistics,
  computeTeamStatistics,
  createPlayer,
  rebuildMatch,
  safeRatio,
} from '@domain/index';
import { makeMatch } from '@test/factories';

// Reference: docs/02-statistics.md §4 (ratio formulas), §5 (team totals), §9 (fixtures A-D).

const DUMMY_LINEUP: Lineup = ['x1', 'x2', 'x3', 'x4', 'x5', 'x6'];

type RawRally = { readonly type: 'rally'; readonly player: Id; readonly skill: Skill; readonly outcome: EventOutcome };
type RawOpponentPoint = { readonly type: 'opponent_point' };
type RawSetStart = { readonly type: 'set_start' };
type RawEvent = RawRally | RawOpponentPoint | RawSetStart;

/**
 * Builds a Match by feeding a raw, minimal event script straight into rebuildMatch (bypassing the
 * append* guards). rebuildMatch/foldEvents recompute every score/serving/rotation field, exactly as
 * docs/02-statistics.md §9 describes ("the implementation fills id, timestamp, sequence, ... via
 * appendRallyEvent"); this is the same recomputation, applied in bulk for terse fixtures.
 */
function buildFixtureMatch(roster: Match['roster'], script: readonly RawEvent[]): Match {
  const match = makeMatch({ roster, settings: { bestOf: 5, pointsToWinSet: 25, winByTwo: true, startingServer: 'us' } });
  let setIndex = -1;
  const events: ScoutEvent[] = script.map((raw, sequence) => {
    if (raw.type === 'set_start') {
      setIndex += 1;
      return {
        type: 'set_start',
        id: `evt-${sequence}`,
        timestamp: `2026-01-10T18:00:${String(sequence).padStart(2, '0')}.000+01:00`,
        setIndex,
        sequence,
        lineup: DUMMY_LINEUP,
        servingTeam: 'us' as TeamSide,
        target: 25,
      };
    }
    if (raw.type === 'opponent_point') {
      return {
        type: 'opponent_point',
        id: `evt-${sequence}`,
        timestamp: `2026-01-10T18:00:${String(sequence).padStart(2, '0')}.000+01:00`,
        setIndex,
        sequence,
        comment: '',
        pointTo: 'them',
        scoreBefore: { us: 0, them: 0 },
        scoreAfter: { us: 0, them: 0 },
        servingBefore: 'us',
        servingAfter: 'them',
        rotationBefore: 0,
        rotationAfter: 0,
      };
    }
    return {
      type: 'rally',
      id: `evt-${sequence}`,
      timestamp: `2026-01-10T18:00:${String(sequence).padStart(2, '0')}.000+01:00`,
      setIndex,
      sequence,
      playerId: raw.player,
      skill: raw.skill,
      outcome: raw.outcome,
      comment: '',
      isTerminal: false,
      pointTo: null,
      scoreBefore: { us: 0, them: 0 },
      scoreAfter: { us: 0, them: 0 },
      servingBefore: 'us',
      servingAfter: 'us',
      rotationBefore: 0,
      rotationAfter: 0,
    };
  });
  return rebuildMatch({ ...match, events }, '2026-01-10T18:05:00.000+01:00');
}

function findPlayer(stats: MatchStatsPlayers, playerId: Id): PlayerStatistics {
  const found = stats.find((entry) => entry.playerId === playerId);
  if (found === undefined) throw new Error(`no stats for player ${playerId}`);
  return found;
}

type MatchStatsPlayers = readonly PlayerStatistics[];

describe('safeRatio', () => {
  it('returns null for a zero denominator, otherwise the raw ratio', () => {
    expect(safeRatio(0, 0)).toBeNull();
    expect(safeRatio(5, 0)).toBeNull();
    expect(safeRatio(1, 4)).toBe(0.25);
    expect(safeRatio(-2, 4)).toBe(-0.5);
  });
});

describe('Fixture A — attack only, one player, one set', () => {
  const p4 = createPlayer({ id: 'P4', shirtNumber: 4, name: 'Four' });
  const roster = [p4, ...Array.from({ length: 5 }, (_, i) => createPlayer({ id: `filler${i}`, shirtNumber: 10 + i, name: `F${i}` }))];

  const match = buildFixtureMatch(roster, [
    { type: 'set_start' },
    { type: 'rally', player: 'P4', skill: 'attack', outcome: 'point' },
    { type: 'rally', player: 'P4', skill: 'attack', outcome: 'point' },
    { type: 'rally', player: 'P4', skill: 'attack', outcome: 'error' },
    { type: 'rally', player: 'P4', skill: 'attack', outcome: 'negative' },
    { type: 'rally', player: 'P4', skill: 'attack', outcome: 'positive' },
  ]);

  it('PlayerStatistics(P4) matches the fixture exactly', () => {
    const stats = computePlayerStatistics(match.events, 'P4', true);
    expect(stats.totalActions).toBe(5);
    expect(stats.points).toBe(2);
    expect(stats.errors).toBe(1);
    expect(stats.attackAttempts).toBe(5);
    expect(stats.kills).toBe(2);
    expect(stats.attackErrors).toBe(1);
    expect(stats.attackEfficiency).toBe(0.2);
    expect(stats.killRate).toBe(0.4);
    expect(stats.serves).toBe(0);
    expect(stats.aces).toBe(0);
    expect(stats.aceRate).toBeNull();
    expect(stats.receptions).toBe(0);
    expect(stats.receptionPositivity).toBeNull();
    expect(stats.blockPoints).toBe(0);
  });

  it('TeamStatistics (match scope) matches the fixture, set 0 score is 2-1', () => {
    const matchStats = computeMatchStatistics(match);
    expect(matchStats.team.totalActions).toBe(5);
    expect(matchStats.team.pointsFromActions).toBe(2);
    expect(matchStats.team.errors).toBe(1);
    expect(matchStats.team.opponentPoints).toBe(0);
    expect(matchStats.team.pointsScored).toBe(2);
    expect(matchStats.team.pointsConceded).toBe(1);
    expect(matchStats.team.attackEfficiency).toBe(0.2);
    expect(match.sets[0]?.ourPoints).toBe(2);
    expect(match.sets[0]?.theirPoints).toBe(1);
    // Identities from docs/02-statistics.md §5.
    expect(matchStats.team.pointsScored).toBe(matchStats.team.pointsFromActions);
    expect(matchStats.team.pointsConceded).toBe(matchStats.team.errors + matchStats.team.opponentPoints);
  });

  it('serving after event 5 is "them" (event 3 was a side-out against us)', () => {
    expect(match.sets[0]?.servingTeam).toBe('them');
  });
});

describe('Fixture B — serve and reception, one player, one set', () => {
  const p5 = createPlayer({ id: 'P5', shirtNumber: 5, name: 'Five' });
  const roster = [p5, ...Array.from({ length: 5 }, (_, i) => createPlayer({ id: `filler${i}`, shirtNumber: 10 + i, name: `F${i}` }))];

  const match = buildFixtureMatch(roster, [
    { type: 'set_start' },
    { type: 'rally', player: 'P5', skill: 'serve', outcome: 'point' },
    { type: 'rally', player: 'P5', skill: 'serve', outcome: 'error' },
    { type: 'rally', player: 'P5', skill: 'serve', outcome: 'neutral' },
    { type: 'rally', player: 'P5', skill: 'reception', outcome: 'positive' },
    { type: 'rally', player: 'P5', skill: 'reception', outcome: 'positive' },
    { type: 'rally', player: 'P5', skill: 'reception', outcome: 'neutral' },
    { type: 'rally', player: 'P5', skill: 'reception', outcome: 'negative' },
    { type: 'rally', player: 'P5', skill: 'reception', outcome: 'error' },
  ]);

  it('PlayerStatistics(P5) matches the fixture exactly', () => {
    const stats = computePlayerStatistics(match.events, 'P5', true);
    expect(stats.totalActions).toBe(8);
    expect(stats.points).toBe(1);
    expect(stats.errors).toBe(2);
    expect(stats.serves).toBe(3);
    expect(stats.aces).toBe(1);
    expect(stats.serveErrors).toBe(1);
    expect(stats.aceRate).toBeCloseTo(1 / 3);
    expect(stats.serveErrorRate).toBeCloseTo(1 / 3);
    expect(stats.receptions).toBe(5);
    expect(stats.positiveReceptions).toBe(2);
    expect(stats.negativeReceptions).toBe(2);
    expect(stats.receptionErrors).toBe(1);
    expect(stats.receptionPositivity).toBe(0.4);
    expect(stats.receptionErrorRate).toBe(0.2);
    expect(stats.attackAttempts).toBe(0);
    expect(stats.attackEfficiency).toBeNull();
  });

  it('team totals: pointsScored 1, pointsConceded 2, set 0 score is 1-2', () => {
    const matchStats = computeMatchStatistics(match);
    expect(matchStats.team.pointsScored).toBe(1);
    expect(matchStats.team.pointsConceded).toBe(2);
    expect(matchStats.team.opponentPoints).toBe(0);
    expect(matchStats.team.totalActions).toBe(8);
    expect(match.sets[0]?.ourPoints).toBe(1);
    expect(match.sets[0]?.theirPoints).toBe(2);
  });
});

describe('Fixture C — two players, two sets, opponent points, zero denominators', () => {
  const p4 = createPlayer({ id: 'P4', shirtNumber: 4, name: 'Four' });
  const p9 = createPlayer({ id: 'P9', shirtNumber: 9, name: 'Nine' });
  const roster = [p4, p9, ...Array.from({ length: 4 }, (_, i) => createPlayer({ id: `filler${i}`, shirtNumber: 10 + i, name: `F${i}` }))];

  const match = buildFixtureMatch(roster, [
    { type: 'set_start' }, // set 0
    { type: 'rally', player: 'P4', skill: 'attack', outcome: 'point' },
    { type: 'opponent_point' },
    { type: 'rally', player: 'P9', skill: 'block', outcome: 'point' },
    { type: 'rally', player: 'P4', skill: 'attack', outcome: 'error' },
    { type: 'set_start' }, // set 1
    { type: 'rally', player: 'P4', skill: 'attack', outcome: 'point' },
    { type: 'rally', player: 'P9', skill: 'dig', outcome: 'positive' },
  ]);

  it('match scope: P4 statistics', () => {
    const matchStats = computeMatchStatistics(match);
    const p4Stats = findPlayer(matchStats.players, 'P4');
    expect(p4Stats.totalActions).toBe(3);
    expect(p4Stats.points).toBe(2);
    expect(p4Stats.errors).toBe(1);
    expect(p4Stats.attackAttempts).toBe(3);
    expect(p4Stats.kills).toBe(2);
    expect(p4Stats.attackErrors).toBe(1);
    expect(p4Stats.attackEfficiency).toBeCloseTo(1 / 3);
    expect(p4Stats.killRate).toBeCloseTo(2 / 3);
    expect(p4Stats.serves).toBe(0);
    expect(p4Stats.aceRate).toBeNull();
    expect(p4Stats.receptions).toBe(0);
    expect(p4Stats.receptionPositivity).toBeNull();
    expect(p4Stats.blockPoints).toBe(0);
  });

  it('match scope: P9 statistics', () => {
    const matchStats = computeMatchStatistics(match);
    const p9Stats = findPlayer(matchStats.players, 'P9');
    expect(p9Stats.totalActions).toBe(2);
    expect(p9Stats.points).toBe(1);
    expect(p9Stats.errors).toBe(0);
    expect(p9Stats.blockPoints).toBe(1);
    expect(p9Stats.digs).toBe(1);
    expect(p9Stats.digErrors).toBe(0);
    expect(p9Stats.attackAttempts).toBe(0);
    expect(p9Stats.attackEfficiency).toBeNull();
    expect(p9Stats.serves).toBe(0);
    expect(p9Stats.aceRate).toBeNull();
  });

  it('match scope: team statistics', () => {
    const matchStats = computeMatchStatistics(match);
    expect(matchStats.team.totalActions).toBe(5);
    expect(matchStats.team.pointsFromActions).toBe(3);
    expect(matchStats.team.errors).toBe(1);
    expect(matchStats.team.opponentPoints).toBe(1);
    expect(matchStats.team.pointsScored).toBe(3);
    expect(matchStats.team.pointsConceded).toBe(2);
    expect(matchStats.team.attackAttempts).toBe(3);
    expect(matchStats.team.kills).toBe(2);
    expect(matchStats.team.attackErrors).toBe(1);
    expect(matchStats.team.attackEfficiency).toBeCloseTo(1 / 3);
    expect(matchStats.team.blockPoints).toBe(1);
    expect(matchStats.team.receptions).toBe(0);
    expect(matchStats.team.receptionPositivity).toBeNull();
  });

  it('per-set scope: set 0 team and players', () => {
    const matchStats = computeMatchStatistics(match);
    const set0Team = matchStats.perSetTeam[0];
    expect(set0Team?.totalActions).toBe(3);
    expect(set0Team?.pointsScored).toBe(2);
    expect(set0Team?.pointsConceded).toBe(2);
    expect(set0Team?.pointsFromActions).toBe(2);
    expect(set0Team?.errors).toBe(1);
    expect(set0Team?.opponentPoints).toBe(1);
    expect(set0Team?.attackAttempts).toBe(2);
    expect(set0Team?.kills).toBe(1);
    expect(set0Team?.attackErrors).toBe(1);
    expect(set0Team?.attackEfficiency).toBe(0);

    const set0P4 = findPlayer(matchStats.perSetPlayers[0] ?? [], 'P4');
    expect(set0P4.attackAttempts).toBe(2);
    expect(set0P4.kills).toBe(1);
    expect(set0P4.attackErrors).toBe(1);
    expect(set0P4.attackEfficiency).toBe(0);

    const set0P9 = findPlayer(matchStats.perSetPlayers[0] ?? [], 'P9');
    expect(set0P9.totalActions).toBe(1);
    expect(set0P9.blockPoints).toBe(1);
    expect(set0P9.digs).toBe(0);
  });

  it('per-set scope: set 1 team and players', () => {
    const matchStats = computeMatchStatistics(match);
    const set1Team = matchStats.perSetTeam[1];
    expect(set1Team?.totalActions).toBe(2);
    expect(set1Team?.pointsScored).toBe(1);
    expect(set1Team?.pointsConceded).toBe(0);
    expect(set1Team?.pointsFromActions).toBe(1);
    expect(set1Team?.errors).toBe(0);
    expect(set1Team?.opponentPoints).toBe(0);
    expect(set1Team?.attackAttempts).toBe(1);
    expect(set1Team?.kills).toBe(1);
    expect(set1Team?.attackErrors).toBe(0);
    expect(set1Team?.attackEfficiency).toBe(1);

    const set1P4 = findPlayer(matchStats.perSetPlayers[1] ?? [], 'P4');
    expect(set1P4.totalActions).toBe(1);
    expect(set1P4.attackAttempts).toBe(1);
    expect(set1P4.kills).toBe(1);
    expect(set1P4.attackEfficiency).toBe(1);

    const set1P9 = findPlayer(matchStats.perSetPlayers[1] ?? [], 'P9');
    expect(set1P9.totalActions).toBe(1);
    expect(set1P9.digs).toBe(1);
    expect(set1P9.attackAttempts).toBe(0);
    expect(set1P9.attackEfficiency).toBeNull();
  });

  it('scoreboard check: set 0 ends 2-2, set 1 stands 1-0, and both identities hold per set', () => {
    expect(match.sets[0]?.ourPoints).toBe(2);
    expect(match.sets[0]?.theirPoints).toBe(2);
    expect(match.sets[1]?.ourPoints).toBe(1);
    expect(match.sets[1]?.theirPoints).toBe(0);

    const matchStats = computeMatchStatistics(match);
    for (const setStats of matchStats.perSetTeam) {
      expect(setStats.pointsScored).toBe(setStats.pointsFromActions);
      expect(setStats.pointsConceded).toBe(setStats.errors + setStats.opponentPoints);
    }
  });
});

describe('Fixture D — negative attack efficiency regression guard', () => {
  const p1 = createPlayer({ id: 'P1', shirtNumber: 1, name: 'One' });
  const roster = [p1, ...Array.from({ length: 5 }, (_, i) => createPlayer({ id: `filler${i}`, shirtNumber: 10 + i, name: `F${i}` }))];

  const match = buildFixtureMatch(roster, [
    { type: 'set_start' },
    { type: 'rally', player: 'P1', skill: 'attack', outcome: 'point' },
    { type: 'rally', player: 'P1', skill: 'attack', outcome: 'error' },
    { type: 'rally', player: 'P1', skill: 'attack', outcome: 'error' },
    { type: 'rally', player: 'P1', skill: 'attack', outcome: 'error' },
  ]);

  it('attackEfficiency is negative, never clamped or absolute-valued', () => {
    const stats = computePlayerStatistics(match.events, 'P1', true);
    expect(stats.attackAttempts).toBe(4);
    expect(stats.kills).toBe(1);
    expect(stats.attackErrors).toBe(3);
    expect(stats.attackEfficiency).toBe(-0.5);
  });
});

describe('E20 — invalid skill/outcome combinations are excluded from skill tables but counted in totalActions', () => {
  it('an out-of-table rally (reception/point) is skipped by computePlayerStatistics counters', () => {
    const p1 = createPlayer({ id: 'P1', shirtNumber: 1, name: 'One' });
    const roster = [p1, ...Array.from({ length: 5 }, (_, i) => createPlayer({ id: `filler${i}`, shirtNumber: 10 + i, name: `F${i}` }))];
    const match = buildFixtureMatch(roster, [
      { type: 'set_start' },
      { type: 'rally', player: 'P1', skill: 'attack', outcome: 'point' },
      { type: 'rally', player: 'P1', skill: 'reception', outcome: 'point' }, // not in ALLOWED_OUTCOMES
    ]);
    const stats = computePlayerStatistics(match.events, 'P1', true);
    expect(stats.totalActions).toBe(1); // invalid event excluded from player counters
    expect(stats.receptions).toBe(0);

    const matchStats = computeMatchStatistics(match);
    // Team totalActions counts every rally event, including the invalid one (G3).
    expect(matchStats.team.totalActions).toBe(2);
  });
});

describe('G4 — unknown players are still counted in team totals', () => {
  it('a playerId absent from the roster contributes to team stats and appears as a synthetic row', () => {
    const known = createPlayer({ id: 'known', shirtNumber: 1, name: 'Known' });
    const roster = [known, ...Array.from({ length: 5 }, (_, i) => createPlayer({ id: `filler${i}`, shirtNumber: 10 + i, name: `F${i}` }))];
    const match = buildFixtureMatch(roster, [
      { type: 'set_start' },
      { type: 'rally', player: 'ghost', skill: 'attack', outcome: 'point' },
    ]);
    const matchStats = computeMatchStatistics(match);
    expect(matchStats.team.pointsFromActions).toBe(1);
    const ghostStats = findPlayer(matchStats.players, 'ghost');
    expect(ghostStats.isKnownPlayer).toBe(false);
    expect(ghostStats.points).toBe(1);
  });
});

describe('computeTeamStatistics direct call', () => {
  it('takes explicit pointsScored/pointsConceded rather than deriving them itself', () => {
    const events: ScoutEvent[] = [];
    const stats = computeTeamStatistics({
      events,
      scope: { kind: 'match' },
      pointsScored: 25,
      pointsConceded: 20,
    });
    expect(stats.pointsScored).toBe(25);
    expect(stats.pointsConceded).toBe(20);
    expect(stats.totalActions).toBe(0);
    expect(stats.attackEfficiency).toBeNull();
  });
});
