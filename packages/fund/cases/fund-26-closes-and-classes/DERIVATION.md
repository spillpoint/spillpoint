# Fund case 26, two later closes and a class: derivation

Three LPs: one in from the start, one joining at a first later close, and one in a friends-and-family class (no fees, no carry) joining at a second (F22, F25). The fund's carry is 20%, its standard fee rate 2%. No pref, no GP commitment. Equalization interest is 6%.

**Worked again under F29 (f04a).** The inputs are 0.3.0's. What changes is the fee call made before Birchwood's close: a fee is each LP's own, so Birchwood owes its own part of it to the manager, its back fees, and it isn't rebalanced between the LPs. "What changed from 0.3.0", at the end, sets the two side by side.

- **Calls:** $2,000,000 of investment and a $100,000 fee call on 2022-01-01; $3,000,000 of investment on 2022-07-01; a $150,000 fee call on 2023-01-01.
- **No distributions** before X. **D** is `as_of`, 2025-06-30. X isn't final, and there's no NAV.
- **The LPs:**
  - Alder Endowment ($5,000,000), on the fund's terms, in from the start
  - Birchwood Family Office ($2,500,000), on the fund's terms, closing 2022-04-01
  - Cedar Holdings ($2,500,000), in "Friends and family" (fee rate 0, carry 0), closing 2022-10-01

## The fee calls (F22, F29)

**Fee weights:** Alder's and Birchwood's are their commitments, $5,000,000 and $2,500,000; Cedar's class pays a fee rate of 0, so its weight is 0. $7,500,000 in all.

**The 2022-01-01 fee call, before both closes.** Only Alder was in, so Alder paid the $100,000 as it was made: 100,000 / 5,000,000 = **$0.02 for each dollar of fee weight**. Every LP's part, as if in from the start, is that times its weight:
- **Birchwood:** $2,500,000 × 0.02 = **$50,000 of back fees,** paid at its close to the manager.
- **Cedar:** a weight of 0, so **none**.

In the waterfall the call counts at its full size, $7,500,000 × 0.02 = **$150,000**, all of it the fund terms' account's.

**The 2023-01-01 fee call** came after both closes: Alder and Birchwood paid its $150,000 as it was made, $100,000 and $50,000. It's as entered.

## The waterfall: as if every LP were in from the start (F25, F29)

**The accounts (F23).** Alder and Birchwood form the fund terms' account, Cedar the class's. Investment calls and distributions divide by commitment, 75/25. Fee calls divide by fee weight: Cedar's is 0, so they fall on the fund terms' account alone.

| Account | LPs | Commitment | Share of distributions and investment calls | Share of fee calls | Investment | Fees | Paid in |
|---|---|---:|---:|---:|---:|---:|---:|
| Fund terms | Alder, Birchwood | 7,500,000 | 0.75 | 1 | 3,750,000.00 | 150,000.00 + 150,000.00 = 300,000.00 | 4,050,000.00 |
| Friends and family | Cedar | 2,500,000 | 0.25 | 0 | 1,250,000.00 | 0.00 | 1,250,000.00 |
| **The fund** | | 10,000,000 | 1 | 1 | 5,000,000.00 | 300,000.00 | **5,300,000.00** |

Each LP's paid-in is its part of every call as if it had been in from the start, by commitment within its account. Its share is F19's, its commitment over all three.

| LP | Class | Close | Commitment | Share | Of its account | Paid in |
|---|---|---|---:|---:|---:|---:|
| Alder Endowment | | | 5,000,000 | 0.5 | 2/3 | 2,700,000.00 |
| Birchwood Family Office | | 2022-04-01 | 2,500,000 | 0.25 | 1/3 | 1,350,000.00 |
| Cedar Holdings | Friends and family | 2022-10-01 | 2,500,000 | 0.25 | 1 | 1,250,000.00 |

**Each account's tiers.** Nothing was distributed before X.
- **Fund terms,** 0.75 of X: capital of $4,050,000 at X = $4,050,000 / 0.75 = **$5,400,000**, then 80/20.
- **Friends and family,** 0.25 of X: capital of $1,250,000 at X = **$5,000,000**, then all to its LPs.

## Breakpoints (F27)

| X | Exact | Reasons |
|---:|---|---|
| 5,000,000.00 | 5000000 | `capital_returned`: "Friends and family: LPs have their $1,250,000 of paid-in capital back" |
| 5,400,000.00 | 5400000 | `capital_returned`: "Fund terms: LPs have their $4,050,000 of paid-in capital back" |

**The listed X of $5,200,000 is between the two:** the class has its capital back, and the fund terms' LPs don't yet.

## This distribution, by account

Nothing came before X, so each account's amounts to date are X's.

**Fund terms**

