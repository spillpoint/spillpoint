# Review: f04b (management fees in the engine)

Branch `f04b-fund-fees-engine`, from main after #123. The second step of spillpoint-fund 0.4.0: F29's fee calls at a later close, the schedule and its calls (F30), and back fees in the equalization (F31), read with F32's refusals.

One PR, not split: about 600 lines of engine, 340 of its tests, and 140 on the page.

**Nothing in `packages/fund/reference`, `apps/dashboard`, any cases, `reference/`, `packages/engine`, `.github` or `.claude` changed:** `git diff --stat main --` over those prints nothing. No case file changed, so this PR doesn't need the cases label. *Until the fix-up (§11): it adds the reference's new refusal and one fund-32 fixture, so the PR now needs the cases label.*

**Every case now runs on the engine.** The engine's pending list is empty, so cases 25, 26 and 29 to 32 run through its tests. That covers every amount within FA15 and equal to the cent, every breakpoint with its reasons, every fee call and LP fee, every equalization amount with the back fees, and the 36 fund-32 refusals. The page's list keeps only 29 to 32.

**Beyond the cases:**
- **Random funds:** the engine and the fund reference agree on every value of 1,200 random fee funds (§7).
- **One fault each:** the engine and the reference refuse each of 4,618 one-fault inputs the same way, and the 1,106 that still read give the same output.
- **Against main:** a fund with no fee call before a later close gives main's output digit for digit.
- **Planted errors:** the tests caught all twelve.

**One question needs you first:** open question 1, `Split.lpMultiple` as `D | null`. *Answered on 2026-10-27, with the other four: a schedule no listed LP pays is refused, and FA47 is withdrawn (§11).*

*§1, the names, came first, in its own commit (`7d60479`), before any code used them. The rest was added once the engine and the page were built.*

| Commit | What |
|---|---|
| `6e36236` | your first commit: FA39 to FA46, FC13 and FC14 to "Confirmed (f04a review)" |
| `7d60479` | §1 of this note: the names, proposed |
| `5527d4f` | the engine, its tests, `STABLE.md` and the README (§2 to §6) |
| `0924993` | FA47, FA48 and one known edge (§8) |
| `0a2e636` | the page: the schedule's guard and the back fees on the equalization card (§9) |
| the last | the rest of this note |
| the fix-up | your defect and your answers, in six commits (§11) |

## 1. The names, proposed

Stable from 0.4.0 once you settle them. Where the idea is one the engine already has, it uses the engine's name for it. Your suggestions are taken as they are, except one addition, the last line of the table, which needs your answer (open question 1).

**The fund, as read:**

| Name | What it is |
|---|---|
| `FundTerms.managementFee: ManagementFee \| null` | F30's schedule, as the input gives it; null without one. Deeply frozen, as the rest of the fund is. A schedule's calls aren't in `fund.cashFlows`, which stays the input's (FA42). |
| `ManagementFee` | `{ start, frequency, steps, commitments }`: `start` a date as written; `frequency` with the default filled in; `steps` in the input's order; `commitments` a `D`, or null when it isn't given. |
| `FeeFrequency` | `"quarterly" \| "semiannual" \| "annual"`, as F30 writes them (FA41). |
| `FeeStep` | `{ rate, from }`: the annual rate on commitments, and the date it's in force from. The first step's `from` is null, since it's in force from `start`. It mirrors `CarryStep`'s `{ rate, fromLpMultiple }`, whose first step also has null. |

**The schedule's calls, once for the fund:**

| Name | What it is |
|---|---|
| `feeCalls(fund): FeeCall[] \| null` | Every one of the schedule's calls, in date order (F30, F31), worked out once for the fund, as `equalization(fund)` is. Null without a schedule. Empty when `start` is after D (FA39). |
| `FeeCall` | `{ date, firstDay, lastDay, call, lps, gpCommitment, byLp }`: its date; the first and last day it covers; the call; the LPs' part; the GP commitment's part, zero without one or when it's fee-free; and each LP's fee. Every amount exact, nothing rounded. |
| `LpFee` | `{ name, fee }`: one LP's fee for the period, as if in from the start (F29), in the input's order. `byLp` is empty without listed LPs. |

**The equalization:**

| Name | What it is |
|---|---|
| `EqualizationAmounts.backFees: D` | After `interestReceived`: at one close, the joiner's back fees paid to the manager there (F29, F31), and zero for an LP already in. Over all the closes, each LP's back fees summed. |
| `Equalization.rate: D \| null` | Null when no `equalization_rate` is given (FA45). **This changes a type that's stable from 0.3.0:** it was `D`. |

