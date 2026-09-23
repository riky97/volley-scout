import type { Match } from '@domain/index';
import type { ExportTarget } from '@application/ports/storage';
import { createExportTarget } from '@infrastructure/storage';
import type { ParseErrorCode } from '@infrastructure/storage/schemas';
import { parseJson, parseMatch } from '@infrastructure/storage/schemas';

/** Full match document, pretty-printed so a hand inspection stays readable. */
export function buildJsonExport(match: Match): Uint8Array {
  const text = JSON.stringify(match, null, 2);
  return new TextEncoder().encode(text);
}

export type ImportMatchResult =
  | { readonly ok: true; readonly match: Match }
  | { readonly ok: false; readonly code: ParseErrorCode; readonly detail: string };

/**
 * Parses and Zod-validates a match document read from disk. Never throws: malformed JSON or
 * data that does not match the schema comes back as a typed failure instead.
 */
export function importMatchJson(text: string): ImportMatchResult {
  const json = parseJson(text);
  if (!json.ok) return { ok: false, code: json.code, detail: json.detail };

  const parsed = parseMatch(json.value);
  if (!parsed.ok) return { ok: false, code: parsed.code, detail: parsed.detail };

  return { ok: true, match: parsed.value };
}

export type PickMatchOutcome =
  | { readonly kind: 'picked'; readonly match: Match }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'invalid' };

/** Lets the operator pick an exported match file and validates it. Never throws. */
export async function pickMatchFile(
  target: ExportTarget = createExportTarget(),
): Promise<PickMatchOutcome> {
  try {
    const text = await target.pickAndReadJson();
    if (text === null) return { kind: 'cancelled' };
    const result = importMatchJson(text);
    return result.ok ? { kind: 'picked', match: result.match } : { kind: 'invalid' };
  } catch {
    return { kind: 'invalid' };
  }
}
