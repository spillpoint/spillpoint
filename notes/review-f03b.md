# Review: f03b (classes and later closes in the engine)

Branch `f03b-fund-classes-engine`, from main. The second step of spillpoint-fund 0.3.0: the engine reads classes and closes (F28), runs each class's account on its own and settles its clawback (F23, F24), finds each account's breakpoints (F27), and works out the equalization (F25).

## 1. The names, proposed first

This section is the branch's second commit, after the assumptions' statuses and before any code builds on the names. They're stable from 0.3.0. They follow your suggestions, and use the engine's existing names where the idea is the same: camelCase mirroring the input, `Lp` as a word, and a type for each object the API hands back.

**On the fund, mirroring the input:**

```ts
interface FundTerms {
  // …the 0.1.0 fields, unchanged
  /** F22: the fund's standard management fee rate; null when the terms don't give one. */
  feeRate: D | null;
  /** F25: the equalization interest rate, simple, a year; null when the terms don't give one. */
  equalizationRate: D | null;
  /** F22: the classes, in the input's order; empty when there are none. */
  lpClasses: LpClass[];
}

interface LpClass {
  /** As written (FA27). */
  name: string;
  /** Its own fee rate, or null for the fund's fees. */
  feeRate: D | null;
  /** Its own carry, as the fund's carry is: one step for flat. Null for the fund's carry. */
  carry: CarryStep[] | null;
}

interface Lp {
  name: string;
  commitment: D;
  /** F22: its class's name, or null for the fund's terms. */
  class: string | null;
  /** F25: its close as the input gives it, or null. A close on or before the first call is in from the start. */
  close: string | null;
}
```

Deeply frozen like the rest of the fund.

**On the split, from `splitAt` and `splitAtNav`:**

```ts
interface Split {
  // …the 0.1.0 and 0.2.0 fields, unchanged. The fund's amounts are the accounts' sums (F23, FA23).
  /** F26: each account's own split, the fund's terms first; with two or more accounts, empty otherwise. */
  byAccount: AccountSplit[];
}

interface AccountSplit {
  /** Its class's name, or null for the fund's terms. */
  class: string | null;
  /** Its part of X, and its to date, by tier with its own steps. Its gpCommitment is zero: that line is the fund's. */
  distribution: Tiers;
  toDate: Tiers;
  /** Its LPs' paid-in. */
  paidIn: D;
  /** F6's pref accrued to D on its own unreturned capital; null without a pref. */
  prefAccrued: D | null;
  /** F10: its LPs' distributions to date after carry, over its paid-in. */
  lpMultiple: D;
  /** F24: its own clawback when final or at the NAV point; null otherwise. */
  clawback: Clawback | null;
}

interface StepCarry {
  // …rate, fromLpMultiple, amount, lps, unchanged
  /** The account the step belongs to: its class's name, or null for the fund's terms. */
  class: string | null;
}

interface LpAmounts {
  // …name, commitment, share, paidIn, distribution, toDate, clawback, unchanged in name
  /** Its class's name, or null. */
  class: string | null;
  /** Its close as the input gives it, or null. */
  close: string | null;
}
```

- **The split's carry by step** (`distribution.gp.carry`, `toDate.gp.carry`) lists every account's steps, the fund's terms first, each with its `class` (F26). With one account it's that account's steps, as before.
- **`LpAmounts.share` stays F19's,** its commitment over all the LPs' commitments, as the case files have it. Its `paidIn`, `distribution`, `toDate` and `clawback` are its part of its account's: the account's amount times its commitment over the account's commitment.
- **`AccountSplit.prefAccrued` is one more than your list.** It mirrors the split's own `prefAccrued`, it's what an account's `pref_met` reason names (F27), and the case files give it for each account.

**On a breakpoint:**

```ts
// Every Reason gains:
/** The account whose tier or clawback it's about: its class's name, or null for the fund's terms. */
class: string | null;
```

