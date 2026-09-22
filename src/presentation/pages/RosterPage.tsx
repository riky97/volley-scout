import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Player } from '@domain/index';
import {
  copyPlayersWithNewIds,
  createPlayer,
  duplicateShirtNumbers,
  hasDuplicateShirtNumbers,
} from '@domain/index';
import type { RosterTemplate } from '@domain/index';
import { useMatchStore } from '@application/stores/matchStore';
import { useArchiveStore } from '@application/stores/archiveStore';
import { newId } from '@application/clock';
import { COMMON_BUTTONS, DIALOGS, HOME, ROSTER, STEPS, TOASTS, VALIDATION } from '@shared/copy';
import { Button } from '@presentation/components/ui/Button';
import { Card } from '@presentation/components/ui/Card';
import { Dialog } from '@presentation/components/ui/Dialog';
import { EmptyState } from '@presentation/components/ui/EmptyState';
import { showToast } from '@presentation/components/ui/Toast';
import { StepIndicator } from '@presentation/components/roster/StepIndicator';
import { RosterTable } from '@presentation/components/roster/RosterTable';
import { PlayerFormRow } from '@presentation/components/roster/PlayerFormRow';
import type { PlayerFormValues } from '@presentation/components/roster/PlayerFormRow';
import { TemplateManager } from '@presentation/components/roster/TemplateManager';
import { ROUTES } from '@presentation/routes';

const MIN_AVAILABLE_PLAYERS = 6;

