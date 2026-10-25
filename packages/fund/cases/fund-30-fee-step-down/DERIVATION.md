# Fund case 30, a fee step-down inside a half-year: derivation

Two LPs on the fund's terms, fees worked out by a schedule called half-yearly (F30), and a GP commitment that pays fees (F3). Carry is 20%, with an 8% pref and a full catch-up. X is final, so the clawback is worked at every point (F12).

- **The LPs:** Alder Endowment ($15,000,000) and Birchwood Family Office ($10,000,000): 0.6 and 0.4. Both in from the start, so there's no equalization.
- **The schedule:** from 2020-07-01, half-yearly, at 2% a year, and 1.5% from 2022-03-01, inside the half-year that starts on 2022-01-01. No `commitments`: the LPs are listed, so their $25,000,000 is the base.
- **The GP commitment:** 2%, paying fees (`pays_fees`) and expenses (the default).
- **Investment calls:** $10,000,000 on 2020-07-01 and $8,000,000 on 2021-09-15.
- **Earlier distributions:** $12,000,000 on 2023-06-30 and $20,000,000 on 2025-03-31.
- **D** is `as_of`, 2027-03-31.

## The fee calls (F30)

One call for each calendar half-year, January to June and July to December, from 2020-07-01 to D's half-year, each called in advance on its first day. `start` is a half-year's first day, so the first call is a whole one.

**Each LP's fee** is its commitment times the half-year's fee factor: the rate on each day, added up, over 2 times the half-year's days. The LPs' fee is their $25,000,000 times it.
- **A whole half-year at 2%** is 0.01: **$250,000**, $150,000 from Alder and $100,000 from Birchwood.
- **The half-year with the step,** 2022-01-01 to 2022-06-30, has 181 days: 59 at 2% (1 January to 28 February) and 122 at 1.5%. (2% × 59 + 1.5% × 122) / (2 × 181) = 3.01 / 362. On $25,000,000 that's 37,625,000/181 = **$207,872.93**.
- **A whole half-year at 1.5%** is 0.0075: **$187,500.**

**The call:** the GP commitment pays fees, so each call is the LPs' fee over 0.98, and the GP commitment pays 2% of it. A $250,000 fee is a call of 12,500,000/49 = $255,102.04, $5,102.04 of it the GP commitment's.

| Date | Covers | Working | LPs | Alder | Birchwood | Call | GP commitment |
|---|---|---|---:|---:|---:|---:|---:|
| 2020-07-01 | 2020-07-01 to 2020-12-31 | 2% × 184 / (2 × 184) | 250,000.00 | 150,000.00 | 100,000.00 | 255,102.04 | 5,102.04 |
| 2021-01-01 | 2021-01-01 to 2021-06-30 | 2% × 181 / (2 × 181) | 250,000.00 | 150,000.00 | 100,000.00 | 255,102.04 | 5,102.04 |
| 2021-07-01 | 2021-07-01 to 2021-12-31 | 2% × 184 / (2 × 184) | 250,000.00 | 150,000.00 | 100,000.00 | 255,102.04 | 5,102.04 |
| 2022-01-01 | 2022-01-01 to 2022-06-30 | (2% × 59 + 1.5% × 122) / (2 × 181) | 207,872.93 | 124,723.76 | 83,149.17 | 212,115.23 | 4,242.30 |
| 2022-07-01 | 2022-07-01 to 2022-12-31 | 1.5% × 184 / (2 × 184) | 187,500.00 | 112,500.00 | 75,000.00 | 191,326.53 | 3,826.53 |
| 2023-01-01 | 2023-01-01 to 2023-06-30 | 1.5% × 181 / (2 × 181) | 187,500.00 | 112,500.00 | 75,000.00 | 191,326.53 | 3,826.53 |
| 2023-07-01 | 2023-07-01 to 2023-12-31 | 1.5% × 184 / (2 × 184) | 187,500.00 | 112,500.00 | 75,000.00 | 191,326.53 | 3,826.53 |
| 2024-01-01 | 2024-01-01 to 2024-06-30 | 1.5% × 182 / (2 × 182) | 187,500.00 | 112,500.00 | 75,000.00 | 191,326.53 | 3,826.53 |
| 2024-07-01 | 2024-07-01 to 2024-12-31 | 1.5% × 184 / (2 × 184) | 187,500.00 | 112,500.00 | 75,000.00 | 191,326.53 | 3,826.53 |
| 2025-01-01 | 2025-01-01 to 2025-06-30 | 1.5% × 181 / (2 × 181) | 187,500.00 | 112,500.00 | 75,000.00 | 191,326.53 | 3,826.53 |
| 2025-07-01 | 2025-07-01 to 2025-12-31 | 1.5% × 184 / (2 × 184) | 187,500.00 | 112,500.00 | 75,000.00 | 191,326.53 | 3,826.53 |
| 2026-01-01 | 2026-01-01 to 2026-06-30 | 1.5% × 181 / (2 × 181) | 187,500.00 | 112,500.00 | 75,000.00 | 191,326.53 | 3,826.53 |
| 2026-07-01 | 2026-07-01 to 2026-12-31 | 1.5% × 184 / (2 × 184) | 187,500.00 | 112,500.00 | 75,000.00 | 191,326.53 | 3,826.53 |
| 2027-01-01 | 2027-01-01 to 2027-06-30 | 1.5% × 181 / (2 × 181) | 187,500.00 | 112,500.00 | 75,000.00 | 191,326.53 | 3,826.53 |
| **All** |  |  | **2,832,872.93** | 1,699,723.76 | 1,133,149.17 | 2,890,686.66 | 57,813.73 |

