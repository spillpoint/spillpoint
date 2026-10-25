# Review: f03c (classes and later closes on the page)

Branch `f03c-fund-classes-page`, from main after #120. The third step of spillpoint-fund 0.3.0, covering:
- the two rates on Terms
- the classes and each LP's class and close on LPs
- pasting and files
- Payouts' classes card, clawback by class, the LPs' Class column and the equalization card
- case 26 in the picker

**Outside `apps/fund` and `notes/`, only the first commit changed anything:**
- `packages/fund/src/waterfall.ts` and `test/split.test.ts`
- the fund's README and ASSUMPTIONS

After it, `git diff --stat 4e5b571 -- packages apps/dashboard cases reference` prints nothing.

**One PR, not two.** The fund page deploys from main. f03c1 on its own would have put a page on the site that opens a fund with classes and shows it without its classes card, its clawback by class or its equalization: right in what it showed, but missing what the fund is about. The commits go a part at a time:

| Commit | What |
|---|---|
| `4e5b571` | the first commit (§1) |
| `1546dbe` | the tabs, files and paste |
| `6537eb6` | Payouts and the tests |
| the last | this note and two style fixes |

The page's source comes to about 1,380 lines added and 520 taken out, and its tests 840 and 50.

## 1. The first commit

- **FA38 (your answer 1):** `AccountSplit.lpMultiple` is `D | null`, null exactly when the account's paid-in is zero. The split's own `lpMultiple` stays `D`. The test is a fund whose only calls are fee calls, with a class paying no fees:
  - **The class's paid-in and multiple:** $0.00 and null.
  - **The fund-terms account's and the fund's multiples** are their LPs' to date over their paid-in.
  - **The class's carry:** at $1,000,000 its part is $200,000, all at the top step, 30%: $60,000 to the GP. I ran the same fund through the reference, and it gives $60,000 too.
- **FA38's text** says so. The README's `byAccount` line says "`lpMultiple` (null when it has nothing paid in)".
  - **`STABLE.md` is unchanged:** it lists names and wordings, not an account's fields.
- **FA33 to FA38:** "Confirmed (f03b review)", and FA38 "Confirmed (f03b review, with no multiple)".
- **`notes/plan-fund-page.md`:** the new section, "0.3.0: classes and later closes".
  - **Your words** are as you gave them.
  - **What they leave open** is marked "(mine)" there, and listed in §10.
  - **One line was added while building,** and the plan marks it: a file whose management fee rate is 0. The amounts' line ("amounts more than zero and nothing negative") didn't fit a rate, so it has its own (§6).

## 2. The Terms tab (`src/Terms.tsx`, `src/terms.ts`, `src/Fields.tsx`)

**Two percents, in a group of their own after the GP commitment,** "For LP classes and later closes": "Management fee rate" and "Equalization interest rate".
- **Each has your hint under it.**
- **Both start blank,** and blank leaves them out of the input. "0" for equalization is kept and saved as "0".

**The fund's carry fields** moved into `Fields.tsx`, so a class's carry is the same fields at its own paths. The Terms tab looks and reads as before, and its tests pass unchanged.

## 3. The LPs tab (`src/Lps.tsx`, `src/lps.ts`)

**"Classes" first:**
- **The table,** one row a class: its Row, Name, Fee rate ("Blank: the fund's fees.") and Carry, and "Remove".
- **Your line under it.**
- **"Add a class,"** which focuses the new class's name.

**A class's carry** is a picker: "The fund's carry", "Flat" or "In steps".
- **Its own starts from the fund's:** the first rate, or the steps.
- **Switching keeps what was typed,** so going back to the fund's carry and then to Flat brings back the 15% typed before.

**"Each LP" next:** Row, Name, Commitment, Class (only when the fund has classes), Close ("Blank: in from the start."), and "Remove".

**An LP holds its class by the class's row,** not its name, so renaming a class keeps its LPs in it.

**Removing a class with LPs** moves them to Fund terms, and one line under the classes says so: "Removed Friends and family: Cedar Holdings moves to Fund terms." It goes at the next change.

**Class names are trimmed** as LP names are: the box keeps what's typed, shows it trimmed once it's left, and the input gets it trimmed.

**The card's intro** stays as it was without classes. With them it reads: "Each LP's name and commitment, in the order you list them, with its class and its close. The LPs in a class, or on the fund's terms, share what it gets by commitment."

**Narrow screens:** under 640 pixels of card each class and each LP is a card. The column names that the hidden headings give on a wide card are written over the class, close, fee rate and carry.

## 4. Problems in the page's words

