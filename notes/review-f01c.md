# Review: f01c (the fund engine, second half: breakpoints)

Branch `f01c-fund-breakpoints`, from main after #98. The fund engine now finds every X where the split bends, with F15's reasons.
- **Not in this step:** nothing on the page, and the package is still private.
- **Unchanged:** nothing in `packages/fund/cases`, `packages/engine`, `apps/`, `reference/` or `cases/`. `git diff origin/main` over them is empty.
- **CI and permissions:** no change to `.github/` or `.claude/` this step.

## 1. What changed

### The first commit: a fund built by hand is never cached (your f01b finding)

- **The problem:** the split kept each fund's ledger on first use. A `Fund` built by hand isn't frozen, so editing it afterwards gave stale answers.
- **The fix:** `readFund` now records the funds it returns, which are frozen, and the split keeps the ledger only for those. Anything else is worked from scratch on every call.
- **`cache.test.ts`** does what you did:
  - It builds a fund with one $5,000,000 call and splits $12,500,000: the GP has $1,500,000.
  - It pushes a second $1,000,000 call onto its `cashFlows` and splits again: $1,300,000, as a fresh read gives.
  - A read fund keeps its answer and refuses the push.
  - Without the fix, the first test fails.

### Breakpoints (`packages/fund/src/breakpoints.ts`, `reasons.ts`)

**`findBreakpoints(fund)`** gives every X above 0 where the split bends, in order. Each is `{ x, reasons }`, X's own tier's reason first, then the clawback's.

