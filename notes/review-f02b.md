# Review: f02b (the LPs in the engine)

Branch `f02b-fund-lps-engine`, from main. The second step of spillpoint-fund 0.2.0: `readFund` reads the LPs (F21, FA17 to FA19), and the split carries each LP's amounts (F20).

## 1. The names, proposed first

This section is the branch's first commit, before any code builds on the names. They're stable from 0.2.0. They follow your suggestion, and the 0.1.0 naming review's habits: camelCase mirroring the input, `Gp` and `Lp` as words, and a type for each object the API hands back.

**On the fund, mirroring the input (`fund.lps`):**

```ts
interface Fund {
  // …the 0.1.0 fields, unchanged
  /** F19: the input's LPs in its order; empty when it has none. Deeply frozen, as the rest of the fund. */
  lps: Lp[];
}

interface Lp {
  /** As written: not trimmed or normalized (FA17). */
  name: string;
  commitment: D;
}
```

**On the split (`split.byLp`), from `splitAt` and `splitAtNav`:**

```ts
interface Split {
  // …the 0.1.0 fields, unchanged
  /** F20: each LP's amounts, in the input's order; empty when the fund has no LPs. */
  byLp: LpAmounts[];
}

interface LpAmounts {
  name: string;
  commitment: D;
  /** Its commitment over all the LPs' commitments (F19), at 40 digits. */
  share: D;
  /** Its share of the LPs' paid-in, `lpsPaidIn`. */
  paidIn: D;
  /** Its share of the LPs' total from X, `distribution.lps.total`. */
  distribution: D;
  /** Its share of the LPs' total to date, X included, `toDate.lps.total`. */
  toDate: D;
  /** Its share of the clawback owed, `clawback.owed`, zero when nothing is; null when the split has no clawback. */
  clawback: D | null;
}
```

- **Each amount is worked as the LPs' amount times the commitment, then divided by the total,** multiplying first, as you said. So `share` is reported but the amounts don't go through it. At 40 digits the two ways can differ in the last digit, never by anything a cent can show.
- **The type names `Lp` and `LpAmounts`** are exported as types, as `Split`, `Tiers` and `StepCarry` are. The package's runtime exports don't change: still the seven 0.1.0 has.
- **The case files keep their own names** (FC9's `paid_in`, `to_date`, `by_lp`), as they kept `field` beside the engine's `path` (FC7).
- **`findBreakpoints` doesn't change** (F20).
- **The new input term** is `lp_name_repeated`, as F21 settled.
