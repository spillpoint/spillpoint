# Review: 06c (the part of OCX that doesn't wait for Carta's headers)

Branch `06c-xlsx-reader`, from main. The `cases/` edit rule is on, and no case file changed. No version bump. Six commits:
1. **The engine:** the naming review's item 7 beside the old names, and the OCX input types, with the engine README. Nothing breaks.
2. **The .xlsx reader,** in a module the page and Node both run.
3. **`pnpm ocx-structure`,** the cell-kinds script, with its line in the root README.
4. **The docs:** ASSUMPTIONS OX1 and OX2, and plan-0.6.0's steps renumbered.
5. **This note.**
6. **After your review:** every tab in the cell-kinds report, and the formula-total question in the plan (below).

The page itself doesn't change yet: nothing here is on screen. "Open a cap table export" is 06f.

## 1. The engine: one refusal class and one result type, beside the old names

The naming review's item 7 (07a, #79), added so nothing breaks:
- **`ImportRefusal`,** a new export: `format` (`"ocf"` or `"ocx"`), `kind`, `term` and `subject`.
  - **`OcfRefusal` is now its subclass.** `readOcf` still throws an `OcfRefusal`, named so, with the same fields plus `format: "ocf"`.
  - **Code that catches either works.**
  - **`OcfRefusal` is marked deprecated:** from 0.7.0 `readOcf` throws `ImportRefusal` itself, and the old name goes.
- **`CapTableImport`, `ImportReport`, `ImportBlank` and `ImportNote`:** the result's types under names both imports share. `OcfImport`, `OcfReport`, `OcfToFill` and `OcfNote` are now aliases of them, marked deprecated, and go in 0.7.0. `readOcf` returns exactly what it did.
- **`OcxWorkbook`, `OcxSheet` and `OcxCell`:** what the page reads from an .xlsx, and what `readOcx` will take.
  - **`OcxWorkbook`:** `{ dateSystem, sheets }`.
  - **`OcxSheet`:** `{ name, cells }`.
  - **`OcxCell`:** `{ address, kind, text, formula }`.

  `dateSystem` and `formula` are two fields beyond item 7's first shape. #79's plan now says why (decision 1).
- **Exports:** 18 runtime exports, with `ImportRefusal`, which the API test pins. Everything else added is a type.

## 2. The .xlsx reader

`apps/dashboard/src/xlsx.ts`, with `xml.ts`, as OX1 sets out:
- **How it opens one:**
  - **The zip:** the page's own zip reader and its 100 MB limit.
  - **The XML parts:** a small reader of our own, since Node has no DOMParser. No dependency.
- **What it gives:** the worksheets in order, and each cell that holds something, as Excel stored it.
- **Text:** shared strings looked up, rich-text runs joined, phonetic guides left out, inline strings and formula results read.
- **Numbers:** the text Excel wrote, "0.20000000000000001" and not 0.2. Never a JavaScript number.
- **Formulas:** marked, never worked out. The text is the value Excel saved, or empty when none was.
- **Dates:** a number in a date or time format is a date, and so is an ISO date Excel wrote as text. The workbook's date system, 1900 or 1904, comes with them. What a day count means is `readOcx`'s, in 06e.
- **Refused, each by a code:**
  - an old .xls or a password-protected workbook
  - a file that isn't a zip
  - a zip that isn't a workbook, such as an OCF package
  - an .xlsb
  - XML it can't read, including any DOCTYPE
  - a missing shared string or part
  - a cell it can't place or read
  - the zip reader's own refusals, with the too-large message in workbook terms

**Checked locally on the Coalition's four reference workbooks** in `local/ocx-reference/`. All four read. One finding: the 0.3 workbook writes Context's dates as day counts in Excel's built-in date format, and 0.4 and 0.5 write them as text, "YYYY.MM.DD". So both forms are real, and the reader tells them apart. Nothing from them is in the repo.

## 3. `pnpm ocx-structure`

Your answer 2a, kept small (OX2):

```bash
pnpm ocx-structure path/to/export.xlsx
```

**What it prints:** counts, kinds, and the format's own tab names and headers. On Tamarisk Labs, the fictional workbook in its test, part of the output reads as follows. The test passes 0.6.0 as the version; the script prints the engine's, 0.5.0 until the release.

