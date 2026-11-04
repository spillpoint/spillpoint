# Plan: 0.8.0, reading Carta's cap table report

0.6.0 reads a cap table from an OCX workbook. 0.8.0 reads one from **Carta's own cap table report**, the Excel file a founder walks away with after leaving Carta. Founders who leave have that report, not OCX.

`readCarta(workbook)` mirrors `readOcx`: the same parsed workbook in, the same `CapTableImport` out, the same `ImportRefusal` with the format `"carta"`.

**Where this stands:** the plan is answered, and the text above the answers follows them where they differ. **08b0 is done,** engine changes that have nothing to do with Carta, and next are 1.0's gates. **08b and after wait.** The plan rests on one report from 2022, and no founder needs the import yet. They go ahead when a second, current Carta report's structure comes in, or when a founder needs to import one. Until then, 1.0's gates come first.

**The short version:**
- **The report is a ledger, and it gives more than OCX 0.4/0.5:** every holder, every certificate, each grant's strike, and each open SAFE's holder, amount, cap, discount and date.
- **It doesn't give** participation, seniority, or whether a convertible is a SAFE or a note and pre- or post-money. Those are blanks to fill. A company with many SAFEs answers those in one click, not one each (answer 5).
- **Your 16 items hold, with five changes.**
  - **Item 6 and `as_of`:** row 2 is the only place the as-of date is, so it's read as far as its date and no further (answer 1).
  - **Item 3:** a Canceled Date decides only in the Convertible Ledger (answer 2).
  - **Item 4:** a note needs a repayment multiple and a rate as well.
  - **Item 10:** class and plan names carry the company's name too, not only a convertible's.
  - **Item 12:** the reader adds to the API, and `ImportRefusal.format` widens, so Stable from 1.0 says a list can gain names in a minor release. And 0.8.0, if it ships before 1.0, carries what's on main since 0.7.0, including 10c (answer 3).
- **The engine fits, and nothing on main changes the speed.** But what the search costs turns on the number of option strikes, not only SAFEs, so the count of strikes is what decides (below).
- **One engine gap, found while checking item 8:** post-money SAFEs that together promise 100% or more of the company aren't refused at a sale, and common is paid a negative amount. A round already refuses them. 08b0 refuses them at a sale too (answer 4).

## Where this comes from

**Your messages are the only source** (your items 13 and 14). I haven't seen the report, and for this plan I read nothing of Carta's or of the migration guide you mention.

**What's in the repo from the report:** Carta's tab titles and header names, which are the format's, and the kinds of value a column holds. **What isn't:** the company, anyone's name, any amount or date, and the counts in your message: how many grants, SAFEs and rows. A count of a real company's SAFEs isn't a header, so this plan says what a row looks like, not how many there are. You agreed: they stay out, and the sizes 10 and 26 stay only as a made-up table's.

**The new hard rule** (item 13) is in `CLAUDE.md` with this plan, as rule 11, beside rule 10's O12. It covers Carta's site and help pages as well as accounts: nothing else of Carta's is read to build `readCarta`. It overrides one line of `notes/plan-0.6.0.md`, which suggested a Carta Launch test company as a route to an OCX export with preferred stock. That route is closed. I've left the old plan as written.

**Fixtures** (item 14): our own fictional companies, with the headers `readCarta` reads and a few it skips, not a copy of Carta's whole layout. No title, note or footnote wording beyond what the reader matches on. The consequence for the reader is that it can require only headers it reads: a skipped header is never a `missing_header`.

**The name** (item 15): user-facing text names Carta only to say what's read, "Carta's cap table report". No logo. Both READMEs say spillpoint isn't affiliated with Carta. `readCarta` and the format `"carta"` are the API's names for what's read.

## Your items, checked

