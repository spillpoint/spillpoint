# Fund case 15, a clawback that waits for capital: derivation

A late call leaves the fund's totals short of capital at X = 0. So the run on the totals has nothing for the GP until X returns enough, and the clawback holds until then. It pins FC6's wording for the totals' capital tier ending: "LPs have their capital back". Flat 20%, no pref, no GP commitment. D is `as_of`, 2024-01-01, and X is final.

**The fund.**
- **2021-01-01:** a $10,000,000 investment call.
- **2022-01-01, $16,000,000:** paid-in that day is $10,000,000, so $10,000,000 is capital, and the other $6,000,000 is split 80/20: $4,800,000 to the LPs and $1,200,000 of carry.
- **2023-01-01:** a second $10,000,000 call. The LPs' paid-in is now $20,000,000, with $10,000,000 out.

**X's tiers.** Capital to $10,000,000, then 80/20.

**The run on the fund's totals (F12).**
- **Capital:** all LP paid-in, $20,000,000.
- **Amount:** $16,000,000 + X. At X = 0 that's $4,000,000 short of capital, so the GP is entitled to nothing.
- **Its capital tier ends** at X = $4,000,000. From there it pays 20% carry, so the entitlement is 0.20 × (X − 4,000,000).

**The clawback.** Carry paid is the $1,200,000 plus X's carry.
- **0 to $4,000,000:** X is capital and the totals' run is still in capital. Neither pays the GP anything, so the clawback holds at $1,200,000.
- **$4,000,000:** the totals' run has the LPs' capital back and starts paying 20%, while X still pays none. The clawback starts to fall, and the totals' run is the cause: "the clawback owed starts to fall: on the fund's totals, LPs have their capital back".
- **$4,000,000 to $10,000,000:** it falls 20 cents a dollar, from $1,200,000 to 0. At $10,000,000 X has the late call back too, so both runs see the same $6,000,000 of profit, and 20% of it is the $1,200,000 paid.
- **Above:** both pay 20%, so nothing is owed.

## Breakpoints

| X | Exact | Reasons |
|---:|---|---|
| 4,000,000.00 | 4000000 | `clawback_changes`: "the clawback owed starts to fall: on the fund's totals, LPs have their capital back" |
| 10,000,000.00 | 10000000 | `capital_returned`: "LPs have their $20,000,000 of paid-in capital back"; `clawback_cleared`: "from here the GP has earned all the carry it was paid earlier" |

## This distribution

| X | LP capital | LP carry tier | LPs | GP carry 20% | GP |
|---:|---:|---:|---:|---:|---:|
| 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 2,000,000.00 | 2,000,000.00 | 0.00 | 2,000,000.00 | 0.00 | 0.00 |
| 4,000,000.00 | 4,000,000.00 | 0.00 | 4,000,000.00 | 0.00 | 0.00 |
| 7,000,000.00 | 7,000,000.00 | 0.00 | 7,000,000.00 | 0.00 | 0.00 |
| 10,000,000.00 | 10,000,000.00 | 0.00 | 10,000,000.00 | 0.00 | 0.00 |
| 12,000,000.00 | 10,000,000.00 | 1,600,000.00 | 11,600,000.00 | 400,000.00 | 400,000.00 |

## The fund to date

| X | Distributed | LP capital | LP carry tier | LPs | GP carry 20% | GP |
|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | 16,000,000.00 | 10,000,000.00 | 4,800,000.00 | 14,800,000.00 | 1,200,000.00 | 1,200,000.00 |
| 2,000,000.00 | 18,000,000.00 | 12,000,000.00 | 4,800,000.00 | 16,800,000.00 | 1,200,000.00 | 1,200,000.00 |
| 4,000,000.00 | 20,000,000.00 | 14,000,000.00 | 4,800,000.00 | 18,800,000.00 | 1,200,000.00 | 1,200,000.00 |
| 7,000,000.00 | 23,000,000.00 | 17,000,000.00 | 4,800,000.00 | 21,800,000.00 | 1,200,000.00 | 1,200,000.00 |
| 10,000,000.00 | 26,000,000.00 | 20,000,000.00 | 4,800,000.00 | 24,800,000.00 | 1,200,000.00 | 1,200,000.00 |
| 12,000,000.00 | 28,000,000.00 | 20,000,000.00 | 6,400,000.00 | 26,400,000.00 | 1,600,000.00 | 1,600,000.00 |

## Clawback

| X | Totals' amount | Carry paid | Entitlement | Owed |
|---:|---:|---:|---:|---:|
| 0.00 | 16,000,000 | 1,200,000.00 | 0.00 | 1,200,000.00 |
| 2,000,000.00 | 18,000,000 | 1,200,000.00 | 0.00 | 1,200,000.00 |
| 4,000,000.00 | 20,000,000 | 1,200,000.00 | 0.00 | 1,200,000.00 |
| 7,000,000.00 | 23,000,000 | 1,200,000.00 | 600,000.00 | 600,000.00 |
| 10,000,000.00 | 26,000,000 | 1,200,000.00 | 1,200,000.00 | 0.00 |
| 12,000,000.00 | 28,000,000 | 1,600,000.00 | 1,600,000.00 | 0.00 |

The entitlement is 20% of the totals' amount above $20,000,000 of capital: at $7,000,000, 20% of $3,000,000.
