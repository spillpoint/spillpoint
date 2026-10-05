# Edge case 21: derivation

A round case. A convertible note and a pre-money SAFE convert in the **same** round.

## Before the Series A

- **Founders:** 8,000,000 common, Founder A 6,000,000 and Founder B 2,000,000.
- **An option pool** of 20%: 2,000,000 shares, with 500,000 options granted to Employee C at $0.25.

So there are 10,000,000 fully diluted shares: 8,500,000 issued stock and options, and an unissued pool of 1,500,000.

## What converts

- **Investor N's note,** as in edge case 19a: $1,000,000 at 6% for a year, so **$1,060,000** converts. It has an $8,000,000 pre-money cap, divided by the count before the round with the pool (`with_pool`, 10,000,000), so its cap price is **$0.80**, and a 20% discount.
- **Investor S's pre-money SAFE:** $1,000,000, with a **$10,000,000** pre-money cap and a 20% discount. As in edge case 20, its Company Capitalization counts the stock and options and the pool after this round's top-up.

**Neither counts the other** (`ASSUMPTIONS.md` R23, R24):
- The note's count is the shares just before the round, and leaves out every SAFE and note converting.
- The SAFE's Company Capitalization leaves out every SAFE and note.

So the two don't depend on each other, and both can be solved together.

## The Series A

The Series A raises **$5,000,000** from **Investor Y** at a **$20,000,000 pre-money** valuation, $25,000,000 post-money. The unissued pool is topped up to **15%** of the post-money fully diluted shares, in the pre-money (R2, R16).

## Pricing the round

- **The note:** $1,060,000 ÷ $0.80 = **1,325,000** shares, as in 19a.
- **The SAFE at its cap:** $1,000,000 ÷ ($10,000,000 ÷ (8,500,000 + 15% of x)) = 850,000 + 1.5% of x.
- **Post-money fully diluted:** x = 8,500,000 + 15% of x + 1,325,000 + 850,000 + 1.5% of x + 20% of x, so x = 2,135,000,000/127 = **16,811,023.62**.
- **Price:** $25,000,000 ÷ x = **$1.487119** (exactly 635/427). The discount price is **$1.189696**.
- **The SAFE:** its Company Capitalization is 8,500,000 + 15% of x = **11,021,653.54**, so its cap price is $10,000,000 ÷ 11,021,653.54 = **$0.907305**. That's below the discount price, so the cap wins. **1,102,165** shares.
- **The note's cap price,** $0.80, is below the discount price too.
- **Investor Y:** $5,000,000 ÷ $1.487119 = **3,362,204** Series A.
- **The pool:** 15% of x, **2,521,653** shares.

Each converts into a series of its own, at its own price:
- **Series A Preferred (from SAFEs)** at $0.907305 (R5).
- **Series A Preferred (from notes)** at $0.80.

## Cap table after the Series A

| Holder | Security | Shares | Fully diluted % |
|---|---|---:|---:|
| Founder A | Common | 6,000,000 | 35.69% |
| Founder B | Common | 2,000,000 | 11.90% |
| Employee C | Options ($0.25) | 500,000 | 2.97% |
| Investor S | Series A Preferred (from SAFEs) | 1,102,165 | 6.56% |
| Investor N | Series A Preferred (from notes) | 1,325,000 | 7.88% |
| Investor Y | Series A Preferred | 3,362,204 | 20.00% |
| Unissued pool | | 2,521,653 | 15.00% |
| **Total** | | **16,811,022** | **100.00%** |

All three Series A series are pari passu.

## What isn't covered: a post-money SAFE in the same round

A post-money SAFE's Company Capitalization counts every other converting security (R4), so it would depend on the note and the pre-money SAFE, and they on the round. That's common in real Series A rounds, but it's refused for now, with a clear error. It's listed in `ASSUMPTIONS.md` under "Owed before release".
