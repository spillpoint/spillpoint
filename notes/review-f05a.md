# Review: f05a (investments and carry deal by deal: spec, reference and cases)

Branch `f05a-fund-deals-spec-and-cases`, from main after #126. The first step of spillpoint-fund 0.5.0:
- **F33:** a fund's investments, with checks, partial sales, follow-ons and write-offs.
- **F34 and F35:** a carry basis, the whole fund (the default) or deal by deal, where tier 1 runs only to what's due on the investments exited or written off so far.
- **F36 and F37:** the outputs and the refusals.

No engine or page code.

**Nothing in the engine, the fund's source, the page's source, the main page, `cases/` or `reference/` changed:** `git diff --stat main -- packages/engine packages/fund/src apps/fund/src apps/dashboard cases reference .github` prints nothing.
- **Under `apps/`,** only the page's pending list, `apps/fund/test/support/cases.ts`.
- **`packages/fund/cases`:** five new folders, fund-33 to fund-37. Nothing in fund-01 to fund-32 changed.

`.claude/settings.json` isn't committed: the fund cases' lock is lifted only on your machine.

**The reference and my hand work never disagreed, and no case contradicts the spec.**
- **The four run cases:** each `expected.json` rebuilt from my hand working comes out byte for byte the reference's.
- **All 55 refusals** are the kind, term and path `cases-deals.json` gives.
- **Every figure in your spec's case notes comes out of both:**
  - case 33's $2,212,121.21 and $1,938,000
  - case 34's $2,970,000 and $360,000 at Alder's exit, $1,116,000 of carry, $11,100,000 due and $1,938,000 at the NAV point
  - case 35's $6,800,139.13 under $6,879,360, $2,348,128 owed at X = 0, cleared at $18,376,163.27 with $24,888,000 back
  - case 36's $2,130,000, $1,233,000 and $792,000; breakpoints at $5,400,000, $5,841,919.19 and $6,283,838.38; $2,376,000, $99,466.52 and $45,000

**One thing to raise before f05b, open question 1.** Deal by deal, capital called for investments and never invested isn't due before carry, even at the end, as F35 reads. Where it's more than the profit already through the tiers, a final X's clawback rises as X grows, and F15 has no words for that. No case has it. It's FA49, with what I'd recommend.

| Commit | What |
|---|---|
| `be636a2` | `SPEC.md` and `ASSUMPTIONS.md`: F33 to F37, F1, F4, F5, F15, F18 and F28 amended, FA49 to FA60, FC15 and FC16 (§1, §2, §3) |
| `c9cd49c` | the reference: `deals.py`, investments in the reader, deal by deal in the waterfall, the case writer's new blocks, 22 more unit tests (§4) |
| `3d7faeb` | the cases: 33 to 36 and the 55 refusals (§5, §6) |
| `270cc16` | the pending lists and the case-file checks (§7) |
| `e334f5e` | `CLAUDE.md` names the 0.5.0 steps and F1 to F37 |
| the next commit | this note |

## 1. The spec (`packages/fund/docs/SPEC.md`)

- **The header and "What it answers":** F33 to F37 (S4), and two bullets from your "What it answers".
- **Inputs:** a "From 0.5.0" block with your example and every field, as your spec words them.
- **F1:** one sentence: from 0.5.0 it's the default carry basis, and a fund can pay deal by deal instead.
- **F4, widened:** on one date, calls, then checks, then write-offs, then distributions; D on or after every check and write-off too.
- **F5, amended:** deal by deal, only what's due on the investments exited or written off so far.
- **F15:** `clawback_starts` "can't be produced by v1's terms" gains "From 0.5.0, deal by deal can, with capital called and not invested by the end (FA49)". That's open question 1.
- **F18:** `deal_by_deal_pref` among the unsupported, and the four new input terms.
- **F28's order of checks:** the investments in each stage, as your spec lists them. F37 points there, as F32 does for the schedule.
- **F33 to F37:** after F32, with your "Why" paragraph and F35's Later line.
- **Cases 33 to 37** in the list, and your 2026-10-27 decisions and Claude's ten defaults under "Decided".