- **With two or more accounts,** the text starts with the account's name, "Fund terms" or the class's (F27). A clawback change the run on the totals causes says "on its own totals".
- **With one account,** the text is as before. `class` is that account's: null without classes, or the class's name when every LP is in one class (FA22).

**The equalization, once for the fund:**

```ts
/** F25, F26: the fund's equalization, or null when no LP joins at a later close. */
function equalization(fund: Fund): Equalization | null;

interface Equalization {
  /** The equalization interest rate. */
  rate: D;
  /** Each later close, in date order. */
  closes: LaterClose[];
  /** Every LP, in the input's order: its four amounts over all the closes. */
  lps: EqualizationAmounts[];
}

interface LaterClose {
  date: string;
  /** The names of the LPs joining at it, in the input's order. */
  joining: string[];
  /** Every LP in by then, in the input's order. */
  lps: EqualizationAmounts[];
}

interface EqualizationAmounts {
  name: string;
  /** Paid in at its own close. */
  capitalPaid: D;
  /** Got back at a later close. */
  capitalReturned: D;
  interestPaid: D;
  interestReceived: D;
}
```

- **With no later close it gives null,** as `splitAtNav` does without a NAV, so "does this fund have an equalization" is one check. The case files likewise have no `equalization` then.
- **Every amount is exact,** at 40 digits.

**The package's runtime exports** gain one, `equalization`: eight in all. The new types are exported as types: `AccountSplit`, `Equalization`, `EqualizationAmounts`, `LaterClose` and `LpClass`.

**The new input terms** are F28's: `lp_class_name_repeated`, `lp_class_unknown`, `lp_close_after_distribution` and `call_without_payers`.

**One PR, not two.** The engine's changes run end to end: the cases' split, breakpoint and equalization tests all need the accounts, and the engine's suite has one pending list. Split in two, f03b1 would have left cases 22 to 28 half run. The code and tests come to about 1,330 lines added and 280 taken out: 840 and 220 of them the engine's source, in four parts you can read one at a time (§2 to §5), and the rest tests.

## 2. `readFund` reads classes and closes (`packages/fund/src/input.ts`, `model.ts`)

