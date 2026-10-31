# Review: f06a (fees on invested capital: spec, reference and cases)

Branch `f06a-fund-invested-capital-spec-and-cases`, from main after #131. The first step of spillpoint-fund 0.6.0:
- **F38:** net invested capital, the cost of the investments still held, net of exits and write-offs.
- **F39:** a fee schedule step on it, worked out day by day. It amends F30.
- **F40:** the outputs and refusals. It amends F32.

No engine or page code.

**Nothing in the engine, the fund's source, the page's source, the main page, `cases/`, `reference/`, `.github/` or `.claude/` changed:** `git diff --stat main HEAD -- packages/engine packages/fund/src apps/fund/src apps/dashboard cases reference .github .claude` prints nothing.
- **Under `apps/`,** only the page's pending list, `apps/fund/test/support/cases.ts`.
- **`packages/fund/cases`:** four new folders, fund-38 to fund-41. In fund-32, only `fixtures/fee-step-basis.json`'s `about`, that fixture's entry in `expected.json`, and, in the fix-up (§10), its row in `DERIVATION.md`. Nothing else in fund-01 to fund-37 changed.

`.claude/settings.json` isn't committed: the fund cases' lock is lifted only on your machine.

**The reference and my hand work never disagreed, and no case contradicts the spec.**
- **The three run cases:** each `expected.json` rebuilt from my hand working comes out byte for byte the reference's.
- **All 15 refusals** are the kind, term and path `cases-inv.json` gives, and so is fund-32's moved fixture.
- **Every figure in your spec's case notes comes out of both:**
  - case 38's $44,550, $48,303.30, $44,388.59, $37,125, $32,107.01 and $25,987.50, $232,461.39 against $450,000, $1,432,461.39 of fees, and carry from X = $5,446,930.70 with $15,292,461.39 of paid-in back
  - case 39's 98% × 13/20, breakpoints at $5,000,000, $5,279,539.50 and $5,559,079.01, and Birch's $30,000 of back fees
  - case 40's $32,000, $40,000 and $19,781.42, no call for 2025, and $781,643.72 of carry

| Commit | What |
|---|---|
| `aa69f4f` | `SPEC.md` and `ASSUMPTIONS.md`: F38 to F40, F28, F30 and F32 amended, FA40 widened, FA63 to FA66, FC13 and FC14 amended, FC17 (§1, §2, §3) |
| `2c1b99e` | the reference: each step's basis, net invested capital, the fee calls day by day, 11 more unit tests (§4) |
| `aa88da1` | the cases: 38 to 40, the 15 refusals, and fund-32's moved fixture (§5, §6) |
| `52a7d4c` | the pending lists, a pending fixture, and the case-file checks (§7) |
| `fc59925` | `CLAUDE.md` names the 0.6.0 steps and F1 to F40 |
| `1bcd995` | FA66: why counting a period wholly at a rate of 0 couldn't change the checks that count calls |
| `934f616` | this note |
| the next commit | the fix-up: fund-32's derivation row, FC14, and §10 of this note |

## 1. The spec (`packages/fund/docs/SPEC.md`)

- **The header and "What it answers":** F38 to F40 (S5), and your two bullets.
- **Inputs:** a "From 0.6.0" block with your example and the three bullets. The 0.4.0 block's `steps` and `commitments` each gain a sentence pointing to F39 and F40.
- **F28's order of checks** (it's the one F32 and F37 point to):
  - stage 1 names a step's keys as `rate`, `from` and `basis`
  - stage 2 checks a step's shape, rate, basis, then `from`, and, after `distribution_from`, a step on invested capital without investments
  - stage 3 counts the schedule's calls by their dates
  - stage 5 asks for `commitments` only with a step on commitments
- **F30, amended:**
  - a line pointing to F39 for a step on invested capital
  - a period with nothing to call widened
  - the periods counting by date for `no_calls`, `distribution_before_call` and the first call
  - its Later line now points to F39's
- **F32, amended:** a step's keys are `rate`, `from` and `basis`, and the example of an unsupported step key is `offset` alone. `commitments` is missing without LPs only with a step on commitments.
- **F38 to F40:** after F37, with your "Why" paragraph, each rule as your spec words it, and your Later line.
  - F39 carries your nine defaults as "Defaults (Claude's, settled with the spec)", as F30 carries 0.4.0's.
  - F39 also opens with the step's `basis`, so the rule says what it's a rule about.
  - F40 carries your order of checks.
