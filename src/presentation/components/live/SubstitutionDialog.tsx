import { useId, useState } from 'react';
import type { Id, Player, SetState } from '@domain/index';
import { Dialog } from '@presentation/components/ui/Dialog';
import { DIALOGS, LIVE } from '@shared/copy';
import { Label } from '@presentation/components/ui/Label';
import { Select } from '@presentation/components/ui/Select';

export interface SubstitutionDialogProps {
  readonly open: boolean;
  readonly set: SetState;
  readonly roster: readonly Player[];
  readonly onCancel: () => void;
  readonly onConfirm: (playerOutId: Id, playerInId: Id) => void;
}

export function SubstitutionDialog({
  open,
  set,
  roster,
  onCancel,
  onConfirm,
}: SubstitutionDialogProps): React.JSX.Element {
  const outFieldId = useId();
  const inFieldId = useId();
  const [outId, setOutId] = useState('');
  const [inId, setInId] = useState('');

  const onCourt = roster.filter((player) => set.lineup?.includes(player.id) === true);
  const bench = roster.filter(
    (player) => player.isAvailable && set.lineup?.includes(player.id) !== true,
  );

  const label = (player: Player): string => `${String(player.shirtNumber)} ${player.name}`;

  return (
    <Dialog
      open={open}
      title={DIALOGS.substitution.title}
      description={DIALOGS.substitution.body}
      confirmLabel={DIALOGS.substitution.confirm}
      cancelLabel={DIALOGS.substitution.cancel}
      onCancel={onCancel}
      {...(outId !== '' && inId !== ''
        ? {
            onConfirm: () => {
              onConfirm(outId, inId);
              setOutId('');
              setInId('');
            },
          }
        : {})}
    >
      <div className="grid grid-cols-2 gap-[var(--sp-4)]">
        <div className="flex flex-col gap-[var(--sp-2)]">
          <Label htmlFor={outFieldId}>{LIVE.substitutionOut}</Label>
          <Select
            id={outFieldId}
            className="w-full"
            value={outId}
            onChange={(event) => {
              setOutId(event.target.value);
            }}
          >
            <option value="">—</option>
            {onCourt.map((player) => (
              <option key={player.id} value={player.id}>
                {label(player)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-[var(--sp-2)]">
          <Label htmlFor={inFieldId}>{LIVE.substitutionIn}</Label>
          <Select
            id={inFieldId}
            className="w-full"
            value={inId}
            onChange={(event) => {
              setInId(event.target.value);
            }}
          >
            <option value="">—</option>
            {bench.map((player) => (
              <option key={player.id} value={player.id}>
                {label(player)}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </Dialog>
  );
}
