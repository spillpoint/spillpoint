# Edge case 9b: derivation

This is edge case 9's company and Seed series, with two changes:
- **Seed's dividend compounds,** instead of accruing at simple interest.
- **The sale is on 2026-09-30,** not 2026-03-31. Case 9 runs exactly four years, which would never test the part-year rule below.

The company:
- **Common:** Founder A 6,000,000 and Founder B 2,000,000.
- **Seed Preferred:** 2,000,000 shares bought at $1.50. Investor X holds 1,500,000 and Investor Y 500,000. A 1x non-participating preference of $3,000,000, with an 8% cumulative dividend accruing from 2022-03-31. Dividends are forfeited on conversion.

## The rule (`ASSUMPTIONS.md` X4, X5)

**The dividend compounds annually, on the accrual start's anniversaries.**
- **Each full year** multiplies the original issue price plus what has accrued by 1.08. That holds whether the year has 365 or 366 days: the year to 2024-03-31 includes 29 February and still counts as exactly one year.
- **The part-year after the last anniversary** is simple interest, Actual/365, on the compounded amount.
- **A 29 February start** would have its anniversaries on 28 February in other years. This case starts on 31 March, so that doesn't arise.

**As in case 9,** the accrued dividends are added to the preference at 1x (X4), and a series that converts forfeits them.

## The accrual, per share

| From | To | Days | Per share, after |
|---|---|---:|---:|
| 2022-03-31 | 2026-03-31 | four full years | $1.50 × 1.08⁴ = **$2.04073344** |
| 2026-03-31 | 2026-09-30 | 183 | $2.04073344 × (1 + 0.08 × 183/365) = **$2.12258590** |

- **Accrued:** $2.12258590 − $1.50 = **$0.62258590** a share (exactly 2,219,180,109/3,564,453,125).
- **On 2,000,000 shares:** **$1,245,172.84**.
- **At simple interest** to the same date (1,644 days), it would be $1,080,986.30.

So Seed's preference is $3,000,000 + $1,245,172.84 = **$4,245,172.84**.

## Breakpoints

| Exit value | Why |
|---:|---|
| $4,245,172.84 | Seed's preference, with its dividends, is fully paid. Above this, common shares the residual. |
| $21,225,864.20 | Seed converts. Converting, its 2,000,000 shares get 2/10 of the exit value, which equals its $4,245,172.84 preference at 5 × $4,245,172.84. |

In case 9, the same two points are at $3,960,657.53 and $19,803,287.67.

## Payouts

| Exit | Founder A | Founder B | Investor X (Seed) | Investor Y (Seed) |
|---:|---:|---:|---:|---:|
| $1M | 0 | 0 | 750,000 | 250,000 |
| $3M | 0 | 0 | 2,250,000 | 750,000 |
| $4M | 0 | 0 | 3,000,000 | 1,000,000 |
| $4,245,172.84 | 0 | 0 | 3,183,879.63 | 1,061,293.21 |
| $5M | 566,120.37 | 188,706.79 | 3,183,879.63 | 1,061,293.21 |
| $15M | 8,066,120.37 | 2,688,706.79 | 3,183,879.63 | 1,061,293.21 |
| $20M | 11,816,120.37 | 3,938,706.79 | 3,183,879.63 | 1,061,293.21 |
| $21,225,864.20 | 12,735,518.52 | 4,245,172.84 | 3,183,879.63 | 1,061,293.21 |
| $40M | 24,000,000 | 8,000,000 | 6,000,000 | 2,000,000 |
| $60M | 36,000,000 | 12,000,000 | 9,000,000 | 3,000,000 |

At $19M and $20M Seed keeps its preference: case 9's Seed had converted by then. At $21,225,864.20 Seed is indifferent, and the case shows it keeping its preference (`ASSUMPTIONS.md` E5).
