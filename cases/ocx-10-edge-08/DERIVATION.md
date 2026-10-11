# OCX case 10: edge case 8 written as OCX 0.5

Edge case 8's cap table, `edge-08-preferred-warrant`, written as an OCX 0.5 workbook. With its two blanks answered, it imports to that table (C18, 06e5).

## The workbook

- **Layout 0.4/0.5,** label 0.5, "As of 2025.06.30".
- **Classes:** Common Stock and Seed Preferred. `read.share_classes` is 2.
- **Financing History:** "Seed": 1, 1, a ratio of 1, a multiple of 1, "N", "N/A". `read.financing_rounds` is 1.
- **Holders:**

  | Stakeholder | Common Stock | Seed Preferred (outstanding) (1.0000) | Seed Preferred Warrants | Non-Plan Awards |
  |---|---:|---:|---:|---:|
  | Founder A | 6,000,000 | 0 | 0 | 0 |
  | Founder B | 2,000,000 | 0 | 0 | 0 |
  | Investor X | 0 | 2,000,000 | 0 | 0 |
  | Lender L | 0 | 0 | 200,000 | 0 |

**The warrant column is `<class> Warrants` for a class the Summary lists,** Seed Preferred, so a warrant for that series (OX14). The reference's converter heads a warrant for a preferred series by the common class it converts into. This workbook heads it by the series, which OX14 reads as written. Which way a real export heads it is still open (0.6.0 plan, question 9).

## The import (OX14)

- **Seed Preferred** (`seed_preferred`): issue and conversion price "1", ratio 1, exact, multiple "1", non-participating, anti-dilution "none".
- **The warrant:**
  - `warrants_1`, "Warrants for Seed Preferred", over `seed_preferred`, its strike blank (`no_strike_field`)
  - one `warrant_counts_are_maximums` line
  - Lender L holds 200,000
- **Seniority:** blank, with `no_seniority_field`.
- **Checks:**
  - the totals agree
  - the Seed liquidation preference, 2,000,000 × 1 × 1 = 2,000,000, agrees
  - the pool is 0
- **The issue order:** `["seed_preferred"]`.

## The blanks, answered

| Blank | Answer | Why |
|---|---|---|
| `warrants_1`'s strike | "0.5" | the locked warrant's $0.50 strike |
| seniority | `[["seed_preferred"]]` | the locked case's one tier |

## Against the locked table

**Renamed:** `common` to `common_stock`, `seed` to `seed_preferred`, and `warrant_seed` to `warrants_1`. The warrant's underlying is renamed with them.

**With the answers, every term is the locked case's.** The warrant's name isn't compared: "Warrants for Seed Preferred" against the locked "Warrant for Seed Preferred ($0.50 strike)" (C18).
