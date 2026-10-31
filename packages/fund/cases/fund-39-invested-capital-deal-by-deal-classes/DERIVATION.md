# Fund case 39, fees on invested capital deal by deal, with classes and a later close: derivation

Deal by deal (F35) with three accounts (F23), a later close (F25), and fees from a schedule that moves from commitments to net invested capital inside a half-year (F38, F39). On invested capital the LPs' fee is the rate on their part of each day's net invested capital, 98% of it with a 2% GP commitment aside, times their fee weights over their commitments, 13/20: so each LP pays the rate on its share of invested capital, by commitment, times its class factor. The fees are in what's due before carry, by the share of the cost made that's been realized (F35).

- **The terms:** 20% carry, no pref, deal by deal, a 2% GP commitment that pays its share of fees (F3), and an 8% equalization rate.
- **The schedule:** from 2021-01-01, half-yearly: 2% a year on commitments, then 1.75% a year on net invested capital from 2023-04-01, inside the first half of 2023. No `commitments`: the LPs are listed.
- **The classes:** Anchor, at a 1% fee and 15% carry; Friends and family, at no fee and no carry.
- **The LPs:** Alder Endowment ($10,000,000) on the fund's terms; Birch Family Office ($6,000,000) in Anchor, closing on 2021-04-15; Cedar Holdings ($4,000,000) in Friends and family. $20,000,000 in all.
- **Investment calls:** $6,000,000 on 2021-01-10 and $5,000,000 on 2022-01-10, $11,000,000 in all.
- **The investments:** Ivy Analytics, $3,000,000 on 2021-02-01; Juniper Health, $3,000,000 on 2021-05-01; Kapok Robotics, $5,000,000 on 2022-02-01. $11,000,000, every dollar called for investments.
- **A half sale:** $9,000,000 from Ivy Analytics on 2023-05-15, a share of 0.5. **A write-off:** Juniper Health on 2024-03-01.
- **X** comes from Kapok Robotics and sells 40% of it. **D** is `as_of`, 2024-09-30. X isn't final; the NAV is $14,000,000.

The fund's first call is the schedule's, on 2021-01-01 (F30, F39). Birch's close is after it, so Birch joins at a later close.

**The checks against the calls (F37):** $3,000,000 made on $6,000,000 called by 2021-02-01; $6,000,000 on $6,000,000 by 2021-05-01; $11,000,000 on $11,000,000 by 2022-02-01.

## Net invested capital (F38)

| From | Event | Net invested capital |
|---|---|---:|
| 2021-02-01 | Ivy Analytics' check | 3,000,000 |
| 2021-05-01 | Juniper Health's check | 6,000,000 |
| 2022-02-01 | Kapok Robotics' check | 11,000,000 |
| 2023-05-15 | Ivy Analytics' half sale realizes $1,500,000 | 9,500,000 |
| 2024-03-01 | Juniper Health written off, $3,000,000 | 6,500,000 |

From the step's date, 2023-04-01: $11,000,000 to 2023-05-14, $9,500,000 from Ivy's half sale on 2023-05-15, and $6,500,000 from Juniper's write-off on 2024-03-01. Nothing moves it after that: X isn't in it (F39).

## The fee calls (F30, F39)

**The fee weights** (F22): Alder's commitment, $10,000,000; Birch's times its class factor, 1% / 2% = 1/2, so $3,000,000; Cedar's 0. **$13,000,000** of fee weights on $20,000,000 of commitments: 13/20.

- **A half-year on commitments** at 2% is 2% × $13,000,000 / 2 = **$130,000** of LPs' fees: $100,000 from Alder, $30,000 from Birch, none from Cedar.
- **A day on invested capital** is 1.75% × 98% × 13/20 of that day's net invested capital, over 2 × the half-year's days (F39).
- **The first half of 2023,** 181 days: 90 on commitments at 2%, then 44 on invested capital at $11,000,000 and 47 at $9,500,000 from Ivy's half sale. $64,640.88 on commitments and $28,654.00 on invested capital: **$93,294.89**.
- **The first half of 2024,** 182 days, a leap year: 60 at $9,500,000, then 122 at $6,500,000 from Juniper's write-off.
- **The second half of 2024, D's:** called in advance on 2024-07-01, every day at $6,500,000, the days after D at D's (F39). X doesn't move it.

