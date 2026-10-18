# Review: f02a (the LPs: spec, reference and cases)

Branch `f02a-fund-lps-spec-and-cases`, from main. The first step of spillpoint-fund 0.2.0: each LP's share of what the LPs get (F19 to F21). No engine or page code.

**Nothing in the engine, the fund's source, the page's source, the main page, `cases/` or `reference/` changed:** `git diff --stat main -- packages/engine packages/fund/src apps/fund/src apps/dashboard cases reference` prints nothing. **The test helpers did change,** in `packages/fund/test` and `apps/fund/test`, as you said during the step (§5).

`.claude/settings.json` isn't committed: the fund cases' lock is lifted only on your machine.

## 1. The spec and assumptions

### `packages/fund/docs/SPEC.md`

From `local/fund/fund-spec-lps.md`, in the spec's own style:
- **The opening line:** F19 to F21 settled on 2026-10-18 for 0.2.0 (S1).
- **"What it answers":** one line for the LPs.
- **Inputs:** the example gains your three LPs, and a bullet for `lps` with your five points (name, commitment, no LPs, commitments only divide, the GP commitment).
- **F18's input terms:** `lp_name_repeated` added, marked F21.
- **F19, F20 and F21** after F18, as your spec has them, the order of checks included.
- **Cases:** nineteen and two sets of refusals, with 17 to 21 added.
- **Decided:** your five decisions of 2026-10-18.

The page section of your spec (the LPs tab, rounding down, the CSV) isn't copied in: the Decided list names the decisions, and the rules are f02c's. See open question 4.

### `packages/fund/docs/ASSUMPTIONS.md`

- **A new status, Settled (S1),** and a table "The LPs (S1)" with F19, F20 and F21, each "Settled (S1; Jordan)".
- **FA17 to FA19,** the choices F19 to F21 leave open (§3).
- **FC9 and FC10,** the case-file conventions for the LPs (§3).
- **FC2's last sentence** now names both refusal sets; its status says so.
- **Later:** "Per-LP accounts" now cites F19 too, with its wording: later closes and equalization, side-letter breaks, defaulted or excused LPs.

### Not in this step

**STABLE.md and the README's "Stable from 0.1.0"** don't list `lp_name_repeated` yet. A test holds both to the engine's list of terms, exactly, so adding it before the engine gives it fails CI. It goes in with f02b, which your spec gives "the stable names".

## 2. The reference (`packages/fund/reference`)

Written from `SPEC.md` alone, as before.
- **`fund_ref/inputs.py`:**
  - `lps` is a known input field.
  - A fourth stage of checks after the other three, F21's refusals in F21's order (FA19).
  - **The whitespace a blank name can have is listed exactly** (FA17). It's JavaScript's `trim` set, checked against Node over every code point, so the reference and the engine can't disagree on what's blank.
- **`fund_ref/lps.py`, new:** each LP's share, its commitment over all the commitments (F19), and its share of any one of the LPs' amounts (F20). Nothing in the waterfall reads the LPs.
- **`fund_ref/case.py`:** writes the LPs into `expected.json` (FC9) when the input has them. Without LPs, it writes exactly what it did, so cases 01 to 16 are byte for byte the same.
- **`tests/test_fund_ref.py`:** 16 new tests, 39 in all, with numbers small enough to check on paper.
  - **The amounts:**
    - exact shares that add up to 1
    - commitments that only divide, `"a/b"` ones included
    - each LP's share of X, to date and paid-in, exact
    - each LP's share of example C's clawback: $280,000 and $120,000 of $400,000
    - the NAV point's clawback in a fund whose X isn't final
    - LPs that change nothing else in the output
    - no LPs three ways
    - 50 random LP lists whose amounts add up exactly
  - **The refusals beyond the fixtures:**
    - `null` names and commitments
    - unknown fields whatever their value
    - blank names character by character, and names that aren't blank to `trim` though they are to Python
    - names kept as written
    - the order against the rest of the input, and within and between LPs
