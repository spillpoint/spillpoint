# Edge case 12d: derivation

## The company

- **Common:** Founder A 6,000,000 and Founder B 3,000,000.
- **Series A Preferred:** 1,000,000 shares, held by Investor P, bought at $2.00. A 1x non-participating preference of $2,000,000, in the senior tier.
- **Seed Preferred:** 2,000,000 shares, held by Investor S, bought at $0.50. A 1x non-participating preference of $1,000,000, in the junior tier.
- **Investor X's SAFE:** $1,000,000, post-money, with a $10,000,000 cap and no discount. Still outstanding at the sale.

## Where the SAFE stands (`ASSUMPTIONS.md` X1, X9)

**Its Cash-Out Amount** ranks "on par with" preferred, in the SAFE text. With two tiers, that means **the most junior tier**: it shares Seed's tier, pro rata by claim when there isn't enough. Series A is paid ahead of both.

**Its Conversion Amount** uses the Liquidity Price, the cap ÷ the Liquidity Capitalization. That count leaves out anything taking a cash-out or a liquidation preference **in lieu of converting**. So it depends on which series convert:
- **A series keeping its preference** is left out.
- **A series that converts** is counted, as common.

## Stage by stage

1. **Up to $2,000,000:** everything goes to Series A, until its $2,000,000 preference is paid.
2. **$2,000,000 to $4,000,000:** the junior tier. Seed's $1,000,000 preference and the SAFE's $1,000,000 Cash-Out Amount share it pro rata, half each. At $3M each has $500,000.
3. **Above $4,000,000:** common shares what is left: 9,000,000 shares.

## Seed converts at $8,500,000

Converting, Seed's 2,000,000 shares join common's 9,000,000, sharing what is left after Series A's $2,000,000 and the SAFE's $1,000,000. Seed's share is 2/11 of (exit value − $3,000,000). That equals its $1,000,000 preference at **$8,500,000**. Above that, Seed converts.

The SAFE's cash-out keeps its place: it is still paid ahead of common, after Series A.

## The SAFE converts at $12,000,000

**Its Liquidity Capitalization.** With Seed converted and Series A keeping its preference, the count is:
- **Counted:** common's 9,000,000 and Seed's 2,000,000, so everything else is 11,000,000 shares.
- **Left out:** Series A, which keeps its preference.
- **The SAFE's own shares:** its purchase amount over its cap, 1/10 of the count.

So:
- **Liquidity Capitalization:** 11,000,000 ÷ 0.9 = **12,222,222.22** (exactly 110,000,000/9).
- **Liquidity Price:** $10,000,000 ÷ 12,222,222.22 = **$0.818182** (exactly 9/11).
- **Conversion shares:** $1,000,000 ÷ $0.818182 = **1,222,222.22**.

Converting, the SAFE shares what is left after Series A's $2,000,000 with common and Seed: 12,222,222.22 shares in all. Its share, 1,222,222.22 ÷ 12,222,222.22, is exactly 1/10. One tenth of (exit value − $2,000,000) equals its $1,000,000 cash-out at **$12,000,000**.

**Why it matters that Series A is left out.** Counting Series A would raise the Liquidity Capitalization to 13,333,333.33. The Liquidity Price would fall to $0.75, the SAFE would get 1,333,333.33 shares, and it would switch earlier.

## Series A never converts in this range

Converting, Series A's 1,000,000 shares would take a share of the residual. With the SAFE converting and Series A counted, everyone shares the whole exit value over 13,333,333.33 shares. Series A's 1,000,000 would be worth its $2,000,000 preference only at $26,666,666.67. With the SAFE taking cash-out instead, that would be at $25,000,000. Both are outside this case's $0 to $20M range.

## Breakpoints

| Exit value | Why |
|---:|---|
| $2,000,000 | Series A's preference is fully paid. The next dollar goes to Seed and the SAFE's Cash-Out Amount, which share the junior tier. |
| $4,000,000 | The junior tier is fully paid: Seed's $1,000,000 and the SAFE's $1,000,000. Above this, common shares the residual. |
| $8,500,000 | Seed converts: 2/11 of (exit value − $3,000,000) equals its $1,000,000 preference. |
| $12,000,000 | The SAFE switches to its Conversion Amount: 1/10 of (exit value − $2,000,000) equals its $1,000,000 cash-out. |

## Payouts

| Exit | Founder A | Founder B | Investor S (Seed) | Investor P (Series A) | Investor X (SAFE) |
|---:|---:|---:|---:|---:|---:|
| $1M | 0 | 0 | 0 | 1,000,000 | 0 |
| $2M | 0 | 0 | 0 | 2,000,000 | 0 |
| $3M | 0 | 0 | 500,000 | 2,000,000 | 500,000 |
| $4M | 0 | 0 | 1,000,000 | 2,000,000 | 1,000,000 |
| $6M | 1,333,333.33 | 666,666.67 | 1,000,000 | 2,000,000 | 1,000,000 |
| $8.5M | 3,000,000 | 1,500,000 | 1,000,000 | 2,000,000 | 1,000,000 |
| $10M | 3,818,181.82 | 1,909,090.91 | 1,272,727.27 | 2,000,000 | 1,000,000 |
| $12M | 4,909,090.91 | 2,454,545.45 | 1,636,363.64 | 2,000,000 | 1,000,000 |
| $15M | 6,381,818.18 | 3,190,909.09 | 2,127,272.73 | 2,000,000 | 1,300,000 |
| $20M | 8,836,363.64 | 4,418,181.82 | 2,945,454.55 | 2,000,000 | 1,800,000 |

- **At $10M:** Seed has converted. After Series A's $2,000,000 and the SAFE's $1,000,000, $7,000,000 is shared by 11,000,000 shares: Seed 2/11, the founders 6/11 and 3/11.
- **At $15M:** the SAFE has converted too. $13,000,000 is shared by 12,222,222.22 shares, $1.063636 each. The SAFE's 1,222,222.22 shares get exactly 1/10, $1,300,000.
- **At $8.5M and $12M:** the converting holder is indifferent. The case shows it keeping its preference or Cash-Out Amount (`ASSUMPTIONS.md` E5), and the payouts are identical either way.
