# Edge case 16h: derivation

Edge case 16g with the round's toggle on: the SAFE's conversion is **exempt from anti-dilution**, as when the charter carves it out or the Seed waives it. That's the 0.3.0 plan's answer 3a's toggle. The exempt conversion doesn't count in B or C. It counts in A instead, at the shares it receives (answer 3b), since it's treated like a convertible security already outstanding.

Everything before the round is 16g's:
- **The Seed:** Investor X's 2,000,000 at $1.00, broad-based anti-dilution.
- **The SAFE:** Investor S's $1,000,000, converting at $0.50 into 2,000,000 shares.
- **The Series A:** Investor Y's $2,000,000 at an $8,000,000 pre-money valuation.

## The pieces, against the Seed's $1.00

| Piece | Price | Counted | |
|---|---:|---|---|
| The new money | P | in B and C | it's a down round |
| Investor S's SAFE | $0.50 | exempt | its 2,000,000 shares count in A |

- **A** = 10,000,000 + 2,000,000 = 12,000,000.
- **B** = $2,000,000 ÷ $1.00 = 2,000,000.
- **C** = the new shares, a fifth of x.

## Solving the round (R10)

- **The Seed's conversion price** becomes $1.00 × (12,000,000 + 2,000,000) ÷ (12,000,000 + 0.2x).
- **The adjustment adds** 2,000,000 × (0.2x − 2,000,000) ÷ 14,000,000 shares.

**Solving:** x = 10,000,000 + 2,000,000 + 0.2x + 2,000,000 × (0.2x − 2,000,000) ÷ 14,000,000.
- Times 14: 11.2x = 168,000,000 + 0.4x − 4,000,000.
- So **x = 15,185,185.19** (410,000,000 ÷ 27).
- **The price:** $10,000,000 ÷ x = **$0.658537** ($27 ÷ 41), a little above 16g's, since the adjustment is smaller.
- **Investor Y:** $2,000,000 buys 3,037,037.04, rounded down to **3,037,037**.

## The Seed's new conversion price (R8)

- **A** = 12,000,000.
- **B** = what was paid for the 3,037,037 whole shares: $1,999,999.98, so 1,999,999.98.
- **C** = 3,037,037.
- **CP2** = $1.00 × 13,999,999.98 ÷ 15,037,037 = **$0.931034**, against 16g's $0.862069.

The exemption roughly halves the Seed's adjustment: its conversion ratio rises to 1.074074, not 1.16.

## The cap table after the Series A

| Holder | Class | Shares | Fully diluted |
|---|---|---:|---:|
| Founder A | Common | 6,000,000 | 39.5122% |
| Founder B | Common | 2,000,000 | 13.1707% |
| Investor X | Seed Preferred, converting at 1.074074 | 2,000,000 | 14.1463% |
| Investor S | Series A Preferred (from SAFEs), at $0.50 | 2,000,000 | 13.1707% |
| Investor Y | Series A Preferred, at $0.658537 | 3,037,037 | 20.0000% |

## A combination still refused

Under the toggle, a conversion **at its discount** has shares that depend on the round's price. With them in A and the adjustment shares in the price (R10's default), the price is the root of a quadratic, which isn't a rational number, so it can't be solved exactly. The reference refuses that combination with a clear error, and the review note asks you how to settle it. Here the SAFE converts at its cap, so its shares are fixed.
