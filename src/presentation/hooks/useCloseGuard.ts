import { useCallback, useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useMatchStore } from '@application/stores/matchStore';
import { isTauri } from '@infrastructure/storage';

export interface CloseGuard {
  /** True while the confirmation dialog is showing. */
  readonly isConfirming: boolean;
  /** True when a save is still in flight, so the dialog can say so. */
  readonly hasUnsavedChanges: boolean;
  readonly confirmClose: () => void;
  readonly cancelClose: () => void;
}

/**
 * Turns the window close button into a deliberate action: the request is intercepted, the
 * operator confirms, and only then is the pending write flushed and the window destroyed.
 * Closing during a match is otherwise one stray click away.
 */
export function useCloseGuard(): CloseGuard {
  const [isConfirming, setIsConfirming] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (!isTauri()) {
      // A browser tab cannot host our own dialog: the OS-provided prompt is all there is.
      const onBeforeUnload = (event: BeforeUnloadEvent): void => {
        if (!useMatchStore.getState().hasUnsavedChanges()) return;
        event.preventDefault();
      };
      window.addEventListener('beforeunload', onBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', onBeforeUnload);
      };
    }

    let unlisten: (() => void) | null = null;
    let disposed = false;

    void getCurrentWindow()
      .onCloseRequested((event) => {
        event.preventDefault();
        setHasUnsavedChanges(useMatchStore.getState().hasUnsavedChanges());
        setIsConfirming(true);
      })
      .then((stop) => {
        if (disposed) stop();
        else unlisten = stop;
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const confirmClose = useCallback(() => {
    setIsConfirming(false);
    void (async () => {
      // Never close on top of a write still on its way to disk.
      await useMatchStore.getState().flushPendingSave();
      await getCurrentWindow().destroy();
    })();
  }, []);

  const cancelClose = useCallback(() => {
    setIsConfirming(false);
  }, []);

  return { isConfirming, hasUnsavedChanges, confirmClose, cancelClose };
}