**Each LP's fee** is its fee weight over $13,000,000 times the LPs' fee. So on invested capital Alder pays 1.75% × 98% × 1/2 of each day's net invested capital, its share by commitment at a class factor of 1; Birch 1.75% × 98% × 3/10 × 1/2 of it, its share at half the rate; and Cedar none. **The call** is the LPs' fee over 0.98, since the GP commitment pays its 2% of it (F3, F30).

| Date | Covers | Working, the LPs' fee | LPs' fee | Call | GP commitment | Alder | Birch | Cedar |
|---|---|---|---:|---:|---:|---:|---:|---:|
| 2021-01-01 | 2021-01-01 to 2021-06-30 | 2% × 13,000,000 / 2 | 130,000.00 | 132,653.06 | 2,653.06 | 100,000.00 | 30,000.00 | 0.00 |
| 2021-07-01 | 2021-07-01 to 2021-12-31 | 2% × 13,000,000 / 2 | 130,000.00 | 132,653.06 | 2,653.06 | 100,000.00 | 30,000.00 | 0.00 |
| 2022-01-01 | 2022-01-01 to 2022-06-30 | 2% × 13,000,000 / 2 | 130,000.00 | 132,653.06 | 2,653.06 | 100,000.00 | 30,000.00 | 0.00 |
| 2022-07-01 | 2022-07-01 to 2022-12-31 | 2% × 13,000,000 / 2 | 130,000.00 | 132,653.06 | 2,653.06 | 100,000.00 | 30,000.00 | 0.00 |
| 2023-01-01 | 2023-01-01 to 2023-06-30 | (2% × 13,000,000 × 90 + 1.75% × 98% × 13/20 × (11,000,000 × 44 + 9,500,000 × 47)) / (2 × 181) | 93,294.89 | 95,198.86 | 1,903.98 | 71,765.30 | 21,529.59 | 0.00 |
| 2023-07-01 | 2023-07-01 to 2023-12-31 | 1.75% × 98% × 13/20 × 9,500,000 / 2 | 52,950.63 | 54,031.25 | 1,080.63 | 40,731.25 | 12,219.38 | 0.00 |
| 2024-01-01 | 2024-01-01 to 2024-06-30 | 1.75% × 98% × 13/20 × (9,500,000 × 60 + 6,500,000 × 122) / (2 × 182) | 41,741.88 | 42,593.75 | 851.88 | 32,109.13 | 9,632.74 | 0.00 |
| 2024-07-01 | 2024-07-01 to 2024-12-31 | 1.75% × 98% × 13/20 × 6,500,000 / 2 | 36,229.38 | 36,968.75 | 739.38 | 27,868.75 | 8,360.63 | 0.00 |
| **All** |  |  | **744,216.76** | 759,404.86 | 15,188.10 | 572,474.43 | 171,742.33 | 0.00 |

## The accounts (F23)

Each account's share of every distribution and investment call is its commitment over $20,000,000; its share of each fee call is its fee weight over $13,000,000.

| Account | LP | Commitment | Share | Fee weight | Share of fee calls | Carry | Paid in |
|---|---|---:|---:|---:|---:|---|---:|
| Fund terms | Alder Endowment | 10,000,000 | 0.5 | 10,000,000 | 10/13 | 20% | 5,962,474.43 |
| Anchor | Birch Family Office | 6,000,000 | 0.3 | 3,000,000 | 3/13 | 15% | 3,405,742.33 |
| Friends and family | Cedar Holdings | 4,000,000 | 0.2 | 0 | 0 | 0% | 2,156,000.00 |