- **Cases 38 to 41** in the list, which is now "Thirty-five cases and six sets of refusals". Case 32's entry gains a sentence on the moved fixture.
- **Decided:** your 2026-10-30 decisions, and Claude's defaults as one line.

## 2. The assumptions (`packages/fund/docs/ASSUMPTIONS.md`)

- **F38 to F40:** a table of their own, Settled (S5). F30's and F32's rows say they're amended by F39 and F40.
- **FA40:** widened by F39, pointing to FA66.
- **"Later":** F30's line is now F30's and F39's together: your F39 Later line, which had all of F30's but invested capital.
- **FC2:** names the sixth refusal set.

**Every decision I made (FA63 to FA66, all New):**

| ID | What I decided |
|---|---|
| FA63 | A step's `basis` of null is the default, commitments. The word is compared exactly, as `frequency` is (FA41): "Invested_Capital", "invested_capital " and "Commitments" are `bad_field`. It's checked on every step, the first included, so a bad basis on the first step comes before a `from` given there. A step named on commitments is exactly the default: cases 29, 30, 31 and 36 with `"basis": "commitments"` on every step, or null, give every amount byte for byte as without. |
| FA64 | "A step on invested capital" and "a step on commitments" are any step, whatever its date, one after D included, as F32 reads every step's fields. So a step on invested capital from 2030 still needs investments today, and one on commitments from 2030 still needs `commitments` without listed LPs. `commitments` given to a fund wholly on invested capital without LPs is checked (`bad_number`) and unused (FA26). Open question 2. |
| FA65 | The arithmetic, exact. A day's net invested capital is after every event of that date. A day after D counts at D's, since nothing after D can move it, and X is never in it. A period's fee is each day's rate times that day's figure, added up, over n × the period's days, so it's rarely whole cents: case 38's Q2 2023 is 4395600/91. With a GP commitment that pays fees, the call is the LPs' fee over 1 − g, as F30 has it. So on invested capital the GP commitment pays the rate on its share g of net invested capital times the LPs' fee weights over their commitments: case 39's 13/20 (open question 4). |
| FA66 | The schedule's periods by date are those with a day at a rate above 0, on either basis: FA40's test, from the schedule alone, as 0.4.0 counts them. Your "every period" would also take in a period wholly at 0, but that can't change anything: these checks look only at the first call, and the first period always covers `start` at a rate above 0. They count for `no_calls`, `distribution_before_call` and the fund's first call (F25). Once the investments are read, a period with nothing to call is left out, so the first call can be a period with nothing called: an LP closing after `start` joins at a later close, and owes back fees only for periods with a call. No case has that; a reference unit test does. Open question 3. |

## 3. The case files (FC13, FC14, FC17)

**No new shape.** The fee calls on invested capital are FC13's, as F40 says, and nothing else in `expected.json` changes: each step's basis is in the input, so it isn't repeated.
- **FC13, widened:** a period with nothing to call isn't listed, so the calls can skip a period, as case 40's 2025 is skipped.
- **FC14, amended:** fund-32's `fee-step-basis` is now refused as `missing_field` at `investments`. Its expectation and its `about` moved in f06a, at your instruction, and its derivation row in the fix-up (§10); nothing else.
- **FC17 (new):** fund-41 in FC7's shape, each fixture naming its base. Case 38 for most of them; case 40 for the first step's basis and an empty list; case 39 for the LPs' checks. The changes and refusals are yours; each `about` sentence is mine.

## 4. The reference (`packages/fund/reference`)

Written from `SPEC.md`. Nothing in the engine or its tests is imported, and the reference imports nothing new.
- **`inputs.py`:**
  - a step's `basis`, after its rate and before its `from`, null the default
  - a step on invested capital without investments refused at the end of stage 2
  - `commitments` needed without listed LPs only with a step on commitments
  - once the investments are read, each period on invested capital worked out and any period with nothing to call dropped, its date kept as the fund's first call
- **`deals.py`:** the walk over checks, write-offs and distributions now records the net invested capital after each event (F38), and `invested_on(fund, day)` reads it.
- **`fees.py`:**
  - A period keeps its days on commitments as its fee factor, 0.5.0's exactly, and its days on invested capital apart, in runs of one rate.
  - `invested()` adds the invested-capital days up day by day, each its rate times that day's figure, over n × the period's days.
  - An LP's fee is its fee weight times the period's fee on each unit of fee weight. Without LPs, the LPs' fee is `commitments` times the fee factor plus (1 − g) of the invested part.
