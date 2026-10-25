# Fund case 29, a fee schedule: derivation

A fund that doesn't list its LPs, with its management fees worked out by a schedule (F30) rather than entered as fee calls. Carry is 20%, with an 8% pref and a full catch-up (F6, F8), and a 1% GP commitment, fee-free (F3).

- **The schedule:** fees from 2021-02-15, called quarterly, at 2% a year on $40,000,000 of commitments, and 1.5% from 2026-02-15, year six. The fund lists no LPs, so `commitments` is the fee's base.
- **Investment calls:** $12,000,000 on 2021-03-15, $10,000,000 on 2022-05-02 and $8,000,000 on 2023-11-20. No fee call is entered: with a schedule, none may be (F32).
- **Earlier distributions:** $9,000,000 on 2024-09-30 and $15,000,000 on 2025-12-15.
- **D** is `as_of`, 2026-06-30. X isn't final, and there's no NAV.

## The fee calls (F30)

One call for each calendar quarter from the one `start` is in to D's, each called in advance on the quarter's first day. The first is dated `start` and covers `start` to the quarter's end. No quarter starts after D, so the last is the one that starts on 2026-04-01.

**Each call's fee factor** is the rate in force on each day it covers, added up, over 4 times the quarter's days. With one rate all quarter, that's the rate over 4:
- **The first quarter,** 2021-02-15 to 2021-03-31, covers 45 of Q1 2021's 90 days: 2% × 45 / 360 = 0.0025. On $40,000,000 that's **$100,000**, half a quarter.
- **A whole quarter at 2%** is 0.005: **$200,000.**
- **Q1 2026** has 90 days: 45 at 2%, 1 January to 14 February, and 45 at 1.5% from the step on 15 February. (2% × 45 + 1.5% × 45) / 360 = 0.004375: **$175,000.**
- **Q2 2026,** all at 1.5%: 0.00375, **$150,000.**

The GP commitment is fee-free, so each call is the LPs' fee, and its part of each is $0.00.

| Date | Covers | Working | Fee factor | Call |
|---|---|---|---:|---:|
| 2021-02-15 | 2021-02-15 to 2021-03-31 | 2% × 45 / (4 × 90) | 0.0025 | 100,000.00 |
| 2021-04-01 | 2021-04-01 to 2021-06-30 | 2% × 91 / (4 × 91) | 0.005 | 200,000.00 |
| 2021-07-01 | 2021-07-01 to 2021-09-30 | 2% × 92 / (4 × 92) | 0.005 | 200,000.00 |
| 2021-10-01 | 2021-10-01 to 2021-12-31 | 2% × 92 / (4 × 92) | 0.005 | 200,000.00 |
| 2022-01-01 | 2022-01-01 to 2022-03-31 | 2% × 90 / (4 × 90) | 0.005 | 200,000.00 |
| 2022-04-01 | 2022-04-01 to 2022-06-30 | 2% × 91 / (4 × 91) | 0.005 | 200,000.00 |
| 2022-07-01 | 2022-07-01 to 2022-09-30 | 2% × 92 / (4 × 92) | 0.005 | 200,000.00 |
| 2022-10-01 | 2022-10-01 to 2022-12-31 | 2% × 92 / (4 × 92) | 0.005 | 200,000.00 |
| 2023-01-01 | 2023-01-01 to 2023-03-31 | 2% × 90 / (4 × 90) | 0.005 | 200,000.00 |
| 2023-04-01 | 2023-04-01 to 2023-06-30 | 2% × 91 / (4 × 91) | 0.005 | 200,000.00 |
| 2023-07-01 | 2023-07-01 to 2023-09-30 | 2% × 92 / (4 × 92) | 0.005 | 200,000.00 |
| 2023-10-01 | 2023-10-01 to 2023-12-31 | 2% × 92 / (4 × 92) | 0.005 | 200,000.00 |
| 2024-01-01 | 2024-01-01 to 2024-03-31 | 2% × 91 / (4 × 91) | 0.005 | 200,000.00 |
| 2024-04-01 | 2024-04-01 to 2024-06-30 | 2% × 91 / (4 × 91) | 0.005 | 200,000.00 |
| 2024-07-01 | 2024-07-01 to 2024-09-30 | 2% × 92 / (4 × 92) | 0.005 | 200,000.00 |
| 2024-10-01 | 2024-10-01 to 2024-12-31 | 2% × 92 / (4 × 92) | 0.005 | 200,000.00 |
| 2025-01-01 | 2025-01-01 to 2025-03-31 | 2% × 90 / (4 × 90) | 0.005 | 200,000.00 |
| 2025-04-01 | 2025-04-01 to 2025-06-30 | 2% × 91 / (4 × 91) | 0.005 | 200,000.00 |
| 2025-07-01 | 2025-07-01 to 2025-09-30 | 2% × 92 / (4 × 92) | 0.005 | 200,000.00 |
| 2025-10-01 | 2025-10-01 to 2025-12-31 | 2% × 92 / (4 × 92) | 0.005 | 200,000.00 |
| 2026-01-01 | 2026-01-01 to 2026-03-31 | (2% × 45 + 1.5% × 45) / (4 × 90) | 0.004375 | 175,000.00 |
| 2026-04-01 | 2026-04-01 to 2026-06-30 | 1.5% × 91 / (4 × 91) | 0.00375 | 150,000.00 |
| **All** | | | | **4,225,000.00** |

