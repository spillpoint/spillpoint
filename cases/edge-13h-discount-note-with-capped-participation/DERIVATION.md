# Edge case 13h: derivation

Edge case 12i's company, with a note in place of the SAFE:
- **Common:** Founder A 6,000,000 and Founder B 2,000,000.
- **Seed Preferred:** Investor X 1,500,000 and Investor Y 500,000, 2,000,000 shares at $1.50, 1x **participating, capped at 3x**. Its preference is $3,000,000, and it stops at $9,000,000 in all.
- **Investor Z's note:** $1,000,000 at 6% simple interest, issued Jan 1, 2022, with **no valuation cap and a 20% discount**, repaid at 1x.

The sale is on **Jan 1, 2024**.

## The note's two amounts (X3, X12)

- **Interest:** 730 days, Actual/365, so exactly two years at 6%: $120,000. The note owes $1,120,000.
- **Repayment:** $1,120,000 (1x principal plus interest). It's debt, paid ahead of all equity.
- **Conversion:** with no cap, it converts at the sale's common price p less its discount. $1,120,000 ÷ 0.8p shares, each worth p: **exactly $1,400,000**, whatever p is.

## With the Seed capped, the conversion is still worth exactly $1,400,000

This is as in 12i:
1. The converting note takes $1,400,000 out of the residual first.
2. The Seed and common share what's left at one price, the Seed stopping at its cap.
3. The common price is what they share it at.

Every payout stays a straight line between breakpoints.

**Where conversion is possible:** what's left after the Seed's preference, with the note converting, must be more than $1,400,000. That is X − $3,000,000 > $1,400,000, above **$4,400,000**.

## Exit value by exit value

- **Up to $1,120,000:** every dollar repays the note.
- **$1,120,000 to $4,120,000:** the note is repaid in full. The Seed takes the rest, up to its $3,000,000 preference. At $3M it gets $1,880,000 (X $1,410,000, Y $470,000).
- **$4,120,000 to $4,400,000:** the Seed's preference is paid. The rest is shared by common's 8,000,000 shares and the Seed's 2,000,000 participating shares. At $4,400,000, $280,000 is left at $0.028 a share: common gets $224,000 and the Seed $3,056,000.
- **At $4,400,000 the payouts jump.** Just above it, converting is possible and worth $1,400,000, more than the $1,120,000 repayment. So the note converts:
  - **The note** gains $280,000.
  - **Common** falls from $224,000 to about nothing.
  - **The Seed** falls from $3,056,000 to about $3,000,000.

  At exactly $4,400,000 the outcome from below holds (X12, reading (a)).
- **$4,400,000 to $34,400,000:** p = (X − $4,400,000) ÷ 10,000,000, and the Seed gets $3,000,000 + 2,000,000p.
  - **At $10M:** p = $0.56.
    - Common: $4,480,000 (A $3,360,000, B $1,120,000).
    - The Seed: $4,120,000 (X $3,090,000, Y $1,030,000).
    - The note: $1,400,000, as 2,500,000 shares at $0.56. Its conversion price is $0.448.
  - **The cap binds** at p = $3.00, at X = **$34,400,000**.
- **$34,400,000 to $46,400,000:** the Seed sits at $9,000,000. Common takes X − $10,400,000; at $40M, $29,600,000 (A $22,200,000, B $7,400,000).
- **Above $46,400,000:** the Seed converts. Its fifth of X − $1,400,000 beats $9,000,000 above $46,400,000; there it's indifferent, at $4.50 a share. At $50M, $48,600,000 at $4.86 a share: the Seed gets $9,720,000 and common $38,880,000.

## Breakpoints

| Exit value | Why |
|---:|---|
| $1,120,000 | The note's $1,120,000 repayment is paid in full. |
| $4,120,000 | The Seed's $3,000,000 preference is paid in full. |
| $4,400,000 | Payouts jump: the note's conversion first becomes possible, worth $1,400,000. |
| $34,400,000 | The Seed reaches its 3x cap. |
| $46,400,000 | The Seed converts: $4.50 a share as common equals its capped $9,000,000. |

## Payouts at the listed exit values

| Exit | Founder A | Founder B | Investor X | Investor Y | Investor Z (note) |
|---:|---:|---:|---:|---:|---:|
| $1M | 0 | 0 | 0 | 0 | 1,000,000 |
| $3M | 0 | 0 | 1,410,000 | 470,000 | 1,120,000 |
| $4.12M | 0 | 0 | 2,250,000 | 750,000 | 1,120,000 |
| $4.4M | 168,000 | 56,000 | 2,292,000 | 764,000 | 1,120,000 |
| $10M | 3,360,000 | 1,120,000 | 3,090,000 | 1,030,000 | 1,400,000 |
| $34.4M | 18,000,000 | 6,000,000 | 6,750,000 | 2,250,000 | 1,400,000 |
| $40M | 22,200,000 | 7,400,000 | 6,750,000 | 2,250,000 | 1,400,000 |
| $46.4M | 27,000,000 | 9,000,000 | 6,750,000 | 2,250,000 | 1,400,000 |
| $50M | 29,160,000 | 9,720,000 | 7,290,000 | 2,430,000 | 1,400,000 |
| $60M | 35,160,000 | 11,720,000 | 8,790,000 | 2,930,000 | 1,400,000 |

Investor Z's take is exactly $1,400,000 at every exit value where it converts.
