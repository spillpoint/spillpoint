# Review: M4e (anti-dilution, and Millrace's exit from its rounds)

Branch `m4e-anti-dilution`, M4's third engine PR. Two things are new.

**The engine adjusts conversion prices in a down round:**
- broad-based weighted average (R7, R8)
- narrow-based weighted average (R15)
- full ratchet
- the round's three toggles: the pool in A (R7), the adjustment shares in the price (R10), and rounding CP2 (R9)

**Millrace's exit now runs on the cap table the engine builds from its ten events,** not on the table copied from `expected.json`.

**Still refused,** naming the term:
- pay-to-play (M4f)
- converting notes (M4g)
- a post-money SAFE converting alongside notes or pre-money SAFEs (owed before release)
- new: a round that converts SAFEs or notes and also triggers anti-dilution (open question 2)

## Run it

```bash
pnpm install && pnpm rounds millrace
```

## What to check by behavior

### 1. Millrace, built from all ten events, matches the M1 cap table

```bash
pnpm rounds millrace
```

**All ten tables say "matches expected.json".** The comparison covers every position, the pool and each round's price; the tests also compare every security's terms, every detail field and seniority. The last one is the Series B:

```
== series_b (2025-03-31)
Price: $1.0821118250   post-money valuation $46,000,000
New shares: cobalt 9,241,189   pool top-up 3,564,773
Anti-dilution, series_a (broad-based): conversion price $2.0754715977 → $1.8247520242, ratio 1.1373992577
  A 27,372,727, B 4,818,182.0002 ($9,999,999.89 paid ÷ CP1), C 9,241,189 new shares
...
Cobalt Family Office LLC      Series B Preferred            9,241,189          21.74%
Unissued pool                                               5,101,136          12.00%
matches expected.json, price matches
```

**What to look for:**
- **The price:** the round sits below Series A's $2.075472, so Series A is adjusted.
- **B** uses the $9,999,999.89 the 9,241,189 whole shares actually paid, not the $10,000,000 round (R8).
- **Series A's new ratio, 1.1373992577,** is the one the exit runs on.

### 2. Millrace's exit, on that built table, matches every locked payout and breakpoint

```bash
pnpm payouts millrace --all
```

`--all` is new. For every exit value `expected.json` locks, it solves with the engine's own decisions and compares every line:

```
millrace runs on the cap table after series_b, built from the case's 10 events.

 $10,000,000.00                matches: same decisions, all 15 lines within a cent
 $19,999,999.79  (breakpoint)  matches: same decisions, all 15 lines within a cent
 ...
$300,000,000.00                matches: same decisions, all 15 lines within a cent

19 of 19 exit values match expected.json.
```

Those are the 10 breakpoints and 9 listed exit values.

```bash
pnpm breakpoints millrace
```

It says "All match expected.json (to the cent, with the same jumps)": 10 breakpoints, each with its reasons.

`pnpm payouts millrace 50000000` shows one exit value line by line, beside `expected.json`'s amounts, and names the table it ran on.

### 3. Case 16, one down round under each method

Run `pnpm rounds edge-16a-broad-based`, and likewise for 16b–16f. Each one's Series B says "matches expected.json, price matches".

| Case | Method | Series A's $2.50 becomes | Investor Y's shares |
|---|---|---|---|
| 16a | broad-based | $2.1904762066 | 2,570,652, exactly 20.00% |
| 16b | narrow-based: A is the 2,000,000 preferred only | $1.6875000926 | 2,740,740 |
| 16c | full ratchet: the round's price | $0.8750000000 | 3,428,571 |
| 16d | broad-based, adjustment left out of the $1.20 price (R10) | $2.2045454545 | 2,500,000, diluted to 19.58% |
| 16e | broad-based, pool in A: A is 10,000,000 | $2.2291667225 | 2,560,747 |
| 16f | broad-based, rounded to $0.0001 (R9) | $2.1905, from $2.1904762066 | 2,570,652 |

## How the engine solves a down round

**The reference** tries both branches for each series, adjusted or not, and keeps the consistent one.

**The engine settles it by rule,** as it does for SAFEs and the pool top-up:
- It solves the round.
- A series is adjusted when the price comes out below its conversion price.
- It solves again until nothing changes.

**Each solve is still one division.** With the adjustment in the price (R10), each adjusted series adds shares that grow in a straight line with the post-money count:
- **weighted average:** C grows with it (money × x ÷ post-money)
- **full ratchet:** the price falls as x grows

So the closed form from M4c still holds.

**CP2 itself is worked out after closing,** from the whole shares actually issued (R8).

## What the tests check

- **All 26 round cases,** field by field, before each case's stop. These now build in full:
  - **16a–16f**
  - **Millrace**, all ten events

  The comparison gains each adjustment's:
  - CP1, CP2 and, under R9, CP2 before rounding
  - A and B, to within one part in 10³⁰
  - C, to the share
  - the new conversion ratio
  - every series' stated conversion ratio
