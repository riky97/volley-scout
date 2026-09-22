import type { Id, TeamSide } from '../entities/common';
import type { CourtPosition, Lineup } from '../entities/event';
import { COURT_POSITIONS } from '../entities/event';
import type { SetState } from '../entities/set';
import { isSideOut } from './serving';

export interface PositionedPlayer {
  readonly position: CourtPosition;
  readonly playerId: Id;
}

/**
 * The player standing in `position` after `rotationOffset` clockwise rotations.
 * Offset 1 means the player who started in P2 now occupies P1.
 */
export function playerAtPosition(
  lineup: Lineup,
  rotationOffset: number,
  position: CourtPosition,
): Id {
  const positionIndex = COURT_POSITIONS.indexOf(position);
  const slot = (positionIndex + rotationOffset) % 6;
  return lineup[slot] as Id;
}

export function courtOf(lineup: Lineup, rotationOffset: number): readonly PositionedPlayer[] {
  return COURT_POSITIONS.map((position, positionIndex) => ({
    position,
    playerId: lineup[(positionIndex + rotationOffset) % 6] as Id,
  }));
}

/** The lineup slot currently displayed in `position`. */
export function slotAtPosition(rotationOffset: number, position: CourtPosition): number {
  return (COURT_POSITIONS.indexOf(position) + rotationOffset) % 6;
}

/** The position a lineup slot is currently displayed in. */
export function positionOfSlot(rotationOffset: number, slot: number): CourtPosition {
  const positionIndex = (slot - rotationOffset + 12) % 6;
  return COURT_POSITIONS[positionIndex] as CourtPosition;
}

export function shouldRotate(servingBefore: TeamSide, pointTo: TeamSide): boolean {
  return isSideOut(servingBefore, pointTo);
}

/** We only track our own rotation: we rotate when we were receiving and won the rally. */
export function nextRotationOffset(
  currentOffset: number,
  servingBefore: TeamSide,
  pointTo: TeamSide,
): number {
  const weRotate = servingBefore === 'them' && pointTo === 'us';
  return weRotate ? (currentOffset + 1) % 6 : currentOffset;
}

/** Our player in P1 while we serve, otherwise null (the opponent has no player model). */
export function currentServerId(set: SetState): Id | null {
  if (set.servingTeam !== 'us' || set.lineup === null) return null;
  return playerAtPosition(set.lineup, set.rotationOffset, 'P1');
}

export function isPlayerOnCourt(set: SetState, playerId: Id): boolean {
  return set.lineup !== null && set.lineup.includes(playerId);
}
