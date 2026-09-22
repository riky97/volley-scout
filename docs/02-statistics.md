# Volley Scout — Statistics Specification

> Phase 1 / P1.3. Companion to [01-domain-model.md](01-domain-model.md). Binding contract for
> `src/domain/statistics/`. All identifiers English; Italian only in the label column of §7.
> Statistics are a **pure fold over `Match.events`** — never stored, always recomputed.

---

## 1. Scope and general rules

- **G1 — Our team only.** Per-player statistics exist for our players only (A1). The opponent is
  represented by two aggregate numbers: `opponentPoints` and `pointsConcededFromOurErrors`.
- **G2 — Only `rally` events feed per-skill statistics.** `opponent_point`, `timeout`,
  `substitution`, `set_start`, `set_end` and `note` never appear in a skill counter.
  `opponent_point` feeds only the team-level counters of §5.
- **G3 — Invalid events are excluded from skill tables.** A `rally` event whose `(skill, outcome)`
  pair is outside `ALLOWED_OUTCOMES` (edge case E20) is skipped by every counter in §3 and §4, but is
  still counted in `totalActions` for the team and flagged in the UI.
- **G4 — Events of unknown players are counted.** A `playerId` missing from the roster (E19) is
  aggregated under a synthetic player row, never dropped from team totals.
- **G5 — Keying.** All grouping is by `Player.id`. Shirt numbers are display-only (E18).
- **G6 — Scope parameter.** Every metric is computed over a set of events chosen by a scope:
  `{ kind: 'match' } | { kind: 'set', setIndex: number }`. The formulas are identical; only the input
  array differs. Per-set trend (§6) is the same fold applied once per set index.
- **G7 — Zero denominator.** Any ratio whose denominator is `0` evaluates to `null`, and `null` is
  rendered as the literal string **`N/D`**. Never `0`, never `0.0%`, never `—`, never `NaN`.

```ts
export type Ratio = number | null;   // null === undefined-by-zero-denominator

export function safeRatio(numerator: number, denominator: number): Ratio {
  return denominator === 0 ? null : numerator / denominator;
}
```

---

## 2. Types

```ts
export type StatsScope = { readonly kind: 'match' } | { readonly kind: 'set'; readonly setIndex: number };

export interface PlayerStatistics {
  readonly playerId: Id;
  /** false when the id is not in Match.roster (G4). */
  readonly isKnownPlayer: boolean;

  readonly totalActions: number;
  readonly points: number;
  readonly errors: number;

  readonly attackAttempts: number;
  readonly kills: number;
  readonly attackErrors: number;
  readonly attackEfficiency: Ratio;      // (kills - attackErrors) / attackAttempts
  readonly killRate: Ratio;              // kills / attackAttempts

  readonly serves: number;
  readonly aces: number;
  readonly serveErrors: number;
  readonly aceRate: Ratio;               // aces / serves
  readonly serveErrorRate: Ratio;        // serveErrors / serves

  readonly receptions: number;
  readonly positiveReceptions: number;
  readonly negativeReceptions: number;
  readonly receptionPositivity: Ratio;   // positiveReceptions / receptions
  readonly receptionErrorRate: Ratio;    // receptionErrors / receptions
  readonly receptionErrors: number;

  readonly blockPoints: number;
  readonly blockErrors: number;
  readonly digs: number;
  readonly digErrors: number;
  readonly sets: number;                 // 'set' skill actions, not won sets
  readonly setErrors: number;
}

export interface TeamStatistics {
  readonly scope: StatsScope;
  readonly totalActions: number;
  readonly pointsScored: number;         // our points on the scoreboard
  readonly pointsConceded: number;       // their points on the scoreboard
  readonly pointsFromActions: number;    // our terminal 'point' rally events
  readonly errors: number;               // our terminal 'error' rally events
  readonly opponentPoints: number;       // 'opponent_point' events
  readonly attackAttempts: number;
  readonly kills: number;
  readonly attackErrors: number;
  readonly attackEfficiency: Ratio;
  readonly serves: number;
  readonly aces: number;
  readonly serveErrors: number;
  readonly receptions: number;
  readonly positiveReceptions: number;
  readonly negativeReceptions: number;
  readonly receptionPositivity: Ratio;
  readonly blockPoints: number;
  readonly timeoutsUsed: number;
  readonly substitutionsUsed: number;
}

export interface MatchStatistics {
  readonly team: TeamStatistics;                                  // whole match
  readonly players: readonly PlayerStatistics[];                  // whole match, sorted §8
  readonly perSetTeam: readonly TeamStatistics[];                 // index === setIndex
  readonly perSetPlayers: readonly (readonly PlayerStatistics[])[];
}

export function computeMatchStatistics(match: Match): MatchStatistics;
export function computePlayerStatistics(
  events: readonly ScoutEvent[], playerId: Id, isKnownPlayer: boolean,
): PlayerStatistics;
export function computeTeamStatistics(
  events: readonly ScoutEvent[], scope: StatsScope,
): TeamStatistics;
```

