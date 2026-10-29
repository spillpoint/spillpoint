# Fund case 36, deal by deal with classes, a later close and a fee schedule: derivation

Deal by deal (F35) with three accounts (F23), a later close (F25) and fees from a schedule (F30). Each account has its own due before carry: its part of the cost realized, by commitment, and its own fees times the share of the fund's cost made that's been realized (F35). X sells half of an investment, so it doesn't realize everything; the NAV point does.

- **The terms:** 20% carry, no pref, deal by deal, a 1% GP commitment (fee-free, paying its share of expenses), and an 8% equalization rate.
- **The schedule:** from 2021-01-01, quarterly, at 2% a year. No `commitments`: the LPs are listed.
- **The classes:** Anchor, at a 1% fee and 15% carry; Friends and family, at no fee and no carry.
- **The LPs:** Alder Endowment ($10,000,000) on the fund's terms; Birch Family Office ($6,000,000) in Anchor, with a close of 2021-07-15; Cedar Holdings ($4,000,000) in Friends and family. $20,000,000 in all.
- **Investment calls:** $8,000,000 on 2021-01-05 and $4,000,000 on 2022-01-05, $12,000,000 in all.
- **The investments:** Ivy Analytics, $4,000,000 on 2021-02-01; Juniper Health, $2,800,000 on 2021-03-01; Kapok Robotics, $5,200,000 on 2022-02-01. $12,000,000 in all, every dollar called for investments.
- **An exit:** $8,000,000 from Ivy Analytics on 2023-03-31, all of it. **A write-off:** Juniper Health on 2024-03-31.
- **X** comes from Kapok Robotics and sells half of it. **D** is `as_of`, 2024-09-30. X isn't final; the NAV is $15,000,000.

The fund's first call is the schedule's, on 2021-01-01 (F30). Birch's close is after it, so Birch joins at a later close.

**The checks against the calls (F37):** $4,000,000 made on $8,000,000 called by 2021-02-01; $6,800,000 on $8,000,000 by 2021-03-01; $12,000,000 on $12,000,000 by 2022-02-01.

## The fee calls (F30)

Every quarter from 2021-01-01 is whole and at 2%, so each fee factor is 2% / 4 = 0.005. The class factors are 1 for Alder, 1% / 2% = 1/2 for Birch's Anchor class and 0 for Cedar's. Each quarter Alder's fee is $10,000,000 × 0.005 = **$50,000**, Birch's $6,000,000 × 1/2 × 0.005 = **$15,000** and Cedar's **$0**: a call of **$65,000**, the GP commitment being fee-free. Fifteen quarters, from 2021-01-01 to the one starting 2024-07-01, D's.

| Date | Covers | Call | Alder | Birch | Cedar |
|---|---|---:|---:|---:|---:|
| 2021-01-01 | 2021-01-01 to 2021-03-31 | 65,000.00 | 50,000.00 | 15,000.00 | 0.00 |
| 2021-04-01 | 2021-04-01 to 2021-06-30 | 65,000.00 | 50,000.00 | 15,000.00 | 0.00 |
| 2021-07-01 | 2021-07-01 to 2021-09-30 | 65,000.00 | 50,000.00 | 15,000.00 | 0.00 |
| 2021-10-01 | 2021-10-01 to 2021-12-31 | 65,000.00 | 50,000.00 | 15,000.00 | 0.00 |
| 2022-01-01 | 2022-01-01 to 2022-03-31 | 65,000.00 | 50,000.00 | 15,000.00 | 0.00 |
| 2022-04-01 | 2022-04-01 to 2022-06-30 | 65,000.00 | 50,000.00 | 15,000.00 | 0.00 |
| 2022-07-01 | 2022-07-01 to 2022-09-30 | 65,000.00 | 50,000.00 | 15,000.00 | 0.00 |
| 2022-10-01 | 2022-10-01 to 2022-12-31 | 65,000.00 | 50,000.00 | 15,000.00 | 0.00 |
| 2023-01-01 | 2023-01-01 to 2023-03-31 | 65,000.00 | 50,000.00 | 15,000.00 | 0.00 |
| 2023-04-01 | 2023-04-01 to 2023-06-30 | 65,000.00 | 50,000.00 | 15,000.00 | 0.00 |
| 2023-07-01 | 2023-07-01 to 2023-09-30 | 65,000.00 | 50,000.00 | 15,000.00 | 0.00 |
| 2023-10-01 | 2023-10-01 to 2023-12-31 | 65,000.00 | 50,000.00 | 15,000.00 | 0.00 |
| 2024-01-01 | 2024-01-01 to 2024-03-31 | 65,000.00 | 50,000.00 | 15,000.00 | 0.00 |
| 2024-04-01 | 2024-04-01 to 2024-06-30 | 65,000.00 | 50,000.00 | 15,000.00 | 0.00 |
| 2024-07-01 | 2024-07-01 to 2024-09-30 | 65,000.00 | 50,000.00 | 15,000.00 | 0.00 |
| **All** |  | **975,000.00** | 750,000.00 | 225,000.00 | 0.00 |