- **`README.md`:** the method gains the LPs and F21's place in the order of checks.

## 3. Decisions I made (all New, in `ASSUMPTIONS.md`)

| ID | Default |
|---|---|
| FA17 | **A blank name** is empty or nothing but whitespace, where whitespace is exactly what JavaScript's `trim` takes off. Python's `isspace` disagrees on six characters, so the reference lists the set itself. **A name that isn't blank is kept as written** and compared as written: not trimmed, case-folded or normalized. So "Alder" and "Alder " are two LPs. |
| FA18 | **An LP's other fields** are unsupported whatever their value, `null` included, as an unknown key under `terms` is. With two, the first in the file's order. A commitment is read as every number is, so `"a/b"` works. |
| FA19 | **The LPs are a fourth stage** after FA2's three: any other problem in the input comes first. So an unsupported LP field comes after everything else, though an unsupported term comes before everything. **Where F21 leaves a tie:** a missing name before a missing commitment, and the first of two unknown fields. **An LP is checked through before the next,** so a repeated name at `lps[1]` comes before a bad commitment at `lps[2]`. |
| FC9 | **The LPs in `expected.json`,** only when the input has them. At the top, `lps`: each LP's `name`, `commitment` and `share` (exact) and `paid_in`. At each point, `by_lp`: each LP's `distribution`, `to_date` and, at a point with a clawback, `clawback`. **Every per-LP amount is `{amount, exact}`:** to the cent half away from zero as every case amount is (FC8), and exact, since F20's amounts are exact and the page rounds down (f02c), which half-up cents can't give back. |
| FC10 | **The LPs' refusals** are `fund-21-lps-refused`, FC7's shape, each fixture a change to case 1. Each fixture's `about` sentence is mine; the changes and the expected refusals are yours, from `cases-lps.json`. |

**Also decided, smaller:**
- **Case 17 to 20's `description`** is your `about` from `cases-lps.json`, word for word.
- **Shares in the case files are FC1's exact strings:** `0.35` where it terminates and `11/21` where it doesn't.
- **Each LP's `name` is repeated in every `by_lp` entry,** so a point reads without looking up the order.

## 4. The cases (`packages/fund/cases`)

- **fund-17 to fund-20:**
  - `inputs.json`, written by a script from `cases-lps.json`: your `xs` and `inputs`, as `{case, description, xs, fund}`
  - `expected.json` from the reference
  - a `DERIVATION.md` worked by hand
- **fund-21-lps-refused:** your eleven changes as fixtures, `expected.json` from the reference, and a derivation of each refusal.
- **How each derivation works:** it takes the waterfall from its base case's own derivation, since F20 changes nothing else, and works the shares, each LP's amounts and its clawback by hand. Cases 18 and 20, whose amounts don't terminate, give each exact as well and say where the cents round.

**How the hand work was checked against the reference** (scripts in my scratch folder, not committed):
- **Every cell:** 330 table cells, every LP amount, total, tag, breakpoint and exact value, against `expected.json`. None differ.
  - The first run flagged five cells: my tables wrote shares as `1/2` and `7/20` where FC1 writes `0.5` and `0.35`. Same values; I changed the tables to FC1's notation.
- **Every point** in `expected.json` is in its derivation's tables, and each clawback is where the case has one.
- **The refusals:** all eleven match the kind, term and path in `cases-lps.json`.
- **Each LP case without its LPs is its base case:** the same top-level values and breakpoints, and the same values at every shared point. Case 18 adds one point, $10,000,000.01, which case 1 doesn't have.
- **Cases 01 to 16:** `generate.py --check` matches them all, and `git diff` shows none changed.

**The reference and my hand work never disagreed, and no case contradicted the spec.**

**The fund cases lock:** the Write tool worked in `packages/fund/cases` in this session, since you'd lifted it before the session started. Nothing was copied in by shell.

## 5. The pending lists (your answer during the step)

