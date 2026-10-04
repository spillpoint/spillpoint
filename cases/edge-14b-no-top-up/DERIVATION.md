# Edge case 14b: derivation

This is edge case 14a with one term changed: the pool target is **10%** of post-money fully diluted shares, not 15%. Everything before the round is the same:
- 6,000,000 founder common (Founder A 4,500,000, Founder B 1,500,000)
- Employee C's 500,000 options at $0.25
- 1,000,000 unissued pool shares

So there are 7,500,000 fully diluted shares before the round. The Series A is the same too: $5,000,000 from Investor X at a $20,000,000 pre-money valuation, $25,000,000 post-money.

## Is the target already met?

The rule (`ASSUMPTIONS.md` R16): if the unissued pool before the round already meets or exceeds the target, there is no top-up. The pool stays as it is, and the round is priced on the actual pool.

Whether the target is met is judged on the post-money fully diluted shares without a top-up, x:
- **The count:** x = 7,500,000 existing shares, options and pool + 20% of x for the new shares, which gives 0.8x = 7,500,000 and x = **9,375,000**.
- **The pool's share:** 1,000,000 ÷ 9,375,000 = **10.67%**. That is above the 10% target, so there is **no top-up**.

## Pricing the round on the actual pool

- **Price per share:** $25,000,000 ÷ 9,375,000 = **$2.666667** (exactly 8/3). That is simply the $20M pre-money ÷ the 7,500,000 pre-round fully diluted shares.
- **Series A shares:** $5,000,000 ÷ $2.666667 = **1,875,000**, which is exactly 20% of 9,375,000.
- **Unissued pool:** unchanged at **1,000,000**.

Every count comes out whole, so no rounding is needed (R3).

## Cap table after the Series A

| Holder | Security | Shares | Fully diluted % |
|---|---|---:|---:|
| Founder A | Common | 4,500,000 | 48.00% |
| Founder B | Common | 1,500,000 | 16.00% |
| Employee C | Options ($0.25) | 500,000 | 5.33% |
| Investor X | Series A Preferred | 1,875,000 | 20.00% |
| Unissued pool | | 1,000,000 | 10.67% |
| **Total** | | **9,375,000** | **100.00%** |

Series A Preferred has an original issue price and conversion price of $2.666667 (8/3), a 1x non-participating preference, and no anti-dilution. Its preference is 1,875,000 × 8/3 = $5,000,000.

## Why price on the actual pool

Suppose the round were priced as if the pool were at its 10% target, but the pool were then left at 1,000,000 because it never shrinks:
- x = 6,500,000 + 0.10x + 0.20x, which gives x = 9,285,714.29 and a price of $2.692308.
- Investor X would get 1,857,142 shares.
- The real total would be 9,357,142 shares, so the investor would hold 19.85%, not the 20% it paid for.

Pricing on the actual pool avoids that. The investor gets exactly its money ÷ the post-money valuation.

## Compared with 14a

| | 14a (15% target) | 14b (10% target) |
|---|---:|---:|
| Pool top-up | 500,000 | none |
| Price per share | $2.50 | $2.666667 |
| Series A shares | 2,000,000 | 1,875,000 |
| Founders A + B | 60.00% | 64.00% |
| Unissued pool | 15.00% | 10.67% |

The investor holds 20% in both. The lower target costs the founders nothing here, because the pool they already set aside covers it.

## Checking this independently

The answer is the post–Series A cap table above. Pricing on a pool at target instead of the actual pool would give $2.692308 and 1,857,142 Series A shares, as shown above. Tolerance is 1 share for share counts.
