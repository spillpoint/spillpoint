# Review: f05b1 (investments and carry deal by deal: reading them)

Branch `f05b1-fund-deals-reading`, from main after #127. The first half of f05b, split in two as you allowed:
- **f05b1, this PR:**
  - your first commit: FA49's split of what's due at the end
  - every name 0.5.0 adds to the API, proposed below, before f05b2 builds on them
  - `readFund` for the new input, with F37's refusals in F28's five stages
  - fund-37's 55 refusals running
  - the page's one-line guard
- **f05b2, the next PR:** the waterfall deal by deal, what's due, the investments table and the breakpoints, with cases 33 to 36 running.

## 1. The names (proposed: they're stable from 0.5.0)

Where the idea is one the engine already has a name for, I've used that name. Your suggestions are taken as you gave them, except where a line below says otherwise.

### The fund, as `readFund` gives it (built in f05b1)

It mirrors the input, deeply frozen like the rest.

| Name | Type | What |
|---|---|---|
| `fund.terms.carryBasis` | `CarryBasis`: `"whole_fund" \| "deal_by_deal"` | F34's basis, `"whole_fund"` filled in when the input leaves it out or gives null (FA52) |
| `fund.investments` | `Investment[]` | the input's investments in its order; empty without any (FA52) |
| `Investment` | `{ name, checks }` | `name` as written (FA52); `checks` in the input's order |
| `InvestmentCheck` | `{ date, amount }` | one check: its date as written, its amount exact |
| `CashFlow.type` | `"call" \| "distribution" \| "write_off"` | widened: `"write_off"` is new |
| `CashFlow.investment` | `string \| null` | a distribution's investment, or a write-off's; null on a call, and on a distribution without one |
| `CashFlow.share` | `D \| null` | a distribution's share of what's left, 1 by default; null on a call and on a write-off |
| `CashFlow.amount` | `D \| null` | widened: null on a write-off, which has no amount (F33) |
| `fund.distributionFrom` | `DistributionFrom \| null` | X's source, null without one |
| `DistributionFrom` | `{ investment, share }` | `share` 1 by default |

**Two choices of mine:**
- **`CashFlow.amount` is null on a write-off.** This mirrors the input, and `kind` already does the same, null on a distribution. Like `type`, it widens a type stable from 0.1.0, so code that reads it checks first. The other way is to keep it `D` and give a write-off zero, which no code would have to check. It would say "$0" where the input says nothing, and a sum over cash flows that forgot to leave write-offs out would still come out right. I'd keep null.
- **`CashFlow.share` is null where there's no share.** That's a call or a write-off, following `kind`'s pattern, rather than 1 on every cash flow.

**`cashFlows`' order** is F4's widened by F33: by date; on one date calls, then write-offs, then distributions; write-offs and distributions each in the order listed. Checks aren't cash flows. They stay in `investments`, in the input's order.

### What f05b2 will give (proposed now, built there)

| Name | Type | What |
|---|---|---|
| `portfolio(fund)` | `PortfolioRow[]` | the investments table (F36), once for the fund, as `feeCalls(fund)` is; empty without investments; fresh each call |
| `PortfolioRow` | `{ name, costMade, costRealized, costWrittenOff, proceeds, realizedMultiple }` | at D, before X, on either basis; amounts exact; `realizedMultiple` `D \| null`, null while nothing of it is realized (FA59) |
| `split.due` | `Due \| null` | what's due before carry on X (F36); null on the whole fund |
| `Due` | `{ costMade, costRealized, cost, uninvested, feesAndExpenses, total }` | whole-fund `costMade` and `costRealized`, X's realization included; the LPs' parts, the accounts' sums |
| `accountSplit.due` | `AccountDue \| null` | each account's, with two or more; null on the whole fund |
| `AccountDue` | `{ cost, uninvested, feesAndExpenses, total }` | its own |
| `capital_returned`'s `amount` | `D` | deal by deal, what's due on X, the account's (FA57); otherwise the paid-in, as before |

**Choices of mine:**
- **`portfolio(fund)`,** so it doesn't read like `fund.investments`. Other names I considered: `investmentTable(fund)` and `holdings(fund)`. "Holdings" reads wrong for one written off, and "table" names the page's shape rather than the thing.
- **`uninvested` is always there in the engine.** It's zero before the end and when nothing is uninvested. So `total` is always `cost + uninvested + feesAndExpenses`, and code never checks for it. The case files give it only when there's some (FC15).
- **The wording deal by deal is a new one,** stable from 0.5.0: `capital_returned` when X isn't final reads "LPs have their {amount} back for the investments exited or written off, fees and expenses included", F36's words. When X is final it's the whole fund's, as before. The code stays `capital_returned`.

### The refusals (F37's names; built in f05b1)

- **Input terms, from 0.5.0:**
  - `investment_name_repeated`
  - `investment_unknown`
  - `investment_not_made`
  - `investments_exceed_calls`
- **Unsupported, from 0.5.0:** `deal_by_deal_pref`, at `terms.pref`.

### Exports

- **New types from f05b1:** `CarryBasis`, `Investment`, `InvestmentCheck` and `DistributionFrom`.
- **New from f05b2:**
  - the function `portfolio`
  - the types `PortfolioRow`, `Due` and `AccountDue`
