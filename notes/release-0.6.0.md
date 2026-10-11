# spillpoint 0.6.0: release notes

A cap table from a spreadsheet. The engine reads an OCX workbook, the Open Cap Table Coalition's spreadsheet layout of a cap table, as it reads an Open Cap Format export. The page opens the .xlsx, asks about what the workbook doesn't say, and uses it. The engine's refusals now say what isn't modeled, and no longer when it might be. The version in `packages/engine/package.json` is 0.6.0; it is published from there.

OCX is developed by the Open Cap Table Coalition: https://github.com/Open-Cap-Table-Coalition/ocx. spillpoint reads files in that format.

Open Cap Format (OCF) is developed by the Open Cap Table Coalition: https://open-cap-table-coalition.github.io/Open-Cap-Format-OCF/. spillpoint reads files in that format.

## New

**Reading an OCX workbook** (`readOcx`; ASSUMPTIONS OX1–OX14; 06f). It gives a `CapTableImport`, as `readOcf` does:
- `as_of`: the workbook's as-of date
- `cap_table`, with `null` wherever the workbook doesn't settle a term
- `to_fill`, each blank to fill in
- `issue_order`
- `report`: what was read, what was set aside, and a line for each choice the import made

Nothing is guessed, never 1x and never $1. The engine does no I/O: you pass each tab's cells as the .xlsx stored them (`OcxWorkbook`), and a number stays the text the spreadsheet stored, read to 15 significant digits, so nothing reaches the money math through floating point. The engine README has a worked example.

**The layouts it reads,** told apart by their tabs and headers, not by the version written in the workbook (OX4):
- **0.4/0.5,** the Coalition's reference workbooks: `Summary Snapshot`, `Stakeholder Snapshot` and `Context`.
  - **A series' terms** come from Context's Financing History, checked against the summary's liquidation preference.
  - **Options, awards and warrants** come by column, each column one class, with its strike blank: the layout heads a column by plan or class, never by strike.
  - **SAFEs and notes** come from the summary's convertibles table, which names no holders. Each row is read as one SAFE for the row's total, held by a holder made for it, such as "Post-money SAFEs, $12,000,000 cap (2)". A row with one note is a note, with its interest rate, issue date, base and repayment multiple blank.
- **0.7,** as one real export lays it out, from a cap table app other than Carta: `Summary View`, `Stakeholder View`, a ledger for each class and plan, a `Warrants Ledger` and a `SAFEs Ledger`.
  - **Holdings** come from each class's outstanding certificates, each grant's strike from its plan ledger, and each SAFE with its holder.
  - **That export had no preferred stock.** So 0.7's preferred is read by the rules 0.7's common follows, and one case shows it, but no real export has shown how 0.7 writes preferred stock.
- **Refused:** 0.3's layout, which has no preference terms, any other layout, and a workbook mixing two layouts' tabs.

**No Carta export has been tested yet.** Carta's release notes say it exports OCX, but no Carta workbook has been opened with spillpoint. Which layout Carta writes, and whether `readOcx` reads it, isn't known. If you have one, `pnpm ocx-structure export.xlsx` (below) prints only the kinds of cell in each column, with no values, so its output can be shared.

**Seniority is always blank** where there's preferred stock, since no OCX layout has it. Anti-dilution is read as none, with a report line, as an OCF import reads it.

**Spreadsheets as they're saved:**
- **Dates:** day counts in the 1900 or 1904 date system, ISO text, `YYYY.MM.DD`, and 0.7's "As of Fri, 31 Oct 2025".
- **"N/A"** is a blank where a value may be absent.
- **A total that's a formula with no saved value,** as some exports write, isn't checked, with a `formula_totals_skipped` line. Totals with a saved value are checked.

**Refusals,** as an `ImportRefusal` with the format `"ocx"`: 14 terms for what spillpoint doesn't model and 20 for a workbook that disagrees with itself, each with a fixture (below). The subject is the workbook's own text, since OCX has no ids: a holder's or class's name, a certificate number, a tab, or a tab and its header.

**Names both imports share** (06c): `ImportRefusal`, `CapTableImport`, `ImportReport`, `ImportBlank` and `ImportNote`, beside the OCF names they replace (below).

