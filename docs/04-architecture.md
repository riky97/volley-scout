# Volley Scout — Architecture & engineering contract

Binding reference for anyone writing code in this repository. Pair it with `CLAUDE.md`
(conventions), `docs/01-domain-model.md` (rules) and `docs/03-ux-flows.md` (screens and copy).

## Layers

```
presentation  →  application  →  domain
                      ↓
                infrastructure (adapters behind ports declared in application/ports)
shared        ←  imported by everyone, imports nobody
```

`domain` is pure: no React, no IO, no `Date.now()`, no Italian strings.
Aliases: `@domain/*`, `@application/*`, `@infrastructure/*`, `@presentation/*`, `@shared/*`, `@test/*`.

## Application API the UI uses

### `useMatchStore` (`@application/stores/matchStore`)

State: `match`, `snapshot`, `saveState` (`idle | pending | saving | error`), `lastErrorCode`,
`redoBuffer`, `isLoading`.

Actions (all synchronous unless noted; each one persists automatically):
`setMatch`, `loadMatch(id)` (async, returns a `LoadOutcome`), `resumeLastMatch()` (async, returns
`boolean`), `clearMatch`, `clearError`, `updateInfo`, `updateSettings`, `updateRoster`,
`startSet(lineup, servingTeam?)`, `recordRally({ playerId, skill, outcome, comment? })`,
`recordOpponentPoint()`, `recordTimeout(team)`, `recordSubstitution(outId, inId)`, `addNote(text)`,
`endCurrentSet()`, `finishMatch()`, `abandonCurrentMatch()`, `reopenCurrentMatch()`, `undo()`,
`redo()`, `deleteEvent(id)`, `editEvent(id, patch)`, `removeSet(index)`,
`flushPendingSave()` (async), `hasUnsavedChanges()`.

A rejected action never throws into the UI: it sets `lastErrorCode` to a `DomainErrorCode`, which
`messageForError` / `DOMAIN_ERROR_MESSAGES` in `@shared/copy` turn into Italian.

`snapshot` (`MatchSnapshot`) is the only source of derived state: `currentSet`, `score`, `setsWon`,
`servingTeam`, `currentServerId`, `court` (`{ position, playerId }[]`), `setHistory`, `lastEvent`,
`canUndo`, `matchWinner`, `pendingSetWinner`, `setPointFor`, `warnings`.

### `useSettingsStore` — `settings`, `isLoaded`, `dataLocation`, `load()`, `update(patch)`, `reset()`
### `useArchiveStore` — `matches`, `templates`, `isLoading`, `refresh()`, `deleteMatch(id)`, `saveTemplate(name, teamName, players)`, `updateTemplate(template, players)`, `deleteTemplate(id)`

### Helpers
- `@application/clock`: `newId()`, `nowIso()`, `todayIsoDate()` — the only places allowed to read the
  clock or generate ids.
- `@domain/index` re-exports every entity, rule and statistics function.
- `computeMatchStatistics(match)` returns `{ team, players, perSetTeam, perSetPlayers }`.

## Presentation contract

- Routes live in `@presentation/routes` (`ROUTES`). Routing is `HashRouter`.
- Shared primitives in `@presentation/components/ui`: `Button` (`variant`, `size`, `fullWidth`,
  `ref`), `Card`, `Dialog` (Radix: focus-trapped, page behind inert, Escape cancels, backdrop
  never closes), `Toaster` + `showToast(message, tone)`, `EmptyState`, `LoadingState`.
- shadcn/ui primitives live in `@presentation/components/ui/primitives` (lowercase files, as the
  CLI writes them). Pages never import them directly: they go through the wrappers above.
- `AppShell` renders the header, navigation and the save-state indicator.
- Styling: Tailwind utilities for layout/spacing/responsive/simple states; SCSS Modules
  (`Component.module.scss`, `@use '../styles/tokens' as t`) for complex internals and animation.
  Colours are always `var(--token)`; never a literal hex outside `styles/global.scss`.
- Italian copy comes from `@shared/copy`. Components never invent user-visible strings.

## Storage and export ports

