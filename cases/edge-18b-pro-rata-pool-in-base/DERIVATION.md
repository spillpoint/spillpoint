# Edge case 18b: derivation

A round case. Edge case 18 with an option pool, and the **unissued pool counted in the pro-rata base** (`ASSUMPTIONS.md` R6's toggle, `pro_rata_base_includes_unissued_pool`).

## Before the Series A

- **Founder A:** 8,000,000 common.
- **The Seed:** $2,000,000 at $1.00 a share. **Investor X** holds 2,000,000 Seed, and has pro-rata rights.
- **Investor Z's post-money SAFE:** $1,000,000 with an $11,000,000 cap.
- **A 5% option pool,** created after the SAFE (R2, which leaves SAFEs out): 5% × 10,000,000 ÷ 95%, rounded down, **526,315** shares, none granted.

Case 18 has no pool, so the toggle would change nothing there. This case adds one. With a 10% pool, Investor X's $1,000,000 would be above its entitlement under the toggle, and the round would be refused (M4d). 5% keeps the case about the base.

## The Series A

The same round as 18: **$6,000,000** at **$33,000,000** pre-money, $39,000,000 post-money. Investor Y $5,000,000; Investor X $1,000,000 under its pro-rata right. No pool target.

**The SAFE's price (R4):**
- **Company Capitalization** counts the pool as it stood: (10,000,000 + 526,315) ÷ (1 − 1/11) = **11,578,946.5**.
- **The SAFE's price** is $11,000,000 ÷ 11,578,946.5 = **$0.950000** (exactly 2,000,000/2,105,263), so it gets **1,052,631** shares.

**The round's price:**
- **Post-money fully diluted:** x = 10,526,315 + 1,052,631.5 + (6/39) x, so x = **13,684,209.5**.
- **Price:** $39,000,000 ÷ x = **$2.850000** (exactly 6,000,000/2,105,263).
- **Series A,** rounded down: Investor Y **1,754,385**, Investor X **350,877**.

## Investor X's pro-rata entitlement (R6, with the toggle)

- **The base** counts outstanding stock, options and the SAFE's 1,052,631 shares, as in case 18, plus, under the toggle, the **526,315** unissued pool: **11,578,946** in all.
- **Investor X's share:** 2,000,000 ÷ 11,578,946 = **17.272729%**.
- **Its entitlement:** that × $6,000,000 = **$1,036,363.76**.

It invests $1,000,000, within it.

Without the toggle, the base is 11,052,631, X's share 18.095239%, and its entitlement **$1,085,714.34**. Millrace's Series A is the default case with a pool: Harbor Lane's 28.703080%.

## Cap table after the Series A

| Holder | Security | Shares | Fully diluted % |
|---|---|---:|---:|
| Founder A | Common | 8,000,000 | 58.46% |
| Investor X | Seed Preferred | 2,000,000 | 14.62% |
| Investor Z | Series A Preferred (from SAFEs) | 1,052,631 | 7.69% |
| Investor Y | Series A Preferred | 1,754,385 | 12.82% |
| Investor X | Series A Preferred | 350,877 | 2.56% |
| Unissued pool | | 526,315 | 3.85% |
| **Total** | | **13,684,208** | **100.00%** |