- **Fund terms:** half the LPs' $10,780,000 of investment calls (98% of $11,000,000), $5,390,000, and 10/13 of the LPs' $744,216.76 of fees: **$5,962,474.43**.
- **Anchor:** 0.3 of it, $3,234,000, and 3/13 of the fees: **$3,405,742.33**, Birch's $30,000 of back fees among them (F29).
- **Friends and family:** 0.2 of it, **$2,156,000**, and no fees.

$11,524,216.76 in all.

## The investments (F33, F36)

Once, at D, before X: half of Ivy's $3,000,000 sold, Juniper's $3,000,000 written off, Kapok's $5,000,000 still held.

| Investment | Cost made | Cost realized | Written off | Proceeds |
|---|---:|---:|---:|---:|
| Ivy Analytics | 3,000,000.00 | 1,500,000.00 | 0.00 | 9,000,000.00 |
| Juniper Health | 3,000,000.00 | 3,000,000.00 | 3,000,000.00 | 0.00 |
| Kapok Robotics | 5,000,000.00 | 0.00 | 0.00 | 0.00 |

**The realized multiple** (F36, FA59), proceeds over the cost realized: Ivy Analytics 9,000,000 / 1,500,000 = **6x**; Juniper Health, written off with none, **0x**; Kapok Robotics, nothing realized, **none** (null).

## Ivy's half sale: what's due by class (F35)

On 2023-05-15 the cost made is all $11,000,000, and the sale realizes half of Ivy's $3,000,000, $1,500,000: **3/22** of the cost made. The LPs' part is 0.98 × $1,500,000 = $1,470,000, divided by commitment.

The fees to date are each account's own part of the five calls from 2021-01-01 to 2023-01-01, the last of them the half-year with the step: the LPs' $613,294.89, 10/13, 3/13 and none of it. There are no expense calls.

| Account | Cost due | Fees to date | Their share due | Due | Its part of the $8,820,000 | Tier 1 | Carry tier, LPs | Carry |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Fund terms | 735,000.00 | 471,765.30 | 64,331.63 | 799,331.63 | 4,410,000.00 | 799,331.63 | 2,888,534.69 | 722,133.67 |
| Anchor | 441,000.00 | 141,529.59 | 19,299.49 | 460,299.49 | 2,646,000.00 | 460,299.49 | 1,857,845.43 | 327,855.08 |
| Friends and family | 294,000.00 | 0.00 | 0.00 | 294,000.00 | 1,764,000.00 | 294,000.00 | 1,470,000.00 | 0.00 |
| **All** | 1,470,000.00 | 613,294.89 | 83,631.12 | 1,553,631.12 | 8,820,000.00 | 1,553,631.12 | 6,216,380.13 | **1,049,988.75** |

The $9,000,000 is $180,000 to the GP commitment and $8,820,000 to the accounts by commitment. Each gets its due first, then the rest at its own carry: 80/20 for the fund's terms, 85/15 for Anchor, and all of Friends and family's to its LPs. **$1,049,988.75 of carry.**

## Juniper's write-off

On 2024-03-01 it realizes Juniper's $3,000,000, with no proceeds: $4,500,000 of $11,000,000 realized. It moves no money, and lowers the fee from its date.

## X: what's due by class (F33, F35)

X sells 40% of what's left of Kapok, $2,000,000, so with X the cost realized is **$6,500,000** of the $11,000,000 made: a share of 13/22. The fees to D are each account's part of all eight calls.

| Account | Cost due | Fees to D | Their share due | Due | Back | X's tier 1 | Its part of X | Tier 1 ends at X |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Fund terms | 3,185,000.00 | 572,474.43 | 338,280.35 | 3,523,280.35 | 799,331.63 | 2,723,948.71 | 0.49 | 5,559,079.01 |
| Anchor | 1,911,000.00 | 171,742.33 | 101,484.10 | 2,012,484.10 | 460,299.49 | 1,552,184.61 | 0.294 | 5,279,539.50 |
| Friends and family | 1,274,000.00 | 0.00 | 0.00 | 1,274,000.00 | 294,000.00 | 980,000.00 | 0.196 | 5,000,000.00 |

