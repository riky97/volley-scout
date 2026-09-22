import type { Score, TeamSide } from '../entities/common';
import type { BestOf, MatchSettings } from '../entities/settings';
import type { EventOutcome, Skill } from '../entities/event';
import type { SetState } from '../entities/set';

export interface TerminalResult {
  readonly isTerminal: boolean;
  /** null when the rally continues. */
  readonly pointTo: TeamSide | null;
}

const CONTINUES: TerminalResult = { isTerminal: false, pointTo: null };

/**
 * Terminality is outcome-driven and skill-independent: `point` wins the rally for us,
 * `error` gives it to the opponent, everything else lets the rally continue.
 * The skill is part of the signature because the rule is conceptually per-action and the
 * allowed combinations are validated separately (see ALLOWED_OUTCOMES).
 */
export function isTerminalOutcome(_skill: Skill, outcome: EventOutcome): TerminalResult {
  switch (outcome) {
    case 'point':
      return { isTerminal: true, pointTo: 'us' };
    case 'error':
      return { isTerminal: true, pointTo: 'them' };
    case 'positive':
    case 'neutral':
    case 'negative':
      return CONTINUES;
  }
}

export function applyPoint(score: Score, pointTo: TeamSide): Score {
  return pointTo === 'us'
    ? { us: score.us + 1, them: score.them }
    : { us: score.us, them: score.them + 1 };
}

/** True when `ourPoints` wins the set against `theirPoints`. Call twice to know who won. */
export function isSetWon(
  ourPoints: number,
  theirPoints: number,
  target: number,
  winByTwo: boolean,
): boolean {
  if (ourPoints < target) return false;
  if (!winByTwo) return ourPoints > theirPoints;
  return ourPoints - theirPoints >= 2;
}

/** Only the deciding set (index bestOf - 1) uses the tie-break target. */
export function targetForSet(settings: MatchSettings, setIndex: number): number {
  return setIndex === settings.bestOf - 1
    ? settings.pointsToWinTieBreak
    : settings.pointsToWinSet;
}

export function isTieBreakSet(settings: MatchSettings, setIndex: number): boolean {
  return setIndex === settings.bestOf - 1;
}

export function setsNeededToWin(bestOf: BestOf): number {
  return Math.floor(bestOf / 2) + 1;
}

export function isMatchWon(setsWon: number, bestOf: BestOf): boolean {
  return setsWon >= setsNeededToWin(bestOf);
}

/** Returns the winning side when the current score closes the set, otherwise null. */
export function evaluateSetEnd(set: SetState, settings: MatchSettings): TeamSide | null {
  const target = set.target > 0 ? set.target : targetForSet(settings, set.index);
  if (isSetWon(set.ourPoints, set.theirPoints, target, settings.winByTwo)) return 'us';
  if (isSetWon(set.theirPoints, set.ourPoints, target, settings.winByTwo)) return 'them';
  return null;
}

/** True when a single point would close the set for the given side. */
export function isSetPointFor(set: SetState, settings: MatchSettings, side: TeamSide): boolean {
  const target = set.target > 0 ? set.target : targetForSet(settings, set.index);
  const ours = side === 'us' ? set.ourPoints : set.theirPoints;
  const theirs = side === 'us' ? set.theirPoints : set.ourPoints;
  return isSetWon(ours + 1, theirs, target, settings.winByTwo);
}
