import type { Match, MatchSnapshot } from '@domain/index';
import { LIVE } from '@shared/copy';
import styles from './Scoreboard.module.scss';

export interface ScoreboardProps {
  readonly match: Match;
  readonly snapshot: MatchSnapshot;
}

/** Score, sets and who is serving: the part of the screen read from a distance. */
export function Scoreboard({ match, snapshot }: ScoreboardProps): React.JSX.Element {
  const { score, setsWon, servingTeam, setHistory } = snapshot;
  const ourName = match.info.ourTeam.name;
  const theirName = match.info.opponentTeam.name;

  return (
    <section className={styles.scoreboard} aria-label={LIVE.title}>
      <div className={styles.team}>
        <p className={styles.teamName}>{ourName}</p>
        {servingTeam === 'us' && (
          <p className={styles.serving}>
            <span aria-hidden="true">⚐ </span>
            {LIVE.serving}
          </p>
        )}
        <p className={styles.points} aria-label={`${ourName}: ${String(score.us)}`}>
          {score.us}
        </p>
        <p className={styles.sets}>{LIVE.setsWon(setsWon.us)}</p>
      </div>

      <div className={styles.setsColumn}>
        <table className={styles.setTable}>
          <caption className="sr-only">{LIVE.title}</caption>
          <thead>
            <tr>
              <th scope="col">Set</th>
              {setHistory.map((set) => (
                <th key={set.index} scope="col">
                  {set.index + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{ourName}</th>
              {setHistory.map((set) => (
                <td key={set.index}>{set.ourPoints}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">{theirName}</th>
              {setHistory.map((set) => (
                <td key={set.index}>{set.theirPoints}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className={styles.team}>
        <p className={styles.teamName}>{theirName}</p>
        {servingTeam === 'them' && (
          <p className={styles.serving}>
            <span aria-hidden="true">⚐ </span>
            {LIVE.serving}
          </p>
        )}
        <p className={styles.points} aria-label={`${theirName}: ${String(score.them)}`}>
          {score.them}
        </p>
        <p className={styles.sets}>{LIVE.setsWon(setsWon.them)}</p>
      </div>
    </section>
  );
}