## The accounts (F23)

Each account's share of every distribution and investment call is its commitment over $20,000,000; its share of each fee call is its fee weight over all of them: 10,000,000, 3,000,000 and 0, out of 13,000,000.

| Account | LP | Commitment | Share | Share of fee calls | Carry | Paid in |
|---|---|---:|---:|---:|---|---:|
| Fund terms | Alder Endowment | 10,000,000 | 0.5 | 10/13 | 20% | 6,690,000.00 |
| Anchor | Birch Family Office | 6,000,000 | 0.3 | 3/13 | 15% | 3,789,000.00 |
| Friends and family | Cedar Holdings | 4,000,000 | 0.2 | 0 | 0% | 2,376,000.00 |

- **Fund terms:** half the LPs' $11,880,000 of investment calls (99% of $12,000,000), $5,940,000, and 15 × $50,000 of fees: **$6,690,000**.
- **Anchor:** 0.3 of it, $3,564,000, and 15 × $15,000: **$3,789,000**, Birch's three quarters of back fees among them (F29).
- **Friends and family:** 0.2 of it, **$2,376,000**, and no fees.

$12,855,000 in all.

## The investments (F33, F36)

Once, at D, before X: Ivy's $4,000,000 exited, Juniper's $2,800,000 written off, Kapok's $5,200,000 still held.

| Investment | Cost made | Cost realized | Written off | Proceeds |
|---|---:|---:|---:|---:|
| Ivy Analytics | 4,000,000.00 | 4,000,000.00 | 0.00 | 8,000,000.00 |
| Juniper Health | 2,800,000.00 | 2,800,000.00 | 2,800,000.00 | 0.00 |
| Kapok Robotics | 5,200,000.00 | 0.00 | 0.00 | 0.00 |

**The realized multiple** (F36, FA59), proceeds over the cost realized: Ivy Analytics 8,000,000 / 4,000,000 = **2x**; Juniper Health, written off with none, **0x**; Kapok Robotics, nothing realized, **none** (null).

## Ivy's exit: what's due by class (F35)

On 2023-03-31 the cost made is all $12,000,000, and the exit realizes Ivy's $4,000,000: **a third**. The LPs' part of it is 0.99 × $4,000,000 = $3,960,000, divided by commitment.

The fees to date are the nine quarterly calls from 2021-01-01 to 2023-01-01, each account's own: $450,000 for the fund's terms, $135,000 for Anchor and none for Friends and family. There are no expense calls.

| Account | Cost due | Fees to date | Their share due | Due | Its part of the $7,920,000 | Tier 1 | Carry tier, LPs | Carry |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Fund terms | 1,980,000.00 | 450,000.00 | 150,000.00 | 2,130,000.00 | 3,960,000.00 | 2,130,000.00 | 1,464,000.00 | 366,000.00 |
| Anchor | 1,188,000.00 | 135,000.00 | 45,000.00 | 1,233,000.00 | 2,376,000.00 | 1,233,000.00 | 971,550.00 | 171,450.00 |
| Friends and family | 792,000.00 | 0.00 | 0.00 | 792,000.00 | 1,584,000.00 | 792,000.00 | 792,000.00 | 0.00 |
| **All** | 3,960,000.00 | 585,000.00 | 195,000.00 | 4,155,000.00 | 7,920,000.00 | 4,155,000.00 | 3,227,550.00 | 537,450.00 |

The $8,000,000 is $80,000 to the GP commitment and $7,920,000 to the accounts by commitment. Each gets its due first, then the rest at its own carry: 80/20 on the fund terms' $1,830,000, 85/15 on Anchor's $1,143,000, and all of Friends and family's $792,000 to its LPs. **$537,450 of carry.**

