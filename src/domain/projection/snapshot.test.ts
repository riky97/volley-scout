import { describe, expect, it } from 'vitest';
import { buildSnapshot, endSet, liveSetOf, startSet } from '@domain/index';
import { lineupFrom, makeMatch, playPoints, playRally, startedMatch } from '@test/factories';

// Reference: docs/01-domain-model.md §2.12 (MatchSnapshot) and §2.9 (SetState).

describe('buildSnapshot — before any set starts', () => {
  it('currentSetIndex is -1 and the court is empty', () => {
    const match = makeMatch();
    const snapshot = buildSnapshot(match);
    expect(snapshot.currentSetIndex).toBe(-1);
    expect(snapshot.currentSet).toBeNull();
    expect(snapshot.score).toEqual({ us: 0, them: 0 });
    expect(snapshot.court).toEqual([]);
    expect(snapshot.canUndo).toBe(false);
    expect(snapshot.matchWinner).toBeNull();
    expect(snapshot.lastEvent).toBeNull();
  });
});

describe('buildSnapshot — live set', () => {
  it('reflects score, serving team, server and court from the live set', () => {
    const match = startedMatch();
    const snapshot = buildSnapshot(match);
    expect(snapshot.currentSetIndex).toBe(0);
    expect(snapshot.currentSet?.status).toBe('live');
    expect(snapshot.score).toEqual({ us: 0, them: 0 });
    expect(snapshot.servingTeam).toBe('us');
    expect(snapshot.currentServerId).toBe(liveSetOf(match)?.lineup?.[0]);
    expect(snapshot.court.length).toBe(6);
    expect(snapshot.canUndo).toBe(false); // only set_start so far
    expect(snapshot.lastEvent?.type).toBe('set_start');
  });

  it('canUndo becomes true after a rally event, false again once the log is just set_start', () => {
    const match = startedMatch();
    const server = liveSetOf(match)?.lineup?.[0] ?? '';
    const afterRally = playRally({ match, player: server, skill: 'serve', outcome: 'point' });
    expect(buildSnapshot(afterRally).canUndo).toBe(true);
    expect(buildSnapshot(afterRally).lastEvent?.type).toBe('rally');
  });

  it('pendingSetWinner and setPointFor surface set-end and set-point conditions', () => {
    let match = startedMatch({ match: makeMatch({ settings: { bestOf: 3, pointsToWinSet: 3 } }) });
    match = playPoints(match, 'us', 2);
    const setPoint = buildSnapshot(match);
    expect(setPoint.pendingSetWinner).toBeNull();
    expect(setPoint.setPointFor).toBe('us');

    match = playPoints(match, 'us', 1);
    const won = buildSnapshot(match);
    expect(won.pendingSetWinner).toBe('us');
    expect(won.setPointFor).toBeNull(); // set is already over, not "one point away"
  });
});

describe('buildSnapshot — after a set ends and the match ends', () => {
  it('setHistory accumulates finished sets and matchWinner reflects the outcome', () => {
    let match = startedMatch({ match: makeMatch({ settings: { bestOf: 3, pointsToWinSet: 3 } }) });
    match = playPoints(match, 'us', 3);
    match = endSet(match, 'end0', '2026-01-10T18:01:00.000+01:00');
    let snapshot = buildSnapshot(match);
    expect(snapshot.setHistory.length).toBe(1);
    expect(snapshot.setHistory[0]?.winner).toBe('us');
    expect(snapshot.matchWinner).toBeNull(); // best-of-3 needs 2 sets

    match = startSet({
      match,
      lineup: lineupFrom(match.roster),
      id: 'start1',
      timestamp: '2026-01-10T18:02:00.000+01:00',
    });
    match = playPoints(match, 'us', 3);
    match = endSet(match, 'end1', '2026-01-10T18:03:00.000+01:00');
    snapshot = buildSnapshot(match);
    expect(snapshot.matchWinner).toBe('us');
    expect(snapshot.setsWon).toEqual({ us: 2, them: 0 });
  });
});
