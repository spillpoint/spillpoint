# Edge case 12h: derivation

This is edge case 12's company: 9,000,000 common (Founder A 6,000,000, Founder B 3,000,000), 500,000 options at $5.00 held by Employee C, and a 1,000,000-share unissued pool.

Investor X's $1,000,000 SAFE is an **MFN SAFE**, with **no valuation cap and no discount**.

## The rule (`ASSUMPTIONS.md` X9)

At a sale the SAFE gets the greater of two amounts:
- **Cash-Out Amount:** its $1,000,000 purchase amount, paid ahead of common.
- **Conversion Amount:** with no cap, it converts at the sale's common price per share less its discount. Here the discount is 0%, so it converts at the common price itself.

As in edge case 12c, the conversion is a fixed point. The SAFE gets $1,000,000 ÷ p shares, each worth the common price p: **exactly $1,000,000**, the same as its Cash-Out Amount.

The two amounts are equal wherever conversion is possible, so the SAFE takes its Cash-Out Amount (`ASSUMPTIONS.md` E5, X16). **An MFN SAFE at a sale is a claim of its purchase amount ahead of common**, and never shares in the upside.

Its MFN clause lets it adopt better terms from a SAFE issued later. That isn't modeled: the inputs carry its terms as they stand at the sale.

## Breakpoints

| Exit value | Why |
|---:|---|
| $1,000,000 | The Cash-Out Amount is paid in full. Above this, the next dollar goes to common. |

**The options never come into the money in this range.** Common's price is (exit value + $2.5M of strike cash − $1,000,000) ÷ 9,500,000 once they're exercised. That passes $5.00 only above $46,000,000, outside this case's $0 to $40M range.

## Payouts

| Exit | Founder A | Founder B | Employee C | Investor X (SAFE) |
|---:|---:|---:|---:|---:|
| $500K | 0 | 0 | 0 | 500,000 |
| $1M | 0 | 0 | 0 | 1,000,000 |
| $5M | 2,666,666.67 | 1,333,333.33 | 0 | 1,000,000 |
| $10M | 6,000,000 | 3,000,000 | 0 | 1,000,000 |
| $40M | 26,000,000 | 13,000,000 | 0 | 1,000,000 |

`expected.json` reports the Conversion Amount: a 0% discount, worth $1,000,000.
