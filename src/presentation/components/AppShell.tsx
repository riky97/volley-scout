import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { APP_NAME, NAV, SAVE_STATE_LABELS } from '@shared/copy';
import { ROUTES } from '../routes';
import { useMatchStore } from '@application/stores/matchStore';
import { UpdateBanner } from './UpdateBanner';
import styles from './AppShell.module.scss';

const NAV_ITEMS = [
  { to: ROUTES.home, label: NAV.home },
  { to: ROUTES.archive, label: NAV.archive },
  { to: ROUTES.settings, label: NAV.settings },
] as const;

export function AppShell({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const location = useLocation();
  const saveState = useMatchStore((state) => state.saveState);
  const hasMatch = useMatchStore((state) => state.match !== null);
  // The live screen gives the court every pixel it can: navigation collapses to icons-free labels.
  const isLive = location.pathname === ROUTES.live;

  return (
    <div className={clsx(styles.shell, isLive && styles.shellLive)}>
      <header className={styles.header}>
        <span className={styles.brand}>{APP_NAME}</span>
        <nav aria-label={NAV.home}>
          <ul className={styles.navList}>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => clsx(styles.navLink, isActive && styles.navLinkActive)}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        {hasMatch && (
          <span
            className={clsx(styles.saveState, saveState === 'error' && styles.saveStateError)}
            role="status"
          >
            {SAVE_STATE_LABELS[saveState]}
          </span>
        )}
      </header>
      <main className={styles.main}>
        {/* Never on the live screen: an update is for between matches, not between rallies. */}
        {!isLive && <UpdateBanner />}
        {children}
      </main>
    </div>
  );
}
