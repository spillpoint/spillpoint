# Review: 06f (the engine's readOcx)

Branch `06f-read-ocx`. **No case changes:** `cases/` is untouched, and `readOcx` agrees with every OCX case and fixture as written, so there was nothing to stop and tell you about.

Three commits:
1. **ASSUMPTIONS and the plan:**
   - your three points from #86
   - the Later item and the 06g line
   - what building `readOcx` settled, each marked "06f" in its row

   The case-file check drops the renamed-class-name exception, as C18 now says.
2. **`readOcx`,** its tests, and a page test that holds the engine's header lists to the cell-kinds script's.
3. **This note.**

## 1. `readOcx`

`readOcx(workbook)` takes the `OcxWorkbook` the page's .xlsx reader gives (OX1). It returns a `CapTableImport`, as `readOcf` does:
- `as_of`
- `cap_table`, with blanks `null`
- `issue_order`
- `to_fill`
- the report

It throws `ImportRefusal`, its `format` "ocx", its subject the workbook's own text (OX13). It's built to 07a's names.

**How it's laid out,** in `packages/engine/src/`:
- **`ocx-cells.ts`:**
  - tabs, header rows, and Context's tables by title
  - numbers to 15 significant digits, the date forms and the as-of label
  - ids, and the refusal helpers
- **`ocx-headers.ts`:** the headers each tab writes, which decide `unrecognized_field`. These are the cell-kinds script's lists, and a page test now holds the two together.
- **`ocx-terms.ts`:** what both layouts share.
  - the summary tab's classes and convertibles table
  - Financing History's terms, with O4's ratio check at 15 digits and the participation reading
  - notes and SAFEs made from a convertibles row
- **`ocx-07.ts` and `ocx-05.ts`:** the two layouts, each running OX13's eight steps in order.
  - **0.7:** its ledgers
  - **0.4/0.5:** its per-holder tab and Financing History
- **`ocx-import.ts`:** what's built: holders in OX6's order, classes, positions, SAFEs and notes, the issue order, and the report, its blanks taken from the nulls.
- **`ocx-reader.ts`:** `readOcx` itself: the layout from its tabs, then the reader for it.

**Exported** from the package beside `readOcf`. The API test pins it.

## 2. The tests

**`test/ocx.test.ts`:**
- **Every OCX case** is read from its `workbook.json` and must equal its `expected.json`, notes as a set (C16, C18). That's nine cases: the two 0.7 cases, Hollis Mill and the six locked cases.
- **Every fixture** is its base's workbook with its change applied, refused by kind, term and subject, or read to its whole result. That's 64: 42 refused, 3 to fill and 19 reads.
- **Each locked case written as OCX,** its answers applied, is paid against its locked case, as `ocf.test` does for OCF:
  - every payout within a cent at every listed exit value and breakpoint
  - the same answers and decisions, at the import's own breakpoints
  - the same breakpoints, within a cent, with the same reasons and jumps
- **Rules no case reaches,** in four tests on small changes to the cases:
  - the 1900 day count around Excel's 29 February 1900, which is refused
  - day 0 from 1904
  - a SAFE with no cap having no cap fields
  - a 0.7 workbook with a Financing History
  - a tab no layout names being set aside

**Measured, beyond the cent the tests require:**
- **Edge cases 4, 5a, 7, 8 and 12b:** each answered import pays exactly as its locked table does, line for line, with the same breakpoints.
- **Millrace:** within $0.00000004 on any line, and its 10 breakpoints within $0.0000004. That's what you found with the reference.

Against the locked cases' recorded figures, the gap is up to half a cent: they're recorded to the cent (E14).

**To prove the tests bite,** I broke `readOcx` three ways, one at a time. Each was caught:

| Break | Tests failed |
|---|---:|
| ignored a participation cap | 7 |
| skipped the expiry rule | 17 |
| let a duplicate holder through | 1, the fixture for it |

**Elsewhere:**
- **The page's test** that its header lists equal the engine's.
- **`cases.test`'s OCX comparison** now compares a renamed common or preferred class's name, as you asked. All six locked cases still match.

## 3. What building it settled (ASSUMPTIONS, marked "06f")

**Your three points:**
- **OX6, the holders' order:** the per-holder tab's, then the holders made for convertibles rows, in the table's order, in both layouts.
- **OX14, the empty-column rule** covers warrant columns too, with `warrant_counts_are_maximums` only when a warrant class is made.
- **C18:** the renamed-class-name exception is gone. Only option and warrant classes take their names from headings.

**And:**
- **06g's one-strike question** is in OX14 and the plan's 06g line.
- **Splitting a column by strike** is on the Later list.