## 2. The assumptions (`packages/fund/docs/ASSUMPTIONS.md`)

- **F33 to F37:** a table of their own, Settled (S4). F4 widened by F33 and F5 amended by F35, in their rows.
- **FA9:** one sentence pointing to FA49.
- **"Later":** "American (deal-by-deal) carry (F1)" is replaced by F35's Later line.
- **FC2:** names the fifth refusal set.

**Every decision I made (FA49 to FA60, all New):**

| ID | What I decided |
|---|---|
| FA49 | Capital called and not invested is never due before carry deal by deal, even at the end, as F35 reads. The clawback trues it up. Where that makes a final X's clawback rise, the reference stops, unworded, as FA9 has it. Open question 1. |
| FA50 | The cost realized at a distribution includes its own realization and everything before it in F4's widened order; the cost made is every check on or before its date. A write-off and an exit of one investment on one date: the write-off first. |
| FA51 | "Fees and expenses to date": the run's own fee and expense calls on or before the distribution's date, as the waterfall counts them (a schedule's calls, an entered fee call before a later close at full size, the GP commitment's part aside). |
| FA52 | null is left out for `carry_basis`, `investments`, `distribution_from`, its share, and a distribution's investment and share. An empty `investments` is none. On a call or a write-off, a null field it doesn't have is left out, not refused, as a distribution's null `kind` is. Investment names are as LP names (FA17). |
| FA53 | The ties F37 leaves in the order of checks: within a cash flow, an investment, a check and `distribution_from`; a check after D in the investments' order; and for `investments_exceed_calls`, the cost made by a date is every check on it, so the first check of that date is named. Open question 4. |
| FA54 | `deal_by_deal_pref` is any `pref` but null, whatever its shape, with `carry_basis` exactly `"deal_by_deal"`; another basis word is refused in stage 2. |
| FA55 | On the whole fund the investments, the tags and X's source are checked as deal by deal and used only for the table. |
| FA56 | A write-off isn't a distribution: not `distribution_before_call`, and not a close's limit. |
| FA57 | `capital_returned`'s `amount`, deal by deal, is what's due on X, the amount its text names. |
| FA58 | X realizes its share of what's left after every cash flow on D; final, and at the NAV point, everything. So at case 36's NAV point $12,855,000 is due, and $10,069,750 on its axis. |
| FA59 | The table is at D before X, on either basis, proceeds being every distribution naming the investment. No multiple: F36 doesn't list one. Open question 3. |
| FA60 | The LPs' part of the cost is (1 − g) of every check, whatever `pays_fees` and `pays_expenses` say. |

## 3. The case files: FC15 and FC16 (your step 3)

**FC15 proposed.** Only what the input needs, so cases 01 to 32 are byte for byte as they were.
- **`investments`,** at the top after `fee_calls` (or the paid-in and pref) and before `lps`, on either basis: each investment in the input's order, its `name`, then `cost_made`, `cost_realized`, `cost_written_off` and `proceeds`, each `{amount, exact}`.
- **`due`,** deal by deal, at each point after `tags`: the cost made and realized, X's realization in it, then the LPs' `cost`, their `fees_and_expenses` and the `total`, each `{amount, exact}`. With two or more accounts each `by_account` entry gains its own `due` after `class`, without the cost made and realized, since the share is the fund's.
- **`capital_returned`'s `amount`** is what's due on X (FA57).
- **Nothing else changes shape.** An earlier distribution's due isn't listed: F36 gives X's alone, and `to_date`'s capital shows the rest. No `carry_basis`: the input has it.

Case 36's first point, cut down:

