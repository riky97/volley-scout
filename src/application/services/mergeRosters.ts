import type { RosterTemplate } from '@domain/index';
import { isNewer } from './isNewer';

export interface RosterMerge {
  /** Rosters to write: new ones plus those the backup holds a newer copy of. */
  readonly toSave: readonly RosterTemplate[];
  readonly added: number;
  readonly updated: number;
  readonly unchanged: number;
}

/**
 * Decides what a roster backup brings in. Rosters are matched by id, so importing the same file
 * twice changes nothing, and a roster edited on this device after the backup was taken keeps
 * its newer version.
 */
export function mergeRosters(
  existing: readonly RosterTemplate[],
  incoming: readonly RosterTemplate[],
): RosterMerge {
  const byId = new Map(existing.map((roster) => [roster.id, roster]));
  const toSave: RosterTemplate[] = [];
  let added = 0;
  let updated = 0;
  let unchanged = 0;
  for (const roster of incoming) {
    const current = byId.get(roster.id);
    if (current === undefined) {
      added += 1;
      toSave.push(roster);
    } else if (isNewer(roster.updatedAt, current.updatedAt)) {
      updated += 1;
      toSave.push(roster);
    } else {
      unchanged += 1;
    }
  }
  return { toSave, added, updated, unchanged };
}
