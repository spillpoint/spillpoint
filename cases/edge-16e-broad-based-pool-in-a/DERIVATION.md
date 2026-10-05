# Edge case 16e: derivation

A round case. Edge case 16a with the **unissued pool counted in A** (`ASSUMPTIONS.md` R7's toggle).

## Before the down round

The history is edge case 16a's:
- 6,000,000 founder common: Founder A 4,500,000, Founder B 1,500,000.
- A 1,500,000-share unissued pool, and 500,000 options granted to Employee C.
- **Investor X's Series A:** 2,000,000 shares at $2.50, with **broad-based weighted average** anti-dilution.

So there are 10,000,000 fully diluted shares.

## The down round

The Series B raises **$3,000,000** from **Investor Y** at a **$12,000,000 pre-money** valuation, $15,000,000 post-money, with no pool target. Its price is below the Series A's $2.50, so the Series A's conversion price is adjusted: CP2 = $2.50 × (A + B) ÷ (A + C).

## A with the pool

**The toggle is set twice, and the two must agree** (C10):
- the round sets `anti_dilution_include_unissued_pool_in_a`
- the Series A names `outstanding_common_options_preferred_and_unissued_pool` as its definition of A

So A counts 6,000,000 common + 500,000 options + 2,000,000 Series A + the **1,500,000** unissued pool = **10,000,000**, against 16a's 8,500,000.

## Pricing the round

As in 16a, the adjustment shares are counted in the price (R10):
- **Solving:** x = 10,000,000 + x/5 + 2,000,000 × ((10,000,000 + x/5) ÷ (10,000,000 + 1,200,000) − 1) gives x = 1,370,000,000/107 = **12,803,738.32**.
- **Price:** $15,000,000 ÷ x = **$1.171533** (exactly 321/274).
- **Investor Y:** $3,000,000 ÷ $1.171533 = **2,560,747** Series B.

## The new conversion price

From the shares actually issued (R8):
- **B** = 2,560,747 × $1.171533 ÷ $2.50 = 1,199,999.69.
- **CP2** = $2.50 × (10,000,000 + 1,199,999.69) ÷ (10,000,000 + 2,560,747) = **$2.229167**.

The conversion ratio becomes **1.121495**, so Investor X's 2,000,000 Series A convert into **2,242,990.60** common.

## Cap table after the Series B

| Holder | Security | Shares | Fully diluted % |
|---|---|---:|---:|
| Founder A | Common | 4,500,000 | 35.15% |
| Founder B | Common | 1,500,000 | 11.72% |
| Employee C | Options ($0.25) | 500,000 | 3.91% |
| Investor X | Series A Preferred | 2,000,000 (2,242,990.60 as converted) | 17.52% |
| Investor Y | Series B Preferred | 2,560,747 | 20.00% |
| Unissued pool | | 1,500,000 | 11.72% |
| **Total** | | **12,803,737.60** | **100.00%** |

## Compared with 16a

| | 16a (pool left out of A) | 16e (pool in A) |
|---|---:|---:|
| A | 8,500,000 | 10,000,000 |
| Price | $1.167019 | $1.171533 |
| CP2 | $2.190476 | $2.229167 |
| Investor X's Series A, as converted | 2,282,608.68 | 2,242,990.60 |

A bigger A dilutes the new issue's effect, so the adjustment is smaller. Investor X gets 39,618 fewer as-converted shares, and the founders keep slightly more.
