# Edge case 12g: derivation

This case is built from its events. The exit runs on the cap table after the last one, the SAFE (`ASSUMPTIONS.md` C2). It tests the path a company built on the Rounds tab takes to a sale.

## The events

1. **Founding, 2022-01-10:** 9,000,000 common. Founder A 6,000,000, Founder B 3,000,000.
2. **Option pool, 2022-03-01:** 10% of the fully diluted shares after it: 9,000,000 ÷ 0.9 − 9,000,000 = **1,000,000** shares.
3. **Grants, 2022-03-01:** 500,000 options at $5.00 to Employee C, leaving 500,000 in the unissued pool.
4. **SAFE, 2023-01-01:** Investor X's $1,000,000 SAFE, on a **pre-money** valuation cap of $8,000,000, with no discount.

This is case 12's company, with two differences:
- **The SAFE is pre-money.** Case 12's is post-money, with a $10M cap.
- **The unissued pool is 500,000 shares, not 1,000,000.** A pre-money SAFE leaves the pool out of its count at a sale, so this changes nothing below.

## The rules (`ASSUMPTIONS.md` X14)

The YC pre-money SAFE gives the investor, at a Liquidity Event, the choice of a cash payment equal to its purchase amount or shares of common: purchase amount ÷ the Liquidity Price. It takes whichever is worth more.
- **The cash is paid ahead of common.** No preferred is outstanding here. The pre-money text ranks the cash only against other SAFEs, so a pre-money SAFE alongside preferred is refused.
- **Liquidity Price** = valuation cap ÷ Liquidity Capitalization.
- **Liquidity Capitalization:** the capital stock outstanding as converted, assuming every outstanding option, warrant and convertible security is exercised or converted, vested or not. It leaves out the unissued pool, this SAFE, other SAFEs and notes.
- **Unlike the post-money SAFE, it doesn't count its own shares.** The shares sit on top, as a pre-money note's do, and the count doesn't depend on who converts.
- **The discount doesn't apply at a sale:** the Liquidity Price uses the cap only.
- **The shortfall clause:** if the cash can't be paid in full, the unpaid part converts to common at the Liquidity Price. That pays nothing extra, because common gets nothing when the cash isn't paid in full.

## The numbers

- **Liquidity Capitalization:** common's 9,000,000 + Employee C's 500,000 options = **9,500,000**.
- **Liquidity Price:** $8,000,000 ÷ 9,500,000 = **$0.842105** (exactly 16/19).
- **Conversion shares:** $1,000,000 ÷ $0.842105 = **1,187,500**.

Converting, X's 1,187,500 shares join common's 9,000,000. The options are out of the money: they count in the Liquidity Capitalization but don't share. X gets 1,187,500 ÷ 10,187,500 = 19/163 of the exit value. That equals its $1,000,000 cash at $1,000,000 × 163/19 = **$8,578,947.37** (exactly 163,000,000/19).

**The post-money SAFE in case 12 switches at $9,526,315.79.** It gets fewer shares, 1,055,555.56, and counts them in its own Liquidity Capitalization.

**The options never come into the money in this range.** With X converted, they would be exercised above $50,937,500.

## Breakpoints

| Exit value | Why |
|---:|---|
| $1,000,000 | X's cash, its $1,000,000 purchase amount, is paid in full. Above this, the next dollar goes to common. |
| $8,578,947.37 | X switches to common: 19/163 of the exit value equals its $1,000,000. |

## Payouts

| Exit | Founder A | Founder B | Employee C | Investor X (SAFE) |
|---:|---:|---:|---:|---:|
| $500K | 0 | 0 | 0 | 500,000 |
| $1M | 0 | 0 | 0 | 1,000,000 |
| $5M | 2,666,666.67 | 1,333,333.33 | 0 | 1,000,000 |
| $8M | 4,666,666.67 | 2,333,333.33 | 0 | 1,000,000 |
| $8,578,947.37 | 5,052,631.58 | 2,526,315.79 | 0 | 1,000,000 |
| $10M | 5,889,570.55 | 2,944,785.28 | 0 | 1,165,644.17 |
| $20M | 11,779,141.10 | 5,889,570.55 | 0 | 2,331,288.34 |
| $40M | 23,558,282.21 | 11,779,141.10 | 0 | 4,662,576.69 |

## The cap tables

`expected.json` also gives the cap table after each event. After the SAFE:
- **Common:** 9,000,000.
- **Options:** 500,000 at $5.00.
- **Unissued pool:** 500,000.
- **Outstanding:** X's SAFE, unconverted.