**What the rules didn't say, and `readOcx` needed:**
- **OX5:** the `formula_totals_skipped` line comes exactly when the workbook has a formula with no saved value, since one the import needed was refused.
- **OX7:** in 0.7, the ledger's issue price, and the earliest issue date for the issue order, come from outstanding certificates only, since a row set aside has nothing more read. A 0.7 workbook with Financing History takes a series' terms and closing date from it.
- **OX8:**
  - two ledgers for one class are read together
  - a tab no layout names, and whose header rows mark no ledger, is set aside with no line
- **OX9:**
  - a blank or "Unknown" expiration date doesn't expire
  - the per-holder tab's holdings and pool row are values the import needs, so a formula with no value or a non-number there is refused, naming the holder
- **OX11:**
  - a SAFE or note with no cap has no cap fields, as OCF's import writes them
  - the convertibles check runs where the table has any row, a notes row included
- **OX14:**
  - an `(as converted)` value needn't be whole; every other holding must be
  - a missing Financing History or Stock Plan Details is `missing_header`, "Context: Round" or "Context: Plan Name"
  - a `<class> Warrants` heading for an unknown class names the class as the heading writes it

## How to check by behavior

1. **Run the tests:**

   ```bash
   pnpm test
   ```

   - **Engine:** 2,744 pass, 95 new in `ocx.test`.
   - **Page:** 542, 1 new.
2. **Compare with your reader:** `readOcx`'s output for each case and fixture is exactly what `ocx.test` compares with `expected.json`, so it should match your reader line for line too.
3. **On the page** there's nothing yet: "Open a cap table export" for .xlsx is 06g.

## Decisions for you

1. **The settled rules above,** marked "06f" in ASSUMPTIONS. None changes a case. The two most worth your eye:
   - a blank expiration date doesn't expire, as Alder Gate's RSU has none
   - two ledgers for one class are read together
2. **The engine keeps its own copy of the header lists,** held to the cell-kinds script's by a page test. The script runs with no engine build (OX2), so it can't import them, and a test is cheaper than a shared package.
3. **The README's API section** gets `readOcx` in 06h, the release step, with the 0.6.0 notes, as for every export so far. The package exports it now.

## Assumptions added

All in rows already there, each marked "06f":
- **OX5 to OX9, OX11 and OX14:** listed in section 3.
- **C18:** the comparison.
- **The Later list:** splitting a column by strike.

## Open questions

None from building it.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **`cases/` is untouched,** so the `cases-locked` check doesn't need the label.
- **Nothing ran outside the sandbox, and nothing used the network.**

## Checks

- **Engine:** 2,744 tests pass.
- **Page:** 542 tests pass.
- **Reference:** 73 unit tests pass, and every `expected.json` matches.
- **Typecheck and build:** clean.

## After your review (Jordan, after #87)

**Your check:** `readOcx` gave the same import as your reader on every OCX case and fixture, and on the real Mantle export. Across about 13,000 randomly broken workbooks, five differences were left. You also found the engine's 0.7 header lists match the Mantle export exactly. My three decisions are agreed.

**One commit, with no change to `cases/`:**
1. **An `(as converted)` formula with no saved value no longer refuses a 0.4/0.5 workbook.** It's a check, so a blank, "N/A" or a formula with no saved value skips that holder's check, as a total's would, with the `formula_totals_skipped` line. A column's total isn't checked where one of its values was skipped.
   - **Your test,** in `ocx.test`: every OCX case with every formula's saved value dropped reads to its expected result plus `formula_totals_skipped`. All nine do.
   - **Proof it bites:** with the old reading put back, exactly Hollis Mill and Millrace fail, as you found.
2. **A blank `# of Securities` or `Outstanding Amount`** on a convertibles row is `bad_number`, naming the row's type, in both layouts. A written 0 is still read: a row of 0 SAFEs makes none.
3. **A conversion price of 0** is `bad_number`, naming the class, before the ratio check.
4. **In 0.7, the per-holder `Total` row's check** names each row's holder when a holding is unreadable, not "Stakeholder View".
5. **A 0.4/0.5 workbook with a `Detailed Snapshot` tab** is `mixed_layout`, naming it, as 0.7's is.
6. **`unrecognized_tab`:** a tab no layout names, and in 0.7 no header row marks as a ledger, gets a line naming it. OX12 says so, and OX8's 06f line now points to it. The two 0.7 and 0.4/0.5 tests check it.

**In ASSUMPTIONS:** OX11, OX12 and OX14 say the new rules, and the 06f additions are marked agreed.

**Checks:**
- **Engine:** 2,758 tests pass, 14 more. Taking out the old no-line tab test, that's 15 new: 9 for the dropped formulas, 2 for unrecognized tabs, and 4 for the other fixes.
- **Page:** unchanged.
- **Typecheck and build:** clean.

## Next

06g, the page: "Open a cap table export" for .xlsx, the seniority and preferred-term questions, the one-strike question, `ocf-check` on .xlsx, and "Copy a summary to share". I'm stopping here.
