# Volley Scout — Product & Delivery Plan

> Baseline produced in Phase 1. All code/identifiers in English; all end-user copy in Italian.

## 1. Product understanding

An **offline-first desktop app** (Tauri 2 + React + TypeScript) used by a single volleyball team
to scout its own matches. One non-technical operator runs it courtside on a laptop, during play.

Core value: record an action in **2–3 clicks**, keep score/rotation consistent automatically,
never lose data, and produce a printable report at the end.

Explicit non-goals: auth, accounts, cloud, sync, telemetry, payments, AI, i18n framework,
predictive analytics, multi-device collaboration.

## 2. Assumptions (declared, not asked)

| # | Assumption | Rationale |
|---|---|---|
| A1 | Detailed scouting applies to **our team only**. The opponent is tracked at rally level (point won / our error), not per player. | Keeps the courtside flow to a few clicks; opponent rosters are rarely known. |
| A2 | Every rally ends with exactly **one terminal event** that assigns the point. Non-terminal touches (reception, dig, set) are optional quality events attached to the same rally. | Guarantees score and event log can never diverge. |
| A3 | Rotation is derived, not typed: the receiving team that wins a rally rotates clockwise by one. | Standard rule, fully computable. |
| A4 | Libero replacements are **not** modelled as substitutions in the MVP; the libero is flagged on the roster and can be selected as the acting player. | Avoids a whole rule subsystem for little scouting value. |
| A5 | Substitutions and timeouts are tracked as counters/events without hard-enforcing the 6-sub / 2-timeout limits (soft warning only). | Referees enforce limits; blocking the operator mid-match is worse than a warning. |
| A6 | Set/match formats configurable: best-of-3 or best-of-5, points-to-win per set, separate tie-break target, always win-by-2, no cap. | Covers federal, provincial and youth formats. |
| A7 | Single local user, single machine. Data lives in the Tauri app-data directory. | Internal use. |
| A8 | Product name kept as **Volley Scout** (folder `volley-scout`, display name "Volley Scout", bundle id `it.volleyscout.app`). | Short, descriptive, English code-side, understandable in Italian. |
| A9 | Simplified 4+1 rating scale (see §6), not the professional 6-symbol scale. | Requirement: avoid over-professional taxonomies. |

## 3. MVP vs later

**MVP (this delivery)** — match setup, roster, starting lineup, live scouting, score/serve/rotation
automation, undo + event edit/delete, live stats, end match, report, XLSX/PDF/JSON export,
autosave + crash recovery, archive, settings, light/dark theme, tests, desktop build.

**Post-MVP (documented, not built)** — opponent per-player scouting, libero replacement tracking,
substitution-limit enforcement, court-zone capture, multi-season aggregated stats, charts inside the
PDF, video timestamps, a UI editor for keyboard shortcuts (MVP ships fixed, documented shortcuts).

## 4. Main user flow

```
Home ──┬─► [Riprendi partita]   (only when an unfinished match exists) ──────────┐
       ├─► Nuova partita → Setup → Roster → Sestetto ───────────────────────────┤
       ├─► Archivio partite ─► Riepilogo (read-only) ─► Export                   │
       └─► Impostazioni                                                          │
                                                                                 ▼
                                                                           Scout live
                                            (score • rotation • action pad • event log • undo)
                                                                                 │
                                                    set-end dialog ◄─────────────┤
                                                                                 ▼
                                                          Riepilogo finale ─► PDF / XLSX / JSON
```

Live loop, target 2 clicks for a plain rally point and 3 for a rated action:
`player → skill → outcome` with auto-confirm, plus express buttons
("Punto avversario", "Errore nostro") and keyboard shortcuts.

## 5. Preliminary data model

Versioned root document: `{ schemaVersion: 1, ... }`. Full detail in [01-domain-model.md](01-domain-model.md).

- `Team` — id, name, isOurTeam
- `Player` — id, shirtNumber, name, shortName, role, isLibero, isAvailable
- `RosterTemplate` — reusable saved roster (name, players)
- `MatchSettings` — bestOf, pointsToWinSet, pointsToWinTieBreak, winByTwo, startingServer, startingSide
- `Match` — id, createdAt, status (`setup` | `live` | `finished`), info, settings, roster, sets, events, schemaVersion
- `SetState` — index, ourPoints, theirPoints, status, winner, rotationOffset, servingTeam, lineup, timeouts, substitutions, startedAt/endedAt
- `Lineup` — six player ids by court position P1..P6
- `ScoutEvent` — discriminated union (see §6), immutable, append-only
- `MatchSnapshot` — derived projection of the event log (current score, rotation, lineups)
- `PlayerStatistics` / `TeamStatistics` — pure fold over events
- `AppSettings` — theme, default team name, default format, confirmation prefs, shortcuts toggle

## 6. Scouting actions and outcomes (proposal)

Skills: `serve`, `reception`, `attack`, `block`, `dig`, `set` (toggleable), plus rally-level events.
One shared 5-value outcome scale, with only the meaningful subset enabled per skill:

| Outcome | Italian label | Meaning | Ends rally |
|---|---|---|---|
| `point` | Punto | winning action (ace, kill, block point) | yes → our point |
| `positive` | Positivo | good continuation | no |
| `neutral` | Neutro | playable but poor | no |
| `negative` | Negativo | opponent gains advantage | no |
| `error` | Errore | own error | yes → their point |

