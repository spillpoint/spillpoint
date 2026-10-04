# Edge case 17a: derivation

A round case. A down round with a pay-to-play: existing Series A holders must buy their share of the new round, or lose their preferred.

## Before the down round

The history is edge case 14a's, except that two investors split the Series A:
- 6,000,000 founder common: Founder A 4,500,000, Founder B 1,500,000.
- A 1,500,000-share pool, with 500,000 options granted to Employee C.
- The Series A: $5M at a $20M pre-money valuation, with the pool topped up to 15%, at $2.50 a share. **Investor X** puts in $3,000,000 for 1,200,000 Series A shares, and **Investor W** $2,000,000 for 800,000. Series A is 1x non-participating with no anti-dilution.

So before the down round there are 10,000,000 fully diluted shares. Investor X holds 12% and Investor W 8%.

## The down round and its pay-to-play

The Series B raises **$3,000,000** at a **$12,000,000 pre-money** valuation, $15,000,000 post-money, with no pool target. Investor X invests $600,000 and new **Investor Y** $2,400,000. Investor W invests nothing.

**The pay-to-play terms:**
- **The amount offered:** the round offers **$1,000,000** to the Series A holders (`offered_amount`).
- **Each holder's pro-rata** is its share of the Series A × that $1,000,000 (`ASSUMPTIONS.md` R17):
  - Investor X: 1,200,000 ÷ 2,000,000 = 60%, so it must buy **$600,000**.
  - Investor W: 40%, so it must buy **$400,000**.
- **What happens to a holder who doesn't pay:** its Series A converts to common at **1 common share for every 10 Series A shares** (R18), and it loses its preference.

**Who pays:** Investor X buys exactly its $600,000, so it keeps its Series A. Investor W buys nothing, so its 800,000 Series A becomes 800,000 × 1/10 = **80,000 common**. A holder who bought only part of its pro-rata would be refused for now (R20).

## Pricing the round

The conversion takes effect just before the round closes, so the round is priced on the cap table after it (R19, the default):
- **Shares before the new money:** 10,000,000 − 800,000 + 80,000 = **9,280,000**.
- **Post-money fully diluted:** x = 9,280,000 + 20% of x, which gives x = **11,600,000**.
- **Price:** $15,000,000 ÷ 11,600,000 = **$1.293103** (exactly 75/58).
- **Series B shares:** Investor X $600,000 ÷ $1.293103 = **464,000**, and Investor Y $2,400,000 ÷ $1.293103 = **1,856,000**.

It is a down round ($1.29 against Series A's $2.50), but Series A has no anti-dilution. Pay-to-play in a round that triggers anti-dilution is refused for now (R21).

## Cap table after the Series B

| Holder | Security | Shares | Fully diluted % |
|---|---|---:|---:|
| Founder A | Common | 4,500,000 | 38.79% |
| Founder B | Common | 1,500,000 | 12.93% |
| Employee C | Options ($0.25) | 500,000 | 4.31% |
| Investor X | Series A Preferred | 1,200,000 | 10.34% |
| Investor X | Series B Preferred | 464,000 | 4.00% |
| Investor W | Common | 80,000 | 0.69% |
| Investor Y | Series B Preferred | 1,856,000 | 16.00% |
| Unissued pool | | 1,500,000 | 12.93% |
| **Total** | | **11,600,000** | **100.00%** |

Investor X holds 14.34% in all. Series B's original issue price and conversion price are $1.293103 (75/58), and it ranks senior to Series A. Series A now has only Investor X's 1,200,000 shares, so its preference is $3,000,000. Investor W's $2,000,000 preference is gone.

## What the pay-to-play did

| | No pay-to-play | Priced after the conversion (17a, this case) | Priced before it (17b, the R19 toggle) |
|---|---:|---:|---:|
| Price | $1.20 | $1.293103 | $1.20 |
| Series B to X / Y | 500,000 / 2,000,000 | 464,000 / 1,856,000 | 500,000 / 2,000,000 |
| Fully diluted total | 12,500,000 | 11,600,000 | 11,780,000 |
| Founders A + B | 48.00% | 51.72% | 50.93% |
| Investor X | 13.60% | 14.34% | 14.43% |
| Investor W | 6.40% | 0.69% | 0.68% |
| Investor Y | 16.00% | 16.00% | 16.98% |

- **Investor W gives up 720,000 shares and its preference.** At the round price its stake goes from about $960,000 (800,000 × $1.20 with no pay-to-play) to $103,448.28 (80,000 × $1.293103).
- **With the round priced after the conversion,** the $12M pre-money is spread over 720,000 fewer shares. The forfeited shares therefore benefit every remaining holder in proportion, and Investor Y still gets exactly its $2.4M ÷ $15M = 16%.
- **With the round priced before it** (the toggle), the new money buys at $1.20, so Investors X and Y take a larger share of what Investor W forfeits. Investor Y ends at 16.98%.

## Checking this independently

The answer is the post–Series B cap table above. These wrong rules give different numbers, so the case catches them:
- **Pricing before the conversion:** the third column above, which is edge case 17b.
- **Converting at the Series A conversion ratio (1:1) instead of 1 for 10:** Investor W keeps 800,000 shares (as common), the price is $1.20, and the total is 12,500,000.
- **Treating Investor W as not subject to pay-to-play:** the "no pay-to-play" column.

R17's measure, Series A share × the offered amount, isn't tested at a borderline: Investor X pays exactly its requirement and Investor W pays nothing. Under R6's pro-rata, X's requirement would be $423,529.41, and it would still pass.

Tolerance is 1 share for share counts.
