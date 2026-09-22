import type { Match } from '@domain/index';
import type { ExportTarget } from '@application/ports/storage';
import { createExportTarget } from '@infrastructure/storage';
import { buildExportFileName } from './fileName';
import { buildJsonExport } from './jsonExport';
import { buildPdfExport } from './pdfExport';
import { buildXlsxExport } from './xlsxExport';

export type ExportFormat = 'pdf' | 'xlsx' | 'json';

export type ExportOutcome =
  | { readonly kind: 'saved'; readonly path: string }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'failed'; readonly error: unknown };

async function buildBytes(match: Match, format: ExportFormat): Promise<Uint8Array> {
  if (format === 'pdf') return await buildPdfExport(match);
  if (format === 'xlsx') return await buildXlsxExport(match);
  return buildJsonExport(match);
}

/**
 * Builds the export for `format`, asks `target` for a save path (the user can cancel the
 * dialog) and writes the bytes. Never throws: a build error or a rejected write both come back
 * as `failed` instead of crashing the caller. `target` defaults to the platform adapter
 * (`createExportTarget`) and is only overridden in tests.
 */
export async function exportMatch(
  match: Match,
  format: ExportFormat,
  target: ExportTarget = createExportTarget(),
): Promise<ExportOutcome> {
  try {
    const fileName = buildExportFileName(match, format);
    const suggestedName = fileName.slice(0, fileName.length - format.length - 1);
    const path = await target.pickSavePath(suggestedName, format);
    if (path === null) return { kind: 'cancelled' };

    const bytes = await buildBytes(match, format);
    await target.writeBinary(path, bytes);
    return { kind: 'saved', path };
  } catch (error) {
    return { kind: 'failed', error };
  }
}

export { buildExportFileName } from './fileName';
export { buildJsonExport, importMatchJson } from './jsonExport';
export type { ImportMatchResult } from './jsonExport';
export { buildPdfExport } from './pdfExport';
export { buildXlsxExport } from './xlsxExport';
