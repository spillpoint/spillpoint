# Fund case 19, two LPs and a clawback: derivation

Case 13's fund with two LPs, committing $7,000,000 and $3,000,000 (F19). Carry is 20%, then 30% from 2x, with no pref and no GP commitment. $10,000,000 is called on 2020-01-01, $30,000,000 distributed on 2022-01-01, and $10,000,000 called late on 2023-01-01. D is `as_of`, 2025-01-01, and X is final.

**The waterfall is case 13's.** The LPs only divide what the LPs get (F20), so the breakpoints, every tier, the GP's carry, the entitlement and the clawback owed are case 13's. Its `DERIVATION.md` works them, the clawback that falls, holds, falls again and holds for good included. The LPs' totals and the clawback owed below are its.

## The LPs (F19)

Each LP's share is its commitment over the sum of the two, $10,000,000: 7/10 and 3/10.

| LP | Commitment | Share | Paid in |
|---|---:|---:|---:|
| Alder Endowment | 7,000,000 | 0.7 | 14,000,000.00 |
| Birchwood Family Office | 3,000,000 | 0.3 | 6,000,000.00 |
| **All the LPs** | 10,000,000 | 1 | 20,000,000.00 |

The commitments add up to $10,000,000 and the LPs have paid in $20,000,000, the two calls. Commitments only divide (F19), so each LP has paid in its share of $20,000,000.

## Breakpoints

Case 13's, unchanged (F20).

| X | Exact | Reasons |
|---:|---|---|
| 10,000,000.00 | 10000000 | `capital_returned`: "LPs have their $20,000,000 of paid-in capital back"; `clawback_changes`: "the clawback owed stops falling" |
| 15,000,000.00 | 15000000 | `clawback_changes`: "the clawback owed starts to fall: on the fund's totals, LPs reach 2.0x: carry is 30% from here" |
| 15,937,500.00 | 15937500 | `carry_step`: "LPs reach 2.0x: carry is 30% from here"; `clawback_changes`: "the clawback owed stops falling" |

## This distribution

Each LP's share of the LPs' total from X: 70% and 30%.

| X | Tags | LPs | Alder Endowment | Birchwood Family Office |
|---:|---|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 |
| 10,000,000.00 | listed, breakpoint | 10,000,000.00 | 7,000,000.00 | 3,000,000.00 |
| 12,000,000.00 | listed | 11,600,000.00 | 8,120,000.00 | 3,480,000.00 |
| 15,000,000.00 | listed, breakpoint | 14,000,000.00 | 9,800,000.00 | 4,200,000.00 |
| 15,937,500.00 | listed, breakpoint | 14,750,000.00 | 10,325,000.00 | 4,425,000.00 |
| 25,000,000.00 | listed | 21,093,750.00 | 14,765,625.00 | 6,328,125.00 |

At $25,000,000: 70% of $21,093,750 is $14,765,625 and 30% is $6,328,125.

## The fund to date

Each LP's share of the LPs' total to date, X included. The earlier $30,000,000 gave the LPs $25,250,000.

| X | Tags | LPs | Alder Endowment | Birchwood Family Office |
|---:|---|---:|---:|---:|
| 0.00 | listed | 25,250,000.00 | 17,675,000.00 | 7,575,000.00 |
| 10,000,000.00 | listed, breakpoint | 35,250,000.00 | 24,675,000.00 | 10,575,000.00 |
| 12,000,000.00 | listed | 36,850,000.00 | 25,795,000.00 | 11,055,000.00 |
| 15,000,000.00 | listed, breakpoint | 39,250,000.00 | 27,475,000.00 | 11,775,000.00 |
| 15,937,500.00 | listed, breakpoint | 40,000,000.00 | 28,000,000.00 | 12,000,000.00 |
| 25,000,000.00 | listed | 46,343,750.00 | 32,440,625.00 | 13,903,125.00 |

At $15,937,500 the LPs reach 2x, $40,000,000 on $20,000,000, and so does each LP: Alder $28,000,000 on $14,000,000.

## Clawback

X is final, so every point has the clawback (F12), and each LP gets its share of what the GP owes back (F20).

| X | Tags | Owed | Alder Endowment | Birchwood Family Office |
|---:|---|---:|---:|---:|
| 0.00 | listed | 2,750,000.00 | 1,925,000.00 | 825,000.00 |
| 10,000,000.00 | listed, breakpoint | 750,000.00 | 525,000.00 | 225,000.00 |
| 12,000,000.00 | listed | 750,000.00 | 525,000.00 | 225,000.00 |
| 15,000,000.00 | listed, breakpoint | 750,000.00 | 525,000.00 | 225,000.00 |
| 15,937,500.00 | listed, breakpoint | 656,250.00 | 459,375.00 | 196,875.00 |
| 25,000,000.00 | listed | 656,250.00 | 459,375.00 | 196,875.00 |

- **At X = 0:** the GP has been paid $4,750,000 of carry and is entitled to $2,000,000, so it owes $2,750,000 back: $1,925,000 to Alder and $825,000 to Birchwood.
- **At $15,937,500 and above:** $656,250 owed for good, $459,375 and $196,875.
- **Each LP's share of the clawback bends where the clawback does,** so it adds no breakpoint.

Every amount in this case is exact: 70% and 30% of these amounts end in whole cents.
