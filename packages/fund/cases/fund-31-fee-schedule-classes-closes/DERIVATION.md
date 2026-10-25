# Fund case 31, a fee schedule with classes and a later close: derivation

Three LPs: one on the fund's terms, one in an Anchor class at half the fund's fee rate, and one in a friends-and-family class paying no fees. The Anchor LP joins at a later close in the middle of a quarter. Fees come from a schedule (F30), so at its close it owes back fees for the quarters before it, paid to the manager (F29), beside its share of an earlier investment call and interest on it, paid to the LPs already in (F25).

- **The schedule:** from 2022-01-01, quarterly (the default), at 2% a year. No `commitments`: the LPs are listed.
- **The classes:** Anchor, at a 1% fee and 15% carry; Friends and family, at no fee and no carry. The fund's carry is 20%, and there's no pref or GP commitment.
- **The LPs:** Alder Endowment ($10,000,000) on the fund's terms, Cedar Holdings ($2,000,000) in Friends and family, both in from the start; and Dogwood Pension ($8,000,000) in Anchor, with a close of 2022-08-15, in Q3 2022.
- **Investment calls:** $4,000,000 on 2022-02-01 and $6,000,000 on 2023-03-01. An 8% equalization rate.
- **An earlier distribution:** $5,000,000 on 2025-06-30.
- **D** is `as_of`, 2025-12-31. X isn't final, and there's no NAV.

The fund's first call is the schedule's, on 2022-01-01 (F30). Dogwood's close is after it, so Dogwood joins at a later close.

## The fee calls (F30)

**Each LP's fee** is its commitment, times its class factor, times the quarter's fee factor:
- **The fee factor:** every quarter from 2022-01-01 is whole and at 2%, so it's 2% / 4 = 0.005.
- **The class factors:** a class's fee rate over the schedule's first rate (F22). Alder is on the fund's terms: 1. Dogwood's Anchor class pays 1% against 2%: 1/2. Cedar's class pays 0: 0.
- **Each quarter:** Alder $10,000,000 × 1 × 0.005 = **$50,000**; Dogwood $8,000,000 × 1/2 × 0.005 = **$20,000**; Cedar **$0**. The call is the LPs' fees, **$70,000**: there's no GP commitment.

The calls are every LP's own fee, as if each were in from the start, whatever its close (F30). Sixteen quarters, from 2022-01-01 to the quarter that starts on 2025-10-01, D's.

| Date | Covers | Call | Alder | Cedar | Dogwood |
|---|---|---:|---:|---:|---:|
| 2022-01-01 | 2022-01-01 to 2022-03-31 | 70,000.00 | 50,000.00 | 0.00 | 20,000.00 |
| 2022-04-01 | 2022-04-01 to 2022-06-30 | 70,000.00 | 50,000.00 | 0.00 | 20,000.00 |
| 2022-07-01 | 2022-07-01 to 2022-09-30 | 70,000.00 | 50,000.00 | 0.00 | 20,000.00 |
| 2022-10-01 | 2022-10-01 to 2022-12-31 | 70,000.00 | 50,000.00 | 0.00 | 20,000.00 |
| 2023-01-01 | 2023-01-01 to 2023-03-31 | 70,000.00 | 50,000.00 | 0.00 | 20,000.00 |
| 2023-04-01 | 2023-04-01 to 2023-06-30 | 70,000.00 | 50,000.00 | 0.00 | 20,000.00 |
| 2023-07-01 | 2023-07-01 to 2023-09-30 | 70,000.00 | 50,000.00 | 0.00 | 20,000.00 |
| 2023-10-01 | 2023-10-01 to 2023-12-31 | 70,000.00 | 50,000.00 | 0.00 | 20,000.00 |
| 2024-01-01 | 2024-01-01 to 2024-03-31 | 70,000.00 | 50,000.00 | 0.00 | 20,000.00 |
| 2024-04-01 | 2024-04-01 to 2024-06-30 | 70,000.00 | 50,000.00 | 0.00 | 20,000.00 |
| 2024-07-01 | 2024-07-01 to 2024-09-30 | 70,000.00 | 50,000.00 | 0.00 | 20,000.00 |
| 2024-10-01 | 2024-10-01 to 2024-12-31 | 70,000.00 | 50,000.00 | 0.00 | 20,000.00 |
| 2025-01-01 | 2025-01-01 to 2025-03-31 | 70,000.00 | 50,000.00 | 0.00 | 20,000.00 |
| 2025-04-01 | 2025-04-01 to 2025-06-30 | 70,000.00 | 50,000.00 | 0.00 | 20,000.00 |
| 2025-07-01 | 2025-07-01 to 2025-09-30 | 70,000.00 | 50,000.00 | 0.00 | 20,000.00 |
| 2025-10-01 | 2025-10-01 to 2025-12-31 | 70,000.00 | 50,000.00 | 0.00 | 20,000.00 |
| **All** |  | **1,120,000.00** | 800,000.00 | 0.00 | 320,000.00 |