**The refusals' terms** (`INPUT_TERMS`, F32), from 0.4.0:
- `fee_rate_with_schedule`, at `terms.fee_rate`
- `fee_call_with_schedule`, at the first entered fee call
- `fee_commitments_mismatch`, at `terms.management_fee.commitments`

**One more, needed by FA40 (open question 1):** *withdrawn in the fix-up (§11). A schedule no listed LP pays is refused, so `Split.lpMultiple` stays `D`.*

| Name | What it is |
|---|---|
| `Split.lpMultiple: D \| null` | Null only when the LPs have paid in nothing at all, FA38's rule for an account applied to the split's own. **This changes a type that's stable from 0.1.0:** it was `D`. |

Here's why it needs your answer. In f03b you kept the split's own multiple as `D`, because `call_without_payers` saw to it that the LPs always paid in something.
- **FA40 makes a new case possible:** a schedule's calls have no payers to check, and a $0 call stays a call. So a fund whose listed LPs are all in a class at a fee rate of 0, with no investment or expense call, reads with nothing paid in by the LPs.
- **Its multiple is then 0 over 0** at nothing distributed, and anything over 0 after. Kept as `D`, those come out as NaN and Infinity.
- **What I did:** null, as FA38 does for an account.
- **The other choice** is to refuse such a fund, with a new term.
- **Only that fund gives null.** Today's page can't open one: its guard refuses a schedule until f04c.

## 2. `readFund` reads the schedule (`input.ts`, `schedule.ts`, `model.ts`)

- **The term:** `management_fee` is read into `fund.terms.managementFee`, deeply frozen, with `frequency` filled in. Null without one, or when it's null (FA41).
- **The refusals,** F32's, in F28's five stages as `SPEC.md` orders them:
  - **Stage 1:** the schedule's keys, and its steps' at `steps`' place among them.
  - **Stage 2:** after `equalization_rate`, the schedule's fields: its shape, `start`, `frequency`, each step (its shape, rate, then `from`), then `commitments`. Then `fee_rate_with_schedule`, then the classes. A class's own fee rate is allowed with either `fee_rate` or a schedule.
  - **Stage 3:** `fee_call_with_schedule` first, at the first entered fee call in the input's order. The schedule's calls then count among the calls for `no_calls` and `distribution_before_call`. `cash_flow_after_distribution_date` stays about entered flows (FA39).
  - **Stage 5:** the equalization rate only when an investment or expense call comes before a later close (F29). Then the schedule's `commitments`: missing without listed LPs, or not their total (`fee_commitments_mismatch`). Then each entered call's payers.
- **`commitments` against the LPs** is compared exactly, as FA41 says, "as a number": each commitment is taken as the input writes it, so commitments of "1/3" each total "1", with nothing lost at 40 digits.
- **The schedule's periods** (`schedule.ts`) come from the schedule and D alone, so stage 3 counts them before the LPs are read (FA40). Each is a sum of the rate on each day it covers, over n times the calendar period's days.
- **Dates:** `dates.ts` gains the other way from a day count to a date, and a day's calendar period. The first is checked on every day from 0001-01-01 to 9999-12-31.

## 3. The split and the breakpoints on the schedule's calls, and F29 (`fees.ts`, `waterfall.ts`)

- **The calls the waterfall runs:** the entered ones and the schedule's, in F4's order. A schedule's call comes after its date's entered calls and before that date's distributions (FA42). `fund.cashFlows` stays the input's.
- **A fee call's parts (F29, FA43):**
  - Each call keeps the LPs' part as made, and the fee weights of the LPs who paid it.
  - The waterfall counts it at its full size: that part times all the LPs' weights over theirs.
  - Each account's part is the account's weights times the rate, multiplied first.
  - With no later close after a call, the two sums of weights are the same, and the call counts as entered. On 392 random funds without a fee call before a later close, main's engine and this one give the same output at 40 digits (§7).
- **A schedule's call** is every LP's own fee already, so it's counted as it is.
- **The breakpoints** come from the same running balances, so they follow without a change of their own.

## 4. `feeCalls(fund)` (`fees.ts`, new)