| # | Item | Verdict |
|---|---|---|
| 1 | Layout by titles and headers | **Confirmed.** The ledgers are known by their headers alone. Two pairs of tabs share headers, so only their titles tell them apart: the two summaries, and `Intermediate cap` and `Detailed Cap`. Titles match in any case, at the end of row 1's cell, since the company's name comes first and both "with" and "With" appear. OX5's matching does the rest. A curly apostrophe in `RSU's` matches a straight one. |
| 2 | What's read | **Confirmed, with four details.** Holders come from the ledgers as well, since the per-holder tabs have no convertibles column (fact 3). Only a heading reading `1:1` is read as a ratio; any other leaves the conversion price blank, since no export has shown one. The multiple is read only from the one whole shape seen, and only when a class's rows agree. Which column the pool's row fills isn't known (fact 7). |
| 3 | Skip a row with a Canceled Date | **Corrected for two ledgers** (answer 2). In the Convertible Ledger, yes, and a Converted Date alone closes a row too. In the certificate and plan ledgers, the outstanding column decides. |
| 4 | Blanks | **Confirmed, with additions.** A note also needs a repayment multiple, which the engine requires, and a rate, whose form no export has shown. "Does interest compound?" has one answer the engine takes, so Yes stops the import at the question. The conversion price is blank where the ratio isn't read. |
| 5 | Refusals | **Confirmed, with additions:** `RSAs not purchased` above 0, a Summary section or per-holder column the reader doesn't know (answer 6), and a class or plan shown as outstanding with no ledger the reader reads, which between them catch warrants. A tab it doesn't know gets a note. Unlike OX9, an RSU isn't read at a $0 strike here. |
| 6 | Never read | **Confirmed and widened,** to every personal column (below). **Row 2 is read as far as its date and no further,** since `as_of` needs it (answer 1). |
| 7 | Drafts | **Confirmed, and settled** (answer 7): the page asks whenever the report says "with Drafts", since equal columns can't rule out a draft convertible. |
| 8 | Values as written | **Confirmed for the import.** The engine gets one more refusal (answer 4). |
| 9 | Checks on saved values | **Confirmed.** Listed below. A formula saved as 0 counts as no saved value, so a tool that saves 0 for every formula can't cause a false refusal. |
| 10 | The summary to share | **Corrected.** A class, series or plan row label, a tab named for a plan, and a heading with a class or plan in it can carry the company's name too. And printing only known headers wouldn't show a changed layout, so a plain unknown header prints too (answer 8). |
| 11 | Cases | **Confirmed.** `xlsxOf` in `apps/dashboard/test/workbooks.ts` is the writer, and it already writes formulas with no saved value. Locked cases: edge-12d and edge-12f (below). |
| 12 | Steps | **Corrected.** 08b won't fit an evening: OCX's cases took five. And 0.8.0, if it ships before 1.0, carries 10c (answer 3). `ImportRefusal.format` widening to `"carta"` is the one type change, and it fails an exhaustive `switch` on `format` in TypeScript. That goes in the release note, and Stable from 1.0 says so from 08b0. |
| 13 | Where it comes from | **Done:** `CLAUDE.md`, hard rule 11, which covers Carta's site and help pages too. |
| 14 | Fixtures | **Confirmed.** |
| 15 | The name | **Confirmed.** |
| 16 | Export settings | **Confirmed.** The page's text says "if your export offers them", since it rests on no export. So the reader can't require the "with Drafts" columns or title: a report exported with drafts off may have neither. |

## What the report holds

**Nine tabs in the one report seen.** Row 1 is "<company name> <title>". Row 2 is "As of MM/DD/YYYY • Generated by <name> <email> at MM/DD/YYYY HH:MM:SS". The header row is row 4, and data starts at row 5. Every total is a formula with no saved value. There's no warrants tab.

| Tab | Row 1's title, after the company's name |
|---|---|
| `Summary cap table` | `Summary Capitalization Table with Drafts` |
| `Summary by Relationship` | `Summary Capitalization Table by Relationship with Drafts` |
| `Intermediate cap` | `Intermediate Capitalization Table With Drafts` |
| `Detailed Cap` | `Detailed Capitalization Table With Drafts` |
| `<CODE> Certificate Ledger`, common | `<Class> (<CODE>) Common Stock Certificate Ledger with Drafts` |
| `<CODE> Certificate Ledger`, preferred | `<Class> (<CODE>) Preferred Stock Certificate Ledger with Drafts` |
| the plan's name | `<plan> Ledger with Drafts` |
| `Convertible Ledger` | `Convertible Ledger with Drafts` |

Both "with" and "With" appear. The company's name may end in "Inc.", so a "." before the title isn't the format's.

**`Summary cap table` and `Summary by Relationship`:** row labels in column A, then `Shares Authorized`, `Shares Issued and Outstanding`, `Fully Diluted Shares`, `Fully Diluted Ownership`, `Cash Raised`, `Fully Diluted Shares with Drafts`, `Fully Diluted Ownership with Drafts`.

The row labels, in order:
- `Common Stock classes`, each class, `Total Common Stock issued and outstanding`
- `Preferred Stock classes`, each series, `Total Preferred Stock issued and outstanding`
- `Convertibles`, each convertible by its name, `Total Convertibles issued`
- the plan's name, `RSAs not purchased`, `Options and RSUs issued and outstanding`, `Shares available for issuance under the plan`
- `Totals`

An open SAFE shows only under `Cash Raised`; its share columns are blank. A class with nothing outstanding has no ledger and no column.

**`Intermediate cap` and `Detailed Cap`:** `Stakeholder ID`, `Name`, a column per class headed `<Class> (<CODE>)`, and for each preferred class a second, `<Class> (<CODE>)⏎1:1 Conversion Ratio`; then `Options and RSU's Outstanding Under <plan>`, `Outstanding Shares`, `Fully Diluted Shares`, `Outstanding Ownership`, `Fully Diluted Ownership`.

**A certificate ledger per class,** tab `<CODE> Certificate Ledger`: `Stakeholder ID`, `Certificate Number`, `Shareholder Name`, `Shareholder Email`, `Shares Issued`, `Shares Outstanding`, `Share Class`, `Price per share`, `Cash Paid`, `Debt Canceled`, `Value of IP Transferred`, `Other Consideration`, `Dividend ignoring cancellation`, `Vesting Schedule`, `Acceleration`, `Acceleration Notes`, `Vesting Commencement Date`, `Shares Vested`, `Issue Date`, `Board Approval Date`, `Termination date`, `Last Repurchase Date`, `Shares Subject to Repurchase (Unvested)`, `Canceled Date`, `Shares Canceled`, `Cancellation reason`, `Repurchase Date`, `Shares Repurchased`, `Balance shares reissued`, `Plan Name`, `Source`, `Federal Exemption`, `Rule 144 Date`, `State Exemption`, `State of Residency`, `Legend`, `Notes`, `Paper status`, `Liquidation Preferences`, `Cost Center`, `Job Title`, `Relationship`, `Full address`, `Address`, `City`, `State`, `Country`, `Zip code`. The common ledger adds `Employee ID`.

**The plan ledger,** its tab named for the plan: `Stakeholder ID`, `ID`, `Optionholder`, `Optionholder Email`, `Options Granted`, `Options Outstanding`, `Plan Name`, `Grant Date`, `Exercise Price`, `Amendment`, `Amendment details`, `Annual salary`, `Early Exercise`, `Type`, `Vesting Schedule`, `Acceleration`, `Acceleration Notes`, `Vesting Commencement Date`, `Time Vested`, `Total Vested`, `Vested Outstanding`, `Unvested`, `Quantity Exercised`, `Exercise Dates`, `Date Fully Vested`, `Terminated Date`, `Last Date to Exercise`, `Unexercised Quantity Canceled`, `Quantity Expired`, `Board Approval Date`, `Canceled Date`, `Quantity Canceled`, `Cancellation reason`, `Expiration Date`, `Federal Exemption`, `State Exemption`, `State of Residency`, `Employee ID`, `Notes`, `Paper status`, `Voluntary Termination`, `Involuntary Termination`, `Termination With Cause`, `Death`, `Disability`, `Retirement`, `Cost Center`, `Job Title`, `Relationship`. Several have line breaks inside them (`Options⏎Granted`, `Exercise⏎ Price`).

