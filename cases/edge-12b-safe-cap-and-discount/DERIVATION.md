# Edge case 12b: derivation

This is edge case 12 exactly, except that Investor X's $1,000,000 post-money SAFE has a **20% discount** as well as its $10,000,000 valuation cap.

## The rule

At a sale, a SAFE with a cap uses **only the cap** (`ASSUMPTIONS.md` X9). Its discount is a discount on the price of a future financing. A sale has no such price, and the YC SAFE's Liquidity Price is the cap ÷ the Liquidity Capitalization, with no discount in it.

So everything in edge case 12's derivation holds unchanged:
- **Liquidity Capitalization:** 10,555,555.56 (exactly 95,000,000/9).
- **Liquidity Price:** $0.947368 (exactly 18/19).
- **Conversion shares:** 1,055,555.56.
- **Breakpoints:**
  - $1,000,000: the Cash-Out Amount is fully paid.
  - $9,526,315.79: the SAFE switches to its Conversion Amount.

## Payouts

| Exit | Founder A | Founder B | Employee C | Investor X (SAFE) | SAFE takes |
|---:|---:|---:|---:|---:|---|
| $0.5M | 0 | 0 | 0 | 500,000 | Cash-Out Amount |
| $1M | 0 | 0 | 0 | 1,000,000 | Cash-Out Amount |
| $5M | 2,666,666.67 | 1,333,333.33 | 0 | 1,000,000 | Cash-Out Amount |
| $9M | 5,333,333.33 | 2,666,666.67 | 0 | 1,000,000 | Cash-Out Amount |
| $9,526,315.79 | 5,684,210.53 | 2,842,105.26 | 0 | 1,000,000 | indifferent; shown as Cash-Out Amount |
| $10M | 5,966,850.83 | 2,983,425.41 | 0 | 1,049,723.76 | Conversion Amount |
| $20M | 11,933,701.66 | 5,966,850.83 | 0 | 2,099,447.51 | Conversion Amount |
| $40M | 23,867,403.31 | 11,933,701.66 | 0 | 4,198,895.03 | Conversion Amount |

## Why this case tells the rules apart

Applying the discount at a sale would give a different answer. Converting at the common price less 20% is worth $1,000,000 ÷ 0.8 = $1,250,000, once there is room for it (edge case 12c works through this). So:
- **The SAFE would take $1,250,000** at $5M and $9M, not $1,000,000.
- **It would switch** at $1,250,000, not at $9,526,315.79.