- **What it gives:** the schedule's calls once for the fund, each with its days, the call, the LPs' part, the GP commitment's, and each LP's fee. Kept for a fund `readFund` returned, as the split's balances are.
- **An LP's fee:** its F22 fee weight times the rate-days, over the first rate times the divisor, multiplied first and divided once. With a schedule, a weight is a commitment times the class's rate, or times the schedule's first rate on the fund's terms.
- **The call:** the LPs' fees, over (1 − g) when the GP commitment pays fees. Its part is g of the call.

## 5. The equalization (`equalization.ts`)

- **Only investment and expense calls rebalance,** by commitment, with interest on them alone.
- **Back fees:** at each close, each joiner gets its back fees, its own part of each fee call before the close: a schedule's fee for it, or the entered call's rate times its weight. A fee call on the close's date is the joiner's as made (FA44).
- **`rate`** is null when none is given (FA45). The equalization is there whenever there's a later close, even with only fee calls before it.
- **A fund built by hand** with an investment or expense call before a later close and no rate is refused there, as `readFund` would refuse it.

## 6. The engine's tests

- **The pending list is empty:** cases 25, 26 and 29 to 32 run through `split`, `breakpoints`, `equalization` (now with `back_fees` and a null rate), `read` (the 36 fixtures) and the new `fees.test.ts`.
- **`fees.test.ts`:** every fee call in every case with its days, the call, the LPs' part, the GP commitment's and each LP's fee, within FA15 and to the cent, and that they add up. Then what the cases don't reach:
  - the first period pro rata from `start`
  - back fees, and a fee call on a close's date (FA44)
  - no rate needed and a null rate (FA45)
  - a start after D (FA39)
  - a period at 0 and a step up after it (FA40, FA46)
  - a step inside a period
  - $0 calls with every LP fee-free, and the null multiple (FA40, FA47)
  - FA42's order
  - the GP commitment paying fees
  - a class's fee stepping down with the fund's
- **`read.test.ts`:**
  - FA41's nulls and its exact words for `frequency`
  - `commitments` compared exactly, fractions included
  - rates in any order (FA46)
  - the schedule's calls counted for `no_calls`
  - the equalization rate's new condition
  - who joins later decided by the schedule's first call
- **`api.test.ts`:** pins `feeCalls`, `managementFee`'s fields, a fee call's and an `LpFee`'s, and `backFees`.
- **`cache.test.ts`:** a fund built by hand as 0.3.0 built one, with a fee call before a later close (FA48).
- **The counts:** the fund package has 1,305 tests passing and 9 skipped by design, from 1,092 and 9.

## 7. The engine against the fund reference, beyond the cases

Scripts in my scratch folder, not in the repo, as in f03b:
- **1,200 random fee funds** (`gen.py`), built on the reference's own generators:
  - 708 with a schedule: with and without listed LPs, in classes, with later closes, steps down, to 0, up and inside a period, all three frequencies, a start after D now and then, and the GP commitment paying fees or not.
  - The rest with entered fee calls before later closes.
  - A quarter without an equalization rate, some of them with only fee calls before the closes.
- **The reference against the engine:** each fund through the reference, then through the engine. Every amount at every point is compared to the cent and within 10^-18 of exact, and every breakpoint with its reasons, every fee call and LP fee, and every equalization amount with the back fees.

| | |
|---|---:|
| funds read, and refused the same way | 1,061 and 139 |
| with a schedule | 634 |
| points | 6,620 |
| amounts compared | 203,953 |
| LP rows | 15,507 |
| breakpoints, and their reasons | 3,437 and 4,746 |
| fee calls, and LP fees | 4,775 and 10,665 |
| later closes | 1,093 |
| equalization amounts, back fees above 0 among them | 25,870, 1,358 |
| equalizations with a null rate | 47 |
| differences | **none** |

**One fault each (`faults.py`).** 5,724 inputs, each one of those funds with one fault in it, 53 kinds:
- **The kinds:**
  - every line of F32, FA41's nulls, and `frequency`'s exact words
  - a step up
  - `commitments` as written with cents, or not the LPs' total
  - `fee_rate` and an entered fee call beside a schedule
  - a start after D, with and without other calls
  - every listed LP fee-free, with and without other calls
  - no equalization rate
  - a class's fee rate without fee terms
- **Refused:** 4,618, each with the reference's kind, term and path.
- **Read:** 1,106, which both still read. Run through the same comparison, they give the same output: 6,528 points, 199,830 amounts, 3,210 breakpoints, 5,077 fee calls and 12,658 LP fees, 21,875 equalization amounts, 50 null rates.
- **Differences:** none.

