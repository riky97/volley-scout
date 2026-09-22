import type { ExportTarget, StorageAdapter } from '@application/ports/storage';

/**
 * Browser fallback used by `npm run dev` and by tests. The desktop build always uses the Tauri
 * adapter; this one keeps the app fully usable (and debuggable) outside the shell.
 */

const DATABASE_NAME = 'volley-scout';
const STORE_NAME = 'files';
const DATABASE_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB unavailable'));
    };
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = run(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB request failed'));
      };
    });
  } finally {
    database.close();
  }
}

export const indexedDbStorage: StorageAdapter = {
  async read(relativePath) {
    const value = await withStore<unknown>('readonly', (store) => store.get(relativePath));
    return typeof value === 'string' ? value : null;
  },
  async write(relativePath, contents) {
    await withStore('readwrite', (store) => store.put(contents, relativePath));
  },
  async remove(relativePath) {
    await withStore('readwrite', (store) => store.delete(relativePath));
  },
  async list(relativeDir) {
    const keys = await withStore<IDBValidKey[]>('readonly', (store) => store.getAllKeys());
    const prefix = `${relativeDir}/`;
    return keys
      .filter((key): key is string => typeof key === 'string')
      .filter((key) => key.startsWith(prefix) && key.endsWith('.json'))
      .filter((key) => !key.includes('.corrupt-'))
      .map((key) => key.slice(prefix.length))
      .sort();
  },
  async quarantine(relativePath, suffix) {
    const contents = await this.read(relativePath);
    if (contents === null) return;
    await this.write(`${relativePath}.corrupt-${suffix}.json`, contents);
    await this.remove(relativePath);
  },
  location() {
    return Promise.resolve(`IndexedDB: ${DATABASE_NAME}`);
  },
};

function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** In the browser there is no save dialog: the file is downloaded with its suggested name. */
export const browserExportTarget: ExportTarget = {
  pickSavePath(suggestedName, extension) {
    return Promise.resolve(`${suggestedName}.${extension}`);
  },
  writeBinary(absolutePath, contents) {
    downloadBlob(absolutePath, new Blob([new Uint8Array(contents)]));
    return Promise.resolve();
  },
  writeText(absolutePath, contents) {
    downloadBlob(absolutePath, new Blob([contents], { type: 'application/json' }));
    return Promise.resolve();
  },
  pickAndReadJson() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.onchange = () => {
        const file = input.files?.[0];
        if (file === undefined) {
          resolve(null);
          return;
        }
        void file.text().then(resolve);
      };
      input.click();
    });
  },
};
