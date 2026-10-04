# Edge case 13c: derivation

This is edge case 13a with one term changed. The note's cap divides by **issued common stock only**, leaving out both the options and the unissued pool (`ASSUMPTIONS.md` X10, `conversion_base: common_only`). Everything else is the same as in 13a, including interest and repayment:
- $120,000 of interest over 730 days, so principal plus interest is $1,120,000
- repayment of 2 × $1,120,000 = **$2,240,000**, paid ahead of all equity as debt

## Conversion

- **Count:** 9,000,000 common. The note itself is not counted.
- **Conversion price:** $8,000,000 ÷ 9,000,000 = **$0.888889** (exactly 8/9).
- **Conversion shares:** $1,120,000 ÷ $0.888889 = **1,260,000**.

When the note converts, 9,000,000 + 1,260,000 = 10,260,000 shares share the proceeds. The options are out of the money and sit out. The note's share is 1,260,000 ÷ 10,260,000 = 7/57, about **12.28%**.

## Breakpoints

| Exit value | Why |
|---:|---|
| $2,240,000 | The repayment is fully paid, as in 13a. Above this, the next dollar goes to common. |
| $18,240,000 | The note switches to conversion. 7/57 of the exit value equals $2,240,000 at $2,240,000 × 57/7 = $18,240,000. |

Converting pays more once a common share is worth more than $2,240,000 ÷ 1,260,000 = $1.777778, which is 2× the conversion price. Each common share gets the exit value ÷ 10,260,000.

The options would come into the money above $51,300,000: ($E + $2.5M) ÷ (9,000,000 + 1,260,000 + 500,000) > $5.00. That is outside the $0 to $40M range.

## Payouts

| Exit | Founder A | Founder B | Employee C | Investor X (note) | Note takes |
|---:|---:|---:|---:|---:|---|
| $1M | 0 | 0 | 0 | 1,000,000 | repayment |
| $2M | 0 | 0 | 0 | 2,000,000 | repayment |
| $2.24M | 0 | 0 | 0 | 2,240,000 | repayment |
| $5M | 1,840,000 | 920,000 | 0 | 2,240,000 | repayment |
| $10M | 5,173,333.33 | 2,586,666.67 | 0 | 2,240,000 | repayment |
| $15M | 8,506,666.67 | 4,253,333.33 | 0 | 2,240,000 | repayment |
| $18.24M | 10,666,666.67 | 5,333,333.33 | 0 | 2,240,000 | indifferent; shown as repayment |
| $20M | 11,695,906.43 | 5,847,953.22 | 0 | 2,456,140.35 | conversion |
| $40M | 23,391,812.87 | 11,695,906.43 | 0 | 4,912,280.70 | conversion |

At $20M the note takes 7/57 × $20M = $2,456,140.35, and common gets $17,543,859.65.

## Compared with 13a and 13b

- **Up to $15M** every payout is the same in all three cases, because the note takes its repayment.
- **The smallest count gives the highest conversion price,** so the note converts into the fewest shares: 1,260,000, against 1,470,000 in 13a and 1,330,000 in 13b. It switches latest, at $18.24M.
- **At $20M** the note gets $351,882.57 less than in 13a and $118,883.85 less than in 13b. That money goes to the founders.
