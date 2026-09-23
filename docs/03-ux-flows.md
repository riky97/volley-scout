# Volley Scout — UX Flows, Wireframes & Design System

> Phase 1 / task P1.4. Normative for implementation.
> All code identifiers are English; **every user-visible string in this document is the final Italian copy**
> and must be copied verbatim into `src/shared/copy/it.ts`. Engineers never invent copy.
> This document does not contradict `docs/00-product-plan.md`; where it adds detail, the detail is binding.

---

## 1. Design principles (courtside)

The operator is standing or sitting at the scorer's table, laptop at roughly **1 metre**, eyes mostly on
the court, hand on trackpad or keyboard, noise around, no time to read. Every rule below follows from that.

**P1 — Readable at 1 m.**
Minimum body size 16 px. Every value the operator glances at (score, set count, shirt number, serving team)
is ≥ 32 px. The two set-point scores are 72 px at 1366×768 and 88 px at 1920×1080. No text under 14 px
anywhere in the app, including the event log and table headers. No italic, no all-caps longer than 3 words,
no letter-spacing below 0. Numeric data uses `font-variant-numeric: tabular-nums` so digits never reflow.

**P2 — Large hit targets.**
Minimum interactive size **44 × 44 px** everywhere (WCAG 2.2 AA "Target Size (Minimum)" is 24 px; we exceed
it deliberately). On the Scout live screen the minimum rises to **64 × 64 px** for player chips, skill
buttons and outcome buttons, and **72 px** height for the express buttons and Undo. Minimum gap between
two adjacent live controls is 8 px so a mis-aimed click lands on nothing rather than on the wrong action.
Nothing in the live screen is inside a scroll container that can move under the pointer during play.

**P3 — No animation during live play.**
On the Scout live screen there are **zero** transitions, fades, slides or spinners. State changes are
instantaneous swaps. Feedback for a recorded action is a 150 ms static highlight of the new row in
"Ultime azioni" — a background change, not a movement. Outside the live screen, transitions are capped at
150 ms and limited to `opacity` and `background-color`. Toasts appear and disappear without motion.
`prefers-reduced-motion: reduce` removes even those (see §8).

**P4 — Colour is never the sole indicator.**
Each of the five outcomes carries three redundant channels: **colour + letter badge + icon shape**
(see §6.4). Serving team is marked by a ball icon *and* the word "Al servizio". The winning set in the set
counter is bold *and* carries a "✔" glyph. Errors in forms show an icon plus text, never a red border alone.
The app must remain fully usable in greyscale; this is a review gate.

**P5 — Keyboard-first is always possible.**
Every live action is reachable without the pointer (§5). The action pad is a roving-tabindex widget so a
full rated action costs at most 4 key presses. Focus is never invisible: a 3 px focus ring with a 2 px
offset, colour `--focus-ring`, on every focusable element, `:focus-visible` only. Focus is never trapped
except in dialogs. No shortcut collides with a browser, WebView2 or Windows binding (§5.4).

**P6 — Destructive actions are confirmed, everything else is not.**
Recording an action is never confirmed — it is undone instead. Undo is permanently visible on the live
screen (§4). Only deletion, match termination and overwriting an unfinished match open a dialog.

**P7 — One screen, one job.**
No modal stacking. No nested tabs on the live screen. The live screen never navigates away implicitly;
set-end and match-end are dialogs on top of it.

---

## 2. Screen inventory

Route column is the React Router path. "Primary action" is the single most likely thing the operator wants;
it is the visually dominant control and the default keyboard target on entry.

### 2.1 Home — `/`

| | |
|---|---|
| **Purpose** | Entry point; resume an interrupted match or start a new one. |
| **Entry** | App launch; "Home" in the sidebar from any screen. |
| **Exit** | → Nuova partita, → Scout live (resume), → Archivio partite, → Impostazioni. |
| **Primary action** | `Riprendi partita` when an unfinished match exists, otherwise `Nuova partita`. |
| **Empty state** | No unfinished match and no archive: title `Nessuna partita registrata`, body `Crea la prima partita per iniziare a raccogliere i dati.`, button `Nuova partita`. |
| **Loading** | Full-screen centred skeleton while the archive index is read. Text `Caricamento dati…`, `aria-busy="true"`. Never shorter than 0 ms and never blocking — Home renders its buttons immediately and only the "Riprendi" card is skeletonised. |
| **Error** | Storage unreadable: inline `EmptyState` variant `error` with `Impossibile leggere i dati salvati.` and `Riprova`. If a match file is quarantined, the recovery dialog (§9) opens on top of Home. |

### 2.2 Nuova partita — `/match/new`

| | |
|---|---|
| **Purpose** | Capture match metadata and format before any scouting. |
| **Entry** | Home → `Nuova partita`. |
| **Exit** | → Gestione roster (`Avanti`); → Home (`Annulla`). |
| **Primary action** | `Avanti` (bottom-right, disabled until the form is valid). |
| **Empty state** | None — the form is pre-filled from `AppSettings` defaults (team name, format, points per set). |
| **Loading** | Defaults load synchronously from the already-loaded settings store; no loading state. |
| **Error** | Field-level validation under each control (§9 copy). If an unfinished match exists, `Avanti` first opens the dialog `Partita in corso` (§9). |

### 2.3 Gestione roster — `/match/new/roster`

| | |
|---|---|
| **Purpose** | Build the list of our players for this match; save/load reusable roster templates. |
| **Entry** | Nuova partita → `Avanti`; Impostazioni → `Gestisci modelli roster`. |
| **Exit** | → Configurazione sestetto (`Avanti`); ← Nuova partita (`Indietro`). |
| **Primary action** | `Aggiungi giocatore`. |
| **Empty state** | `Nessun giocatore in rosa`, body `Aggiungi i giocatori uno a uno oppure carica un modello salvato.`, buttons `Aggiungi giocatore` (primary) and `Carica modello` (secondary). |
| **Loading** | Template list shows 3 skeleton rows while the template file is read. |
| **Error** | Duplicate shirt number blocks submit with the field error `Numero di maglia già assegnato.` Template write failure raises the toast `Impossibile salvare il modello.` |

### 2.4 Configurazione sestetto — `/match/new/lineup`

| | |
|---|---|
| **Purpose** | Place six players on P1…P6, pick the starting server and our side. |
| **Entry** | Gestione roster → `Avanti`; Scout live → `Modifica sestetto` between sets. |
| **Exit** | → Scout live (`Inizia partita` / `Inizia set`); ← Gestione roster (`Indietro`). |
| **Primary action** | `Inizia partita` (first set) / `Inizia set` (later sets). Disabled until all six positions are filled. |
| **Empty state** | Six empty position slots reading `Posizione libera`; the bench list shows `Nessun giocatore disponibile` if the roster is empty (with a link back to the roster). |
| **Loading** | None; data is in memory. |
| **Error** | `Seleziona sei giocatori per iniziare.` shown above the primary button when incomplete; a player assigned twice is impossible by construction (assigning moves the chip). |

### 2.5 Scout live — `/match/:id/live`

| | |
|---|---|
| **Purpose** | Record every rally in ≤ 3 clicks while score, serve and rotation stay automatically correct. |
| **Entry** | Configurazione sestetto → `Inizia partita`; Home → `Riprendi partita`. |
| **Exit** | Set-end dialog → next set (stays on screen); match-end dialog → Riepilogo finale; `Home` in the sidebar (match stays `live` and resumable). |
| **Primary action** | The action pad (player → skill → outcome). |
| **Empty state** | Before the first rally the "Ultime azioni" panel shows `Nessuna azione registrata.` and the hint `Seleziona un giocatore, poi il fondamentale, poi l'esito.` The rest of the screen is always fully populated. |
| **Loading** | Only on resume: a 250 ms full-screen `Ripristino della partita…` while the event log is folded into a snapshot. The live screen never shows a spinner after that. |
| **Error** | A failed flush shows the persistent, non-dismissable banner `Salvataggio non riuscito. I dati restano in memoria.` with `Riprova salvataggio`, and the app keeps accepting input. An invalid outcome combination is prevented, not rejected (§4.5). |

### 2.6 Statistiche live — `/match/:id/stats`

| | |
|---|---|
| **Purpose** | Read current team and per-player numbers without leaving the match. |
| **Entry** | Scout live → `Statistiche` (or `S`). Opens as a right-side drawer over the live screen at 1366×768, as a permanently docked panel at 1920×1080. |
| **Exit** | `Chiudi` / `Esc` → back to Scout live with focus restored to the `Statistiche` button. |
| **Primary action** | The set selector `Set 1 / Set 2 / … / Totale partita`. |
| **Empty state** | `Nessun dato disponibile per questo set.` |
| **Loading** | None — statistics are a synchronous pure fold over the event log. |
| **Error** | If the fold throws, the panel shows `Impossibile calcolare le statistiche.` and a `Riprova` button; the live screen is unaffected. |

### 2.7 Riepilogo finale — `/match/:id/summary`

| | |
|---|---|
| **Purpose** | Final read-only report of a finished match, and the export surface. |
| **Entry** | Match-end dialog → `Vai al riepilogo`; Archivio partite → row click. |
| **Exit** | → Home; → Archivio partite. |
| **Primary action** | `Esporta PDF`. |
| **Empty state** | Not reachable empty — a finished match always has at least one set. A set with zero events shows `Nessuna azione registrata in questo set.` inside its section. |
| **Loading** | `Caricamento partita…` skeleton while the match document is read from disk; export buttons disabled while an export runs, label swaps to `Esportazione in corso…`. |
| **Error** | Export failure toast `Esportazione non riuscita.` with `Riprova`. Load failure → `Impossibile aprire la partita.` with `Torna all'archivio`. |

### 2.8 Archivio partite — `/archive`

| | |
|---|---|
| **Purpose** | Find, reopen, export, import or delete past matches. |
| **Entry** | Home → `Archivio partite`; sidebar. |
| **Exit** | → Riepilogo finale; → Home. |
| **Primary action** | Open the selected match (row click / `Invio`). |
| **Empty state** | `Archivio vuoto`, body `Le partite terminate compaiono qui.`, button `Nuova partita`. Filtered-to-nothing variant: `Nessun risultato per questa ricerca.` with `Azzera filtri`. |
| **Loading** | Six skeleton rows while the index is read. |
| **Error** | `Impossibile leggere l'archivio.` + `Riprova`. A quarantined file is listed with the badge `File danneggiato` and the row action `Ripristina`. |

### 2.9 Impostazioni — `/settings`