---

## 3. Event filters

Every counter is `count(predicate)` over the scoped events. Shorthand used below:

```
R                  = e.type === 'rally' && isAllowedOutcome(e.skill, e.outcome)      (G2, G3)
R(p)               = R && e.playerId === p
R(p, sk)           = R(p) && e.skill === sk
R(p, sk, {o...})   = R(p, sk) && {o...}.has(e.outcome)
```

| Counter | Filter | Notes |
|---|---|---|
| `totalActions` | `R(p)` | every valid rally action of the player, terminal or not |
| `points` | `R(p, *, {point})` | ace + kill + block point |
| `errors` | `R(p, *, {error})` | any skill |
| `attackAttempts` | `R(p, attack)` | **all** attack outcomes, including `negative` (blocked/dug) and `error` |
| `kills` | `R(p, attack, {point})` | |
| `attackErrors` | `R(p, attack, {error})` | |
| `serves` | `R(p, serve)` | all serve outcomes including errors |
| `aces` | `R(p, serve, {point})` | |
| `serveErrors` | `R(p, serve, {error})` | |
| `receptions` | `R(p, reception)` | all reception outcomes including errors |
| `positiveReceptions` | `R(p, reception, {positive})` | `neutral` is **not** positive |
| `negativeReceptions` | `R(p, reception, {negative, error})` | an ace conceded counts as negative |
| `receptionErrors` | `R(p, reception, {error})` | subset of `negativeReceptions` |
| `blockPoints` | `R(p, block, {point})` | |
| `blockErrors` | `R(p, block, {error})` | net fault / invasion |
| `digs` | `R(p, dig)` | |
| `digErrors` | `R(p, dig, {error})` | |
| `sets` | `R(p, set)` | only when `settings.trackSetSkill` is true |
| `setErrors` | `R(p, set, {error})` | |

`positiveReceptions + negativeReceptions + neutralReceptions === receptions`, where
`neutralReceptions` is derived and not stored. This three-bucket split is the MVP definition of
reception quality and is what the Italian report prints.

---

## 4. Ratio formulas

All ratios use `safeRatio` (G7). Denominators are explicit.

| Metric | Formula | Denominator | Zero-denominator |
|---|---|---|---|
| `attackEfficiency` | `(kills - attackErrors) / attackAttempts` | `attackAttempts` | `N/D` |
| `killRate` | `kills / attackAttempts` | `attackAttempts` | `N/D` |
| `aceRate` | `aces / serves` | `serves` | `N/D` |
| `serveErrorRate` | `serveErrors / serves` | `serves` | `N/D` |
| `receptionPositivity` | `positiveReceptions / receptions` | `receptions` | `N/D` |
| `receptionErrorRate` | `receptionErrors / receptions` | `receptions` | `N/D` |

### 4.1 Attack efficiency in detail

```
attackEfficiency = (kills − attackErrors) / attackAttempts
```

