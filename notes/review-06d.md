# Review: 06d (OCX 0.7, from a real Mantle export)

Branch `06d-ocx-0.7-plan`, from main. No engine code and no case file changed.

**The one code change** is your item 4: the cell-kinds script learns 0.7, which is code, in `apps/dashboard/src/ocxStructure.ts` and its test. It also fixes a bug of mine from 06c (section 4).

Three commits:
1. **The cell-kinds script** taught 0.7, with the fix.
2. **`notes/plan-0.6.0.md` revised for 0.7,** and ASSUMPTIONS OX2.
3. **This note.**

The Mantle export stayed in `local/ocx-reference/`, read there. Nothing from it is in the repo but tab names and headers, and no fixture is made from it (section 4 says what the new test workbook does use).

## 1. The export, checked

**What you found holds,** with these corrections:
- **"Every total is a formula with no saved value":** all but one. A percentage formula in the pool's row is saved as 0.
- **"Ledger dates … sometimes 'Unknown'":** "Unknown" is only in Context's `Stockholder Approval Date`, three times. The ledgers' dates are all YYYY-MM-DD, except that a converted SAFE's `Conversion Date` carries a certificate reference after the date: "2021-01-15 (SPS-3)".

**And these additions:**
- **No Financing History on Context,** the table 0.5 keeps each series' issue price, conversion price, multiple, participation and cap in. Nor a 409A, split or shareholder-group table. The company has no preferred stock, so whether 0.7 drops the table or just has nothing to put in it is the biggest open question.
- **A class ledger has no class column.** Its class is in its title row, "<company> <class> Ledger". The company's name is the Summary View's title less "Summary Capitalization".
- **The shares a converted SAFE became are a class of their own,** "<class> (SAFE conversion)", like R5's series from SAFEs. Its tab name is the one cut to 31 characters.
- **The Stakeholder View has one `Stock Warrants` column** for every warrant, where 0.5 has one per class.
- **The Summary's plan rows are named for the plan,** `<plan> Options Outstanding` and `<plan> Options Available to Grant`, and its warrants row is `Warrants`.
- **Every ledger has the holder's `State of Residence`,** personal data, and a currency column for each amount ("USD" here).
- **Computed columns,** such as `Fully Diluted Shares` and `% Fully Diluted`, are values, not formulas.
- **The convertibles table on the Summary View is empty,** since both SAFEs converted.

The plan's new section, "OCX 0.7, as one Mantle export writes it", has all of this. Its versions table has a 0.7 column.

## 2. The definitions, and other tools

**No 0.6 to 0.8 definition is published** anywhere I could reach:
- **The Coalition's OCX wiki** stops at the file named 1.0, which is 0.5.
- **The converter** hasn't changed since June 2023, and has no tags or releases.
- **The OCF repository's docs** describe OCX in a paragraph, and **the Coalition's site** doesn't mention it.
- **Mantle's export docs and blog** give no version. I couldn't find the 0.8 mention.

**The one trace of a later version** is OCX issue #60 (September 2024), about exercise prices in "Plans Ledgers, the Non-Plan Options Ledger, and the Warrants Ledger". Its answer, in my words: "Price Per Share" is the ledgers' general term, cost basis for stock and the exercise price for options and warrants. Mantle's 0.7 doesn't quite follow it: its plan ledger says "Exercise Price", its stock ledgers "Price".

So 0.7 here is what Mantle writes. Question 06d-1 asks whether to ask the Coalition or Mantle for the reference workbooks. **No license to check:** nothing was published to read.

**A free plan that exports OCX with preferred stock: none confirmed.**
- **Carta Launch:** free, under 25 stakeholders and $1M raised, but priced rounds sit in paid tiers, and whether Launch has the OCX report isn't stated. Worth a try, since it would also show which version Carta writes.
- **Mantle's free plan:** no preferred, as you know.
- **Walter:** announced OCX once; that page is gone, and its plans start at $99 a month.
- **The Coalition's converter:** free, but it writes its own early layout, not 0.7.

The likeliest routes are a sample from Mantle, the Coalition's workbooks, or a Carta Launch test company.

## 3. The plan, revised for 0.7

`notes/plan-0.6.0.md`:
- **The intro:** 0.3 to 0.5 is a snapshot; 0.7 adds ledgers.
- **What I read:** the export, with its size and SHA-256, and the search.
- **The new 0.7 section** (section 1 above), and **0.7 in the versions table**.
- **0.7 is told apart by its headers,** your answer 4, and the label reported. A workbook mixing layouts is refused.
- **Dates:** the 0.7 as-of text ("As of Sat, 10 Oct 2026", its weekday checked), "Unknown" as a blank where a date is needed, and a date followed by a reference.
- **Row labels in any case,** as you said; headers still match case and all.
- **"From 0.7's ledgers":** what `readOcx` reads from each ledger, and asks only for what's missing:
  - holdings from outstanding certificates
  - each grant's strike and class, RSUs by `Type`, expired grants left out
  - each warrant's holder, class and exercise price
  - each SAFE with its own holder, terms and status
  - the issue order from issue dates
  - a currency other than USD refused
  - `State of Residence` never read
