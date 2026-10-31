# spillpoint-fund

How a fund's distribution splits between its LPs and its GP. Give spillpoint-fund a fund's terms and its cash flows, and it runs one more distribution through the waterfall, tier by tier:
- the LPs' capital back
- a preferred return
- the GP's catch-up
- the carry, flat or in steps by the LPs' multiple
- the GP commitment's own line beside them

It finds every **breakpoint**, every distribution where the split bends, and explains each one in plain English. And when the distribution is the fund's last, it works out any **clawback** the GP owes back. Given the fund's LPs, it gives **each LP's share** of what the LPs get. From 0.3.0 LPs can be in **classes** with their own fee rate and carry, each class running the waterfall on its own, and can join at **later closes**, with the equalization between them worked out. From 0.4.0 it works out **management fees** from a schedule, a rate on commitments with steps by date, and a fee call before a later close is each LP's own: the joining LP pays its **back fees** to the manager. From 0.5.0 it lists a fund's **investments**, their checks, exits and write-offs, and can pay **carry deal by deal**: before carry, the LPs get back the cost of each investment exited or written off, with its share of fees and expenses.

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

## A worked example: classes and later closes

Case 26 in the repository: a fund with 20% carry and a 2% standard fee rate, and three LPs. Alder Endowment is in from the start. Birchwood Family Office joins at a later close on 1 Apr 2022, and Cedar Holdings at another on 1 Oct 2022, in a friends-and-family class that pays no fees and no carry. Equalization interest is 6% a year.

```js
import { equalization, readFund, splitAt, toCents } from "spillpoint-fund";

const fund = readFund({
  as_of: "2025-06-30",
  terms: {
    carry: "0.20",
    fee_rate: "0.02",
    equalization_rate: "0.06",
    lp_classes: [{ name: "Friends and family", fee_rate: "0", carry: "0" }],
  },
  cash_flows: [
    { date: "2022-01-01", type: "call", kind: "investment", amount: "2000000" },
    { date: "2022-01-01", type: "call", kind: "fee", amount: "100000" },
    { date: "2022-07-01", type: "call", kind: "investment", amount: "3000000" },
    { date: "2023-01-01", type: "call", kind: "fee", amount: "150000" },
  ],
  lps: [
    { name: "Alder Endowment", commitment: "5000000" },
    { name: "Birchwood Family Office", commitment: "2500000", close: "2022-04-01" },
    { name: "Cedar Holdings", commitment: "2500000", class: "Friends and family", close: "2022-10-01" },
  ],
});

// Each class's part of a $5,200,000 distribution, the fund's terms first.
for (const account of splitAt(fund, "5200000").byAccount) {
  const { distribution } = account;
  console.log(`${account.class ?? "Fund terms"}: paid in ${toCents(account.paidIn)}, LPs ${toCents(distribution.lps.total)}, GP ${toCents(distribution.gp.total)}`);
}

// What the LPs settle between them at the two later closes.
for (const close of equalization(fund).closes) {
  console.log(`${close.date}: ${close.joining.join(", ")} joins`);
  for (const lp of close.lps) {
    console.log(`  ${lp.name}: pays ${toCents(lp.capitalPaid)} + ${toCents(lp.interestPaid)}, gets back ${toCents(lp.capitalReturned)} + ${toCents(lp.interestReceived)}, back fees ${toCents(lp.backFees)}`);
  }
}
```

Output:

```
Fund terms: paid in 4050000.00, LPs 3900000.00, GP 0.00
Friends and family: paid in 1250000.00, LPs 1300000.00, GP 0.00
2022-04-01: Birchwood Family Office joins
  Alder Endowment: pays 0.00 + 0.00, gets back 666666.67 + 9863.01, back fees 0.00
  Birchwood Family Office: pays 666666.67 + 9863.01, gets back 0.00 + 0.00, back fees 50000.00
2022-10-01: Cedar Holdings joins
  Alder Endowment: pays 0.00 + 0.00, gets back 833333.33 + 22520.55, back fees 0.00
  Birchwood Family Office: pays 0.00 + 0.00, gets back 416666.67 + 11260.27, back fees 0.00
  Cedar Holdings: pays 1250000.00 + 33780.82, gets back 0.00 + 0.00, back fees 0.00
```

