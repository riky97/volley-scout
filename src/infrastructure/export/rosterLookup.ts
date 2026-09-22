import type { Id, Match, ScoutEvent } from '@domain/index';
import { OPPONENT_POINT_LABEL, PLAYER_ROLE_LABELS } from '@shared/copy';
import { formatScoreLine } from '@shared/format/number';

/** Local, one-off Italian labels for event types: no shared copy entry covers the raw log. */
export const EVENT_TYPE_LABELS: Record<ScoutEvent['type'], string> = {
  rally: 'Azione',
  opponent_point: OPPONENT_POINT_LABEL,
  timeout: 'Time-out',
  substitution: 'Cambio',
  set_start: 'Inizio set',
  set_end: 'Fine set',
  note: 'Nota',
};

export function rosterName(match: Match, playerId: Id): string {
  const player = match.roster.find((candidate) => candidate.id === playerId);
  return player === undefined ? `Sconosciuto (${playerId})` : `${player.shirtNumber} ${player.name}`;
}

export function rosterShirt(match: Match, playerId: Id): number | null {
  return match.roster.find((candidate) => candidate.id === playerId)?.shirtNumber ?? null;
}

export function rosterRole(match: Match, playerId: Id): string {
  const player = match.roster.find((candidate) => candidate.id === playerId);
  return player === undefined ? '' : PLAYER_ROLE_LABELS[player.role];
}

/** Points won by each side across finished sets. */
export function setsWonCount(match: Match): { readonly us: number; readonly them: number } {
  return match.sets.reduce(
    (acc, set) => {
      if (set.winner === 'us') return { us: acc.us + 1, them: acc.them };
      if (set.winner === 'them') return { us: acc.us, them: acc.them + 1 };
      return acc;
    },
    { us: 0, them: 0 },
  );
}

export function eventScoreLabel(event: ScoutEvent): string {
  if (event.type === 'rally' || event.type === 'opponent_point') {
    return formatScoreLine(event.scoreAfter.us, event.scoreAfter.them);
  }
  if (event.type === 'timeout' || event.type === 'substitution' || event.type === 'note') {
    return formatScoreLine(event.atScore.us, event.atScore.them);
  }
  if (event.type === 'set_end') {
    return formatScoreLine(event.finalScore.us, event.finalScore.them);
  }
  return '';
}
