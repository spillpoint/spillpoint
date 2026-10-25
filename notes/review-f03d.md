# Review: f03d (spillpoint-fund 0.3.0)

Branch `f03d-fund-release-0.3.0`, from main after #121. The release step for 0.3.0, as f02d was for 0.2.0, with your width gap, answers 1 and 3, the file tests' wait and the screenshots first.

**Nothing in `packages/engine`, `packages/fund/reference`, `apps/dashboard`, any cases or `reference/` changed,** and nothing in `packages/fund/src`: `git diff --stat main -- packages/engine packages/fund/reference packages/fund/cases packages/fund/src apps/dashboard cases reference` prints nothing.

| Commit | What |
|---|---|
| `cc5dc34` | the first commit (§1): the page, the plan, one line of ASSUMPTIONS, the screenshots |
| the last | the release (§2) and this note |

## 1. The first commit

### The LPs tab's cards, wherever its tables don't fit

**The gap, reproduced first.** Every width from 320 to 1400 pixels, a pixel at a time, on the LPs tab of cases 22, 26 and 28 opened as files, in headless Chrome:
- **The LPs' table scrolled inside its card** from 738 to 910 pixels for cases 22 and 26, and to 860 for case 28. You saw 760 to about 920; headless Chrome's fonts are a little narrower.
- **Close and "Remove" were outside the card** from 738 to 879 pixels (case 28: 829).
- **Why:** f03c switched to cards under a 640-pixel card, a container query as the cash flows use. That fit 0.2.0's LPs, whose table needs a 630-pixel card. The Class column needs about 180 more.

**The fix (`useCards` in `src/layout.ts`):** each table is cards wherever, laid out as one table, it would be wider than its card, measured on the card's own width as the split is.
- **Why measured, not a fixed width:** what each table needs changes with what's in it. The Class column comes with the first class, a class's carry in steps is wider than the fund's, and a long class name widens the picker. No one width would do.
- **How it measures a table that's showing as cards:** it lays the table out as one for a moment and sets it back before anything is drawn, all in one layout pass. The split and Payouts' cards measure a hidden copy instead; a copy of a form would repeat every input and label.
- **It checks again** when the card's width changes and when anything in the form does.
- **In card form, a picker** can't be wider than its card, so a long class name gives way.

**Where the tables switch now,** by window width in headless Chrome:

| Fund | The LPs, one table from | The classes, one table from |
|---|---:|---:|
| Cases 22 and 26 | 911 | 678, and 618 to 640 |
| Case 28 | 861 | 678, and 618 to 640 |
| Cases 17 and 19, no classes | 728 | (none) |

The classes' table fits again from 618 to 640 because the page's side padding is narrower at 640 and under, which gives the card more room.

**Checked, every width from 320 to 1400 on the built page,** on the LPs tab of cases 22, 26 and 28 opened as files:
- **What's checked at each width:**
  - no page wider than its window
  - no box inside it scrolling sideways
  - every input, picker and button inside its card
- **The result:** 3,243 checks, none failed.
- **The same, none failed,** for:
  - cases 17 and 19, and case 3 with no LPs
  - case 26 with a 57-character class name and a class carry in three steps. With that name the LPs stay cards even at 1400, since a picker is as wide as its longest name.
- **The check catches the gap:** before the fix it found 1,981 problems.

**A test with the widths faked (`test/phone.test.tsx`):**
- **What it checks:** the switch follows the card's own width, and follows the Class column as a class is removed and added.
- **It catches a measuring mistake:** with the table measured while it's still cards, the test fails.

### "Owed back" (your answer 1)

**The classes card's "Owed back"** is there when the split is final and some class is owed something, to the cent:
- **A class owed nothing** shows $0.00.
- **With nothing owed to any class,** the column is left out, as the LPs' card leaves out its clawback column.

**What changes:**
- **Case 22 at NAV owes nothing,** so its card has no "Owed back" now. In f03c it showed $0.00 twice.
- **Case 28 with a NAV of $5,000,000,** not final, does owe something there: at NAV its card's "Owed back" is $1,225,000.00 and $225,000.00. This is a fund I made for the test, not a case.

**`test/classesCard.test.ts` checks:**
- **At every point of cases 22, 23, 24, 26 and 28,** the column is there exactly when some class is owed something.
- **Every kind of point is among them:** not final, final with nothing owed, owed, and owed with a class at $0.00.

**The clawback card's own "Owed back by class" table is unchanged:** it shows every class at $0.00 when nothing is owed. Open question 1.

### "Fund terms" as a class's name (your answer 3)

