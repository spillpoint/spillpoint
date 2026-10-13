# Fund case 04, a GP commitment that pays fees: derivation

Case 3 with the GP commitment's toggles turned over (F3): `pays_fees` true and `pays_expenses` false. It now pays 2% of investment and fee calls and none of the expenses. It still takes 2% of every distribution, outside the tiers, with no carry. 20% carry, no pref. D is `as_of`, 2026-04-01, and X isn't final.

**Paid in.**

| Call | Amount | GP commitment pays | LPs pay |
|---|---:|---:|---:|
| 2021-04-01, investment | 10,000,000 | 2%: 200,000 | 9,800,000 |
| 2021-04-01, fee | 600,000 | 2%: 12,000 | 588,000 |
| 2022-04-01, expense | 50,000 | none | 50,000 |
| **Total** | 10,650,000 | **212,000** | **10,438,000** |

The GP commitment pays $11,000 more than in case 3 and the LPs $11,000 less.

**X.** 98% runs the tiers.
- **Capital** is back when 0.98 X = $10,438,000, so X = 10,438,000 ÷ 0.98 = 521,900,000/49 = $10,651,020.408163…, which shows as $10,651,020.41. That's $11,224.49 sooner than case 3: 11,000 ÷ 0.98.
- **The GP commitment's line there** is 10,438,000/49 = $213,020.408163…, which shows as $213,020.41.

## Breakpoints

| X | Exact | Reasons |
|---:|---|---|
| 10,651,020.41 | 521900000/49 | `capital_returned`: "LPs have their $10,438,000 of paid-in capital back" |

## This distribution

| X | GP commitment | LP capital | LP carry tier | LPs | GP carry 20% | GP |
|---:|---:|---:|---:|---:|---:|---:|
| 5,000,000.00 | 100,000.00 | 4,900,000.00 | 0.00 | 4,900,000.00 | 0.00 | 0.00 |
| 10,651,020.41 | 213,020.41 | 10,438,000.00 | 0.00 | 10,438,000.00 | 0.00 | 0.00 |
| 20,000,000.00 | 400,000.00 | 10,438,000.00 | 7,329,600.00 | 17,767,600.00 | 1,832,400.00 | 1,832,400.00 |

At $20,000,000 the tiers get $19,600,000, and $9,162,000 of it is above capital: 80% is $7,329,600 and 20% is $1,832,400. The GP's carry is $2,200 more than in case 3, 20% of the $11,000 less capital.

Nothing was distributed before X, so the fund to date is X itself.
