import type { Match } from '@domain/index';
import { isNewer } from './isNewer';

export type MatchImportDecision = 'add' | 'update' | 'unchanged';

/**
 * Same rule as the roster backup: a match is matched by id, a newer local copy always wins, and
 * importing the same file twice changes nothing. `existing` is null when this device has no
 * usable copy (never saved, or quarantined as corrupt).
 */
export function decideMatchImport(existing: Match | null, incoming: Match): MatchImportDecision {
  if (existing === null) return 'add';
  return isNewer(incoming.updatedAt, existing.updatedAt) ? 'update' : 'unchanged';
}
