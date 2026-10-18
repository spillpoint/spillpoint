# Fund case 18, three equal LPs: derivation

Case 1's fund with three LPs, each committing $1,000,000 (F19). One $5,000,000 investment call on 2022-03-01 and 20% carry, nothing else. D is `as_of`, 2026-03-01, and X isn't final.

**The waterfall is case 1's.** The LPs only divide what the LPs get (F20): capital to $5,000,000, then 80% to the LPs and 20% to the GP, with one breakpoint, at $5,000,000. Its `DERIVATION.md` works the tiers. This case adds X = $10,000,000.01, a cent past a round number.

**Why thirds.** A third of most amounts isn't a whole number of cents. F20's amounts are exact, so the case gives each one exact beside its amount to the cent (FC9).

## The LPs (F19)

| LP | Commitment | Share | Paid in | Paid in, exact |
|---|---:|---:|---:|---|
| Alder | 1,000,000 | 1/3 | 1,666,666.67 | 5000000/3 |
| Birch | 1,000,000 | 1/3 | 1,666,666.67 | 5000000/3 |
| Cedar | 1,000,000 | 1/3 | 1,666,666.67 | 5000000/3 |
| **All the LPs** | 3,000,000 | 1 | 5,000,000.00 | 5000000 |

The commitments add up to $3,000,000 and the LPs have paid in $5,000,000. They only divide (F19): each LP's paid-in is a third of $5,000,000, $1,666,666.666…, $1,666,666.67 to the cent.

## Breakpoints

Case 1's, unchanged (F20).

| X | Exact | Reasons |
|---:|---|---|
| 5,000,000.00 | 5000000 | `capital_returned`: "LPs have their $5,000,000 of paid-in capital back" |

## This distribution

Nothing was distributed before X, so the fund to date is X itself, and each LP's to date equals its share of X.

**The LPs' total from X:**
- **Up to $5,000,000:** all capital, so the LPs get X.
- **Above it:** $5,000,000 plus 80% of the rest.
  - **At $10,000,000.01:** $5,000,000 + 80% of $5,000,000.01 = $5,000,000 + $4,000,000.008 = $9,000,000.008, or $9,000,000.01 to the cent.
  - **At $12,500,000:** $5,000,000 + 80% of $7,500,000 = $11,000,000.

| X | Tags | LPs | Alder | Birch | Cedar |
|---:|---|---:|---:|---:|---:|
| 2,000,000.00 | listed | 2,000,000.00 | 666,666.67 | 666,666.67 | 666,666.67 |
| 5,000,000.00 | listed, breakpoint | 5,000,000.00 | 1,666,666.67 | 1,666,666.67 | 1,666,666.67 |
| 10,000,000.01 | listed | 9,000,000.01 | 3,000,000.00 | 3,000,000.00 | 3,000,000.00 |
| 12,500,000.00 | listed | 11,000,000.00 | 3,666,666.67 | 3,666,666.67 | 3,666,666.67 |

**Exact, the same for each LP:**

| X | The LPs' total, exact | Each LP, exact | As a decimal |
|---:|---|---|---|
| 2,000,000.00 | 2000000 | 2000000/3 | 666,666.666… |
| 5,000,000.00 | 5000000 | 5000000/3 | 1,666,666.666… |
| 10,000,000.01 | 9000000.008 | 1125000001/375 | 3,000,000.002666… |
| 12,500,000.00 | 11000000 | 11000000/3 | 3,666,666.666… |

- **At $10,000,000.01:** a third of $9,000,000.008 is $3,000,000.002666…. As a fraction, $9,000,000.008 is 1,125,000,001/125, and a third of that is 1,125,000,001/375. Neither 3 nor 5 divides 1,125,000,001, so it doesn't reduce.
- **To the cent,** each amount rounds half away from zero (FC8). So three thirds of $2,000,000.00 show as $666,666.67 each, $2,000,000.01 together, and three of $3,000,000.00 show $9,000,000.00 beside an LPs' total of $9,000,000.01. That's why the case gives each exact as well.
- **On the page** (f02c), each LP's amount is rounded down to the cent instead, with what's left over shown on its own line. At $2,000,000 that's $666,666.66 each and $0.02 left over, as `SPEC.md` gives for this case.