**The problem.** The engine's tests and the page's both run every case folder through the 0.1.0 engine, and the page's tests also run it through the form. Neither reads `lps` yet. So cases 17 to 21 failed 25 page tests, and the engine's tests would have failed too.

**What you chose:** an explicit pending list in the test helpers, which the 0.1.0 case runners skip, and a test that fails if a case folder is neither run nor pending, or if the list names a folder that doesn't exist.

**What I did:**
- **There are two lists, one for each suite,** since f02b empties the engine's and f02c the page's. Each says so beside it.
  - **The engine's:** `PENDING` in `packages/fund/test/support/cases.ts`. `RUN_CASES` and `REFUSAL_CASES` leave it out, so `split`, `breakpoints`, `read`, `api` and `stable-names` tests skip the five folders.
  - **The page's:** `PENDING` in `apps/fund/test/support/cases.ts`, a new helper. It also has the page's `RUN_CASES`.
- **The five page test files** that ran every folder (`chart`, `clawback`, `file`, `flows`, `terms`) now import `RUN_CASES` from that helper, in place of their own line, and drop an unused `readdirSync` import. Nothing else in them changed.
- **`pending.test.ts`, new in each suite:** every case folder is run or pending, and every pending name is a folder.
  - **On the page's side,** a folder may also be a set of refusals: the page's tests have never run those, and only the engine's do. That's a third way of being accounted for, beyond the two you named.
  - **Both guards bite:** an empty folder `fund-99-empty`, added and removed again, failed each.
- **`packages/fund/test/cases.test.ts`** (it checks the case files, with no engine code) runs every case, pending ones included:
  - nineteen runs and two sets of refusals
  - `lp_name_repeated` among the input terms
  - with no LPs, no `lps` or `by_lp`
  - for the LP cases:
    - each share is its commitment over all the commitments, and they add up to 1
    - each LP's amount is its exact rounded to the cent, and its share of the exact total
    - the exact amounts add up, to the cent, to the LPs' paid-in, total from X, total to date, and the clawback owed
    - each case is its base case, the LPs aside
  - A deliberately wrong amount for Birch at $10,000,000 in case 20 failed it; the reference then rewrote the file byte for byte.

**Nothing in `packages/fund/src` or `apps/fund/src` changed.**

## 6. CI and permissions (hard rule 9)

- **Nothing in `.github/workflows/` or `.claude/` is in this PR.**
- **`cases-locked.yml`** fails this PR until you add the cases label, as for any case step.

## 7. Each LP's amounts, to the cent

Every value below is from the case's `expected.json`, to the cent, half away from zero (FC8). The exact values are in each case's `expected.json` and `DERIVATION.md`.

#### fund-17-lps-three

| LP | Commitment | Share | Paid in |
|---|---:|---:|---:|
| Alder Endowment | 5,000,000 | 0.5 | 5,445,000.00 |
| Birchwood Family Office | 3,500,000 | 0.35 | 3,811,500.00 |
| Cedar Fund of Funds | 1,500,000 | 0.15 | 1,633,500.00 |
| **All the LPs** | | 1 | 10,890,000.00 |

**This distribution**

| X | Tags | LPs | Alder Endowment | Birchwood Family Office | Cedar Fund of Funds |
|---:|---|---:|---:|---:|---:|
| 7,000,000.00 | breakpoint | 6,930,000.00 | 3,465,000.00 | 2,425,500.00 | 1,039,500.00 |
| 20,000,000.00 | listed | 17,226,000.00 | 8,613,000.00 | 6,029,100.00 | 2,583,900.00 |
| 34,500,000.00 | listed, breakpoint | 28,710,000.00 | 14,355,000.00 | 10,048,500.00 | 4,306,500.00 |
| 40,000,000.00 | nav | 32,793,750.00 | 16,396,875.00 | 11,477,812.50 | 4,919,062.50 |
| 50,000,000.00 | listed | 40,218,750.00 | 20,109,375.00 | 14,076,562.50 | 6,032,812.50 |
| 63,833,333.33 | breakpoint | 50,490,000.00 | 25,245,000.00 | 17,671,500.00 | 7,573,500.00 |
| 80,000,000.00 | listed | 61,693,500.00 | 30,846,750.00 | 21,592,725.00 | 9,254,025.00 |