**X's own tiers, from their sizes.** X's run starts where the fund stands at D. The tiers' sizes, one after another:
- **Capital:** the LPs' capital still out (F5).
- **Pref:** the pref accrued and unpaid (F6).
- **Catch-up:** (c × profit − the GP's carry) ÷ (s − c), the dollars that bring the GP to c of the profit (F8).
- **Each carry step:** (next multiple × paid-in − the LPs' to date) ÷ (1 − rate), the dollars that bring the LPs to the next step (F9–F11).

Each tier ends where those sizes add up to. Dividing by 1 − g gives dollars of X, since the GP commitment's share is outside the tiers (F3). A tier with nothing to pay has no end of its own, so where a tier ends and the next is empty, only the tier that ended is named (FA7).

**The clawback, when X is final (FA10).** Owed is carry paid less entitlement, when positive (F12).
- **Carry paid** bends where X's tiers end.
- **The entitlement** bends where the run on the fund's totals ends a tier. That run is sized the same way from zero: all paid-in as capital, the hurdle pref, its amount everything that ran the tiers before X plus X's share. Its ends at or before X = 0 are behind it.
- **Between those points,** carry paid less entitlement is a straight line. Its slope is (1 − g) × (X's GP rate − the totals' GP rate), each 0 in capital and pref, s in a catch-up, and the step's rate in carry.

So the clawback's breakpoints are found from those points alone:
- **Where it reaches zero:** at a tier end, or inside a stretch at the line's root.
- **Where its slope changes** while something is owed.

**The reasons:**
- **`cleared`:** owed below, nothing above.
- **`starts`:** the reverse, which v1 can't produce (FA9).
- **`changes`:** owed both sides, a different slope.
  - It names the totals' run as the cause only where that run's GP rate changes there (FA8). Otherwise X's own tier reason sits beside it.
  - A rising clawback isn't worded, and the engine throws if it ever sees one. v1 can't produce it.
- **A point with nothing to report** isn't a breakpoint (FA8): a tier end in the totals' run while nothing is owed, or the line rising from below zero to zero.

**The wording** is FC6's:
- dollars without cents when whole
- rates as percents
- multiples to one place
- an "a/b" rate or multiple shown as a fraction, as the reference writes it

`reasons.ts` holds the `Reason` type, a union by code with FC5's fields as Decimals (`amount`, `rate`, `carry`, `lpMultiple`, `change`, `fundTotals`), and the wording.

**Different from the reference's method.** The reference grids, bisects and intersects fitted lines; the engine never searches. Each finds every breakpoint its own way, so they check each other.

**`waterfall.ts`** gains `standingAtD`, for inside the package only. One helper now builds where a run starts, for both the split and the breakpoints.

### Tests: 263, up from 223

- **`breakpoints.test.ts`:**
  - each case's list of breakpoints, to the cent, and no others
  - all 25 breakpoints of the 13 cases, each within 10⁻²⁰ of its exact value (FC8), with its reasons' codes, FC5's fields (numbers within 10⁻²⁰) and FC6's text, exactly
- **`cache.test.ts`:** the two tests above.
- **`api.test.ts`** now pins `findBreakpoints` too.

**Each test was checked to fail.** Two deliberate breaks were caught:
- **A catch-up sized ÷ s** instead of ÷ (s − c) failed 8 tests.
- **Never naming the totals' run as the cause** failed case 13's breakpoint at $15,000,000.

### Compared with the reference, beyond the cases

Not committed: scripts ran random funds through the reference's search and the engine. The generator is wider than the reference's own test:
- up to four carry steps
- rates of 10% to 25%
- multiples by halves
- catch-ups of 50% to 100%
- GP commitments with every toggle
- up to nine cash flows, 60% of funds final, some with a NAV

| Batch | Funds | Final | Breakpoints | Reasons | The clawback's | Differ | Largest difference in x |
|---|---:|---:|---:|---:|---:|---:|---|
| Seed 303 | 300 | 171 | 661 | 732 | 111 | 0 | 2×10⁻³² |
| Seed 404 | 2,000 | 1,232 | 4,409 | 4,849 | 693 | 0 | 10⁻³¹ |

Every breakpoint matches: its exact value, its codes, its fields and its text. In the larger batch, 35 of the 238 clearings fall inside a stretch rather than at a tier end, which no case has.

## 2. Exports

New, and provisional until the naming review:

| Export | What it is |
|---|---|
| `findBreakpoints(fund)` | Every X above 0 where the split bends, in order, with its reasons (F15). |
| type `Breakpoint` | `x` (a Decimal) and `reasons`. |
| type `Reason` | A union by `code`: `capital_returned` (`amount`), `pref_met` (`rate`, `amount`), `catch_up_done` (`carry`), `carry_step` (`lpMultiple`, `rate`), `clawback_cleared`, `clawback_starts`, `clawback_changes` (`change`, `fundTotals`, null when X's own tier is the cause). Each has `text`. |
| type `ReasonCode` | Its seven codes. |
| type `TierReasonCode` | The four tier codes: `fundTotals`'s values. |
| type `ClawbackChange` | `starts_to_fall`, `stops_falling`, `falls_faster`, `falls_more_slowly`. |

The rest is as in f01b: `readFund`, `splitAt`, `splitAtNav`, `FundRefusal`, `D`, `toCents`, and their types.

## 3. Assumptions

- **FA13 and FA14** are marked confirmed (your f01b answers).
- **FA15, new:** two breakpoints within 10⁻¹⁸ of a dollar are one point. A tier smaller than that has nothing to pay. Carry paid less entitlement that close to zero is zero.
  - **Why it's safe:** at 40 digits, two ways of working out one exact amount agree to about 10⁻³⁰. Two different breakpoints can't come within 10⁻¹⁸ while their denominators multiply to under 10¹⁸.
  - **Spillpoint's engine** uses 10⁻¹² for its ties (E14). This is finer, since nothing here chooses between equals.

## 4. Moving an earlier distribution instead of X (for the portfolio view, not built)

f01c is for X only. Here's what moving one earlier distribution, Y on its own date, would take, every other cash flow fixed.

**Why it's harder than X.**
- **X comes last,** so its tiers start from one fixed standing.
- **Y sits in the middle,** so everything after it depends on Y:
  - **Every later distribution's tiers** start from a standing that moves with Y: the capital returned, the pref paid, the LPs' and GP's to date, the profit.
  - **The pref accrued after Y** moves with it, since unreturned capital is paid-in less what Y returned.
  - **F12's hurdle balance** on each later stretch is max(0, paid-in less everything distributed), with a floor that Y can push it onto or off.

**It stays exact.** Each of those is a min, a max or a sum of straight lines in Y, and every division is by a constant. So every amount is still piecewise linear in Y, with exact breakpoints. Moving a distribution's date wouldn't be: that's F14's later item, a curve.

**What it would add:**
- **New breakpoints:**
  - where Y's own tiers end, as for X
  - where each later distribution's tier ends cross: Y returns enough capital that a later distribution's capital tier empties, or pushes the LPs past a step earlier
  - where a later stretch's hurdle balance reaches zero
  - the clawback's, from all of them
- **New spec:**
  - an F14 sibling for the moved flow's axis: is X still there, or none?
  - F15 reasons for a later distribution's tier, with words, such as "the 2024-05-01 distribution's carry starts at 25%"
  - F16 outputs for every distribution, not just X
- **New cases,** worked by hand.

**The engine.** `segments` sizes one run's tiers from a fixed start, which is why X needs nothing more. For Y, the ledger would carry each balance as a straight line in Y (a + bY) on the current stretch, and replay the flows once that way. The rule for each later distribution's tiers would give its tier sizes as lines too, and so where each one runs out. The nearest of those is the next breakpoint; replay from there and repeat. The clawback's sweep over kinks and slopes, as f01c does it, carries over unchanged.

**The reference.** Its search generalises with less work: the signature becomes every distribution's marginal tier, plus each later stretch's hurdle floor and the clawback's sign.

Nothing in f01c stands in the way. `segments` and the clawback's sweep take a start and a list of kinks, not X itself.

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   The fund package has 263 tests. The engine's 3,115 and the page's 673 are unchanged.
2. **Case 13's three breakpoints, from the engine:**

   ```bash
   cd packages/fund && node -e '
   import("./src/index.ts").then(({ readFund, findBreakpoints, toCents }) => {
     const { fund } = JSON.parse(require("fs").readFileSync("cases/fund-13-clawback-steps/inputs.json"));
     for (const b of findBreakpoints(readFund(fund))) console.log(toCents(b.x), b.reasons.map((r) => r.text).join(" / "));
   })'
   ```

   It prints:

   ```
   10000000.00 LPs have their $20,000,000 of paid-in capital back / the clawback owed stops falling
   15000000.00 the clawback owed starts to fall: on the fund's totals, LPs reach 2.0x: carry is 30% from here
   15937500.00 LPs reach 2.0x: carry is 30% from here / the clawback owed stops falling
   ```
3. **The cache fix:** `cache.test.ts` is your sequence: build, split, push a call, split again.

## Open questions

1. **FA15:** 10⁻¹⁸ of a dollar for the same point. Fine?
2. **A rising clawback:** the engine throws a plain Error if it ever sees one. v1 can't produce it (FA9), so no input reaches it. Keep it as a guard, or drop it?
3. **The portfolio view (§4):** when it comes, should X stay on D beside the moved distribution, or is the moved one the only variable?
