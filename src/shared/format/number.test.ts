import { describe, expect, it } from 'vitest';
import { NOT_AVAILABLE } from '@shared/copy';
import { formatCount, formatDateIt, formatPercent1, formatScoreLine } from './number';

describe('formatPercent1', () => {
  // Worked examples from docs/02-statistics.md §4.2.
  it.each<[number | null, string]>([
    [0.2, '20.0%'],
    [1 / 3, '33.3%'],
    [2 / 3, '66.7%'],
    [0, '0.0%'],
    [-0.125, '-12.5%'],
    [-1, '-100.0%'],
    [1, '100.0%'],
    [null, NOT_AVAILABLE],
  ])('formats %p as %p', (ratio, expected) => {
    expect(formatPercent1(ratio)).toBe(expected);
  });

  it('never returns "0.0%" for a null ratio', () => {
    expect(formatPercent1(null)).toBe('N/D');
  });

  it('normalises -0 to a positive zero', () => {
    expect(formatPercent1(-0)).toBe('0.0%');
    expect(formatPercent1(-0.0001)).toBe('0.0%'); // rounds to -0.0 before normalisation
  });

  it('rounds half away from zero, keeping positive and negative symmetric', () => {
    // 0.5% rounds up, -0.5% rounds down (away from zero), not both toward +Infinity.
    expect(formatPercent1(0.125)).toBe('12.5%');
    expect(formatPercent1(-0.1255)).toBe('-12.6%');
    expect(formatPercent1(0.1255)).toBe('12.6%');
  });

  it('keeps the negative sign on the same line as the number, never clamped', () => {
    // Fixture D from docs/02-statistics.md §9: (1 - 3) / 4 = -0.5.
    expect(formatPercent1(-0.5)).toBe('-50.0%');
  });
});

describe('formatCount', () => {
  it('renders counts as plain integers, zero included', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(5)).toBe('5');
    expect(formatCount(42)).toBe('42');
  });
});

describe('formatDateIt', () => {
  it('converts an ISO date to DD/MM/YYYY', () => {
    expect(formatDateIt('2026-09-22')).toBe('22/09/2026');
  });

  it('falls back to the raw string when it does not parse', () => {
    expect(formatDateIt('not-a-date')).toBe('not-a-date');
  });
});

describe('formatScoreLine', () => {
  it('formats "us – them"', () => {
    expect(formatScoreLine(25, 22)).toBe('25 – 22');
  });
});
