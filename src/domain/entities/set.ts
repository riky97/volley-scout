import type { IsoTimestamp, TeamSide } from './common';
import type { Lineup } from './event';

export type SetStatus = 'pending' | 'live' | 'finished';

export interface SetState {
  /** 0-based: set 1 in the UI is index 0. */
  readonly index: number;
  readonly status: SetStatus;
  readonly ourPoints: number;
  readonly theirPoints: number;
  /** null while status is not 'finished'. */
  readonly winner: TeamSide | null;
  readonly servingTeam: TeamSide;
  /** 0..5 clockwise rotations our lineup performed since the set started. */
  readonly rotationOffset: number;
  readonly lineup: Lineup | null;
  readonly timeoutsUsed: Readonly<Record<TeamSide, number>>;
  /** Ours only. */
  readonly substitutionsUsed: number;
  readonly startedAt: IsoTimestamp | null;
  readonly endedAt: IsoTimestamp | null;
  readonly isTieBreak: boolean;
  /** Points needed to win this set, frozen at set start. */
  readonly target: number;
}