**Under the cell their path names,** as the plan lists them. The classes are on the LPs tab, so a class's problem is the LPs': "Your last change to the LPs has a problem, …".
- **On Terms:**
  - "Needed: a class has its own fee rate."
  - "Needed: an LP joins at a later close. Write 0 for none."
  - a rate that doesn't read
- **On LPs:**
  - a class's name, repeat or fee rate
  - a class's carry, in the Terms tab's words
  - an LP's close after the first distribution
- **A class's catch-up problem** is under its carry, since the engine names the class's carry: "This class's carry rate must be below the GP's share of the catch-up, 50%, or its catch-up never ends."
  - **In steps,** the carry has no one box, so its first step's rate carries the problem, and "Show me" and "Fix it" go there.
- **On Cash flows:** `call_without_payers` is under the call's row, as a cash flow's own problem is.

## 5. Pasting LPs (`src/lpPaste.ts`, `src/paste.ts`)

Class, then close, after the commitment.
- **A class** is matched by its name after trimming. Blank, or "Fund terms" itself, is the fund's terms. One not in the table is a row it can't read: "Row 5: 'Friends & family' isn't one of the fund's classes".
- **Closes** are read by the same code as the cash flows' dates, now shared in `paste.ts`, which reads the cash flows exactly as before. That brings the question when a paste could be read either way, and the "Dates read day first, as 25/1/2022 in row 2 can only be read that way." line.
- **The preview** counts what it read: "3 LPs, $10,000,000 committed, 1 in a class and 2 with a close; they'll be the table's first."

## 6. Files (`src/file.ts`)

**f03b's guard and its two tests are gone.**
- **Saving** keeps the rates, the classes and each LP's class and close. A fund without them saves without them, including one opened with them null or empty.
- **Opening:** class names and each LP's class are trimmed before the engine reads the file, so "Seed LPs " and " Seed LPs" are one class.

**An opened file's one line** names the class or the LP, as the plan lists:
- "The fee rate in row 1 of its LP classes …"
- "Carry step 2 in row 1 of its LP classes: …"
- "The class in row 3 of its LPs: this LP's class isn't one of the fund's classes."
- **A missing rate says why it's needed.**
- **A fee rate of 0** has the added line: 'Its management fee rate isn't a number the page can use: it's a rate above 0, written as an exact string like "0.02".'
- **A class term** the page doesn't model: "… `pref` on an LP class (row 1 of its LP classes). A class changes only the fee rate and the carry."

**Changed: the LP side-letter line.** It ended "Every LP is on the same terms here.", which isn't so from 0.3.0. It now ends "An LP's terms are its class's, or the fund's." fund-21's page test has the new words.

## 7. Payouts (`src/App.tsx`, `src/ClassesCard.tsx`, `src/Clawback.tsx`, `src/LpsCard.tsx`, `src/EqualizationCard.tsx`)

- **The split table** labels its carry rows from the split's own steps, no longer from the fund's terms.
  - **With two or more accounts,** each row names its class: "Fund terms: carry at 20% (up to 2.0x)", "Seed LPs: carry at 15%".
  - **With every LP in one class,** the rows are that class's, unnamed: "Carry at 15%". Before, the page would have labelled the split's steps with the fund's 20% and 30%.
- **The headline's terms line** adds each class that has LPs: "Carry 20%; no pref; no GP commitment. Friends and family: carry 0%, no fees."
- **"Each class at $X",** after the split, with two or more accounts:
  - **The columns:** LPs and GP this distribution and to date, paid in, LP multiple (rounded down, "—" with nothing paid in), and "Owed back" when final.
  - **At the NAV point** it follows the NAV split, so "Owed back" shows there for a fund that isn't final.
- **The clawback card:** your sentence, then "Owed back by class, each on its own totals" with each class's owed. Its intro ends "one run of the waterfall for each class, on its own totals".
- **The LPs' card:** a Class column after the name when an LP is in a class, blank for Fund terms, and the same column in its CSV.
  - **Its line under the card** says shares are of all the LPs' commitments, and an LP in a class gets its part of its class's.
  - **Without classes,** the card and the CSV are as they were.
- **"Equalization at the later closes,"** after the LPs' card, with a later close:
  - the rate
  - a block for each close ("1 Apr 2022: Birchwood Family Office joins"), then "All the closes together"
  - your line under it, and "Download as CSV", saved as `<slug>-equalization.csv`
