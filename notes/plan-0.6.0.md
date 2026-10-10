# Plan: 0.6.0, reading an OCX export

0.4.0 reads a company's cap table from an Open Cap Format (OCF) package. 0.6.0 reads one from an **OCX** workbook: the Open Cap Table Coalition's Excel layout of the same data.

**Carta exports it.** Carta's release note "Equity reporting suite: OCX" (https://releasenotes.carta.com/equity-reporting-suite-ocx-1EEcfe) puts it under Cap Table > Run reports, in the Capitalization folder, generally available. The note gives no OCX version and lists no tabs.

0.6.0 also ships 06a's removal of the milestone names from the engine's refusals (the release notes' lines are at the end).

**The short version:** OCX is a snapshot, not a ledger. It gives each holder's shares by class, each series' issue price, conversion price, multiple and participation, and the unissued pool. It doesn't give:
- the seniority of the series
- option or warrant strikes
- who holds each SAFE or note, or a note's interest and dates

So an OCX import reads much less than an OCF import, and leaves more to fill in. The questions at the end are about how much to ask for, and how much to refuse.

Each step below is sized for an evening. Cases come first, as for OCF, and they wait for your export's tab names and header rows (question 1). You're also asking founders for the headers of Carta's Cap table report with "Securities ledger by type and class", which may carry the strikes and SAFE holders OCX lacks. Once both are in, we pick the source, or use both.

Your answers are after the questions, and the plan above them follows your answers where they differ from what I first wrote.

## What I read, and the licenses

**Hard rule 10 holds:** nothing from the Coalition's material is in the repo. I read it in `local/ocx-reference/`, which git ignores. `git status` showed nothing new after the download.

What this plan names from the workbooks is what you allowed: tab names and column headers, which are the format's interface and which the reader has to match exactly, as `readOcf` matches OCF's field names. It has no sample rows, formulas, instruction or note text, or layout.

**The reference workbooks,** the format's definition, set by the Coalition's Law Firm Working Group. They're attachments on the OCX repository's wiki (https://github.com/Open-Cap-Table-Coalition/ocx/wiki, "Reference Documents"):

| File | Version | URL | Bytes | SHA-256 |
|---|---|---|---:|---|
| `OCX.v.1.0.xlsx` | 1.0 by its file name; its Context tab says "OCX Version 0.5" | https://github.com/captable/ocx/files/11883157/OCX.v.1.0.xlsx | 48,843 | `f2034490b5abc4b5132d9b88cdc68451c34d22e5474fe7e77be5f4ff92c38311` |
| `OCX.v.0.4.xlsx` | 0.4 ("OCX Version 0.4") | https://github.com/captable/ocx/files/11265982/OCX.v.0.4.xlsx | 49,329 | `0791fe28d47152bade3963232c1e91d58b03d65352a1d38fc4a0a5eef1192347` |
| `OCX.v.0.3.xlsx` | 0.3 (no version label) | https://github.com/captable/ocx/files/11265977/OCX.v.0.3.xlsx | 48,820 | `b98a316c8d2a8f4673e539c696a61a1e689d579ec55b873b345744fe348656df` |
| `OCX.Diff.-.OCX.v.0.4.vs.OCX.v.0.3.xlsx` | a cell-by-cell comparison of 0.4 with 0.3, listed beside 0.4 | https://github.com/captable/ocx/files/11265991/OCX.Diff.-.OCX.v.0.4.vs.OCX.v.0.3.xlsx | 204,077 | `0449fd3574d52e142e68848f7537f37b56ba83efb01efbfe09e4a75eb6fbecdb` |

`captable/ocx` is the repository's old name, and GitHub redirects it.

I read them with a standard-library Python script run from my scratchpad, with the file paths as arguments.

**The converter,** `ocf2ocx`, at https://github.com/Open-Cap-Table-Coalition/ocx, commit `915bb38ecd012fa0dea2b68150cecc6b3bb8acca` (2023-06-28). I read its source through GitHub's API and didn't need to clone it:
- the README
- `docs/development.md`
- `docs/adr/0003-build-output-from-empty-workbook.md`
- `package.json`, version 0.4.0-alpha
- the workbook and model modules under `src/`

It writes an OCF package into an OCX workbook, which is what our reader runs in reverse ("How the converter fills each column", below). Two cautions:
- **It's an early tool.** It fills only the Stakeholder Snapshot, and writes just a title on the other three tabs.
- **Carta's export isn't this tool.** Its mapping is a guide to what each column means, not a promise about Carta's.

**The wiki's "Known Limitations"** page names one: OCX is in US dollars only.

**The licenses:**
- **The converter's code:** Apache-2.0, the repository's `LICENSE` (the license's own text, with its copyright line left as the template's placeholder).
- **The reference workbooks:** the wiki states no license for them. That doesn't change what we do: we read them locally and copy nothing.
- **The OCF repository:** GitHub reports its license as "other" (NOASSERTION). Nothing here touches it.
- **Carta's release note:** cited, not copied.

## What an OCX workbook holds

The reference workbooks have four tabs. The reader finds each table by its headers, never by cell positions, since columns vary with the company.

**Context:**
- **The as-of date,** which every tab repeats, and the version label ("OCX Version 0.4", "OCX Version 0.5").
- **Financing History,** one row per round: `Round`, `Initial Closing Date`, `Most Recent Closing Date`, `Original Issue Price`, `Adjusted Conversion Price`, `Conversion Ratio`, `Liquidation Multiple`, `Participating (Y/N)`, `Participation Cap`. This is where a series' terms are.
- **409A Valuations:** `Valuation Date`, `Price Per Share (Common)`, `Options Outstanding at Valuation`, `Valuation Firm`. Set aside.
- **Stock Plan History:** `Plan Name`, `Date`, `Action`, `Stockholder Approval Date`, `Number of Shares`, `Total Shares Reserved`. Set aside.
- **Stock Plan Details:** `Plan Name`, `Total Reserved`, `Total Granted`, `Outstanding Shares/Exercised Options`, `Outstanding Options`, `Outstanding RSUs`, `Shares Returned to Plan`, `Shares Available for Grant`. A check on the pool, and the only place RSUs are counted apart from options.
- **Split/Combination Adjustment:** `Date`, `Classes/Series Affected`, `Original Shares`, `Resulting Shares`. Set aside, with a report line: the counts elsewhere are already after any split.
- **Shareholder Groups.** Set aside.

**Summary Snapshot:**
- **By class:** `Share Class`, `Shares Authorized/ Reserved`, `Outstanding Shares`, `Fully Diluted Shares`, `% Fully Diluted`, `Liquidation Preference`, `Voting Multiplier`, `Voting Power`, `Voting %`. The classes sit under section labels: `Common Stock`, `Preferred Stock`, `Warrants & Non-Plan Awards` and `Stock Plans`, with `RSUs Outstanding` and `Available for Grant` rows under the last.
- **Outstanding Convertible Securities:** `Security Type`, `# of Securities`, `Outstanding Amount`, `Discount`, `Valuation Cap`. The types are `Pre-$ SAFEs`, `Post-$ SAFEs`, `Convertible Notes` and `Warrants for future series of Preferred Stock`. **It's grouped by type and terms: a count and a total, never a holder.**

**Stakeholder Snapshot,** one row per stakeholder:
- **`Stakeholder`** and `Stakeholder Group`.
- **A column of shares per class:**
  - common by its name
  - preferred as `<class> (outstanding) (<ratio>)`, plus `<class> (as converted)` when the ratio isn't 1
- **Options:** a column per plan, or per class: `<class> Options` in the reference, the plan's name in the converter.
- **Warrants:** `<class> Warrants`.
- **Non-plan awards:** `Non-Plan Awards`.
- **Totals and percentages:** `Total Stock (outstanding)`, `Total Stock (as converted)`, `Total Stock % (as converted)`, `Fully Diluted Shares`, `Fully Diluted %`.
- **Two rows after the holders:** `Options Remaining for Issuance` and `Total`.
- **Two more blocks:**
  - voting power by stakeholder
  - "Additional Information": `Primary Stakeholder Type`, `Secondary Stakeholder Types`, mailing address, `City`, `State`, `Country`, `Zip Code`, `Email Address`, `Notes`

  **The reader never reads the Additional Information block.** It's personal data spillpoint doesn't need.

**Voting by SH Group:** voting power by shareholder group. Set aside.

**What isn't anywhere in it:**
- **seniority**
- **strikes:** option, warrant or non-plan award
- **convertibles:** holders, and each SAFE's or note's own amount when a row groups several
- **notes:** interest rate, issue date, maturity, what the cap divides by, repayment multiple
- **other terms:** cumulative dividends, anti-dilution, conversion groups

The footnotes, in my words: outstanding shares leave out options, warrants, the pool and convertibles; fully diluted counts options, warrants and the pool, but still no convertibles.

### How the converter fills each column

This is what our reader runs in reverse:
- **A stakeholder row:** an OCF stakeholder, by legal name.
- **A class column:** that holder's stock issuances in the class, net of what closed them.
- **"(as converted)":** the outstanding count × the class's conversion ratio, followed through to common, rounded as the class's conversion right says.
- **A plan column:** the holder's grants under the plan. Where the plan's class is preferred, the count is multiplied by its ratio.
- **`Options Remaining for Issuance`:** the plan's latest reserve less every holder's grants under it.
- **A warrant column:** the warrant's quantity, by the class it buys. **For a preferred class, it's headed by the common class the series converts into, and the count is as converted.** So a warrant for Seed Preferred and a warrant for common can look alike (an open question for Carta's export).
- **`Non-Plan Awards`:** grants with a class and no plan.
- **The order:** classes run common first, then by board approval date, then by name.

## Where the three versions differ

So the reader can tell them apart:

| | 0.3 | 0.4 | 0.5 (the file named 1.0) |
|---|---|---|---|
| **Version label** on Context | none | "OCX Version 0.4" | "OCX Version 0.5" |
| **The per-holder tab** | `Detailed Snapshot`, headed `Shareholder`, `Shareholder Group` | `Stakeholder Snapshot`, headed `Stakeholder`, `Stakeholder Group` | as 0.4 |
| **Preferred per holder** | only `(as converted)`, so outstanding preferred must be backed out by the ratio | `(outstanding) (<ratio>)`, and `(as converted)` when the ratio isn't 1 | as 0.4 |
| **Options and warrants per holder** | `Options`, `Common Stock Warrants` | `<class> Options`, `<class> Warrants`, `Non-Plan Awards` | as 0.4 |
| **Financing History** | stops at `Conversion Ratio`: **no multiple, no participation, no cap** | adds `Liquidation Multiple`, `Participating (Y/N)`, `Participation Cap` | as 0.4 |
| **Stock Plan Details** | the history table only | adds the details table (reserved, granted, outstanding options and RSUs, returned, available) | as 0.4 |
| **Convertibles** | `Security Type`, `Amount`, `Discount`, `Valuation Cap` | adds `# of Securities`; `Amount` becomes `Outstanding Amount` | as 0.4 |
| **Context's title** | "Context" | "Context" | "Context Tab" |

**0.4 and 0.5 have the same tables and headers.** Only the version label and Context's title differ. So the reader treats them as one layout. **It tells layouts apart by their headers, not by the label** (your answer 4): a workbook with 0.4/0.5's headers is read as that layout whatever its label says, and the label goes in the report as written.

**0.3 lacks a preference's terms.** It also lacks outstanding preferred per holder.

## What `readOcx` reads, mirroring `readOcf`

### The input

The engine does no I/O, as for OCF.
- **The page parses the .xlsx:** it's a zip, which the page's own zip reader opens, of XML parts, read by a small reader of our own, with no dependency.
- **`readOcx` takes the workbook already parsed:** each tab's name and cells, and the workbook's date system. Each cell has its address, its kind (number, text, true/false, error, or a number formatted as a date), its text exactly as stored, and whether it holds a formula. **A number reaches the engine as text, never as a JavaScript number** (hard rule 2). Built in 06c as `OcxWorkbook` (OX1).
- **A cell with a formula** gives the value Excel saved with it. **The reader never works a formula out.** A formula saved with no value is refused, since there's nothing to read.

### Numbers

Excel stores every number as a binary double and writes it out to 17 significant digits. A price typed as 0.2 is stored as "0.20000000000000001", and 0.0025 as "2.5000000000000001E-3".

**The rule I'd propose:** read each number to 15 significant digits, Excel's own precision for what's typed into it, and drop trailing zeros. 0.2 and 0.0025 come back exact.
- **A share count** that isn't then whole is refused, as an OCF fraction of a share is (O5).
- **A value Excel computed,** such as a conversion ratio of 1/3, comes back as a 15-digit decimal. It's checked against the prices within that rounding, as O4 checks OCF's, and read with a report line when it isn't exact.

### Dates

**A number formatted as a date** is Excel's day count:
- from 1900 (with Excel's leap day of 29 February 1900, which never existed), or
- from 1904, when the workbook says so.

**A date written as text** is read as `YYYY.MM.DD` (the reference's own form) or `YYYY-MM-DD`. Anything else is refused. Which form Carta writes is an open question.

### Headers

**Matching:**
- **Whitespace and footnote marks don't count.** Runs of spaces and line breaks are one space, leading and trailing spaces are dropped, and so are trailing `*` footnote marks: the reference has `Common Stock****` and `Mailing Address Line 2 `.
- **Case counts.**

**Where a table has a header the reader doesn't know:**
- **On the Stakeholder Snapshot's holdings,** it's refused. It could hold shares the reader would miss.
- **Elsewhere,** it gets a report line, as an unrecognized OCF field does (O10).

### Each piece

| In the workbook | In the cap table |
|---|---|
| The as-of date | `as_of` |
| `Stakeholder`, each row | a holder. One with nothing outstanding is left out and listed (O3). Two of the same name are refused, since which holds what would be a guess. |
| A class under `Common Stock` | a common class. A class whose name says preferred but sits under `Common Stock` with no liquidation preference, as the reference's "Founder Preferred" does, is read as common, with a report line (question 6). |
| A class under `Preferred Stock` | a preferred series, matched to its `Financing History` row (question 5). |
| `Original Issue Price` | `original_issue_price` |
| `Adjusted Conversion Price`, checked against `Conversion Ratio` | `conversion_price`, under O4's check. Prices are exact as read (above), and the ratio is the derived value. |
| `Liquidation Multiple` | `preference_multiple` |
| `Participating (Y/N)` and `Participation Cap` | "N": non-participating. "Y" with no cap: participating. "Y" with a cap: capped there, read as including the preference (E7), with a report line, as O4 does. **OCX says Y or N outright, so no cap isn't ambiguous here, as it is in OCF.** A cap at or below the multiple follows O4. |
| `Liquidation Preference` on the Summary Snapshot | a check: it must equal outstanding × issue price × multiple, which also checks the round matched its class |
| `<class> (outstanding)` per holder | that holder's shares in the series. `(as converted)` is checked against it. |
| An option column | an option class, its strike blank to fill (question 8) |
| `Options Remaining for Issuance` | `unissued_pool`, checked against `Shares Available for Grant` |
| `<class> Warrants` | a warrant for that class, its strike blank to fill (question 9) |
| `Non-Plan Awards` | an option class of its own, its strike blank to fill |
| A `Post-$ SAFEs` or `Pre-$ SAFEs` row | one SAFE for the row's total, at its cap and discount, held by a holder made for it (question 10) |
| A `Convertible Notes` row | one note, with blanks to fill (question 11) |
| Seniority | blank to fill (question 7) |

**The issue order** (O14, R31):
- **Series:** by their round's `Initial Closing Date`.
- **SAFEs and notes:** OCX gives them no dates, so they come after every series, the default for a starting table with no order, with a report line.

**Totals are checked, never trusted:**
- each column's `Total` against the sum of its holders
- the Summary Snapshot's `Outstanding Shares` against the holders' totals
- the pool against the plan details

A mismatch is refused as malformed, naming the check.

## What it leaves to fill

As O1: nothing is guessed, never 1x and never $1. Each blank goes in `to_fill` for the page to ask about:
- **seniority:** always, since OCX has none (question 7)
- **each option class's, warrant's and non-plan award's strike**
- **for each note:** interest rate, issue date, what its cap divides by, and repayment multiple (question 11)
- **the sale's date,** where a note is outstanding, as the page asks today (O13)

## What it refuses

Each by name, with a kind, `unsupported` or `malformed`, and a term, as `readOcf` does:

**Unsupported:**
- headers that match no layout the reader reads, including 0.3's, unless Carta writes it (your answer 4). The label never decides this.
- `Warrants for future series of Preferred Stock` with any outstanding: there's no series to model it on
- RSUs outstanding that the Stakeholder Snapshot doesn't separate from options (question 8)
- a convertibles row the reader can't map (question 10)
- several notes in one row (question 11)
- a currency other than US dollars, though the reference has no field for one

**Malformed:**
- a missing tab, table or required header
- a holdings header it doesn't know
- a total that doesn't add up
- a liquidation preference that doesn't match
- a round with no class, or a class with no round
- a formula with no value saved
- a fraction of a share
- a date or number it can't read
- two stakeholders of one name

**Not opened at all,** by the page: `.xls`, `.xlsb` and password-protected workbooks (which aren't zips), each refused by name.

## The report

As O10:
- **Read:** counts of what sets the cap table, and the version label as written, if there is one.
- **Set aside:** counts of what doesn't (voting, 409A valuations, plan history, shareholder groups, splits).
- **One note per choice an import makes,** by code:
  - each field OCX lacks: seniority, strikes, anti-dilution, dividends, conversion groups, a carve-out
  - a participation cap read as including the preference
  - a ratio read within its rounding
  - SAFEs combined into one, with their count
  - the issue order taken as the default for SAFEs and notes
  - a Founder Preferred read as common
  - a split set aside
  - an unknown header outside the holdings

## The page and the check script

**The page:**
- **"Open an OCF export" becomes "Open a cap table export",** taking an .xlsx beside OCF's .zip and .json files, with O13's 100 MB limit.
- **The flow is O13's:** the report first, then the questions, then "Use this cap table".
- **A new kind of question: the seniority order** (your answer 7). It starts with no order set, and offers two one-click choices, "all pari passu" and "stacked, latest round senior", plus arranging by hand, with ties for pari passu. One of them is required before Use. Nothing is guessed (O1).

**`pnpm ocf-check`** also takes an .xlsx, under O15's rule: counts and codes only.
- **What it prints:** the version label, the tabs found, the columns by kind (class, option, warrant) with counts, the blanks by field, and a refusal's term.
- **What it never prints:** a header's own text, since class and plan names are the company's; any name, amount or date; and anything from the Additional Information block.

## The steps

**Renumbered in 06c** (Jordan, 07a review): the part of OCX that doesn't depend on Carta's headers comes first, as 06c, while the headers are awaited. The questions and answers below keep the numbers they were written with: their 06c (cases) is now 06d, their 06d (the engine) 06e, their 06e (the page) 06f, and their 06f (the release) 06g.

- **06c, what doesn't wait for headers** (done in 06c):
  - **the .xlsx reader** into the engine's `OcxWorkbook`: zip and XML, both date systems, numbers as the text Excel stored, in a module the page and Node both run (ASSUMPTIONS OX1)
  - **`pnpm ocx-structure`,** the cell-kinds script, on that reader (your answer 2a; OX2). Whoever has a real export runs it and pastes the output.
  - **the naming review's item 7,** beside the old names, nothing breaking: `ImportRefusal` (with `OcfRefusal` its subclass), and `CapTableImport` with its parts (the `Ocf…` names its aliases)
- **06d, cases** (the `cases/` edit rule lifted). After a real export's headers are in, and the choice between OCX and the securities ledger report, or both (your answer 1):
  - **ocx-01:** a fictional company's workbook, written by hand, using every table the reader reads.
  - **ocx-02:** one-change fixtures for each refusal and each blank, as 04a2's were.
  - **ocx-03 on:** locked cases written as OCX: edge cases 4, 5a, 7, 8 and 12b, and Millrace. Each imports, with its blanks answered, to the locked cap table, with prices to 15 significant digits, compared within a cent as 04b2 did for OCF's 10 places.

  The workbooks are our own, written as JSON in `OcxWorkbook`'s shape (tabs and cells), with expected results worked by hand.

  Also a reference unit test: a row of identical SAFEs pays the same as the SAFEs one by one, post-money and pre-money both (your answer 10). Combining a row is what lets several pre-money SAFEs past `several_safes`, so the test shows that it's exact.

  ASSUMPTIONS' "OCX import" section, which 06c started with OX1 and OX2, gets the import's rules.
- **06e, the engine:**
  - `readOcx`, to the naming review's names (07a)
  - the numbers and dates rules
  - the header matching
  - the checks, refusals and report
- **06f, the page:**
  - "Open a cap table export", on 06c's reader
  - the seniority question
  - `ocf-check` on .xlsx
  - **"Copy a summary to share"** (05a2) for .xlsx, on the report, on a refused import and on a refusal at Use (your answer 2). For most founders the page is how we'll learn why a file didn't read.

  Its test workbooks are .xlsx files our tests write from the JSON cases, plus one you save from a spreadsheet app (your answer 13).
- **06g, release 0.6.0,** with 06a's breaking changes in its notes (below).

## Questions for you

1. **The headers come first.** Should 06c's cases wait for your export's tab names and header rows, so the reader is written against Carta's real headers? I'd say yes. If they match 0.4/0.5, the cases use them; if not, they show what to change before any case is written.
2. **What the headers can't show.** Tab names and header rows settle most of the open questions below, but not:
   - whether cells hold values or formulas
   - how dates are written
   - how many digits a price has

   **Option (a):** a short `pnpm ocx-structure` script, first in 06c, that prints each known column's cell kinds with counts ("Original Issue Price: 4 numbers"), never a value. Whoever has the export runs it and pastes the output.
   **Option (b):** leave those questions for 06e's page test on the real file.

   I'd take (a).
3. **The numbers rule:** 15 significant digits, Excel's precision. A computed ratio is checked within that rounding, with a report line when it isn't exact. Agreed?
4. **Versions:** read 0.4 and 0.5, by their label. Refuse 0.3, which has no multiple or participation and no outstanding preferred per holder, unless Carta writes it. Refuse any other label, printing it as `ocf_version` is printed. Agreed? And if Carta writes "1.0" in the label, as the reference file's name suggests, read it as 0.5's layout if its headers match?
5. **Matching a round to its class:**
   - **The match:** a series' class name, less a trailing "Preferred Stock" or "Preferred", must equal its round's name ("Series Seed Preferred Stock" to "Series Seed"), one to one.
   - **The check:** the Summary Snapshot's `Liquidation Preference` must agree.
   - **Otherwise** it's refused.

   Agreed, until Carta's export shows its names?
6. **A class named preferred, under `Common Stock`, with no liquidation preference:** read as common with a report line, or refused?
7. **Seniority:** always a blank. The page lists the series latest round first and asks you to confirm or rearrange, with ties for pari passu. Is suggesting that order fine, as long as nothing is used until it's confirmed? Or should it start with no order at all?
8. **Options:** each option or non-plan award column becomes one option class, its strike blank to fill.
   - **Several strikes in one column:** a report line says that if the grants in it have different strikes, split it in the editor.
   - **RSUs** counted on the plan details but not separated per holder are refused, until a real export shows how Carta writes them.

   Or would you rather refuse any option column until a real export shows whether Carta gives strikes?
9. **Warrants:** each `<class> Warrants` column becomes a warrant for that class, its strike blank to fill. The converter heads a warrant for a preferred series by its common class, as converted, so the reader can't always tell them apart. Read the heading as written, and leave the rest to Carta's export (an open question)? `Warrants for future series of Preferred Stock` refused, on the later list?
10. **SAFEs:** each `Post-$ SAFEs` or `Pre-$ SAFEs` row becomes one SAFE for the row's total, at its cap and discount, held by a holder made for it, named like "Post-money SAFEs, $25,000,000 cap (5)", with a report line.
    - **Why it pays the same for post-money:**
      - SAFEs with the same terms have one Liquidity Price.
      - The count adds purchase ÷ cap across them.
      - Their cash shares a shortfall pro rata.
      - Under E20 equal SAFEs convert together.
    - **Pre-money:** the shares add up the same way.
    - **The catch:** the payouts can't be split among the real holders.

    Agreed, with the reference test in 06c?
11. **Notes:** a `Convertible Notes` row with one note becomes a note: `Outstanding Amount` as principal (an open question), its discount, and its cap read as pre-money with a report line (O9). The interest rate, issue date, base and repayment multiple are blank to fill. A row of several notes is refused, since combining notes with different dates or rates isn't exact. Agreed?
12. **The API:** `readOcx(workbook)` returns `OcfImport`'s shape: `as_of`, `cap_table`, `issue_order`, `to_fill`, `report`. It throws a new `OcxRefusal` with `OcfRefusal`'s fields. 0.7.0's naming review then decides whether the two imports share one refusal class and one result type. Or one class now?
13. **A workbook saved by a spreadsheet app,** for 06e's parser test: could you save one of our own fictional workbooks from Excel, or Numbers, so the test has a real app's output? 04f's Windows zip was the same kind of request.

## Your answers (2026-10-10)

Your reading check: no strikes or seniority anywhere, and a warrant for a preferred series headed by its common class, counted as converted, as the converter's code has it.

1. **06c waits for a real export's headers.** You're also asking founders for the headers of Carta's Cap table report with "Securities ledger by type and class", which may carry strikes and SAFE holders. Once both are in, we pick the source, or use both.
2. **(a), the cell-kinds script,** kept small. 05a2's "Copy a summary to share" comes to .xlsx in 06e: for most founders, the page is how we'll learn why a file didn't read.
3. **The numbers rule:** agreed.
4. **Layouts are told apart by their headers, not the label.**
   - **0.4/0.5's layout** is read whatever the label says, and the label is reported.
   - **Refused:** only headers that match no layout read.
   - **0.3** is refused unless Carta writes it.
5. **Matching a round to its class:** agreed.
6. **A class named preferred under `Common Stock`:** read as common, with the report line.
7. **Seniority starts with no order set.**
   - **Two one-click choices:** "all pari passu" and "stacked, latest round senior".
   - **Or arranging by hand.**
   - **One is required before Use.** Nothing is guessed (O1).
8. **Options:** agreed. Blank strikes, the report line, and RSUs refused.
9. **Warrants:** agreed, both.
10. **SAFEs:** agreed, with pre-money SAFEs in the reference test too. Combining a row is what lets several of them past `several_safes`, so the test shows that it's exact.
11. **Notes:** agreed. Whether `Outstanding Amount` includes interest stays open for the export.
12. **The API:** left to the naming review, 07a's `notes/plan-0.7.0.md`, so `readOcx` is built once, to settled names.
13. **A workbook saved by a spreadsheet app:** yes, when 06e gets there.

## Open questions only a real Carta export can settle

1. **Which OCX version Carta writes:** its version label, and whether its per-holder tab is `Stakeholder Snapshot` or 0.3's `Detailed Snapshot`.
2. **Which tabs it fills:** all four, or some only with titles, as the open-source converter does. Any tabs of Carta's own beyond the four.
3. **The header rows exactly:** line breaks, footnote marks, trailing spaces, and the `(outstanding) (<ratio>)` form.
4. **Values or formulas,** and whether formulas carry saved values.
5. **Dates:** Excel day counts or text, and in which form.
6. **Numbers:** prices as typed, or computed to 17 digits. Ratios to how many places.
7. **Rounds and classes:** whether each `Financing History` round names its class closely enough to match. Whether a SAFE's conversion series has a row of its own.
8. **`Participation Cap`:** a multiple, or a dollar amount, and whether it includes the preference.
9. **Options:**
   - a column per plan or per class
   - whether strikes appear anywhere
   - whether RSUs are separated per holder
   - what `Non-Plan Awards` holds
10. **Warrants:** headed by the class they buy or the common it converts into, counted as shares or as converted. Whether strikes appear.
11. **Convertibles:**
    - one row per SAFE or note, or grouped by terms
    - whether holders appear anywhere
    - whether a note's `Outstanding Amount` includes interest
    - whether a note's rate, issue date or maturity appear anywhere
12. **Seniority, cumulative dividends, anti-dilution:** whether any appear anywhere.
13. **Totals:** whether the holders add up to each column's total, and the Summary Snapshot's counts match.
14. **The file itself:** .xlsx, not .xls, .xlsb or .xlsm; hidden tabs; protection.

**Beside these:** the headers of Carta's Cap table report with "Securities ledger by type and class" (your answer 1), and whether it carries what OCX lacks: strikes, SAFE and note holders, a note's terms, seniority.

## For 0.6.0's release notes: 06a's changes that can break 0.5.0 code

From `notes/review-06a.md`:
1. **The `Milestone` type is no longer exported.** TypeScript that imports it doesn't compile. It was a type-only export, so the 17 exports are unchanged.
2. **`UnsupportedTermError` has no `milestone`.** In TypeScript, reading it is a type error; in JavaScript, it's `undefined`, where 0.5.0 always gave `"later"`.
3. **`UnsupportedTermError`'s constructor takes `(term, path, what)`,** where 0.5.0 took `(term, milestone, path, what)`. TypeScript flags the old call. JavaScript doesn't: with four arguments, `path` becomes `"later"`, the old path takes the description's place in the message, and the description is dropped.
4. **Every refusal message ends differently.** "The engine supports this once a case needs it; until then it refuses the input rather than ignoring the term." is now "The engine doesn't model this, so it refuses the input rather than ignoring the term." The path and what isn't modeled, before it, are unchanged. The 11 refusals:
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
