# spillpoint-fund 0.4.0: management fees

spillpoint-fund 0.4.0 works out management fees. A fund's fees can still be entered as fee calls, or a schedule works them out: a rate a year on commitments, with steps by date, called in advance each calendar quarter, half-year or year. And a fee call before a later close is now each LP's own, as it is in practice: the joining LP pays its own fees for the calls before its close, its back fees, to the manager, and fees aren't rebalanced between the LPs. That fixes 0.3.0's known limitation. A fund without a schedule, and with no fee call before a later close, splits exactly as in 0.3.0. The version in `packages/fund/package.json` is 0.4.0; it is published from there, and tagged `fund-v0.4.0`.

> The fund's documents govern, not this tool. spillpoint-fund models common fund terms with documented defaults. Where an LPA differs, it wins.

## What's new in 0.4.0

**The engine** (rules F29 to F32 in `packages/fund/docs/SPEC.md`; choices FA39 to FA48 in `ASSUMPTIONS.md`):
- **New in the input, `terms.management_fee`:** the schedule.
  - **`start`:** the date fees start. The first period runs from it, pro rata by its days.
  - **`frequency`:** `"quarterly"`, the default, `"semiannual"` or `"annual"`, on calendar periods, called in advance on each period's first day.
  - **`steps`:** the rates a year on commitments. The first is in force from the start, and each later one `from` a date. A step inside a period is worked by its days, and a rate of 0 stops fees until a later step.
  - **`commitments`:** the LPs' total commitments, the fee's base when the fund lists no LPs. With listed LPs, theirs are the base, and each LP pays the rate on its own commitment.
  - **With a schedule,** its first rate is the fund's, so `fee_rate` isn't given, and a class's fee rate is set against it. No fee call is entered, so nothing is counted twice.
- **`fund.terms.managementFee`:** the schedule as `readFund` read it, null without one. It's a `ManagementFee`: `start`; `frequency`, a `FeeFrequency`, filled in when not given; `steps`, each a `FeeStep` with its `rate` and its `from`, null for the first; and `commitments`, null when not given.
- **`feeCalls(fund)`:** the schedule's calls to D, in date order, or null without a schedule.
  - **Each is a `FeeCall`:** its `date`; the `firstDay` and `lastDay` it covers; the `call`; the LPs' part, `lps`; the GP commitment's part, `gpCommitment`, zero when it's fee-free; and `byLp`, each LP's own fee, as an `LpFee` with its `name` and `fee`.
  - **Every amount exact.** A new list each time, so a caller's edits change nothing the engine keeps.
  - **The split, the breakpoints and the clawback** run on the schedule's calls as on entered fee calls.
- **Fee calls at a later close (F29):** a fee is each LP's own, on its own commitment by its fee weight.
  - **A joining LP** owes its own part of each fee call before its close, its back fees, paid to the manager with no interest.
  - **In the waterfall,** every LP is in from the start, so each fee call counts at its full size, the joiners' back fees in it.
  - **Only investment and expense calls** are rebalanced at a later close, with equalization interest.
- **`EqualizationAmounts.backFees`:** each joining LP's back fees at its close, and over all the closes.
- **`Equalization.rate` can be null:** an equalization rate is needed only when an investment or expense call comes before a later close, so a fund with only fee calls before its closes can leave it out.
- **Three new input terms in `FundRefusal`:**
  - `fee_rate_with_schedule`: a `fee_rate` given beside a schedule
  - `fee_call_with_schedule`: an entered fee call beside a schedule, at the first in the input's order
  - `fee_commitments_mismatch`: a schedule's `commitments` that isn't the listed LPs' total
- **`call_without_payers` also at `terms.management_fee`:** a schedule no listed LP pays, every one in a class at a fee rate of 0, as an entered fee call nobody pays is refused.
- **Refused as unsupported:** a schedule's field other than its `start`, `frequency`, `steps` and `commitments`, such as an `offset`, and a step's other than its `rate` and `from`.
- **Unchanged:** the tiers, the clawback, the accounts and every 0.3.0 name, but for `Equalization.rate`, below.

**The page,** at `spillpoint.github.io/spillpoint/fund/`:
- **Terms: "Management fee."** Fees can be entered as fee calls, or come from a schedule: when fees start, how often they're called, the rates by date a step at a time, and, when the fund lists no LPs, the LPs' total commitments.
  - **With a schedule,** the management fee rate goes, since the schedule's first rate is the fund's.
  - **The equalization rate's words** say it's needed only when an investment or expense call comes before a later close.
- **Cash flows, with a schedule:**
  - **"The schedule's fee calls"** sit under the table: each call's date, the days it covers, the call and the GP commitment's part, then a total. On a phone each call is a card.
  - **Fee isn't a kind to choose.** A Fee row already there, or in a paste, says the fund's fees come from its schedule.
- **Payouts:**
  - **The equalization card** has a Back fees column, paid to the manager, in its CSV too. With no rate it says so in place of the rate.
  - **The headline's terms line** names the schedule.
  - **The line under the picker** counts the schedule's calls among the calls paid in.
- **Files:** a saved file keeps the schedule, and an opened one brings it back.
- **A new example:** "A fund with a 2% fee schedule".

## The fix: fee calls before a later close

