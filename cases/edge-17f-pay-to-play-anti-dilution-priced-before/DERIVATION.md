# Edge case 17f: derivation

A round case. Edge case 17e with the round priced on the count before the pay-to-play conversion (`ASSUMPTIONS.md` R19's toggle). Anti-dilution works as in 17e (R21).

## Before the down round

The history is edge case 17a's:
- 6,000,000 founder common: Founder A 4,500,000, Founder B 1,500,000.
- A 1,500,000-share pool, with 500,000 options granted to Employee C.
- The Series A at $2.50 a share: **Investor X** 1,200,000 shares and **Investor W** 800,000.

So before the down round there are 10,000,000 fully diluted shares. Series A is 1x non-participating with **broad-based weighted average anti-dilution** (`ASSUMPTIONS.md` R7).

## The down round and its pay-to-play

The Series B raises **$3,000,000** at a **$12,000,000 pre-money** valuation, $15,000,000 post-money, with no pool target. Investor X invests $600,000 and new Investor Y $2,400,000. Investor W invests nothing.

The round offers $1,000,000 to the Series A holders: Investor X must buy $600,000 and does; Investor W must buy $400,000 and doesn't.

## The conversion comes first (R21)

The conversion takes effect just before the round closes, ahead of anti-dilution:
- **Investor W** converts its 800,000 Series A at 1 for 10 into **80,000 common**, with **no anti-dilution adjustment**.
- **Investor X's 1,200,000 Series A** remain, and they get the adjustment.
- **A** in the weighted-average formula counts the cap table **after the conversion**, without the pool (R7): 6,000,000 common + 80,000 common + 500,000 options + 1,200,000 Series A = **7,780,000**.

That A is the same under both settings of R19.

## Pricing the round

The round is priced on the count **before** the conversion:
- **Shares before the new money:** Investor W's 800,000 Series A still count, as converted: **10,000,000**.
- **The adjustment shares in the price** (R10) are still only those of Investor X's 1,200,000 Series A. Investor W gets no adjustment under either setting.
- **Solving** x = 10,000,000 + x/5 + 1,200,000 × ((7,780,000 + x/5) ÷ 8,980,000 − 1) gives x = 2,761,250,000/217 = **12,724,654.38**.
- **Price:** $15,000,000 ÷ x = **$1.178814** (exactly 2604/2209).
- **Series B shares,** each rounded down:
  - Investor X: $600,000 ÷ $1.178814 = 508,986.5, so **508,986**
  - Investor Y: $2,400,000 ÷ $1.178814 = 2,035,944.6, so **2,035,944**

## The new conversion price

From the shares actually issued (R8):
- **C** = 508,986 + 2,035,944 = **2,544,930**.
- **B** = 2,544,930 × $1.178814 ÷ $2.50 = **1,199,999.59**.
- **CP2** = $2.50 × (7,780,000 + 1,199,999.59) ÷ (7,780,000 + 2,544,930) = **$2.174349**.

The conversion ratio becomes **1.149770**, so Investor X's 1,200,000 Series A convert into **1,379,723.45** common. Then Investor W's conversion takes effect: 80,000 common.

## Cap table after the Series B

| Holder | Security | Shares | Fully diluted % |
|---|---|---:|---:|
| Founder A | Common | 4,500,000 | 37.49% |
| Founder B | Common | 1,500,000 | 12.50% |
| Employee C | Options ($0.25) | 500,000 | 4.17% |
| Investor X | Series A Preferred | 1,200,000 (1,379,723.45 as converted) | 11.49% |
| Investor X | Series B Preferred | 508,986 | 4.24% |
| Investor Y | Series B Preferred | 2,035,944 | 16.96% |
| Investor W | Common | 80,000 | 0.67% |
| Unissued pool | | 1,500,000 | 12.50% |
| **Total** | | **12,004,653.45** | **100.00%** |

The total is 720,000 under the count the round was priced on. Investor W's 800,000 Series A were counted at 800,000, but became 80,000 common.

## Compared with 17e

| | 17e (priced after) | 17f (priced before) |
|---|---:|---:|
| Price | $1.271882 | $1.178814 |
| CP2 | $2.214286 | $2.174349 |
| Investor X's Series A, as converted | 1,354,838.61 | 1,379,723.45 |
| Series B to X / Y | 471,741 / 1,886,967 | 508,986 / 2,035,944 |
| Founders A + B | 50.88% | 49.98% |

Pricing before the conversion gives the new money more shares and a lower price. That lowers CP2 too, so Investor X's adjustment is larger.