```
spillpoint 0.6.0: an OCX workbook's structure, in counts and kinds
Dates: the 1900 system
Version label: OCX Version 0.5
Tabs: Summary Snapshot, Stakeholder Snapshot, Voting by SH Group, Context, tab 5
Stakeholder Snapshot:
  Stakeholder: 5 text
  Total Stock (outstanding): 3 numbers (3 with 15 digits or fewer, 0 with 16 or 17), 3 formulas, 2 empty
  other columns: 2; 8 numbers (8 with 15 digits or fewer, 0 with 16 or 17), 1 formula, 2 empty
  class columns (outstanding): 1; 5 numbers (5 with 15 digits or fewer, 0 with 16 or 17), 1 formula
  Voting power by stakeholder: set aside
  Additional Information: not read
Context:
  Initial Closing Date: 1 text (1 as YYYY.MM.DD, 0 as YYYY-MM-DD, 0 other)
  Most Recent Closing Date: 1 date (1 as day counts, 0 as ISO text)
  Original Issue Price: 1 number (1 with 15 digits or fewer, 0 with 16 or 17)
  not found: Valuation Date, Price Per Share (Common), …
```

**What it settles,** of the plan's open questions for the export:
- **Values or formulas (4):** the formula counts, and "with no saved value".
- **How dates are written (5):** day counts, ISO text, YYYY.MM.DD or YYYY-MM-DD.
- **Digits (6):** typed numbers have 15 or fewer; computed ones usually 16 or 17.
- **Headers that differ from 0.4/0.5:** "not found", and the headers counted only as "other columns".

**What it never prints:**
- a value
- a header the company wrote, such as a class or plan named in a heading, which is counted by its kind only
- the voting block, which is set aside
- the Additional Information block, where holders' addresses are, which is never read

**A refused workbook** prints only its code, "Workbook: refused, not_xlsx".

**It needs Node 22.18 or later, and no engine build:** the page's modules use the engine only for types. I checked it with the engine's build moved away.

## How to check by behavior

1. **The tests:**

   ```bash
   pnpm test
   ```

   - **Engine:** 2,265 pass, 4 new, in `test/imports.test.ts`:
     - `readOcf`'s refusal is an `ImportRefusal` and an `OcfRefusal`, with `format: "ocf"`
     - an OCX refusal isn't an `OcfRefusal`
     - the old type names are the new ones
     - an `OcxWorkbook`
   - **Page:** 536 pass, 56 new:
     - **`test/xlsx.test.ts`:** each reading rule and each refusal, on workbooks the test writes, our own.
     - **`test/ocx-structure.test.ts`:**
       - Tamarisk's report, pinned in full.
       - A leak test: no text or number from the workbook may appear in the report, other than the format's own names and short numbers indistinguishable from counts.
       - **To prove the leak test bites,** I made the report print the company's headers. It failed on "Class A Common Stock", and passed again once it was put back.
2. **The script on a real workbook.** The Coalition's reference workbooks can be fetched again from the plan's table, and checked by SHA-256. Put them in `local/`, then:

   ```bash
   pnpm ocx-structure local/ocx-reference/OCX.v.1.0.xlsx
   ```

   It finds every 0.4/0.5 header, and prints "Version label: OCX Version 0.5". On `OCX.v.0.3.xlsx` it says what 0.3 lacks: "not found: Liquidation Multiple, Participating (Y/N), Participation Cap, …".
3. **A file that isn't a workbook:**

   ```bash
   pnpm ocx-structure package.json
   ```

   It prints "Workbook: refused, not_xlsx".

## Decisions for you to check

1. **`dateSystem` and `formula`** on the OCX input types, beyond item 7's first shape: a day count means nothing without its system, and question 4 (values or formulas) needs the flag. #79's item 7 has them.
2. **What counts as a date (OX1):**
   - Excel's built-in date and time formats.
   - A custom format with a day, month, year, hour or second code once quoted text, escapes, padding and bracketed colours or locales are taken out. Elapsed time counts.
   - An ISO date Excel wrote as text.
3. **What's listed:**
   - **Hidden tabs** are read like the rest.
   - **Chart sheets** are left out.
   - **Empty cells,** styled or not, aren't listed.
   - **True and false** are "1" and "0".