| | |
|---|---|
| **Purpose** | Theme, default team, default format, confirmation preferences, shortcut reference, data folder. |
| **Entry** | Home / sidebar. |
| **Exit** | → Home. |
| **Primary action** | None dominant — settings save on change (autosave), with the toast `Impostazioni salvate.` |
| **Empty state** | None. |
| **Loading** | None — settings are loaded at boot. |
| **Error** | `Impossibile salvare le impostazioni.` toast; the control reverts to its previous value. |

---

## 3. Textual wireframes

Real Italian labels. `[ ]` = button, `( )` = radio, `[x]` = checkbox, `▾` = select, `▮` = focus ring.

### 3.0 Application shell

All screens except dialogs render inside this shell. Sidebar is 88 px wide (icon + label) at 1366×768 and
216 px at 1920×1080. **On Scout live the sidebar collapses to 56 px, icon-only**, to give the court and pad
maximum room; labels remain as `aria-label` and tooltips.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Volley Scout                                    Reale Vicenza – Sandrigo  ☾  │  ← topbar 48px
├────────┬─────────────────────────────────────────────────────────────────────┤
│ Home   │                                                                     │
│ Nuova  │                         AREA CONTENUTO                              │
│ Archivio│                                                                    │
│ Impost.│                                                                     │
└────────┴─────────────────────────────────────────────────────────────────────┘
```

### 3.1 Home

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Volley Scout                                                                │
│  Raccolta dati partita, offline.                                             │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Partita in corso                                                      │  │
│  │  Reale Vicenza – Sandrigo · 22/09/2026 · Set 2 · 14–11                  │  │
│  │                                            [ Riprendi partita ]        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐  │
│  │  Nuova partita       │ │  Archivio partite    │ │  Impostazioni        │  │
│  │  Configura squadre,  │ │  12 partite salvate  │ │  Tema, formato e     │  │
│  │  rosa e sestetto.    │ │                      │ │  preferenze.         │  │
│  │  [ Nuova partita ]   │ │  [ Apri archivio ]   │ │  [ Apri impostazioni]│  │
│  └──────────────────────┘ └──────────────────────┘ └──────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

Empty variant replaces the "Partita in corso" card with:

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                          ( icona campo )                               │
  │                     Nessuna partita registrata                         │
  │        Crea la prima partita per iniziare a raccogliere i dati.        │
  │                          [ Nuova partita ]                             │
  └────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Nuova partita

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Nuova partita                                          Passo 1 di 3         │
│  ●━━━━━━━━━━━○━━━━━━━━━━━○   Dati partita · Rosa · Sestetto                   │
├──────────────────────────────────────────────────────────────────────────────┤
│  Dati partita                                                                │
│   Squadra di casa *          Squadra ospite *                                │
│   [ Reale Vicenza        ]   [ Sandrigo Volley     ]                         │
│   ⚠ Inserisci il nome della squadra.                                         │
│                                                                              │
│   Data *            Ora            Competizione         Luogo                │
│   [ 22/09/2026 ]    [ 20:30 ]      [ Serie C        ]   [ Palasport     ]    │
│                                                                              │
│   La nostra squadra è:   ( ) Casa   (•) Ospite                               │
│                                                                              │
│  Formato                                                                     │
│   Set:            (•) Al meglio dei 5    ( ) Al meglio dei 3                 │
│   Punti per set:  [ 25 ▾ ]     Punti al tie-break: [ 15 ▾ ]                  │
│   [x] Vittoria con due punti di scarto                                       │
│                                                                              │
│  Inizio                                                                      │
│   Primo servizio:  (•) Nostro    ( ) Avversario                              │
│   Nostro campo:    (•) Sinistra  ( ) Destra                                  │
│                                                                              │
│   Note                                                                       │
│   [                                                             ]            │
├──────────────────────────────────────────────────────────────────────────────┤
│  [ Annulla ]                                              [ Avanti ]         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Gestione roster

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Rosa                                                   Passo 2 di 3         │
│  ●━━━━━━━━━━━●━━━━━━━━━━━○                                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│  Modello roster:  [ Serie C 2026 ▾ ]   [ Carica modello ] [ Salva modello ]  │
├──────────────────────────────────────────────────────────────────────────────┤
│  Giocatori (12)                                        [ Aggiungi giocatore ]│
│  ┌────┬───────────────────────┬──────────────┬────────┬───────────┬────────┐ │
│  │ N. │ Nome                  │ Ruolo        │ Libero │ Disponibile│      │ │
│  ├────┼───────────────────────┼──────────────┼────────┼───────────┼────────┤ │
│  │  1 │ Marco Rossi           │ Palleggiatore│   [ ]  │    [x]    │ ✎  🗑  │ │
│  │  4 │ Luca Bianchi          │ Schiacciatore│   [ ]  │    [x]    │ ✎  🗑  │ │
│  │  7 │ Andrea Verdi          │ Centrale     │   [ ]  │    [x]    │ ✎  🗑  │ │
│  │ 12 │ Paolo Neri            │ Libero       │   [x]  │    [x]    │ ✎  🗑  │ │
│  └────┴───────────────────────┴──────────────┴────────┴───────────┴────────┘ │
│                                                                              │
│  Nuovo giocatore                                                             │
│   Numero *   Nome e cognome *          Ruolo *              Libero           │
│   [  9  ]    [ Giulio Ferri        ]   [ Opposto      ▾ ]   [ ]              │
│                                          [ Annulla ] [ Salva giocatore ]     │
├──────────────────────────────────────────────────────────────────────────────┤
│  [ Indietro ]                                             [ Avanti ]         │
└──────────────────────────────────────────────────────────────────────────────┘
```

Ruolo options (final copy): `Palleggiatore`, `Opposto`, `Schiacciatore`, `Centrale`, `Libero`.

### 3.4 Configurazione sestetto

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Sestetto iniziale — Set 1                              Passo 3 di 3         │
│  ●━━━━━━━━━━━●━━━━━━━━━━━●                                                    │
├───────────────────────────────────────────┬──────────────────────────────────┤
│  Campo (vista dalla panchina)             │  Giocatori disponibili           │
│                                           │                                  │
│   ┌───────────┬───────────┬───────────┐   │  ┌──────┐ ┌──────┐ ┌──────┐      │
│   │  P4       │  P3       │  P2       │   │  │ 9    │ │ 11   │ │ 12 L │      │
│   │  4 Bianchi│  7 Verdi  │  9 Ferri  │   │  │Ferri │ │Gialli│ │ Neri │      │
│   │  Rete ────┴───────────┴────────── │   │  └──────┘ └──────┘ └──────┘      │
│   ├───────────┼───────────┼───────────┤   │  ┌──────┐ ┌──────┐               │
│   │  P5       │  P6       │  P1 ⚐     │   │  │ 15   │ │ 18   │               │
│   │  11 Gialli│  Posizione│  1 Rossi  │   │  │Blu   │ │Viola │               │
│   │           │  libera   │  Servizio │   │  └──────┘ └──────┘               │
│   └───────────┴───────────┴───────────┘   │                                  │
│                                           │  Tocca un giocatore, poi una      │
│  Primo servizio: Nostro                   │  posizione libera.               │
│  ⚠ Seleziona sei giocatori per iniziare.  │                                  │
├───────────────────────────────────────────┴──────────────────────────────────┤
│  [ Indietro ]                [ Svuota sestetto ]         [ Inizia partita ]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.5 Scout live — the critical screen

Full wireframe at **1366×768** (56 px icon sidebar, 48 px topbar, 664 px of usable height):

```
┌──┬────────────────────────────────────────────────────────────────────────────────────────┐
│🏠│ SET 2 · in corso                       Reale Vicenza – Sandrigo Volley      [Statistiche]│
│➕│ ┌──────────────────────────────┬──────────────────┬──────────────────────────────────┐  │
│🗄│ │ REALE VICENZA        ⚐ Al    │  SET             │ SANDRIGO VOLLEY                  │  │
│⚙│ │                       servizio│  1 ✔  2   3  4  5│                                  │  │
│  │ │        14                    │  25   14         │              11                  │  │
│  │ │                              │  22   11         │                                  │  │
│  │ │  Set vinti: 1                │                  │  Set vinti: 0                    │  │
│  │ └──────────────────────────────┴──────────────────┴──────────────────────────────────┘  │
│  ├───────────────────────┬──────────────────────────────────┬───────────────────────────┤  │
│  │ CAMPO — rotazione 3   │ AZIONE                           │ ULTIME AZIONI      [Tutte]│  │
│  │                       │                                  │                           │  │
│  │ ┌─────┬─────┬─────┐   │ 1 · Giocatore                    │ 14–11  ▲ P  7 Verdi       │  │
│  │ │ P4  │ P3  │ P2  │   │ ┌─────┬─────┬─────┬─────┬─────┬┐ │        Attacco · Punto    │  │
│  │ │  4  │  7  │  9  │   │ │  4  │  7  │  9  │ 11  │  1  ││ │ ─────────────────────────│  │
│  │ │Bianc│Verdi│Ferri│   │ │Bianc│Verdi│Ferri│Gial │Rossi││ │ 13–11  ▼ E  Punto avv.    │  │
│  │ ├─────┼─────┼─────┤   │ └─────┴─────┴─────┴─────┴─────┴┘ │                           │  │
│  │ │ P5  │ P6  │ P1⚐ │   │                                  │ 13–10  ▲ P  4 Bianchi     │  │
│  │ │ 11  │ 12 L│  1  │   │ 2 · Fondamentale                 │        Muro · Punto       │  │
│  │ │Gial │Neri │Rossi│   │ ┌────────┬────────┬────────┐     │ ─────────────────────────│  │
│  │ └─────┴─────┴─────┘   │ │Battuta │Ricezione│Attacco │     │ 12–10  ● +  12 Neri      │  │
│  │                       │ ├────────┼────────┼────────┤     │        Ricezione·Positivo │  │
│  │ Time-out  N 1 · A 0   │ │ Muro   │ Difesa │ Alzata │     │                           │  │
│  │ Cambi     N 2 · A 1   │ └────────┴────────┴────────┘     │ 12–9   ▲ P  9 Ferri       │  │
│  │                       │                                  │        Battuta · Punto    │  │
│  │ [ Time-out ]          │ 3 · Esito                        │                           │  │
│  │ [ Cambio ]            │ ┌──────┬──────┬──────┬──────┬───┐│ (elenco, scorre)          │  │
│  │ [ Modifica sestetto ] │ │▲ P   │● +   │◆ =   │■ −   │✖ E││ │                          │  │
│  │                       │ │Punto │Posit.│Neutro│Negat.│Err││ │                          │  │
│  │                       │ └──────┴──────┴──────┴──────┴───┘│ │                          │  │
│  └───────────────────────┴──────────────────────────────────┴───────────────────────────┤  │
│  ├────────────────────────────────────────────────────────────────────────────────────┤  │
│  │ [ ↶ Annulla azione ]   [ ▲ Punto nostro ]  [ ▼ Punto avversario ]  [ ✖ Errore     ]│  │
│  │                                                                     nostro        ]│  │
│  │                                                            [ Termina set ]         │  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
└──┴────────────────────────────────────────────────────────────────────────────────────────┘
```

