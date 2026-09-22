import { describe, expect, it } from 'vitest';
import type { Lineup, Match } from '@domain/index';
import {
  appendOpponentPoint,
  appendRallyEvent,
  appendSubstitution,
  appendTimeout,
  buildSnapshot,
  courtOf,
  createPlayer,
  currentServerId,
  isPlayerOnCourt,
  nextRotationOffset,
  playerAtPosition,
  positionOfSlot,
  shouldRotate,
  slotAtPosition,
  startSet,
} from '@domain/index';
import { makeIdGenerator, makeMatch } from '@test/factories';

// Reference: docs/01-domain-model.md §3.4 (rotation) and §5 (the 12-event worked trace).

const LINEUP: Lineup = ['rossi', 'bianchi', 'verdi', 'neri', 'gialli', 'blu'];

describe('playerAtPosition / courtOf', () => {
  it('offset 0 maps positions to the lineup array directly', () => {
    expect(playerAtPosition(LINEUP, 0, 'P1')).toBe('rossi');
    expect(playerAtPosition(LINEUP, 0, 'P2')).toBe('bianchi');
    expect(playerAtPosition(LINEUP, 0, 'P6')).toBe('blu');
  });

  it('offset 1: the P2 starter becomes the new P1 (clockwise)', () => {
    expect(playerAtPosition(LINEUP, 1, 'P1')).toBe('bianchi');
    expect(playerAtPosition(LINEUP, 1, 'P6')).toBe('rossi');
  });

  it('courtOf lists all six positions consistently with playerAtPosition', () => {
    const court = courtOf(LINEUP, 2);
    expect(court).toEqual([
      { position: 'P1', playerId: 'verdi' },
      { position: 'P2', playerId: 'neri' },
      { position: 'P3', playerId: 'gialli' },
      { position: 'P4', playerId: 'blu' },
      { position: 'P5', playerId: 'rossi' },
      { position: 'P6', playerId: 'bianchi' },
    ]);
  });
});

describe('slotAtPosition / positionOfSlot — inverse of each other', () => {
  it('round-trips for every slot and offset', () => {
    for (let offset = 0; offset < 6; offset += 1) {
      for (let slot = 0; slot < 6; slot += 1) {
        const position = positionOfSlot(offset, slot);
        expect(slotAtPosition(offset, position)).toBe(slot);
      }
    }
  });
});

describe('shouldRotate / nextRotationOffset — table from §3.4', () => {
  it.each([
    // shouldRotate mirrors isSideOut (a side-out happened at all); nextRotationOffset only
    // advances OUR offset when WE were receiving and WE won (A1: their rotation isn't modelled).
    ['us', 'us', false, 0],
    ['us', 'them', true, 0], // side-out against us: they rotate, not modelled, our offset stays
    ['them', 'us', true, 1],
    ['them', 'them', false, 0],
  ] as const)('servingBefore=%s pointTo=%s -> shouldRotate=%s offset=%i', (servingBefore, pointTo, rotates, offset) => {
    expect(shouldRotate(servingBefore, pointTo)).toBe(rotates);
    expect(nextRotationOffset(0, servingBefore, pointTo)).toBe(offset);
  });

  it('wraps from 5 back to 0', () => {
    expect(nextRotationOffset(5, 'them', 'us')).toBe(0);
  });
});

describe('currentServerId / isPlayerOnCourt', () => {
  it('is null when they serve, and the P1 player when we serve', () => {
    const servingUs = {
      index: 0,
      status: 'live' as const,
      ourPoints: 0,
      theirPoints: 0,
      winner: null,
      servingTeam: 'us' as const,
      rotationOffset: 1,
      lineup: LINEUP,
      timeoutsUsed: { us: 0, them: 0 },
      substitutionsUsed: 0,
      startedAt: null,
      endedAt: null,
      isTieBreak: false,
      target: 25,
    };
    expect(currentServerId(servingUs)).toBe('bianchi');
    expect(currentServerId({ ...servingUs, servingTeam: 'them' })).toBeNull();
    expect(currentServerId({ ...servingUs, lineup: null })).toBeNull();
  });

  it('isPlayerOnCourt checks membership in the lineup array', () => {
    const set = {
      index: 0,
      status: 'live' as const,
      ourPoints: 0,
      theirPoints: 0,
      winner: null,
      servingTeam: 'us' as const,
      rotationOffset: 0,
      lineup: LINEUP,
      timeoutsUsed: { us: 0, them: 0 },
      substitutionsUsed: 0,
      startedAt: null,
      endedAt: null,
      isTieBreak: false,
      target: 25,
    };
    expect(isPlayerOnCourt(set, 'rossi')).toBe(true);
    expect(isPlayerOnCourt(set, 'mori')).toBe(false);
  });
});

