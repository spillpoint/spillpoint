# OCX case 11: edge case 12b written as OCX 0.5

Edge case 12b's cap table, `edge-12b-safe-cap-and-discount`, written as an OCX 0.5 workbook. With its one blank answered, it imports to that table (C18, 06e5).

## The workbook

- **Layout 0.4/0.5,** label 0.5, "As of 2025.06.30".
- **One class,** Common Stock. `read.share_classes` is 1.
- **Holders:** Founder A 6,000,000 and Founder B 3,000,000 common; Employee C 500,000 under "Common Stock Options". `read.stakeholders` is 3. `Non-Plan Awards` is empty, so it makes no class.
- **Not on the per-holder tab:** Investor X, who holds only the SAFE. OCX's per-holder tab has no column for SAFEs, and the reference template lists none of its SAFE holders.
- **The pool:** the pool row's 1,000,000 under the option column. Stock Plan Details' one plan, the 2022 Stock Plan, has 1,000,000 available for grant. `read.pool_rows` 1, `read.stock_plans` 1.
- **The convertibles table:** one row, `Post-$ SAFEs`, 1 SAFE for $1,000,000, a discount of 0.2, a cap of $10,000,000. `read.convertible_rows` is 1.

## The import (OX11, OX14)

- **The option class:** `options_1`, "Common Stock Options", its strike blank (`no_strike_field`).
- **No preferred stock,** so seniority is an empty list.
- **The SAFE,** a row of one, read as OX11's rule reads any row (`safes_combined`):
  - **The holder made for it:** "Post-money SAFEs, $10,000,000 cap, 20% discount (1)", id `post_money_safes_10_000_000_cap_20_discount_1`.
  - **The SAFE:** `safe_post_money_safes_10_000_000_cap_20_discount_1`, a purchase amount of 1000000, a `post_money_cap` of 10000000, and a discount of "0.2".
  - **In the issue order:** after every series, with `issue_order_default`.
- **Checks:**
  - **Totals:** 9,000,000 common; 1,500,000 under the option column, its 500,000 and the pool's 1,000,000.
  - **The pool:** 1,000,000 against 1,000,000.

## The blank, answered

| Blank | Answer | Why |
|---|---|---|
| `options_1`'s strike | "5" | the locked case's $5 options |

## Against the locked table

**Renamed:**
- `common` to `common_stock`
- `options_5` to `options_1`
- `investor_x` to `post_money_safes_10_000_000_cap_20_discount_1`
- `safe_x` to `safe_post_money_safes_10_000_000_cap_20_discount_1`

**With the answer, every term is the locked case's:** the SAFE's amount, cap and discount, the options, the pool and the holdings.

**Not compared:** the SAFE holder's name, "Investor X" in the locked case. OCX's convertibles table names no holder, so the import makes one for the row (C18, OX11). The option class's name isn't compared either.
