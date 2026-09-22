# Volley Scout

Offline-first desktop app to scout volleyball matches, built for a single team's internal use.
No accounts, no cloud, no telemetry: everything stays on the machine it runs on.

The interface is in Italian; the code is in English.

## Requirements

- Node.js 20 or newer (developed on 24) and npm
- Rust stable and the Tauri prerequisites for your platform
  (on Windows: Microsoft C++ Build Tools and the WebView2 runtime, which ships with Windows 11)

## Install

```bash
npm install
```

## Develop

```bash
npm run tauri:dev   # the real desktop app
npm run dev         # the UI alone in a browser, data stored in IndexedDB
```

## Quality gates

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run verify      # all of the above, in order
```

Rust side: `cd src-tauri && cargo check && cargo test`.

## Package the desktop app

```bash
npm run tauri:build
```

The installers are written to `src-tauri/target/release/bundle/`.

## Where data is stored

In the OS app-data folder (`%APPDATA%\it.volleyscout.app\data` on Windows): one JSON file per match,
one per saved roster, plus the preferences. The exact path is shown in the settings screen.
Exports (PDF, XLSX, JSON) are written only to the location picked in the save dialog.

## Documentation

- `docs/00-product-plan.md` — scope, assumptions, risks
- `docs/01-domain-model.md` — entities and volleyball rules
- `docs/02-statistics.md` — statistic definitions and formulas
- `docs/03-ux-flows.md` — screens, wireframes, design tokens, Italian copy
- `docs/04-architecture.md` — layering, store APIs, key decisions
- `docs/05-persistence.md` — autosave, recovery, OS limits
- `docs/06-export.md` — export formats
- `docs/07-qa-scenarios.md` — manual test scenarios
- `docs/08-guida-utente.md` — end-user guide (Italian)
- `CLAUDE.md` — conventions for anyone (or anything) writing code here
- `PLAN.md` — delivery plan and its state
