# Fund case 03, a GP commitment: derivation

A 2% GP commitment with F3's defaults:
- **On calls:** it pays 2% of investment and expense calls and none of the fees.
- **On distributions:** it takes 2% of every one, outside the tiers, with no carry.

20% carry, no pref. D is `as_of`, 2026-04-01. Nothing has been distributed before X, and X isn't final.

**Paid in.**

| Call | Amount | GP commitment pays | LPs pay |
|---|---:|---:|---:|
| 2021-04-01, investment | 10,000,000 | 2%: 200,000 | 9,800,000 |
| 2021-04-01, fee | 600,000 | none | 600,000 |
| 2022-04-01, expense | 50,000 | 2%: 1,000 | 49,000 |
| **Total** | 10,650,000 | **201,000** | **10,449,000** |

**X.** 2% of X goes to the GP commitment and 98% runs the tiers.
- **Capital** is back when 0.98 X = $10,449,000, so X = 10,449,000 ÷ 0.98 = 522,450,000/49 = $10,662,244.897959…, which shows as $10,662,244.90.
- **The GP commitment's line there** is 0.02 × X = 10,449,000/49 = $213,244.897959…, which shows as $213,244.90.
- **Above it,** of the 98%, 80% goes to the LPs and 20% to the GP.

## Breakpoints

| X | Exact | Reasons |
|---:|---|---|
| 10,662,244.90 | 522450000/49 | `capital_returned`: "LPs have their $10,449,000 of paid-in capital back" |

## This distribution

| X | GP commitment | LP capital | LP carry tier | LPs | GP carry 20% | GP |
|---:|---:|---:|---:|---:|---:|---:|
| 5,000,000.00 | 100,000.00 | 4,900,000.00 | 0.00 | 4,900,000.00 | 0.00 | 0.00 |
| 10,662,244.90 | 213,244.90 | 10,449,000.00 | 0.00 | 10,449,000.00 | 0.00 | 0.00 |
| 20,000,000.00 | 400,000.00 | 10,449,000.00 | 7,320,800.00 | 17,769,800.00 | 1,830,200.00 | 1,830,200.00 |

**At $20,000,000:**
- **The tiers get $19,600,000,** and $9,151,000 of it is above capital: 80% is $7,320,800 and 20% is $1,830,200.
- **It adds up:** with the GP commitment's $400,000, the lines come to $20,000,000.
- **The GP commitment** paid in $201,000 and gets 2% of the distribution, $400,000, as F3 says: its share of the investments, whatever it paid of the fees.

Nothing was distributed before X, so the fund to date is X itself.