- Range: `[-1, 1]`. **It can be negative** — more attack errors than kills is a real and common
  result, and the UI must render e.g. `-12.5%` without clamping, without `Math.abs`, and with the
  minus sign kept on the same line as the number.
- Stored as a raw ratio (`0.2`), formatted as a percentage with **exactly one decimal**.
- `attackAttempts === 0` → `null` → `N/D`. It is never `0.0%`.

### 4.2 Percentage formatting — exact rule

```ts
/** Half away from zero, so -0.125 -> -12.5 and 0.125 -> 12.5 symmetrically. */
function roundHalfAwayFromZero(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  const scaled = value * factor;
  const rounded = scaled >= 0 ? Math.round(scaled) : -Math.round(-scaled);
  return rounded / factor;
}

/** The single formatter used by every percentage in the UI, the PDF and the XLSX. */
export function formatPercent1(ratio: Ratio): string {
  if (ratio === null) return 'N/D';
  const pct = roundHalfAwayFromZero(ratio * 100, 1);
  // Normalise -0.0 to 0.0
  const safe = Object.is(pct, -0) ? 0 : pct;
  return `${safe.toFixed(1)}%`;
}
```

Rounding is applied **only at formatting time**; aggregation and comparison always use the raw ratio.
`Math.round` alone is rejected because it rounds `-12.55` toward `+∞` (giving `-12.5` for one input
and `12.6` for its mirror); `roundHalfAwayFromZero` keeps positive and negative symmetric.

Worked formatting examples:

| ratio | rendered |
|---|---|
| `0.2` | `20.0%` |
| `1 / 3` | `33.3%` |
| `2 / 3` | `66.7%` |
| `0` | `0.0%` |
| `-0.125` | `-12.5%` |
| `-1` | `-100.0%` |
| `1` | `100.0%` |
| `null` | `N/D` |

Non-percentage numbers (counts) are rendered as plain integers. There are no other numeric formats in
the MVP.

---

## 5. Team totals

Counters in §3 summed over **all** players (including unknown ones, G4), plus:

| Metric | Formula |
|---|---|
| `opponentPoints` | count of `e.type === 'opponent_point'` in scope |
| `errors` | count of `R(*, *, {error})` — our terminal errors |
| `pointsFromActions` | count of `R(*, *, {point})` |
| `pointsScored` | scope `set`: `sets[i].ourPoints`. scope `match`: `Σ sets[i].ourPoints`. Identity: `pointsScored === pointsFromActions` per set. |
| `pointsConceded` | scope `set`: `sets[i].theirPoints`. scope `match`: `Σ`. Identity: `pointsConceded === errors + opponentPoints` per set. |
| `totalActions` | count of all `rally` events in scope, **including invalid ones** (G3) |
| `timeoutsUsed` | count of `timeout` events in scope with `team === 'us'` |
| `substitutionsUsed` | count of `substitution` events in scope |

The two identities are asserted in the test suite: they are the cheapest proof that the event log and
the scoreboard cannot diverge (A2).

---

## 6. Per-set trend

`perSetTeam[i]` and `perSetPlayers[i]` are produced by running the exact same fold over
`match.events.filter(e => e.setIndex === i)`, for `i` in `0 .. match.sets.length - 1`. No metric has a
set-specific definition. The trend widget plots, per set: `pointsScored`, `attackEfficiency`,
`receptionPositivity`, `errors`. Sets with `totalActions === 0` are plotted as gaps, not as zeros;
their ratios are `null` → `N/D`.

A player who took no action in a set gets a full `PlayerStatistics` object with every count at `0` and
every ratio `null`. Such rows are hidden from the per-set table by default and revealed by the
"Mostra tutti" toggle.

---

## 7. Metric → Italian UI label

