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

## 2. The first commit: what's due at the end (your answer, before the engine)

`5a77a98`, with nothing under `packages/fund/cases`:
- **FA49:** `cost` keeps one meaning, the LPs' part of the cost realized, so at the end it's the LPs' part of the cost made. `uninvested` is the LPs' part of capital called for investments and never invested, due at the end only. `total` stays the paid-in: `cost + uninvested + feesAndExpenses`.
- **FC15:** `uninvested` sits after `cost`, at the end only and only when there is some, an account's too.
- **The reference:**
  - What's due is three parts: cost, uninvested, fees and expenses.
  - The case writer gives `uninvested` only when it's above zero.
  - FA49's unit test: $1,000 called, $800 invested, final: cost 800, uninvested 200, fees and expenses 0, total 1,000. The test reads `expected.json`'s `due` back from the case writer too.
  - The random funds check that an earlier distribution never has any uninvested.
- **`cases.test.ts`:**
  - `cost` is the LPs' part of the cost realized at every point.
  - `uninvested`, when given, is at the end and above zero, and is the LPs' part of the investment calls less `cost`.
  - `total` is the three together.
- **Statuses:** FA49 to FA60, FC15 and FC16 are "Confirmed (f05a review)".

**No case file changed:** `generate.py --check` matches all 37 folders, and cases 33 to 36 have no `uninvested`.

**My hand working agrees.** It has the same split and still rebuilds f04a's five run cases and 33 to 36 byte for byte. On the five uninvested variants from f05a's fix-up it gives the reference's numbers value for value. For example, case 34 with Cedar's check at $3,000,000 has, at the end:

| Cost | Uninvested | Fees and expenses | Total |
|---:|---:|---:|---:|
| 8,910,000.00 | 990,000.00 | 1,200,000.00 | 11,100,000.00 |

## 3. `readFund`, from 0.5.0's rules

Worked from F33, F37, F28's order of checks and FA52 to FA56, not from the reference.

**What it reads:**
- `terms.carry_basis`, one of the two words exactly, `"whole_fund"` by default
- `investments`, after `nav`
- `distribution_from`
- a distribution's `investment` and `share`
- the `"write_off"` cash flow

**The order of checks.** Stage 1 ends with `deal_by_deal_pref`. Stage 2 checks `carry_basis` after the classes, then each cash flow in FA53's order, then each investment and its checks, then `distribution_from`. Stage 3 runs F37's checks after 0.4.0's, in the spec's order:
1. a check after D
2. deal by deal, no investments
3. each distribution and write-off in the input's order
4. `distribution_from`
5. `investments_exceed_calls`, naming the first check of a date (FA53, your answer 4)

**The order of `cashFlows`.** On one date, calls come first, then write-offs, then distributions.

**On the whole fund nothing changes.** A write-off calls and distributes nothing, so the waterfall leaves it out, and the tags change no amount. A test splits a whole-fund fund with investments, tags and a write-off at four X's, final, against the same fund without any of them. Every tier, the clawback, the paid-in and the breakpoints are the same. Every earlier case still gives exactly what it gave.

**Deal by deal, the split stops until f05b2.** `splitAt`, `splitAtNav` and `findBreakpoints` throw a plain `Error` for a fund read as deal by deal: "carry deal by deal is read, but not split until the next step (f05b2)". Without that stop it would be split on the whole fund without saying so. Nothing is published between f05b1 and f05b2, and the page refuses such a file before the engine sees it. The stop comes out in f05b2.

**What it refuses:**

| Rule | Refusal |
|---|---|
| a pref deal by deal, any shape | `deal_by_deal_pref` (unsupported) |
| an investment's name used twice | `investment_name_repeated` |
| an investment not listed | `investment_unknown` |
| a distribution or write-off before its investment's first check | `investment_not_made` |
| checks running past the investment calls | `investments_exceed_calls` |

The messages are mine: `errors.ts` has them beside the others.