```json
{
  "x": "0.00", "exact": "0", "tags": ["listed"],
  "due": {
    "cost_made": { "amount": "12000000.00", "exact": "12000000" },
    "cost_realized": { "amount": "9400000.00", "exact": "9400000" },
    "cost": { "amount": "9306000.00", "exact": "9306000" },
    "fees_and_expenses": { "amount": "763750.00", "exact": "763750" },
    "total": { "amount": "10069750.00", "exact": "10069750" }
  },
  "distribution": { "...": "as before" },
  "by_account": [
    { "class": null, "due": { "cost": "...", "fees_and_expenses": "...", "total": { "amount": "5240500.00", "exact": "5240500" } }, "distribution": "..." }
  ]
}
```

**FC16:** fund-37 in FC7's shape, each fixture naming its base: case 34 for most, case 33 for the two whole-fund ones, case 36 for the three that need classes or a later close. The changes and refusals are yours; each `about` sentence is mine.

## 4. The reference (`packages/fund/reference`)

Written from `SPEC.md`. Nothing in the engine or its tests is imported, and the reference imports nothing new.
- **`deals.py` (new):** walks the checks, write-offs and distributions in F4's widened order. Each distribution gets the cost realized so far and the cost made by its date; the fund gets each investment's figures at D before X, the cost made by D, and the cost realized with X's share.
- **`inputs.py`:** `carry_basis`, `write_off`, a distribution's `investment` and `share`, `investments` and `distribution_from`, each refused as F37 has it, in its stage. Write-offs are kept apart from the calls and distributions, so nothing that runs the tiers or the equalization sees them.
- **`waterfall.py`:** the ledger keeps the LPs' fee and expense calls to date. Deal by deal, tier 1 at each distribution runs to what's due less what's back, never below 0. X's due is the same at every X.
- **`accounts.py`:** an account's part of the cost is the LPs' part by commitment; its fees and expenses are its own calls.
- **`breakpoints.py`:** F36's `capital_returned` wording deal by deal. The search is unchanged: it finds where X's tier 1 ends as it found the capital tier's end.
- **`case.py`:** FC15's `investments` and `due`.
- **On the whole fund nothing changes:** `generate.py --check` matches all 32 earlier case folders byte for byte, and a fund with investments on the whole fund splits as the same fund without them (a unit test and the random funds).

**The unit tests:** 114, 92 before.
- **`Deals` (12):** small hand-checkable numbers, $1,000 called for two investments and $100 of fees. The whole fund unchanged; an exit's cost and fees' share, then carry; a partial sale and a follow-on; a write-off and an escrow release; one date's order; a new investment lowering the fees' share with nothing taken back; each account's own due; X's share of what's left, and everything when final; a fee call on a distribution's date; the GP commitment's part aside; the end equal to the whole fund's entitlement; and FA49's stop.
- **`DealRefusals` (9):** F37 beyond the fixtures, and FA52 to FA56: nulls, names, each tie in the order of checks, the cost made on one date, a pref of any shape, the whole fund checked, and a write-off before the first call.
- **36 random funds with investments,** a third with classes and closes and some with fees, most deal by deal, all invested in full by D:
  - every account's breakpoints found, no account's clawback rising, the fund's amounts the accounts' sums
  - on the whole fund, every amount as without the investments
  - deal by deal, each account's entitlement the whole fund's at every X, so the GP keeps at most that, and X's tier 1, when final, all the paid-in not yet back
  - each distribution's tier 1 is what's due less what's back, or nothing: six of them had what's due below what's back

## 5. The cases (`packages/fund/cases`, your step 3)

- **fund-33 to fund-36:**
  - `inputs.json` written by a script from `cases-deals.json`, `about` as `description`
  - `expected.json` from the reference
  - a `DERIVATION.md` worked by hand
- **fund-37-deals-refused:** your 55 changes as fixtures, `expected.json` from the reference, and a derivation of each refusal with the stage that decides it.

