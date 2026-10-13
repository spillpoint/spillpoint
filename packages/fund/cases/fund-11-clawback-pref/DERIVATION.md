# Fund case 11, a clawback with a pref: derivation

A clawback with an 8% simple pref and a full catch-up. The pref X pays accrues on a late call, but the run on the fund's totals owes no pref on it, since earlier gains cover it. 20% carry, no GP commitment. D is `as_of`, 2025-01-01, and X is final.

**The fund.** $10,000,000 called on 2020-01-01, $20,000,000 distributed on 2022-01-01, and $5,000,000 called on 2023-01-01. The LPs' paid-in is $15,000,000.

**The earlier $20,000,000 (F1).**
- **Capital:** $10,000,000.
- **Pref:** from 2020-01-01 to 2022-01-01 is 366 + 365 = 731 days. 10,000,000 × 0.08 × 731 ÷ 365 = 116,960,000/73 = $1,602,191.780821….
- **Catch-up:** a quarter of the pref, 29,240,000/73 = $400,547.945205…, all to the GP.
- **Carry:** the rest, $7,997,260.273973…. 20% is $1,599,452.054795… and 80% is $6,397,808.219178….
- **So:** the GP has exactly $2,000,000, 20% of the $10,000,000 profit, and the LPs have $18,000,000.

**The pref X pays (F6).** All the earlier capital is back. The late $5,000,000 has been out since 2023-01-01, and 2025-01-01 is 365 + 366 = 731 days later: 5,000,000 × 0.08 × 731 ÷ 365 = 58,480,000/73 = $801,095.890411…
- **All of it is owed.**
- **The pref accrued to D** is 175,440,000/73 = $2,403,287.67, the earlier $1,602,191.78 included.

**X's tiers.**
- **Capital:** to $5,000,000.
- **Pref:** to 5,000,000 + 801,095.89 = 423,480,000/73 = $5,801,095.89.
- **Catch-up:**
  - **Where it starts:** the profit to date is $10,000,000 + $801,095.89 and the GP has $2,000,000.
  - **What it needs:** 20% of the profit is $2,160,219.18, so the GP is $160,219.18 short.
  - **Its length:** with all of each dollar to the GP and 20 cents of it counting toward the 20%, it closes the gap at 80 cents a dollar: 160,219.18 ÷ 0.8 = 14,620,000/73 = $200,273.97.
  - **Where it ends:** at 438,100,000/73 = $6,001,369.86.
- **Then 80/20.**

**The run on the fund's totals (F12).**
- **Capital:** all LP paid-in, $15,000,000.
- **Pref, on the hurdle balance:** paid-in less every distribution, never below zero.
  - $10,000,000 from 2020-01-01 to 2022-01-01.
  - Then 10,000,000 − 20,000,000, so zero.
  - From 2023-01-01, 15,000,000 − 20,000,000, still zero.
  - So the totals' pref is the first $1,602,191.78 only. The late call earns none: the earlier gains cover it.
- **Amount:** $20,000,000 + X.
  - Its catch-up ends at 15,000,000 + 1,602,191.78 + 400,547.95 = $17,002,739.73, below $20,000,000, so for every X the run is past its catch-up.
  - The entitlement is 20% of the profit: 0.20 × (5,000,000 + X).

**The clawback.** Carry paid is $2,000,000 plus the GP's catch-up and carry in X (FA1). Owed is carry paid less the entitlement, when positive.
- **Capital, X up to $5,000,000:** owed = 2,000,000 − 0.20 × (5,000,000 + X) = 1,000,000 − 0.20 X. It's 0 at $5,000,000, where capital is back.
- **Pref:** the entitlement keeps growing and carry paid doesn't, so nothing is owed.
- **Catch-up:** carry paid grows a dollar a dollar against 20 cents, and catches the entitlement exactly at $6,001,369.86. At the end of X's catch-up the GP has 20% of the same profit the totals' run gives it 20% of. Nothing is owed on either side, so there's no clawback breakpoint there (FA8).
- **Above:** both grow 20 cents a dollar, so owed stays 0.

## Breakpoints

| X | Exact | Reasons |
|---:|---|---|
| 5,000,000.00 | 5000000 | `capital_returned`: "LPs have their $15,000,000 of paid-in capital back"; `clawback_cleared`: "from here the GP has earned all the carry it was paid earlier" |
| 5,801,095.89 | 423480000/73 | `pref_met`: "LPs have their 8% pref, $2,403,287.67" |
| 6,001,369.86 | 438100000/73 | `catch_up_done`: "the GP has 20% of the profit" |

