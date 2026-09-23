import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Match } from '@domain/index';
import { useArchiveStore } from '@application/stores/archiveStore';
import { useMatchStore } from '@application/stores/matchStore';
import { pickMatchFile } from '@infrastructure/export';
import type { ArchiveEntry } from '@infrastructure/storage';
import { Button } from '@presentation/components/ui/Button';
import { Dialog } from '@presentation/components/ui/Dialog';
import { EmptyState, LoadingState } from '@presentation/components/ui/EmptyState';
import { showToast } from '@presentation/components/ui/Toast';
import { ROUTES } from '@presentation/routes';
import { ARCHIVE, COMMON_BUTTONS, DIALOGS } from '@shared/copy';

/** "YYYY-MM-DD" -> "DD/MM/YYYY", the format used everywhere in the UX wireframes. */
function formatItalianDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  if (year === undefined || month === undefined || day === undefined) return isoDate;
  return `${day}/${month}/${year}`;
}

function statusLabel(status: ArchiveEntry['status']): string {
  switch (status) {
    case 'finished':
      return ARCHIVE.status.finished;
    case 'live':
      return ARCHIVE.status.live;
    case 'setup':
      return ARCHIVE.status.setup;
    case 'abandoned':
      return ARCHIVE.status.abandoned;
  }
}

function matchesFilter(entry: ArchiveEntry, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (normalized === '') return true;
  return (
    entry.ourTeamName.toLowerCase().includes(normalized) ||
    entry.opponentTeamName.toLowerCase().includes(normalized) ||
    entry.competition.toLowerCase().includes(normalized)
  );
}

