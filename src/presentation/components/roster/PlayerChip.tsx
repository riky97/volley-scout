import type { Player } from '@domain/index';
import clsx from 'clsx';
import styles from './PlayerChip.module.scss';

export interface PlayerChipProps {
  readonly player: Player;
  readonly selected?: boolean;
  readonly serving?: boolean;
  readonly disabled?: boolean;
  readonly onSelect?: (id: string) => void;
  readonly className?: string;
}

/** A compact selectable player chip: shirt number, short name, libero/serving badges. */
export function PlayerChip({
  player,
  selected = false,
  serving = false,
  disabled = false,
  onSelect,
  className,
}: PlayerChipProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={clsx(styles.chip, selected && styles.selected, className)}
      disabled={disabled}
      aria-pressed={selected}
      onClick={() => {
        onSelect?.(player.id);
      }}
    >
      <span className={styles.number}>{player.shirtNumber}</span>
      <span className={styles.name}>{player.shortName}</span>
      {(player.isLibero || serving) && (
        <span className={styles.badges} aria-hidden="true">
          {player.isLibero && <span className={styles.badge}>L</span>}
          {serving && <span className={styles.badge}>S</span>}
        </span>
      )}
    </button>
  );
}
