# Review: M5b (more SAFE and note cases)

Branch `m5b-cases`. The first half of the cases you split in two: five exit cases for SAFEs and notes at a sale. M5c brings 9b, 9c, 10b and 22. There is no engine work. The engine still refuses SAFEs and notes at a sale, naming M5; M5g and M5h build them.

**The `cases-locked` check fails on this PR until you add `unlock-cases`,** which you'll do once the cases are re-derived independently.

**One new assumption needs your eye first: X16,** a tie rule that 12f needed. It's explained below.

## Run it

```bash
python3 reference/generate.py --check
```

This prints `ok` for all 56 cases. Each new case's `DERIVATION.md` walks through the answer by hand.

## How I made the cases

I followed the same process as M5a, with one difference worth knowing:
1. **By hand.** I worked out each case first, with exact fractions, from your M5b answers, without the reference calculator.
2. **The reference.** I extended it to the same rules.
3. **The comparison.** The two agree **exactly** on every payout, at every listed exit value and breakpoint, and on every breakpoint.

**What the comparison caught.** My hand work found 12f's three breakpoints but treated X's switch at $9,592,105.26 as a bend. The reference showed a jump there, with two stable outcomes at that exact exit value. I then worked the jump through by hand and confirmed it. That's what X16 is for.

## The new cases

| Case | What it isolates | Check |
|---|---|---|
| **12e** the ranking setting | 12d with `"cash_out_ranks_with": "series_a"`: the SAFE's Cash-Out Amount shares the senior tier with Series A. | Breakpoints **$3M**, $4M, $8.5M, $12M. At $1M Series A gets $666,666.67 and the SAFE $333,333.33; at $3M, $2M and $1M, with Seed nothing. Above $4M every payout is 12d's. |
| **12f** two SAFEs | Case 12's company. X: $1M at a $10M cap. Y: $500,000 at a $4M cap. One Liquidity Capitalization for both. | Breakpoints $1.5M, **$4,815,789.47** (Y converts) and **$9,592,105.26** (X converts, a jump). With both converting, the count is 12,258,064.52, with X at $0.815789 and Y at $0.326316. |
| **12g** pre-money SAFE at a sale | Case 12's company built from four events, with a $1M SAFE on an $8M **pre-money** cap. The exit runs on the table after the SAFE. | Liquidity Capitalization 9,500,000, price $0.842105, **1,187,500** shares. Breakpoints $1M and **$8,578,947.37**. |
| **12h** MFN SAFE | Case 12's company, with a $1M SAFE that has no cap and no discount. | One breakpoint, $1M. The SAFE gets $1,000,000 at every exit above that. |
| **13g** two notes | 13a's note plus Y's: $500,000 at 8% from 2023-01-01, a $5M cap, repaid at 2x. | Breakpoints **$3.32M** (both repaid), **$11,891,428.57** (Y converts) and **$17,682,285.71** (X converts). At $1M, X has $674,698.80 and Y $325,301.20. |

### What to look at, by behavior

1. **12f, the jump.**
   - **At $9,592,105.26:** X has $1,000,000, Y $1,125,862.07, and the founders $7,466,243.19.
   - **One cent above:** Y has $1,250,000, and the founders $124,137.93 less.
   - **Why:** X's conversion enlarges the Liquidity Capitalization, and Y's shares are 1/8 of it. The breakpoint's reason says so.
2. **12e against 12d.** At $3M:
   - **12e:** Series A gets $2,000,000, the SAFE $1,000,000 and Seed nothing.
   - **12d:** Series A gets $2,000,000, and the SAFE and Seed $500,000 each.
3. **12g against 12.**
   - **Switch point:** the pre-money SAFE switches at $8,578,947.37, case 12's post-money SAFE at $9,526,315.79.
   - **Shares:** it gets 1,187,500 shares, case 12's 1,055,555.56. Its shares sit on top of a count that doesn't include them.
4. **13g, the shortfall.** Below $3.32M the two notes split every dollar 224 : 108, the ratio of their repayments.

## X16: an indifferent SAFE takes its cash (new)

**The problem.** At 12f's $9,592,105.26, X is indifferent: it gets $1,000,000 either way. But its choice changes what Y gets:
- **With X taking cash,** Y gets $1,125,862.07.
- **With X converting,** Y gets $1,250,000.

Both outcomes are stable there. No other case has two stable outcomes at one exit value (E8), and the engine stops with an error when it finds them (E18).

**The rule I used.** A SAFE takes its Conversion Amount, and a note converts, only when that strictly pays more. At exactly the indifference point, X takes its cash. So:
- the outcome from below holds there
- the jump happens just above it
- the breakpoint is flagged `payouts_jump`

This is how a class vote already works (E11, E13): an indifferent holder stays. It extends E5, which settles ties that pay everyone the same.

