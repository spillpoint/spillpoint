# Fund case 26, two later closes and a class: derivation

Three LPs: one in from the start, one joining at a first later close, and one in a friends-and-family class (no fees, no carry) joining at a second (F22, F25). The fund's carry is 20%, its standard fee rate 2%. No pref, no GP commitment. Equalization interest is 6%.

- **Calls:** $2,000,000 of investment and a $100,000 fee call on 2022-01-01; $3,000,000 of investment on 2022-07-01; a $150,000 fee call on 2023-01-01.
- **No distributions** before X. **D** is `as_of`, 2025-06-30. X isn't final, and there's no NAV.
- **The LPs:**
  - Alder Endowment ($5,000,000), on the fund's terms, in from the start
  - Birchwood Family Office ($2,500,000), on the fund's terms, closing 2022-04-01
  - Cedar Holdings ($2,500,000), in "Friends and family" (fee rate 0, carry 0), closing 2022-10-01

## The waterfall: as if every LP were in from the start (F25)

**The accounts (F23).** Alder and Birchwood form the fund terms' account, Cedar the class's. Investment calls and distributions divide by commitment, 75/25. Fee calls divide by fee weight: Cedar's is 0, so they fall on the fund terms' account alone.

| Account | LPs | Commitment | Share of distributions and investment calls | Share of fee calls | Investment | Fees | Paid in |
|---|---|---:|---:|---:|---:|---:|---:|
| Fund terms | Alder, Birchwood | 7,500,000 | 0.75 | 1 | 3,750,000.00 | 250,000.00 | 4,000,000.00 |
| Friends and family | Cedar | 2,500,000 | 0.25 | 0 | 1,250,000.00 | 0.00 | 1,250,000.00 |
| **The fund** | | 10,000,000 | 1 | 1 | 5,000,000.00 | 250,000.00 | 5,250,000.00 |

The closes don't come into it: each LP's paid-in is its share of every call as if it had been in from the start, by commitment within its account.

| LP | Class | Close | Commitment | Share of its account | Paid in |
|---|---|---|---:|---:|---:|
| Alder Endowment | | | 5,000,000 | 2/3 | 2,666,666.67 |
| Birchwood Family Office | | 2022-04-01 | 2,500,000 | 1/3 | 1,333,333.33 |
| Cedar Holdings | Friends and family | 2022-10-01 | 2,500,000 | 1 | 1,250,000.00 |

Alder's paid-in is exactly 8,000,000/3 and Birchwood's 4,000,000/3.

**Each account's tiers.** Nothing was distributed before X.
- **Fund terms,** 0.75 of X: capital of $4,000,000 at X = $4,000,000 / 0.75 = 16,000,000/3 = **$5,333,333.33**, then 80/20.
- **Friends and family,** 0.25 of X: capital of $1,250,000 at X = **$5,000,000**, then all to its LPs.

## Breakpoints (F27)

| X | Exact | Reasons |
|---:|---|---|
| 5,000,000.00 | 5000000 | `capital_returned`: "Friends and family: LPs have their $1,250,000 of paid-in capital back" |
| 5,333,333.33 | 16000000/3 | `capital_returned`: "Fund terms: LPs have their $4,000,000 of paid-in capital back" |

**Two points read $5,333,333.33.** The input lists X = $5,333,333.33 exactly, and the fund terms' breakpoint is 16,000,000/3, a third of a cent above it. They're two points, told apart by `exact`. At the listed one the fund terms' part is 0.75 × $5,333,333.33 = $3,999,999.9975, all capital, just short of its $4,000,000.

## This distribution, by account

Nothing came before X, so each account's amounts to date are X's.

**Fund terms**

| X | Tags | Its part | Capital | LPs, carry tier | GP carry | LPs | GP |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 5,000,000.00 | listed, breakpoint | 3,750,000.00 | 3,750,000.00 | 0.00 | 0.00 | 3,750,000.00 | 0.00 |
| 5,333,333.33 | listed | 4,000,000.00 | 4,000,000.00 | 0.00 | 0.00 | 4,000,000.00 | 0.00 |
| 5,333,333.33 | breakpoint | 4,000,000.00 | 4,000,000.00 | 0.00 | 0.00 | 4,000,000.00 | 0.00 |
| 12,000,000.00 | listed | 9,000,000.00 | 4,000,000.00 | 4,000,000.00 | 1,000,000.00 | 8,000,000.00 | 1,000,000.00 |

