import { describe, expect, it } from 'vitest';
import type { Lineup } from '@domain/index';
import {
  DomainError,
  abandonMatch,
  appendNote,
  appendOpponentPoint,
  appendRallyEvent,
  appendSubstitution,
  appendTimeout,
  createPlayer,
  endMatch,
  endSet,
  isDomainError,
  liveSetOf,
  matchWinnerOf,
  startSet,
  validateLineup,
} from '@domain/index';
import { lineupFrom, makeIdGenerator, makeMatch, playPoints, playRally, startedMatch } from '@test/factories';

// Reference: docs/01-domain-model.md §3.5 (lifecycle), §3.6 (non-rally events), §4 edge cases.

describe('startSet', () => {
  it('starts set 0: status live, target frozen, rotationOffset 0, score 0-0', () => {
    const match = startedMatch();
    const set = liveSetOf(match);
    expect(match.status).toBe('live');
    expect(set?.status).toBe('live');
    expect(set?.target).toBe(25);
    expect(set?.rotationOffset).toBe(0);
    expect(set?.ourPoints).toBe(0);
    expect(set?.theirPoints).toBe(0);
    expect(set?.timeoutsUsed).toEqual({ us: 0, them: 0 });
    expect(set?.substitutionsUsed).toBe(0);
  });

  it('E22 / INVALID_LINEUP: rejects a lineup with fewer than six distinct ids', () => {
    const match = makeMatch();
    const badLineup = [
      match.roster[0]?.id,
      match.roster[0]?.id,
      match.roster[1]?.id,
      match.roster[2]?.id,
      match.roster[3]?.id,
      match.roster[4]?.id,
    ] as Lineup;
    expect(() =>
      startSet({ match, lineup: badLineup, id: 'e1', timestamp: '2026-01-10T18:00:00.000+01:00' }),
    ).toThrow(DomainError);
    try {
      startSet({ match, lineup: badLineup, id: 'e1', timestamp: '2026-01-10T18:00:00.000+01:00' });
    } catch (error) {
      expect(isDomainError(error) && error.code).toBe('INVALID_LINEUP');
    }
  });

  it('E22: rejects a lineup containing an unavailable player', () => {
    const roster = [
      createPlayer({ id: 'p1', shirtNumber: 1, name: 'A' }),
      createPlayer({ id: 'p2', shirtNumber: 2, name: 'B' }),
      createPlayer({ id: 'p3', shirtNumber: 3, name: 'C' }),
      createPlayer({ id: 'p4', shirtNumber: 4, name: 'D' }),
      createPlayer({ id: 'p5', shirtNumber: 5, name: 'E' }),
      createPlayer({ id: 'p6', shirtNumber: 6, name: 'F', isAvailable: false }),
    ];
    const match = makeMatch({ roster });
    const lineup: Lineup = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    expect(() => startSet({ match, lineup, id: 'e1', timestamp: '2026-01-10T18:00:00.000+01:00' }))
      .toThrow(DomainError);
  });

  it('validateLineup throws PLAYER_NOT_IN_ROSTER for an id absent from the roster', () => {
    const match = makeMatch();
    const lineup: Lineup = ['nope', 'a', 'b', 'c', 'd', 'e'];
    try {
      validateLineup(match, lineup);
      expect.unreachable();
    } catch (error) {
      expect(isDomainError(error) && error.code).toBe('PLAYER_NOT_IN_ROSTER');
    }
  });

  it('E26 / MATCH_ALREADY_WON: cannot start a new set once the match is won', () => {
    let match = startedMatch({ match: makeMatch({ settings: { bestOf: 3, pointsToWinSet: 3 } }) });
    match = playPoints(match, 'us', 3);
    match = endSet(match, 'end0', '2026-01-10T18:01:00.000+01:00');
    match = startSet({
      match,
      lineup: lineupFrom(match.roster),
      id: 'start1',
      timestamp: '2026-01-10T18:02:00.000+01:00',
    });
    match = playPoints(match, 'us', 3);
    match = endSet(match, 'end1', '2026-01-10T18:03:00.000+01:00');
    // endSet alone never flips match.status to 'finished' (that is endMatch's job, §3.5); the
    // match is nonetheless won, which is what startSet's MATCH_ALREADY_WON guard checks.
    expect(match.status).toBe('live');

    expect(() =>
      startSet({
        match,
        lineup: lineupFrom(match.roster),
        id: 'start2',
        timestamp: '2026-01-10T18:04:00.000+01:00',
      }),
    ).toThrow(DomainError);
  });

  it('SET_ALREADY_LIVE: cannot start a second set while one is live', () => {
    const match = startedMatch();
    expect(() =>
      startSet({
        match,
        lineup: lineupFrom(match.roster),
        id: 'start2',
        timestamp: '2026-01-10T18:01:00.000+01:00',
      }),
    ).toThrow(DomainError);
  });
});

