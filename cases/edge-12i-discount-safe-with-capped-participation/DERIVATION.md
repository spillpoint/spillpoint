# Edge case 12i: derivation

This is edge case 4's company:
- **Common:** Founder A 6,000,000 and Founder B 2,000,000.
- **Seed Preferred:** Investor X 1,500,000 and Investor Y 500,000, 2,000,000 shares at $1.50.

The Seed is 1x **participating, capped at 3x**. Its preference is $3,000,000, and preference plus participation stops at 3 × $1.50 × 2,000,000 = **$9,000,000**.

Investor Z holds a **$1,000,000 SAFE with no valuation cap and a 20% discount**, still outstanding at the sale.

## The SAFE's two amounts (X1, X9)

- **Cash-Out Amount:** its $1,000,000 purchase amount. Alongside preferred it ranks with the most junior tier, here the Seed's, shared pro rata with the Seed's preference (X9).
- **Conversion Amount:** with no cap, it converts at the sale's common price p less its discount, so at 0.8p. That's $1,000,000 ÷ 0.8p shares, each worth p: **exactly $1,250,000**, whatever p is.

## With the Seed capped, the conversion is still worth exactly $1,250,000

This is what the case settles. The SAFE's shares depend on the common price, and with a capped series sharing the residual, so does whether the Seed is at its cap. The fixed point still has one simple answer:
- **The SAFE takes $1,250,000 out of the residual first.** Its shares × the common price is $1,250,000, so it never shares in anything beyond that.
- **The Seed and common then share what's left** at one price per share, the Seed stopping at its cap.
- **The common price is what they share it at,** and the SAFE's share count is $1,250,000 ÷ that price.

So every payout stays a straight line between breakpoints, and the SAFE's take is exactly $1,250,000 wherever it converts.

**Where conversion is possible:** what's left after the preferences, with the SAFE converting, must be more than $1,250,000, so that common's price is positive. With the Seed's $3,000,000 preference out first, that is above **$4,250,000** (in the formula's terms, 0.8 × (X − $3,000,000) > $1,000,000).

## Exit value by exit value

**Up to $4,000,000: the Seed's tier is short.** The Seed's $3,000,000 preference and the SAFE's $1,000,000 Cash-Out Amount share the tier 3:1. At $2M, the Seed gets $1,500,000 (X $1,125,000, Y $375,000) and the SAFE $500,000.

**$4,000,000 to $4,250,000: the tier is paid in full, and conversion isn't possible yet.**
- **The SAFE** keeps its $1,000,000.
- **The rest** goes to the residual, shared by common's 8,000,000 shares and the Seed's 2,000,000 participating shares.
- **At $4,250,000:** $250,000 is left, at $0.025 a share. Common gets $200,000 and the Seed $3,050,000.

**At $4,250,000 the payouts jump.** Just above it, conversion becomes possible, worth $1,250,000, more than the $1,000,000 cash-out, so the SAFE converts:
- **The SAFE** gets $1,250,000.
- **The residual,** X − $3,000,000 − $1,250,000, is almost nothing.
- **Common** falls from $200,000 to about nothing, and **the Seed** from $3,050,000 to about $3,000,000.

At exactly $4,250,000 the outcome from below holds. This is case 12c's jump (X9, reading (a)).

**$4,250,000 to $34,250,000: the SAFE has converted, and the Seed participates.**
- **The common price:** p = (X − $4,250,000) ÷ 10,000,000.
- **The Seed's total:** $3,000,000 + 2,000,000p.
- **The cap binds** when that reaches $9,000,000: p = $3.00, at X = **$34,250,000**.
- **At $10M:** p = $0.575.
  - Common: $4,600,000 (A $3,450,000, B $1,150,000).
  - The Seed: $4,150,000 (X $3,112,500, Y $1,037,500).
  - The SAFE: $1,250,000, as 2,173,913.04 shares at $0.575. Its conversion price is $0.46.

**$34,250,000 to $46,250,000: the Seed sits at its $9,000,000 cap.** Common takes X − $9,000,000 − $1,250,000. At $40M that is $29,750,000 (A $22,312,500, B $7,437,500), $3.71875 a share.

**Above $46,250,000: the Seed converts.**
- **Converting,** its 2,000,000 shares share X − $1,250,000 with common's 8,000,000: a fifth of it.
- **That beats $9,000,000** once X − $1,250,000 > $45,000,000, at X = **$46,250,000**. There it's indifferent, $4.50 a share either way, so payouts bend; they don't jump.
- **At $50M:** $48,750,000 at $4.875 a share. The Seed gets $9,750,000 and common $39,000,000.

## Breakpoints

| Exit value | Why |
|---:|---|
| $4,000,000 | The Seed's tier, its preference and the SAFE's Cash-Out Amount, is paid in full. |
| $4,250,000 | Payouts jump: the SAFE's conversion first becomes possible, worth $1,250,000. |
| $34,250,000 | The Seed reaches its 3x cap: preference plus participation is $9,000,000. |
| $46,250,000 | The Seed converts: $4.50 a share as common equals its capped $9,000,000. |

## Payouts at the listed exit values

| Exit | Founder A | Founder B | Investor X | Investor Y | Investor Z (SAFE) |
|---:|---:|---:|---:|---:|---:|
| $2M | 0 | 0 | 1,125,000 | 375,000 | 500,000 |
| $4M | 0 | 0 | 2,250,000 | 750,000 | 1,000,000 |
| $4.25M | 150,000 | 50,000 | 2,287,500 | 762,500 | 1,000,000 |
| $10M | 3,450,000 | 1,150,000 | 3,112,500 | 1,037,500 | 1,250,000 |
| $34.25M | 18,000,000 | 6,000,000 | 6,750,000 | 2,250,000 | 1,250,000 |
| $40M | 22,312,500 | 7,437,500 | 6,750,000 | 2,250,000 | 1,250,000 |
| $46.25M | 27,000,000 | 9,000,000 | 6,750,000 | 2,250,000 | 1,250,000 |
| $50M | 29,250,000 | 9,750,000 | 7,312,500 | 2,437,500 | 1,250,000 |
| $60M | 35,250,000 | 11,750,000 | 8,812,500 | 2,937,500 | 1,250,000 |

Investor Z's take is exactly $1,250,000 at every exit value where it converts.