## Juniper's write-off

On 2024-03-31 it realizes Juniper's $2,800,000, with no proceeds: $6,800,000 of $12,000,000 realized.

## X: what's due by class (F33, F35)

X sells half of what's left of Kapok, $2,600,000, so with X the cost realized is **$9,400,000** of the $12,000,000 made: a share of 47/60. The fees to D are all fifteen calls: $750,000, $225,000 and none.

| Account | Cost due | Fees to D | Their share due | Due | Back | X's tier 1 | Its part of X | Tier 1 ends at X |
|---|---:|---:|---:|---:|---:|---:|---|---:|
| Fund terms | 4,653,000.00 | 750,000.00 | 587,500.00 | 5,240,500.00 | 2,130,000.00 | 3,110,500.00 | 0.495 | 6,283,838.38 |
| Anchor | 2,791,800.00 | 225,000.00 | 176,250.00 | 2,968,050.00 | 1,233,000.00 | 1,735,050.00 | 0.297 | 5,841,919.19 |
| Friends and family | 1,861,200.00 | 0.00 | 0.00 | 1,861,200.00 | 792,000.00 | 1,069,200.00 | 0.198 | 5,400,000.00 |

Each account's part of X is 0.99 times its share (F23). Its tier 1 ends where that part reaches X's tier 1:
- **Friends and family:** 1,069,200 / 0.198 = **$5,400,000**.
- **Anchor:** 1,735,050 / 0.297 = 578,350,000/99 = **$5,841,919.19**.
- **Fund terms:** 3,110,500 / 0.495 = 622,100,000/99 = **$6,283,838.38**.

**At the NAV point,** final by definition, everything left of every investment is realized, all of Kapok: $12,000,000 of $12,000,000. What's due is then each account's paid-in: $6,690,000, $3,789,000 and $2,376,000, $12,855,000 (FA58). On the x-axis it's $10,069,750.

| X | Tags | Cost made | Cost realized | Cost | Fees and expenses | Due |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 12,000,000.00 | 9,400,000.00 | 9,306,000.00 | 763,750.00 | 10,069,750.00 |
| 5,400,000.00 | listed, breakpoint | 12,000,000.00 | 9,400,000.00 | 9,306,000.00 | 763,750.00 | 10,069,750.00 |
| 5,841,919.19 | breakpoint | 12,000,000.00 | 9,400,000.00 | 9,306,000.00 | 763,750.00 | 10,069,750.00 |
| 6,000,000.00 | listed | 12,000,000.00 | 9,400,000.00 | 9,306,000.00 | 763,750.00 | 10,069,750.00 |
| 6,283,838.38 | listed, breakpoint | 12,000,000.00 | 9,400,000.00 | 9,306,000.00 | 763,750.00 | 10,069,750.00 |
| 15,000,000.00 | listed, nav | 12,000,000.00 | 12,000,000.00 | 11,880,000.00 | 975,000.00 | 12,855,000.00 |

| X | Tags | Fund terms, due | Anchor, due | Friends and family, due |
|---:|---|---:|---:|---:|
| 0.00 | listed | 5,240,500.00 | 2,968,050.00 | 1,861,200.00 |
| 5,400,000.00 | listed, breakpoint | 5,240,500.00 | 2,968,050.00 | 1,861,200.00 |
| 5,841,919.19 | breakpoint | 5,240,500.00 | 2,968,050.00 | 1,861,200.00 |
| 6,000,000.00 | listed | 5,240,500.00 | 2,968,050.00 | 1,861,200.00 |
| 6,283,838.38 | listed, breakpoint | 5,240,500.00 | 2,968,050.00 | 1,861,200.00 |
| 15,000,000.00 | listed, nav | 6,690,000.00 | 3,789,000.00 | 2,376,000.00 |

## Breakpoints

Three accounts, so each reason starts with its account's name (F27), and gives its own due as its amount (FA57).

| X | Exact | Reasons |
|---:|---|---|
| 5,400,000.00 | 5400000 | `capital_returned`: "Friends and family: LPs have their $1,861,200 back for the investments exited or written off, fees and expenses included" |
| 5,841,919.19 | 578350000/99 | `capital_returned`: "Anchor: LPs have their $2,968,050 back for the investments exited or written off, fees and expenses included" |
| 6,283,838.38 | 622100000/99 | `capital_returned`: "Fund terms: LPs have their $5,240,500 back for the investments exited or written off, fees and expenses included" |

