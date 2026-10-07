# Review: M5e (dividends in the engine)

Branch `m5e-dividends`. The engine now pays cumulative dividends: simple or compounding, forfeited or paid on conversion. Cases 9, 9b and 9c run through every exit test.

It also makes your rule from the M5d review general. **The page shows a cap table only if it can show all of it.** It never reads an unknown kind of security as common stock, and it never quietly drops a term it doesn't carry.

## Run it

```bash
pnpm payouts edge-09b-compounding-dividends --all
```

```bash
pnpm breakpoints edge-09c-dividends-paid-on-conversion
```

Each of the three dividend cases prints "11 of 11 exit values match expected.json", and its two breakpoints match.

## How to check it by behavior

1. **Case 9, simple, forfeited on conversion:**
   - **Seed's preference with its dividends** is paid in full at $3,960,657.53.
   - **Seed converts at $19,803,287.67.** The reason says what converting gives up: "…the same as its 1x preference plus $960,657.53 of accrued dividends, $3,960,657.53 in all, which converting gives up."
2. **Case 9b, compounding to 2026-09-30:**
   - **Accrued:** $1,245,172.84.
   - **Paid in full** at $4,245,172.84.
   - **Seed converts** at $21,225,864.20.
3. **Case 9c, paid on conversion:** Seed converts at $15,960,657.53, and at $20M it gets $4,768,526.03. The reason: "Its accrued dividends, $960,657.53, are paid either way: converting keeps them, in its tier."
4. **The page:**
   - **A security of a made-up kind,** for example `"kind": "bond"` named "Bond X". The page says:
     > It has Bond X, a kind of security ("bond") this page doesn't know. It won't open the cap table rather than treat it as something it isn't.
   - **`cumulative_dividend` on Series A:**
     > It has cumulative dividends on Series A Preferred, which this page doesn't show yet. It won't open a cap table it can't show in full.
   - **A misspelt field** gets the engine's own message, which lists the fields it reads.

## How the engine handles dividends (X2, X4, X5)

- **The accrual,** at the exit date, on the series' own shares:
  - **Simple:** the original issue price × the rate × the actual days ÷ 365.
  - **Compounding:** annually, on the accrual start's anniversaries. A full year is exactly the rate, 365 days or 366, and the part-year after the last anniversary is simple on the compounded amount. A 29 February start has its anniversaries on 28 February.
  - **One division at the end,** so the 40 digits hold. The three cases' accruals match the reference's exact fractions to 30 digits.
- **Added to the preference at 1x,** on top of its multiple (X4).
- **On conversion:**
  - **Forfeited** by default.
  - **Paid on conversion:** the converted series keeps a claim for its dividends in its own tier, and shares the rest as common.
- **A warrant's shares carry no dividends:** they weren't outstanding while the dividends accrued.
- **The exit date** (`exit_date`) is required when a series has dividends, and must fall on or after every accrual start. `prepare(capTable, exitDate)` takes it; tables without dividends don't need one.
- **Refused, milestone "later":**
  - **The other reading, dividends added to what converts.** You asked for this refusal.
  - **Dividends on a series issued in a company's rounds.** This one is my decision, below.

## The page's rule

**One check, `checkShown`.** It runs on every cap table the page opens, from a file or from rounds, and refuses with a plain reason:
- **A security of a kind the page doesn't know.**
- **A field on a security the page doesn't carry,** such as dividends.
- **A term on the table it doesn't carry,** such as a carve-out, or SAFEs or notes still outstanding.
- **More than one conversion group.**

**Which message comes first:**
- **The engine doesn't model the term yet:** the engine's message, which says when, as before.
- **The engine refuses for another reason:** the page first says what it can't show, if anything. A file with dividends would otherwise be told it needs an exit date, which a saved file can't hold yet.
- **A misspelt or made-up field:** the engine's "unknown field" message, which names the fields it reads.

**Tables built from rounds** pass any series dividends through the same check, so nothing slips past it there.

## What changed

- **Engine** (`packages/engine/src/`):
  - **`dates.ts`** (new): day counts and anniversaries. Notes' interest in a round uses the same code, moved from `rounds.ts`.
  - **`dividends.ts`** (new): the accrual.
  - **`model.ts`:** the `CumulativeDividend` type, `PreferredSeries.cumulativeDividend`, and `ExitInput.exitDate`.
  - **`input.ts`:** reads dividends (C5) and the exit date, and refuses the other reading.
  - **`waterfall.ts`:**
    - `prepare(capTable, exitDate)`
    - preferences with dividends
    - a converted series' claim for dividends paid on conversion
    - `SeriesHere.dividends` and `.claim`
  - **`reasons.ts`:** preferences "with accrued dividends", and what converting does to them.
  - **`rounds.ts`:** refuses dividends on a series it issues.
- **Engine scripts and tests:**
  - **The scripts** pass each case's exit date to `prepare`.
  - **`EXIT_CASES`** now includes cases 9, 9b and 9c.
  - **`test/dividends.test.ts`** (new):
    - the dates, including 29 February
    - the accrual against each case's exact figure
    - a 366-day year compounding at exactly the rate
    - a warrant's shares without dividends
    - paid on conversion
    - every refusal
- **Engine README:**
  - dividends marked *(0.2.0)*, and `exit_date`
  - `prepare(capTable, exitDate)`, with the examples updated to pass it
  - the two new "later" refusals
  - dividends off the "Not modeled yet" list
- **Dashboard:**
  - **`draft.ts`:** `checkShown`.
  - **`file.ts`:** the message order.
  - **`rounds.ts`:** writes a series' dividends out so the check sees them.
  - **Tests:** a made-up kind, dividends and a misspelt field from a file; a made-up kind and dividends straight into the editor.
- **`docs/ASSUMPTIONS.md`:**
  - **C12:** dividends off the refused list; the exit date.
  - **X5:** in the engine, and the two refusals.
  - **C13:** the page's rule.
  - **X17:** your approved "For you" wording, word for word.

## Checks

- **Engine:** 853 tests pass, 86 more than after M5d.
- **Dashboard:** 177 tests pass, 5 more.
- **Reference:** 46 unit tests pass, and all 60 cases match `generate.py --check`.
- **`cases/`:** no changes.
- **Typecheck and build:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.

## Assumptions added

**No new IDs.** Updates:
- **X5:** two refusals.
- **C12:** the exit date.
- **C13:** the page's rule, from your M5d review.
- **X17:** the approved wording.

## Decisions I made, for you to check

1. **Dividends on a series issued in a company's rounds are refused** (milestone "later"):
   - **Why:** no case says when they start to accrue for a round's series. Nor does one say whether the series its SAFEs and notes convert into carries them; the reference would copy them across untested.
   - **The cost:** a company built on the Rounds tab can't have cumulative dividends yet.
   - **Your call:** say if you want a case for it in a later cases PR.
2. **`prepare` takes the exit date as an optional second argument,** rather than as a field on the cap table, since it's a fact about the sale. Existing callers keep working, and a table with dividends and no date is refused.
3. **`PreferredSeries` gains a required `cumulativeDividend` field.** Code that builds series objects by hand will need `cumulativeDividend: null`. That goes in 0.2.0's notes, with M5d's new `"warrant"` kind.
4. **The page's rule covers more than unknown kinds:** any field it doesn't carry, any table-level term, and a second conversion group. Each would otherwise have been dropped without a word as later PRs teach the engine new terms.

## Open questions

None. M5f is next: carve-outs, including the curved stretches (X17). I'm stopping here.