describe('appendRallyEvent', () => {
  it('E23 / NO_LIVE_SET: rejected when no set is live', () => {
    const match = makeMatch();
    expect(() =>
      appendRallyEvent({
        match,
        playerId: match.roster[0]?.id ?? '',
        skill: 'serve',
        outcome: 'point',
        id: 'r1',
        timestamp: '2026-01-10T18:00:00.000+01:00',
      }),
    ).toThrow(DomainError);
  });

  it('INVALID_OUTCOME: rejects a skill/outcome combination outside ALLOWED_OUTCOMES', () => {
    const match = startedMatch();
    try {
      appendRallyEvent({
        match,
        playerId: match.roster[0]?.id ?? '',
        skill: 'reception',
        outcome: 'point', // reception has no 'point' outcome
        id: 'r1',
        timestamp: '2026-01-10T18:00:01.000+01:00',
      });
      expect.unreachable();
    } catch (error) {
      expect(isDomainError(error) && error.code).toBe('INVALID_OUTCOME');
    }
  });

  it('PLAYER_NOT_IN_ROSTER: rejects an unknown playerId', () => {
    const match = startedMatch();
    expect(() =>
      appendRallyEvent({
        match,
        playerId: 'ghost',
        skill: 'serve',
        outcome: 'point',
        id: 'r1',
        timestamp: '2026-01-10T18:00:01.000+01:00',
      }),
    ).toThrow(DomainError);
  });

  it('a terminal event updates the live set score', () => {
    const match = startedMatch();
    const scorer = liveSetOf(match)?.lineup?.[0] ?? '';
    const after = playRally({ match, player: scorer, skill: 'serve', outcome: 'point' });
    const set = liveSetOf(after);
    expect(set?.ourPoints).toBe(1);
    expect(set?.theirPoints).toBe(0);
  });
});

describe('set end confirmation (evaluateSetEnd is a detector; endSet is the confirm step)', () => {
  it('endSet appends set_end, closes the set and computes setsAfter/endsMatch', () => {
    let match = startedMatch({ match: makeMatch({ settings: { bestOf: 3, pointsToWinSet: 3 } }) });
    match = playPoints(match, 'us', 3);
    const before = liveSetOf(match);
    expect(before?.ourPoints).toBe(3);

    match = endSet(match, 'end0', '2026-01-10T18:01:00.000+01:00');
    const finishedSet = match.sets[0];
    expect(finishedSet?.status).toBe('finished');
    expect(finishedSet?.winner).toBe('us');
    expect(match.status).toBe('live'); // match not won yet (best-of-3 needs 2 sets)
  });

  it('NO_LIVE_SET: endSet throws when the score does not close the set', () => {
    const match = startedMatch();
    expect(() => endSet(match, 'end0', '2026-01-10T18:01:00.000+01:00')).toThrow(DomainError);
  });

  it('endsMatch is true when the closing set wins the match', () => {
    let match = startedMatch({ match: makeMatch({ settings: { bestOf: 3, pointsToWinSet: 3 } }) });
    match = playPoints(match, 'us', 3);
    match = endSet(match, 'end0', '2026-01-10T18:01:00.000+01:00');
    match = startSet({
      match,
      lineup: lineupFrom(match.roster),
      id: 'start1',
      timestamp: '2026-01-10T18:02:00.000+01:00',
    });
    match = playPoints(match, 'us', 3);
    const closingEvent = endSet(match, 'end1', '2026-01-10T18:03:00.000+01:00');
    const setEnd = closingEvent.events.find((event) => event.id === 'end1');
    expect(setEnd?.type === 'set_end' && setEnd.endsMatch).toBe(true);
    // Per §3.5, endSet never auto-finishes the match; only the explicit endMatch does.
    expect(closingEvent.status).toBe('live');
  });
});

