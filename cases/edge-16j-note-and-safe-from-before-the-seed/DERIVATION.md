# Edge case 16j: derivation

A note and a SAFE issued **before** the Seed, left outstanding through the Seed's round, convert in a down Series A that triggers the Seed's anti-dilution. You settled this in the 0.3.0 plan, answer 3d: an instrument already outstanding when the Seed bought in doesn't count against the Seed. Its conversion stays out of B and C, and it goes in A at the shares it receives, as an exempt conversion does under 16h's toggle.

Both instruments convert at their caps, so their shares don't depend on the round's price and the price solves exactly. (At a discount, their shares in A would move with the price. With the adjustment in the price, that makes a quadratic, which is refused, as in 16h. See the end.)

## The company before the Series A

1. **Founding, Jan 10, 2022:** Founder A 6,000,000 common and Founder B 2,000,000.
2. **Note, Jan 15, 2022:** Investor N, **$400,000** at 5% simple interest, a **$4,000,000 pre-money cap** on the shares outstanding and the pool (X10), and a 20% discount.
3. **SAFE, Mar 1, 2022:** Investor S, **$600,000**, a **$4,000,000 pre-money cap** and a 20% discount.
4. **Seed, Jun 30, 2022:** Investor X's $2,000,000 at an $8,000,000 pre-money valuation: **$1.00** a share, 2,000,000 shares. 1x non-participating, with broad-based weighted-average anti-dilution (R7).
   - **The Seed converts neither instrument.** Both stay outstanding (`convert_notes` and `convert_safes` off), as when a note's qualified-financing threshold isn't met and the SAFE holder agrees to wait.
   - **The Seed's price** counts only the stock outstanding, 8,000,000 shares. The note and SAFE aren't shares yet.
5. **Series A, Jan 15, 2024:** Investor Y's $2,000,000 at an **$8,000,000 pre-money** valuation, $10,000,000 post-money. It converts both.

## The conversions

Both caps divide by the 10,000,000 shares outstanding just before the Series A: 8,000,000 common and the Seed's 2,000,000. They count the Seed at its conversion ratio before the round's adjustment, as 16g's SAFE does: the count is taken just before the financing, and the adjustment comes from the financing (R25).
- **The note's interest:** Jan 15, 2022 to Jan 15, 2024 is 730 days, no leap day among them. That's 5% × 730 ÷ 365 = 10%, so $40,000, and **$440,000 converts**.
- **Investor N's note:** $4,000,000 ÷ 10,000,000 = **$0.40**, so $440,000 ÷ $0.40 = **1,100,000 shares**.
- **Investor S's SAFE (R24):** Company Capitalization is the stock outstanding and the pool, with no pool here, so 10,000,000. $4,000,000 ÷ 10,000,000 = **$0.40**, so $600,000 ÷ $0.40 = **1,500,000 shares**.

Both caps beat the discount: the round's price comes out at $0.626806 below, and 0.8 × that is $0.501445, above $0.40.

## The pieces, against the Seed's $1.00

| Piece | Price | Issued | Counted |
|---|---:|---|---|
| The new money | P | in the Series A | in B and C: it's a down round |
| Investor S's SAFE | $0.40 | **before the Seed** | in A, at its 1,500,000 shares |
| Investor N's note | $0.40 | **before the Seed** | in A, at its 1,100,000 shares |

Both conversions are below $1.00, but neither counts against the Seed. When the Seed bought in, both were already outstanding claims on the company's shares.

- **A** = 10,000,000 + 1,500,000 + 1,100,000 = **12,600,000**.
- **B** = $2,000,000 ÷ $1.00 = 2,000,000.
- **C** = the new shares, a fifth of x.

## Solving the round (R10)

Call the post-money fully diluted shares x, so P = $10,000,000 ÷ x.
- **The Seed's conversion price** becomes $1.00 × (12,600,000 + 2,000,000) ÷ (12,600,000 + 0.2x).
- **The adjustment adds** 2,000,000 × (0.2x − 2,000,000) ÷ 14,600,000 shares.

**Solving:** x = 10,000,000 + 1,100,000 + 1,500,000 + 0.2x + 2,000,000 × (0.2x − 2,000,000) ÷ 14,600,000.
- Times 14.6: 14.6x = 183,960,000 + 2.92x + 0.4x − 4,000,000.
- So 11.28x = 179,960,000, and **x = 15,953,900.71** (2,249,500,000 ÷ 141).
- **The price:** $10,000,000 ÷ x = **$0.626806** ($2,820 ÷ 4,499).
- **Investor Y:** $2,000,000 buys 3,190,780.14, rounded down to **3,190,780**.

## The Seed's new conversion price (R8)

- **A** = 12,600,000, counting the conversions' whole shares.
- **B** = what was paid for the 3,190,780 whole shares: $1,999,999.91, so 1,999,999.91.
- **C** = 3,190,780.
- **CP2** = $1.00 × 14,599,999.91 ÷ 15,790,780 = **$0.924590**.
- **Each Seed share** now converts into **1.081560** common, so Investor X's 2,000,000 convert into 2,163,120.56.

## For comparison: the same instruments issued after the Seed (answer 3a)

Move the note and the SAFE to after the Seed, keeping their terms. Then each is a piece of the round at its own price, $0.40, below $1.00, so both count against the Seed:
- **A** = 10,000,000.
- **B** = ($2,000,000 + $440,000 + $600,000) ÷ $1.00 = 3,040,000.
- **C** = 0.2x + 2,600,000.
- **Solving:** x = 12,600,000 + 0.2x + 2,000,000 × (0.2x − 440,000) ÷ 13,040,000, which gives x = **16,290,271.13**.
- **The price** is $0.613863, Investor Y gets 3,258,054, and **CP2 is $0.822295**, against 16j's $0.924590.

So under answer 3d the Seed's conversion price falls 7.5% here, not 17.8%. The instruments' own shares are the same either way, since their caps divide by the count before the round.

## The cap table after the Series A

| Holder | Class | Shares | Fully diluted |
|---|---|---:|---:|
| Founder A | Common | 6,000,000 | 37.6084% |
| Founder B | Common | 2,000,000 | 12.5361% |
| Investor X | Seed Preferred, converting at 1.081560 | 2,000,000 | 13.5586% (2,163,120.56 as converted) |
| Investor S | Series A Preferred (from SAFEs), at $0.40 | 1,500,000 | 9.4021% |
| Investor N | Series A Preferred (from notes), at $0.40 | 1,100,000 | 6.8949% |
| Investor Y | Series A Preferred, at $0.626806 | 3,190,780 | 20.0000% |
| Total, as converted | | 15,953,900.56 | |

The total is a little under the solved x, because the shares issued round down and CP2 uses them.

## A combination still refused

If the note had no cap, it would convert at its discount, and its shares in A would depend on the round's price. With the adjustment in the price (R10's default), the price is then the root of a quadratic, so it can't be solved exactly. That's the combination refused in 16h. Following your 03d answer, it's refused **only where the Seed would actually be adjusted**:
- **In this down round,** the uncapped note is refused.
- **In an up round,** for instance $3,000,000 at a $13,500,000 pre-money valuation, it builds. The price is $1.126087, and the note converts at $0.900870, below $1.00. But it's from before the Seed, so it isn't a piece of the round, and nothing adjusts the Seed.
- **The same note issued after the Seed** would adjust it on its own there, as in 16i.

The reference's unit tests check all three.
