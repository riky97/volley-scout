import { describe, expect, it, vi } from 'vitest';
import type { ExportTarget } from '@application/ports/storage';
import { createPlayer, createRosterTemplate } from '@domain/index';
import {
  buildRosterBackup,
  buildRosterBackupFileName,
  exportRosters,
  importRostersJson,
  pickRosterBackup,
} from './rosterBackup';

const EXPORTED_AT = '2026-09-23T18:30:00.000+02:00';

const rosters = [
  createRosterTemplate({
    id: 'template-1',
    name: 'Prima squadra',
    teamName: 'Noi',
    players: [
      createPlayer({ id: 'p1', shirtNumber: 4, name: 'Rossi Marco' }),
      createPlayer({ id: 'p2', shirtNumber: 12, name: 'Neri Paola', isLibero: true }),
    ],
    timestamp: '2026-09-20T10:00:00.000+02:00',
  }),
];

function fakeTarget(overrides: Partial<ExportTarget> = {}): ExportTarget {
  return {
    pickSavePath: vi.fn((name: string, extension: string) =>
      Promise.resolve<string | null>(`${name}.${extension}`),
    ),
    writeBinary: vi.fn(() => Promise.resolve()),
    writeText: vi.fn(() => Promise.resolve()),
    pickAndReadJson: vi.fn(() => Promise.resolve<string | null>(null)),
    ...overrides,
  };
}

describe('roster backup', () => {
  it('reads back exactly the rosters it wrote', () => {
    const result = importRostersJson(buildRosterBackup(rosters, EXPORTED_AT));

    expect(result).toEqual({ ok: true, rosters });
  });

  it('names the file after the export day', () => {
    expect(buildRosterBackupFileName(EXPORTED_AT)).toBe('rose_volley-scout_2026-09-23');
  });

  it('rejects a file that is not JSON', () => {
    expect(importRostersJson('not json')).toMatchObject({ ok: false, code: 'INVALID_JSON' });
  });

  it('rejects a match export picked by mistake', () => {
    const matchLike = JSON.stringify({ schemaVersion: 1, id: 'match-1', events: [] });

    expect(importRostersJson(matchLike)).toMatchObject({ ok: false, code: 'INVALID_DATA' });
  });

  it('writes the backup to the path the operator picked', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    const target = fakeTarget({ writeText });

    await expect(exportRosters(rosters, EXPORTED_AT, target)).resolves.toEqual({
      kind: 'saved',
      path: 'rose_volley-scout_2026-09-23.json',
    });
    expect(writeText).toHaveBeenCalledWith(
      'rose_volley-scout_2026-09-23.json',
      buildRosterBackup(rosters, EXPORTED_AT),
    );
  });

  it('reports a cancelled save dialog without writing', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    const target = fakeTarget({ pickSavePath: () => Promise.resolve(null), writeText });

    await expect(exportRosters(rosters, EXPORTED_AT, target)).resolves.toEqual({
      kind: 'cancelled',
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('turns a picked file into rosters, or into a refusal', async () => {
    const valid = fakeTarget({
      pickAndReadJson: () => Promise.resolve(buildRosterBackup(rosters, EXPORTED_AT)),
    });
    const invalid = fakeTarget({ pickAndReadJson: () => Promise.resolve('{}') });

    await expect(pickRosterBackup(valid)).resolves.toEqual({ kind: 'picked', rosters });
    await expect(pickRosterBackup(invalid)).resolves.toEqual({ kind: 'invalid' });
    await expect(pickRosterBackup(fakeTarget())).resolves.toEqual({ kind: 'cancelled' });
  });
});
