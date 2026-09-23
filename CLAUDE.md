# CLAUDE.md — Volley Scout

Offline-first desktop app (Tauri 2 + React 19 + TypeScript) to scout volleyball matches.
Internal use by one team. No cloud, no accounts, no telemetry, no network calls at runtime.

## Golden rule: language

- **All code is English**: files, folders, variables, functions, types, React components, comments,
  technical docs, commit messages.
- **All user-visible text is Italian**: labels, buttons, menus, dialogs, toasts, error messages,
  tooltips, PDF/Excel exports, help text.
- Italian copy lives in `src/shared/copy/` — never hardcode Italian strings inside components
  unless they are one-off and clearly local to that component.

## Branches

`master` is production (Pages deploys from it, release tags are cut from it). `develop` is the
integration branch: build features and fixes there, then merge `develop` into `master` to ship.
Never commit directly to `master`.

## Commands

```bash
npm run dev          # Vite dev server (browser, IndexedDB storage fallback)
npm run tauri:dev    # full desktop app
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test         # vitest run
npm run build        # typecheck + vite build
npm run verify       # typecheck + lint + test + build  <- run before every commit
npm run tauri:build  # desktop release bundle
```

Rust side: `cd src-tauri && cargo check && cargo test`.

## Architecture

```
src/
  domain/         pure volleyball rules & entities. No React, no IO, no imports from other layers.
  application/    use cases + Zustand stores. May import domain and infrastructure ports.
  infrastructure/ adapters: storage (Tauri commands / IndexedDB), export (xlsx, pdf, json), logging.
  presentation/   pages, components, hooks, styles. May import application + shared only.
  shared/         types, utils, constants, Italian labels. Imported by anyone, imports nobody.
src-tauri/        Rust shell: storage commands, dialog plugin, minimal capabilities.
```

Dependency direction is strictly `presentation → application → domain`, with `infrastructure`
plugged in behind ports declared in `application`. `domain` imports nothing but `shared`.

Import aliases: `@domain/*`, `@application/*`, `@infrastructure/*`, `@presentation/*`, `@shared/*`.

## Conventions

- TypeScript strict, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. No `any`,
  no `@ts-ignore`, no disabling lint rules to make the build pass.
- Events and actions are **discriminated unions** on `type`; switches must be exhaustive
  (`switch-exhaustiveness-check` is on).
- Scoring, rotation and statistics are **pure functions** in `src/domain`, covered by unit tests.
- The match is an **append-only event log**; all derived state comes from a reducer over that log.
  Never mutate score or rotation directly.
- Components: `PascalCase.tsx`, one component per file, colocated `*.test.tsx`.
- Hooks: `useSomething.ts`. Pure helpers: `camelCase.ts`.
- **Styling rule**: Tailwind for layout, spacing, responsive and simple states. SCSS Modules
  (`Component.module.scss`) only for complex internals, animations and theme primitives.
  Never style the same property with both.
- Every persisted document carries `schemaVersion` and is validated with Zod on load.

## Safety rails

- No runtime network access, no CDN fonts, no analytics.
- Tauri capabilities stay minimal: `core:default`, `core:window:allow-destroy`, `dialog:allow-save`, `dialog:allow-open`.
  File IO goes through the Rust commands in `src-tauri/src/storage.rs`, which validate every path.
- Never write secrets or personal data beyond player names to disk.

## Docs

- `docs/00-product-plan.md` — scope, assumptions, risks
- `docs/01-domain-model.md` — entities and rules spec
- `docs/02-statistics.md` — statistic formulas
- `docs/03-ux-flows.md` — screens, wireframes, tokens, Italian copy
- `docs/04-architecture.md` — layering and ADRs
- `docs/05-persistence.md` — storage, autosave, recovery
- Export formats (XLSX/PDF/JSON): `docs/00-product-plan.md` §9 and `src/infrastructure/export/`
- `docs/07-qa-scenarios.md` — manual test scenarios
- `docs/08-guida-utente.md` — Italian end-user guide
- `PLAN.md` — live task board