**How the hand work was done and checked.** f04a's hand working, grown for investments, in my scratch folder, importing nothing from the reference:
- **A different method from the reference's:**
  - each investment's history worked on its own, and the cost realized at a distribution summed over investments, not one walk over the fund
  - what's due worked straight from the inputs at each date (the account's fee and expense calls on or before it), not a running ledger
  - X's tier 1 ending from its size over the account's part of X, not by search
  - a clawback change's wording from the totals run's tier ends found as sizes
- **The whole `expected.json`, rebuilt from that working:** every key in order and every value, for the four run cases, and still for f04a's cases 25, 26 and 29 to 31. Byte for byte the reference's.
- **The comparison bites.** Six errors planted in my working:
  - the cost realized with the GP commitment's 1% or 2% left in: 56, 93 and 403 differences in cases 34, 35 and 36
  - all the fees due at once, not their share: 44, 64 and 338
  - a distribution's own realization left out: 37, 57 and 318
  - what's due below what's back taken back: 57 in case 35, its escrow release
  - X's share taken of the whole cost, not of what's left: none. No case has X from an investment already partly sold
  - a fee call on a distribution's date left out: none. No case has one

  The last two are pinned by the reference's unit tests instead (`Deals`: X's share of what's left; a fee call on the distribution's date).
- **The derivations:** every table of amounts is the hand working's, by script. The hand-typed rows (case 35's three distributions, case 36's dues at Ivy's exit and on X) I checked against the working by script: all nine match. Every amount in the prose I checked against the case's `expected.json` or by hand.
- **The refusals:** all 55 match `cases-deals.json`, kind, term and path, and the derivation's 55 rows are `cases-deals.json`'s.
- **Cases 01 to 32:** `generate.py --check` matches all of them, and `git diff` shows none changed.

## 6. How the files got there

As in f03a and f04a, every file in `packages/fund/cases` was written by a script or copied in with `cp`, not by the Write tool:
- **`inputs.json`** for 33 to 36 and the 55 fixtures were written by a script from `cases-deals.json`, each into its own new folder.
- **`expected.json`** was written by the reference, `generate.py`.
- **The five `DERIVATION.md` files** were written in my scratch folder, checked there, and copied in byte for byte with `cp`.
- **I didn't edit or commit `.claude/settings.json`.**
- **The checks that plant errors** (§7) ran on a copy of the cases in my scratch folder. No case file was changed and put back.

Each derivation's sha256, the same in my scratch folder and the case folder:

| File | sha256 |
|---|---|
| `fund-33-portfolio-whole-fund/DERIVATION.md` | `55b26e1b70154f0e3f0a16985cd23922a7dbce2d8a06ce447333f7ed623eeca2` |
| `fund-34-deal-by-deal/DERIVATION.md` | `dddf589722ca8b3b2533eda4c7c8357d8cc44b7aa617e23440040d562f6ef527` |
| `fund-35-deal-by-deal-clawback/DERIVATION.md` | `a40bcefdba090d266f2a0ed1679ca4dfafdf338c0e740fb3d18aeaec98351258` |
| `fund-36-deal-by-deal-classes-closes/DERIVATION.md` | `4d176e636815c45049b5fda240782feb7163c221b579534e2424d6c6bd595536` |
| `fund-37-deals-refused/DERIVATION.md` | `4a9cc37f047ec462665ddff773009ec2631865b181359e2ef1f2c99acab879e4` |

## 7. The pending lists and the case-file checks (your step 4)

**Both pending lists** have cases 33 to 37:
- `packages/fund/test/support/cases.ts`, which f05b empties
- `apps/fund/test/support/cases.ts`, which f05c empties

Today's engine and page skip them and keep passing. No page test names a new case directly, so nothing else under `apps/` changed.

