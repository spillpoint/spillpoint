# Edge case 12: derivation

## The SAFE's terms

A post-money SAFE is a promise of shares in a future priced round. Here the company is sold before any such round, so the SAFE never converts into stock. Instead, the sale pays the SAFE holder (Investor X) cash: the **greater** of two amounts (`SPEC.md`; `ASSUMPTIONS.md` X1).

- **Cash-Out Amount: its money back.** That is the $1,000,000 purchase amount. It is paid ahead of common, like a 1x non-participating preference. (It ranks behind any debt; this company has none.)
- **Conversion Amount: what it would get as a common holder.** The SAFE is treated as holding (purchase amount ÷ Liquidity Price) common shares and is paid alongside common on them. No shares are actually issued; this is only how the cash amount is worked out.

The **Liquidity Price** is the valuation cap divided by the **Liquidity Capitalization**, which is a share count taken just before the sale. It counts:
- all issued stock (the 9,000,000 common)
- all issued options, whether or not they are in the money (the 500,000 at $5.00)
- the SAFE's own conversion shares

It leaves out the 1,000,000-share unissued pool. A SAFE that takes its Cash-Out Amount is left out of the count too, but then its Liquidity Price is never used. So whenever the price matters, the SAFE's own shares are in the count.

The SAFE has no discount. At a sale, only the cap matters.

## Liquidity Capitalization and Liquidity Price

The SAFE's conversion shares are its purchase amount ÷ (cap ÷ LC). That works out to $1M ÷ $10M = 10% of the Liquidity Capitalization: a post-money SAFE owns its purchase amount over its cap, as a share of the company. Everything else is the other 90%:

- Everything else: 9,000,000 common + 500,000 options = 9,500,000 shares
- Liquidity Capitalization: 9,500,000 ÷ 0.9 = **10,555,555.56** (exactly 95,000,000/9)
- Liquidity Price: $10,000,000 ÷ 10,555,555.56 = **$0.947368** (exactly 18/19)
- Conversion shares: $1,000,000 ÷ $0.947368 = **1,055,555.56** (exactly 9,500,000/9)

The conversion shares are **not rounded**. At exit, as-converted shares are exact (`SPEC.md`, Rounding; `ASSUMPTIONS.md` E2). The SAFE is paid cash on this number of shares, so there is no stock to round.

## Who shares the proceeds when the SAFE converts

These are the 9,000,000 common plus the SAFE's 1,055,555.56, so 10,055,555.56 shares. The options are out of the money, so they sit out. The SAFE's share is 1,055,555.56 ÷ 10,055,555.56 = 19/181, about **10.497%** of the exit value.

## Breakpoints

| Exit value | Why |
|---:|---|
| $1,000,000 | The Cash-Out Amount is fully paid. Below this, every dollar goes to the SAFE. Above it, the next dollar goes to common. |
| $9,526,315.79 | The SAFE switches to its Conversion Amount. 19/181 of the exit value equals $1,000,000 at $181,000,000 ÷ 19. Above this, the Conversion Amount pays more. |

Put another way, the SAFE switches once a common share is worth more than the Liquidity Price. Each common share gets the exit value ÷ 10,055,555.56. That reaches $0.947368 at $0.947368 × 10,055,555.56 = $9,526,315.79.

**Why the switch is below the $10M cap.** The 500,000 out-of-the-money options count in the Liquidity Capitalization, which lowers the Liquidity Price, but they take no share of the proceeds. If the options either shared in the proceeds or were left out of the count, the switch would be at exactly $10M.

Between $1M and $9,526,315.79, the SAFE is flat at $1M and common takes every extra dollar. Above that, common takes 162/181 of each dollar (about 89.5%) and the SAFE takes 19/181.

**The options never come into the money in this range.** At $40M a common share is worth $3.98, below the $5.00 strike. With the SAFE converted, the options would be exercised once ($E + $2.5M of strike cash) ÷ (9,000,000 + 1,055,555.56 + 500,000) > $5.00. That is above about **$50.28M** ($50,277,777.78), outside this case's $0 to $40M range, so it is not on the breakpoint list. They still count in the Liquidity Capitalization throughout.

## Payouts

| Exit | Founder A | Founder B | Employee C | Investor X (SAFE) | SAFE takes |
|---:|---:|---:|---:|---:|---|
| $0.5M | 0 | 0 | 0 | 500,000 | Cash-Out Amount |
| $1M | 0 | 0 | 0 | 1,000,000 | Cash-Out Amount |
| $5M | 2,666,666.67 | 1,333,333.33 | 0 | 1,000,000 | Cash-Out Amount |
| $9M | 5,333,333.33 | 2,666,666.67 | 0 | 1,000,000 | Cash-Out Amount |
| $9,526,315.79 | 5,684,210.53 | 2,842,105.26 | 0 | 1,000,000 | indifferent; shown as Cash-Out Amount |
| $10M | 5,966,850.83 | 2,983,425.41 | 0 | 1,049,723.76 | Conversion Amount |
| $20M | 11,933,701.66 | 5,966,850.83 | 0 | 2,099,447.51 | Conversion Amount |
| $40M | 23,867,403.31 | 11,933,701.66 | 0 | 4,198,895.03 | Conversion Amount |

- **At $5M:** the SAFE takes $1M and common gets $4M, which the founders split 2:1 by shares (6,000,000 and 3,000,000).
- **At $20M:** the SAFE takes 19/181 × $20M = $2,099,447.51, and common gets $17,900,552.49.

At exactly $9,526,315.79 both amounts pay the same. The case shows the SAFE taking its Cash-Out Amount (`ASSUMPTIONS.md` E5), and the payouts are identical either way.

Employee C's options get nothing at every listed exit value.

## Checking this independently

Rounding the conversion shares down to 1,055,555 would be a different rule, not this case. It would move the switch to $9,526,320.28 and take $1.98 off the SAFE at $40M, which is outside the $1 tolerance.
