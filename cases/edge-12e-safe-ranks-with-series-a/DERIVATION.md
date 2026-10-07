# Edge case 12e: derivation

This is edge case 12d's company and SAFE, with one change: the SAFE's Cash-Out Amount ranks with **Series A**, the senior tier, instead of the most junior. The SAFE names the series in its terms: `"cash_out_ranks_with": "series_a"` (`ASSUMPTIONS.md` X9).

## The company

- **Common:** Founder A 6,000,000 and Founder B 3,000,000.
- **Series A Preferred:** 1,000,000 shares, held by Investor P, bought at $2.00. A 1x non-participating preference of $2,000,000, in the senior tier.
- **Seed Preferred:** 2,000,000 shares, held by Investor S, bought at $0.50. A 1x non-participating preference of $1,000,000, in the junior tier.
- **Investor X's SAFE:** $1,000,000, post-money, with a $10,000,000 cap and no discount. Still outstanding at the sale.

## Stage by stage

1. **Up to $3,000,000:** the senior tier. Series A's $2,000,000 preference and the SAFE's $1,000,000 Cash-Out Amount share it pro rata by claim: Series A two thirds, the SAFE one third. At $1M, Series A has $666,666.67 and the SAFE $333,333.33.
2. **$3,000,000 to $4,000,000:** Seed's $1,000,000 preference.
3. **Above $4,000,000:** common shares what is left: 9,000,000 shares.

In 12d, Series A was paid first, and Seed and the SAFE shared the junior tier. Above $4,000,000 both are paid in full either way, so **from here every payout is 12d's.**

## Seed converts at $8,500,000

Converting, Seed's 2,000,000 shares join common's 9,000,000, sharing what is left after Series A's $2,000,000 and the SAFE's $1,000,000. Seed's share is 2/11 of (exit value − $3,000,000). That equals its $1,000,000 preference at **$8,500,000**.

## The SAFE converts at $12,000,000

Its Liquidity Capitalization is 12d's (`ASSUMPTIONS.md` X1): where it ranks doesn't change what it counts.
- **Counted:** common's 9,000,000 and Seed's 2,000,000, now converted.
- **Left out:** Series A, which keeps its preference.
- **Liquidity Capitalization:** 11,000,000 ÷ (1 − $1M/$10M) = **12,222,222.22** (exactly 110,000,000/9).
- **Liquidity Price:** **$0.818182** (9/11).
- **Conversion shares:** **1,222,222.22**, one tenth of the count.

Converting, the SAFE gets one tenth of (exit value − $2,000,000). That equals its $1,000,000 cash-out at **$12,000,000**. Series A never converts in this range, as in 12d.

## Breakpoints

| Exit value | Why |
|---:|---|
| $3,000,000 | The senior tier is fully paid: Series A's $2,000,000 and the SAFE's $1,000,000. The next dollar goes to Seed's preference. |
| $4,000,000 | Seed's preference is fully paid. Above this, common shares the residual. |
| $8,500,000 | Seed converts: 2/11 of (exit value − $3,000,000) equals its $1,000,000 preference. |
| $12,000,000 | The SAFE switches to its Conversion Amount: 1/10 of (exit value − $2,000,000) equals its $1,000,000 cash-out. |

## Payouts

| Exit | Founder A | Founder B | Investor S (Seed) | Investor P (Series A) | Investor X (SAFE) |
|---:|---:|---:|---:|---:|---:|
| $1M | 0 | 0 | 0 | 666,666.67 | 333,333.33 |
| $2M | 0 | 0 | 0 | 1,333,333.33 | 666,666.67 |
| $3M | 0 | 0 | 0 | 2,000,000 | 1,000,000 |
| $3.5M | 0 | 0 | 500,000 | 2,000,000 | 1,000,000 |
| $4M | 0 | 0 | 1,000,000 | 2,000,000 | 1,000,000 |
| $6M | 1,333,333.33 | 666,666.67 | 1,000,000 | 2,000,000 | 1,000,000 |
| $10M | 3,818,181.82 | 1,909,090.91 | 1,272,727.27 | 2,000,000 | 1,000,000 |
| $15M | 6,381,818.18 | 3,190,909.09 | 2,127,272.73 | 2,000,000 | 1,300,000 |
| $20M | 8,836,363.64 | 4,418,181.82 | 2,945,454.55 | 2,000,000 | 1,800,000 |

**Compared with 12d at $3M:**
- **Here:** Series A $2,000,000, the SAFE $1,000,000, Seed nothing.
- **In 12d:** Series A $2,000,000, the SAFE $500,000, Seed $500,000.
