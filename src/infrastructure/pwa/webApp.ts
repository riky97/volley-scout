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

/** Registers the generated worker so the app opens without a connection. */
export function registerServiceWorker(): void {
  if (isTauri()) return;
  if (!('serviceWorker' in navigator)) return;
  // Only the built app ships a worker; in dev there is nothing to register.
  if (import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(new URL('sw.js', window.location.href).href, { scope: './' })
      .catch((error: unknown) => {
        console.error('Service worker registration failed', error);
      });
  });
}
