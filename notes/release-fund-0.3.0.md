# spillpoint-fund 0.3.0: classes and later closes

spillpoint-fund 0.3.0 lets a fund's LPs differ. A class of LPs can have a side letter's fee rate and carry, and runs the waterfall as an account of its own, with its own clawback. An LP can join at a later close: it's treated as in from the start, and the equalization between the LPs at each close is worked out. A fund whose LPs are all on the fund's terms and in from the start splits exactly as in 0.2.0. The version in `packages/fund/package.json` is 0.3.0; it is published from there, and tagged `fund-v0.3.0`.

> The fund's documents govern, not this tool. spillpoint-fund models common fund terms with documented defaults. Where an LPA differs, it wins.

## What's new in 0.3.0

**The engine** (rules F22 to F28 in `packages/fund/docs/SPEC.md`; choices FA21 to FA38 in `ASSUMPTIONS.md`):
- **New in the input:**
  - **`terms.lp_classes`:** each class a `name`, with its own `fee_rate`, its own `carry` (flat or in steps, as the fund's), or both. A class changes only the fee and the carry; the pref, the catch-up's share and the GP commitment are the fund's.
  - **`terms.fee_rate`:** the fund's standard management fee rate, which a class's own is set against. Needed when a class has one. Each LP pays fee calls in proportion to its commitment times its class's fee rate over the fund's, so "0" pays none.
  - **`terms.equalization_rate`:** the interest a later-close LP pays on what it catches up, simple, a year. Needed when an LP has a later close, "0" for none.
  - **An LP's `class` and `close`:** its class's name, or none for the fund's terms; and the date it joined, or none for in from the start.
- **`fund.terms.feeRate`, `equalizationRate` and `lpClasses`** (`LpClass`: `name`, `feeRate`, `carry`), and each `Lp`'s **`class`** and **`close`**: what `readFund` read, null where not given.
- **`split.byAccount`,** from `splitAt` and `splitAtNav`, with two or more accounts (the LPs on the fund's terms, and each class with LPs), the fund's terms first; empty with one. Each `AccountSplit`:
  - its `class`, null for the fund's terms
  - `distribution` and `toDate` by tier, with its own carry steps
  - `paidIn`, `prefAccrued`, and `lpMultiple`, null when it has nothing paid in
  - `clawback`, when final, settled on its own totals

  The split's own amounts are the accounts' sums.
- **`class` on what names an account:** each `StepCarry` in the GP's carry by step, each `LpAmounts` in `byLp` (with its `close` too), and every breakpoint reason. With two or more accounts, a reason's text starts with its account's name: "Friends and family: LPs have their $1,250,000 of paid-in capital back".
- **"On its own totals":** with two or more accounts, a clawback reason caused by the run on an account's totals says "on its own totals", not "on the fund's totals".
- **`equalization(fund)`:** what moves between the LPs at the later closes, or null without one. Its `rate`; each close in date order, with its `date`, the LPs `joining` and every LP in by then; and each LP over all of them: `capitalPaid`, `capitalReturned`, `interestPaid` and `interestReceived`. Exact, nothing rounded, and outside the waterfall: it changes no split.
- **Four new input terms in `FundRefusal`:**
  - `lp_class_name_repeated`: a class's name an earlier class already has
  - `lp_class_unknown`: an LP's class that isn't one of the fund's classes
  - `lp_close_after_distribution`: a close on or after the fund's first distribution, or on or after D
  - `call_without_payers`: a call no LP in the fund on its date would pay
- **Still refused as unsupported:** a field on a class other than its name, fee rate and carry, such as its own `pref`, and a field on an LP other than its name, commitment, class and close.
- **Unchanged:** the tiers, the clawback and every 0.2.0 name. With one account and no later close, every amount is 0.2.0's, digit for digit.

**The page,** at `spillpoint.github.io/spillpoint/fund/`:
- **Terms:** the management fee rate and the equalization interest rate, which a fund needs only for a class's own fee rate or a later close. Blank leaves each out.
- **The LPs tab:**
  - **A classes table** above the LPs: each class's name, its fee rate (blank for the fund's fees) and its carry (the fund's, flat, or in steps), with "Add a class" and "Remove".
  - **Each LP's class,** a picker of "Fund terms" and the classes, and its **close**, a date. Renaming a class keeps its LPs; removing one moves them to Fund terms and says so.
  - **No class may be named "Fund terms",** the page's name for the fund's own terms.
  - **Problems** in plain words under their cells.
  - **Pasting** takes a class and a close column, the closes read as the cash flows' dates are.
  - **Cards:** each class and each LP is a card wherever its table wouldn't fit its card, so nothing scrolls sideways, down to 320 pixels.
- **Payouts:**
  - **The split's carry rows** name their class with two or more: "Fund terms: carry at 20% (up to 3.0x)".
  - **The headline's terms line** gives each class with LPs after the fund's terms.
  - **A classes card,** with two or more accounts: each class's split this distribution and to date, its paid-in and its LP multiple, and what's owed back to it when some class is owed something.
  - **The clawback card** gives each class's owed, each on its own totals.
  - **The LPs' card** has a Class column, and so does its CSV.
  - **An equalization card,** with a later close: each close, then all of them, every amount rounded down to the cent with a row for what that leaves. "Download as CSV" saves it as `<fund name>-equalization.csv`. Nothing leaves the computer.
- **Files:** a saved file keeps the rates, the classes and each LP's class and close, and an opened one brings them back, names trimmed.
- **A new example:** "Two later closes and a friends-and-family class".

## Upgrading from 0.2.0

**Nothing changes for a fund without classes or later closes:** its split is the same, with an empty `byAccount`, and `equalization` is null.

**TypeScript code that builds a `Fund` by hand** needs the new fields: in `terms`, `feeRate: null`, `equalizationRate: null` and `lpClasses: []`; and on each `Lp`, `class: null` and `close: null`. A fund from `readFund` always has them. JavaScript that builds one as 0.2.0 did still splits, as a fund without classes or later closes.

## Stable names

**Unchanged:** nothing stable from 0.2.0 is renamed or reused.

**Added in 0.3.0:**
- **`lp_class_name_repeated`, `lp_class_unknown`, `lp_close_after_distribution` and `call_without_payers`,** to `FundRefusal`'s input terms
- **the fields above:** `fund.terms.feeRate`, `equalizationRate` and `lpClasses` (`LpClass`), `Lp.class` and `close`, `split.byAccount` (`AccountSplit`), `class` on `StepCarry`, `LpAmounts` and `Reason`, `LpAmounts.close`, and `equalization` (`Equalization`, `LaterClose`, `EqualizationAmounts`)
- **the wordings:** "{account}: {reason}" with two or more accounts, and "on its own totals"

The package's README lists each stable name with what it means.

## How it's tested

**Seven new cases** (`packages/fund/cases`, fund-22 to fund-28), each with a plain-English derivation:
- **Six worked cases:**
  - a friends-and-family class paying no fees and no carry, with a NAV point
  - an anchor class at a lower fee and carry, with a pref and a full catch-up
  - a class at no carry in a fund owing a clawback
  - one later close, with a GP commitment outside the equalization
  - two later closes, the second a friends-and-family LP
  - each class settling its own clawback, with carry in steps
- **Twenty refusals,** one or more for each new line of F28.
- **Where their values come from:** the independent calculator in exact fractions (`packages/fund/reference`), as before, each account its own run of the tiers.
- **Locked only after re-derivation:** each of the seven was re-derived independently, by hand and by a separate checker in exact fractions written from SPEC.md alone.
- **The rest:** the engine meets every amount to the cent, and the 21 earlier case folders are unchanged.

**Checked independently, beyond the cases:**
- **The reference,** against that checker on 1,800 random funds with classes and closes: 59,441 LP rows, each exact, and 6,272 single-fault inputs refused the same.
- **The engine,** on 1,200 more:
  - 4,957,681 amounts, each to the cent and within 1e-24 of exact
  - 244,043 LP rows, 4,007 breakpoints and 33,624 equalization amounts
  - 4,168 single-fault inputs, refused the same, kind, term and path
- **The page,** built, in headless Chromium, on cases 22 to 28 and 30 random funds with classes and closes, at each breakpoint, at NAV and at other X:
  - every cell of the classes card, the owed by class, the LPs' card and the equalization card
  - both CSVs

**And as before:**
- **The names:** a test fails if the engine can give a name or a wording the package's README doesn't list.
- **The page's numbers:** each is held to the cases.
- **Privacy:** the built page loads nothing from elsewhere.

## Not modeled yet

- **A class's own terms beyond the fee rate and the carry:** its own pref or catch-up, a fee break that isn't proportional (a different step-down, a fee offset), or its own expenses.
- **Later closes beyond these:** a close after a distribution; a fund that keeps a joining LP's catch-up to reduce its next call; equalization interest treated as capital; the GP commitment in the equalization.
- Defaulted or excused LPs.
- American (deal-by-deal) carry.
- Capital as invested capital only, or committed capital.
- A compounding pref, or an IRR hurdle: refused as `compounded_pref`, or by the hurdle's own key.
- A step's higher rate on all profit, with a GP catch-up to it.
- An after-tax clawback cap, a carry holdback or escrow, and interim clawback tests.

A term the engine doesn't model is refused, never quietly ignored.

## Known limitation, found after release

A fee call made before a later close is rebalanced between the LPs as a capital call is: the joining LP pays its share of it to the LPs already in, with equalization interest. In practice a joining LP owes its own management fees from the initial close, paid to the manager, and fees aren't rebalanced between LPs. So for a fund with a fee call before a later close, the LPs' paid-in, each LP's amounts and the equalization are off by the joining LP's back fees. Funds without a later close, and investment and expense calls, aren't affected. It's fixed in 0.4.0.
