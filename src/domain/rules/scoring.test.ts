import { describe, expect, it } from 'vitest';
import type { SetState } from '@domain/index';
import {
  applyPoint,
  evaluateSetEnd,
  isMatchWon,
  isSetPointFor,
  isSetWon,
  isTerminalOutcome,
  isTieBreakSet,
  setsNeededToWin,
  targetForSet,
} from '@domain/index';

// Reference: docs/01-domain-model.md §3.1 (isTerminalOutcome), §3.2 (scoring), E1-E6, E24, E25.

describe('isTerminalOutcome', () => {
  it('point is always terminal for us, regardless of skill', () => {
    expect(isTerminalOutcome('serve', 'point')).toEqual({ isTerminal: true, pointTo: 'us' });
    expect(isTerminalOutcome('attack', 'point')).toEqual({ isTerminal: true, pointTo: 'us' });
    expect(isTerminalOutcome('block', 'point')).toEqual({ isTerminal: true, pointTo: 'us' });
  });

  it('error is always terminal for them, regardless of skill', () => {
    expect(isTerminalOutcome('serve', 'error')).toEqual({ isTerminal: true, pointTo: 'them' });
    expect(isTerminalOutcome('reception', 'error')).toEqual({ isTerminal: true, pointTo: 'them' });
    expect(isTerminalOutcome('dig', 'error')).toEqual({ isTerminal: true, pointTo: 'them' });
    expect(isTerminalOutcome('set', 'error')).toEqual({ isTerminal: true, pointTo: 'them' });
  });

  it('positive, neutral and negative never end the rally', () => {
    expect(isTerminalOutcome('attack', 'positive')).toEqual({ isTerminal: false, pointTo: null });
    expect(isTerminalOutcome('attack', 'neutral')).toEqual({ isTerminal: false, pointTo: null });
    expect(isTerminalOutcome('attack', 'negative')).toEqual({ isTerminal: false, pointTo: null });
  });
});

describe('applyPoint', () => {
  it('increments only the winning side', () => {
    expect(applyPoint({ us: 3, them: 5 }, 'us')).toEqual({ us: 4, them: 5 });
    expect(applyPoint({ us: 3, them: 5 }, 'them')).toEqual({ us: 3, them: 6 });
  });
});

describe('isSetWon — exhaustive table from §3.2', () => {
  const target = 25;

  it.each([
    [24, 20, false, 'below target'],
    [25, 20, true, 'normal win'],
    [25, 23, true, 'margin 2'],
    [25, 24, false, 'deuce, play on (E1/E2)'],
    [26, 24, true, 'win by two after deuce'],
    [26, 25, false, 'still deuce'],
    [30, 28, true, 'no cap, deep deuce (A6/E4)'],
    [41, 39, true, 'extreme deep deuce'],
  ])('ourPoints=%i theirPoints=%i -> %s (%s)', (ourPoints, theirPoints, expected) => {
    expect(isSetWon(ourPoints, theirPoints, target, true)).toBe(expected);
  });

  it('winByTwo = false: first to reach target wins even at a one-point margin', () => {
    expect(isSetWon(25, 24, 25, false)).toBe(true);
    expect(isSetWon(24, 24, 25, false)).toBe(false);
    expect(isSetWon(25, 25, 25, false)).toBe(false); // equal, no winner
  });
});