describe('closing an undecided set or match', () => {
  it('SET_NOT_DECIDED: ending a set nobody has won names the real problem', () => {
    const match = startedMatch({ match: makeMatch({ settings: { bestOf: 3, pointsToWinSet: 3 } }) });

    // A test match at 0-0: the operator only wants to get rid of it, and "no live set"
    // would send them looking for a set that is in fact running.
    try {
      endSet(match, 'end0', '2026-01-10T18:01:00.000+01:00');
      expect.unreachable('endSet should refuse an undecided set');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe('SET_NOT_DECIDED');
    }
  });

  it('abandonMatch closes an undecided match without inventing a winner', () => {
    let match = startedMatch({ match: makeMatch({ settings: { bestOf: 3, pointsToWinSet: 3 } }) });
    match = playPoints(match, 'us', 1);

    const abandoned = abandonMatch(match, '2026-01-10T18:05:00.000+01:00');

    expect(abandoned.status).toBe('abandoned');
    expect(abandoned.closedAt).toBe('2026-01-10T18:05:00.000+01:00');
    expect(abandoned.sets[0]?.ourPoints).toBe(1);
    expect(matchWinnerOf(abandoned)).toBeNull();
  });
});

describe('endMatch / abandonMatch', () => {
  it('MATCH_CLOSED: every mutator throws once the match is finished', () => {
    let match = startedMatch({ match: makeMatch({ settings: { bestOf: 3, pointsToWinSet: 3 } }) });
    match = playPoints(match, 'us', 3);
    match = endSet(match, 'end0', '2026-01-10T18:01:00.000+01:00');
    match = startSet({
      match,
      lineup: lineupFrom(match.roster),
      id: 'start1',
      timestamp: '2026-01-10T18:02:00.000+01:00',
    });
    match = playPoints(match, 'us', 3);
    match = endSet(match, 'end1', '2026-01-10T18:03:00.000+01:00');
    match = endMatch(match, '2026-01-10T18:04:00.000+01:00');
    expect(match.status).toBe('finished');
    expect(match.closedAt).not.toBeNull();

    expect(() =>
      appendNote({ match, text: 'late note', id: 'n1', timestamp: '2026-01-10T18:05:00.000+01:00' }),
    ).toThrow(DomainError);
  });
});