Each class with LPs is an account of its own, running the tiers on its own part of every call and distribution. Investment calls and distributions divide by commitment, 75/25. The fee calls fall on the fund's terms alone, since Cedar's class pays none, and each counts at its full size, as if every LP had been in from the start. So the January 2022 fee call counts as $150,000, though Alder alone paid its $100,000 then: Birchwood's own part of it is $50,000, at the same rate on its commitment. The fund's terms have paid in $4,050,000, and need an X of $5,400,000 to have it back. The class has its $1,250,000 back once X is $5,000,000, and its LP keeps all of its part beyond that, with no carry. The split's own amounts are the two accounts' sums.

The waterfall treats every LP as in from the start. At each later close, the LP joining pays in its part of the earlier investment and expense calls, with 6% simple interest from each call's date to the close, and the LPs already in get back what they'd paid over their parts, with that interest. Fees aren't rebalanced between the LPs: a fee is each LP's own, so Birchwood pays its $50,000 of back fees to the manager, with no interest. Equalization is outside the waterfall, so it changes no split. Every amount is exact. `toCents` rounds one half up for showing, and the page rounds each down to the cent, as it would be paid: Alder's 22520.55 here is $22,520.54 there.

## A worked example: a management fee schedule

Case 31 in the repository: 2% a year on commitments, called quarterly in advance from 1 Jan 2022. Alder Endowment is on the fund's terms. Cedar Holdings is in a friends-and-family class that pays no fees, and Dogwood Pension in an anchor class at a 1% fee, half the fund's, joining at a later close on 15 Aug 2022. Equalization interest is 8% a year.

```js
import { equalization, feeCalls, readFund, toCents } from "spillpoint-fund";

const fund = readFund({
  as_of: "2025-12-31",
  terms: {
    carry: "0.20",
    equalization_rate: "0.08",
    management_fee: { start: "2022-01-01", steps: [{ rate: "0.02" }] },
    lp_classes: [
      { name: "Anchor", fee_rate: "0.01", carry: "0.15" },
      { name: "Friends and family", fee_rate: "0", carry: "0" },
    ],
  },
  cash_flows: [
    { date: "2022-02-01", type: "call", kind: "investment", amount: "4000000" },
    { date: "2023-03-01", type: "call", kind: "investment", amount: "6000000" },
    { date: "2025-06-30", type: "distribution", amount: "5000000" },
  ],
  lps: [
    { name: "Alder Endowment", commitment: "10000000" },
    { name: "Cedar Holdings", commitment: "2000000", class: "Friends and family" },
    { name: "Dogwood Pension", commitment: "8000000", class: "Anchor", close: "2022-08-15" },
  ],
});

// The schedule's first call, for the first quarter: each LP's own fee, Dogwood's included.
const [first] = feeCalls(fund);
console.log(`${first.date} to ${first.lastDay}: ${toCents(first.call)}`);
for (const lp of first.byLp) console.log(`  ${lp.name}: ${toCents(lp.fee)}`);

// At Dogwood's close: the capital and interest it settles with the LPs already in, and its back fees.
for (const lp of equalization(fund).lps) {
  console.log(`${lp.name}: pays ${toCents(lp.capitalPaid)} + ${toCents(lp.interestPaid)}, gets back ${toCents(lp.capitalReturned)} + ${toCents(lp.interestReceived)}, back fees ${toCents(lp.backFees)}`);
}
```

Output:

```
2022-01-01 to 2022-03-31: 70000.00
  Alder Endowment: 50000.00
  Cedar Holdings: 0.00
  Dogwood Pension: 20000.00
Alder Endowment: pays 0.00 + 0.00, gets back 1333333.33 + 56986.30, back fees 0.00
Cedar Holdings: pays 0.00 + 0.00, gets back 266666.67 + 11397.26, back fees 0.00
Dogwood Pension: pays 1600000.00 + 68383.56, gets back 0.00 + 0.00, back fees 60000.00
```

