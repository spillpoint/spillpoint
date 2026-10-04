# Edge case 16c: derivation

This is edge case 16a with one term changed: Series A's anti-dilution is a **full ratchet** (`anti_dilution: full_ratchet`, `anti_dilution_a: null`, because a full ratchet has no A). Everything else is the same.

## Before the down round

The history is 16a's. There are 10,000,000 fully diluted shares: 6,000,000 common, 500,000 options, 2,000,000 Series A (convertible 1:1, CP1 = $2.50), and a 1,500,000-share unissued pool. Investor Y then invests **$3,000,000** in Series B at a **$12,000,000 pre-money** valuation, $15,000,000 post-money, with no pool target.

## The full ratchet

Series A's conversion price drops all the way to the new issue price: **CP2 = the Series B price** (`SPEC.md`, Anti-dilution). No weighted average is used, and how many Series B shares are sold doesn't matter.

## Solving the round

The ratchet's extra Series A conversion shares count in the post-money fully diluted shares the price is set on (R10). A lower price means a deeper ratchet, which means more shares, which means a lower price again. Call those shares x, so the price is $15M ÷ x:
- **Series B shares:** 0.2x.
- **Extra Series A shares:** 2,000,000 × ($2.50 ÷ price − 1). Since $2.50 ÷ price = x ÷ 6,000,000, that is x ÷ 3 − 2,000,000.
- **The count:** x = 10,000,000 + 0.2x + x ÷ 3 − 2,000,000, which gives (7/15)x = 8,000,000.

So x = **17,142,857.14**, and the price is $15M ÷ x = **$0.875**.

## The result

- **Series B shares:** $3,000,000 ÷ $0.875, rounded down = **3,428,571**.
- **CP2 = $0.875.** Rounding the Series B shares down doesn't change it, because a full ratchet depends only on the price.
- **Series A as converted:** 2,000,000 × $2.50 ÷ $0.875 = **5,714,285.71** common shares, a conversion ratio of 20/7 (2.857143).

The cap table's total is 17,142,856.71, a fraction of a share under the solved 17,142,857.14, because the Series B shares are rounded down.

## Cap table after the Series B

| Holder | Security | Shares | As converted | Fully diluted % |
|---|---|---:|---:|---:|
| Founder A | Common | 4,500,000 | 4,500,000 | 26.25% |
| Founder B | Common | 1,500,000 | 1,500,000 | 8.75% |
| Employee C | Options ($0.25) | 500,000 | 500,000 | 2.92% |
| Investor X | Series A Preferred | 2,000,000 | 5,714,285.71 | 33.33% |
| Investor Y | Series B Preferred | 3,428,571 | 3,428,571 | 20.00% |
| Unissued pool | | 1,500,000 | 1,500,000 | 8.75% |
| **Total** | | | **17,142,856.71** | **100.00%** |

Series B's original issue price and conversion price are $0.875, and it ranks senior to Series A.

## Compared across 16a, 16b and 16c

| | No anti-dilution | 16a broad-based | 16b narrow-based | 16c full ratchet |
|---|---:|---:|---:|---:|
| Series B price | $1.20 | $1.167019 | $1.094595 | $0.875 |
| Series B shares | 2,500,000 | 2,570,652 | 2,740,740 | 3,428,571 |
| Series A CP2 | $2.50 | $2.190476 | $1.687500 | $0.875 |
| Series A as converted | 2,000,000 | 2,282,608.68 | 2,962,962.80 | 5,714,285.71 |
| Investor X | 16.00% | 17.76% | 21.62% | 33.33% |
| Founders A + B | 48.00% | 46.68% | 43.78% | 35.00% |
| Investor Y | 20.00% | 20.00% | 20.00% | 20.00% |

**The full ratchet is by far the harshest on everyone else.** Investor X goes from 20% before the down round to 33.33%. It is treated as if it had invested at the new price, and that price is itself lower, $0.875 rather than $1.20, because the ratchet shares sit in the pre-money. The founders fall from 60% to 35%, against 48% with no anti-dilution at all.

## Checking this independently

The answer is the post–Series B cap table above. These wrong rules give different numbers, so the case catches them:
- **Ratcheting to $1.20, the price with the ratchet shares left out:** Series A would convert into 4,166,666.67 shares, and Series B would get 2,500,000.
- **Using a weighted average instead:** 16a's or 16b's numbers.

Tolerance is 1 share for share counts.
