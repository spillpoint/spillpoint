# Edge case 16g: derivation

A bridge SAFE converting in a down round that triggers the Seed's broad-based anti-dilution. This was refused until now. You settled it in the 0.3.0 plan, answers 3a and 3c:
- **3a:** a SAFE or note issued after a series is a convertible security whose share count first becomes known in this round, so it's tested as an issue in this round.
- **3c:** each piece of the round is tested at its own price. Only the pieces priced below the series' conversion price go into B and C, and A stays the shares outstanding before the round.

## The company before the Series A

1. **Founding, Jan 10, 2022:** Founder A 6,000,000 common and Founder B 2,000,000.
2. **Seed, Jun 30, 2022:** Investor X's $2,000,000 at an $8,000,000 pre-money valuation: **$1.00** a share, 2,000,000 shares. 1x non-participating, with broad-based weighted-average anti-dilution, A counting outstanding common, options and preferred (R7).
3. **SAFE, Jun 30, 2023:** Investor S, $1,000,000, a **$6,000,000 post-money cap**, no discount. It was issued after the Seed.
4. **Series A, Jun 30, 2024:** Investor Y's $2,000,000 at an $8,000,000 pre-money valuation, $10,000,000 post-money. It converts the SAFE.

## The SAFE (R4)

- **Company Capitalization:** 10,000,000 ÷ (1 − $1M ÷ $6M) = **12,000,000**.
- **Conversion price:** $6,000,000 ÷ 12,000,000 = **$0.50**, so **2,000,000 shares**.

## The pieces, against the Seed's $1.00

| Piece | Price | Below $1.00? | What was paid | Shares |
|---|---:|---|---:|---:|
| The new money | the round's price, P | yes, it's a down round | $2,000,000 | Y's new shares |
| Investor S's SAFE | $0.50 | yes | $1,000,000 | 2,000,000 |

Both count, so:
- **A** = 10,000,000, the shares outstanding before the round (8,000,000 common and 2,000,000 Seed).
- **B** = ($2,000,000 + $1,000,000) ÷ $1.00 = 3,000,000.
- **C** = the new shares + 2,000,000.

## Solving the round (R10: the adjustment shares are in its price)

Call the post-money fully diluted shares x, so P = $10,000,000 ÷ x, and the new shares are a fifth of x.
- **The Seed's conversion price** becomes $1.00 × (A + B) ÷ (A + C) = 13,000,000 ÷ (12,000,000 + 0.2x).
- **Its 2,000,000 shares** then convert into 2,000,000 × (12,000,000 + 0.2x) ÷ 13,000,000.
- **The adjustment adds** 2,000,000 × (0.2x − 1,000,000) ÷ 13,000,000 shares.

**Solving:** x = 10,000,000 + 2,000,000 + 0.2x + 2,000,000 × (0.2x − 1,000,000) ÷ 13,000,000.
- Times 13: 10.4x = 156,000,000 + 0.4x − 2,000,000.
- So **x = 15,400,000**.
- **The price:** $10,000,000 ÷ 15,400,000 = **$0.649351** ($50 ÷ 77).
- **Investor Y** gets 3,080,000 shares, exactly a fifth.

## The Seed's new conversion price (R8: from what was actually issued)

- **A** = 10,000,000.
- **B** = (3,080,000 × $50/77 + $1,000,000) ÷ $1.00 = ($2,000,000 + $1,000,000) = 3,000,000.
- **C** = 3,080,000 + 2,000,000 = 5,080,000.
- **CP2** = $1.00 × 13,000,000 ÷ 15,080,000 = **$0.862069** ($25 ÷ 29).
- **Each Seed share** now converts into **1.16 common**.

In a down round every piece is below the conversion price. So this reading and the one-issue reading agree here: the round's pieces together are $3,000,000 for 5,080,000 shares, all below $1.00.

## The cap table after the Series A

| Holder | Class | Shares | Fully diluted |
|---|---|---:|---:|
| Founder A | Common | 6,000,000 | 38.9610% |
| Founder B | Common | 2,000,000 | 12.9870% |
| Investor X | Seed Preferred, converting at 1.16 | 2,000,000 | 15.0649% (2,320,000 as converted) |
| Investor S | Series A Preferred (from SAFEs), at $0.50 | 2,000,000 | 12.9870% |
| Investor Y | Series A Preferred, at $0.649351 | 3,080,000 | 20.0000% |
| Total, as converted | | 15,400,000 | |

Edge case 16h is this round with the SAFE's conversion exempt.
