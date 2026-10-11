# OCX case 06: Hollis Mill Robotics, OCX 0.5

A fictional company's workbook in OCX 0.5's layout, using every table the reader reads there (OX14). Only the format's tab names, headers and row labels come from the Coalition's reference workbooks. The company, its holders, numbers, titles and footnotes are our own, and the tables sit where we put them.

**What it shows that the 0.7 cases can't:**
- **A series' terms from Financing History:** a non-participating series, and a participating one with a cap and a ratio stored as Excel computes it.
- **Options, non-plan awards and a warrant with no strikes:** the strikes are blanks to fill.
- **Two SAFEs combined in one row,** and a note from its row.
- **0.4/0.5's checks:** totals with saved values, `(as converted)`, the liquidation preferences and the summed pool.

## The layout and the date

- **The layout is 0.4/0.5** (OX4, OX13 step 1): the per-holder tab is `Stakeholder Snapshot`, beside `Summary Snapshot` and `Context`. `Voting by SH Group` is set aside.
- **The label** on Context reads "OCX Version 0.5": `version_label`, field `0.5`.
- **The as-of date:** the summary tab's "As of 2025.12.31", in the reference's dotted form (OX14), so **`as_of` is 2025-12-31.** Every tab repeats it.
- **Every formula has a saved value,** as 0.4/0.5's do, so there's no `formula_totals_skipped` line, and every share total is checked (below).

## The classes (OX7, OX14)

| Summary row | Share Class | Section | Outstanding Shares |
|---:|---|---|---:|
| 4 | Common Stock**** | the section's label | |
| 5 | Common Stock | Common Stock | 6,000,000 |
| 7 | Preferred Stock | the section's label | |
| 8 | Series Seed Preferred | Preferred Stock | 1,500,000 |
| 9 | Series A Preferred | Preferred Stock | 2,250,000 |

- **Row 11 starts `Warrants & Non-Plan Awards`,** which ends the classes.
- **Three classes:** `read.share_classes` is 3.
- **Ids by name:** `common_stock`, `series_seed_preferred`, `series_a_preferred`.