`@application/ports/storage` declares `StorageAdapter` and `ExportTarget`.
`@infrastructure/storage` provides `createRepository()`, `createExportTarget()`, `isTauri()` and an
in-memory adapter for tests. In the desktop build every file operation goes through the Rust
commands in `src-tauri/src/storage.rs`, which validate paths and write atomically.

## Decisions worth remembering

1. **The event log is authoritative.** `foldEvents` recomputes score, serving team and rotation for
   every event on every change, so a hand-edited or partially written log can never desynchronise
   the scoreboard. Mutators append and refold; they never patch state incrementally.
2. **Set end is confirmed, never automatic.** The domain only detects it (`evaluateSetEnd`), which
   is what makes undo across a set boundary safe.
3. **Rotation is an offset, not a shuffled array.** The lineup array keeps the initial P1..P6 order
   forever; substitutions overwrite one slot in place, so the offset stays valid.
4. **Terminality is outcome-driven**, identical for every skill: `point` to us, `error` to them.
5. **Tauri capabilities stay minimal** — `core:default`, `core:window:allow-destroy`,
   `dialog:allow-save`, `dialog:allow-open`. `core:default` grants only read-only window
   queries, so closing the window from the quit confirmation needs `allow-destroy` explicitly.
   No `fs` plugin: custom commands keep the reachable surface to the app-data folder plus the one
   path the user picked in a dialog.
6. **Hash routing** because the desktop build serves static files with no history fallback.
7. **Tailwind is imported from a plain `.css` file**, not from SCSS: a Sass `@import` would inline
   the framework before the Tailwind plugin could process it.
8. **shadcn/ui for behaviour, not for looks.** Components are added only where Radix brings
   behaviour that is hard to get right by hand (dialogs today; form controls next). Each primitive
   is restyled with our tokens so the app looks the same; shadcn's colour names are mapped onto
   them once, in `@theme inline` in `tailwind.css`. The live screen (court, action pad, libero row)
   stays hand-built with SCSS: it is tuned for touch and gains nothing. Native `<select>` stays
   native, because on iPad the system picker beats any custom menu for a finger.
   When adding a component with `npx shadcn add`, fix the generated `cn` import to
   `@presentation/lib/cn`: the CLI resolves the `utils` alias to a bare `cn` package and would
   install it from npm. Drop `lucide-react` icons we do not ship.
9. **The toaster is portalled to `<body>`.** A Radix modal hides everything outside itself from
   assistive technology, except elements that contain a live region. With the toaster inside
   `#root`, the whole app stayed exposed behind every dialog.
10. **Live shortcuts ignore keys typed inside a dialog.** Focus is trapped in the dialog, so its
    keys (Space on a button, Escape) belong to it, never to a point recorded behind it.

## Accepted trade-offs

Findings from the final review that were considered and deliberately not changed:

1. **Two court components.** `components/live/CourtGrid` and `components/roster/CourtLayout` both
   draw a six-slot court, but they are different interactions: the live one selects a player who is
   already on court, the lineup one assigns a player to an empty slot and must render an empty
   state. Merging them would need slot-content render props and two accessibility modes behind one
   API — more moving parts than the duplication costs. Revisit if a third court view appears.
2. **The event log is folded twice per action** — once in `rebuildMatch`, once in `buildSnapshot`
   (which needs the fold's warnings). The fold is pure and a full match is a few hundred events, so
   the second pass is sub-millisecond. Threading the `FoldResult` through would couple the two
   functions for no measurable gain.
3. **Below 1280px the action bar is placed above the event log by grid areas, not by DOM order.**
   The DOM keeps the log before the bar, which is the reading order the desktop layout shows, so on
   a tablet the visual order and the focus order differ for those two panels. Reordering the JSX
   would move the mismatch onto the desktop layout, where the keyboard is actually used and the
   documented shortcuts live. Tablets are the touch fallback, so the mismatch was left where it
   costs least. Revisit if the tablet build ever gains keyboard support.
4. **The tablet layout still scrolls by a fixed amount** on a 820px-tall viewport: the scoreboard,
   court and pad together leave the action bar at the fold. What was fixed is the growth — the log
   is capped at 38vh and scrolls inside itself, so the distance to the bar no longer increases with
   every recorded action. Closing the remaining gap means shrinking the scoreboard or the pad, which
   belongs with the touch-target work, not here.
