# Edge case 16f: derivation

A round case. Edge case 16a with the adjusted conversion price **rounded to the nearest $0.0001**, half up (`ASSUMPTIONS.md` R9's toggle, `anti_dilution_cp2_rounding: "0.0001"`). The NVCA model charter computes it this way, to the nearest one-hundredth of a cent. spillpoint's default is exact.

## Before the down round

The history is edge case 16a's:
- 6,000,000 founder common: Founder A 4,500,000, Founder B 1,500,000.
- A 1,500,000-share unissued pool, and 500,000 options granted to Employee C.
- **Investor X's Series A:** 2,000,000 shares at $2.50, with **broad-based weighted average** anti-dilution.

So there are 10,000,000 fully diluted shares.

## The down round

The Series B raises **$3,000,000** from **Investor Y** at a **$12,000,000 pre-money** valuation, $15,000,000 post-money, with no pool target. Its price is below the Series A's $2.50, so the Series A's conversion price is adjusted: CP2 = $2.50 × (A + B) ÷ (A + C).

## Pricing the round

The rounding applies only to the final conversion price. The round's price is still solved exactly, with the adjustment shares counted as fractions (R10), so everything up to CP2 is 16a's:
- **Post-money fully diluted:** **12,853,260.87** (exactly 295,625,000/23).
- **Price:** **$1.167019** (exactly 552/473).
- **Investor Y:** **2,570,652** Series B.

## The new conversion price

From the shares actually issued (R8), as in 16a:
- **Exact:** CP2 = **$2.190476207**.
- **Rounded to the nearest $0.0001, half up:** **$2.1905**.

The conversion ratio becomes $2.50 ÷ $2.1905 = **1.141292** (exactly 5000/4381), against 16a's exact 1.141304. Investor X's 2,000,000 Series A convert into **2,282,583.88** common, against 16a's 2,282,608.68: about 25 fewer.

## Cap table after the Series B

| Holder | Security | Shares | Fully diluted % |
|---|---|---:|---:|
| Founder A | Common | 4,500,000 | 35.01% |
| Founder B | Common | 1,500,000 | 11.67% |
| Employee C | Options ($0.25) | 500,000 | 3.89% |
| Investor X | Series A Preferred | 2,000,000 (2,282,583.88 as converted) | 17.76% |
| Investor Y | Series B Preferred | 2,570,652 | 20.00% |
| Unissued pool | | 1,500,000 | 11.67% |
| **Total** | | **12,853,235.88** | **100.00%** |

Rounding moves the result by a few shares here. It matters more where CP2 sits near a half-step, and to anyone reconciling with a charter that rounds.
