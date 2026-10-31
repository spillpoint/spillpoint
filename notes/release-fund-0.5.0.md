# spillpoint-fund 0.5.0: investments and carry deal by deal

spillpoint-fund 0.5.0 lists a fund's investments and can pay carry deal by deal. Each investment has its checks, a follow-on another check. A distribution names the investment it comes from and the share of what's left of it that it sells, and a write-off ends what's left of one. The investments table, each one's cost, what's exited or written off, its proceeds and its realized multiple, comes on either basis. Deal by deal, before carry at each distribution, the LPs get back the cost of each investment exited or written off, with its share of fees and expenses. At the end everything paid in is due, and the clawback is the whole fund's. A fund on the whole fund, the default, splits exactly as in 0.4.0, investments or not. The version in `packages/fund/package.json` is 0.5.0; it is published from there, and tagged `fund-v0.5.0`.

> The fund's documents govern, not this tool. spillpoint-fund models common fund terms with documented defaults. Where an LPA differs, it wins.

## What's new in 0.5.0

**The engine** (rules F33 to F37 in `packages/fund/docs/SPEC.md`; choices FA49 to FA62 in `ASSUMPTIONS.md`):
- **New in the input:**
  - **`terms.carry_basis`:** `"whole_fund"`, the default, or `"deal_by_deal"`.
  - **`investments`:** each a `name` and one or more `checks`, each a `date` and an `amount`, the fund's cost with the GP commitment's part included.
  - **On a distribution:** the `investment` it comes from, and the `share` of what's left of it that it sells, `"1"` by default. Deal by deal every distribution names one.
  - **A cash flow of type `"write_off"`,** with a `date` and an `investment` and no amount.
  - **`distribution_from`:** X's investment, and its `share`, `"1"` by default. Needed deal by deal.
- **What `readFund` gives:**
  - **`fund.terms.carryBasis`,** a `CarryBasis`, `"whole_fund"` when not given.
  - **`fund.investments`,** each an `Investment` with its `name` and `checks`, each an `InvestmentCheck` with its `date` and `amount`; empty without any.
  - **A cash flow's `investment` and `share`,** null where it has none; a distribution's share is 1 when not given. A write-off's `type` is `"write_off"`, and its `amount` null.
  - **`fund.distributionFrom`,** a `DistributionFrom` with its `investment` and `share`, or null.
- **`portfolio(fund)`:** the investments table, each investment at D, before X, in the input's order, on either basis. Each is a `PortfolioRow`:
  - **Its amounts:** `name`, `costMade`, `costRealized` (exited or written off), `costWrittenOff` and `proceeds`.
  - **`realizedMultiple`:** proceeds over the cost realized, null while nothing of it is realized.
  - **Every amount exact,** and a new list each time.
- **Carry deal by deal (F35):** at each distribution, the LPs get 100% until their capital back reaches what's due on the investments exited or written off so far.
  - **What's due:** their part of the cost realized, and their fees and expenses to date times the cost realized over the cost made, by cost.
  - **A new investment** lowers the fees' share, so what's due can fall below what's already back. Then nothing comes first, and nothing is taken back.
  - **Each class's account** has its own due: its part of the cost by commitment, its own fees and its expenses.
  - **At the end,** X final or the NAV point, everything paid in is due, capital called and never invested included.
  - **The clawback is F12's,** and each account's own, so the GP keeps at most what the whole fund would give it.
- **`Split.due` and `AccountSplit.due`,** deal by deal, null on the whole fund:
  - **`Split.due`** is a `Due`: `costMade` and `costRealized`, X's realization included; the LPs' `cost`; `uninvested`, zero before the end; `feesAndExpenses`; and `total`.
  - **`AccountSplit.due`** is an `AccountDue`: the account's own `cost`, `uninvested`, `feesAndExpenses` and `total`.
- **`capital_returned` deal by deal:**
  - **Its `amount`** is what's due on X.
  - **Its wording,** when X isn't final: "LPs have their $11,100,000 back for the investments exited or written off, fees and expenses included". When X is final it reads as the whole fund's.
- **Four new input terms in `FundRefusal`:**
  - `investment_name_repeated`: a name an earlier investment already has
  - `investment_unknown`: a distribution's, a write-off's or `distribution_from`'s investment that isn't listed
  - `investment_not_made`: a distribution or a write-off dated before its investment's first check
  - `investments_exceed_calls`: the cost made by a check's date more than the investment calls up to it, the checks and calls added up exactly as written
- **Refused as unsupported:** `deal_by_deal_pref`, a pref with carry deal by deal, since 0.5.0 has no pref deal by deal.
- **Unchanged:** the whole fund, its tiers, the accounts, the closes, the fees and every 0.4.0 name, but for `CashFlow.type` and `CashFlow.amount`, below.

**The page,** at `spillpoint.github.io/spillpoint/fund/`:
- **Terms: "Carry is paid",** on the whole fund or deal by deal. Deal by deal, the pref and catch-up are off, and say why.
- **An Investments tab,** after Cash flows:
  - each investment with its checks, "Add a follow-on", and adding and removing investments
  - under them, the investments table, as cards on a phone
- **Cash flows:**
  - a Write-off type, with its investment and no amount
  - a distribution's From and Share sold, 100% by default
- **Beside X,** deal by deal: From and Share sold.
- **Payouts:**
  - **The headline:** "deal by deal" after the carry.
  - **Under the split:** "Due to LPs before carry", with its parts at the end.
  - **The classes card:** each class's due.
  - **At a deal-by-deal NAV point** whose due differs from the axis's, the line under the chart's values says the values are the liquidation's.