**In the repository, not the package:**
- **`scripts/ocx-structure.mjs`** (06c), `pnpm ocx-structure export.xlsx`: the kinds of cell under each of a workbook's columns, as counts, never a value.
- **`scripts/ocf-check.mjs` takes an OCX workbook too** (06g), `pnpm ocf-check export.xlsx`. It reads it as the page does, and runs the engine over the terms left open.

  Both print only counts, kinds and codes, never a name, an amount or a date, so what they print can be shared without the cap table. Both need Node 22.18 or later.
- **The page's .xlsx reader,** `apps/dashboard/src/xlsx.ts`, with no dependency.

**How it's tested:**
- **12 OCX cases of our own,** written by hand, each worked in its `DERIVATION.md` and re-derived with an independent reader before it was locked:
  - **0.7:** ocx-01, Alder Gate, common only; ocx-02, Ferncliff, with preferred and blanks.
  - **0.4/0.5:** ocx-06, Hollis Mill: two series, options, awards, warrants, SAFEs and a note.
  - **Six locked cases written as 0.4/0.5 workbooks:** edge cases 4, 5a, 7, 8 and 12b, and Millrace (ocx-07 to ocx-12). Each imports, with its blanks answered, to the locked case's cap table. It pays as that table does, the edge cases exactly and Millrace within $0.00000004 on any line, with the same breakpoints, each within a cent of the locked values.
  - **Fixtures:** 42 refusals (ocx-03), 3 blanks (ocx-04) and 19 reading rules no case reached (ocx-05).
- **Every case before 0.6.0 is unchanged** and gives the same answer: the 83 exit and round cases, and the 13 OCF cases.
- **Each of the nine OCX workbook cases,** with every saved formula value removed, reads the same, with the `formula_totals_skipped` line.
- **The reference calculator** gained a test that a row of identical SAFEs, post-money or pre-money, pays as the SAFEs one by one (`reference/tests/test_safe_row.py`).
- **An independent reader,** written from the rules alone, agrees with `readOcx` on every case and fixture. Run against about 20,000 randomly broken workbooks, it found five places where `readOcx` strayed from the rules; each was fixed before this release, and none has turned up since.
- **The real 0.7 export** reads, and on the page asks nothing but the exit range.

## On the page

- **"Open a cap table export"** takes an OCX workbook (.xlsx) on its own, or an OCF export as before. It was "Open an OCF export". The import is called by its file's name, since OCX names no company.
- **The questions,** after the report, before "Use this cap table":
  - **Seniority** starts with no order set and needs an answer: "All pari passu", "Stacked, latest round senior", or arranged by hand, a tier for each series.
  - **A preferred series' terms,** where the workbook leaves them blank. "Conversion price = issue price" and "1x, non-participating" are one click each, and neither is ever set until you click it. "Participating, with a cap" asks the cap.
  - **One strike per column** (0.4/0.5): before an option or warrant column's strike, "Do all the options in "…" have the same strike?". "No" stops the import at once, naming the column, rather than use a price that's wrong for some grants.
  - **A SAFE's kind of cap,** and **a note's** interest rate (as a percentage), issue date, base and repayment multiple.
- **"Copy a summary to share"** (O15), for both formats: on an import's report, on a refused import, and where "Use this cap table" stops. It copies counts and codes, never a name, an amount or a date. For a workbook it adds the workbook's structure: its tabs, and the kinds of cell under each column.
- **Tested on a workbook a spreadsheet app saved:** Hollis Mill, opened and saved again in ONLYOFFICE, imports as the case does.
- **Saved files stay version 6.**

## Changed answers

None. Every locked case from 0.5.0 gives the same answer, and no payout rule changed.

## New in the API

- **`readOcx(workbook)`,** and the types it takes: `OcxWorkbook`, `OcxSheet` and `OcxCell`.
- **`ImportRefusal`,** the error both imports throw, with a `format`, `"ocf"` or `"ocx"`, beside `kind`, `term` and `subject`.
  - **`readOcf` still throws an `OcfRefusal`,** now a subclass of `ImportRefusal`, so 0.5.0 code that catches `OcfRefusal` still works.
  - **An `OcfRefusal` now also has `format: "ocf"`.**
- **The types `CapTableImport`, `ImportReport`, `ImportBlank` and `ImportNote`.**
- **OCX's refusal terms and report codes,** listed in ASSUMPTIONS OX3 to OX14.
- **19 exports,** 0.5.0's 17 plus `ImportRefusal` and `readOcx`.