export function RosterPage(): React.JSX.Element {
  const navigate = useNavigate();
  const match = useMatchStore((state) => state.match);
  const updateRoster = useMatchStore((state) => state.updateRoster);

  const templates = useArchiveStore((state) => state.templates);
  const templatesLoading = useArchiveStore((state) => state.isLoading);
  const refreshArchive = useArchiveStore((state) => state.refresh);
  const saveTemplate = useArchiveStore((state) => state.saveTemplate);
  const updateTemplate = useArchiveStore((state) => state.updateTemplate);
  const deleteTemplate = useArchiveStore((state) => state.deleteTemplate);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [removalCandidate, setRemovalCandidate] = useState<{
    readonly player: Player;
    readonly actionCount: number;
  } | null>(null);

  useEffect(() => {
    void refreshArchive();
  }, [refreshArchive]);

  const roster = useMemo(() => match?.roster ?? [], [match]);

  const duplicateNumbers = useMemo(() => new Set(duplicateShirtNumbers(roster)), [roster]);
  const hasDuplicates = useMemo(() => hasDuplicateShirtNumbers(roster), [roster]);
  const availableCount = useMemo(
    () => roster.filter((player) => player.isAvailable).length,
    [roster],
  );
  const canProceed = availableCount >= MIN_AVAILABLE_PLAYERS && !hasDuplicates;

  const blockingReasons: string[] = [];
  if (availableCount < MIN_AVAILABLE_PLAYERS) blockingReasons.push(VALIDATION.rosterTooSmall);
  if (hasDuplicates) blockingReasons.push(VALIDATION.shirtDuplicate);

  const editingPlayer = editingId === null ? null : (roster.find((p) => p.id === editingId) ?? null);

  if (match === null) {
    return (
      <div className="p-[var(--sp-6)]">
        <EmptyState
          title={HOME.emptyState.title}
          description={HOME.emptyState.body}
          action={
            <Button
              variant="primary"
              onClick={() => {
                void navigate(ROUTES.newMatch);
              }}
            >
              {HOME.emptyState.button}
            </Button>
          }
        />
      </div>
    );
  }

  function persistRoster(next: readonly Player[]): void {
    updateRoster(next);
  }

  const ourTeamName = match.info.ourTeam.name;

  function handleSavePlayer(values: PlayerFormValues): void {
    const player = createPlayer({
      id: editingId ?? newId(),
      shirtNumber: values.shirtNumber,
      name: values.name,
      role: values.role,
      isLibero: values.isLibero,
    });
    if (editingId !== null) {
      persistRoster(roster.map((candidate) => (candidate.id === editingId ? player : candidate)));
      setEditingId(null);
    } else {
      persistRoster([...roster, player]);
      showToast(TOASTS.playerAdded);
    }
  }

  function handleToggleAvailable(id: string, isAvailable: boolean): void {
    persistRoster(roster.map((player) => (player.id === id ? { ...player, isAvailable } : player)));
  }

  function actionCountFor(playerId: string): number {
    return match === null
      ? 0
      : match.events.filter((event) => event.type === 'rally' && event.playerId === playerId)
          .length;
  }

  function handleRequestRemove(id: string): void {
    const player = roster.find((candidate) => candidate.id === id);
    if (player === undefined) return;
    const actionCount = actionCountFor(id);
    if (actionCount === 0) {
      persistRoster(roster.filter((candidate) => candidate.id !== id));
      if (editingId === id) setEditingId(null);
      return;
    }
    setRemovalCandidate({ player, actionCount });
  }

  function confirmRemove(): void {
    if (removalCandidate === null) return;
    persistRoster(roster.filter((candidate) => candidate.id !== removalCandidate.player.id));
    if (editingId === removalCandidate.player.id) setEditingId(null);
    setRemovalCandidate(null);
  }

  function handleLoadTemplate(template: RosterTemplate): void {
    persistRoster(copyPlayersWithNewIds(template.players, newId));
  }

  function handleSaveTemplate(name: string): string | null {
    const trimmed = name.trim();
    if (trimmed.length === 0) return VALIDATION.templateNameRequired;
    const isDuplicate = templates.some(
      (template) => template.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (isDuplicate) return VALIDATION.templateNameDuplicate;
    void saveTemplate(trimmed, ourTeamName, roster)
      .then(() => {
        showToast(TOASTS.templateSaved, 'success');
      })
      .catch(() => {
        showToast(ROSTER.error.templateSaveFailed, 'error');
      });
    return null;
  }

  function handleRenameTemplate(template: RosterTemplate, name: string): string | null {
    const trimmed = name.trim();
    if (trimmed.length === 0) return VALIDATION.templateNameRequired;
    const isDuplicate = templates.some(
      (candidate) =>
        candidate.id !== template.id && candidate.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (isDuplicate) return VALIDATION.templateNameDuplicate;
    void updateTemplate({ ...template, name: trimmed }, template.players).catch(() => {
      showToast(ROSTER.error.templateSaveFailed, 'error');
    });
    return null;
  }

  function handleDeleteTemplate(template: RosterTemplate): void {
    void deleteTemplate(template.id);
  }

  return (
    <div className="flex flex-col gap-[var(--sp-5)] p-[var(--sp-6)]">
      <header className="flex flex-col gap-[var(--sp-2)]">
        <div className="flex items-center justify-between">
          <h1 className="text-[var(--fs-h1)] font-semibold text-[var(--text)]">{ROSTER.title}</h1>
          <span className="text-[var(--fs-small)] text-[var(--text-muted)]">{STEPS.label(2)}</span>
        </div>
        <StepIndicator steps={STEPS.names} current={1} />
      </header>

      <Card title={ROSTER.template}>
        <TemplateManager
          templates={templates}
          isLoading={templatesLoading}
          onLoad={handleLoadTemplate}
          onSave={handleSaveTemplate}
          onRename={handleRenameTemplate}
          onDelete={handleDeleteTemplate}
        />
      </Card>

      <Card title={ROSTER.players(roster.length)}>
        {roster.length === 0 ? (
          <p className="text-[var(--fs-body)] text-[var(--text-muted)]">
            {ROSTER.emptyState.body}
          </p>
        ) : (
          <RosterTable
            players={roster}
            duplicateNumbers={duplicateNumbers}
            onToggleAvailable={handleToggleAvailable}
            onEdit={setEditingId}
            onRemove={handleRequestRemove}
          />
        )}
      </Card>

      <PlayerFormRow
        key={editingId ?? 'new'}
        {...(editingPlayer === null
          ? { onSave: handleSavePlayer }
          : {
              initialValues: {
                shirtNumber: editingPlayer.shirtNumber,
                name: editingPlayer.name,
                role: editingPlayer.role,
                isLibero: editingPlayer.isLibero,
              },
              onSave: handleSavePlayer,
              onCancel: () => {
                setEditingId(null);
              },
            })}
      />

      <footer className="flex flex-col gap-[var(--sp-2)] border-t border-[var(--border)] pt-[var(--sp-4)]">
        {blockingReasons.length > 0 && (
          <ul id="roster-next-reason" className="text-[var(--fs-small)] text-[var(--outcome-error)]">
            {blockingReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
        <div className="flex justify-between">
          <Button
            variant="secondary"
            onClick={() => {
              void navigate(ROUTES.newMatch);
            }}
          >
            {COMMON_BUTTONS.back}
          </Button>
          <Button
            variant="primary"
            disabled={!canProceed}
            aria-describedby={blockingReasons.length > 0 ? 'roster-next-reason' : undefined}
            onClick={() => {
              void navigate(ROUTES.lineup);
            }}
          >
            {COMMON_BUTTONS.next}
          </Button>
        </div>
      </footer>

      <Dialog
        open={removalCandidate !== null}
        title={DIALOGS.confirmDeletePlayer.title}
        description={
          removalCandidate !== null
            ? `${DIALOGS.confirmDeletePlayer.body(removalCandidate.player.shirtNumber, removalCandidate.player.name)} ${actionsWarning(removalCandidate.actionCount)}`
            : undefined
        }
        destructive
        confirmLabel={DIALOGS.confirmDeletePlayer.confirm}
        cancelLabel={DIALOGS.confirmDeletePlayer.cancel}
        onConfirm={confirmRemove}
        onCancel={() => {
          setRemovalCandidate(null);
        }}
      />
    </div>
  );
}

// Not present in docs/03-ux-flows.md §9: the sheet has no line for "N actions recorded", so
// this sentence is written in the same formal-neutral register as the rest of the dialogs.
function actionsWarning(count: number): string {
  return count === 1
    ? "È registrata 1 azione per questo giocatore in questa partita."
    : `Sono registrate ${String(count)} azioni per questo giocatore in questa partita.`;
}

