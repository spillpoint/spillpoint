# Edge case 12c: derivation

This is edge case 12's company: 9,000,000 common (Founder A 6,000,000, Founder B 3,000,000), 500,000 options at $5.00, and a 1,000,000-share unissued pool. Investor X's $1,000,000 SAFE has **no valuation cap** and a **20% discount**.

## The rule

At a sale the SAFE gets the **greater** of two amounts (`ASSUMPTIONS.md` X1, X9):
- **Cash-Out Amount:** its $1,000,000 purchase amount, paid ahead of common.
- **Conversion Amount:** with no cap, it converts at the sale's common price per share **less its discount**: $1,000,000 ÷ (0.8 × the common price) shares, paid alongside common.

The common price depends on how many shares the SAFE gets, and the SAFE's shares depend on the price, so the two are solved together, as a fixed point.

## The Conversion Amount is always $1,250,000

Call the common price p. The SAFE gets $1,000,000 ÷ (0.8p) shares, each worth p. That is $1,000,000 ÷ 0.8 = **$1,250,000**, whatever p turns out to be. A discount-only SAFE converting at a sale is a fixed claim of its purchase amount ÷ (1 − discount); it never shares in the upside beyond that.

**Where conversion is possible.** The SAFE's $1,250,000 comes out of what is left for common and the SAFE together, here the whole exit value. That must be more than $1,250,000, or common's price would have to be zero or negative.
- **Above $1,250,000**, there is exactly one consistent price. At $2M, common's 9,000,000 shares share $750,000, a price of $0.083333. The SAFE converts at 0.8 × that = $0.066667, into 15,000,000 shares, worth $1,250,000: 9,000,000 + 15,000,000 = 24,000,000 shares share $2M at $0.083333 each.
- **At $1,250,000 or below**, no price works.

## Below $1,250,000: the literal reading

Where no Conversion Amount exists, the greater-of has only one amount to take: **the Cash-Out Amount**. So:
- **Up to $1,000,000,** the SAFE takes every dollar.
- **From $1,000,000 to $1,250,000,** it stays at $1,000,000 and common takes the rest.
- **Just above $1,250,000,** conversion becomes possible. It pays $1,250,000, more than the cash-out, so the SAFE converts.

**At $1,250,000 the payouts jump.** The SAFE's payout jumps from $1,000,000 to $1,250,000, and common's drops from $250,000 to nothing. The cause is real: this is where conversion first becomes possible. At exactly $1,250,000 the outcome from below still applies.

**The other reading.** One could instead let conversion take everything left, up to $1,250,000. The SAFE would then get min(exit value, $1,250,000), with no jump. `ASSUMPTIONS.md` X9 records it as the other defensible reading. The literal one doesn't hand the SAFE money the text doesn't clearly give it, at the low exits where common most needs protection.

## Breakpoints

| Exit value | Why |
|---:|---|
| $1,000,000 | The Cash-Out Amount is fully paid. Above this, the next dollar goes to common. |
| $1,250,000 | Payouts jump. Conversion first becomes possible here, and is worth $1,250,000. Below, the SAFE takes its $1,000,000 Cash-Out Amount; above, it converts. |

**The options never come into the money in this range.** With the SAFE converted, common's price is (exit value + $2.5M of strike cash − $1,250,000) ÷ 9,500,000. That passes $5.00 only above $46,250,000, outside this case's $0 to $40M range.

## Payouts

| Exit | Founder A | Founder B | Employee C | Investor X (SAFE) | SAFE takes |
|---:|---:|---:|---:|---:|---|
| $0.5M | 0 | 0 | 0 | 500,000 | Cash-Out Amount |
| $1M | 0 | 0 | 0 | 1,000,000 | Cash-Out Amount |
| $1.2M | 133,333.33 | 66,666.67 | 0 | 1,000,000 | Cash-Out Amount |
| $1.25M | 166,666.67 | 83,333.33 | 0 | 1,000,000 | Cash-Out Amount (the jump is just above) |
| $2M | 500,000 | 250,000 | 0 | 1,250,000 | Conversion Amount |
| $10M | 5,833,333.33 | 2,916,666.67 | 0 | 1,250,000 | Conversion Amount |
| $40M | 25,833,333.33 | 12,916,666.67 | 0 | 1,250,000 | Conversion Amount |

Above $1,250,000 the founders split everything beyond $1,250,000 2:1 by shares.