## Names added in 0.6.0 beside the old ones

| New in 0.6.0 | Kept until 0.7.0 | What it is |
|---|---|---|
| `ImportRefusal` | `OcfRefusal` | The error an import throws. `OcfRefusal` is now a subclass of it. |
| `CapTableImport` | `OcfImport` | What an import gives. |
| `ImportReport` | `OcfReport` | Its report. |
| `ImportBlank` | `OcfToFill` | One blank to fill in. |
| `ImportNote` | `OcfNote` | One line of the report's notes. |

The old type names are now aliases of the new ones, the same types under two names.

**0.7.0 removes the old names,** and `readOcf` throws `ImportRefusal` itself. To be ready:
- **Catch `ImportRefusal`** where you catch `OcfRefusal`. It catches both formats' refusals now, and still will in 0.7.0.
- **Import the types by their new names.**

0.7.0 is the naming review, the last release that can break code; `notes/plan-0.7.0.md` lists what else it changes.

## Changes that can break 0.5.0 code

The milestone names are gone from the engine's refusals (06a), as 0.2.0's deprecation note said they would be by 1.0.
1. **The `Milestone` type is no longer exported.** TypeScript that imports it doesn't compile. **What to change:** remove the import and anything typed with it. Nothing replaces it. It was a type-only export, so the runtime exports are unchanged by this.
2. **`UnsupportedTermError` has no `milestone`.** In TypeScript, reading it is a type error. In JavaScript, it's `undefined`, where 0.5.0 always gave `"later"`. **What to change:** stop reading it. To tell refusals apart, use `term`, and `path` for where in the input.
3. **`UnsupportedTermError`'s constructor takes `(term, path, what)`,** where 0.5.0 took `(term, milestone, path, what)`. **What to change:** drop the second argument. TypeScript flags the old call; JavaScript doesn't. Called the old way, with four arguments, `path` becomes `"later"`, the old path takes the description's place in the message, and the description is dropped.
4. **Every refusal message ends differently.** "The engine supports this once a case needs it; until then it refuses the input rather than ignoring the term." is now "The engine doesn't model this, so it refuses the input rather than ignoring the term." The path, and what isn't modeled, before it, are unchanged. **What to change:** code that matched the old ending should check the error's `term` instead, which doesn't change. The 11 refusals:
   - `anti_dilution_with_conversions`
   - `conversion_groups`
   - `cumulative_dividend_in_rounds`
   - `discounted_conversion_in_anti_dilution_a`
   - `dividends_added_to_conversion`
   - `note_compounding_interest`
   - `note_post_money_cap`
   - `note_with_safe_or_carve_out`
   - `pre_money_safe_with_preferred`
   - `several_notes`
   - `several_safes`

Nothing else breaks: the OCF names above stay, and every payout is the same.

## Still refused

**New in 0.6.0, in an OCX workbook,** each refused by name, never skipped:
- **A layout not read:** 0.3's, or any other (`ocx_layout`), and tabs from two layouts in one workbook (`mixed_layout`).
- **What spillpoint doesn't model:**
  - stock appreciation rights (`stock_appreciation_right`)
  - a grant of preferred stock (`grant_of_preferred`)
  - warrants for a series not yet issued, or for a class the workbook doesn't have (`warrant_for_future_series`, `warrant_for_unknown_class`)
  - in 0.4/0.5, a plan with RSUs outstanding, since the layout's option columns don't separate them from options (`rsus_not_separated`)
  - in 0.7, a non-plan award outstanding (`non_plan_awards`)
  - several notes in one convertibles row (`several_notes_in_row`)
  - an amount in a currency other than USD (`currency`)
  - a participation cap below the preference (`cap_below_preference`)
- **What the reader doesn't recognize:**
  - a class heading or holdings column of a kind it doesn't know (`unknown_class_heading`, `unknown_holdings_header`)
  - a convertibles row of a type OCX doesn't list (`unknown_security_type`)
  - a status it doesn't know (`unknown_status`)
- **On the page:** a 0.4/0.5 option or warrant column whose grants have more than one strike, once you answer "No". Splitting a column by strike is on the later list.

**Unchanged from 0.5.0:** the OCF deferrals, and the rest of the engine's own list (its README's "What it refuses").
