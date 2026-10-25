# Review: f04a (management fees: spec, reference and cases)

Branch `f04a-fund-fees-spec-and-cases`, from main after #122. The first step of spillpoint-fund 0.4.0:
- **F29:** a fee call at a later close is each LP's own, not rebalanced, which fixes 0.3.0's F25.
- **F30 to F32:** a management fee schedule that works out the fee calls, its outputs, and its refusals.

No engine or page code.

**Nothing in the engine, the fund's source, the page's source, the main page, `cases/` or `reference/` changed:** `git diff --stat main -- packages/engine packages/fund/src apps/fund/src apps/dashboard cases reference .github` prints nothing.
- **Four test files under `apps/` changed:** the page's pending list, as your step 5 asks, and three page tests that named cases 25 and 26 directly and so went around that list. Each now skips the pending cases (§8).
- **`packages/fund/cases`:**
  - **Cases 25 and 26:** each `expected.json` and `DERIVATION.md`, their inputs unchanged.
  - **Four new folders,** fund-29 to fund-32.

  Nothing else in fund-01 to fund-28 changed.

`.claude/settings.json` isn't committed: the fund cases' lock is lifted only on your machine.

**The reference and my hand work never disagreed, and no case contradicts the spec.**
- **The five run cases:** each `expected.json` rebuilt from my hand working comes out byte for byte the reference's.
- **All 36 refusals** are the kind, term and path `cases-fees.json` gives.
- **Every figure in your spec's case notes comes out of both:**
  - case 25's $20,000 of back fees and $7,060,000 paid-in
  - case 26's $50,000 and $5,300,000
  - case 29's half first quarter, $200,000 quarters, $175,000, $150,000 and $4,225,000 in all
  - case 30's 37,625,000/181, $750,000 after the last distribution, $150,000 owed at X = 0, and $765,306.12
  - case 31's $60,000

**Three things to raise, in the open questions:**
- Cases 25 and 26's own descriptions still describe 0.3.0's rebalancing of fee calls.
- What happens when every LP is fee-free under a schedule (FA40).
- A schedule that starts after D (FA39).

| Commit | What |
|---|---|
| `94a0858` | your step 1: 0.3.0's known limitation in its release note |
| `a974868` | `SPEC.md` and `ASSUMPTIONS.md`: F29 to F32, F25 and F28 amended, FA39 to FA46, FC13 and FC14 (§2, §3, §4) |
| `874d2eb` | the reference: `fees.py`, the schedule, F29 at the closes, the back fees, and 27 more unit tests (§5) |
| `f5b829d` | the cases: 25 and 26 worked again, 29 to 31, and the 36 refusals (§6, §7) |
| `ac3a5a3` | the pending lists, the case-file checks, and the three page tests (§8) |
| `fb1f00e` | `CLAUDE.md` names the 0.4.0 steps and F1 to F32 |
| the last | this note |

## 1. The release note (your step 1)

The section "Known limitation, found after release" is at the end of `notes/release-fund-0.3.0.md`, word for word from the fund-v0.3.0 GitHub release. I checked it by diffing the section against `gh api …/releases/tags/fund-v0.3.0`: identical. A blank line before it, as the note's other sections have.

## 2. The spec (`packages/fund/docs/SPEC.md`)

From `local/fund/fund-spec-fees.md`, in the spec's own style:
- **The opening line:** F29 to F32 settled on 2026-10-25 for 0.4.0 (S3).
- **"What it answers":** your two lines for management fees.
- **Inputs:**
  - `fee_rate` isn't given with a schedule.
  - `equalization_rate` is needed only when an investment or expense call comes before a later close.
  - A "From 0.4.0" bullet with your JSON for `management_fee` and your five points about it.
- **F18's input terms:** `fee_rate_with_schedule`, `fee_call_with_schedule` and `fee_commitments_mismatch`, marked F32.
- **F25, amended where F29 says:**
  - Only investment and expense calls rebalance at a later close, and interest runs on them alone.
  - Each joiner pays its back fees to the manager.
  - Back fees are outside the waterfall.
  - Each change is marked F29, and says what 0.3.0 did.
- **F26:** the equalization gives each LP's back fees too (F31).
- **F28, amended:**
  - A class's fee rate needs `fee_rate` or a schedule.
  - The equalization rate is needed only for an investment or expense call before a later close.
  - Only entered calls are checked for payers.
  - **The order of checks** has the schedule in each of its five stages, written out once there; F32 points to it.
- **F29 to F32** after F28, as your spec has them, with a lead-in and "Why the fix".
  - **Your seven defaults** are in F30, marked as Claude's and settled with the spec.
  - **The page's section** isn't copied (§"Not in this step").
- **One thing left out on purpose:** your spec quotes EisnerAmper's article on subsequent closings. That's published waterfall material, which the fund workstream keeps out of the repo, as hard rule 10 keeps out OCF's. So "Why the fix" makes the same point in our own words, without the quote or the name.
- **Cases:**
  - twenty-eight cases and four sets of refusals
  - 25 and 26 with a line on what F29 changes
  - 29 to 32 from your case notes
- **Decided:** your three decisions of 2026-10-25, and your defaults.

## 3. The assumptions (`packages/fund/docs/ASSUMPTIONS.md`)

- **A new status, Settled (S3),** and a table "Management fees (S3)" with F29 to F32.
- **F25, F26 and F28's rows** say what F29 changes, marked "amended by F29 (S3)" where it does.
- **FA21, FA26 and FA30 each gain a sentence** for 0.4.0, marked so, the rest as you confirmed them:
  - FA21: payers are checked for entered calls only
  - FA26: a rate given and not needed
  - FA30: fee calls no longer rebalance
- **FA39 to FA46,** new, the choices F29 to F32 leave open:

