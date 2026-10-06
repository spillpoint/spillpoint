# Edge case 13f: derivation

This is edge case 13a's company and note, with a **Series A Preferred**:
- **Series A:** 2,000,000 shares held by Investor P, bought at $1.00. A 1x non-participating preference of $2,000,000.
- **The rest:** 9,000,000 common (Founder A 6,000,000, Founder B 3,000,000), 500,000 options at $5.00, and a 1,000,000-share unissued pool.

## The note (`ASSUMPTIONS.md` X3, X10–X12)

**Investor X's note:**
- **Principal:** $1,000,000.
- **Interest:** 6% simple for 730 days, **$120,000**.
- **Repayment:** 2x principal plus interest, **$2,240,000**. It is debt, so it is paid **ahead of all equity, Series A's preference included**.
- **Conversion:** principal plus interest, $1,120,000, converts into common at the $8,000,000 pre-money cap, divided by the with_pool base.

**The base counts Series A as converted.** It is all issued stock as converted, all issued options and the unissued pool, just before the sale:
- **The count:** 9,000,000 + 2,000,000 + 500,000 + 1,000,000 = **12,500,000**.
- **Conversion price:** $8,000,000 ÷ 12,500,000 = **$0.64**.
- **Conversion shares:** $1,120,000 ÷ $0.64 = **1,750,000**.

Without Series A in the base, as in edge case 13a, the price would be $0.761905 and the note would get 1,470,000 shares.

## Stage by stage

1. **Up to $2,240,000:** everything goes to the note, until its repayment is paid.
2. **$2,240,000 to $4,240,000:** Series A's $2,000,000 preference.
3. **Above $4,240,000:** common shares what is left: 9,000,000 shares.

## Series A converts at $13,240,000

Converting, Series A's 2,000,000 shares join common's 9,000,000, sharing what is left after the note's repayment. Series A's share is 2/11 of (exit value − $2,240,000). That equals its $2,000,000 preference at **$13,240,000**.

## The note converts at $16,320,000

With Series A converted, the note's 1,750,000 shares join the 11,000,000 already sharing: 12,750,000 shares. Its share, 1,750,000 ÷ 12,750,000, is 7/51 of the exit value. That equals its $2,240,000 repayment at **$16,320,000**.

Series A stays converted there. With the note converting, Series A's 2/12.75 of the exit value is well above its $2,000,000 preference.

## Breakpoints

| Exit value | Why |
|---:|---|
| $2,240,000 | The note is fully repaid. The next dollar goes to Series A's preference. |
| $4,240,000 | Series A's preference is fully paid. Above this, common shares the residual. |
| $13,240,000 | Series A converts: 2/11 of (exit value − $2,240,000) equals its $2,000,000 preference. |
| $16,320,000 | The note converts: 7/51 of the exit value equals its $2,240,000 repayment. |

**The options never come into the money in this range.** With everything converted, they would be exercised once (exit value + $2.5M) ÷ 13,250,000 > $5.00, above $63,750,000.

## Payouts

| Exit | Founder A | Founder B | Employee C | Investor P (Series A) | Investor X (note) |
|---:|---:|---:|---:|---:|---:|
| $1M | 0 | 0 | 0 | 0 | 1,000,000 |
| $2.24M | 0 | 0 | 0 | 0 | 2,240,000 |
| $3M | 0 | 0 | 0 | 760,000 | 2,240,000 |
| $4.24M | 0 | 0 | 0 | 2,000,000 | 2,240,000 |
| $10M | 3,840,000 | 1,920,000 | 0 | 2,000,000 | 2,240,000 |
| $13.24M | 6,000,000 | 3,000,000 | 0 | 2,000,000 | 2,240,000 |
| $15M | 6,960,000 | 3,480,000 | 0 | 2,320,000 | 2,240,000 |
| $16.32M | 7,680,000 | 3,840,000 | 0 | 2,560,000 | 2,240,000 |
| $20M | 9,411,764.71 | 4,705,882.35 | 0 | 3,137,254.90 | 2,745,098.04 |
| $40M | 18,823,529.41 | 9,411,764.71 | 0 | 6,274,509.80 | 5,490,196.08 |

- **At $15M:** Series A has converted. After the note's $2,240,000, $12,760,000 is shared by 11,000,000 shares, $1.16 each.
- **At $20M:** the note has converted too. $20,000,000 is shared by 12,750,000 shares, $1.568627 each.
- **At $13.24M and $16.32M:** the converting holder is indifferent. The case shows it keeping its preference or taking repayment (`ASSUMPTIONS.md` E5).
