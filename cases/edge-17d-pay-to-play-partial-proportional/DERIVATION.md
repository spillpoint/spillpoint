# Edge case 17d: derivation

A round case. Edge case 17c under the proportional reading of partial participation (`ASSUMPTIONS.md` R20, the `convert_proportionally` toggle).

## Before the down round

The history is edge case 17a's:
- 6,000,000 founder common: Founder A 4,500,000, Founder B 1,500,000.
- A 1,500,000-share pool, with 500,000 options granted to Employee C.
- The Series A at $2.50 a share: **Investor X** 1,200,000 shares and **Investor W** 800,000.

So before the down round there are 10,000,000 fully diluted shares.

## The down round and its pay-to-play

The same round as 17c: $3,000,000 at $12,000,000 pre-money. Investor X buys its required $600,000. Investor W buys $200,000 of its required $400,000, so it bought **half** its pro-rata.

**Under the proportional reading,** a holder converts only the fraction it didn't buy. It keeps floor(shares × fraction bought) as preferred:
- **Investor W keeps** floor(800,000 × 1/2) = **400,000 Series A**.
- **The other 400,000 convert** at 1 common for 10: **40,000 common**.

## Pricing the round

Priced after the conversion (R19):
- **Shares before the new money:** 10,000,000 − 400,000 + 40,000 = **9,640,000**.
- **Post-money fully diluted:** x = 9,640,000 + 20% of x, so x = **12,050,000**.
- **Price:** $15,000,000 ÷ 12,050,000 = **$1.244813** (exactly 300/241).
- **Series B shares,** each rounded down:
  - Investor X: $600,000 × 241/300 = **482,000**
  - Investor W: $200,000 × 241/300 = 160,666.67, so **160,666**
  - Investor Y: $2,200,000 × 241/300 = 1,767,333.33, so **1,767,333**

The fully diluted total is 12,049,999, one share under the solved count.

## Cap table after the Series B

| Holder | Security | Shares | Fully diluted % |
|---|---|---:|---:|
| Founder A | Common | 4,500,000 | 37.34% |
| Founder B | Common | 1,500,000 | 12.45% |
| Employee C | Options ($0.25) | 500,000 | 4.15% |
| Investor X | Series A Preferred | 1,200,000 | 9.96% |
| Investor W | Series A Preferred | 400,000 | 3.32% |
| Investor W | Common | 40,000 | 0.33% |
| Investor X | Series B Preferred | 482,000 | 4.00% |
| Investor W | Series B Preferred | 160,666 | 1.33% |
| Investor Y | Series B Preferred | 1,767,333 | 14.67% |
| Unissued pool | | 1,500,000 | 12.45% |
| **Total** | | **12,049,999** | **100.00%** |

Series A has 1,600,000 shares, a $4,000,000 preference. Investor W keeps $1,000,000 of its original $2,000,000.

## Compared with 17c

Fewer shares are forfeited, so the price is lower: $1.244813 against $1.293103. Investor W keeps half its Series A and its preference.