**To date**

| X | Tags | LPs | Alder Endowment | Birchwood Family Office | Cedar Fund of Funds |
|---:|---|---:|---:|---:|---:|
| 7,000,000.00 | breakpoint | 10,890,000.00 | 5,445,000.00 | 3,811,500.00 | 1,633,500.00 |
| 20,000,000.00 | listed | 21,186,000.00 | 10,593,000.00 | 7,415,100.00 | 3,177,900.00 |
| 34,500,000.00 | listed, breakpoint | 32,670,000.00 | 16,335,000.00 | 11,434,500.00 | 4,900,500.00 |
| 40,000,000.00 | nav | 36,753,750.00 | 18,376,875.00 | 12,863,812.50 | 5,513,062.50 |
| 50,000,000.00 | listed | 44,178,750.00 | 22,089,375.00 | 15,462,562.50 | 6,626,812.50 |
| 63,833,333.33 | breakpoint | 54,450,000.00 | 27,225,000.00 | 19,057,500.00 | 8,167,500.00 |
| 80,000,000.00 | listed | 65,653,500.00 | 32,826,750.00 | 22,978,725.00 | 9,848,025.00 |

**Clawback, each LP's share of what the GP owes back**

| X | Tags | Owed | Alder Endowment | Birchwood Family Office | Cedar Fund of Funds |
|---:|---|---:|---:|---:|---:|
| 40,000,000.00 | nav | 0.00 | 0.00 | 0.00 | 0.00 |

#### fund-18-lps-thirds

| LP | Commitment | Share | Paid in |
|---|---:|---:|---:|
| Alder | 1,000,000 | 1/3 | 1,666,666.67 |
| Birch | 1,000,000 | 1/3 | 1,666,666.67 |
| Cedar | 1,000,000 | 1/3 | 1,666,666.67 |
| **All the LPs** | | 1 | 5,000,000.00 |

**This distribution**

| X | Tags | LPs | Alder | Birch | Cedar |
|---:|---|---:|---:|---:|---:|
| 2,000,000.00 | listed | 2,000,000.00 | 666,666.67 | 666,666.67 | 666,666.67 |
| 5,000,000.00 | listed, breakpoint | 5,000,000.00 | 1,666,666.67 | 1,666,666.67 | 1,666,666.67 |
| 10,000,000.01 | listed | 9,000,000.01 | 3,000,000.00 | 3,000,000.00 | 3,000,000.00 |
| 12,500,000.00 | listed | 11,000,000.00 | 3,666,666.67 | 3,666,666.67 | 3,666,666.67 |

**To date** equals this distribution at every point: nothing was distributed before X.

#### fund-19-lps-clawback

| LP | Commitment | Share | Paid in |
|---|---:|---:|---:|
| Alder Endowment | 7,000,000 | 0.7 | 14,000,000.00 |
| Birchwood Family Office | 3,000,000 | 0.3 | 6,000,000.00 |
| **All the LPs** | | 1 | 20,000,000.00 |

**This distribution**

| X | Tags | LPs | Alder Endowment | Birchwood Family Office |
|---:|---|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 |
| 10,000,000.00 | listed, breakpoint | 10,000,000.00 | 7,000,000.00 | 3,000,000.00 |
| 12,000,000.00 | listed | 11,600,000.00 | 8,120,000.00 | 3,480,000.00 |
| 15,000,000.00 | listed, breakpoint | 14,000,000.00 | 9,800,000.00 | 4,200,000.00 |
| 15,937,500.00 | listed, breakpoint | 14,750,000.00 | 10,325,000.00 | 4,425,000.00 |
| 25,000,000.00 | listed | 21,093,750.00 | 14,765,625.00 | 6,328,125.00 |

