# Review: 07b (the naming review's items 1 and 15)

Branch `07b-names-and-ids`. The `cases/` edit rule is lifted for this step, on your machine; `.claude/settings.json` isn't committed. One commit, carrying both items everywhere at once (`notes/plan-0.7.0.md`, your answer 17):
- **Item 1, class names to the cent:**
  - "Options ($0.1 strike)" becomes "Options ($0.10 strike)".
  - "Warrants for Common Stock ($5 strike)" becomes "($5.00 strike)".
  - A strike with more places keeps them all: "($0.0025 strike)".
  - Ids are unchanged: `options_0.1`, `warrants_seed_0.5`.
- **Item 15, `_shadow` to `_safes`:** the series a round's SAFEs convert into is `<series>_safes` (`seed_safes`, and `series_a_safes_2` for a second price), matching `<series>_notes`.

**Names and ids only:** no amount, share count, date or breakpoint changed in any case file.

## 1. What changed

**The engine:**
- **The rule:** `strikeInName` in `packages/engine/src/decimal.ts`. A strike is written to two places at least, with every further place kept, and never rounded. It isn't exported, so the API's exports are unchanged.
- **Where a name is made:**
  - **A company built from rounds:** `rounds.ts`, the options and warrants a round's events issue.
  - **An OCF import:** `ocf-grants.ts` and `ocf-warrants.ts` (O6, O7).
  - **An OCX 0.7 import:** `ocx-import.ts` and `ocx-07.ts`, its plan ledgers' option classes and its warrants. 0.4/0.5 names a column by its heading, so it has no strike to show.
- **The id:** `rounds.ts` makes `<series>_safes`.

**The reference:**
- **The same rule:** `strike_name` in `reference/spillpoint_ref/num.py`, used in `rounds.py`'s two names.
- **The id:** `rounds.py` makes `_safes`.
- **The random-table tool:** `tools/random_safes.py` names its option classes the same way.

**The tests that pin names or ids:**
- **Engine:**
  - `rounds.test.ts`: 15 lines
  - `input.test.ts`: 1 line, Millrace's seniority
  - `breakpoints.test.ts` and `support/two-answers.ts`: a name each, in a cap table written by hand in the engine's form
- **Reference:**
  - `test_reference.py`: 7 lines
  - `test_safe_row.py` and `test_two_answers.py`: a hand-written name each
- **Page:**
  - `rounds-editor.test.tsx`: Millrace's Seed seniority, 2 lines
  - `file.test.ts`: case 22's warrant name

**Left as they are:**
- **The editor test's class name** "Options ($5 strike)" is one a user types, so it's theirs, not the engine's.
- **`format.test.ts`'s** "Options ($0.05 strike)" already has two places.

**The engine README's rounds example** names `series_a_safes`, in its seniority and in its Output block. The README test runs it, so it had to change with the engine. The rest of the README is 07c's.

**`docs/ASSUMPTIONS.md`:**
- **R5:** the id is `<series>_safes`, which until 0.7.0 was `_shadow`.
- **O6 and O7:** the name's strike is to the cent at least, the id's as written.
- **C15's example:** "Warrants for Common Stock ($0.50 strike)".
- **The Later list:** "Class names that show money to the cent" comes off it, since it's done.

**CLAUDE.md's "Where things stand":** released through 0.6.0; next, 0.7.0 in 07b to 07e.

**The 0.7.0 plan** marks 07b done.

## 2. The case files: 74 files in 47 cases

Every case-file change is one of the two substitutions, made by the script below and nothing else:

| File | Files with names | Names | Files with ids | Ids |
|---|---:|---:|---:|---:|
| `inputs.json` | 18 | 22 | 18 | 21 |
| `expected.json` | 13 | 59 | 20 | 338 |
| `DERIVATION.md` | 4 | 5 | 2 | 4 |
| OCF package files | 0 | 0 | 2 | 3 |
| **All 74 files** | **35** | **86** | **42** | **366** |

**The strikes that change:**
- $0.1 to $0.10 (35)
- $0.5 to $0.50 (25)
- $5 to $5.00 (16)
- $1 to $1.00 (8)
- $3 to $3.00 (2)

$0.0025, $0.05, $0.08, $0.11, $0.25 and $0.42 already show two places or more, and the seven names main already wrote as "$0.10" or "$0.50" stay as they are.

**Why fewer files than the plan's counts:** the plan counted the files holding a strike name in any form, 34 `expected.json` and 21 `inputs.json`. Most strikes in them, $0.25 above all, already have two places, so those files don't change.