That's 22 calls: the half first quarter, 19 whole quarters at 2% ($3,800,000), the quarter with the step and D's quarter. $4,225,000 in all, as the spec's case list gives it.

## Paid in

The GP commitment pays 1% of each investment call and none of the fee calls (F3).

| Calls | Amount | GP commitment | LPs |
|---|---:|---:|---:|
| Investment, 2021-03-15 | 12,000,000.00 | 120,000.00 | 11,880,000.00 |
| Investment, 2022-05-02 | 10,000,000.00 | 100,000.00 | 9,900,000.00 |
| Investment, 2023-11-20 | 8,000,000.00 | 80,000.00 | 7,920,000.00 |
| The schedule's 22 fee calls | 4,225,000.00 | 0.00 | 4,225,000.00 |
| **All** | 34,225,000.00 | **300,000.00** | **33,925,000.00** |

## The earlier distributions: capital

Each is 1% to the GP commitment and 99% down the tiers.
- **2024-09-30, $9,000,000:** $90,000 and $8,910,000. By then the LPs had paid in $29,700,000 of investment and $2,900,000 of fees (the first call and 14 whole quarters, through 2024-07-01): $32,600,000. All $8,910,000 is capital.
- **2025-12-15, $15,000,000:** $150,000 and $14,850,000. By then they had paid $33,600,000 (fees through 2025-10-01: $3,900,000), and $8,910,000 of it was back: $24,690,000 due. All $14,850,000 is capital.

So no pref has been paid, and $23,760,000 of capital is back.

## The pref to D (F6)

8% simple, Actual/365, on the LPs' unreturned capital. Worked as each call's 8% for its days to D, less each capital return's 8% for its days to D, since a return stops the pref on what it returns from its own date. The pref runs on each fee call from its date, the schedule's included.

| Date | What | LPs' amount | Days to D | 8% for those days |
|---|---|---:|---:|---:|
| 2021-02-15 | fee | 100,000.00 | 1961 | 42,980.82 |
| 2021-03-15 | investment | 11,880,000.00 | 1933 | 5,033,214.25 |
| 2021-04-01 | fee | 200,000.00 | 1916 | 83,989.04 |
| 2021-07-01 | fee | 200,000.00 | 1825 | 80,000.00 |
| 2021-10-01 | fee | 200,000.00 | 1733 | 75,967.12 |
| 2022-01-01 | fee | 200,000.00 | 1641 | 71,934.25 |
| 2022-04-01 | fee | 200,000.00 | 1551 | 67,989.04 |
| 2022-05-02 | investment | 9,900,000.00 | 1520 | 3,298,191.78 |
| 2022-07-01 | fee | 200,000.00 | 1460 | 64,000.00 |
| 2022-10-01 | fee | 200,000.00 | 1368 | 59,967.12 |
| 2023-01-01 | fee | 200,000.00 | 1276 | 55,934.25 |
| 2023-04-01 | fee | 200,000.00 | 1186 | 51,989.04 |
| 2023-07-01 | fee | 200,000.00 | 1095 | 48,000.00 |
| 2023-10-01 | fee | 200,000.00 | 1003 | 43,967.12 |
| 2023-11-20 | investment | 7,920,000.00 | 953 | 1,654,303.56 |
| 2024-01-01 | fee | 200,000.00 | 911 | 39,934.25 |
| 2024-04-01 | fee | 200,000.00 | 820 | 35,945.21 |
| 2024-07-01 | fee | 200,000.00 | 729 | 31,956.16 |
| 2024-10-01 | fee | 200,000.00 | 637 | 27,923.29 |
| 2025-01-01 | fee | 200,000.00 | 545 | 23,890.41 |
| 2025-04-01 | fee | 200,000.00 | 455 | 19,945.21 |
| 2025-07-01 | fee | 200,000.00 | 364 | 15,956.16 |
| 2025-10-01 | fee | 200,000.00 | 272 | 11,923.29 |
| 2026-01-01 | fee | 175,000.00 | 180 | 6,904.11 |
| 2026-04-01 | fee | 150,000.00 | 90 | 2,958.90 |
| 2024-09-30 | capital back | −8,910,000.00 | 638 | −1,245,935.34 |
| 2025-12-15 | capital back | −14,850,000.00 | 197 | −641,194.52 |

Each row is rounded to the cent on its own. Exactly, the pref accrued to D is 661,572,320/73 = **$9,062,634.52**, all of it due.

## X, distributed on D