**To date**

| X | Tags | LPs | Alder Endowment | Birchwood Family Office |
|---:|---|---:|---:|---:|
| 0.00 | listed | 25,250,000.00 | 17,675,000.00 | 7,575,000.00 |
| 10,000,000.00 | listed, breakpoint | 35,250,000.00 | 24,675,000.00 | 10,575,000.00 |
| 12,000,000.00 | listed | 36,850,000.00 | 25,795,000.00 | 11,055,000.00 |
| 15,000,000.00 | listed, breakpoint | 39,250,000.00 | 27,475,000.00 | 11,775,000.00 |
| 15,937,500.00 | listed, breakpoint | 40,000,000.00 | 28,000,000.00 | 12,000,000.00 |
| 25,000,000.00 | listed | 46,343,750.00 | 32,440,625.00 | 13,903,125.00 |

**Clawback, each LP's share of what the GP owes back**

| X | Tags | Owed | Alder Endowment | Birchwood Family Office |
|---:|---|---:|---:|---:|
| 0.00 | listed | 2,750,000.00 | 1,925,000.00 | 825,000.00 |
| 10,000,000.00 | listed, breakpoint | 750,000.00 | 525,000.00 | 225,000.00 |
| 12,000,000.00 | listed | 750,000.00 | 525,000.00 | 225,000.00 |
| 15,000,000.00 | listed, breakpoint | 750,000.00 | 525,000.00 | 225,000.00 |
| 15,937,500.00 | listed, breakpoint | 656,250.00 | 459,375.00 | 196,875.00 |
| 25,000,000.00 | listed | 656,250.00 | 459,375.00 | 196,875.00 |

#### fund-20-lps-spv

| LP | Commitment | Share | Paid in |
|---|---:|---:|---:|
| Alder | 700,000 | 1/3 | 680,000.00 |
| Birch | 1,100,000 | 11/21 | 1,068,571.43 |
| Cedar | 300,000 | 1/7 | 291,428.57 |
| **All the LPs** | | 1 | 2,040,000.00 |

**This distribution**

| X | Tags | LPs | Alder | Birch | Cedar |
|---:|---|---:|---:|---:|---:|
| 1,000,000.00 | listed | 1,000,000.00 | 333,333.33 | 523,809.52 | 142,857.14 |
| 2,040,000.00 | listed, breakpoint | 2,040,000.00 | 680,000.00 | 1,068,571.43 | 291,428.57 |
| 6,000,000.00 | nav | 5,208,000.00 | 1,736,000.00 | 2,728,000.00 | 744,000.00 |
| 10,000,000.00 | listed | 8,408,000.00 | 2,802,666.67 | 4,404,190.48 | 1,201,142.86 |

**To date** equals this distribution at every point: nothing was distributed before X.

**Clawback, each LP's share of what the GP owes back**

| X | Tags | Owed | Alder | Birch | Cedar |
|---:|---|---:|---:|---:|---:|
| 1,000,000.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 |
| 2,040,000.00 | listed, breakpoint | 0.00 | 0.00 | 0.00 | 0.00 |
| 6,000,000.00 | nav | 0.00 | 0.00 | 0.00 | 0.00 |
| 10,000,000.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 |


### What the page will show (f02c), worked from the exact values

Rounded down to the cent, as your spec has the page do, with the leftover: the LPs' amount to the cent less the LPs' rounded-down amounts. Only cases 18 and 20 have any. In both, nothing was distributed before X, so to date is the same.

