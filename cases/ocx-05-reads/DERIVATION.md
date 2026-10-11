# OCX case 05, reads: derivation

One small change to Alder Gate's 0.7 workbook (ocx-01) for each reading rule no other case or fixture reaches. Each changes the import, so each is here to re-derive, not only in 06f's tests (Jordan, 06e2 review). Each fixture lists its change, cell by cell (C18). **Each result is the whole import;** below, each says what differs from Alder Gate's `expected.json`. Everything else is Alder Gate's, line for line.

None is refused. Where a change could trip a check, the rows below say why it doesn't.

**Not here, and why:**
- **`Most Favored Nation`:** it isn't read (OX11). An MFN SAFE is read with its terms as they stand at the sale, as OCF's is (12h), so what the column says changes nothing.
- **A date followed by a reference,** "2024-09-30 (SPS-1)": OX5 reads its date where one is needed. In 0.7 it's only on a converted SAFE's conversion date, which isn't needed, so nothing reaches it until an export shows one elsewhere.
- **Rules that change nothing** (a status or a Y in any case, a grant expiring on the as-of date itself): Alder Gate's result already shows them unchanged.

## SAFEs (OX11, OX12)

### `pre-money-safe`

**The change:** SAFE-2's `Valuation Method (Pre- or Post-Money)` is "Pre Money" (G4), and the Summary View's convertibles row is `Pre-$ SAFEs` (L3).

**How it's read:** "Pre Money" makes the cap pre-money. The SAFE takes `pre_money_cap` in place of `post_money_cap` (C8), as edge case 12g's does. The convertibles check compares pre-money SAFEs with the `Pre-$ SAFEs` row: one for $200,000 against 1 for $200,000.

**What differs:** `safe_investor_s` has `pre_money_cap` "8000000", in place of `post_money_cap`.

### `safe-discount`

**The change:** SAFE-2's `Discount` is 0.2 (F4), and the Summary View's row says the same (O3).

**How it's read:** a discount is a number cell holding a fraction below 1 (OX11): 0.2 is 20%. The Summary's `Discount` isn't read. The convertibles check is by count and amount only.

**What differs:** `safe_investor_s`'s `discount` is "0.2".

### `cancelled-safe`

**The change:** SAFE-2's `Display Status` is "Cancelled" (N4), with a `Cancellation Date` (K4). The Summary View's convertibles table has no rows: `Total` moves up to row 3, its count and amount now formulas with no saved value, and the old row's cells are cleared.

**How it's read:**
- **"Cancelled"** is one of the statuses set aside (OX11), so SAFE-2's row has its holder read, Investor S, who is on the Stakeholder View, and nothing more. Its cancellation date isn't read.
- **Both SAFE rows are still counted,** `read.safes` 2: each is read for its status (OX12).
- **No convertibles row is read,** so `read` has no `convertible_rows`. With no rows, the table has nothing to check (OX11).
- **Investor S holds nothing** once the SAFE is set aside, so is left out (OX6).
- **There's no SAFE or series,** so the issue order is empty.

**What differs:**
- no `unconverted_safes`, since empty lists are left out (OX3)
- `holders`: no `investor_s`
- `issue_order`: `[]`
- `read`: no `convertible_rows`
- `notes`: `left_out_stakeholder` for `investor_s`, after Employees E and F

### `unknown-issue-date`

**The change:** SAFE-2's `Issue Date` is "Unknown" (C4).

**How it's read:** "Unknown" where a date is needed is a blank (OX5). For the issue order it falls back to the default, after every series, with an `issue_order_default` line (OX12). Alder Gate has no series, so the order is the same, `["safe_investor_s"]`. The line says it wasn't read from a date.

**What differs:** `notes`: `issue_order_default` for `safe_investor_s`, before the holders left out.

## Grants (OX5, OX9)

### `split-adjusted-grant`

**The change:** EP-1 gives a `Split Adjusted Exercise Price` of 0.05 (G3) and `Split Adjusted Shares Outstanding` of 400,000 (M3). The Stakeholder View counts Employee C's options as 410,000 (E3). A real split would adjust every grant and every certificate; here only EP-1's columns change, so the rule shows on its own.

