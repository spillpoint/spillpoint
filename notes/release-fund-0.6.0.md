# spillpoint-fund 0.6.0: management fees on invested capital

spillpoint-fund 0.6.0 can charge a management fee step on the fund's net invested capital instead of the LPs' commitments. Each step of a fee schedule has a basis, commitments by default. On invested capital the fee is worked out day by day, each day at that day's net invested capital: the checks made less the cost exited or written off, each event from its own date. So a schedule can switch to invested capital at the end of the investment period, or an SPV charge on invested capital from the start. `netInvestedCapital(fund)` gives the figure at D. A fund with no step on invested capital gives exactly 0.5.0's numbers. The version in `packages/fund/package.json` is 0.6.0; it is published from there, and tagged `fund-v0.6.0`.

> The fund's documents govern, not this tool. spillpoint-fund models common fund terms with documented defaults. Where an LPA differs, it wins.

## What's new in 0.6.0

**The engine** (rules F38 to F40 in `packages/fund/docs/SPEC.md`; choices FA63 to FA67 in `ASSUMPTIONS.md`):
- **New in the input:** a fee step's `basis`, `"commitments"`, the default, or `"invested_capital"`:

  ```json
  "management_fee": {
    "start": "2020-01-01",
    "steps": [{ "rate": "0.02" }, { "rate": "0.015", "from": "2023-01-01", "basis": "invested_capital" }],
    "commitments": "20000000"
  }
  ```

- **What `readFund` gives:** each step's `basis`, a `FeeBasis`, with `"commitments"` filled in when the input leaves it out or gives null (FA63).
- **Net invested capital (F38):** the checks made to a day less the cost realized to it, exited or written off, whole-fund, the GP commitment's part included. Each event counts from its own date.
- **A step on invested capital (F39):**
  - **Each day** counts at the rate on the LPs' part, (1 − g), of that day's net invested capital. With listed LPs it's times their fee weights over their commitments, so a class at a lower fee rate pays less, and each LP's fee is its fee weight's share, as on commitments.
  - **A period's fee** is its days added up, over n × the calendar period's days. The call is that over 1 − g when the GP commitment pays fees.
  - **D's period** counts its days after D at D's net invested capital, before X.
  - **Everything else** is as on commitments: back fees at a later close (F29), and deal by deal the fees due before carry (F35).
- **`feeCalls(fund)`:**
  - **A call on invested capital** has the usual shape, `{ date, firstDay, lastDay, call, lps, gpCommitment, byLp }`.
  - **A period with nothing to call isn't listed,** every day of it on invested capital with nothing invested, or at a rate of 0. So the calls can skip a period, as case 40's 2025 is skipped.
  - **The fund's first call,** `no_calls` and `distribution_before_call` count the schedule's periods by date, one with nothing to call included (FA66).
- **`netInvestedCapital(fund)`:** the fund's net invested capital at D, before X, a `D`. Zero without investments.
- **What a schedule needs (F40):**
  - **A step on invested capital** needs the fund's investments: without them, or with an empty list, it's refused as `missing_field` at `investments`.
  - **A step's `basis`** other than the two words, exactly as written, is `bad_field` at that step's `basis`.
  - **Without listed LPs,** `commitments` is needed only when a step is on commitments. With every step on invested capital they change no amount, and when given they're read.
- **Unchanged:** a fund with no step on invested capital, every 0.5.0 name, and every refusal term. A step's `basis` stops being an unsupported term.

**The page,** at `spillpoint.github.io/spillpoint/fund/`:
- **Terms:**
  - **Each fee step's On,** beside its rate: "Commitments" or "Invested capital". A step added starts on the basis of the step above it.
  - **A line under the steps:** "Invested capital is the cost of the fund's investments, less the cost of what it has exited or written off. Each day of a period counts at that day's invested capital."
  - **"The LPs' total commitments"** is asked for only when the fund lists no LPs and a step is on commitments.
  - **A step on invested capital without investments** says so under its On: "A fee on invested capital needs the fund's investments. Add them on the Investments tab."
- **Cash flows:**
  - **Under the schedule's calls,** with a step on invested capital: "Net invested capital at 30 Jun 2024: $7,000,000."
  - **On the whole fund,** a distribution that names no investment says beside it: "Names no investment, so it doesn't lower invested capital."
- **The headline's terms line** names each step's base when a step is on invested capital: "management fee 2% a year on commitments from 1 Jan 2020, 1.5% on invested capital from 1 Jan 2023, called quarterly". With every step on commitments it reads as in 0.5.0.
- **Files:** a saved file keeps each step's basis, a step on commitments without the word, and an opened one brings it back.
- **A new example:** "A fee that moves to invested capital", case 38.

## Upgrading from 0.5.0

