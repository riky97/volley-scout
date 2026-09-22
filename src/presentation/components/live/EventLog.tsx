import clsx from 'clsx';
import type { Id, Player, ScoutEvent } from '@domain/index';
import { COMMON_BUTTONS, LIVE } from '@shared/copy';
import { describeEvent } from './describeEvent';
import styles from './EventLog.module.scss';

export interface EventLogProps {
  readonly events: readonly ScoutEvent[];
  readonly roster: readonly Player[];
  readonly limit?: number;
  readonly onDelete?: (eventId: Id) => void;
  readonly title?: string;
}

/** Most recent first: during a match the operator only ever checks the last few rows. */
export function EventLog({
  events,
  roster,
  limit,
  onDelete,
  title = LIVE.recentEvents,
}: EventLogProps): React.JSX.Element {
  const ordered = [...events].reverse();
  const visible = limit === undefined ? ordered : ordered.slice(0, limit);

  return (
    <section className={styles.log} aria-label={title}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
      </header>
      {visible.length === 0 ? (
        <p className={styles.empty}>{LIVE.noEvents}</p>
      ) : (
        <ul className={styles.list}>
          {visible.map((event) => {
            const description = describeEvent(event, roster);
            return (
              <li key={event.id} className={clsx(styles.row, styles[description.tone])}>
                <span className={styles.score}>{description.score ?? ''}</span>
                <span className={styles.symbol} aria-hidden="true">
                  {description.symbol}
                </span>
                <span className={styles.text}>
                  <span className={styles.primary}>{description.primary}</span>
                  {description.secondary !== '' && (
                    <span className={styles.secondary}>{description.secondary}</span>
                  )}
                </span>
                {onDelete !== undefined && (
                  <button
                    type="button"
                    className={styles.delete}
                    onClick={() => {
                      onDelete(event.id);
                    }}
                    aria-label={`${COMMON_BUTTONS.delete}: ${description.primary}`}
                  >
                    ✕
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