| Identifier | Italian label | Short label (narrow columns) |
|---|---|---|
| `totalActions` | Azioni totali | Az. |
| `points` | Punti | Pt |
| `errors` | Errori | Err |
| `attackAttempts` | Attacchi totali | Att |
| `kills` | Attacchi vincenti | Vin |
| `attackErrors` | Errori attacco | E.Att |
| `attackEfficiency` | Efficienza attacco | Eff% |
| `killRate` | Percentuale attacchi vincenti | Att% |
| `serves` | Battute | Bat |
| `aces` | Ace | Ace |
| `serveErrors` | Errori battuta | E.Bat |
| `aceRate` | Percentuale ace | Ace% |
| `serveErrorRate` | Percentuale errori battuta | E.Bat% |
| `receptions` | Ricezioni | Ric |
| `positiveReceptions` | Ricezioni positive | Ric+ |
| `negativeReceptions` | Ricezioni negative | Ric− |
| `receptionErrors` | Errori ricezione | E.Ric |
| `receptionPositivity` | Positività ricezione | Ric% |
| `receptionErrorRate` | Percentuale errori ricezione | E.Ric% |
| `blockPoints` | Muri punto | Muri |
| `blockErrors` | Errori muro | E.Mur |
| `digs` | Difese | Dif |
| `digErrors` | Errori difesa | E.Dif |
| `sets` | Alzate | Alz |
| `setErrors` | Errori alzata | E.Alz |
| `pointsScored` | Punti fatti | PF |
| `pointsConceded` | Punti subiti | PS |
| `pointsFromActions` | Punti da azione | — |
| `opponentPoints` | Punti avversari | Avv |
| `timeoutsUsed` | Timeout usati | TO |
| `substitutionsUsed` | Sostituzioni | Sost |
| `perSetTrend` | Andamento per set | — |
| *(zero denominator)* | `N/D` | `N/D` |

Labels live in `src/shared/copy/statistics.ts` as a `Record<keyof PlayerStatistics | keyof TeamStatistics, { long: string; short: string }>`; the domain layer never imports them.

---

## 8. Sorting and display defaults

- Player rows are sorted by `shirtNumber` ascending; unknown players last.
- The live panel shows: `points`, `errors`, `attackEfficiency`, `receptionPositivity`.
- The final report shows the full table.
- Ratios are always rendered through `formatPercent1`. Counts render as integers, `0` included
  (a zero *count* is real information; only a zero *denominator* becomes `N/D`).

---

## 9. Test fixtures

Three minimal logs, ready to become `describe` blocks. Only the fields that matter are written; the
implementation fills `id`, `timestamp`, `sequence`, `scoreBefore/After`, `serving*`, `rotation*` via
`appendRallyEvent`. All events are `type: 'rally'` unless stated. Settings:
`bestOf: 5, pointsToWinSet: 25, winByTwo: true, startingServer: 'us'`.

### Fixture A — attack only, one player, one set

Player `P4` (shirt 4). Set 0.

| # | player | skill | outcome |
|---|---|---|---|
| 1 | P4 | attack | point |
| 2 | P4 | attack | point |
| 3 | P4 | attack | error |
| 4 | P4 | attack | negative |
| 5 | P4 | attack | positive |

Expected `PlayerStatistics(P4)` (match scope):

```
totalActions        5
points              2
errors              1
attackAttempts      5
kills               2
attackErrors        1
attackEfficiency    0.2          -> "20.0%"
killRate            0.4          -> "40.0%"
serves              0
aces                0
aceRate             null         -> "N/D"
receptions          0
receptionPositivity null         -> "N/D"
blockPoints         0
```

Expected `TeamStatistics` (match scope): `totalActions 5`, `pointsFromActions 2`, `errors 1`,
`opponentPoints 0`, `pointsScored 2`, `pointsConceded 1`, `attackEfficiency 0.2`.
Set 0 score after the log: **2–1** (`pointsConceded = errors + opponentPoints = 1 + 0`).
Serving after event 5: `them` (event 3 was a side-out against us; events 4 and 5 are non-terminal).

### Fixture B — serve and reception, one player, one set

Player `P5` (shirt 5). Set 0.

