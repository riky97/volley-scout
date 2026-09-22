import type { ExportTarget, StorageAdapter } from '@application/ports/storage';
import { browserExportTarget, indexedDbStorage } from './indexedDbStorage';
import { isTauri, tauriExportTarget, tauriStorage } from './tauriStorage';
import { LocalRepository } from './repository';

export { LocalRepository } from './repository';
export type { ArchiveEntry, LoadOutcome } from './repository';
export { isTauri } from './tauriStorage';

/** In-memory adapter, used by tests and as a last-resort fallback. */
export function createMemoryStorage(): StorageAdapter {
  const files = new Map<string, string>();
  return {
    read: (path) => Promise.resolve(files.get(path) ?? null),
    write: (path, contents) => {
      files.set(path, contents);
      return Promise.resolve();
    },
    remove: (path) => {
      files.delete(path);
      return Promise.resolve();
    },
    list: (dir) => {
      const prefix = `${dir}/`;
      return Promise.resolve(
        [...files.keys()]
          .filter((key) => key.startsWith(prefix) && key.endsWith('.json'))
          .filter((key) => !key.includes('.corrupt-'))
          .map((key) => key.slice(prefix.length))
          .sort(),
      );
    },
    quarantine: (path, suffix) => {
      const contents = files.get(path);
      if (contents !== undefined) {
        files.set(`${path}.corrupt-${suffix}.json`, contents);
        files.delete(path);
      }
      return Promise.resolve();
    },
    location: () => Promise.resolve('memoria'),
  };
}

export function createStorageAdapter(): StorageAdapter {
  if (isTauri()) return tauriStorage;
  if (typeof indexedDB !== 'undefined') return indexedDbStorage;
  return createMemoryStorage();
}

export function createExportTarget(): ExportTarget {
  return isTauri() ? tauriExportTarget : browserExportTarget;
}

export function createRepository(): LocalRepository {
  return new LocalRepository(createStorageAdapter());
}
