# Edge case 17c: derivation

A round case. Edge case 17a's down round, but Investor W buys part of its pay-to-play pro-rata instead of nothing.

## Before the down round

The history is edge case 17a's:
- 6,000,000 founder common: Founder A 4,500,000, Founder B 1,500,000.
- A 1,500,000-share pool, with 500,000 options granted to Employee C.
- The Series A at $2.50 a share: **Investor X** 1,200,000 shares and **Investor W** 800,000.

So before the down round there are 10,000,000 fully diluted shares. Series A is 1x non-participating with no anti-dilution.

## The down round and its pay-to-play

The Series B raises **$3,000,000** at a **$12,000,000 pre-money** valuation, $15,000,000 post-money, with no pool target:
- **Investor X:** $600,000
- **Investor W:** $200,000
- **Investor Y,** new: $2,200,000

The round offers **$1,000,000** to the Series A holders, so each must buy its share of it (`ASSUMPTIONS.md` R17):
- **Investor X:** 60%, so **$600,000**. It buys all of it and keeps its Series A.
- **Investor W:** 40%, so **$400,000**. It buys **$200,000**, half.

**A holder that buys only part (R20).** By default, all of its Series A converts, as if it had bought nothing: 800,000 × 1/10 = **80,000 common**. It loses its preference. It still gets Series B for the $200,000 it paid. Edge case 17d is the same round under the proportional reading.

## Pricing the round

The conversion takes effect just before the round closes, so the round is priced on the cap table after it (R19):
- **Shares before the new money:** 10,000,000 − 800,000 + 80,000 = **9,280,000**, as in 17a.
- **Post-money fully diluted:** x = 9,280,000 + 20% of x, so x = **11,600,000**.
- **Price:** $15,000,000 ÷ 11,600,000 = **$1.293103** (exactly 75/58), as in 17a.
- **Series B shares,** each rounded down (R3):
  - Investor X: $600,000 × 58/75 = **464,000**
  - Investor W: $200,000 × 58/75 = 154,666.67, so **154,666**
  - Investor Y: $2,200,000 × 58/75 = 1,701,333.33, so **1,701,333**

Rounding down leaves the fully diluted total at 11,599,999, one share under the solved 11,600,000.

## Cap table after the Series B

| Holder | Security | Shares | Fully diluted % |
|---|---|---:|---:|
| Founder A | Common | 4,500,000 | 38.79% |
| Founder B | Common | 1,500,000 | 12.93% |
| Employee C | Options ($0.25) | 500,000 | 4.31% |
| Investor X | Series A Preferred | 1,200,000 | 10.34% |
| Investor W | Common | 80,000 | 0.69% |
| Investor X | Series B Preferred | 464,000 | 4.00% |
| Investor W | Series B Preferred | 154,666 | 1.33% |
| Investor Y | Series B Preferred | 1,701,333 | 14.67% |
| Unissued pool | | 1,500,000 | 12.93% |
| **Total** | | **11,599,999** | **100.00%** |

Series B ranks senior to Series A. Series A now has only Investor X's 1,200,000 shares, a $3,000,000 preference.

## Compared with 17a and 17d

Investor W's $200,000 buys it 154,666 Series B. It doesn't save its Series A: its $2,000,000 preference is gone, exactly as if it had paid nothing (17a). Under the proportional reading (17d), it keeps half its Series A.
