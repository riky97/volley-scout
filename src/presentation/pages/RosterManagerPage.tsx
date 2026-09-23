import { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Player, RosterTemplate } from '@domain/index';
import { createPlayer, duplicateShirtNumbers, hasDuplicateShirtNumbers } from '@domain/index';
import { useArchiveStore } from '@application/stores/archiveStore';
import { newId, nowIso } from '@application/clock';
import { exportRosters, pickRosterBackup } from '@infrastructure/export';
import { COMMON_BUTTONS, HOME, ROSTER, ROSTER_MANAGER } from '@shared/copy';
import { Button } from '@presentation/components/ui/Button';
import { Card } from '@presentation/components/ui/Card';
import { Dialog } from '@presentation/components/ui/Dialog';
import { EmptyState, LoadingState } from '@presentation/components/ui/EmptyState';
import { showToast } from '@presentation/components/ui/Toast';
import { RosterTable } from '@presentation/components/roster/RosterTable';
import { PlayerFormRow } from '@presentation/components/roster/PlayerFormRow';
import type { PlayerFormValues } from '@presentation/components/roster/PlayerFormRow';
import { ROUTES } from '@presentation/routes';
import { Label } from '@presentation/components/ui/Label';
import { Input } from '@presentation/components/ui/Input';

/** The roster being edited: an existing template when `id` is set, a new one when it is null. */
interface RosterDraft {
  readonly id: string | null;
  readonly name: string;
  readonly teamName: string;
  readonly players: readonly Player[];
}

const EMPTY_DRAFT: RosterDraft = { id: null, name: '', teamName: '', players: [] };

function draftFrom(template: RosterTemplate): RosterDraft {
  return {
    id: template.id,
    name: template.name,
    teamName: template.teamName,
    players: template.players,
  };
}

function formatItalianDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  return date.toLocaleDateString('it-IT');
}

/**
 * Standalone roster management, reachable from Home. Preparing a squad used to be possible only
 * inside the new-match wizard, which forced the operator to start a match they did not want.
 */