## The accounts (F23)

Three accounts, the fund's terms first, then the classes in the input's order. Each one's share of every distribution and investment call is its commitment over the $20,000,000; its share of each fee call is its fee weight over all of them: 10,000,000, 4,000,000 and 0, out of 14,000,000.

| Account | LP | Commitment | Share | Share of fee calls | Carry | Paid in |
|---|---|---:|---:|---:|---|---:|
| Fund terms | Alder Endowment | 10,000,000 | 0.5 | 5/7 | 20% | 5,800,000.00 |
| Anchor | Dogwood Pension | 8,000,000 | 0.4 | 2/7 | 15% | 4,320,000.00 |
| Friends and family | Cedar Holdings | 2,000,000 | 0.1 | 0 | 0% | 1,000,000.00 |

- **Fund terms:** half the $10,000,000 of investment, $5,000,000, and 16 × $50,000 of fees: **$5,800,000**.
- **Anchor:** 0.4 of the investment, $4,000,000, and 16 × $20,000 of fees: **$4,320,000**. Dogwood's 3 back-fee quarters are in it, as if it had been in from the start (F29).
- **Friends and family:** 0.1 of the investment, $1,000,000, and no fees: **$1,000,000**.

That's $11,120,000 in all.

## The earlier distribution: capital

$5,000,000 on 2025-06-30, divided by commitment: $2,500,000 to the fund's terms, $2,000,000 to Anchor and $500,000 to Friends and family. Each is less than the capital its account had paid in by then, so all of it is capital.

## X, distributed on D

Each account gets its share of X: 0.5, 0.4 and 0.1 (F23). Its capital is back when that share reaches what's left:
- **Friends and family:** $1,000,000 − $500,000 = $500,000 left. 0.1 X = $500,000 at **X = $5,000,000**. Then no carry: every dollar to its LPs.
- **Anchor:** $4,320,000 − $2,000,000 = $2,320,000 left. 0.4 X = $2,320,000 at **X = $5,800,000**. Then 85/15.
- **Fund terms:** $5,800,000 − $2,500,000 = $3,300,000 left. 0.5 X = $3,300,000 at **X = $6,600,000**. Then 80/20.

No pref, so nothing else bends. Each listed X from $5,000,000 up is one of these.

## Breakpoints

Three accounts, so each reason starts with its account's name (F27).

| X | Exact | Reasons |
|---:|---|---|
| 5,000,000.00 | 5000000 | `capital_returned`: "Friends and family: LPs have their $1,000,000 of paid-in capital back" |
| 5,800,000.00 | 5800000 | `capital_returned`: "Anchor: LPs have their $4,320,000 of paid-in capital back" |
| 6,600,000.00 | 6600000 | `capital_returned`: "Fund terms: LPs have their $5,800,000 of paid-in capital back" |

## This distribution

| X | Tags | LPs, capital | LPs, carry tier | LPs | GP carry | GP |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 5,000,000.00 | listed, breakpoint | 5,000,000.00 | 0.00 | 5,000,000.00 | 0.00 | 0.00 |
| 5,800,000.00 | listed, breakpoint | 5,720,000.00 | 80,000.00 | 5,800,000.00 | 0.00 | 0.00 |
| 6,600,000.00 | listed, breakpoint | 6,120,000.00 | 432,000.00 | 6,552,000.00 | 48,000.00 | 48,000.00 |
| 10,000,000.00 | listed | 6,120,000.00 | 3,288,000.00 | 9,408,000.00 | 592,000.00 | 592,000.00 |

**By account,** what its LPs and the GP get from X:

| X | Tags | Fund terms, LPs | Fund terms, GP | Anchor, LPs | Anchor, GP | F&F, LPs | F&F, GP |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 5,000,000.00 | listed, breakpoint | 2,500,000.00 | 0.00 | 2,000,000.00 | 0.00 | 500,000.00 | 0.00 |
| 5,800,000.00 | listed, breakpoint | 2,900,000.00 | 0.00 | 2,320,000.00 | 0.00 | 580,000.00 | 0.00 |
| 6,600,000.00 | listed, breakpoint | 3,300,000.00 | 0.00 | 2,592,000.00 | 48,000.00 | 660,000.00 | 0.00 |
| 10,000,000.00 | listed | 4,660,000.00 | 340,000.00 | 3,748,000.00 | 252,000.00 | 1,000,000.00 | 0.00 |

- **At $6,600,000:** the fund's terms get $3,300,000, all capital. Anchor gets $2,640,000: $2,320,000 of capital, then $320,000 at 85/15, $48,000 to the GP. Friends and family get $660,000, all to its LPs.
- **At $10,000,000:** the fund's terms get $5,000,000: $3,300,000 of capital, then $1,700,000 at 80/20, $340,000 to the GP. Anchor gets $4,000,000: $2,320,000, then $1,680,000 at 85/15, $252,000 to the GP. Friends and family get $1,000,000. The GP has $592,000.

