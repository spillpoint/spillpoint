# Review: f06b (fees on invested capital: the engine)

Branch `f06b-fund-invested-capital-engine`, from main after #132. The engine for spillpoint-fund 0.6.0's fees on invested capital (F38 to F40), with the page's one-line guard. One PR.

## 1. The names (proposed: they're stable from 0.6.0)

Proposed here before anything is built on them. Where the idea is one the engine already has a name for, I've used that name. Your suggestions are taken as you gave them.

### The fund, as `readFund` gives it

| Name | Type | What |
|---|---|---|
| `FeeBasis` | `"commitments" \| "invested_capital"` | F39's basis of a fee step, a type of its own beside `FeeFrequency` |
| `FeeStep.basis` | `FeeBasis` | each step's basis, `"commitments"` filled in when the input leaves it out or gives null (FA63), as `frequency` is on the schedule |
| `ManagementFee.commitments` | `D \| null` | unchanged: null when not given. A schedule wholly on invested capital needs none without listed LPs (F40) |

So a step is `{ rate, from, basis }`, and `managementFee` is still `{ start, frequency, steps, commitments }`.

### What the engine gives

| Name | Type | What |
|---|---|---|
| `netInvestedCapital(fund)` | `D` | F38's net invested capital at D, before X: the checks made to D less the cost realized to D. Exact, whole-fund (the GP commitment's part included, as a check is), zero without investments. Once for the fund, as `portfolio(fund)` is; fresh each call |
| `feeCalls(fund)`, `FeeCall`, `LpFee` | unchanged | a call on invested capital is a call like any other: `{ date, firstDay, lastDay, call, lps, gpCommitment, byLp }`. A period with nothing to call isn't listed (F39) |

**Choices of mine:**
- **`netInvestedCapital(fund)` sits beside `portfolio(fund)`,** in the same module, since it's the investments table's cost made less its cost realized, added up. It's given for any fund, whatever its schedule: it's about the investments, not the fee.
- **It's at D before X,** as `portfolio(fund)` is, and as F39 counts the days after D: X never moves the fees.
- **No new refusal term.** F40's refusals are `bad_field`, and `missing_field` at `investments` or at `terms.management_fee.commitments`, all kinds STABLE.md already lists. A step's `basis` stops being an unsupported term, which STABLE.md's open list names by key, so nothing there is marked "no longer given".
- **A `FeeStep` built by hand without `basis`** is on commitments, as FA48 and FA61 have a fund built by hand without 0.4.0's or 0.5.0's fields. TypeScript requires the field. This is a new assumption, FA67.

## 2. What changed

| Commit | What |
|---|---|
| `986d6a7` | `ASSUMPTIONS.md` only: FA63 to FA66 and FC17 to "Confirmed (f06a review)", your first commit |
| `89164a8` | §1 of this note, the names, before anything is built on them |
| `bbd8cc8` | `readFund` reads each step's basis, with F40's refusals in their stages (`model.ts`, `input.ts`) |
| `dfa675f` | the schedule's calls on invested capital, `netInvestedCapital`, and the first call by date for the equalization (`schedule.ts`, `fees.ts`, `portfolio.ts`, `equalization.ts`, `index.ts`); FA67 |
| `e990aaa` | the engine's pending list and pending fixture emptied; the API test; one split check's bound; `invested.test.ts` |
| `d03f468` | the page's one-line guard, its tests, fund-32's `fee-step-basis` on the page, and its line in `notes/plan-fund-page.md` |
| `354a6e5` | `STABLE.md` and the README |
| the next commit | the rest of this note |

**Nothing in `packages/fund/reference`, `apps/dashboard`, any cases, `reference/`, `packages/engine`, `.github/` or `.claude/` changed:** `git diff --stat main HEAD -- packages/fund/reference apps/dashboard cases reference packages/fund/cases packages/engine .github .claude` prints nothing. On the page, only `apps/fund/src/file.ts` and its tests.

## 3. The rules, as the engine works them