| X | Tags | Its part | Capital | LPs, carry tier | GP carry | LPs | GP |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 5,000,000.00 | listed, breakpoint | 3,750,000.00 | 3,750,000.00 | 0.00 | 0.00 | 3,750,000.00 | 0.00 |
| 5,200,000.00 | listed | 3,900,000.00 | 3,900,000.00 | 0.00 | 0.00 | 3,900,000.00 | 0.00 |
| 5,400,000.00 | breakpoint | 4,050,000.00 | 4,050,000.00 | 0.00 | 0.00 | 4,050,000.00 | 0.00 |
| 12,000,000.00 | listed | 9,000,000.00 | 4,050,000.00 | 3,960,000.00 | 990,000.00 | 8,010,000.00 | 990,000.00 |

**Friends and family**

| X | Tags | Its part | Capital | LPs, carry tier | GP carry | LPs | GP |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 5,000,000.00 | listed, breakpoint | 1,250,000.00 | 1,250,000.00 | 0.00 | 0.00 | 1,250,000.00 | 0.00 |
| 5,200,000.00 | listed | 1,300,000.00 | 1,250,000.00 | 50,000.00 | 0.00 | 1,300,000.00 | 0.00 |
| 5,400,000.00 | breakpoint | 1,350,000.00 | 1,250,000.00 | 100,000.00 | 0.00 | 1,350,000.00 | 0.00 |
| 12,000,000.00 | listed | 3,000,000.00 | 1,250,000.00 | 1,750,000.00 | 0.00 | 3,000,000.00 | 0.00 |

At $5,200,000 the fund terms' part is 0.75 × $5,200,000 = $3,900,000, all capital, $150,000 short of its $4,050,000. The class's is $1,300,000: its $1,250,000 of capital, then $50,000 at no carry. The GP gets nothing.

At $12,000,000 the fund terms' part is $9,000,000: $4,050,000 of capital, then $4,950,000 at 80/20, $990,000 to the GP.

## The fund, the accounts' sums (F23, F26)

| X | Tags | LPs, capital | LPs, carry tier | LPs | GP carry, Fund terms 20% | GP carry, Friends and family 0% | GP |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 5,000,000.00 | listed, breakpoint | 5,000,000.00 | 0.00 | 5,000,000.00 | 0.00 | 0.00 | 0.00 |
| 5,200,000.00 | listed | 5,150,000.00 | 50,000.00 | 5,200,000.00 | 0.00 | 0.00 | 0.00 |
| 5,400,000.00 | breakpoint | 5,300,000.00 | 100,000.00 | 5,400,000.00 | 0.00 | 0.00 | 0.00 |
| 12,000,000.00 | listed | 5,300,000.00 | 5,710,000.00 | 11,010,000.00 | 990,000.00 | 0.00 | 990,000.00 |

The fund to date is the same table.

## Each LP (F20, F23)

Alder has 2/3 of the fund terms' LPs' amounts and Birchwood 1/3; Cedar has all of the class's.

| X | Tags | Alder Endowment | Birchwood Family Office | Cedar Holdings |
|---:|---|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 |
| 5,000,000.00 | listed, breakpoint | 2,500,000.00 | 1,250,000.00 | 1,250,000.00 |
| 5,200,000.00 | listed | 2,600,000.00 | 1,300,000.00 | 1,300,000.00 |
| 5,400,000.00 | breakpoint | 2,700,000.00 | 1,350,000.00 | 1,350,000.00 |
| 12,000,000.00 | listed | 5,340,000.00 | 2,670,000.00 | 3,000,000.00 |

To date is the same. At $5,200,000 Alder has 2/3 of the fund terms' $3,900,000, $2,600,000, and Birchwood 1/3, $1,300,000; Cedar has the class's $1,300,000.

## The equalization (F25, F29)

**The investment calls as the fund made them.** Each was paid by the LPs in at its date (FA21), by commitment. Only investment calls rebalance (F29).

| Call | Date | Amount | In at its date | Alder | Birchwood | Cedar |
|---|---|---:|---|---:|---:|---:|
| `cash_flows[0]` | 2022-01-01 | 2,000,000.00 | Alder | 2,000,000.00 | | |
| `cash_flows[2]` | 2022-07-01 | 3,000,000.00 | Alder, Birchwood | 2,000,000.00 | 1,000,000.00 | |

### The first later close, 2022-04-01: Birchwood joins

The LPs in by then are Alder and Birchwood, $5,000,000 and $2,500,000: 2/3 and 1/3 of the investment call before the close.

| Call | Alder had paid | Alder's part now | Birchwood pays in | Alder gets back |
|---|---:|---:|---:|---:|
| 2022-01-01 investment | 2,000,000.00 | 1,333,333.33 | **666,666.67** | **666,666.67** |

Exactly 2,000,000/3 each way.

**Interest:** 2022-01-01 to 2022-04-01 is 90 days (31 + 28 + 31). Birchwood pays 6% on $666,666.67 for 90 days: 2,000,000/3 × 6% × 90 / 365 = 3,600,000/365 = 720,000/73 = **$9,863.01**, all to Alder, the only LP already in.

**The fee call isn't rebalanced (F29).** Alder keeps its $100,000 of it, and Birchwood pays its own **$50,000 of back fees** to the manager, with no interest.

### The second later close, 2022-10-01: Cedar joins