| ID | Default |
|---|---|
| FA39 | **The schedule and D.** No call is dated after D. A `start` after D calls nothing yet, and isn't refused, as a term given but not needed (FA26). A fund with no other call is then refused `no_calls` (F4). So `cash_flow_after_distribution_date` is only ever about an entered flow (open question 3). |
| FA40 | **A period with nothing to call** is decided from the schedule alone: one whose every day is at a rate of 0. That's what lets stage 3 count the schedule's calls before the LPs are read, as F32's order has it. If every listed LP is in a class at a fee rate of 0, each call is $0 and stays a call, so who joins later doesn't turn on the classes (open question 2). |
| FA41 | **null in the schedule** is left out, as FA3 has it: no schedule, quarterly, no commitments, or no first `from`. A null `start`, `steps`, rate or later `from` is missing. `frequency` is one of the three words exactly. `commitments` compares with the LPs' total as a number. |
| FA42 | **A schedule's call among the cash flows:** after its date's entered calls and before its distributions, which changes nothing, since calls on one date only add up. It has no place in `cash_flows`, so no refusal names one. |
| FA43 | **An entered fee call's parts (F29):** its charge per unit of fee weight is the LPs' part over the weights of the LPs in at its date, and every LP's part is that times its own weight. In the waterfall the call counts at the LPs' part times all the weights over those in, multiplied first (FA34). With no later close after it the two are the same, so it's 0.3.0's to the digit. The GP commitment's part stays g of the call as entered. |
| FA44 | **When a fee call is before a close:** as FA21, its date is before the close's. A fee call on a close's date is paid as made, the joiners included: no back fee. A joiner owes the whole of each call before its close, even the period it joins in. |
| FA45 | **The equalization without a rate:** a fund whose later closes have only fee calls before them needs no rate, and its equalization is still worked out for the back fees, with no interest. Its `rate` in the case file is null (open question 6). |
| FA46 | **A schedule's later rates:** any from 0 up to, not including, 1, in any order: a later step can be higher than the one before, since F32 orders steps by date only (open question 5). A step dated after D changes nothing to D. |

**Also decided, smaller:**
- **Each new case's `description`** is your `about` from `cases-fees.json`, word for word. Each fixture's `about` sentence is mine; its change and expected refusal are yours.
- **The derivations of 25 and 26:**
  - They keep 0.3.0's structure: its working where it still holds, every number worked again.
  - Each ends with "What changed from 0.3.0", setting the 0.3.0 values beside the new ones.
- **Not in this step:**
  - **The new input terms in STABLE.md and the README's stable lists.** A test holds both to the engine's list exactly, so they go in with f04b, as F28's did in f03b.
  - **The page's section of your spec (f04c).** It goes into `notes/plan-fund-page.md` in f04c's first commit, as 0.3.0's page rules did, unless you'd rather.

## 4. The case files: FC13 and FC14 (your step 4)

**FC13 proposes how `expected.json` carries the schedule's fee calls and each LP's back fees.** Each piece is there only when the input needs it, so every case but 25 and 26 is byte for byte as it was:
- **With a schedule,** `fee_calls` at the top, after FC3's paid-in and pref and before `lps`.
  - **One entry a call, in date order:** its `date`, `first_day` and `last_day` (the days it covers), `call`, and `lps` (the LPs' part).
  - **`gp_commitment`,** with a GP commitment, as FC4 gives its line.
  - **`by_lp`,** with listed LPs: each LP's `fee`, as if in from the start.
  - **Each amount is `{amount, exact}`,** as FC9's are, since the calls are exact (F31) and a step inside a period rarely gives whole cents.
- **With a later close,** every equalization row gains `back_fees` after `interest_received`, zeros included, as FC11's rows give every amount. Its `rate` is null when none was given (FA45).
- **Nothing else changes shape.** An entered fee call before a later close isn't listed again at its full size; the LPs' and each account's paid-in show it, back fees included.

From case 30, its half-year with the step:

```json
{ "date": "2022-01-01", "first_day": "2022-01-01", "last_day": "2022-06-30",
  "call": { "amount": "212115.23", "exact": "268750000/1267" },
  "lps": { "amount": "207872.93", "exact": "37625000/181" },
  "gp_commitment": { "amount": "4242.30", "exact": "5375000/1267" },
  "by_lp": [
    { "name": "Alder Endowment", "fee": { "amount": "124723.76", "exact": "22575000/181" } },
    { "name": "Birchwood Family Office", "fee": { "amount": "83149.17", "exact": "15050000/181" } } ] }
```

and case 31's Dogwood at its close:

```json
{ "name": "Dogwood Pension",
  "capital_paid": { "amount": "1600000.00", "exact": "1600000" },
  "capital_returned": { "amount": "0.00", "exact": "0" },
  "interest_paid": { "amount": "68383.56", "exact": "4992000/73" },
  "interest_received": { "amount": "0.00", "exact": "0" },
  "back_fees": { "amount": "60000.00", "exact": "60000" } }
```

**FC14:** `fund-32-fees-refused`, in FC7's shape, 36 fixtures, each naming its own base:
- **case 29,** no listed LPs, for the schedule's own fields
- **case 30** for the steps' order, an entered fee call, and `commitments` against the LPs
- **case 31** for `fee_rate` with a schedule, a class fee rate with neither, and the equalization rate

The fixtures that add to a list (`steps[2]`, `cash_flows[4]`, `cash_flows[5]`) add at its end, as FC12 has `set` do.

## 5. The reference (`packages/fund/reference`)

Written from `SPEC.md` alone, as before.
- **`fund_ref/fees.py`, new (F29, F30):**
  - **The schedule's periods:** calendar quarters, half-years or years from `start`'s to D's, none dated after D.
  - **Each fee factor,** added up day by day.
  - **Each LP's fee,** and the call, over 1 − g when the GP commitment pays fees.
  - **An entered fee call's charge per unit of fee weight,** from the LPs in at its date.
  - **The LPs' part of each fee call as the waterfall counts it,** at full size.
  - **Each joiner's back fees.**
- **`fund_ref/inputs.py`:** reads `management_fee` with F32's refusals in their stages:
  - stage 1: its keys and its steps'
  - stage 2: its fields, then `fee_rate_with_schedule`
  - stage 3: `fee_call_with_schedule`, then the schedule's calls among the calls
  - stage 5: the equalization rate's new condition, then `commitments`

  A class's fee rate is set against the schedule's first rate.
- **`fund_ref/accounts.py`:** each account's part of a fee call is of its full size (F29). With no fee call before a later close nothing is scaled, so cases 01 to 24, 27 and 28 come out byte for byte the same: `generate.py --check` matches all of them.
- **`fund_ref/closes.py`:** only investment and expense calls rebalance, with interest on them alone; each joiner's back fees are worked at its close.
- **`fund_ref/case.py`:** writes FC13's shapes.
- **`tests/test_fund_ref.py`:** 27 new tests, 91 in all, with numbers small enough to check on paper.
  - **The schedule (9):**
    - a part first quarter, then whole ones
    - case 30's step inside a half-year
    - leap years
    - no call after D, and a start after D (FA39)
    - a rate of 0 and a period all at 0 (FA40)
    - a class stepping down with the fund
    - the GP commitment's g
    - the schedule's calls giving exactly what the same calls entered give, breakpoints and all
    - listed LPs as the base, in FC13's shape
  - **F29 at the closes (8):**
    - back fees from an entered fee call, with a null rate in the case file
    - back fees counting from the call's date, with no interest
    - a fee call on the close's date (FA44)
    - each joiner owing for the calls before its own close
    - the GP commitment's g of the call as entered
    - a schedule's calls as back fees
    - when the equalization rate is needed
    - no fee call before a close giving 0.3.0's amounts to the last digit
  - **F32 beyond the fixtures (9):**
    - null (FA41)
    - the frequency's three words
    - the order within a step and among the terms and stages
    - a step-up allowed (FA46)
    - the fee call named in the input's order
    - `commitments` as a number
    - a class's fee rate against the schedule
    - a schedule's call needing no payer
  - **The one 0.3.0 test F29 changes:** "the waterfall is as if every LP were in from the start" now has case 25's January fee call at its full $100,000. Its rule changed, so the test did.
  - **Random funds with fees (1),** 30 of them, half with a schedule and half with entered fee calls before later closes:
    - every account's breakpoints are found, and no account's clawback rises
    - what the waterfall counts as the LPs' fees is what the LPs in at each call paid as made, plus every joiner's back fees
    - each close balances, and only joiners pay back fees
    - with no fee call before a close, the closes change no amount
    - **What they covered:** 12 have a schedule, 23 a later close, 18 back fees (9 from a schedule), 20 two or more accounts, and 13 owe a clawback at X = 0.
  - **The cost:** the reference's tests take about 50 seconds, up from 30.
- **The tests bite.** Seven errors planted in the reference one at a time each failed tests:

  | Error planted | Tests failed |
  |---|---:|
  | An entered fee call before a close not grossed up (0.3.0) | 7 |
  | A fee call on a close's date counted as a back fee | 1 |
  | The first period not pro-rated | 11 |
  | A step in force from the day after its date | 16 |
  | The GP commitment's part of a schedule's call left out | 2 |
  | Fee calls rebalanced at a close (0.3.0) | 6 |
  | The equalization rate needed for any later close (0.3.0) | 7 |

- **`README.md`:** the method gains the fees, the closes' back fees and the random funds with fees.

## 6. The cases (`packages/fund/cases`, your step 4)

- **fund-25 and fund-26:**
  - inputs unchanged; I checked yours in `cases-fees.json` match the repo's
  - `expected.json` from the reference
  - `DERIVATION.md` worked again under F29, ending with what changed and why
- **fund-29 to fund-31:**
  - `inputs.json` written by a script from `cases-fees.json`
  - `expected.json` from the reference
  - a `DERIVATION.md` worked by hand
- **fund-32-fees-refused:**
  - your 36 changes as fixtures, each naming its base, in FC7's shape
  - `expected.json` from the reference
  - a derivation of each refusal, with the stage of the order of checks that decides it

**How the hand work was done and checked** (a script in my scratch folder, not committed, importing nothing from the reference):
- **A different method from the reference's:**
  - the fee factors by date segments between steps, not day by day
  - each account's pref in closed form (each call's rate for its days to the date, less each capital return's), not a ledger advanced flow by flow
  - breakpoints from tier sizes, not by search
  - the clawback's entitlement from the totals run's tier sizes
  - the equalization's interest received as the rate on what each LP gets back (FA30's form), not the joiners' interest shared out