**`packages/fund/test/cases.test.ts`** checks the case files with no engine code, the pending cases included:
- **Counts:** thirty-two runs and five sets of refusals; the four new input terms; LPs, classes and a schedule in 36 too; investments in 33 to 36, deal by deal in 34 to 36.
- **No investments:** no `investments` and no `due`, so cases 01 to 32 keep their shapes.
- **The investments (new):** in the input's order; each amount to the cent from its exact value; the cost made all its checks; realized at most made, written off at most realized, and none without a write-off; proceeds the distributions naming it; and the cost made by each check's date never more than the investment calls to then.
- **What's due (new):** at every point, the cost made all the checks, realized at most that and all of it when final or at the NAV point; each account's cost the LPs' part of the cost realized by its share; its fees and expenses its paid-in less its part of the investment calls, times realized over made; the total the two; and the accounts adding up to the fund's.
- **X's tier 1 (new):** each account's capital from X is what's due less what's back, or nothing, and at most its part of X.
- **At the end (new):** with every check called for, what's due when final or at the NAV point is all the paid-in, each account's too.
- **The breakpoint (new):** each `capital_returned`'s amount what's due on X, and its text F36's.

**The checks bite.** On a copy of the cases in my scratch folder, seven planted errors each failed a test:
- all the fees due on X in case 34, not their share
- case 36's NAV point not realizing everything
- Elm's escrow release left out of its proceeds in case 35
- case 34's breakpoint amount $100,000 under what's due
- Kapok written off by $1 in case 36
- Anchor's cost due a dollar off in case 36
- case 35's X's tier 1 at $5,000,000 not what's due less what's back

## 8. CI and permissions (hard rule 9)

- **Nothing in `.github/workflows/` or `.claude/` is in this PR.**
- **`cases-locked.yml`** fails this PR until you add the cases label, as for any case step.

## 9. Each case's key figures, to the cent

### What's due at each distribution, its capital and its carry

**Case 34**, no listed LPs, a 1% GP commitment:

| Date | From | Amount | Cost made | Cost realized | Cost due (99%) | Fees and expenses to date | Their share | Due | Back before | Capital | Carry |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2022-06-30 | Alder Robotics | 9,000,000.00 | 10,000,000.00 | 3,000,000.00 | 2,970,000.00 | 1,200,000.00 | 360,000.00 | 3,330,000.00 | 0.00 | 3,330,000.00 | 1,116,000.00 |
| D, X | Cedar AI | X | 10,000,000.00 | 10,000,000.00 | 9,900,000.00 | 1,200,000.00 | 1,200,000.00 | 11,100,000.00 | 3,330,000.00 | up to 7,770,000.00 | 20% above it |

**Case 35**, no listed LPs, a 2% GP commitment, final:

| Date | From | Amount | Cost made | Cost realized | Cost due (98%) | Fees and expenses to date | Their share | Due | Back before | Capital | Carry |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2021-09-30 | Dogwood, 40% | 6,000,000.00 | 15,000,000.00 | 2,400,000.00 | 2,352,000.00 | 1,298,000.00 | 207,680.00 | 2,559,680.00 | 0.00 | 2,559,680.00 | 664,064.00 |
| 2022-06-30 | Elm | 12,000,000.00 | 20,000,000.00 | 6,400,000.00 | 6,272,000.00 | 1,898,000.00 | 607,360.00 | 6,879,360.00 | 2,559,680.00 | 4,319,680.00 | 1,488,064.00 |
| 2023-06-30 | Elm, escrow | 1,000,000.00 | 23,000,000.00 | 6,400,000.00 | 6,272,000.00 | 1,898,000.00 | 528,139.13 | 6,800,139.13 | 6,879,360.00 | 0.00 | 196,000.00 |
| D, X (final) | Dogwood, everything left | X | 23,000,000.00 | 23,000,000.00 | 22,540,000.00 | 2,348,000.00 | 2,348,000.00 | 24,888,000.00 | 6,879,360.00 | up to 18,008,640.00 | 20% above it |

**Case 36**, by class, a 1% GP commitment. Ivy's exit has a third of the cost made realized; X, half of Kapok, has 47/60; the NAV point all of it.

