import clsx from 'clsx';
import type { CourtPosition, Id, Player, PositionedPlayer } from '@domain/index';
import { LIVE } from '@shared/copy';
import styles from './CourtGrid.module.scss';

export interface CourtGridProps {
  readonly court: readonly PositionedPlayer[];
  readonly roster: readonly Player[];
  readonly rotationOffset: number;
  readonly serverId: Id | null;
  readonly selectedPlayerId: Id | null;
  readonly onSelectPlayer: (playerId: Id) => void;
}

/** Front row first, as the operator sees the court from the stand. */
const LAYOUT: readonly CourtPosition[] = ['P4', 'P3', 'P2', 'P5', 'P6', 'P1'];

export function CourtGrid({
  court,
  roster,
  rotationOffset,
  serverId,
  selectedPlayerId,
  onSelectPlayer,
}: CourtGridProps): React.JSX.Element {
  const playerOf = (position: CourtPosition): Player | undefined => {
    const spot = court.find((entry) => entry.position === position);
    if (spot === undefined) return undefined;
    return roster.find((player) => player.id === spot.playerId);
  };

  return (
    <div className={styles.court} role="group" aria-label={LIVE.court(rotationOffset)}>
      {LAYOUT.map((position) => {
        const player = playerOf(position);
        const isServer = player !== undefined && player.id === serverId;
        const isSelected = player !== undefined && player.id === selectedPlayerId;
        return (
          <button
            key={position}
            type="button"
            className={clsx(
              styles.slot,
              isSelected && styles.slotSelected,
              isServer && styles.slotServing,
            )}
            disabled={player === undefined}
            aria-pressed={isSelected}
            onClick={() => {
              if (player !== undefined) onSelectPlayer(player.id);
            }}
          >
            <span className={styles.position}>
              {position}
              {isServer && <span aria-hidden="true"> ⚐</span>}
            </span>
            <span className={styles.shirt}>{player?.shirtNumber ?? '—'}</span>
            <span className={styles.name}>
              {player?.shortName ?? ''}
              {player?.isLibero === true ? ' L' : ''}
            </span>
            {isServer && <span className="sr-only">{LIVE.serving}</span>}
          </button>
        );
      })}
    </div>
  );
}