**A fund built by hand without 0.5.0's fields** splits as 0.4.0 split it (FA61, new). A test takes case 10's fund, read, removes each new field, and compares.

## 4. The tests

| Suite | Before | Now | What's new |
|---|---:|---:|---|
| Fund package | 1,476 (10 skipped) | 1,545 (10 skipped) | fund-37's 55 refusals; 14 reading tests; the API's names; the 0.4.0 hand-built fund; `pending.test.ts` one folder fewer pending |
| Fund page | 605 | 607 | the guard, opened and read |
| Engine | 3,177 | 3,177 | |
| Main page | 680 | 680 | |

**fund-37 runs on the engine.** All 55 refusals give the case's kind, term and path, the first time they ran. The page's pending list still has cases 33 to 37, as you said.

**The reading tests** cover the rules the fixtures don't reach:
- **Read as given:** each field, frozen with the rest; none without them.
- **Order:** one date's cash flows as F4 widens it.
- **FA52:** null as left out, and the nulls that leave out something needed.
- **FA52, FA17:** names as written.
- **FA53:** a cash flow's and an investment's order, and `distribution_from`'s after `nav`.
- **FA53:** the first check of a date named.
- **FA54:** a pref deal by deal of any shape.
- **FA55:** the whole fund checking the investments without needing them.
- **FA56:** a write-off isn't a distribution, before the first call or at a close.
- **Stage 3:** its order.
- **F33:** a distribution and a write-off on the first check's date.
- **The stop** deal by deal, and the whole fund's split unchanged.

**The checks bite.** I planted eight errors in `readFund`, one at a time, and each failed a test:
- a write-off counted as a distribution before the first call
- the last check of a date named
- `deal_by_deal_pref` only for a pref given as an object
- a share above 1 read
- the name repeated checked before its checks
- a fee call funding checks
- a call's `investment` let through
- a distribution on its investment's first check's date refused. This one first passed every test, so I added the F33 test that catches it.

## 5. The page

One change in behavior, as you asked. Until f05c, a file with any of these is refused in one line before the engine reads it, so a save can't drop them:
- investments
- a write-off
- a `carry_basis`

The line is yours: "This file has investments; the page shows them from the next version." Null, and an empty list of investments, are none, and open. As with f04b's guard, the check runs before the engine reads the file, so a shape the engine would refuse gets the same line.

**Compile-only changes on the page:**
- The blank fund's terms gain `carryBasis`.
- Two places that read a cash flow's amount say a write-off's is null; none reaches them while the guard stands.

**Unchanged:** the page's pending list keeps cases 33 to 37. `notes/plan-fund-page.md` has the guard under Saving and opening.

## 6. STABLE.md and the README

- **Both list the new input and refusal terms:**
  - `investment_name_repeated`, `investment_unknown`, `investment_not_made` and `investments_exceed_calls`
  - `deal_by_deal_pref`
  - what 0.5.0 adds to `bad_number`, `bad_date`, `bad_field`, `missing_field`, `unknown_field` and `cash_flow_after_distribution_date`
- **STABLE.md** gains "The investments' names", the `Fund` fields above. Its "Types widened in 0.5.0" says `CashFlow.type` and `CashFlow.amount` take one more value each, as you asked, beside 0.4.0's `Equalization.rate`.
- **The README:**
  - Inputs gains the investments block.
  - API gains the `Fund` fields.
  - Its stable list matches STABLE.md's, and the tests hold both to the engine.
- **Waiting for f05d,** as you said: the worked examples and the coverage line.
- **f05b2 adds `portfolio`, `due` and the new wording** to both.

## 7. What f05b2 will do

One PR, after your answers on the names:
- **The waterfall deal by deal (F35):**
  - each distribution's tier 1 runs to what's due less what's back
  - what's due: the cost realized by each distribution and its share of the fees and expenses, realized over made (FA50, FA51, FA60)
  - at the end, all the paid-in, uninvested included (FA49)
  - X realizing its share of what's left, or everything when final and at the NAV point (FA58)
