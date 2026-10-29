# Review: f05b2 (investments and carry deal by deal: the waterfall)

Branch `f05b2-fund-deals-waterfall`, from main after #128. The second half of f05b, as f05b1's note §7 had it:
- **The waterfall deal by deal (F35):** tier 1 at each distribution runs only to what's due on the investments realized so far, and at the end everything paid in is due.
- **What it gives:** `split.due`, `accountSplit.due`, `portfolio(fund)`, and `capital_returned`'s amount and words deal by deal.
- **f05b1's stop comes out,** and cases 33 to 37 all run on the engine.

The names are yours as settled on #128. Nothing in `readFund` changed. Next is f05c, the page.

## 1. What changed

| File | What |
|---|---|
| `src/portfolio.ts` (new) | The investments, walked in F33's order: each one's cost made, cost realized, cost written off and proceeds; the fund's cost made and realized at each distribution; what X realizes; `portfolio(fund)` |
| `src/waterfall.ts` | Tier 1 deal by deal; each account's due, at each distribution and on X; `split.due` and `accountSplit.due`; the stop removed |
| `src/breakpoints.ts` | `capital_returned`'s amount and words deal by deal |
| `src/stable-names.ts` | The new wording, from 0.5.0 |
| `src/index.ts` | Exports `portfolio`, and the types `PortfolioRow`, `Due` and `AccountDue` |
| `test/deals.test.ts` (new) | The cases' dues and investment rows, the rules worked by hand, random funds deal by deal (§4) |
| `test/support/random.ts` | `randomDeals`: a random fund made deal by deal |
| `test/support/cases.ts` | The engine's pending list is empty |
| `test/api.test.ts`, `read.test.ts`, `stable-names.test.ts` | The new names and wording; f05b1's stop test becomes "the whole fund splits as if it had no investments, nothing due" |
| `docs/STABLE.md`, `README.md` | `portfolio`, `Due`, `AccountDue` and the new wording (§5) |
| `docs/ASSUMPTIONS.md` | FA62 (§"Assumptions added") |

## 2. The rules, as the engine works them

Worked from the spec and FA49 to FA60, not from the reference.

**The investments (F33, FA50).** `portfolio.ts` walks the checks, write-offs and distributions to D:
- **Order:** on one date, checks, then write-offs, then distributions in the order listed.
- **A check** adds to its investment's cost made. A follow-on after a partial exit adds to what's left.
- **A distribution** realizes its `share` of what's left, and its amount is the investment's proceeds. With nothing left (an escrow release), it realizes nothing.
- **A write-off** realizes all that's left, as written off.
- **At each distribution** it records the fund's cost made and realized, its own realization included. A second distribution on one date counts the first's.
- **X** realizes `distributionFrom`'s share of what's left of its investment, after every cash flow on D. When final, and at the NAV point, it realizes everything (FA58).

**What's due (F35, FA51, FA60).** Each account's, at each distribution and on X:
- **`cost`:** (1 − g) of the cost realized, the account's part by commitment, whatever `pays_fees` and `pays_expenses` say.
- **`feesAndExpenses`:** the account's own part of every fee and expense call to date, as the waterfall counts them (a schedule's, and an entered one before a later close at its full size), times realized over made.
- **`uninvested`:** zero before the end.
- **`total`:** the three together.

**Tier 1 (F35).** The account's LPs get 100% until their capital back to date reaches `total`. When `total` is less than what's back already, nothing comes first, and nothing is taken back. Everything after tier 1 runs as on the whole fund. Carry steps keep their LP multiple on all paid-in.

**At the end (FA49).** When X is final, or at the NAV point:
- the cost realized is the cost made
- `feesAndExpenses` is all of them
- `total` is exactly the account's paid-in
- `uninvested` is the account's part of the LPs' investment calls less their part of the cost made

So X's tier 1 runs to all paid-in not yet back, as on the whole fund, and the clawback is F12's and F24's unchanged.

**A choice inside the rule.** I first worked `uninvested` as the paid-in less the cost and the fees. On random funds with classes, 214 of about 4,000 accounts then came out a few parts in 10³³ off zero when nothing was uninvested, from 40-digit rounding. Code testing `uninvested.isZero()` would be misled, so I worked it from the investment calls instead. It's now exactly zero when every dollar called was invested, a test holds that on 300 random funds, and the three still add up to `total` within FA15.

