import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import type { ExportTarget, StorageAdapter } from '@application/ports/storage';

/** True when the app runs inside the Tauri shell rather than a plain browser. */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Storage backed by the Rust commands in src-tauri/src/storage.rs (atomic writes, path checks). */
export const tauriStorage: StorageAdapter = {
  async read(relativePath) {
    return await invoke<string | null>('read_data_file', { relativePath });
  },
  async write(relativePath, contents) {
    await invoke('write_data_file', { relativePath, contents });
  },
  async remove(relativePath) {
    await invoke('delete_data_file', { relativePath });
  },
  async list(relativeDir) {
    return await invoke<string[]>('list_data_files', { relativeDir });
  },
  async quarantine(relativePath, suffix) {
    await invoke('quarantine_data_file', { relativePath, suffix });
  },
  async location() {
    return await invoke<string>('data_directory');
  },
};

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export const tauriExportTarget: ExportTarget = {
  async pickSavePath(suggestedName, extension) {
    const path = await save({
      defaultPath: `${suggestedName}.${extension}`,
      filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
    });
    return path ?? null;
  },
  async writeBinary(absolutePath, contents) {
    await invoke('write_export_file', {
      absolutePath,
      contentsBase64: toBase64(contents),
    });
  },
  async writeText(absolutePath, contents) {
    await invoke('write_export_file', {
      absolutePath,
      contentsBase64: toBase64(new TextEncoder().encode(contents)),
    });
  },
  async pickAndReadJson() {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (selected === null || Array.isArray(selected)) return null;
    // The picked file lives outside the app data folder, so it is read through the same
    // validated command path as an export is written.
    return await invoke<string>('read_picked_file', { absolutePath: selected });
  },
};