**`Convertible Ledger`:** `Stakeholder ID`, `ID`, `Convertible Holder Name`, `Convertible Holder Email`, `Principal`, `Other Consideration`, `Interest`, `Total`, `Issue Date`, `Board Approval Date`, `Canceled Date`, `Cancellation reason`, `Converted Date`, `Converted To`, `Maturity Date`, `Interest Rate`, `Valuation Cap`, `Conversion Discount`, `Change in Control Percent`, `Conversion Trigger`, `Federal Exemption`, `State Exemption`, `State of Residency`, `Notes`, `Paper status`, `Cost Center`, `Job Title`, `Relationship`.

**What the values look like:**
- **`Liquidation Preferences`:** "N/A" on common; "Converts 1:1 CSE, 1x multiple" on preferred. Nothing on participation or seniority.
- **`Type`:** every grant "NSO". "ISO" hasn't been seen.
- **`Convertible Ledger`:** a converted row has a `Converted Date`, a `Canceled Date`, the reason "Conversion", and `Converted To` naming a certificate in a preferred ledger. Some rows have a `Canceled Date` only. An open row has neither. Every open row has a `Valuation Cap` and a `Conversion Discount`, and none has an `Interest Rate`, `Maturity Date` or `Change in Control Percent`. The open rows' `Principal` adds up to the Summary's `Cash Raised` on the SAFE's row.
- **`Paper status`:** "Electronic" on every row. Nothing marks a draft.

## What `readCarta` reads, mirroring `readOcx`

### The input

**`readCarta(workbook)` takes the parsed workbook `readOcx` takes,** `OcxWorkbook`, from the page's own reader (OX1), which needs no change. The type's name stays: 0.7.0 settled it, and an alias would be one more name to hold from 1.0. Its comment says it's any workbook the reader gives. Keeping the one type means no new type export. The new export is the function.

**Telling the formats apart.** The page runs `readOcx` first. Where that refuses with `ocx_layout`, it runs `readCarta`. Where that refuses with `carta_layout`, the page says the file is neither. No detection function is exported.

### Numbers, dates and headers

**As OX5,** with no new rule: numbers to 15 significant digits, a number the import needs from a number cell, a share count that must be whole, a day count or ISO text for a date. How Carta writes the ledgers' dates and its amounts is fact 1. Where it differs from what OX5 reads, 08b adds the form.

**Headers** match as OX5's do: runs of spaces and line breaks are one space, the ends trimmed, case counts. The row of headers is found by its headers (item 1): the first row in a tab holding the ones that tab needs.

**Titles** match in any case, at the end of row 1's cell, with "with Drafts" optional. What comes before the match on the summary tab is the company's name, used only to keep it out of the summary to share.

**Row labels** on the Summary match in any case, as OX5's do.

**The as-of date** is read as MM/DD/YYYY, month first, Carta's US form, and any other form is `bad_date` (answer 1). The review shows it in words, "July 5, 2022", so a misread shows. The page's `longDate` already does.

### Each piece

| In the report | In the cap table |
|---|---|
| "As of MM/DD/YYYY" in row 2, before the first "•", on the summary tab | `as_of`. Nothing after the "•" is read. |
| A `Stakeholder ID` | one holder, by the name the per-holder tab gives, else its first ledger row. Ids by OX3's rule. Two IDs of one name are two holders. One with nothing outstanding is left out and listed (O3). |
| A class under `Common Stock classes` | a common class. A class named preferred there follows OX7. |
| A class under `Preferred Stock classes` | a preferred series |
| A certificate's `Shares Outstanding` above 0 | that many shares of its `Share Class` for its holder |
| `Price per share`, where every one of a series' certificates agrees | `original_issue_price`, with `issue_price_from_ledger`. Otherwise blank, as OX7. A certificate made by a transfer can't be told apart here, as 0.7's can, and a SAFE's conversion shares may carry a lower price (fact 4). |
| `Liquidation Preferences`, where a series' rows all read "Converts <r> <word>, <n>x multiple" | `preference_multiple` = n. Any other shape, or rows that differ, leaves it blank, with a note. |
| A heading's `1:1 Conversion Ratio` | no `conversion_price` written, so it equals the issue price. Any other ratio leaves it blank to fill, with a note. |
| `Options Outstanding` above 0 | a grant at its `Exercise Price`. Grants join a class per strike (O6), over common. The ledger has no class column, so `grant_of_preferred` can't be checked. A grant past its `Expiration Date` on `as_of` is left out and listed, as OX9. |
| `Shares available for issuance under the plan`, with a saved value | `unissued_pool`, summed over plans. Otherwise blank to fill. |
| An open `Convertible Ledger` row | an entry in `unconverted_safes`: `Principal`, `Valuation Cap` as `valuation_cap` with `cap_type` null, `Conversion Discount`, and blanks for what it is (below). `Issue Date` goes to the issue order and, if it's a note, its `issue_date`. |
| The issue order (O14) | a series by the earliest `Issue Date` in its ledger, a SAFE by its own, one on the same day as a series after it |

**Every preferred class:** anti-dilution "none", with `no_anti_dilution_field`, as OX7. Also O11's four lines, and `no_seniority_field`.

**Set aside,** with a count in `not_needed`: `Summary by Relationship`, and `Intermediate cap` unless fact 3 says it differs from `Detailed Cap`.

**A row with no `Stakeholder ID`** is a total, when its number cells are formulas or its first cell reads "Total" or "Totals". Anything else is refused.

### Rows set aside

**`Convertible Ledger`:** a row is open when it has neither a `Canceled Date` nor a `Converted Date`. Only that a date is there counts, so its form doesn't matter. Converted rows are already in the series they converted into (item 3).

**Certificates and grants:** the outstanding column decides (answer 2). 0 or empty is set aside whatever else the row says.

### What it leaves to fill

Nothing is guessed, never 1x and never $1 (O1). Each goes in `to_fill`:

| Blank | When |
|---|---|
| `seniority` | with any preferred series |
| `participation` | each preferred series, always |
| `preference_multiple` | where item 2's shape doesn't read |
| `original_issue_price` | where a series' prices differ |
| `conversion_price` | where the ratio isn't 1:1 |
| `instrument`, SAFE or note | each open convertible, always |
| `cap_type`, pre- or post-money | each open convertible with a cap that's a SAFE |
| `unissued_pool` | where the row has no saved value |

**If the answer is "note",** the page goes on to ask, as participation goes on to ask a cap:
- what the cap divides by (`conversion_base`)
- whether interest compounds: **Yes stops the import** with a plain message, since the engine models only simple interest (`note_compounding_interest`)
- the rate. The ledger has an `Interest Rate` column, but no export has shown a value in it, so 5 and 0.05 can't be told apart. It's asked, as for a note from an OCX row.
- the repayment multiple. `Change in Control Percent` may be it, but whether 200 means 2x or a 200% premium isn't known. It's asked.
- the sale's date, as now (O13). Its cap is read as pre-money (`note_cap_read_as_pre_money`), the only kind the engine models.

**How the blank works:** a row sits in `unconverted_safes` with `instrument: null`. `readSafe` refuses a field it doesn't know, and `valuation_cap` too, so nothing passes `readCapTable` until it's answered. `ImportBlank` doesn't change. Answering "note" moves the row to `unconverted_notes`, under a note's id, here and in `issue_order`. From 08b0 a null pool or conversion price stops `readCapTable` too (answer 9). A note's null `conversion_base` still reads as `with_pool`, the one blank left that can pass unfilled (`notes/review-08b0.md`, open question).

### What it refuses

Each as an `ImportRefusal` with the format `"carta"`, a kind, a term and a subject. Where a term means what OCX's means, it's reused. The list goes in `stable-names.ts` as `CARTA_TERMS`, and in the README's Stable from 1.0. 08b's ASSUMPTIONS fixes the order of checks, as OX13 does.

