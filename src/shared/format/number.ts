/**
 * Number and date formatting helpers shared by the live UI, the summary screen and every
 * export (PDF, XLSX). Percentages go exclusively through `formatPercent1` — see
 * docs/02-statistics.md §4.2 for the binding rule this file implements.
 */

import { NOT_AVAILABLE } from '@shared/copy';
import type { Ratio } from '@domain/index';

/** Half away from zero, so -0.125 -> -12.5 and 0.125 -> 12.5 symmetrically. */
function roundHalfAwayFromZero(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  const scaled = value * factor;
  const rounded = scaled >= 0 ? Math.round(scaled) : -Math.round(-scaled);
  return rounded / factor;
}

/**
 * The single formatter used by every percentage in the UI, the PDF and the XLSX.
 * `null` (zero denominator, docs/02-statistics.md G7) renders as the literal `NOT_AVAILABLE`.
 */
export function formatPercent1(ratio: Ratio): string {
  if (ratio === null) return NOT_AVAILABLE;
  const pct = roundHalfAwayFromZero(ratio * 100, 1);
  const safe = Object.is(pct, -0) ? 0 : pct;
  return `${safe.toFixed(1)}%`;
}

/** Counts are always plain integers, `0` included — only a zero denominator becomes N/D. */
export function formatCount(value: number): string {
  return String(Math.trunc(value));
}

/** "YYYY-MM-DD" -> "DD/MM/YYYY". Falls back to the raw string when it does not parse. */
export function formatDateIt(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (match === null) return isoDate;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/** "us – them", e.g. "25 – 22". */
export function formatScoreLine(us: number, them: number): string {
  return `${formatCount(us)} – ${formatCount(them)}`;
}
