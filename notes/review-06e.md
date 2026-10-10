# Review: 06e (the OCX import's rules, and its first two cases)

Branch `06e-ocx-cases`. **This PR touches `cases/`,** so it needs the cases label once the cases have been re-derived independently. No engine code: `readOcx` is 06f.

**Split under the one-evening rule.** The plan's 06e listed every OCX case at once, as much as OCF's 04a, 04a2, 04b and 04b2 together. So I've split it the same way, and the plan says so:
- **06e (this PR):** the import's rules (ASSUMPTIONS OX3 to OX12), the case folder's form (C18), ocx-01, and ocx-02, the one 0.7 case with preferred stock.
- **06e2:** the 0.7 fixtures, one for each refusal and each blank.
- **06e3:** 0.4/0.5's workbook and fixtures.
- **06e4:** the locked cases written as OCX, Millrace among them, and the reference test for a row of identical SAFEs.

Three commits:
1. **ASSUMPTIONS OX3–OX12 and C18,** with the plan: your 06d answers, the 06g one-click preferred terms, and the split.
2. **The two cases,** with the tests that check OCX case files.
3. **This note.**

## 1. The import's rules (OX3 to OX12)

From the plan and your answers, now in ASSUMPTIONS as the live record:
- **OX3, what an import gives:**
  - a `CapTableImport`, nothing guessed
  - seniority blank whenever there's preferred stock, and an empty list when there's none
  - **ids, which OCX doesn't have (New):** a holder's or class's name in the engine's own style (`founder_a`, `common_seed_safe_conversion`); option, RSU and warrant classes as O6 and O7 name them; a SAFE `safe_<holder>`
- **OX4, layouts:** 0.4/0.5 and 0.7, by their headers. The label is reported (`version_label`). 0.3 is refused, and so is a workbook mixing layouts.
- **OX5:**
  - numbers to 15 digits
  - the date forms, the as-of form, "Unknown" and a date with a reference after it
  - headers that match case and all, and row labels that match in any case
  - formula totals with no value skipped (`formula_totals_skipped`), as open question 15 has it
- **OX6, holders:** by name; duplicates refused; one with nothing left out and listed; a ledger's unknown holder refused; personal details never read.
- **OX7, classes:**
  - common or preferred by the Summary's section
  - **a class itself named "Common Stock"** is the second row of that name, the first being the section's label (New)
  - 0.4/0.5's terms from Financing History
  - **0.7's from Financing History if it's there,** else the issue price from the ledger and the rest blank
  - **preferred in 0.7 "rests on no real export yet",** in those words
  - a preferred class with an unknown heading refused
- **OX8, holdings:**
  - **a ledger's class** is its tab's name, or its title row's ending "… <class> Ledger" when the tab's name is cut short (New)
  - "Y" certificates summed by holder
  - **checked against the Stakeholder View's values,** since the totals have no values
- **OX9, options and the pool:**
  - a grant's count and strike, split-adjusted when given
  - **a grant above 0 must say "Outstanding"** (New)
  - RSUs by `Type`
  - **checked against the Stakeholder View before expired grants are left out,** since the export may still count them (New)
  - **the pool as the export states it** (New)
- **OX10, warrants:** from the ledger, with `warrant_counts_are_maximums`; one for an unknown class refused.
- **OX11, SAFEs and notes:**
  - **0.7:** one SAFE per outstanding row, "Converted" and "Cancelled" set aside, **any other status refused** (New), checked against the Summary's convertibles table
  - **0.4/0.5:** rows combined, and a single note per row
- **OX12, the issue order and the report (New):** the report's keys and note codes, and what a note's subject is.

**C18, the case folder:** `workbook.json` in `OcxWorkbook`'s shape, and `expected.json` worked by hand, with `issue_order`.

## 2. The cases

**ocx-01-alder-gate**, OCX 0.7, common stock only:
- **Two common classes.** One is a SAFE's conversion shares, whose ledger's tab name is cut to 31 characters, so it's found by its title.
- **Certificates:** transferred, repurchased and exercised ones.
- **A plan:**
  - options at two strikes
  - an RSU
  - a cancelled grant
  - an expired grant the export still counts, checked and then left out, leaving its holder with nothing
- **A warrant for common.**
- **SAFEs:** one converted and one outstanding, with the Summary's convertibles row agreeing.
- **The pool,** agreeing with Context.
- **Totals that are formulas with no saved value,** as the Mantle export has.

