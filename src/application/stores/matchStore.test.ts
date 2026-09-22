import { beforeEach, describe, expect, it } from 'vitest';
import type { Lineup, Match, Player } from '@domain/index';
import { DEFAULT_MATCH_SETTINGS, createMatch, createPlayer, startSet } from '@domain/index';
import { useMatchStore } from './matchStore';

const TIMESTAMP = '2026-09-22T19:00:00.000+02:00';

function makeRoster(): readonly Player[] {
  return Array.from({ length: 7 }, (_, index) =>
    createPlayer({
      id: `player-${String(index + 1)}`,
      shirtNumber: index + 1,
      name: `Atleta ${String(index + 1)}`,
      shortName: `A${String(index + 1)}`,
    }),
  );
}

function makeLiveMatch(): Match {
  const roster = makeRoster();
  const match = createMatch({
    id: 'match-store-test',
    ourTeamId: 'team-us',
    opponentTeamId: 'team-them',
    ourTeamName: 'Noi',
    opponentTeamName: 'Loro',
    date: '2026-09-22',
    venue: '',
    competition: '',
    notes: '',
    settings: DEFAULT_MATCH_SETTINGS,
    roster,
    timestamp: TIMESTAMP,
  });
  const [p1, p2, p3, p4, p5, p6] = roster;
  if (
    p1 === undefined ||
    p2 === undefined ||
    p3 === undefined ||
    p4 === undefined ||
    p5 === undefined ||
    p6 === undefined
  ) {
    throw new Error('roster too small');
  }
  const lineup: Lineup = [p1.id, p2.id, p3.id, p4.id, p5.id, p6.id];
  return startSet({ match, lineup, id: 'set-start', timestamp: TIMESTAMP });
}

describe('matchStore undo and redo', () => {
  beforeEach(() => {
    useMatchStore.getState().setMatch(makeLiveMatch());
  });

  it('undoes and redoes a recorded rally', () => {
    const store = useMatchStore.getState();
    store.recordOpponentPoint();
    expect(useMatchStore.getState().snapshot?.score.them).toBe(1);

    useMatchStore.getState().undo();
    expect(useMatchStore.getState().snapshot?.score.them).toBe(0);
    expect(useMatchStore.getState().redoBuffer).not.toBeNull();

    useMatchStore.getState().redo();
    expect(useMatchStore.getState().snapshot?.score.them).toBe(1);
    expect(useMatchStore.getState().redoBuffer).toBeNull();
  });

  it('does not buffer a set_start when there is nothing to undo', () => {
    // Only the set_start is in the log: undo must be a no-op and must not arm redo,
    // otherwise redo would append a second set_start and open a phantom set.
    useMatchStore.getState().undo();

    expect(useMatchStore.getState().redoBuffer).toBeNull();
    expect(useMatchStore.getState().match?.events).toHaveLength(1);

    useMatchStore.getState().redo();

    expect(useMatchStore.getState().match?.sets).toHaveLength(1);
    expect(useMatchStore.getState().match?.events).toHaveLength(1);
  });

  it('keeps the score after an undo that crosses a rally sequence', () => {
    const store = useMatchStore.getState();
    store.recordOurPoint();
    store.recordOurPoint();
    store.recordOpponentPoint();

    expect(useMatchStore.getState().snapshot?.score).toEqual({ us: 2, them: 1 });

    useMatchStore.getState().undo();

    expect(useMatchStore.getState().snapshot?.score).toEqual({ us: 2, them: 0 });
    expect(useMatchStore.getState().snapshot?.servingTeam).toBe('us');
  });
});
