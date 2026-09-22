import { useId, useState } from 'react';
import type { PlayerRole } from '@domain/index';
import { PLAYER_ROLES } from '@domain/index';
import { COMMON_BUTTONS, ROSTER, VALIDATION } from '@shared/copy';
import { PLAYER_ROLE_LABELS } from '@shared/copy/roles';
import { Button } from '@presentation/components/ui/Button';

export interface PlayerFormValues {
  readonly shirtNumber: number;
  readonly name: string;
  readonly role: PlayerRole;
  readonly isLibero: boolean;
}

export interface PlayerFormRowProps {
  readonly initialValues?: PlayerFormValues;
  readonly onSave: (values: PlayerFormValues) => void;
  readonly onCancel?: () => void;
}

const EMPTY_VALUES: PlayerFormValues = {
  shirtNumber: 0,
  name: '',
  role: 'unknown',
  isLibero: false,
};

/** Inline add/edit form for one player, matching docs/03-ux-flows.md §3.3 "Nuovo giocatore". */
export function PlayerFormRow({
  initialValues,
  onSave,
  onCancel,
}: PlayerFormRowProps): React.JSX.Element {
  const isEditing = initialValues !== undefined;
  const [shirtNumber, setShirtNumber] = useState<string>(
    initialValues !== undefined ? String(initialValues.shirtNumber) : '',
  );
  const [name, setName] = useState(initialValues?.name ?? EMPTY_VALUES.name);
  const [role, setRole] = useState<PlayerRole>(initialValues?.role ?? EMPTY_VALUES.role);
  const [isLibero, setIsLibero] = useState(initialValues?.isLibero ?? EMPTY_VALUES.isLibero);
  const [error, setError] = useState<string | null>(null);

  const numberId = useId();
  const nameId = useId();
  const roleId = useId();
  const liberoId = useId();
  const errorId = useId();

  function handleSubmit(): void {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setError(VALIDATION.playerNameRequired);
      return;
    }
    if (shirtNumber.trim().length === 0) {
      setError(VALIDATION.shirtRequired);
      return;
    }
    const parsedNumber = Number(shirtNumber);
    if (!Number.isInteger(parsedNumber) || parsedNumber < 0 || parsedNumber > 99) {
      setError(VALIDATION.shirtRange);
      return;
    }
    setError(null);
    onSave({ shirtNumber: parsedNumber, name: trimmedName, role, isLibero });
    if (!isEditing) {
      setShirtNumber('');
      setName('');
      setRole('unknown');
      setIsLibero(false);
    }
  }

  return (
    <div className="flex flex-col gap-[var(--sp-3)] rounded-[var(--radius-lg)] border border-[var(--border)] p-[var(--sp-4)]">
      <p className="text-[var(--fs-body)] font-semibold text-[var(--text)]">
        {isEditing ? COMMON_BUTTONS.edit : ROSTER.newPlayer}
      </p>
      <div className="flex flex-wrap items-end gap-[var(--sp-4)]">
        <div className="flex flex-col gap-[var(--sp-1)]">
          <label htmlFor={numberId} className="text-[var(--fs-small)] text-[var(--text-muted)]">
            {ROSTER.shirtNumber} *
          </label>
          <input
            id={numberId}
            type="number"
            min={0}
            max={99}
            value={shirtNumber}
            onChange={(event) => {
              setShirtNumber(event.target.value);
            }}
            className="min-h-[var(--hit-min)] w-20 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] px-[var(--sp-2)] text-[var(--text)]"
          />
        </div>
        <div className="flex flex-1 min-w-[200px] flex-col gap-[var(--sp-1)]">
          <label htmlFor={nameId} className="text-[var(--fs-small)] text-[var(--text-muted)]">
            {ROSTER.fullName} *
          </label>
          <input
            id={nameId}
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            className="min-h-[var(--hit-min)] rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] px-[var(--sp-3)] text-[var(--text)]"
          />
        </div>
        <div className="flex flex-col gap-[var(--sp-1)]">
          <label htmlFor={roleId} className="text-[var(--fs-small)] text-[var(--text-muted)]">
            {ROSTER.role} *
          </label>
          <select
            id={roleId}
            value={role}
            onChange={(event) => {
              setRole(event.target.value as PlayerRole);
            }}
            className="min-h-[var(--hit-min)] rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] px-[var(--sp-2)] text-[var(--text)]"
          >
            {PLAYER_ROLES.map((candidate) => (
              <option key={candidate} value={candidate}>
                {PLAYER_ROLE_LABELS[candidate]}
              </option>
            ))}
          </select>
        </div>
        <label
          htmlFor={liberoId}
          className="flex min-h-[var(--hit-min)] items-center gap-[var(--sp-2)] text-[var(--fs-body)] text-[var(--text)]"
        >
          <input
            id={liberoId}
            type="checkbox"
            checked={isLibero}
            onChange={(event) => {
              setIsLibero(event.target.checked);
            }}
          />
          {ROSTER.isLibero}
        </label>
      </div>
      {error !== null && (
        <p id={errorId} role="alert" className="text-[var(--fs-small)] text-[var(--outcome-error)]">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-[var(--sp-3)]">
        {onCancel !== undefined && (
          <Button variant="ghost" onClick={onCancel}>
            {COMMON_BUTTONS.cancel}
          </Button>
        )}
        <Button
          variant="primary"
          onClick={handleSubmit}
          aria-describedby={error !== null ? errorId : undefined}
        >
          {ROSTER.savePlayer}
        </Button>
      </div>
    </div>
  );
}
