# spillpoint-fund

How a fund's distribution splits between its LPs and its GP. Give spillpoint-fund a fund's terms and its cash flows, and it runs one more distribution through the waterfall, tier by tier:
- the LPs' capital back
- a preferred return
- the GP's catch-up
- the carry, flat or in steps by the LPs' multiple
- the GP commitment's own line beside them

It finds every **breakpoint**, every distribution where the split bends, and explains each one in plain English. And when the distribution is the fund's last, it works out any **clawback** the GP owes back. Given the fund's LPs, it gives **each LP's share** of what the LPs get.

It runs entirely on your machine. There is no network access and no I/O; a fund's numbers never leave the process.

Its page, [spillpoint.github.io/spillpoint/fund](https://spillpoint.github.io/spillpoint/fund/), runs the same engine in your browser. It's the companion of [`spillpoint`](https://www.npmjs.com/package/spillpoint), which does the same for a company's cap table at an exit.

> **The fund's documents govern, not this tool.** spillpoint-fund models common fund terms with documented defaults. Your LPA may differ, and where it does, it wins.

## Install

```bash
npm install spillpoint-fund
```

It needs Node 22 or later.

## A worked example: one distribution

A venture fund with 20% carry, stepping to 25% once the LPs have 3x, and a 1% GP commitment. It has called $10,990,000 and distributed $4,000,000. What does a $40,000,000 distribution on 30 Sep 2026 pay?

```js
import { findBreakpoints, readFund, splitAt, toCents } from "spillpoint-fund";

const fund = readFund({
  as_of: "2026-09-30",
  terms: {
    carry: { steps: [{ rate: "0.20" }, { rate: "0.25", from_lp_multiple: "3" }] },
    gp_commitment: { share: "0.01" },
  },
  cash_flows: [
    { date: "2021-01-15", type: "call", kind: "investment", amount: "8000000" },
    { date: "2021-01-15", type: "call", kind: "fee", amount: "495000" },
    { date: "2022-01-15", type: "call", kind: "fee", amount: "495000" },
    { date: "2022-06-01", type: "call", kind: "investment", amount: "2000000" },
    { date: "2024-05-01", type: "distribution", amount: "4000000" },
  ],
});

// A distribution of $40,000,000 on 30 Sep 2026, by tier.
const { distribution, lpMultiple } = splitAt(fund, "40000000");
console.log("LPs:", toCents(distribution.lps.total));
for (const step of distribution.gp.carry) console.log(`GP's carry at ${step.rate}:`, toCents(step.amount));
console.log("GP commitment:", toCents(distribution.gpCommitment));
console.log("LPs' net multiple to date:", lpMultiple.toFixed(4));

// Every distribution where the split bends, and why.
for (const b of findBreakpoints(fund)) console.log(toCents(b.x), b.reasons.map((r) => r.text).join("; "));
```

Output:

```
LPs: 32793750.00
GP's carry at 0.2: 5445000.00
GP's carry at 0.25: 1361250.00
GP commitment: 400000.00
LPs' net multiple to date: 3.3750
7000000.00 LPs have their $10,890,000 of paid-in capital back
34500000.00 LPs reach 3.0x: carry is 25% from here
```

The GP commitment takes 1% of the distribution outside the tiers. Of the rest, the first $6,930,000 returns the LPs' capital. Then 20% is carry up to $34,500,000 of X, where the LPs reach 3x, and 25% above it.

## A worked example: a clawback

A fund called $10,000,000, distributed $15,000,000 (paying $1,000,000 of carry on the $5,000,000 profit), then called $2,000,000 more for an investment that's written off. The distribution on D is its last (`final: true`), so the carry the GP has been paid is set against what one run of the waterfall on the fund's totals gives it.

```js
import { findBreakpoints, readFund, splitAt, toCents } from "spillpoint-fund";

const fund = readFund({
  as_of: "2025-03-01",
  terms: { carry: "0.20" },
  cash_flows: [
    { date: "2020-03-01", type: "call", kind: "investment", amount: "10000000" },
    { date: "2022-03-01", type: "distribution", amount: "15000000" },
    { date: "2023-03-01", type: "call", kind: "investment", amount: "2000000" },
  ],
  final: true,
});

for (const x of ["0", "1000000", "2000000"]) {
  const { carryPaid, entitlement, owed } = splitAt(fund, x).clawback;
  console.log(`X = ${x}: carry paid ${toCents(carryPaid)}, earned ${toCents(entitlement)}, owed back ${toCents(owed)}`);
}
for (const b of findBreakpoints(fund)) console.log(toCents(b.x), b.reasons.map((r) => r.text).join("; "));
```

Output:

```
X = 0: carry paid 1000000.00, earned 600000.00, owed back 400000.00
X = 1000000: carry paid 1000000.00, earned 800000.00, owed back 200000.00
X = 2000000: carry paid 1000000.00, earned 1000000.00, owed back 0.00
2000000.00 LPs have their $12,000,000 of paid-in capital back; from here the GP has earned all the carry it was paid earlier
```

With nothing more distributed, the fund's total profit is $3,000,000, so the GP has earned $600,000 and owes $400,000 back. A $2,000,000 last distribution clears it.

## A worked example: each LP's share

Case 17 in the repository: the same fund with its third step, 30% from 5x, and three LPs on the same terms. The LPs' commitments, $10,000,000 in all, only divide what the LPs get: they aren't checked against the $10,890,000 the LPs have paid in, fees included.

```js
import { readFund, splitAt, toCents } from "spillpoint-fund";

const fund = readFund({
  as_of: "2026-09-30",
  terms: {
    carry: { steps: [{ rate: "0.20" }, { rate: "0.25", from_lp_multiple: "3" }, { rate: "0.30", from_lp_multiple: "5" }] },
    gp_commitment: { share: "0.01" },
  },
  cash_flows: [
    { date: "2021-01-15", type: "call", kind: "investment", amount: "8000000" },
    { date: "2021-01-15", type: "call", kind: "fee", amount: "495000" },
    { date: "2022-01-15", type: "call", kind: "fee", amount: "495000" },
    { date: "2022-06-01", type: "call", kind: "investment", amount: "2000000" },
    { date: "2024-05-01", type: "distribution", amount: "4000000" },
  ],
  nav: "40000000",
  lps: [
    { name: "Alder Endowment", commitment: "5000000" },
    { name: "Birchwood Family Office", commitment: "3500000" },
    { name: "Cedar Fund of Funds", commitment: "1500000" },
  ],
});

// Each LP's part of a $40,000,000 distribution on 30 Sep 2026.
const { distribution, byLp } = splitAt(fund, "40000000");
console.log("LPs:", toCents(distribution.lps.total));
for (const lp of byLp) {
  console.log(`${lp.name}: share ${lp.share}, paid in ${toCents(lp.paidIn)}, now ${toCents(lp.distribution)}, to date ${toCents(lp.toDate)}`);
}
```

Output:

```
LPs: 32793750.00
Alder Endowment: share 0.5, paid in 5445000.00, now 16396875.00, to date 18376875.00
Birchwood Family Office: share 0.35, paid in 3811500.00, now 11477812.50, to date 12863812.50
Cedar Fund of Funds: share 0.15, paid in 1633500.00, now 4919062.50, to date 5513062.50
```

Each LP's amount is the LPs' amount times its commitment over all the commitments, worked exactly, so the three add up to the LPs' $32,793,750. When the distribution is final, each LP's `clawback` is its share of what the GP owes back. Every amount is exact; `toCents` rounds one for showing, and the page rounds each LP's amount down to the cent, as it would be paid.

## What it covers

Version 0.2.0 models a European (whole-fund) waterfall, cumulative across the fund's life:
- **Calls** for investments, fees and expenses, all counted as the LPs' capital.
- **Distributions** earlier in the fund's life, each run through the same tiers in date order. Carry on them is paid as they're made.
- **A GP commitment:** a share of the fund, fee-free and paying its share of expenses by default (both can be changed). It gets its share of every distribution beside the tiers, with no carry.
- **The tiers:**
  - **Capital:** the LPs' paid-in capital back first.
  - **A simple pref,** accrued Actual/365 on the LPs' unreturned capital from each call's date.
  - **A catch-up,** full or partial.
  - **Carry,** flat (20% by default) or in steps by the LPs' net multiple on distributions, each step's rate only on profit above its threshold.
- **A clawback** when the distribution is the fund's last. It's one run of the tiers on the fund's totals, at the end, gross of tax, one way only.
- **The NAV point:** the split if the fund were liquidated at NAV, with its clawback.
- **Each LP's share,** from 0.2.0: for LPs all on the same terms, each LP's part of the LPs' paid-in, of the distribution, of the fund to date, and of any clawback, by commitment.
- **Breakpoints:** every distribution where a tier ends or the clawback owed changes, each with its reasons in plain English.
- **Exact numbers:** 40-digit decimals throughout, so every breakpoint is exact. `toCents` rounds an amount for showing.

The rules, each with its default, are in [`docs/SPEC.md`](https://github.com/spillpoint/spillpoint/blob/main/packages/fund/docs/SPEC.md), and every modeling choice in [`docs/ASSUMPTIONS.md`](https://github.com/spillpoint/spillpoint/blob/main/packages/fund/docs/ASSUMPTIONS.md).

## What it doesn't model yet

- American (deal-by-deal) carry.
- Per-LP accounts where LPs differ: later closes and equalization, side-letter fee or carry breaks, defaulted or excused LPs. Every LP is on the same terms; a field on an LP other than its name and commitment is refused.
- Capital as invested capital only, or committed capital.
- A compounding pref, or an IRR hurdle. A compounded pref is refused as `compounded_pref`, and an IRR hurdle by its own key.
- A step's higher rate on all profit, with a GP catch-up to it.
- An after-tax clawback cap, a carry holdback or escrow, and interim clawback tests.

A term it doesn't model is refused, never quietly ignored.

## What it refuses

`readFund` checks the input before anything runs. Anything it can't run, it refuses with one `FundRefusal`: its `kind`, its `term`, and the `path` into the input it's about.

```js
import { FundRefusal, readFund } from "spillpoint-fund";

try {
  readFund({
    as_of: "2025-03-01",
    terms: { carry: "0.20", hurdle_irr: "0.08" },
    cash_flows: [{ date: "2020-03-01", type: "call", kind: "investment", amount: "10000000" }],
  });
} catch (e) {
  if (!(e instanceof FundRefusal)) throw e;
  console.log(e.kind, e.term, e.path);
}
```

Output:

```
unsupported hurdle_irr terms.hurdle_irr
```

The checks run in a fixed order, and the first problem is the one refused.

## Inputs

```json
{
  "as_of": "2026-09-30",
  "terms": {
    "carry": "0.20",
    "pref": { "rate": "0.08" },
    "catch_up": { "gp_share": "1" },
    "gp_commitment": { "share": "0.01", "pays_fees": false, "pays_expenses": true }
  },
  "cash_flows": [
    { "date": "2021-01-15", "type": "call", "kind": "investment", "amount": "8000000" },
    { "date": "2024-05-01", "type": "distribution", "amount": "4000000" }
  ],
  "distribution_date": "2026-09-30",
  "final": false,
  "nav": "40000000",
  "lps": [
    { "name": "Alder Endowment", "commitment": "5000000" },
    { "name": "Birchwood Family Office", "commitment": "3500000" }
  ]
}
```

- **`carry`:** a rate, or steps, `{ "steps": [{ "rate": "0.20" }, { "rate": "0.25", "from_lp_multiple": "3" }] }`, rates rising, each from a higher LP multiple above 1. Left out, it's 20%.
- **`pref`:** its rate a year, simple. Left out, there's none.
- **`catch_up`:** the GP's share, `"1"` for a full catch-up. Only with a pref, and above the first carry rate.
- **`gp_commitment`:** its `share`, with `pays_fees` (default false) and `pays_expenses` (default true).
- **A call's `kind`:** `investment`, `fee` or `expense`. A distribution has none.
- **`distribution_date`,** D, defaults to `as_of`. Every cash flow is on or before it.
- **`final`** (default false) makes the distribution on D the fund's last, with its clawback.
- **`nav`,** optional: the fund's net asset value on D.
- **`lps`,** optional, from 0.2.0: the fund's LPs, each a `name` and a `commitment`, in the order you list them. Every LP is on the same terms, so each gets its commitment's share of what the LPs get. The commitments only divide: they aren't checked against the calls, and any amounts in the right proportions give the same shares. Names are kept exactly as written, and no two LPs can share one. The GP commitment isn't an LP.
- **Classes and later closes,** from 0.3.0:

  ```json
  "terms": {
    "carry": "0.20",
    "fee_rate": "0.02",
    "equalization_rate": "0.08",
    "lp_classes": [{ "name": "Friends and family", "fee_rate": "0", "carry": "0" }]
  },
  "lps": [
    { "name": "Alder Endowment", "commitment": "6000000" },
    { "name": "Cedar Holdings", "commitment": "1000000", "class": "Friends and family", "close": "2021-07-15" }
  ]
  ```

  - **`lp_classes`:** each class a `name`, and optionally its own `fee_rate` and `carry`, written as the fund's carry is. A class changes only the management fee and the carry; the pref, the catch-up's share and the GP commitment are the fund's.
  - **`fee_rate`:** the fund's standard fee rate, needed when a class gives its own. Each LP pays fee calls in proportion to its commitment times its class's fee rate over the fund's.
  - **An LP's `class`:** a class's name. Without one, it's on the fund's terms. Each class with LPs runs the waterfall as an account of its own, with its own pref, catch-up, carry and clawback, and the fund's amounts are the accounts' sums.
  - **An LP's `close`:** the date it joined. One after the fund's first call is a later close: the LP is treated as in from the start, and at its close it catches up on the earlier calls with interest at `equalization_rate`, which must then be given ("0" for none). A close must come before the fund's first distribution.
- **Numbers** are exact strings: an integer, a decimal, or `"a/b"`. **Dates** are `YYYY-MM-DD`.

## API

- **`readFund(input)`:** checks an input and returns a `Fund`, or throws a `FundRefusal`. The `Fund` mirrors the input in camelCase, its `lps` each a `name` and a `commitment` (empty without LPs). From 0.3.0 its `terms` have `feeRate`, `equalizationRate` (each null when not given) and `lpClasses` (each a `name`, `feeRate` and `carry`, null for the fund's), and each LP its `class` and `close` (null when not given).
- **`splitAt(fund, x, { final? })`:** X, one more distribution on D, split by tier. It returns a `Split`:
  - `distribution`, X itself, and `toDate`, the fund to date with X, each a `Tiers`: `amount`, `gpCommitment`, `lps` (`capital`, `pref`, `catchUp`, `carryTier`, `total`) and `gp` (`catchUp`, `carry` by step, `total`)
  - `lpsPaidIn` and `gpCommitmentPaidIn`
  - `prefAccrued`, to D (null without a pref)
  - `lpMultiple`, the LPs' net multiple to date
  - `clawback`, when final: `carryPaid`, `entitlement`, `owed`, `prefOnFundTotals`
  - `byLp`, from 0.2.0, each LP's amounts in the input's order (empty without LPs): `name`, `commitment`, `share`, `paidIn`, `distribution` (its share of the LPs' total from X), `toDate`, and `clawback` (its share of what's owed back, null when not final). From 0.3.0 also its `class` and `close`; its `share` is still its commitment over all the LPs', and its amounts are its part of its class's account's, by commitment.
  - `byAccount`, from 0.3.0, with two or more accounts (empty otherwise): each class's account, the fund's terms first, with its `class` (null for the fund's terms), `distribution` and `toDate` by tier with its own steps, `paidIn`, `prefAccrued`, `lpMultiple` (null when it has nothing paid in), and `clawback` when final. The split's own amounts are the accounts' sums, and its carry by step lists every account's steps, each step with its `class`.

  `final` overrides the fund's own for this X.
- **`splitAtNav(fund)`:** the split at NAV as if the fund were liquidated there, final, with its clawback; null without a NAV.
- **`findBreakpoints(fund)`:** every breakpoint in order, each `{ x, reasons }`. From 0.3.0 each reason has the `class` of the account it's about, and with two or more accounts its text starts with that account's name.
- **`equalization(fund)`,** from 0.3.0: what moves between LPs at the fund's later closes, or null when no LP joins at one. It gives the `rate`; each close in date order, its `date`, the names `joining`, and every LP in by then; and each LP over all of them. Each LP's amounts are its `capitalPaid` at its close, `capitalReturned` at later ones, `interestPaid` and `interestReceived`.
- **`toCents(amount)`:** an amount as a string to the cent, rounded half away from zero.
- **`D`:** the 40-digit decimal class every amount is.
- **`FundRefusal`:** what the engine throws: `kind`, `term`, `path`.

X is an exact string or a `D`, from 0 up. Every amount the API hands back is a `D`.

## Stable from 0.1.0

Code can match on these names and words. From 0.1.0, or the version that added it, none is renamed or reused for something else. A new one can be added, and one stops being given when the engine comes to model what it refuses.

### `FundRefusal`'s kinds

- `unsupported`: a term v1 doesn't model. The fund may well have it.
- `input`: the input is wrong, or disagrees with itself, so there's no fund to run.

### `FundRefusal`'s input terms

- `bad_number`: not an exact string, or out of range. Out of range is a negative amount, rate or share; a zero amount or pref rate; a catch-up share above 1; an LP's commitment of 0 or less; or an X below 0, whose path is `x`.
- `bad_date`: not a date written YYYY-MM-DD that exists.
- `bad_field`: an unknown call kind or flow type, a non-boolean flag, a blank LP name, or a value of the wrong shape.
- `missing_field`: a field the input needs, left out.
- `unknown_field`: a field outside `terms` that a fund input doesn't have, a distribution's `kind` included.
- `carry_rate_not_below_one`: a carry rate of 1 or more.
- `steps_out_of_order`: carry steps whose rates don't rise, whose multiples don't rise from above 1, or whose first step has a multiple.
- `catch_up_without_pref`: a catch-up with no pref.
- `catch_up_share_not_above_carry`: a catch-up share at or below the first carry rate.
- `gp_commitment_not_below_one`: a GP commitment share of 1 or more.
- `no_calls`: no calls at all.
- `distribution_before_call`: a distribution before the fund's first call.
- `cash_flow_after_distribution_date`: a cash flow after D.
- `lp_name_repeated`: an LP's name that an earlier LP already has, at the later LP's `name`. From 0.2.0.
- `lp_class_name_repeated`: a class's name that an earlier class already has, at the later class's `name`. From 0.3.0.
- `lp_class_unknown`: an LP's `class` that isn't the name of a class in the terms. From 0.3.0.
- `lp_close_after_distribution`: an LP's `close` on or after the fund's first distribution, or on or after D. From 0.3.0.
- `call_without_payers`: a call no LP in the fund at its date would pay, because none had closed yet or none of them pays fees, at the call's path. From 0.3.0.

### `FundRefusal`'s unsupported terms

- `compounded_pref`: a pref compounding other than simple.

Any other unsupported term is the key v1 doesn't model, named by itself: `hurdle_irr` for `terms.hurdle_irr`, at that path. From 0.2.0 that includes a field on an LP other than its name and commitment, such as a side letter's `carry` at `lps[0].carry`. From 0.3.0 an LP's `class` and `close` are read, and a class's field other than its name, fee rate and carry is unsupported, such as its own `pref` at `terms.lp_classes[0].pref`.

### `ReasonCode`

What a breakpoint's reason is about. From 0.3.0 every reason's `class` is the account it's about, null for the fund's terms:
- `capital_returned`: the LPs have their paid-in capital back. Its `amount` is the LPs' paid-in.
- `pref_met`: the pref tier ends. Its `rate`, and its `amount`, all the pref accrued to D.
- `catch_up_done`: the catch-up tier ends. Its `carry` is the first carry rate.
- `carry_step`: the LPs reach a carry step. Its `lpMultiple` and `rate`.
- `clawback_cleared`: the clawback owed reaches zero.
- `clawback_starts`: the clawback owed leaves zero. v1's terms can't produce it.
- `clawback_changes`: the clawback owed changes slope. Its `change` says how, and its `fundTotals` names the tier of the run on the fund's totals that ended, when that run is the cause; it's null when X's own tier is.

### `ClawbackChange`

`starts_to_fall`, `stops_falling`, `falls_faster`, `falls_more_slowly`.

### The wordings

Each reason's `text` is one of these, an amount written as "$10,890,000" or "$4,004,383.56", a rate as "8%" or "7.5%", and a multiple as "3.0x" or "2.25x":
- `capital_returned`: "LPs have their {amount} of paid-in capital back"
- `pref_met`: "LPs have their {rate} pref, {amount}"
- `catch_up_done`: "the GP has {carry} of the profit"
- `carry_step`: "LPs reach {multiple}: carry is {rate} from here"
- `clawback_cleared`: "from here the GP has earned all the carry it was paid earlier"
- `clawback_starts`: "from here the GP has been paid more carry than it has earned"
- `clawback_changes`: "the clawback owed {change}", or "the clawback owed {change}: on the fund's totals, {tier}" when the run on the fund's totals is the cause. From 0.3.0, with two or more accounts, "the clawback owed {change}: on its own totals, {tier}", since the run is on the account's own totals.

{change} is "starts to fall", "stops falling", "falls faster" or "falls more slowly". {tier} is "LPs have their capital back", "LPs have their pref", "the GP has {carry} of the profit" or "LPs reach {multiple}: carry is {rate} from here".

From 0.3.0, with two or more accounts, every reason reads "{account}: {reason}", the account being the class's name, as written, or "Fund terms".

## How it's tested

Nineteen worked cases and twenty-six refusals, each with a plain-English derivation; four of the cases, and eleven of the refusals, are about the LPs. Their expected values come from an independent calculator in exact fractions, which finds breakpoints by search rather than from tier sizes. The engine meets every one to the cent, and every breakpoint exactly. They're in the repository, not the package: [`packages/fund/cases`](https://github.com/spillpoint/spillpoint/tree/main/packages/fund/cases).

## License

Apache-2.0.