export function RosterManagerPage(): React.JSX.Element {
  const navigate = useNavigate();
  const nameFieldId = useId();
  const teamFieldId = useId();

  const templates = useArchiveStore((state) => state.templates);
  const isLoading = useArchiveStore((state) => state.isLoading);
  const refresh = useArchiveStore((state) => state.refresh);
  const saveTemplate = useArchiveStore((state) => state.saveTemplate);
  const updateTemplate = useArchiveStore((state) => state.updateTemplate);
  const deleteTemplate = useArchiveStore((state) => state.deleteTemplate);
  const importTemplates = useArchiveStore((state) => state.importTemplates);

  const [draft, setDraft] = useState<RosterDraft | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RosterTemplate | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const players = useMemo(() => draft?.players ?? [], [draft]);
  const duplicateNumbers = useMemo(() => new Set(duplicateShirtNumbers(players)), [players]);

  function patchDraft(patch: Partial<RosterDraft>): void {
    setDraft((current) => (current === null ? current : { ...current, ...patch }));
  }

  function savePlayer(values: PlayerFormValues): void {
    const player = createPlayer({
      id: editingPlayerId ?? newId(),
      shirtNumber: values.shirtNumber,
      name: values.name,
      role: values.role,
      isLibero: values.isLibero,
    });
    patchDraft({
      players:
        editingPlayerId === null
          ? [...players, player]
          : players.map((existing) => (existing.id === editingPlayerId ? player : existing)),
    });
    setEditingPlayerId(null);
  }

  function saveDraft(): void {
    if (draft === null) return;
    const name = draft.name.trim();
    if (name === '') {
      showToast(ROSTER_MANAGER.error.nameRequired, 'error');
      return;
    }
    if (draft.players.length === 0) {
      showToast(ROSTER_MANAGER.error.noPlayers, 'error');
      return;
    }
    if (hasDuplicateShirtNumbers(draft.players)) {
      showToast(ROSTER_MANAGER.error.duplicateShirtNumber, 'error');
      return;
    }

    const existing = draft.id === null ? null : templates.find((t) => t.id === draft.id);
    const saving =
      existing === null || existing === undefined
        ? saveTemplate(name, draft.teamName.trim(), draft.players)
        : updateTemplate({ ...existing, name, teamName: draft.teamName.trim() }, draft.players);

    void saving
      .then(() => {
        showToast(ROSTER_MANAGER.saved, 'success');
        setDraft(null);
        setEditingPlayerId(null);
      })
      .catch(() => {
        showToast(ROSTER.error.templateSaveFailed, 'error');
      });
  }

  function exportAll(): void {
    void exportRosters(templates, nowIso()).then((outcome) => {
      if (outcome.kind === 'saved') showToast(ROSTER_MANAGER.backup.exported, 'success');
      if (outcome.kind === 'failed') showToast(ROSTER_MANAGER.backup.exportFailed, 'error');
    });
  }

  function importBackup(): void {
    void pickRosterBackup().then(async (outcome) => {
      if (outcome.kind === 'cancelled') return;
      if (outcome.kind === 'invalid') {
        showToast(ROSTER_MANAGER.backup.importFailed, 'error');
        return;
      }
      try {
        const merge = await importTemplates(outcome.rosters);
        showToast(
          ROSTER_MANAGER.backup.imported(merge.added, merge.updated, merge.unchanged),
          'success',
        );
      } catch {
        showToast(ROSTER.error.templateSaveFailed, 'error');
      }
    });
  }

  const editedPlayer = players.find((player) => player.id === editingPlayerId);

  if (draft !== null) {
    return (
      <div className="flex flex-col gap-[var(--sp-4)] p-[var(--sp-4)]">
        <h1 className="text-[var(--fs-h1)] font-semibold text-[var(--text)]">
          {draft.id === null ? ROSTER_MANAGER.createTitle : ROSTER_MANAGER.editTitle}
        </h1>

        <Card>
          <div className="flex flex-wrap gap-[var(--sp-4)]">
            <div className="flex min-w-[240px] flex-1 flex-col gap-[var(--sp-1)]">
              <Label htmlFor={nameFieldId}>
                {ROSTER_MANAGER.rosterName}
              </Label>
              <Input
                id={nameFieldId}
                value={draft.name}
                placeholder={ROSTER_MANAGER.rosterNamePlaceholder}
                onChange={(event) => {
                  patchDraft({ name: event.target.value });
                }}
              />
            </div>
            <div className="flex min-w-[240px] flex-1 flex-col gap-[var(--sp-1)]">
              <Label htmlFor={teamFieldId}>
                {ROSTER_MANAGER.teamName}
              </Label>
              <Input
                id={teamFieldId}
                value={draft.teamName}
                onChange={(event) => {
                  patchDraft({ teamName: event.target.value });
                }}
              />
            </div>
          </div>
        </Card>

        <Card title={ROSTER.players(players.length)}>
          {players.length === 0 ? (
            <p className="text-[var(--fs-body)] text-[var(--text-muted)]">
              {ROSTER.emptyState.body}
            </p>
          ) : (
            <RosterTable
              players={players}
              duplicateNumbers={duplicateNumbers}
              onToggleAvailable={(id, isAvailable) => {
                patchDraft({
                  players: players.map((player) =>
                    player.id === id ? { ...player, isAvailable } : player,
                  ),
                });
              }}
              onEdit={(id) => {
                setEditingPlayerId(id);
              }}
              onRemove={(id) => {
                patchDraft({ players: players.filter((player) => player.id !== id) });
                if (editingPlayerId === id) setEditingPlayerId(null);
              }}
            />
          )}
        </Card>

        <Card title={editedPlayer === undefined ? ROSTER.newPlayer : ROSTER.addPlayer}>
          <PlayerFormRow
            key={editingPlayerId ?? 'new'}
            {...(editedPlayer === undefined
              ? {}
              : {
                  initialValues: {
                    shirtNumber: editedPlayer.shirtNumber,
                    name: editedPlayer.name,
                    role: editedPlayer.role,
                    isLibero: editedPlayer.isLibero,
                  },
                  onCancel: () => {
                    setEditingPlayerId(null);
                  },
                })}
            onSave={savePlayer}
          />
        </Card>

        <div className="flex flex-wrap gap-[var(--sp-3)]">
          <Button
            variant="secondary"
            onClick={() => {
              setDraft(null);
              setEditingPlayerId(null);
            }}
          >
            {COMMON_BUTTONS.cancel}
          </Button>
          <Button variant="primary" onClick={saveDraft}>
            {ROSTER_MANAGER.save}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--sp-4)] p-[var(--sp-4)]">
      <header className="flex flex-col gap-[var(--sp-1)]">
        <h1 className="text-[var(--fs-h1)] font-semibold text-[var(--text)]">
          {ROSTER_MANAGER.title}
        </h1>
        <p className="text-[var(--fs-body)] text-[var(--text-muted)]">{ROSTER_MANAGER.subtitle}</p>
      </header>

      {isLoading ? (
        <LoadingState label={ROSTER.loadingTemplates} />
      ) : templates.length === 0 ? (
        <EmptyState
          title={ROSTER_MANAGER.emptyState.title}
          description={ROSTER_MANAGER.emptyState.body}
          action={
            <Button
              variant="primary"
              onClick={() => {
                setDraft(EMPTY_DRAFT);
              }}
            >
              {ROSTER_MANAGER.emptyState.button}
            </Button>
          }
        />
      ) : (
        <>
          <div>
            <Button
              variant="primary"
              onClick={() => {
                setDraft(EMPTY_DRAFT);
              }}
            >
              {ROSTER_MANAGER.newRoster}
            </Button>
          </div>
          <ul className="flex list-none flex-col gap-[var(--sp-3)] p-0">
            {templates.map((template) => (
              <li key={template.id}>
                <Card
                  title={template.name}
                  actions={
                    <div className="flex gap-[var(--sp-2)]">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setDraft(draftFrom(template));
                        }}
                      >
                        {ROSTER_MANAGER.edit}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => {
                          setDeleteTarget(template);
                        }}
                      >
                        {COMMON_BUTTONS.delete}
                      </Button>
                    </div>
                  }
                >
                  <p className="text-[var(--fs-body)] text-[var(--text-muted)]">
                    {template.teamName === '' ? '' : `${template.teamName} · `}
                    {ROSTER_MANAGER.playersCount(template.players.length)} ·{' '}
                    {ROSTER_MANAGER.updatedAt(formatItalianDate(template.updatedAt))}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Available even with no roster: restoring a backup is exactly the empty-list case. */}
      <Card title={ROSTER_MANAGER.backup.title}>
        <p className="mb-[var(--sp-3)] text-[var(--fs-body)] text-[var(--text-muted)]">
          {ROSTER_MANAGER.backup.hint}
        </p>
        <div className="flex flex-wrap gap-[var(--sp-3)]">
          <Button variant="secondary" disabled={templates.length === 0} onClick={exportAll}>
            {ROSTER_MANAGER.backup.export}
          </Button>
          <Button variant="secondary" disabled={isLoading} onClick={importBackup}>
            {ROSTER_MANAGER.backup.import}
          </Button>
        </div>
      </Card>

      <div>
        <Button
          variant="secondary"
          onClick={() => {
            void navigate(ROUTES.home);
          }}
        >
          {HOME.title}
        </Button>
      </div>

      <Dialog
        open={deleteTarget !== null}
        title={ROSTER_MANAGER.confirmDelete.title}
        description={
          deleteTarget === null ? undefined : ROSTER_MANAGER.confirmDelete.body(deleteTarget.name)
        }
        confirmLabel={ROSTER_MANAGER.confirmDelete.confirm}
        cancelLabel={COMMON_BUTTONS.cancel}
        destructive
        onCancel={() => {
          setDeleteTarget(null);
        }}
        onConfirm={() => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (target === null) return;
          void deleteTemplate(target.id).then(() => {
            showToast(ROSTER_MANAGER.deleted, 'success');
          });
        }}
      />
    </div>
  );
}