## This distribution

| X | Tags | GP commitment | LPs, capital | LPs, carry tier | LPs | GP carry |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 5,400,000.00 | listed, breakpoint | 54,000.00 | 5,346,000.00 | 0.00 | 5,346,000.00 | 0.00 |
| 5,841,919.19 | breakpoint | 58,419.19 | 5,696,000.00 | 87,500.00 | 5,783,500.00 | 0.00 |
| 6,000,000.00 | listed | 60,000.00 | 5,774,250.00 | 158,707.50 | 5,932,957.50 | 7,042.50 |
| 6,283,838.38 | listed, breakpoint | 62,838.38 | 5,914,750.00 | 286,562.50 | 6,201,312.50 | 19,687.50 |
| 15,000,000.00 | listed, nav | 150,000.00 | 8,700,000.00 | 5,292,150.00 | 13,992,150.00 | 857,850.00 |

**By account,** what its LPs get as capital and from the carry tier, and the GP's carry:

| X | Tags | Fund terms, capital | Fund terms, carry tier | Fund terms, GP | Anchor, capital | Anchor, carry tier | Anchor, GP | Friends and family, capital | Friends and family, carry tier | Friends and family, GP |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 5,400,000.00 | listed, breakpoint | 2,673,000.00 | 0.00 | 0.00 | 1,603,800.00 | 0.00 | 0.00 | 1,069,200.00 | 0.00 | 0.00 |
| 5,841,919.19 | breakpoint | 2,891,750.00 | 0.00 | 0.00 | 1,735,050.00 | 0.00 | 0.00 | 1,069,200.00 | 87,500.00 | 0.00 |
| 6,000,000.00 | listed | 2,970,000.00 | 0.00 | 0.00 | 1,735,050.00 | 39,907.50 | 7,042.50 | 1,069,200.00 | 118,800.00 | 0.00 |
| 6,283,838.38 | listed, breakpoint | 3,110,500.00 | 0.00 | 0.00 | 1,735,050.00 | 111,562.50 | 19,687.50 | 1,069,200.00 | 175,000.00 | 0.00 |
| 15,000,000.00 | listed, nav | 4,560,000.00 | 2,292,000.00 | 573,000.00 | 2,556,000.00 | 1,614,150.00 | 284,850.00 | 1,584,000.00 | 1,386,000.00 | 0.00 |

- **At $6,000,000:** $60,000 to the GP commitment. The fund's terms get $2,970,000, all tier 1. Anchor gets $1,782,000: $1,735,050 of tier 1, then $46,950 at 85/15, $7,042.50 of carry. Friends and family get $1,188,000: $1,069,200 of tier 1 and $118,800 more, all to its LPs.
- **At $15,000,000, the NAV point:** the fund's terms get $7,425,000: $4,560,000 of tier 1 (its $6,690,000 due less $2,130,000 back), then $2,865,000 at 80/20, $573,000. Anchor gets $4,455,000: $2,556,000, then $1,899,000 at 85/15, $284,850. Friends and family get $2,970,000: $1,584,000, then $1,386,000 to its LPs. **$857,850 of carry.**

## The fund to date

| X | Tags | GP commitment | LPs, capital | LPs, carry tier | LPs | GP carry |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 80,000.00 | 4,155,000.00 | 3,227,550.00 | 7,382,550.00 | 537,450.00 |
| 5,400,000.00 | listed, breakpoint | 134,000.00 | 9,501,000.00 | 3,227,550.00 | 12,728,550.00 | 537,450.00 |
| 5,841,919.19 | breakpoint | 138,419.19 | 9,851,000.00 | 3,315,050.00 | 13,166,050.00 | 537,450.00 |
| 6,000,000.00 | listed | 140,000.00 | 9,929,250.00 | 3,386,257.50 | 13,315,507.50 | 544,492.50 |
| 6,283,838.38 | listed, breakpoint | 142,838.38 | 10,069,750.00 | 3,514,112.50 | 13,583,862.50 | 557,137.50 |
| 15,000,000.00 | listed, nav | 230,000.00 | 12,855,000.00 | 8,519,700.00 | 21,374,700.00 | 1,395,300.00 |

