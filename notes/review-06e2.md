# Review: 06e2 (the OCX 0.7 fixtures)

Branch `06e2-ocx-fixtures`. **This PR touches `cases/`,** so it needs the cases label once the fixtures have been re-derived independently. No engine code: `readOcx` is 06f.

Three commits:
1. **ASSUMPTIONS OX13 and the 06e2 additions,** with C18's fixture form, and the plan.
2. **The two fixture cases,** with the tests that check them.
3. **This note.**

## 1. The refusals (OX13)

Writing one fixture per refusal needed what OX4 to OX12 didn't yet say: for each refusal, what its subject is, and which refusal comes first when a change could trip two. That's OX13, new.

- **The subject** is the workbook's own text, since OCX has no ids:
  - a holder, class or plan by its name
  - a row by its own number (`CS-6`, `EP-1`, `SAFE-2`), or a convertibles row by its `Security Type`
  - a tab by its name
  - a column as its tab and header: "Common Stock Ledger: No. Shares Outstanding"
  - for `ocx_layout`, the version label's version

  Like an OCF subject, it's never in the summary to share (O15).
- **The order of checks,** eight steps, each stopping at the first refusal:
  1. the layout
  2. the layout's named tabs and their headers
  3. the as-of date
  4. the classes and the holdings columns
  5. the holders
  6. the ledgers
  7. the rows, tab by tab in the workbook's order: each row's holder, then what says whether it's read, then its cells left to right
  8. the checks between tabs: totals, holdings, the pool, then the convertibles table
- **The headers each tab needs,** listed, so `missing_header` is exact.
- **The kinds:** each term is listed as unsupported (the workbook may well be right) or malformed (it disagrees with itself or its format).

**Small additions to OX4 to OX12,** each marked "06e2" in its row:
- **OX5:**
  - a number the import needs must be a number cell (`bad_number`)
  - a total with a saved value is checked (`total_mismatch`)
- **OX6:** every ledger row's holder is checked, even on a row then set aside.
- **OX7:** every class needs its `<class> Stock` column. A holdings column is one between `Stakeholder Group` and `Total Stock (outstanding)`.
- **OX8:**
  - a class with no ledger is refused (`missing_tab`)
  - a Y/N other than Y or N is `unknown_status`
  - "made by a transfer" means a `Cert. Transferred From`
- **OX9:**
  - grants checked across plans together
  - `unknown_share_class`
  - the pool checked plan by plan
  - 0.7's `Non-Plan Awards` must be 0
- **OX11:**
  - a SAFE with a blank kind is checked against the SAFE rows together
  - a made holder's name
  - a note from a convertibles row, in full
  - `unknown_security_type`
- **OX12:** a row-made SAFE's or note's subject is its id.

**C18, the fixture form:** `fixtures/<name>.json` is `{base, about, change}`, steps made in turn to the base's workbook:
- `set` a cell
- `clear` one
- `rename_tab`
- `remove_tab`
- `add_tab`

A step that changes nothing, or names a tab or cell that isn't there, is an error, so a fixture can't drift from its base. `expected.json` gives `refused` or `result` for each fixture.

## 2. The fixtures

**cases/ocx-03-refused: 29 refusals, 11 unsupported and 18 malformed.**
- Every term in OX4 to OX13 that 0.7 can reach has one, and `missing_tab` and `bad_date` have two each.
- 27 change Alder Gate. Two change Ferncliff, which has the preferred class they need: `unknown_class_heading`, and `grant_of_preferred`, which adds a plan.
- Where a fixture changes more than one cell, the extra cells keep the rest agreeing, so the one problem is the only one.
- The DERIVATION goes step by step, with each fixture's change and its refusal. It also says why no earlier check catches it wherever one could.

**cases/ocx-04-to-fill: three blanks.**
1. **`safe-cap-kind-blank`:** SAFE-2's cap gives no kind. The amount is kept, and the kind is blank to fill.
2. **`note-in-a-row`:** a "Convertible Notes" row of one note, with no notes ledger.
   - a holder made for it, "Convertible notes, $6,000,000 cap (1)"
   - its principal and pre-money cap read
   - its rate, issue date, base and repayment multiple blank
   - last in the issue order
3. **`preferred-prices-differ`:** Ferncliff's two certificates at $1 and $0.90, so the issue price is blank.

With case 02's preferred terms and seniority, that's every blank 0.7 can leave. **Each result is the whole import,** not what it adds: two of these change a base's line, not only add one. The DERIVATION says what differs from the base.

**What the fixtures use from the Mantle export:** only 0.7's tab names and headers, as in 06e. Each change is our own text and numbers. The new plan ledger in `grant-of-preferred` has 0.7's plan ledger headers, all 17, with our own row. "KISSes" is a made-up security type. The fixtures were written out by a script in my scratchpad, not in the repo.

## 3. The tests