The last of the 14 is called on 2027-01-01, the half-year D is in. Four of them, 2025-07-01 to 2027-01-01, come after the last distribution: $750,000 of the LPs' fees, 4 × $187,500.

## Paid in

| Calls | Amount | GP commitment | LPs |
|---|---:|---:|---:|
| Investment, 2020-07-01 | 10,000,000.00 | 200,000.00 | 9,800,000.00 |
| Investment, 2021-09-15 | 8,000,000.00 | 160,000.00 | 7,840,000.00 |
| The schedule's 14 fee calls | 2,890,686.66 | 57,813.73 | 2,832,872.93 |
| **All** | 20,890,686.66 | **417,813.73** | **20,472,872.93** |

Each LP's paid-in is its share: Alder $12,283,723.76, Birchwood $8,189,149.17.

## The earlier distributions

Each is 2% to the GP commitment and 98% down the tiers (F3).

**2023-06-30, $12,000,000:** $240,000 and $11,760,000. The LPs had paid in $18,972,872.93 by then: $17,640,000 of investment and the first six fee calls. All $11,760,000 is capital.

**2025-03-31, $20,000,000:** $400,000 and $19,600,000.
- **Capital:** paid in by then $19,722,872.93 (four more fee calls), less $11,760,000 back: **$7,962,872.93**.
- **Pref:** 8% on the LPs' unreturned capital from each call's date, less 8% on the $11,760,000 from its return:

| Date | What | LPs' amount | Days to 2025-03-31 | 8% for those days |
|---|---|---:|---:|---:|
| 2020-07-01 | fee | 250,000.00 | 1734 | 95,013.70 |
| 2020-07-01 | investment | 9,800,000.00 | 1734 | 3,724,536.99 |
| 2021-01-01 | fee | 250,000.00 | 1550 | 84,931.51 |
| 2021-07-01 | fee | 250,000.00 | 1369 | 75,013.70 |
| 2021-09-15 | investment | 7,840,000.00 | 1293 | 2,221,834.52 |
| 2022-01-01 | fee | 207,872.93 | 1185 | 53,990.01 |
| 2022-07-01 | fee | 187,500.00 | 1004 | 41,260.27 |
| 2023-01-01 | fee | 187,500.00 | 820 | 33,698.63 |
| 2023-07-01 | fee | 187,500.00 | 639 | 26,260.27 |
| 2024-01-01 | fee | 187,500.00 | 455 | 18,698.63 |
| 2024-07-01 | fee | 187,500.00 | 273 | 11,219.18 |
| 2025-01-01 | fee | 187,500.00 | 89 | 3,657.53 |
| 2023-06-30 | capital back | −11,760,000.00 | 640 | −1,649,621.92 |

  Exactly 62,636,134,320/13,213 = **$4,740,493.02**, none of it paid yet.
- **Catch-up, full:** the GP gets every dollar until it has 20% of the profit, a quarter of the pref: **$1,185,123.26**.
- **Then 80/20** on the rest: $19,600,000 − $7,962,872.93 − $4,740,493.02 − $1,185,123.26 = $5,711,510.79: $1,142,302.16 to the GP and $4,569,208.63 to the LPs.

So before X the GP has been paid $2,327,425.41 of carry, its catch-up and its 20%: 20% of the $11,637,127.07 of profit that distribution made beyond capital.

## X, distributed on D

**The pref to D:** the $4,740,493.02 accrued to 2025-03-31 was paid, and that distribution returned all the capital then paid in. Since then the four later fee calls have accrued 8% from their dates:

| Date | What | LPs' amount | Days to D | 8% for those days |
|---|---|---:|---:|---:|
| 2025-07-01 | fee | 187,500.00 | 638 | 26,219.18 |
| 2026-01-01 | fee | 187,500.00 | 454 | 18,657.53 |
| 2026-07-01 | fee | 187,500.00 | 273 | 11,219.18 |
| 2027-01-01 | fee | 187,500.00 | 89 | 3,657.53 |

Exactly 4,362,000/73 = **$59,753.42** due, so $4,800,246.45 accrued to D in all.

2% of X to the GP commitment, 98% down the tiers:
1. **Capital:** the $750,000 of fees called after the last distribution. X = 750,000 / 0.98 = 37,500,000/49 = **$765,306.12**.
2. **Pref:** $59,753.42, met at X = (750,000 + 4,362,000/73) / 0.98 = 2,955,600,000/3,577 = **$826,279.00**.
3. **Catch-up, full:** a quarter of the pref, 1,090,500/73 = $14,938.36. Done at X = 3,010,125,000/3,577 = **$841,522.23**.
4. **Then 80/20.**

## The clawback (F12)

**The GP's entitlement** is one run of the tiers on the fund's totals: all $20,472,872.93 of paid-in as capital, then the pref on the hurdle balance, then the catch-up, then 20%.
- **The hurdle pref** runs on paid-in less everything that has run the tiers, never below zero. Up to 2025-03-31 that's the unreturned capital, since the 2023 distribution was all capital, so it accrues the same $4,740,493.02. From 2025-03-31, $31,360,000 has run the tiers against at most $20,472,872.93 paid in, so the balance is below zero and accrues nothing more. It's **$4,740,493.02**.
- **The totals run's tiers:** capital to $20,472,872.93, pref to $25,213,365.95, catch-up to $26,398,489.21. Even at X = 0, $31,360,000 has run the tiers, past all three. After a full catch-up the GP has 20% of all the profit, so its entitlement is 20% of what has run the tiers beyond paid-in.

**At X = 0:**
- **Carry paid:** $2,327,425.41, 20% of $11,637,127.07 of profit measured on the paid-in of 2025-03-31.
- **Entitlement:** 20% of ($31,360,000 − $20,472,872.93) = 20% of $10,887,127.07 = $2,177,425.41.
- **Owed: $150,000.00,** 20% of the $750,000 of fees called after the last distribution. Those fees are paid-in the totals run returns first, so they take $750,000 out of the profit the GP was paid carry on.

**As X grows:** X's first $750,000 down the tiers is capital, so the carry paid holds while the entitlement rises 20 cents for each dollar: the owed falls by 0.2 × 0.98 of X, to zero at X = $765,306.12, where X's capital is back. Beyond it X pays pref and catch-up, and the carry paid catches up with the entitlement; from the catch-up's end both rise 20 cents a dollar together. At X = $500,000 the entitlement is $2,177,425.41 + 20% of $490,000 = $2,275,425.41, and the owed $52,000.00.

| X | Tags | Carry paid | Entitlement | Owed | Alder's share | Birchwood's share |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 2,327,425.41 | 2,177,425.41 | 150,000.00 | 90,000.00 | 60,000.00 |
| 500,000.00 | listed | 2,327,425.41 | 2,275,425.41 | 52,000.00 | 31,200.00 | 20,800.00 |
| 765,306.12 | breakpoint | 2,327,425.41 | 2,327,425.41 | 0.00 | 0.00 | 0.00 |
| 826,279.00 | breakpoint | 2,327,425.41 | 2,339,376.10 | 0.00 | 0.00 | 0.00 |
| 841,522.23 | breakpoint | 2,342,363.77 | 2,342,363.77 | 0.00 | 0.00 | 0.00 |
| 1,000,000.00 | listed | 2,373,425.41 | 2,373,425.41 | 0.00 | 0.00 | 0.00 |
| 10,000,000.00 | listed | 4,137,425.41 | 4,137,425.41 | 0.00 | 0.00 | 0.00 |

## Breakpoints

One account, so the wording is as before. The clawback clears where X's capital is back, so that breakpoint has two reasons.

| X | Exact | Reasons |
|---:|---|---|
| 765,306.12 | 37500000/49 | `capital_returned`: "LPs have their $20,472,872.93 of paid-in capital back" |
|  |  | `clawback_cleared`: "from here the GP has earned all the carry it was paid earlier" |
| 826,279.00 | 2955600000/3577 | `pref_met`: "LPs have their 8% pref, $4,800,246.45" |
| 841,522.23 | 3010125000/3577 | `catch_up_done`: "the GP has 20% of the profit" |