**Grid contract — 12 columns, 16 px gutter, 16 px page padding.**

| Area | `grid-area` | 1366×768 | 1920×1080 |
|---|---|---|---|
| Sidebar | outside the grid | 56 px fixed, icon-only | 56 px fixed, icon-only |
| `scoreboard` | row 1 | cols 1–12, height **128 px** | cols 1–12, height **152 px** |
| `court` | row 2 | cols 1–3 (≈ 300 px) | cols 1–3 (≈ 440 px) |
| `actionpad` | row 2 | cols 4–9 (≈ 620 px) | cols 4–8 (≈ 600 px) |
| `events` | row 2 | cols 10–12 (≈ 300 px) | cols 9–10 (≈ 300 px) |
| `stats` | row 2 | **not in grid** — drawer over `events`+`actionpad` | cols 11–12, permanently docked |
| `actionbar` | row 3 | cols 1–12, height **88 px**, `position: sticky; bottom: 0` | cols 1–12, height **96 px**, sticky |

Row template: `grid-template-rows: 128px minmax(0,1fr) 88px;` at 1366×768 and
`grid-template-rows: 152px minmax(0,1fr) 96px;` at 1920×1080. The middle row is the only scrollable
region and only the `events` column inside it actually scrolls. **`court`, `actionpad` and `actionbar`
never scroll and never reflow** — their contents shrink via `clamp()` instead.

Below 1280 px width the layout falls back to `court` cols 1–4 / `actionpad` cols 5–12 and the `events`
panel becomes a bottom drawer opened by `Ultime azioni`. 1280×720 is the documented minimum window size.

Live sizing at 1366×768 → 1920×1080:
score digits 72 → 88 px · player chip 84×72 → 96×80 px · skill button 168×64 → 184×72 px ·
outcome button 108×64 → 120×72 px · express button height 64 → 72 px · Undo width 220 → 260 px.

### 3.6 Statistiche live (drawer at 1366×768, docked panel at 1920×1080)

```
┌────────────────────────────────────────────────────────────┐
│  Statistiche live                                [ Chiudi ]│
│  [ Set 1 ][ Set 2 ][ Totale partita ]                      │
├────────────────────────────────────────────────────────────┤
│  Squadra                                                   │
│  Punti fatti 14 · Errori nostri 5 · Punti avversario 11     │
│  Efficienza attacco 38% · Positività ricezione 61%          │
├────────────────────────────────────────────────────────────┤
│  Giocatori                                                 │
│  ┌────┬──────────┬────┬────┬────┬────┬─────┐               │
│  │ N. │ Giocatore│ Att│ Mur│ Bat│ Ric│ Err │               │
│  ├────┼──────────┼────┼────┼────┼────┼─────┤               │
│  │  9 │ Ferri    │  6 │  1 │  2 │  – │  3  │               │
│  │  4 │ Bianchi  │  4 │  2 │  0 │ 58%│  1  │               │
│  │ 12 │ Neri (L) │  – │  – │  – │ 72%│  0  │               │
│  └────┴──────────┴────┴────┴────┴────┴─────┘               │
│  Ordina per: [ Punti ▾ ]                                   │
└────────────────────────────────────────────────────────────┘
```

### 3.7 Riepilogo finale

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Riepilogo partita                                                           │
│  Reale Vicenza 3 – 1 Sandrigo Volley · 22/09/2026 · Serie C · Palasport       │
│  [ Esporta PDF ] [ Esporta XLSX ] [ Esporta JSON ]        [ Torna alla home ] │
├──────────────────────────────────────────────────────────────────────────────┤
│  Set        1      2      3      4                                           │
│  Noi       25     22     25     25                                           │
│  Loro      22     25     19     21                                           │
│  Durata  24'    27'    21'    23'                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│  Statistiche giocatori — Totale partita                                      │
│  ┌────┬────────────┬──────┬───────┬──────┬───────┬───────┬──────┬──────────┐ │
│  │ N. │ Giocatore  │ Ruolo│ Punti │ Att. │ Muri  │ Ace   │ Err. │ Ric. pos.│ │
│  ├────┼────────────┼──────┼───────┼──────┼───────┼───────┼──────┼──────────┤ │
│  │  9 │ Ferri      │ Opp. │   18  │ 41%  │   2   │   3   │   6  │    –     │ │
│  └────┴────────────┴──────┴───────┴──────┴───────┴───────┴──────┴──────────┘ │
├──────────────────────────────────────────────────────────────────────────────┤
│  Andamento per set          [ Set 1 ▾ ]                                      │
│  Elenco completo delle azioni …                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.8 Archivio partite

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Archivio partite                               [ Importa partita ]          │
│  Cerca [ Sandrigo            ]  Stagione [ 2026 ▾ ]  Esito [ Tutti ▾ ]       │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────┬───────────────────────────┬─────────┬───────────┬──────────┐ │
│  │ Data       │ Partita                   │ Risultato│ Stato    │          │ │
│  ├────────────┼───────────────────────────┼─────────┼───────────┼──────────┤ │
│  │ 22/09/2026 │ Reale Vicenza – Sandrigo  │  3 – 1  │ Terminata │ 👁 ⭳ 🗑  │ │
│  │ 15/09/2026 │ Reale Vicenza – Thiene    │  1 – 3  │ Terminata │ 👁 ⭳ 🗑  │ │
│  │ 08/09/2026 │ Reale Vicenza – Bassano   │    –    │ In corso  │ 👁 ⭳ 🗑  │ │
│  │ 01/09/2026 │ Reale Vicenza – Schio     │    –    │ File      │    ⭯     │ │
│  │            │                           │         │ danneggiato│         │ │
│  └────────────┴───────────────────────────┴─────────┴───────────┴──────────┘ │
│  12 partite                                                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.9 Impostazioni

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Impostazioni                                                                │
├──────────────────────────────────────────────────────────────────────────────┤
│  Aspetto                                                                     │
│   Tema:  ( ) Chiaro   ( ) Scuro   (•) Come il sistema                        │
├──────────────────────────────────────────────────────────────────────────────┤
│  Valori predefiniti                                                          │
│   Nome della nostra squadra [ Reale Vicenza      ]                           │
│   Formato set   (•) Al meglio dei 5  ( ) Al meglio dei 3                     │
│   Punti per set [ 25 ▾ ]     Punti al tie-break [ 15 ▾ ]                     │
├──────────────────────────────────────────────────────────────────────────────┤
│  Raccolta dati                                                               │
│   [x] Registra le alzate                                                     │
│   [x] Chiedi conferma prima di terminare la partita                          │
│   [ ] Chiedi conferma prima di annullare un'azione                           │
│   [x] Scorciatoie da tastiera attive                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│  Dati                                                                        │
│   Cartella dati: C:\Users\…\volley-scout                [ Apri cartella ]    │
│   [ Gestisci modelli roster ]                                                │
├──────────────────────────────────────────────────────────────────────────────┤
│  Scorciatoie da tastiera                                       [ Mostra ▾ ]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.10 Dialogs

```
┌───────────────────────────────────────────┐   ┌───────────────────────────────────────────┐
│  Set 2 terminato                          │   │  Terminare la partita?                    │
│                                           │   │                                           │
│  Reale Vicenza 25 – 22 Sandrigo Volley    │   │  Reale Vicenza 3 – 1 Sandrigo Volley.     │
│  Set vinti: 2 – 0                         │   │  Dopo la conferma non sarà più possibile  │
│                                           │   │  registrare azioni.                       │
│  Il prossimo set inizia con il sestetto   │   │                                           │
│  attuale.                                 │   │                                           │
│                                           │   │                                           │
│  [ Modifica sestetto ]  [ Inizia set 3 ]  │   │  [ Annulla ]      [ Termina partita ]     │
└───────────────────────────────────────────┘   └───────────────────────────────────────────┘
```

---

## 4. Interaction spec — live action pad

The pad is a three-step selector: **Giocatore → Fondamentale → Esito**. Steps are numbered on screen
(`1 · Giocatore`, `2 · Fondamentale`, `3 · Esito`) and this numbering is part of the copy.

### 4.1 State machine

```
idle ──click player──► playerSelected ──click skill──► skillSelected ──click outcome──► COMMIT ──► idle
  │                         │                               │
  │                         └── Esc / click same player ────┘── Esc / click same skill ──► back one step
  └── click express button ──────────────────────────────────────────────────────────► COMMIT ──► idle
```

There is no fourth "confirm" step. **Choosing the outcome commits the event immediately** (auto-confirm).

### 4.2 Highlighting, step by step

| Step | What is enabled | What is highlighted | Where focus goes |
|---|---|---|---|
| `idle` | Row 1 (players) enabled. Rows 2 and 3 rendered at `opacity: .45`, `aria-disabled="true"`, `pointer-events:none`. | Nothing. The step label `1 · Giocatore` is bold; steps 2 and 3 are muted. | Stays where it was; keyboard shortcuts are global. |
| `playerSelected` | Row 2 enabled, but **only the skills valid for a selection** (always all six, minus `Alzata` when the setting `Registra le alzate` is off). Row 1 stays enabled so the player can be changed in one click. | Selected player chip: `--accent` 3 px inset border + `--surface-selected` background + a "✔" glyph top-right. The same player's tile in the court panel gets the identical border. Step label `2 · Fondamentale` becomes bold. | First enabled skill button (roving tabindex). |
| `skillSelected` | Row 3 enabled, **only the outcomes allowed for that skill** (per the matrix in `00-product-plan.md` §6). Disallowed outcome buttons are rendered `opacity: .35`, `aria-disabled="true"`, not focusable, and show the tooltip/`aria-description` `Esito non previsto per questo fondamentale.` Rows 1 and 2 stay enabled. | Selected skill button filled with `--accent` and `--on-accent` text. Step label `3 · Esito` bold. A one-line preview reads `9 Ferri · Attacco · …`. | First enabled outcome button. |
| `COMMIT` | — | The new row in "Ultime azioni" gets `--surface-highlight` for 150 ms (background only, no motion). The scoreboard number swaps instantly. | Returns to the player row; the pad resets to `idle`. |