**Unsupported:**
- `carta_layout`: not this layout
- `grant_type`: a `Type` other than ISO or NSO, RSUs among them, printed if it looks like a code
- `rsas_not_purchased`: that Summary row above 0, since what it holds isn't known
- `unknown_summary_section`, `unknown_holdings_header`: a Summary section or a per-holder column the reader doesn't know (answer 6). Reading warrants would be a guess, since their headers are unseen, and leaving them out would change payouts.
- `no_ledger`: a class or plan with a per-holder column, or with a Summary row whose saved value shows anything outstanding, and no ledger the reader reads, naming it (your review of 08a's item 4). The two terms above don't catch everything: a warrant Carta lists as a class row inside a known Summary section, with a `<Class> (<CODE>)` column on the per-holder tabs and its ledger on a tab the reader only notes, would otherwise be dropped without a word. A class with no column and no ledger is nothing outstanding, as now. A formula with no saved value shows nothing, so there only the column can say. The name is the refusal's subject and never reaches the summary to share (item 10).
- `drafts_in_report`: item 7
- `other_consideration`: an open convertible with `Other Consideration` above 0, since whether it's part of the purchase amount would be a guess

**Malformed:**
- `missing_tab`, `missing_header`: only for what's read
- `mixed_layout`: an OCX tab beside these
- `bad_number`, `bad_date`, `formula_without_value`, `fractional_shares`
- `missing_stakeholder_id`
- `holdings_mismatch`, `total_mismatch`, `convertibles_mismatch`, `conversion_ratio_mismatch`: the checks, below

**On the Summary,** `Common Stock classes`, `Preferred Stock classes` and `Convertibles` each run to their totals, whatever the rows between are called. After that, each block is a plan: a name, then its three fixed rows. Any other row, between those or after them, is an unknown section.

**A tab the reader doesn't know** isn't refused: it gets an `unrecognized_tab` line, as in OCX, and the import goes on, so a harmless new tab can't stop every founder until a release (answer 6).

**Then the engine's,** at a sale, as now: `several_safes` if any answer isn't post-money, `pre_money_safe_with_preferred`, `several_notes`, `note_with_safe_or_carve_out`.

### What's never read

**Your list** (item 6): emails, addresses, `Annual salary`, job titles, employee IDs, notes, and row 2 after its date.

**In columns, all of them:** `Shareholder Email`, `Optionholder Email`, `Convertible Holder Email`, `Full address`, `Address`, `City`, `State`, `Country`, `Zip code`, `State of Residency`, `Annual salary`, `Job Title`, `Cost Center`, `Relationship`, `Employee ID`, `Notes`, `Acceleration Notes`, `Amendment details`, `Legend`. The termination columns (`Voluntary Termination` through `Retirement`) too.

**A test** fills each, and row 2 after the "•", with a marker and checks no marker reaches the import, the report, the page's lines or the summary to share.

### Drafts

Items 7 and 16 together:

| What the report shows | What happens |
|---|---|
| "with Drafts" columns with saved values that differ from the plain ones | refused, `drafts_in_report` |
| A title or column saying "with Drafts", with no saved values to compare, or saved values that agree | the page asks once whether anything was in draft when it was exported. **Yes stops the import,** with a plain message saying to export it again without drafts. It's never preset. |
| No "with Drafts" anywhere | no question |

The engine gives the question as a report note, `drafts_not_ruled_out`, for the page to act on, as "One strike?" is the page's own (OX15). It isn't in `to_fill`, since no cap table field answers it.

Comparing the columns compares `Fully Diluted Shares` only: percentages round.

### The checks

Item 9: each runs only where its cells have saved values. A disagreement refuses, naming the tab.

| Check | Term |
|---|---|
| Each holder's certificates, by class, against `Detailed Cap`'s `<Class> (<CODE>)` | `holdings_mismatch` |
| Each holder's grants against `Options and RSU's Outstanding Under <plan>`, plans together | `holdings_mismatch` |
| Each holder's shares against the `1:1 Conversion Ratio` column | `conversion_ratio_mismatch` |
| The ratio in `Liquidation Preferences` against the heading's | `conversion_ratio_mismatch` |
| Each class's `Shares Issued and Outstanding` against its ledger | `total_mismatch` |
| `Options and RSUs issued and outstanding` against the plan ledger | `total_mismatch` |
| Each total row, against the rows it totals, for shares only, as OX5 | `total_mismatch` |
| The open rows' `Principal` against the Convertibles rows' `Cash Raised`, together | `convertibles_mismatch` |

**The last rests on one report.** If a convertible has both open and converted rows, whether its `Cash Raised` is what's open or what was ever raised isn't known. A refusal there names the check, so a founder's summary shows it, and it can become a note.

**A holder with nothing but open convertibles** isn't refused for being missing from `Detailed Cap`, since it has no convertibles column (fact 3).

### The report

As OX12: `read` and `not_needed` counts by table, and one note per choice, by code. OCX's `unrecognized_tab` is used as it is. New codes join `IMPORT_NOTE_CODES` in `stable-names.ts`: `drafts_not_ruled_out`, `preference_text_other`, `conversion_ratio_other`, `no_participation_field`, `convertible_kind_unknown`, `no_pool_value`, and `no_currency_field`, since nothing says the amounts are US dollars and they're read as if they are.

**`Dividend ignoring cancellation`:** a line if any cell in it is above 0 (fact 8). The report has that column, so the page's words for `no_dividend_field` here say it isn't read, not that there's no field.

## Engine fit

**Nothing on main since 0.7.0 changes the search.** 10c, 10d, 10f and 10g touched the engine. 10c copies and freezes the table in `prepare`, which runs once before the search. 10d rounds amounts in messages. 10f and 10g are in `readOcx`.

**Measured, 0.7.0 against main,** three runs each, alternating, on a made-up table: common, two 1x non-participating series, options, and open post-money SAFEs at two caps, over $0 to $200M. This is this Mac, under load, not your 2-core sandbox, so compare within the table:

| SAFEs | Discount | Option strikes | Breakpoints | 0.7.0 (s) | main (s) |
|---:|---:|---:|---:|---|---|
| 10 | none | 3 | 8 | 1.42, 1.32, 1.30 | 1.65, 1.30, 1.30 |
| 26 | none | 3 | 8 | 6.56, 6.60, 6.27 | 6.30, 6.43, 6.25 |
| 26 | 20% | 3 | 8 | 6.72, 6.36, 6.28 | 6.45, 6.34, 6.89 |
| 26 | 20% | 8 | 13 | 24.68, 22.86, 27.95 | 23.53, 24.04, 22.25 |

No run stopped. A discount changes nothing, since at a sale it's used only with no cap (X9).

**The strikes count as well as the SAFEs.** On main, with 26 SAFEs:

| Option strikes | Breakpoints | Seconds |
|---:|---:|---|
| 1 | 6 | 2.48, 2.33 |
| 3 | 8 | 6.40, 6.38 |
| 5 | 10 | 12.76, 13.62 |
| 8 | 13 | 23.46, 23.65 |
| 12 | 17 | 38.90, 38.59 |

**Each strike adds a breakpoint and about 3 seconds here.** Your 5 to 6.5 seconds is what 3 strikes takes here, on a different machine, so I can't say how many your table had. The count that decides is fact 6. The page runs the search in a worker, says "Working out the curves and breakpoints…" and doesn't freeze, so this is a wait, not a failure. I'd make no speed step for the reader unless fact 6 comes back high. The speed entry on ASSUMPTIONS' Later list gets these numbers in 08b0.

**The same climb in your 2-core sandbox:** 26 SAFEs, all $100,000 at one $15M cap, take 1.1, 2.1 and 7.1 seconds at 1, 3 and 8 strikes. That's lower than here, since the SAFEs are identical.

**What's been checked at this size:** until 08b0, no locked case had more than 2 open SAFEs. X13's formula is general, and a timing test runs 10, but no locked payout had more than 2. 08b0 adds edge-12m, six at two caps (answer 10).

### What a cap read as written can do

**Item 8 holds for the import, but the engine has a gap.** Post-money SAFEs that together promise 100% or more of the company aren't refused. `liquidityCapitalization` (`waterfall.ts:432`) divides by 1 − Σ purchase amount ÷ cap, with no check that it's above 0.

A made-up table on main and on 0.7.0: 1,000,000 shares of common, two $100,000 SAFEs, at a $20,000,000 sale.

| Caps | Founder | SAFE 1 | SAFE 2 |
|---|---:|---:|---:|
| $8,000 and $8,000,000 | −$230,250,000.00 | $250,000,000.00 | $250,000.00 |
| $100,000 and $8,000,000 | −$250,000.00 | $20,000,000.00 | $250,000.00 |
| $150,000 and $200,000 | −$3,333,333.33 | $13,333,333.33 | $10,000,000.00 |
| $200,000 and $200,000, exactly 100% | $9,950,000.00 | $9,950,000.00 | $100,000.00 |
| $200,001 and $200,001, just under it | $100.00 | $9,999,950.00 | $9,999,950.00 |

Each row sums to the sale, so nothing downstream notices. `findBreakpoints` doesn't stop on the first three either. At exactly 100% one SAFE takes its cash, which is an answer to a table that can't be right. Just under it, the founder's $100 is right. A cap mistyped low enough does this, and item 8 reads that cap as it is. A real table doesn't reach it: SAFEs that sold the whole company would leave nothing for anyone else.

**A priced round already refuses this.** A post-money SAFE at an $8,000 cap converting in a Series A gives an `InputError` at `convert_safes`: "the post-money SAFEs would own the whole company at their caps" (`rounds.ts:759`). Only the sale lacks it.

**08b0 refuses it at a sale** (answer 4):
- **The test:** purchase amounts ÷ caps add up to 1 or more, over all open post-money SAFEs, exactly 1 included.
- **The refusal:** an `InputError`, as the round's is, so there's no new term. It's worded as the round's is, so the two read alike. It names each SAFE and the total percentage, and says a cap may be mistyped.
- **What it doesn't touch:** a starting table isn't a sale, so it reads as now, and the round's own refusal catches it there. No table in `cases/` reaches it: summing every post-money SAFE in each case file, converted ones and every fixture included, the highest is 45% (ocx-05-reads).

**The import still reads the cap as written.** The page shows the refusal at Use with the report still up (O13). It doesn't open a table it refuses, so the founder corrects the cap in the file and opens it again. (I first wrote that the editor would do it. It can't.)

## The page and the check script

- **"Open a cap table export"** takes Carta's report as it takes an OCX workbook. The flow is O13's: the report first, then the questions, then "Use this cap table".
- **The instructions** (item 16), near that button, in words like: "From Carta, use its cap table report in Excel. If your export offers Include Excel formulas and Include draft securities, turn both off, so totals carry values and spillpoint can check them." The wording goes to you in 08d.
- **The questions:**
  - seniority and participation as OX15, with their one-click answers, never preset
  - what each convertible is (answer 5): one click for all, "All are post-money SAFEs", clicked and never preset, or row by row, with rows grouped by cap and discount. The one click isn't offered where a row has an `Interest Rate` or `Maturity Date`.
  - the pool, a new question, with a line saying where it is: the Summary's `Shares available for issuance under the plan`, which Excel works out when the file is opened
  - drafts, as above
- **`ImportSource.format`** gains "Carta", so the review says what the report leaves open in the right words.
- **"Copy a summary to share"** and **`pnpm ocf-check`** take the report, and the structure module learns its titles and headers (item 10, below). `pnpm ocx-structure` too, through the same module.

### What the summary prints

**Printed:** counts and codes, as O15. Carta's own tab titles and headers, from a list in the code. Row-1 titles less the company, by matching the known title at the cell's end, with whether "with Drafts" follows, and `<Class>`, `<CODE>` and `<plan>` as placeholders. Summary row labels from the fixed list.

**Never printed, beyond item 10's convertible names:** class and series row labels, the plan's row label, a tab named for a plan ("plan ledger (tab 6)", as now), `<CODE>` in a tab's name, and the `<Class>` and `<plan>` in a heading, which print as the placeholders.

**Unknown headers** (answer 8): on the ledgers and the Summary's header row, one prints if it's plain words, up to 40 characters, and shares no word with the company's name, a class, a plan or a holder. Otherwise it's "other".

**`Liquidation Preferences`** (answer 8): the shapes it holds, with counts, since how participating preferred reads is the most useful thing a founder's copy could tell us. Each prints with digits as n, and any word outside a short list (converts, multiple, participating, non-participating, cap, capped, senior, pari, passu, cumulative, dividend) as "?".

## The steps

Each is one branch and one PR.

- **08a, this plan.**
- **08b0, done:** the engine's changes, apart from Carta, in one PR on a new branch from main, with the `cases/` edit rule lifted for it:
  - **The refusal for SAFEs over 100%** (answer 4), with tests: the first three tables above, exactly 100%, and $200,001 caps reading as now
  - **An explicit null `unissued_pool` or `conversion_price` refused** (answer 9), an absent field meaning what it means now. Today's only explicit nulls in `cases/` are blanks in two OCX import results, ocx-02's and ocx-04's, so 08b0 checks that no import with every blank answered still writes one.
  - **A locked case of six post-money SAFEs at two caps, beside two series,** edge-12m, worked by the reference (answer 10)
  - **Stable from 1.0** says a list can gain names in a minor release, `ImportRefusal.format` included, and that code switching on them needs a default (answer 3)
  - **`notes/release-1.0.md`:** the refusal and the null joining "Fixed since 0.7.0", the null listed as a change (answers 3, 9)
  - **ASSUMPTIONS:** X19 and C19, and the speed numbers above
- **Then 1.0's gates.**

**08b and after wait,** until a second, current Carta report's structure comes in, or a founder needs to import one. The live page doesn't bring that structure in. On a report it refuses, "Copy a summary to share" gives the refusal's code, how many tabs there are, and each column's cell kinds with counts: numbers, dates, text, and formulas with or without a saved value. That's fact 1's counts. But it prints a header only when it's one of OCX's, and shows every other column by its letter, so Carta's header names, which a second report's structure needs, don't come out. Until 08d teaches it Carta's titles and headers, they have to reach you by hand.

**When they go ahead,** 08b splits, as 06e did, so each fits an evening. 08c or 08d may split too.

- **Before 08b:** the facts below, from whichever report brings it on.
- **08b, the rules and the first case** (the `cases/` edit rule lifted for the step):
  - ASSUMPTIONS' new section, CR1 onward, and C20, the Carta case folder, as C18 (08b0 took C19)
  - `cases/carta-01-<name>`: a fictional company using every tab and column the reader reads, with common, two series, a plan with two strikes, open SAFEs at two caps, converted and cancelled rows, a partly cancelled grant, and totals with no saved value
- **08b2, refusals and blanks:** `cases/carta-02-refused` and `cases/carta-03-to-fill`, one small change to the case for each, as 06e2's, with `no_ledger` for a class row, for a column, and for a plan
- **08b3, the reads and the locked cases:** `cases/carta-04-reads`, one change for each reading rule, and the two locked cases below
- **08c, `readCarta`:** the reader, its tests reading every case and fixture, `CARTA_TERMS`, the helpers in `ocx-cells.ts` taking the format, the engine README's section with the line that spillpoint isn't affiliated with Carta
- **08d, the page:** the instructions, the questions, the summary, `ocf-check`
- **08e, the release:** the version, its release note, both READMEs, the packed build checked. You publish and tag.

**Which release it is** depends on what comes first. If 0.8.0 ships before 1.0, 08e moves `notes/release-1.0.md`'s entries to `notes/release-0.8.0.md` (answer 3). If 1.0 ships first, those entries ship in it, and the reader goes out in a minor release after it, 1.1.0 rather than 0.8.0, which 08b0's line in Stable from 1.0 allows. The step names stay either way.

**The cases are hand-worked,** with no reference run, as OCF's and OCX's are: an import has no new math, and one SAFE per row combines nothing. You have them re-derived before the cases label goes on.

**The two locked cases,** each importing, with its blanks answered, to the locked cap table:
- **edge-12d-safe-alongside-preferred:** one post-money SAFE beside two series, stacked
- **edge-12f-two-safes:** two post-money SAFEs at different caps, beside options and a pool

Together they reach what this report needs: a SAFE beside preferred, several SAFEs, a strike and a pool. **Why not others:** Millrace's Series A has a ratio no heading has shown; edge-12j and 13j have warrants and RSUs, which are refused. Neither case needs a note, and no export has shown one.

## Questions for you

1. **The as-of date.** `CapTableImport.as_of` is required: the page shows it, and expired grants need it. Row 2 is the only place it is, and item 6 says never to read row 2.
   - **(a)** Read only what's before the first "•", on the summary tab, and nothing after it reaches anything. A test holds that.
   - **(b)** Leave it to fill: a new blank, and expired grants can't be checked at read time.

   I'd take (a): it keeps what item 6 protects, the name and email. The rest of this plan assumes (a).
2. **Item 3 in the certificate and plan ledgers.** `Options Outstanding` sits beside `Canceled Date` and `Quantity Canceled`, so a row can be part cancelled: a leaver's unvested options, say, with vested ones still live. Skipping it on the date would drop those, and with no saved value on the per-holder tab no check would catch it. If every cancelled row shows 0 outstanding, the two rules give the same answer, so going by the outstanding column can't lose. Agreed? Fact 5 says if your report has any.
3. **What 0.8.0 carries.** Main holds everything in `notes/release-1.0.md`: 10c's frozen `prepare`, 10d's rounding, and 10f and 10g's `readOcx` change. 0.8.0 cut from main ships them, and 10c can break code that changes a table after preparing it. Both READMEs say these come in 1.0, and that 1.0 has 0.7.0's API. I'd move those entries to `notes/release-0.8.0.md` in 08e, change the READMEs and the *(1.0)* marks to 0.8.0, and leave 1.0's note for the domain. Agreed?
4. **SAFEs over 100%.** Refuse at `readCapTable`, with a new term in 08b0, ahead of the reader? Or leave it for later, with item 8 as it is? I'd refuse: today a mistyped cap pays common a negative amount with no warning. Is "1 or more, over all open post-money SAFEs" the right test, given a SAFE taking its cash isn't counted? I'd say yes: it's a table that can't be right, whoever converts.
5. **Many SAFEs, one question.** Each open convertible has two blanks, so the page would ask two questions per row. I'd offer one click for all, "All are post-money SAFEs", clicked and never preset, like seniority's, and a way to answer row by row, with rows grouped by cap and discount. The one click isn't offered where a row has an `Interest Rate` or `Maturity Date`. Agreed?
6. **A tab or Summary row the reader doesn't know.** OCX notes one and goes on. Here I'd refuse: warrants' tab is unseen, and a tab left out could change payouts. The cost is that a harmless new tab stops the import until a release. Agreed?
7. **Equal "with Drafts" columns.** An open SAFE has blank share columns, so a draft SAFE wouldn't change them. So equal columns can't rule out a draft convertible, and the table above still asks whenever the report says "with Drafts". Or should equal columns settle it, as "otherwise" in item 7 could mean?
8. **What a summary can show.** Item 10 wants a changed layout readable from a founder's copy, but OX2's rule prints a header only when it's a known name, so a new column prints as "other".
   - **Unknown headers:** on the ledgers and the Summary's header row, print one if it's plain words, up to 40 characters, and shares no word with the company's name, a class, a plan or a holder? Otherwise "other". I'd say yes.
   - **`Liquidation Preferences` shapes:** print each with digits as n, and any word outside a short list (converts, multiple, participating, non-participating, cap, capped, senior, pari, passu, cumulative, dividend) as "?". I'd say yes.
9. **Two blanks don't stop an unfilled table.** `readCapTable` reads `unissued_pool: null` as 0 (`input.ts:366`) and `conversion_price: null` as the issue price (`input.ts:132`). Every other blank stops it. So code that skips `to_fill` gets a guess, which O1 rules out. It's true of OCX's blanks today, and the page always asks. At a sale the pool matters only for a note's "with pool" base. No locked case's input writes either as null. I'd refuse an explicit null for both, in 08c, and keep an absent field's meaning. Or leave it?
10. **A locked case with more SAFEs?** A founder's table can hold far more open SAFEs than the 2 any case has. I'd add one, about six SAFEs at two caps beside two series, worked by the reference, which can try every combination at that size. It's beyond your "one or two", and it isn't about Carta, so it could go with 08b0.

## Your answers (2026-11-03)

**Your checks on #138:**
- **The SAFE gap** reproduces on npm 0.7.0 to the cent, and the two tables you added are in the table above. I ran those two on main and 0.7.0 as well, and they match.
- **A priced round** already refuses it. Only the sale lacks it.
- **The strikes** climb the same way in your sandbox.

1. **(a).** Read "As of" and the date before the first "•", nothing after. Read it as MM/DD/YYYY, Carta's US form, and show it in words on the review ("July 5, 2022"), so a misread shows. Any other form is `bad_date`. Carta's non-US date form joins the open questions.
2. **Agreed.**
3. **Agreed for when 0.8.0 ships, which may not be soon.** Until then, 08b0's fixes join `notes/release-1.0.md`'s "Fixed since 0.7.0", and the move to `notes/release-0.8.0.md` happens in 08e. **One part doesn't wait:** the README's Stable from 1.0 says a list can gain names in a minor release, `ImportRefusal.format` included, and that code switching on them needs a default. Otherwise any reader added after 1.0 is a major version. That's in 08b0.
4. **Yes, as 08b0.** The test is right: 1 or more, over all open post-money SAFEs, exactly 1 included. Word it as the round's refusal is worded, so the two read alike, and name each SAFE and the total percentage, saying a cap may be mistyped. Tests: the three tables, exactly 100%, and $200,001 caps reading as now. The round's refusal is an `InputError`, so this has no new term, where the question said it would.
5. **Agreed.**
6. **Not quite.** Refuse a Summary section or a per-holder column the reader doesn't know: every security shows in both, so that's where warrants or anything else unread gets caught. A tab it doesn't know gets a note, as in OCX, and the import goes on. That keeps the safety without a harmless new tab stopping every founder until a release.
7. **Agreed:** ask whenever the report says "with Drafts".
8. **Both yes.**
9. **Yes, in 08b0,** beside the other refusal, so the engine's changes are one PR, apart from Carta. The release note lists it as a change.
10. **Yes, in 08b0.**

**Fact 2** is settled, from the titles you gave: "What the report holds", above.

**Rule 11:** as you read Carta's Terms of Service, they cover its websites as well as accounts, and bar using them to build something that does substantially the same thing or competes. So the rule covers Carta's site and help pages too: nothing else of Carta's is read to build `readCarta`.

**The counts** stay out of the repo. The sizes 10 and 26 can stay as a made-up table's.

**08b and after wait.** They go ahead when a second, current Carta report's structure comes in, or a founder needs to import one. Next is 08b0, then 1.0's gates, and `readCarta` when one of those happens.

**After the merge (your review of 08a's second commit, 2026-11-03):**
- **The `warrants` term stays out,** with one hole closed: `no_ledger`, under Refusals. Every class or plan with a per-holder column, or with a Summary row whose saved value shows anything outstanding, needs a ledger the reader reads, and one without is refused, naming it.
- **The refusal names the row** when 08d comes, so a founder can find it in the file.
- **"A founder can send that structure from the live page" was wrong,** and the steps now say what the summary gives.

## Facts your copy can settle before 08b

Counts and kinds only. Each changes what a case says. They wait with 08b, and a second report may settle them better.

1. **The cell kinds.** `pnpm ocx-structure <the report>` prints each column's kinds, by letter, with counts: how dates are stored, which cells are numbers or text, how many are formulas with no saved value. I ran it on a made-up workbook of this shape with a name, email, date, amounts and holders in it, and none of them came out. It needs no change. Paste the output.
2. **The titles.** Settled: "What the report holds", above.
3. **The per-holder tabs.** How `Intermediate cap` differs from `Detailed Cap`. Whether each has one row per Stakeholder ID. Whether a holder with only an open SAFE is on them.
4. **Prices and text.** Whether each series' `Price per share` agrees across its certificates, the conversion ones included, and whether `Liquidation Preferences` agrees within a class.
5. **Cancelled rows.** Any certificate or grant with a `Canceled Date` and outstanding above 0?
6. **Strikes.** How many different `Exercise Price` values among the grants still outstanding?
7. **The Summary's cells.** Which column `Shares available for issuance under the plan` fills, and whether that's a saved value or a formula. Whether `RSAs not purchased` holds anything. Whether `Share Class` in a ledger matches the Summary's label and the `<Class>` in the heading exactly.
8. **Amounts on the open rows.** Whether `Conversion Discount` is stored as 0.2, as 20, or as text. Whether `Other Consideration` is empty. Whether `Dividend ignoring cancellation` is ever above 0, in any ledger.
9. **Rows with no `Stakeholder ID`.** Any in a ledger or per-holder tab? What do they hold?

## Open questions only another export can settle

1. **The layout today.** This one is from 2022. Tabs, headers and titles may have changed.
2. **Export settings** (item 16). Whether "Include Excel formulas" and "Include draft securities" exist as a competitor's guide says, what each changes, and whether turning them off gives saved totals and drops "with Drafts".
3. **How Carta marks a draft,** in a title, a column, a row or a status. `Paper status` doesn't.
4. **`Liquidation Preferences`:** how it reads for participating preferred, with a cap, or at another multiple, and whether seniority ever appears. What "CSE" means.
5. **A conversion ratio other than 1:1:** how the heading and the text write it.
6. **A note still outstanding:** how `Interest Rate` is written; whether `Interest` and `Total` are accrued to the as-of date; what `Change in Control Percent` means and how it's written; and whether `Conversion Trigger` says anything the engine needs.
7. **Warrants:** the tab, the headers, the Summary's rows, the per-holder column.
8. **RSUs:** the plan ledger's `Type` for them, and whether `RSAs not purchased` is related.
9. **ISO:** how `Type` writes it.
10. **Pre- or post-money:** whether any column says so. If `Conversion Trigger` or a new column does, that blank goes.
11. **Several plans,** or options outside a plan.
12. **Carta's other cap table reports,** and whether any holds what this one lacks. 0.6.0's plan named "Securities ledger by type and class".
13. **Another currency:** whether anything marks one.
14. **`Summary by Relationship`'s row labels,** if they ever matter.
15. **Carta's non-US date form:** whether row 2 is ever day first. Read month first, a day-first 05/07/2022 would come out as May 7, which is why the review shows it in words.

## For 0.8.0's release notes

- **Added:** `readCarta`, the format `"carta"`, the terms and note codes.
- **`ImportRefusal.format`** is a wider union. An exhaustive `switch` on it, or a `Record` keyed by it, fails to compile until it handles `"carta"`, as Stable from 1.0 says from 08b0. Nothing else changes.
- **If 0.8.0 ships before 1.0,** `notes/release-1.0.md`'s entries move here in 08e, with 08b0's among them: a table that paid common a negative amount is now refused, and so is an explicit null `unissued_pool` or `conversion_price`. The READMEs and the *(1.0)* marks change to 0.8.0, and 1.0's note is left for the domain.
- **If 1.0 ships first,** those entries ship in it, and this note is for the minor release after it.
- **1.0** still waits on its two gates: an outside waterfall that matches ours, and a few outside users.
