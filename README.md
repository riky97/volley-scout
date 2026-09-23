# Volley Scout

Offline-first desktop app to scout volleyball matches, built for a single team's internal use.
No accounts, no cloud, no telemetry: everything stays on the machine it runs on.

The interface is in Italian; the code is in English.

## Download (Windows)

Ready-made installers are published on the
[Releases page](https://github.com/riky97/volley-scout/releases/latest): take the `.exe`
(guided setup) or the `.msi`.

The installers are not code-signed, so Windows SmartScreen shows a warning the first time:
choose "Ulteriori informazioni" and then "Esegui comunque".

A new release is produced automatically for every version tag:

```bash
npm version patch        # bumps package.json and creates the tag
git push --follow-tags   # the Release workflow builds and publishes the installers
```

Keep `src-tauri/tauri.conf.json` `version` in step with `package.json`.

## Web fallback (tablets)

The same build also runs as a web app at
<https://riky97.github.io/volley-scout/>, published by the `Pages` workflow on every push to
`master`. It exists for the days the laptop is not there: open it once with a connection, add it
to the home screen, and a service worker keeps it working offline afterwards.

It is a fallback, not a replacement. The desktop build writes real files to disk; the web build
stores matches in the browser's IndexedDB, which the browser may evict — iOS is the strictest
about this. The app asks for persistent storage on startup, but granting it is the browser's
call. Export a JSON backup after a match scouted this way.

```bash
npm run build:web    # vite build + scripts/buildServiceWorker.mjs
```

## Branches

- `master` is production: it is what the web fallback deploys from and what release tags are cut
  from. Nothing is pushed straight to it.
- `develop` is where features and fixes are built. Branch from it, merge back into it, and merge
  `develop` into `master` when a version is ready to ship.

CI runs on both branches and on every pull request. Pages deploys only from `master`, and the
installers only from a `v*` tag.

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

In the web fallback there is no app-data folder: the same JSON documents live in the browser's
IndexedDB database `volley-scout`, and exports go to the browser's downloads. The two builds read
and write the same format, so a match exported from one opens in the other.

## Documentation

- `docs/00-product-plan.md` — scope, assumptions, risks
- `docs/01-domain-model.md` — entities and volleyball rules
- `docs/02-statistics.md` — statistic definitions and formulas
- `docs/03-ux-flows.md` — screens, wireframes, design tokens, Italian copy
- `docs/04-architecture.md` — layering, store APIs, key decisions
- `docs/05-persistence.md` — autosave, recovery, OS limits
- Export formats: `docs/00-product-plan.md` §9 and `src/infrastructure/export/`
- `docs/07-qa-scenarios.md` — manual test scenarios
- `docs/08-guida-utente.md` — end-user guide (Italian)
- `CLAUDE.md` — conventions for anyone (or anything) writing code here
- `PLAN.md` — delivery plan and its state