| When | Account | Cost due | Fees to date | Their share | Due | Back before | Its part | Capital | Carry |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Ivy, 2023-03-31, $8,000,000 | Fund terms | 1,980,000.00 | 450,000.00 | 150,000.00 | 2,130,000.00 | 0.00 | 3,960,000.00 | 2,130,000.00 | 366,000.00 |
| | Anchor | 1,188,000.00 | 135,000.00 | 45,000.00 | 1,233,000.00 | 0.00 | 2,376,000.00 | 1,233,000.00 | 171,450.00 |
| | Friends and family | 792,000.00 | 0.00 | 0.00 | 792,000.00 | 0.00 | 1,584,000.00 | 792,000.00 | 0.00 |
| X on D | Fund terms | 4,653,000.00 | 750,000.00 | 587,500.00 | 5,240,500.00 | 2,130,000.00 | 0.495 X | up to 3,110,500.00 | 20% above it |
| | Anchor | 2,791,800.00 | 225,000.00 | 176,250.00 | 2,968,050.00 | 1,233,000.00 | 0.297 X | up to 1,735,050.00 | 15% above it |
| | Friends and family | 1,861,200.00 | 0.00 | 0.00 | 1,861,200.00 | 792,000.00 | 0.198 X | up to 1,069,200.00 | none |
| NAV point, $15,000,000 | Fund terms | 5,940,000.00 | 750,000.00 | 750,000.00 | 6,690,000.00 | 2,130,000.00 | 7,425,000.00 | 4,560,000.00 | 573,000.00 |
| | Anchor | 3,564,000.00 | 225,000.00 | 225,000.00 | 3,789,000.00 | 1,233,000.00 | 4,455,000.00 | 2,556,000.00 | 284,850.00 |
| | Friends and family | 2,376,000.00 | 0.00 | 0.00 | 2,376,000.00 | 792,000.00 | 2,970,000.00 | 1,584,000.00 | 0.00 |

**Case 33,** the whole fund: Alder's $9,000,000 is $90,000 to the GP commitment and $8,910,000 of capital, no carry; X's capital is the last $2,190,000.

### The breakpoints

| Case | X | Exact | Reasons |
|---|---:|---|---|
| 33 | 2,212,121.21 | 73000000/33 | `capital_returned`: "LPs have their $11,100,000 of paid-in capital back" |
| 34 | 7,848,484.85 | 259000000/33 | `capital_returned`: "LPs have their $11,100,000 back for the investments exited or written off, fees and expenses included" |
| 35 | 6,395,918.37 | 313400000/49 | `clawback_changes`, `starts_to_fall`: "the clawback owed starts to fall: on the fund's totals, LPs have their capital back" |
| 35 | 18,376,163.27 | 900432000/49 | `capital_returned`: "LPs have their $24,888,000 back for the investments exited or written off, fees and expenses included"; `clawback_cleared` |
| 36 | 5,400,000.00 | 5400000 | `capital_returned`: "Friends and family: LPs have their $1,861,200 back for the investments exited or written off, fees and expenses included" |
| 36 | 5,841,919.19 | 578350000/99 | `capital_returned`: "Anchor: LPs have their $2,968,050 back for …" |
| 36 | 6,283,838.38 | 622100000/99 | `capital_returned`: "Fund terms: LPs have their $5,240,500 back for …" |

### Case 35's clawback

| X | Carry paid | Entitlement | Owed |
|---:|---:|---:|---:|
| 0.00 | 2,348,128.00 | 0.00 | 2,348,128.00 |
| 6,395,918.37 | 2,348,128.00 | 0.00 | 2,348,128.00 |
| 12,000,000.00 | 2,348,128.00 | 1,098,400.00 | 1,249,728.00 |
| 18,376,163.27 | 2,348,128.00 | 2,348,128.00 | 0.00 |
| 25,000,000.00 | 3,646,400.00 | 3,646,400.00 | 0.00 |

