import type { TeamSide } from '../entities/common';
import type { MatchSettings } from '../entities/settings';

/** Rally point system: the side that wins the rally serves next. */
export function nextServingTeam(_servingBefore: TeamSide, pointTo: TeamSide): TeamSide {
  return pointTo;
}

/** True when the receiving team won the rally. */
export function isSideOut(servingBefore: TeamSide, pointTo: TeamSide): boolean {
  return servingBefore !== pointTo;
}

/**
 * Default first server of a set: it alternates between sets.
 * The set-start dialog can override it (the deciding set uses a fresh toss in the real rules).
 */
export function firstServerOfSet(settings: MatchSettings, setIndex: number): TeamSide {
  const flip = setIndex % 2 === 1;
  if (!flip) return settings.startingServer;
  return settings.startingServer === 'us' ? 'them' : 'us';
}

/** Which half of the court widget we occupy; purely cosmetic, sides alternate each set. */
export function sideOfSet(settings: MatchSettings, setIndex: number): 'left' | 'right' {
  const flip = setIndex % 2 === 1;
  if (!flip) return settings.startingSide;
  return settings.startingSide === 'left' ? 'right' : 'left';
}