- **Nothing changes without a step on invested capital,** digit for digit. A fund whose schedule has no step on invested capital, or no schedule, splits exactly as in 0.5.0.
- **A step's `basis` is read,** no longer unsupported, and a bad one is `bad_field`.
- **Without listed LPs,** a schedule's `commitments` are needed only with a step on commitments.
- **TypeScript code that builds a `FeeStep` by hand** needs `basis`. A fund from `readFund` always has it. JavaScript that builds a step without it is on commitments, so the fund splits as 0.5.0 split it (FA67).

## Stable names

**Unchanged:** nothing stable from 0.5.0 is renamed or reused.

**Added in 0.6.0:**
- **`FeeBasis`** and its two words, `"commitments"` and `"invested_capital"`
- **`FeeStep.basis`**
- **`netInvestedCapital`**
- **the input's** step `basis`

The package's README lists each stable name with what it means.

## How it's tested

**Three new cases** (`packages/fund/cases`), each with a plain-English derivation:
- **Case 38:** no listed LPs, quarterly, 2% of $20,000,000 of commitments for three years, then 1.5% of net invested capital from 1 Jan 2023. A new investment, an exit and a write-off, each inside a quarter, change the fee from their own date. The six calls on invested capital come to $232,461.39, $1,432,461.39 of fees in all; one breakpoint, at $5,446,930.70.
- **Case 39:** deal by deal, half-yearly, 2% of commitments then 1.75% of net invested capital from 1 Apr 2023, inside a half-year. An Anchor class at a 1% fee joins at a later close, a friends-and-family class pays no fees, and a 2% GP commitment pays its share. A half sale and a write-off lower the fee from their dates.
- **Case 40:** an SPV's fee, 2% a year of its invested capital from the start, called yearly, with no commitments. Final, with nothing to call for 2025, after its exit.
- **Fifteen refusals,** one or more for each line of F40 and where it meets 0.4.0's and 0.5.0's checks.
- **Where their values come from:** the independent calculator in exact fractions (`packages/fund/reference`), as before, adding up each fee one day at a time.
- **The rest:** the engine meets every amount to the cent, and the other 37 case folders are unchanged.

**Checked independently:**
- **Before it was locked,** cases 38 to 40 and the fifteen refusals were re-derived by hand, and by a separate checker in exact fractions written from SPEC.md alone.
- **The reference,** against that checker:
  - **1,200 random funds,** 870 with steps on invested capital and 169 with the schedule's first periods empty and LPs closing in them.
  - **1,864 single-fault inputs,** each refused, or read, the same.
  - **645,423 checks.**
- **The engine,** on the case folders, 1,800 more random funds and 5,720 single-fault inputs:
  - **9,857,178 amounts,** each to the cent and within 1e-24 of exact.
  - **The rest of what it gives:** 106,380 splits, 16,891 fee calls (4,799 periods with nothing to call), `netInvestedCapital` on every fund that read, 65,554 dues, 90,714 account dues, 7,679 breakpoints and 402,222 LP rows.
  - **Every refusal the same.**
  - **24,444,121 checks.**
- **The page,** on cases 38 to 41 and 70 random funds with steps on invested capital: every step's On, fee call, invested capital line and card cell, and each file saved back the same.

**And as before:**
- **The names:** a test fails if the engine can give a name or a wording the package's README doesn't list.
- **The page's numbers:** each is held to the cases.
- **Privacy:** the built page loads nothing from elsewhere.

## Not modeled yet

- **Management fees beyond these:**
  - fees on invested capital gross of exits, never falling, or net of write-downs, marks below cost
  - the base at each period's first day, or its average, instead of day by day
  - fees in arrears, and anniversary periods
  - fee offsets and waivers
  - a class's fee step that isn't proportional
  - an LP's own fee start
  - each fee call's average invested capital, as an output
- **Deal by deal beyond these:**
  - a pref and a catch-up deal by deal, on what's due
  - unrealized write-downs, marks below cost, due before carry
  - a distribution of unused capital, not from an investment
  - checks funded from a credit line ahead of their calls
  - fees and expenses due by another rule: all of them first, or by how long each investment was held
  - spillpoint exits feeding the investments' proceeds
- **Back fees beyond these:** interest on back fees, and back fees paid to the fund and shared between the LPs already in.
- **A class's own terms beyond the fee rate and the carry:** its own pref or catch-up, or its own expenses.
- **Later closes beyond these:** a close after a distribution; a fund that keeps a joining LP's catch-up to reduce its next call; equalization interest treated as capital; the GP commitment in the equalization.
- Defaulted or excused LPs.
- Tier 1's capital as invested capital only, or as committed capital, instead of everything paid in.
- A compounding pref, or an IRR hurdle: refused as `compounded_pref`, or by the hurdle's own key.
- A step's higher rate on all profit, with a GP catch-up to it.
- An after-tax clawback cap, a carry holdback or escrow, and interim clawback tests.

A term the engine doesn't model is refused, never quietly ignored.