| Skill | point | positive | neutral | negative | error |
|---|---|---|---|---|---|
| serve (Battuta) | ace | ✔ | ✔ | ✔ | fallo / rete / out |
| reception (Ricezione) | — | ✔ | ✔ | ✔ | ace subito |
| attack (Attacco) | kill | ✔ | ✔ | murato / difeso | out / rete / fallo |
| block (Muro) | muro punto | ✔ touch utile | ✔ | — | fallo / invasione |
| dig (Difesa) | — | ✔ | ✔ | ✔ | palla persa |
| set (Alzata, opt.) | — | ✔ | ✔ | ✔ | doppia / fallo |

Rally-level events without a player: `opponent_point` ("Punto avversario", covering opponent winners).
Our own errors are always `skill + error`, or `error` (generic) when the skill is unclear.
Non-rally events: `timeout`, `substitution`, `set_start`, `set_end`, `note`.

## 7. Folder architecture

```
src/
  domain/         entities, rules (scoring, rotation, set/match end), statistics — pure, no React, no IO
  application/    use cases and Zustand stores (match, archive, settings)
  infrastructure/ storage adapters (Tauri FS, IndexedDB), export (xlsx, pdf, json), logging
  presentation/   pages, components, hooks, styles
  shared/         types, utils, constants, Italian UI copy
src-tauri/        Rust shell, minimal capabilities
docs/             plan, domain, architecture, ADRs, Italian user guide
```

Aliases: `@domain/*`, `@application/*`, `@infrastructure/*`, `@presentation/*`, `@shared/*`.

Styling rule: **Tailwind** for layout, spacing, responsive and simple states; **SCSS Modules** only
for complex component internals, animations and theme primitives. Never both for the same property.

## 8. Persistence and recovery strategy

- Single in-memory source of truth (Zustand), persisted through a `StorageAdapter` port.
- Primary adapter: **Tauri FS** (`appDataDir/matches/<id>.json`, `archive index`, `settings.json`).
  Fallback adapter: **IndexedDB** (browser dev and tests). `localStorage` only for the theme flag.
- Write policy: immediate flush after every rally-terminating or structural event; 500 ms debounce for
  low-risk edits (notes, roster form). Atomic write: temp file then rename.
- `schemaVersion` on every persisted document, Zod validation on load, migration registry.
  A corrupt or incompatible file is quarantined as `<id>.corrupt-<ts>.json` and the user gets a
  recovery dialog instead of a crash.
- Startup: an unfinished match makes Home show "Riprendi partita"; a new match never overwrites it
  without confirmation.
- Shutdown: Tauri `onCloseRequested` interception, flush, warn only when dirty. OS limits documented
  in [05-persistence.md](05-persistence.md).

## 9. Export strategy

- **XLSX** via `exceljs` — sheets: Riepilogo, Giocatori, Statistiche, Eventi, plus one per set.
- **PDF** via `jspdf` + `jspdf-autotable` — A4 portrait, printable, sober.
- **JSON** — the full match document, re-importable and Zod-validated on import.
- Generated in the renderer, written through the Tauri save dialog. No network access at any point.
- Filename: `scout_<OurTeam>_<Opponent>_<YYYY-MM-DD>.<ext>`, sanitised (`[^A-Za-z0-9-_]` → `_`).

## 10. Subagents

| Role | Model | Why |
|---|---|---|
| Product & Volleyball Domain Analyst | Opus 5 | Rules, edge cases, stat formulas — correctness critical |
| UX/UI Designer | Opus 5 | Courtside usability plus WCAG 2.2 AA judgement |
| Frontend Engineer | Sonnet 5 | Bounded, well-specified React/TS implementation |
| Desktop & Persistence Engineer | Opus 5 | Tauri config, atomic IO, crash recovery — risky |
| QA Engineer | Sonnet 5 | Vitest/RTL suites written from an explicit spec |
| Code Reviewer | Opus 5 | Final quality, accessibility and simplicity gate |

The orchestrator (Opus 5) owns the domain core, the integration and every quality gate.

## 11. Incremental plan

Phases 1→7 as per the brief; see [PLAN.md](../PLAN.md) for the live task board. Each phase ends with
`typecheck → lint → test → build` and a commit.

## 12. Acceptance criteria

The 15 MVP criteria are tracked as a checklist in `PLAN.md`, each mapped to an automated test or to a
manual scenario in [07-qa-scenarios.md](07-qa-scenarios.md).

## 13. Risks

| Risk | Mitigation |
|---|---|
| Rotation/score rules subtly wrong | Pure functions plus exhaustive unit tests written before the UI |
| Data loss on crash or power cut | Append-only event log, flush per rally, atomic writes, JSON backup |
| Live UI too slow or too many clicks | Click budget ≤ 3, memoised selectors, keyboard shortcuts |
| Tauri v2 API drift | Pin versions, verify against installed packages, never invent APIs |
| Windows build toolchain (WebView2 / MSVC) | Validated in Phase 7, prerequisites documented |
| Export libraries heavy or ESM-hostile in Vite | `exceljs` and `jspdf` are Vite-compatible and lazy-loaded on the report page only |
