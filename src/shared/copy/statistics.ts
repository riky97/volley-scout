/**
 * Italian labels for every statistic identifier, long and short forms, exactly as the
 * table in docs/02-statistics.md §7. The domain and statistics layers never import this file.
 */

/** Every metric identifier that appears in the §7 table, used as the key union below. */
export type StatisticKey =
  | 'totalActions'
  | 'points'
  | 'errors'
  | 'attackAttempts'
  | 'kills'
  | 'attackErrors'
  | 'attackEfficiency'
  | 'killRate'
  | 'serves'
  | 'aces'
  | 'serveErrors'
  | 'aceRate'
  | 'serveErrorRate'
  | 'receptions'
  | 'positiveReceptions'
  | 'negativeReceptions'
  | 'receptionErrors'
  | 'receptionPositivity'
  | 'receptionErrorRate'
  | 'blockPoints'
  | 'blockErrors'
  | 'digs'
  | 'digErrors'
  | 'sets'
  | 'setErrors'
  | 'pointsScored'
  | 'pointsConceded'
  | 'pointsFromActions'
  | 'opponentPoints'
  | 'timeoutsUsed'
  | 'substitutionsUsed'
  | 'perSetTrend';

export const STAT_LABELS: Record<StatisticKey, { readonly long: string; readonly short: string }> = {
  totalActions: { long: 'Azioni totali', short: 'Az.' },
  points: { long: 'Punti', short: 'Pt' },
  errors: { long: 'Errori', short: 'Err' },
  attackAttempts: { long: 'Attacchi totali', short: 'Att' },
  kills: { long: 'Attacchi vincenti', short: 'Vin' },
  attackErrors: { long: 'Errori attacco', short: 'E.Att' },
  attackEfficiency: { long: 'Efficienza attacco', short: 'Eff%' },
  killRate: { long: 'Percentuale attacchi vincenti', short: 'Att%' },
  serves: { long: 'Battute', short: 'Bat' },
  aces: { long: 'Ace', short: 'Ace' },
  serveErrors: { long: 'Errori battuta', short: 'E.Bat' },
  aceRate: { long: 'Percentuale ace', short: 'Ace%' },
  serveErrorRate: { long: 'Percentuale errori battuta', short: 'E.Bat%' },
  receptions: { long: 'Ricezioni', short: 'Ric' },
  positiveReceptions: { long: 'Ricezioni positive', short: 'Ric+' },
  negativeReceptions: { long: 'Ricezioni negative', short: 'Ric−' },
  receptionErrors: { long: 'Errori ricezione', short: 'E.Ric' },
  receptionPositivity: { long: 'Positività ricezione', short: 'Ric%' },
  receptionErrorRate: { long: 'Percentuale errori ricezione', short: 'E.Ric%' },
  blockPoints: { long: 'Muri punto', short: 'Muri' },
  blockErrors: { long: 'Errori muro', short: 'E.Mur' },
  digs: { long: 'Difese', short: 'Dif' },
  digErrors: { long: 'Errori difesa', short: 'E.Dif' },
  sets: { long: 'Alzate', short: 'Alz' },
  setErrors: { long: 'Errori alzata', short: 'E.Alz' },
  pointsScored: { long: 'Punti fatti', short: 'PF' },
  pointsConceded: { long: 'Punti subiti', short: 'PS' },
  pointsFromActions: { long: 'Punti da azione', short: '—' },
  opponentPoints: { long: 'Punti avversari', short: 'Avv' },
  timeoutsUsed: { long: 'Timeout usati', short: 'TO' },
  substitutionsUsed: { long: 'Sostituzioni', short: 'Sost' },
  perSetTrend: { long: 'Andamento per set', short: '—' },
};
