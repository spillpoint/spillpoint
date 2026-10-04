# Edge case 13b: derivation

This is edge case 13a with one term changed. The note's cap divides by common + all issued options, **without the unissued pool** (`ASSUMPTIONS.md` X10, `conversion_base: without_pool`). Everything else is the same as in 13a, including interest and repayment:
- $120,000 of interest over 730 days, so principal plus interest is $1,120,000
- repayment of 2 × $1,120,000 = **$2,240,000**, paid ahead of all equity as debt

## Conversion

- **Count:** 9,000,000 common + 500,000 options = 9,500,000. The note itself is not counted.
- **Conversion price:** $8,000,000 ÷ 9,500,000 = **$0.842105** (exactly 16/19).
- **Conversion shares:** $1,120,000 ÷ $0.842105 = **1,330,000**.

When the note converts, 9,000,000 + 1,330,000 = 10,330,000 shares share the proceeds. The options are out of the money and sit out. The note's share is 1,330,000 ÷ 10,330,000 = 133/1033, about **12.88%**.

## Breakpoints

| Exit value | Why |
|---:|---|
| $2,240,000 | The repayment is fully paid, as in 13a. Above this, the next dollar goes to common. |
| $17,397,894.74 | The note switches to conversion. 133/1033 of the exit value equals $2,240,000 at $2,240,000 × 1033/133 (exactly $330,560,000/19). |

Converting pays more once a common share is worth more than $2,240,000 ÷ 1,330,000 = $1.684211, which is 2× the conversion price. Each common share gets the exit value ÷ 10,330,000.

The options would come into the money above $51,650,000: ($E + $2.5M) ÷ (9,000,000 + 1,330,000 + 500,000) > $5.00. That is outside the $0 to $40M range.

## Payouts

| Exit | Founder A | Founder B | Employee C | Investor X (note) | Note takes |
|---:|---:|---:|---:|---:|---|
| $1M | 0 | 0 | 0 | 1,000,000 | repayment |
| $2M | 0 | 0 | 0 | 2,000,000 | repayment |
| $2.24M | 0 | 0 | 0 | 2,240,000 | repayment |
| $5M | 1,840,000 | 920,000 | 0 | 2,240,000 | repayment |
| $10M | 5,173,333.33 | 2,586,666.67 | 0 | 2,240,000 | repayment |
| $15M | 8,506,666.67 | 4,253,333.33 | 0 | 2,240,000 | repayment |
| $17,397,894.74 | 10,105,263.16 | 5,052,631.58 | 0 | 2,240,000 | indifferent; shown as repayment |
| $20M | 11,616,650.53 | 5,808,325.27 | 0 | 2,575,024.20 | conversion |
| $40M | 23,233,301.06 | 11,616,650.53 | 0 | 5,150,048.40 | conversion |

At $20M the note takes 133/1033 × $20M = $2,575,024.20, and common gets $17,424,975.80.

## Compared with 13a

- **Up to $15M** every payout is the same as in 13a, because the note takes its repayment in both.
- **Leaving out the pool** makes the count smaller and the conversion price higher, so the note converts into fewer shares: 1,330,000 instead of 1,470,000. It switches later, at $17.40M instead of $15.95M.
- **At $20M** the note gets $232,998.72 less than in 13a ($2,575,024.20 against $2,808,022.92), and that money goes to the founders.