- **Checks between tabs' value cells,** since every total is a formula with no value.
- **What's left to fill from 0.7:** seniority, a preferred series' terms the workbook doesn't give (all of them, without Financing History), and a note's terms if there's no notes ledger.
- **Which of your answers change:**
  - **1:** the ledgers may make Carta's securities ledger report unneeded.
  - **4:** two layouts.
  - **5:** round-to-class matching only where Financing History exists.
  - **8:** strikes from the plan ledger.
  - **9:** warrant strikes and classes from the ledger.
  - **10:** one SAFE per row, no combining.
  - **11:** notes from a notes ledger, if 0.7 has one.

  Unchanged: 2, 3, 6, 7, 12 and 13.
- **Five questions (06d-1 to 5)**, below.
- **What only a 0.7 export with preferred stock and a note can settle:** 16 items, led by Financing History and the notes ledger's headers.
- **The steps, renumbered again:** 06d this, 06e cases, 06f the engine, 06g the page, 06h the release.

## 4. The cell-kinds script learns 0.7

- **Tabs:** `Summary View`, `Stakeholder View`, `Warrants Ledger` and `SAFEs Ledger` by name.
- **A ledger named for a class or a plan** is known by its header row and labelled by kind, never by name:

  ```
  Tabs: Summary View, Stakeholder View, tab 3 (class ledger), …, tab 8 (plan ledger), Warrants Ledger, SAFEs Ledger, Context
  ```
- **Ledgers of one kind are reported together:** "class ledgers (tabs 3, 4, 5, 6, 7)".
- **Headers with nothing under them** share one line, "empty throughout". On the export that cuts the five class ledgers' 160 lines to 22.
- **0.7's headers:**
  - every ledger's
  - the Summary View's (`MFN` and the unspaced `Shares Authorized/Reserved`)
  - the Stakeholder View's (`Stock Warrants`, with `<class> Stock` counted as class columns)
  - Context's (`No. Shares`)
- **Financing History is still looked for on a 0.7 Context,** so the report says whether an export has it. On the Mantle export it prints "not found: Round, Initial Closing Date, … Participation Cap".
- **A ledger's `State of Residence`** prints "not read".

**The bug I fixed, from 06c.** On a tab the format doesn't name, the header row was the first row with any format name, titles included. So a title row, "Additional Information" above a block of holders' details, became the header row, and the block was counted by kinds instead of being left unread. No value was ever printed, but it went against the rule. The header row is now the first row with a header, and a test pins it.

**The test workbook.** It's a fictional 0.7 workbook, Tamarisk Labs again, written in the test. It uses the Mantle export's tab names and headers, the interface you allowed to be named. The company, holders, numbers and arrangement are our own, and nothing else is taken from the export. If you'd rather no test use 0.7's headers until a published definition or your OK, say so and I'll take it out.

## How to check by behavior

1. **The tests:**

   ```bash
   pnpm test
   ```

   - **Page:** 541 pass, 4 new, in `test/ocx-structure.test.ts`:
     - 0.7's tabs and the named ledgers by kind
     - Context with Financing History not found
     - the plan and SAFE ledgers, with a leak check
     - the title-row fix

     Three existing expectations changed: a column headed "Class A Common Stock" now counts as a class column, through 0.7's `<class> Stock` pattern; "Issue Date", now a known header, is named; and "nothing below it" joins "empty throughout".
   - **Engine:** 2,265, unchanged.
2. **The script on the export,** where you put it:

   ```bash
   pnpm ocx-structure local/ocx-reference/Test-Mantle_Export-2026_10_10.xlsx
   ```

   Every tab is recognized, and the ledgers are reported by kind. On Context it prints "not found:" for Financing History's headers, and "State of Residence: not read" in each ledger.
3. **The leak test still bites.** I made the report print a company-named heading and a ledger's tab name, and four tests failed. They passed again once it was put back.

## Decisions for you

The plan's questions 06d-1 to 06d-5:
1. **Asking** the Coalition or Mantle for the 0.6 to 0.8 workbooks.
2. **Keeping** 0.4/0.5.
3. **Starting** the cases now, from the Mantle export's headers and the reference.
4. **Reading** preferred in 0.7 with blanks, rather than refusing it.
5. **Taking** the issue price from the ledger's `Price`, only when it's the one price.

And the script's choices:
- ledgers known by their header rows
- ledgers of one kind reported together
- "empty throughout"
- `State of Residence` never read
- Financing History looked for on a 0.7 Context
- the title-row fix
- the test workbook in 0.7's headers

## Assumptions added or changed

- **OX2:** 0.7, the grouping, "empty throughout", `State of Residence`, and the fix.
- **The OCX section's opening:** the import's rules come with the cases, in 06e.
- **No modeling choice changes yet.** The plan's 0.7 reading rules join ASSUMPTIONS with the cases, once you've answered.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing ran outside the sandbox.**
- **No download:** the export was read where you put it.
- **The network was used only to read:** the Coalition's repositories through GitHub's API, a few web searches, and some web pages.

## Checks

- **Page:** 541 tests pass.
- **Engine:** 2,265 tests pass, unchanged.
- **Typecheck:** clean.

## Next

06e, the cases, once you've answered. I'm stopping here.