- **`split.due` and `accountSplit.due`;** `portfolio(fund)` with the realized multiple (FA59).
- **`findBreakpoints` on X from `distribution_from`'s investment:**
  - `capital_returned`'s amount is what's due, with F36's words when X isn't final (FA57)
  - the whole fund's words when it is
  - the clawback F12's and F24's
- **The stop comes out.**
- **Cases 33 to 36 come off the engine's pending list,** held to:
  - every amount within FA15 and to the cent
  - every breakpoint with its reasons and amounts
  - every due and investment row
- **STABLE.md and the README:** `portfolio`, `due`, `uninvested` and the new wording.

## 8. CI and permissions (hard rule 9)

- **Nothing in `.github/workflows/` or `.claude/` is in this PR.**
- **Nothing under `packages/fund/cases` changed,** so `cases-locked.yml` passes without the cases label.

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   It passes, exit 0, with the counts in §4; the fund reference's 114 unit tests pass and all 37 fund case folders match it, and spillpoint's reference's 73 too.
2. **fund-37's refusals on the engine.** From `packages/fund`:

   ```bash
   npx vitest run test/read.test.ts -t "fund-37"
   ```

   It shows 55 passed (the other tests skipped), each fixture refused with the case's kind, term and path.
3. **Case 34 read, in plain values.** From the repo root, after `pnpm build`:

   ```bash
   node --input-type=module -e 'import { readFileSync } from "node:fs"; import { readFund } from "./packages/fund/dist/index.js"; const f = readFund(JSON.parse(readFileSync("packages/fund/cases/fund-34-deal-by-deal/inputs.json", "utf8")).fund); console.log(f.terms.carryBasis, f.investments.map((i) => i.name).join(", "), f.distributionFrom.investment, f.cashFlows.map((c) => c.type + (c.investment ? " " + c.investment : "")).join("; "))'
   ```

   It prints `deal_by_deal Alder Robotics, Birch Health, Cedar AI Cedar AI call; call; call; call; call; distribution Alder Robotics; write_off Birch Health`: the basis, the three investments, X's source, and the cash flows in order, Birch's write-off after Alder's exit by date.
4. **FA49's split in the reference:**

   ```bash
   python3 -m unittest packages/fund/reference/tests/test_fund_ref.py -k test_capital_called_and_not_invested_is_due_at_the_end -v
   ```

5. **The page's guard:**
   - Run the fund page locally, `pnpm --filter @spillpoint/fund dev`.
   - Open file: choose `packages/fund/cases/fund-34-deal-by-deal/inputs.json`.
   - The page should say "Couldn't open inputs.json. This file has investments; the page shows them from the next version.", and keep the fund it had.
6. **Nothing outside the step moved:**

   ```bash
   git diff --stat main -- packages/engine apps/dashboard cases reference packages/fund/cases .github .claude
   ```

   It prints nothing. `git diff --stat main -- packages/fund/reference` lists only the first commit's four files.

## Assumptions added

- **FA61 (New):** a `Fund` built by hand without 0.5.0's fields is the whole fund, with no investments, splitting as 0.4.0 did.
- **FA49 and FC15:** your split of what's due at the end, with FA49 to FA60, FC15 and FC16 confirmed (§2).
- **The names in §1 are proposals, not assumptions.** They become stable once you settle them.

## Open questions

1. **The names (§1).** Fine as proposed, or would you rather any read differently? Three of mine matter most:
   - **`CashFlow.amount`:** null on a write-off, or zero.
   - **`portfolio(fund)`:** this name, or another.
   - **`uninvested`:** always there in the engine, zero before the end.
2. **The stop deal by deal between f05b1 and f05b2 (§3).** `splitAt` throws a plain Error for a fund deal by deal until f05b2. Fine for main between the two PRs, or would you rather f05b1 refuse deal by deal in `readFund` instead? That would need a temporary refusal term the stable list doesn't have, so I'd keep the Error.
