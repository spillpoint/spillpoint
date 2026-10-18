# Fund case 20, the SPV with three LPs: derivation

Case 12's SPV with three LPs whose shares don't terminate (F19). A $2,000,000 investment and a $40,000 setup fee on 2023-05-01, 20% carry, no pref and no GP commitment. D is `as_of`, 2026-05-01. The exit is the final distribution, and NAV is $6,000,000.

**The waterfall is case 12's.** The LPs only divide what the LPs get (F20): capital to $2,040,000, then 80/20, with nothing ever owed back, since nothing was distributed before X. Its `DERIVATION.md` works the tiers and the clawback.

## The LPs (F19)

The commitments add up to $2,100,000. In twenty-firsts: Alder's $700,000 is 7, Birch's $1,100,000 is 11, and Cedar's $300,000 is 3.

| LP | Commitment | Share | Paid in | Paid in, exact |
|---|---:|---:|---:|---|
| Alder | 700,000 | 1/3 | 680,000.00 | 680000 |
| Birch | 1,100,000 | 11/21 | 1,068,571.43 | 7480000/7 |
| Cedar | 300,000 | 1/7 | 291,428.57 | 2040000/7 |
| **All the LPs** | 2,100,000 | 1 | 2,040,000.00 | 2040000 |

- **Paid in (F20):** each LP's share of the LPs' $2,040,000. A twenty-first is $97,142.857…
  - **Alder:** 7/21 is a third, $680,000 exactly.
  - **Birch:** 11/21 is 22,440,000/21 = 7,480,000/7 = $1,068,571 3/7, or $1,068,571.43.
  - **Cedar:** 3/21 is a seventh, 2,040,000/7 = $291,428 4/7, or $291,428.57.
- **The three add up:** $680,000 + $1,068,571 3/7 + $291,428 4/7 = $2,040,000.
- **Commitments only divide** (F19): the LPs paid in $2,040,000, not their $2,100,000.

## Breakpoints

Case 12's, unchanged (F20).

| X | Exact | Reasons |
|---:|---|---|
| 2,040,000.00 | 2040000 | `capital_returned`: "LPs have their $2,040,000 of paid-in capital back" |

## This distribution

Nothing was distributed before X, so the fund to date is X itself, and each LP's to date equals its share of X.

**The LPs' total from X:**
- **Up to $2,040,000:** all capital, so the LPs get X.
- **Above it:** $2,040,000 plus 80% of the rest. At NAV, $6,000,000, that's $2,040,000 + $3,168,000 = $5,208,000. At $10,000,000, $2,040,000 + $6,368,000 = $8,408,000.

| X | Tags | LPs | Alder | Birch | Cedar |
|---:|---|---:|---:|---:|---:|
| 1,000,000.00 | listed | 1,000,000.00 | 333,333.33 | 523,809.52 | 142,857.14 |
| 2,040,000.00 | listed, breakpoint | 2,040,000.00 | 680,000.00 | 1,068,571.43 | 291,428.57 |
| 6,000,000.00 | nav | 5,208,000.00 | 1,736,000.00 | 2,728,000.00 | 744,000.00 |
| 10,000,000.00 | listed | 8,408,000.00 | 2,802,666.67 | 4,404,190.48 | 1,201,142.86 |

**Exact:**

| X | Alder | Birch | Cedar |
|---:|---|---|---|
| 1,000,000.00 | 1000000/3 | 11000000/21 | 1000000/7 |
| 2,040,000.00 | 680000 | 7480000/7 | 2040000/7 |
| 6,000,000.00 | 1736000 | 2728000 | 744000 |
| 10,000,000.00 | 8408000/3 | 92488000/21 | 8408000/7 |

- **At $1,000,000:** a twenty-first is $47,619.047…. Alder's 7 is $333,333.333…, Birch's 11 is 11,000,000/21 = $523,809.523…, and Cedar's 3 is $142,857.142…. None of the fractions reduce: 11,000,000 has no factor 3 or 7.
- **At NAV, $6,000,000:** 21 divides $5,208,000 exactly, $248,000 a twenty-first. So Alder has $1,736,000, Birch $2,728,000 and Cedar $744,000, every amount exact.
- **At $10,000,000:** a twenty-first of $8,408,000 is $400,380 20/21. Alder's 7 is 8,408,000/3 = $2,802,666.666…; Birch's 11 is 92,488,000/21 = $4,404,190.476…; Cedar's 3 is 8,408,000/7 = $1,201,142.857…. 92,488,000 has no factor 3 (its digits add to 31) or 7, so it doesn't reduce.
- **To the cent,** each rounds half away from zero (FC8). At $10,000,000 the three round up, so $2,802,666.67 + $4,404,190.48 + $1,201,142.86 = $8,408,000.01, a cent over the LPs' total. At $1,000,000 they round down: $999,999.99, a cent under. The exact amounts add up to the LPs' total in every row.

## Clawback

X is final, so every point has the clawback (F12). Case 12 never owes anything: with nothing distributed before X, the run on the fund's totals is X's own run. So each LP's share is zero at every point (F20).

| X | Tags | Owed | Alder | Birch | Cedar |
|---:|---|---:|---:|---:|---:|
| 1,000,000.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 |
| 2,040,000.00 | listed, breakpoint | 0.00 | 0.00 | 0.00 | 0.00 |
| 6,000,000.00 | nav | 0.00 | 0.00 | 0.00 | 0.00 |
| 10,000,000.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 |
