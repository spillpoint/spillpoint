# Edge case 13a: derivation

This is edge case 12's company (9,000,000 common, 500,000 options at $5.00, a 1,000,000-share unissued pool), with a convertible note in place of the SAFE.

## The note's terms

Investor X lent the company $1,000,000 on 2022-01-01, at 6% simple interest and with an $8,000,000 pre-money valuation cap. There is no discount. The company is sold on 2024-01-01, before any priced round has converted the note. At the sale, the holder gets the **greater** of two amounts (`ASSUMPTIONS.md` X3, X10, X11):

- **Repayment:** 2× its principal plus accrued interest. The note is debt, so this is paid ahead of all equity.
- **Conversion:** its principal plus accrued interest converts into common at the cap, and it is paid alongside common on those shares.

## Interest, repayment and conversion

- **Interest:** 730 days from 2022-01-01 to 2024-01-01, at Actual/365 (X3): $1,000,000 × 6% × 730/365 = **$120,000**. Principal plus interest is **$1,120,000**.
- **Repayment:** 2 × $1,120,000 = **$2,240,000**.
- **Conversion price:** the cap divided by common + all issued options + the unissued pool, just before the sale (X10). The note itself is not counted. The cap is pre-money, so the note's shares sit on top of that count, unlike case 12's post-money SAFE, which is counted inside its own.
  - Count: 9,000,000 + 500,000 + 1,000,000 = 10,500,000
  - Price: $8,000,000 ÷ 10,500,000 = **$0.761905** (exactly 16/21)
- **Conversion shares:** principal and interest both convert (X11): $1,120,000 ÷ $0.761905 = **1,470,000** shares. This happens to be a whole number. It would not be rounded if it weren't, because at exit as-converted shares are exact (E2).

## Who shares the proceeds when the note converts

These are the 9,000,000 common plus the note's 1,470,000, so 10,470,000 shares. The options are out of the money, so they sit out, although they did count toward the conversion price. The note's share is 1,470,000 ÷ 10,470,000 = 49/349, about **14.04%** of the exit value.

## Breakpoints

| Exit value | Why |
|---:|---|
| $2,240,000 | The repayment is fully paid. Below this, every dollar goes to the note. Above it, the next dollar goes to common. |
| $15,954,285.71 | The note switches to conversion. 49/349 of the exit value equals $2,240,000 at $2,240,000 × 349/49 (exactly $111,680,000/7). Above this, converting pays more. |

Put another way, converting pays more once a common share is worth more than the repayment divided by the conversion shares: $2,240,000 ÷ 1,470,000 = $1.523810. That is 2× the conversion price, because the 2× multiple applies to the same $1,120,000 that converts. Each common share gets the exit value ÷ 10,470,000, which reaches $1.523810 at $15,954,285.71.

Between $2,240,000 and $15,954,285.71, the note is flat at $2,240,000 and common takes every extra dollar. Above that, common takes 300/349 of each dollar (about 86.0%) and the note takes 49/349.

**The options never come into the money in this range.** At $40M a common share is worth $3.82, below the $5.00 strike. With the note converted, the options would be exercised once ($E + $2.5M of strike cash) ÷ (9,000,000 + 1,470,000 + 500,000) > $5.00. That is above **$52,350,000**, outside this case's $0 to $40M range, so it is not on the breakpoint list.

## Payouts

| Exit | Founder A | Founder B | Employee C | Investor X (note) | Note takes |
|---:|---:|---:|---:|---:|---|
| $1M | 0 | 0 | 0 | 1,000,000 | repayment |
| $2M | 0 | 0 | 0 | 2,000,000 | repayment |
| $2.24M | 0 | 0 | 0 | 2,240,000 | repayment |
| $5M | 1,840,000 | 920,000 | 0 | 2,240,000 | repayment |
| $10M | 5,173,333.33 | 2,586,666.67 | 0 | 2,240,000 | repayment |
| $15M | 8,506,666.67 | 4,253,333.33 | 0 | 2,240,000 | repayment |
| $15,954,285.71 | 9,142,857.14 | 4,571,428.57 | 0 | 2,240,000 | indifferent; shown as repayment |
| $20M | 11,461,318.05 | 5,730,659.03 | 0 | 2,808,022.92 | conversion |
| $40M | 22,922,636.10 | 11,461,318.05 | 0 | 5,616,045.85 | conversion |

- **At $5M:** the note takes $2,240,000 and common gets $2,760,000, which the founders split 2:1 by shares.
- **At $20M:** the note takes 49/349 × $20M = $2,808,022.92, and common gets $17,191,977.08.

At exactly $15,954,285.71 both amounts pay the same. The case shows the note taking repayment (`ASSUMPTIONS.md` E5), and the payouts are identical either way.

Employee C's options get nothing at every listed exit value.

## What the toggle changes

What the cap divides by is a toggle (X10), because notes have no standard form. This case uses the default, "with pool". Cases 13b and 13c are this case with the other two settings:

| Case | Cap divides by | Conversion price | Conversion shares | Switch to conversion | Note at $20M |
|---|---|---:|---:|---:|---:|
| 13a (this case) | Common + options + pool | $0.761905 | 1,470,000 | $15,954,285.71 | $2,808,022.92 |
| 13b | Common + options, no pool | $0.842105 | 1,330,000 | $17,397,894.74 | $2,575,024.20 |
| 13c | Common only | $0.888889 | 1,260,000 | $18,240,000.00 | $2,456,140.35 |

The repayment breakpoint stays at $2,240,000 under every setting.

## Checking this independently

Converting the principal alone, without the interest, would be a different rule (X11). It would give 1,312,500 shares, move the switch to $17,600,000, and pay the note $2,545,454.55 at $20M.
