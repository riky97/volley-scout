import { describe, expect, it } from 'vitest';
import { makeMatch } from '@test/factories';
import { decideMatchImport } from './matchImport';

describe('decideMatchImport', () => {
  const older = { ...makeMatch(), updatedAt: '2026-09-10T20:00:00.000+02:00' };
  const newer = { ...older, updatedAt: '2026-09-12T20:00:00.000+02:00' };

  it('adds a match this device has never seen', () => {
    expect(decideMatchImport(null, older)).toBe('add');
  });

  it('replaces the local copy only with a newer one', () => {
    expect(decideMatchImport(older, newer)).toBe('update');
    expect(decideMatchImport(newer, older)).toBe('unchanged');
  });

  it('changes nothing when the same file is imported twice', () => {
    expect(decideMatchImport(older, older)).toBe('unchanged');
  });
});

describe('decideMatchImport across UTC offsets', () => {
  it('sees a copy saved later on a device in another offset as newer', () => {
    const local = { ...makeMatch(), updatedAt: '2026-09-23T13:00:00.000+02:00' };
    const tablet = { ...local, updatedAt: '2026-09-23T12:30:00.000Z' };

    expect(decideMatchImport(local, tablet)).toBe('update');
  });
});
