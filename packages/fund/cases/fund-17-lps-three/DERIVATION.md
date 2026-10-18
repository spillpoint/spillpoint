# Fund case 17, three LPs: derivation

Case 8's fund with three LPs on the same terms (F19). Carry is 20%, then 25% from 3x, then 30% from 5x, with a fee-free 1% GP commitment and no pref. D is `as_of`, 2026-09-30. X isn't final, and NAV is $40,000,000.

**The waterfall is case 8's.** The LPs only divide what the LPs get (F20), so the breakpoints, every tier, the GP's carry, the GP commitment's line and the clawback at the NAV point are case 8's. Its `DERIVATION.md` works them tier by tier. The LPs' totals below are its.

## The LPs (F19)

Each LP's share is its commitment over the sum of the three, $10,000,000: a half, 7/20 and 3/20.

| LP | Commitment | Share | Paid in |
|---|---:|---:|---:|
| Alder Endowment | 5,000,000 | 0.5 | 5,445,000.00 |
| Birchwood Family Office | 3,500,000 | 0.35 | 3,811,500.00 |
| Cedar Fund of Funds | 1,500,000 | 0.15 | 1,633,500.00 |
| **All the LPs** | 10,000,000 | 1 | 10,890,000.00 |

- **Commitments only divide.** The commitments add up to $10,000,000. The LPs have paid in $10,890,000: their 99% of the investments and all the fees. Nothing checks one against the other (F19).
- **Paid in (F20):** each LP's share of the LPs' $10,890,000. A twentieth is $544,500. Birchwood's 7/20 is $3,811,500 and Cedar's 3/20 is $1,633,500.

## Breakpoints

Case 8's, unchanged (F20).

| X | Exact | Reasons |
|---:|---|---|
| 7,000,000.00 | 7000000 | `capital_returned`: "LPs have their $10,890,000 of paid-in capital back" |
| 34,500,000.00 | 34500000 | `carry_step`: "LPs reach 3.0x: carry is 25% from here" |
| 63,833,333.33 | 191500000/3 | `carry_step`: "LPs reach 5.0x: carry is 30% from here" |

## This distribution

Each LP's share of the LPs' total from X. Alder's is half; Birchwood's and Cedar's are 7 and 3 twentieths.

| X | Tags | LPs | Alder Endowment | Birchwood Family Office | Cedar Fund of Funds |
|---:|---|---:|---:|---:|---:|
| 7,000,000.00 | breakpoint | 6,930,000.00 | 3,465,000.00 | 2,425,500.00 | 1,039,500.00 |
| 20,000,000.00 | listed | 17,226,000.00 | 8,613,000.00 | 6,029,100.00 | 2,583,900.00 |
| 34,500,000.00 | listed, breakpoint | 28,710,000.00 | 14,355,000.00 | 10,048,500.00 | 4,306,500.00 |
| 40,000,000.00 | nav | 32,793,750.00 | 16,396,875.00 | 11,477,812.50 | 4,919,062.50 |
| 50,000,000.00 | listed | 40,218,750.00 | 20,109,375.00 | 14,076,562.50 | 6,032,812.50 |
| 63,833,333.33 | breakpoint | 50,490,000.00 | 25,245,000.00 | 17,671,500.00 | 7,573,500.00 |
| 80,000,000.00 | listed | 61,693,500.00 | 30,846,750.00 | 21,592,725.00 | 9,254,025.00 |

- **At $40,000,000:** a twentieth of $32,793,750 is $1,639,687.50. Birchwood has seven, $11,477,812.50, and Cedar three, $4,919,062.50.
- **At $63,833,333.33:** X isn't a whole number of cents, but the LPs' total from it is exactly $50,490,000, so each LP's is too.
- **Every amount here is exact, not rounded.** Every LPs' total here is a whole number of dollars, so a twentieth of it is a whole number of nickels.
- **The three add up** to the LPs' total in every row.

## The fund to date

Each LP's share of the LPs' total to date, X included. The earlier $4,000,000 gave the LPs $3,960,000 of capital.

| X | Tags | LPs | Alder Endowment | Birchwood Family Office | Cedar Fund of Funds |
|---:|---|---:|---:|---:|---:|
| 7,000,000.00 | breakpoint | 10,890,000.00 | 5,445,000.00 | 3,811,500.00 | 1,633,500.00 |
| 20,000,000.00 | listed | 21,186,000.00 | 10,593,000.00 | 7,415,100.00 | 3,177,900.00 |
| 34,500,000.00 | listed, breakpoint | 32,670,000.00 | 16,335,000.00 | 11,434,500.00 | 4,900,500.00 |
| 40,000,000.00 | nav | 36,753,750.00 | 18,376,875.00 | 12,863,812.50 | 5,513,062.50 |
| 50,000,000.00 | listed | 44,178,750.00 | 22,089,375.00 | 15,462,562.50 | 6,626,812.50 |
| 63,833,333.33 | breakpoint | 54,450,000.00 | 27,225,000.00 | 19,057,500.00 | 8,167,500.00 |
| 80,000,000.00 | listed | 65,653,500.00 | 32,826,750.00 | 22,978,725.00 | 9,848,025.00 |

- **At $7,000,000** each LP has exactly its paid-in back: capital is returned.
- **At $34,500,000** each has exactly 3x its paid-in: Alder $16,335,000 on $5,445,000. Every LP is at the LPs' multiple, since every amount is the same share of the LPs'.

## Clawback at the NAV point

X = NAV = $40,000,000 is final by definition (F14). Case 8 owes nothing there: the entitlement is the $6,806,250 of carry paid. So each LP's share of the clawback is zero (F20).

| X | Tags | Owed | Alder Endowment | Birchwood Family Office | Cedar Fund of Funds |
|---:|---|---:|---:|---:|---:|
| 40,000,000.00 | nav | 0.00 | 0.00 | 0.00 | 0.00 |

X isn't final elsewhere, so no other point has a clawback.
