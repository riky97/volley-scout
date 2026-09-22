# Manual QA scenarios

Automated tests cover the rules, the statistics and the critical components. These scenarios cover
what only a human at the keyboard can check: that the app is usable during a real match, and that
data survives real accidents.

Run them against the packaged desktop build (`npm run tauri:build`), not the browser dev server,
unless a scenario says otherwise.

## S1 — First match, end to end (acceptance criteria 1–5, 11)

1. Home → Nuova partita. Fill teams, date, best of 5, 25 points, tie-break 15.
2. Add 8 players, one of them flagged libero, one marked unavailable.
3. Set the starting six, confirm who serves, start set 1.
4. Record at least: an ace, a kill, an attack error, a positive reception, a block point, an
   opponent point, a timeout and a substitution.
5. Check after every action: score, serving indicator, rotation and the court all agree.
6. Drive the set to 25 and confirm the set-end dialog; open set 2 and finish the match.

**Expected**: the score never disagrees with the event log; the match ends with the right winner.

## S2 — Click budget (UX requirement)

With a player and skill already chosen, a rated action takes 3 clicks; `Punto nostro`,
`Punto avversario` and `Errore nostro` take 1. Time a set: recording should never interrupt the
operator's view of the court.

## S3 — Keyboard only

Complete a whole set without touching the mouse, using the shortcuts in `docs/03-ux-flows.md` §5.
Check that `1` `2` selects player 12 (never the skill bound to `1`), that `Esc` steps back one
level, and that no shortcut fires while a text field has focus.

## S4 — Undo and correction (criterion 6)

1. Record 10 actions, undo the last one, check score, serve and rotation return exactly.
2. Undo a `set_end` right after confirming it: the set reopens with its score intact.
3. Delete an action from the middle of the log: the confirmation states how many later actions are
   affected, and the score afterwards is recomputed consistently.
4. Delete an action that decided a finished set: the set reopens with a visible warning.

## S5 — Autosave and crash (criteria 7, 8, 9)

1. Record 20 actions.
2. Kill the app from Task Manager ("End task") — do **not** close it normally.
3. Reopen: Home offers **Riprendi partita** and no scored rally is missing.
4. Repeat closing the window with the X button while a save is in flight: nothing is lost.

## S6 — New match does not destroy the old one

With an unfinished match, start a new one. The confirmation must state that the previous match stays
in the archive, and it must still be there afterwards, resumable.

## S7 — Corrupt data (criterion 8)

1. Close the app. In the data folder, truncate a match JSON file halfway.
2. Reopen the app and the archive.

**Expected**: a clear Italian message, the damaged file renamed to `*.corrupt-*.json` (never
deleted), and the rest of the app fully usable.

## S8 — Export (criterion 12)

From the summary export PDF, XLSX and JSON.

- The file name is `scout_<Squadra>_<Avversario>_<AAAA-MM-GG>` with no accents or spaces.
- The PDF prints on A4 without clipped columns.
- The XLSX has the sheets Riepilogo, Giocatori, Statistiche, Eventi plus one per set.
- Percentages show one decimal, `N/D` where the denominator is zero, and negative attack efficiency
  keeps its minus sign.
- Re-import the JSON: the match comes back identical.

## S9 — Offline (criterion 13)

Disable every network interface, then run S1 and S8 from start to finish. Nothing may fail, and no
request may appear in the network tab of the dev tools.

## S10 — Accessibility

- Tab through every screen: focus is always visible and the order is sensible.
- Set the OS to high contrast: no control becomes invisible.
- Zoom to 200%: nothing overlaps and the live screen stays usable.
- Check in greyscale that outcomes are still distinguishable (letter and shape, not just colour).
- Switch light/dark from Impostazioni and confirm the whole app follows.

## S11 — Long deuce and tie-break

Take a set to 30-28 and a tie-break to 18-16. The scoreboard must not reflow with two-digit scores,
and the set must close only at a two-point margin.

## S12 — Rotation truth check

Stop at a random moment and compare the on-screen court with the real one. After a side-out in our
favour, the player who started in P2 must be the one serving.
