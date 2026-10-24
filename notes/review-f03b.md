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
