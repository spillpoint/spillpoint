# Review: M5c (dividends, the carve-out and warrants: cases)

Branch `m5c-cases`, the second half of the cases you split in two. It adds four cases, and changes one locked file:
- **9b:** compounding dividends.
- **9c:** dividends paid on conversion.
- **10b:** a carve-out paid alongside the preferences.
- **22:** warrants issued.
- **12f's `DERIVATION.md`,** as you asked: it now says plainly why Y does better when X converts.

The build PRs follow, starting with M5d (warrants).

**The `cases-locked` check fails on this PR until you add `unlock-cases`,** which you'll do once the cases are re-derived independently.

**One new assumption needs your eye first: X17. 10b's payouts curve.** It's explained below.

## Run it

```bash
python3 reference/generate.py --check
```

This prints `ok` for all 60 cases. Each new case's `DERIVATION.md` walks through the answer by hand.

## How I made the cases

1. **By hand.** I worked out each case first, with exact fractions, from your M5b-plan answers, without the reference calculator.
2. **The reference.** I extended it to the same rules.
3. **The comparison.** The two agree **exactly**:
   - every payout line, at every listed exit value and breakpoint
   - every breakpoint
   - 22's price, Company Capitalization, pool top-up and share counts

The hand work, not the comparison, is what showed 10b's payouts curve. That's why X17 exists.

## The new cases

| Case | What it isolates | Check |
|---|---|---|
| **9b** compounding | Case 9's Seed, compounding annually, with the sale moved to 2026-09-30: four full years, then 183 days simple. | Accrued **$1,245,172.84** ($0.62258590 a share). Breakpoints $4,245,172.84 and **$21,225,864.20**. |
| **9c** paid on conversion | Case 9's Seed, its $960,657.53 of dividends paid in its tier on conversion. | Seed converts at **$15,960,657.53** (case 9: $19,803,287.67). At $20M Seed gets **$4,768,526.03**. |
| **10b** carve-out alongside | Case 10's carve-out, joining Series A's tier and sharing it pro rata by claim. | At $5M the carve-out gets **$238,095.24**; at $10M, **$909,090.91**. Breakpoints $10M, **$11,052,631.58**, $20M, $26.5M. Above $11,052,631.58 every payout is case 10's. |
| **22** warrants issued | Warrants for 200,000 common to a lender, then a Series A with a top-up and a converting post-money SAFE. | The SAFE's Company Capitalization is **11,333,333.33** and the price **$1.630435**. Without the warrants: 11,111,111.11 and $1.664905. |

### What to look at, by behavior

1. **9b, the full years.** The year to 2024-03-31 includes 29 February and still compounds at exactly 8%. Only the 183 days after 2026-03-31 use Actual/365.
2. **9c against 9 at $19M:**
   - **Case 9:** Seed keeps its $3,960,657.53 preference.
   - **9c:** it has converted and gets $4,568,526.03. That is its $960,657.53 of dividends, plus 2/10 of the rest.
3. **10b, the curve.**
   - **The carve-out's share** at $2M, $5M, $10M and $11M is 1.96%, 4.76%, 9.09% and 9.50% of the exit value. That is not a straight line.
   - **From $11,052,631.58** it is case 10's, exactly.
4. **22, the cap table after the Series A:**
   - **The warrants:** Lender L's 200,000 sit beside the options and aren't taken from the pool.
   - **The pool** is topped up to 1,533,333, 10% of the larger count.

## X17: payouts that curve (new)

**What happens.** Below $11,052,631.58, 10b's carve-out shares Series A's tier, which isn't paid in full. It gets the exit value × its claim ÷ (its claim + $10,000,000), and its claim is a percentage of the exit value. So its share is E² ÷ (E + $100M) up to $10M, which is not a straight line, and every payout in that stretch curves. These are spillpoint's first curved payoffs.

**Why it matters.**
- **SPEC's definition doesn't fit.** `SPEC.md` defines a breakpoint as a slope change, and on a curve the slope changes everywhere.
- **The engine's finder can't place them as it stands.** It assumes straight lines between changes (E18).

**What I did:**
- **A breakpoint on a curve is where the formula changes:** a carve-out tier ends, or the shared tier is paid in full. In 10b: $10,000,000 and $11,052,631.58.
- **The breakpoints are still exact.** What changes there moves in straight lines: a tier edge is a fixed exit value, and what is left for a tier less its claims is a straight line within one carve-out tier.
- **`expected.json` flags the curved stretches.** Each breakpoint next to one is marked `payouts_curve_below` or `payouts_curve_above`, with a `payouts_curve` reason in plain English.
- **The reference checks a curved stretch differently.** There it checks that nothing setting the formula changes, in place of checking that payouts lie on a line.
- **M5f's engine work grows.** Its finder will need the same treatment.

