import type { RosterTemplate } from '@domain/index';
import { SCHEMA_VERSION } from '@domain/index';
import type { ExportTarget } from '@application/ports/storage';
import { createExportTarget } from '@infrastructure/storage';
import type { ParseErrorCode } from '@infrastructure/storage/schemas';
import { parseJson, parseRosterBackup } from '@infrastructure/storage/schemas';
import type { ExportOutcome } from './index';

/** Pretty-printed like the match export, so the file stays readable by hand. */
export function buildRosterBackup(rosters: readonly RosterTemplate[], exportedAt: string): string {
  return JSON.stringify(
    { schemaVersion: SCHEMA_VERSION, kind: 'volley-scout-rosters', exportedAt, rosters },
    null,
    2,
  );
}

/** `rose_volley-scout_<YYYY-MM-DD>`, dated by the export day. */
export function buildRosterBackupFileName(exportedAt: string): string {
  const day = /^\d{4}-\d{2}-\d{2}/.exec(exportedAt)?.[0] ?? 'backup';
  return `rose_volley-scout_${day}`;
}

export type ImportRostersResult =
  | { readonly ok: true; readonly rosters: readonly RosterTemplate[] }
  | { readonly ok: false; readonly code: ParseErrorCode; readonly detail: string };

/** Parses and Zod-validates a roster backup. Never throws. */
export function importRostersJson(text: string): ImportRostersResult {
  const json = parseJson(text);
  if (!json.ok) return { ok: false, code: json.code, detail: json.detail };
  const parsed = parseRosterBackup(json.value);
  if (!parsed.ok) return { ok: false, code: parsed.code, detail: parsed.detail };
  return { ok: true, rosters: parsed.value };
}

/** Asks for a save path and writes every roster in one file. Never throws. */
export async function exportRosters(
  rosters: readonly RosterTemplate[],
  exportedAt: string,
  target: ExportTarget = createExportTarget(),
): Promise<ExportOutcome> {
  try {
    const path = await target.pickSavePath(buildRosterBackupFileName(exportedAt), 'json');
    if (path === null) return { kind: 'cancelled' };
    await target.writeText(path, buildRosterBackup(rosters, exportedAt));
    return { kind: 'saved', path };
  } catch (error) {
    return { kind: 'failed', error };
  }
}

export type PickRostersOutcome =
  | { readonly kind: 'picked'; readonly rosters: readonly RosterTemplate[] }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'invalid' };

/** Lets the operator pick a backup file and validates it. Never throws. */
export async function pickRosterBackup(
  target: ExportTarget = createExportTarget(),
): Promise<PickRostersOutcome> {
  try {
    const text = await target.pickAndReadJson();
    if (text === null) return { kind: 'cancelled' };
    const result = importRostersJson(text);
    return result.ok ? { kind: 'picked', rosters: result.rosters } : { kind: 'invalid' };
  } catch {
    return { kind: 'invalid' };
  }
}