I worked these from `SPEC.md` and the assumptions, not from the reference. The reference adds up the fee one day at a time. The engine multiplies each run of days between two changes, so the two only agree because both follow F39.

**Reading a step's basis (F40, FA63, FA64),** in F28's five stages:
- **Stage 1:** a step's keys are `rate`, `from` and `basis`. Any other is still unsupported, named by its key.
- **Stage 2:** each step's shape, its rate (the first above 0), its basis, then its `from`. Left out or null is `"commitments"`; anything else but the two words, exactly as written, is `bad_field` at the step's `basis`. After `distribution_from`, a step on invested capital, whatever its date, with no investments or an empty list: `missing_field` at `investments`.
- **Stage 3:** the schedule's periods count by date, a period with a day at a rate above 0 on either basis (FA66), so `no_calls` and `distribution_before_call` never turn on the investments.
- **Stage 5:** `commitments` missing without listed LPs only when a step, whatever its date, is on commitments. With listed LPs, `commitments` given is still their total.

**Net invested capital (F38, FA65).** The investments' walk, the one `portfolio(fund)` uses, records what's left of every investment after each date's events: checks, then write-offs, then distributions, as F4 and F33 order them. So each event counts from its own date. Before the first check it's 0. After D it stays at D's: nothing after D is in the walk, and X never is. `netInvestedCapital(fund)` is the last figure, D's.

**A period's fee (F39).** `schedule.ts` splits each period's days by the step in force on each:
- **Days on commitments** add up to one sum of rates, as in 0.4.0.
- **Days on invested capital** are kept as runs at one rate. Each run is charged its rate × the net invested capital on its days, added up.

So with listed LPs, an LP's fee is its fee weight × (the rate-days on commitments × all the LPs' commitments + (1 − g) × the rate-days on invested capital) ÷ (the first rate × n × the period's days × all the LPs' commitments). That's F30's fee on commitments plus F39's on invested capital: the LPs' part of net invested capital × their fee weights over their commitments, shared by fee weight. Without listed LPs, the LPs' fee is `commitments` × the rate-days on commitments + (1 − g) × the rate-days on invested capital, over n × the period's days; `commitments` is used only when there are days on commitments. The call is the LPs' fee over 1 − g when the GP commitment pays fees, as on commitments.

**A period with no day on invested capital** is worked by 0.5.0's own expression, so a fund without a step on invested capital answers as 0.5.0 did, digit for digit. I checked it against main's engine on the 32 earlier run cases: every fee call, the split at each of the case's X's and final, the NAV point, the breakpoints, the equalization and the investments table, written out as text, are the same. Of the 138 earlier refusal fixtures, 137 are refused alike, and the other is fund-32's `fee-step-basis`, moving as F40 says. A test runs cases 29, 30, 31 and 36 again with each step named `"commitments"`, and their answers are the same text.

**A period with nothing to call isn't listed (F39, FA40).** No day on commitments, and no net invested capital on any of its days on invested capital, as case 40's 2025. Every call is above $0.

**The fund's first call (FA66).** `readFund` already counted the schedule's periods by date. The equalization took the first call from the calls the fund runs, which in 0.5.0 was the same thing. Now a period with nothing to call isn't run, so the equalization counts the periods by date too, through one function. An LP closing in a first period with nothing to call joins at a later close with an all-zero row, as you agreed.

**Cases 38 to 40, worked by the engine, match the case files to the cent,** and the figures in f06a's note with them:
- **Case 38:** six quarters on invested capital, $44,550, $48,303.30, $44,388.59, $37,125, $32,107.01 and $25,987.50; paid-in $15,292,461.39; one breakpoint at $5,446,930.70; net invested capital at D $7,000,000.
- **Case 39:** eight half-years, the four on invested capital $95,198.86, $54,031.25, $42,593.75 and $36,968.75; breakpoints at $5,000,000, $5,279,539.50 and $5,559,079.01; Birch's $30,000 of back fees; net invested capital at D $6,500,000.
- **Case 40:** $32,000, $40,000 and $19,781.42, and no call for 2025; net invested capital at D $0.