**Friends and family**

| X | Tags | Its part | Capital | LPs, carry tier | GP carry | LPs | GP |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 5,000,000.00 | listed, breakpoint | 1,250,000.00 | 1,250,000.00 | 0.00 | 0.00 | 1,250,000.00 | 0.00 |
| 5,333,333.33 | listed | 1,333,333.33 | 1,250,000.00 | 83,333.33 | 0.00 | 1,333,333.33 | 0.00 |
| 5,333,333.33 | breakpoint | 1,333,333.33 | 1,250,000.00 | 83,333.33 | 0.00 | 1,333,333.33 | 0.00 |
| 12,000,000.00 | listed | 3,000,000.00 | 1,250,000.00 | 1,750,000.00 | 0.00 | 3,000,000.00 | 0.00 |

At $12,000,000 the fund terms' part is $9,000,000: $4,000,000 of capital, then $5,000,000 at 80/20, $1,000,000 to the GP.

## The fund, the accounts' sums (F23, F26)

| X | Tags | LPs, capital | LPs, carry tier | LPs | GP carry, Fund terms 20% | GP carry, Friends and family 0% | GP |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 5,000,000.00 | listed, breakpoint | 5,000,000.00 | 0.00 | 5,000,000.00 | 0.00 | 0.00 | 0.00 |
| 5,333,333.33 | listed | 5,250,000.00 | 83,333.33 | 5,333,333.33 | 0.00 | 0.00 | 0.00 |
| 5,333,333.33 | breakpoint | 5,250,000.00 | 83,333.33 | 5,333,333.33 | 0.00 | 0.00 | 0.00 |
| 12,000,000.00 | listed | 5,250,000.00 | 5,750,000.00 | 11,000,000.00 | 1,000,000.00 | 0.00 | 1,000,000.00 |

The fund to date is the same table.

## Each LP (F20, F23)

Alder has 2/3 of the fund terms' LPs' amounts and Birchwood 1/3; Cedar has all of the class's.

| X | Tags | Alder Endowment | Birchwood Family Office | Cedar Holdings |
|---:|---|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 |
| 5,000,000.00 | listed, breakpoint | 2,500,000.00 | 1,250,000.00 | 1,250,000.00 |
| 5,333,333.33 | listed | 2,666,666.67 | 1,333,333.33 | 1,333,333.33 |
| 5,333,333.33 | breakpoint | 2,666,666.67 | 1,333,333.33 | 1,333,333.33 |
| 12,000,000.00 | listed | 5,333,333.33 | 2,666,666.67 | 3,000,000.00 |

To date is the same. The two points at $5,333,333.33 differ below the cent:

| Point | Alder Endowment | Birchwood Family Office | Cedar Holdings |
|---|---|---|---|
| listed, 5333333.33 | 2666666.665 | 1333333.3325 | 1333333.3325 |
| breakpoint, 16000000/3 | 8000000/3 | 4000000/3 | 4000000/3 |

## The equalization (F25)

**The calls as the fund made them.** Each was paid by the LPs in at its date (FA21): by commitment for an investment call, by fee weight for a fee call.

| Call | Date | Kind | Amount | In at its date | Alder | Birchwood | Cedar |
|---|---|---|---:|---|---:|---:|---:|
| `cash_flows[0]` | 2022-01-01 | investment | 2,000,000.00 | Alder | 2,000,000.00 | | |
| `cash_flows[1]` | 2022-01-01 | fee | 100,000.00 | Alder | 100,000.00 | | |
| `cash_flows[2]` | 2022-07-01 | investment | 3,000,000.00 | Alder, Birchwood | 2,000,000.00 | 1,000,000.00 | |
| `cash_flows[3]` | 2023-01-01 | fee | 150,000.00 | all three | 100,000.00 | 50,000.00 | 0.00 |

The last call came after both closes, so it's in neither.

### The first later close, 2022-04-01: Birchwood joins

The LPs in by then are Alder and Birchwood, $5,000,000 and $2,500,000: 2/3 and 1/3 of every call before the close, fee calls included, since both pay the fund's fees.

