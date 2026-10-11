# Plan: 0.6.0, reading an OCX export

0.4.0 reads a company's cap table from an Open Cap Format (OCF) package. 0.6.0 reads one from an **OCX** workbook: the Open Cap Table Coalition's Excel layout of the same data.

**Carta exports it.** Carta's release note "Equity reporting suite: OCX" (https://releasenotes.carta.com/equity-reporting-suite-ocx-1EEcfe) puts it under Cap Table > Run reports, in the Capitalization folder, generally available. The note gives no OCX version and lists no tabs.

0.6.0 also ships 06a's removal of the milestone names from the engine's refusals (the release notes' lines are at the end).

**The short version:**
- **OCX 0.3 to 0.5 is a snapshot, not a ledger.** It gives each holder's shares by class, each series' issue price, conversion price, multiple and participation, and the unissued pool. It doesn't give:
  - the seniority of the series
  - option or warrant strikes
  - who holds each SAFE or note, or a note's interest and dates
- **OCX 0.7 adds ledgers** (06d, from a real Mantle export): one per stock class, one per plan, one for warrants and one for SAFEs. They carry what 0.3 to 0.5 lack: each grant's exercise price, each warrant's holder, class and price, and each SAFE's holder and terms. Seniority is still nowhere.

So an import of 0.3 to 0.5 reads much less than an OCF import and leaves more to fill in, while an import of 0.7 reads most of what a sale needs from the ledgers.

**Revised in 06d for 0.7** ("OCX 0.7, as one Mantle export writes it", below). Where 0.7 changes a rule written before, the rule says so, and your answers that change are listed after them.

Each step below is sized for an evening. Cases come first, as for OCF. They waited for a real export's tab names and header rows (question 1), and the Mantle export is one. You're also asking founders for the headers of Carta's Cap table report with "Securities ledger by type and class", which may carry the strikes and SAFE holders OCX lacks. Once both are in, we pick the source, or use both.

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

**Added in 06d:**
- **A Mantle export of a test company** (free plan, so no preferred stock), which you put in `local/ocx-reference/`: `Test-Mantle_Export-2026_10_10.xlsx`, 45,117 bytes, SHA-256 `b74534e54e616e5f8ec65ad63b6349c419e9f532486622dbb2c813712f3a2353`. It's a private export, not fetchable by URL. Read as the reference workbooks were: locally, naming only tab names and headers, copying nothing, making no fixture from it.
- **The search for OCX 0.6 to 0.8's definitions.** None is published anywhere I could reach:
  - **The Coalition's OCX wiki** still lists only the 0.3, 0.4 and "1.0" (0.5) workbooks.
  - **The converter's repository** has had no change since June 2023, and no tags or releases.
  - **The OCF repository's docs** describe OCX in a paragraph, with no version.
  - **The Coalition's site** doesn't mention OCX.
  - **Mantle's export docs and blog** name OCX but give no version or template. I couldn't find the blog post you mention for 0.8; the export itself says 0.7.
  - **One trace of a later version:** OCX repository issue #60 (September 2024) asks for exercise prices in "Plans Ledgers, the Non-Plan Options Ledger, and the Warrants Ledger". The answer, in my words: in the ledgers, "Price Per Share" is the general term, a stock certificate's cost basis and an option's or warrant's exercise price. Mantle's 0.7 differs: its plan ledger says "Exercise Price", its stock ledgers "Price", and only its warrants ledger "Price Per Share".

  So 0.7 here is what Mantle writes, not a published definition. The Coalition, or Mantle, could be asked for the 0.6 to 0.8 reference workbooks (question 06d-1).
- **Licenses:** the Mantle export is a user's own data, read with your permission; there's no format license to check, since no definition is published. The converter stays Apache-2.0.

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

## OCX 0.7, as one Mantle export writes it (06d)

**What you found, checked:** all of it holds, with these corrections and additions (marked *added*).

**Eleven tabs:** `Summary View`, `Stakeholder View`, one ledger per stock class, `Stock Option Plan Ledger`, `Warrants Ledger`, `SAFEs Ledger`, `Context`.
- **A class ledger's tab** is named for its class, cut to Excel's 31 characters with "…" when longer, so the name can't be relied on. *Added:* each ledger has a title row, "<company> <class> Ledger", and the company's name is the Summary View's title less "Summary Capitalization", so the class is the title less both. The ledgers have no class column.
- **The plan ledger** is named for its plan ("Stock Option Plan" here, the plan's own name), so it too is known by its headers.
- *Added:* **the classes here are all common** ("Common Seed", "Common A"…), and the shares a converted SAFE became are a class of their own, "<class> (SAFE conversion)", as R5's series from SAFEs is.

**Summary View**, as 0.5's Summary Snapshot with:
- `Shares Authorized/Reserved` (no space after the slash)
- `MFN`, added to the convertibles table
- *Added:* the plan's rows are `<plan> Options Outstanding` and `<plan> Options Available to Grant`, where 0.5 has `… Options Outstanding`, `RSUs Outstanding` and `Available for Grant`; the warrants row is `Warrants`
- *Added:* the convertibles table is empty, since both SAFEs converted

**Stakeholder View**, as 0.5's Stakeholder Snapshot with:
- a class's column `<class> Stock` (its shares) and, in the voting block, `<class> Stock (outstanding)` (a share of the vote)
- *Added:* one `Stock Warrants` column for every warrant, where 0.5 has `<class> Warrants` per class
- *Added:* the plan's column `<plan> Options`
- `Options remaining for issuance`, in lower case, as the pool's row label

**The ledgers' headers:**
- **A class ledger:** `Stockholder`, `Issue Date`, `Cert No.`, `No. Shares Issued`, `Basis of Issuance`, `Price`, `Cash Paid`, `Debt Cancelled`, `Cancellation Date`, `Certificate Outstanding (Y/N)`, `No. Shares Outstanding`, `Price Per Share Currency`, and more about vesting, transfers and exemptions. 31 in all; ASSUMPTIONS OX2's script knows every one.
- **The plan ledger:** `Optionholder`, `Grant Date`, `Shares Granted`, `Type`, `Exercise Price`, `Split Adjusted Exercise Price`, `Shares Outstanding from Original Grant`, `Split Adjusted Shares Outstanding`, `Expiration Date`, `Share Class`, `Display Status`, `Exercise Currency`, and more. 43 in all.
- **`Warrants Ledger`:** `Convertible Holder`, `Issue Date`, `No. Maximum Warrant Shares Issuable`, `Series of Stock`, `Price Per Share`, `Warrant Shares Outstanding`, `Expiration Date`, `Display Status`, `Exercise Currency`, and more. 31 in all.
- **`SAFEs Ledger`:** `SAFE Holder`, `Issue Date`, `Investment Amount`, `Valuation Cap`, `Discount`, `Valuation Method (Pre- or Post-Money)`, `Conversion Date`, `Class of Converted Securities`, `Display Status`, `Most Favored Nation`, `Investment Amount Currency`, `Valuation Cap Currency`, and more. 26 in all.
- *Added:* **every ledger carries the holder's `State of Residence`**, personal data, which nothing reads.
- *Added:* **a currency for each amount** (`Price Per Share Currency`, `Exercise Currency`, `Investment Amount Currency`, `Valuation Cap Currency`), "USD" here.

**Context:**
- `Stock Plan History`, with `No. Shares` where 0.5 has `Number of Shares`, and `Stock Plan Details` as in 0.5
- the label "OCX Version 0.7", and *added:* "Generated at <an ISO time>" and a line naming Mantle as the exporter
- *Added:* **no Financing History,** the table 0.5 keeps each series' issue price, conversion price, multiple, participation and cap in. This export has no preferred stock, so whether 0.7 drops the table, keeps it, or moves those terms is the biggest open question (below). There's also no 409A, split or shareholder-group table here.

**Values and formulas,** corrected slightly:
- **Holdings, strikes, prices and amounts are values,** and so are computed columns such as `Fully Diluted Shares` and `% Fully Diluted`.
- **Every total is a formula,** and every one but one has no saved value: a percentage in the pool's row is saved as 0. Open question 15's rule applies in practice: totals can't be checked against holdings, so the checks compare value cells across tabs instead (below).

**Dates:**
- **The as-of date is text,** "As of Sat, 10 Oct 2026", on every tab.
- **Ledger dates are YYYY-MM-DD text.** *Corrected:* "Unknown" appears only in Context's `Stockholder Approval Date`, not in the ledgers.
- *Added:* **a converted SAFE's `Conversion Date` carries a certificate reference** after the date: "2021-01-15 (SPS-3)".

**What `ocx-structure` says on it** (06d taught it 0.7): every tab recognized; the class and plan ledgers by their headers, as "tab 3 (class ledger)", never by name; "not found" for Financing History on Context; and every ledger's state of residence "not read".

## Where the versions differ

So the reader can tell them apart. The 0.7 column is the Mantle export's (06d):

| | 0.3 | 0.4 | 0.5 (the file named 1.0) | 0.7 (Mantle) |
|---|---|---|---|---|
| **Version label** on Context | none | "OCX Version 0.4" | "OCX Version 0.5" | "OCX Version 0.7" |
| **The summary tab** | `Summary Snapshot` | as 0.3 | as 0.3 | `Summary View` |
| **The per-holder tab** | `Detailed Snapshot`, headed `Shareholder`, `Shareholder Group` | `Stakeholder Snapshot`, headed `Stakeholder`, `Stakeholder Group` | as 0.4 | `Stakeholder View`, headed as 0.4 |
| **A class per holder** | preferred only `(as converted)`, so outstanding preferred must be backed out by the ratio | common by its name; preferred `(outstanding) (<ratio>)`, and `(as converted)` when the ratio isn't 1 | as 0.4 | `<class> Stock`; how preferred is headed is open |
| **Options and warrants per holder** | `Options`, `Common Stock Warrants` | `<class> Options`, `<class> Warrants`, `Non-Plan Awards` | as 0.4 | `<plan> Options`, one `Stock Warrants`, `Non-Plan Awards` |
| **Ledgers** | none | none | none | one per class, one per plan, `Warrants Ledger`, `SAFEs Ledger` (notes: open) |
| **Financing History** | stops at `Conversion Ratio`: **no multiple, no participation, no cap** | adds `Liquidation Multiple`, `Participating (Y/N)`, `Participation Cap` | as 0.4 | not in the export seen, which has no preferred: open |
| **Stock Plan Details** | the history table only | adds the details table (reserved, granted, outstanding options and RSUs, returned, available) | as 0.4 | as 0.4; the history's count is `No. Shares` |
| **Convertibles** | `Security Type`, `Amount`, `Discount`, `Valuation Cap` | adds `# of Securities`; `Amount` becomes `Outstanding Amount` | as 0.4 | adds `MFN` |
| **Shares authorized** | `Shares Authorized` | `Shares Authorized/ Reserved` | as 0.4 | `Shares Authorized/Reserved` |
| **Context's title** | "Context" | "Context" | "Context Tab" | "Context" |
| **The as-of date** | "[DATE]", a placeholder in the reference | "As of [DATE]", likewise | as 0.4 | text, "As of Sat, 10 Oct 2026" |
| **Context's dates** | day counts in a date format | text, YYYY.MM.DD | as 0.4 | text, YYYY-MM-DD, or "Unknown" |
| **Totals** | formulas with saved values | as 0.3 | as 0.3 | formulas with no saved value |

**0.4 and 0.5 have the same tables and headers.** Only the version label and Context's title differ. So the reader treats them as one layout. **It tells layouts apart by their headers, not by the label** (your answer 4): a workbook with 0.4/0.5's headers is read as that layout whatever its label says, and the label goes in the report as written.

**0.3 lacks a preference's terms.** It also lacks outstanding preferred per holder.

**0.7 is told apart by its headers,** your answer 4: the per-holder tab's `<class> Stock` and `Stock Warrants` columns, and the ledgers' header rows. Its label is reported, not used. A workbook whose tabs don't all match one layout is refused, since which to believe would be a guess.

## What `readOcx` reads, mirroring `readOcf`

### The input

The engine does no I/O, as for OCF.
- **The page parses the .xlsx:** it's a zip, which the page's own zip reader opens, of XML parts, read by a small reader of our own, with no dependency.
- **`readOcx` takes the workbook already parsed:** each tab's name and cells, and the workbook's date system. Each cell has its address, its kind (number, text, true/false, error, or a number formatted as a date), its text exactly as stored, and whether it holds a formula. **A number reaches the engine as text, never as a JavaScript number** (hard rule 2). Built in 06c as `OcxWorkbook` (OX1).
- **A cell with a formula** gives the value Excel saved with it. **The reader never works a formula out.** A formula saved with no value is refused where the import needs its value. A total that's a formula is only a check, and one it can't trust is skipped (open question 15).

### Numbers

Excel stores every number as a binary double and writes it out to 17 significant digits. A price typed as 0.2 is stored as "0.20000000000000001", and 0.0025 as "2.5000000000000001E-3".

**The rule I'd propose:** read each number to 15 significant digits, Excel's own precision for what's typed into it, and drop trailing zeros. 0.2 and 0.0025 come back exact.
- **A share count** that isn't then whole is refused, as an OCF fraction of a share is (O5).
- **A value Excel computed,** such as a conversion ratio of 1/3, comes back as a 15-digit decimal. It's checked against the prices within that rounding, as O4 checks OCF's, and read with a report line when it isn't exact.

### Dates

**A number formatted as a date** is Excel's day count:
- from 1900 (with Excel's leap day of 29 February 1900, which never existed), or
- from 1904, when the workbook says so.

**A date written as text** is read as `YYYY.MM.DD` (the reference's own form) or `YYYY-MM-DD`. Anything else is refused where the date is needed. Which form Carta writes is an open question.

**Added for 0.7 (06d):**
- **The as-of date** "As of Sat, 10 Oct 2026": a weekday, a day, an English month's first three letters and a year. The weekday is checked against the date.
- **"Unknown"** where a date is needed is a blank: an issue date for the issue order, say, falls back to R31's default, with a report line. Where no date is needed, as for a plan's approval, it's set aside.
- **A date followed by a reference,** "2021-01-15 (SPS-3)", is read as its date where one is needed. A converted SAFE's conversion date isn't: its status says it converted.

### Headers

**Matching:**
- **Whitespace and footnote marks don't count.** Runs of spaces and line breaks are one space, leading and trailing spaces are dropped, and so are trailing `*` footnote marks: the reference has `Common Stock****` and `Mailing Address Line 2 `.
- **Case counts in a header.**
- **Row labels match in any case** (your 06d message): `Options remaining for issuance` as 0.5's `Options Remaining for Issuance`, and likewise `Total` and the Summary's section labels.
- **Each layout's own headers:** `Shares Authorized/ Reserved` in 0.4 and 0.5, `Shares Authorized/Reserved` in 0.7.

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

A mismatch is refused as malformed, naming the check, unless the total is a formula the import can't trust (open question 15).

### From 0.7's ledgers (06d)

Where the ledgers are there, `readOcx` reads from them, and asks only for what they and the rest of the workbook don't give. The table above still holds for what the ledgers don't cover.

| In 0.7 | In the cap table |
|---|---|
| A class ledger, by its title | the class's certificates. Its kind, common or preferred, is the section its row sits in on the Summary View. |
| A certificate with `Certificate Outstanding (Y/N)` "Y" | `No. Shares Outstanding` of that class for its `Stockholder`. Each holder's sum is checked against the Stakeholder View's `<class> Stock` value. |
| A preferred class's issue price | from Financing History, if 0.7 has it; otherwise the class ledger's `Price`, when every certificate first issued in the class has the same price, with a report line saying where it came from. Differing prices leave it blank. |
| A preferred class's multiple, participation, cap and conversion price | from Financing History, if 0.7 has it; otherwise blank to fill. Never guessed, and never 1x (O1). |
| A plan ledger row whose `Display Status` is outstanding | a grant to its `Optionholder`: `Split Adjusted Shares Outstanding` when given, else `Shares Outstanding from Original Grant`, at `Split Adjusted Exercise Price` when given, else `Exercise Price`. Grants join option classes by strike, named as O6. A `Type` meaning RSU is a $0-strike RSU class (O6). A `Share Class` that's preferred is refused (O6). A grant whose `Expiration Date` is before the as-of date is left out and listed. Each holder's sum is checked against the Stakeholder View's `<plan> Options` value. |
| The pool | the `Options remaining for issuance` row, checked against Context's `Shares Available for Grant` |
| A `Warrants Ledger` row, outstanding | a warrant to its `Convertible Holder`, for `Series of Stock` (a common class makes it a warrant for common, named with that class, as O7), for `Warrant Shares Outstanding` (else the maximum less what's exercised and cancelled), at `Price Per Share`, the exercise price as issue #60 has it. An adjustable warrant read at its maximum gets a report line (the export's own footnote says amounts are maximums). A warrant for a class the workbook doesn't have is refused, as a future series is. |
| A `SAFEs Ledger` row neither converted nor cancelled | a SAFE to its `SAFE Holder`: `Investment Amount`, `Valuation Cap`, `Discount` (blank is none, as O8), `Valuation Method (Pre- or Post-Money)` for the cap's kind (blank is a blank to fill, as O8's case 04), and `Most Favored Nation`, read with its terms as they stand (12h). One SAFE per row, with its own holder: the Summary View's convertibles table is then only a check. |
| A note | from a notes ledger, if 0.7 has one: open. Without one, the 0.4/0.5 rule. |
| The issue order (O14) | a series by the earliest `Issue Date` in its class ledger; a SAFE by its `Issue Date`; one on the same day as a series after it |
| A currency column other than "USD" | refused, as O2 refuses one in OCF |
| `State of Residence` | never read |

**The checks, without totals:** every total is a formula with no saved value, so the checks compare value cells across tabs: holdings in the ledgers against the Stakeholder View, the pool against Context, the SAFEs against the Summary View's convertibles table where it has rows. A total that has a value is still checked.

## What it leaves to fill

As O1: nothing is guessed, never 1x and never $1. **From 0.7 with its ledgers,** the blanks are only seniority, a preferred series' terms the workbook doesn't give (all of them, if 0.7 has no Financing History), and a note's terms if there's no notes ledger. **From 0.4 or 0.5,** each blank below goes in `to_fill` for the page to ask about:
- **seniority:** always, since OCX has none (question 7)
- **each option class's, warrant's and non-plan award's strike**
- **for each note:** interest rate, issue date, what its cap divides by, and repayment multiple (question 11)
- **the sale's date,** where a note is outstanding, as the page asks today (O13)

## What it refuses

**ASSUMPTIONS OX13 is now the live list** (06e2): each term, its kind and subject, and the order of checks. One change from the list below: a holdings header the reader doesn't know is unsupported, not malformed. The list stays as the plan had it.

Each by name, with a kind, `unsupported` or `malformed`, and a term, as `readOcf` does:

**Unsupported:**
- headers that match no layout the reader reads, including 0.3's, unless Carta writes it (your answer 4). The label never decides this.
- `Warrants for future series of Preferred Stock` with any outstanding: there's no series to model it on
- RSUs outstanding that the Stakeholder Snapshot doesn't separate from options (question 8)
- a convertibles row the reader can't map (question 10)
- several notes in one row (question 11)
- a currency other than US dollars: 0.7's ledgers say each amount's currency; the reference has no field for one
- an option over a preferred class, from 0.7's plan ledger (O6)

**Malformed:**
- a missing tab, table or required header
- a holdings header it doesn't know
- a total that doesn't add up
- a liquidation preference that doesn't match
- a round with no class, or a class with no round
- a formula with no value saved, where the import needs its value (open question 15)
- a fraction of a share
- a date or number it can't read
- two stakeholders of one name
- a workbook whose tabs don't all match one layout (06d)
- a ledger's holder not on the Stakeholder View, or a holding there that the ledgers don't make up (06d)

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

**Renumbered again in 06d.** 06d became this revision for 0.7, so the cases are 06e, the engine 06f, the page 06g and the release 06h. Earlier text keeps the numbers it was written with: in the questions and answers below, 06c (cases) is now 06e, 06d (the engine) 06f, 06e (the page) 06g, and 06f (the release) 06h.

- **06c, what doesn't wait for headers** (done):
  - **the .xlsx reader** into the engine's `OcxWorkbook` (OX1)
  - **`pnpm ocx-structure`** (OX2)
  - **the naming review's item 7,** beside the old names: `ImportRefusal` and `CapTableImport`
- **06d, this revision for OCX 0.7,** from a real Mantle export. No engine code and no cases; the cell-kinds script learns 0.7's tabs and headers.
- **06e, cases** (the `cases/` edit rule lifted, on your machine, for the 06e steps), now that a real export's headers are in (your answer 06d-3). **Split under the one-evening rule** (06e), as 04a's cases were split into 04a to 04c:
  - **06e: the rules and the first two cases** (done):
    - ASSUMPTIONS OX3 to OX12, the import's rules, and C18, the OCX case folder
    - **ocx-01-alder-gate:** a fictional company's 0.7 workbook using every 0.7 tab and ledger the reader reads: common classes, one of them a SAFE's conversion shares with its ledger's tab name cut to 31 characters; options, an RSU, a cancelled and an expired grant; a warrant; a SAFE converted and one outstanding
    - **ocx-02-ferncliff-preferred:** the one 0.7 case with preferred stock, read with blanks (your answer 06d-3); ASSUMPTIONS says plainly it rests on no real export
  - **06e2: the 0.7 fixtures** (done), one small change to a 0.7 case for each refusal and each blank, as 04a2's were:
    - **ASSUMPTIONS OX13,** the refusals: each term's kind and subject, and the order of checks that decides which refusal comes when a change could trip two; small additions to OX4 to OX12; and C18's fixture form
    - **cases/ocx-03-refused:** 30 refusals, 28 on ocx-01 and two on ocx-02, where preferred stock is needed (`non_plan_awards` added after your review)
    - **cases/ocx-04-to-fill:** three blanks, a SAFE's cap's kind, a note in a convertibles row and a preferred series' issue price, each result the whole import
  - **06e3: the reads** (done; your 06e2 review): `cases/ocx-05-reads`, one small change to a 0.7 case for each reading rule no case or fixture reaches yet, each changing the cap table, so each is in a case you re-derive, not only in 06f's tests: a pre-money SAFE, a SAFE's discount and MFN, split-adjusted counts and strikes, an expired warrant, a class named preferred under `Common Stock`, "Unknown" as an issue date, a date as a day count and the 1904 date system, a 17-digit stored number, an unknown header outside the holdings, a total with a saved value that agrees, two plans, and an id that comes out the same twice. Built as 15 fixtures, adding a cancelled SAFE and a warrant ledger without its outstanding column; the MFN column is now not read at all (OX11), since it changes nothing, and a date followed by a reference isn't reachable in 0.7 (`cases/ocx-05-reads/DERIVATION.md`).
  - **06e4: 0.4/0.5:** a fictional workbook in the reference's layout, using every table the reader reads there, and its fixtures.
  - **06e5: the locked cases written as OCX:** edge cases 4, 5a, 7, 8 and 12b, and Millrace, in 0.4/0.5's layout, each importing, with its blanks answered, to the locked cap table, with prices to 15 significant digits, compared within a cent as 04b2 did for OCF's 10 places. With it, the reference unit test for a row of identical SAFEs, post-money and pre-money both (your answer 10).

  The workbooks are our own, written as JSON in `OcxWorkbook`'s shape (tabs and cells), each expected result worked by hand in its DERIVATION, from the workbook, so it can be re-derived independently before the label goes on. None is made from the Mantle export: 0.7's tab names and headers are used, as the format's interface; titles, footnotes, the company, its holders and numbers are our own, with no footnote or title wording from the export (your 06d review). The one exception is a ledger title's ending, "… <class> Ledger", which the reader matches to find a class whose ledger's tab name is cut short (OX8).
- **06f, the engine:**
  - `readOcx`, to the naming review's names (07a)
  - both layouts, told apart by their headers
  - the numbers and dates rules, the header matching and row labels in any case
  - the ledgers, the cross-tab checks, refusals and report
- **06g, the page:**
  - "Open a cap table export", on 06c's reader
  - the seniority question, and the questions for a preferred series' terms
  - **one-click answers for a preferred series' terms** (your 06d review), as for seniority: "conversion price = issue price" and "1x, non-participating". The founder must click one; neither is ever preset, and nothing is used until each blank is answered (O1).
  - `ocf-check` on .xlsx
  - **"Copy a summary to share"** (05a2) for .xlsx, on the report, on a refused import and on a refusal at Use (your answer 2)

  Its test workbooks are .xlsx files our tests write from the JSON cases, plus one you save from a spreadsheet app (your answer 13).
- **06h, release 0.6.0,** with 06a's breaking changes in its notes (below).

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

## Which of your answers 0.7 changes (06d)

With 0.7's ledgers there:
- **1, the second source:** 0.7's ledgers carry what you hoped Carta's "Securities ledger by type and class" report might: strikes and SAFE holders. If Carta writes 0.7, that report may not be needed. Which version Carta writes is still open.
- **4, layouts by headers:** two layouts read, 0.4/0.5 and 0.7, each by its headers, and the label reported (question 06d-2 on keeping 0.4/0.5). 0.3 is still refused.
- **5, matching a round to its class:** applies only where Financing History exists. In 0.7 the classes come from the Summary View and the ledgers' titles, and whether Financing History exists is open.
- **8, options:** strikes and classes come from the plan ledger, RSUs are told apart by `Type`, and expired grants by `Expiration Date`. Blank strikes, and refusing RSUs that can't be told apart, stay for 0.4/0.5.
- **9, warrants:** strike and class come from the `Warrants Ledger`, so the heading's ambiguity goes. A warrant for a series not in the workbook is still refused.
- **10, SAFEs:** one SAFE per ledger row, with its holder, issue date and terms. Combining a row stays for 0.4/0.5.
- **11, notes:** read from a notes ledger if 0.7 has one. Its name and headers are open, so until an export shows one, a note in 0.7 follows the 0.4/0.5 rule: a single note per row, its terms blank to fill.

**Unchanged:** 2 (the cell-kinds script, now taught 0.7), 3 (numbers), 6 (a class named preferred under `Common Stock`), 7 (seniority: still nowhere in 0.7), 12 (names, settled in 07a) and 13.

## Questions for you (06d)

1. **Ask for the definitions?** No 0.6 to 0.8 definition is public. Should someone ask the Coalition, or Mantle, for the 0.6 to 0.8 reference workbooks? Read locally and copied into nothing, as before. I'd say yes: 0.7 here is one exporter's reading.
2. **Keep 0.4/0.5?** I'd keep them. Carta's OCX release note dates from about 2023, when 0.4 and 0.5 were current, so Carta may still write one of them, and the reference workbooks define them publicly. The cost is a second layout in `readOcx` and its cases. The other way is to read 0.7 only, refusing 0.4/0.5 by name until an export shows one.
3. **Cases now?** 06e can start from the Mantle export's headers, for 0.7 as Mantle writes it, and from the reference for 0.4/0.5, without waiting for Carta's. Agreed? Carta's headers, when they come, are then checked against both layouts.
4. **Preferred in 0.7, before an export shows it:** read a preferred class from its ledger and the Summary View, with its issue price from the ledger's `Price` and every other term blank to fill, unless Financing History is there? Or refuse preferred in 0.7 until an export with preferred stock settles where its terms are? I'd read it with blanks: nothing is guessed either way, and a founder gets an import.
5. **The issue price from the ledger's `Price`:** only when every certificate first issued in the class has the one price, with a report line, and blank otherwise. Agreed?

## Your answers to 06d's questions (2026-10-10)

1. **The Coalition only.** You're opening an issue on its OCX repository asking whether 0.6 to 0.8 reference workbooks exist. **Not Mantle:** spillpoint competes with it, so there's no outreach there. Mantle's export stays a reference we read, nothing more.
2. **Keep 0.4/0.5.** Carta's OCX dates from 2023, when they were current.
3. **Cases now:** 0.7 from the Mantle export's headers, 0.4/0.5 from the reference. **Preferred stock in 0.7 gets one case only,** and ASSUMPTIONS says plainly that it rests on no real export yet (OX7; ocx-02).
4. **Read preferred in 0.7 with blanks.** A preferred class whose headers match no known pattern is still refused.
5. **The issue price from the ledger's `Price`:** agreed.

**The test workbook:** 0.7's tab names and headers may be used. Titles, notes, the company, holders and numbers are our own, with no footnote or title wording from the export.

**For 06g:** one-click answers for preferred terms, "conversion price = issue price" and "1x, non-participating", which the founder must click and which are never preset (in the steps above).

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
15. **Formula totals saved as 0** (Jordan, 06c review; for 06e). XlsxWriter saves 0 for any formula it didn't work out, and a server-built export may do the same. The reader can't tell that 0 from a real one.
    - **The rule for 06e:** if the export's totals are formulas, `readOcx` reads only value cells.
    - **A formula total it can't trust** is skipped, with a report line, rather than called malformed.
    - **What the cell-kinds script shows:** each column's formula count says how many were saved as 0. All of a column's formula totals at 0 beside non-zero data would point to this.

**Beside these:** the headers of Carta's Cap table report with "Securities ledger by type and class" (your answer 1), and whether it carries what OCX lacks: strikes, SAFE and note holders, a note's terms, seniority.

## What only a 0.7 export with preferred stock and a convertible note can settle (06d)

1. **Financing History:** whether 0.7's Context has it, with each series' issue price, adjusted conversion price, ratio, multiple, participation and cap; whether those terms moved elsewhere; or whether 0.7 dropped them.
2. **A preferred class on the Stakeholder View:** `<class> Stock` alone, or with `(as converted)` and its ratio, as 0.5 has.
3. **The Summary View's `Liquidation Preference`** for a preferred class: a value or a formula, and whether it agrees with shares × issue price × multiple.
4. **A preferred class's ledger:** whether `Price` is its original issue price, and whether anything says how it converts.
5. **Seniority:** anywhere at all.
6. **The notes ledger:** its tab name and headers. Whether it gives principal, interest rate, simple or compounding, accrual dates, maturity, cap, the cap's kind, discount, what the cap divides by, and a repayment multiple.
7. **A note on the Summary View:** a `Convertible Notes` row per note or grouped, and whether `Outstanding Amount` includes interest (your answer 11).
8. **An outstanding SAFE:** its `Display Status` ("Outstanding"?), and its row in the Summary View's convertibles table.
9. **Pre-money SAFEs:** how `Valuation Method (Pre- or Post-Money)` says pre-money ("Pre Money"?).
10. **Discounts:** a fraction (0.2), a percentage (20), or text ("20%").
11. **A warrant for preferred:** `Series of Stock` naming a preferred class, and how the Stakeholder View's `Stock Warrants` counts it: as shares, or as converted.
12. **`Display Status` and `Type`:** their words for exercised, cancelled, expired and partly exercised grants; RSUs and their `Type`.
13. **A non-plan award:** whether it has a ledger of its own (issue #60 names a "Non-Plan Options Ledger"), and its headers.
14. **Several plans:** a ledger each.
15. **Dividends, anti-dilution and series that convert together:** anywhere.
16. **0.8:** whether Mantle now writes it, and what changes.

## Other tools that export OCX

You asked for one with a free plan that allows preferred stock. None is confirmed:
- **Carta** exports OCX ("Equity reporting suite: OCX"). Its free plan, Launch, is for companies with fewer than 25 stakeholders and under $1M raised. Its listed features include SAFE modeling, and priced rounds sit in the paid tiers. Whether Launch has the OCX report, and whether a test company there can hold preferred stock, isn't stated. It's worth a try: a Launch export would also say which OCX version Carta writes.
- **Mantle** exports OCX on its free plan, which has no preferred stock (your note); its paid plan is out of reach.
- **Walter** (getwalter.com), a cap table and document tool, once announced OCX export; that page is now gone, and its plans start at $99 a month on G2. Unconfirmed.
- **The Coalition's converter** (`ocf2ocx`) is free and runs on any OCF package, preferred stock included, such as our own OCF cases. But it writes its own early layout, filling only the Stakeholder Snapshot, not 0.7.
- **Other tools found** (Cake, Pulley, Capboard, OpenCap Stack) export a spreadsheet, but nothing says it's OCX.

**The likeliest routes to a 0.7 export with preferred:** Mantle sending a sample, the Coalition sharing its reference workbooks (question 06d-1), or a Carta Launch test company, if Launch allows it.

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