## 4. The tests

| Suite | Before (main) | Now | What's new |
|---|---:|---:|---|
| Fund package | 1,959 (13 skipped) | 2,115 (13 skipped) | cases 38 to 41 and fund-32's `fee-step-basis` through every case test; `invested.test.ts` (52); the API's names |
| Fund page | 755 | 758 | the guard's three tests |
| Engine | 3,177 | 3,177 | |
| Main page | 680 | 680 | |
| Fund reference | 125 | 125 | unchanged, and `generate.py --check` matches all 41 folders |

**Cases 38 to 41 and fund-32's moved fixture run through the engine's case tests,** 103 tests. Every value the case files give matched the first time the engine ran them:
- **The split tests:** every point of cases 38 to 40 to the cent, X and to date by tier, the paid-in, the clawback, and each account's and each LP's (48 tests).
- **The breakpoints:** each at its exact value, with its reasons' codes, amounts and text (7).
- **The fee calls:** each call's dates, the call, the LPs' part, the GP commitment's and each LP's fee, to the cent and within FA15 of exact, and each adding up (9).
- **What's due and the investments table:** at every point of case 39 deal by deal, and the table of each case, to the cent and within FA15 (19).
- **The equalization:** case 39's at Birch's close, its back fees $30,000, and none in 38 and 40 (4).
- **The refusals:** fund-41's 15, and fund-32's `fee-step-basis` as `missing_field` at `investments` (16).

**One case test failed the first time, on its own arithmetic, not the engine's.** The split test checks that the LP multiple times the case's paid-in reproduces the case's LP total to half a cent. Each of those is rounded to the cent, so the product is off by up to half a cent times the multiple, and the total by half a cent more. Before 0.6.0 paid-in was always whole cents, so the bound held. Case 39's paid-in is $11,524,216.761050: at $14,000,000, with a multiple of 1.82, the gap is $0.0062. The bound is now half a cent × (1 + the multiple), $0.0141 there; the exact check beside it, the multiple times the engine's own paid-in within 10^-25 of its total, is unchanged. As in f06a's due check, which went to the exact paid-in for the same reason.

**What no case reaches, on small funds** (`invested.test.ts`), each number in the test's comments:
- **F38:** net invested capital at nine dates of one year, D moved to each, after each date's events: a check and a sale on one date, an escrow release and an untagged distribution realizing nothing, a write-off. On every run case it's the investments table's cost made less its cost realized.
- **F39:** that year's fee, 4,678/365; a switch to invested capital inside a quarter, with and without a GP commitment paying fees; three LPs by fee weight, 11.76, 1.96 and 0 of a 14.00 call; D's period at D's figure, X not moving it.
- **FA66:** a first year with nothing invested isn't a call, but an LP closing in it joins at a later close with an all-zero row; a distribution after it by date isn't before the first call.
- **FA63:** cases 29, 30, 31 and 36 with each step named `"commitments"` give the same answers as text; a basis in seven wrong forms, and its place after the rate and before the `from`.
- **FA64:** a step on invested capital dated 2030 needs investments, and an empty list or null is none; a step on commitments dated after D needs `commitments`; wholly on invested capital, `commitments` given is checked and unused.
- **FA67:** case 31 with each step's basis taken off answers as case 31.

**The tests catch errors.** I planted 19 errors in the engine, one at a time, and ran the fund tests after each:

| # | Planted | Caught by |
|---|---|---|
| 1 | A day's net invested capital taken from the day before: each event counted from the next day | 50 tests |
| 2 | Net invested capital gross of exits and write-offs: the cost realized ignored | 59 tests |
| 3 | A period's days before its first event at 0, not at what was invested before it | 51 tests |
| 4 | D's period's days after D at 0, not at D's net invested capital | 42 tests |
| 5 | `netInvestedCapital` at the first event, not at D | 8 tests: `invested.test.ts` only |
| 6 | A run of days on invested capital one day short | 51 tests |
| 7 | Every step on commitments: the basis ignored in the schedule | 54 tests, and 3 files failing as they load (breakpoints, equalization, fees) |
| 8 | The LPs' part, 1 − g, left out with listed LPs | 35 tests |
| 9 | The LPs' part, 1 − g, left out without listed LPs | 10 tests |
| 10 | On invested capital, each LP by commitment, not by fee weight | 35 tests |
| 11 | Every LP at the full rate on invested capital: fee weights over fee weights, not over commitments | 35 tests |
| 12 | A period with nothing to call kept, as a $0 call | 12 tests, and 3 files failing as they load (breakpoints, equalization, fees) |
| 13 | The equalization's first call from the calls made, not the schedule's periods by date (FA66) | 1 test: `invested.test.ts` only |
| 14 | Periods counted only on commitments, so a period wholly on invested capital is no call | 53 tests |
| 15 | A step's basis compared without case | 3 tests |
| 16 | A step's basis read after the first step's `from` | 1 test: `invested.test.ts` only |
| 17 | Only a step in force by D needs investments, FA64's other reading | 1 test: `invested.test.ts` only |
| 18 | A step on invested capital without investments not refused | 7 tests |
| 19 | `commitments` needed without listed LPs whatever the basis, as 0.5.0 had it | 10 tests, and 5 files failing as they load (breakpoints, deals, equalization, fees, split) |

Two needed a second look:
- **Plant 16 first passed every test,** because I'd written it so it added the `from` check after the basis, which changed nothing. Rewritten to put it first, it's caught.
- **My first count left out files that fail as they load.** In plants 7, 12 and 19 a fund the tests read when they start, case 38 or 40, throws or is refused. Vitest then fails the whole file without failing a test in it, and my script counted only failed tests. The table counts both.

Four are caught only by `invested.test.ts`, since no case reaches them: 5, 13, 16 and 17.

## 5. The page

One change, as you asked: until f06c, a file with a fee step on invested capital is refused in one line, before the engine reads it, so a save can't drop the step. The line is yours: "This file has a management fee on invested capital; the page shows it from the next version." The current fund is kept.
- **What counts:** any step whose `basis` is given and isn't `"commitments"`. A basis the engine would refuse, `"Invested_Capital"` or `5`, gets the same line, as f05b1's guard gave a malformed `carry_basis` its line. Otherwise the page would show `bad_field` at a path it has no words for until f06c.
- **What opens:** a basis left out, null or `"commitments"`. A file whose steps are written `"commitments"` opens and saves as the same fund, without the word, since the form writes each step as its rate and its date.
- **fund-32's `fee-step-basis`,** opened on the page, now gets the line, not the old "a term the page doesn't model".
- **Cases 38 to 41 stay on the page's pending list.** Nothing else on the page changed.
- **Its tests:** case 38 opened and refused with the fund kept; cases 38 to 40 and case 29 with a step on invested capital refused; four malformed bases refused with the same line; null and `"commitments"` open; case 29 with each step named `"commitments"` opens and saves back as case 29, value for value, the word gone.
- **In the browser,** on the dev server: a small fund with its second step on invested capital was refused with the line, and the same fund with that step on `"commitments"` opened, its schedule on Terms, with nothing in the console.

## 6. STABLE.md and the README

- **STABLE.md** gains "The fees on invested capital's names": `basis` on each step, `FeeBasis`, `commitments` still null when not given, `netInvestedCapital(fund)`, and `feeCalls(fund)` keeping its shape. Its `bad_field` and `missing_field` lines say what 0.6.0 adds, and its unsupported terms say a step's `basis` is read from 0.6.0, no longer unsupported, a step's other keys still are.
- **The README:** a step's `basis` under the schedule's inputs, `commitments` needed only with a step on commitments, `basis` on the `Fund` `readFund` gives, `netInvestedCapital(fund)` in the API, `feeCalls` keeping its shape, and the same unsupported-term sentence in "Stable from 0.1.0".
- **Left for f06d, as you said:** the worked examples and the coverage. So "What it doesn't model yet" still lists "fees on invested capital, gross or net of exits and write-offs", and the opening paragraph says nothing of 0.6.0.