The court panel and the player row are two views of the same selection: selecting in one highlights both.
Clicking a player **in the court** is equivalent to clicking their chip in row 1.

### 4.3 Cancelling mid-sequence

Four equivalent ways, all of them one input:

1. **`Esc`** — steps back exactly one level (`skillSelected` → `playerSelected` → `idle`). Never commits,
   never opens a dialog.
2. **Clicking the already-selected item again** — deselects it and steps back one level.
3. **Clicking a different item in an earlier row** — replaces that choice and resets every later row.
   Picking a different player from `skillSelected` returns to `playerSelected` with the new player.
4. **The `Annulla selezione` text button** in the pad header, visible only when the pad is not `idle`.

Cancelling never writes an event and never produces a toast.

### 4.4 Auto-confirm rules

- **Rated action**: committed the instant the outcome is clicked. No confirmation dialog, ever.
- **Express buttons**: committed on the single click. No confirmation.
- A commit that ends the rally updates score, serving team and rotation in the same synchronous state
  transition and triggers an immediate storage flush.
- A commit that **ends the set or the match** first writes the event, then opens `Set N terminato` or
  `Fine partita` (§3.10). The event is already saved when the dialog appears; dismissing the dialog never
  rolls it back.
- The only confirmation in the live loop is optional and off by default:
  `Chiedi conferma prima di annullare un'azione` in Impostazioni.
- An inactive pad is reset after **20 s** of no input back to `idle`, so a forgotten half-selection cannot
  be completed by a stray click during the next rally. No toast, no sound.

### 4.5 Invalid combinations