- **Millrace's exit on the built table.** The existing payout, decision and breakpoint tests read cases through the engine's case reader, and that reader now builds Millrace's table from its events. So these run on the built table:
  - every holder × security line at all 19 locked exit values, to the cent
  - the decisions there
  - the 10 breakpoints with their reasons and jump flags
- **New tests:**
  - Millrace from all ten events, with the Series B's adjustment
  - each 16 case's CP2 and new shares
  - a round priced exactly at the conversion price adjusts nothing
  - two series adjusted in one round, against values from the reference calculator (R25)
  - the refusal when a SAFE converts in a down round
  - a series whose `anti_dilution_a` disagrees with the round's pool toggle (C10)
  - R9's half-up rounding
  - Millrace's exit read from `expected.json`'s recorded table through `readExit`, which gives the same positions and pool, and Series A's ratio to within one part in 10³⁰
  - an exit after an event the case doesn't have
  - an exit after an event that leaves SAFEs outstanding (refused until M5)

**606 engine tests in all,** 7 more than M4d:
- **In the rounds file, 4 more:** 11 new tests, less the 7 "refuses …" tests for 16a–16f and Millrace, which now build in full.
- **3 new input tests.** The 26 round cases' "refused for rounds (M4)" tests became "has no exit: buildCapTables builds its cap tables".

## What changed

- **`packages/engine/src/rounds.ts`:**
  - anti-dilution, settled with the other choices
  - its details in each round: `antiDilution`, with CP1, CP2, A, B, C and the new ratio
- **New `packages/engine/src/case.ts`:** reads a whole case.
  - **An exit that names a table by event** runs on the table built from the case's events.
  - **SAFEs or notes still outstanding there** are refused until M5, as on a table given in full.
  - **`readCase` moved here** from `input.ts`. It's internal, not part of the package's API.
- **`readExit`** (public) is unchanged: it still takes a table given by event through its resolver, such as the one `expected.json` records.
- **Type exports:** `AntiDilutionAdjustment`, plus `SafeConversion` and `ProRata`, which M4d left out. They're types only, so the API test's list of exports doesn't change.
- **Dev tools:**
  - `pnpm payouts <case> --all`
  - `pnpm rounds` prints each adjustment
  - `pnpm payouts` and `pnpm breakpoints` say which table they ran on
- **`docs/ASSUMPTIONS.md`:**
  - **R25 and R26** are new (below).
  - **C2** now says the engine builds the exit's table from events.

**The dashboard is unchanged.** It still shows Millrace on the table recorded in `expected.json`, until M4i opens Millrace from its rounds. The engine's own README still calls building from rounds "planned", and M4h rewrites it for the release.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **No changes** to `cases/`.

## Assumptions added (please confirm)

- **R25 (New): when anti-dilution applies, and to several series at once.**
  - **When:** a series is adjusted when the round's price is below its conversion price. At exactly that price nothing changes.
  - **Several series:** each is adjusted by its own rule. A is counted on the table before the round, so no series' adjustment enters another's A.
  - **Pro-rata in the same round** counts holdings at the ratios before the adjustment, since it's a pre-round percentage.
  - **No case adjusts two series.** The test compares the engine with the reference calculator on one example: a narrow-based Seed and a broad-based Series A, both below a Series B.
- **R26 (New): R7's toggle in a round that tops up the pool.** A counts the pool as it stood before the round, without the round's increase, since A is the count immediately before the new issue. 16e has no top-up, so no case settles this. The reference does the same.

## Decisions I made, for you to check

1. **A case's exit builds every event, even ones after the event it runs on.** An error in a later event refuses the case rather than going unchecked. For Millrace it makes no difference: its exit runs on the last event.
2. **R9's rounding counts within one part in 10³⁰ of halfway as halfway,** then rounds up, so a CP2 that is exactly halfway can't round down because of the 40th digit. It's the same guard E19 gives share counts.
3. **C10's check** that a series' `anti_dilution_a` agrees with the round's pool toggle runs only when that series is adjusted, as in the reference. A round that adjusts nothing doesn't use A.

## Open questions

1. **Confirm R25 and R26.**
2. **SAFEs or notes converting in a down round.** It's refused for now, with milestone "later". Neither the SPEC nor a case settles three points:
   - whether the conversion is itself a dilutive issue under the charter
   - whether the converting shares count in A, B or C
   - whether a SAFE converting at a discount below CP1 triggers the adjustment on its own

   **I'd add it to "Owed before release".** It's common: a bridge SAFE converting in a down Series A when the Seed has broad-based protection. May I add it, with a case to work out by hand in a later cases PR?

Next is M4f: pay-to-play. I'm stopping here.
