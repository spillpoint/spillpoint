# Edge case 18: derivation

A round case. A pro-rata investment in a round that also converts a SAFE. The pro-rata base counts the SAFE (`ASSUMPTIONS.md` R6).

## Before the Series A

- **Founder A:** 8,000,000 common. No option pool.
- **The Seed:** $2,000,000 at an $8,000,000 pre-money valuation, at $1.00 a share. **Investor X** holds 2,000,000 Seed, and has pro-rata rights in later rounds.
- **A post-money SAFE:** **Investor Z** pays $1,000,000, with an $11,000,000 post-money valuation cap and no discount.

So 10,000,000 shares are outstanding, and the SAFE is outstanding too.

## The Series A

The Series A raises **$6,000,000** at a **$33,000,000 pre-money** valuation, $39,000,000 post-money, with no pool target:
- **Investor Y:** $5,000,000
- **Investor X:** $1,000,000, under its pro-rata right

The SAFE converts in this round.

**The SAFE's price (R4):**
- **Company Capitalization** counts the SAFE itself: 10,000,000 ÷ (1 − $1,000,000/$11,000,000) = **11,000,000**.
- **The SAFE's price** is $11,000,000 ÷ 11,000,000 = **$1.00**, so it gets **1,000,000 shares**.

**The round's price:**
- **Post-money fully diluted:** x = 10,000,000 + 1,000,000 + ($6,000,000/$39,000,000) × x, so x = **13,000,000**.
- **Price:** $39,000,000 ÷ 13,000,000 = **$3.00**. The SAFE's $1.00 is lower, so it converts at its cap.
- **Series A shares,** each rounded down:
  - Investor Y: $5,000,000 ÷ $3 = 1,666,666.67, so **1,666,666**
  - Investor X: $1,000,000 ÷ $3 = 333,333.33, so **333,333**
- **The SAFE converts** into its own series, **Series A Preferred (from SAFEs)**, at $1.00 (R5). That gives Investor Z a $1,000,000 preference.

## Investor X's pro-rata entitlement (R6)

The entitlement is X's pre-round fully diluted share × the round's $6,000,000:
- **The base** counts outstanding stock, options and convertible securities, as converted, without the unissued pool. The SAFE counts at the **1,000,000 whole shares it receives** in this round, so the base is 10,000,000 + 1,000,000 = **11,000,000**.
- **Investor X's share:** 2,000,000 ÷ 11,000,000 = **18.181818%**.
- **Its entitlement:** 18.181818% × $6,000,000 = **$1,090,909.09**.

It invests $1,000,000, a partial take-up.

Leaving the SAFE out of the base would give X 20% and $1,200,000. The NVCA definition counts outstanding convertible securities, so the SAFE belongs in it.

## Cap table after the Series A

| Holder | Security | Shares | Fully diluted % |
|---|---|---:|---:|
| Founder A | Common | 8,000,000 | 61.54% |
| Investor X | Seed Preferred | 2,000,000 | 15.38% |
| Investor Z | Series A Preferred (from SAFEs) | 1,000,000 | 7.69% |
| Investor Y | Series A Preferred | 1,666,666 | 12.82% |
| Investor X | Series A Preferred | 333,333 | 2.56% |
| **Total** | | **12,999,999** | **100.00%** |

Series A and Series A Preferred (from SAFEs) are pari passu, senior to Seed.
