/** Everything the application needs from the local filesystem. Implemented in infrastructure. */
export interface StorageAdapter {
  /** File contents, or null when the file does not exist. */
  read(relativePath: string): Promise<string | null>;
  write(relativePath: string, contents: string): Promise<void>;
  remove(relativePath: string): Promise<void>;
  /** JSON file names inside a directory, without the directory prefix. */
  list(relativeDir: string): Promise<readonly string[]>;
  /** Moves a damaged file aside instead of deleting it. */
  quarantine(relativePath: string, suffix: string): Promise<void>;
  /** Human-readable location of the data folder, shown in the settings screen. */
  location(): Promise<string>;
}

/** Writes an exported report to a path the user picked. */
export interface ExportTarget {
  /** Returns the chosen absolute path, or null when the user cancelled. */
  pickSavePath(suggestedName: string, extension: string): Promise<string | null>;
  writeBinary(absolutePath: string, contents: Uint8Array): Promise<void>;
  writeText(absolutePath: string, contents: string): Promise<void>;
  /** Returns the picked file contents, or null when the user cancelled. */
  pickAndReadJson(): Promise<string | null>;
}
