# Review: M5e2 (case 23: dividends from a round)

Branch `m5e2-dividends-in-rounds-case`, a small cases PR. It adds **case 23**:
- **The round:** a priced round with cumulative dividends on its series, which also converts a post-money SAFE at its discount.
- **The sale:** a sale on the cap table after the round.

It records your rule as **R30**. There is no engine code: the engine refuses case 23 until the next PR builds R30.

**The `cases-locked` check fails on this PR until you add `unlock-cases`,** which you'll do once the case is re-derived independently.

## Run it

```bash
python3 reference/generate.py --check
```

This prints `ok` for all 61 cases.

## The rule (R30, your M5e review)

- **The round's series accrues its dividends from the round's date.** The input gives a `rate`, a `method` and `on_conversion`, and no `accrual_start`. The round must have a date.
- **The series its SAFEs and notes convert into** carry the same dividend terms from the same date. They are calculated on their own issue price, their conversion price, as their preference already is.
- **The cap tables after the round** show the `accrual_start`, so an exit on them reads like any other table with dividends.

## Case 23

Case 15's company and rounds, with an **8% simple cumulative dividend on the Series A**, forfeited on conversion. Sold on **2026-06-30**, 1,096 days after the round, 29 February 2024 included.

| Series | Issue price | Shares | Accrued | Preference with dividends |
|---|---:|---:|---:|---:|
| Series A | $2.50 | 2,000,000 | $1,201,095.89 | $6,201,095.89 |
| Series A (from SAFEs) | $2.00 (the SAFE's discount price) | 300,000 | $144,131.51 | $744,131.51 |

| Breakpoint | Why |
|---:|---|
| $6,945,227.40 | The tier is paid in full, dividends included. |
| $8,445,227.40 | The $0.25 options come into the money. |
| $22,943,076.71 | The series from SAFEs converts, at $2.480438 a share, giving up its dividends. |
| $27,159,821.92 | Series A converts, at $3.100548 a share. |

**What to check by behavior:**
- **The tier:** at $3M the two series split it pro rata by claim, Investor S $321,428.57 and Investor X $2,678,571.43.
- **At $25M:** Investor S has converted and gets $834,878.12, and Investor X still takes $6,201,095.89.
- **At $40M:** both have converted. Investor X gets $9,119,318.18.

## How I made it

1. **By hand,** with exact fractions, without the reference.
2. **The reference,** extended in one place: where a priced round reads its series, it sets the dividends' start to the round's date. The series from SAFEs and from notes copy the round's series, so they pick it up. A round's series that gives its own `accrual_start` is refused, and so is a round with dividends and no date.
3. **The comparison:** the two agree exactly on all 55 holder amounts and all 4 breakpoints. The reference's cap table shows both series with `accrual_start` 2023-06-30.

## What changed

- **`cases/edge-23-dividends-from-a-round/`:** `inputs.json`, `expected.json` and `DERIVATION.md`.
- **`reference/spillpoint_ref/rounds.py`:** R30, with its two refusals.
- **`reference/tests/`:** one new test. It checks the start date on both series, the series from SAFEs on its own issue price, and both refusals.
- **`docs/ASSUMPTIONS.md`:**
  - **R30:** new, your rule.
  - **X5:** points to R30.
  - **C3:** case 23.
- **`docs/SPEC.md`:** case 23 in the list.
- **The engine's tests** expect 23 to be refused for now:
  - **`input.test.ts`:** it is refused for `cumulative_dividend_in_rounds`, milestone "later". The test now accepts that milestone's wording.
  - **`rounds.test.ts`:** 29 cases with events, 28 of them built. A new test checks that 23 is refused at its round's dividends, rather than built without them.

## Checks

- **Reference:** 47 unit tests pass, and all 61 cases match. No locked case changed.
- **Engine:** 862 tests pass.
- **Dashboard:** 178 tests pass. The new one round-trips 23's events through the rounds editor.
- **Build:** succeeds.

## CI and permissions

- **No changes to `.github/workflows/`.**
- **`.claude/settings.json`:** your local change, which lifts the `cases/` rule for this PR, is **not committed**.
- **`cases-locked`** fails until you add `unlock-cases`.

## Next, after this merges

**One small engine PR:**
- **R30 in the engine's round builder,** so case 23 builds and its exit matches.
- **`cumulativeDividend` optional on `PreferredSeries`,** missing meaning no dividends, so 0.1.0 code that builds series keeps working.
- **Draft 0.2.0 release notes,** listing the new `"warrant"` kind as the one unavoidable change for code that switches over every security kind.

Then M5f.

## Open questions

None. I'm stopping here.
