# Review: f01b (the fund engine, first half: reading and the split)

Branch `f01b-fund-engine`, from main after #97. The fund engine reads a fund's input or refuses it, and splits a distribution X on D.
- **Not in this step:** no breakpoints yet (f01c), nothing on the page, and the package is still private.
- **Unchanged:** nothing in `packages/fund/cases`, `packages/engine`, `apps/`, `reference/` or `cases/`. `git diff origin/main` over them is empty.
- **CI and permissions:** no change to `.github/` or `.claude/` this step.

## 1. What changed

### The first commit, from your f01a answers

- **SPEC.md, F15:** `clawback_starts` now says "v1's terms can't produce it (FA9); it's kept for later terms."
- **ASSUMPTIONS.md:** FA1 to FA12 and FC1 to FC8 are marked "Confirmed (f01a review)", with that status added to the legend. FA9 notes F15 keeps `clawback_starts`.

### The engine (`packages/fund/src`)

Written from SPEC.md and FA2, not ported from the reference. The reference stays the independent check.

- **`input.ts`, `readFund`:** reads the input as SPEC.md describes it, or throws a `FundRefusal`.
  - **The order of checks** is FA2's: unsupported terms first, then the fields in the spec's order, then the cash flows against each other and D.
  - **null** is FA3's: the same as left out, except `carry`.
  - **The cash flows** come back in F4's order, each keeping its place as listed (FA12).
  - **The fund it returns is frozen,** so the split can keep what it works out for it.
- **`errors.ts`, `FundRefusal`:** one error class for every refusal, as spillpoint's ImportRefusal, with `kind`, `term` and `field`. The message says what's wrong in plain words.
- **`waterfall.ts`:**
  - **`splitAt(fund, x, { final })`** splits X, one more distribution on D after every earlier cash flow (F14).
  - **`splitAtNav(fund)`** splits at NAV, final by definition.
  - **How it works:**
    - **The ledger:** each cash flow is replayed once per fund in F4's order, against the running balances (F1). The result is kept for that fund.
    - **Calls:** the GP commitment pays its part by kind (F3).
    - **Distributions:** each runs capital, pref, catch-up and carry by step (F5, F6, F8 to F11) from where the fund stands.
    - **The pref** is r × Σ(unreturned capital × days) ÷ 365: one division, nothing rounded in between. F12's hurdle pref is worked the same way beside it.
    - **A carry step** ends where the LPs reach the next multiple: (multiple × paid-in − LPs) ÷ (1 − rate) dollars on. The step then advances explicitly, so 40-digit rounding can never loop.
    - **When final:** the tiers run once on the fund's totals for the entitlement (F12, FA1, FA5). The clawback owed is carry paid less that, when positive.
- **`dates.ts`:** whole days by integer calendar arithmetic, not JavaScript's Date. A date must exist and be in years 1 to 9999, as the reference reads them.
- **`decimal.ts`:**
  - the 40-digit `D`
  - FC1's exact strings
  - `toCents`, for showing only (FA14, §3)

Nothing is rounded inside.

### Tests (`packages/fund/test`): 223, up from 83

- **`split.test.ts`, every point of every fund case to the cent (FC8):** 60 points, 1,020 amounts.
  - **What's compared:**
    - X and the fund to date, every tier, the GP commitment's line and each carry step
    - the paid-in and the pref to D
    - when final or at NAV, the carry paid, the entitlement, the owed and the totals' pref
  - **Breakpoints** are evaluated at their exact values.
  - **Tiers the terms don't have** are checked to be zero.
  - **NAV:** `splitAtNav` matches the NAV point, and gives null without a NAV.
- **`read.test.ts`:**
  - all 15 refusal fixtures, each with the case's kind, term and field
  - defaults, the null rule, F4's order and the frozen fund
  - 22 more refusals the fixtures don't reach: a catch-up share of 0, a carry given as a JSON number, year 0, 29 February 2019, falling multiples, a distribution with a kind…
  - unsupported terms before anything else, and FA13's X
- **`decimal.test.ts`:** `toCents` half away from zero, FA14's tie, and 40 digits.
- **`api.test.ts`:** pins the exports.
- **`cases.test.ts`:** unchanged from f01a: the case files against themselves.

**Each test was checked to fail.** Two deliberate breaks in the engine were caught:
- **A 366-day year** failed 27 case tests.
- **Using unreturned capital as the hurdle balance** failed all of case 11's points.

### Compared with the reference, beyond the cases

Not committed: scripts in my scratch folder ran the reference's random funds and random one-fault inputs through both.

| Batch | Funds | Points | Values compared | Faulty inputs | Result |
|---|---:|---:|---:|---:|---|
| Seed 101 | 300 | 3,103 | 77,785 | 3,000 (2,803 refused) | every value within 2×10⁻³²; to the cent, 3 differed before FA14 and none after; every refusal the same |
| Seed 202 | 700 | 7,020 | 176,367 | 7,000 (6,461 refused) | every value within 2×10⁻³² and the same to the cent; every refusal the same |

