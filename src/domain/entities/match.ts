import type { Id, IsoDate, IsoTimestamp, SchemaVersion } from './common';
import type { ScoutEvent } from './event';
import type { Player } from './player';
import type { MatchSettings } from './settings';
import type { SetState } from './set';
import type { Team } from './team';

export interface MatchInfo {
  readonly ourTeam: Team;
  readonly opponentTeam: Team;
  readonly date: IsoDate;
  /** Venue or gym; empty string means not specified. */
  readonly venue: string;
  /** Competition or round; empty string means not specified. */
  readonly competition: string;
  readonly notes: string;
}

export type MatchStatus = 'setup' | 'live' | 'finished' | 'abandoned';

/** Persisted root: everything about one match. */
export interface Match {
  readonly schemaVersion: SchemaVersion;
  readonly id: Id;
  readonly status: MatchStatus;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
  readonly closedAt: IsoTimestamp | null;
  readonly info: MatchInfo;
  readonly settings: MatchSettings;
  readonly roster: readonly Player[];
  /** One entry per started set, in order; sets[i].index equals i. */
  readonly sets: readonly SetState[];
  readonly events: readonly ScoutEvent[];
}

export function isMatchClosed(match: Match): boolean {
  return match.status === 'finished' || match.status === 'abandoned';
}