F28's refusals in its five stages, in FA25's order, each through `FundRefusal`:
- **Stage 1:** a class's keys, its carry's among them. A rate given as an object is left to stage 2's `bad_number`.
- **Stage 2:** after the fund's own terms, `fee_rate` (above 0), `equalization_rate` (0 or more), then each class: its shape, its name, the name repeating, its fee rate (its own number before the fund's rate is looked for), its carry with F9's refusals at its own path, its carry against the catch-up.
- **Stage 4:** after F21's checks, an LP's `class` (text, then a class's name, compared exactly) and its `close` (a date, then before the first distribution and D).
- **Stage 5, new:** a later close needs `equalization_rate`; then each call in F4's order needs an LP in the fund at its date with a weight above 0.

The fund mirrors the input as §1 has it, deeply frozen. Null is left out for every new field, except a class's carry (FA24).

## 3. The split, account by account (`packages/fund/src/waterfall.ts`)

- **The accounts (F23, FA22):** the fund's terms first, when any LP is on them, then each class an LP names, in `lp_classes`' order.
- **Each account has its own ledger,** replayed over the fund's cash flows. Its part of each call is the LPs' part times its weight over all the LPs': commitments for investment and expense calls, fee weights for fee calls. Its part of each distribution is by commitment. All multiplied first (FA34).
- **Each runs the tiers on its own** with its own carry, and the fund's pref and catch-up: the same `runTiers` as 0.2.0, given the account's terms instead of the fund's.
- **The fund's split is the accounts' sums,** the GP commitment's line beside them. Its carry by step lists every account's steps, each with its `class`. Its clawback sums each account's, the owed floored first (F24, FA23).
- **With one account,** it takes every amount whole, unscaled. That's why cases 01 to 21 come out digit for digit as before: every split test on them passed before I touched a test.
- **Each LP's amounts** are its account's times its commitment over the account's, multiplied first. Its `share` is F19's.

## 4. `findBreakpoints`, by account (`packages/fund/src/breakpoints.ts`)

f01c's method, account by account:
- **Each account's tiers are sized from where it stands at D,** and the run on its own totals from zero.
- **Each end is turned into dollars of X:** X less the GP commitment's share, times the account's part.
- **Where the clawback bends:** where the account's carry paid less entitlement reaches zero, or changes slope, as before.
- **Points from different accounts within FA15's tie are one breakpoint,** the fund's terms' reasons first, then the classes' in the input's order (F27).
- **The wording:**
  - With two or more accounts, every reason's text starts with its account's name, and a clawback change the totals' run causes says "on its own totals".
  - With one account, as before.
  - The new words are in `stable-names.ts` with the rest: `named`, `clawback_changes_on_own_totals` and `FUND_TERMS`.

## 5. `equalization(fund)` (`packages/fund/src/equalization.ts`, new)

Worked from F25's rule:
1. **The calls as the fund made them:** each paid by the LPs in at its date (FA21).
2. **At each later close, in date order,** every earlier call rebalanced among the LPs in by then. The joiners pay in their parts; the LPs already in get back the difference.
3. **Interest:** each joiner pays the rate on its part for the call's days. Each LP already in receives the rate on what it gets back, for the same days. That's what FA30 shows the pro rata share comes to; the reference shares it out instead, so the two check each other (FA35).

It gives null with no later close (FA37). A fund built by hand with a later close and no rate is refused there, as `readFund` would refuse it (FA33).

## 6. The engine's tests

**The pending list is empty,** so every case runs:
- **`split.test.ts`:**
  - every point of cases 22 to 28, each to the cent, the fund's steps named by class
  - each account's distribution, to date, paid-in, pref, multiple and clawback
  - each LP's class and close
  - the accounts adding up to the fund
- **`breakpoints.test.ts`:** every breakpoint at its exact value, each reason's code, fields, text and `class`. For a one-account case the class is that account's (FA36).
- **`equalization.test.ts`, new:** every close's date, joiners and amounts, and each LP's over all of them, to the cent and within FA15 of exact. Null for the cases without a later close.
- **`read.test.ts`:**
  - the twenty fund-27 refusals
  - reading the classes, closes and rates, frozen
  - FA24's nulls, FA25's order in each stage, FA27's exact names, FA31's close on D, and stage 5 last
- **`api.test.ts`:** the eight exports, and every new field's name: §1's, as settled.
- **`stable-names.test.ts`:** the four input terms and the new wordings, in STABLE.md and the README.
  - Every reason on 300 random funds with classes is named exactly when there are two or more accounts.
  - "On its own totals" appears exactly then.
- **`cache.test.ts`:** a fund built by hand as 0.2.0 built one splits as one without classes (FA33).
- **Two random tests in `split.test.ts`:**
  - on 200 funds with classes and closes, the accounts add up to the fund, each LP's amounts to its account's, and every close balances
  - on 100 funds, every LP in a class on the fund's terms gives the same fund amounts as no LPs at all (F23)
- **A generator for them,** `randomClasses`, in `test/support/random.ts`:
  - one to three classes, with fee rates and carry, "0" and steps among them
  - two to six LPs
  - later closes, some on a call's date

The fund package has 1,046 tests, 745 before: 1,040 pass, and 6 are skipped by design, as before.

## 7. The engine against the fund reference, beyond the cases

Scripts in my scratch folder, not committed:
- **400 random funds** from `randomClasses`, a quarter of them with fraction commitments, at three Xs each plus every breakpoint and NAV point, run through the reference and the engine.
  - **What they covered:** 2,502 points and 92,861 amounts to the cent; 8,715 LP rows within 10^-18 of exact; 1,199 breakpoints with 1,859 reasons; 334 funds with two or more accounts; 353 later closes and 8,984 equalization amounts.
  - **The reasons:** 1,725 are named, and 87 say "on its own totals".
  - **The result:** no differences. Four errors planted in a copy of the reference's output were each caught.
- **4,400 inputs with one fault each,** 28 kinds, in a class, an LP's class or close, or the two rates. The engine and the reference give the same kind, term and path on every one, and 194 that neither refuses.
  - **What the faults reached:** every F28 refusal, `bad_field` and `missing_field` at each new path, and unsupported keys on a class and an LP.

**Two edges, recorded under "Known edges" rather than changed:**
- **Keys that look like whole numbers** reach a class's keys now, as they did `terms` and an LP's. `{"name": "A", "pref": "x", "3": "y"}` gives `3` from the engine and `pref` from the reference. Both refuse it.
- **A class named "Fund terms"** (FA28): its reasons read "Fund terms: …" like the fund terms' own. `class` tells them apart: null for the fund's terms, "Fund terms" for the class.

**And one I found myself, FA38.** A class paying no fees, in a fund whose calls are all fee calls, has nothing paid in. Every step's threshold is then a multiple of zero, so its carry is at its top rate from its first dollar, and the reference agrees. Its `lpMultiple` would be 0/0 with nothing distributed, which decimal.js gives as NaN, so it's Infinity: past every step. Open question 1.

## 8. STABLE.md, the README and the assumptions

- **STABLE.md:**
  - the four input terms, from 0.3.0
  - what `bad_number`, `bad_date`, `bad_field`, `missing_field`, `carry_rate_not_below_one`, `steps_out_of_order` and `catch_up_share_not_above_carry` now cover
  - a class's unsupported fields
  - every reason's `class`
  - the new wordings: "on its own totals", "{account}: {reason}" and "Fund terms"
- **The README:**
  - **Inputs:** a bullet with an example for the classes, closes and two rates.
  - **API:** the new fields on the fund, `byAccount`, each LP's `class` and `close`, each reason's `class`, and `equalization`.
  - **"Stable from 0.1.0":** the terms and wordings, as STABLE.md has them.
  - **Left for f03d's release, as f02b left them:**
    - the worked example
    - "What it covers", which still says 0.2.0
    - "What it doesn't model yet", which still lists later closes and side-letter breaks, and says an LP's other fields are refused
    - "How it's tested", whose counts are 0.2.0's
- **ASSUMPTIONS.md:**
  - the statuses you asked for, in the first commit
  - FA33 to FA38, new (below)
  - the two known edges

## 9. The page (`apps/fund`)

- **The guard, in `src/file.ts`,** as f02b's was. Until f03c, a file is refused, the fund on the page kept, with "This file has LP classes or later closes; the page shows them from the next version.", when its fund gives any of:
  - `fee_rate`, `equalization_rate`, or `lp_classes` other than null or an empty list
  - an LP with a `class` or `close`

  It runs before the engine reads the file, so a save can't drop them. f03c removes it, and the code says so.
- **One more line in `src/App.tsx`, beyond the guard.** The blank fund's terms are typed `FundTerms`, which now has `feeRate`, `equalizationRate` and `lpClasses`. So the page didn't typecheck until they were given, as null, null and an empty list. It changes nothing the page does. You said one guard only; this is the one other line, open question 2.
- **Two tests in `test/file.test.tsx`:**
  - opening case 22's file gives the line and keeps the fund
  - each new field gives it, in a saved file or a bare input, case 25's later close included; null and empty open
- **Checked on the running page** (`fund-page`, port 5174), through its file input:
  - case 22's file and a later-close file each give the line under the masthead, the example fund kept
  - case 22's fund without its class opens
  - no console errors
- **The page's pending list stays** until f03c.

The page has 330 tests, 328 before.

## 10. CI and permissions (hard rule 9)

- **Nothing in `.github/workflows/` or `.claude/` is in this PR.**
- **No case files change,** so `cases-locked.yml` passes without the cases label.
- **Nothing in `packages/engine`, `packages/fund/reference`, `apps/dashboard`, any cases or `reference/` changed:** `git diff --stat main -- packages/engine packages/fund/reference apps/dashboard cases packages/fund/cases reference .github .claude` prints nothing.

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   I got:
   - **The fund package:** 1,046 tests, 745 before; 1,040 pass and 6 are skipped by design.
   - **The fund page:** 330, 328 before.
   - **Unchanged:** the engine's 3,177 and the main page's 680.
   - **The fund reference:** 64 unit tests, and all 28 fund cases matching it.
   - **Spillpoint's reference:** its 73 and its cases.
2. **Case 28's clawback by class, its breakpoints, and case 26's equalization, from the engine:**

   ```bash
   node --input-type=module -e 'import { readFileSync } from "node:fs"; import { equalization, findBreakpoints, readFund, splitAt, toCents } from "./packages/fund/src/index.ts"; const read = (c) => readFund(JSON.parse(readFileSync(`packages/fund/cases/${c}/inputs.json`, "utf8")).fund); const f28 = read("fund-28-classes-clawback-steps"); for (const a of splitAt(f28, "0").byAccount) console.log(a.class ?? "Fund terms", "owes", toCents(a.clawback.owed)); for (const b of findBreakpoints(f28)) console.log(toCents(b.x), b.reasons.map((r) => r.text).join("; ")); for (const m of equalization(read("fund-26-closes-and-classes")).lps) console.log(m.name, toCents(m.capitalPaid), toCents(m.capitalReturned), toCents(m.interestPaid), toCents(m.interestReceived));'
   ```

   It prints:
   - **The clawback:** the fund terms owe 1925000.00 and Seed LPs 450000.00.
   - **The breakpoints:**
     - 10000000.00 with its four reasons
     - 15000000.00: "Fund terms: the clawback owed starts to fall: on its own totals, LPs reach 2.0x: carry is 30% from here"
     - 15937500.00
   - **Case 26's equalization rows:** Alder 0.00 1533333.33 0.00 32876.71; Birchwood 700000.00 416666.67 10356.16 11260.27; Cedar 1250000.00 0.00 33780.82 0.00.
3. **On the page,** `pnpm --filter @spillpoint/fund dev`:
   - **Open** `packages/fund/cases/fund-22-classes-fee-carry/inputs.json` with "Open a saved fund". It's refused in one line, and the fund on the page stays.
   - **Open** case 19's `inputs.json`: it opens as before.
4. **Nothing outside the step moved:** the `git diff --stat` in §10 prints nothing.

## Assumptions added

- **Confirmed, as you asked:** FA16 (f01e review), FA20 (f02b review), and FA23, FA25 to FA27, FA30 to FA32 and FC12 (f03a review).
- **New:**
  - **FA33:** a fund built by hand without 0.3.0's fields
  - **FA34:** how an account's part of each flow is worked
  - **FA35:** the interest received worked as the rate on what's got back
  - **FA36:** a reason's and a step's `class` with one account
  - **FA37:** `equalization` null without a later close
  - **FA38:** an account with nothing paid in
- **Known edges:** the integer-key edge reaching a class's keys, and a class named "Fund terms".

## Open questions

1. **FA38, an account with nothing paid in:** a class paying no fees in a fund whose calls are all fee calls. The rules put its carry at its top rate from its first dollar, every threshold being a multiple of zero, and its multiple reads Infinity. That's F10 and F11 taken literally, and the reference agrees. Fine for so odd a fund, or should it be refused?
2. **The line in `App.tsx`:** the blank fund's terms needed the three new fields to typecheck. The other way is to make the new `FundTerms` fields optional in TypeScript, but you kept 0.2.0's `lps` required. Is the one line all right?
3. **The names (§1):** `AccountSplit.prefAccrued` is one more than your list. With one account, a reason's and a step's `class` is that account's, null without classes (FA36). Both fine?
4. **`equalization` gives null without a later close (FA37),** rather than an object with no closes. Fine?
5. **The README's out-of-date sections** ("What it covers", "What it doesn't model yet", "How it's tested") wait for f03d, as f02b's did. "What it doesn't model yet" says later closes and side-letter breaks are refused, which is no longer so on main. Leave them for the release?
