# Edge case 17e: derivation

A round case. Edge case 17a with anti-dilution on the Series A: a pay-to-play in a down round that triggers it (`ASSUMPTIONS.md` R21).

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

## Pricing the round

The round is priced after the conversion (R19), and its post-money fully diluted shares include the adjustment shares (R10):
- **Shares before the new money:** 10,000,000 − 800,000 + 80,000 = **9,280,000**.
- **New shares:** C = $3,000,000 ÷ price = x ÷ 5, where x is the post-money fully diluted count.
- **The adjustment:** CP2 = $2.50 × (A + B) ÷ (A + C), with B = $3,000,000 ÷ $2.50 = 1,200,000. Investor X's 1,200,000 Series A then convert into 1,200,000 × $2.50 ÷ CP2 shares, so the adjustment adds 1,200,000 × ((A + C) ÷ (A + B) − 1).
- **Solving** x = 9,280,000 + x/5 + 1,200,000 × ((7,780,000 + x/5) ÷ 8,980,000 − 1) gives x = 365,600,000/31 = **11,793,548.39**.
- **Price:** $15,000,000 ÷ x = **$1.271882** (exactly 2325/1828). It's a down round against the Series A's $2.50.
- **Series B shares,** each rounded down:
  - Investor X: $600,000 ÷ $1.271882 = 471,741.9, so **471,741**
  - Investor Y: $2,400,000 ÷ $1.271882 = 1,886,967.7, so **1,886,967**

## The new conversion price

The charter computes CP2 from the shares actually issued and the money received for them (R8):
- **C** = 471,741 + 1,886,967 = **2,358,708** shares.
- **B** = 2,358,708 × $1.271882 ÷ $2.50 = **1,199,999.15**.
- **CP2** = $2.50 × (7,780,000 + 1,199,999.15) ÷ (7,780,000 + 2,358,708) = **$2.214286**.

The Series A conversion ratio becomes $2.50 ÷ $2.214286 = **1.129032**, so Investor X's 1,200,000 Series A convert into **1,354,838.61** common. Its preference stays $3,000,000: anti-dilution changes the conversion ratio, never the preference.

## Cap table after the Series B

| Holder | Security | Shares | Fully diluted % |
|---|---|---:|---:|
| Founder A | Common | 4,500,000 | 38.16% |
| Founder B | Common | 1,500,000 | 12.72% |
| Employee C | Options ($0.25) | 500,000 | 4.24% |
| Investor X | Series A Preferred | 1,200,000 (1,354,838.61 as converted) | 11.49% |
| Investor W | Common | 80,000 | 0.68% |
| Investor X | Series B Preferred | 471,741 | 4.00% |
| Investor Y | Series B Preferred | 1,886,967 | 16.00% |
| Unissued pool | | 1,500,000 | 12.72% |
| **Total** | | **11,793,546.61** | **100.00%** |

The total is a little under the solved x, because the shares issued round down and CP2 uses them.

## Compared with 17a and 17f

- **Against 17a:** the adjustment shares sit in the post-money count, so the price falls from $1.293103 to $1.271882, and the founders' share from 51.72% to 50.88%.
- **Against 17f:** 17f prices the round on the count before the conversion.
