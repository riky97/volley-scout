import { useState } from 'react';
import type { Id, Player, SetState } from '@domain/index';
import { Dialog } from '@presentation/components/ui/Dialog';
import { DIALOGS, LIVE } from '@shared/copy';
import styles from './SubstitutionDialog.module.scss';

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
  const [outId, setOutId] = useState<Id | ''>('');
  const [inId, setInId] = useState<Id | ''>('');

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
      <div className={styles.fields}>
        <label className={styles.field}>
          <span>{LIVE.substitutionOut}</span>
          <select
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
          </select>
        </label>
        <label className={styles.field}>
          <span>{LIVE.substitutionIn}</span>
          <select
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
          </select>
        </label>
      </div>
    </Dialog>
  );
}
