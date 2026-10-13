# spillpoint-fund 0.1.0: the fund waterfall

The first release of spillpoint-fund, the fund-level waterfall: how a fund's distribution splits between its LPs and its GP, tier by tier, with every breakpoint explained and any clawback the GP owes at the fund's last distribution. It's a second package beside spillpoint, with its own rules, cases and reference, and its own page on the site. The version in `packages/fund/package.json` is 0.1.0; it is published from there, and tagged `fund-v0.1.0`.

> The fund's documents govern, not this tool. spillpoint-fund models common fund terms with documented defaults. Where an LPA differs, it wins.

## What 0.1.0 is

**The engine,** on npm as `spillpoint-fund`:
- **`readFund`** checks a fund's input: its terms, its cash flows, the distribution date D, whether the distribution on D is the fund's last, and its NAV. It refuses anything it can't run with one `FundRefusal`, naming the kind, the term and the path.
- **`splitAt`** splits one more distribution, X, on D, by tier, for X alone and the fund to date. With it: the LPs' and the GP commitment's paid-in, the pref accrued to D, the LPs' net multiple, and, when final, the clawback.
- **`splitAtNav`** is the split as if the fund were liquidated at NAV.
- **`findBreakpoints`** finds every X where a tier ends or the clawback owed changes, each with its reasons in plain English.
- **Exact numbers:** 40-digit decimals throughout, so every breakpoint is exact. `toCents` rounds an amount for showing.

**The rules** (`packages/fund/docs/SPEC.md`, F1 to F18; choices in `ASSUMPTIONS.md`):
- a European (whole-fund) waterfall, cumulative across the fund's life
- investment, fee and expense calls all as the LPs' capital
- a GP commitment, fee-free and paying its share of expenses by default, outside the tiers with no carry
- the LPs' capital, a simple pref (Actual/365 from each call), a full or partial catch-up, and carry, flat or in steps by the LPs' net multiple on distributions
- a clawback at the end: one run of the tiers on the fund's totals, gross of tax, one way only

**The page,** at `spillpoint.github.io/spillpoint/fund/`, beside the main page, which links to it in its footer:
- **Payouts:**
  - **The answer first,** in one frame: this distribution, or, at a final fund's last distribution and at NAV, the GP's carry over the fund's life, with what it gets now and gives back.
  - **X** typed, on a slider, or by a click or tap on the chart, which lands on a breakpoint or NAV within 8 pixels.
  - **The chart and the split:** a chart of the LPs', the GP's carry and the GP commitment's lines, drawn exactly, and the split by tier, as one table or two where one wouldn't fit.
  - **The clawback** with a small chart of its own, and every breakpoint in the engine's words.
- **Terms:** carry flat or in steps, the pref, the catch-up, the GP commitment and its flags, rates typed as percents and written exactly.
- **Cash flows:** a table, cards where it wouldn't fit. Rows can be pasted from a spreadsheet, with a preview that says what it read and why it couldn't read a row.
- **Refusals** in plain words under the field the engine names, the payouts staying on the last good fund.
- **Open and save** a local file, `{"format": "spillpoint-fund", "version": 1, ...}`, whose `fund` is the engine's input. A blank fund, or four fictional examples from the cases.
- **Everything runs in the browser.** The page makes no network requests and keeps nothing in the browser. The fund's numbers never leave the computer unless a file is saved.

## Stable from 0.1.0

Code can match on these, and none is renamed or reused from 0.1.0. The package's README lists each with what it means.
- **`FundRefusal`'s kinds:** `unsupported`, `input`.
- **Its input terms:** `bad_number`, `bad_date`, `bad_field`, `missing_field`, `unknown_field`, `carry_rate_not_below_one`, `steps_out_of_order`, `catch_up_without_pref`, `catch_up_share_not_above_carry`, `gp_commitment_not_below_one`, `no_calls`, `distribution_before_call`, `cash_flow_after_distribution_date`.
- **Its unsupported terms:** `compounded_pref`, and any other key named by itself.
- **The reasons:**
  - `ReasonCode`: `capital_returned`, `pref_met`, `catch_up_done`, `carry_step`, `clawback_cleared`, `clawback_starts`, `clawback_changes`
  - `ClawbackChange`: `starts_to_fall`, `stops_falling`, `falls_faster`, `falls_more_slowly`
  - each reason's wording

## How it's tested

- **Fifteen worked cases and fifteen refusals** (`packages/fund/cases`), each with a plain-English derivation. Their expected values come from an independent calculator in exact fractions (`packages/fund/reference`), which finds breakpoints by search, not from tier sizes. The engine meets every amount to the cent and every breakpoint exactly. Jordan re-derived the cases with his own checker.
- **Beyond the cases:**
  - **Random funds:** Jordan's checker agreed with the engine's breakpoints on 6,026 random funds (f01c).
  - **The clawback** never rises as X grows, on the reference's random funds too.
- **The names:** a test fails if the engine can give a name or a wording `docs/STABLE.md` and the package's README don't list, or a list has one the engine doesn't give.
- **The page:**
  - **Its numbers:** each is held to the cases' `expected.json`.
  - **Its chart:** the lines are exact between breakpoints.
  - **The forms** write every case's terms and cash flows back exactly.
  - **Open and save:** each case's `inputs.json` opened and saved has the same values.
  - **Privacy:** the built page, and the site with it under `fund/`, load nothing from elsewhere.
  - **By Jordan, on the built page in headless Chromium:**
    - random funds typed, pasted and opened, against his checker
    - taps on the charts
    - the keyboard alone
    - every width from 320 to 1400 pixels

## Not modeled yet

- American (deal-by-deal) carry.
- Per-LP accounts: closes, equalization, side letters' fee or carry breaks.
- Capital as invested capital only, or committed capital.
- A compounding pref, or an IRR hurdle: refused as `compounded_pref`, or by the hurdle's own key.
- A step's higher rate on all profit, with a GP catch-up to it.
- An after-tax clawback cap, a carry holdback or escrow, and interim clawback tests.

A term the engine doesn't model is refused, never quietly ignored.
