import type { Match } from '@domain/index';

/** Keeps the exported file name well within OS path-length limits on every platform. */
const MAX_NAME_LENGTH = 120;
/** Per-team-name budget, so one very long team name cannot starve the other. */
const MAX_TEAM_SEGMENT_LENGTH = 40;

/**
 * Removes accents (NFD decomposition + strip combining marks), then keeps only
 * `[A-Za-z0-9-_]`, replacing every run of anything else with a single `_`, trimmed at
 * both ends and length-capped. Never returns an empty string for a non-empty input that
 * contains at least one letter or digit; falls back to `squadra` otherwise.
 */
function sanitiseSegment(raw: string, maxLength: number): string {
  const folded = raw.normalize('NFD').replace(/[̀-ͯ]/gu, '');
  const collapsed = folded.replace(/[^A-Za-z0-9-_]+/gu, '_').replace(/_{2,}/gu, '_');
  const trimmed = collapsed.replace(/^_+|_+$/gu, '');
  const capped = trimmed.slice(0, maxLength).replace(/^_+|_+$/gu, '');
  return capped.length > 0 ? capped : 'squadra';
}

/**
 * `scout_<OurTeam>_<Opponent>_<YYYY-MM-DD>` (docs/00-product-plan.md §9), sanitised to
 * `[A-Za-z0-9-_]`: accents folded, spaces and any other character collapsed to `_`,
 * length-capped so the whole name stays well under filesystem limits.
 */
export function buildExportFileName(match: Match, extension: string): string {
  const our = sanitiseSegment(match.info.ourTeam.name, MAX_TEAM_SEGMENT_LENGTH);
  const opponent = sanitiseSegment(match.info.opponentTeam.name, MAX_TEAM_SEGMENT_LENGTH);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(match.info.date)
    ? match.info.date
    : sanitiseSegment(match.info.date, 10);
  const base = `scout_${our}_${opponent}_${date}`.slice(0, MAX_NAME_LENGTH);
  const cleanExtension = extension.replace(/^\.+/u, '');
  return `${base}.${cleanExtension}`;
}
