# Fund case 02, fees as capital: derivation

Investment, fee and expense calls all count as paid-in capital (F5), and an interim distribution returns part of it. 20% carry, no pref, no GP commitment. D is `as_of`, 2026-06-30, and X isn't final.

**Paid in.** Every call counts, whatever its kind:

| Date | Kind | Amount |
|---|---|---:|
| 2022-01-10 | investment | 4,000,000 |
| 2022-01-10 | fee | 250,000 |
| 2023-01-10 | fee | 250,000 |
| 2023-01-10 | expense | 100,000 |
| 2023-07-01 | investment | 1,400,000 |
| | **LPs' paid-in** | **6,000,000** |

**The earlier distribution.** $1,500,000 on 2025-02-01 runs the tiers first (F1). The LPs have $6,000,000 of capital out, so all of it is capital, and $4,500,000 is still to come back.

**X.** The first $4,500,000 finishes returning capital. Above it, 80% to the LPs and 20% to the GP.

## Breakpoints

| X | Exact | Reasons |
|---:|---|---|
| 4,500,000.00 | 4500000 | `capital_returned`: "LPs have their $6,000,000 of paid-in capital back" |

The reason names all the LPs' paid-in capital, $6,000,000, not the part X returns.

## This distribution

| X | LP capital | LP carry tier | LPs | GP carry 20% | GP |
|---:|---:|---:|---:|---:|---:|
| 1,000,000.00 | 1,000,000.00 | 0.00 | 1,000,000.00 | 0.00 | 0.00 |
| 4,500,000.00 | 4,500,000.00 | 0.00 | 4,500,000.00 | 0.00 | 0.00 |
| 10,000,000.00 | 4,500,000.00 | 4,400,000.00 | 8,900,000.00 | 1,100,000.00 | 1,100,000.00 |

At $10,000,000, $5,500,000 is above capital: 80% is $4,400,000 and 20% is $1,100,000.

## The fund to date

The earlier $1,500,000 of capital, plus X:

| X | Distributed | LP capital | LP carry tier | LPs | GP carry 20% | GP |
|---:|---:|---:|---:|---:|---:|---:|
| 1,000,000.00 | 2,500,000.00 | 2,500,000.00 | 0.00 | 2,500,000.00 | 0.00 | 0.00 |
| 4,500,000.00 | 6,000,000.00 | 6,000,000.00 | 0.00 | 6,000,000.00 | 0.00 | 0.00 |
| 10,000,000.00 | 11,500,000.00 | 6,000,000.00 | 4,400,000.00 | 10,400,000.00 | 1,100,000.00 | 1,100,000.00 |