Invalid combinations are **unreachable, not rejected**. The outcome row is derived from the selected skill,
so the operator can never click `Punto` after `Ricezione`. Disabled outcome buttons remain *visible* (so
the pad's geometry never shifts between skills) at `opacity: .35`, `aria-disabled="true"`, removed from the
tab order, with `aria-description` = `Esito non previsto per questo fondamentale.`

If a keyboard shortcut requests an impossible outcome (for example `P` while `Ricezione` is selected),
nothing is committed, the pad state is unchanged, and the live region announces
`Esito non disponibile per Ricezione.` Same rule for a shirt number that is not on court or on the bench:
`Nessun giocatore con il numero 23.`

Two cases are genuinely blocked rather than hidden, with a toast:

- Recording an action while no set is running → `Nessun set in corso.`
- Recording an action after the match is finished → `La partita è terminata.`

### 4.6 Click budget (normative)

| Scenario | Clicks | Sequence |
|---|---|---|
| Rated action (any skill + any outcome) | **3** | player → skill → outcome |
| Plain point for us, unattributed | **1** | `Punto nostro` |
| Point for us attributed to a player, skill unclear | **2** | player → `Punto nostro` |
| Point for the opponent | **1** | `Punto avversario` |
| Our error, skill unclear | **1** | `Errore nostro` |
| Our error attributed to a player | **2** | player → `Errore nostro` |
| Undo | **1** | `Annulla azione` |
| Time-out | **2** | `Time-out` → `Nostro` / `Avversario` |
| Substitution | **3** | `Cambio` → outgoing player → incoming player |

The express buttons act on the current pad state: with a player selected they attribute the point/error to
that player and reset the pad; with nothing selected they record the rally-level event
(`opponent_point` / generic `error`). **The budget is a hard requirement — any design change that adds a
click to the first four rows is rejected.**

---

## 5. Keyboard shortcut map

Active on **Scout live** only, unless the row says otherwise. Shortcuts are suspended while an `input`,
`textarea` or `select` has focus, and while a dialog is open (except `Esc` and `Invio`).
Toggle: `Scorciatoie da tastiera attive` in Impostazioni (default on).

### 5.1 Selecting a player

| Key | Action | Descrizione italiana (copy for the help panel) |
|---|---|---|
| `0`–`9` | Type a shirt number (1–2 digits) and select that player. The buffer commits after 500 ms of inactivity, on `Invio`, or as soon as a second digit makes the number unambiguous. | `Digita il numero di maglia per selezionare il giocatore.` |
| `Invio` | Commit the shirt-number buffer immediately. | `Conferma il numero di maglia digitato.` |
| `Backspace` | Delete the last digit of the buffer; on an empty buffer, deselect the player. | `Cancella l'ultima cifra digitata.` |
| `Alt` + `1`…`6` | Select the player currently in court position P1…P6. | `Seleziona il giocatore nella posizione da 1 a 6.` |
| `Tab` / `Maiusc+Tab` | Move focus between pad rows and panels (roving tabindex inside each row). | `Sposta il fuoco tra i gruppi di comandi.` |
| `←` `→` `↑` `↓` | Move within the focused row / court grid. | `Sposta la selezione all'interno del gruppo.` |

The shirt-number buffer is shown live in the pad header as `Numero: 1…`.

### 5.2 Selecting a skill

| Key | Action | Descrizione italiana |
|---|---|---|
| `B` | Battuta | `Fondamentale: Battuta.` |
| `R` | Ricezione | `Fondamentale: Ricezione.` |
| `A` | Attacco | `Fondamentale: Attacco.` |
| `M` | Muro | `Fondamentale: Muro.` |
| `D` | Difesa | `Fondamentale: Difesa.` |
| `Z` | Alzata (only when `Registra le alzate` is on) | `Fondamentale: Alzata.` |

`Alzata` uses `Z` because `A` is taken by `Attacco`, the far more frequent action.

### 5.3 Selecting an outcome, express events and match control

| Key | Action | Descrizione italiana |
|---|---|---|
| `P` | Esito: Punto | `Esito: Punto.` |
| `+` (main row or numpad) | Esito: Positivo | `Esito: Positivo.` |
| `N` | Esito: Neutro | `Esito: Neutro.` |
| `-` (main row or numpad) | Esito: Negativo | `Esito: Negativo.` |
| `E` | Esito: Errore | `Esito: Errore.` |
| `Spazio` | Express `Punto nostro` (attributed to the selected player, if any) | `Punto nostro.` |
| `X` | Express `Punto avversario` | `Punto avversario.` |
| `Q` | Express `Errore nostro` | `Errore nostro.` |
| `Ctrl` + `Z` | Annulla l'ultima azione | `Annulla l'ultima azione registrata.` |
| `Ctrl` + `Maiusc` + `Z` | Ripristina l'azione annullata | `Ripristina l'ultima azione annullata.` |
| `T` | Time-out nostro | `Time-out nostro.` |
| `Maiusc` + `T` | Time-out avversario | `Time-out avversario.` |
| `C` | Apri il dialogo Cambio | `Apri la finestra del cambio giocatore.` |
| `S` | Apri/chiudi Statistiche live | `Mostra o nasconde le statistiche live.` |
| `Ctrl` + `Invio` | Termina il set in corso (opens the confirmation dialog) | `Termina il set in corso.` |
| `Esc` | Annulla un passo della selezione; chiude il pannello o il dialogo aperto | `Annulla la selezione in corso o chiude la finestra.` |
| `?` (`Maiusc` + `'`) | Apri il riepilogo delle scorciatoie (global, all screens) | `Mostra l'elenco delle scorciatoie.` |

Fastest rated action by keyboard: `9` `A` `P` → 3 keys (4 with an explicit `Invio` on an ambiguous number).
Fastest point: `Spazio` → 1 key.

### 5.4 Conflict avoidance (verified)

- **Never bound**: `F1`–`F12`, `Ctrl+N/T/W/P/S/F/R/D/O/L/J/U`, `Ctrl+Maiusc+I/J/C`, `Alt+F4`, `Alt+Tab`,
  `F5`, `Ctrl+`+`/`-`/`0`, `Ctrl+Tab`, `Windows` combinations. These belong to WebView2 or Windows.
- `Ctrl+Z` / `Ctrl+Maiusc+Z` are bound intentionally because they match the platform meaning of
  undo/redo and no text field is focused while the live pad is active; when a field *is* focused the
  handler does not run and the browser's native undo applies.
- Single letters are safe because Tauri ships with the browser menu bar disabled and the live screen has
  no text input. `Spazio` is intercepted with `preventDefault()` so it never re-activates the last focused
  button; the express buttons are `<button type="button">` and the global handler runs on `keydown` at the
  document level with an explicit guard on `event.target`.
- The shirt-number buffer takes priority over every other single-key binding while it is non-empty, so
  `1` `2` always means "player 12" and never "skill".

---

## 6. Design tokens

Declared once in `src/presentation/styles/_tokens.scss` as CSS custom properties on `:root` and
`[data-theme="dark"]`, then exposed to Tailwind through `tailwind.config.ts`
(`colors: { surface: 'var(--surface)', … }`). **No hard-coded hex value may appear in a component.**

### 6.1 Light theme palette

```css
:root,
[data-theme="light"] {
  /* Surfaces */
  --bg:                #F4F6F9;
  --surface:           #FFFFFF;
  --surface-2:         #E9EDF3;  /* table headers, pad row backgrounds */
  --surface-selected:  #E2ECF6;  /* selected player / skill background  */
  --surface-highlight: #FFF4CC;  /* 150 ms new-event flash              */
  --border:            #C3CCD8;  /* decorative separators only          */
  --border-strong:     #7D8A9B;  /* boundary of interactive components  */

  /* Text */
  --text:              #101720;
  --text-muted:        #45525F;
  --text-inverse:      #FFFFFF;

  /* Accent / focus */
  --accent:            #17588F;
  --on-accent:         #FFFFFF;
  --focus-ring:        #1B4FD8;

  /* Outcome — solid fill + text-on-light + soft chip background */
  --outcome-point:        #0B6E2E;  --outcome-point-soft:    #DCF2E3;
  --outcome-positive:     #17588F;  --outcome-positive-soft: #DEEBF8;
  --outcome-neutral:      #3F4855;  --outcome-neutral-soft:  #E7EAEF;
  --outcome-negative:     #8A5200;  --outcome-negative-soft: #FAEBD2;
  --outcome-error:        #A32019;  --outcome-error-soft:    #FBE3E1;
  --on-outcome:           #FFFFFF;  /* text on any solid outcome fill   */
}
```

### 6.2 Dark theme palette

```css
[data-theme="dark"] {
  --bg:                #0E1319;
  --surface:           #161D26;
  --surface-2:         #202A36;
  --surface-selected:  #1C3247;
  --surface-highlight: #3A3413;
  --border:            #2E3A48;
  --border-strong:     #68788A;

  --text:              #ECF1F7;
  --text-muted:        #A6B4C4;
  --text-inverse:      #0E1319;

  --accent:            #6FB8F2;
  --on-accent:         #0E1319;
  --focus-ring:        #7FA8FF;

  --outcome-point:        #5FD98C;  --outcome-point-soft:    #14331E;
  --outcome-positive:     #6FB8F2;  --outcome-positive-soft: #10293D;
  --outcome-neutral:      #AFBBC9;  --outcome-neutral-soft:  #232C38;
  --outcome-negative:     #F0B44A;  --outcome-negative-soft: #36270B;
  --outcome-error:        #FF8F84;  --outcome-error-soft:    #3A1512;
  --on-outcome:           #0E1319;  /* text on any solid outcome fill   */
}
```

Theme is applied by `data-theme` on `<html>`, written at boot from `localStorage` before React mounts to
avoid a flash. `Come il sistema` follows `prefers-color-scheme`.

### 6.3 Contrast audit — WCAG 2.2 AA

Computed with the WCAG relative-luminance formula. **Threshold: 4.5:1 for body text, 3:1 for large text
(≥ 18.66 px bold / ≥ 24 px) and for non-text UI component boundaries and state indicators.**

**Light theme**

| Foreground | Background | Ratio | Requirement | Verdict |
|---|---|---|---|---|
| `--text` #101720 | `--surface` #FFFFFF | **18.02:1** | 4.5 | ✅ |
| `--text` #101720 | `--bg` #F4F6F9 | **16.64:1** | 4.5 | ✅ |
| `--text` #101720 | `--surface-2` #E9EDF3 | **15.34:1** | 4.5 | ✅ |
| `--text` #101720 | `--surface-selected` #E2ECF6 | **15.07:1** | 4.5 | ✅ |
| `--text` #101720 | `--surface-highlight` #FFF4CC | **16.36:1** | 4.5 | ✅ |
| `--text-muted` #45525F | `--surface` #FFFFFF | **8.00:1** | 4.5 | ✅ |
| `--text-muted` #45525F | `--bg` #F4F6F9 | **7.39:1** | 4.5 | ✅ |
| `--text-muted` #45525F | `--surface-2` #E9EDF3 | **6.81:1** | 4.5 | ✅ |
| `--border-strong` #7D8A9B | `--surface` #FFFFFF | **3.51:1** | 3 (UI) | ✅ |
| `--focus-ring` #1B4FD8 | `--surface` #FFFFFF | **6.65:1** | 3 (UI) | ✅ |
| `--focus-ring` #1B4FD8 | `--bg` #F4F6F9 | **6.14:1** | 3 (UI) | ✅ |
| `--accent` #17588F | `--surface` #FFFFFF | **7.42:1** | 4.5 | ✅ |
| `--on-accent` #FFFFFF | `--accent` #17588F | **7.42:1** | 4.5 | ✅ |
| `--on-outcome` #FFFFFF | point #0B6E2E | **6.39:1** | 4.5 | ✅ |
| `--on-outcome` #FFFFFF | positive #17588F | **7.42:1** | 4.5 | ✅ |
| `--on-outcome` #FFFFFF | neutral #3F4855 | **9.25:1** | 4.5 | ✅ |
| `--on-outcome` #FFFFFF | negative #8A5200 | **6.39:1** | 4.5 | ✅ |
| `--on-outcome` #FFFFFF | error #A32019 | **7.56:1** | 4.5 | ✅ |
| point #0B6E2E | `--bg` #F4F6F9 | **5.91:1** | 3 (UI) | ✅ |
| positive #17588F | `--bg` #F4F6F9 | **6.86:1** | 3 (UI) | ✅ |
| neutral #3F4855 | `--bg` #F4F6F9 | **8.55:1** | 3 (UI) | ✅ |
| negative #8A5200 | `--bg` #F4F6F9 | **5.90:1** | 3 (UI) | ✅ |
| error #A32019 | `--bg` #F4F6F9 | **6.98:1** | 3 (UI) | ✅ |
| point #0B6E2E | point-soft #DCF2E3 | **5.44:1** | 4.5 | ✅ |
| positive #17588F | positive-soft #DEEBF8 | **6.13:1** | 4.5 | ✅ |
| neutral #3F4855 | neutral-soft #E7EAEF | **7.67:1** | 4.5 | ✅ |
| negative #8A5200 | negative-soft #FAEBD2 | **5.44:1** | 4.5 | ✅ |
| error #A32019 | error-soft #FBE3E1 | **6.18:1** | 4.5 | ✅ |

**Dark theme**

| Foreground | Background | Ratio | Requirement | Verdict |
|---|---|---|---|---|
| `--text` #ECF1F7 | `--bg` #0E1319 | **16.42:1** | 4.5 | ✅ |
| `--text` #ECF1F7 | `--surface` #161D26 | **14.94:1** | 4.5 | ✅ |
| `--text` #ECF1F7 | `--surface-2` #202A36 | **12.79:1** | 4.5 | ✅ |
| `--text` #ECF1F7 | `--surface-selected` #1C3247 | **11.58:1** | 4.5 | ✅ |
| `--text` #ECF1F7 | `--surface-highlight` #3A3413 | **11.00:1** | 4.5 | ✅ |
| `--text-muted` #A6B4C4 | `--bg` #0E1319 | **8.84:1** | 4.5 | ✅ |
| `--text-muted` #A6B4C4 | `--surface` #161D26 | **8.04:1** | 4.5 | ✅ |
| `--text-muted` #A6B4C4 | `--surface-2` #202A36 | **6.88:1** | 4.5 | ✅ |
| `--border-strong` #68788A | `--surface` #161D26 | **3.75:1** | 3 (UI) | ✅ |
| `--focus-ring` #7FA8FF | `--bg` #0E1319 | **7.95:1** | 3 (UI) | ✅ |
| `--focus-ring` #7FA8FF | `--surface` #161D26 | **7.23:1** | 3 (UI) | ✅ |
| point #5FD98C | `--surface` #161D26 | **9.52:1** | 4.5 | ✅ |
| positive #6FB8F2 | `--surface` #161D26 | **7.93:1** | 4.5 | ✅ |
| neutral #AFBBC9 | `--surface` #161D26 | **8.70:1** | 4.5 | ✅ |
| negative #F0B44A | `--surface` #161D26 | **9.15:1** | 4.5 | ✅ |
| error #FF8F84 | `--surface` #161D26 | **7.69:1** | 4.5 | ✅ |
| `--on-outcome` #0E1319 | point #5FD98C | **10.47:1** | 4.5 | ✅ |
| `--on-outcome` #0E1319 | positive #6FB8F2 | **8.72:1** | 4.5 | ✅ |
| `--on-outcome` #0E1319 | neutral #AFBBC9 | **9.57:1** | 4.5 | ✅ |
| `--on-outcome` #0E1319 | negative #F0B44A | **10.07:1** | 4.5 | ✅ |
| `--on-outcome` #0E1319 | error #FF8F84 | **8.45:1** | 4.5 | ✅ |
| `--text` #ECF1F7 | point-soft #14331E | **12.15:1** | 4.5 | ✅ |
| point #5FD98C | point-soft #14331E | **7.75:1** | 4.5 | ✅ |
| `--text` #ECF1F7 | positive-soft #10293D | **13.15:1** | 4.5 | ✅ |
| positive #6FB8F2 | positive-soft #10293D | **6.98:1** | 4.5 | ✅ |
| `--text` #ECF1F7 | neutral-soft #232C38 | **12.42:1** | 4.5 | ✅ |
| neutral #AFBBC9 | neutral-soft #232C38 | **7.24:1** | 4.5 | ✅ |
| `--text` #ECF1F7 | negative-soft #36270B | **12.74:1** | 4.5 | ✅ |
| negative #F0B44A | negative-soft #36270B | **7.81:1** | 4.5 | ✅ |
| `--text` #ECF1F7 | error-soft #3A1512 | **14.27:1** | 4.5 | ✅ |
| error #FF8F84 | error-soft #3A1512 | **7.34:1** | 4.5 | ✅ |

`--border` (#C3CCD8 light, 1.62:1; #2E3A48 dark, 1.47:1) is **purely decorative** — table rules and card
separators. It must never be the only boundary of an interactive control; every button, input, select and
player chip uses `--border-strong` or a filled background. This is a lint-level review rule.

A Vitest unit test (`tokens.contrast.test.ts`) re-computes every pair in the two tables above from the
token file and fails the build if any ratio drops below its threshold.

### 6.4 Non-colour redundant indicators (mandatory)

Every outcome renders as `icon + letter + label`. The letter is uppercase, the icon is a distinct **shape**,
not just a distinct colour, and both are present in the pad, the event log, the court and every table.

| Outcome | Italian label | Letter | Icon / shape | Also |
|---|---|---|---|---|
| `point` | `Punto` | **P** | ▲ filled triangle pointing up | Bold row in the event log |
| `positive` | `Positivo` | **+** | ● filled circle | — |
| `neutral` | `Neutro` | **=** | ◆ outlined diamond | — |
| `negative` | `Negativo` | **−** | ■ filled square | — |
| `error` | `Errore` | **E** | ✖ cross | Bold row, `--outcome-error-soft` background |
| `opponent_point` | `Punto avversario` | **A** | ▼ filled triangle pointing down | — |

Serving team: ⚐ flag glyph plus the text `Al servizio` (never the colour alone).
Won set in the set counter: ✔ plus bold weight.
Selected player: 3 px `--accent` border **plus** a ✔ badge **plus** `--surface-selected`.

### 6.5 Type scale

`font-family: "Inter", "Segoe UI", system-ui, sans-serif;` bundled locally (no network).
`font-variant-numeric: tabular-nums` globally on `.num`, all scores, tables and shirt numbers.

| Token | px / line-height | Weight | Use |
|---|---|---|---|
| `--fs-score` | 72 / 1.0 (88 at 1920) | 800 | The two set scores |
| `--fs-display` | 40 / 1.1 | 700 | Final result on Riepilogo |
| `--fs-h1` | 32 / 1.2 | 700 | Screen titles |
| `--fs-h2` | 24 / 1.25 | 600 | Section titles, set counter |
| `--fs-h3` | 20 / 1.3 | 600 | Card titles, skill buttons |
| `--fs-body-lg` | 18 / 1.45 | 400 | Live panels, event log, player names |
| `--fs-body` | 16 / 1.5 | 400 | Default body, forms, tables |
| `--fs-small` | 14 / 1.45 | 400 | Captions, helper text — **the smallest size in the app** |
| `--fs-shirt` | 28 / 1.0 | 700 | Shirt number on `PlayerChip` and `CourtGrid` |

### 6.6 Spacing, radii, elevation, focus

```css
:root {
  --sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px; --sp-4: 16px;
  --sp-5: 24px; --sp-6: 32px; --sp-7: 48px; --sp-8: 64px;

  --radius-sm: 4px;   /* badges, letter chips            */
  --radius-md: 8px;   /* buttons, inputs, player chips   */
  --radius-lg: 12px;  /* cards, panels                   */
  --radius-xl: 16px;  /* dialogs                         */
  --radius-full: 999px;

  --shadow-1: 0 1px 2px rgb(16 23 32 / .08);            /* cards        */
  --shadow-2: 0 8px 24px rgb(16 23 32 / .18);           /* dialogs      */

  --focus-ring-width: 3px;
  --focus-ring-offset: 2px;

  --hit-min: 44px;        /* everywhere        */
  --hit-live: 64px;       /* Scout live        */
}
```

Focus style, applied globally and never removed:

```css
:where(a, button, [role="button"], [role="gridcell"], input, select, textarea, [tabindex]):focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
  border-radius: inherit;
}
```

Dark-mode shadows use `rgb(0 0 0 / .45)` and `.6`; in dark theme elevation is additionally carried by
`--surface-2`, because shadow alone is not perceivable.

---

## 7. Component inventory

Styling rule from `00-product-plan.md` §7: **Tailwind** for layout, spacing, responsive and simple states;
**SCSS Modules** for complex internals, animation and theme primitives. Never both for the same property.

| Component | Styling | Props contract sketch |
|---|---|---|
| `Button` | **Tailwind only** | `{ variant: 'primary' \| 'secondary' \| 'ghost' \| 'danger'; size: 'md' \| 'lg' \| 'live'; fullWidth?: boolean; loading?: boolean; leadingIcon?: ReactNode; disabled?: boolean; onClick; children }` — `live` = 64 px tall, `--fs-h3`. |
| `IconButton` | **Tailwind only** | `{ icon: ReactNode; label: string /* required, becomes aria-label */; variant: 'ghost' \| 'danger'; size: 'md' \| 'lg'; onClick }` |
| `Card` | **Tailwind only** | `{ title?: string; actions?: ReactNode; padding?: 'none' \| 'md' \| 'lg'; children }` |
| `Dialog` | **SCSS Module** — backdrop, elevation, enter/exit, reduced-motion, focus-trap styling | `{ open: boolean; title: string; description?: string; size: 'sm' \| 'md' \| 'lg'; onClose: () => void; dismissible?: boolean /* default true */; footer: ReactNode; children }` — built on Radix `Dialog` primitive. |
| `Toast` / `ToastProvider` | **SCSS Module** — stacking, timing, reduced-motion | `{ tone: 'info' \| 'success' \| 'warning' \| 'error'; message: string; action?: { label: string; onClick: () => void }; durationMs?: number /* default 5000, 0 = persistent */ }` |
| `Select` | **SCSS Module** — listbox popup, option states, scroll | `{ value: T; options: Array<{ value: T; label: string; disabled?: boolean }>; onChange: (v: T) => void; label: string; error?: string; disabled?: boolean }` — Radix `Select` primitive. |
| `NumberField` | **Tailwind only** | `{ value: number \| ''; min?: number; max?: number; step?: number; label: string; error?: string; onChange: (v: number \| '') => void }` — stepper buttons are `IconButton`s, 44 px. |
| `TextField` | **Tailwind only** | `{ value: string; label: string; error?: string; required?: boolean; placeholder?: string; onChange }` |
| `PlayerChip` | **SCSS Module** — selected/serving/unavailable composite states, badge positioning | `{ player: Player; selected?: boolean; serving?: boolean; disabled?: boolean; size: 'sm' \| 'md' \| 'live'; showRole?: boolean; onSelect?: (id: PlayerId) => void }` |
| `ScoreDisplay` | **SCSS Module** — fluid `clamp()` digit sizing, tabular alignment, serving marker | `{ ourPoints: number; theirPoints: number; ourName: string; theirName: string; serving: 'us' \| 'them'; size: 'live' \| 'summary' }` |
| `SetCounter` | **Tailwind only** | `{ sets: Array<{ index: number; ourPoints: number; theirPoints: number; status: 'pending' \| 'live' \| 'done'; winner?: 'us' \| 'them' }>; currentIndex: number }` |
| `CourtGrid` | **SCSS Module** — 2×3 court geometry, net line, position labels, serving marker | `{ lineup: Lineup; players: Record<PlayerId, Player>; servingPosition?: CourtPosition; selectedPlayerId?: PlayerId; mode: 'display' \| 'assign'; onSelectPlayer?: (id: PlayerId) => void; onSelectPosition?: (p: CourtPosition) => void }` |
| `ActionPad` | **SCSS Module** — three-row layout, step disabling, selection visuals | `{ players: Player[]; enabledSkills: Skill[]; state: PadState; onSelectPlayer; onSelectSkill; onSelectOutcome; onCancel }` |
| `OutcomeBadge` | **Tailwind only** | `{ outcome: Outcome; variant: 'solid' \| 'soft'; showLabel?: boolean }` — renders icon + letter + optional label. |
| `EventList` | **Tailwind only** (rows) + `OutcomeBadge` | `{ events: ScoutEventView[]; onEdit?: (id) => void; onDelete?: (id) => void; maxRows?: number; highlightId?: EventId }` |
| `StatTable` | **SCSS Module** — sticky header, zebra rows, numeric column alignment | `{ columns: Array<{ key: string; label: string; align: 'left' \| 'right'; sortable?: boolean }>; rows: Row[]; sortBy?: string; sortDir?: 'asc' \| 'desc'; onSort?: (key: string) => void; caption: string }` |
| `EmptyState` | **Tailwind only** | `{ variant: 'empty' \| 'error' \| 'filtered'; icon?: ReactNode; title: string; description?: string; action?: { label: string; onClick: () => void } }` |
| `SkeletonRow` / `SkeletonBlock` | **SCSS Module** — shimmer, disabled under reduced motion | `{ rows?: number; height?: number }` |
| `StepIndicator` | **Tailwind only** | `{ steps: string[]; current: number }` |
| `ConfirmDialog` | **Tailwind only** (composes `Dialog`) | `{ open; title: string; message: string; confirmLabel: string; cancelLabel?: string /* default 'Annulla' */; tone?: 'default' \| 'danger'; onConfirm; onCancel }` |
| `LiveRegion` | **no styling** (visually hidden utility) | `{ politeness: 'polite' \| 'assertive'; message: string }` |
| `ShortcutHelp` | **Tailwind only** (composes `Dialog`) | `{ open; onClose }` — renders the §5 tables. |
| `AppShell` / `Sidebar` | **SCSS Module** — collapsed live variant, theme surfaces | `{ collapsed: boolean; children }` |

Rule of thumb for reviewers: if a component's stylesheet would only contain Tailwind-expressible utilities
(`flex`, padding, gap, `hover:`, `disabled:`), it must not have an SCSS Module.

---

## 8. Accessibility checklist

Target: **WCAG 2.2 AA**. Verified with `@axe-core/react` in dev, `vitest-axe` in the component suite, and a
manual keyboard-only pass per screen in `docs/07-qa-scenarios.md`.

### 8.1 Focus order per screen

| Screen | Focus order on entry |
|---|---|
| Home | `Riprendi partita` (or `Nuova partita` when absent) → the three cards → sidebar. |
| Nuova partita | `Squadra di casa` → fields in visual order → `Annulla` → `Avanti`. |
| Gestione roster | `Aggiungi giocatore` → template controls → table rows (each row: edit, delete) → `Indietro` → `Avanti`. |
| Configurazione sestetto | First bench `PlayerChip` → court positions P1…P6 in that order → `Svuota sestetto` → `Inizia partita`. |
| Scout live | Player row (roving tabindex, first chip) → skill row → outcome row → `Annulla azione` → express buttons → `Termina set` → court → event list → sidebar. `Annulla azione` is reachable with a single `Maiusc+Tab` from the outcome row. |
| Statistiche live | Set selector → sort control → table → `Chiudi`. |
| Riepilogo finale | `Esporta PDF` → other exports → set table → player table → `Torna alla home`. |
| Archivio partite | Search field → filters → first row → row actions → `Importa partita`. |
| Impostazioni | Theme radio group → defaults → checkboxes → `Apri cartella`. |

After any commit on the live screen, focus **returns to the player row and never to `document.body`**.
After a dialog closes, focus returns to the element that opened it.

### 8.2 ARIA — action pad

```html
<section aria-labelledby="pad-title" aria-describedby="pad-step">
  <h2 id="pad-title">Azione</h2>
  <p id="pad-step">Passo 2 di 3: scegli il fondamentale.</p>

  <div role="radiogroup" aria-label="Giocatore" aria-required="true">
    <button role="radio" aria-checked="true"  tabindex="0">9 Ferri</button>
    <button role="radio" aria-checked="false" tabindex="-1">4 Bianchi</button>
  </div>

  <div role="radiogroup" aria-label="Fondamentale" aria-disabled="false"> … </div>

  <div role="radiogroup" aria-label="Esito">
    <button role="radio" aria-checked="false" tabindex="-1">Punto</button>
    <button role="radio" aria-checked="false" tabindex="-1"
            aria-disabled="true"
            aria-description="Esito non previsto per questo fondamentale.">Neutro</button>
  </div>
