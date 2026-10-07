# Edge case 23: derivation

This is edge case 15's company and rounds, with one change: the Series A carries an **8% simple cumulative dividend, forfeited on conversion**. The company is then sold on 2026-06-30, on the cap table after the Series A (`ASSUMPTIONS.md` C2).

## The rounds

As in case 15:
1. **Founding, 2022-01-10:** Founder A 4,500,000 and Founder B 1,500,000 common.
2. **Option pool:** 20%. **Grants:** Employee C, 500,000 options at $0.25.
3. **SAFE, 2022-09-01:** Investor S's $600,000 post-money SAFE, capped at $18M, with a 20% discount.
4. **Series A, 2023-06-30:** $5,000,000 from Investor X at a $20M pre-money valuation.
   - **The price:** $2.50 a share.
   - **The pool** is topped up to 12% unissued.
   - **The SAFE converts at its discount,** $2.00 (it beats the cap price), into **300,000 shares of Series A Preferred (from SAFEs)**.

The cap table after the Series A:
- **Common:** 6,000,000.
- **Options:** 500,000 at $0.25.
- **Series A Preferred:** 2,000,000, Investor X, issued at $2.50.
- **Series A Preferred (from SAFEs):** 300,000, Investor S, issued at $2.00.
- **The unissued pool:** 1,200,000.
- **Seniority:** both series in one tier.

## The dividends (`ASSUMPTIONS.md` R30, X2, X4)

- **When they start.** The round's series accrues its dividends **from the round's date**, 2023-06-30. The input gives the rate, the method and what happens on conversion, but no start date.
- **The series from SAFEs.** It takes the round's series' rights, so it carries **the same dividend terms from the same date**. They are calculated on **its own issue price, $2.00** (its conversion price), just as its preference is.

From 2023-06-30 to 2026-06-30 is **1,096 days**, 29 February 2024 included:

| Series | Per share | Shares | Accrued | Preference with dividends |
|---|---:|---:|---:|---:|
| Series A | $2.50 × 8% × 1,096/365 = $0.600548 | 2,000,000 | **$1,201,095.89** | **$6,201,095.89** |
| Series A (from SAFEs) | $2.00 × 8% × 1,096/365 = $0.480438 | 300,000 | **$144,131.51** | **$744,131.51** |

The tier claims **$6,945,227.40** in all (exactly 507,001,600/73).

## Breakpoints

| Exit value | Why |
|---:|---|
| $6,945,227.40 | The tier is paid in full: both preferences with their dividends. Until here the two series share every dollar pro rata by claim. Above this, common shares the residual. |
| $8,445,227.40 | The $0.25 options come into the money: the residual reaches $1,500,000, which is $0.25 on each of the 6,000,000 common shares. |
| $22,943,076.71 | Series A (from SAFEs) converts. Its preference with dividends is $2.480438 a share. With the options exercised, the residual after Series A's $6,201,095.89, plus $125,000 of strike cash, is shared by 6,800,000 shares. That reaches $2.480438 a share here. |
| $27,159,821.92 | Series A converts. Its preference with dividends is $3.100548 a share. With everyone converted, (exit value + $125,000) ÷ 8,800,000 reaches that here. |

**The series from SAFEs converts first** because its preference per share is lower: $2.00 plus $0.48 of dividends, against $2.50 plus $0.60.

**Converting forfeits the dividends.** At $22,943,076.71 the series from SAFEs is indifferent between its $744,131.51 preference with dividends and 300,000 shares at $2.480438. Above it, converting pays more even without them.

**In case 15's company without dividends,** the series would convert where their preferences alone, $2.00 and $2.50 a share, are matched. The dividends move each conversion up.

## Payouts

| Exit | Founder A | Founder B | Employee C | Investor S (from SAFEs) | Investor X (Series A) |
|---:|---:|---:|---:|---:|---:|
| $3M | 0 | 0 | 0 | 321,428.57 | 2,678,571.43 |
| $6,945,227.40 | 0 | 0 | 0 | 744,131.51 | 6,201,095.89 |
| $8M | 791,079.45 | 263,693.15 | 0 | 744,131.51 | 6,201,095.89 |
| $8,445,227.40 | 1,125,000 | 375,000 | 0 | 744,131.51 | 6,201,095.89 |
| $10M | 2,201,381.03 | 733,793.68 | 119,597.89 | 744,131.51 | 6,201,095.89 |
| $20M | 9,124,457.96 | 3,041,485.99 | 888,828.66 | 744,131.51 | 6,201,095.89 |
| $22,943,076.71 | 11,161,972.60 | 3,720,657.53 | 1,115,219.18 | 744,131.51 | 6,201,095.89 |
| $25M | 12,523,171.84 | 4,174,390.61 | 1,266,463.54 | 834,878.12 | 6,201,095.89 |
| $27,159,821.92 | 13,952,465.75 | 4,650,821.92 | 1,425,273.97 | 930,164.38 | 6,201,095.89 |
| $30M | 15,404,829.55 | 5,134,943.18 | 1,586,647.73 | 1,026,988.64 | 6,846,590.91 |
| $40M | 20,518,465.91 | 6,839,488.64 | 2,154,829.55 | 1,367,897.73 | 9,119,318.18 |

- **At $3M:** the tier is short, so the two series split it pro rata by claim: Investor S 744,131.51/6,945,227.40 and Investor X the rest.
- **Employee C** is shown net of the $125,000 strike.
- **At each conversion point** the converting series is indifferent, and the case shows it keeping its preference (`ASSUMPTIONS.md` E5).