- **The whole `expected.json`, rebuilt from that working, against the reference's:** every key in order and every value, for all five run cases. Byte for byte the same.
- **The comparison bites.** Four errors planted in my working each showed as differences in the cases they touch:
  - the first quarter pro-rated over its own days: 78 in case 29
  - the catch-up over s, not s − c: 22 in case 29 and 119 in case 30
  - an entered fee call counted as made, as 0.3.0 did: 85 in case 25 and 72 in case 26
  - the GP commitment's fee part left out: 57 in case 30
- **The derivations:** every table is the hand working's. Every amount in the prose I checked against the case's `expected.json` or by hand.
  - **That check caught one mistake of mine in case 29's prose:** "13 whole quarters" of fees before the 2024 distribution, $32,400,000 paid in. It's 14 quarters and $32,600,000, and the next distribution's figures were off the same way. Fixed, and confirmed from the working. Nothing in any table or `expected.json` was affected.
- **The refusals:** all 36 match `cases-fees.json`, kind, term and path, and the derivation's 36 rows match `expected.json`.
- **Cases 01 to 24, 27 and 28:** `generate.py --check` matches all of them, and `git diff` shows none changed.

## 7. How the files got there

As in f03a, every file in `packages/fund/cases` was written by a script or copied in with `cp`, not by the Write tool:
- **`inputs.json`** for 29 to 31 and the 36 fixtures were written by a script from `cases-fees.json`, each into its own new folder.
- **`expected.json`** was written by the reference, `generate.py`.
- **The six `DERIVATION.md` files** were written in my scratch folder, checked there, and copied in byte for byte with `cp`.
- **I didn't edit or commit `.claude/settings.json`.**
- **The checks that plant errors** (§8) ran on a copy of the cases in my scratch folder. No case file was changed and put back.

Each derivation's sha256, the same in my scratch folder and the case folder:

| File | sha256 |
|---|---|
| `fund-25-later-close/DERIVATION.md` | `41f3b7196354b968fb01cec244fdd08b37040609a6bc83b0c509476b5cc2d123` |
| `fund-26-closes-and-classes/DERIVATION.md` | `0936ef5521ec3f3beb3faf90056ce0f38e5a26e9d34630238f18fe6f37179048` |
| `fund-29-fee-schedule/DERIVATION.md` | `0fc1585c0c99e76a7547d0d1558325c133410299cd23ab4e2233d7593b00dcec` |
| `fund-30-fee-step-down/DERIVATION.md` | `aad6602b3e0c19f62ae42c5b33e4b5b9d24ab122b55528eaaf6beafded68edaf` |
| `fund-31-fee-schedule-classes-closes/DERIVATION.md` | `a1a5b13539de604e05fecd5c1a43f4538dc7f44dd52d211e6db3d263c1bed904` |
| `fund-32-fees-refused/DERIVATION.md` | `510984437ceb8e22913d3131bfa6e0a2585a90697030cec9db4e09680b7bfc97` |

