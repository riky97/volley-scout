import { applyUpdate } from '@infrastructure/pwa';
import { useMatchStore } from '@application/stores/matchStore';
import { APP_UPDATE } from '@shared/copy';
import { useAppUpdate } from '@presentation/hooks/useAppUpdate';
import { Button } from './ui/Button';

/**
 * Offers the new web build without forcing it. Reloading keeps every roster and match, since
 * they live in IndexedDB, but a reload in the middle of a write could lose that write, so the
 * button waits until the save indicator reads "Salvato".
 */
export function UpdateBanner(): React.JSX.Element | null {
  const isReady = useAppUpdate();
  const isSaving = useMatchStore(
    (state) => state.saveState === 'pending' || state.saveState === 'saving',
  );
  if (!isReady) return null;

  return (
    <div
      role="status"
      className="mb-[var(--sp-4)] flex flex-wrap items-center gap-[var(--sp-3)] rounded-[var(--radius-md)] border border-[var(--accent)] bg-[var(--surface-selected)] px-[var(--sp-4)] py-[var(--sp-3)] text-[var(--text)]"
    >
      <p className="flex flex-1 flex-col">
        <span className="font-semibold">{APP_UPDATE.available}</span>
        <span className="text-[var(--fs-small)] text-[var(--text-muted)]">
          {APP_UPDATE.dataKept}
        </span>
      </p>
      <Button variant="primary" disabled={isSaving} onClick={applyUpdate}>
        {APP_UPDATE.button}
      </Button>
    </div>
  );
}