</section>
```

Roving tabindex inside each `radiogroup`; `←`/`→` move, `Home`/`Fine` jump to the ends.
Disabled outcomes keep `aria-disabled` (not the `disabled` attribute) so screen readers still announce
*why* they are unavailable.

### 8.3 ARIA — court

```html
<div role="grid" aria-label="Campo, rotazione 3" aria-rowcount="2" aria-colcount="3">
  <div role="row">
    <div role="gridcell" aria-label="Posizione 4, numero 4, Luca Bianchi" tabindex="-1"> … </div>
    <div role="gridcell" aria-label="Posizione 3, numero 7, Andrea Verdi" tabindex="-1"> … </div>
    <div role="gridcell" aria-label="Posizione 2, numero 9, Giulio Ferri" tabindex="-1"> … </div>
  </div>
  <div role="row">
    <div role="gridcell" aria-label="Posizione 5, numero 11, Marco Gialli" tabindex="-1"> … </div>
    <div role="gridcell" aria-label="Posizione 6, numero 12, Paolo Neri, libero" tabindex="-1"> … </div>
    <div role="gridcell" aria-label="Posizione 1, numero 1, Marco Rossi, al servizio"
         aria-selected="true" tabindex="0"> … </div>
  </div>
</div>
```

An empty slot in `assign` mode is `aria-label="Posizione 6, libera"`. Arrow keys move between cells,
`Invio`/`Spazio` selects.

### 8.4 Live regions and announcements

Two regions, both visually hidden, both mounted once in `AppShell`:

- `#live-score` — `aria-live="polite"`, `aria-atomic="true"`. Score, rotation and serve changes.
- `#live-alerts` — `aria-live="assertive"`, `role="alert"`. Errors, blocked actions, save failures.

