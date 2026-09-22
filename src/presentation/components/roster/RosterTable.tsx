import type { Player } from '@domain/index';
import clsx from 'clsx';
import { COMMON_BUTTONS, ROSTER, VALIDATION } from '@shared/copy';
import { PLAYER_ROLE_LABELS } from '@shared/copy/roles';

export interface RosterTableProps {
  readonly players: readonly Player[];
  readonly duplicateNumbers: ReadonlySet<number>;
  readonly onToggleAvailable: (id: string, isAvailable: boolean) => void;
  readonly onEdit: (id: string) => void;
  readonly onRemove: (id: string) => void;
}

/** Editable roster table: N., Nome, Ruolo, Libero, Disponibile, azioni. */
export function RosterTable({
  players,
  duplicateNumbers,
  onToggleAvailable,
  onEdit,
  onRemove,
}: RosterTableProps): React.JSX.Element {
  return (
    <table className="w-full border-collapse text-left text-[var(--fs-body)]">
      <thead>
        <tr className="bg-[var(--surface-2)] text-[var(--fs-small)] text-[var(--text-muted)]">
          <th scope="col" className="px-[var(--sp-3)] py-[var(--sp-2)]">
            {ROSTER.columns.number}
          </th>
          <th scope="col" className="px-[var(--sp-3)] py-[var(--sp-2)]">
            {ROSTER.columns.name}
          </th>
          <th scope="col" className="px-[var(--sp-3)] py-[var(--sp-2)]">
            {ROSTER.columns.role}
          </th>
          <th scope="col" className="px-[var(--sp-3)] py-[var(--sp-2)]">
            {ROSTER.columns.libero}
          </th>
          <th scope="col" className="px-[var(--sp-3)] py-[var(--sp-2)]">
            {ROSTER.columns.available}
          </th>
          <th scope="col" className="px-[var(--sp-3)] py-[var(--sp-2)]">
            <span className="sr-only">Azioni</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {players.map((player) => {
          const isDuplicate = duplicateNumbers.has(player.shirtNumber);
          const errorId = `shirt-error-${player.id}`;
          return (
            <tr
              key={player.id}
              className="border-b border-[var(--border)] last:border-b-0"
            >
              <td className="px-[var(--sp-3)] py-[var(--sp-2)] align-top">
                <span
                  className={clsx(
                    'tabular-nums font-semibold',
                    isDuplicate && 'text-[var(--outcome-error)]',
                  )}
                  aria-describedby={isDuplicate ? errorId : undefined}
                >
                  {player.shirtNumber}
                </span>
                {isDuplicate && (
                  <p id={errorId} role="alert" className="mt-[var(--sp-1)] text-[var(--fs-small)] text-[var(--outcome-error)]">
                    {VALIDATION.shirtDuplicate}
                  </p>
                )}
              </td>
              <td className="px-[var(--sp-3)] py-[var(--sp-2)]">{player.name}</td>
              <td className="px-[var(--sp-3)] py-[var(--sp-2)]">
                {PLAYER_ROLE_LABELS[player.role]}
              </td>
              <td className="px-[var(--sp-3)] py-[var(--sp-2)]">
                {player.isLibero ? ROSTER.isLibero : ''}
              </td>
              <td className="px-[var(--sp-3)] py-[var(--sp-2)]">
                <label className="inline-flex min-h-[var(--hit-min)] items-center gap-[var(--sp-2)]">
                  <input
                    type="checkbox"
                    checked={player.isAvailable}
                    onChange={(event) => {
                      onToggleAvailable(player.id, event.target.checked);
                    }}
                  />
                  <span className="sr-only">
                    {ROSTER.isAvailable} — {player.name}
                  </span>
                </label>
              </td>
              <td className="px-[var(--sp-3)] py-[var(--sp-2)]">
                <div className="flex gap-[var(--sp-2)]">
                  <button
                    type="button"
                    className="min-h-[var(--hit-min)] min-w-[var(--hit-min)] rounded-[var(--radius-md)] border border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
                    onClick={() => {
                      onEdit(player.id);
                    }}
                    aria-label={`${COMMON_BUTTONS.edit} — ${player.name}`}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="min-h-[var(--hit-min)] min-w-[var(--hit-min)] rounded-[var(--radius-md)] border border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
                    onClick={() => {
                      onRemove(player.id);
                    }}
                    aria-label={`${COMMON_BUTTONS.delete} — ${player.name}`}
                  >
                    🗑
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
