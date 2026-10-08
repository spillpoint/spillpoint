# Edge case 8b: derivation

This is edge case 8's company:
- **Common:** Founder A 6,000,000 and Founder B 2,000,000.
- **Seed Preferred:** Investor X's 2,000,000 shares at $1.00, 1x non-participating, one tier.
- **Lender L's warrant:** for 200,000 Seed shares at a $0.50 strike. Once exercised, they're Seed shares, with Seed's $1.00 preference and conversion right (E12).

It adds a **flat 10% management carve-out paid alongside the preferences**, all to Manager M, who holds no shares.

## How the carve-out curves the payouts (X7, X17)

Alongside the preferences, the carve-out joins the Seed's tier, sharing it pro rata by claim:
- **Its claim** is 10% of the exit value, X, before any strike cash (X7).
- **The Seed's claim** is $1.00 a share: $2,000,000, or $2,200,000 with the warrant exercised.

While the tier isn't paid in full, each share of what's paid depends on the carve-out's claim, which grows with X, so payouts curve.

## Where the warrant comes into the money

Exercised, the warrant pays its $100,000 strike, which is added to the proceeds. Its 200,000 shares join the tier. While the tier is short, every Seed share then gets:

(X + $100,000) ÷ ($2,200,000 + 0.1X)

**The warrant is worth exercising once that is more than its $0.50 strike:**
- X + $100,000 > $1,100,000 + 0.05X
- 0.95X > $1,000,000
- X > **$1,052,631.58**, exactly $20,000,000 ÷ 19.

That's on the curve, with the tier still short ($2,305,263.16 of claims against $1,152,631.58 of cash).

**Payouts meet there: a kink, not a jump.**
- Exercising at exactly that point, each Seed share gets $0.50, the strike, so the warrant nets nothing.
- Investor X's 2,000,000 shares get $1,000,000 either way. Unexercised, its share of the tier is 2,000,000 ÷ 2,105,263.16 = 95% of $1,052,631.58, which is also $1,000,000.
- Manager M gets $52,631.58 either way.

The reference fits the warrant's gain from exercising exactly, as one straight line over another, from three readings. It checks the fit against a fourth, and solves where the gain is zero.

## After that

- **The tier is paid in full** once X + $100,000 reaches $2,200,000 + 0.1X: 0.9X = $2,100,000, at **X = $2,333,333.33** ($7,000,000 ÷ 3). The curve ends here: above it, the carve-out's 10% and the Seed's $2,200,000 are paid, and common takes 0.9X − $2,100,000.
- **The Seed converts** once its 2,200,000 shares' share of what's left beats its preference:
  - Converting, what's left is 0.9X + $100,000, over 10,200,000 shares.
  - 2,200,000 × (0.9X + $100,000) ÷ 10,200,000 > $2,200,000 gives 0.9X + $100,000 > $10,200,000.
  - That's **X = $11,222,222.22** ($101,000,000 ÷ 9), at $1.00 a share either way, so payouts bend; they don't jump.

## Breakpoints

| Exit value | Why |
|---:|---|
| $1,052,631.58 | The warrant comes into the money, on the curve: each Seed share is now worth its $0.50 strike. Payouts curve on both sides. |
| $2,333,333.33 | The tier is paid in full: the Seed's $2,200,000 and the carve-out's $233,333.33. Payouts curve just below. |
| $11,222,222.22 | The Seed converts: $1.00 a share as common equals its 1x preference. |

## Payouts at the listed exit values

| Exit | Investor X | Lender L | Manager M | Founder A | Founder B | Warrant |
|---:|---:|---:|---:|---:|---:|---|
| $0.5M | 487,804.88 | 0 | 12,195.12 | 0 | 0 | not exercised |
| $1.5M | 1,361,702.13 | 36,170.21 | 102,127.66 | 0 | 0 | exercised |
| $5M | 2,000,000 | 100,000 | 500,000 | 1,800,000 | 600,000 | exercised |
| $15M | 2,666,666.67 | 166,666.67 | 1,500,000 | 8,000,000 | 2,666,666.67 | exercised; the Seed converts |
| $20M | 3,549,019.61 | 254,901.96 | 2,000,000 | 10,647,058.82 | 3,549,019.61 | exercised; the Seed converts |

- **$0.5M:** the tier's claims are $2,050,000 and the cash $500,000, so the Seed gets 2,000,000 ÷ 2,050,000 of it and the carve-out the rest.
- **$1.5M:** with the warrant exercised, the cash is $1,600,000 and the claims $2,350,000, so each Seed share gets $0.680851. Lender L nets 200,000 × that − $100,000.
- **$5M:** common takes $4,500,000 − $2,100,000 = $2,400,000, at $0.30 a share.
- **$15M:** the Seed has converted; $13,600,000 is shared by 10,200,000 shares, at $1.333333.