**The whole fund doesn't change.** With `carryBasis` `"whole_fund"` no due is worked out and tier 1 is the paid-in, as before.

## 3. The names

As you settled them on #128.

| Name | Type | What |
|---|---|---|
| `portfolio(fund)` | `PortfolioRow[]` | The investments table, at D before X, in the input's order, on either basis; empty without investments; fresh each call |
| `PortfolioRow` | `{ name, costMade, costRealized, costWrittenOff, proceeds, realizedMultiple }` | `realizedMultiple` is proceeds over the cost realized, `D \| null`, null while nothing is realized |
| `split.due` | `Due \| null` | Null on the whole fund |
| `Due` | `{ costMade, costRealized, cost, uninvested, feesAndExpenses, total }` | `costMade` and `costRealized` whole-fund, X's realization included; the rest the accounts' sums |
| `accountSplit.due` | `AccountDue \| null` | Null on the whole fund |
| `AccountDue` | `{ cost, uninvested, feesAndExpenses, total }` | The account's own |
| `capital_returned`'s `amount` | `D` | Deal by deal, the account's due on X: its paid-in when X is final |
| the new wording | | Deal by deal, X not final: "LPs have their {amount} back for the investments exited or written off, fees and expenses included". When X is final, the whole fund's: "LPs have their {amount} of paid-in capital back" |

**`final` overriding the fund's own.** `splitAt(fund, x, { final: true })` on a fund whose X isn't final gives the end's due, as the NAV point does (FA58). `final: false` on a final fund gives the x-axis's. `findBreakpoints` uses the fund's own `final`, as before.

**The wording follows `final`, not the amount.** Case 34's X realizes everything left and all its calls were invested, so its due equals its paid-in, but X isn't final. Its breakpoint reads deal by deal, as the case has it.

## 4. The tests

| Suite | Before | Now | What's new |
|---|---:|---:|---|
| Fund package | 1,545 (10 skipped) | 1,870 (10 skipped) | Cases 33 to 36 through every case test; `deals.test.ts` (234); the API's names |
| Fund page | 607 | 607 | |
| Engine | 3,177 | 3,177 | |
| Main page | 680 | 680 | |

**Cases 33 to 37 run on the engine.** Every split, breakpoint, due and investment row matched the case the first time it ran:
- **The split tests:** every point of cases 33 to 36 to the cent, X and to date by tier, the paid-in, the clawback, and each account's and each LP's (68 tests).
- **The breakpoint tests:** each at its exact value, with its reasons' codes, amounts and text (11).
- **The due:** at every point, the fund's and each account's: cost made and realized, cost, fees and expenses and total, each to the cent and within FA15 of exact. `uninvested` matches where a case gives it, and is zero where it doesn't. At NAV, the end's due.
- **The investments table:** every row's amounts to the cent and within FA15, and its realized multiple exact, null where the case's is.
- **fund-37's 55 refusals,** as since f05b1.

**The rules, worked by hand** on funds of $1,000 or so, each number in the test's comments:
- **F35:** an exit returning only what's due on what it realized, the rest through the carry tier.
- **F12, FA49:** the same fund final: the $48 owed falling to zero, the breakpoints at $200 and $440 with the whole fund's words.
- **FA49:** your $1,000 called and $800 invested: final, cost 800, uninvested 200, total 1,000, nothing owed back at any X. Not final, $800 due.
- **F35:** less due than is back, after a new investment, so no capital first and none taken back.
- **FA50:** a date's write-off before its distribution, whatever the input's order.
- **F4, F33:** a date's checks before its distributions and write-offs.
- **F33:** a share of what's left, a follow-on, and an escrow release realizing nothing.
- **FA58:** X's share, X from an investment with nothing left, and everything when final.
- **FA60:** the LPs' (1 − g) of the cost whatever the GP commitment pays.
- **Deal by deal is the whole fund** once everything made is realized and every call invested.
- **The table:** the same on either basis, and fresh each time.
- **FA62:** a fund built by hand.