**I didn't change SPEC's wording.** X17 records the rule; tell me if you'd rather SPEC say it.

## Your answers, as the rules

- **X5:**
  - **Compounding:** annual, on anniversaries. A full year is exactly the rate; the part-year after the last anniversary is simple. A 29 February start has its anniversaries on 28 February.
  - **Paid on conversion:** cash, in the series' own tier.
  - **Refused:** the other reading, `added_to_conversion`. Compounding interest on notes also stays refused.
- **X7:** alongside means joining the most senior tier, pro rata by claim. It records why not the junior tier, in your words: a carve-out exists to pay management when the preferences would otherwise leave common nothing.
- **R29:**
  - **Counting:** warrants count like options everywhere, and a warrant for preferred counts as converted.
  - **The pool:** they aren't taken from it.
  - **Anti-dilution:** issuing them never triggers it (NVCA's Exempted Securities).
- **X16:** now marked Confirmed (M5b review).

## What changed outside `cases/`

- **The reference calculator** (`reference/spillpoint_ref/`):
  - **`model.py`:**
    - compounding, with the 28 February anniversaries
    - `paid` on conversion
    - the alongside timing
    - the refusal of `added_to_conversion`
  - **`waterfall.py`:**
    - a converted series' dividends stay in its tier
    - the alongside carve-out joins the senior tier
    - where payouts curve
  - **`breakpoints.py`:**
    - placing a breakpoint on a curve
    - the check on a curved stretch
    - the reasons for all of it: the carve-out's claim against what it receives, and dividends paid either way
  - **`case.py`:**
    - the curve flags
    - `full_years`, `stub_days` and `on_conversion` in the dividend report
  - **`rounds.py`:** the `issue_warrants` event. `issue_percent` now leaves warrants out, as it does options.
  - **`reference/tests/`:** 4 new tests:
    - compounding, including 29 February and a 366-day year
    - paid on conversion, and the refused reading
    - the alongside carve-out's curve and breakpoints
    - warrants in a round's price
- **The engine:** one line in `packages/engine/src/rounds.ts`. It refuses `issue_warrants` as warrants, naming M5, where it used to say "unknown event type". That is how warrants on a cap table are already refused (C12). M5d replaces it with the real event.
- **The engine's tests:**
  - **`input.test.ts`:** refuses 9b and 9c as dividends, and 10b as a carve-out, naming M5. 22 is a round case.
  - **`rounds.test.ts`:** expects 28 cases with events. 27 build, and 22 is refused, naming warrants and M5, at its warrants event.
- **`docs/ASSUMPTIONS.md`:**
  - **X5, X7, R29:** your answers.
  - **X16:** confirmed.
  - **X17:** new.
  - **C3, C5, C6:** updated.
  - **C15:** new, the warrants event's fields.
- **`docs/SPEC.md`:** 9b, 9c, 10b and 22 in the case list. The round cases are now 14–22.

## Checks

- **Reference:** 46 unit tests pass, 4 more than in M5b. All 60 cases match `generate.py --check`. The 56 locked cases' inputs and expected values are unchanged.
- **Engine:** 742 tests pass, 28 more, because its tests run every case.
- **Dashboard:** 171 tests pass. The new one loads 22's events into the rounds editor and gets them back exactly, warrants event included.
- **Typecheck and build:** clean.

## CI and permissions

- **No changes to `.github/workflows/`.**
- **`.claude/settings.json`:** still changed locally, with the `cases/` edit rule lifted, and **not committed**.
- **`cases-locked`** fails on this PR until you add `unlock-cases`. That covers the four new cases and 12f's `DERIVATION.md`.

## Assumptions added

- **R29:** confirmed in your M5b-plan answers.
- **X17 and C15:** new, for you to check.

## Decisions I made, for you to check

1. **X17,** above.
2. **The warrant securities' names:**
   - **The id** is `warrants_<underlying>_<strike>`, for example `warrants_common_0.5`.
   - **The name** is "Warrants for Common Stock ($0.5 strike)".
   - **One per underlying and strike,** as `grant_options` makes one option class per strike (C15).
3. **9b's exit date.** It moves to 2026-09-30, so the case tests the part-year as well as the full years. Case 9 runs exactly four.
4. **10b's extra exit value, $2M,** shows the curve where the carve-out is smallest.
5. **22's company** keeps every count round. There is no preferred before the Series A, so whether the warrants trigger anti-dilution can't come up. R29 records that they never do.
6. **The engine line above.** It's a refusal, not new behavior.

## Open questions

None beyond X17. M5d (warrants) is next. I'm stopping here.
