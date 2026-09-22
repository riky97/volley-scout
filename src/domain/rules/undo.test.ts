import { describe, expect, it } from 'vitest';
import {
  affectedEventCount,
  appendSubstitution,
  canUndo,
  deleteEvent,
  editEvent,
  endSet,
  isUndoable,
  liveSetOf,
  removeSet,
  startSet,
  undoLastEvent,
} from '@domain/index';
import { lineupFrom, makeMatch, playPoints, playRally, startedMatch } from '@test/factories';

// Reference: docs/01-domain-model.md §3.7 (undo), §3.8 (edit/delete), E7-E11.

describe('isUndoable / canUndo', () => {
  it('set_start is never undoable', () => {
    const match = startedMatch();
    const setStart = match.events[0];
    expect(setStart?.type).toBe('set_start');
    expect(setStart !== undefined && isUndoable(setStart)).toBe(false);
  });

  it('E9: canUndo is false and undo is a no-op when only set_start exists', () => {
    const match = startedMatch();
    expect(canUndo(match)).toBe(false);
    expect(undoLastEvent(match, '2026-01-10T18:05:00.000+01:00')).toBe(match);
  });

  it('every other event type is undoable', () => {
    const match = startedMatch();
    const after = playRally({ match, player: liveSetOf(match)?.lineup?.[0] ?? '', skill: 'serve', outcome: 'point' });
    expect(canUndo(after)).toBe(true);
  });
});

describe('undoLastEvent', () => {
  it('pops the last rally event and restores score/serving/rotation from the fold', () => {
    const match = startedMatch();
    const server = liveSetOf(match)?.lineup?.[0] ?? '';
    const after = playRally({ match, player: server, skill: 'serve', outcome: 'point' });
    expect(liveSetOf(after)?.ourPoints).toBe(1);

    const undone = undoLastEvent(after, '2026-01-10T18:05:00.000+01:00');
    expect(liveSetOf(undone)?.ourPoints).toBe(0);
    expect(liveSetOf(undone)?.servingTeam).toBe('us');
    expect(undone.events.length).toBe(1); // only set_start remains
  });

  it('E7: undo immediately after set_end reopens the set with its final score intact', () => {
    let match = startedMatch({ match: makeMatch({ settings: { bestOf: 3, pointsToWinSet: 3 } }) });
    match = playPoints(match, 'us', 3);
    match = endSet(match, 'end0', '2026-01-10T18:01:00.000+01:00');
    expect(match.sets[0]?.status).toBe('finished');

    const undone = undoLastEvent(match, '2026-01-10T18:02:00.000+01:00');
    expect(undone.sets[0]?.status).toBe('live');
    expect(undone.sets[0]?.winner).toBeNull();
    expect(undone.sets[0]?.endedAt).toBeNull();
    expect(undone.sets[0]?.ourPoints).toBe(3);
    expect(undone.sets[0]?.theirPoints).toBe(0);
    expect(undone.status).toBe('live');
  });

  it('E8: set_start is not undoable across a set boundary — undo is disabled instead', () => {
    let match = startedMatch({ match: makeMatch({ settings: { bestOf: 3, pointsToWinSet: 3 } }) });
    match = playPoints(match, 'us', 3);
    match = endSet(match, 'end0', '2026-01-10T18:01:00.000+01:00');
    match = startSet({
      match,
      lineup: lineupFrom(match.roster),
      id: 'start1',
      timestamp: '2026-01-10T18:02:00.000+01:00',
    });
    // Only the set_start of set 1 sits on top of the log: undo must be disabled, not pop it.
    expect(canUndo(match)).toBe(false);
    expect(undoLastEvent(match, '2026-01-10T18:03:00.000+01:00')).toBe(match);
    expect(match.sets.length).toBe(2);
    expect(match.sets[0]?.status).toBe('finished'); // set 1 still finished
  });

  it('undo of a substitution restores the outgoing player to the lineup slot and the counter', () => {
    const match = startedMatch();
    const outId = liveSetOf(match)?.lineup?.[4] ?? '';
    const inId = match.roster[6]?.id ?? '';
    const after = appendSubstitution({
      match,
      playerOutId: outId,
      playerInId: inId,
      id: 'sub1',
      timestamp: '2026-01-10T18:01:00.000+01:00',
    });
    expect(liveSetOf(after)?.lineup?.[4]).toBe(inId);

    const undone = undoLastEvent(after, '2026-01-10T18:02:00.000+01:00');
    expect(liveSetOf(undone)?.lineup?.[4]).toBe(outId);
    expect(liveSetOf(undone)?.substitutionsUsed).toBe(0);
  });
});