The 06e checks on a case's result are now one function. It runs for each case and for each fixture that's read, against the fixture's workbook. For the fixtures, new checks:
- one result for each fixture file, refused or read
- each fixture's change applies to its base, step by step, each step changing something, and leaves a well-formed workbook
- each refusal's kind is known, its term is named in ASSUMPTIONS, and its subject is text in the base or the change
- each result that's read differs from its base's, and its note codes are named in ASSUMPTIONS (the cases' too)

`test/support/ocx.ts` makes the changes; 06f's tests will use it to feed each fixture to `readOcx`. The case list in `input.test` now names the two new folders.

**To prove the checks bite,** I broke the fixtures four ways, one at a time, and a check failed each time. Each file was put back after:
- a step that changed nothing
- a subject that wasn't in the files
- a blank not listed to fill
- a note code ASSUMPTIONS doesn't name

## How to check by behavior

1. **Re-derive the fixtures.** For each, apply its change to its base's `workbook.json`, then read it by OX3 to OX13:
   - `cases/ocx-03-refused/DERIVATION.md`: each should give exactly its refusal, with nothing earlier in the order failing first
   - `cases/ocx-04-to-fill/DERIVATION.md`: each should give its whole result

   Each DERIVATION ends with a list of what to check. If your reader from the 06e review takes a workbook, the fixtures need only the five kinds of step above.
2. **Run the tests:**

   ```bash
   pnpm test
   ```

   - **Engine:** 2,354 pass, 68 new: the fixture checks above, plus the note codes for ocx-01 and ocx-02.
   - **Page:** 541 pass, unchanged.

## Decisions for you

1. **Subjects are the workbook's own text** (OX13): names, row numbers, tab names, a tab and header. OCF's are ids, and OCX has none. For `no-layout` the subject is the label's version, "0.7", which decides nothing but tells the page what the workbook claims.
2. **The order of checks** (OX13). It decides which refusal a founder sees first. Its main choices:
   - classes before stray holdings columns, so a preferred class headed oddly is named as the class
   - each ledger's class before each class's ledger
   - rows before cross-tab checks
3. **`unknown_holdings_header` is unsupported,** where the plan listed it as malformed. An unknown column is more likely a security spillpoint doesn't read yet than a broken export. `unknown_class_heading` is unsupported for the same reason.
4. **Plans are checked together** (OX9). A plan ledger is known by its header row and never matched to its plan. Every plan's grants are checked against the plan columns together, since options from any plan join the same classes. That saves a matching rule, and a refusal for a ledger with no plan. The pool is still checked plan by plan, by the plan's name in Context, which is cell text, never cut short.
5. **0.7's `Non-Plan Awards` must be 0** (OX9). No ledger the reader knows holds them (06d question 13), so a holder with some is `holdings_mismatch`, never read silently.
6. **Every class needs a ledger** (OX8), even one with no certificates. It's strict: a real export that omits an empty class's ledger would be refused, and we'd learn from it.
7. **A number must be a number cell** (OX5). Text, even text of digits, is `bad_number`. Strict, like the statuses.
8. **Totals with a saved value are checked** (OX5), and so is the Summary's `Outstanding Shares` for each class. It's a value in the export, so that check is always live.
9. **The as-of date is the summary tab's** (OX13). The other tabs' labels aren't read, so a workbook whose tabs disagree isn't caught. No real export would disagree, and it saves a refusal.
10. **A SAFE with a blank kind** (OX11) is checked against the SAFE rows together, and the `Post-$ SAFEs` row never fills its kind. With one SAFE and one row, the row does say which. But the table groups SAFEs by type and terms, never by holder, and I'd rather the rule not change with the count. Tell me if you'd rather the row fill it when there's exactly one SAFE and one row.
11. **A note from a convertibles row** (OX11):
    - simple interest, the only kind the engine models, with the rate asked
    - a `note_from_convertibles_row` line
    - with no issue date, last in the issue order
12. **No line replaces `issue_price_from_ledger`** when the prices differ: the blank says it.
13. **A read fixture's result is the whole import,** not OCF's `adds` (C18).

## Assumptions added

- **OX13:** the refusals, their kinds and subjects, and the order of checks.
- **Additions to OX4 to OX9, OX11 and OX12,** each marked "06e2" in its row: listed in section 1.
- **C18:** the fixture form.

## Open questions

1. **The reads with no fixture.** Alder Gate and Ferncliff don't reach these rules, and no fixture here does, since 06e2 is refusals and blanks:
   - a pre-money SAFE
   - a SAFE's discount, and its MFN
   - split-adjusted counts and strikes
   - an expired warrant
   - a class named preferred under `Common Stock`
   - "Unknown" as an issue date
   - a date as a day count, and the 1904 date system
   - a 17-digit stored number read to 15 digits
   - an unknown header outside the holdings (`unrecognized_field`)
   - a total with a saved value that agrees
   - two plans
   - an id that comes out the same twice ("_2")

   I'd add a third fixture case, `ocx-05-reads`, one change each, in 06e3 beside 0.4/0.5's fixtures. That way every rule shows in a case you can re-derive, not only in 06f's unit tests. Or leave them to 06f?
2. **The new terms and code:** `bad_number`, `total_mismatch`, `unknown_holdings_header`, `unknown_share_class`, `unknown_security_type` and `note_from_convertibles_row`. They're stable from 1.0 (07a, item 17), so they're worth a look now.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **This PR touches `cases/`:** the `cases-locked` check fails until you add the cases label.
- **`.claude/settings.json` shows as changed on this machine:** your lift of the cases lock. I haven't touched it or committed it.
- **Nothing ran outside the sandbox, and nothing used the network.**

## Checks

- **Engine:** 2,354 tests pass.
- **Page:** 541 tests pass.
- **Reference:** 71 unit tests pass, and every `expected.json` matches.
- **Typecheck:** clean.

## Next

06e3, 0.4/0.5's workbook and its fixtures, with the cases lock still lifted. I'm stopping here.
