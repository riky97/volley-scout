import clsx from 'clsx';
import type { Id, Player } from '@domain/index';
import { LIVE } from '@shared/copy';
import styles from './LiberoRow.module.scss';

export interface LiberoRowProps {
  readonly liberos: readonly Player[];
  readonly selectedPlayerId: Id | null;
  readonly onSelectPlayer: (playerId: Id) => void;
}

/**
 * Liberos off the rotation (A4), kept under the court so reception and defence are one tap
 * away. Shorter than the court slots: no position, no serve marker.
 */
export function LiberoRow({
  liberos,
  selectedPlayerId,
  onSelectPlayer,
}: LiberoRowProps): React.JSX.Element | null {
  if (liberos.length === 0) return null;

  return (
    <div className={styles.row} role="group" aria-label={LIVE.liberos}>
      {liberos.map((player) => {
        const isSelected = player.id === selectedPlayerId;
        return (
          <button
            key={player.id}
            type="button"
            className={clsx(styles.libero, isSelected && styles.selected)}
            aria-pressed={isSelected}
            onClick={() => {
              onSelectPlayer(player.id);
            }}
          >
            <span className={styles.tag} aria-hidden="true">
              {LIVE.liberoTag}
            </span>
            <span className={styles.shirt}>{player.shirtNumber}</span>
            <span className={styles.name}>{player.shortName}</span>
          </button>
        );
      })}
    </div>
  );
}
