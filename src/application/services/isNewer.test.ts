import { describe, expect, it } from 'vitest';
import { isNewer } from './isNewer';

describe('isNewer', () => {
  it('compares instants, not strings, across UTC offsets', () => {
    // 13:00+02:00 is 11:00Z: earlier than 12:30Z although it sorts later as text.
    expect(isNewer('2026-09-23T13:00:00.000+02:00', '2026-09-23T12:30:00.000Z')).toBe(false);
    expect(isNewer('2026-09-23T12:30:00.000Z', '2026-09-23T13:00:00.000+02:00')).toBe(true);
  });

  it('handles the switch from summer to winter time', () => {
    expect(isNewer('2026-10-25T02:30:00.000+01:00', '2026-10-25T02:45:00.000+02:00')).toBe(true);
  });

  it('never calls an unreadable timestamp newer', () => {
    expect(isNewer('non una data', '2026-09-23T12:30:00.000Z')).toBe(false);
    expect(isNewer('2026-09-23T12:30:00.000Z', '2026-09-23T12:30:00.000Z')).toBe(false);
  });
});