## 8. The pending lists and the case-file checks (your step 5)

**Both pending lists** have cases 25, 26 and 29 to 32:
- `packages/fund/test/support/cases.ts`, which f04b empties
- `apps/fund/test/support/cases.ts`, which f04c empties

Today's engine and page skip them and keep passing.

**`packages/fund/test/cases.test.ts`** checks the case files with no engine code, the pending cases included:
- **Counts:**
  - twenty-eight runs and four sets of refusals
  - the three new input terms
  - LPs in 30 and 31 too
  - classes or later closes in 31 too
  - a schedule in 29 to 31
- **Each case's first call** includes the schedule's, so a close after `start` is a later close (F30).
- **An account's fee share** is checked against a schedule's first rate when there's no `fee_rate`.
- **The schedule's fee calls (new):**
  - one a calendar period from `start`'s to D's, in advance, the first dated `start`, none after D, the days covered running on without a gap
  - the call the LPs' part plus the GP commitment's, which is g of the call when it pays fees and absent without a GP commitment
  - each LP's fee its share of the LPs' part by fee weight
  - every amount to the cent from its exact value
  - the LPs' paid-in their investment calls plus the fee calls
- **Fees at the later closes (new):**
  - each joiner's back fees its own part of each fee call before its close, worked from the inputs for entered calls and from `fee_calls` for a schedule's
  - the LPs' paid-in with each fee call at its full size
- **The equalization:**
  - `back_fees` in every row, zero for LPs already in
  - the rate null when none is given
- **"Is the case it adds LPs to"** skips the schedule cases, which add no LPs to another case.

**The checks bite.** On a copy of the cases in my scratch folder, five planted errors each failed a test:
- a fee call dated off its period
- Dogwood's back fees one call short
- an LP's fee a cent off
- back fees on an LP already in
- case 25's paid-in back at 0.3.0's