export function ArchivePage(): React.JSX.Element {
  const navigate = useNavigate();
  const matches = useArchiveStore((state) => state.matches);
  const isLoading = useArchiveStore((state) => state.isLoading);
  const refresh = useArchiveStore((state) => state.refresh);
  const deleteMatch = useArchiveStore((state) => state.deleteMatch);
  const importMatch = useArchiveStore((state) => state.importMatch);
  const loadMatch = useMatchStore((state) => state.loadMatch);

  const [query, setQuery] = useState('');
  const [onlyUnfinished, setOnlyUnfinished] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ArchiveEntry | null>(null);
  const [corruptOpen, setCorruptOpen] = useState(false);

  useEffect(() => {
    void refresh();
    // Runs once on mount; refresh is a stable zustand action reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      matches
        .filter((entry) => matchesFilter(entry, query))
        .filter((entry) => !onlyUnfinished || entry.status === 'live' || entry.status === 'setup'),
    [matches, query, onlyUnfinished],
  );

  async function openEntry(entry: ArchiveEntry): Promise<void> {
    const outcome = await loadMatch(entry.id);
    if (outcome.kind === 'ok') {
      const opened: Match = outcome.value;
      void navigate(opened.status === 'finished' ? ROUTES.summary : ROUTES.live);
      return;
    }
    if (outcome.kind === 'corrupt') {
      setCorruptOpen(true);
    }
  }

  async function confirmDelete(): Promise<void> {
    if (deleteTarget === null) return;
    await deleteMatch(deleteTarget.id);
    setDeleteTarget(null);
  }

  async function importFromFile(): Promise<void> {
    const picked = await pickMatchFile();
    if (picked.kind === 'cancelled') return;
    if (picked.kind === 'invalid') {
      showToast(ARCHIVE.error.importFailed, 'error');
      return;
    }
    try {
      const decision = await importMatch(picked.match);
      const tone = decision === 'add' || decision === 'update' ? 'success' : 'warning';
      showToast(ARCHIVE.imported[decision], tone);
    } catch {
      showToast(ARCHIVE.error.importFailed, 'error');
    }
  }

  function clearFilters(): void {
    setQuery('');
    setOnlyUnfinished(false);
  }

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-[var(--sp-5)] p-[var(--sp-5)]">
      <header className="flex items-center justify-between">
        <h1 className="text-[var(--fs-h1)] font-semibold text-[var(--text)]">{ARCHIVE.title}</h1>
        <Button
          variant="secondary"
          disabled={isLoading}
          onClick={() => {
            void importFromFile();
          }}
        >
          {ARCHIVE.importMatch}
        </Button>
      </header>

      <div className="flex flex-wrap items-end gap-[var(--sp-4)]">
        <label className="flex flex-col gap-[var(--sp-1)]">
          <span className="text-[var(--fs-small)] font-medium text-[var(--text)]">
            {ARCHIVE.search}
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            className="min-h-[var(--hit-min)] rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] px-[var(--sp-3)] text-[var(--fs-body)] text-[var(--text)]"
          />
        </label>
        <label className="flex items-center gap-[var(--sp-2)] pb-[var(--sp-2)]">
          <input
            type="checkbox"
            checked={onlyUnfinished}
            onChange={(event) => {
              setOnlyUnfinished(event.target.checked);
            }}
          />
          solo non terminate
        </label>
      </div>

      {isLoading && <LoadingState label={ARCHIVE.loading} />}

      {!isLoading && matches.length === 0 && (
        <EmptyState
          title={ARCHIVE.emptyState.title}
          description={ARCHIVE.emptyState.body}
          action={
            <Button
              variant="primary"
              onClick={() => {
                void navigate(ROUTES.newMatch);
              }}
            >
              {ARCHIVE.emptyState.button}
            </Button>
          }
        />
      )}

      {!isLoading && matches.length > 0 && filtered.length === 0 && (
        <EmptyState
          title={ARCHIVE.filteredEmptyState}
          action={
            <Button variant="secondary" onClick={clearFilters}>
              {COMMON_BUTTONS.clearFilters}
            </Button>
          }
        />
      )}

      {!isLoading && filtered.length > 0 && (
        <>
          <table className="w-full border-collapse text-[var(--fs-body)] text-[var(--text)]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left">
                <th className="p-[var(--sp-3)]">{ARCHIVE.columns.date}</th>
                <th className="p-[var(--sp-3)]">{ARCHIVE.columns.match}</th>
                <th className="p-[var(--sp-3)]">{ARCHIVE.columns.score}</th>
                <th className="p-[var(--sp-3)]">{ARCHIVE.columns.status}</th>
                <th className="p-[var(--sp-3)]">
                  <span className="sr-only">Azioni</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.id} className="border-b border-[var(--border)]">
                  <td className="p-[var(--sp-3)]">{formatItalianDate(entry.date)}</td>
                  <td className="p-[var(--sp-3)]">
                    <button
                      type="button"
                      className="min-h-[var(--hit-min)] text-left font-medium underline-offset-2 hover:underline"
                      onClick={() => {
                        void openEntry(entry);
                      }}
                    >
                      {entry.ourTeamName} – {entry.opponentTeamName}
                    </button>
                    {entry.competition !== '' && (
                      <p className="text-[var(--fs-small)] text-[var(--text-muted)]">
                        {entry.competition}
                      </p>
                    )}
                  </td>
                  <td className="p-[var(--sp-3)] tabular-nums">
                    {/* An unfinished match still has a partial result worth showing. */}
                    {entry.setsWon.us + entry.setsWon.them > 0
                      ? `${String(entry.setsWon.us)} – ${String(entry.setsWon.them)}`
                      : '–'}
                  </td>
                  <td className="p-[var(--sp-3)]">{statusLabel(entry.status)}</td>
                  <td className="p-[var(--sp-3)]">
                    <div className="flex justify-end gap-[var(--sp-2)]">
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => {
                          void openEntry(entry);
                        }}
                      >
                        {COMMON_BUTTONS.open}
                      </Button>
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => {
                          setDeleteTarget(entry);
                        }}
                      >
                        {COMMON_BUTTONS.delete}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[var(--fs-small)] text-[var(--text-muted)]">
            {ARCHIVE.count(filtered.length)}
          </p>
        </>
      )}

      <Dialog
        open={deleteTarget !== null}
        title={DIALOGS.confirmDeleteMatch.title}
        description={
          deleteTarget !== null
            ? DIALOGS.confirmDeleteMatch.body(
                deleteTarget.ourTeamName,
                deleteTarget.opponentTeamName,
                formatItalianDate(deleteTarget.date),
              )
            : ''
        }
        destructive
        cancelLabel={DIALOGS.confirmDeleteMatch.cancel}
        confirmLabel={DIALOGS.confirmDeleteMatch.confirm}
        onCancel={() => {
          setDeleteTarget(null);
        }}
        onConfirm={() => {
          void confirmDelete();
        }}
      />

      <Dialog
        open={corruptOpen}
        title={DIALOGS.recovery.title}
        description={DIALOGS.recovery.body}
        cancelLabel={DIALOGS.recovery.continue}
        onCancel={() => {
          setCorruptOpen(false);
        }}
      />
    </div>
  );
}