## The NAV point: the clawback by account (F24, F35)

Each account settles on its own, on its own totals with all its paid-in as capital:
- **Fund terms:** $3,960,000 + $7,425,000 through the tiers, less $6,690,000, leaves $4,695,000; 20% is **$939,000**, the $366,000 + $573,000 paid.
- **Anchor:** $2,376,000 + $4,455,000, less $3,789,000, leaves $3,042,000; 15% is **$456,300**, the $171,450 + $284,850 paid.
- **Friends and family:** no carry, none paid.

Nothing is owed: everything called for investments was invested, so at the end what's due is all paid-in, as on the whole fund.

| X | Tags | Carry paid | Entitlement | Owed |
|---:|---|---:|---:|---:|
| 15,000,000.00 | listed, nav | 1,395,300.00 | 1,395,300.00 | 0.00 |

## Each LP (F20, F23)

Each account has one LP, so each LP gets its account's amounts.

| X | Tags | Alder Endowment, this distribution | Alder Endowment, to date | Birch Family Office, this distribution | Birch Family Office, to date | Cedar Holdings, this distribution | Cedar Holdings, to date |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 3,594,000.00 | 0.00 | 2,204,550.00 | 0.00 | 1,584,000.00 |
| 5,400,000.00 | listed, breakpoint | 2,673,000.00 | 6,267,000.00 | 1,603,800.00 | 3,808,350.00 | 1,069,200.00 | 2,653,200.00 |
| 5,841,919.19 | breakpoint | 2,891,750.00 | 6,485,750.00 | 1,735,050.00 | 3,939,600.00 | 1,156,700.00 | 2,740,700.00 |
| 6,000,000.00 | listed | 2,970,000.00 | 6,564,000.00 | 1,774,957.50 | 3,979,507.50 | 1,188,000.00 | 2,772,000.00 |
| 6,283,838.38 | listed, breakpoint | 3,110,500.00 | 6,704,500.00 | 1,846,612.50 | 4,051,162.50 | 1,244,200.00 | 2,828,200.00 |
| 15,000,000.00 | listed, nav | 6,852,000.00 | 10,446,000.00 | 4,170,150.00 | 6,374,700.00 | 2,970,000.00 | 4,554,000.00 |

## The equalization at Birch's close (F25, F29)

**The investment call before the close.** On 2021-01-05 Alder and Cedar were in, $14,000,000 of commitments, so they paid the LPs' $7,920,000 as 10/14 and 4/14: $5,657,142.86 and $2,262,857.14. At Birch's close it rebalances among all three by commitment, 1/2, 3/10 and 1/5: $3,960,000, $2,376,000 and $1,584,000.
- **Birch pays in $2,376,000.** Alder gets back 5,657,142.86 − 3,960,000 = 11,880,000/7 = **$1,697,142.86**, and Cedar 2,262,857.14 − 1,584,000 = 4,752,000/7 = **$678,857.14**.
- **Interest:** 2021-01-05 to 2021-07-15 is 191 days (26 + 28 + 31 + 30 + 31 + 30 + 15). Birch pays 8% on $2,376,000 for 191 days: 2,376,000 × 0.08 × 191 / 365 = **$99,466.52**. Alder receives 8% on what it gets back for the same days, **$71,047.51**, and Cedar **$28,419.01**: together what Birch paid.

**The fee calls before the close aren't rebalanced (F29).** Three were made before 2021-07-15, on 2021-01-01, 2021-04-01 and 2021-07-01. Birch owes its own $15,000 of each, as if in from the start: **$45,000 of back fees**, paid at its close to the manager, with no interest.

**The 2022-01-05 call** came after the close, so all three paid it as it was made.

| LP | Capital paid in at its close | Capital got back | Interest paid | Interest received | Back fees |
|---|---:|---:|---:|---:|---:|
| Alder Endowment | 0.00 | 1,697,142.86 | 0.00 | 71,047.51 | 0.00 |
| Birch Family Office (joins) | 2,376,000.00 | 0.00 | 99,466.52 | 0.00 | 45,000.00 |
| Cedar Holdings | 0.00 | 678,857.14 | 0.00 | 28,419.01 | 0.00 |

One close, so each LP's equalization over all of them is the same row.

**Deal by deal changes nothing here:** the equalization is outside the waterfall (F25), and what's due counts Birch as in from the start, as the waterfall does.