- **The three cards after the split** share one table component (`src/CardTable.tsx`, moved out of the LPs' card), wide or in groups on a phone as the LPs' card was.
- **The breakpoints** are in the engine's words, as before. Their list keys each reason by its place, since two accounts' reasons can share a code at one X.

## 8. The examples

- **Case 26 joins the picker** after the clawback example, as "Two later closes and a friends-and-family class".
- **It opens at $5,200,000,** its listed X, between its two breakpoints.
- **The range's top** is $11M: twice its $5.25M paid in, rounded up to two digits.

## 9. Tests

**The page's pending list is empty,** so cases 22 to 28 run through the page's case tests:
- **The forms round trip:**
  - each case's terms through the Terms tab and the classes
  - its cash flows with its LPs
  - its classes and LPs through the LPs tab
  - each with the same breakpoints
- **Every case's `inputs.json` opens, and saves back with the same values.**
- **The chart, the clawback's sentence and chart,** and the GP's per-$1M line run on 22 to 28 too. The clawback test's list of final cases gains 24 and 28.
- **The fund-27 refusals,** in `test/classes.test.tsx`:
  - **All twenty, opened as a file,** in their one line.
  - **The fourteen the form can make,** each made on its base's tabs, its words under its cell, and the notice on Payouts. Each checks that the problem shown is at the fixture's own path.
  - **The six only a file can make:** a class that isn't an object, a class's own pref, classes that aren't a list, an LP's class that isn't text, a class that isn't there, and a close that isn't a date.

**New tests:**
- **`test/classesCard.test.ts`:** at every point of cases 22, 23, 24, 26 and 28, each row is the split's `byAccount` to the cent, and the case's `by_account` and `accounts` give the same. "Owed back" is there exactly when the split is final, and "—" shows for FA38's account.
- **`test/equalizationCard.test.ts`:**
  - **Cases 25 and 26:** each row at each close and over all of them is the case's exact amount rounded down, checked in whole-number arithmetic; the leftover is never negative and at most a cent an LP; the total is the column's exact total to the cent.
  - **Case 26's figures as you gave them,** Alder's 10,356.16, 22,520.54 and 32,876.71, and the CSV line by line.
- **`test/classes.test.tsx`:** the tabs, paste, files and Payouts, as in §2 to §8.

**Changed:** the four-example tests now have five, and the LP paste's "extra" cell moved past the fourth column, since the third is now the class.

**Four errors planted in a copy,** one at a time, and each caught:

| Error | Tests that failed |
|---|---:|
| The classes card's GP this distribution taken from to date | 10 |
| The equalization rounded half up, not down | 8 |
| The closes left out of the input | 8 |
| A class's own carry not kept for a way back | 1 |

## 10. Decisions I made (the plan's "(mine)")

1. **Where the two rates sit** on Terms, and the words for one that doesn't read.
2. **The LPs tab's intro with classes,** the "Classes" and "Each LP" headings, and the classes' Row column.
3. **A class's carry picker** of three, a new class on the fund's carry, and its own starting from the fund's.
4. **The Class column** only with classes. A class with no name yet is "Class 2" in the pickers.
5. **The line for a removed class,** and its going at the next change.
6. **A class's name, fee rate and catch-up words.**
7. **An opened file's places and rules** for classes, the missing rates, `call_without_payers`, a class term the page doesn't model, and the changed side-letter line.
8. **The paste:** "Fund terms" as the fund's terms, "class" and "close" as header words, and the preview's counts.
9. **The split's carry rows from the split's own steps.**
10. **The headline's classes.**
11. **The classes card:** its heading, columns, line, "Owed back" at $0.00 too, and following the NAV split.
12. **The clawback card's** table caption and intro.
13. **The LPs' card:** its Class column only with classes, and its line.
14. **The equalization card:**
    - its heading, rate line, block headings and column names
    - a Total row in each block, as the LPs' card has
    - the CSV's columns and rows
    - its name, the fund's name as Save writes it
15. **Case 26 opens at $5,200,000.**
16. **Under 640 pixels** each class and each LP is a card. The LP rows were cards under 480 before Class and Close were added.

## 11. Checked on the running page

`fund-page` on port 5174, in the browser pane:
- **Case 26 from the picker, at 800 pixels:**
  - **The split:** $5,150,000.00 of capital, and "Friends and family: carry at 0%" $50,000.00 to the LPs.
  - **"Each class at $5,200,000":** Fund terms $3,900,000.00, paid in $4,000,000.00, 0.97x; Friends and family $1,300,000.00, paid in $1,250,000.00, 1.04x.
  - **The LPs' card:** Cedar Holdings in Friends and family.
  - **The equalization card:** its three blocks, the last as in the table below.
- **Case 28 opened as a file:** the split's three named carry rows; the clawback $2,375,000.00, owed $1,925,000.00 to Fund terms and $450,000.00 to Seed LPs; its seven reasons, the fourth "Seed LPs: from here the GP has earned all the carry it was paid earlier."
- **At 320 pixels:** the LPs tab's classes and LPs as cards, and Payouts' five card tables in groups, with nothing wider than the screen.
- **No console errors.**

## 12. CI and permissions (hard rule 9)

Nothing in `.github/workflows/` or `.claude/`.

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   I got:
   - **The fund page:** 489 tests, 330 before.
   - **The fund package:** 1,042 and 6 skipped, 1,040 before: FA38's two.
   - **Unchanged:** the engine's 3,177 and the main page's 680.
   - **Both references:** passing, and all 28 fund case folders match.
   - **One earlier run failed one test** in `test/file.test.tsx`. That run had a second reference run and a page build going beside it. The test passed alone and in a full rerun on a quiet machine. The file tests' helper waits a second for a file to open, which a loaded machine can exceed.
2. **On the page:** `pnpm --filter @spillpoint/fund dev`, then:
   - **"Two later closes and a friends-and-family class" (case 26),** at $5,200,000:
     - **Payouts,** in order: the split, "Each class at $5,200,000", "Each LP at $5,200,000", "Equalization at the later closes", Breakpoints.
     - **The equalization card's last block:**

       | LP | Paid in | Got back | Interest paid | Interest received |
       |---|---:|---:|---:|---:|
       | Alder Endowment | $0.00 | $1,533,333.33 | $0.00 | $32,876.71 |
       | Birchwood Family Office | $700,000.00 | $416,666.66 | $10,356.16 | $11,260.27 |
       | Cedar Holdings | $1,250,000.00 | $0.00 | $33,780.82 | $0.00 |
       | Left over from rounding down | $0.00 | $0.01 | $0.01 | $0.01 |
       | Total | $1,950,000.00 | $1,950,000.00 | $44,136.99 | $44,136.99 |

       Alder's interest received is $10,356.16 and $22,520.54 in the two blocks above it. "Download as CSV" saves `two-later-closes-and-a-friends-and-family-class-equalization.csv`.
     - **LPs:**
       - **The class** is Friends and family, fee rate 0, Flat 0.
       - **Birchwood closes** 1 Apr 2022 and Cedar 1 Oct 2022.
       - **"Add a class":** name it Anchor, put Alder in it, then rename it. Alder stays in it.
       - **Remove Friends and family:** Cedar moves to Fund terms, and the line says so.
     - **Terms:** clear the management fee rate. "Needed: a class has its own fee rate." shows under it, and Payouts says the terms' last change has a problem.
   - **"Open a file":** `packages/fund/cases/fund-28-classes-clawback-steps/inputs.json`, at $0:
     - **The split's carry rows:** "Fund terms: carry at 20% (up to 2.0x)", "Fund terms: carry at 30% (above 2.0x)" and "Seed LPs: carry at 15%".
     - **The clawback card:** owes $2,375,000.00, with $1,925,000.00 to Fund terms and $450,000.00 to Seed LPs under it.
     - **The classes card's "Owed back"** is the same two amounts.
     - **Breakpoint 2, $15,000,000:** "Fund terms: the clawback owed starts to fall: on its own totals, LPs reach 2.0x: carry is 30% from here."
     - **Move X to $15,937,500:** the owed is $459,375.00 for Fund terms and $0.00 for Seed LPs.
   - **"Open a file":** `packages/fund/cases/fund-25-later-close/inputs.json`. There's one block for Cedar's close on 15 Jul 2021, and no classes card.
   - **At 320 pixels:** the LPs tab and case 26's Payouts, with nothing off the screen.
3. **Nothing outside the page moved after the first commit:**

   ```bash
   git diff --stat 4e5b571 -- packages apps/dashboard cases reference
   ```

   It prints nothing.

## Assumptions added

None in `ASSUMPTIONS.md`: the page's choices are in the plan, marked "(mine)", and listed in §10. FA38 changed, as you answered, and FA33 to FA38 are confirmed.

## Open questions

1. **"Owed back" at $0.00** shows whenever the split is final, so case 28 past $10,000,000 lists Seed LPs at $0.00. Or only when some class is owed something, as the LPs' card's clawback column is?
2. **The headline's classes,** "Friends and family: carry 0%, no fees.": wanted, or should the terms line stay the fund's alone?
3. **"Fund terms" in a paste's class column** reads as the fund's terms. Fine, or should only a blank cell mean that?
4. **The equalization CSV's name** has no X or D, since the equalization depends on neither. Did you mean it named exactly as the LPs' CSV, `…-lps-at-X-on-D`?
5. **Screenshots:** as in f02c, I checked in the browser pane rather than adding shots to the screenshot script. Add them for f03d?
6. **For f03d:**
   - the README's "What it covers", "What it doesn't model yet" and "How it's tested"
   - the worked example
   - the release note