## This distribution

| X | LP capital | LP pref | LP catch-up | LP carry tier | LPs | GP catch-up | GP carry 20% | GP |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 2,000,000.00 | 2,000,000.00 | 0.00 | 0.00 | 0.00 | 2,000,000.00 | 0.00 | 0.00 | 0.00 |
| 5,000,000.00 | 5,000,000.00 | 0.00 | 0.00 | 0.00 | 5,000,000.00 | 0.00 | 0.00 | 0.00 |
| 5,801,095.89 | 5,000,000.00 | 801,095.89 | 0.00 | 0.00 | 5,801,095.89 | 0.00 | 0.00 | 0.00 |
| 5,900,000.00 | 5,000,000.00 | 801,095.89 | 0.00 | 0.00 | 5,801,095.89 | 98,904.11 | 0.00 | 98,904.11 |
| 6,001,369.86 | 5,000,000.00 | 801,095.89 | 0.00 | 0.00 | 5,801,095.89 | 200,273.97 | 0.00 | 200,273.97 |
| 8,000,000.00 | 5,000,000.00 | 801,095.89 | 0.00 | 1,598,904.11 | 7,400,000.00 | 200,273.97 | 399,726.03 | 600,000.00 |

At $8,000,000 the carry tier has $1,998,630.136986…. 20% is $399,726.03 and 80% is $1,598,904.11, so the LPs have exactly $7,400,000.

## The fund to date

| X | Distributed | LP capital | LP pref | LP catch-up | LP carry tier | LPs | GP catch-up | GP carry 20% | GP |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | 20,000,000.00 | 10,000,000.00 | 1,602,191.78 | 0.00 | 6,397,808.22 | 18,000,000.00 | 400,547.95 | 1,599,452.05 | 2,000,000.00 |
| 2,000,000.00 | 22,000,000.00 | 12,000,000.00 | 1,602,191.78 | 0.00 | 6,397,808.22 | 20,000,000.00 | 400,547.95 | 1,599,452.05 | 2,000,000.00 |
| 5,000,000.00 | 25,000,000.00 | 15,000,000.00 | 1,602,191.78 | 0.00 | 6,397,808.22 | 23,000,000.00 | 400,547.95 | 1,599,452.05 | 2,000,000.00 |
| 5,801,095.89 | 25,801,095.89 | 15,000,000.00 | 2,403,287.67 | 0.00 | 6,397,808.22 | 23,801,095.89 | 400,547.95 | 1,599,452.05 | 2,000,000.00 |
| 5,900,000.00 | 25,900,000.00 | 15,000,000.00 | 2,403,287.67 | 0.00 | 6,397,808.22 | 23,801,095.89 | 499,452.05 | 1,599,452.05 | 2,098,904.11 |
| 6,001,369.86 | 26,001,369.86 | 15,000,000.00 | 2,403,287.67 | 0.00 | 6,397,808.22 | 23,801,095.89 | 600,821.92 | 1,599,452.05 | 2,200,273.97 |
| 8,000,000.00 | 28,000,000.00 | 15,000,000.00 | 2,403,287.67 | 0.00 | 7,996,712.33 | 25,400,000.00 | 600,821.92 | 1,999,178.08 | 2,600,000.00 |

## Clawback

| X | Carry paid | Entitlement | Owed |
|---:|---:|---:|---:|
| 0.00 | 2,000,000.00 | 1,000,000.00 | 1,000,000.00 |
| 2,000,000.00 | 2,000,000.00 | 1,400,000.00 | 600,000.00 |
| 5,000,000.00 | 2,000,000.00 | 2,000,000.00 | 0.00 |
| 5,801,095.89 | 2,000,000.00 | 2,160,219.18 | 0.00 |
| 5,900,000.00 | 2,098,904.11 | 2,180,000.00 | 0.00 |
| 6,001,369.86 | 2,200,273.97 | 2,200,273.97 | 0.00 |
| 8,000,000.00 | 2,600,000.00 | 2,600,000.00 | 0.00 |

- **At X = 0** the GP holds $2,000,000, $400,547.95 of it catch-up, against $1,000,000 earned. Counting the catch-up as carry is FA1.
- **Between $5,000,000 and $6,001,369.86** the totals' run would give the GP more than it has. F12 is one way only, so nothing is added.
