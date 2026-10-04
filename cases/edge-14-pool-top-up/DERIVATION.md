# Edge case 14: derivation

A round case. Its expected output is the cap table after each event, and the one that matters is the cap table after the Series A.

## Before the round

| Event | What happens | Result |
|---|---|---|
| Founding | Founder A gets 4,500,000 common and Founder B 1,500,000. | 6,000,000 common |
| Option pool | A pool of 20% of fully diluted shares (`ASSUMPTIONS.md` R2): 6,000,000 × 0.2 ÷ 0.8 = 1,500,000. | Pool 1,500,000, so fully diluted is 7,500,000 |
| Grants | Employee C is granted 500,000 options at $0.25 from the pool. | 500,000 options, 1,000,000 unissued |

Just before the Series A, the company has 6,500,000 issued shares and options, and 1,000,000 unissued pool shares. That is 7,500,000 fully diluted, and the unissued pool is 13.33% of it.

## The Series A terms

- Investor X invests **$5,000,000** at a **$20,000,000 pre-money** valuation, so the post-money valuation is $25,000,000.
- The unissued pool must be **15% of the post-money fully diluted shares** after the round. The top-up sits **in the pre-money** (`SPEC.md`, Pool top-up).

## Solving the round

The price is the post-money valuation ÷ the post-money fully diluted shares (`SPEC.md`, Priced round). Those shares include the pool at its target size, so the price depends on the share count, and the share count depends on the price. Call the post-money fully diluted shares x:
- **Existing issued shares and options:** 6,500,000.
- **The unissued pool at target:** 15% of x.
- **The new shares:** $5M ÷ ($25M ÷ x) = 20% of x. The investor owns exactly its money ÷ the post-money valuation.

So x = 6,500,000 + 0.15x + 0.20x, which gives 0.65x = 6,500,000 and x = **10,000,000**.

- **Price per share:** $25,000,000 ÷ 10,000,000 = **$2.50**
- **Series A shares:** $5,000,000 ÷ $2.50 = **2,000,000**
- **Unissued pool:** 15% × 10,000,000 = **1,500,000**, a top-up of **500,000**

Every count comes out whole, so no rounding is needed (R3). Millrace's three rounds exercise the rounding.

**What "in the pre-money" means.** The $20M pre-money buys 8,000,000 pre-money shares at $2.50:
- the 6,500,000 existing shares and options
- the 1,000,000-share pool that already existed
- the 500,000-share top-up

The new pool shares are part of what the $20M pays for. So they dilute only the people who were there before the round, and the investor still gets exactly 20%.

## Cap table after the Series A

| Holder | Security | Shares | Fully diluted % |
|---|---|---:|---:|
| Founder A | Common | 4,500,000 | 45.00% |
| Founder B | Common | 1,500,000 | 15.00% |
| Employee C | Options ($0.25) | 500,000 | 5.00% |
| Investor X | Series A Preferred | 2,000,000 | 20.00% |
| Unissued pool | | 1,500,000 | 15.00% |
| **Total** | | **10,000,000** | **100.00%** |

Series A Preferred has an original issue price and conversion price of $2.50, a 1x non-participating preference, and no anti-dilution. Its preference is 2,000,000 × $2.50 = $5,000,000.

## Compared with no top-up

Without the top-up, the pool would stay at 1,000,000. Then x = 7,500,000 + 0.20x, which gives x = 9,375,000. The price would be $25M ÷ 9,375,000 = $2.666667, which is simply $20M ÷ the 7,500,000 pre-round fully diluted shares.

| | With the top-up (this case) | Without it |
|---|---:|---:|
| Price per share | $2.50 | $2.666667 |
| Series A shares | 2,000,000 | 1,875,000 |
| Investor X | 20.00% | 20.00% |
| Founders A + B | 60.00% | 64.00% |
| Employee C | 5.00% | 5.33% |
| Unissued pool | 15.00% | 10.67% |

The investor holds 20% either way, because it paid $5M of a $25M post-money valuation. The top-up's cost falls entirely on the existing holders.
- **In ownership:** the founders go from 64% to 60%.
- **In value:** their 6,500,000 shares and options plus the old pool, 7,500,000 shares, are worth $18.75M at $2.50, not the $20M headline. The other $1.25M of the pre-money is the 500,000 new pool shares.

## Checking this independently

The answer is the post–Series A cap table above. These three wrong rules give different numbers, so the case catches them:
- **The top-up is added after the round (post-money), not in the pre-money.** The price would be $2.666667, not $2.50.
- **15% is of the pre-money fully diluted shares, pool included.** The pool would be 0.15 × 6,500,000 ÷ 0.85 = 1,147,058 shares, not 1,500,000.
- **15% counts issued options as well as the unissued pool.** The 500,000 granted options plus the 1,000,000 unissued would already be 16% of the 9,375,000 shares there would be without a top-up, so there would be no top-up.

Tolerance is 1 share for share counts.