**What it changes.** Only that one exit value in 12f: the alternative would report two outcomes there. No locked case changed. Their ties all pay everyone the same, and E5 already reported the cash or repayment.

## Your M5b answers, as the rules

- **X13, two SAFEs.**
  - Cash-Out Amounts share a shortfall pro rata by purchase amount.
  - There is one Liquidity Capitalization for the company, counting every SAFE taking its Conversion Amount.
  - Supported only when every SAFE has a post-money cap.
- **X14, a pre-money SAFE at a sale.**
  - Its count is the stock as converted plus options and warrants. It leaves out the pool, the SAFEs and the notes, so its shares sit on top.
  - It has no discount at a sale, and its shortfall clause pays nothing extra.
  - Refused alongside preferred or another SAFE.
- **X15, two notes.**
  - Repayments rank equally, pro rata by repayment.
  - Neither note counts the other in its base.
  - Supported only when every note has a cap.
- **X9:**
  - **The ranking setting:** `cash_out_ranks_with`, naming a series.
  - **The MFN SAFE:** it takes its cash and has its own case.
- **"Owed before release"** gains a SAFE or note with no cap alongside capped participating preferred.

## What changed outside `cases/`

- **The reference calculator** (`reference/spillpoint_ref/`):
  - **`waterfall.py`:**
    - several SAFEs and several notes, with their shortfalls shared pro rata
    - one Liquidity Capitalization for the company
    - the pre-money count
    - the ranking setting
    - X16 in the stability test
    - the refusals
  - **`model.py`:** reads and writes `cash_out_ranks_with`.
  - **`case.py`:**
    - each SAFE's tier
    - the count with the other converting SAFEs, in a new field, `liquidity_capitalization_counts_safes`
  - **`breakpoints.py`:**
    - one reason when several SAFEs' cash or notes' repayments are paid in full together
    - each SAFE's tier in the tier reasons
    - a switch at a jump priced at the common price after the switch, with the jump explained
  - **`reference/tests/`:** 5 new tests:
    - two SAFEs, with the jump
    - the ranking setting
    - a pre-money SAFE at a sale
    - two notes
    - the refusal of two SAFEs without post-money caps
- **`docs/ASSUMPTIONS.md`:**
  - **X13–X15:** your answers.
  - **X16:** new.
  - **X9 and X12:** the setting, the MFN case, and what is still refused.
  - **C3, C8 and C9:** the new cases and fields.
  - **"Owed before release":** the new item.
- **`docs/SPEC.md`:** the variants in the case list.
- **The engine's tests:**
  - **`input.test.ts`:** refuses the five new cases, as SAFEs or notes at a sale, naming M5.
  - **`rounds.test.ts`:** expects 27 cases with events, since 12g has them. The engine builds 12g's four cap tables, and they match the reference field by field.
  - **No engine code changed.**

## Checks

- **Reference:** 42 unit tests pass, 5 more than in M5a. All 56 cases match `generate.py --check`, and the 51 locked cases are unchanged.
- **Engine:** 714 tests pass, 41 more, because its tests run every case.
- **Dashboard:** 170 tests pass. The new one loads 12g's events into the rounds editor and gets them back exactly.
- **Typecheck and build:** clean.

## CI and permissions

- **No changes to `.github/workflows/`.**
- **`.claude/settings.json`:** still changed locally, with the `cases/` edit rule lifted, and **not committed**.
- **`cases-locked`** fails on this PR until you add `unlock-cases`.

## Assumptions added

- **X13, X14 and X15:** confirmed in your M5b answers.
- **X16:** new, for you to check.

## Decisions I made, for you to check

1. **X16,** above.
2. **12g's unissued pool is 500,000 shares, not case 12's 1,000,000.** The pool event takes a percentage, and 10% gives a round 1,000,000 before the grants. A pre-money SAFE's count leaves the pool out at a sale, so no figure depends on it.
3. **Several paid in full together get one reason.** That covers SAFEs' Cash-Out Amounts and notes' repayments. The reason lists them under `securities`. With one, the reason is unchanged, so no locked case's reasons changed.
4. **`liquidity_capitalization_counts_safes`** is a new report field for cases with several SAFEs. It lists the SAFEs the count includes at the top of the range.
5. **The terms of Y's SAFE in 12f and Y's note in 13g** were chosen so both switch inside the range, at different exit values, with Y first.

## Carried to M5c

Your answers for 9b, 9c, 10b and 22 will become ASSUMPTIONS entries when M5c writes those cases:
- **Dividends on conversion:** paid in cash in the series' own tier, with (b) recorded and refused.
- **A carve-out alongside preferences:** it joins the senior tier, with the reason it doesn't join the junior one.
- **Compounding:** the two details you agreed, with notes still refused.
- **The warrants event:** built as proposed.

After M5c, the build PRs follow as M5d (warrants) through M5l (the payments view and `review-m5.md`).

## Open questions

None beyond X16. M5c is next. I'm stopping here.
