import type { TeamStatistics } from '@domain/index';
import { STAT_LABELS, SUMMARY } from '@shared/copy';
import { formatCount, formatPercent1 } from '@shared/format/number';
import styles from './Report.module.scss';

export interface SetTrendProps {
  readonly perSetTeam: readonly TeamStatistics[];
}

/**
 * Per-set trend: pointsScored, attackEfficiency, receptionPositivity, errors (docs/02-statistics
 * §6). A set with zero actions is a gap, not a zero: shown as an em dash, never "0".
 */
export function SetTrend({ perSetTeam }: SetTrendProps): React.JSX.Element {
  return (
    <div className={styles.scrollArea}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">{SUMMARY.setsTable}</th>
            <th scope="col">{STAT_LABELS.pointsScored.short}</th>
            <th scope="col">{STAT_LABELS.attackEfficiency.short}</th>
            <th scope="col">{STAT_LABELS.receptionPositivity.short}</th>
            <th scope="col">{STAT_LABELS.errors.short}</th>
          </tr>
        </thead>
        <tbody>
          {perSetTeam.map((team, index) => {
            const isGap = team.totalActions === 0;
            return (
              <tr key={index}>
                <td>{index + 1}</td>
                <td className={isGap ? styles.gap : undefined}>
                  {isGap ? '—' : formatCount(team.pointsScored)}
                </td>
                <td className={isGap ? styles.gap : undefined}>
                  {isGap ? '—' : formatPercent1(team.attackEfficiency)}
                </td>
                <td className={isGap ? styles.gap : undefined}>
                  {isGap ? '—' : formatPercent1(team.receptionPositivity)}
                </td>
                <td className={isGap ? styles.gap : undefined}>
                  {isGap ? '—' : formatCount(team.errors)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
