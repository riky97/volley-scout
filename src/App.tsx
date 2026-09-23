import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@presentation/components/AppShell';
import { ErrorBoundary } from '@presentation/components/ErrorBoundary';
import { Toaster } from '@presentation/components/ui/Toast';
import { ROUTES } from '@presentation/routes';
import { HomePage } from '@presentation/pages/HomePage';
import { NewMatchPage } from '@presentation/pages/NewMatchPage';
import { RosterManagerPage } from '@presentation/pages/RosterManagerPage';
import { RosterPage } from '@presentation/pages/RosterPage';
import { LineupPage } from '@presentation/pages/LineupPage';
import { LiveScoutPage } from '@presentation/pages/LiveScoutPage';
import { LiveStatsPage } from '@presentation/pages/LiveStatsPage';
import { SummaryPage } from '@presentation/pages/SummaryPage';
import { ArchivePage } from '@presentation/pages/ArchivePage';
import { SettingsPage } from '@presentation/pages/SettingsPage';
import { useSettingsStore } from '@application/stores/settingsStore';
import { applyTheme } from '@presentation/styles/theme';
import { useCloseGuard } from '@presentation/hooks/useCloseGuard';
import { CloseConfirmationDialog } from '@presentation/components/CloseConfirmationDialog';

export function App(): React.JSX.Element {
  const loadSettings = useSettingsStore((state) => state.load);
  const theme = useSettingsStore((state) => state.settings.theme);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const closeGuard = useCloseGuard();

  return (
    <ErrorBoundary>
      {/* Hash routing: the desktop build serves files directly, with no history fallback. */}
      <HashRouter>
        <AppShell>
          <Routes>
            <Route path={ROUTES.home} element={<HomePage />} />
            <Route path={ROUTES.newMatch} element={<NewMatchPage />} />
            <Route path={ROUTES.roster} element={<RosterPage />} />
            <Route path={ROUTES.rosterManager} element={<RosterManagerPage />} />
            <Route path={ROUTES.lineup} element={<LineupPage />} />
            <Route path={ROUTES.live} element={<LiveScoutPage />} />
            <Route path={ROUTES.stats} element={<LiveStatsPage />} />
            <Route path={ROUTES.summary} element={<SummaryPage />} />
            <Route path={ROUTES.archive} element={<ArchivePage />} />
            <Route path={ROUTES.settings} element={<SettingsPage />} />
            <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
          </Routes>
        </AppShell>
        <Toaster />
        <CloseConfirmationDialog
          open={closeGuard.isConfirming}
          hasUnsavedChanges={closeGuard.hasUnsavedChanges}
          closeFailed={closeGuard.closeFailed}
          onConfirm={closeGuard.confirmClose}
          onCancel={closeGuard.cancelClose}
        />
      </HashRouter>
    </ErrorBoundary>
  );
}
