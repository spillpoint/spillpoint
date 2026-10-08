# Edge case 21d: derivation

Edge case 21b's company and post-money SAFE, with a note that has **no valuation cap and a 20% discount**. Its conversion price is the round's price less 20%, so its shares depend on the price, and the price depends on its shares. This tests the "solved together with the price" part of R24, which 21b's capped note never reached.

## The company before the Series A

1. **Founding:** Founder A 6,000,000 common and Founder B 3,000,000, so 9,000,000 shares. There's no pool.
2. **SAFE, Jan 1, 2023:** Investor S, $1,000,000, a $10,000,000 post-money cap, no discount.
3. **Note, Jan 1, 2023:** Investor N, $500,000 at 6% simple interest, **no cap**, a 20% discount.
4. **Series A, Jan 1, 2024:** Investor Y invests $5,000,000 at a $20,000,000 pre-money valuation, $25,000,000 post-money. It converts both.

## Call the post-money fully diluted shares x

The round's price is P = $25,000,000 ÷ x.

- **The note:** $530,000 converts, principal plus a year at 6%, at 0.8P. That's $530,000 ÷ (0.8 × $25,000,000 ÷ x) = **0.0265x** shares. They depend on the price.
- **The SAFE's Company Capitalization** counts the note's shares, **exactly, before rounding down**: (9,000,000 + 0.0265x) ÷ 0.9. That's the rule this case settles (R24), the same way the price is solved exactly (R3). The SAFE's shares are a tenth of that, (9,000,000 + 0.0265x) ÷ 9.
- **The new shares** are a fifth of x.

## Solving

x = 9,000,000 + 0.0265x + (9,000,000 + 0.0265x) ÷ 9 + x ÷ 5

The first three terms are (10 ÷ 9) × (9,000,000 + 0.0265x), so:
- 0.8x = 10,000,000 + 0.029444x
- 0.770556x = 10,000,000
- **x = 18,000,000,000 ÷ 1,387 = 12,977,649.60**

**The price:** $25,000,000 ÷ x = **$1.926389** ($1,387 ÷ 720 exactly).

## Each conversion

**The note:**
- **Conversion price:** 0.8 × $1.926389 = **$1.541111** ($1,387 ÷ 900).
- **Exact shares:** 0.0265x = 477,000,000 ÷ 1,387 = 343,907.7145. It's issued **343,907**, rounded down (R3).
- **No cap,** so the discount is its only price.

**The SAFE:**
- **Company Capitalization:** (9,000,000 + 343,907.7145) ÷ 0.9 = **10,382,119.68** (14,400,000,000 ÷ 1,387). It counts the note's exact shares.
- **Conversion price:** $10,000,000 ÷ 10,382,119.68 = **$0.963194** ($1,387 ÷ 1,440).
- **Shares:** a tenth of the Capitalization, 1,038,211.97, rounded down to **1,038,211**.

**Investor Y:** $5,000,000 ÷ $1.926389 = 2,595,529.92, rounded down to **2,595,529**.

**What the rule changes:** the exact Capitalization is what `expected.json` records. Counting the note's rounded 343,907 shares instead would give 10,382,118.89. That's eight-tenths of a share less, which here leaves the SAFE's whole shares the same, 1,038,211.

## The cap table after the Series A

| Holder | Class | Shares | Fully diluted |
|---|---|---:|---:|
| Founder A | Common | 6,000,000 | 46.2333% |
| Founder B | Common | 3,000,000 | 23.1167% |
| Investor S | Series A Preferred (from SAFEs), at $0.963194 | 1,038,211 | 8.0000% |
| Investor N | Series A Preferred (from notes), at $1.541111 | 343,907 | 2.6500% |
| Investor Y | Series A Preferred, at $1.926389 | 2,595,529 | 20.0000% |
| Total | | 12,977,647 | |

The total is 12,977,647, under the solved 12,977,649.60, because each issue is rounded down. The SAFE ends with 8% again, 10% of the Capitalization less the new money's fifth.