- **At X = 0:** the fund's totals have $18,620,000 through the tiers on $24,888,000 of paid-in, so the GP has earned nothing and owes back all **$2,348,128**.
- **At $12,000,000:** X is all tier 1, paying no carry; the totals have their capital back at $6,395,918.37 and 20% of the next $5,492,000 through the tiers is the **$1,098,400** entitlement: **$1,249,728** owed.

### Case 36's equalization, at Birch's close on 2021-07-15

| LP | Capital paid in | Capital got back | Interest paid | Interest received | Back fees |
|---|---:|---:|---:|---:|---:|
| Alder Endowment | 0.00 | 1,697,142.86 | 0.00 | 71,047.51 | 0.00 |
| Birch Family Office (joins) | 2,376,000.00 | 0.00 | 99,466.52 | 0.00 | 45,000.00 |
| Cedar Holdings | 0.00 | 678,857.14 | 0.00 | 28,419.01 | 0.00 |

The 2021-01-05 call's LPs' $7,920,000 rebalanced from 10/14 and 4/14 to 1/2, 3/10 and 1/5; 8% for 191 days; the three fee calls before the close Birch's own, $15,000 each. Deal by deal changes none of it: the equalization is outside the waterfall.

### Cases 33 and 34 side by side at $12,000,000

| At X = $12,000,000 (the NAV point) | Case 33, whole fund | Case 34, deal by deal |
|---|---:|---:|
| Alder's exit: LPs' capital | 8,910,000.00 | 3,330,000.00 |
| Alder's exit: carry | 0.00 | 1,116,000.00 |
| X's tier 1 runs to | 11,100,000.00 (all paid-in) | 11,100,000.00 (what's due) |
| X: LPs' capital | 2,190,000.00 | 7,770,000.00 |
| X: LPs' carry tier | 7,752,000.00 | 3,288,000.00 |
| X: carry | 1,938,000.00 | 822,000.00 |
| To date: LPs | 18,852,000.00 | 18,852,000.00 |
| To date: carry | 1,938,000.00 | 1,938,000.00 |
| To date: GP commitment | 210,000.00 | 210,000.00 |
| Entitlement | 1,938,000.00 | 1,938,000.00 |
| Owed back | 0.00 | 0.00 |

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   **What CI runs passes,** exit 0:

   | Suite | Before | Now | Changed |
   |---|---:|---:|---|
   | Fund package | 1,310 (9 skipped) | 1,472 (10 skipped) | `cases.test.ts` on the five new folders and its new checks; `pending.test.ts` five more folders. The new skip is "is the case it adds LPs to", which applies to cases 17 to 20 only. |
   | Fund page | 600 | 605 | `pending.test.ts` five more folders |
   | Engine | 3,177 | 3,177 | |
   | Main page | 680 | 680 | |

   - **The fund reference:** 114 unit tests, 92 before, and all 37 fund case folders matching it.
   - **Spillpoint's reference:** its 73 unit tests and its cases.
2. **What's due at case 36's X, from the reference:**

   ```bash
   python3 -c '
   import json; e = json.load(open("packages/fund/cases/fund-36-deal-by-deal-classes-closes/expected.json"))
   p = e["points"][0]; print(p["due"]["total"]["amount"], [a["due"]["total"]["amount"] for a in p["by_account"]])'
   ```

   It prints 10069750.00 and the three accounts' 5240500.00, 2968050.00 and 1861200.00.
3. **Case 35's escrow release, from the reference:**

   ```bash
   python3 -c '
   import json, sys; sys.path.insert(0, "packages/fund/reference")
   from fund_ref.inputs import read; from fund_ref.accounts import Model; from fund_ref.num import money
   m = Model(read(json.load(open("packages/fund/cases/fund-35-deal-by-deal-clawback/inputs.json"))["fund"]))
   print([(money(c), money(f), money(c + f)) for c, f in m.accounts[0].run.before.dues])'
   ```

   It prints each distribution's cost, fees and expenses, and due: 2352000.00, 207680.00 and 2559680.00; 6272000.00, 607360.00 and 6879360.00; 6272000.00, 528139.13 and 6800139.13, under the 6879360.00 already back.
