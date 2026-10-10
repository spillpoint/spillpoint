# Edge case 13i: derivation

A post-money SAFE beside a capped note at a sale, in a company with only common stock. This is the simplest case under X18's four rules (0.5.0 plan, answer 11). `expected.json` comes from the reference, as for every exit case.

## The company

- **Common:** Founder A 6,000,000 and Founder B 4,000,000, so 10,000,000 shares. There are no options, no pool and no preferred.
- **Investor S's SAFE:** $1,000,000, a $10,000,000 post-money cap, no discount.
- **Investor N's note:**
  - $1,000,000 at 5% simple interest, from Jan 1, 2023
  - a $5,000,000 pre-money cap, its base counted with the pool (`with_pool`)
  - no discount
  - repaid at 2x
- **The sale** is on Jan 1, 2024.

## The two instruments, on their own

**The note:**
- **Interest:** Jan 1, 2023 to Jan 1, 2024 is 365 days, so $1,000,000 × 5% = $50,000. $1,050,000 converts.
- **Repayment:** 2 × $1,050,000 = **$2,100,000**.
- **Its base:** the shares just before the sale, 10,000,000, with no pool or options to add. X18's rule 3: it counts no SAFE.
- **Converting:** at $5,000,000 ÷ 10,000,000 = **$0.50** a share, so $1,050,000 ÷ $0.50 = **2,100,000 shares**. They don't depend on anything else.

**The SAFE:**
- **Cash-Out Amount:** its $1,000,000 purchase amount.
- **Conversion Amount:** it converts on its Liquidity Capitalization (LC). Its conversion shares are purchase ÷ cap, a tenth, of the LC, so it holds 10% of the shares counted.
- **The LC** counts the common, and the note's 2,100,000 shares when the note converts (X18's rule 2). A note being repaid takes payment in lieu of converting, and isn't counted.
  - **Note repaid:** LC = 10,000,000 ÷ 0.9 = **11,111,111.11**, so the SAFE converts into 1,111,111.11 shares.
  - **Note converting:** LC = (10,000,000 + 2,100,000) ÷ 0.9 = **13,444,444.44**, so the SAFE converts into 1,344,444.44 shares.

## The order of payment (X18's rule 1)

1. **The note's repayment**, $2,100,000, is debt, paid first.
2. **The SAFE's Cash-Out Amount**, $1,000,000, comes next, ahead of common.
3. **Common** shares the rest, with the SAFE and the note if they convert.

## Breakpoints

| Exit value | Why |
|---:|---|
| $2,100,000 | The note is repaid in full, 2 × $1,050,000. |
| $3,100,000 | The SAFE's $1,000,000 Cash-Out Amount is paid in full. Above this, common gets the next dollar. |
| $12,100,000 | **The SAFE converts.** The note is still repaid, so the SAFE converts on 11,111,111.11: a tenth of what's left after the repayment. That's $1,000,000 when what's left is $10,000,000, so at $2,100,000 + $10,000,000. Nothing jumps: converting pays the SAFE exactly its cash, and leaves common the same $9,000,000. |
| $13,444,444.44 | **The note converts, and payouts jump.** With the SAFE converting, the company is 13,444,444.44 shares once the note converts. Its 2,100,000 are worth its $2,100,000 repayment when a share is worth $1.00, at $13,444,444.44. **Below:** the note takes $2,100,000, the SAFE 10% of the rest, $1,134,444.44, and common $10,210,000. **Just above:** the note's shares join the SAFE's LC, so the SAFE converts into 1,344,444.44 shares, and everything is shared at $1.00. The SAFE gets $1,344,444.44 and common $10,000,000. So the SAFE's payout jumps up $210,000, and common's down the same. At exactly this exit value, the note is indifferent and is repaid, so the outcome from below holds there (X16). |

**Below $12,100,000** the note is repaid and the SAFE takes its cash. Converting the note there wouldn't pay:
- **With the SAFE taking cash,** the note's shares are worth its repayment only once common reaches (X − $1,000,000) × 2,100,000 ÷ 12,100,000 = $2,100,000, at X = $13,100,000.
- **With the SAFE converting,** they're worth it only from $13,444,444.44.

**What rule 2 changes:** if the LC left the converting note out, the SAFE would always convert into 1,111,111.11 shares. The note would then convert at 2,100,000 ÷ 13,211,111.11 of the exit value equalling $2,100,000, at $13,211,111.11, and nothing would jump.

## Payouts by holder

| Holder | $1M | $2.5M | $8M | $12.5M | $13M | $20M | $40M |
|---|---:|---:|---:|---:|---:|---:|---:|
| Founder A | 0 | 0 | 2,940,000.00 | 5,616,000.00 | 5,886,000.00 | 8,925,619.83 | 17,851,239.67 |
| Founder B | 0 | 0 | 1,960,000.00 | 3,744,000.00 | 3,924,000.00 | 5,950,413.22 | 11,900,826.45 |
| Investor S | 0 | 400,000.00 | 1,000,000.00 | 1,040,000.00 | 1,090,000.00 | 2,000,000.00 | 4,000,000.00 |
| Investor N | 1,000,000.00 | 2,100,000.00 | 2,100,000.00 | 2,100,000.00 | 2,100,000.00 | 3,123,966.94 | 6,247,933.88 |
| *Common, a share* | $0 | $0 | $0.490000 | $0.936000 | $0.981000 | $1.487603 | $2.975207 |

**Four to check by hand:**
- **$2.5M:** the note takes its $2,100,000 first, and the SAFE gets the $400,000 left.
- **$8M:** the note takes $2,100,000 and the SAFE $1,000,000. Common shares $4,900,000, $0.49 a share.
- **$12.5M:**
  - The note is repaid $2,100,000. The SAFE converts on 11,111,111.11 shares, 1,111,111.11 of them its own, and $10,400,000 is left.
  - That's $0.936 a share, so the SAFE gets $1,040,000, a tenth of what's left.
- **$20M:**
  - Both convert. The company is 13,444,444.44 shares: 10,000,000 common, the note's 2,100,000 and the SAFE's 1,344,444.44.
  - A share is $20,000,000 ÷ 13,444,444.44 = $1.487603. The SAFE gets $2,000,000, a tenth of the sale, and the note 2,100,000 × $1.487603 = $3,123,966.94.