| # | player | skill | outcome |
|---|---|---|---|
| 1 | P5 | serve | point |
| 2 | P5 | serve | error |
| 3 | P5 | serve | neutral |
| 4 | P5 | reception | positive |
| 5 | P5 | reception | positive |
| 6 | P5 | reception | neutral |
| 7 | P5 | reception | negative |
| 8 | P5 | reception | error |

Expected `PlayerStatistics(P5)`:

```
totalActions         8
points               1
errors               2
serves               3
aces                 1
serveErrors          1
aceRate              1/3          -> "33.3%"
serveErrorRate       1/3          -> "33.3%"
receptions           5
positiveReceptions   2
negativeReceptions   2            (negative + error)
receptionErrors      1
receptionPositivity  0.4          -> "40.0%"
receptionErrorRate   0.2          -> "20.0%"
attackAttempts       0
attackEfficiency     null         -> "N/D"
```

Team: `pointsScored 1`, `pointsConceded 2` (serve error + reception error), `opponentPoints 0`,
`totalActions 8`. Set 0 score **1–2**.

### Fixture C — two players, two sets, opponent points, zero denominators

Players `P4` (shirt 4) and `P9` (shirt 9).

Set 0:

| # | type | player | skill | outcome |
|---|---|---|---|---|
| 1 | rally | P4 | attack | point |
| 2 | opponent_point | — | — | — |
| 3 | rally | P9 | block | point |
| 4 | rally | P4 | attack | error |

Set 1:

| # | type | player | skill | outcome |
|---|---|---|---|---|
| 5 | rally | P4 | attack | point |
| 6 | rally | P9 | dig | positive |

Expected — **match scope**:

```
P4: totalActions 3, points 2, errors 1,
    attackAttempts 3, kills 2, attackErrors 1,
    attackEfficiency 1/3 -> "33.3%", killRate 2/3 -> "66.7%",
    serves 0, aceRate null -> "N/D", receptions 0, receptionPositivity null -> "N/D",
    blockPoints 0

P9: totalActions 2, points 1, errors 0,
    blockPoints 1, digs 1, digErrors 0,
    attackAttempts 0, attackEfficiency null -> "N/D",
    serves 0, aceRate null -> "N/D"

Team: totalActions 5, pointsFromActions 3, errors 1, opponentPoints 1,
      pointsScored 3, pointsConceded 2,
      attackAttempts 3, kills 2, attackErrors 1, attackEfficiency 1/3 -> "33.3%",
      blockPoints 1, receptions 0, receptionPositivity null -> "N/D"
```

Expected — **per-set scope**:

```
Set 0 team:  totalActions 3, pointsScored 2, pointsConceded 2,
             pointsFromActions 2, errors 1, opponentPoints 1,
             attackAttempts 2, kills 1, attackErrors 1, attackEfficiency 0 -> "0.0%"
Set 0 P4:    attackAttempts 2, kills 1, attackErrors 1, attackEfficiency 0 -> "0.0%"
Set 0 P9:    totalActions 1, blockPoints 1, digs 0

Set 1 team:  totalActions 2, pointsScored 1, pointsConceded 0,
             pointsFromActions 1, errors 0, opponentPoints 0,
             attackAttempts 1, kills 1, attackErrors 0, attackEfficiency 1 -> "100.0%"
Set 1 P4:    totalActions 1, attackAttempts 1, kills 1, attackEfficiency 1 -> "100.0%"
Set 1 P9:    totalActions 1, digs 1, attackAttempts 0, attackEfficiency null -> "N/D"
```

Scoreboard check: set 0 ends 2–2, set 1 stands 1–0. Both identities hold —
`pointsScored === pointsFromActions` and `pointsConceded === errors + opponentPoints` in each set.

### Fixture D (negative efficiency regression guard)

One player, one set: `attack point`, `attack error`, `attack error`, `attack error`.
`attackAttempts 4, kills 1, attackErrors 3, attackEfficiency = (1 − 3) / 4 = -0.5 -> "-50.0%"`.
This fixture exists solely to prove the UI never clamps, absolutes or truncates a negative efficiency.