| Case | X | Each LP, rounded down | Left over |
|---|---:|---|---:|
| 18 | 2,000,000.00 | 666,666.66 each | 0.02 |
| 18 | 5,000,000.00 | 1,666,666.66 each | 0.02 |
| 18 | 10,000,000.01 | 3,000,000.00 each | 0.01 |
| 18 | 12,500,000.00 | 3,666,666.66 each | 0.02 |
| 20 | 1,000,000.00 | 333,333.33, 523,809.52, 142,857.14 | 0.01 |
| 20 | 2,040,000.00 | 680,000.00, 1,068,571.42, 291,428.57 | 0.01 |
| 20 | 10,000,000.00 | 2,802,666.66, 4,404,190.47, 1,201,142.85 | 0.02 |

- **Case 18 at $2,000,000** is your spec's example: $666,666.66 each and $0.02 left over.
- **Case 20 at $10,000,000** shows why the page can't use the case files' half-up cents: those add to $8,408,000.01, a cent more than the LPs get.

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   I got:
   - **The fund package:** 410 tests, 324 before. 64 are new in `cases.test.ts` and 22 are `pending.test.ts`.
   - **The fund page:** 233 tests, 211 before, all 22 new ones from `pending.test.ts`.
   - **Unchanged:** the engine's 3,177 and the main page's 680.
   - **The fund reference:** 39 unit tests, 23 before, and all 21 fund cases matching it.
   - **Spillpoint's reference:** its 73 unit tests and 83 cases.
2. **Each LP's share of case 19's clawback, from the reference:**

   ```bash
   python3 -c '
   import json, sys; sys.path.insert(0, "packages/fund/reference")
   from fund_ref.case import run_case
   out = run_case(json.load(open("packages/fund/cases/fund-19-lps-clawback/inputs.json")))
   for p in out["points"]: print(p["x"], p["clawback"]["owed"], [(r["name"], r["clawback"]["amount"]) for r in p["by_lp"]])'
   ```

   At 0.00 it prints 2750000.00 owed, Alder Endowment 1925000.00 and Birchwood Family Office 825000.00, as your spec gives.
3. **The refusals:** change case 1's `inputs.json` by one of the fixtures in `fund-21-lps-refused/fixtures/` and run it through `fund_ref.inputs.read`. Each is refused with the kind, term and path `cases-lps.json` gives.
4. **Nothing outside the step moved:**

   ```bash
   git diff --stat main -- packages/engine packages/fund/src apps/fund/src apps/dashboard cases reference
   ```

   It prints nothing.
5. **Have cases 17 to 21 re-derived** independently, from `SPEC.md` and each case's `inputs.json`, before you add the cases label.

## Assumptions added

- **F19 to F21:** Settled (S1; Jordan).
- **FA17, FA18 and FA19 (New):** a blank name and names as written; an LP's other fields; the order of checks with LPs.
- **FC9 and FC10 (New):** the LPs in `expected.json`; the LPs' refusals.
- **FC2:** names the second refusal set.

## Open questions

1. **FC9's shape.** `lps` at the top, `by_lp` at each point, each amount `{amount, exact}`. Once locked, f02b's engine is held to it. Fine, or would you rather each LP's amounts sit inside `distribution` and `to_date`?
2. **FA17:** names compared exactly as written, so "Alder" and "Alder " are two LPs and the second is easy to make by accident when pasting from a spreadsheet. F19 says "exactly as written", so I didn't trim. Should the page (f02c) warn about leading or trailing spaces, or should the engine trim?
3. **FA19:** an unsupported LP field, such as a side letter's carry, is reported only once everything else in the input is fine, while an unsupported term is reported first of all. That's F21's "after everything else". Fine?
4. **The page's rules** (the LPs tab, pasting, rounding down with the leftover, the share to two places, the CSV) are only in `local/fund/fund-spec-lps.md`. Should f02c copy them into the repo, as a `notes/plan-fund-0.2.0.md` or a section of `SPEC.md`?
5. **The pending lists:** one in each suite's helper, so f02b and f02c can each empty their own. Is that what you meant by one list, and is counting the page's refusal sets as accounted for right?
6. **`lp_name_repeated` in STABLE.md and the README** waits for f02b, with the engine that gives it. Fine?