**Your two additions:**
- **OCX's 0.7 names:**
  - ocx-01's "Options ($0.1 strike)" and "Warrants for Common Stock ($0.5 strike)"
  - ocx-05's, in its fixture results
  - ocx-04's one name in a fixture result

  Each is in `expected.json`, and in ocx-01's and ocx-05's DERIVATIONs.
- **ocx-12-millrace's `renamed` key** `seed_shadow` is now `seed_safes`, Millrace's id, and its DERIVATION says so.
- **The C18 comparison passes for all six locked OCX cases:** each, with its blanks answered, still imports to its locked case's cap table under `renamed`, and pays as it does.

**The OCF package's id:**
- **What it was:** ocf-11-millrace's package, written in 04b from Millrace's cap table, used Millrace's id `seed_shadow` as an OCF stock class id, in `StockClasses.ocf.json` (1) and `Transactions.ocf.json` (2).
- **What it is now:** `seed_safes`, so its import still gives Millrace's ids.
- **The plan's 40 files for item 15** included these two.

**The DERIVATIONs quoting a name or id:**
- ocf-08, ocf-11, ocf-12, ocx-01, ocx-05 and ocx-12
- ocf-08's still reads true: the locked "Warrant for Seed Preferred ($0.50 strike)" and the import's "Warrants for Seed Preferred ($0.50 strike)" now differ only by "Warrant" against "Warrants"
- ocx-09's and ocx-10's quote "($0.25 strike)" and "($0.50 strike)", which don't change

### Every case file it changes

**Exit and round cases (36):**
- `edge-07-option-strikes`: inputs.json
- `edge-12-unconverted-safe`: inputs.json
- `edge-12b-safe-cap-and-discount`: inputs.json
- `edge-12c-safe-discount-only`: inputs.json
- `edge-12f-two-safes`: inputs.json
- `edge-12g-pre-money-safe-at-a-sale`: expected.json
- `edge-12h-mfn-safe`: inputs.json
- `edge-12j-larkspur-safes-at-a-sale`: inputs.json
- `edge-13a-note-with-pool`: inputs.json
- `edge-13b-note-without-pool`: inputs.json
- `edge-13c-note-common-only`: inputs.json
- `edge-13d-note-cap-and-discount`: inputs.json
- `edge-13e-note-discount-only`: inputs.json
- `edge-13f-note-alongside-preferred`: inputs.json
- `edge-13g-two-notes`: inputs.json
- `edge-13j-larkspur-at-a-sale`: inputs.json
- `edge-15-safe-discount-beats-cap`: inputs.json, expected.json
- `edge-16g-safe-converts-in-a-down-round`: inputs.json, expected.json
- `edge-16h-safe-conversion-exempt`: inputs.json, expected.json
- `edge-16j-note-and-safe-from-before-the-seed`: inputs.json, expected.json
- `edge-17i-pay-to-play-with-conversions`: inputs.json, expected.json
- `edge-17j-pay-to-play-anti-dilution-with-a-safe`: inputs.json, expected.json
- `edge-18-pro-rata-with-safe`: inputs.json, expected.json
- `edge-18b-pro-rata-pool-in-base`: inputs.json, expected.json
- `edge-18c-pro-rata-and-more`: inputs.json, expected.json
- `edge-20-pre-money-safe-converts`: inputs.json, expected.json
- `edge-21-note-and-pre-money-safe`: inputs.json, expected.json
- `edge-21b-post-money-safe-and-note`: inputs.json, expected.json
- `edge-21c-post-money-and-pre-money-safes`: inputs.json, expected.json
- `edge-21d-post-money-safe-and-discounted-note`: inputs.json, expected.json
- `edge-22-warrants-issued`: inputs.json, expected.json
- `edge-23-dividends-from-a-round`: inputs.json, expected.json
- `edge-25-ocf-ledger`: inputs.json
- `edge-26-series-b-on-an-imported-table`: inputs.json, expected.json
- `edge-27-safes-and-note-convert-on-an-imported-table`: inputs.json, expected.json
- `millrace`: inputs.json, expected.json

**OCF cases (7):**
- `ocf-01-larkspur`: expected.json
- `ocf-07-edge-07`: expected.json
- `ocf-08-edge-08`: expected.json, DERIVATION.md
- `ocf-09-edge-12b`: expected.json
- `ocf-10-edge-13a`: expected.json
- `ocf-11-millrace`: expected.json, DERIVATION.md, package/StockClasses.ocf.json, package/Transactions.ocf.json
- `ocf-12-ledger`: expected.json, DERIVATION.md

**OCX cases (4):**
- `ocx-01-alder-gate`: expected.json, DERIVATION.md
- `ocx-04-to-fill`: expected.json
- `ocx-05-reads`: expected.json, DERIVATION.md
- `ocx-12-millrace`: expected.json, DERIVATION.md

