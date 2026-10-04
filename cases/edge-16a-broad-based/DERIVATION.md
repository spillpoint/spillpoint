# Edge case 16a: derivation

A round case: one down round under three anti-dilution methods. 16a, 16b and 16c are identical except for Series A's anti-dilution term. In 16a it is the **broad-based weighted average** (`anti_dilution: broad_based`, `anti_dilution_a: outstanding_common_options_preferred`).

## Before the down round

The first four events are edge case 14a's:
- 6,000,000 founder common: Founder A 4,500,000, Founder B 1,500,000.
- A 1,500,000-share pool, with 500,000 options granted to Employee C.
- A $5M Series A from Investor X at a $20M pre-money valuation, with the pool topped up to 15%. That gives a price of $2.50, 2,000,000 Series A shares, and a 1,500,000-share unissued pool.

So before the down round there are 10,000,000 fully diluted shares: 6,000,000 common, 500,000 options, 2,000,000 Series A (convertible 1:1) and the 1,500,000-share pool. Series A's conversion price, CP1, is $2.50.

## The down round

Investor Y invests **$3,000,000** in Series B at a **$12,000,000 pre-money** valuation, so $15,000,000 post-money. There is no pool target, so the pool stays at 1,500,000 (R16). Without anti-dilution the price would be $12M ÷ 10,000,000 = $1.20, below Series A's $2.50. So it is a down round, and Series A's anti-dilution applies.

## The broad-based formula

Series A's conversion price drops to CP2 = CP1 × (A + B) ÷ (A + C) (`SPEC.md`, Anti-dilution), where:
- **A** is the common outstanding just before the round, as converted: 6,000,000 common + 500,000 options + 2,000,000 Series A = **8,500,000**. The unissued pool is left out (R7).
- **B** is the money raised ÷ CP1: $3,000,000 ÷ $2.50 = **1,200,000**, the shares the money would have bought at the old price.
- **C** is the Series B shares issued.

Series A's preference doesn't change. Its 2,000,000 shares now convert into 2,000,000 × CP1 ÷ CP2 common shares instead of 2,000,000.

## Solving the round

The adjustment depends on the price, and the price depends on the adjustment. The extra Series A conversion shares count in the post-money fully diluted shares the price is set on (`SPEC.md`, Priced round; R10). Call those shares x, so the price is $15M ÷ x:
- **Series B shares:** C = $3M ÷ ($15M ÷ x) = 0.2x. Investor Y owns exactly its $3M ÷ $15M.
- **Extra Series A shares:** 2,000,000 × (CP1 ÷ CP2 − 1) = 2,000,000 × (C − B) ÷ (A + B) = 2,000,000 × (0.2x − 1,200,000) ÷ 9,700,000.
- **The count:** x = 10,000,000 + 0.2x + 2,000,000 × (0.2x − 1,200,000) ÷ 9,700,000.

That solves to x = **12,853,260.87** and a price of $15M ÷ x = **$1.167019** (exactly 552/473).

## The result

- **Series B shares:** $3,000,000 ÷ $1.167019, rounded down = **2,570,652**.
- **CP2,** from the shares actually issued and the cash actually paid for them (R8):
  - B = 2,570,652 × 552/473 ÷ $2.50 = 1,199,999.92
  - C = 2,570,652
  - CP2 = $2.50 × (8,500,000 + 1,199,999.92) ÷ (8,500,000 + 2,570,652) = **$2.190476**
- **Series A as converted:** 2,000,000 × $2.50 ÷ $2.190476 = **2,282,608.68** common shares, a conversion ratio of 1.141304. These shares are exact, with no rounding (R9, E2).

The cap table's total is 12,853,260.68, a fraction of a share below the solved 12,853,260.87. That is because the Series B shares are rounded down and CP2 uses the shares actually issued (R10).

## Cap table after the Series B

| Holder | Security | Shares | As converted | Fully diluted % |
|---|---|---:|---:|---:|
| Founder A | Common | 4,500,000 | 4,500,000 | 35.01% |
| Founder B | Common | 1,500,000 | 1,500,000 | 11.67% |
| Employee C | Options ($0.25) | 500,000 | 500,000 | 3.89% |
| Investor X | Series A Preferred | 2,000,000 | 2,282,608.68 | 17.76% |
| Investor Y | Series B Preferred | 2,570,652 | 2,570,652 | 20.00% |
| Unissued pool | | 1,500,000 | 1,500,000 | 11.67% |
| **Total** | | | **12,853,260.68** | **100.00%** |

Series B's original issue price and conversion price are $1.167019 (552/473). It ranks senior to Series A. Series A keeps its $2.50 original issue price and its $5,000,000 preference.

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

Investor Y holds 20% in every column, because the anti-dilution shares sit in the pre-money. The cost falls on everyone who was there before the round, Series A excepted.

Broad-based is the mildest of the three, because its A is large: the whole company except the pool. The new money is spread over 8,500,000 shares, so the conversion price only falls from $2.50 to $2.19.

## Checking this independently

The answer is the post–Series B cap table above. These wrong rules give different numbers, so the case catches them:
- **Leaving the anti-dilution shares out of the price:** $1.20 a share and 2,500,000 Series B shares.
- **Counting the unissued pool in A** (the R7 toggle): A becomes 10,000,000 and the adjustment smaller. Series A would convert into 2,242,990.60 shares, and Series B would get 2,560,747.

R8 (B from the cash actually paid) can't be caught here. Using $3,000,000 ÷ CP1 for B instead changes CP2 only in the eighth decimal place, which moves Series A's as-converted shares by 0.02 of a share. That is well within tolerance.

Tolerance is 1 share for share counts.