| Refused as | Inputs |
|---|---:|
| `missing_field` | 1,607 |
| `bad_number` | 781 |
| `bad_field` | 764 |
| `fee_rate_with_schedule` | 390 |
| `bad_date` | 246 |
| `steps_out_of_order` | 224 |
| `fee_call_with_schedule` | 170 |
| `call_without_payers` | 97 |
| `no_calls` | 93 |
| unsupported `basis` and `offset` | 90 and 78 |
| `fee_commitments_mismatch` | 59 |
| `distribution_before_call` | 19 |

**Against main, digit for digit (FA43).** Main's fund engine, unpacked from `git archive` into my scratch folder, and this one ran 392 random funds with no fee call before a later close, 258 with LPs and 179 with a later close. The comparison takes every split at three Xs both final and not, every NAV point, every breakpoint, and the equalization. Every value is the same at 40 digits, the new back fees, all zero, aside.

**Planted errors.** Each was planted in a scratch copy of the package, then the suite run:

| Planted | Tests failing |
|---|---:|
| an entered fee call before a later close counted as entered, as 0.3.0 did | 13 |
| no back fees | 7 |
| a fee factor over 365 days, not n times the period's | 60 |
| a class's fee rate ignored | 22 |
| a schedule's call after its date's distributions | 1 |
| the equalization rate needed for a fee call too, as in 0.3.0 | 1 |
| annual by default | 15 |
| the first period whole, not from `start` | 15 |
| a period at a rate of 0 kept as a call | 1 |
| the GP commitment not paying the fees it pays | 10 |
| `commitments` never checked against the LPs | 3 |
| fee calls divided between accounts by commitment | 87 |

## 8. `STABLE.md`, the README and the assumptions

- **`STABLE.md`:**
  - The three new terms, each "From 0.4.0", and where F32 widens an existing term (`bad_number`, `bad_date`, `bad_field`, `missing_field`, `steps_out_of_order`, `call_without_payers`).
  - The schedule's unsupported keys.
  - Two new sections:
    - "The management fees' names": `managementFee`, `feeCalls`, `backFees`.
    - "Types that can be null from 0.4.0": `Equalization.rate` (your §11 answer), and `Split.lpMultiple` if you keep FA47.
- **The README:**
  - The same terms, in its "Stable from 0.1.0".
  - The API: `managementFee` on `readFund`'s terms, `feeCalls`, `backFees`, and the rate and the multiple that can be null.
  - In "Inputs", the schedule and the equalization rate's new condition.
  - "Types that can be null from 0.4.0" at the end of the stable half.
  - The worked examples and "What it covers" wait for f04d, as you said. The case-26 example's figures change under F29.
- **The assumptions:**
  - Your first commit's statuses. The legend also gains the f03b and f04a reviews, which rows already used.
  - FA47 and FA48, new.
  - FA38 gains one sentence pointing to FA47.
  - A known edge: a schedule key like `"4"` beside an unsupported one. `JSON.parse` lists such a key first, so the engine names `4` and the reference `offset`, as f02b's edge has it for the terms, an LP and a class. I ran both to check.

## 9. The page (`apps/fund`)

- **The guard:** a file whose terms have a `management_fee` is refused in one line, in your words, before the engine reads it, so a save can't drop it. A null schedule is none, and opens. f04c takes it out.
- **The equalization card:**
  - **A "Back fees" column,** last, at each close and over all of them. Rounded down to the cent, with the leftover row as the other columns, and in its CSV.
  - **A sentence after the rate line (mine):** "Back fees are each joining LP's own fees for the fee calls before its close, paid to the manager."
  - **With no rate given,** your line in place of the rate. The interest columns are 0.00, as the engine gives them.
- **The pending list:** cases 25 and 26 come off, so the page's case tests run them again. The chart, the LPs', classes', clawback and equalization cards are all held to their new `expected.json`. 29 to 32 stay on until f04c.
- **Two lines the new types need:**
  - The blank fund's terms gain `managementFee: null`.
  - The summary's LP multiple shows "—" if it's ever null, which the guard keeps the page from meeting. *Out again in the fix-up, with FA47 (§11).*
- **Case 26's figures in the page's tests are F29's:**
  - **The equalization card and its CSV.**
  - **The LPs' card's CSV:** Alder's paid-in is $2,700,000.00 and Birchwood's $1,350,000.00, up by Birchwood's back fees, shared by commitment.