Announcement text (final Italian, `{}` are substitutions):

| Trigger | Region | Testo annunciato |
|---|---|---|
| Point for us | polite | `Punto nostro. {our} {ourPoints}, {their} {theirPoints}. Al servizio: noi.` |
| Point for them | polite | `Punto avversario. {our} {ourPoints}, {their} {theirPoints}. Al servizio: avversari.` |
| Rated non-terminal action | polite | `{shirt} {name}, {skill}, {outcome}.` |
| Rotation change | polite | `Rotazione effettuata. Al servizio il numero {shirt}.` |
| Undo | polite | `Azione annullata. {our} {ourPoints}, {their} {theirPoints}.` |
| Set point reached | polite | `Set point per noi.` / `Set point per gli avversari.` |
| Set won | polite | `Set {n} terminato. {our} {a}, {their} {b}. Set vinti: {x} a {y}.` |
| Match over | polite | `Partita terminata. {our} {x}, {their} {y}.` |
| Time-out | polite | `Time-out {nostro\|avversario}.` |
| Substitution | polite | `Cambio: entra {inShirt} {inName}, esce {outShirt} {outName}.` |
| Impossible outcome | assertive | `Esito non disponibile per {skill}.` |
| Unknown shirt number | assertive | `Nessun giocatore con il numero {n}.` |
| Save failure | assertive | `Salvataggio non riuscito. I dati restano in memoria.` |

Announcements are debounced at 250 ms so a fast sequence does not queue a backlog; only the latest score
state is ever announced.

### 8.5 Dialogs

Radix `Dialog` with `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on the title and
`aria-describedby` on the body. Focus moves to the dialog on open — to the **least destructive** button
(`Annulla`) for danger dialogs, to the primary button otherwise. `Tab` cycles inside; `Esc` closes any
dismissible dialog. Background content gets `inert`. On close, focus returns to the trigger. Never more
than one dialog at a time: a second request queues.

### 8.6 Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Skeleton shimmer becomes a flat `--surface-2` block. Toasts appear instantly. The 150 ms event-flash stays
(it is a colour change, not motion) but is shortened to 0 ms and replaced by a persistent 2 px
`--accent` left border on the newest row. The Scout live screen has no motion to begin with (§P3).

### 8.7 High contrast and zoom

- `@media (forced-colors: active)`: all custom backgrounds/borders are dropped in favour of system colours
  (`ButtonText`, `Canvas`, `Highlight`); selected state adds `forced-color-adjust: none` only on the
  outcome **icon**, so shape and letter survive. Every state that relies on a background gains a visible
  1px `solid currentColor` border in this mode. Focus ring becomes `outline: 3px solid Highlight`.
- `prefers-contrast: more` swaps `--text-muted` to `--text`, `--border` to `--border-strong`, and raises
  every outcome fill to its darkest (light) / lightest (dark) variant.
- Layout must survive **200 % zoom** at 1366×768 without loss of function: at that scale the live screen
  falls back to the < 1280 px layout (court + pad, events in a drawer). No content is clipped and nothing
  requires two-dimensional scrolling. Text is never in a fixed-height container that clips at 200 %.
- No content relies on hover alone: every tooltip's content is also available as visible text or via
  `aria-description`.

---

## 9. Italian copy sheet

Single source of truth. Formal-neutral register, buttons in the imperative, no exclamation marks, no
"prego", no emoji in copy. `{}` marks a runtime substitution.

### 9.1 Navigation and screen titles

| Key | Testo |
|---|---|
| `nav.home` | `Home` |
| `nav.newMatch` | `Nuova partita` |
| `nav.archive` | `Archivio partite` |
| `nav.settings` | `Impostazioni` |
| `screen.home.title` | `Volley Scout` |
| `screen.home.subtitle` | `Raccolta dati partita, offline.` |
| `screen.newMatch.title` | `Nuova partita` |
| `screen.roster.title` | `Rosa` |
| `screen.lineup.title` | `Sestetto iniziale — Set {n}` |
| `screen.live.title` | `Scout live` |
| `screen.stats.title` | `Statistiche live` |
| `screen.summary.title` | `Riepilogo partita` |
| `screen.archive.title` | `Archivio partite` |
| `screen.settings.title` | `Impostazioni` |
| `steps.label` | `Passo {n} di 3` |
| `steps.names` | `Dati partita` · `Rosa` · `Sestetto` |

### 9.2 Generic buttons

| Key | Testo |
|---|---|
| `action.save` | `Salva` |
| `action.cancel` | `Annulla` |
| `action.back` | `Indietro` |
| `action.next` | `Avanti` |
| `action.close` | `Chiudi` |
| `action.delete` | `Elimina` |
| `action.edit` | `Modifica` |
| `action.confirm` | `Conferma` |
| `action.retry` | `Riprova` |
| `action.add` | `Aggiungi` |
| `action.open` | `Apri` |
| `action.clearFilters` | `Azzera filtri` |
| `action.backToHome` | `Torna alla home` |
| `action.backToArchive` | `Torna all'archivio` |

### 9.3 Match setup, roster, lineup

| Key | Testo |
|---|---|
| `match.homeTeam` | `Squadra di casa` |
| `match.awayTeam` | `Squadra ospite` |
| `match.date` | `Data` |
| `match.time` | `Ora` |
| `match.competition` | `Competizione` |
| `match.venue` | `Luogo` |
| `match.ourSide` | `La nostra squadra è:` |
| `match.sideHome` | `Casa` |
| `match.sideAway` | `Ospite` |
| `match.format` | `Formato` |
| `match.bestOf5` | `Al meglio dei 5` |
| `match.bestOf3` | `Al meglio dei 3` |
| `match.pointsPerSet` | `Punti per set` |
| `match.tieBreakPoints` | `Punti al tie-break` |
| `match.winByTwo` | `Vittoria con due punti di scarto` |
| `match.firstServe` | `Primo servizio` |
| `match.serveUs` | `Nostro` |
| `match.serveThem` | `Avversario` |
| `match.ourCourt` | `Nostro campo` |
| `match.left` / `match.right` | `Sinistra` / `Destra` |
| `match.notes` | `Note` |
| `roster.players` | `Giocatori ({n})` |
| `roster.addPlayer` | `Aggiungi giocatore` |
| `roster.newPlayer` | `Nuovo giocatore` |
| `roster.savePlayer` | `Salva giocatore` |
| `roster.shirtNumber` | `Numero` |
| `roster.fullName` | `Nome e cognome` |
| `roster.role` | `Ruolo` |
| `roster.isLibero` | `Libero` |
| `roster.isAvailable` | `Disponibile` |
| `roster.template` | `Modello roster` |
| `roster.loadTemplate` | `Carica modello` |
| `roster.saveTemplate` | `Salva modello` |
| `roster.deleteTemplate` | `Elimina modello` |
| `role.setter` … | `Palleggiatore` · `Opposto` · `Schiacciatore` · `Centrale` · `Libero` |
| `lineup.court` | `Campo (vista dalla panchina)` |
| `lineup.available` | `Giocatori disponibili` |
| `lineup.emptySlot` | `Posizione libera` |
| `lineup.position` | `Posizione {n}` |
| `lineup.hint` | `Tocca un giocatore, poi una posizione libera.` |
| `lineup.clear` | `Svuota sestetto` |
| `lineup.startMatch` | `Inizia partita` |
| `lineup.startSet` | `Inizia set {n}` |
| `lineup.editLineup` | `Modifica sestetto` |

### 9.4 Live screen

| Key | Testo |
|---|---|
| `live.setInProgress` | `Set {n} · in corso` |
| `live.setsWon` | `Set vinti: {n}` |
| `live.serving` | `Al servizio` |
| `live.court` | `Campo — rotazione {n}` |
| `live.action` | `Azione` |
| `live.step1` | `1 · Giocatore` |
| `live.step2` | `2 · Fondamentale` |
| `live.step3` | `3 · Esito` |
| `live.cancelSelection` | `Annulla selezione` |
| `live.numberBuffer` | `Numero: {digits}` |
| `live.recentEvents` | `Ultime azioni` |
| `live.allEvents` | `Tutte` |
| `live.noEvents` | `Nessuna azione registrata.` |
| `live.padHint` | `Seleziona un giocatore, poi il fondamentale, poi l'esito.` |
| `live.undo` | `Annulla azione` |
| `live.redo` | `Ripristina azione` |
| `live.expressOurPoint` | `Punto nostro` |
| `live.expressTheirPoint` | `Punto avversario` |
| `live.expressOurError` | `Errore nostro` |
| `live.timeout` | `Time-out` |
| `live.timeoutUs` | `Time-out nostro` |
| `live.timeoutThem` | `Time-out avversario` |
| `live.timeoutsCount` | `Time-out  N {a} · A {b}` |
| `live.substitution` | `Cambio` |
| `live.substitutionsCount` | `Cambi  N {a} · A {b}` |
| `live.endSet` | `Termina set` |
| `live.endMatch` | `Termina partita` |
| `live.stats` | `Statistiche` |
| `live.restoring` | `Ripristino della partita…` |
| `skill.serve` | `Battuta` |
| `skill.reception` | `Ricezione` |
| `skill.attack` | `Attacco` |
| `skill.block` | `Muro` |
| `skill.dig` | `Difesa` |
| `skill.set` | `Alzata` |
| `outcome.point` | `Punto` |
| `outcome.positive` | `Positivo` |
| `outcome.neutral` | `Neutro` |
| `outcome.negative` | `Negativo` |
| `outcome.error` | `Errore` |
| `substitution.out` | `Esce` |
| `substitution.in` | `Entra` |
| `substitution.title` | `Cambio giocatore` |

### 9.5 Statistics and summary