## The fund to date

The earlier $5,000,000 was all capital.

| X | Tags | LPs, capital | LPs, carry tier | LPs | GP carry | GP |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 5,000,000.00 | 0.00 | 5,000,000.00 | 0.00 | 0.00 |
| 5,000,000.00 | listed, breakpoint | 10,000,000.00 | 0.00 | 10,000,000.00 | 0.00 | 0.00 |
| 5,800,000.00 | listed, breakpoint | 10,720,000.00 | 80,000.00 | 10,800,000.00 | 0.00 | 0.00 |
| 6,600,000.00 | listed, breakpoint | 11,120,000.00 | 432,000.00 | 11,552,000.00 | 48,000.00 | 48,000.00 |
| 10,000,000.00 | listed | 11,120,000.00 | 3,288,000.00 | 14,408,000.00 | 592,000.00 | 592,000.00 |

## Each LP (F20, F23)

Each account has one LP, so each LP gets its account's amounts.

| X | Tags | Alder, this distribution | Alder, to date | Cedar, this distribution | Cedar, to date | Dogwood, this distribution | Dogwood, to date |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 2,500,000.00 | 0.00 | 500,000.00 | 0.00 | 2,000,000.00 |
| 5,000,000.00 | listed, breakpoint | 2,500,000.00 | 5,000,000.00 | 500,000.00 | 1,000,000.00 | 2,000,000.00 | 4,000,000.00 |
| 5,800,000.00 | listed, breakpoint | 2,900,000.00 | 5,400,000.00 | 580,000.00 | 1,080,000.00 | 2,320,000.00 | 4,320,000.00 |
| 6,600,000.00 | listed, breakpoint | 3,300,000.00 | 5,800,000.00 | 660,000.00 | 1,160,000.00 | 2,592,000.00 | 4,592,000.00 |
| 10,000,000.00 | listed | 4,660,000.00 | 7,160,000.00 | 1,000,000.00 | 1,500,000.00 | 3,748,000.00 | 5,748,000.00 |

## The equalization at Dogwood's close (F25, F29)

**The investment call before the close.** On 2022-02-01 only Alder and Cedar were in, $12,000,000 of commitments, so they paid its $4,000,000 as 10/12 and 2/12: $3,333,333.33 and $666,666.67. At Dogwood's close it rebalances among all three by commitment, 0.5, 0.1 and 0.4: $2,000,000, $400,000 and $1,600,000.
- **Dogwood pays in $1,600,000.** Alder gets back 3,333,333.33 − 2,000,000 = 4,000,000/3 = **$1,333,333.33**, and Cedar 666,666.67 − 400,000 = 800,000/3 = **$266,666.67**.
- **Interest:** 2022-02-01 to 2022-08-15 is 195 days (27 + 31 + 30 + 31 + 30 + 31 + 15). Dogwood pays 8% on $1,600,000 for 195 days: 1,600,000 × 0.08 × 195 / 365 = 4,992,000/73 = **$68,383.56**. Alder receives 8% on what it gets back, for the same days, 4,160,000/73 = **$56,986.30**, and Cedar 832,000/73 = **$11,397.26**: together what Dogwood paid.

**The fee calls before the close aren't rebalanced (F29).** Three were made before 2022-08-15: on 2022-01-01, 2022-04-01 and 2022-07-01. Alder paid its $50,000 of each, and Cedar owes none. Dogwood owes its own $20,000 of each, as if in from the start: **$60,000 of back fees**, paid at its close to the manager, with no interest. That's the whole of its Q3 fee, though it joins halfway through the quarter (F30's defaults). Alder and Cedar get nothing back for fees.

**The 2023-03-01 call and every fee call from 2022-10-01** came after the close, so all three paid them as they were made.

| LP | Capital paid in at its close | Capital got back | Interest paid | Interest received | Back fees |
|---|---:|---:|---:|---:|---:|
| Alder Endowment | 0.00 | 1,333,333.33 | 0.00 | 56,986.30 | 0.00 |
| Cedar Holdings | 0.00 | 266,666.67 | 0.00 | 11,397.26 | 0.00 |
| Dogwood Pension (joins) | 1,600,000.00 | 0.00 | 68,383.56 | 0.00 | 60,000.00 |

One close, so each LP's equalization over all of them is the same row.

**A check on paid-in.** Dogwood's paid-in is $4,320,000: $1,600,000 at its close, $2,400,000 of the 2023 call (0.4 of $6,000,000), and $320,000 of fees, $60,000 of them back fees and $260,000 for the 13 quarters from 2022-10-01, paid as they were made. Alder's is $5,800,000: $3,333,333.33 paid in 2022, less $1,333,333.33 back, plus $3,000,000 in 2023 and $800,000 of fees.
