# Edge case 17b: derivation

This is edge case 17a with one term changed. The Series B is **priced on the share count before the pay-to-play conversion** (`priced_after_conversion: false`, the R19 toggle). Some deals set the price this way. Everything else is the same as in 17a.

## Before the down round

The history is 17a's. There are 10,000,000 fully diluted shares:
- founders 6,000,000 common
- Employee C 500,000 options
- Investor X 1,200,000 Series A and Investor W 800,000 Series A, at $2.50
- a 1,500,000-share unissued pool

The Series B raises **$3,000,000** at a **$12,000,000 pre-money** valuation. Investor X invests $600,000, Investor Y $2,400,000, and Investor W nothing.

## The pay-to-play

The terms are the same as in 17a. The round offers $1,000,000 to the Series A holders, and each must buy its share of it (R17): Investor X $600,000, Investor W $400,000. Investor X pays and keeps its Series A. Investor W doesn't, so its 800,000 Series A converts to **80,000 common** at 1 for 10 (R18).

## Pricing the round

With the toggle off, the price is set before the conversion, on the 10,000,000 shares as they stand then:
- **Post-money fully diluted:** x = 10,000,000 + 20% of x, which gives x = **12,500,000**.
- **Price:** $15,000,000 ÷ 12,500,000 = **$1.20**, which is simply $12M ÷ 10,000,000.
- **Series B shares:** Investor X $600,000 ÷ $1.20 = **500,000**, and Investor Y $2,400,000 ÷ $1.20 = **2,000,000**.

Then Investor W's conversion takes effect. Its 800,000 Series A becomes 80,000 common, so the cap table ends at 12,500,000 − 720,000 = **11,780,000** shares, not the 12,500,000 the price was set on.

## Cap table after the Series B

| Holder | Security | Shares | Fully diluted % |
|---|---|---:|---:|
| Founder A | Common | 4,500,000 | 38.20% |
| Founder B | Common | 1,500,000 | 12.73% |
| Employee C | Options ($0.25) | 500,000 | 4.24% |
| Investor X | Series A Preferred | 1,200,000 | 10.19% |
| Investor X | Series B Preferred | 500,000 | 4.24% |
| Investor W | Common | 80,000 | 0.68% |
| Investor Y | Series B Preferred | 2,000,000 | 16.98% |
| Unissued pool | | 1,500,000 | 12.73% |
| **Total** | | **11,780,000** | **100%** |

The percentages are rounded, so they add up to 99.99%. The founders hold 50.93% and Investor X 14.43% in all. Series B's original issue price and conversion price are $1.20, and it ranks senior to Series A.

## Compared with 17a

| | 17a (priced after the conversion) | 17b (priced before it) |
|---|---:|---:|
| Price | $1.293103 | $1.20 |
| Series B to X / Y | 464,000 / 1,856,000 | 500,000 / 2,000,000 |
| Fully diluted total | 11,600,000 | 11,780,000 |
| Founders A + B | 51.72% | 50.93% |
| Investor X | 14.34% | 14.43% |
| Investor W | 0.69% | 0.68% |
| Investor Y | 16.00% | 16.98% |

Investor W forfeits the same 720,000 shares either way. What changes is who gets the benefit:
- **In 17a,** the round is priced after the forfeit. The $12M pre-money then covers 720,000 fewer shares, so every remaining holder gains in proportion, and the new money gets exactly its $3M ÷ $15M.
- **In 17b,** the new money buys at $1.20, the price before the forfeit. So it ends with more than $3M ÷ $15M: Investor Y has 16.98% instead of 16%. Investors X and Y take a larger share of what Investor W gave up, and the founders a smaller one.

## Checking this independently

The answer is the post–Series B cap table above. 17a's numbers are what you get if the round is priced after the conversion, so the pair tells the two settings of the toggle apart. Tolerance is 1 share for share counts.
