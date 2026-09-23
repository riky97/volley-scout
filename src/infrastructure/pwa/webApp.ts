import { isTauri } from '@infrastructure/storage';

/**
 * Browser-only setup for the web fallback used on tablets. The desktop build owns real files
 * and a real window, so none of this runs there.
 */

/**
 * Asks the browser to keep our IndexedDB data out of the automatic eviction pool.
 * Granting is entirely the browser's call, so the result is reported, never assumed.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (isTauri()) return false;
  // Reading through the property is not enough: some browsers expose it as undefined.
  const storage: StorageManager | undefined = navigator.storage;
  if (typeof storage?.persist !== 'function') return false;
  try {
    if (await storage.persisted()) return true;
    return await storage.persist();
  } catch {
    // A refusal is not an error worth surfacing: the app works either way.
    return false;
  }
}

// A new build that finished installing and waits for the operator's go-ahead.
let waitingWorker: ServiceWorker | null = null;
const updateListeners = new Set<() => void>();

function setWaitingWorker(worker: ServiceWorker): void {
  waitingWorker = worker;
  for (const listener of updateListeners) listener();
}

/** True once a newer build is installed and can replace the running one. */
export function isUpdateReady(): boolean {
  return waitingWorker !== null;
}

/** Notifies `listener` when an update becomes ready. Returns the unsubscribe function. */
export function subscribeToUpdate(listener: () => void): () => void {
  updateListeners.add(listener);
  return () => {
    updateListeners.delete(listener);
  };
}

/**
 * Swaps in the waiting build and reloads. Only ever called from the operator's tap: the worker
 * never activates on its own, so assets cannot change under a match in progress.
 */
export function applyUpdate(): void {
  const worker = waitingWorker;
  if (worker === null) return;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
  worker.postMessage('SKIP_WAITING');
}

/** Exported for tests. Tracks the updates of an existing registration. */
export function watchForUpdates(registration: ServiceWorkerRegistration): void {
  // Without a controlling worker this page is a first install, not an update.
  const isUpdate = (): boolean => navigator.serviceWorker.controller !== null;

  if (registration.waiting !== null && isUpdate()) setWaitingWorker(registration.waiting);

  registration.addEventListener('updatefound', () => {
    const installing = registration.installing;
    if (installing === null) return;
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed' && isUpdate()) setWaitingWorker(installing);
    });
  });

  // iOS resumes a home-screen app without reloading it, so the browser would never look for a
  // new build on its own. Offline the check fails, which is expected and harmless.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    registration.update().catch(() => undefined);
  });
}

/** Registers the generated worker so the app opens without a connection. */
export function registerServiceWorker(): void {
  if (isTauri()) return;
  if (!('serviceWorker' in navigator)) return;
  // Only the built app ships a worker; in dev there is nothing to register.
  if (import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(new URL('sw.js', window.location.href).href, { scope: './' })
      .then(watchForUpdates)
      .catch((error: unknown) => {
        console.error('Service worker registration failed', error);
      });
  });
}
