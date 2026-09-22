import type { Id, Score, TeamSide } from '../entities/common';
import { ZERO_SCORE } from '../entities/common';
import type { ScoutEvent } from '../entities/event';
import type { Match, MatchStatus } from '../entities/match';
import type { SetState } from '../entities/set';
import type { MatchWarning } from '../rules/fold';
import { foldEvents, setsWonFrom } from '../rules/fold';
import { currentSetOf, matchWinnerOf } from '../rules/lifecycle';
import type { PositionedPlayer } from '../rules/rotation';
import { courtOf, currentServerId } from '../rules/rotation';
import { evaluateSetEnd, isSetPointFor } from '../rules/scoring';
import { canUndo, lastEventOf } from '../rules/undo';

export interface MatchSnapshot {
  readonly matchId: Id;
  readonly status: MatchStatus;
  /** Index of the live set, or of the last finished one; -1 before set 1 starts. */
  readonly currentSetIndex: number;
  readonly currentSet: SetState | null;
  readonly score: Score;
  readonly setsWon: Readonly<Record<TeamSide, number>>;
  readonly servingTeam: TeamSide;
  /** Our player in P1 while we serve, otherwise null. */
  readonly currentServerId: Id | null;
  readonly court: readonly PositionedPlayer[];
  readonly setHistory: readonly SetState[];
  readonly lastEvent: ScoutEvent | null;
  readonly canUndo: boolean;
  readonly matchWinner: TeamSide | null;
  /** Non-null when the current score closes the set: the value is the winning side. */
  readonly pendingSetWinner: TeamSide | null;
  readonly setPointFor: TeamSide | null;
  readonly warnings: readonly MatchWarning[];
}

/** The only way the UI learns the state of a match. */
export function buildSnapshot(match: Match): MatchSnapshot {
  const folded = foldEvents(match.settings, match.events);
  const currentSet = currentSetOf(match);
  const setsWon = setsWonFrom(match.sets);

  const score: Score =
    currentSet === null ? ZERO_SCORE : { us: currentSet.ourPoints, them: currentSet.theirPoints };

  const court =
    currentSet !== null && currentSet.lineup !== null
      ? courtOf(currentSet.lineup, currentSet.rotationOffset)
      : [];

  const pendingSetWinner =
    currentSet !== null && currentSet.status === 'live'
      ? evaluateSetEnd(currentSet, match.settings)
      : null;

  let setPointFor: TeamSide | null = null;
  if (currentSet !== null && currentSet.status === 'live' && pendingSetWinner === null) {
    if (isSetPointFor(currentSet, match.settings, 'us')) setPointFor = 'us';
    else if (isSetPointFor(currentSet, match.settings, 'them')) setPointFor = 'them';
  }

  return {
    matchId: match.id,
    status: match.status,
    currentSetIndex: currentSet?.index ?? -1,
    currentSet,
    score,
    setsWon,
    servingTeam: currentSet?.servingTeam ?? match.settings.startingServer,
    currentServerId: currentSet === null ? null : currentServerId(currentSet),
    court,
    setHistory: match.sets,
    lastEvent: lastEventOf(match),
    canUndo: canUndo(match),
    matchWinner: matchWinnerOf(match),
    pendingSetWinner,
    setPointFor,
    warnings: folded.warnings,
  };
}
