# Review: 06g (the page: opening an OCX workbook)

Branch `06g-ocx-page`. **No case changes, and no engine changes.**

Three commits:
1. **ASSUMPTIONS:** your OX14 wording fix, a new OX15 for the page and the check script, a line in O15, and the plan.
2. **The page,** the check script, and their tests, with a workbook for you to save from a spreadsheet app.
3. **This note.**

## 1. What the page does

**"Open a cap table export"** replaces "Open an OCF export". It takes an OCX workbook (.xlsx) on its own, or an OCF export as before. An .xlsx picked with other files is turned away with a plain message. The flow is O13's: the report first, then the questions, then "Use this cap table". The import is called by its file's name, since OCX names no company.

**The report:** a plain-English line for each of readOcx's notes. Each names a holder, class, grant or tab where the note has one, and none is a bare code.

**The questions:**
- **Seniority** starts with no order set, and must be answered before Use. The choices:
  - "All pari passu"
  - "Stacked, latest round senior", listing the series in that order
  - "Arrange them by hand", which gives a tier for each series; series in one tier share it pari passu
- **One-click answers for a preferred series,** clicked and never preset:
  - **"Conversion price = issue price"** copies the issue price, the workbook's or the one you typed.
  - **"1x, non-participating"** sets participation, and the multiple when it's asked.

  Participation "with a cap" then asks the cap.
- **The one-strike question:** before a 0.4/0.5 option column's strike, the page asks whether all its options share one strike. Non-plan awards count as such a column. "No" stops the import with a plain message naming the column. The strike is asked only after "Yes".
- **A note from a convertibles row:**
  - its rate, typed as a percentage, 0 allowed
  - its issue date
  - what its cap divides by, of three
  - its repayment multiple
  - the sale's date, as for an OCF note
- **A SAFE's cap kind,** as for OCF.

**"Copy a summary to share"** (05a2, built here):
- **Where:** on the review, on a refused import, and on a refusal at Use. At Use it adds the engine's code and each answer's kind ("participation=participating_capped", "cap_multiple=number"), never a value.
- **How:** it opens in full first, in a box you can read. "Copy" copies exactly that text to this computer's clipboard, and nothing is sent.
- **For an .xlsx:** the import's counts and codes, then the workbook's structure as the cell-kinds script prints it (OX2).
- **For an OCF export:** O15's summary, so both formats have it.

**`pnpm ocf-check workbook.xlsx`** prints the same summary, then the engine's runs over the blanks' answers, as it does for OCF:
- **the one-strike question:** tried as yes
- **seniority:** both orders that need no arranging
- **placeholders:** a cap of 2, a rate of 5%, and the as-of date, each printed as a word

## 2. The tests

**`test/ocx-import.test.tsx`,** clicked through in a simulated browser on .xlsx files the tests write from each case's `workbook.json`. A new `xlsxOf` writes them, and a test checks all nine read back from it exactly.
- **Every OCX case:** the report shows first, named for the workbook, with a line for each note.
- **The six locked cases,** answered on the page as their `expected.json` gives:
  - each opens, and pays as its locked case does, to the cent, at every breakpoint
  - Millrace's seniority is arranged by hand, its two seed classes in one tier
- **Hollis Mill:**
  - the one-strike question comes before the strike, and "No" stops with the column named
  - seniority starts unset and is required
  - every answer lands in the saved cap table: strikes, the note's four terms, the tiers
- **The one-click answers:**
  - nothing is set until clicked, then they fill the conversion price and 1x non-participating
  - with no issue price in the workbook, the shortcut copies the one typed
- **The summary to share:**
  - a refused workbook's summary opens first, "Copy" copies exactly it, and it holds no holder's name, row number, company name or amount
  - a refusal at Use adds its code and each answer's kind, never the value typed
- **One workbook at a time.**

**`test/ocf-check.test.ts`:**
- **Hollis Mill:** read, and every answer set reads.
- **A refused workbook:** its kind and term.
- **Every OCX case and fixture, 73 of them:** no holder's name, no date, no amount of four digits or more, and every printed answer a code or a word.

**`test/saved-workbook.test.ts`:**
- the fixture is what the writer writes today
- it imports as case 06 does
- a third test waits for the re-saved file (below)

**`test/ocx-structure.test.ts` and the OCF page tests:** unchanged but for the button's new name.

**To prove the tests bite,** I broke the page two ways, one at a time, and a test failed each time. Each was put back after:
- a "No" to the one-strike question that didn't stop the import
- the one-click answers preset when the review opens

## 3. The workbook to save from a spreadsheet app (your 0.6.0 answer 13)