- **`case.py`:** the fee calls as before.
- **With no step on invested capital nothing changes:** `generate.py --check` matches all 37 earlier folders, and fund-32 differs only in the moved fixture.

**A speed note.** The breakpoint search copies the fund at every point it tries. With a list of every invested-capital day on each period, the random funds took 100 seconds; with runs of days, 17. The fees are still added up day by day.

**The unit tests:** 125, 114 before.
- **`InvestedCapital` (6), on numbers small enough to check on paper:**
  - net invested capital on 14 days through a follow-on and a half sale on one date, a full exit, an escrow release, a distribution naming no investment, and a write-off
  - that year's fee, 4678/365
  - a switch to invested capital inside a quarter, with a GP commitment fee-free and paying fees
  - three LPs by fee weight over commitment: 11.76, 1.96 and 0, a call of 14
  - a year with nothing invested and the first call by date (FA66)
  - D's quarter at D's figure, final or not
- **`InvestedCapitalRefusals` (4):** a step's basis (FA63); investments needed whatever the step's date, and the stage they're checked in (FA64); `commitments` only with a step on commitments, and still the LPs' total; the periods by date in stage 3.
- **24 random funds with investments and a schedule on invested capital,** from the start or switching inside the fund's life, a third with classes and closes:
  - every account's breakpoints found, and no account's clawback rising
  - every fee call above $0, and the first call the schedule's first period by date
  - what the waterfall counts as the LPs' fees, what each LP in at each call owes plus every joiner's back fees
  - deal by deal, the GP keeping at most the whole fund's entitlement
- **One 0.4.0 test** used `basis` as its example of an unsupported step key; it now uses `waiver`.

## 5. The cases (`packages/fund/cases`, your step 3)

- **fund-38 to fund-40:**
  - `inputs.json` written by a script from `cases-inv.json`, `about` as `description`
  - `expected.json` from the reference
  - a `DERIVATION.md` worked by hand
- **fund-41-invested-capital-refused:** your 15 changes as fixtures, `expected.json` from the reference, and a derivation of each refusal with the stage that decides it. It also explains fund-32's moved fixture.
- **fund-32:** `fee-step-basis.json`'s `about` now reads "The second fee step on invested capital: read from 0.6.0 (F40), and refused, since case 29 lists no investments for it to charge." Its entry in `expected.json` moved from `unsupported`, `basis` to `input`, `missing_field`, `investments`. Since the fix-up, its row in `DERIVATION.md` gives the new refusal (§10).

**How the hand work was done and checked.** f05b's hand working, grown for invested capital, in my scratch folder, importing nothing from the reference. Its method differs from the reference's:
- **Net invested capital on a day** is each investment's own cost made less its cost realized by the end of that day, from its own history, added up. The reference uses one walk over the fund.
- **A period's days on invested capital** are cut into segments at every step date and every event date inside them, each segment its rate times its figure times its days. The reference adds every day.

**The whole `expected.json`, rebuilt from that working:** every key in order and every value, for the three run cases, and still for cases 25, 26, 29 to 31 and 33 to 36. Byte for byte the reference's.

**The comparison bites.** Eight errors planted in my working:

| Planted error | Cases it changes |
|---|---|
| each check, exit and write-off counting from the day after its date | 38 (49 values), 39 (385), 40 (26) |
| invested capital gross of exits and write-offs | 38 (53), 39 (405), 40 (33) |
| a segment not cut at an event inside it | 38 (49), 39 (385), 40 (26) |
| the GP commitment's part left in the base | 38 (61), 39 (415), and case 30 |
| the LPs paying on all their invested capital, not by fee weight over commitment | 39 (405) |
| a period with nothing to call kept as a $0 call | 40 (1) |
| X lowering the fee for D's period's days after D | 39 (314) |
| the first call counted only among periods with something to call | none |

No case has a first period with nothing to call, so the last one is pinned by the reference's unit test instead (`test_a_period_with_nothing_to_call_isnt_a_call_but_counts_by_its_date`).

**The derivations:**
- **Every table** is the hand working's, by script.
- **Every amount in the prose** is either worked in that script from the hand working's own figures, or was checked another way. A script pulled every amount from each derivation and listed the ones not in the hand working's case output or the inputs: 14 in case 38, 30 in case 39, 2 in case 40. Each is a sum, difference or product of figures already there, and I recomputed the less obvious ones separately, in fractions straight from the inputs. All match:
  - case 38's six quarters and the paid-in by Alder's exit
  - case 39's first half of 2023 split between commitments and invested capital, the fees to Ivy's sale by class, X's tier 1 ends, the split at $8,000,000 and the equalization interest