**How it's read:** a grant's split-adjusted count and strike, when given, are used in place of its original ones (OX9). EP-1 is 400,000 at $0.05. Employee C's grants are then 400,000 and EP-6's 10,000 RSUs: 410,000, as the Stakeholder View says. Nothing else uses EP-1's original columns.

**What differs:**
- `securities`: `options_0.05`, "Options ($0.05 strike)", before `options_0.1`
- `positions`: Employee C holds 400,000 `options_0.05`, in place of 200,000 `options_0.1`. Employee D's 60,000 `options_0.1` keep that class.

### `seventeen-digit-strike`

**The change:** EP-5's `Exercise Price` is "2.5000000000000001E-3" (F7): $0.0025, as Excel stores it, to 17 digits and in exponent form.

**How it's read:** numbers are read to 15 significant digits, trailing zeros dropped (OX5): 0.00250000000000000 is 0.0025. Read to all 17, it would be a class of its own at a strike no one typed.

**What differs:**
- `securities`: `options_0.0025`, "Options ($0.0025 strike)", before `options_0.1`, in place of `options_0.25`
- `positions`: Employee D's 50,000 are `options_0.0025`

### `day-count-date`

**The change:** EP-1's `Expiration Date` is a day count in a date format, 45960 (K3).

**How it's read:** the workbook counts days from 1900 (OX5). Day 45,960 is 30 October 2025: 1 January 1900 is day 1, and Excel counts a 29 February 1900 that never was, so from March 1900 a date is its count of days after 30 December 1899. That's the day before the as-of date, 31 October.
- **The check comes first** (OX9): Employee C's grants, EP-1's 200,000 and EP-6's 10,000, make the Stakeholder View's 210,000.
- **Then EP-1 is left out,** having expired before the as-of date.
- **Employee C** still holds common and the RSU, so isn't left out. Employee D still holds `options_0.1`, so the class stays.

**What differs:**
- `positions`: no `options_0.1` for Employee C
- `notes`: `expired_option_left_out` for EP-1, before EP-4's

### `date-system-1904`

**The change:** the workbook counts days from 1904. EP-4's `Expiration Date` is a day count in a date format, 44650 (K6).

**How it's read:** from 1904, day 0 is 1 January 1904 (OX5). Day 44,650 is 31 March 2026, after the as-of date, so **EP-4 hasn't expired.** Counted from 1900, the same number would be 30 March 2022, 1,462 days earlier, and EP-4 would still be left out as in Alder Gate. So the result shows which system was used. Alder Gate's other dates are ISO text, which the date system doesn't touch.

**EP-4 is a grant:** 30,000 for Employee F at $0.05, outstanding. The Stakeholder View's 30,000 for Employee F agrees.

**What differs:**
- `securities`: `options_0.05`, "Options ($0.05 strike)", before `options_0.1`
- `holders`: Employee F, `employee_f`, after Employee D
- `positions`: Employee F holds 30,000 `options_0.05`
- `notes`: no `expired_option_left_out` for EP-4, and no `left_out_stakeholder` for `employee_f`

## Warrants (OX10)

### `expired-warrant`

**The change:** W-1's `Expiration Date` is 30 June 2025 (I3).

**How it's read:** the check comes first: Lender L's 30,000 make the Stakeholder View's `Stock Warrants`. Then W-1 is left out, expired before the as-of date, with an `expired_warrant_left_out` line. **Lender L holds nothing** then, so is left out too.

**The `warrant_counts_are_maximums` line goes:** it comes only where the cap table has a warrant once every rule has run, since it's about the counts the import uses (OX10). W-1 is still counted in `read.warrants`, as a row read for the check.

**What differs:**
- `securities`: no `warrants_common_0.5`
- `holders` and `positions`: no Lender L
- `notes`:
  - no `warrant_counts_are_maximums`
  - `expired_warrant_left_out` for W-1, after EP-4's line
  - `left_out_stakeholder` for `lender_l`, after Employees E and F

### `warrant-without-outstanding-column`

**The change:** the Warrants Ledger has no `Warrant Shares Outstanding` column: its header, W-1's value and its total are cleared (M2, M3, M5). W-1 has 5,000 exercised (G3). The Stakeholder View counts Lender L's warrants as 25,000 (F11).