4. **The OCX credit,** at the top of the reader and the engine's OCX types, mirroring OCF's agreed line: "OCX is developed by the Open Cap Table Coalition: https://github.com/Open-Cap-Table-Coalition/ocx. spillpoint reads files in that format." It goes in the README with `readOcx`.
5. **The cell-kinds script's choices (OX2):**
   - a column's cells run to the next header row or table title
   - digits are counted as 15 or fewer, against 16 or 17
   - the voting block is set aside
   - the Additional Information block is never read
6. **The format's names in the source:** `ocxStructure.ts` lists the tab names, headers and table titles of 0.3 to 0.5. They're the interface you allowed to be named. Nothing else from the workbooks is in it.
7. **An `OcfRefusal` now has `format: "ocf"` among its own fields.** It's additive, but code that compares one field by field would see it. No existing test did.

## Assumptions added

- **A new section, "OCX import (0.6.0)":**
  - **OX1:** reading an .xlsx.
  - **OX2:** the cell-kinds script.

  The import's own rules join it in 06d, once the headers are in.
- **`notes/plan-0.6.0.md`:**
  - **The steps, renumbered:** 06c this, then 06d cases, 06e the engine, 06f the page and 06g the release. The questions and answers keep their old numbers, with a note mapping them.
  - **"The input"** says what was built.

## Checks

- **Engine:** 2,265 tests pass.
- **Page:** 536 tests pass.
- **Reference:** 71 unit tests pass, and every `expected.json` matches.
- **Typecheck and build:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **The root `package.json`** gains the `ocx-structure` script.
- **Nothing ran outside the sandbox, and nothing used the network.** The reference workbooks were read where they already were, in `local/`.

## After your review (Jordan, 06c review)

**Your checks:**
- main and #80 compared: only additions, with `OcfRefusal`'s name, constructor and `instanceof` kept and `format` gained
- the reader on workbooks from openpyxl, XlsxWriter and a LibreOffice re-save, and its refusals on a DOCTYPE, a 300 MB zip bomb, an .xls and a broken shared-string index
- the script on a workbook of planted names, amounts, dates, emails and a company-named tab

Decisions 1 to 7 agreed.

**1. The cell-kinds report covers every tab.** Carta's tabs may not match the reference, and the securities ledger report has its own layout; either used to print only "other tabs N".
- **The Tabs line** lists every tab in order, the format's by name and any other by position: "Tabs: Summary Snapshot, …, Context, tab 5".
- **A tab the format doesn't name** gets its own section: each column by its letter, with the kinds of cell in it. Its tab name, which can name the company, is never printed.
- **Its header row** is the first row with any of the format's names in it. A column's cell there is printed as its header only when it's one of those names; any other text is counted as text.
- **A column headed by an Additional Information name** isn't read.

From the new test, a layout of its own, as a securities ledger report might have:

```
tab 2:
  column A (Stakeholder): 5 text
  column B: 4 text
  column C: 4 numbers (4 with 15 digits or fewer, 0 with 16 or 17), 1 text, 1 formula, 1 saved as 0
  column D (Original Issue Price): 3 numbers (2 with 15 digits or fewer, 1 with 16 or 17)
  column E: 3 dates (3 as day counts, 0 as ISO text), 1 text
  column F (Email Address): not read
```

Two choices of mine within it:
- **One header row per tab,** not every cell with a format name. Run on the Coalition's diff workbook, whose change log lists old headers as data, the first version printed a column's whole list of names, and called it not read because one was an Additional Information name. One header row per tab fixes that.
- **The version label** is looked for on every tab, not only the five, in case an export puts it elsewhere.

**2. Formula totals saved as 0,** in the plan as open question 15, for 06e: if the export's totals are formulas, `readOcx` reads only value cells, and a formula total it can't trust is skipped with a report line rather than called malformed. "The input", "Totals are checked" and the refusal list now point to it.

**My addition, to help settle it:** each formula count says how many were saved as 0 ("17 formulas, 5 saved as 0"). A 0 can't be told from a real one, so it only shows how many could be. All of a column's formula totals at 0 beside non-zero data would point to an export that doesn't work its formulas out. On the reference workbooks it counts real zeros, such as the pool row.

**ASSUMPTIONS OX2** says all of this.

**Checks:**
- **Page:** 537 tests pass, 1 new.
- **Engine:** 2,265 pass, unchanged.
- **Typecheck:** clean.

## Next

06d, the OCX cases, waits for a real export's headers, and for the choice between OCX and the securities ledger report. I'm stopping here.
