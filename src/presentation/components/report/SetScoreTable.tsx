import type { Match } from '@domain/index';
import { SUMMARY } from '@shared/copy';
import { formatCount } from '@shared/format/number';
import styles from './Report.module.scss';

export interface SetScoreTableProps {
  readonly match: Match;
}

/** "Set 1 2 3 4 / Noi 25 22 25 25 / Loro 22 25 19 21" — docs/03-ux-flows.md §3.7. */
export function SetScoreTable({ match }: SetScoreTableProps): React.JSX.Element {
  return (
    <div className={styles.scrollArea}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">{SUMMARY.setsTable}</th>
            {match.sets.map((set) => (
              <th key={set.index} scope="col">
                {set.index + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{SUMMARY.us}</td>
            {match.sets.map((set) => (
              <td key={set.index}>{formatCount(set.ourPoints)}</td>
            ))}
          </tr>
          <tr>
            <td>{SUMMARY.them}</td>
            {match.sets.map((set) => (
              <td key={set.index}>{formatCount(set.theirPoints)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