`apps/dashboard/test/fixtures/hollis-mill.xlsx` is OCX case 06, Hollis Mill, our own fictional company, written by our own writer. Each formula cell holds only its saved value, so the spreadsheet app has nothing to work out and can't change a number.

**Please:**
1. **Open** `apps/dashboard/test/fixtures/hollis-mill.xlsx` in Excel. Numbers or LibreOffice also work; see step 3.
2. **Change nothing.**
3. **Save a copy as .xlsx,** named `hollis-mill-saved.xlsx`, in the same folder, `apps/dashboard/test/fixtures/`:
   - **Excel:** File > Save As…, File Format "Excel Workbook (.xlsx)".
   - **Numbers:** File > Export To > Excel…, then .xlsx.
   - **LibreOffice:** File > Save As…, file type "Excel 2007-365 (.xlsx)", then "Use Excel 2007-365!".
4. **Excel writes your name into the file's properties** (File > Properties > Summary, Author). Clear it and save again, if you'd rather it weren't in the repo.
5. **Run:**

   ```bash
   pnpm --filter @spillpoint/dashboard test saved-workbook
   ```

   The third test now runs: the re-saved file must import exactly as case 06 does.
6. **Commit the file** on this branch, or send it to me and I'll add it with whatever it shows.

## 4. Your Mantle export on the page

I opened `local/ocx-reference/Test-Mantle_Export-2026_10_10.xlsx` on the page locally:
- **Setup:** the dev server in the built-in browser pane, the file handed to the page's import input from `local/`. Nothing left this computer.
- **It imports.** The review shows seven lines:
  - the version label, 0.7
  - OCX's four missing fields: dividends, conversion groups, a carve-out, the sale's date
  - the skipped formula totals
  - the warrant counts read as maximums
- **It asks nothing** but how far to show exit values:
  - no preferred stock, so no seniority and no series terms
  - no strike, since 0.7's ledgers give every grant's
  - no note, so no sale's date
- **No unrecognized header or tab.**
- **"Use this cap table"** opens it, and the payouts show for every holder.
- **The summary to share** opens in full, with no date and no amount in it.
- **`pnpm ocf-check`** on it: read, with nothing to fill in, and the engine reads it.

## How to check by behavior

1. **Open the test workbook on the page:**

   ```bash
   pnpm dev
   ```

   Then "Open a cap table export" and pick `apps/dashboard/test/fixtures/hollis-mill.xlsx`. Things to try:
   - **The report and questions:** read the report, then answer "No" to a one-strike question and Use: it stops, naming the column.
   - **The rest:** answer "Yes" to each, give strikes and the note's terms, choose a seniority order, give the sale's date, and Use: the cap table opens.
   - **"Copy a summary to share":** before or after.
2. **The check script:**

   ```bash
   pnpm ocf-check apps/dashboard/test/fixtures/hollis-mill.xlsx
   ```

3. **Run the tests:**

   ```bash
   pnpm test
   ```

   - **Page:** 651 pass, 109 new, 1 waiting for the re-saved workbook.
   - **Engine:** 2,758, unchanged.

## Decisions for you

1. **One button and one input for both formats,** an .xlsx on its own. OCF's label and tests move with it.
2. **An import from an .xlsx is named by its file,** since OCX names no company. The workbook's titles are free text a company writes, so they aren't read for a name.
3. **"Copy a summary to share" for OCF too.** 05a2 planned it for OCF and was put on hold for lack of an export; the same box now serves both formats, with O15's summary for OCF.
4. **"Stacked, latest round senior"** orders series by the import's issue order, latest first, so an OCF-style `issue_order` decides it.
5. **The one-strike question covers non-plan awards,** which 0.4/0.5 reads as an option column, and not warrant columns (open question 1).
6. **Participation "with a cap" asks the cap,** read as including the preference, as OCF's cap is. Otherwise a capped series couldn't be answered on the page.
7. **A note's rate is typed as a percentage,** as the editor's is, and 0 is allowed. The other numbers must be above 0, as for OCF.
8. **The summary for an .xlsx includes the workbook's structure,** as the cell-kinds script prints it. It's long, about 140 lines for the Mantle export, but it's what would tell us why a real export didn't read. Shorten it if you'd rather.
9. **The workbook to re-save holds saved values only, no formulas,** so a spreadsheet app can't recompute and change a number.

## Assumptions added

- **OX15 (new):** the page and the check script for OCX.
- **OX14:** your wording fix. Only a formula with no saved value brings `formula_totals_skipped`; a blank or "N/A" `(as converted)` is skipped silently.
- **O15:** the page shows the summary since 0.6.0.

## Open questions