## This distribution

| X | Tags | GP commitment | LPs, capital | LPs, pref | LPs, catch-up | LPs, carry tier | LPs | GP catch-up | GP carry | GP |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 500,000.00 | listed | 10,000.00 | 490,000.00 | 0.00 | 0.00 | 0.00 | 490,000.00 | 0.00 | 0.00 | 0.00 |
| 765,306.12 | breakpoint | 15,306.12 | 750,000.00 | 0.00 | 0.00 | 0.00 | 750,000.00 | 0.00 | 0.00 | 0.00 |
| 826,279.00 | breakpoint | 16,525.58 | 750,000.00 | 59,753.42 | 0.00 | 0.00 | 809,753.42 | 0.00 | 0.00 | 0.00 |
| 841,522.23 | breakpoint | 16,830.44 | 750,000.00 | 59,753.42 | 0.00 | 0.00 | 809,753.42 | 14,938.36 | 0.00 | 14,938.36 |
| 1,000,000.00 | listed | 20,000.00 | 750,000.00 | 59,753.42 | 0.00 | 124,246.58 | 934,000.00 | 14,938.36 | 31,061.64 | 46,000.00 |
| 10,000,000.00 | listed | 200,000.00 | 750,000.00 | 59,753.42 | 0.00 | 7,180,246.58 | 7,990,000.00 | 14,938.36 | 1,795,061.64 | 1,810,000.00 |

## The fund to date

| X | Tags | GP commitment | LPs, capital | LPs, pref | LPs, catch-up | LPs, carry tier | LPs | GP catch-up | GP carry | GP |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 640,000.00 | 19,722,872.93 | 4,740,493.02 | 0.00 | 4,569,208.63 | 29,032,574.59 | 1,185,123.26 | 1,142,302.16 | 2,327,425.41 |
| 500,000.00 | listed | 650,000.00 | 20,212,872.93 | 4,740,493.02 | 0.00 | 4,569,208.63 | 29,522,574.59 | 1,185,123.26 | 1,142,302.16 | 2,327,425.41 |
| 765,306.12 | breakpoint | 655,306.12 | 20,472,872.93 | 4,740,493.02 | 0.00 | 4,569,208.63 | 29,782,574.59 | 1,185,123.26 | 1,142,302.16 | 2,327,425.41 |
| 826,279.00 | breakpoint | 656,525.58 | 20,472,872.93 | 4,800,246.45 | 0.00 | 4,569,208.63 | 29,842,328.01 | 1,185,123.26 | 1,142,302.16 | 2,327,425.41 |
| 841,522.23 | breakpoint | 656,830.44 | 20,472,872.93 | 4,800,246.45 | 0.00 | 4,569,208.63 | 29,842,328.01 | 1,200,061.61 | 1,142,302.16 | 2,342,363.77 |
| 1,000,000.00 | listed | 660,000.00 | 20,472,872.93 | 4,800,246.45 | 0.00 | 4,693,455.21 | 29,966,574.59 | 1,200,061.61 | 1,173,363.80 | 2,373,425.41 |
| 10,000,000.00 | listed | 840,000.00 | 20,472,872.93 | 4,800,246.45 | 0.00 | 11,749,455.21 | 37,022,574.59 | 1,200,061.61 | 2,937,363.80 | 4,137,425.41 |

## Each LP (F20)

One account: Alder gets 0.6 of the LPs' amounts and Birchwood 0.4.

| X | Tags | Alder, this distribution | Alder, to date | Birchwood, this distribution | Birchwood, to date |
|---:|---|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 17,419,544.75 | 0.00 | 11,613,029.83 |
| 500,000.00 | listed | 294,000.00 | 17,713,544.75 | 196,000.00 | 11,809,029.83 |
| 765,306.12 | breakpoint | 450,000.00 | 17,869,544.75 | 300,000.00 | 11,913,029.83 |
| 826,279.00 | breakpoint | 485,852.05 | 17,905,396.81 | 323,901.37 | 11,936,931.20 |
| 841,522.23 | breakpoint | 485,852.05 | 17,905,396.81 | 323,901.37 | 11,936,931.20 |
| 1,000,000.00 | listed | 560,400.00 | 17,979,944.75 | 373,600.00 | 11,986,629.83 |
| 10,000,000.00 | listed | 4,794,000.00 | 22,213,544.75 | 3,196,000.00 | 14,809,029.83 |

The case file gives each fee call once, at the top (FC13), with each LP's fee and the GP commitment's part.
