import type { Player, ScoutEvent } from '@domain/index';
import {
  LIVE,
  OPPONENT_POINT_LABEL,
  OPPONENT_POINT_SYMBOL,
  OUTCOME_LABELS,
  OUTCOME_SYMBOLS,
  SKILL_LABELS,
  UNKNOWN_PLAYER,
} from '@shared/copy';

export interface EventDescription {
  /** Letter plus shape, so the outcome never depends on colour alone. */
  readonly symbol: string;
  readonly primary: string;
  readonly secondary: string;
  readonly score: string | null;
  readonly tone: 'point' | 'positive' | 'neutral' | 'negative' | 'error' | 'structural';
}

function playerLabel(roster: readonly Player[], playerId: string): string {
  const player = roster.find((candidate) => candidate.id === playerId);
  if (player === undefined) return UNKNOWN_PLAYER;
  return `${String(player.shirtNumber)} ${player.shortName}`;
}

/** Single place that turns an event into the Italian text shown in the log and the report. */
export function describeEvent(event: ScoutEvent, roster: readonly Player[]): EventDescription {
  switch (event.type) {
    case 'rally':
      return {
        symbol: OUTCOME_SYMBOLS[event.outcome],
        primary: playerLabel(roster, event.playerId),
        secondary: `${SKILL_LABELS[event.skill]} · ${OUTCOME_LABELS[event.outcome]}`,
        score: `${String(event.scoreAfter.us)}–${String(event.scoreAfter.them)}`,
        tone: event.outcome,
      };
    case 'our_point':
      return {
        symbol: OUTCOME_SYMBOLS.point,
        primary: LIVE.expressOurPoint,
        secondary: '',
        score: `${String(event.scoreAfter.us)}–${String(event.scoreAfter.them)}`,
        tone: 'point',
      };
    case 'opponent_point':
      return {
        symbol: OPPONENT_POINT_SYMBOL,
        primary: OPPONENT_POINT_LABEL,
        secondary: '',
        score: `${String(event.scoreAfter.us)}–${String(event.scoreAfter.them)}`,
        tone: 'error',
      };
    case 'timeout':
      return {
        symbol: 'T',
        primary: LIVE.timeout,
        secondary: event.team === 'us' ? LIVE.timeoutUs : LIVE.timeoutThem,
        score: `${String(event.atScore.us)}–${String(event.atScore.them)}`,
        tone: 'structural',
      };
    case 'substitution':
      return {
        symbol: 'C',
        primary: LIVE.substitution,
        secondary: `${LIVE.substitutionOut} ${playerLabel(roster, event.playerOutId)} · ${LIVE.substitutionIn} ${playerLabel(roster, event.playerInId)}`,
        score: `${String(event.atScore.us)}–${String(event.atScore.them)}`,
        tone: 'structural',
      };
    case 'set_start':
      return {
        symbol: '▶',
        primary: `Inizio set ${String(event.setIndex + 1)}`,
        secondary: event.servingTeam === 'us' ? LIVE.timeoutUs : LIVE.timeoutThem,
        score: null,
        tone: 'structural',
      };
    case 'set_end':
      return {
        symbol: '■',
        primary: `Fine set ${String(event.setIndex + 1)}`,
        secondary: `${String(event.finalScore.us)}–${String(event.finalScore.them)}`,
        score: null,
        tone: 'structural',
      };
    case 'note':
      return {
        symbol: '≡',
        primary: 'Nota',
        secondary: event.text,
        score: `${String(event.atScore.us)}–${String(event.atScore.them)}`,
        tone: 'structural',
      };
  }
}