4. **The refusals:** apply any fixture in `fund-37-deals-refused/fixtures/` to its base case's `inputs.json` and run it through `fund_ref.inputs.read`. Each is refused with the kind, term and path `cases-deals.json` gives.
5. **FA49's stop, the open question:**

   ```bash
   python3 -m unittest packages/fund/reference/tests/test_fund_ref.py -k test_capital_called_and_not_invested_stops_the_reference -v
   ```

6. **Nothing outside the step moved:**

   ```bash
   git diff --stat main -- packages/engine packages/fund/src apps/fund/src apps/dashboard cases reference .github
   ```

   It prints nothing. `git diff --stat main -- packages/fund/cases` lists only the five new folders.
7. **Have cases 33 to 37 re-derived** independently, from `SPEC.md` and each case's `inputs.json`, before you add the cases label.

## Assumptions added

- **F33 to F37:** Settled (S4; Jordan), the defaults Claude's. F4 widened by F33, F5 amended by F35.
- **FA49 to FA60 (New):** uninvested capital deal by deal; the cost realized and made at a distribution; fees and expenses to date; nulls, empty lists and names; the order of checks' ties; `deal_by_deal_pref` in stage 1; the whole fund's investments; a write-off isn't a distribution; `capital_returned`'s amount; what X realizes and the NAV point; the investments table; the LPs' part of the cost.
- **FA9 and F15:** a sentence each pointing to FA49.
- **FC15 and FC16 (New):** investments and what's due in `expected.json`, and the deals' refusals.
- **FC2:** names the fifth refusal set.

## Open questions

1. **FA49: capital called and not invested, at the end.** F35 dues the cost realized, and F37 lets the investment calls run ahead of the checks. So a fund that calls $10,000,000 for investments and invests $8,000,000 has $8,000,000 due at the end, not $10,000,000. At a final X, X pays carry on the $2,000,000 the LPs never got back, and the clawback's run on the totals, with all paid-in as capital, takes it straight back: $0 owed at X = $8,000,000, $400,000 at $10,000,000, and $400,000 from there on. The GP keeps the whole fund's entitlement, as F35 says, but the split shows carry paid and owed back at once, and F15 has no words for a clawback that rises and stops rising, so the reference stops there. The engine would hit the same wall in f05b. Three ways out:
   - **(a), my recommendation:** at the end, a final X and the NAV point, all the LPs' paid-in is due, the uninvested capital included, as on the whole fund: the fund ends, so its unused cash comes back as capital. Before the end nothing changes. The clawback then never rises (FA9 holds again), and no case changes: in all three deal-by-deal cases every dollar called for investments was invested.
   - **(b):** word a rising clawback in F15: `starts_to_rise`, `stops_rising` and the rest, new codes in the API.
   - **(c):** refuse deal by deal with uninvested capital at D, which would refuse most funds mid-life.

   Which? With (a) I'd change FA49, F35's end line and the reference's due at the end in f05b's first commit, or here if you'd rather.
2. **FC15's shape.** It's what f05b's engine will be held to once the cases are locked: `investments` at the top; `due` after `tags` with the cost made and realized, and each account's after its `class`; `capital_returned`'s amount the due. Fine, or would you rather any of it be shaped differently? One choice inside it: earlier distributions' dues aren't listed, since F36 gives X's alone.
3. **FA59: the investments' multiple.** The page's Investments tab shows proceeds over cost made, and the page does no fund math (FA16). Should f05b's engine give the multiple in the table? It's not in F36 or the case files.
4. **FA53: the cost made on one date.** Where a date's checks together run past the calls, I name the first of them in the investments' order, as "the cost made by a check's date" reads, even if that check alone wouldn't run past. The other reading counts checks one at a time in that order and names the one that tips it over. No fixture tells them apart. Which?
