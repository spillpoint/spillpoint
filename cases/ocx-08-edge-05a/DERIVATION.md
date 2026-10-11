# OCX case 08: edge case 5a written as OCX 0.5

Edge case 5a's cap table, `edge-05a-stacked`, written as an OCX 0.5 workbook. With its one blank answered, it imports to that table (C18, 06e5). As in case 07, the tabs, headers and row labels are the format's, and the rest is our own or the locked case's.

## The workbook

- **Layout 0.4/0.5,** label 0.5, "As of 2025.06.30".
- **Classes:** Common Stock, Series A Preferred and Series B Preferred. `read.share_classes` is 3.
- **Financing History:**

  | Round | Initial Closing Date | Issue price | Conversion price | Ratio | Multiple | Participating | Cap |
  |---|---|---:|---:|---:|---:|---|---|
  | Series A | 2023.05.01 | 2 | 2 | 1 | 1 | N | N/A |
  | Series B | 2024.11.01 | 4 | 4 | 1 | 1 | N | N/A |

  `read.financing_rounds` is 2.
- **Holders:** Founder A 6,000,000 and Founder B 2,000,000 common; Investor X 1,000,000 Series A; Investor Y 1,000,000 Series B. `read.stakeholders` is 4. `Non-Plan Awards` is empty, so it makes no class.

## The import (OX14)

- **Each series:** its prices, a ratio of 1, exact, a multiple of 1, and "N", so non-participating, its "N/A" cap not read. Anti-dilution "none", a line each.
- **Seniority:** blank, with `no_seniority_field`.
- **Checks:** the totals, and the liquidation preferences, 2,000,000 and 4,000,000, all agree. The pool is 0 against no plan.
- **The issue order:** by closing date, `["series_a_preferred", "series_b_preferred"]`.

## The blank, answered

| Blank | Answer | Why |
|---|---|---|
| seniority | `[["series_b_preferred"], ["series_a_preferred"]]` | the locked case's stacking: Series B senior, then Series A |

## Against the locked table

**Renamed:** `common` to `common_stock`, `series_a` to `series_a_preferred`, and `series_b` to `series_b_preferred`.

**With the answer, every term is the locked case's,** seniority tiers included, in order.