- **Files:** a saved file keeps the basis, the investments, the tags, the write-offs and X's source, and an opened one brings them back.
- **A new example:** "A fund that pays carry deal by deal".

## Upgrading from 0.4.0

- **Nothing changes on the whole fund,** investments or not. A fund with no `carry_basis`, or `"whole_fund"`, splits exactly as in 0.4.0, digit for digit, and its investments only fill `portfolio(fund)`.
- **Two types stable from 0.1.0 are widened:**
  - **`CashFlow.type`** gains `"write_off"`.
  - **`CashFlow.amount`** is `D | null`, null on a write-off. Code that reads a cash flow's amount checks first, or skips write-offs.
- **TypeScript code that builds a `Fund` by hand** needs `terms.carryBasis`, `investments`, `distributionFrom`, and each cash flow's `investment` and `share` (FA61). A fund from `readFund` always has them. JavaScript that builds one as 0.4.0 did still splits, on the whole fund.

## Stable names

**Unchanged:** nothing stable from 0.4.0 is renamed or reused. Two types are widened: `CashFlow.type` and `CashFlow.amount`, above.

**Added in 0.5.0:**
- **`investment_name_repeated`, `investment_unknown`, `investment_not_made` and `investments_exceed_calls`,** to `FundRefusal`'s input terms
- **`deal_by_deal_pref`,** to its unsupported terms
- **the input's** `terms.carry_basis`, `investments` (each `name` and `checks`, each `date` and `amount`), a distribution's `investment` and `share`, the `"write_off"` type, and `distribution_from` (`investment` and `share`)
- **`capital_returned`'s wording deal by deal**
- **the fields above:** `fund.terms.carryBasis` (`CarryBasis`), `fund.investments` (`Investment`, `InvestmentCheck`), `fund.distributionFrom` (`DistributionFrom`), `portfolio` (`PortfolioRow`), and `Split.due` and `AccountSplit.due` (`Due`, `AccountDue`)

The package's README lists each stable name with what it means.

## How it's tested

**Four new cases** (`packages/fund/cases`), each with a plain-English derivation:
- **Case 33:** three investments on the whole fund, an exit, a write-off and X from the third. The investments change no amount.
- **Case 34:** the same fund deal by deal. The exit returns its cost and its share of the fees, then pays carry. At NAV the GP has earned all of it.
- **Case 35:** deal by deal and final:
  - a 40% sale after a follow-on, an exit with an escrow release after it, a write-off, and an investment still held
  - at X = 0 the GP owes back all $2,348,128 of its carry, cleared at $18,376,163.27
- **Case 36:** deal by deal with classes, a later close and a fee schedule, each class with its own due, and X selling half an investment.
- **Fifty-five refusals,** one or more for each line of F37 and for the order of checks where the investments meet the others.
- **Where their values come from:** the independent calculator in exact fractions (`packages/fund/reference`), as before, realizing each investment's cost in F33's order.
- **The rest:** the engine meets every amount to the cent, and the other 32 case folders are unchanged.

**Checked independently:**
- **Before it was locked,** each of the four new cases and the fifty-five refusals was re-derived by hand, and by a separate checker in exact fractions written from SPEC.md alone. That checker's own self-checks ran on 1,500 random funds, 42,101 checks.
- **The reference,** against that checker:
  - **2,142 random funds with investments:** deal by deal and on the whole fund, with classes, later closes, fee schedules, partial exits, write-offs and capital left uninvested.
  - **3,044 single-fault inputs,** each refused, or read, the same.
- **The engine,** on 2,123 more:
  - **6,913,587 amounts,** each to the cent and within 1e-24 of exact.
  - **The rest of what it gives:** 80,411 splits, 48,926 dues, 59,469 account dues, 4,654 portfolio rows, 5,663 breakpoints and 271,126 LP rows.
  - **3,688 single-fault inputs,** each refused, or read, the same.
  - **3,000 funds whose checks, written as fractions,** come to exactly their calls or a hair either side.
- **The page,** on cases 33 to 37 and 60 random funds with investments: every split, due, portfolio row and card cell, and each file saved back the same.

**And as before:**
- **The names:** a test fails if the engine can give a name or a wording the package's README doesn't list.
- **The page's numbers:** each is held to the cases.
- **Privacy:** the built page loads nothing from elsewhere.

## Not modeled yet

- **Deal by deal beyond these:**
  - a pref and a catch-up deal by deal, on what's due
  - unrealized write-downs, marks below cost, due before carry
  - an interim clawback, and carry escrow
  - a distribution of unused capital, not from an investment
  - checks funded from a credit line ahead of their calls
  - fees and expenses due by another rule: all of them first, or by how long each investment was held
  - spillpoint exits feeding the investments' proceeds
- **Management fees beyond a rate on commitments:** fees on invested capital, gross or net of exits and write-offs; anniversary periods; fees in arrears; fee offsets and waivers; a class's fee step that isn't proportional; an LP's own fee start.
- **Back fees beyond these:** interest on back fees, and back fees paid to the fund and shared between the LPs already in.
- **A class's own terms beyond the fee rate and the carry:** its own pref or catch-up, or its own expenses.
- **Later closes beyond these:** a close after a distribution; a fund that keeps a joining LP's catch-up to reduce its next call; equalization interest treated as capital; the GP commitment in the equalization.
- Defaulted or excused LPs.
- Capital as invested capital only, or committed capital.
- A compounding pref, or an IRR hurdle: refused as `compounded_pref`, or by the hurdle's own key.
- A step's higher rate on all profit, with a GP catch-up to it.
- An after-tax clawback cap, a carry holdback or escrow, and interim clawback tests.

A term the engine doesn't model is refused, never quietly ignored.