- **The refusals:** all 15 match `cases-inv.json`, kind, term and path, and the derivation's rows are built from it.

## 6. How the files got there

As in f03a to f05a, every file in `packages/fund/cases` was written by a script or copied in with `cp`, not by the Write tool:
- **`inputs.json`** for 38 to 40 and the 15 fixtures were written by a script from `cases-inv.json` into my scratch folder, then copied in with `cp`.
- **fund-32's fixture** was rewritten in my scratch folder with its new `about` and copied over with `cp`. The script first checked its `base` and `change` against `cases-inv.json`'s `moved` entry.
- **`expected.json`** for 32 and 38 to 41 was written by the reference, `generate.py`. The four new ones are byte for byte the copies I made in my scratch folder before.
- **The four `DERIVATION.md` files** were written in my scratch folder, checked there, and copied in with `cp`.
- **I didn't edit or commit `.claude/settings.json`.**
- **The planted errors** (§7) ran on a copy of the cases in my scratch folder. No case file was changed and put back.

Each derivation's sha256, the same in my scratch folder and the case folder:

| File | sha256 |
|---|---|
| `fund-38-fees-on-invested-capital/DERIVATION.md` | `bec4f1ad547a0f45863649a14b44180699baebbefa8925d0e2de98e44734632b` |
| `fund-39-invested-capital-deal-by-deal-classes/DERIVATION.md` | `0f0313ce9a37f2b5bb730f475811c1f0253f2bb3399b55f19e3b07cf95ce4ada` |
| `fund-40-spv-fees-on-invested-capital/DERIVATION.md` | `c0e8fa0d9a665c73975b818d5a2e086ba32f4b2010ff16874ddb2ed85cddd1f0` |
| `fund-41-invested-capital-refused/DERIVATION.md` | `770291f57442ed9e61fb7fd5607be7a1b9e8480e8a26a802f73b6006bfc10078` |

## 7. The pending lists and the case-file checks (your step 4)

**Both pending lists** have cases 38 to 41:
- `packages/fund/test/support/cases.ts`, which f06b empties
- `apps/fund/test/support/cases.ts`, which f06c empties

**The moved fund-32 fixture.** The lists name folders, and putting fund-32 on the engine's list would skip its other 36 fixtures too. So beside `PENDING` there's `PENDING_FIXTURES`, naming `fund-32-fees-refused/fixtures/fee-step-basis.json`:
- **`read.test.ts`** leaves it out of fund-32's refusals.
- **`pending.test.ts`** fails if the list names a fixture that doesn't exist, or one outside a set the engine runs.
- **`stable-names.test.ts`'s** check that every fixture is refused with a listed term needs no change. Today's engine refuses the fixture as unsupported `basis` at a path ending `.basis`, which that check accepts, and f06b's `missing_field` is a listed term.

f06b empties both lists. The page never runs refusal sets, so its list needs no fixture.

**`packages/fund/test/cases.test.ts`** checks the case files with no engine code, the pending cases included:
- **Counts and lists:** thirty-five runs and six refusal sets; LPs, classes, schedules, investments and deal by deal as the new cases have them; and steps on invested capital in 38 to 40 only, every basis one of the two words.
- **The fee calls (changed):** one for each calendar period from `start`'s to D's that has something to call, each above $0. Every period left out is checked to have nothing to call. Before, the check wanted no gaps.
- **The fee calls (new):** every schedule's fee call, on commitments or invested capital, worked again day by day from the inputs alone. That means net invested capital from each investment's checks and its write-offs' and distributions' realizations, then each day at its step's rate and basis. It runs on cases 29 to 31 and 36 too.
- **What's due deal by deal (fixed):** each account's fees are now its exact paid-in, from its LPs' `exact`, less its part of the investment calls. The check had used the paid-in rounded to the cent, which held only while fees came to whole cents. Case 39's don't.

**The checks bite.** On a copy of the cases in my scratch folder, eight planted errors each failed a test:
- case 38's Q2 2023 with Dogwood's check a day late
- case 38's 2024 quarters gross of the exit and the write-off
- case 38's Q1 2023 with the GP commitment's part in the base
- case 40 with 2025 listed as a $0 call
- case 40 with 2024's call left out
- case 39's second half of 2023 on all the LPs' invested capital, not 13/20 of it
- case 39's D's half-year with X's sale lowering it
- case 39's Anchor fees due on X a cent high

The new day-by-day check failed on every fee error.

## 8. CI and permissions (hard rule 9)