**Typed:**
- **The class's name gets your words:** "That's the page's name for the fund's own terms; give this class another."
- **At the top of the LPs tab,** as any problem is.
- **Save refuses:** "Not saved: the LPs have a problem to fix first. …"

**In a file,** in one line: "Couldn't open named.json. The name in row 1 of its LP classes: that's the page's name for the fund's own terms; give this class another."

**In a paste,** "Fund terms" in the class column is always the fund's own terms. f03c's "unless a class has that name" is gone, since none can.

**Two choices of mine** (the plan marks them):
- **The page checks the name** after everything the engine checks, which takes the name (FA28's known edge). So a fund with another problem shows that first.
- **Compared exactly once trimmed,** as every name on the page is. " Fund terms " is refused; "fund terms" and "Fund terms 2019" are names of their own.

**Where it's written:**
- **ASSUMPTIONS:** the known edge's paragraph says the page refuses the name and the engine still takes it.
- **The plan** has the rule and its words.

**Tests:**
- **The three ways:** typed, in a file, and in a paste.
- **Each change taken out in turn,** each fails.

### The file tests' wait

**One helper,** `test/support/files.ts`, for the four test files that open a file: `file`, `lps`, `classes` and `keyboard`. Each had its own copy.
- **What it waits for:** the status line changing, with a `MutationObserver`, and no timer of its own. The tests' 20-second timeout is the only limit.
- **Why the line always changes:** every open in these tests is the first in its test, or follows a save.

**A scratch check,** not committed, with reading a file slowed to 2.5 seconds:
- **The new helper:** waited, and passed.
- **The old one:** failed after 1,059 ms.

### Screenshots (your answer 5)

From `pnpm --filter @spillpoint/fund screenshots`, on the built page, case 26:

| What | Shot |
|---|---|
| The LPs tab, with its class and its closes, at 1,100: both tables as one | [f03d-lps-tab-1100](screenshots/f03d-lps-tab-1100.webp) |
| The same at 320, each class and each LP a card | [f03d-lps-tab-320](screenshots/f03d-lps-tab-320.webp) |
| Payouts' classes card at $5,200,000, at 1,100 | [f03d-classes-card-1100](screenshots/f03d-classes-card-1100.webp) |
| The same at 320 | [f03d-classes-card-320](screenshots/f03d-classes-card-320.webp) |
| The equalization card, at 1,100 | [f03d-equalization-1100](screenshots/f03d-equalization-1100.webp) |
| The same at 320 | [f03d-equalization-320](screenshots/f03d-equalization-320.webp) |

## 2. The release

- **`packages/fund/package.json`** at 0.3.0, so the page's footer says "spillpoint-fund 0.3.0" too. `files` is unchanged.
- **The package's README:**
  - **Its opening** says LPs can be in classes and join at later closes.
  - **A fourth worked example, "classes and later closes":** case 26's input, each class's split at $5,200,000 and the equalization at each close, with its output exactly as the packed build prints it (§3).
  - **"What it covers"** is for 0.3.0: classes and accounts, the clawback by class, later closes and equalization.
  - **"What it doesn't model yet"** is the spec's Later lines:
    - a class's own pref or catch-up
    - a fee break that isn't proportional
    - a class's own expenses
    - a close after a distribution
    - a joining LP's catch-up kept against its next call
    - equalization interest as capital
    - the GP commitment in the equalization
    - defaulted or excused LPs
  - **"How it's tested":** 25 worked cases and 46 refusals. Six of the cases and twenty of the refusals are about classes and later closes.
  - **The `lps` input line** now says "Without classes" before "every LP is on the same terms".
  - **Its inputs, API and stable lists** gained 0.3.0's in f03b.
- **`notes/release-fund-0.3.0.md`,** in the 0.2.0 note's style:
  - **What's new:**
    - `fund.terms.feeRate`, `equalizationRate` and `lpClasses`
    - `Lp.class` and `close`
    - `split.byAccount`
    - `class` on `StepCarry`, `LpAmounts` and every reason
    - `equalization(fund)`
    - the four new input terms
    - "on its own totals"
    - the page's classes, closes, cards and CSVs
  - **`LpAmounts` gains `close` too,** so the note says so.
  - **"Upgrading from 0.2.0":** TypeScript code that builds a `Fund` by hand needs the terms' `feeRate`, `equalizationRate` and `lpClasses`, and each `Lp`'s `class` and `close`.
    - **JavaScript built as 0.2.0 built it** still splits. I checked on case 17 built without the new fields: the same carry, three LPs, no accounts, and no equalization.
  - **How it was checked, independently,** in your numbers, the checker named as 0.2.0's note names it.
- **The repo README's fund section** names 0.3.0, the classes, their clawback and the later closes, with the equalization's CSV.
- **`CLAUDE.md`'s "Where things stand"** names spillpoint-fund 0.3.0, its release note, the classes, the later closes, and the three tags.

## 3. The packed build

**What would be published,** from `packages/fund`, `pnpm pack --dry-run`: `spillpoint-fund@0.3.0`, 25 files, 0.2.0's 23 and `equalization`:
- `package.json`, `README.md`, `LICENSE`
- `dist/`, each as `.js` and `.d.ts`:
  - `index`, `breakpoints`, `dates`, `decimal`, `errors`, `input`
  - `model`, `reasons`, `stable-names`, `waterfall`
  - and, new, `equalization`

**The tarball:**
- **shasum:** `04b4649a1555663b539424ff46fc455adf0b012a`. Three packs gave the same one.
- **Size:** 41,481 bytes packed, 140,092 unpacked.
- **Where:** packed into my scratchpad, not the repo, and deleted after the checks.
- **Its `package.json`** is as pnpm writes it: version 0.3.0, no `prepublishOnly`.

**As a user would,** in a throwaway project outside the repo. The tarball is unpacked there, and decimal.js linked from the copy installed here, so nothing was downloaded.

**The README's five examples,** run from the packed README, each print exactly their Output block:
- one distribution
- the clawback
- each LP's share
- classes and later closes, the new one
- the refusal

**The exports** are the eight the API test pins: `D`, `FundRefusal`, `equalization`, `findBreakpoints`, `readFund`, `splitAt`, `splitAtNav`, `toCents`.

**A TypeScript file typechecks clean** under `nodenext`, the package's declarations checked too (TypeScript 7.0.2):
- **What it uses:** every exported type, `AccountSplit`, `LpClass`, `Equalization`, `LaterClose` and `EqualizationAmounts` among them.
- **What it reads and builds:**
  - it reads the terms' `feeRate`, `equalizationRate` and `lpClasses`, and each LP's `class` and `close`
  - it reads `byAccount` (its `lpMultiple` as `D | null`), the carry steps' and the reasons' `class`, and `equalization`, null or not
  - it builds a `Fund` by hand with the new fields
- **Run,** it prints case 28's owed by class, $1,925,000.00 and $450,000.00, and a later close's equalization.
- **The check is real:** a second file fails with four errors:
  - a `Fund`'s terms built as 0.2.0 built them ("missing … feeRate, equalizationRate, lpClasses")
  - an `Lp` without `class` and `close`
  - an account's `lpMultiple` given to a `D`
  - `equalization(fund)` given to an `Equalization`, though it can be null

**All 28 fund case folders on the packed build:** 25 cases and 46 refusals, 3,535 checks, none failed.
- **Each case:**
  - every top-level amount
  - every breakpoint, to the cent and at its exact value, with every reason's code, class, text and fields
  - every point's split and clawback, to the cent, the carry steps named by class with two or more accounts
- **Each account,** with two or more: its class and paid-in, its own split this distribution and to date at every point, and its clawback when final.
- **Each LP:** its commitment, share, class, close and paid-in, and its amounts at every point, to the cent and within 10^-18 of exact.
- **Each equalization,** cases 25 and 26: the rate, each close's date and joiners, and every LP's four amounts at each close and over all of them, to the cent and within 10^-24 of exact.
- **Each refusal:** its kind, term and path.
- **The checker:** f02d's, with 0.3.0's checks added. One expected amount changed in memory at a time, one check fails, three times over:
  - an LP's amount in case 18
  - Alder's interest received in case 26's equalization
  - the seed class's GP to date in case 28

## 4. Tests and CI

What CI runs, `pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference`, passes:

| Suite | Before | Now | Changed |
|---|---:|---:|---|
| Fund page | 489 | 495 | the LPs tab's cards by width; "Owed back" when some class is owed, at NAV and across the cases; "Fund terms" typed, in a file and in a paste. Four files open files through one helper |
| Fund package | 1,042 (6 skipped) | 1,042 (6 skipped) | |
| Engine | 3,177 | 3,177 | |
| Main page | 680 | 680 | |

**Both references pass:**
- **spillpoint's:** its 73 unit tests and 83 cases.
- **The fund's:** its 64 unit tests and 28 case folders.

## 5. CI and permissions (hard rule 9)

Nothing in `.github/workflows/` or `.claude/`.

## How to check it on your machine

```bash
pnpm install
```

**The LPs tab's widths.** Run the fund page, choose "Two later closes and a friends-and-family class", and open the LPs tab:

```bash
pnpm --filter @spillpoint/fund dev
```

- **At 768 pixels,** an upright iPad: each class and each LP is a card, and nothing scrolls sideways, inside the card or out.
- **Widening the window,** the classes become one table first, then the LPs, at about 910.
- **Then open case 22 and case 28** (`packages/fund/cases/fund-22-classes-fee-carry/inputs.json`, `fund-28-classes-clawback-steps/inputs.json`), and do the same: case 28's LPs become one table at about 860.
- **Remove case 26's class:** the Class column goes, and the LPs are one table from about 730.

**"Owed back."** Open each case's `inputs.json` and look at the classes card:
- **Case 24 at $0:** "Owed back" is $320,000.00 for Fund terms and $0.00 for Friends and family. From $2,000,000 nothing is owed, and the column goes. I checked $0 and $2,500,000 on the built page.
- **Case 28 at $0:** $1,925,000.00 and $450,000.00. From $10,000,000, Seed LPs is owed $0.00 beside Fund terms' $459,375.00 or more, which more distributions never clear, so the column stays at every X.
- **Case 22 at NAV** ("Set X to NAV") has no "Owed back": no class is owed anything there.

**"Fund terms," case 26.** On the LPs tab:
- **Rename "Friends and family" to "Fund terms":** your sentence is under the name and at the top of the tab.
- **Save** refuses.
- **"Fund terms 2019"** is fine.

**The pack.** From `packages/fund`:

```bash
pnpm pack --dry-run
```

It should list `spillpoint-fund@0.3.0` and the files in §3. For the shasum, run `pnpm pack`, then `shasum spillpoint-fund-0.3.0.tgz`, then delete the tarball. It should be `04b4649a1555663b539424ff46fc455adf0b012a`.

**The README's new example,** from `packages/fund`, against the sources:

```bash
node -e '
import("./src/index.ts").then(({ equalization, readFund, splitAt, toCents }) => {
  const { fund } = JSON.parse(require("fs").readFileSync("cases/fund-26-closes-and-classes/inputs.json"));
  const f = readFund(fund);
  for (const a of splitAt(f, "5200000").byAccount) console.log(a.class ?? "Fund terms", toCents(a.paidIn), toCents(a.distribution.lps.total));
  for (const lp of equalization(f).lps) console.log(lp.name, toCents(lp.interestPaid), toCents(lp.interestReceived));
})'
```

It prints Fund terms 4000000.00 3900000.00, Friends and family 1250000.00 1300000.00, then each LP's interest: Alder 0.00 and 32876.71, Birchwood 10356.16 and 11260.27, Cedar 33780.82 and 0.00.

## After merging: what you do

1. **The next deploy** (the merge to main runs it) updates the page at `spillpoint.github.io/spillpoint/fund/`, its footer reading "spillpoint-fund 0.3.0".
2. **Publish,** from `packages/fund`:

   ```bash
   pnpm publish
   ```

   Its `prepublishOnly` builds and runs the tests first.
3. **Tag** `fund-v0.3.0`.
4. **Make the GitHub release** "spillpoint-fund 0.3.0" from `notes/release-fund-0.3.0.md`, with `--latest=false`, so the engine's release stays the repo's latest:

   ```bash
   gh release create fund-v0.3.0 --title "spillpoint-fund 0.3.0" --notes-file notes/release-fund-0.3.0.md --latest=false
   ```

## Assumptions added

- **The page's check of a class named "Fund terms"** runs after the engine's, and compares exactly once trimmed. Both are in the plan, marked mine. No new FA code: the engine is unchanged, and FA28's known edge says the page refuses the name.
- **The LPs tab's tables switch by measuring,** not at a fixed width. A layout choice, in the plan.

## Open questions

1. **The clawback card's "Owed back by class" table** still shows when no class is owed anything, every row $0.00, under the sentence "owes nothing back to the LPs". Should it follow answer 1 too, and go when nothing is owed?
2. **The release note's "How it's tested"** uses your checks' numbers as you gave them, and calls the checker "a separate checker in exact fractions written from SPEC.md alone", as 0.2.0's did. Fine to publish so?
3. **The README's new example** prints `toCents`, which rounds half up, so Alder's interest at the second close is 22520.55 there and $22,520.54 on the page, which rounds down as paid. The paragraph under it says so. Fine, or print it rounded down?
