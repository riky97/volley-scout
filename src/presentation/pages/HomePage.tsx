import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Match, MatchSnapshot } from '@domain/index';
import { useMatchStore } from '@application/stores/matchStore';
import { useArchiveStore } from '@application/stores/archiveStore';
import { Button } from '@presentation/components/ui/Button';
import { Card } from '@presentation/components/ui/Card';
import { Dialog } from '@presentation/components/ui/Dialog';
import { EmptyState, LoadingState } from '@presentation/components/ui/EmptyState';
import { ROUTES } from '@presentation/routes';
import { DIALOGS, HOME } from '@shared/copy';

function isUnfinishedMatch(match: Match | null): boolean {
  return match !== null && (match.status === 'setup' || match.status === 'live');
}

/** "YYYY-MM-DD" -> "DD/MM/YYYY", the format used everywhere in the UX wireframes. */
function formatItalianDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  if (year === undefined || month === undefined || day === undefined) return isoDate;
  return `${day}/${month}/${year}`;
}

function resumeSubtitle(match: Match, snapshot: MatchSnapshot | null): string {
  const setIndex = snapshot !== null && snapshot.currentSetIndex >= 0 ? snapshot.currentSetIndex + 1 : 1;
  const score = snapshot === null ? '0–0' : `${snapshot.score.us}–${snapshot.score.them}`;
  return HOME.resumeCard.subtitle
    .replace('{our}', match.info.ourTeam.name)
    .replace('{their}', match.info.opponentTeam.name)
    .replace('{date}', formatItalianDate(match.info.date))
    .replace('{setIndex}', String(setIndex))
    .replace('{score}', score);
}

export function HomePage(): React.JSX.Element {
  const navigate = useNavigate();
  const match = useMatchStore((state) => state.match);
  const snapshot = useMatchStore((state) => state.snapshot);
  const resumeLastMatch = useMatchStore((state) => state.resumeLastMatch);
  const archiveMatches = useArchiveStore((state) => state.matches);
  const isArchiveLoading = useArchiveStore((state) => state.isLoading);
  const refreshArchive = useArchiveStore((state) => state.refresh);

  const [resumeChecked, setResumeChecked] = useState(false);
  const [confirmNewMatchOpen, setConfirmNewMatchOpen] = useState(false);

  useEffect(() => {
    void refreshArchive();
    // Runs once on mount; refreshArchive is a stable zustand action reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (match !== null) return;
    let cancelled = false;
    void resumeLastMatch().then(() => {
      if (!cancelled) setResumeChecked(true);
    });
    return () => {
      cancelled = true;
    };
    // Only re-check when the currently loaded match changes identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match]);

  const hasUnfinishedMatch = isUnfinishedMatch(match);
  const checkedResume = match !== null || resumeChecked;

  function goToNewMatch(): void {
    if (hasUnfinishedMatch) {
      setConfirmNewMatchOpen(true);
      return;
    }
    void navigate(ROUTES.newMatch);
  }

  function resumeTarget(): string {
    return snapshot !== null && snapshot.currentSetIndex >= 0 ? ROUTES.live : ROUTES.lineup;
  }

  const showEmptyState =
    checkedResume && !hasUnfinishedMatch && !isArchiveLoading && archiveMatches.length === 0;

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-[var(--sp-5)] p-[var(--sp-5)]">
      <header>
        <h1 className="text-[var(--fs-h1)] font-semibold text-[var(--text)]">{HOME.title}</h1>
        <p className="text-[var(--fs-body)] text-[var(--text-muted)]">{HOME.subtitle}</p>
      </header>

      {!checkedResume && (
        <div aria-busy="true">
          <LoadingState label={HOME.loading} />
        </div>
      )}

      {checkedResume && hasUnfinishedMatch && match !== null && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-[var(--sp-4)]">
            <div>
              <p className="text-[var(--fs-h3)] font-semibold text-[var(--text)]">
                {HOME.resumeCard.title}
              </p>
              <p className="text-[var(--fs-body)] text-[var(--text-muted)]">
                {resumeSubtitle(match, snapshot)}
              </p>
            </div>
            <Button
              variant="primary"
              size="large"
              onClick={() => {
                void navigate(resumeTarget());
              }}
            >
              {HOME.resumeCard.resumeButton}
            </Button>
          </div>
        </Card>
      )}

      {showEmptyState && (
        <EmptyState
          title={HOME.emptyState.title}
          description={HOME.emptyState.body}
          action={
            <Button variant="primary" onClick={goToNewMatch}>
              {HOME.emptyState.button}
            </Button>
          }
        />
      )}

      <div className="grid grid-cols-1 gap-[var(--sp-4)] sm:grid-cols-3">
        <Card title={HOME.newMatchCard.title}>
          <p className="mb-[var(--sp-4)] text-[var(--fs-body)] text-[var(--text-muted)]">
            {HOME.newMatchCard.body}
          </p>
          <Button variant="primary" fullWidth onClick={goToNewMatch}>
            {HOME.newMatchCard.button}
          </Button>
        </Card>

        <Card title={HOME.archiveCard.title}>
          <p className="mb-[var(--sp-4)] text-[var(--fs-body)] text-[var(--text-muted)]">
            {HOME.archiveCard.body(archiveMatches.length)}
          </p>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              void navigate(ROUTES.archive);
            }}
          >
            {HOME.archiveCard.button}
          </Button>
        </Card>

        <Card title={HOME.settingsCard.title}>
          <p className="mb-[var(--sp-4)] text-[var(--fs-body)] text-[var(--text-muted)]">
            {HOME.settingsCard.body}
          </p>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              void navigate(ROUTES.settings);
            }}
          >
            {HOME.settingsCard.button}
          </Button>
        </Card>
      </div>

      <Dialog
        open={confirmNewMatchOpen}
        title={DIALOGS.resumeConflict.title}
        description={DIALOGS.resumeConflict.body}
        cancelLabel={DIALOGS.resumeConflict.cancel}
        confirmLabel={DIALOGS.resumeConflict.confirm}
        onCancel={() => {
          setConfirmNewMatchOpen(false);
        }}
        onConfirm={() => {
          setConfirmNewMatchOpen(false);
          void navigate(ROUTES.newMatch);
        }}
      />
    </div>
  );
}
