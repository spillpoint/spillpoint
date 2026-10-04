# Edge case 16d: derivation

This is edge case 16a with one term changed. The Series B is **priced without counting Series A's anti-dilution shares** (`anti_dilution_shares_in_post: false`, the R10 toggle). Series A's anti-dilution is still the broad-based weighted average, with A = outstanding common, options and preferred as converted (R7). Some deals price the new round this way.

## Before the down round

The history is 16a's. There are 10,000,000 fully diluted shares: 6,000,000 common, 500,000 options, 2,000,000 Series A (convertible 1:1, CP1 = $2.50), and a 1,500,000-share unissued pool. Investor Y invests **$3,000,000** in Series B at a **$12,000,000 pre-money** valuation, $15,000,000 post-money, with no pool target.

## Pricing the round

With the toggle off, the post-money fully diluted shares the price is set on leave out the anti-dilution shares. So nothing is circular:
- x = 10,000,000 + 20% of x, which gives x = **12,500,000**.
- **Price:** $15,000,000 ÷ 12,500,000 = **$1.20**, which is simply $12M ÷ the 10,000,000 pre-round shares.
- **Series B shares:** $3,000,000 ÷ $1.20 = **2,500,000**.

## Series A's adjustment

The same broad-based formula as 16a, CP2 = CP1 × (A + B) ÷ (A + C):
- **A** = 6,000,000 + 500,000 + 2,000,000 = **8,500,000**
- **B** = 2,500,000 × $1.20 ÷ $2.50 = **1,200,000**. The shares are whole, so the cash actually paid is the full $3M (R8).
- **C** = **2,500,000**
- **CP2** = $2.50 × 9,700,000 ÷ 11,000,000 = **$2.204545** (exactly 97/44, or 24.25/11)
- **Series A as converted:** 2,000,000 × $2.50 ÷ $2.204545 = **2,268,041.24** common shares, a conversion ratio of 110/97 (1.134021)

The extra 268,041.24 Series A conversion shares arrive after the price is set. So they dilute everyone, Investor Y included, and the cap table totals 12,768,041.24, not the 12,500,000 the price was set on.

## Cap table after the Series B

| Holder | Security | Shares | As converted | Fully diluted % |
|---|---|---:|---:|---:|
| Founder A | Common | 4,500,000 | 4,500,000 | 35.24% |
| Founder B | Common | 1,500,000 | 1,500,000 | 11.75% |
| Employee C | Options ($0.25) | 500,000 | 500,000 | 3.92% |
| Investor X | Series A Preferred | 2,000,000 | 2,268,041.24 | 17.76% |
| Investor Y | Series B Preferred | 2,500,000 | 2,500,000 | 19.58% |
| Unissued pool | | 1,500,000 | 1,500,000 | 11.75% |
| **Total** | | | **12,768,041.24** | **100.00%** |

Series B's original issue price and conversion price are $1.20, and it ranks senior to Series A.

## Compared with 16a

| | 16a (anti-dilution shares in the price) | 16d (left out) |
|---|---:|---:|
| Series B price | $1.167019 | $1.20 |
| Series B shares | 2,570,652 | 2,500,000 |
| Series A CP2 | $2.190476 | $2.204545 |
| Series A as converted | 2,282,608.68 | 2,268,041.24 |
| Investor X | 17.76% | 17.76% |
| Investor Y | 20.00% | 19.58% |
| Founders A + B | 46.68% | 46.99% |

- **Who bears the adjustment.** In 16a the anti-dilution shares sit in the pre-money, so Investor Y gets exactly its $3M ÷ $15M and the existing holders bear all of the adjustment. In 16d the price ignores them, so Investor Y shares the dilution and ends below 20%.
- **The adjustment is a little smaller in 16d.** The higher price means fewer Series B shares (a smaller C), so CP2 falls less. Investor X lands at about the same percentage either way: 17.7634% here against 17.7590% in 16a.

## Checking this independently

The answer is the post–Series B cap table above. 16a's numbers are what you get if the anti-dilution shares are counted in the price, so the pair tells the two settings of the toggle apart. Tolerance is 1 share for share counts.
