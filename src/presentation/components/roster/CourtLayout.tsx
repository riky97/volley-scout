import type { CourtPosition, Id, Player } from '@domain/index';
import clsx from 'clsx';
import { LINEUP, LIVE } from '@shared/copy';
import styles from './CourtLayout.module.scss';

/** Front row nearest the net, then the back row — matches docs/03-ux-flows.md §3.4. */
const FRONT_ROW: readonly CourtPosition[] = ['P4', 'P3', 'P2'];
const BACK_ROW: readonly CourtPosition[] = ['P5', 'P6', 'P1'];

export interface CourtLayoutProps {
  readonly slots: Readonly<Record<CourtPosition, Id | null>>;
  readonly playersById: ReadonlyMap<Id, Player>;
  /** True while our team serves: P1 gets the serving marker. */
  readonly weAreServing: boolean;
  readonly onSelectPosition: (position: CourtPosition) => void;
}

function Slot({
  position,
  playerId,
  playersById,
  serving,
  onSelectPosition,
}: {
  readonly position: CourtPosition;
  readonly playerId: Id | null;
  readonly playersById: ReadonlyMap<Id, Player>;
  readonly serving: boolean;
  readonly onSelectPosition: (position: CourtPosition) => void;
}): React.JSX.Element {
  const player = playerId === null ? null : (playersById.get(playerId) ?? null);
  const label =
    player === null
      ? `${position} — ${LINEUP.emptySlot}`
      : `${position} — ${String(player.shirtNumber)} ${player.name}${serving ? ` — ${LIVE.serving}` : ''}`;

  return (
    <button
      type="button"
      className={clsx(styles.slot, player !== null && styles.filled, serving && styles.serving)}
      onClick={() => {
        onSelectPosition(position);
      }}
      aria-label={label}
    >
      <span className={styles.positionLabel}>
        {position}
        {serving && (
          <span className={styles.servingMark} aria-hidden="true">
            {' '}
            ⚐
          </span>
        )}
      </span>
      {player === null ? (
        <span className={styles.empty}>{LINEUP.emptySlot}</span>
      ) : (
        <>
          <span className={styles.shirt}>{player.shirtNumber}</span>
          <span className={styles.playerName}>{player.shortName}</span>
        </>
      )}
    </button>
  );
}

/** 2x3 court grid, front row toward the net, back row toward the bench. */
export function CourtLayout({
  slots,
  playersById,
  weAreServing,
  onSelectPosition,
}: CourtLayoutProps): React.JSX.Element {
  return (
    <div className={styles.court} role="group" aria-label={LINEUP.court}>
      <div className={styles.net} aria-hidden="true" />
      {FRONT_ROW.map((position) => (
        <Slot
          key={position}
          position={position}
          playerId={slots[position]}
          playersById={playersById}
          serving={weAreServing && position === 'P1'}
          onSelectPosition={onSelectPosition}
        />
      ))}
      {BACK_ROW.map((position) => (
        <Slot
          key={position}
          position={position}
          playerId={slots[position]}
          playersById={playersById}
          serving={weAreServing && position === 'P1'}
          onSelectPosition={onSelectPosition}
        />
      ))}
    </div>
  );
}
