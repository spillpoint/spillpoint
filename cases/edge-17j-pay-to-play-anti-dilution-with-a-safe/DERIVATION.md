# Edge case 17j: derivation

Edge case 17e with a bridge SAFE converting in the Series B: a pay-to-play down round that triggers the Series A's anti-dilution, and converts a SAFE too. It combines three settled rules, and needs nothing new:
- **R21:** the pay-to-play conversion comes first. Holders who convert get no adjustment, and A counts the cap table after the conversion.
- **R19, with the 0.3.0 plan's answer 4:** the SAFE's Company Capitalization counts the cap table the round is priced on, here after the conversion.
- **R25, with answers 3a and 3c:** the SAFE was issued after the Series A, so its conversion is a piece of the round, tested at its own price.

## Before the Series B

The history is edge case 17e's, plus a SAFE:
- 6,000,000 founder common: Founder A 4,500,000, Founder B 1,500,000.
- A 1,500,000-share pool, with 500,000 options granted to Employee C.
- **The Series A** at $2.50 a share: **Investor X** 1,200,000 shares and **Investor W** 800,000. 1x non-participating, with broad-based weighted-average anti-dilution (R7).
- **SAFE, Jun 30, 2024:** Investor S, **$1,000,000**, a **$5,000,000 post-money cap**, no discount. It was issued after the Series A.

## The Series B and its pay-to-play

17e's round:
- **$3,000,000** at a **$12,000,000 pre-money** valuation, $15,000,000 post-money, with no pool target.
- **Investors:** Investor X $600,000 and new Investor Y $2,400,000. Investor W invests nothing.
- **The pay-to-play:** $1,000,000 is offered to the Series A holders. Investor X must buy $600,000 and does; Investor W must buy $400,000 and doesn't.

The SAFE converts in the round. Investor S holds no Series A, so it has no pay-to-play requirement.

## The conversion comes first (R21)

- **Investor W** converts its 800,000 Series A at 1 for 10 into **80,000 common**, with no adjustment.
- **Investor X's 1,200,000 Series A** remain, and they get the adjustment.
- **A** counts the cap table after the conversion, without the pool (R7): 6,000,000 + 80,000 common + 500,000 options + 1,200,000 Series A = **7,780,000**, as in 17e.

## The SAFE (R4, R19)

Its Company Capitalization counts the cap table the round is priced on, after the conversion: 6,080,000 common, 500,000 options, 1,200,000 Series A and the 1,500,000 pool, so **9,280,000**.
- **The Series A counts at its ratio before the round's adjustment.** The count is taken just before the financing, and the adjustment comes from the financing (R25).
- **Company Capitalization:** 9,280,000 ÷ (1 − $1M ÷ $5M) = **11,600,000**.
- **Conversion price:** $5,000,000 ÷ 11,600,000 = **$0.431034** ($25 ÷ 58), so **2,320,000 shares**.

## The pieces, against the Series A's $2.50

| Piece | Price | Below $2.50? | What was paid | Shares |
|---|---:|---|---:|---:|
| The new money | the round's price, P | yes, it's a down round | $3,000,000 | the new shares |
| Investor S's SAFE | $0.431034 | yes | $1,000,000 | 2,320,000 |

Both count, so:
- **A** = 7,780,000.
- **B** = ($3,000,000 + $1,000,000) ÷ $2.50 = 1,600,000.
- **C** = the new shares + 2,320,000.

## Solving the round (R10)

The round is priced after the conversion (R19). Call the post-money fully diluted shares x, so P = $15,000,000 ÷ x, and the new shares are a fifth of x.
- **Before the new money:** 10,000,000 − 800,000 + 80,000 = 9,280,000, as in 17e.
- **The adjustment adds** 1,200,000 × ((A + C) ÷ (A + B) − 1) = 1,200,000 × (0.2x + 2,320,000 − 1,600,000) ÷ 9,380,000. That counts only Investor X's Series A.

**Solving:** x = 9,280,000 + 2,320,000 + 0.2x + 1,200,000 × (0.2x + 720,000) ÷ 9,380,000.
- Times 469 (1,200,000 ÷ 9,380,000 = 60 ÷ 469): 469x = 5,440,400,000 + 93.8x + 12x + 43,200,000.
- So 363.2x = 5,483,600,000, and **x = 15,098,017.62** (3,427,250,000 ÷ 227).
- **The price:** $15,000,000 ÷ x = **$0.993508** ($13,620 ÷ 13,709). It's far below the Series A's $2.50, and below 17e's $1.271882: the pre-money valuation is now spread over the SAFE's shares and a larger adjustment as well.
- **Series B shares,** each rounded down:
  - Investor X: $600,000 buys 603,920.70, so **603,920**
  - Investor Y: $2,400,000 buys 2,415,682.82, so **2,415,682**

## The Series A's new conversion price (R8)

- **A** = 7,780,000.
- **B** = (what was paid for the 3,019,602 whole new shares, $2,999,998.49, + the SAFE's $1,000,000) ÷ $2.50 = **1,599,999.39**.
- **C** = 3,019,602 + 2,320,000 = **5,339,602**.
- **CP2** = $2.50 × 9,379,999.39 ÷ 13,119,602 = **$1.787402**, against 17e's $2.214286.
- **The conversion ratio** becomes $2.50 ÷ $1.787402 = **1.398678**, so Investor X's 1,200,000 Series A convert into **1,678,414.01** common.

Investor W's 80,000 common get nothing from the adjustment, as in 17e.

## The cap table after the Series B

| Holder | Security | Shares | Fully diluted |
|---|---|---:|---:|
| Founder A | Common | 4,500,000 | 29.8052% |
| Founder B | Common | 1,500,000 | 9.9351% |
| Employee C | Options ($0.25) | 500,000 | 3.3117% |
| Investor X | Series A Preferred, converting at 1.398678 | 1,200,000 | 11.1168% (1,678,414.01 as converted) |
| Investor W | Common | 80,000 | 0.5299% |
| Investor S | Series B Preferred (from SAFEs), at $0.431034 | 2,320,000 | 15.3663% |
| Investor X | Series B Preferred | 603,920 | 4.0000% |
| Investor Y | Series B Preferred | 2,415,682 | 16.0000% |
| Unissued pool | | 1,500,000 | 9.9351% |
| **Total, as converted** | | **15,098,016.01** | **100.00%** |

The total is a little under the solved x, because the shares issued round down and CP2 uses them.

## Compared with 17e

The SAFE changes three things:
- **It dilutes everyone,** at its $0.431034.
- **It counts against the Series A:** its $1,000,000 for 2,320,000 shares goes into B and C.
- **It deepens the adjustment:** CP2 falls to $1.787402 instead of $2.214286, and that adjustment is in the round's price (R10).

The founders hold 39.74% after the round, against 50.88% in 17e.
