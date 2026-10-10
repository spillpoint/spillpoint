# OCX case 01: Alder Gate Labs (OCX 0.7)

A fictional company's workbook in OCX 0.7's layout, as one Mantle export lays it out: a Summary View, a Stakeholder View, a ledger for each stock class, a plan ledger, a warrants ledger, a SAFEs ledger and Context.
- **Only the format's tab names and headers** come from that export (hard rule 10; Jordan, 06d review).
- **Our own:** the company, the holders, every number, the titles and the footnotes.
- **Common stock only,** as the export seen had. ocx-02 is the case with preferred stock.

This walks the workbook by hand to the import's result in `expected.json`, rule by rule (ASSUMPTIONS OX3–OX12). The workbook's cells are in `workbook.json`; the tables below repeat what each rule reads.

## The layout and the date

- **The layout is 0.7** (OX4):
  - the tabs `Summary View` and `Stakeholder View`
  - the Stakeholder View's `<class> Stock` and `Stock Warrants` columns
  - ledgers whose header rows start `Stockholder`, `Optionholder`, `Convertible Holder` and `SAFE Holder`

  Context's label, "OCX Version 0.7", is reported as written: `version_label`, with `0.7` as its field. It decides nothing.
- **The as-of date** is on every tab as "As of Fri, 31 Oct 2025" (OX5). 31 October 2025 is a Friday, so the weekday checks. **`as_of` is 2025-10-31.**
- **The workbook has no Financing History,** but it has no preferred stock either, so nothing needs one.

## The classes (OX7)

The Summary View's class table, by its row labels:

| Row | Share Class | Outstanding Shares |
|---:|---|---:|
| 4 | Common Stock**** | (a formula, no saved value) |
| 5 | Common Stock | 8,040,000 |
| 6 | Common Seed (SAFE conversion) | 400,000 |
| 8 | Preferred Stock | |
| 10 | Warrants & Non-Plan Awards | |
| 11 | Warrants | |
| 13 | Stock Plans***** | |

- **Row 4 is the `Common Stock` section's label:** the first row of that name, its footnote marks dropped.
- **Its classes run to the next label,** `Preferred Stock` at row 8: row 5's "Common Stock" and row 6's "Common Seed (SAFE conversion)".
- **The `Preferred Stock` section** has no class before `Warrants & Non-Plan Awards`.

So two common classes and no preferred:
- "Common Stock" is `common_stock`.
- "Common Seed (SAFE conversion)" is `common_seed_safe_conversion`: lower case, each run of other characters one "_", the ends trimmed (OX3).

`read.share_classes` is 2. With no preferred stock, **seniority is an empty list**, not a blank, and there's no `no_seniority_field` line.

## The holders (OX6)

The Stakeholder View's holder rows, rows 3 to 11, less the pool's row (13, "Options remaining for issuance") and the totals' row (15). The value columns, each a value, not a formula:

| Stakeholder | Common Stock Stock | Common Seed (SAFE conversion) Stock | Alder Gate 2023 Equity Plan Options | Stock Warrants | Non-Plan Awards |
|---|---:|---:|---:|---:|---:|
| Employee C | 500,000 | 0 | 210,000 | 0 | 0 |
| Employee D | 40,000 | 0 | 110,000 | 0 | 0 |
| Employee E | 0 | 0 | 0 | 0 | 0 |
| Employee F | 0 | 0 | 30,000 | 0 | 0 |
| Founder A | 5,000,000 | 0 | 0 | 0 | 0 |
| Founder B | 2,500,000 | 0 | 0 | 0 | 0 |
| Investor S | 0 | 0 | 0 | 0 | 0 |
| Investor T | 0 | 400,000 | 0 | 0 | 0 |
| Lender L | 0 | 0 | 0 | 30,000 | 0 |
| *Options remaining for issuance* | 0 | 0 | 610,000 | 0 | 0 |

- **Nine holders:** `read.stakeholders` is 9. Each one's id is its name in OX3's form (`employee_c`, `founder_a`, …).
- **The pool's row** is read for the pool's value (below): `read.pool_rows` is 1. `read` counts every row the import uses, for a value or a check (OX12).
- **Set aside:**
  - the voting block, as set aside throughout
  - the Additional Information block (`Primary Stakeholder Type`, `Email Address`), which is never read
- **The totals columns are formulas with no saved value:** `Total Stock (outstanding)`, `Total Stock (as converted)`, `Total Stock % (as converted)`, and every cell of row 15. They're skipped: one `formula_totals_skipped` line (OX5). The class columns above are what's read.