Each account's part of X is 0.98 times its share (F23). Its tier 1 ends where that part reaches X's tier 1:
- **Friends and family:** 980,000 / 0.196 = **$5,000,000**.
- **Anchor:** 1,552,184.61 / 0.294 = 2060266378125/390236 = **$5,279,539.50**.
- **Fund terms:** 2,723,948.71 / 0.49 = 1084676378125/195118 = **$5,559,079.01**.

**At the NAV point,** final by definition, everything left of every investment is realized, all of Kapok: $11,000,000 of $11,000,000. What's due is then each account's paid-in, $11,524,216.76 in all (FA49, FA58).

| X | Tags | Cost made | Cost realized | Cost | Fees and expenses | Due |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 11,000,000.00 | 6,500,000.00 | 6,370,000.00 | 439,764.45 | 6,809,764.45 |
| 5,000,000.00 | listed, breakpoint | 11,000,000.00 | 6,500,000.00 | 6,370,000.00 | 439,764.45 | 6,809,764.45 |
| 5,279,539.50 | breakpoint | 11,000,000.00 | 6,500,000.00 | 6,370,000.00 | 439,764.45 | 6,809,764.45 |
| 5,400,000.00 | listed | 11,000,000.00 | 6,500,000.00 | 6,370,000.00 | 439,764.45 | 6,809,764.45 |
| 5,559,079.01 | breakpoint | 11,000,000.00 | 6,500,000.00 | 6,370,000.00 | 439,764.45 | 6,809,764.45 |
| 8,000,000.00 | listed | 11,000,000.00 | 6,500,000.00 | 6,370,000.00 | 439,764.45 | 6,809,764.45 |
| 14,000,000.00 | nav | 11,000,000.00 | 11,000,000.00 | 10,780,000.00 | 744,216.76 | 11,524,216.76 |

| X | Tags | Fund terms, due | Anchor, due | Friends and family, due |
|---:|---|---:|---:|---:|
| 0.00 | listed | 3,523,280.35 | 2,012,484.10 | 1,274,000.00 |
| 5,000,000.00 | listed, breakpoint | 3,523,280.35 | 2,012,484.10 | 1,274,000.00 |
| 5,279,539.50 | breakpoint | 3,523,280.35 | 2,012,484.10 | 1,274,000.00 |
| 5,400,000.00 | listed | 3,523,280.35 | 2,012,484.10 | 1,274,000.00 |
| 5,559,079.01 | breakpoint | 3,523,280.35 | 2,012,484.10 | 1,274,000.00 |
| 8,000,000.00 | listed | 3,523,280.35 | 2,012,484.10 | 1,274,000.00 |
| 14,000,000.00 | nav | 5,962,474.43 | 3,405,742.33 | 2,156,000.00 |

## Breakpoints

Three accounts, so each reason starts with its account's name (F27), and gives its own due as its amount (FA57).

| X | Exact | Reasons |
|---:|---|---|
| 5,000,000.00 | 5000000 | `capital_returned`: "Friends and family: LPs have their $1,274,000 back for the investments exited or written off, fees and expenses included" |
| 5,279,539.50 | 2060266378125/390236 | `capital_returned`: "Anchor: LPs have their $2,012,484.10 back for the investments exited or written off, fees and expenses included" |
| 5,559,079.01 | 1084676378125/195118 | `capital_returned`: "Fund terms: LPs have their $3,523,280.35 back for the investments exited or written off, fees and expenses included" |

## This distribution

