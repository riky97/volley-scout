import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useMatchStore } from '@application/stores/matchStore';
import { isTauri } from '@infrastructure/storage';

/**
 * Makes an accidental close safe rather than merely noisy: the pending write is flushed before
 * the window goes away. The browser tab case can only ask the OS-provided generic prompt, which
 * is why the desktop build intercepts `onCloseRequested` instead.
 */
export function useCloseGuard(): void {
  useEffect(() => {
    if (!isTauri()) {
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
      .onCloseRequested(async (event) => {
        if (!useMatchStore.getState().hasUnsavedChanges()) return;
        // Hold the close just long enough to finish the pending write, then let it proceed.
        event.preventDefault();
        await useMatchStore.getState().flushPendingSave();
        await getCurrentWindow().destroy();
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
}