## The holdings (OX8)

**Which class each ledger is:**
- The first ledger's tab is "Common Stock Ledger", "<class> Ledger" for a class the Summary lists: `common_stock`.
- The second's tab, "Common Seed (SAFE conversion...", is cut to Excel's 31 characters, so it isn't one. Its title row, "Alder Gate Labs Common Seed (SAFE conversion) Ledger", ends " Common Seed (SAFE conversion) Ledger", for exactly one class: `common_seed_safe_conversion`. It doesn't also end " Common Stock Ledger", so there's no other class it could be.

**Common Stock's certificates:**

| Cert No. | Stockholder | Cert. Transferred From | Certificate Outstanding (Y/N) | No. Shares Outstanding |
|---|---|---|---|---:|
| CS-1 | Founder A | | Y | 5,000,000 |
| CS-2 | Founder B | | N | 0 |
| CS-3 | Employee E | | N | 0 |
| CS-4 | Founder B | CS-2 | Y | 2,500,000 |
| CS-5 | Employee C | CS-2 | Y | 500,000 |
| CS-6 | Employee D | | Y | 40,000 |

CS-2 was transferred out (to CS-4 and CS-5), and CS-3 was repurchased: both say N, and are set aside. The Y certificates, summed by holder:
- Founder A 5,000,000
- Founder B 2,500,000
- Employee C 500,000
- Employee D 40,000

Each equals the Stakeholder View's `Common Stock Stock` for that holder, and every other holder's 0 equals nothing.

**Common Seed (SAFE conversion)'s one certificate:** SPS-1, Investor T, Y, 400,000. That equals the Stakeholder View's 400,000.

The ledgers' `Total` rows are formulas with no saved value, covered by the same line. **Seven certificates:** `read.certificates` is 7. The `Price Per Share Currency` is "USD" throughout, so nothing is refused for currency. `State of Residence` is never read.

**Positions:** Founder A 5,000,000, Founder B 2,500,000, Employee C 500,000 and Employee D 40,000 in `common_stock`; Investor T 400,000 in `common_seed_safe_conversion`.

## The options and the pool (OX9)

The plan ledger's tab, "Alder Gate 2023 Equity Plan...", is cut too. It's known as a plan ledger by its header row, which starts `Optionholder`. The workbook has one plan, so the Stakeholder View's one plan column, "Alder Gate 2023 Equity Plan Options", is its.

| Cert No. | Optionholder | Type | Exercise Price | Expiration Date | Shares Outstanding from Original Grant | Display Status |
|---|---|---|---:|---|---:|---|
| EP-1 | Employee C | ISO | 0.1 | 2033-06-01 | 200,000 | Outstanding |
| EP-2 | Employee D | NSO | 0.1 | 2033-06-01 | 60,000 | Outstanding |
| EP-3 | Employee E | ISO | 0.1 | 2033-05-01 | 0 | Canceled |
| EP-4 | Employee F | NSO | 0.05 | 2025-09-30 | 30,000 | Outstanding |
| EP-5 | Employee D | ISO | 0.25 | 2034-02-01 | 50,000 | Outstanding |
| EP-6 | Employee C | RSU | | | 10,000 | Outstanding |

- **The split-adjusted columns are empty,** so each grant's own count and price are read.
- **Six grants:** `read.plan_grants` is 6.
- **EP-3 is at 0,** so it's set aside whatever its status says.
- **Every grant above 0 says "Outstanding",** as OX9 needs.
- **EP-6's `Type` is "RSU":** an RSU at a $0 strike, its blank exercise price no matter, with an `rsu_as_option` line naming EP-6.
- **The check comes first,** on every outstanding grant, options and RSUs alike, by holder:
  - Employee C: EP-1 200,000 + EP-6 10,000 = 210,000
  - Employee D: EP-2 60,000 + EP-5 50,000 = 110,000
  - Employee F: EP-4 30,000

  Each equals the Stakeholder View's plan column.
- **Then the expiry rule:** EP-4 expired on 30 September 2025, before 31 October. It's left out and listed: `expired_option_left_out`, naming EP-4. The export still counts it, which is why the check comes before.

The grants left, by strike, named as O6:
- **`options_0.1`,** "Options ($0.1 strike)": Employee C 200,000, Employee D 60,000.
- **`options_0.25`,** "Options ($0.25 strike)": Employee D 50,000.
- **`rsus`,** "RSUs (no strike)", at "0": Employee C 10,000.

No class is made for EP-4's $0.05 strike, since nothing is left at it.