| Key | Testo |
|---|---|
| `stats.team` | `Squadra` |
| `stats.players` | `Giocatori` |
| `stats.totalMatch` | `Totale partita` |
| `stats.set` | `Set {n}` |
| `stats.pointsScored` | `Punti fatti` |
| `stats.ourErrors` | `Errori nostri` |
| `stats.opponentPoints` | `Punti avversario` |
| `stats.attackEfficiency` | `Efficienza attacco` |
| `stats.receptionPositivity` | `Positività ricezione` |
| `stats.sortBy` | `Ordina per` |
| `stats.noData` | `Nessun dato disponibile per questo set.` |
| `col.number` | `N.` |
| `col.player` | `Giocatore` |
| `col.role` | `Ruolo` |
| `col.points` | `Punti` |
| `col.attack` | `Att.` |
| `col.block` | `Muri` |
| `col.ace` | `Ace` |
| `col.errors` | `Err.` |
| `col.receptionPositive` | `Ric. pos.` |
| `col.duration` | `Durata` |
| `summary.result` | `{our} {a} – {b} {their}` |
| `summary.setsTable` | `Set` |
| `summary.us` / `summary.them` | `Noi` / `Loro` |
| `summary.playerStats` | `Statistiche giocatori — {scope}` |
| `summary.trend` | `Andamento per set` |
| `summary.noEventsInSet` | `Nessuna azione registrata in questo set.` |
| `export.pdf` | `Esporta PDF` |
| `export.xlsx` | `Esporta XLSX` |
| `export.json` | `Esporta JSON` |
| `export.running` | `Esportazione in corso…` |
| `import.json` | `Importa partita` |

### 9.6 Archive and settings

| Key | Testo |
|---|---|
| `archive.search` | `Cerca` |
| `archive.season` | `Stagione` |
| `archive.result` | `Esito` |
| `archive.all` | `Tutti` |
| `archive.count` | `{n} partite` |
| `archive.countOne` | `1 partita` |
| `archive.match` | `Partita` |
| `archive.score` | `Risultato` |
| `archive.status` | `Stato` |
| `status.finished` | `Terminata` |
| `status.live` | `In corso` |
| `status.setup` | `Da configurare` |
| `status.corrupt` | `File danneggiato` |
| `archive.restore` | `Ripristina` |
| `settings.appearance` | `Aspetto` |
| `settings.theme` | `Tema` |
| `theme.light` | `Chiaro` |
| `theme.dark` | `Scuro` |
| `theme.system` | `Come il sistema` |
| `settings.defaults` | `Valori predefiniti` |
| `settings.ourTeamName` | `Nome della nostra squadra` |
| `settings.dataCollection` | `Raccolta dati` |
| `settings.trackSets` | `Registra le alzate` |
| `settings.confirmEndMatch` | `Chiedi conferma prima di terminare la partita` |
| `settings.confirmUndo` | `Chiedi conferma prima di annullare un'azione` |
| `settings.shortcutsEnabled` | `Scorciatoie da tastiera attive` |
| `settings.data` | `Dati` |
| `settings.dataFolder` | `Cartella dati` |
| `settings.openFolder` | `Apri cartella` |
| `settings.manageTemplates` | `Gestisci modelli roster` |
| `settings.shortcuts` | `Scorciatoie da tastiera` |
| `settings.showShortcuts` | `Mostra` |

### 9.7 Dialogs

| Key | Titolo | Testo | Pulsanti |
|---|---|---|---|
| `dialog.resumeConflict` | `Partita in corso` | `Esiste già una partita non terminata. Creandone una nuova, quella in corso resterà nell'archivio come non terminata.` | `Annulla` · `Crea comunque` |
| `dialog.setEnd` | `Set {n} terminato` | `{our} {a} – {b} {their}. Set vinti: {x} – {y}. Il prossimo set inizia con il sestetto attuale.` | `Modifica sestetto` · `Inizia set {n+1}` |
| `dialog.matchEnd` | `Fine partita` | `{our} {x} – {y} {their}. La partita è terminata.` | `Resta qui` · `Vai al riepilogo` |
| `dialog.confirmEndMatch` | `Terminare la partita?` | `{our} {x} – {y} {their}. Dopo la conferma non sarà più possibile registrare azioni.` | `Annulla` · `Termina partita` |
| `dialog.confirmUndo` | `Annullare l'ultima azione?` | `Verrà rimossa: {eventDescription}.` | `Annulla` · `Annulla azione` |
| `dialog.confirmDeleteEvent` | `Eliminare l'azione?` | `L'azione verrà rimossa e punteggio e rotazione saranno ricalcolati.` | `Annulla` · `Elimina` |
| `dialog.confirmDeletePlayer` | `Eliminare il giocatore?` | `{shirt} {name} verrà rimosso dalla rosa di questa partita.` | `Annulla` · `Elimina` |
| `dialog.confirmDeleteMatch` | `Eliminare la partita?` | `{our} – {their} del {date} verrà eliminata definitivamente. L'operazione non può essere annullata.` | `Annulla` · `Elimina` |
| `dialog.confirmDeleteTemplate` | `Eliminare il modello?` | `Il modello «{name}» verrà eliminato definitivamente.` | `Annulla` · `Elimina` |
| `dialog.unsavedOnClose` | `Chiudere l'applicazione?` | `Sono presenti modifiche non ancora salvate. Chiudendo ora potrebbero andare perse.` | `Annulla` · `Chiudi comunque` |
| `dialog.recovery` | `Ripristino dati` | `Il file di una partita non è leggibile. È stato messo da parte per sicurezza. È possibile continuare senza quella partita.` | `Continua` · `Apri cartella dati` |
| `dialog.substitution` | `Cambio giocatore` | `Seleziona il giocatore che esce e quello che entra.` | `Annulla` · `Conferma cambio` |
| `dialog.timeout` | `Time-out` | `Di quale squadra è il time-out?` | `Nostro` · `Avversario` |
| `dialog.shortcuts` | `Scorciatoie da tastiera` | — | `Chiudi` |

### 9.8 Toasts

| Key | Tono | Testo | Azione |
|---|---|---|---|
| `toast.matchSaved` | success | `Partita salvata.` | — |
| `toast.settingsSaved` | success | `Impostazioni salvate.` | — |
| `toast.templateSaved` | success | `Modello salvato.` | — |
| `toast.playerAdded` | success | `Giocatore aggiunto.` | — |
| `toast.eventUndone` | info | `Azione annullata.` | `Ripristina` |
| `toast.eventDeleted` | info | `Azione eliminata.` | `Ripristina` |
| `toast.exportDone` | success | `File esportato.` | `Apri cartella` |
| `toast.importDone` | success | `Partita importata.` | — |
| `toast.timeoutLimit` | warning | `Time-out già esauriti per questo set.` | — |
| `toast.substitutionLimit` | warning | `Limite di cambi raggiunto per questo set.` | — |
| `toast.noSetRunning` | warning | `Nessun set in corso.` | — |
| `toast.matchFinished` | warning | `La partita è terminata.` | — |
| `toast.nothingToUndo` | info | `Nessuna azione da annullare.` | — |
| `toast.saveFailed` | error | `Salvataggio non riuscito. I dati restano in memoria.` | `Riprova` |
| `toast.exportFailed` | error | `Esportazione non riuscita.` | `Riprova` |
| `toast.importFailed` | error | `File non valido. Importazione annullata.` | — |
| `toast.templateSaveFailed` | error | `Impossibile salvare il modello.` | `Riprova` |
| `toast.settingsSaveFailed` | error | `Impossibile salvare le impostazioni.` | — |

### 9.9 Validation and error messages

| Key | Testo |
|---|---|
| `error.required` | `Campo obbligatorio.` |
| `error.teamNameRequired` | `Inserisci il nome della squadra.` |
| `error.teamNamesEqual` | `Le due squadre devono avere nomi diversi.` |
| `error.dateRequired` | `Inserisci la data della partita.` |
| `error.dateInvalid` | `Data non valida.` |
| `error.playerNameRequired` | `Inserisci nome e cognome.` |
| `error.shirtRequired` | `Inserisci il numero di maglia.` |
| `error.shirtRange` | `Il numero di maglia deve essere compreso tra 1 e 99.` |
| `error.shirtDuplicate` | `Numero di maglia già assegnato.` |
| `error.rosterTooSmall` | `Servono almeno sei giocatori per iniziare.` |
| `error.lineupIncomplete` | `Seleziona sei giocatori per iniziare.` |
| `error.pointsRange` | `I punti per set devono essere compresi tra 15 e 30.` |
| `error.templateNameRequired` | `Assegna un nome al modello.` |
| `error.templateNameDuplicate` | `Esiste già un modello con questo nome.` |
| `error.outcomeNotAvailable` | `Esito non previsto per questo fondamentale.` |
| `error.outcomeNotAvailableFor` | `Esito non disponibile per {skill}.` |
| `error.playerNotFound` | `Nessun giocatore con il numero {n}.` |
| `error.readStorage` | `Impossibile leggere i dati salvati.` |
| `error.readArchive` | `Impossibile leggere l'archivio.` |
| `error.openMatch` | `Impossibile aprire la partita.` |
| `error.computeStats` | `Impossibile calcolare le statistiche.` |
| `error.unexpected` | `Si è verificato un errore imprevisto.` |
| `error.unexpectedBody` | `L'applicazione può continuare. Se il problema si ripete, riavvia il programma.` |

### 9.10 Empty and loading states

| Key | Testo |
|---|---|
| `empty.noMatches.title` | `Nessuna partita registrata` |
| `empty.noMatches.body` | `Crea la prima partita per iniziare a raccogliere i dati.` |
| `empty.archive.title` | `Archivio vuoto` |
| `empty.archive.body` | `Le partite terminate compaiono qui.` |
| `empty.filtered` | `Nessun risultato per questa ricerca.` |
| `empty.roster.title` | `Nessun giocatore in rosa` |
| `empty.roster.body` | `Aggiungi i giocatori uno a uno oppure carica un modello salvato.` |
| `empty.bench` | `Nessun giocatore disponibile` |
| `loading.data` | `Caricamento dati…` |
| `loading.match` | `Caricamento partita…` |
| `loading.restoring` | `Ripristino della partita…` |
| `loading.exporting` | `Esportazione in corso…` |

---

## 10. Implementation gates

1. No hex colour outside `_tokens.scss`; `tokens.contrast.test.ts` re-verifies every pair in §6.3.
2. No user-visible string outside `src/shared/copy/it.ts`; an ESLint rule forbids literal strings in JSX.
3. Every interactive element ≥ 44 px (≥ 64 px on Scout live) — asserted in the component test suite.
4. Click budget from §4.6 asserted by integration tests counting `userEvent.click` calls.
5. `vitest-axe` returns zero violations on every screen in both themes.
6. A keyboard-only run of the live loop (`9 A P`, `Spazio`, `X`, `Ctrl+Z`) is part of `07-qa-scenarios.md`.
