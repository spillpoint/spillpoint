# Fund case 40, an SPV's fee on invested capital: derivation

An SPV whose management fee is 2% a year of its invested capital from the start (F38, F39), called yearly. It lists no LPs, so with no step on commitments it needs no `commitments` (F40). Its one investment is made after the first year's call is dated, sold within its third year, and the fourth year has nothing invested, so nothing to call (F39). X is final.

- **The terms:** 20% carry, no pref, no GP commitment, on the whole fund.
- **The schedule:** from 2022-01-01, yearly, one step: 2% a year on net invested capital.
- **An investment call:** $2,000,000 on 2022-03-01.
- **The investment:** Larch Bio, a $2,000,000 check on 2022-03-15.
- **The exit:** $6,000,000 from Larch Bio on 2024-06-30, all of it.
- **X** comes from Larch Bio, which has nothing left. **D** is `as_of`, 2025-03-31. X is final; there's no NAV.

**The checks against the calls (F37):** $2,000,000 made on $2,000,000 called by 2022-03-15.

## Net invested capital (F38)

Nothing before 2022-03-15; Larch's $2,000,000 from its check on 2022-03-15; nothing again from its exit on 2024-06-30, the first day without it.

## The fee calls (F30, F39)

One period for each calendar year from 2022's to D's, each called in advance on its first day: 2022, 2023, 2024 and 2025. Each day at 2% of that day's net invested capital, over the year's days. No GP commitment, so the LPs' part is all of it, and without listed LPs nothing divides it.

| Period | Covers | Days with Larch held | Working | Exact | Call |
|---|---|---|---|---:|---:|
| 2022-01-01 | 2022-01-01 to 2022-12-31 | 292 of 365, 2022-03-15 to 2022-12-31 | 2% × 2,000,000 × 292 / 365 | 32000 | 32,000.00 |
| 2023-01-01 | 2023-01-01 to 2023-12-31 | 365 of 365, 2023-01-01 to 2023-12-31 | 2% × 2,000,000 | 40000 | 40,000.00 |
| 2024-01-01 | 2024-01-01 to 2024-12-31 | 181 of 366, 2024-01-01 to 2024-06-29 | 2% × 2,000,000 × 181 / 366 | 3620000/183 | 19,781.42 |
| 2025-01-01 | 2025-01-01 to 2025-12-31 | none: Larch exited on 2024-06-30 | nothing to call |  | no call |
| **All** |  |  |  |  | **91,781.42** |

- **2022:** 365 days, 292 of them with Larch held, from 2022-03-15: 2% × $2,000,000 × 292 / 365 = **$32,000**. The call is dated 2022-01-01, in advance, so it already counts the check made later in the year (F39).
- **2023:** every day held: **$40,000**.
- **2024:** 366 days, a leap year; 181 with Larch held, 2024-01-01 to 2024-06-29, and none from its exit on 2024-06-30: 40,000 × 181 / 366 = 3620000/183 = **$19,781.42**.
- **2025, D's year:** every day on invested capital with nothing invested, so nothing to call: it isn't a call (F39, FA40). Every call is above $0.

The 2025 period still counts by its date for the checks that count calls (F39, FA66), but it changes none: the fund's first call is 2022-01-01's either way. **$91,781.42** of fees in all.

## Paid in

| Calls | Amount |
|---|---:|
| Investment, 2022-03-01 | 2,000,000.00 |
| The schedule's 3 fee calls | 91,781.42 |
| **LPs' paid-in** | **2,091,781.42** |

## The investments (F33, F36)

Once, at D, before X:

| Investment | Cost made | Cost realized | Written off | Proceeds |
|---|---:|---:|---:|---:|
| Larch Bio | 2,000,000.00 | 2,000,000.00 | 0.00 | 6,000,000.00 |

**The realized multiple** (F36, FA59): 6,000,000 / 2,000,000 = **3x**.

## The earlier distribution

The $6,000,000 on 2024-06-30, all through the tiers, with no GP commitment. By then the LPs had paid in all $2,091,781.42: the investment call and the three fee calls, the 2024 call dated 2024-01-01. So $2,091,781.42 is capital, and the other $3,908,218.58 goes 80/20: **$781,643.72 of carry**, and $3,126,574.86 to the LPs.

## X, distributed on D

Final. The LPs already have all their paid-in back, so every dollar of X goes 80/20. No tier ends inside X, and one carry rate never ends (FA7): **no breakpoints**. X sells what's left of Larch Bio, which is nothing: it realizes no cost, and on the whole fund it would change no amount if it did (F34).

- **At $500,000:** $100,000 of carry, $400,000 to the LPs.

## This distribution

| X | Tags | LPs, capital | LPs, carry tier | LPs | GP carry |
|---:|---|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 |
| 500,000.00 | listed | 0.00 | 400,000.00 | 400,000.00 | 100,000.00 |

## The fund to date

| X | Tags | LPs, capital | LPs, carry tier | LPs | GP carry |
|---:|---|---:|---:|---:|---:|
| 0.00 | listed | 2,091,781.42 | 3,126,574.86 | 5,218,356.28 | 781,643.72 |
| 500,000.00 | listed | 2,091,781.42 | 3,526,574.86 | 5,618,356.28 | 881,643.72 |

## The clawback (F12)

On the fund's totals, all the paid-in as capital: at X = 0, $6,000,000 through the tiers, $2,091,781.42 of capital, $3,908,218.58 of profit, 20% of it **$781,643.72**, the carry paid. At $500,000 the totals' profit grows by $500,000 and the entitlement by $100,000, as the carry paid does. Nothing is owed at any X.

| X | Tags | Carry paid | Entitlement | Owed |
|---:|---|---:|---:|---:|
| 0.00 | listed | 781,643.72 | 781,643.72 | 0.00 |
| 500,000.00 | listed | 881,643.72 | 881,643.72 | 0.00 |

The case file gives the schedule's three calls once, at the top (FC13). 2025's period isn't one of them. No GP commitment, so no `gp_commitment`; no LPs, so no `by_lp`.