**The pool:** the pool's row, summed across the plan columns (one here), is 610,000. Context's `Stock Plan Details` gives `Shares Available for Grant` 610,000 for the plan, and they agree. **`unissued_pool` is 610,000.**
- **EP-4's expiry doesn't change it:** the export's pool is read as stated (OX9).
- **The plan details row** is read for that check: `read.stock_plans` is 1.
- **Context's `Stock Plan History`, two rows,** is set aside: `not_needed.stock_plan_history` is 2. Its "Unknown" approval date is in a row set aside, so it needs no date.

## The warrant (OX10)

| Warrant No. | Convertible Holder | Series of Stock | Price Per Share | Expiration Date | Warrant Shares Outstanding | Display Status |
|---|---|---|---:|---|---:|---|
| W-1 | Lender L | Common Stock | 0.5 | 2031-03-15 | 30,000 | Outstanding |

- **One warrant:** `read.warrants` is 1.
- **Its status:** above 0 and "Outstanding".
- **The check:** Lender L's 30,000 equals the Stakeholder View's `Stock Warrants`.
- **Not expired:** 2031 is after the as-of date.
- **Its class:** "Common Stock" is a common class, so it's a warrant for `common`, named with that class (O7): `warrants_common_0.5`, "Warrants for Common Stock ($0.5 strike)", strike "0.5", Lender L 30,000.
- **One `warrant_counts_are_maximums` line,** since 0.7's counts are the most an adjustable warrant can buy.

## The SAFEs (OX11)

| SAFE No. | SAFE Holder | Investment Amount | Valuation Cap | Discount | Valuation Method (Pre- or Post-Money) | Display Status |
|---|---|---:|---:|---|---|---|
| SAFE-1 | Investor T | 100,000 | 4,000,000 | | Post Money | Converted |
| SAFE-2 | Investor S | 200,000 | 8,000,000 | | Post Money | Outstanding |

- **Two rows:** `read.safes` is 2.
- **SAFE-1 converted,** into Investor T's 400,000 Common Seed (SAFE conversion) shares above, so it's set aside. Its conversion date, "2024-09-30 (SPS-1)", isn't needed.
- **SAFE-2 is outstanding:** a SAFE to Investor S, `safe_investor_s`:
  - purchase amount 200,000
  - "Post Money", so a `post_money_cap` of 8,000,000
  - a blank discount, which is none, written "0"
  - `Most Favored Nation` blank: not an MFN SAFE
- **Its currencies** are "USD".
- **The Summary View's convertibles table has one row:** `Post-$ SAFEs`, `# of Securities` 1, `Outstanding Amount` 200,000. The outstanding post-money SAFEs are one, for 200,000, so they agree. The row is read for that check: `read.convertible_rows` is 1. Its `Total` row is a formula with no saved value, skipped.

Investor S holds no stock, but holds this SAFE, so is kept.

## Who's left out (OX6)

- **Employee E** holds nothing: CS-3 was repurchased and EP-3 cancelled.
- **Employee F's** only grant, EP-4, expired.

Each is left out and listed: `left_out_stakeholder`, for `employee_e` and `employee_f`. **Seven holders are kept:** Employee C, Employee D, Founder A, Founder B, Investor S, Investor T, Lender L, in the Stakeholder View's order.

## The issue order (OX12)

O14's order holds every preferred series, SAFE and note. Here that's the one outstanding SAFE, issued 1 February 2025: **`["safe_investor_s"]`.**

## The report

- **`read`:** stakeholders 9, pool rows 1, share classes 2, certificates 7, plan grants 6, warrants 1, SAFEs 2, convertible rows 1, stock plans 1.
- **`not_needed`:** stock plan history 2.
- **The notes:**
  - `version_label` (0.7)
  - O11's four: `no_dividend_field`, `no_conversion_group_field`, `no_carve_out_field`, `no_sale_date_field`
  - `formula_totals_skipped`
  - `rsu_as_option` (EP-6)
  - `expired_option_left_out` (EP-4)
  - `warrant_counts_are_maximums`
  - `left_out_stakeholder` (`employee_e`, `employee_f`)

  There's no `no_seniority_field` and no `no_anti_dilution_field`: there's no preferred stock.
- **Nothing is blank:** `to_fill` is empty.

## What a re-derivation should check

1. Every number in the tables above against `workbook.json`.
2. Each class's ledger holdings against the Stakeholder View, and each holder's plan and warrant totals.
3. That the expiry rule leaves out EP-4 after the check, and that Employee F then holds nothing.
4. The ids, by OX3's rule.
5. The report's counts, row by row.