- **Nothing in `.github/workflows/` or `.claude/` is in this PR.**
- **`cases-locked.yml`** fails this PR until you add the cases label, as for any case step.

## 9. Each case's key figures, to the cent

### The fee calls on invested capital

Each call is to the cent on its own, and so is each part, so a row's parts can add up to a cent off the call. Case 39's first half of 2023 is 93,294.89 + 1,903.98 against 95,198.86, exactly 93,294.886 + 1,903.977 = 95,198.863.

**Case 38**, quarterly, no listed LPs, a 1% GP commitment fee-free. The twelve quarters before, on commitments, are $100,000 each.

| Call | Period | Days at each invested capital | Call | LPs' part | GP commitment's |
|---|---|---|---:|---:|---:|
| 2023-01-01 | 2023-01-01 to 2023-03-31 | 90 at 12,000,000 | 44,550.00 | 44,550.00 | 0.00 |
| 2023-04-01 | 2023-04-01 to 2023-06-30 | 45 at 12,000,000; 46 at 14,000,000 | 48,303.30 | 48,303.30 | 0.00 |
| 2023-07-01 | 2023-07-01 to 2023-09-30 | 45 at 14,000,000; 47 at 10,000,000 | 44,388.59 | 44,388.59 | 0.00 |
| 2023-10-01 | 2023-10-01 to 2023-12-31 | 92 at 10,000,000 | 37,125.00 | 37,125.00 | 0.00 |
| 2024-01-01 | 2024-01-01 to 2024-03-31 | 50 at 10,000,000; 41 at 7,000,000 | 32,107.01 | 32,107.01 | 0.00 |
| 2024-04-01 | 2024-04-01 to 2024-06-30 | 91 at 7,000,000 | 25,987.50 | 25,987.50 | 0.00 |

$232,461.39 in all, where 1.5% of commitments would be $450,000.

**Case 39**, half-yearly, a 2% GP commitment paying fees. The four half-years before, on commitments, are $130,000 of LPs' fees each, Alder $100,000 and Birch $30,000, a call of $132,653.06.

| Call | Period | Days at each invested capital | Call | LPs' part | GP commitment's | Alder Endowment | Birch Family Office | Cedar Holdings |
|---|---|---|---:|---:|---:|---:|---:|---:|
| 2023-01-01 | 2023-01-01 to 2023-06-30 | 90 on commitments; 44 at 11,000,000; 47 at 9,500,000 | 95,198.86 | 93,294.89 | 1,903.98 | 71,765.30 | 21,529.59 | 0.00 |
| 2023-07-01 | 2023-07-01 to 2023-12-31 | 184 at 9,500,000 | 54,031.25 | 52,950.63 | 1,080.63 | 40,731.25 | 12,219.38 | 0.00 |
| 2024-01-01 | 2024-01-01 to 2024-06-30 | 60 at 9,500,000; 122 at 6,500,000 | 42,593.75 | 41,741.88 | 851.88 | 32,109.13 | 9,632.74 | 0.00 |
| 2024-07-01 | 2024-07-01 to 2024-12-31 | 184 at 6,500,000 | 36,968.75 | 36,229.38 | 739.38 | 27,868.75 | 8,360.63 | 0.00 |

The first half of 2023 is $64,640.88 on commitments and $28,654.00 on invested capital. The second half of 2024 is D's, every day at $6,500,000, X's sale not in it.

**Case 40**, yearly, no GP commitment, no listed LPs. 2025 has nothing to call and isn't a call.

| Call | Period | Days at each invested capital | Call | LPs' part | GP commitment's |
|---|---|---|---:|---:|---:|
| 2022-01-01 | 2022-01-01 to 2022-12-31 | 292 at 2,000,000; 73 at 0 | 32,000.00 | 32,000.00 | none |
| 2023-01-01 | 2023-01-01 to 2023-12-31 | 365 at 2,000,000 | 40,000.00 | 40,000.00 | none |
| 2024-01-01 | 2024-01-01 to 2024-12-31 | 181 at 2,000,000; 185 at 0 | 19,781.42 | 19,781.42 | none |

### Paid-in, breakpoints and carry at each X

**Case 38:** LPs' paid-in $15,292,461.39 ($13,860,000 of investment calls and $1,432,461.39 of fees), the GP commitment's $140,000. One breakpoint, `capital_returned` at **$5,446,930.70** (376214056250/69069): "LPs have their $15,292,461.39 of paid-in capital back".

