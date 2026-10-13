# Fund case 10, a clawback: derivation

The spec's example C. Carry is paid early, then a follow-on is written off, and the last distribution trues it up (F12). Flat 20%, no pref, no GP commitment. D is `as_of`, 2025-03-01. X is final, and NAV is $1,000,000.

**The fund.**
- **2020-03-01:** a $10,000,000 investment call.
- **2022-03-01, $15,000,000:** $10,000,000 of capital, then $5,000,000 at 80/20: $4,000,000 to the LPs and $1,000,000 of carry.
- **2023-03-01:** a $2,000,000 follow-on call. The LPs' paid-in is now $12,000,000, with $2,000,000 out.

**X's tiers.** Capital to $2,000,000, then 80/20.

**The run on the fund's totals (F12).**
- **Capital:** all LP paid-in, $12,000,000.
- **Amount:** $15,000,000 + X, always past capital.
- **Entitlement:** 20% of the profit, 0.20 × ($3,000,000 + X).

**The clawback.** Owed is carry paid less the entitlement, when that's positive.
- **X up to $2,000,000:** carry paid is still $1,000,000, so owed = 1,000,000 − 0.20 × (3,000,000 + X) = 400,000 − 0.20 X. It's 0 at X = $2,000,000, where capital is also back.
- **Above:** both carry paid and the entitlement grow 20 cents a dollar. Owed stays at exactly 0.

## Breakpoints

| X | Exact | Reasons |
|---:|---|---|
| 2,000,000.00 | 2000000 | `capital_returned`: "LPs have their $12,000,000 of paid-in capital back"; `clawback_cleared`: "from here the GP has earned all the carry it was paid earlier" |

## This distribution

| X | LP capital | LP carry tier | LPs | GP carry 20% | GP |
|---:|---:|---:|---:|---:|---:|
| 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 1,000,000.00 | 1,000,000.00 | 0.00 | 1,000,000.00 | 0.00 | 0.00 |
| 2,000,000.00 | 2,000,000.00 | 0.00 | 2,000,000.00 | 0.00 | 0.00 |
| 5,000,000.00 | 2,000,000.00 | 2,400,000.00 | 4,400,000.00 | 600,000.00 | 600,000.00 |

$1,000,000 is both a listed X and the NAV point.

## The fund to date

| X | Distributed | LP capital | LP carry tier | LPs | GP carry 20% | GP |
|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | 15,000,000.00 | 10,000,000.00 | 4,000,000.00 | 14,000,000.00 | 1,000,000.00 | 1,000,000.00 |
| 1,000,000.00 | 16,000,000.00 | 11,000,000.00 | 4,000,000.00 | 15,000,000.00 | 1,000,000.00 | 1,000,000.00 |
| 2,000,000.00 | 17,000,000.00 | 12,000,000.00 | 4,000,000.00 | 16,000,000.00 | 1,000,000.00 | 1,000,000.00 |
| 5,000,000.00 | 20,000,000.00 | 12,000,000.00 | 6,400,000.00 | 18,400,000.00 | 1,600,000.00 | 1,600,000.00 |

## Clawback

| X | Fund's profit | Carry paid | Entitlement | Owed |
|---:|---:|---:|---:|---:|
| 0.00 | 3,000,000 | 1,000,000.00 | 600,000.00 | 400,000.00 |
| 1,000,000.00 | 4,000,000 | 1,000,000.00 | 800,000.00 | 200,000.00 |
| 2,000,000.00 | 5,000,000 | 1,000,000.00 | 1,000,000.00 | 0.00 |
| 5,000,000.00 | 8,000,000 | 1,600,000.00 | 1,600,000.00 | 0.00 |
