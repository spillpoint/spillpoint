# OCX case 09: edge case 7 written as OCX 0.5

Edge case 7's cap table, `edge-07-option-strikes`, written as an OCX 0.5 workbook. With its three blanks answered, it imports to that table (C18, 06e5).

## One plan per strike

**OCX 0.4/0.5 heads an option column by plan or class, never by strike** (OX14). So a plan whose grants have several strikes is one column, one class and one strike to answer, and no answer could make edge case 7 right: Employee C holds options at $0.25 and $3.

**So this workbook writes each strike as a plan of its own:**
- "2019 Stock Plan Options" holds the $0.25 grants
- "2021 Stock Plan Options" the $1 grants
- "2023 Stock Plan Options" the $3 grants

That's an encoding the comparison needs, not a claim about the company. A real export's mixed column is an open question for 06g.

## The workbook

- **Layout 0.4/0.5,** label 0.5, "As of 2025.06.30".
- **One class,** Common Stock (`read.share_classes` 1), and no preferred stock, so no Financing History rows.
- **Holders:**

  | Stakeholder | Common Stock | 2019 Stock Plan Options | 2021 Stock Plan Options | 2023 Stock Plan Options | Non-Plan Awards |
  |---|---:|---:|---:|---:|---:|
  | Founder A | 6,000,000 | 0 | 0 | 0 | 0 |
  | Founder B | 2,000,000 | 0 | 0 | 0 | 0 |
  | Employee C | 0 | 400,000 | 0 | 200,000 | 0 |
  | Employee D | 0 | 0 | 600,000 | 0 | 0 |
  | Employee E | 0 | 0 | 0 | 800,000 | 0 |
  | *Options Remaining for Issuance* | 0 | 0 | 0 | 0 | 0 |

  `read.stakeholders` is 5, and `read.pool_rows` 1.
- **Stock Plan Details:** the three plans, each with nothing left to grant. `read.stock_plans` is 3.

## The import (OX14)

- **Each option column is a class,** its strike blank, named by its heading and numbered by position: `options_1` (2019), `options_2` (2021), `options_3` (2023). Each gets a `no_strike_field` line. `Non-Plan Awards` is empty, so it makes no class.
- **No preferred stock,** so seniority is an empty list, not a blank, and there's no `no_seniority_field` line.
- **The pool:** 0, summed across the three option columns, against 0 summed across the three plans.
- **Checks:** the totals agree. Under the option columns: 400,000, 600,000 and 1,000,000, each with the pool row's 0.
- **The issue order:** empty, with no series, SAFE or note.

## The blanks, answered

| Blank | Answer | Why |
|---|---|---|
| `options_1`'s strike | "0.25" | the 2019 plan's grants are the locked case's $0.25 options |
| `options_2`'s strike | "1" | the 2021 plan's, its $1 options |
| `options_3`'s strike | "3" | the 2023 plan's, its $3 options |

## Against the locked table

**Renamed:** `common` to `common_stock`; `options_0.25` to `options_1`; `options_1` to `options_2`. `options_3` keeps its id.

**The swap is simultaneous:** the locked case's `options_1` is the import's `options_2`, while the import's `options_1` is the locked `options_0.25`.

**With the answers, every holder, class, strike and position is the locked case's.** The option classes' names aren't compared: the import names each by its column's heading ("2019 Stock Plan Options"), where the locked case names it by strike ("Options ($0.25 strike)") (C18).