- **Two new tests:**
  - the guard, on cases 29 to 31, a saved file and a bare input, and a null schedule
  - a fund with no rate, on the built page, at the card
- **The counts:** the page has 504 tests passing, from 475.
- **Checked in the browser:** case 26's card at desktop and phone width. At 375px it stacks as before, the Back fees row in each LP's block, with no sideways scroll and no console errors.
- **`notes/plan-fund-page.md`:** the card's rate line, columns and CSV, and the guard, each marked "From f04b".

## 10. CI and permissions (hard rule 9)

Nothing in `.github/workflows/` or `.claude/` changed. `.claude/launch.json` is my local, untracked preview config, as before, and isn't committed.

**CI's commands, here:** `pnpm typecheck && pnpm build && pnpm test && pnpm test:reference` all pass. No dependency changed, so I didn't rerun `pnpm install`.

| Suite | Tests |
|---|---|
| fund package | 1,305 passed, 9 skipped (before: 1,092 and 9) |
| fund page | 504 (before: 475) |
| engine | 3,177, unchanged |
| main page | 680, unchanged |
| engine reference | 73 |
| fund reference | 91 |

`generate.py --check` matches all 32 fund case folders.

## 11. The fix-up, after your checks (2026-10-27)

Six commits on your defect and your answers, with the fund cases' lock lifted on your machine for one fixture:

| Commit | What |
|---|---|
| `5c7e7de` | `SPEC.md`, `ASSUMPTIONS.md`, `STABLE.md` and the README: the refusal, FA40, FA47 withdrawn, FC14, FA48 |
| `957effe` | the reference: the refusal in stage 5, with a unit test |
| `3d143f8` | the engine: the refusal, fresh fee calls, `Split.lpMultiple` back to `D`, and their tests |
| `0b06c01` | the page: the line under the equalization card |
| `602b9d2` | fund-32's new fixture, its `expected.json` and `DERIVATION.md` |
| `69ec1a1` | this section |
| after your second check | fund-32's two derivation lines and one `about`, and this section's last part |

**Your defect: `feeCalls` handed back what it kept.**
- **Now:** each `feeCalls(fund)` is a new list of new calls, each with a new `byLp` list, new `LpFee`s and new `D`s. The waterfall and the equalization run on calls the engine keeps and never hands out.
- **The tests,** in `cache.test.ts`, on case 31:
  - **What's edited:** every level of what `feeCalls` returns. The list gains and loses calls; the first call's dates and amounts change; an LP's name and fee change; a `byLp` gains, loses and reverses; a `D`'s digits change.
  - **What's checked:** the next `feeCalls`, `splitAt` at three X's and final, `findBreakpoints` and `equalization` are as on a fresh read. That holds whether `feeCalls` was asked for before the first split or after.
  - **A third test** checks that each `feeCalls` is a new list of new calls.
  - **On the PR as it was,** all three fail.
- **The other three functions, checked in scratch:**
  - **What I did:** edited every object and list that `splitAt`, `findBreakpoints`, `equalization` and `feeCalls` return, on all 28 cases with an `inputs.json`, before the first split and after.
  - **The result:** every later answer was as on a fresh read. On the PR as it was, cases 29 to 31 differed.
- **One level deeper, a `D`'s own digits, is new open question 1.** decimal.js says they're read-only, and the rest of the API shares its `D`s. `splitAt` hands back the engine's own zero, so `split.gpCommitmentPaidIn.d[0] = 7` changes every later zero, in any fund. Only `feeCalls` copies its `D`s.

**Answer 1: a schedule no listed LP pays is refused.**
- **The rule** is your line, in F32 and in F28's: "A schedule no listed LP pays, every one in a class at a fee rate of 0: `call_without_payers` at `terms.management_fee`, as an entered fee call nobody pays is (F28)."
  - **Its place:** stage 5, after the commitments and before each entered call's payers.
  - **Where it's written:** F28's list of stages, the assumptions' F28 and F32 rows, the reference and the engine.
- **Only the fee weights count,** not who is in on each call's date, since a schedule's calls are every LP's own fee (F29). Any such schedule is refused, even one that calls nothing yet because it starts after D.
- **What still reads:**
  - one LP paying: on the fund's terms, in a class at a fee rate above 0, or in a class with no fee rate of its own
  - a schedule without listed LPs, on its `commitments`, as before
- **FA40** says only that a period whose every day is at a rate of 0 isn't a call. It adds that no call is $0, because of the refusal.
- **FA38 and FA42:**
  - **FA38's last line** is back to "the split's own `lpMultiple` is always a number", now with a schedule's calls included.
  - **FA42** no longer says `call_without_payers` is only about entered calls.
