# spillpoint 0.2.0: release notes (draft)

**A draft, kept up to date through M5.** M5j finishes it and releases 0.2.0. Until then, 0.1.0 is what's on npm.

## New

- **Warrants** (M5d):
  - for common or for a preferred series, at a sale
  - each decides for itself whether to exercise
  - a warrant for a series adds its shares to the series, with its preference, participation, cap and conversion
  - reported net of strike
- **Warrants issued** (M5d): the `issue_warrants` event. Warrants count like options everywhere a count includes issued options, aren't drawn from the pool, and never trigger anti-dilution.
- **Cumulative dividends** (M5e):
  - simple, or compounding annually on the accrual start's anniversaries
  - added to the preference at 1x
  - forfeited on conversion, or paid on conversion in the series' own tier
  - an exit with them needs an `exit_date`
- **Dividends on a priced round's series** (M5e3): they accrue from the round's date. The series its SAFEs and notes convert into carry the same terms, on their own issue price.
- **Management carve-outs** (M5f): a percentage of the exit value in marginal tiers, paid to listed people before the preferences or alongside them in the most senior tier. Alongside them, payouts curve while that tier isn't paid in full. A breakpoint there is where the formula changes.
- **A round's seniority** may leave out the series its SAFEs and notes convert into (R28, M4j). They then rank alongside its new series.

*To come in M5: SAFEs and notes outstanding at a sale, and escrow and earnouts.*

## New in the API

- **`prepare(capTable, exitDate)`:** the exit date is a new, optional second argument. It is needed only when a series has cumulative dividends.
- **`readExit` and `readInputs`** return `exitDate`.
- **New types:** `WarrantClass`, `CumulativeDividend`, `SeriesHere`, `CarveOut` and `CarveOutHere`.
- **New fields:**
  - **`Payout.series`:** each series' shares, preference, dividends, claim, cap and as-converted shares at that exit value.
  - **`PreparedCapTable.dividends`** and **`.exitDate`**.
  - **`Payout.carveOut`:** its claim, what it's paid and its tier.
  - **`Payout.curved`:** whether payouts curve at that exit value.
  - **`Breakpoint.curveBelow`** and **`.curveAbove`**.
- **Optional fields,** so 0.1.0 code that builds these objects by hand keeps working:
  - **`PreferredSeries.cumulativeDividend`:** missing means no dividends.
  - **`ExitInput.exitDate`.**
  - **`CapTable.carveOut`.**
- **`Decisions.exercised`** now holds exercised warrants as well as option classes.

## Changes that can break 0.1.0 code

These come from new terms widening a union. They break only code that switches over every member and must handle each one. **None is avoidable:** each new term needs its own member.

- **`Security` has a new kind, `"warrant"`.** This is the one you're most likely to meet: code that switches over every security kind needs a `"warrant"` branch.
- **`EventDetails["kind"]` has `"issue_warrants"`.** It comes from the new event.
- **`ReasonCode` has `"warrant_in_the_money"`, `"carve_out_tier"` and `"payouts_curve"`.** Later M5 terms may add more.

## Refusals

- **No longer refused:**
  - warrants (term `"warrant"`)
  - cumulative dividends (term `"cumulative_dividend"`)
  - management carve-outs (term `"carve_out"`)
- **Newly refused** (milestone `"later"`, until a case settles them):
  - **`"dividends_added_to_conversion"`:** dividends added to what converts, rather than paid in cash on conversion.
  - **`"cumulative_dividend_in_rounds"`:** dividends on a series issued by an `issue` event rather than a priced round.

## Payouts

- **A carve-out's recipients** get a line each, under the security `"carve_out"`, after the lines for the cap table's positions. A recipient need hold no equity.

## Messages

- **The grant message** groups its digits, as in "1,100,000 options" (M4k).
