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

## 2. `readFund` reads the LPs (`packages/fund/src/input.ts`)

- **`lps` is a known input field,** read as a fourth stage after FA2's three (FA19), in F21's order within each LP.
- **A blank name is one `trim` leaves empty** (FA17). That's the whitespace set the reference lists character by character, checked against Node over every code point in f02a.
- **Names are kept and compared exactly as written.**
- **Any other field on an LP** is unsupported, named by its key, whatever its value (FA18).
- **`fund.lps`** is each LP's `name` and `commitment`, in the input's order, deeply frozen with the rest of the fund, and empty when the input has none.
- **`lp_name_repeated`** is on the stable list of input terms (`stable-names.ts`), with its message: "an earlier LP has this name; no two LPs share one".

## 3. The split carries each LP's amounts (`packages/fund/src/waterfall.ts`)

- **`split.byLp`,** as proposed in §1, from `splitAt` and so from `splitAtNav`.
- **Each amount is the LPs' amount times the LP's commitment, divided by all the commitments,** multiplying first, as you said (FA20, new).
  - The LPs' amounts are `lpsPaidIn`, `distribution.lps.total`, `toDate.lps.total` and `clawback.owed`.
  - `share` is given for showing, and no amount goes through it.
- **The clawback share** is zero when nothing is owed and null when the split has no clawback, as `clawback` itself is.
- **`findBreakpoints` doesn't change.**
- **A fund built by hand, as 0.1.0 built one, without `lps`,** splits as a fund with no LPs, so 0.1.0 JavaScript that builds a `Fund` keeps working. In TypeScript, `lps` is now a required field of `Fund`: open question 1.

## 4. The engine's tests

- **The engine's pending list is empty** (`test/support/cases.ts`), so cases 17 to 21 run with the rest. Its comment says so. The guard in `test/pending.test.ts` still holds every folder to "run or pending".
- **`split.test.ts`:**
  - **At every point of every case** (99 points), each LP's commitment, share, paid-in, amount from X, to date and clawback against the case's `lps` and `by_lp`. Each amount is equal to the cent and within FA15 (10^-18) of the exact value; a case without LPs gives an empty `byLp`. At the NAV point too.
  - **200 random funds with 1 to 9 LPs,** with whole, decimal and fraction commitments, at three Xs each. Each LP's amounts add up to the LPs' own within FA15, each is its share of them, the shares add up to 1, and the clawback is null exactly where the split has none.
- **`read.test.ts`:**
  - the eleven refusal fixtures, run by the existing refusal test now that the list is empty
  - beyond them, 25 tests of F21 and FA17 to FA19, as the reference's unit tests have them: null names and commitments, blank names character by character, names kept as written, other fields whatever their value, the LPs after everything else, one LP checked through before the next
- **`api.test.ts`:** pins `fund.lps`'s fields and `split.byLp`'s, as the 0.1.0 names are pinned. The runtime exports are still the seven.
- **`cache.test.ts`:**
  - its hand-built fund gains `lps: []`, which TypeScript now asks for
  - a new test splits a hand-built fund without `lps`
- **`stable-names.test.ts`** holds STABLE.md's and the README's lists to the engine's, so `lp_name_repeated` is in both (§6).

The fund package has 588 tests, 410 before.

## 5. The engine against the fund reference, beyond the cases

Scripts in my scratch folder, not committed:
- **400 random funds with 1 to 9 LPs,** the engine's fund generator plus LPs, at three Xs each.
  - **Commitments:** whole, decimal and fraction.
  - **Names:** commas, quotes, tabs, no-break and wide spaces, a byte-order mark, and characters `trim` keeps (U+001C, U+0085, U+200B).
  - **The result:** 5,979 LP rows and 21,765 amounts. Each is within 10^-18 of the reference's exact value, and equal to the cent.
- **4,800 single faults in the LPs,** twelve kinds a fund, give the same kind, term and path from the engine and the reference.

**A finding, not changed here: integer-like keys.** FA2 and FA18 take unknown keys "in the file's order".
- **What happens:** `JSON.parse` lists keys that look like integers first, whatever their place in the file. The engine never sees the file's order for them.
- **Where it shows:** with two unsupported keys, where the later one is like "2", the engine names "2", and the reference names the first in the file. Under `terms` that has been true since 0.1.0. Under an LP it's new.

| Input | Engine | Reference |
|---|---|---|
| `terms: {"carry": "0.2", "hurdle_irr": "x", "7": "y"}` | `7` at `terms.7` | `hurdle_irr` at `terms.hurdle_irr` |
| an LP `{"name": "A", "commitment": "1", "carry": "x", "2": "y"}` | `2` at `lps[0].2` | `carry` at `lps[0].carry` |

Only an input with two unknown keys, one of them integer-like, can show it, and both refuse it either way. Open question 2.

## 6. STABLE.md, the README and the assumptions

