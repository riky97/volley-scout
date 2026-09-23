import { describe, expect, it } from 'vitest';
import type { RosterTemplate } from '@domain/index';
import { createPlayer, createRosterTemplate } from '@domain/index';
import { mergeRosters } from './mergeRosters';

function roster(id: string, updatedAt: string): RosterTemplate {
  return {
    ...createRosterTemplate({
      id,
      name: `Rosa ${id}`,
      teamName: '',
      players: [createPlayer({ id: `${id}-p1`, shirtNumber: 1, name: 'Anna Uno' })],
      timestamp: '2026-09-01T10:00:00.000Z',
    }),
    updatedAt,
  };
}

describe('mergeRosters', () => {
  it('adds every roster to an empty device', () => {
    const merge = mergeRosters([], [roster('a', '2026-09-10'), roster('b', '2026-09-10')]);

    expect(merge.toSave.map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(merge).toMatchObject({ added: 2, updated: 0, unchanged: 0 });
  });

  it('replaces a local roster only with a newer copy', () => {
    const local = [roster('a', '2026-09-10'), roster('b', '2026-09-20')];
    const merge = mergeRosters(local, [roster('a', '2026-09-15'), roster('b', '2026-09-15')]);

    expect(merge.toSave.map((entry) => entry.id)).toEqual(['a']);
    expect(merge).toMatchObject({ added: 0, updated: 1, unchanged: 1 });
  });

  it('changes nothing when the same backup is imported twice', () => {
    const local = [roster('a', '2026-09-10')];
    const merge = mergeRosters(local, [roster('a', '2026-09-10')]);

    expect(merge.toSave).toEqual([]);
    expect(merge.unchanged).toBe(1);
  });
});
