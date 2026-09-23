import { useId, useState } from 'react';
import type { PlayerRole } from '@domain/index';
import { PLAYER_ROLES } from '@domain/index';
import { COMMON_BUTTONS, ROSTER, VALIDATION } from '@shared/copy';
import { PLAYER_ROLE_LABELS } from '@shared/copy/roles';
import { Button } from '@presentation/components/ui/Button';
import { Checkbox } from '@presentation/components/ui/Checkbox';
import { Input } from '@presentation/components/ui/Input';
import { Label } from '@presentation/components/ui/Label';
import { Select } from '@presentation/components/ui/Select';

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
          <Label htmlFor={numberId} required>
            {ROSTER.shirtNumber}
          </Label>
          <Input
            id={numberId}
            type="number"
            min={0}
            max={99}
            value={shirtNumber}
            onChange={(event) => {
              setShirtNumber(event.target.value);
            }}
            className="w-20 px-[var(--sp-2)]"
          />
        </div>
        <div className="flex flex-1 min-w-[200px] flex-col gap-[var(--sp-1)]">
          <Label htmlFor={nameId} required>
            {ROSTER.fullName}
          </Label>
          <Input
            id={nameId}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
        </div>
        <div className="flex flex-col gap-[var(--sp-1)]">
          <Label htmlFor={roleId} required>
            {ROSTER.role}
          </Label>
          <Select
            id={roleId}
            value={role}
            onChange={(event) => {
              setRole(event.target.value as PlayerRole);
            }}
          >
            {PLAYER_ROLES.map((candidate) => (
              <option key={candidate} value={candidate}>
                {PLAYER_ROLE_LABELS[candidate]}
              </option>
            ))}
          </Select>
        </div>
        <Checkbox
          checked={isLibero}
          onChange={(event) => {
            setIsLibero(event.target.checked);
          }}
        >
          {ROSTER.isLibero}
        </Checkbox>
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