One of these first failed on my own arithmetic: I'd left the base fund's $100 fee call out of the FA50 test's numbers. The engine's $660 was right, and the test now says why.

**On 300 random funds deal by deal,** half with classes and later closes (`randomDeals`):
- **The due:** adds up, the accounts' to the fund's. At the end it's all paid-in. `uninvested` is exactly zero just when everything called was invested.
- **Tier 1:** an X far past the paid-in leaves each account's capital back at what's due, or what was back already.
- **The end:** the entitlement equals the same fund's on the whole fund, and the GP keeps no more than it.
- **Flat carry** comes no later than on the whole fund.
- **The breakpoints:** the split is straight between them and bends at each, the clawback never rising (FA9).

**The tests catch errors.** I planted 21 errors in the engine, one at a time, and ran the fund tests after each:

| # | Planted | Caught by |
|---|---|---|
| 1 | Tier 1 at a distribution runs to all paid-in, ignoring what's due | 47 tests: the split, breakpoint and deal tests |
| 2 | All fees and expenses due, not times realized over made | 49 |
| 3 | The cost due without (1 − g) | 59 |
| 4 | Realized over made, with the cost made at D | 9 |
| 5 | A distribution's due without its own realization | 46 |
| 6 | A write-off realizes nothing | 35 |
| 7 | A distribution's share ignored | 10 |
| 8 | X's share ignored | 18 |
| 9 | At the end, uninvested capital not due | 3, deal tests only |
| 10 | Capital taken back when less is due than is back | 10 |
| 11 | Each account's cost the fund's whole | 32 |
| 12 | An account's fees and expenses by commitment, not its own fee weights | 29 |
| 13 | The deal-by-deal words when X is final | 3 |
| 14 | `capital_returned` naming the paid-in, not what's due | 4 |
| 15 | The realized multiple over the cost made | 1 |
| 16 | A date's checks made after its distributions | 1: the F4, F33 test, added for it |
| 17 | At NAV, the x-axis's due, not the end's | 8 |
| 18 | An escrow release left out of the proceeds | 3 |
| 19 | The fund's fees and expenses not the accounts' sum | 8 |
| 20 | A write-off's cost not counted as written off | 6 |
| 21 | The end's `uninvested` as the paid-in less the cost and fees, the way I first had it | 1: the random funds' exact zero |

Two of them needed a second look:
- **Plant 16 first passed every test.** No case has a check on a distribution's date. I added the F4, F33 test, which catches it.
- **Plant 5 first changed nothing.** I'd written it so a later line undid it; rewritten, it's caught.

## 5. STABLE.md and the README

**STABLE.md:**
- "The investments' names" lists `portfolio`, `PortfolioRow`'s fields, `Split.due`, `AccountSplit.due`, `uninvested` always given, and `capital_returned`'s amount deal by deal.
- "The wordings" has the new one under `capital_returned`.

**The README:**
- **API:** `portfolio(fund)`, `split.due` and each account's `due`, and `findBreakpoints`' amount deal by deal.
- **"The wordings":** the new one.
- **The worked examples and "What it covers"** wait for f05d, as you said.

The stable-names tests hold both files to the engine's lists and wordings, and fail on any wording the engine writes that they don't list.

## 6. The page

Nothing changes on the page: it typechecks against the wider `Split` with no edit.
- **Its guard stays:** a file with investments, a write-off or a carry basis is refused in your one line.
- **Its pending list stays:** cases 33 to 37, until f05c.

## 7. CI and permissions (hard rule 9)

- **Nothing in `.github/workflows/` or `.claude/` is in this PR.**
- **Nothing under `packages/fund/cases` changed,** so `cases-locked.yml` passes without the cases label.
- **Nothing in `packages/fund/reference`, `apps/dashboard`, `apps/fund`, `cases/`, `reference/` or `packages/engine` changed.**

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   It passes, exit 0, with the counts in §4. The fund reference's 114 unit tests pass and all 37 fund case folders match it, and spillpoint's reference's 73 too.
2. **The deal cases on the engine.** From `packages/fund`:

   ```bash
   npx vitest run -t "fund-3[3-7]"
   ```

   It shows 309 passed, the rest skipped: every test named for cases 33 to 37, across the case, split, breakpoint, deal, reading and stable-names tests, with none pending.
