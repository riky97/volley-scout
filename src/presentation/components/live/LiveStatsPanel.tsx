import { useMemo, useState } from 'react';
import type { Match, PlayerStatistics, TeamStatistics } from '@domain/index';
import { computeMatchStatistics } from '@domain/index';
import { NOT_AVAILABLE, STATS } from '@shared/copy';
import { formatPercent1 } from '@shared/format/number';
import styles from './LiveStatsPanel.module.scss';

export interface LiveStatsPanelProps {
  readonly match: Match;
  /** Set index to show, or null for the whole match. */
  readonly initialSetIndex?: number | null;
}

function shirtOf(match: Match, playerId: string): string {
  const player = match.roster.find((candidate) => candidate.id === playerId);
  return player === undefined ? '—' : String(player.shirtNumber);
}

function nameOf(match: Match, playerId: string): string {
  const player = match.roster.find((candidate) => candidate.id === playerId);
  if (player === undefined) return 'Giocatore sconosciuto';
  return player.isLibero ? `${player.shortName} (L)` : player.shortName;
}

export function LiveStatsPanel({
  match,
  initialSetIndex = null,
}: LiveStatsPanelProps): React.JSX.Element {
  const [scopeIndex, setScopeIndex] = useState<number | null>(initialSetIndex);

  const statistics = useMemo(() => computeMatchStatistics(match), [match]);

  const team: TeamStatistics | undefined =
    scopeIndex === null ? statistics.team : statistics.perSetTeam[scopeIndex];
  const players: readonly PlayerStatistics[] =
    scopeIndex === null ? statistics.players : (statistics.perSetPlayers[scopeIndex] ?? []);

  const visiblePlayers = players.filter((player) => player.totalActions > 0);

  return (
    <section className={styles.panel} aria-label={STATS.title}>
      <header className={styles.header}>
        <h2 className={styles.title}>{STATS.title}</h2>
        <div className={styles.scopes} role="group" aria-label={STATS.sortBy}>
          {match.sets.map((set) => (
            <button
              key={set.index}
              type="button"
              className={scopeIndex === set.index ? styles.scopeActive : styles.scope}
              aria-pressed={scopeIndex === set.index}
              onClick={() => {
                setScopeIndex(set.index);
              }}
            >
              {STATS.set(set.index + 1)}
            </button>
          ))}
          <button
            type="button"
            className={scopeIndex === null ? styles.scopeActive : styles.scope}
            aria-pressed={scopeIndex === null}
            onClick={() => {
              setScopeIndex(null);
            }}
          >
            {STATS.totalMatch}
          </button>
        </div>
      </header>

      {team === undefined ? (
        <p className={styles.empty}>{STATS.emptyState}</p>
      ) : (
        <>
          <dl className={styles.teamStats}>
            <div>
              <dt>{STATS.pointsScored}</dt>
              <dd>{team.pointsScored}</dd>
            </div>
            <div>
              <dt>{STATS.ourErrors}</dt>
              <dd>{team.errors}</dd>
            </div>
            <div>
              <dt>{STATS.opponentPoints}</dt>
              <dd>{team.opponentPoints}</dd>
            </div>
            <div>
              <dt>{STATS.attackEfficiency}</dt>
              <dd>{formatPercent1(team.attackEfficiency)}</dd>
            </div>
            <div>
              <dt>{STATS.receptionPositivity}</dt>
              <dd>{formatPercent1(team.receptionPositivity)}</dd>
            </div>
          </dl>

          {visiblePlayers.length === 0 ? (
            <p className={styles.empty}>{STATS.emptyState}</p>
          ) : (
            <table className={styles.table}>
              <caption className="sr-only">{STATS.players}</caption>
              <thead>
                <tr>
                  <th scope="col">{STATS.columns.number}</th>
                  <th scope="col">{STATS.columns.player}</th>
                  <th scope="col">{STATS.columns.points}</th>
                  <th scope="col">{STATS.columns.attack}</th>
                  <th scope="col">{STATS.columns.block}</th>
                  <th scope="col">{STATS.columns.ace}</th>
                  <th scope="col">{STATS.columns.receptionPositive}</th>
                  <th scope="col">{STATS.columns.errors}</th>
                </tr>
              </thead>
              <tbody>
                {visiblePlayers.map((player) => (
                  <tr key={player.playerId}>
                    <td>{shirtOf(match, player.playerId)}</td>
                    <td>{nameOf(match, player.playerId)}</td>
                    <td>{player.points}</td>
                    <td>
                      {player.attackAttempts === 0
                        ? NOT_AVAILABLE
                        : formatPercent1(player.attackEfficiency)}
                    </td>
                    <td>{player.blockPoints}</td>
                    <td>{player.aces}</td>
                    <td>
                      {player.receptions === 0
                        ? NOT_AVAILABLE
                        : formatPercent1(player.receptionPositivity)}
                    </td>
                    <td>{player.errors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}