| X | Tags | X: LPs' capital | X: LPs | X: carry | Carry to date | Owed back |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 |  |
| 5,000,000.00 | listed | 4,950,000.00 | 4,950,000.00 | 0.00 | 0.00 |  |
| 5,446,930.70 | breakpoint | 5,392,461.39 | 5,392,461.39 | 0.00 | 0.00 |  |
| 12,000,000.00 | listed | 5,392,461.39 | 10,582,492.28 | 1,297,507.72 | 1,297,507.72 |  |
| 18,000,000.00 | nav | 5,392,461.39 | 15,334,492.28 | 2,485,507.72 | 2,485,507.72 | 0.00 |

**Case 39:** LPs' paid-in $11,524,216.76: $5,962,474.43 for the fund's terms, $3,405,742.33 for Anchor and $2,156,000 for friends and family. The GP commitment's is $235,188.10. Three `capital_returned` breakpoints, one an account, each naming its own due on X.

| X | Exact | Reason |
|---:|---|---|
| 5,000,000.00 | 5000000 | "Friends and family: LPs have their $1,274,000 back for the investments exited or written off, fees and expenses included" |
| 5,279,539.50 | 2060266378125/390236 | "Anchor: LPs have their $2,012,484.10 back for …" |
| 5,559,079.01 | 1084676378125/195118 | "Fund terms: LPs have their $3,523,280.35 back for …" |

| X | Tags | X: LPs' capital | X: LPs | X: carry | Carry to date | Owed back |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 1,049,988.75 |  |
| 5,000,000.00 | listed, breakpoint | 4,900,000.00 | 4,900,000.00 | 0.00 | 1,049,988.75 |  |
| 5,279,539.50 | breakpoint | 5,119,158.97 | 5,173,948.71 | 0.00 | 1,049,988.75 |  |
| 5,400,000.00 | listed | 5,178,184.61 | 5,286,687.69 | 5,312.31 | 1,055,301.06 |  |
| 5,559,079.01 | breakpoint | 5,256,133.33 | 5,435,569.74 | 12,327.69 | 1,062,316.44 |  |
| 8,000,000.00 | listed | 5,256,133.33 | 7,480,817.44 | 359,182.56 | 1,409,171.32 |  |
| 14,000,000.00 | nav | 9,970,585.64 | 13,205,044.99 | 514,955.01 | 1,564,943.76 | 0.00 |

**Case 40:** LPs' paid-in $2,091,781.42 ($2,000,000 and $91,781.42 of fees). No breakpoints: the exit returned all the paid-in, so every dollar of X is 80/20.

| X | Tags | X: LPs' capital | X: LPs | X: carry | Carry to date | Owed back |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 781,643.72 | 0.00 |
| 500,000.00 | listed | 0.00 | 400,000.00 | 100,000.00 | 881,643.72 | 0.00 |

### Case 39's dues by class

**At Ivy's half sale,** 2023-05-15: $1,500,000 of the $11,000,000 made is realized, 3/22. The fees to date are the five calls from 2021-01-01 to 2023-01-01.

| Account | Cost due | Fees to date | Their share due | Due | Its part of the $8,820,000 | Tier 1 | Carry tier, LPs | Carry |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Fund terms | 735,000.00 | 471,765.30 | 64,331.63 | 799,331.63 | 4,410,000.00 | 799,331.63 | 2,888,534.69 | 722,133.67 |
| Anchor | 441,000.00 | 141,529.59 | 19,299.49 | 460,299.49 | 2,646,000.00 | 460,299.49 | 1,857,845.43 | 327,855.08 |
| Friends and family | 294,000.00 | 0.00 | 0.00 | 294,000.00 | 1,764,000.00 | 294,000.00 | 1,470,000.00 | 0.00 |
| **All** | 1,470,000.00 | 613,294.89 | 83,631.12 | 1,553,631.12 | 8,820,000.00 | 1,553,631.12 | 6,216,380.13 | **1,049,988.75** |

**On X,** 40% of Kapok: $6,500,000 of $11,000,000 realized, 13/22, the fees to D all eight calls.

| Account | Cost due | Fees to D | Their share due | Due | Back | X's tier 1 | Its part of X | Tier 1 ends at X |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Fund terms | 3,185,000.00 | 572,474.43 | 338,280.35 | 3,523,280.35 | 799,331.63 | 2,723,948.71 | 0.49 | 5,559,079.01 |
| Anchor | 1,911,000.00 | 171,742.33 | 101,484.10 | 2,012,484.10 | 460,299.49 | 1,552,184.61 | 0.294 | 5,279,539.50 |
| Friends and family | 1,274,000.00 | 0.00 | 0.00 | 1,274,000.00 | 294,000.00 | 980,000.00 | 0.196 | 5,000,000.00 |