| X | Tags | GP commitment | LPs, capital | LPs, carry tier | LPs | GP carry |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 5,000,000.00 | listed, breakpoint | 100,000.00 | 4,900,000.00 | 0.00 | 4,900,000.00 | 0.00 |
| 5,279,539.50 | breakpoint | 105,590.79 | 5,119,158.97 | 54,789.74 | 5,173,948.71 | 0.00 |
| 5,400,000.00 | listed | 108,000.00 | 5,178,184.61 | 108,503.08 | 5,286,687.69 | 5,312.31 |
| 5,559,079.01 | breakpoint | 111,181.58 | 5,256,133.33 | 179,436.41 | 5,435,569.74 | 12,327.69 |
| 8,000,000.00 | listed | 160,000.00 | 5,256,133.33 | 2,224,684.11 | 7,480,817.44 | 359,182.56 |
| 14,000,000.00 | nav | 280,000.00 | 9,970,585.64 | 3,234,459.35 | 13,205,044.99 | 514,955.01 |

**By account,** what its LPs get as capital and from the carry tier, and the GP's carry:

| X | Tags | Fund terms, capital | Fund terms, carry tier | Fund terms, GP | Anchor, capital | Anchor, carry tier | Anchor, GP | Friends and family, capital | Friends and family, carry tier | Friends and family, GP |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 5,000,000.00 | listed, breakpoint | 2,450,000.00 | 0.00 | 0.00 | 1,470,000.00 | 0.00 | 0.00 | 980,000.00 | 0.00 | 0.00 |
| 5,279,539.50 | breakpoint | 2,586,974.36 | 0.00 | 0.00 | 1,552,184.61 | 0.00 | 0.00 | 980,000.00 | 54,789.74 | 0.00 |
| 5,400,000.00 | listed | 2,646,000.00 | 0.00 | 0.00 | 1,552,184.61 | 30,103.08 | 5,312.31 | 980,000.00 | 78,400.00 | 0.00 |
| 5,559,079.01 | breakpoint | 2,723,948.71 | 0.00 | 0.00 | 1,552,184.61 | 69,856.92 | 12,327.69 | 980,000.00 | 109,579.49 | 0.00 |
| 8,000,000.00 | listed | 2,723,948.71 | 956,841.03 | 239,210.26 | 1,552,184.61 | 679,843.08 | 119,972.31 | 980,000.00 | 588,000.00 | 0.00 |
| 14,000,000.00 | nav | 5,163,142.80 | 1,357,485.76 | 339,371.44 | 2,945,442.84 | 994,973.59 | 175,583.57 | 1,862,000.00 | 882,000.00 | 0.00 |

**At $8,000,000:** $160,000 to the GP commitment, and each account its part:
- **Fund terms:** $3,920,000: $2,723,948.71 of tier 1, then $1,196,051.29 at its carry, **$239,210.26**.
- **Anchor:** $2,352,000: $1,552,184.61 of tier 1, then $799,815.39 at its carry, **$119,972.31**.
- **Friends and family:** $1,568,000: $980,000 of tier 1, then $588,000, all to its LPs.

## The fund to date

| X | Tags | GP commitment | LPs, capital | LPs, carry tier | LPs | GP carry |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 180,000.00 | 1,553,631.12 | 6,216,380.13 | 7,770,011.25 | 1,049,988.75 |
| 5,000,000.00 | listed, breakpoint | 280,000.00 | 6,453,631.12 | 6,216,380.13 | 12,670,011.25 | 1,049,988.75 |
| 5,279,539.50 | breakpoint | 285,590.79 | 6,672,790.09 | 6,271,169.87 | 12,943,959.96 | 1,049,988.75 |
| 5,400,000.00 | listed | 288,000.00 | 6,731,815.74 | 6,324,883.21 | 13,056,698.94 | 1,055,301.06 |
| 5,559,079.01 | breakpoint | 291,181.58 | 6,809,764.45 | 6,395,816.54 | 13,205,580.99 | 1,062,316.44 |
| 8,000,000.00 | listed | 340,000.00 | 6,809,764.45 | 8,441,064.24 | 15,250,828.68 | 1,409,171.32 |
| 14,000,000.00 | nav | 460,000.00 | 11,524,216.76 | 9,450,839.47 | 20,975,056.24 | 1,564,943.76 |

## The NAV point: the clawback by account (F24, F35)