Result:
- 7 holders, 2 left out
- 6 securities, 10 positions
- a 610,000 pool
- one SAFE
- nothing to fill

**ocx-02-ferncliff-preferred**, OCX 0.7 with one preferred series and no Financing History. The issue price comes from the ledger. The conversion price, multiple, participation and seniority are blank to fill. Its DERIVATION opens by saying it rests on no real export.

**Each DERIVATION** walks the workbook to the result, table by table, with the rule for each step and a list of what a re-derivation should check.

**What the workbooks use from the Mantle export:**
- 0.7's tab names and headers, the version label, and the as-of form
- the ledger title's ending, "… <class> Ledger", which OX8 matches (decision 2)

Everything else is our own: titles, footnotes, the company, its holders and its numbers. No footnote or title wording is taken. The workbooks were written out from rows I authored, by a script in my scratchpad that writes `OcxWorkbook`'s JSON. The script isn't in the repo.

## 3. The plan

`notes/plan-0.6.0.md`:
- **Your 06d answers:**
  - the Coalition only, not Mantle
  - 0.4/0.5 kept
  - cases now, with one preferred case
  - preferred in 0.7 read with blanks
  - the ledger's price
- **06g:** one-click answers for a preferred series' terms, "conversion price = issue price" and "1x, non-participating", clicked by the founder and never preset.
- **The split of 06e** into 06e to 06e4.

## How to check by behavior

1. **Re-derive the two cases,** from their workbooks:
   - `cases/ocx-01-alder-gate/DERIVATION.md`
   - `cases/ocx-02-ferncliff-preferred/DERIVATION.md`

   Each lists what a re-derivation should check. The tables in each repeat the workbook's cells, which are in `workbook.json`.
2. **Run the tests:**

   ```bash
   pnpm test
   ```

   - **Engine:** 2,286 pass, 21 new.
     - **20 check the two OCX case files,** 10 each:
       - the workbook is a well-formed `OcxWorkbook`
       - the as-of label is on every tab, with its weekday
       - the version label is reported
       - holders are named in the workbook, and each holds something
       - the blanks are exactly `to_fill`, seniority last
       - the issue order covers every series, SAFE and note
       - the formula-totals line appears exactly when there's a formula with no value
       - each note's subject is real
     - **One names the OCX cases as waiting for `readOcx`.**

     **To prove the checks bite,** I dropped ocx-02's seniority blank and misspelt a holder, and two checks failed. They passed again once it was put back.
   - **Page:** 541 pass, unchanged. The round-draft test passes over the OCX folders.
3. **The cell-kinds script on the workbooks:** both read as 0.7, with every ledger recognized by its headers.

## Decisions for you

1. **The ids,** OX3: names in the engine's own style, `founder_a` and `safe_investor_s`.
2. **A ledger's class from its title's ending, "… <class> Ledger",** when its tab's name is cut short (OX8). It's the one piece of a title the reader relies on, so our workbooks' titles end that way. The rest of each title is our own.
3. **The check before the expiry rule** (OX9): the export may still count an expired grant, so the workbook is checked against itself first.
4. **The pool as the export states it,** even when an expired grant is left out (OX9). The unissued pool never changes a payout at a sale except through a note's with-pool base.
5. **Statuses:** a grant or warrant above 0 must say "Outstanding". A SAFE's status must be "Outstanding", "Converted", "Cancelled" or "Canceled"; anything else is refused. It's strict, so an unexpected word is never read silently.
6. **The report's keys and note codes** (OX12). They're stable from 1.0 (07a, item 17), so worth a look now.
7. **The split of 06e.**

## Assumptions added

- **OX3 to OX12:** the OCX import's rules. Those from your answers are marked agreed, and mine New, listed above.
- **C18:** OCX case folders.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **This PR touches `cases/`:** the `cases-locked` check fails until you add the cases label.
- **`.claude/settings.json` shows as changed on this machine:** your lift of the cases lock, I take it. I haven't touched it or committed it.
- **Nothing ran outside the sandbox, and nothing used the network.**

## Checks

- **Engine:** 2,286 tests pass.
- **Page:** 541 tests pass.
- **Reference:** 71 unit tests pass, and every `expected.json` matches.
- **Typecheck:** clean.

## Next

06e2, the 0.7 fixtures, once the two cases are re-derived. I'm stopping here.