0.3.0's known limitation is fixed (F29). 0.3.0 rebalanced a fee call made before a later close between the LPs, as a capital call is: the joining LP paid its share of it to the LPs already in, with equalization interest. In 0.4.0 the joining LP pays its own fees for it, its back fees, to the manager, and the LPs already in pay and get back nothing for it.

**What changes, in the two cases it touches:**
- **Case 25,** one later close: the LPs' paid-in is $7,060,000, not $7,040,000, and Cedar's back fees are $20,000.
- **Case 26,** two later closes: the LPs' paid-in is $5,300,000, not $5,250,000, and Birchwood's back fees are $50,000. At Birchwood's close it pays $666,666.67 of capital and $9,863.01 of interest, not $700,000.00 and $10,356.16, since the fee call is no longer rebalanced.

## Upgrading from 0.3.0

- **A fund with a fee call before a later close gives different numbers,** as above: the LPs' paid-in, each LP's and each account's amounts, the breakpoints, and the equalization, whose capital and interest are now on investment and expense calls alone, with back fees beside them.
- **An equalization rate is needed** only when an investment or expense call comes before a later close. A fund whose later closes have only fee calls before them reads without one.
- **`Equalization.rate` is `D | null`,** was `D`: null when no rate is given. Code that reads it checks first.
- **TypeScript code that builds a `Fund` by hand** needs `terms.managementFee: null`. A fund from `readFund` always has it. JavaScript that builds one as 0.3.0 did still splits, as a fund without a schedule.
- **Nothing else changes:** a fund without a schedule and with no fee call before a later close splits exactly as in 0.3.0, digit for digit.

## Stable names

**Unchanged:** nothing stable from 0.3.0 is renamed or reused. One type is widened: `Equalization.rate`, now `D | null`.

**Added in 0.4.0:**
- **`fee_rate_with_schedule`, `fee_call_with_schedule` and `fee_commitments_mismatch`,** to `FundRefusal`'s input terms, and `call_without_payers` at `terms.management_fee`
- **the input's `terms.management_fee`,** with its `start`, `frequency`, `steps` (each `rate` and `from`) and `commitments`
- **the fields above:** `fund.terms.managementFee` (`ManagementFee`, `FeeStep`, `FeeFrequency`), `feeCalls` (`FeeCall`, `LpFee`) and `EqualizationAmounts.backFees`

The package's README lists each stable name with what it means.

## How it's tested

**Five new or reworked cases** (`packages/fund/cases`), each with a plain-English derivation:
- **Three new worked cases:**
  - a schedule with no listed LPs, $40,000,000 of commitments, 2% a year called quarterly stepping to 1.5% in year six, with a pref and a full catch-up
  - two LPs, fees called half-yearly, a step inside a half-year, a GP commitment that pays fees, and a clawback at the end
  - classes and a later close, the joining LP's back fees beside its capital and interest
- **Two of 0.3.0's worked again** under F29: cases 25 and 26, above.
- **Thirty-seven refusals,** one or more for each line of F32 and for the order of checks where the schedule meets the others.
- **Where their values come from:** the independent calculator in exact fractions (`packages/fund/reference`), as before, the schedule's calls worked out from F30's periods.
- **Locked only after re-derivation:** each of the five new or reworked cases and the thirty-seven refusals was re-derived independently before it was locked, by hand and by a separate checker in exact fractions written from SPEC.md alone.
- **The rest:** the engine meets every amount to the cent, and the other 26 case folders are unchanged.

**Checked independently, beyond the cases:**
- **The reference,** against that checker on 1,600 random funds with fees, schedules and entered fee calls before later closes, and on 4,596 single-fault inputs, each refused, or read, the same.
- **The engine,** on 1,800 more:
  - 7,532,347 amounts, each to the cent and within 1e-24 of exact
  - 348,655 LP rows, 6,851 breakpoints, 9,332 fee calls and 44,790 equalization amounts
  - 4,825 single-fault inputs, each refused, or read, the same
- **The page,** built, in headless Chromium, on cases 25, 26 and 29 to 32 and 30 random funds with schedules: every fee call, every cell of the cards, and each file saved back the same.

**And as before:**
- **The names:** a test fails if the engine can give a name or a wording the package's README doesn't list.
- **The page's numbers:** each is held to the cases.
- **Privacy:** the built page loads nothing from elsewhere.

## Not modeled yet

- **Management fees beyond a rate on commitments:** fees on invested capital, gross or net of exits and write-offs; anniversary periods; fees in arrears; fee offsets and waivers; a class's fee step that isn't proportional; an LP's own fee start.
- **Back fees beyond these:** interest on back fees, and back fees paid to the fund and shared between the LPs already in.
- **A class's own terms beyond the fee rate and the carry:** its own pref or catch-up, or its own expenses.
- **Later closes beyond these:** a close after a distribution; a fund that keeps a joining LP's catch-up to reduce its next call; equalization interest treated as capital; the GP commitment in the equalization.
- Defaulted or excused LPs.
- American (deal-by-deal) carry.
- Capital as invested capital only, or committed capital.
- A compounding pref, or an IRR hurdle: refused as `compounded_pref`, or by the hurdle's own key.
- A step's higher rate on all profit, with a GP catch-up to it.
- An after-tax clawback cap, a carry holdback or escrow, and interim clawback tests.

A term the engine doesn't model is refused, never quietly ignored.
