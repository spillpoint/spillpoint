# Fund case 38, fees on invested capital: derivation

A fund that doesn't list its LPs, with its management fee on commitments for three years and then on net invested capital (F38, F39), on the whole fund (F34). Each day from the step counts at that day's net invested capital, so a follow-on, an exit and a write-off inside a quarter each change the fee from their own date. Everything else is as on commitments: the schedule's calls are calls (F30), and carry starts once the LPs have all their paid-in back (F5).

- **The terms:** 20% carry, no pref, and a 1% GP commitment, fee-free and paying its share of expenses (F3's defaults).
- **The schedule:** from 2020-01-01, quarterly. 2% a year on $20,000,000 of commitments, then from 2023-01-01 1.5% a year on net invested capital (F39). The fund lists no LPs, so `commitments` is the first step's base; it's needed because a step is on commitments (F40).
- **Investment calls:** $7,000,000 on 2020-01-15, $5,000,000 on 2021-02-15 and $2,000,000 on 2023-05-01, $14,000,000 in all. No fee call is entered: with a schedule, none may be (F32).
- **The investments:** Alder Robotics, a $4,000,000 check on 2020-02-01; Birch Health, $3,000,000 on 2020-06-15; Cedar AI, $5,000,000 on 2021-03-01; Dogwood Labs, $2,000,000 on 2023-05-16, inside Q2 2023. $14,000,000 of cost, every dollar called for investments.
- **An exit:** $10,000,000 from Alder Robotics on 2023-08-15, its share left out, so all of it. **A write-off:** Birch Health on 2024-02-20.
- **X** comes from Cedar AI. **D** is `as_of`, 2024-06-30, the last day of Q2 2024. X isn't final; the NAV is $18,000,000.

**The checks against the calls (F37):** $4,000,000 made on $7,000,000 called by 2020-02-01; $7,000,000 on $7,000,000 by 2020-06-15; $12,000,000 on $12,000,000 by 2021-03-01; $14,000,000 on $14,000,000 by 2023-05-16.

## Net invested capital (F38)

The checks made to a day, less the cost exited or written off to it: what's left of every investment, added up. A check counts from its own date, and an exit or a write-off takes its cost out from its own date. Whole-fund amounts, the GP commitment's 1% included.

| From | Event | Net invested capital |
|---|---|---:|
| 2020-02-01 | Alder Robotics' check | 4,000,000 |
| 2020-06-15 | Birch Health's check | 7,000,000 |
| 2021-03-01 | Cedar AI's check | 12,000,000 |
| 2023-05-16 | Dogwood Labs' check | 14,000,000 |
| 2023-08-15 | Alder Robotics' exit realizes its $4,000,000 | 10,000,000 |
| 2024-02-20 | Birch Health written off, $3,000,000 | 7,000,000 |

So from 2023-01-01, the step's date: $12,000,000 to 2023-05-15, $14,000,000 from 2023-05-16 to 2023-08-14, $10,000,000 from 2023-08-15 to 2024-02-19, and $7,000,000 from 2024-02-20.

## The fee calls (F30, F39)

**On commitments, 2020 to 2022:** each quarter is whole and at 2%, so its fee is 2% × $20,000,000 / 4 = **$100,000**. Twelve quarters, $1,200,000.

**On invested capital, from 2023-01-01:** each day at 1.5% of the LPs' part of that day's net invested capital, 99% of it (F39; the GP commitment's 1% is aside, F3), added up, over 4 × the quarter's days. Without listed LPs nothing more divides it. A quarter at one figure all through is 1.5% × 99% of it over 4.

| Date | Covers | Days at each invested capital | Working | Exact | Call |
|---|---|---|---|---:|---:|
| 2023-01-01 | 2023-01-01 to 2023-03-31 | 90 at 12,000,000 | 1.5% × 99% × 12,000,000 / 4 | 44550 | 44,550.00 |
| 2023-04-01 | 2023-04-01 to 2023-06-30 | 45 at 12,000,000 + 46 at 14,000,000 | 1.5% × 99% × (12,000,000 × 45 + 14,000,000 × 46) / (4 × 91) | 4395600/91 | 48,303.30 |
| 2023-07-01 | 2023-07-01 to 2023-09-30 | 45 at 14,000,000 + 47 at 10,000,000 | 1.5% × 99% × (14,000,000 × 45 + 10,000,000 × 47) / (4 × 92) | 2041875/46 | 44,388.59 |
| 2023-10-01 | 2023-10-01 to 2023-12-31 | 92 at 10,000,000 | 1.5% × 99% × 10,000,000 / 4 | 37125 | 37,125.00 |
| 2024-01-01 | 2024-01-01 to 2024-03-31 | 50 at 10,000,000 + 41 at 7,000,000 | 1.5% × 99% × (10,000,000 × 50 + 7,000,000 × 41) / (4 × 91) | 5843475/182 | 32,107.01 |
| 2024-04-01 | 2024-04-01 to 2024-06-30 | 91 at 7,000,000 | 1.5% × 99% × 7,000,000 / 4 | 25987.5 | 25,987.50 |
| **All six** |  |  |  |  | **232,461.39** |

- **Q2 2023:** 45 days at $12,000,000 to 2023-05-15, then 46 at $14,000,000 from Dogwood's check.
- **Q3 2023:** 45 days at $14,000,000 to 2023-08-14, then 47 at $10,000,000 from Alder's exit, which takes its $4,000,000 out from 2023-08-15.
- **Q1 2024:** 91 days, 2024 being a leap year: 50 at $10,000,000 to 2024-02-19, then 41 at $7,000,000 from Birch's write-off.
- **Q2 2024, D's quarter:** it ends on D, so no day of it is after D.

Those six quarters come to **$232,461.39**, where 1.5% of commitments would have been $450,000. The GP commitment is fee-free, so each call is the LPs' fee and its part of each is $0.00. Fees in all: $1,200,000 + $232,461.39 = **$1,432,461.39**.

## Paid in

The GP commitment pays 1% of each investment call and none of the fee calls (F3).

| Calls | Amount | GP commitment | LPs |
|---|---:|---:|---:|
| Investment calls | 14,000,000.00 | 140,000.00 | 13,860,000.00 |
| The schedule's 18 fee calls | 1,432,461.39 | 0.00 | 1,432,461.39 |
| **All** | 15,432,461.39 | **140,000.00** | **15,292,461.39** |

## The investments (F33, F36)

Once, at D, before X:

| Investment | Cost made | Cost realized | Written off | Proceeds |
|---|---:|---:|---:|---:|
| Alder Robotics | 4,000,000.00 | 4,000,000.00 | 0.00 | 10,000,000.00 |
| Birch Health | 3,000,000.00 | 3,000,000.00 | 3,000,000.00 | 0.00 |
| Cedar AI | 5,000,000.00 | 0.00 | 0.00 | 0.00 |
| Dogwood Labs | 2,000,000.00 | 0.00 | 0.00 | 0.00 |

**The realized multiple** (F36, FA59), proceeds over the cost realized: Alder Robotics 10,000,000 / 4,000,000 = **2.5x**; Birch Health, written off with none, **0x**; Cedar AI and Dogwood Labs, nothing realized, **none** (null).

## The earlier distribution (F1, F5)

The $10,000,000 on 2023-08-15: the GP commitment's 1%, $100,000, outside the tiers (F3), and $9,900,000 through them. On the whole fund the LPs get back all their paid-in first. By then they had paid in $15,197,241.88: $13,860,000 of investment calls and the fees through the call of 2023-07-01. So all $9,900,000 is capital, and no carry is paid.

The write-off moves no money: it's not a distribution. It lowers the fee, from 2024-02-20.

## X, distributed on D

1% of X to the GP commitment, and 0.99 X through the tiers:
- **Capital:** the LPs' paid-in, $15,292,461.39, less the $9,900,000 back: **$5,392,461.39**. 0.99 X reaches it at X = 5,392,461.39 / 0.99 = 376214056250/69069 = **$5,446,930.70**.
- **Then 80/20.**

No pref and one carry rate, so nothing else bends. X doesn't move the fees: D's quarter is called in advance on 2024-04-01 at the net invested capital before X (F39).

| X | Exact | Reasons |
|---:|---|---|
| 5,446,930.70 | 376214056250/69069 | `capital_returned`: "LPs have their $15,292,461.39 of paid-in capital back" |

- **At $12,000,000:** $120,000 to the GP commitment and $11,880,000 through the tiers: $5,392,461.39 of capital, then $6,487,538.61 at 80/20, **$1,297,507.72 of carry**.
- **At $18,000,000, the NAV point:** $180,000 and $17,820,000: the same capital, then $12,427,538.61 at 80/20, **$2,485,507.72 of carry**.

## This distribution

| X | Tags | GP commitment | LPs, capital | LPs, carry tier | LPs | GP carry |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 5,000,000.00 | listed | 50,000.00 | 4,950,000.00 | 0.00 | 4,950,000.00 | 0.00 |
| 5,446,930.70 | breakpoint | 54,469.31 | 5,392,461.39 | 0.00 | 5,392,461.39 | 0.00 |
| 12,000,000.00 | listed | 120,000.00 | 5,392,461.39 | 5,190,030.89 | 10,582,492.28 | 1,297,507.72 |
| 18,000,000.00 | nav | 180,000.00 | 5,392,461.39 | 9,942,030.89 | 15,334,492.28 | 2,485,507.72 |

## The fund to date

| X | Tags | GP commitment | LPs, capital | LPs, carry tier | LPs | GP carry |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 100,000.00 | 9,900,000.00 | 0.00 | 9,900,000.00 | 0.00 |
| 5,000,000.00 | listed | 150,000.00 | 14,850,000.00 | 0.00 | 14,850,000.00 | 0.00 |
| 5,446,930.70 | breakpoint | 154,469.31 | 15,292,461.39 | 0.00 | 15,292,461.39 | 0.00 |
| 12,000,000.00 | listed | 220,000.00 | 15,292,461.39 | 5,190,030.89 | 20,482,492.28 | 1,297,507.72 |
| 18,000,000.00 | nav | 280,000.00 | 15,292,461.39 | 9,942,030.89 | 25,234,492.28 | 2,485,507.72 |

## The NAV point: the clawback (F12)

Final by definition. On the fund's totals, $9,900,000 + $17,820,000 = $27,720,000 through the tiers, less the $15,292,461.39 of paid-in, leaves $12,427,538.61 of profit; 20% is **$2,485,507.72**, the carry paid, all of it from X. Nothing is owed.

| X | Tags | Carry paid | Entitlement | Owed |
|---:|---|---:|---:|---:|
| 18,000,000.00 | nav | 2,485,507.72 | 2,485,507.72 | 0.00 |

The case file gives the schedule's eighteen calls once, at the top (FC13), each its date, the days it covers, the call, the LPs' part and the GP commitment's. No LPs are listed, so there's no `by_lp`.