- **FA47 is withdrawn,** and `Split.lpMultiple` is `D` again.
  - **Its row stays,** since IDs are never reused, with a new status in the legend: "Withdrawn (f04b review)".
  - **Back to main's:** the engine's type and line, the split test, the page's summary, and the README's `lpMultiple` line.
  - **The null sections** in `STABLE.md` and the README give `Equalization.rate` alone.
- **`SPEC.md`'s decisions** gain one line under 2026-10-25: a schedule no listed LP pays is refused, so no call is $0 and the LPs always pay something in.
- **The tests:**
  - **Two new ones,** the reference's unit test and the engine's in `read.test.ts`, check the refusal, what still reads, and stage 5's order. Each fails with the refusal taken out.
  - **Gone:** `fees.test.ts`'s test of a $0 call.
- **FA48 gains one sentence,** on a hand-built fund, which `readFund` never checks. There such a schedule calls $0 a period. With no other call, the split's multiple isn't a number (decimal.js's Infinity). A hand-built fund with no calls at all gives the same, on main too.

**The fixture, `schedule-without-payers`,** is as you gave it: case 31 with Alder Endowment in Friends and family and Anchor's fee rate set to 0. It's refused `input`, `call_without_payers`, `terms.management_fee`.
- **Written by shell, with your OK,** since this session kept the deny it loaded:
  - **The fixture,** by a script, in the other 36's shape. The script first checked that its writer gives each of the 36 back byte for byte.
  - **`expected.json`,** by `generate.py`.
  - **`DERIVATION.md`,** edited in scratch and checked there: each of its 37 rows names its fixture's base and the refusal `expected.json` gives. The session refused the copy in, so you ran the `cp`. The file is byte for byte the scratch copy.
- **The diff:**
  - `expected.json` changed only by the new entry.
  - `DERIVATION.md` changed only by the new row and "Thirty-six" to "Thirty-seven".
  - Nothing else in `packages/fund/cases` changed. **So this PR now needs the cases label.**
- **"37 wherever 36 is counted":** `SPEC.md`'s case 32 line, FC14 and the derivation's first line. `cases.test.ts` doesn't count the fixtures. It checks that each has a refusal in `expected.json`, and now checks 37, so it's unchanged.

| File | sha256 |
|---|---|
| `fund-32-fees-refused/expected.json` | `2424f9bf1cc8a80a5bb65b851d1d877c799fba4c759cae9471ee8e7f94cf5b4f` |
| `fund-32-fees-refused/DERIVATION.md` | `9232a169db99b28bb0a2307c99c0d82e939abf4b9dcb9829453dead5c9d3ee45` |
| `fund-32-fees-refused/fixtures/schedule-without-payers.json` | `c473a9e3362609e532f5e031774ceae2ceaaa7efc84fddf838188c1b408ff6e5` |

**Answer 4, the line under the card,** is now in your words: "Equalization is outside the waterfall: at each close it moves capital and interest between the LPs, and back fees to the manager. It changes nothing above."
- **Also changed:** the page's test, and `notes/plan-fund-page.md`, marked "From f04b".
- **Checked** on the built page, on case 26's card, with no console errors.

**Outside your list:**
- **The reference's tests cited FA47** for a later rate's rise, in two comments and a docstring, since f04a. FA46 is that rule, so they now cite it.
- **`.claude/settings.json`** is still yours, uncommitted. Nothing in `.github/workflows/` or `.claude/` changed.

**Checked again, here.** CI's commands pass: `pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference`.

| Suite | Tests |
|---|---|
| fund package | 1,310 passed, 9 skipped (1,305 and 9 before the fix-up) |
| fund page | 504, unchanged |
| engine | 3,177, unchanged |
| main page | 680, unchanged |
| engine reference | 73 |
| fund reference | 92 (91 before) |

`generate.py --check` matches all 32 fund case folders.

**Against the reference again,** with f04b's scripts (§7) and the new reference:
- **f04b's 1,200 funds:** no differences. 1,052 read and 148 are refused the same way. That's 9 more refused than before: the schedules no listed LP pays, now refused at the schedule.
- **1,200 new funds,** 58 of them schedule funds with every listed LP made fee-free: no differences. 993 read and 207 are refused the same way, 55 of them at the schedule.
- **5,856 one-fault inputs:** each refused with the same kind, term and path, 157 of them at the schedule. The 909 that still read give the same output.

**Your answers, for the record:**
1. **FA47:** refuse such a fund with `call_without_payers`, and with it any schedule no listed LP pays. FA47 goes.
2. **The page's words for a missing equalization rate** change in f04c:
   - On Terms: "Needed: an investment or expense call comes before a later close. Write 0 for none."
   - When a file opens: "…it's needed when an investment or expense call comes before a later close."
3. **The back fees sentence:** fine.
4. **The line under the card:** reworded now, above.
5. **`STABLE.md`'s new sections:** fine in both, as long as the README has them too, which it does.

**Carried to f04c:**
- the two missing-rate lines in answer 2
- **the page's words for `call_without_payers` at `terms.management_fee`.** Today's say "no LP in the fund on this date pays this call", which is about an entered call. The guard keeps the page from meeting the new one until f04c.
- **the engine's message for it,** which also reads as an entered call's: "no LP in the fund at this call's date would pay it…". Messages aren't stable names, so it gets its own, beside the page's words (your second check).
- **in f04c's first commit, a known edge in `ASSUMPTIONS.md`:** the `D` values a result hands back can be the engine's own, and writing into one is unsupported and can change later answers (your second check, answer 1).

**New open questions,** both answered after your second check (below):
1. **A `D`'s digits** (above): leave it, since decimal.js says they're read-only, or have the API copy or freeze the `D`s it hands back?
2. **Four lines in `fund-32-fees-refused` are stale or damaged.** I left them, as you said only the row and the counts change. Fix them at the next unlock?
   - **The bases list:** the derivation's line for case 31 doesn't list the new fixture.
   - **Stage 5:** the derivation's list of checks doesn't name the new one.
   - **Its last line,** "Every refusal here is the one `cases-fees.json` gives", isn't true of the thirty-seventh, which is from your review.
   - **`fee-commitments-not-the-lps-total.json`'s `about`** reads "The schedule's commitments ,000,000, not the two LPs' ,000,000." The shell ate "$24" and "$25" when I wrote it in f04a. My mistake. Its change and its refusal are right.

**After your second check (2026-10-27).** One more commit, with the lock still lifted on your machine.
- **`DERIVATION.md`'s two lines,** in your words:
  - **The bases:** case 31's line now ends "the equalization rate, and a schedule no listed LP pays."
  - **Stage 5:** "then the schedule, refused when no listed LP pays it" now comes before each entered call's payers.
- **`fee-commitments-not-the-lps-total.json`'s `about`:** "The schedule's commitments $24,000,000, not the two LPs' $25,000,000." It was written from Python, so no shell touched the dollar signs.
- **How they got there:** both were made in scratch and checked there, then you ran the two `cp`s. Both files are byte for byte the scratch copies.
  - **The fixture** reads back with both amounts, its keys and change are as before, and the reference gives the refusal in `expected.json`.
  - **The derivation's 37 rows** still each name their fixture's base and its refusal.
- **The diff:** `DERIVATION.md` changed by those two lines only, the fixture by its `about` only. `expected.json` is unchanged, still `2424f9bf…` as above. Nothing else in `packages/fund/cases` changed.
- **Checked:** `generate.py --check` matches all 32 folders. The fund package's tests pass (1,310, 9 skipped), and so does the fund reference (92).
- **Left as it is,** as you said: the derivation's last line. Your `cases-fees.json` now has the thirty-seventh refusal.

| File | sha256 |
|---|---|
| `fund-32-fees-refused/DERIVATION.md` | `4278da6cae4c21e86904c9103bf5104d296c33e589f4450c3bc0f2591008f434` (replaces `9232a169…` above) |
| `fund-32-fees-refused/fixtures/fee-commitments-not-the-lps-total.json` | `ed020bd58769d51c6d0c01f49aa5b2ad7acbb4b6444d813427e1984e04b0479f` |

**Your answers to the two new questions:**
1. **A `D`'s digits:** leave them. decimal.js documents a Decimal's properties as read-only, and copying or freezing every `D` a result hands back would slow every split. The known edge goes into f04c's first commit (above).
2. **The four lines:** three fixed, above. The derivation's last line stays.

## How to check it by behavior

**The engine,** from `packages/fund`:

```bash
pnpm test
```

- **The cases now running:** cases 25, 26 and 29 to 32 are in `split`, `breakpoints`, `equalization`, `fees` and `read`.
- **A few figures to look for:**
  - **Case 29:** 22 fee calls, the first $100,000.00 on 2021-02-15, the last $150,000.00 on 2026-04-01, $4,225,000.00 in all.
  - **Case 30:** the first call is $255,102.04, of which $5,102.04 is the GP commitment's. The clawback owed is $150,000.00 at X = 0 and $52,000.00 at $500,000.
  - **Case 31:** the first call's LP fees are Alder $50,000.00, Cedar $0.00 and Dogwood $20,000.00. Dogwood pays in $1,600,000.00 with $68,383.56 of interest, and $60,000.00 of back fees.
  - **Case 25:** paid-in $7,060,000.00, Cedar's back fees $20,000.00.
  - **Case 26:** paid-in $5,300,000.00, Birchwood's back fees $50,000.00.

**The page,** `pnpm --filter @spillpoint/fund dev`:
1. **Case 26:** pick "Two later closes and a friends-and-family class" in "Start from". Go to its equalization card, "All the closes together":

   | LP | Paid in | Got back | Interest paid | Interest received | Back fees |
   |---|---:|---:|---:|---:|---:|
   | Alder Endowment | 0.00 | 1,500,000.00 | 0.00 | 32,383.56 | 0.00 |
   | Birchwood Family Office | 666,666.66 | 416,666.66 | 9,863.01 | 11,260.27 | 50,000.00 |
   | Cedar Holdings | 1,250,000.00 | 0.00 | 33,780.82 | 0.00 | 0.00 |
   | Left over from rounding down | 0.01 | 0.01 | 0.01 | 0.01 | 0.00 |
   | Total | 1,916,666.67 | 1,916,666.67 | 43,643.84 | 43,643.84 | 50,000.00 |

   "Download as CSV" gives the same, with "Back fees" last.
2. **The guard:** open `packages/fund/cases/fund-29-fee-schedule/inputs.json` with "Open". The page says, in one line, "Couldn't open inputs.json. This file has a management fee schedule; the page shows it from the next version." and keeps the fund it had.
3. **No rate:** open case 25's `inputs.json` with its first cash flow's date changed to `2021-07-15` and `equalization_rate` deleted. The card reads "No equalization interest: only fee calls come before the later closes." Cedar's row is $0.00 everywhere but $20,000.00 of back fees.

## Assumptions added

- **FA47:** the split's own LP multiple is null when the LPs have paid in nothing, as FA38 has an account's. It's New and needs your answer (open question 1). *Withdrawn in the fix-up (§11).*
- **FA48:** a `Fund` built by hand without `managementFee` has no schedule, F29 still applying to its entered fee calls. An entered fee call nobody in pays, which `readFund` refuses, counts as entered rather than dividing by nothing. *The fix-up adds what a hand-built schedule nobody pays gives (§11).*
- **A known edge:** the schedule's whole-number keys (§8).
- **FA39 to FA46, FC13 and FC14:** "Confirmed (f04a review)".

## Open questions

All five were answered on 2026-10-27 (§11), which has two new ones. Both of those were answered after your second check (the end of §11).

1. **`Split.lpMultiple` as `D | null` (FA47, §1).**
   - **The case:** FA40 lets a fund read with the LPs having paid in nothing: a schedule whose listed LPs all pay no fees, and no investment or expense call. Its multiple would be 0 over 0.
   - **What I did:** null, as FA38 does for an account. That changes a type stable from 0.1.0, which the README's first example uses as `lpMultiple.toFixed(4)`.
   - **The other choice** is to refuse such a fund, with a new term.

   Which?
2. **The page's words for a missing equalization rate** are still 0.3.0's, since you said nothing else on the page changes yet:
   - **On the Terms tab:** "Needed: an LP joins at a later close. Write 0 for none."
   - **When a file opens:** "…it's needed when an LP joins at a later close."

   Under F29 the rate is needed only when an investment or expense call comes before a later close. Both are still true whenever they show, but they don't say why. Change them in f04c?
3. **The card's back fees sentence** is mine: "Back fees are each joining LP's own fees for the fee calls before its close, paid to the manager." Fine?
4. **The line under the card** still reads "Equalization is outside the waterfall: it moves money between LPs at each close and changes nothing above." Back fees go to the manager, not between LPs. Leave it, or reword it in f04c?
5. **`STABLE.md`'s two new sections** list API names and types, which it hadn't before: until now it listed only the names and words code can match on. Fine there, or should they live only in the README's API section?