**Three page tests changed, outside what the pending list reaches.** `chart.test.tsx` (the examples' breakpoints), `classesCard.test.ts` (the classes card, against each case's accounts) and `equalizationCard.test.ts` (the equalization card, against each case's rows) named case 25 or 26 directly and held the page to their `expected.json`. With those values now ahead of today's engine, they failed 10 tests. Each now leaves out the cases on the page's pending list, a one-line filter with a comment. When f04c empties the list they run 25 and 26 again. Nothing in `apps/fund/src` changed.

## 9. CI and permissions (hard rule 9)

- **Nothing in `.github/workflows/` or `.claude/` is in this PR.**
- **`cases-locked.yml`** fails this PR until you add the cases label, as for any case step.

## 10. Each case's key figures, to the cent

Every value is from the case's `expected.json`, to the cent, half away from zero (FC8). The exact values are in each `expected.json` and `DERIVATION.md`.

### Cases 25 and 26, beside 0.3.0

**fund-25-later-close:** Cedar owes $20,000 of back fees for the January 2021 fee call, which now counts at $100,000.

|  | 0.3.0 | Now |
|---|---:|---:|
| The LPs' paid-in | 7,040,000.00 | 7,060,000.00 |
| Each LP's paid-in: Alder, Birchwood, Cedar | 4,224,000.00 / 1,408,000.00 / 1,408,000.00 | 4,236,000.00 / 1,412,000.00 / 1,412,000.00 |
| The breakpoint, capital back | 5,183,673.47 | 5,204,081.63 |
| At X = 5,200,000: LPs / GP | 5,092,800.00 / 3,200.00 | 5,096,000.00 / 0.00 |
| At X = 20,000,000: LPs / GP | 16,696,000.00 / 2,904,000.00 | 16,700,000.00 / 2,900,000.00 |
| Alder Endowment: capital got back | 600,000.00 | 588,000.00 |
| Alder Endowment: interest received | 23,802.74 | 23,326.68 |
| Alder Endowment: back fees | — | 0.00 |
| Birchwood Family Office: capital got back | 200,000.00 | 196,000.00 |
| Birchwood Family Office: interest received | 7,934.25 | 7,775.56 |
| Birchwood Family Office: back fees | — | 0.00 |
| Cedar Holdings: capital paid in | 800,000.00 | 784,000.00 |
| Cedar Holdings: interest paid | 31,736.99 | 31,102.25 |
| Cedar Holdings: back fees | — | 20,000.00 |

**fund-26-closes-and-classes:** Birchwood owes $50,000 of back fees for the January 2022 fee call, which now counts at $150,000. Cedar, in a class paying no fees, owes none, and the second close is unchanged.

|  | 0.3.0 | Now |
|---|---:|---:|
| The LPs' paid-in | 5,250,000.00 | 5,300,000.00 |
| Fund terms' paid-in | 4,000,000.00 | 4,050,000.00 |
| Each LP's paid-in: Alder, Birchwood, Cedar | 2,666,666.67 / 1,333,333.33 / 1,250,000.00 | 2,700,000.00 / 1,350,000.00 / 1,250,000.00 |
| Fund terms' capital back | 5,333,333.33 | 5,400,000.00 |
| At X = 12,000,000: LPs / GP | 11,000,000.00 / 1,000,000.00 | 11,010,000.00 / 990,000.00 |
| Alder Endowment: capital got back | 1,533,333.33 | 1,500,000.00 |
| Alder Endowment: interest received | 32,876.71 | 32,383.56 |
| Alder Endowment: back fees | — | 0.00 |
| Birchwood Family Office: capital paid in | 700,000.00 | 666,666.67 |
| Birchwood Family Office: interest paid | 10,356.16 | 9,863.01 |
| Birchwood Family Office: back fees | — | 50,000.00 |
| Cedar Holdings: back fees | — | 0.00 |

**Their breakpoints now:**

| X | Exact | Reason |
|---:|---|---|
| 5,204,081.63 | 255000000/49 | `capital_returned`: LPs have their $7,060,000 of paid-in capital back |

| X | Exact | Reason |
|---:|---|---|
| 5,000,000.00 | 5000000 | `capital_returned`: Friends and family: LPs have their $1,250,000 of paid-in capital back |
| 5,400,000.00 | 5400000 | `capital_returned`: Fund terms: LPs have their $4,050,000 of paid-in capital back |

**Their equalization now:**

| Close | LP | Capital paid in | Capital got back | Interest paid | Interest received | Back fees |
|---|---|---:|---:|---:|---:|---:|
| 2021-07-15 | Alder Endowment | 0.00 | 588,000.00 | 0.00 | 23,326.68 | 0.00 |
| 2021-07-15 | Birchwood Family Office | 0.00 | 196,000.00 | 0.00 | 7,775.56 | 0.00 |
| 2021-07-15 | Cedar Holdings (joins) | 784,000.00 | 0.00 | 31,102.25 | 0.00 | 20,000.00 |

| Close | LP | Capital paid in | Capital got back | Interest paid | Interest received | Back fees |
|---|---|---:|---:|---:|---:|---:|
| 2022-04-01 | Alder Endowment | 0.00 | 666,666.67 | 0.00 | 9,863.01 | 0.00 |
| 2022-04-01 | Birchwood Family Office (joins) | 666,666.67 | 0.00 | 9,863.01 | 0.00 | 50,000.00 |
| 2022-10-01 | Alder Endowment | 0.00 | 833,333.33 | 0.00 | 22,520.55 | 0.00 |
| 2022-10-01 | Birchwood Family Office | 0.00 | 416,666.67 | 0.00 | 11,260.27 | 0.00 |
| 2022-10-01 | Cedar Holdings (joins) | 1,250,000.00 | 0.00 | 33,780.82 | 0.00 | 0.00 |
| **All** | Alder Endowment | 0.00 | 1,500,000.00 | 0.00 | 32,383.56 | 0.00 |
| **All** | Birchwood Family Office | 666,666.67 | 416,666.67 | 9,863.01 | 11,260.27 | 50,000.00 |
| **All** | Cedar Holdings | 1,250,000.00 | 0.00 | 33,780.82 | 0.00 | 0.00 |

### fund-29-fee-schedule

No listed LPs, $40,000,000 of commitments, 2% quarterly from 2021-02-15 and 1.5% from 2026-02-15; a 1% GP commitment, fee-free; an 8% pref with a full catch-up. LPs' paid-in $33,925,000.00, the GP commitment's $300,000.00, the pref accrued to D $9,062,634.52.

**Every fee call.** No listed LPs, so no LP's fee; the GP commitment is fee-free, so its part of each is $0.

| Date | Covers | Call | LPs' part | GP commitment |
|---|---|---:|---:|---:|
| 2021-02-15 | 2021-02-15 to 2021-03-31 | 100,000.00 | 100,000.00 | 0.00 |
| 2021-04-01 | 2021-04-01 to 2021-06-30 | 200,000.00 | 200,000.00 | 0.00 |
| 2021-07-01 | 2021-07-01 to 2021-09-30 | 200,000.00 | 200,000.00 | 0.00 |
| 2021-10-01 | 2021-10-01 to 2021-12-31 | 200,000.00 | 200,000.00 | 0.00 |
| 2022-01-01 | 2022-01-01 to 2022-03-31 | 200,000.00 | 200,000.00 | 0.00 |
| 2022-04-01 | 2022-04-01 to 2022-06-30 | 200,000.00 | 200,000.00 | 0.00 |
| 2022-07-01 | 2022-07-01 to 2022-09-30 | 200,000.00 | 200,000.00 | 0.00 |
| 2022-10-01 | 2022-10-01 to 2022-12-31 | 200,000.00 | 200,000.00 | 0.00 |
| 2023-01-01 | 2023-01-01 to 2023-03-31 | 200,000.00 | 200,000.00 | 0.00 |
| 2023-04-01 | 2023-04-01 to 2023-06-30 | 200,000.00 | 200,000.00 | 0.00 |
| 2023-07-01 | 2023-07-01 to 2023-09-30 | 200,000.00 | 200,000.00 | 0.00 |
| 2023-10-01 | 2023-10-01 to 2023-12-31 | 200,000.00 | 200,000.00 | 0.00 |
| 2024-01-01 | 2024-01-01 to 2024-03-31 | 200,000.00 | 200,000.00 | 0.00 |
| 2024-04-01 | 2024-04-01 to 2024-06-30 | 200,000.00 | 200,000.00 | 0.00 |
| 2024-07-01 | 2024-07-01 to 2024-09-30 | 200,000.00 | 200,000.00 | 0.00 |
| 2024-10-01 | 2024-10-01 to 2024-12-31 | 200,000.00 | 200,000.00 | 0.00 |
| 2025-01-01 | 2025-01-01 to 2025-03-31 | 200,000.00 | 200,000.00 | 0.00 |
| 2025-04-01 | 2025-04-01 to 2025-06-30 | 200,000.00 | 200,000.00 | 0.00 |
| 2025-07-01 | 2025-07-01 to 2025-09-30 | 200,000.00 | 200,000.00 | 0.00 |
| 2025-10-01 | 2025-10-01 to 2025-12-31 | 200,000.00 | 200,000.00 | 0.00 |
| 2026-01-01 | 2026-01-01 to 2026-03-31 | 175,000.00 | 175,000.00 | 0.00 |
| 2026-04-01 | 2026-04-01 to 2026-06-30 | 150,000.00 | 150,000.00 | 0.00 |
| **All** | 22 calls | **4,225,000.00** | **4,225,000.00** | 0.00 |

**Breakpoints:**

| X | Exact | Reason |
|---:|---|---|
| 10,267,676.77 | 1016500000/99 | `capital_returned`: LPs have their $33,925,000 of paid-in capital back |
| 19,421,853.05 | 15595748000/803 | `pref_met`: LPs have their 8% pref, $9,062,634.52 |
| 21,710,397.12 | 156901040000/7227 | `catch_up_done`: the GP has 20% of the profit |

**Each point:**

| X | Tags | GP commitment | LPs | GP | LPs to date | GP to date |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 23,760,000.00 | 0.00 |
| 10,000,000.00 | listed | 100,000.00 | 9,900,000.00 | 0.00 | 33,660,000.00 | 0.00 |
| 10,267,676.77 | breakpoint | 102,676.77 | 10,165,000.00 | 0.00 | 33,925,000.00 | 0.00 |
| 19,421,853.05 | breakpoint | 194,218.53 | 19,227,634.52 | 0.00 | 42,987,634.52 | 0.00 |
| 20,000,000.00 | listed | 200,000.00 | 19,227,634.52 | 572,365.48 | 42,987,634.52 | 572,365.48 |
| 21,710,397.12 | breakpoint | 217,103.97 | 19,227,634.52 | 2,265,658.63 | 42,987,634.52 | 2,265,658.63 |
| 30,000,000.00 | listed | 300,000.00 | 25,793,000.00 | 3,907,000.00 | 49,553,000.00 | 3,907,000.00 |

### fund-30-fee-step-down

Alder Endowment ($15,000,000) and Birchwood Family Office ($10,000,000); half-yearly fees, 2% stepping to 1.5% on 2022-03-01; a 2% GP commitment that pays fees; an 8% pref with a full catch-up; final. LPs' paid-in $20,472,872.93, the GP commitment's $417,813.73, the pref accrued to D $4,800,246.45, and on the fund's totals $4,740,493.02.

**Every fee call:**

| Date | Covers | Call | LPs' part | GP commitment | Alder | Birchwood |
|---|---|---:|---:|---:|---:|---:|
| 2020-07-01 | 2020-07-01 to 2020-12-31 | 255,102.04 | 250,000.00 | 5,102.04 | 150,000.00 | 100,000.00 |
| 2021-01-01 | 2021-01-01 to 2021-06-30 | 255,102.04 | 250,000.00 | 5,102.04 | 150,000.00 | 100,000.00 |
| 2021-07-01 | 2021-07-01 to 2021-12-31 | 255,102.04 | 250,000.00 | 5,102.04 | 150,000.00 | 100,000.00 |
| 2022-01-01 | 2022-01-01 to 2022-06-30 | 212,115.23 | 207,872.93 | 4,242.30 | 124,723.76 | 83,149.17 |
| 2022-07-01 | 2022-07-01 to 2022-12-31 | 191,326.53 | 187,500.00 | 3,826.53 | 112,500.00 | 75,000.00 |
| 2023-01-01 | 2023-01-01 to 2023-06-30 | 191,326.53 | 187,500.00 | 3,826.53 | 112,500.00 | 75,000.00 |
| 2023-07-01 | 2023-07-01 to 2023-12-31 | 191,326.53 | 187,500.00 | 3,826.53 | 112,500.00 | 75,000.00 |
| 2024-01-01 | 2024-01-01 to 2024-06-30 | 191,326.53 | 187,500.00 | 3,826.53 | 112,500.00 | 75,000.00 |
| 2024-07-01 | 2024-07-01 to 2024-12-31 | 191,326.53 | 187,500.00 | 3,826.53 | 112,500.00 | 75,000.00 |
| 2025-01-01 | 2025-01-01 to 2025-06-30 | 191,326.53 | 187,500.00 | 3,826.53 | 112,500.00 | 75,000.00 |
| 2025-07-01 | 2025-07-01 to 2025-12-31 | 191,326.53 | 187,500.00 | 3,826.53 | 112,500.00 | 75,000.00 |
| 2026-01-01 | 2026-01-01 to 2026-06-30 | 191,326.53 | 187,500.00 | 3,826.53 | 112,500.00 | 75,000.00 |
| 2026-07-01 | 2026-07-01 to 2026-12-31 | 191,326.53 | 187,500.00 | 3,826.53 | 112,500.00 | 75,000.00 |
| 2027-01-01 | 2027-01-01 to 2027-06-30 | 191,326.53 | 187,500.00 | 3,826.53 | 112,500.00 | 75,000.00 |
| **All** | 14 calls | **2,890,686.66** | **2,832,872.93** | 57,813.73 | 1,699,723.76 | 1,133,149.17 |

**Breakpoints:**

| X | Exact | Reason |
|---:|---|---|
| 765,306.12 | 37500000/49 | `capital_returned`: LPs have their $20,472,872.93 of paid-in capital back |
|  |  | `clawback_cleared`: from here the GP has earned all the carry it was paid earlier |
| 826,279.00 | 2955600000/3577 | `pref_met`: LPs have their 8% pref, $4,800,246.45 |
| 841,522.23 | 3010125000/3577 | `catch_up_done`: the GP has 20% of the profit |

**The clawback.**
- **At X = $0** the GP owes back $150,000.00: 20% of the $750,000 of fees called after the last distribution, which the run on the totals returns as capital first. Alder's share is $90,000.00 and Birchwood's $60,000.00.
- **At X = $500,000** it owes $52,000.00, $31,200.00 and $20,800.00.
- **From $765,306.12,** where X's capital is back, nothing is owed.

| X | Tags | Carry paid | Entitlement | Owed | Alder's share | Birchwood's share |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 2,327,425.41 | 2,177,425.41 | 150,000.00 | 90,000.00 | 60,000.00 |
| 500,000.00 | listed | 2,327,425.41 | 2,275,425.41 | 52,000.00 | 31,200.00 | 20,800.00 |
| 765,306.12 | breakpoint | 2,327,425.41 | 2,327,425.41 | 0.00 | 0.00 | 0.00 |
| 826,279.00 | breakpoint | 2,327,425.41 | 2,339,376.10 | 0.00 | 0.00 | 0.00 |
| 841,522.23 | breakpoint | 2,342,363.77 | 2,342,363.77 | 0.00 | 0.00 | 0.00 |
| 1,000,000.00 | listed | 2,373,425.41 | 2,373,425.41 | 0.00 | 0.00 | 0.00 |
| 10,000,000.00 | listed | 4,137,425.41 | 4,137,425.41 | 0.00 | 0.00 | 0.00 |

**Each point:**

| X | Tags | GP commitment | LPs | GP | LPs to date | GP to date |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 29,032,574.59 | 2,327,425.41 |
| 500,000.00 | listed | 10,000.00 | 490,000.00 | 0.00 | 29,522,574.59 | 2,327,425.41 |
| 765,306.12 | breakpoint | 15,306.12 | 750,000.00 | 0.00 | 29,782,574.59 | 2,327,425.41 |
| 826,279.00 | breakpoint | 16,525.58 | 809,753.42 | 0.00 | 29,842,328.01 | 2,327,425.41 |
| 841,522.23 | breakpoint | 16,830.44 | 809,753.42 | 14,938.36 | 29,842,328.01 | 2,342,363.77 |
| 1,000,000.00 | listed | 20,000.00 | 934,000.00 | 46,000.00 | 29,966,574.59 | 2,373,425.41 |
| 10,000,000.00 | listed | 200,000.00 | 7,990,000.00 | 1,810,000.00 | 37,022,574.59 | 4,137,425.41 |

**Each LP:**

| LP | Class | Close | Share | Paid in | From X at 0.00 | To date at 0.00 | From X at 10,000,000.00 | To date at 10,000,000.00 |
|---|---|---|---:|---:|---:|---:|---:|---:|
| Alder Endowment |  |  | 0.6 | 12,283,723.76 | 0.00 | 17,419,544.75 | 4,794,000.00 | 22,213,544.75 |
| Birchwood Family Office |  |  | 0.4 | 8,189,149.17 | 0.00 | 11,613,029.83 | 3,196,000.00 | 14,809,029.83 |

### fund-31-fee-schedule-classes-closes

Quarterly fees at 2% from 2022-01-01. Alder Endowment ($10,000,000) on the fund's terms. Cedar Holdings ($2,000,000) in Friends and family, at no fee and no carry. Dogwood Pension ($8,000,000) in Anchor, at a 1% fee and 15% carry, joining on 2022-08-15. An 8% equalization rate.

**Every fee call.** Alder pays the rate on its commitment and Dogwood half of it; Cedar pays none. There's no GP commitment.

| Date | Covers | Call | LPs' part | GP commitment | Alder | Cedar | Dogwood |
|---|---|---:|---:|---:|---:|---:|---:|
| 2022-01-01 | 2022-01-01 to 2022-03-31 | 70,000.00 | 70,000.00 | none | 50,000.00 | 0.00 | 20,000.00 |
| 2022-04-01 | 2022-04-01 to 2022-06-30 | 70,000.00 | 70,000.00 | none | 50,000.00 | 0.00 | 20,000.00 |
| 2022-07-01 | 2022-07-01 to 2022-09-30 | 70,000.00 | 70,000.00 | none | 50,000.00 | 0.00 | 20,000.00 |
| 2022-10-01 | 2022-10-01 to 2022-12-31 | 70,000.00 | 70,000.00 | none | 50,000.00 | 0.00 | 20,000.00 |
| 2023-01-01 | 2023-01-01 to 2023-03-31 | 70,000.00 | 70,000.00 | none | 50,000.00 | 0.00 | 20,000.00 |
| 2023-04-01 | 2023-04-01 to 2023-06-30 | 70,000.00 | 70,000.00 | none | 50,000.00 | 0.00 | 20,000.00 |
| 2023-07-01 | 2023-07-01 to 2023-09-30 | 70,000.00 | 70,000.00 | none | 50,000.00 | 0.00 | 20,000.00 |
| 2023-10-01 | 2023-10-01 to 2023-12-31 | 70,000.00 | 70,000.00 | none | 50,000.00 | 0.00 | 20,000.00 |
| 2024-01-01 | 2024-01-01 to 2024-03-31 | 70,000.00 | 70,000.00 | none | 50,000.00 | 0.00 | 20,000.00 |
| 2024-04-01 | 2024-04-01 to 2024-06-30 | 70,000.00 | 70,000.00 | none | 50,000.00 | 0.00 | 20,000.00 |
| 2024-07-01 | 2024-07-01 to 2024-09-30 | 70,000.00 | 70,000.00 | none | 50,000.00 | 0.00 | 20,000.00 |
| 2024-10-01 | 2024-10-01 to 2024-12-31 | 70,000.00 | 70,000.00 | none | 50,000.00 | 0.00 | 20,000.00 |
| 2025-01-01 | 2025-01-01 to 2025-03-31 | 70,000.00 | 70,000.00 | none | 50,000.00 | 0.00 | 20,000.00 |
| 2025-04-01 | 2025-04-01 to 2025-06-30 | 70,000.00 | 70,000.00 | none | 50,000.00 | 0.00 | 20,000.00 |
| 2025-07-01 | 2025-07-01 to 2025-09-30 | 70,000.00 | 70,000.00 | none | 50,000.00 | 0.00 | 20,000.00 |
| 2025-10-01 | 2025-10-01 to 2025-12-31 | 70,000.00 | 70,000.00 | none | 50,000.00 | 0.00 | 20,000.00 |
| **All** | 16 calls | **1,120,000.00** | **1,120,000.00** | none | 800,000.00 | 0.00 | 320,000.00 |

**The accounts:**

| Account | Commitment | Share | Share of fee calls | Paid in |
|---|---:|---:|---:|---:|
| Fund terms | 10,000,000 | 0.5 | 5/7 | 5,800,000.00 |
| Anchor | 8,000,000 | 0.4 | 2/7 | 4,320,000.00 |
| Friends and family | 2,000,000 | 0.1 | 0 | 1,000,000.00 |


**Breakpoints:**

| X | Exact | Reason |
|---:|---|---|
| 5,000,000.00 | 5000000 | `capital_returned`: Friends and family: LPs have their $1,000,000 of paid-in capital back |
| 5,800,000.00 | 5800000 | `capital_returned`: Anchor: LPs have their $4,320,000 of paid-in capital back |
| 6,600,000.00 | 6600000 | `capital_returned`: Fund terms: LPs have their $5,800,000 of paid-in capital back |

**Each point:**

| X | Tags | GP commitment | LPs | GP | LPs to date | GP to date |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed |  | 0.00 | 0.00 | 5,000,000.00 | 0.00 |
| 5,000,000.00 | listed, breakpoint |  | 5,000,000.00 | 0.00 | 10,000,000.00 | 0.00 |
| 5,800,000.00 | listed, breakpoint |  | 5,800,000.00 | 0.00 | 10,800,000.00 | 0.00 |
| 6,600,000.00 | listed, breakpoint |  | 6,552,000.00 | 48,000.00 | 11,552,000.00 | 48,000.00 |
| 10,000,000.00 | listed |  | 9,408,000.00 | 592,000.00 | 14,408,000.00 | 592,000.00 |

**Each LP:**

| LP | Class | Close | Share | Paid in | From X at 6,600,000.00 | To date at 6,600,000.00 | From X at 10,000,000.00 | To date at 10,000,000.00 |
|---|---|---|---:|---:|---:|---:|---:|---:|
| Alder Endowment |  |  | 0.5 | 5,800,000.00 | 3,300,000.00 | 5,800,000.00 | 4,660,000.00 | 7,160,000.00 |
| Cedar Holdings | Friends and family |  | 0.1 | 1,000,000.00 | 660,000.00 | 1,160,000.00 | 1,000,000.00 | 1,500,000.00 |
| Dogwood Pension | Anchor | 2022-08-15 | 0.4 | 4,320,000.00 | 2,592,000.00 | 4,592,000.00 | 3,748,000.00 | 5,748,000.00 |

**Equalization:** Dogwood pays in its $1,600,000 share of the 2022-02-01 investment call, with 195 days of 8% interest, to Alder and Cedar. Beside that it pays $60,000 of back fees to the manager: its own $20,000 of each of the three quarters before its close, the third though it joins halfway through it.

| Close | LP | Capital paid in | Capital got back | Interest paid | Interest received | Back fees |
|---|---|---:|---:|---:|---:|---:|
| 2022-08-15 | Alder Endowment | 0.00 | 1,333,333.33 | 0.00 | 56,986.30 | 0.00 |
| 2022-08-15 | Cedar Holdings | 0.00 | 266,666.67 | 0.00 | 11,397.26 | 0.00 |
| 2022-08-15 | Dogwood Pension (joins) | 1,600,000.00 | 0.00 | 68,383.56 | 0.00 | 60,000.00 |

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   I got:
   - **The fund package:** 1,101 tests, 1,048 before. 1,092 pass, and 9 are skipped by design: "is the case it adds LPs to" applies only to cases 17 to 20, and "each LP's own fee" to a schedule with listed LPs, which case 29 hasn't. The engine's case tests skip the six pending folders; `cases.test.ts` checks them.
   - **The fund page:** 475 tests, 496 before. The pending cases' tests are skipped, and `pending.test.ts` has four more folders.
   - **Unchanged:** the engine's 3,177 and the main page's 680.
   - **The fund reference:** 91 unit tests, 64 before, and all 32 fund case folders matching it.
   - **Spillpoint's reference:** its 73 unit tests and its cases.
2. **Case 31's equalization, from the reference:**

   ```bash
   python3 -c '
   import json, sys; sys.path.insert(0, "packages/fund/reference")
   from fund_ref.case import run_case
   eq = run_case(json.load(open("packages/fund/cases/fund-31-fee-schedule-classes-closes/inputs.json")))["equalization"]
   for m in eq["lps"]: print(m["name"], *(m[k]["amount"] for k in ("capital_paid", "capital_returned", "interest_paid", "interest_received", "back_fees")))'
   ```

   It prints the three rows above: Dogwood Pension 1600000.00 0.00 68383.56 0.00 60000.00, and so on.
3. **Case 29's fee calls, from the reference:**

   ```bash
   python3 -c '
   import json, sys; sys.path.insert(0, "packages/fund/reference")
   from fund_ref.inputs import read
   f = read(json.load(open("packages/fund/cases/fund-29-fee-schedule/inputs.json"))["fund"])
   calls = [c for c in f.flows if c.scheduled]
   print(len(calls), sum(c.amount for c in calls), [(str(c.date), str(c.amount)) for c in calls[-3:]])'
   ```

   It prints 22 calls, 4225000, and the last three: 200000, 175000 and 150000.
4. **The refusals:** apply any fixture in `fund-32-fees-refused/fixtures/` to its base case's `inputs.json` and run it through `fund_ref.inputs.read`. Each is refused with the kind, term and path `cases-fees.json` gives.
5. **Nothing outside the step moved:**

   ```bash
   git diff --stat main -- packages/engine packages/fund/src apps/fund/src apps/dashboard cases reference .github
   ```

   It prints nothing. `git diff --stat main -- packages/fund/cases` lists only 25's and 26's `expected.json` and `DERIVATION.md`, and the four new folders.
6. **Have cases 25, 26 and 29 to 32 re-derived** independently, from `SPEC.md` and each case's `inputs.json`, before you add the cases label.

## Assumptions added

- **F29 to F32:** Settled (S3; Jordan), F30's defaults Claude's. F25 and F28 amended by F29 and F32.
- **FA39 to FA46 (New):**
  - the schedule and D
  - a period with nothing to call
  - null in the schedule
  - a schedule's call among the cash flows
  - an entered fee call's parts
  - when a fee call is before a close
  - the equalization without a rate
  - a schedule's later rates
- **FA21, FA26 and FA30:** a sentence each for 0.4.0.
- **FC13 and FC14 (New):** fees in `expected.json`, and the fees' refusals.
- **FC2:** names the fourth refusal set.

## Open questions

1. **FC13's shape.** It's what f04b's engine will be held to once the cases are locked:
   - `fee_calls` at the top, each call with its days, its parts and each LP's fee as `{amount, exact}`
   - `back_fees` in every equalization row
   - a null `rate` when none is given

   Fine, or would you rather any of it be shaped differently?
2. **FA40: every listed LP paying no fees, under a schedule.** F30 says a period where every LP's fee is 0 isn't a call. I decide that from the schedule alone (every day at a rate of 0), because stage 3 counts the schedule's calls before the LPs are read. So a fund whose LPs are all in a no-fee class keeps its calls at $0 each. The other choice is to refuse such a fund. No case has it. Which?
3. **FA39: a schedule that starts after D** calls nothing to D, and isn't refused. Fine, or refuse it?
4. **Cases 25 and 26's descriptions.** Their `inputs.json` is unchanged, as you said, but each `description` describes 0.3.0's rebalancing:
   - **25:** "pays in its share of the LPs' part of the earlier calls with 8% equalization interest"
   - **26:** "fee calls only among the LPs paying fees"

   Your `about` lines in `cases-fees.json` say what F29 does. Should I replace each description with yours while the lock is lifted?
5. **FA46: a later fee rate above the one before** (a step-up) is allowed, since F32 orders steps by date only. Fine, or refuse it?
6. **FA45: an equalization with no rate given** writes `rate: null` and works no interest. Fine?
