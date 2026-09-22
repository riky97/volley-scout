# Persistence, autosave and recovery

Goal: an accidental close, a crash or a flat battery must not cost the operator the actions already
recorded. Showing a warning dialog is not the goal — making the loss improbable is.

## Where data lives

| Document | Path (relative to the app data folder) | Root type |
|---|---|---|
| Match | `data/matches/<id>.json` | `Match` |
| Roster template | `data/templates/<id>.json` | `RosterTemplate` |
| Preferences | `data/settings.json` | `AppSettings` |
| Quarantined file | `data/<dir>/<id>.corrupt-<timestamp>.json` | raw, untouched |

The app data folder is the OS-provided one (`%APPDATA%\it.volleyscout.app` on Windows). The exact
path is shown in the settings screen. Nothing is written anywhere else except the export file the
user explicitly picks in the save dialog.

## Adapters

`StorageAdapter` (declared in `src/application/ports/storage.ts`) has five operations: `read`,
`write`, `remove`, `list`, `quarantine`, plus `location`.

- **Tauri adapter** (desktop, the real one): calls the Rust commands in `src-tauri/src/storage.rs`.
  Every relative path is validated (`segment` or `segment/segment`, ASCII alphanumerics plus
  `-`, `_`, `.`), so a crafted id cannot escape the data folder. Writes go to a temporary file which
  is then `rename`d over the target — a torn write can never leave a half-written match behind.
- **IndexedDB adapter** (browser dev, tests): same interface, used by `npm run dev`.
- **In-memory adapter**: used by unit tests.

`localStorage` is not used for match data at all.

## When we write

| Trigger | Policy |
|---|---|
| Rally, opponent point, our point, timeout, substitution, set start, set end, undo, delete, edit | **Immediate flush** |
| Match info, settings and roster edits, notes | **400 ms debounce** |
| Window close requested | flush, then let the window go |

Writes are serialised and coalesced by `SaveQueue`: two saves never interleave, and a burst of edits
collapses into a single write of the newest state. The header shows `Salvato` / `Salvataggio…` /
`Salvataggio non riuscito` so the operator always knows where they stand.

## Validation, versioning and corrupt data

Every persisted root carries `schemaVersion: 1`. On load the JSON is parsed, then validated with the
Zod schemas in `src/infrastructure/storage/schemas.ts`.

- Invalid JSON or a schema mismatch → the file is **quarantined**, never deleted: it is renamed to
  `<id>.corrupt-<timestamp>.json` and the operator sees the recovery dialog. The app keeps working.
- Settings are never blocking: a corrupt settings file falls back to the defaults.
- A future `schemaVersion` will be handled by a migration registry; version 1 is the first, so there
  is nothing to migrate yet. The check exists so an older build refuses to silently mangle newer data.

The event log is the authority: `foldEvents` recomputes score, serving team and rotation for every
event on load. If a stored value disagrees with the fold, the fold wins and the operator is told the
score was recalculated.

## Startup

1. Load the preferences and apply the theme before the first paint.
2. Look for the most recent match whose status is `live` or `setup`.
3. If one exists, Home shows **Riprendi partita** with team names, date, set and score.
4. Starting a new match never overwrites it: a new match is a new document, and the unfinished one
   stays in the archive. The confirmation dialog says exactly that.

## Shutdown

In the desktop build `useCloseGuard` intercepts Tauri's `onCloseRequested` and always asks for
confirmation first. On confirm it flushes any pending write, then destroys the window; on cancel
nothing happens. The dialog says explicitly when a save is still in flight. Because every rally-terminating event
is already flushed synchronously, that window is at most one debounced low-risk edit wide.

**Documented OS limits.** A `beforeunload`-style prompt is the only tool the browser build has, and
browsers deliberately ignore custom text in it. Neither platform can intercept a power cut, a forced
kill (`taskkill /f`, Task Manager "End task"), or an OS shutdown that does not deliver a close event.
This is precisely why the design does not rely on the close handler: durability comes from flushing
after every scored rally, from atomic renames, and from the append-only log — not from the dialog.