## 3. The substitutions, as a script to run on main

Save this as `rename_07b.py`, anywhere outside the repository:

```python
"""07b's substitutions on the case files: the naming review's items 1 and 15, names and ids only.

Item 1: a class name the engine makes shows its strike to the cent at least: "Options ($0.1 strike)" becomes
"Options ($0.10 strike)", and "($5 strike)" "($5.00 strike)". A strike with more places keeps them: "($0.0025 strike)".
Item 15: the series a round's SAFEs convert into has the id <series>_safes, where it was <series>_shadow
("seed_shadow" becomes "seed_safes", "series_a_shadow_2" "series_a_safes_2").

Run from the repository's root, on main:  python3 rename_07b.py cases
It rewrites each .json and .md file under the folder that changes, byte for byte otherwise, and prints its path.
"""

import re
import sys
from pathlib import Path

STRIKE = re.compile(r"\(\$(\d+)(?:\.(\d+))? strike\)")


def to_the_cent(m):
    places = m.group(2) or ""
    return f"(${m.group(1)}.{places.ljust(2, '0')} strike)"


root = Path(sys.argv[1])
for path in sorted(p for p in root.rglob("*") if p.is_file() and p.suffix in (".json", ".md")):
    before = path.read_bytes().decode("utf-8")
    after = STRIKE.sub(to_the_cent, before).replace("_shadow", "_safes")
    if after != before:
        path.write_bytes(after.encode("utf-8"))
        print(path.as_posix())
```

**What it does:**
- **The names:** every "(\$N strike)" or "(\$N.d strike)", a strike with fewer than two places, gets a trailing zero or ".00".
- **The ids:** every `_shadow` becomes `_safes`.
- **What it leaves:** everything else in each file, byte for byte. It reads only `.json` and `.md` files, so it skips the `.DS_Store` files a Mac leaves.

**How I ran your check here,** on a copy of main's `cases/` outside the checkout:

```bash
mkdir -p /tmp/main-cases && git archive main cases | tar -x -C /tmp/main-cases
```

```bash
cd /tmp/main-cases && python3 /path/to/rename_07b.py cases
```

```bash
diff -r -x .DS_Store /tmp/main-cases/cases /path/to/07b/cases && echo byte-identical
```

The script printed the 74 paths listed in section 2, and `diff` found nothing: byte-identical.

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   I got:
   - all 2,759 engine tests
   - the page's 654 tests
   - the reference's 73 unit tests
   - `generate.py --check`: all 83 exit and round cases rebuilt by the reference's updated code, matching the substituted files exactly

   That includes every OCF and OCX case reading to its substituted `expected.json`, and the six locked OCX cases' C18 comparison.
2. **The byte-identical check,** as in section 3.
3. **On the page,** with `pnpm dev`:
   - **Click "Open a cap table export"** and pick the five files in `cases/ocf-12-ledger/package`. The import leaves nothing blank, so click "Use this cap table".
   - **On the Cap table tab,** the option classes are "Options ($0.10 strike)" and "Options ($0.25 strike)", where main shows "Options ($0.1 strike)".
   - **Millrace opens as before.** Its strikes, $0.05, $0.11 and $0.42, already had two places.

## Decisions for you to check

1. **Test inputs written by hand in the engine's form are brought into line,** as your answer 1 did for the cases' inputs. Those are the two hand-written names in the engine's tests and the two in the reference's tests, and the random-table tool. A name a user types in the editor test stays as typed.
2. **ocf-11's OCF package ids** change with the rest, `seed_shadow` to `seed_safes`, since the package mirrors Millrace's ids and the plan's count included it.
3. **The engine README's rounds example** changes in 07b, not 07c, because the README test runs it against the engine.
4. **No thousands separators in a strike name:** a $1,000 strike would be "($1000.00 strike)". No case has a strike of $1,000 or more. The plan's rule was "to the cent", and a separator would be a second change to names.

## Assumptions added or changed

- **R5, O6, O7 and C15** say the new names and ids, as section 1 lists.
- **The Later item** for class names to the cent is removed, now done.
- **No modeling choice changed.**

## Open questions

1. **A strike whose decimal doesn't end.** It can't be written in any case's input form except as a fraction, "a/b", and no case has one. If one ever did, the engine would name it with its 40 digits, and the reference with "a/b", as before 07b. 07b doesn't change that.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`. `.claude/settings.json` is modified on your machine, to lift the cases lock, and isn't committed.
- **Nothing ran outside the sandbox.**

## Next

07c, the engine's items 3, 4 and 7 to 14, items 17 and 18's README sections, and both READMEs. I'm stopping here.
