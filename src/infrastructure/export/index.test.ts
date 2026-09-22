import { describe, expect, it, vi } from 'vitest';
import type { ExportTarget } from '@application/ports/storage';
import { makeMatch } from '@test/factories';
import { exportMatch } from './index';

function makeTarget(overrides: Partial<ExportTarget> = {}): ExportTarget {
  return {
    pickSavePath: vi.fn(async () => 'C:/exports/scout_Us_Them_2026-01-10.json'),
    writeBinary: vi.fn(async () => {}),
    writeText: vi.fn(async () => {}),
    pickAndReadJson: vi.fn(async () => null),
    ...overrides,
  };
}

describe('exportMatch', () => {
  it('returns "cancelled" when the user dismisses the save dialog', async () => {
    const target = makeTarget({ pickSavePath: vi.fn(async () => null) });

    const result = await exportMatch(makeMatch(), 'json', target);

    expect(result).toEqual({ kind: 'cancelled' });
    expect(target.writeBinary).not.toHaveBeenCalled();
  });

  it('builds the file, writes it through the target, and returns "saved" with the path', async () => {
    const target = makeTarget();

    const result = await exportMatch(makeMatch(), 'json', target);

    expect(result).toEqual({ kind: 'saved', path: 'C:/exports/scout_Us_Them_2026-01-10.json' });
    expect(target.pickSavePath).toHaveBeenCalledWith('scout_Us_Them_2026-01-10', 'json');
    expect(target.writeBinary).toHaveBeenCalledTimes(1);
  });

  it('returns "failed" instead of throwing when the write rejects', async () => {
    const target = makeTarget({
      writeBinary: vi.fn(async () => {
        throw new Error('disk full');
      }),
    });

    const result = await exportMatch(makeMatch(), 'json', target);

    expect(result.kind).toBe('failed');
  });

  it('returns "failed" instead of throwing when picking the save path rejects', async () => {
    const target = makeTarget({
      pickSavePath: vi.fn(async () => {
        throw new Error('dialog error');
      }),
    });

    const result = await exportMatch(makeMatch(), 'json', target);

    expect(result.kind).toBe('failed');
  });
});