describe('non-rally events', () => {
  it('E12 / NO_LIVE_SET: timeout rejected between sets', () => {
    let match = startedMatch({ match: makeMatch({ settings: { bestOf: 3, pointsToWinSet: 3 } }) });
    match = playPoints(match, 'us', 3);
    match = endSet(match, 'end0', '2026-01-10T18:01:00.000+01:00');
    expect(() =>
      appendTimeout({ match, team: 'us', id: 't1', timestamp: '2026-01-10T18:01:30.000+01:00' }),
    ).toThrow(DomainError);
  });

  it('E13: timeout beyond the soft limit still appends', () => {
    const match = startedMatch({ match: makeMatch({ settings: { timeoutsPerSet: 1 } }) });
    const idGen = makeIdGenerator('t');
    let current = match;
    for (let i = 0; i < 3; i += 1) {
      current = appendTimeout({
        match: current,
        team: 'us',
        id: idGen(),
        timestamp: `2026-01-10T18:0${i}:00.000+01:00`,
      });
    }
    expect(liveSetOf(current)?.timeoutsUsed.us).toBe(3);
  });

  it('E14 / PLAYER_NOT_ON_COURT: substituting a player who is not on court is rejected', () => {
    const match = startedMatch();
    try {
      appendSubstitution({
        match,
        playerOutId: 'not-on-court',
        playerInId: match.roster[6]?.id ?? '',
        id: 's1',
        timestamp: '2026-01-10T18:01:00.000+01:00',
      });
      expect.unreachable();
    } catch (error) {
      expect(isDomainError(error) && error.code).toBe('PLAYER_NOT_ON_COURT');
    }
  });

  it('E15 / PLAYER_ALREADY_ON_COURT: substituting in a player already on court is rejected', () => {
    const match = startedMatch();
    const lineup = liveSetOf(match)?.lineup;
    try {
      appendSubstitution({
        match,
        playerOutId: lineup?.[0] ?? '',
        playerInId: lineup?.[1] ?? '',
        id: 's1',
        timestamp: '2026-01-10T18:01:00.000+01:00',
      });
      expect.unreachable();
    } catch (error) {
      expect(isDomainError(error) && error.code).toBe('PLAYER_ALREADY_ON_COURT');
    }
  });

  it('E16 / PLAYER_UNAVAILABLE: substituting in an unavailable player is rejected', () => {
    const roster = [
      createPlayer({ id: 'p1', shirtNumber: 1, name: 'A' }),
      createPlayer({ id: 'p2', shirtNumber: 2, name: 'B' }),
      createPlayer({ id: 'p3', shirtNumber: 3, name: 'C' }),
      createPlayer({ id: 'p4', shirtNumber: 4, name: 'D' }),
      createPlayer({ id: 'p5', shirtNumber: 5, name: 'E' }),
      createPlayer({ id: 'p6', shirtNumber: 6, name: 'F' }),
      createPlayer({ id: 'p7', shirtNumber: 7, name: 'G', isAvailable: false }),
    ];
    const match = startedMatch({ match: makeMatch({ roster }) });
    try {
      appendSubstitution({
        match,
        playerOutId: 'p1',
        playerInId: 'p7',
        id: 's1',
        timestamp: '2026-01-10T18:01:00.000+01:00',
      });
      expect.unreachable();
    } catch (error) {
      expect(isDomainError(error) && error.code).toBe('PLAYER_UNAVAILABLE');
    }
  });

  it('a valid substitution rewrites the lineup slot in place', () => {
    const match = startedMatch();
    const lineup = liveSetOf(match)?.lineup as Lineup;
    const outId = lineup[4];
    const inId = match.roster[6]?.id ?? '';
    const after = appendSubstitution({
      match,
      playerOutId: outId,
      playerInId: inId,
      id: 's1',
      timestamp: '2026-01-10T18:01:00.000+01:00',
    });
    const newLineup = liveSetOf(after)?.lineup as Lineup;
    expect(newLineup[4]).toBe(inId);
    expect(newLineup[0]).toBe(lineup[0]);
    expect(liveSetOf(after)?.substitutionsUsed).toBe(1);
  });

  it('E29: a note between sets is allowed, with setIndex of the last started set and its final score', () => {
    // docs/01-domain-model.md §3.6 and E29: "note — appendable at any time while the match is
    // 'live' (including between sets)". appendNote currently calls requireLiveSet, which throws
    // NO_LIVE_SET once the set has finished and the next one has not started — a spec/implementation
    // mismatch. This test asserts the spec, not the implementation, and is expected to fail until
    // that is fixed (do not relax this assertion to match the current throw).
    let match = startedMatch({ match: makeMatch({ settings: { bestOf: 3, pointsToWinSet: 3 } }) });
    match = playPoints(match, 'us', 3);
    match = endSet(match, 'end0', '2026-01-10T18:01:00.000+01:00');

    const after = appendNote({
      match,
      text: 'half-time',
      id: 'note1',
      timestamp: '2026-01-10T18:01:30.000+01:00',
    });
    const note = after.events.find((event) => event.id === 'note1');
    expect(note?.type).toBe('note');
    expect(note?.setIndex).toBe(0);
    expect(note?.type === 'note' && note.atScore).toEqual({ us: 3, them: 0 });
  });

  it('opponent_point always awards the point to them and triggers side-out logic', () => {
    const match = startedMatch();
    const after = appendOpponentPoint({ match, id: 'op1', timestamp: '2026-01-10T18:00:01.000+01:00' });
    const set = liveSetOf(after);
    expect(set?.ourPoints).toBe(0);
    expect(set?.theirPoints).toBe(1);
    expect(set?.servingTeam).toBe('them');
  });
});