1. **Warrant columns:** a 0.4/0.5 `<class> Warrants` column can mix strikes too. Ask the one-strike question there as well? I'd say yes, the same way, but you named option columns, so I've left warrants as they are.
2. **The summary's length** (decision 8).

## CI and permissions

- **No changes** to `.github/workflows/`, and **none committed** to `.claude/`.
- **To open the page in the built-in browser** for sections 1 and 4, I created `.claude/launch.json` locally twice, to start the dev server. I removed it each time, and it isn't in the branch.
- **`cases/` and `reference/` are untouched,** so the `cases-locked` check doesn't need the label.
- **Nothing ran outside the sandbox. The Mantle export was read only by the page,** on the local dev server, in the built-in browser.

## Checks

- **Page:** 651 tests pass, 1 waiting for the re-saved workbook.
- **Engine:** 2,758 tests pass.
- **Typecheck and build:** clean.
- **Reference:** untouched.

## After your review (Jordan, after #88)

**Your check:** you drove the built page in headless Chromium, with workbooks written by openpyxl, a different writer from ours, and with the real Mantle export:
- every question, answer and refusal behaved as this note says
- the saved file held every answer, and nothing was preset
- no summary or `ocf-check` output held a name, amount or date

The nine decisions are agreed, and the summary keeps its full structure (open question 2).

**One commit:**
1. **The fixture now opens in a spreadsheet app.** `xlsxOf` wrote an empty `[Content_Types].xml` and a styles part with only `cellXfs`, which LibreOffice and openpyxl refused. It now writes:
   - **the content types:** defaults for the relationship parts and for XML, and overrides for the workbook, each worksheet, the shared strings and the styles
   - **a styles part with what Excel expects:** a font, the two required fills, a border, `cellStyleXfs`, `cellXfs` with their ids, and the Normal cell style

   **The page's reader** reads only `cellXfs`, so its own tests are unchanged.

   **`fixtures/hollis-mill.xlsx` is regenerated.** I checked it here with openpyxl, the one other reader on this machine (no LibreOffice or Excel). openpyxl opens it and re-saves it, and the copy openpyxl saved imports through the page's reader exactly as case 06 does.

   **A new test** checks that every part in a workbook `xlsxOf` writes has a content type, and that each override names a part that's there.
2. **The one-strike stop shows as soon as "No" is picked,** under the question, and again at Use.
3. **Warrant columns are asked too** (open question 1), the same way: "Do all the warrants in "Warrants for Common Stock" have the same strike?", with the strike asked only after "Yes". Hollis Mill's warrant column is tested like its option column.
4. **A made holder's note questions read with the name in quotes:** The note "Convertible notes, $8,000,000 cap, 20% discount (1)": simple interest (% a year). Likewise its issue date, its cap's base and its repayment multiple.

**In ASSUMPTIONS:** OX15 says warrant columns are asked, the stop shows at once, and the summary keeps its full structure, and it's marked agreed.

**When your re-saved workbook is in `fixtures/`,** I'll:
1. **run the waiting test**
2. **blank `dc:creator` and `cp:lastModifiedBy` in its `docProps/core.xml`** before committing it; the reader never reads that part
3. **say so in that commit's note**

The steps for saving it are in section 3 above.

**Checks:**
- **Page:** 653 tests pass, 2 more, with 1 waiting for the re-saved workbook.
- **Engine:** unchanged.
- **Typecheck and build:** clean.

## The re-saved workbook (Jordan, after the review commit)

**`fixtures/hollis-mill-saved.xlsx` is committed,** as you saved it from ONLYOFFICE 8.1, byte for byte (shasum `ec9600176792635456fecd4a468db39b367d513e`).

**The waiting test runs and passes:** the saved file imports through the page's reader exactly as case 06 does. It's real spreadsheet-app XML. ONLYOFFICE:
- rewrote every part
- added `docProps/app.xml`, `docProps/core.xml` and a theme
- wrote apostrophes as `&apos;`

It kept the same 473 cells, the same text, and no formulas.

**The author fields needed no blanking.** Its `docProps/core.xml` has no `dc:creator`, and its `cp:lastModifiedBy` is already empty. So I left the file unchanged rather than rewrite the zip for nothing. I also checked:
- `docProps/app.xml` holds only the app's name and version and five standard flags; there's no Company field
- no part holds a path, a user name or an address other than the fixture's own at hollis-mill.example
- the zip carries no comments

The reader never reads `docProps/`.

**The fixtures README** now says which app saved the file and that its author fields were checked.

**Checks:** the page's 654 tests pass, with none waiting. The engine is unchanged.

## Next

06h, release 0.6.0: the version, the release notes with 06a's breaking changes, both READMEs (readOcx in the API section), and the packed build checked. I'm stopping here.