**How it's read:** without that column, a warrant's outstanding count is its maximum less what's exercised and cancelled (OX10, OX13). For W-1, that's 30,000 − 5,000 − 0 = 25,000. Above 0, it must say "Outstanding", and it does. Lender L's 25,000 agree with the Stakeholder View.

**What differs:** `positions`: Lender L holds 25,000 `warrants_common_0.5`.

## Classes, holders and headers (OX3, OX7, OX12)

### `common-named-preferred`

**The change:** the class from the SAFE's conversion is named "Seed Preferred" throughout:
- the Summary View's row (A6)
- the Stakeholder View's column (D2), and its voting column (P2)
- its ledger's tab, now "Seed Preferred Ledger", and title (B1)
- the converted SAFE's `Class of Converted Securities` (L3, not read)

**How it's read:** its row sits under `Common Stock` on the Summary View, between that section's label (row 4) and `Preferred Stock` (row 8), and its `Liquidation Preference` is "N/A". So it's common (OX7). Its name has the word "Preferred", so a `common_named_preferred` line says it was read as common anyway. Its id is `seed_preferred` (OX3). Its ledger is found by its tab's name, "<class> Ledger".

**What differs:**
- `securities`: `seed_preferred`, "Seed Preferred", `kind` "common", in place of `common_seed_safe_conversion`
- `positions`: Investor T's 400,000 are `seed_preferred`
- `notes`: `common_named_preferred` for `seed_preferred`, after `formula_totals_skipped`

### `same-id-twice`

**The change:** Employee D is named "Employee-C": on the Stakeholder View (A4), on CS-6 (A8), and on EP-2 and EP-5 (A4, A7).

**How it's read:** "Employee C" and "Employee-C" are different names, so not two of one name (OX6). Each makes the id `employee_c`: lower case, each run of anything but letters and digits one "_" (OX3). The later one, in the Stakeholder View's order, takes "_2": `employee_c_2`.

**What differs:** `holders`: `employee_c_2`, "Employee-C", in place of Employee D, with Employee D's positions (40,000 `common_stock`, 60,000 `options_0.1`, 50,000 `options_0.25`).

### `unrecognized-header`

**The change:** the SAFEs Ledger has a column headed "Board Approval Date" (R2), with a date for each SAFE (R3, R4).

**How it's read:** no 0.7 tab the reader knows has that header, and it's outside the holdings, so it gets an `unrecognized_field` line (OX12). Its subject is the tab, and its field the header, as an OCF field's line names its object and field (O10). Its cells aren't read.

**What differs:** `notes`: `unrecognized_field`, subject "SAFEs Ledger", field "Board Approval Date", after `formula_totals_skipped`.

## Two plans (OX9)

### `two-plans`

**The change:** a second plan, the Alder Gate 2025 Equity Plan:
- **its ledger,** "Alder Gate 2025 Equity Plan...", after the first plan's, with 0.7's plan ledger headers, all 17, and one grant: EP-7, 100,000 options for Founder B at $0.50, outstanding, expiring in 2035
- **its column on the Stakeholder View,** "Alder Gate 2025 Equity Plan Options", in place of `Non-Plan Awards` (G2): 100,000 for Founder B (G8), and 400,000 on the pool row (G13)
- **its rows on Context:** its adoption in the Stock Plan History (row 9), and its Stock Plan Details (row 13), 400,000 available for grant

The Summary View's plan rows aren't read, so they're left as they were.

**How it's read:**
- **EP-7 is a grant,** and joins a new class at its strike, `options_0.5`. `read.plan_grants` is 7.
- **The holdings, plans together** (OX9): Founder B's plan columns, 0 and 100,000, make EP-7's 100,000. Each other holder's are as in Alder Gate.
- **The pool is the pool row summed across plan columns:** 610,000 + 400,000 = 1,010,000.
- **Each plan's pool is checked against its own row on Context, by name:** 610,000 against row 12's 610,000, and 400,000 against row 13's 400,000. `read.stock_plans` is 2.
- **The adoption row is set aside,** like the first plan's two: `not_needed.stock_plan_history` is 3.

