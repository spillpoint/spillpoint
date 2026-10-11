# OCX case 07: edge case 4 written as OCX 0.5

Edge case 4's cap table, `edge-04-participating-capped`, written as an OCX 0.5 workbook. With its one blank answered, it imports to that table (C18, 06e5). Only the format's tab names, headers and row labels come from the Coalition's reference. The company's name, "Edge Four", the titles and footnotes are our own, and every number is the locked case's.

## The workbook

- **Tabs:** `Summary Snapshot`, `Stakeholder Snapshot` and `Context`, so the layout is 0.4/0.5. The label says "OCX Version 0.5": `version_label`, field `0.5`.
- **The as-of date:** "As of 2025.06.30", so `as_of` is 2025-06-30. The locked case has no date; any would do.
- **Classes:** Common Stock, and Seed Preferred under `Preferred Stock`. `read.share_classes` is 2.
- **Financing History:** one round, "Seed": 1.5, 1.5, a ratio of 1, a multiple of 1, "Y", a cap of 3. `read.financing_rounds` is 1.
- **Holders:**

  | Stakeholder | Common Stock | Seed Preferred (outstanding) (1.0000) | Non-Plan Awards |
  |---|---:|---:|---:|
  | Founder A | 6,000,000 | 0 | 0 |
  | Founder B | 2,000,000 | 0 | 0 |
  | Investor X | 0 | 1,500,000 | 0 |
  | Investor Y | 0 | 500,000 | 0 |

  `read.stakeholders` is 4.
- **The pool row and Non-Plan Awards:** the pool row is read, `read.pool_rows` 1. There's no option column, so `unissued_pool` is 0. `Non-Plan Awards` has nothing in it, so it makes no class (OX14). Stock Plan Details has no plan.

## The import (OX14)

- **Seed Preferred** (`seed_preferred`):
  - issue and conversion price "1.5"
  - **the ratio check:** 1.5 ÷ 1.5 = 1, the ratio 1, exact
  - multiple "1"
  - **"Y" with a cap of 3,** above the multiple, so `participating_capped` with `cap_multiple` "3", and a `participation_cap_includes_preference` line
  - anti-dilution "none", with its line
- **Seniority:** blank, with `no_seniority_field`.
- **Checks:**
  - **Totals:** each of the per-holder `Total` row's holdings totals agrees: 8,000,000 common, 2,000,000 Seed, 0 awards. The Summary's `Outstanding Shares` agree too.
  - **The liquidation preference:** 2,000,000 × 1.5 × 1 = 3,000,000, the Summary's.
  - **The pool:** 0 against no plan.
- **The issue order:** `["seed_preferred"]`.

## The blank, answered

| Blank | Answer | Why |
|---|---|---|
| seniority | `[["seed_preferred"]]` | the locked case's one tier |

## Against the locked table

**The ids the import makes differently** (`renamed`): `common` is `common_stock`, and `seed` is `seed_preferred`. The holders' ids are the same.

**With the answer, every term is the locked case's:** holders, positions, the series' price, multiple, participation and cap, seniority, and a pool of 0. Anti-dilution is "none" in both. The test applies the answer and compares.