1% to the GP commitment, 99% down the tiers (F3):
1. **Capital:** $33,925,000 paid in, $23,760,000 back: **$10,165,000** due. 99% of X reaches it at X = 10,165,000 / 0.99 = 1,016,500,000/99 = **$10,267,676.77**.
2. **Pref:** **$9,062,634.52**, so the pref is met when $19,227,634.52 has gone down the tiers: X = 1,403,617,320/73 / 0.99 = 15,595,748,000/803 = **$19,421,853.05**.
3. **Catch-up, full:** every dollar to the GP until it has 20% of the profit. The profit is the pref so far, so the GP needs a quarter of it: 9,062,634.52 × 0.2 / 0.8 = 165,393,080/73 = **$2,265,658.63**. Done when $21,493,293.15 has gone down the tiers: X = 1,569,010,400/73 / 0.99 = 156,901,040,000/7227 = **$21,710,397.12**.
4. **Then 80/20.**

## Breakpoints

One account, so the wording is as before (F27).

| X | Exact | Reasons |
|---:|---|---|
| 10,267,676.77 | 1016500000/99 | `capital_returned`: "LPs have their $33,925,000 of paid-in capital back" |
| 19,421,853.05 | 15595748000/803 | `pref_met`: "LPs have their 8% pref, $9,062,634.52" |
| 21,710,397.12 | 156901040000/7227 | `catch_up_done`: "the GP has 20% of the profit" |

## This distribution

| X | Tags | GP commitment | LPs, capital | LPs, pref | LPs, catch-up | LPs, carry tier | LPs | GP catch-up | GP carry 20% | GP |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 10,000,000.00 | listed | 100,000.00 | 9,900,000.00 | 0.00 | 0.00 | 0.00 | 9,900,000.00 | 0.00 | 0.00 | 0.00 |
| 10,267,676.77 | breakpoint | 102,676.77 | 10,165,000.00 | 0.00 | 0.00 | 0.00 | 10,165,000.00 | 0.00 | 0.00 | 0.00 |
| 19,421,853.05 | breakpoint | 194,218.53 | 10,165,000.00 | 9,062,634.52 | 0.00 | 0.00 | 19,227,634.52 | 0.00 | 0.00 | 0.00 |
| 20,000,000.00 | listed | 200,000.00 | 10,165,000.00 | 9,062,634.52 | 0.00 | 0.00 | 19,227,634.52 | 572,365.48 | 0.00 | 572,365.48 |
| 21,710,397.12 | breakpoint | 217,103.97 | 10,165,000.00 | 9,062,634.52 | 0.00 | 0.00 | 19,227,634.52 | 2,265,658.63 | 0.00 | 2,265,658.63 |
| 30,000,000.00 | listed | 300,000.00 | 10,165,000.00 | 9,062,634.52 | 0.00 | 6,565,365.48 | 25,793,000.00 | 2,265,658.63 | 1,641,341.37 | 3,907,000.00 |

- **At $20,000,000:** $200,000 to the GP commitment and $19,800,000 down the tiers: $10,165,000 of capital, the $9,062,634.52 of pref, then $572,365.48 of catch-up, all to the GP.
- **At $30,000,000:** $300,000 and $29,700,000: capital and pref, the whole catch-up of $2,265,658.63, then $8,206,706.85 at 80/20, $1,641,341.37 to the GP. The GP has $3,907,000.00, 20% of the $19,535,000 of profit (29,700,000 − 10,165,000).

## The fund to date

The earlier $24,000,000 gave $240,000 to the GP commitment and $23,760,000 of capital to the LPs.

| X | Tags | GP commitment | LPs, capital | LPs, pref | LPs, catch-up | LPs, carry tier | LPs | GP catch-up | GP carry 20% | GP |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 240,000.00 | 23,760,000.00 | 0.00 | 0.00 | 0.00 | 23,760,000.00 | 0.00 | 0.00 | 0.00 |
| 10,000,000.00 | listed | 340,000.00 | 33,660,000.00 | 0.00 | 0.00 | 0.00 | 33,660,000.00 | 0.00 | 0.00 | 0.00 |
| 10,267,676.77 | breakpoint | 342,676.77 | 33,925,000.00 | 0.00 | 0.00 | 0.00 | 33,925,000.00 | 0.00 | 0.00 | 0.00 |
| 19,421,853.05 | breakpoint | 434,218.53 | 33,925,000.00 | 9,062,634.52 | 0.00 | 0.00 | 42,987,634.52 | 0.00 | 0.00 | 0.00 |
| 20,000,000.00 | listed | 440,000.00 | 33,925,000.00 | 9,062,634.52 | 0.00 | 0.00 | 42,987,634.52 | 572,365.48 | 0.00 | 572,365.48 |
| 21,710,397.12 | breakpoint | 457,103.97 | 33,925,000.00 | 9,062,634.52 | 0.00 | 0.00 | 42,987,634.52 | 2,265,658.63 | 0.00 | 2,265,658.63 |
| 30,000,000.00 | listed | 540,000.00 | 33,925,000.00 | 9,062,634.52 | 0.00 | 6,565,365.48 | 49,553,000.00 | 2,265,658.63 | 1,641,341.37 | 3,907,000.00 |

The case file gives the schedule's calls once, at the top (FC13): each its date, the days it covers, the call, the LPs' part and the GP commitment's. No LPs are listed, so there's no `by_lp`. Not final and no NAV, so no point has a clawback.