3. **Case 34 in plain values.** From the repo root, after `pnpm build`:

   ```bash
   node --input-type=module -e 'import { readFileSync } from "node:fs"; import { readFund, splitAt, findBreakpoints, portfolio, toCents } from "./packages/fund/dist/index.js"; const f = readFund(JSON.parse(readFileSync("packages/fund/cases/fund-34-deal-by-deal/inputs.json", "utf8")).fund); const s = splitAt(f, "5000000"); console.log(toCents(s.due.total), toCents(s.toDate.lps.capital), toCents(s.distribution.lps.capital), toCents(s.distribution.gp.total)); for (const b of findBreakpoints(f)) console.log(toCents(b.x), b.reasons[0].text); for (const r of portfolio(f)) console.log(r.name, toCents(r.costRealized), String(r.realizedMultiple))'
   ```

   It prints:

   ```
   11100000.00 8280000.00 4950000.00 0.00
   7848484.85 LPs have their $11,100,000 back for the investments exited or written off, fees and expenses included
   Alder Robotics 3000000.00 3
   Birch Health 3000000.00 0
   Cedar AI 0.00 null
   ```

   - **The first line, X of $5,000,000:** $11,100,000 due on X. Alder's exit had returned $3,330,000 of it, and X returns $4,950,000 more, its LPs' 99%, so $8,280,000 is back, with no carry from X yet.
   - **The breakpoint:** X's tier 1 fills at $7,848,484.85, 259000000/33, with the deal-by-deal words.
   - **The table:** Alder at 3x, Birch written off at 0x, Cedar not yet realized.
4. **Case 35, X final, at its listed $12,000,000:**

   ```bash
   node --input-type=module -e 'import { readFileSync } from "node:fs"; import { readFund, splitAt, toCents } from "./packages/fund/dist/index.js"; const f = readFund(JSON.parse(readFileSync("packages/fund/cases/fund-35-deal-by-deal-clawback/inputs.json", "utf8")).fund); const s = splitAt(f, "12000000"); console.log(toCents(s.due.total), toCents(s.lpsPaidIn), toCents(s.clawback.carryPaid), toCents(s.clawback.entitlement), toCents(s.clawback.owed))'
   ```

   It prints `24888000.00 24888000.00 2348128.00 1098400.00 1249728.00`, the case's numbers:
   - at the end all $24,888,000 paid in is due
   - the GP has $2,348,128 of carry, paid early on exits
   - the run on the totals earns it $1,098,400
   - it owes back $1,249,728
5. **The page still refuses the deal cases:**
   - Run the fund page locally, `pnpm --filter @spillpoint/fund dev`.
   - Open file: choose `packages/fund/cases/fund-34-deal-by-deal/inputs.json`.
   - The page should say "Couldn't open inputs.json. This file has investments; the page shows them from the next version.", as on #128.
6. **Nothing outside the step moved:**

   ```bash
   git diff --stat main -- packages/engine packages/fund/reference packages/fund/cases apps cases reference .github .claude
   ```

   It prints nothing.

## Assumptions added

- **FA62 (New):** a `Fund` built by hand, deal by deal, that `readFund` would refuse. It's split, not refused, as FA48's are:
  - a distribution or X naming an investment it doesn't list realizes nothing
  - a distribution's `share` of null is 1
  - a check after D isn't made
  - with nothing made, nothing is due
  - checks past the investment calls make the end's `uninvested` negative
  - a pref runs after F35's tier 1, its numbers meaning nothing

  Tests pin the first and third.

## Open questions

None of the spec's. Two of mine, both settled one way in this PR, which you can turn the other way:
1. **`uninvested` at the end (§2):** worked from the investment calls, so it's exactly zero when every dollar called was invested, and `total` is exactly the paid-in. The three add up to `total` within FA15 rather than to the last of 40 digits. The other way round makes the sum exact but `uninvested` sometimes a few parts in 10³³ off zero. I'd keep this one.
2. **`final: true` on a fund whose X isn't final (§3):** gives the end's due, as at the NAV point. I read F14's override that way. Fine?