Each account settles on its own, on its own totals with all its paid-in as capital:
- **Fund terms:** $11,270,000 through the tiers, less $5,962,474.43, leaves $5,307,525.57; its carry of that is **$1,061,505.11**.
- **Anchor:** $6,762,000 through the tiers, less $3,405,742.33, leaves $3,356,257.67; its carry of that is **$503,438.65**.
- **Friends and family:** $4,508,000 through the tiers, less $2,156,000, leaves $2,352,000: no carry.

Nothing is owed: every dollar called for investments was invested, so at the end what's due is all paid-in, as on the whole fund.

| X | Tags | Carry paid | Entitlement | Owed |
|---:|---|---:|---:|---:|
| 14,000,000.00 | nav | 1,564,943.76 | 1,564,943.76 | 0.00 |

## Each LP (F20, F23)

Each account has one LP, so each LP gets its account's amounts.

| X | Tags | Alder Endowment, this distribution | Alder Endowment, to date | Birch Family Office, this distribution | Birch Family Office, to date | Cedar Holdings, this distribution | Cedar Holdings, to date |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 3,687,866.33 | 0.00 | 2,318,144.92 | 0.00 | 1,764,000.00 |
| 5,000,000.00 | listed, breakpoint | 2,450,000.00 | 6,137,866.33 | 1,470,000.00 | 3,788,144.92 | 980,000.00 | 2,744,000.00 |
| 5,279,539.50 | breakpoint | 2,586,974.36 | 6,274,840.68 | 1,552,184.61 | 3,870,329.54 | 1,034,789.74 | 2,798,789.74 |
| 5,400,000.00 | listed | 2,646,000.00 | 6,333,866.33 | 1,582,287.69 | 3,900,432.62 | 1,058,400.00 | 2,822,400.00 |
| 5,559,079.01 | breakpoint | 2,723,948.71 | 6,411,815.04 | 1,622,041.54 | 3,940,186.46 | 1,089,579.49 | 2,853,579.49 |
| 8,000,000.00 | listed | 3,680,789.74 | 7,368,656.07 | 2,232,027.69 | 4,550,172.62 | 1,568,000.00 | 3,332,000.00 |
| 14,000,000.00 | nav | 6,520,628.56 | 10,208,494.89 | 3,940,416.43 | 6,258,561.35 | 2,744,000.00 | 4,508,000.00 |

## The equalization at Birch's close (F25, F29)

**The investment call before the close.** On 2021-01-10 Alder and Cedar were in, $14,000,000 of commitments, so they paid the LPs' $5,880,000 as 10/14 and 4/14: $4,200,000 and $1,680,000. At Birch's close it rebalances among all three by commitment, 1/2, 3/10 and 1/5: $2,940,000, $1,764,000 and $1,176,000.
- **Birch pays in $1,764,000.** Alder gets back $1,260,000, and Cedar $504,000.
- **Interest:** 2021-01-10 to 2021-04-15 is 95 days (21 + 28 + 31 + 15). Birch pays 8% on $1,764,000 for 95 days: 1,764,000 × 0.08 × 95 / 365 = **$36,729.86**. Alder receives 8% on what it gets back for the same days, **$26,235.62**, and Cedar **$10,494.25**: together what Birch paid.

**Back fees (F29).** One fee call is before Birch's close: the first half of 2021, dated 2021-01-01, on commitments. Birch's own part of it, as if in from the start, is its $3,000,000 of fee weight × 2% / 2 = **$30,000**, paid to the manager. The fee calls after its close are on commitments or invested capital alike, Birch's own from the start: no back fees for them.

| LP | Capital paid in at its close | Capital got back | Interest paid | Interest received | Back fees |
|---|---:|---:|---:|---:|---:|
| Alder Endowment | 0.00 | 1,260,000.00 | 0.00 | 26,235.62 | 0.00 |
| Birch Family Office (joins) | 1,764,000.00 | 0.00 | 36,729.86 | 0.00 | 30,000.00 |
| Cedar Holdings | 0.00 | 504,000.00 | 0.00 | 10,494.25 | 0.00 |
