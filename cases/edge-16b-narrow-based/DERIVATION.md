# Edge case 16b: derivation

This is edge case 16a with one term changed: Series A's anti-dilution is the **narrow-based weighted average** (`anti_dilution: narrow_based`, `anti_dilution_a: outstanding_preferred`). Everything else is the same.

## Before the down round

The history is 16a's. There are 10,000,000 fully diluted shares: 6,000,000 common, 500,000 options, 2,000,000 Series A (convertible 1:1, CP1 = $2.50), and a 1,500,000-share unissued pool. Investor Y then invests **$3,000,000** in Series B at a **$12,000,000 pre-money** valuation, $15,000,000 post-money, with no pool target.

## The narrow-based formula

CP2 = CP1 × (A + B) ÷ (A + C), as in 16a, but A is much smaller:
- **A** is the outstanding preferred only, as converted (R15): the 2,000,000 Series A shares. Common, options and the pool are left out.
- **B** is $3,000,000 ÷ $2.50 = **1,200,000**.
- **C** is the Series B shares issued.

## Solving the round

The extra Series A conversion shares count in the post-money fully diluted shares the price is set on (R10). Call those shares x:
- **Series B shares:** C = 0.2x.
- **Extra Series A shares:** 2,000,000 × (C − B) ÷ (A + B) = 2,000,000 × (0.2x − 1,200,000) ÷ 3,200,000 = 0.125x − 750,000.
- **The count:** x = 10,000,000 + 0.2x + 0.125x − 750,000, which gives 0.675x = 9,250,000.

So x = **13,703,703.70**, and the price is $15M ÷ x = **$1.094595** (exactly 81/74).

## The result

- **Series B shares:** $3,000,000 ÷ $1.094595, rounded down = **2,740,740**.
- **CP2,** from the shares actually issued and the cash actually paid for them (R8):
  - B = 2,740,740 × 81/74 ÷ $2.50 = 1,199,999.68
  - C = 2,740,740
  - CP2 = $2.50 × (2,000,000 + 1,199,999.68) ÷ (2,000,000 + 2,740,740) = **$1.687500** (1.6875000926)
- **Series A as converted:** 2,000,000 × $2.50 ÷ CP2 = **2,962,962.80** common shares, a conversion ratio of 1.481481.

The cap table's total is 13,703,702.80, just under the solved 13,703,703.70, for the same reason as in 16a (R10).

## Cap table after the Series B

| Holder | Security | Shares | As converted | Fully diluted % |
|---|---|---:|---:|---:|
| Founder A | Common | 4,500,000 | 4,500,000 | 32.84% |
| Founder B | Common | 1,500,000 | 1,500,000 | 10.95% |
| Employee C | Options ($0.25) | 500,000 | 500,000 | 3.65% |
| Investor X | Series A Preferred | 2,000,000 | 2,962,962.80 | 21.62% |
| Investor Y | Series B Preferred | 2,740,740 | 2,740,740 | 20.00% |
| Unissued pool | | 1,500,000 | 1,500,000 | 10.95% |
| **Total** | | | **13,703,702.80** | **100%** |

The percentages are rounded, so they add up to 100.01%. Series B's original issue price and conversion price are $1.094595 (81/74), and it ranks senior to Series A.

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

**Narrow-based protects Series A far more than broad-based does.** Its A counts only the 2,000,000 Series A shares, so the new issue is weighed against a small base. Investor X ends at 21.62%, more than the 20% it held before the down round, and the founders lose another 2.9 points compared with 16a.

## Checking this independently

The answer is the post–Series B cap table above. These wrong rules give different numbers, so the case catches them:
- **Using the broad-based A (8,500,000):** 16a's numbers.
- **Leaving the anti-dilution shares out of the price:** $1.20 a share and 2,500,000 Series B shares.

Some definitions of "narrow-based" count only the adjusting series' own shares, not all outstanding preferred. Series A is the only preferred here, so the two give the same answer, and this case can't tell them apart.

R8 can't be caught here either: using $3,000,000 ÷ CP1 for B moves Series A's as-converted shares by 0.3 of a share.

Tolerance is 1 share for share counts.