- **STABLE.md:**
  - `lp_name_repeated`, marked from 0.2.0
  - `bad_number` and `bad_field` say what they now cover for LPs
  - the unsupported terms include an LP's other fields, `carry` at `lps[0].carry`
  - names added after 0.1.0 say from which version
- **The README:**
  - **Inputs:** `lps` in the example and a bullet.
  - **API:** `fund.lps` under `readFund`, and `byLp` with its fields under `splitAt`.
  - **"Stable from 0.1.0":** `lp_name_repeated`, the LP fields as unsupported terms, and the same wording on later additions. The heading stays, since the stable-names test finds the section by it.
  - **Left for f02d's release:** the worked example, as you said; "What it covers", which says "Version 0.1.0"; "What it doesn't model yet"; and "How it's tested", whose counts are 0.1.0's.
- **ASSUMPTIONS.md:**
  - **Confirmed (f02a review):** FA17, FA18, FA19, FC9 and FC10, with your answers:
    - FA17: the engine stays exact and the page trims names (f02c)
    - FA19: the LPs last, and why
    - FC9: the LPs aren't a tier
  - **FA20 (new):** how each LP's amounts are worked, the clawback share's null and zero, and a hand-built fund without `lps`.

## 7. The page (`apps/fund`)

- **One guard in `src/file.ts`:**
  - **What it refuses:** a file whose fund lists LPs, in one line: "This file lists LPs; the page shows them from the next version." The fund on the page is kept.
  - **Before the engine reads the file:** so any `lps` that isn't left out, `null` or an empty list gets this line, even a malformed one. The engine's LP refusals never reach the page's wording before f02c words them.
  - **f02c removes it,** and the code says so.
- **Two tests in `test/file.test.tsx`:**
  - opening case 17's `inputs.json` gives that line and keeps the fund
  - a saved file or a bare input with LPs gives it too, even a list that's an object; `[]` and `null` open
- **The page's pending list stays** until f02c.
- **Checked on the running page** (`fund-page`, port 5174). Case 17's real `inputs.json`, opened through the page's file input, gives the line under the masthead, and case 13 stays loaded. Case 13's file then opens as before. No console errors.

The page has 235 tests, 233 before.

## 8. CI and permissions (hard rule 9)

Nothing in `.github/workflows/` or `.claude/`. No case, and nothing in either reference, changed: `git diff --stat main -- packages/engine apps/dashboard cases reference packages/fund/cases packages/fund/reference` prints nothing.

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   I got:
   - **The fund package:** 588 tests, 410 before.
   - **The fund page:** 235 tests, 233 before.
   - **Unchanged:** the engine's 3,177 and the main page's 680.
   - **Both references:** passing, with their cases unchanged.
2. **Each LP's share of case 19's clawback, from the engine:**

   ```bash
   cd packages/fund && node -e '
   import("./src/index.ts").then(({ readFund, splitAt, toCents }) => {
     const { fund } = JSON.parse(require("fs").readFileSync("cases/fund-19-lps-clawback/inputs.json"));
     for (const lp of splitAt(readFund(fund), "0").byLp) console.log(lp.name, toCents(lp.toDate), toCents(lp.clawback));
   })'
   ```

   It prints:

   ```
   Alder Endowment 17675000.00 1925000.00
   Birchwood Family Office 7575000.00 825000.00
   ```

3. **A third, exact:** the same with `fund-18-lps-thirds`, `"2000000"` and `lp.distribution.toString()` prints `666666.6666666666666666666666666666666667` for each of the three LPs: 40 digits, rounded only in the last.
4. **On the page:** run `pnpm --filter @spillpoint/fund dev`, click "Open a file" and pick `packages/fund/cases/fund-17-lps-three/inputs.json`. The line under the masthead reads "Couldn't open fund-17-lps-three.json. This file lists LPs; the page shows them from the next version.", and the fund you had stays. Case 13's `inputs.json` opens as before.

## Assumptions added

- **FA20 (new):** each LP's amounts worked by multiplying first; the clawback share's null and zero; a hand-built fund without `lps`.
- **FA17 to FA19, FC9 and FC10:** Confirmed (f02a review), with your answers in their text.

## Open questions

1. **`Fund.lps` is required in the TypeScript type.** `readFund` always gives it, so code that reads funds sees no change. TypeScript code that builds a `Fund` object by hand now has to add `lps: []`; JavaScript keeps working. Fine for 0.2.0, or should the type say `lps?`?
2. **Integer-like keys** (§5).
   - **Option a:** reword FA2 and FA18 to the order JavaScript gives, integer-like keys first, and change the fund reference to match.
   - **Option b:** leave it, noted as a known edge.
   - **My recommendation:** b, since only an input with two unknown keys can show it. Either way it would be a step of its own, since it touches the reference.
3. **The guard catches a malformed `lps` too,** with the same line rather than the engine's refusal. Fine until f02c?
4. **The proposed names (§1):** `Fund.lps` with `Lp`, and `Split.byLp` with `LpAmounts`. Settled for 0.2.0?