**What's compared:**
- X and the fund to date, every tier
- the GP commitment's line
- the paid-in and the pref to D
- the carry paid, the entitlement, the owed and the totals' pref, final and at NAV

**The points:** each fund's breakpoints from the reference, X = 0, and six random X.

The first batch found FA14's edge (§3).

## 2. The exports (all provisional until the naming review before 0.1.0)

| Export | What it is |
|---|---|
| `readFund(input)` | Reads parsed JSON into a `Fund`, or throws a `FundRefusal` (F18, FA2). |
| `splitAt(fund, x, { final? })` | The `Split` of X on D. `x` is an exact string or a Decimal (FA13). `final` defaults to the fund's own. |
| `splitAtNav(fund)` | `splitAt` at NAV, final (F14); null without a NAV. |
| `FundRefusal` | The error: `kind` (`"unsupported"` or `"input"`), `term`, `field`. |
| `D` | The 40-digit Decimal (F17). |
| `toCents(amount)` | An amount to the cent, half away from zero, for showing (FC8, FA14). |
| type `Fund` | `asOf`, `distributionDate`, `final`, `nav`, `carry`, `prefRate`, `catchUpShare`, `gpCommitment`, `cashFlows`. |
| type `CarryStep` | `rate`, `fromLpMultiple` (null on the first step). |
| type `GpCommitment` | `share`, `paysFees`, `paysExpenses`. |
| type `CashFlow` | `index` (its place as listed), `date`, `type`, `kind` (null on a distribution), `amount`. |
| type `CallKind` | `"investment"`, `"fee"` or `"expense"`. |
| type `Split` | `x`, `distribution`, `toDate`, `lpsPaidIn`, `gpCommitmentPaidIn`, `prefToD` (null without a pref), `clawback` (null unless final or at NAV). |
| type `Tiers` | `amount`, `gpCommitment`, `lps` (`capital`, `pref`, `catchUp`, `carryTier`, `total`), `gp` (`catchUp`, `carry` by step, `total`). |
| type `StepCarry` | `rate`, `fromLpMultiple`, `amount`: the GP's carry at one step. |
| type `Clawback` | `carryPaid`, `entitlement`, `owed`, `prefOnFundTotals` (null without a pref). |
| type `RefusalKind` | `"unsupported"` or `"input"`. |
| type `InputTerm` | The 13 input refusal terms of F18. |

A tier the fund's terms don't have is zero in `Tiers`; the case files leave it out (FC4).

## 3. Assumptions added (New, in ASSUMPTIONS.md)

| ID | Default |
|---|---|
| FA13 | X is an exact amount from 0 up, an exact string or a Decimal. Anything else is refused as `bad_number` at the field `x`, through the same FundRefusal. |
| FA14 | `toCents` rounds to 20 places first, then half away from zero to the cent. |

**Why FA14.** At 40 digits, an amount that is exactly half a cent can land a hair below it: one random fund's carry, exactly 699,291.385, came out 699,291.38499…9 and showed a cent low. Three amounts in 77,785 did this, and no case does.
- **Why 20 places:** an exact amount with a denominator under about 10^18 can't sit within 10^-20 of a half cent without being on it, so the first rounding moves only true ties.
- **What doesn't change:** amounts stay at 40 digits; this is only how they're shown.

Spillpoint's own `toCents` rounds straight to the cent and so has the same edge. No engine case hits it, and I left the engine alone.

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   The fund package has 223 tests. The engine's 3,115 and the page's 673 are unchanged.
2. **Split a case yourself,** case 13 at X = $15,937,500, where the clawback stops falling:

   ```bash
   cd packages/fund && node -e '
   import("./src/index.ts").then(({ readFund, splitAt, toCents }) => {
     const { fund: input } = JSON.parse(require("fs").readFileSync("cases/fund-13-clawback-steps/inputs.json"));
     const s = splitAt(readFund(input), "15937500");
     console.log(toCents(s.distribution.gp.total), toCents(s.clawback.entitlement), toCents(s.clawback.owed));
   })'
   ```

   It prints `1187500.00 5281250.00 656250.00`, the case's carry paid in X, entitlement and clawback owed.
3. **A refusal:** change case 6's carry to `"1"`, and `readFund` throws a FundRefusal with `input`, `carry_rate_not_below_one` and `terms.carry`. That's fixture `carry-rate-one`.

## Open questions

1. **FA14:** OK to round to 20 places before the cent when showing an amount? The alternative is to leave `toCents` as spillpoint's and accept that a random fund can show an exact half cent one cent low.
2. **Absent tiers:** zero in the API, left out in the case files. Fine, or should the API leave them out too, as null?
3. **X's refusal (FA13):** through FundRefusal with the field `x`, though `x` isn't a field of the input. Or a separate error?
4. **`splitAt`'s `final` option beside `splitAtNav`:** both kept, since the page will want the NAV point by name. Fine for the naming review to settle?
