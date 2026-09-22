import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { ExportTarget } from '@application/ports/storage';
import { makeMatch } from '@test/factories';
import { exportMatch } from './index';

interface FakeTarget {
  readonly target: ExportTarget;
  readonly pickSavePath: Mock;
  readonly writeBinary: Mock;
}

/**
 * Mock functions are captured in local consts (never read back off `target`) so assertions
 * never trigger `@typescript-eslint/unbound-method` on the `ExportTarget` method signatures.
 */
function makeTarget(options: { pickSavePath?: Mock; writeBinary?: Mock } = {}): FakeTarget {
  const pickSavePath = options.pickSavePath ?? vi.fn(() => Promise.resolve('C:/exports/scout_Us_Them_2026-01-10.json'));
  const writeBinary = options.writeBinary ?? vi.fn(() => Promise.resolve());
  const target: ExportTarget = {
    pickSavePath,
    writeBinary,
    writeText: vi.fn(() => Promise.resolve()),
    pickAndReadJson: vi.fn(() => Promise.resolve(null)),
  };
  return { target, pickSavePath, writeBinary };
}

describe('exportMatch', () => {
  it('returns "cancelled" when the user dismisses the save dialog', async () => {
    const { target, writeBinary } = makeTarget({ pickSavePath: vi.fn(() => Promise.resolve(null)) });

    const result = await exportMatch(makeMatch(), 'json', target);

    expect(result).toEqual({ kind: 'cancelled' });
    expect(writeBinary).not.toHaveBeenCalled();
  });

  it('builds the file, writes it through the target, and returns "saved" with the path', async () => {
    const { target, pickSavePath, writeBinary } = makeTarget();

    const result = await exportMatch(makeMatch(), 'json', target);

    expect(result).toEqual({ kind: 'saved', path: 'C:/exports/scout_Us_Them_2026-01-10.json' });
    expect(pickSavePath).toHaveBeenCalledWith('scout_Us_Them_2026-01-10', 'json');
    expect(writeBinary).toHaveBeenCalledTimes(1);
  });

  it('returns "failed" instead of throwing when the write rejects', async () => {
    const { target } = makeTarget({
      writeBinary: vi.fn(() => Promise.reject(new Error('disk full'))),
    });

    const result = await exportMatch(makeMatch(), 'json', target);

    expect(result.kind).toBe('failed');
  });

  it('returns "failed" instead of throwing when picking the save path rejects', async () => {
    const { target } = makeTarget({
      pickSavePath: vi.fn(() => Promise.reject(new Error('dialog error'))),
    });

    const result = await exportMatch(makeMatch(), 'json', target);

    expect(result.kind).toBe('failed');
  });
});
