# Review: 04b2 (Millrace written in OCF)

Branch `04b2-ocf-millrace`. Millrace's cap table after its Series B, written by hand as an OCF package, `cases/ocf-11-millrace`, as you asked in the 04b review:
- each price written to 10 places, rounded to nearest, as an export would
- the import is the locked table with those prices
- from 04d, Millrace's locked payouts and breakpoints are its own to within a cent

**Before it merges, it needs:**
- your re-derivation
- the cases label

## What changed

- **`cases/ocf-11-millrace/`:**
  - **The package:** nine stakeholders, five classes, one plan and 23 transactions. Its transactions are the issuances, the SAFEs' conversions at the Seed, the grants, three pool increases, and Series A's conversion ratio adjustment after the Series B.
  - **`expected.json`:** the import, the one term to fill in (Series B's participation), and the report.
  - **`DERIVATION.md`:** the package line by line, each price's rounding, the ratio check, and what 04d will compare.
- **The ratio check (O4)** now allows exactly the rounding the written numbers allow, as you set out. It is outside that bound: refused, as before. It is inside the bound but not exact: read, with a new report line, `conversion_ratio_rounded`. Millrace's Series A is the case of it.
- **The check against the locked table** now handles a case built from rounds.
  - **The table it reads:** the locked table after the event `locked_after_event` names.
  - **Prices:** rounded to `price_places`.
  - **Left out:** what OCF can't carry.
  - **Order:** classes and positions are compared in no order, since the import lists them as the package defines them, and the locked table as the rounds created them.

## How to check it

1. **Open `cases/ocf-11-millrace/DERIVATION.md`.** Its first table gives each price: the locked fraction, the 10 places written, and the difference, at most 3.9 × 10⁻¹¹.
2. **The package table:** each OCF object against the cap table line it becomes. The pool is 9,491,136 reserved − 4,390,000 granted = 5,101,136, as locked.
3. **Series A's ratio:**
   - The written 1.1373992577 is 6.1 × 10⁻¹¹ more than 2.0754715977 ÷ 1.8247520242.
   - Each number could be off by 5 × 10⁻¹¹, so the two ranges overlap.
   - So the class is read, with the new line.
4. **Run `pnpm test`.** The new check confirms the import is Millrace's locked table with each price rounded to 10 places.
   - I changed Series A's conversion price by one unit in the tenth place, then the pool by one share. The check failed each time, and passed again once I put them back.

**The payout comparison itself comes in 04d,** with the importer. To fill in the DERIVATION's numbers now, I ran the engine directly on the hand-worked import, with Series B filled in as participating, in a throwaway test (not committed).

At Millrace's 19 points:
- one answer at each, as locked, with Millrace's decisions except at four breakpoints (decision 2)
- payouts within a cent
- the same ten breakpoints, each within a cent, with the same reasons

## Decisions for you to check

1. **How DERIVATION.md states the cent.** You asked it to say the cent tolerance comes only from the price rounding. That isn't quite true as it stands:
   - every case's payouts are recorded to the cent
   - so every case is already checked to within a cent (E14)

   So it says that **beyond those recorded cents**, the only difference comes from rounding the prices. The largest differences, measured against the engine's exact answer for Millrace's own table:
   - **a payout line:** $0.00043, Ridgeline's Series A at $300M
   - **a holder's or class's total:** $0.00058
   - **a breakpoint:** $0.0021, Seed converting at $59,687,473.06

   **Against Millrace's recorded cents,** the largest difference is $0.0050 (Lena's common, at $75M), almost all of it the recording.
2. **Decisions at four breakpoints.** At four breakpoints a decision changes:
   - three option strikes come into the money
   - Seed converts

   **What happens:** rounding moves each of these a fraction of a cent below the locked one. So at the locked exit value the import has just crossed:
   - those options are exercised, or Seed converts
   - Millrace records the tie-break's choice there instead: no exercise, no conversion (E5)

   Both choices pay the same at a breakpoint, so payouts still agree within $0.0004.

   **I'd have 04d compare decisions at the import's own breakpoints,** where all ten give Millrace's, and payouts at the locked values. The other way is not to compare decisions at breakpoints at all.
3. **A number written without a decimal point is exact** in the ratio check. Read literally, "half a unit in its last place" would let the ratio 2 for 1 be anything from 1.5 ÷ 1.5 to 2.5 ÷ 0.5, that is 1 to 5. Then almost any ratio written in whole numbers would pass, including the 2-for-1 refusal fixture in case 03.
   - Reading whole numbers as exact keeps that fixture refused: $1.50 ÷ $1.50 could be anything from 0.993 to 1.007, and 2 is outside.
   - A ratio written as "2.0" would be judged to one place.

## Assumptions added or changed

- **O4:**
  - the conversion price governs
  - the bound comes from each number's own decimal places, with whole numbers exact
  - `conversion_ratio_mismatch` outside the bound; `conversion_ratio_rounded` inside it but not exact
  - a worked example at 4 places
- **C16:** `locked_after_event` and `price_places`; what the comparison leaves out; decisions at a breakpoint compared at the import's own.
- **The later list:** "class names show money to the cent ($0.10, $5.00)", for the 1.0b rename list.
- **Also:**
  - `docs/SPEC.md`: OCF case 6, Millrace.
  - Case 03's ratio refusal row now gives its bound.
  - Case 01's ratio line now says it's exact, so there's no report line.

## Checks

- **Engine:** 1,623 tests pass, 8 more, all checking the new case's files.
- **Dashboard:** 322 tests pass.
- **Reference:** 55 unit tests pass, and all 75 cases match. It skips the OCF folders, as before.
- **Typecheck:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`. `.claude/settings.json` has local changes that aren't committed.
- **Nothing run outside the sandbox.**

## Open questions

Decisions 2 and 3 above. Next is 04c, the ledger case. I'm stopping here.
