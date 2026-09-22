import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeMatchStatistics } from '@domain/index';
import { useMatchStore } from '@application/stores/matchStore';
import type { ExportFormat } from '@infrastructure/export';
import { exportMatch } from '@infrastructure/export';
import { Button } from '@presentation/components/ui/Button';
import { Card } from '@presentation/components/ui/Card';
import { Dialog } from '@presentation/components/ui/Dialog';
import { EmptyState, LoadingState } from '@presentation/components/ui/EmptyState';
import { showToast } from '@presentation/components/ui/Toast';
import { PlayerStatsTable } from '@presentation/components/report/PlayerStatsTable';
import { SetScoreTable } from '@presentation/components/report/SetScoreTable';
import { SetTrend } from '@presentation/components/report/SetTrend';
import { TeamStatsPanel } from '@presentation/components/report/TeamStatsPanel';
import { ROUTES } from '@presentation/routes';
import { COMMON_BUTTONS, DIALOGS, LIVE, NEW_MATCH, STATS, SUMMARY, TOASTS } from '@shared/copy';
import { formatDateIt } from '@shared/format/number';

const EXPORT_BUTTONS: readonly { readonly format: ExportFormat; readonly label: string }[] = [
  { format: 'pdf', label: SUMMARY.exportPdf },
  { format: 'xlsx', label: SUMMARY.exportXlsx },
  { format: 'json', label: SUMMARY.exportJson },
];

export function SummaryPage(): React.JSX.Element {
  const navigate = useNavigate();
  const match = useMatchStore((state) => state.match);
  const snapshot = useMatchStore((state) => state.snapshot);
  const isLoading = useMatchStore((state) => state.isLoading);
  const finishMatch = useMatchStore((state) => state.finishMatch);

  const [runningFormat, setRunningFormat] = useState<ExportFormat | null>(null);
  const [failedFormat, setFailedFormat] = useState<ExportFormat | null>(null);
  const [finishPromptOpen, setFinishPromptOpen] = useState(false);

  const stats = useMemo(() => (match === null ? null : computeMatchStatistics(match)), [match]);

  if (isLoading) {
    return <LoadingState label={SUMMARY.loading} />;
  }

  if (match === null || stats === null) {
    return (
      <EmptyState
        title={SUMMARY.error.loadFailed}
        action={
          <div className="flex gap-[var(--sp-3)]">
            <Button
              variant="secondary"
              onClick={() => {
                void navigate(ROUTES.archive);
              }}
            >
              {SUMMARY.error.backToArchive}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                void navigate(ROUTES.home);
              }}
            >
              {COMMON_BUTTONS.backToHome}
            </Button>
          </div>
        }
      />
    );
  }

  const setsWon = match.sets.reduce(
    (acc, set) => {
      if (set.winner === 'us') return { us: acc.us + 1, them: acc.them };
      if (set.winner === 'them') return { us: acc.us, them: acc.them + 1 };
      return acc;
    },
    { us: 0, them: 0 },
  );

  const canFinish = match.status === 'live' && snapshot?.matchWinner != null;

  const runExport = (format: ExportFormat): void => {
    if (runningFormat !== null) return;
    setRunningFormat(format);
    setFailedFormat(null);
    void exportMatch(match, format)
      .then((outcome) => {
        if (outcome.kind === 'saved') {
          showToast(TOASTS.exportDone, 'success');
        } else if (outcome.kind === 'failed') {
          setFailedFormat(format);
        }
      })
      .finally(() => {
        setRunningFormat(null);
      });
  };

  const metaParts = [match.info.competition, match.info.venue].filter((part) => part.trim().length > 0);

  return (
    <div className="flex flex-col gap-[var(--sp-5)] p-[var(--sp-5)]">
      <Card
        title={SUMMARY.title}
        actions={
          <div className="flex flex-wrap gap-[var(--sp-2)]">
            {EXPORT_BUTTONS.map(({ format, label }) => (
              <Button
                key={format}
                variant="secondary"
                disabled={runningFormat !== null}
                onClick={() => {
                  runExport(format);
                }}
              >
                {runningFormat === format ? SUMMARY.exportRunning : label}
              </Button>
            ))}
            {canFinish && (
              <Button
                variant="primary"
                onClick={() => {
                  setFinishPromptOpen(true);
                }}
              >
                {LIVE.endMatch}
              </Button>
            )}
          </div>
        }
      >
        <p className="text-[var(--fs-body-lg)] font-semibold text-[var(--text)]">
          {SUMMARY.result(match.info.ourTeam.name, setsWon.us, setsWon.them, match.info.opponentTeam.name)}
        </p>
        <p className="mt-[var(--sp-1)] text-[var(--fs-small)] text-[var(--text-muted)]">
          {[formatDateIt(match.info.date), ...metaParts].join(' · ')}
        </p>
      </Card>

      <Card title={SUMMARY.setsTable}>
        <SetScoreTable match={match} />
      </Card>

      <Card title={`${STATS.team} — ${STATS.totalMatch}`}>
        <TeamStatsPanel team={stats.team} />
      </Card>

      <Card title={SUMMARY.playerStats(STATS.totalMatch)}>
        <PlayerStatsTable match={match} players={stats.players} />
      </Card>

      <Card title={SUMMARY.trend}>
        <SetTrend perSetTeam={stats.perSetTeam} />
      </Card>

      {match.info.notes.trim().length > 0 && (
        <Card title={NEW_MATCH.notes}>
          <p className="whitespace-pre-wrap text-[var(--fs-body)] text-[var(--text)]">{match.info.notes}</p>
        </Card>
      )}

      <p className="text-[var(--fs-small)] text-[var(--text-muted)]">
        Generato il {formatDateIt(new Date().toISOString().slice(0, 10))}
      </p>

      {/* Closing the match stops any further recording, so it is always confirmed. */}
      <Dialog
        open={finishPromptOpen}
        title={DIALOGS.confirmEndMatch.title}
        description={DIALOGS.confirmEndMatch.body(
          match.info.ourTeam.name,
          setsWon.us,
          setsWon.them,
          match.info.opponentTeam.name,
        )}
        confirmLabel={DIALOGS.confirmEndMatch.confirm}
        cancelLabel={DIALOGS.confirmEndMatch.cancel}
        onCancel={() => {
          setFinishPromptOpen(false);
        }}
        onConfirm={() => {
          finishMatch();
          setFinishPromptOpen(false);
          showToast(TOASTS.matchSaved, 'success');
        }}
      />

      <Dialog
        open={failedFormat !== null}
        title={TOASTS.exportFailed}
        confirmLabel={COMMON_BUTTONS.retry}
        cancelLabel={COMMON_BUTTONS.close}
        onCancel={() => {
          setFailedFormat(null);
        }}
        onConfirm={() => {
          const format = failedFormat;
          setFailedFormat(null);
          if (format !== null) runExport(format);
        }}
      />
    </div>
  );
}