describe('targetForSet / isTieBreakSet', () => {
  it('uses pointsToWinTieBreak only on the deciding set index (bestOf - 1)', () => {
    const settings = {
      bestOf: 5 as const,
      pointsToWinSet: 25,
      pointsToWinTieBreak: 15,
      winByTwo: true,
      startingServer: 'us' as const,
      startingSide: 'left' as const,
      timeoutsPerSet: 2,
      substitutionsPerSet: 6,
      trackSetSkill: false,
    };
    expect(targetForSet(settings, 0)).toBe(25);
    expect(targetForSet(settings, 3)).toBe(25);
    expect(targetForSet(settings, 4)).toBe(15);
    expect(isTieBreakSet(settings, 4)).toBe(true);
    expect(isTieBreakSet(settings, 3)).toBe(false);
  });

  it('E6: best-of-3, deciding index is 2, still uses the tie-break target', () => {
    const settings = {
      bestOf: 3 as const,
      pointsToWinSet: 25,
      pointsToWinTieBreak: 15,
      winByTwo: true,
      startingServer: 'us' as const,
      startingSide: 'left' as const,
      timeoutsPerSet: 2,
      substitutionsPerSet: 6,
      trackSetSkill: false,
    };
    expect(targetForSet(settings, 2)).toBe(15);
    expect(isTieBreakSet(settings, 2)).toBe(true);
  });

  it('E5: set point badge condition in the tie-break — 14-13 with target 15', () => {
    const settings = {
      bestOf: 3 as const,
      pointsToWinSet: 25,
      pointsToWinTieBreak: 15,
      winByTwo: true,
      startingServer: 'us' as const,
      startingSide: 'left' as const,
      timeoutsPerSet: 2,
      substitutionsPerSet: 6,
      trackSetSkill: false,
    };
    const set: SetState = {
      index: 2,
      status: 'live',
      ourPoints: 14,
      theirPoints: 13,
      winner: null,
      servingTeam: 'us',
      rotationOffset: 0,
      lineup: null,
      timeoutsUsed: { us: 0, them: 0 },
      substitutionsUsed: 0,
      startedAt: null,
      endedAt: null,
      isTieBreak: true,
      target: 15,
    };
    expect(isSetPointFor(set, settings, 'us')).toBe(true);
    expect(isSetPointFor(set, settings, 'them')).toBe(false);
  });
});

describe('setsNeededToWin / isMatchWon', () => {
  it.each([
    [3 as const, 0, false],
    [3 as const, 1, false],
    [3 as const, 2, true],
    [3 as const, 3, true],
    [5 as const, 0, false],
    [5 as const, 2, false],
    [5 as const, 3, true],
    [5 as const, 5, true],
  ])('bestOf=%i setsWon=%i -> isMatchWon=%s', (bestOf, setsWon, expected) => {
    expect(isMatchWon(setsWon, bestOf)).toBe(expected);
  });

  it('setsNeededToWin', () => {
    expect(setsNeededToWin(3)).toBe(2);
    expect(setsNeededToWin(5)).toBe(3);
  });
});

describe('evaluateSetEnd', () => {
  const settings = {
    bestOf: 5 as const,
    pointsToWinSet: 25,
    pointsToWinTieBreak: 15,
    winByTwo: true,
    startingServer: 'us' as const,
    startingSide: 'left' as const,
    timeoutsPerSet: 2,
    substitutionsPerSet: 6,
    trackSetSkill: false,
  };

  function baseSet(overrides: Partial<SetState>): SetState {
    return {
      index: 0,
      status: 'live',
      ourPoints: 0,
      theirPoints: 0,
      winner: null,
      servingTeam: 'us',
      rotationOffset: 0,
      lineup: null,
      timeoutsUsed: { us: 0, them: 0 },
      substitutionsUsed: 0,
      startedAt: null,
      endedAt: null,
      isTieBreak: false,
      target: 25,
      ...overrides,
    };
  }

  it('E3: 26-24 detects us as winner without closing anything structurally', () => {
    const set = baseSet({ ourPoints: 26, theirPoints: 24 });
    expect(evaluateSetEnd(set, settings)).toBe('us');
  });

  it('returns null at 24-24 and 25-24 (deuce, no winner yet)', () => {
    expect(evaluateSetEnd(baseSet({ ourPoints: 24, theirPoints: 24 }), settings)).toBeNull();
    expect(evaluateSetEnd(baseSet({ ourPoints: 25, theirPoints: 24 }), settings)).toBeNull();
  });

  it('detects the opponent as winner symmetrically', () => {
    const set = baseSet({ ourPoints: 20, theirPoints: 25 });
    expect(evaluateSetEnd(set, settings)).toBe('them');
  });

  it('E25: target of 1 with winByTwo — 1-0 is not a win, 2-0 is', () => {
    const looseSettings = { ...settings, pointsToWinSet: 1 };
    expect(evaluateSetEnd(baseSet({ ourPoints: 1, theirPoints: 0, target: 1 }), looseSettings)).toBeNull();
    expect(evaluateSetEnd(baseSet({ ourPoints: 2, theirPoints: 0, target: 1 }), looseSettings)).toBe('us');
  });
});