**The rounds** (OX14, in step 6's place), Context's Financing History:

| Round | Initial Closing Date | Original Issue Price | Adjusted Conversion Price | Conversion Ratio (as stored) | Liquidation Multiple | Participating (Y/N) | Participation Cap |
|---|---|---:|---:|---:|---:|---|---:|
| Series Seed | 2023.03.15 | 1 | 1 | 1 | 1 | N | N/A |
| Series A | 2024.09.01 | 2 | 1.5 | 1.3333333333333333 | 1 | Y | 3 |

- **Matching:** "Series Seed" is "Series Seed Preferred" less "Preferred", and "Series A" is "Series A Preferred" less "Preferred". Each round has its class and each preferred class its round: `read.financing_rounds` is 2.
- **Series Seed Preferred:**
  - issue price "1", conversion price "1", multiple "1"
  - **the ratio check:** 1 ÷ 1 = 1, and the ratio 1 is a whole number, so exact
  - **"N", so non-participating;** its cap, "N/A", isn't read
  - `cap_multiple` null
- **Series A Preferred:**
  - issue price "2", conversion price "1.5", multiple "1"
  - **The ratio check** (O4 with 15 digits):
    - **Read to 15 significant digits,** the stored ratio is 1.33333333333333.
    - **All 15 digits are written,** so it may be off by half a unit in the 15th: 1.333333333333325 to 1.333333333333335.
    - **The prices give** 2 ÷ 1.5 = 1.3333…, inside that, but not exactly the ratio. So it's read, with a `conversion_ratio_rounded` line.
    - **The prices** have few digits, so they're exact.
  - **"Y" with a cap of 3:** a multiple of the issue price, above the 1x preference, so `participating_capped` with `cap_multiple` "3", read as including the preference, with a `participation_cap_includes_preference` line.
- **Both:** anti-dilution "none", each with a `no_anti_dilution_field` line.
- **Seniority is blank:** there's preferred stock, and no layout says seniority. It's `null`, listed as `{ "field": "seniority" }`, with a `no_seniority_field` line.

## The holders and their holdings (OX6, OX14)

The holdings columns run from `Stakeholder Group` to `Total Stock (outstanding)`:

| Stakeholder | Common Stock | Series Seed Preferred (outstanding) (1.0000) | Series A Preferred (outstanding) (1.3333) | Series A Preferred (as converted) | Common Stock Options | Common Stock Warrants | Non-Plan Awards |
|---|---:|---:|---:|---:|---:|---:|---:|
| Advisor E | 0 | 0 | 0 | 0 | 0 | 0 | 50,000 |
| Employee C | 500,000 | 0 | 0 | 0 | 150,000 | 0 | 0 |
| Employee D | 0 | 0 | 0 | 0 | 100,000 | 0 | 0 |
| Former F | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Founder A | 3,500,000 | 0 | 0 | 0 | 0 | 0 | 0 |
| Founder B | 2,000,000 | 0 | 0 | 0 | 0 | 0 | 0 |
| Investor S | 0 | 1,000,000 | 0 | 0 | 0 | 0 | 0 |
| Investor T | 0 | 500,000 | 750,000 | 1,000,000 | 0 | 0 | 0 |
| Investor U | 0 | 0 | 1,500,000 | 2,000,000 | 0 | 0 | 0 |
| Lender L | 0 | 0 | 0 | 0 | 0 | 40,000 | 0 |
| *Options Remaining for Issuance* | 0 | 0 | 0 | 0 | 750,000 | 0 | 0 |

**Each column, by its heading:**
- **Common Stock:** a common class, headed by its name.
- **Each preferred class's `(outstanding)` column is its holdings.** The ratio in its heading isn't read, since Financing History gives it in full.
- **`Series A Preferred (as converted)`** is a check (below). Series Seed's ratio is 1, so it has none.
- **`Common Stock Options`** ends " Options", so it's an option column.
- **`Common Stock Warrants`** is a warrant column for Common Stock, a class the Summary lists.
- **`Non-Plan Awards`** is the awards column.

**Ten holder rows:** `read.stakeholders` is 10. **Former F holds nothing,** so is left out, with a `left_out_stakeholder` line (OX6). The pool's row is read for the pool: `read.pool_rows` is 1.

**Classes for the options, awards and warrant** (OX14). None has a strike in the workbook:
- **`Common Stock Options`** is `options_1`, named "Common Stock Options", the first option column.
- **`Non-Plan Awards`** is `options_2`, named "Non-Plan Awards".
- **`Common Stock Warrants`** is `warrants_1`, named "Warrants for Common Stock", over common.

Each has its strike `null`, listed to fill, with a `no_strike_field` line. The warrant also gets one `warrant_counts_are_maximums` line.

**Positions:**
- Advisor E: 50,000 `options_2`
- Employee C: 500,000 common and 150,000 `options_1`
- Employee D: 100,000 `options_1`
- Founders A and B: 3,500,000 and 2,000,000 common
- Investor S: 1,000,000 Series Seed
- Investor T: 500,000 Series Seed and 750,000 Series A
- Investor U: 1,500,000 Series A
- Lender L: 40,000 `warrants_1`

## The pool (OX14)

`Options Remaining for Issuance` under the one option column is 750,000, so **`unissued_pool` is 750,000.** It's checked against Stock Plan Details' one plan, Hollis Mill 2022 Stock Plan: 750,000 shares available for grant (below). Its `Outstanding RSUs` is 0, so nothing is refused for RSUs. `read.stock_plans` is 1.

## The convertibles (OX11, OX14)

| Security Type | # of Securities | Outstanding Amount | Discount | Valuation Cap |
|---|---:|---:|---:|---:|
| Post-$ SAFEs | 2 | 500,000 | N/A | 12,000,000 |
| Convertible Notes | 1 | 250,000 | 0.2 | 8,000,000 |

Both rows are read for values: `read.convertible_rows` is 2.

**The SAFEs row** is one SAFE for its total, held by a holder made for it, with a `safes_combined` line:
- **The holder:** "Post-money SAFEs, $12,000,000 cap (2)", id `post_money_safes_12_000_000_cap_2`. Its type, its cap, and its count; "N/A" is no discount, so none is named.
- **The SAFE:** `safe_post_money_safes_12_000_000_cap_2`, a purchase amount of 500000, a `post_money_cap` of 12000000, and a discount of "0", since "N/A" is none.

**The notes row** is one note, as in ocx-04's `note-in-a-row`:
- **The holder:** "Convertible notes, $8,000,000 cap, 20% discount (1)", id `convertible_notes_8_000_000_cap_20_discount_1`.
- **The note:** its id is `note_` and that.
  - principal 250000
  - its cap, 8000000, read as pre-money (`note_cap_read_as_pre_money`)
  - discount "0.2", a fraction below 1
  - simple interest
- **Blank:** its rate, issue date, base and repayment multiple, each listed to fill.
- **A `note_from_convertibles_row` line.**

## The issue order (OX12, OX14)

The series by their rounds' `Initial Closing Date`: Series Seed (15 March 2023), then Series A (1 September 2024). Then the SAFE and the note, in the table's order, after every series by the default, each with an `issue_order_default` line: **`["series_seed_preferred", "series_a_preferred", "safe_post_money_safes_12_000_000_cap_2", "note_convertible_notes_8_000_000_cap_20_discount_1"]`.**

## The checks (OX14, OX13 step 8), in order

1. **Totals with a saved value that count shares** (OX5). The per-holder `Total` row (row 16), against the holder rows and the pool row:

   | Column | Its rows | Saved |
   |---|---|---:|
   | Common Stock | 500,000 + 3,500,000 + 2,000,000 | 6,000,000 |
   | Series Seed Preferred (outstanding) | 1,000,000 + 500,000 | 1,500,000 |
   | Series A Preferred (outstanding) | 750,000 + 1,500,000 | 2,250,000 |
   | Series A Preferred (as converted) | 1,000,000 + 2,000,000 | 3,000,000 |
   | Common Stock Options | 150,000 + 100,000, and the pool row's 750,000 | 1,000,000 |
   | Common Stock Warrants | 40,000 | 40,000 |
   | Non-Plan Awards | 50,000 | 50,000 |

   Each class's `Outstanding Shares` on the Summary, against its column's holders: Common Stock 6,000,000, Series Seed Preferred 1,500,000 and Series A Preferred 2,250,000, all agreeing. The money and percentage totals (`Liquidation Preference`, the percentages) aren't checked.
2. **Each holder's `(as converted)`,** within one share of outstanding × issue price ÷ conversion price:
   - Investor T: 750,000 × 2 ÷ 1.5 = 1,000,000
   - Investor U: 1,500,000 × 2 ÷ 1.5 = 2,000,000

   Both exact.
3. **Each preferred class's `Liquidation Preference`,** within a cent of outstanding × issue price × multiple:
   - Series Seed: 1,500,000 × 1 × 1 = 1,500,000
   - Series A: 2,250,000 × 2 × 1 = 4,500,000

   Common's is "N/A": nothing to check.
4. **The pool:** 750,000 on the pool row, summed across the one option column, against 750,000 available for grant, summed across the one plan.

The convertibles table is where the SAFE and note come from, so there's nothing to check it against.

## The report

- **`read`:** stakeholders 10, pool rows 1, share classes 3, convertible rows 2, stock plans 1, financing rounds 2.
- **`not_needed`:**
  - stock plan history 2: the plan's adoption and increase
  - 409A valuations 2
  - split adjustments 1: the counts elsewhere are already after it
  - shareholder groups 3: the names under the title
- **The notes:**
  - `version_label` (0.5)
  - O11's four
  - `no_seniority_field`
  - Series A's `conversion_ratio_rounded` and `participation_cap_includes_preference`
  - `no_anti_dilution_field` for each series
  - `no_strike_field` for `options_1`, `options_2` and `warrants_1`
  - `warrant_counts_are_maximums`
  - `safes_combined` for the SAFE
  - `note_from_convertibles_row` and `note_cap_read_as_pre_money` for the note
  - `issue_order_default` for the SAFE and the note
  - `left_out_stakeholder` for `former_f`
- **To fill:**
  - the three strikes
  - the note's rate, issue date, base and repayment multiple
  - seniority

## What a re-derivation should check

1. **The ratio check on Series A:** the stored ratio read to 15 digits, its allowance, and that 4/3 falls inside but isn't exact.
2. **The participation reading of each series,** and that Series Seed's "N/A" cap isn't read.
3. **The holdings and positions** against the per-holder table, and that the `(as converted)` column isn't a holding.
4. **The three classes with no strike,** their names and ids by position.
5. **The made holders' names and ids,** and that "N/A" is no discount in the SAFE's.
6. **Each check in its order,** and the totals in the table.
7. **The report's counts,** row by row.