| Call | Alder had paid | Alder's part now | Birchwood pays in | Alder gets back |
|---|---:|---:|---:|---:|
| 2022-01-01 investment | 2,000,000.00 | 1,333,333.33 | 666,666.67 | 666,666.67 |
| 2022-01-01 fee | 100,000.00 | 66,666.67 | 33,333.33 | 33,333.33 |
| **Both** | 2,100,000.00 | 1,400,000.00 | **700,000.00** | **700,000.00** |

**Interest:** 2022-01-01 to 2022-04-01 is 90 days (31 + 28 + 31). Birchwood pays 6% on $700,000 for 90 days: $700,000 × 6% × 90 / 365 = 3,780,000/365 = 756,000/73 = **$10,356.16**, all to Alder, the only LP already in.

### The second later close, 2022-10-01: Cedar joins

Now all three are in. Each investment call divides by commitment, 1/2, 1/4 and 1/4. The fee call divides by fee weight: Cedar's is 0, so Alder and Birchwood keep their 2/3 and 1/3 of it, and nothing moves.

| Call | Days to the close | Alder had | Birchwood had | Alder now | Birchwood now | Cedar pays in | Alder gets back | Birchwood gets back |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2022-01-01 investment | 273 | 1,333,333.33 | 666,666.67 | 1,000,000.00 | 500,000.00 | 500,000.00 | 333,333.33 | 166,666.67 |
| 2022-01-01 fee | 273 | 66,666.67 | 33,333.33 | 66,666.67 | 33,333.33 | 0.00 | 0.00 | 0.00 |
| 2022-07-01 investment | 92 | 2,000,000.00 | 1,000,000.00 | 1,500,000.00 | 750,000.00 | 750,000.00 | 500,000.00 | 250,000.00 |
| **All three** | | | | | | **1,250,000.00** | **833,333.33** | **416,666.67** |

Exactly, Alder gets back 2,500,000/3 and Birchwood 1,250,000/3. The days are 273 from 2022-01-01 (the first nine months of 2022) and 92 from 2022-07-01 (31 + 31 + 30).

**Interest,** at 6%:
- **Cedar pays:** 6% × ($500,000 × 273 + $750,000 × 92) / 365 = 6% × 205,500,000 / 365 = 2,466,000/73 = **$33,780.82**.
- **Alder receives** its share of each call's interest, in proportion to what it gets back of that call. On the first investment call that's 2/3 and on the second 2/3, so 6% × ($333,333.33… × 273 + $500,000 × 92) / 365 = 6% × 137,000,000 / 365 = 1,644,000/73 = **$22,520.55**.
- **Birchwood receives** the other third of each: 6% × ($166,666.66… × 273 + $250,000 × 92) / 365 = 6% × 68,500,000 / 365 = 822,000/73 = **$11,260.27**.
- **No interest on the fee call:** Cedar pays none of it.

Together 2,466,000/73, what Cedar paid. Birchwood joined at the first close and gets some back at the second (FA30).

### Each LP's equalization, over both closes

| LP | Capital paid in at its close | Capital got back | Interest paid | Interest received |
|---|---:|---:|---:|---:|
| Alder Endowment | 0.00 | 700,000.00 + 833,333.33 = 1,533,333.33 | 0.00 | 10,356.16 + 22,520.55 = 32,876.71 |
| Birchwood Family Office | 700,000.00 | 416,666.67 | 10,356.16 | 11,260.27 |
| Cedar Holdings | 1,250,000.00 | 0.00 | 33,780.82 | 0.00 |

Exactly: Alder gets back 4,600,000/3 and receives 2,400,000/73; Birchwood pays 756,000/73 and receives 822,000/73; Cedar pays 2,466,000/73. Paid and received balance: 756,000 + 2,466,000 = 2,400,000 + 822,000 = 3,222,000, over 73.

**A check on paid-in.**
- **Alder** paid $2,100,000 in January 2022, $2,000,000 in July and $100,000 in 2023, and got back $1,533,333.33: $2,666,666.67, its paid-in as if in from the start.
- **Birchwood** paid $700,000 at its close, $1,000,000 in July and $50,000 in 2023, and got back $416,666.67: $1,333,333.33.
- **Cedar** paid $1,250,000 at its close and nothing after: $1,250,000.

Not final and no NAV, so no point has a clawback.