Now all three are in. Each investment call divides by commitment, 1/2, 1/4 and 1/4. This close is as it was in 0.3.0: there the fee call moved nothing here either, since Cedar's fee weight is 0.

| Call | Days to the close | Alder had | Birchwood had | Alder now | Birchwood now | Cedar pays in | Alder gets back | Birchwood gets back |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2022-01-01 investment | 273 | 1,333,333.33 | 666,666.67 | 1,000,000.00 | 500,000.00 | 500,000.00 | 333,333.33 | 166,666.67 |
| 2022-07-01 investment | 92 | 2,000,000.00 | 1,000,000.00 | 1,500,000.00 | 750,000.00 | 750,000.00 | 500,000.00 | 250,000.00 |
| **Both** | | | | | | **1,250,000.00** | **833,333.33** | **416,666.67** |

Exactly, Alder gets back 2,500,000/3 and Birchwood 1,250,000/3. The days are 273 from 2022-01-01 (the first nine months of 2022) and 92 from 2022-07-01 (31 + 31 + 30).

**Interest,** at 6%:
- **Cedar pays:** 6% × ($500,000 × 273 + $750,000 × 92) / 365 = 6% × 205,500,000 / 365 = 2,466,000/73 = **$33,780.82**.
- **Alder receives** 6% on what it gets back of each call, for the call's days: 6% × ($333,333.33… × 273 + $500,000 × 92) / 365 = 6% × 137,000,000 / 365 = 1,644,000/73 = **$22,520.55**.
- **Birchwood receives** 6% × ($166,666.66… × 273 + $250,000 × 92) / 365 = 6% × 68,500,000 / 365 = 822,000/73 = **$11,260.27**.

Together 2,466,000/73, what Cedar paid. Birchwood joined at the first close and gets some back at the second (FA30). **Cedar owes no back fees:** its fee weight is 0.

### Each LP's equalization, over both closes

| LP | Capital paid in at its close | Capital got back | Interest paid | Interest received | Back fees |
|---|---:|---:|---:|---:|---:|
| Alder Endowment | 0.00 | 1,500,000.00 | 0.00 | 32,383.56 | 0.00 |
| Birchwood Family Office | 666,666.67 | 416,666.67 | 9,863.01 | 11,260.27 | 50,000.00 |
| Cedar Holdings | 1,250,000.00 | 0.00 | 33,780.82 | 0.00 | 0.00 |

Exactly: Alder gets back 4,500,000/3 = $1,500,000 and receives 720,000/73 + 1,644,000/73 = 2,364,000/73; Birchwood pays 720,000/73 and receives 822,000/73; Cedar pays 2,466,000/73. Paid and received balance: 720,000 + 2,466,000 = 2,364,000 + 822,000 = 3,186,000, over 73.

**A check on paid-in.**
- **Alder** paid $2,100,000 in January 2022, $2,000,000 in July and $100,000 in 2023, and got back $1,500,000: $2,700,000, its paid-in as if in from the start.
- **Birchwood** paid $666,666.67 and $50,000 of back fees at its close, $1,000,000 in July and $50,000 in 2023, and got back $416,666.67: $1,350,000.
- **Cedar** paid $1,250,000 at its close and nothing after: $1,250,000.

Not final and no NAV, so no point has a clawback.

## What changed from 0.3.0

In 0.3.0 the January 2022 fee call was rebalanced at Birchwood's close as the investment call was: Birchwood paid Alder $33,333.33 of it, with interest, and the call counted at the $100,000 Alder paid. Under F29 it's each LP's own fee: Birchwood owes its own $50,000 to the manager, the call counts at $150,000, and nothing about it moves between the LPs. So the fund terms' paid-in, and the LPs', rise by Birchwood's $50,000 of back fees; the fund terms' capital comes back at $5,400,000 of X, not $5,333,333.33; and the first close moves only the investment call. The second close is unchanged.

|  | 0.3.0 | Now |
|---|---:|---:|
| The LPs' paid-in | 5,250,000.00 | 5,300,000.00 |
| Fund terms' paid-in | 4,000,000.00 | 4,050,000.00 |
| Each LP's paid-in: Alder, Birchwood, Cedar | 2,666,666.67 / 1,333,333.33 / 1,250,000.00 | 2,700,000.00 / 1,350,000.00 / 1,250,000.00 |
| Fund terms' capital back | 5,333,333.33 | 5,400,000.00 |
| At X = 12,000,000: LPs / GP | 11,000,000.00 / 1,000,000.00 | 11,010,000.00 / 990,000.00 |
| Alder Endowment: capital got back | 1,533,333.33 | 1,500,000.00 |
| Alder Endowment: interest received | 32,876.71 | 32,383.56 |
| Alder Endowment: back fees | — | 0.00 |
| Birchwood Family Office: capital paid in | 700,000.00 | 666,666.67 |
| Birchwood Family Office: interest paid | 10,356.16 | 9,863.01 |
| Birchwood Family Office: back fees | — | 50,000.00 |
| Cedar Holdings: back fees | — | 0.00 |
