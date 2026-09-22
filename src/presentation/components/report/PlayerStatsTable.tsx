import type { Match, PlayerStatistics } from '@domain/index';
import { PLAYER_ROLE_LABELS, STAT_LABELS } from '@shared/copy';
import { formatCount, formatPercent1 } from '@shared/format/number';
import styles from './Report.module.scss';

export interface PlayerStatsTableProps {
  readonly match: Match;
  readonly players: readonly PlayerStatistics[];
}

interface StatColumn {
  readonly key: string;
  readonly label: string;
  readonly value: (row: PlayerStatistics) => string;
}

function buildColumns(trackSetSkill: boolean): readonly StatColumn[] {
  const columns: StatColumn[] = [
    { key: 'points', label: STAT_LABELS.points.short, value: (r) => formatCount(r.points) },
    { key: 'errors', label: STAT_LABELS.errors.short, value: (r) => formatCount(r.errors) },
    { key: 'totalActions', label: STAT_LABELS.totalActions.short, value: (r) => formatCount(r.totalActions) },
    { key: 'attackAttempts', label: STAT_LABELS.attackAttempts.short, value: (r) => formatCount(r.attackAttempts) },
    { key: 'kills', label: STAT_LABELS.kills.short, value: (r) => formatCount(r.kills) },
    { key: 'attackErrors', label: STAT_LABELS.attackErrors.short, value: (r) => formatCount(r.attackErrors) },
    { key: 'attackEfficiency', label: STAT_LABELS.attackEfficiency.short, value: (r) => formatPercent1(r.attackEfficiency) },
    { key: 'killRate', label: STAT_LABELS.killRate.short, value: (r) => formatPercent1(r.killRate) },
    { key: 'serves', label: STAT_LABELS.serves.short, value: (r) => formatCount(r.serves) },
    { key: 'aces', label: STAT_LABELS.aces.short, value: (r) => formatCount(r.aces) },
    { key: 'serveErrors', label: STAT_LABELS.serveErrors.short, value: (r) => formatCount(r.serveErrors) },
    { key: 'aceRate', label: STAT_LABELS.aceRate.short, value: (r) => formatPercent1(r.aceRate) },
    { key: 'serveErrorRate', label: STAT_LABELS.serveErrorRate.short, value: (r) => formatPercent1(r.serveErrorRate) },
    { key: 'receptions', label: STAT_LABELS.receptions.short, value: (r) => formatCount(r.receptions) },
    { key: 'positiveReceptions', label: STAT_LABELS.positiveReceptions.short, value: (r) => formatCount(r.positiveReceptions) },
    { key: 'negativeReceptions', label: STAT_LABELS.negativeReceptions.short, value: (r) => formatCount(r.negativeReceptions) },
    { key: 'receptionErrors', label: STAT_LABELS.receptionErrors.short, value: (r) => formatCount(r.receptionErrors) },
    { key: 'receptionPositivity', label: STAT_LABELS.receptionPositivity.short, value: (r) => formatPercent1(r.receptionPositivity) },
    { key: 'receptionErrorRate', label: STAT_LABELS.receptionErrorRate.short, value: (r) => formatPercent1(r.receptionErrorRate) },
    { key: 'blockPoints', label: STAT_LABELS.blockPoints.short, value: (r) => formatCount(r.blockPoints) },
    { key: 'blockErrors', label: STAT_LABELS.blockErrors.short, value: (r) => formatCount(r.blockErrors) },
    { key: 'digs', label: STAT_LABELS.digs.short, value: (r) => formatCount(r.digs) },
    { key: 'digErrors', label: STAT_LABELS.digErrors.short, value: (r) => formatCount(r.digErrors) },
  ];
  if (trackSetSkill) {
    columns.push(
      { key: 'sets', label: STAT_LABELS.sets.short, value: (r) => formatCount(r.sets) },
      { key: 'setErrors', label: STAT_LABELS.setErrors.short, value: (r) => formatCount(r.setErrors) },
    );
  }
  return columns;
}

/** Full per-player statistics table — the final report always shows every metric (§8). */
export function PlayerStatsTable({ match, players }: PlayerStatsTableProps): React.JSX.Element {
  const columns = buildColumns(match.settings.trackSetSkill);

  return (
    <div className={styles.scrollArea}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">N.</th>
            <th scope="col">Giocatore</th>
            <th scope="col">Ruolo</th>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            const rosterPlayer = match.roster.find((candidate) => candidate.id === player.playerId);
            return (
              <tr key={player.playerId}>
                <td>{rosterPlayer?.shirtNumber ?? '—'}</td>
                <td>{rosterPlayer?.name ?? `Sconosciuto (${player.playerId})`}</td>
                <td>{rosterPlayer !== undefined ? PLAYER_ROLE_LABELS[rosterPlayer.role] : ''}</td>
                {columns.map((column) => (
                  <td key={column.key}>{column.value(player)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