## 7. CI and permissions (hard rule 9)

- **Nothing in `.github/workflows/` or `.claude/` is in this PR.** `.claude/settings.json` is as main has it.
- **No case file changed,** so `cases-locked.yml` passes without the cases label.

**What CI runs passes locally,** `pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference`, exit 0. I ran it twice; the second time on a clean tree, since the planted errors had run beside part of the first:

| Suite | Tests |
|---|---:|
| Engine | 3,177 |
| Fund package | 2,115 (13 skipped) |
| Main page | 680 |
| Fund page | 758 |
| Spillpoint reference | 73, and `generate.py --check` on every case |
| Fund reference | 125, and `generate.py --check` on all 41 folders |

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

2. **The new cases on the engine.** Every split, breakpoint, fee call, due, investment row and equalization of cases 38 to 40, and fund-41's refusals, run in the fund package's tests:

   ```bash
   pnpm --filter spillpoint-fund exec vitest run -t "fund-3[89]|fund-4[01]|fee-step-basis"
   ```

3. **Net invested capital and the fee calls, from the engine itself,** to set beside your checker. From the repo's root, with Node 22 or later:

   ```bash
   node --input-type=module -e 'import { readFileSync } from "node:fs"; import { feeCalls, netInvestedCapital, readFund, toCents } from "./packages/fund/src/index.ts"; for (const c of ["fund-38-fees-on-invested-capital", "fund-39-invested-capital-deal-by-deal-classes", "fund-40-spv-fees-on-invested-capital"]) { const f = readFund(JSON.parse(readFileSync(`packages/fund/cases/${c}/inputs.json`, "utf8")).fund); console.log(c, toCents(netInvestedCapital(f))); for (const k of feeCalls(f)) console.log(" ", k.date, toCents(k.call), toCents(k.lps), toCents(k.gpCommitment), k.byLp.map((x) => x.name + " " + toCents(x.fee)).join(", ")); }'
   ```

   It prints each case's net invested capital at D, $7,000,000, $6,500,000 and $0, and each fee call with its LPs' part, the GP commitment's and each LP's fee, the figures in §3.

4. **The page.** Run it locally and open a case's `inputs.json` from `packages/fund/cases`:

   ```bash
   pnpm --filter @spillpoint/fund dev
   ```

   - **Case 38, 39 or 40:** refused in one line, "This file has a management fee on invested capital; the page shows it from the next version.", and the fund you had stays.
   - **Case 29 with `"basis": "commitments"` added to each step:** opens as case 29. Saved, the file's steps have no `basis`, and it opens again as the same fund.

5. **Scope:**

   ```bash
   git diff --stat main HEAD -- packages/fund/reference apps/dashboard cases reference packages/fund/cases packages/engine .github .claude
   ```

   It prints nothing.

## Assumptions added

- **FA63 to FA66, FC17:** Confirmed (f06a review), your first commit.
- **FA67 (New):** a `Fund` built by hand without 0.6.0's field. A fee step without a `basis` is on commitments, so the fund splits as 0.5.0 split it, as FA48 and FA61 have one without 0.4.0's and 0.5.0's fields. TypeScript requires the field. A test takes case 31, read, takes each step's basis off, and compares every answer.
- **The page's guard** (§5) is the page's, in `notes/plan-fund-page.md`, not an assumption: a basis the engine would refuse gets the guard's line, as f05b1's did.

## Open questions

1. **The names (§1).** Fine as proposed? They become stable once you settle them. The one that matters most is `FeeStep.basis` being required: TypeScript code that builds a `FeeStep` by hand has to add it from 0.6.0, as code building `FundTerms` had to add `carryBasis` in 0.5.0. At run time a step without one is on commitments (FA67).