**What differs:**
- `securities`: `options_0.5`, "Options ($0.5 strike)", before `rsus`
- `positions`: Founder B holds 100,000 `options_0.5`
- `unissued_pool`: 1010000
- `read`: `plan_grants` 7, `stock_plans` 2
- `not_needed`: `stock_plan_history` 3

## Saved by a spreadsheet app (OX5)

### `saved-by-a-spreadsheet`

**The change:** every formula has the value it works out to, as a spreadsheet app saves it when a founder opens the export and saves it again (0.6.0 plan, answer 13): 109 cells. No formula is left without a value.

**How it's read:** with no formula lacking a value, there's no `formula_totals_skipped` line. Each total that counts shares is now checked (OX5), and each agrees:

| Tab | Total | Its rows | Saved |
|---|---|---|---:|
| Stakeholder View | Common Stock Stock (C15) | 500,000 + 40,000 + 5,000,000 + 2,500,000 | 8,040,000 |
| Stakeholder View | Common Seed (SAFE conversion) Stock (D15) | Investor T's 400,000 | 400,000 |
| Stakeholder View | Alder Gate 2023 Equity Plan Options (E15) | 210,000 + 110,000 + 30,000, and the pool row's 610,000 | 960,000 |
| Stakeholder View | Stock Warrants (F15) | Lender L's 30,000 | 30,000 |
| Stakeholder View | Non-Plan Awards (G15) | none | 0 |
| Common Stock Ledger | No. Shares Issued (F10) | 5,000,000 + 3,000,000 + 200,000 + 2,500,000 + 500,000 + 40,000 | 11,240,000 |
| Common Stock Ledger | No. Shares Outstanding (M10) | 5,000,000 + 0 + 0 + 2,500,000 + 500,000 + 40,000 | 8,040,000 |
| seed ledger | No. Shares Issued (F5) | SPS-1 | 400,000 |
| seed ledger | No. Shares Outstanding (M5) | SPS-1 | 400,000 |
| plan ledger | Shares Granted (D10) | 200,000 + 100,000 + 80,000 + 30,000 + 50,000 + 10,000 | 470,000 |
| plan ledger | Amount Exercised / Purchased (H10) | EP-2's 40,000 | 40,000 |
| plan ledger | Amount Canceled / Repurchased (I10) | EP-3's 80,000 | 80,000 |
| plan ledger | Amount Expired (J10) | none | 0 |
| plan ledger | Shares Outstanding from Original Grant (L10) | 200,000 + 60,000 + 0 + 30,000 + 50,000 + 10,000 | 350,000 |
| Warrants Ledger | No. Maximum Warrant Shares Issuable (D5) | W-1 | 30,000 |
| Warrants Ledger | No. Warrant Shares Exercised (G5) | none | 0 |
| Warrants Ledger | No. Warrant Shares Canceled (H5) | none | 0 |
| Warrants Ledger | Warrant Shares Outstanding (M5) | W-1 | 30,000 |
| SAFEs Ledger | No. Shares Issued in Conversion (I6) | SAFE-1's 400,000 | 400,000 |

- **Summed as the spreadsheet sums them:** the ledgers' totals count every row, set aside or not, such as CS-2's 3,000,000 issued. The Stakeholder View's count the pool row.
- **The Summary's `Outstanding Shares`,** 8,040,000 and 400,000, were checked in Alder Gate too.
- **Not checked:** the money totals, `Cash Paid` (4,820 and 0) and `Investment Amount` (300,000), and the percentages, since a sum of rounded amounts needn't equal a rounded total (OX5). The per-holder totals and voting columns, and the Summary's own `Total` row, which mixes shares, percentages and the pool.

**What differs:** `notes`: no `formula_totals_skipped`.

## What a re-derivation should check

1. **Each fixture against Alder Gate:** apply the change to its `workbook.json` and read it by OX3 to OX13. Each result should match `expected.json` exactly, notes compared as a set.
2. **The dates:** day 45,960 from 1900 and day 44,650 from 1904.
3. **The 15-digit rule** on "2.5000000000000001E-3".
4. **The totals** in the table above, and that none of the money or percentage totals is checked.
5. **That every other line is Alder Gate's.**