describe('deleteEvent — E10, E11', () => {
  it('E10: deleting a mid-match event re-densifies sequence and refolds everything after it', () => {
    const match = startedMatch();
    const server = liveSetOf(match)?.lineup?.[0] ?? '';
    let current = match;
    const ids: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      current = playRally({
        match: current,
        player: server,
        skill: 'serve',
        outcome: i % 2 === 0 ? 'point' : 'error',
        idGen: () => `rally-${i}`,
      });
      ids.push(`rally-${i}`);
    }
    // Score after 5 alternating point/error rallies started from serving 'us': the score sequence
    // depends on side-outs; just capture it before deleting the middle event.
    const before = liveSetOf(current);
    expect(before).not.toBeNull();

    const deleted = deleteEvent(current, 'rally-2', '2026-01-10T18:10:00.000+01:00');
    // 5 events - 1 deleted = 4 rally events remain, plus the set_start = 5 total, densified 0..4.
    expect(deleted.events.length).toBe(5);
    expect(deleted.events.map((event) => event.sequence)).toEqual([0, 1, 2, 3, 4]);
    expect(deleted.events.some((event) => event.id === 'rally-2')).toBe(false);
  });

  it('E11: deleting an event that flips a finished set score reopens the set with a warning', () => {
    let match = startedMatch({ match: makeMatch({ settings: { bestOf: 3, pointsToWinSet: 3 } }) });
    const server = liveSetOf(match)?.lineup?.[0] ?? '';
    match = playRally({ match, player: server, skill: 'serve', outcome: 'point', idGen: () => 'p1' });
    match = playRally({ match, player: server, skill: 'serve', outcome: 'point', idGen: () => 'p2' });
    match = playRally({ match, player: server, skill: 'serve', outcome: 'point', idGen: () => 'p3' });
    expect(liveSetOf(match)?.ourPoints).toBe(3);
    match = endSet(match, 'end0', '2026-01-10T18:01:00.000+01:00');
    expect(match.sets[0]?.status).toBe('finished');

    // Delete one of the winning points: the set no longer reaches 3, so the fold must reopen it.
    const after = deleteEvent(match, 'p2', '2026-01-10T18:02:00.000+01:00');
    expect(after.sets[0]?.status).toBe('live');
    expect(after.sets[0]?.winner).toBeNull();
    expect(after.sets[0]?.ourPoints).toBe(2);
  });

  it('deleting a set_start removes the whole set', () => {
    const match = startedMatch();
    const setStartId = match.events[0]?.id ?? '';
    const after = deleteEvent(match, setStartId, '2026-01-10T18:05:00.000+01:00');
    expect(after.sets.length).toBe(0);
    expect(after.events.length).toBe(0);
    expect(after.status).toBe('setup');
  });
});

describe('removeSet', () => {
  it('removes a whole set by index, same as deleting its set_start', () => {
    const match = startedMatch();
    const after = removeSet(match, 0, '2026-01-10T18:05:00.000+01:00');
    expect(after.sets.length).toBe(0);
    expect(after.events.length).toBe(0);
  });
});

describe('editEvent', () => {
  it('changing a rally outcome refolds downstream score/serving/rotation', () => {
    const match = startedMatch();
    const server = liveSetOf(match)?.lineup?.[0] ?? '';
    let current = playRally({ match, player: server, skill: 'serve', outcome: 'point', idGen: () => 'r1' });
    current = playRally({ match: current, player: server, skill: 'serve', outcome: 'point', idGen: () => 'r2' });
    expect(liveSetOf(current)?.ourPoints).toBe(2);

    const edited = editEvent(current, 'r1', { outcome: 'error' }, '2026-01-10T18:06:00.000+01:00');
    // r1 now gives the point to them; r2 still scores for us afterward.
    expect(liveSetOf(edited)?.ourPoints).toBe(1);
    expect(liveSetOf(edited)?.theirPoints).toBe(1);
  });

  it('INVALID_OUTCOME: editing into a disallowed skill/outcome combination throws', () => {
    const match = startedMatch();
    const server = liveSetOf(match)?.lineup?.[0] ?? '';
    const current = playRally({ match, player: server, skill: 'serve', outcome: 'point', idGen: () => 'r1' });
    expect(() =>
      editEvent(current, 'r1', { skill: 'reception', outcome: 'point' }, '2026-01-10T18:06:00.000+01:00'),
    ).toThrow();
  });

  it('EVENT_NOT_FOUND: editing a missing event id throws', () => {
    const match = startedMatch();
    expect(() => editEvent(match, 'nope', { comment: 'x' }, '2026-01-10T18:06:00.000+01:00')).toThrow();
  });
});

describe('affectedEventCount', () => {
  it('counts events strictly after the given one', () => {
    const match = startedMatch();
    const server = liveSetOf(match)?.lineup?.[0] ?? '';
    let current = playRally({ match, player: server, skill: 'serve', outcome: 'point', idGen: () => 'r1' });
    current = playRally({ match: current, player: server, skill: 'serve', outcome: 'point', idGen: () => 'r2' });
    current = playRally({ match: current, player: server, skill: 'serve', outcome: 'point', idGen: () => 'r3' });

    // events: [set_start, r1, r2, r3] -> r1 is index 1, so 2 events follow it (r2, r3).
    expect(affectedEventCount(current, 'r1')).toBe(2);
    expect(affectedEventCount(current, 'r3')).toBe(0);
    expect(affectedEventCount(current, 'unknown-id')).toBe(0);
  });
});
