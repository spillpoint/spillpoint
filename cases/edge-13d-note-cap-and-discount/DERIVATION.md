# Edge case 13d: derivation

This is edge case 13a's company and note, with two changes:
- **A 20% discount** on the note.
- **Repaid at 1x** principal plus interest, instead of 2x.

The company: 9,000,000 common (Founder A 6,000,000, Founder B 3,000,000), 500,000 options at $5.00, and a 1,000,000-share unissued pool.

## The rule

At a sale, a note with a cap converts at its **cap price only**. The discount applies at a sale only to a note that has no cap (`ASSUMPTIONS.md` X12). This mirrors the SAFE (X9).

Notes have no standard form, and some apply the discount at a sale too. X12 records that.

## Why 1x repayment

At 2x, as in edge case 13a, converting at the discount would never beat repayment:
- **Converting at the discount** is worth principal plus interest ÷ 0.8, which is 1.25x.
- **Repayment** is 2x.

So the case couldn't tell the two rules apart. At 1x, it can.

## Interest, repayment and conversion

As in edge case 13a:
- **Interest:** 730 days at 6% simple, Actual/365: **$120,000**, so **$1,120,000** of principal plus interest.
- **Repayment:** 1 × $1,120,000 = **$1,120,000**, paid ahead of all equity as debt.
- **Conversion at the cap:** $8,000,000 ÷ 10,500,000 shares (common, options and pool) = **$0.761905** (exactly 16/21). That gives $1,120,000 ÷ $0.761905 = **1,470,000** shares.

Converting, the note's 1,470,000 shares join common's 9,000,000: the note gets 1,470,000/10,470,000 = 49/349 of the exit value. That equals its $1,120,000 repayment at $1,120,000 × 349/49 = **$7,977,142.86** (exactly 55,840,000/7). Above that, the note converts.

## Breakpoints

| Exit value | Why |
|---:|---|
| $1,120,000 | The repayment is fully paid. Above this, the next dollar goes to common. |
| $7,977,142.86 | The note switches to conversion at its cap price. |

**The options never come into the money in this range.** As in 13a, they would be exercised only above $52,350,000.

## Payouts

| Exit | Founder A | Founder B | Employee C | Investor X (note) | Note takes |
|---:|---:|---:|---:|---:|---|
| $1M | 0 | 0 | 0 | 1,000,000 | repayment |
| $1.12M | 0 | 0 | 0 | 1,120,000 | repayment |
| $2M | 586,666.67 | 293,333.33 | 0 | 1,120,000 | repayment |
| $5M | 2,586,666.67 | 1,293,333.33 | 0 | 1,120,000 | repayment |
| $7,977,142.86 | 4,571,428.57 | 2,285,714.29 | 0 | 1,120,000 | indifferent; shown as repayment |
| $10M | 5,730,659.03 | 2,865,329.51 | 0 | 1,404,011.46 | conversion |
| $20M | 11,461,318.05 | 5,730,659.03 | 0 | 2,808,022.92 | conversion |
| $40M | 22,922,636.10 | 11,461,318.05 | 0 | 5,616,045.85 | conversion |

## Why this case tells the rules apart

Applying the discount at this sale would let the note convert at the lower of its cap price and the common price less 20%. The discount price is the lower one at modest exits. There, converting would be worth $1,120,000 ÷ 0.8 = $1,400,000 once there is room for it (edge case 13e works through this). So:
- **The note would switch** at $1,400,000, not $7,977,142.86.
- **It would take $1,400,000** at $2M and $5M, not $1,120,000.