Each LP's fee is its commitment times the rate for the period: Alder's $10,000,000 at 2% is $50,000 a quarter, and Dogwood's $8,000,000 at its class's 1% is $20,000. The schedule's calls are every LP's own fee, whatever its close, so Dogwood's is in the first quarter's call though it joins in the third. At its close it pays its fees for the three quarters before, $60,000, to the manager. The investment call of 1 Feb 2022 is rebalanced as before: Dogwood pays its part, with 8% simple interest to the close, and Alder and Cedar get theirs back. `feeCalls(fund)` gives every call to D, sixteen here, and the split, the breakpoints and the clawback run on them as on entered fee calls.

## A worked example: carry deal by deal

Case 34 in the repository: three investments, $10,000,000 of cost and $1,200,000 of fees, a 1% GP commitment, and 20% carry deal by deal. Alder Robotics exited for $9,000,000 and Birch Health was written off; X comes from Cedar AI, all of it sold. Beside it, the same fund with carry on the whole fund, case 33.

```js
import { portfolio, readFund, splitAt, toCents } from "spillpoint-fund";

const input = {
  as_of: "2024-06-30",
  terms: { carry: "0.20", gp_commitment: { share: "0.01" }, carry_basis: "deal_by_deal" },
  investments: [
    { name: "Alder Robotics", checks: [{ date: "2020-02-01", amount: "3000000" }] },
    { name: "Birch Health", checks: [{ date: "2020-03-01", amount: "3000000" }] },
    { name: "Cedar AI", checks: [{ date: "2021-02-01", amount: "4000000" }] },
  ],
  cash_flows: [
    { date: "2020-01-15", type: "call", kind: "investment", amount: "6000000" },
    { date: "2020-01-15", type: "call", kind: "fee", amount: "400000" },
    { date: "2021-01-15", type: "call", kind: "investment", amount: "4000000" },
    { date: "2021-01-15", type: "call", kind: "fee", amount: "400000" },
    { date: "2022-01-15", type: "call", kind: "fee", amount: "400000" },
    { date: "2022-06-30", type: "distribution", amount: "9000000", investment: "Alder Robotics" },
    { date: "2023-03-31", type: "write_off", investment: "Birch Health" },
  ],
  distribution_from: { investment: "Cedar AI" },
  nav: "12000000",
};
const dealByDeal = readFund(input);
// The same fund with carry on the whole fund, the default: case 33.
const { carry_basis, ...wholeFundTerms } = input.terms;
const wholeFund = readFund({ ...input, terms: wholeFundTerms });

// The investments at D, before X: the same on either basis.
for (const inv of portfolio(dealByDeal)) {
  const multiple = inv.realizedMultiple === null ? "none yet" : `${inv.realizedMultiple}x`;
  console.log(`${inv.name}: cost ${toCents(inv.costMade)}, exited or written off ${toCents(inv.costRealized)}, proceeds ${toCents(inv.proceeds)}, ${multiple}`);
}

// X from Cedar AI, all of it sold, at $0 and at $12,000,000, on each basis.
for (const [basis, fund] of [["Deal by deal", dealByDeal], ["Whole fund", wholeFund]]) {
  for (const x of ["0", "12000000"]) {
    const s = splitAt(fund, x);
    const due = s.due ? `${toCents(s.due.total)} due before carry; ` : "";
    console.log(`${basis}, X = ${x}: ${due}the GP's carry ${toCents(s.distribution.gp.total)} from X, ${toCents(s.toDate.gp.total)} to date`);
  }
}
```

Output:

```
Alder Robotics: cost 3000000.00, exited or written off 3000000.00, proceeds 9000000.00, 3x
Birch Health: cost 3000000.00, exited or written off 3000000.00, proceeds 0.00, 0x
Cedar AI: cost 4000000.00, exited or written off 0.00, proceeds 0.00, none yet
Deal by deal, X = 0: 11100000.00 due before carry; the GP's carry 0.00 from X, 1116000.00 to date
Deal by deal, X = 12000000: 11100000.00 due before carry; the GP's carry 822000.00 from X, 1938000.00 to date
Whole fund, X = 0: the GP's carry 0.00 from X, 0.00 to date
Whole fund, X = 12000000: the GP's carry 1938000.00 from X, 1938000.00 to date
```

Deal by deal, Alder Robotics' $9,000,000 exit first returns what's due on it: the LPs' 99% of its $3,000,000 cost, $2,970,000, and the share of the $1,200,000 of fees that its cost is of the $10,000,000 made, 30%, $360,000. With that $3,330,000 back, the GP takes 20% of the rest of the LPs' $8,910,000, the 99% of the exit beside the GP commitment's 1%: $1,116,000 of carry, the fund to date at X = 0, before Birch Health or Cedar AI has returned anything. On the whole fund the same exit pays no carry, since all $11,100,000 of the LPs' paid-in comes back first. X from Cedar AI, all of it sold, realizes the last of the cost; Birch Health's write-off already made its cost due though it returned nothing. So what's due on X is all the LPs' $11,100,000, and it doesn't change with X. At $12,000,000 both bases come to $1,938,000 of carry in all: deal by deal the GP has it sooner, not more. Where later write-offs leave the whole fund earning less than the GP was paid, it owes the difference back at the end, the clawback, as on the whole fund.

## What it covers

Version 0.5.0 models a waterfall cumulative across the fund's life, on the whole fund (European) by default, or deal by deal:
- **Calls** for investments, fees and expenses, all counted as the LPs' capital.
- **Management fees,** from 0.4.0: entered as fee calls, or worked out by a schedule: a rate a year on commitments, with steps by date, called in advance on calendar periods, quarterly, half-yearly or yearly (the input's `quarterly`, `semiannual` or `annual`), the first pro rata from its start. A class's fee rate is set against the schedule's first rate. `feeCalls(fund)` gives the schedule's calls, with each LP's fee.
- **Distributions** earlier in the fund's life, each run through the same tiers in date order. Carry on them is paid as they're made.
- **A GP commitment:** a share of the fund, fee-free and paying its share of expenses by default (both can be changed). It gets its share of every distribution beside the tiers, with no carry.
- **The tiers:**
  - **Capital:** the LPs' paid-in capital back first.
  - **A simple pref,** accrued Actual/365 on the LPs' unreturned capital from each call's date.
  - **A catch-up,** full or partial.
  - **Carry,** flat (20% by default) or in steps by the LPs' net multiple on distributions, each step's rate only on profit above its threshold.
- **A clawback** when the distribution is the fund's last. It's one run of the tiers on the fund's totals, at the end, gross of tax, one way only.
- **The NAV point:** the split if the fund were liquidated at NAV, with its clawback.
- **Each LP's share,** from 0.2.0: each LP's part of the LPs' paid-in, of the distribution, of the fund to date, and of any clawback, by commitment. From 0.3.0 it's by commitment within its class's account.
- **Classes,** from 0.3.0: a side letter's terms for a class of LPs, its own management fee rate and its own carry, flat or in steps. Each class with LPs, and the LPs on the fund's terms, is an account running the tiers on its own part of every call and distribution, its own paid-in as capital, with its own catch-up and carry steps. The fund's amounts are the accounts' sums.
- **The clawback by class,** from 0.3.0: when final, and at the NAV point, each account settles its own clawback on its own totals, and the fund's owed is theirs added up. One class's surplus never offsets another's.
- **Later closes and equalization,** from 0.3.0: an LP joining after the fund's first call is treated as in from the start. At its close it pays in its part of the earlier investment and expense calls, with simple interest at the fund's equalization rate, Actual/365, to the LPs already in, who get back what they'd paid over theirs. `equalization(fund)` gives each close, and each LP over all of them.
- **Fee calls at a later close,** from 0.4.0: a fee is each LP's own, on its own commitment. A joining LP pays its own part of each fee call before its close, its back fees, to the manager, with no interest, and nothing about fees moves between the LPs. Each fee call counts in the waterfall at its full size.
- **Investments,** from 0.5.0: each with its checks, a follow-on another check; a distribution names the investment it comes from and the share of what's left of it that it sells; a write-off ends what's left of one, with no proceeds. `portfolio(fund)` gives the investments table on either basis: each one's cost, what of it is exited or written off, what's written off, its proceeds and its realized multiple. On the whole fund the investments change no amount.
- **Carry deal by deal,** from 0.5.0: at each distribution, before carry, the LPs get back what's due on the investments exited or written off so far: the cost of each, with its share of fees and expenses, by cost. Carry is paid on each distribution as it's made. At the end, X final or the NAV point, everything paid in is due, capital called and never invested included, and the clawback is the whole fund's, so the GP keeps at most what the whole fund would give it. `Split.due` gives what's due on X, and with classes each account's own.
- **Breakpoints:** every distribution where a tier ends or the clawback owed changes, each with its reasons in plain English. With classes, each account's, named by its class.
- **Exact numbers:** 40-digit decimals throughout, so every breakpoint is exact. `toCents` rounds an amount for showing.

The rules, each with its default, are in [`docs/SPEC.md`](https://github.com/spillpoint/spillpoint/blob/main/packages/fund/docs/SPEC.md), and every modeling choice in [`docs/ASSUMPTIONS.md`](https://github.com/spillpoint/spillpoint/blob/main/packages/fund/docs/ASSUMPTIONS.md).

## What it doesn't model yet

- **A class's own terms beyond the fee rate and the carry:** its own pref or catch-up, a fee break that isn't proportional (a different step-down, a fee offset), or its own expenses. A field on a class other than its name, fee rate and carry is refused.
- **Later closes beyond these:** a close after a distribution, refused as `lp_close_after_distribution`; a fund that keeps a joining LP's catch-up to reduce its next call; equalization interest treated as capital; and the GP commitment in the equalization.
- Defaulted or excused LPs. A field on an LP other than its name, commitment, class and close is refused.
- Capital as invested capital only, or committed capital.
- A compounding pref, or an IRR hurdle. A compounded pref is refused as `compounded_pref`, and an IRR hurdle by its own key.
- A step's higher rate on all profit, with a GP catch-up to it.
- An after-tax clawback cap, a carry holdback or escrow, and interim clawback tests.
- **Management fees beyond a rate on commitments:** fees on invested capital, gross or net of exits and write-offs; anniversary periods; fees in arrears; fee offsets and waivers; a class's fee step that isn't proportional; and an LP's own fee start. A schedule's key other than its start, frequency, steps and commitments, such as an `offset`, is refused.
- **Back fees beyond these:** interest on back fees, and back fees paid to the fund and shared between the LPs already in.
- **Deal by deal beyond these:** a pref and a catch-up deal by deal, on what's due (a pref with carry deal by deal is refused as `deal_by_deal_pref`); unrealized write-downs, marks below cost, due before carry; an interim clawback, and carry escrow; a distribution of unused capital, not from an investment; checks funded from a credit line ahead of their calls; fees and expenses due by another rule, all of them first or by how long each investment was held; and spillpoint exits feeding the investments' proceeds.

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
- **A call's `kind`:** `investment`, `fee` or `expense`. A distribution has none, nor, from 0.5.0, a write-off.
- **`distribution_date`,** D, defaults to `as_of`. Every cash flow is on or before it.
- **`final`** (default false) makes the distribution on D the fund's last, with its clawback.
- **`nav`,** optional: the fund's net asset value on D.
- **`lps`,** optional, from 0.2.0: the fund's LPs, each a `name` and a `commitment`, in the order you list them. Without classes every LP is on the same terms, so each gets its commitment's share of what the LPs get. The commitments only divide: they aren't checked against the calls, and any amounts in the right proportions give the same shares. Names are kept exactly as written, and no two LPs can share one. The GP commitment isn't an LP.
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
  - **An LP's `close`:** the date it joined. One after the fund's first call is a later close: the LP is treated as in from the start, and at its close it catches up on the earlier investment and expense calls with interest at `equalization_rate`, which must then be given ("0" for none). From 0.4.0 it pays its own back fees for the earlier fee calls to the manager, with no interest, and the rate is needed only when an investment or expense call comes before its close. A close must come before the fund's first distribution.
- **A management fee schedule,** from 0.4.0, works out the fee calls instead of entering them:

  ```json
  "terms": {
    "carry": "0.20",
    "management_fee": {
      "start": "2021-02-15",
      "frequency": "quarterly",
      "steps": [{ "rate": "0.02" }, { "rate": "0.015", "from": "2026-02-15" }],
      "commitments": "40000000"
    }
  }
  ```

  - **`start`:** the date fees start. One call each calendar period from `start`'s to D's, in advance, the first pro rata by its days from `start`.
  - **`frequency`:** `"quarterly"` (the default), `"semiannual"` or `"annual"`, on calendar quarters, half-years or years.
  - **`steps`:** the annual rate on commitments, the first from `start` and above 0, each later one from its `from` date. `"0"` ends fees from its date.
  - **`commitments`:** the fee's base for a fund that doesn't list its LPs. A fund that lists them uses their commitments, and `commitments`, if given, must be their total.
  - **With a schedule** no fee call is entered and `fee_rate` isn't given: the schedule's first rate is the fund's, and a class's `fee_rate` is set against it. Each LP pays its own fee on its own commitment, whatever its close.
- **Investments and carry deal by deal,** from 0.5.0:

  ```json
  "terms": { "carry": "0.20", "carry_basis": "deal_by_deal" },
  "investments": [
    { "name": "Alder Robotics", "checks": [{ "date": "2020-02-01", "amount": "3000000" }] },
    { "name": "Cedar AI", "checks": [{ "date": "2021-02-01", "amount": "2500000" }, { "date": "2022-05-01", "amount": "1500000" }] }
  ],
  "cash_flows": [
    { "date": "2022-06-30", "type": "distribution", "amount": "9000000", "investment": "Alder Robotics" },
    { "date": "2023-03-31", "type": "distribution", "amount": "1500000", "investment": "Cedar AI", "share": "0.4" },
    { "date": "2023-09-30", "type": "write_off", "investment": "Cedar AI" }
  ],
  "distribution_from": { "investment": "Cedar AI" }
  ```

  - **`carry_basis`:** `"whole_fund"`, the default, or `"deal_by_deal"`, where each distribution's capital tier runs only to what's due on the investments exited or written off so far. No pref deal by deal.
  - **`investments`:** each a `name` and one or more `checks`, each a `date` and an `amount`: the fund's cost, the GP commitment's part included. A follow-on is another check. The cost made by any check's date can't be more than the investment calls up to it. Names are kept exactly as written, and no two investments can share one.
  - **On a distribution:** the `investment` it comes from, and the `share` of what's left of it that it sells, `"1"` by default. Deal by deal every distribution names one; on the whole fund they're optional.
  - **A write-off:** a cash flow of type `"write_off"`, with a `date` and an `investment` and no amount. It ends what's left of the investment.
  - **`distribution_from`:** the investment X comes from, and its `share`, `"1"` by default. Needed deal by deal.
- **Numbers** are exact strings: an integer, a decimal, or `"a/b"`. **Dates** are `YYYY-MM-DD`.

## API

- **`readFund(input)`:** checks an input and returns a `Fund`, or throws a `FundRefusal`. The `Fund` mirrors the input in camelCase, its `lps` each a `name` and a `commitment` (empty without LPs). From 0.3.0 its `terms` have `feeRate`, `equalizationRate` (each null when not given) and `lpClasses` (each a `name`, `feeRate` and `carry`, null for the fund's), and each LP its `class` and `close` (null when not given). From 0.4.0 its `terms` have `managementFee`, the schedule as read (null without one): `start`, `frequency`, `steps` (each a `rate` and a `from`, the first's null) and `commitments` (null when not given). The schedule's calls aren't in `cashFlows`, which stays the input's. From 0.5.0 its `terms` have `carryBasis` (`"whole_fund"` filled in when not given); it has `investments` (each a `name` and `checks`, each check a `date` and an `amount`; empty without any) and `distributionFrom` (`investment` and `share`; null without one); and each cash flow has its `investment` and `share` (null where it has none, the share 1 on a distribution that doesn't give one), a write-off's type being `"write_off"` and its `amount` null. Its `cashFlows` are in date order, and on one date calls, then write-offs, then distributions.
- **`splitAt(fund, x, { final? })`:** X, one more distribution on D, split by tier. It returns a `Split`:
  - `distribution`, X itself, and `toDate`, the fund to date with X, each a `Tiers`: `amount`, `gpCommitment`, `lps` (`capital`, `pref`, `catchUp`, `carryTier`, `total`) and `gp` (`catchUp`, `carry` by step, `total`)
  - `lpsPaidIn` and `gpCommitmentPaidIn`
  - `prefAccrued`, to D (null without a pref)
  - `lpMultiple`, the LPs' net multiple to date
  - `clawback`, when final: `carryPaid`, `entitlement`, `owed`, `prefOnFundTotals`
  - `byLp`, from 0.2.0, each LP's amounts in the input's order (empty without LPs): `name`, `commitment`, `share`, `paidIn`, `distribution` (its share of the LPs' total from X), `toDate`, and `clawback` (its share of what's owed back, null when not final). From 0.3.0 also its `class` and `close`; its `share` is still its commitment over all the LPs', and its amounts are its part of its class's account's, by commitment.
  - `byAccount`, from 0.3.0, with two or more accounts (empty otherwise): each class's account, the fund's terms first, with its `class` (null for the fund's terms), `distribution` and `toDate` by tier with its own steps, `paidIn`, `prefAccrued`, `lpMultiple` (null when it has nothing paid in), and `clawback` when final. The split's own amounts are the accounts' sums, and its carry by step lists every account's steps, each step with its `class`. From 0.5.0 each account also has its own `due`, as the split's below without `costMade` and `costRealized`.
  - `due`, from 0.5.0, deal by deal (null on the whole fund): what's due before carry on X, a `Due`: `costMade` and `costRealized`, whole-fund, X's realization included (everything, when final); the LPs' part of the cost realized, `cost`; at the end only, `uninvested`, their capital called for investments and never invested (zero before the end, and exactly zero at the end when all of it was invested); `feesAndExpenses`, their fees and expenses to date times the cost realized over the cost made (all of them at the end); and `total`, the three together (within rounding in the last of 40 digits), exactly their paid-in at the end. X's tier 1 runs until the LPs' capital back reaches `total`.

  `final` overrides the fund's own for this X.
- **`splitAtNav(fund)`:** the split at NAV as if the fund were liquidated there, final, with its clawback; null without a NAV.
- **`findBreakpoints(fund)`:** every breakpoint in order, each `{ x, reasons }`. From 0.3.0 each reason has the `class` of the account it's about, and with two or more accounts its text starts with that account's name. From 0.5.0, deal by deal, `capital_returned`'s `amount` is the account's due on X, its paid-in when X is final.
- **`equalization(fund)`,** from 0.3.0: what moves between LPs at the fund's later closes, or null when no LP joins at one. It gives the `rate`; each close in date order, its `date`, the names `joining`, and every LP in by then; and each LP over all of them. Each LP's amounts are its `capitalPaid` at its close, `capitalReturned` at later ones, `interestPaid` and `interestReceived`, and from 0.4.0 its `backFees`, its own part of the fee calls before its close, paid to the manager. From 0.4.0 the `rate` is null when none is given, as only fee calls before the later closes allow.
- **`feeCalls(fund)`,** from 0.4.0: the management fee schedule's calls in date order, or null without a schedule. Each has its `date`, the `firstDay` and `lastDay` it covers, the `call`, the LPs' part (`lps`), the GP commitment's (`gpCommitment`, zero when it doesn't pay fees), and `byLp`, each listed LP's `name` and `fee` (empty without listed LPs).
- **`portfolio(fund)`,** from 0.5.0: the investments table, each investment at D before X in the input's order, on either basis, or empty without investments. Each has its `name`, `costMade`, `costRealized` (exited or written off), `costWrittenOff`, `proceeds`, and `realizedMultiple`, its proceeds over its cost realized (null while nothing of it is realized).
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
- `call_without_payers`: a call no LP in the fund at its date would pay, because none had closed yet or none of them pays fees, at the call's path. From 0.3.0; from 0.4.0 also a schedule no listed LP pays, at `terms.management_fee`.
- `fee_rate_with_schedule`: a `fee_rate` given beside a management fee schedule, at `terms.fee_rate`. From 0.4.0.
- `fee_call_with_schedule`: a fee call entered beside a management fee schedule, at the first in the input's order. From 0.4.0.
- `fee_commitments_mismatch`: a schedule's `commitments` that isn't the listed LPs' total, at `terms.management_fee.commitments`. From 0.4.0.
- `investment_name_repeated`: an investment's name that an earlier investment already has, at the later investment's `name`. From 0.5.0.
- `investment_unknown`: a distribution's, a write-off's or `distribution_from`'s `investment` that isn't the name of one of the fund's investments, at that `investment`. From 0.5.0.
- `investment_not_made`: a distribution or a write-off dated before its investment's first check, at the cash flow. From 0.5.0.
- `investments_exceed_calls`: the cost made by a check's date more than the investment calls up to it, at the first such check's `amount`. From 0.5.0.

### `FundRefusal`'s unsupported terms

- `compounded_pref`: a pref compounding other than simple.
- `deal_by_deal_pref`: a pref with carry deal by deal, at `terms.pref`. From 0.5.0.

Any other unsupported term is the key v1 doesn't model, named by itself: `hurdle_irr` for `terms.hurdle_irr`, at that path. From 0.2.0 that includes a field on an LP other than its name and commitment, such as a side letter's `carry` at `lps[0].carry`. From 0.3.0 an LP's `class` and `close` are read, and a class's field other than its name, fee rate and carry is unsupported, such as its own `pref` at `terms.lp_classes[0].pref`. From 0.4.0 a schedule's field other than `start`, `frequency`, `steps` and `commitments`, or a step's other than `rate` and `from`, is unsupported, such as an `offset` at `terms.management_fee.offset`. From 0.5.0 `carry_basis` is a term it reads.

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
- `capital_returned`: "LPs have their {amount} of paid-in capital back". From 0.5.0, deal by deal when X isn't final, "LPs have their {amount} back for the investments exited or written off, fees and expenses included", the amount what's due on X.
- `pref_met`: "LPs have their {rate} pref, {amount}"
- `catch_up_done`: "the GP has {carry} of the profit"
- `carry_step`: "LPs reach {multiple}: carry is {rate} from here"
- `clawback_cleared`: "from here the GP has earned all the carry it was paid earlier"
- `clawback_starts`: "from here the GP has been paid more carry than it has earned"
- `clawback_changes`: "the clawback owed {change}", or "the clawback owed {change}: on the fund's totals, {tier}" when the run on the fund's totals is the cause. From 0.3.0, with two or more accounts, "the clawback owed {change}: on its own totals, {tier}", since the run is on the account's own totals.

{change} is "starts to fall", "stops falling", "falls faster" or "falls more slowly". {tier} is "LPs have their capital back", "LPs have their pref", "the GP has {carry} of the profit" or "LPs reach {multiple}: carry is {rate} from here".

From 0.3.0, with two or more accounts, every reason reads "{account}: {reason}", the account being the class's name, as written, or "Fund terms".

### Types that can be null from 0.4.0

- `Equalization.rate`, stable from 0.3.0, is `D | null`: null when no `equalization_rate` is given, as only fee calls before the later closes allow.

### Types widened in 0.5.0

- `CashFlow.type`, stable from 0.1.0, is `"call" | "distribution" | "write_off"`.
- `CashFlow.amount`, stable from 0.1.0, is `D | null`: null on a write-off, which has no amount.

## How it's tested

Thirty-two worked cases and a hundred and thirty-eight refusals, each with a plain-English derivation. Four of the cases and eleven of the refusals are about the LPs; six of the cases and twenty of the refusals, from 0.3.0, about classes and later closes; three of the cases and thirty-seven of the refusals, from 0.4.0, about management fees, with two of 0.3.0's cases worked again for fee calls at a later close; and four of the cases and fifty-five of the refusals, from 0.5.0, about investments and carry deal by deal. Their expected values come from an independent calculator in exact fractions, which finds breakpoints by search rather than from tier sizes. The engine meets every one to the cent, and every breakpoint exactly. They're in the repository, not the package: [`packages/fund/cases`](https://github.com/spillpoint/spillpoint/tree/main/packages/fund/cases).

## License

Apache-2.0.
