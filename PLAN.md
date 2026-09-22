# Volley Scout — Implementation Plan (live board)

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

## Phase 1 — Domain analysis & design
- [x] P1.1 Product plan, assumptions, MVP scope (`docs/00-product-plan.md`)
- [ ] P1.2 Domain model & rules spec (`docs/01-domain-model.md`)
- [ ] P1.3 Statistics formulas spec (`docs/02-statistics.md`)
- [ ] P1.4 UX flows & textual wireframes (`docs/03-ux-flows.md`)
- [ ] P1.5 Architecture & conventions (`CLAUDE.md`, `docs/04-architecture.md`)
- [ ] P1.6 Subagent definitions (`.claude/agents/`)

## Phase 2 — Bootstrap & foundations
- [ ] P2.1 Vite + React + TS strict + aliases
- [ ] P2.2 Tailwind + SCSS modules + design tokens (light/dark)
- [ ] P2.3 Tauri 2 shell, minimal capabilities
- [ ] P2.4 Routing, layout shell, error boundary
- [ ] P2.5 Storage adapters (Tauri FS + IndexedDB fallback) + Zod schemas + migrations
- [ ] P2.6 Vitest + RTL + ESLint setup

## Phase 3 — Match setup & roster
- [ ] P3.1 New match form (React Hook Form + Zod)
- [ ] P3.2 Roster management + duplicate shirt-number guard
- [ ] P3.3 Roster templates (save/load/delete)
- [ ] P3.4 Starting lineup (P1..P6) + validation

## Phase 4 — Live scouting
- [ ] P4.1 Scoreboard, set counters, serving indicator
- [ ] P4.2 Rotation model & court display
- [ ] P4.3 Action pad (player → skill → outcome) + express buttons
- [ ] P4.4 Keyboard shortcuts
- [ ] P4.5 Timeouts & substitutions
- [ ] P4.6 Set-end / match-end dialogs

## Phase 5 — Stats, log, undo
- [ ] P5.1 Live statistics panel
- [ ] P5.2 Event log with edit/delete
- [ ] P5.3 Undo / redo
- [ ] P5.4 State reconstruction from events

## Phase 6 — Report & export
- [ ] P6.1 Final summary screen
- [ ] P6.2 XLSX export
- [ ] P6.3 PDF export
- [ ] P6.4 JSON export/import + validation
- [ ] P6.5 Archive screen

## Phase 7 — Quality & build
- [ ] P7.1 Unit/integration test suite (domain + components)
- [ ] P7.2 Accessibility pass (WCAG 2.2 AA where reasonable)
- [ ] P7.3 Error handling, empty/loading states
- [ ] P7.4 Crash recovery & close interception
- [ ] P7.5 Italian user guide + README
- [ ] P7.6 Desktop build (`tauri build`) — release bundle produced (MSI + NSIS)

## MVP acceptance checklist (brief §13)
- [ ] 1 create & configure a match
- [ ] 2 create or select a roster
- [ ] 3 set the starting lineup
- [ ] 4 record the main actions during a match
- [ ] 5 score / serve / set update correctly
- [ ] 6 undo a wrong entry
- [ ] 7 match is autosaved
- [ ] 8 accidental close does not lose saved actions
- [ ] 9 last unfinished match can be resumed
- [ ] 10 statistics are correct and tested
- [ ] 11 match can be finished
- [ ] 12 PDF, XLSX and JSON export
- [ ] 13 fully offline
- [ ] 14 typecheck, lint, tests and build pass
- [ ] 15 short install/dev/usage guide exists
