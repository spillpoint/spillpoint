# Edge case 17h: derivation

A round case. Edge case 17g under the proportional reading of partial participation (`ASSUMPTIONS.md` R20's toggle). The same fraction applies to each of a holder's series.

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

**Investor X bought half its pro-rata, so it keeps half of each series:**
- **Seed:** keeps floor(1,000,000 × 1/2) = 500,000. The other 500,000 convert at 1 for 5 into **100,000 common**.
- **Series A:** keeps 500,000. The other 500,000 convert at 1 for 10 into **50,000 common**.

## Pricing the round

Priced after the conversion (R19):
- **Shares before the new money:** 9,000,000 − 1,000,000 + 150,000 = **8,150,000**.
- **Post-money fully diluted:** x = that + 25% of x, so x = **10,866,666.67**.
- **Price:** $12,000,000 ÷ x = **$1.104294** (exactly 180/163). That's below the Series A's $2.00 and above the Seed's $1.00; the pay-to-play applies either way.
- **Series B shares,** each rounded down:
  - Investor X: $400,000 × 163/180 = **362,222**
  - Investors V and W: $200,000 × 163/180 = **181,111** each
  - Investor Y: $2,200,000 × 163/180 = **1,992,222**

The fully diluted total is 10,866,666.

## Cap table after the Series B

| Holder | Security | Shares | Fully diluted % |
|---|---|---:|---:|
| Founder A | Common | 4,500,000 | 41.41% |
| Founder B | Common | 1,500,000 | 13.80% |
| Investor X | Seed Preferred | 500,000 | 4.60% |
| Investor V | Seed Preferred | 500,000 | 4.60% |
| Investor X | Series A Preferred | 500,000 | 4.60% |
| Investor W | Series A Preferred | 500,000 | 4.60% |
| Investor X | Common | 150,000 | 1.38% |
| Investor X | Series B Preferred | 362,222 | 3.33% |
| Investor V | Series B Preferred | 181,111 | 1.67% |
| Investor W | Series B Preferred | 181,111 | 1.67% |
| Investor Y | Series B Preferred | 1,992,222 | 18.33% |
| **Total** | | **10,866,666** | **100.00%** |

## Compared with 17g

Investor X keeps a $500,000 Seed preference and a $1,000,000 Series A preference, against none in 17g. Fewer shares are forfeited, so the price is lower: $1.104294 against $1.232877.