**At the NAV point,** $14,000,000, everything is realized and each account's due is its paid-in: $5,962,474.43, $3,405,742.33 and $2,156,000, $11,524,216.76 in all. Nothing is owed back.

### Birch's back fees, and its equalization at its close on 2021-04-15

One fee call is before Birch's close: the first half of 2021, on commitments. Birch's own part of it is its $3,000,000 of fee weight × 2% / 2 = **$30,000**, paid to the manager.

| LP | Capital paid in at its close | Capital got back | Interest paid | Interest received | Back fees |
|---|---:|---:|---:|---:|---:|
| Alder Endowment | 0.00 | 1,260,000.00 | 0.00 | 26,235.62 | 0.00 |
| Birch Family Office (joins) | 1,764,000.00 | 0.00 | 36,729.86 | 0.00 | 30,000.00 |
| Cedar Holdings | 0.00 | 504,000.00 | 0.00 | 10,494.25 | 0.00 |

The 2021-01-10 investment call's LPs' $5,880,000 rebalances from 10/14 and 4/14 to 1/2, 3/10 and 1/5, with 8% for 95 days.

## 10. The fix-up after your review (2026-10-31)

Your answers to the four open questions, and the one change to a case file you asked for.

**Your answers:**
1. **fund-32's derivation:** fix the row now, while this PR needs the label anyway. A derivation that describes a refusal the fixture no longer gives is wrong, not history. Done, below.
2. **FA64, a step dated after D:** agreed, a step counts whatever its date. A file that reads shouldn't start refusing just because its as-of date moves past a step's date with nothing else changed, and a GP who enters a future switch to invested capital needs the investments on that day anyway. The same goes for `commitments` and a later step on commitments. FA64 stands as written.
3. **FA66, a first period with nothing to call:** agreed, for FA40's reason. Which periods count is decided from the schedule alone, so who joins at a later close never turns on the investments' dates or the fee arithmetic. The LP did join after the fee term began, and its all-zero equalization row is the true answer: it owes nothing. FA66 stands as written.
4. **The GP commitment's part on invested capital:** keep F39. The GP commitment pays its share of each call, the LPs' fee over 1 − g. That's the 0.4.0 rule on commitments too, where with fee classes it already pays the LPs' blended rate, not the full one. Charging it the full rate only on invested capital would make the two bases disagree. A fee rate of the GP commitment's own would be a Later item if a fund asks for it; I haven't added it to the Later list.

You agreed FA63 to FA66 and FC17. Their rows are unchanged; as in 0.5.0, their status moves to Confirmed in the engine step.

**fund-32's derivation.** Its `fee-step-basis` row is now yours:

| Fixture | Base | Change | Kind | Term | Field | Why |
|---|---|---|---|---|---|---|
| `fee-step-basis` | 29 | `terms.management_fee.steps[1].basis` = `"invested_capital"` | input | `missing_field` | `investments` | From 0.6.0 a step's basis is read (F40); case 29 lists no investments, so its step on invested capital is refused at the end of stage 2 (FA64). |

- **How it got there:** in my scratch folder I replaced that one line of main's `DERIVATION.md` with your row and checked it there. You copied it in with `cp`.
- **Its sha256,** the same in my scratch folder and the case folder: `40f8b92a51182aaf767d724d6a507704bb5c320cdbc58fb364bf89a472e88e01`. Main's, and `934f616`'s, was `4278da6cae4c21e86904c9103bf5104d296c33e589f4450c3bc0f2591008f434`.
- **Checked after the copy:**
  - Against main, the file differs by that row only: `git diff --numstat main` gives one line out and one in, line 23.
  - The row's kind, term and field are the fixture's entry in `expected.json`, and its change and base are the fixture's. All 37 rows of the table now match `expected.json`; before, this one didn't.
  - `expected.json` and the 37 fixtures are unchanged since `934f616`. In fund-32, `git diff --stat 934f616` lists only `DERIVATION.md`.
  - `generate.py --check` matches all 41 folders, and the fund package's tests pass as before: 1,959, 13 skipped.
- **FC14** in `ASSUMPTIONS.md` said only the expectation and the `about` moved in fund-32. It now names the derivation row too. §1, §3, §5 and step 6 of "How to check it" here say the same.
- **Not changed:** fund-41's derivation. Its last sentence still says nothing moved in fund-32 but the expectation and the `about` (the open question below).