describe('worked example — 12-event trace (docs/01-domain-model.md §5)', () => {
  const roster = [
    createPlayer({ id: 'rossi', shirtNumber: 1, name: 'Rossi' }),
    createPlayer({ id: 'bianchi', shirtNumber: 2, name: 'Bianchi' }),
    createPlayer({ id: 'verdi', shirtNumber: 3, name: 'Verdi' }),
    createPlayer({ id: 'neri', shirtNumber: 4, name: 'Neri' }),
    createPlayer({ id: 'gialli', shirtNumber: 5, name: 'Gialli' }),
    createPlayer({ id: 'blu', shirtNumber: 6, name: 'Blu' }),
    createPlayer({ id: 'mori', shirtNumber: 7, name: 'Mori' }),
  ];

  function expectState(
    match: Match,
    expected: {
      readonly score: { readonly us: number; readonly them: number };
      readonly servingTeam: 'us' | 'them';
      readonly rotationOffset: number;
      readonly server: string | null;
      readonly court: readonly string[]; // P1..P6
    },
  ): void {
    const snapshot = buildSnapshot(match);
    expect(snapshot.score).toEqual(expected.score);
    expect(snapshot.servingTeam).toBe(expected.servingTeam);
    expect(snapshot.currentSet?.rotationOffset).toBe(expected.rotationOffset);
    expect(snapshot.currentServerId).toBe(expected.server);
    expect(snapshot.court.map((positioned) => positioned.playerId)).toEqual(expected.court);
  }

  it('reproduces score, serving team, rotation offset, server and full court after every event', () => {
    const id = makeIdGenerator('evt');
    let t = 0;
    const timestamp = (): string => `2026-01-10T18:00:${String(t++).padStart(2, '0')}.000+01:00`;

    const baseMatch = makeMatch({ roster, settings: { bestOf: 5, pointsToWinSet: 25 } });

    // 1. set_start: lineup [Rossi, Bianchi, Verdi, Neri, Gialli, Blu], serving us, target 25.
    let match = startSet({
      match: baseMatch,
      lineup: ['rossi', 'bianchi', 'verdi', 'neri', 'gialli', 'blu'],
      servingTeam: 'us',
      id: id(),
      timestamp: timestamp(),
    });
    expectState(match, {
      score: { us: 0, them: 0 },
      servingTeam: 'us',
      rotationOffset: 0,
      server: 'rossi',
      court: ['rossi', 'bianchi', 'verdi', 'neri', 'gialli', 'blu'],
    });

    // 2. rally Rossi · serve · point (ace)
    match = appendRallyEvent({
      match,
      playerId: 'rossi',
      skill: 'serve',
      outcome: 'point',
      id: id(),
      timestamp: timestamp(),
    });
    expectState(match, {
      score: { us: 1, them: 0 },
      servingTeam: 'us',
      rotationOffset: 0,
      server: 'rossi',
      court: ['rossi', 'bianchi', 'verdi', 'neri', 'gialli', 'blu'],
    });

    // 3. rally Neri · attack · error -> we lose a rally while serving: no rotation, serve passes.
    match = appendRallyEvent({
      match,
      playerId: 'neri',
      skill: 'attack',
      outcome: 'error',
      id: id(),
      timestamp: timestamp(),
    });
    expectState(match, {
      score: { us: 1, them: 1 },
      servingTeam: 'them',
      rotationOffset: 0,
      server: null,
      court: ['rossi', 'bianchi', 'verdi', 'neri', 'gialli', 'blu'],
    });

    // 4. rally Gialli · reception · positive -> non-terminal, everything untouched.
    match = appendRallyEvent({
      match,
      playerId: 'gialli',
      skill: 'reception',
      outcome: 'positive',
      id: id(),
      timestamp: timestamp(),
    });
    expectState(match, {
      score: { us: 1, them: 1 },
      servingTeam: 'them',
      rotationOffset: 0,
      server: null,
      court: ['rossi', 'bianchi', 'verdi', 'neri', 'gialli', 'blu'],
    });

    // 5. rally Neri · attack · point (kill) -> side-out for us: offset 0 -> 1, Bianchi becomes server.
    match = appendRallyEvent({
      match,
      playerId: 'neri',
      skill: 'attack',
      outcome: 'point',
      id: id(),
      timestamp: timestamp(),
    });
    expectState(match, {
      score: { us: 2, them: 1 },
      servingTeam: 'us',
      rotationOffset: 1,
      server: 'bianchi',
      court: ['bianchi', 'verdi', 'neri', 'gialli', 'blu', 'rossi'],
    });

    // 6. rally Bianchi · serve · error
    match = appendRallyEvent({
      match,
      playerId: 'bianchi',
      skill: 'serve',
      outcome: 'error',
      id: id(),
      timestamp: timestamp(),
    });
    expectState(match, {
      score: { us: 2, them: 2 },
      servingTeam: 'them',
      rotationOffset: 1,
      server: null,
      court: ['bianchi', 'verdi', 'neri', 'gialli', 'blu', 'rossi'],
    });

    // 7. opponent_point -> they were already serving, no side-out for us, offset untouched.
    match = appendOpponentPoint({ match, id: id(), timestamp: timestamp() });
    expectState(match, {
      score: { us: 2, them: 3 },
      servingTeam: 'them',
      rotationOffset: 1,
      server: null,
      court: ['bianchi', 'verdi', 'neri', 'gialli', 'blu', 'rossi'],
    });

    // 8. rally Verdi · block · point -> side-out for us: offset 1 -> 2, Verdi becomes server.
    match = appendRallyEvent({
      match,
      playerId: 'verdi',
      skill: 'block',
      outcome: 'point',
      id: id(),
      timestamp: timestamp(),
    });
    expectState(match, {
      score: { us: 3, them: 3 },
      servingTeam: 'us',
      rotationOffset: 2,
      server: 'verdi',
      court: ['verdi', 'neri', 'gialli', 'blu', 'rossi', 'bianchi'],
    });

    // 9. timeout them, atScore 3-3 -> no structural change.
    match = appendTimeout({ match, team: 'them', id: id(), timestamp: timestamp() });
    expectState(match, {
      score: { us: 3, them: 3 },
      servingTeam: 'us',
      rotationOffset: 2,
      server: 'verdi',
      court: ['verdi', 'neri', 'gialli', 'blu', 'rossi', 'bianchi'],
    });

    // 10. rally Verdi · serve · point (ace) -> we keep serving, no side-out, offset unchanged.
    match = appendRallyEvent({
      match,
      playerId: 'verdi',
      skill: 'serve',
      outcome: 'point',
      id: id(),
      timestamp: timestamp(),
    });
    expectState(match, {
      score: { us: 4, them: 3 },
      servingTeam: 'us',
      rotationOffset: 2,
      server: 'verdi',
      court: ['verdi', 'neri', 'gialli', 'blu', 'rossi', 'bianchi'],
    });

    // 11. substitution Gialli -> Mori (slot 4): lineup array edited in place, offset untouched.
    match = appendSubstitution({
      match,
      playerOutId: 'gialli',
      playerInId: 'mori',
      id: id(),
      timestamp: timestamp(),
    });
    expectState(match, {
      score: { us: 4, them: 3 },
      servingTeam: 'us',
      rotationOffset: 2,
      server: 'verdi',
      court: ['verdi', 'neri', 'mori', 'blu', 'rossi', 'bianchi'],
    });

    // 12. rally Bianchi · attack · error -> side-out against us: they serve, our offset unchanged.
    match = appendRallyEvent({
      match,
      playerId: 'bianchi',
      skill: 'attack',
      outcome: 'error',
      id: id(),
      timestamp: timestamp(),
    });
    expectState(match, {
      score: { us: 4, them: 4 },
      servingTeam: 'them',
      rotationOffset: 2,
      server: null,
      court: ['verdi', 'neri', 'mori', 'blu', 'rossi', 'bianchi'],
    });
  });
});
