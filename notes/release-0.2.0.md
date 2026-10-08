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
- **SAFEs still outstanding at a sale** (M5g): each takes the greater of its Cash-Out Amount and its Conversion Amount (YC).
  - **Conversion:** post-money, with one Liquidity Capitalization for the company; or pre-money; or, with no cap, at the sale's common price less its discount, where that price exists.
  - **Cash-Out Amounts** rank ahead of common, with the most junior preferred tier or a named one.
  - **Several SAFEs** share a shortfall pro rata.
  - **A cap table built from rounds** carries its outstanding SAFEs, and an exit on it pays them.
- **Convertible notes still outstanding at a sale** (M5h): each takes the greater of repayment, as debt ahead of all equity, and conversion at its pre-money cap, or with no cap at the sale's common price less its discount. Several notes share a shortfall pro rata. The exit needs an `exit_date`. A cap table built from rounds carries its outstanding notes.
- **Escrow and earnouts** (M5i): `paySchedule` pays each payment's take on cumulative proceeds, with every decision re-made at each step. A take can be negative when a later payment tips a series into converting; it is reported as is, and `lowered` names the holders it falls for.
- **Management carve-outs** (M5f): a percentage of the exit value in marginal tiers, paid to listed people before the preferences or alongside them in the most senior tier. Alongside them, payouts curve while that tier isn't paid in full. A breakpoint there is where the formula changes.
- **A round's seniority** may leave out the series its SAFEs and notes convert into (R28, M4j). They then rank alongside its new series.

*Every term planned for M5 is in. Nothing is refused as `"M5"` any more; the `Milestone` type keeps the value, so 0.1.0 code that compares with it still typechecks.*

## New in the API

- **`paySchedule(table, schedule)`:** a new function, for escrow and earnouts. It returns a `PaymentTake` for each payment.
- **`prepare(capTable, exitDate)`:** the exit date is a new, optional second argument. It is needed only when a series has cumulative dividends.
- **`readExit` and `readInputs`** return `exitDate`.
- **New types:** `PaymentSchedule`, `PaymentTake`, `WarrantClass`, `CumulativeDividend`, `SeriesHere`, `CarveOut`, `CarveOutHere` and `SafeHere`. `Safe` is the same type as in 0.1.0, now exported from the model, with an optional `cashOutRanksWith`. `Note` is too, unchanged. Also `NoteTerms` and `NoteHere`.
- **New fields:**
  - **`Payout.series`:** each series' shares, preference, dividends, claim, cap and as-converted shares at that exit value.
  - **`PreparedCapTable.dividends`** and **`.exitDate`**.
  - **`Payout.carveOut`:** its claim, what it's paid and its tier.
  - **`Payout.curved`:** whether payouts curve at that exit value.
  - **`Breakpoint.curveBelow`** and **`.curveAbove`**.
  - **`Payout.safes`** and **`.safeCash`:** each SAFE's decision, its Liquidity Capitalization, price and shares, and the shared Cash-Out claim.
  - **`Payout.notes`** and **`.noteDebt`**, and **`PreparedCapTable.notes`:** each note's interest, repayment, base, price and shares, and the debt.
- **Optional fields,** so 0.1.0 code that builds these objects by hand keeps working:
  - **`PreferredSeries.cumulativeDividend`:** missing means no dividends.
  - **`ExitInput.exitDate`.**
  - **`CapTable.carveOut`.**
  - **`ExitInput.paymentSchedules`.**
  - **`CapTable.unconvertedSafes`** and **`.unconvertedNotes`.** A table from `buildCapTables` has them when SAFEs or notes are outstanding.
- **`Decisions.exercised`** now holds exercised warrants as well as option classes, and **`Decisions.converted`** holds SAFEs taking their Conversion Amount and converting notes as well as converting series.

## Changes that can break 0.1.0 code

These come from new terms widening a union. They break only code that switches over every member and must handle each one. **None is avoidable:** each new term needs its own member.

- **`Security` has a new kind, `"warrant"`.** This is the one you're most likely to meet: code that switches over every security kind needs a `"warrant"` branch.
- **`EventDetails["kind"]` has `"issue_warrants"`.** It comes from the new event.
- **`ReasonCode` has `"warrant_in_the_money"`, `"carve_out_tier"`, `"payouts_curve"`, `"safe_cash_out_paid"`, `"safe_switches"`, `"note_repayment_paid"` and `"note_switches"`.** Later M5 terms may add more.

## Refusals

- **No longer refused:**
  - warrants (term `"warrant"`)
  - cumulative dividends (term `"cumulative_dividend"`)
  - management carve-outs (term `"carve_out"`)
  - SAFEs still outstanding at a sale (term `"unconverted_safe"`), on a cap table given in full or built from rounds
  - notes still outstanding at a sale (term `"unconverted_note"`), likewise
  - payment schedules (term `"payment_schedules"`)
- **Newly refused** (milestone `"later"`, until a case settles them):
  - **`"dividends_added_to_conversion"`:** dividends added to what converts, rather than paid in cash on conversion.
  - **`"cumulative_dividend_in_rounds"`:** dividends on a series issued by an `issue` event rather than a priced round.
  - **`"several_safes"`:** more than one SAFE at a sale, unless each has a post-money cap.
  - **`"pre_money_safe_with_preferred"`:** a pre-money SAFE at a sale alongside preferred stock.
  - **`"uncapped_safe_with_capped_participation"`:** a SAFE with no cap alongside capped participating preferred.
  - **`"several_notes"`:** more than one note at a sale, unless each has a cap.
  - **`"note_with_safe_or_carve_out"`:** a note at a sale alongside a SAFE or a carve-out.
  - **`"uncapped_note_with_capped_participation"`:** a note with no cap alongside capped participating preferred.

## Payouts

- **A carve-out's recipients** get a line each, under the security `"carve_out"`, after the lines for the cap table's positions. A recipient need hold no equity.
- **Each SAFE, then each note,** gets its own line, under its id, after those.

## Messages

- **The grant message** groups its digits, as in "1,100,000 options" (M4k).