**How to check the fix-up:**

```bash
git diff main -- packages/fund/cases/fund-32-fees-refused
```

It shows the fixture's `about`, its entry in `expected.json`, and the one derivation row.

```bash
shasum -a 256 packages/fund/cases/fund-32-fees-refused/DERIVATION.md
```

It prints `40f8b92a…`, as above.

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   **What CI runs passes,** exit 0:

   | Suite | Before | Now | Changed |
   |---|---:|---:|---|
   | Fund package | 1,871 (10 skipped) | 1,959 (13 skipped) | `cases.test.ts` on the four new folders, and its new checks; `pending.test.ts` four more folders and the pending fixture; `read.test.ts` one fixture fewer, fund-32's moved one. The three new skips are checks that don't apply: each LP's fee in cases 38 and 40, which list no LPs, and "is the case it adds LPs to" in case 39. |
   | Fund page | 751 | 755 | `pending.test.ts` four more folders |
   | Engine | 3,177 | 3,177 | |
   | Main page | 680 | 680 | |

   - **The fund reference:** 125 unit tests, 114 before, and all 41 fund case folders matching it.
   - **Spillpoint's reference:** its 73 unit tests and its cases.
   - **Before** is main's: the fund package's tests and cases from main, run against today's `src`, which this branch doesn't change.

2. **Case 38's fees on invested capital, from the reference:**

   ```bash
   python3 -c '
   import json; e = json.load(open("packages/fund/cases/fund-38-fees-on-invested-capital/expected.json"))
   print([(c["date"], c["call"]["amount"]) for c in e["fee_calls"][12:]])'
   ```

   It prints the six quarters from 2023-01-01: 44550.00, 48303.30, 44388.59, 37125.00, 32107.01 and 25987.50.
3. **Case 40 has no call for 2025:**

   ```bash
   python3 -c '
   import json; e = json.load(open("packages/fund/cases/fund-40-spv-fees-on-invested-capital/expected.json"))
   print([(c["date"], c["call"]["amount"]) for c in e["fee_calls"]])'
   ```

   It prints 2022-01-01 32000.00, 2023-01-01 40000.00 and 2024-01-01 19781.42, and nothing for 2025.
4. **The first call by date, FA66:**

   ```bash
   python3 -m unittest packages/fund/reference/tests/test_fund_ref.py -k test_a_period_with_nothing_to_call_isnt_a_call_but_counts_by_its_date -v
   ```

5. **The refusals:** apply any fixture in `fund-41-invested-capital-refused/fixtures/`, or fund-32's `fee-step-basis.json`, to its base case's `inputs.json` and run it through `fund_ref.inputs.read`. Each is refused with the kind, term and path `cases-inv.json` gives.
6. **Nothing outside the step moved:**

   ```bash
   git diff --stat main HEAD -- packages/engine packages/fund/src apps/fund/src apps/dashboard cases reference .github .claude
   ```

   It prints nothing. `git diff --stat main HEAD -- packages/fund/cases` lists the four new folders and fund-32's three files.
7. **Have cases 38 to 41 re-derived** independently, from `SPEC.md` and each case's `inputs.json`, before you add the cases label.

## Assumptions added

- **F38 to F40:** Settled (S5; Jordan), the defaults Claude's. F30 amended by F39, F32 by F40, F28's order of checks with them.
- **FA40:** widened by F39.
- **FA63 to FA66 (New):** a step's basis as written; a step on either basis, whatever its date; the arithmetic of net invested capital; the periods by date and the first call.
- **FC13 widened, FC14 amended, FC17 (New):** no new shape; a period with nothing to call isn't listed; fund-32's moved fixture; the invested capital's refusals.
- **FC2:** names the sixth refusal set.
- **FC14, in the fix-up:** names fund-32's derivation row as moved too (§10).

## Open questions

1. **fund-41's derivation, its last sentence.** It says of fund-32's moved fixture: "Its expectation and its `about` moved in fund-32; nothing else there did." Since the fix-up, fund-32's derivation row has moved too, so the sentence is wrong in the way the row was. It's in a locked case file whose sha256 you've checked, and you asked for fund-32's row and nothing else, so I left it. Shall I change it as I did fund-32's row, in my scratch folder and then your `cp`? It would read: "Its expectation, its `about` and its row in fund-32's derivation moved; nothing else there did." That changes fund-41's sha256 from `770291f5…`.

The four questions from the first round are answered in §10.
