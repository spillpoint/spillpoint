# Edge case 17g: derivation

A round case. Pay-to-play on two series in the same round, with a holder in both who buys part of its pro-rata.

## Before the down round

- **Founders:** 6,000,000 common, Founder A 4,500,000 and Founder B 1,500,000. No option pool.
- **The Seed:** $1,500,000 at a $6,000,000 pre-money valuation, at $1.00 a share. **Investor X** 1,000,000 Seed, **Investor V** 500,000.
- **The Series A:** $3,000,000 at a $15,000,000 pre-money valuation, on 7,500,000 shares, at $2.00 a share. **Investor X** 1,000,000 Series A, **Investor W** 500,000.

Both series are 1x non-participating with no anti-dilution, Series A senior to Seed. There are 9,000,000 fully diluted shares.

## The down round and its pay-to-play on two series

The Series B raises **$3,000,000** at a **$9,000,000 pre-money** valuation, $12,000,000 post-money:
- **Investor X:** $400,000
- **Investor V:** $200,000
- **Investor W:** $200,000
- **Investor Y,** new: $2,200,000

The pay-to-play names **both** series (`ASSUMPTIONS.md` R22):
- **One amount, one requirement.** The round offers **$1,200,000** to their holders, split by their combined as-converted shares (3,000,000 in all). A holder in both series has one total requirement:
  - Investor X: 1,000,000 Seed + 1,000,000 Series A = 2,000,000, or 66.67%, so it must buy **$800,000**.
  - Investor V: 500,000, or 16.67%, so **$200,000**.
  - Investor W: 500,000, or 16.67%, so **$200,000**.
- **A ratio per series:** Seed converts at **1 common for 5**, Series A at **1 for 10**.

Investors V and W buy all of theirs and keep their preferred. **Investor X buys $400,000, half of its $800,000.**

**Investor X bought only part (R20, the default):** all of its preferred in both series converts, each at its own ratio:
- 1,000,000 Seed × 1/5 = **200,000 common**
- 1,000,000 Series A × 1/10 = **100,000 common**

## Pricing the round

Priced after the conversion (R19):
- **Shares before the new money:** 9,000,000 − 2,000,000 + 300,000 = **7,300,000**.
- **Post-money fully diluted:** x = that + 25% of x, so x = **9,733,333.33**.
- **Price:** $12,000,000 ÷ x = **$1.232877** (exactly 90/73). That's below the Series A's $2.00 and above the Seed's $1.00; the pay-to-play applies either way.
- **Series B shares,** each rounded down:
  - Investor X: $400,000 × 73/90 = **324,444**
  - Investors V and W: $200,000 × 73/90 = **162,222** each
  - Investor Y: $2,200,000 × 73/90 = **1,784,444**

The fully diluted total is 9,733,332.

## Cap table after the Series B

| Holder | Security | Shares | Fully diluted % |
|---|---|---:|---:|
| Founder A | Common | 4,500,000 | 46.23% |
| Founder B | Common | 1,500,000 | 15.41% |
| Investor V | Seed Preferred | 500,000 | 5.14% |
| Investor W | Series A Preferred | 500,000 | 5.14% |
| Investor X | Common | 300,000 | 3.08% |
| Investor X | Series B Preferred | 324,444 | 3.33% |
| Investor V | Series B Preferred | 162,222 | 1.67% |
| Investor W | Series B Preferred | 162,222 | 1.67% |
| Investor Y | Series B Preferred | 1,784,444 | 18.33% |
| **Total** | | **9,733,332** | **100.00%** |

Series B is senior, then Series A, then Seed. Seed's preference is now Investor V's $500,000, and Series A's is Investor W's $1,000,000.
