# Fund case 16, a clawback through the totals' catch-up: derivation

An 8% simple pref and a full catch-up, with a late call. The run on the fund's totals owes its pref and catch-up after X = 0, so the clawback holds, falls a dollar a dollar while that run pays its catch-up, then 20 cents a dollar. It pins FC6's wordings for the totals' pref and catch-up ending: "LPs have their pref" and "the GP has 20% of the profit". 20% carry, no GP commitment. D is `as_of`, 2024-01-01, and X is final.

Every pref period here is a whole year without a 29 February, so every pref is exactly 8% of its capital.

**The fund.**
- **2021-01-01:** a $10,000,000 investment call.
- **2022-01-01, $20,000,000:** a year on $10,000,000, so the pref is $800,000.
  - **Capital:** $10,000,000.
  - **Pref:** $800,000.
  - **Catch-up:** the GP needs 20% of the profit. C = 0.20 × (800,000 + C), so C = $200,000.
  - **Carry:** the last $9,000,000 at 80/20: $7,200,000 to the LPs and $1,800,000 to the GP.
  - **So:** the GP has $2,000,000, 20% of the $10,000,000 profit, and the LPs $18,000,000.
- **2023-01-01:** a second $10,000,000 call. The LPs' paid-in is $20,000,000, with $10,000,000 out.

**The pref X pays (F6).** The late $10,000,000 has been out for 2023, 365 days: $800,000.
- **All of it is owed.**
- **The pref accrued to D** is $1,600,000, the first year's included.

**X's tiers.**
- **Capital:** to $10,000,000.
- **Pref:** to $10,800,000.
- **Catch-up:**
  - **Where it starts:** the profit to date is $10,000,000 + $800,000 = $10,800,000 and the GP has $2,000,000.
  - **What it needs:** 20% of the profit is $2,160,000, so it's $160,000 short.
  - **Its length:** at 80 cents a dollar, 160,000 ÷ 0.8 = $200,000.
  - **Where it ends:** at $11,000,000.
- **Then 80/20.**

**The run on the fund's totals (F12).**
- **Capital:** $20,000,000.
- **Pref, on the hurdle balance:**
  - $10,000,000 through 2021.
  - Then max(0, 10,000,000 − 20,000,000), so zero.
  - From 2023-01-01, max(0, 20,000,000 − 20,000,000), still zero.
  - So the totals' pref is $800,000.
- **Catch-up:** a quarter of that, $200,000.
- **Amount:** $20,000,000 + X, so its tiers end at:
  - **Capital:** exactly at X = 0. That's not a breakpoint, which must be above 0 (F15).
  - **Pref:** at X = $800,000.
  - **Catch-up:** at X = $1,000,000.
  - **Then 20%.**

**The clawback.** Carry paid is the $2,000,000 plus X's catch-up and carry (FA1).
- **0 to $800,000:** X is capital and the totals' run is paying its pref. Neither pays the GP anything, so it holds at $2,000,000.
- **$800,000:** the totals' run has its pref and starts its catch-up, every dollar to the GP: "the clawback owed starts to fall: on the fund's totals, LPs have their pref".
- **$800,000 to $1,000,000:** it falls a dollar a dollar, by $200,000, to $1,800,000.
- **$1,000,000:** the totals' catch-up is done, and its carry pays 20 cents a dollar: "the clawback owed falls more slowly: on the fund's totals, the GP has 20% of the profit".
- **$1,000,000 to $10,000,000:** it falls 20 cents a dollar, by $1,800,000, to 0, where X has the late call back. From $1,000,000 the entitlement is 0.20 × X.
- **Above:** X pays pref, then its catch-up, then 20%.
  - **Through X's pref:** the entitlement keeps growing and carry paid doesn't, so nothing is owed.
  - **Through X's catch-up:** carry paid grows a dollar a dollar and catches the entitlement at $11,000,000, owing nothing either side. That isn't a clawback breakpoint (FA8).
  - **From then on:** both grow 20 cents a dollar.

## Breakpoints

| X | Exact | Reasons |
|---:|---|---|
| 800,000.00 | 800000 | `clawback_changes`: "the clawback owed starts to fall: on the fund's totals, LPs have their pref" |
| 1,000,000.00 | 1000000 | `clawback_changes`: "the clawback owed falls more slowly: on the fund's totals, the GP has 20% of the profit" |
| 10,000,000.00 | 10000000 | `capital_returned`: "LPs have their $20,000,000 of paid-in capital back"; `clawback_cleared`: "from here the GP has earned all the carry it was paid earlier" |
| 10,800,000.00 | 10800000 | `pref_met`: "LPs have their 8% pref, $1,600,000" |
| 11,000,000.00 | 11000000 | `catch_up_done`: "the GP has 20% of the profit" |

## This distribution

| X | LP capital | LP pref | LP catch-up | LP carry tier | LPs | GP catch-up | GP carry 20% | GP |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 500,000.00 | 500,000.00 | 0.00 | 0.00 | 0.00 | 500,000.00 | 0.00 | 0.00 | 0.00 |
| 800,000.00 | 800,000.00 | 0.00 | 0.00 | 0.00 | 800,000.00 | 0.00 | 0.00 | 0.00 |
| 900,000.00 | 900,000.00 | 0.00 | 0.00 | 0.00 | 900,000.00 | 0.00 | 0.00 | 0.00 |
| 1,000,000.00 | 1,000,000.00 | 0.00 | 0.00 | 0.00 | 1,000,000.00 | 0.00 | 0.00 | 0.00 |
| 5,000,000.00 | 5,000,000.00 | 0.00 | 0.00 | 0.00 | 5,000,000.00 | 0.00 | 0.00 | 0.00 |
| 10,000,000.00 | 10,000,000.00 | 0.00 | 0.00 | 0.00 | 10,000,000.00 | 0.00 | 0.00 | 0.00 |
| 10,500,000.00 | 10,000,000.00 | 500,000.00 | 0.00 | 0.00 | 10,500,000.00 | 0.00 | 0.00 | 0.00 |
| 10,800,000.00 | 10,000,000.00 | 800,000.00 | 0.00 | 0.00 | 10,800,000.00 | 0.00 | 0.00 | 0.00 |
| 10,900,000.00 | 10,000,000.00 | 800,000.00 | 0.00 | 0.00 | 10,800,000.00 | 100,000.00 | 0.00 | 100,000.00 |
| 11,000,000.00 | 10,000,000.00 | 800,000.00 | 0.00 | 0.00 | 10,800,000.00 | 200,000.00 | 0.00 | 200,000.00 |
| 15,000,000.00 | 10,000,000.00 | 800,000.00 | 0.00 | 3,200,000.00 | 14,000,000.00 | 200,000.00 | 800,000.00 | 1,000,000.00 |

At $15,000,000, $4,000,000 is in the carry tier: 80% is $3,200,000 and 20% is $800,000.

## The fund to date

| X | Distributed | LP capital | LP pref | LP catch-up | LP carry tier | LPs | GP catch-up | GP carry 20% | GP |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | 20,000,000.00 | 10,000,000.00 | 800,000.00 | 0.00 | 7,200,000.00 | 18,000,000.00 | 200,000.00 | 1,800,000.00 | 2,000,000.00 |
| 500,000.00 | 20,500,000.00 | 10,500,000.00 | 800,000.00 | 0.00 | 7,200,000.00 | 18,500,000.00 | 200,000.00 | 1,800,000.00 | 2,000,000.00 |
| 800,000.00 | 20,800,000.00 | 10,800,000.00 | 800,000.00 | 0.00 | 7,200,000.00 | 18,800,000.00 | 200,000.00 | 1,800,000.00 | 2,000,000.00 |
| 900,000.00 | 20,900,000.00 | 10,900,000.00 | 800,000.00 | 0.00 | 7,200,000.00 | 18,900,000.00 | 200,000.00 | 1,800,000.00 | 2,000,000.00 |
| 1,000,000.00 | 21,000,000.00 | 11,000,000.00 | 800,000.00 | 0.00 | 7,200,000.00 | 19,000,000.00 | 200,000.00 | 1,800,000.00 | 2,000,000.00 |
| 5,000,000.00 | 25,000,000.00 | 15,000,000.00 | 800,000.00 | 0.00 | 7,200,000.00 | 23,000,000.00 | 200,000.00 | 1,800,000.00 | 2,000,000.00 |
| 10,000,000.00 | 30,000,000.00 | 20,000,000.00 | 800,000.00 | 0.00 | 7,200,000.00 | 28,000,000.00 | 200,000.00 | 1,800,000.00 | 2,000,000.00 |
| 10,500,000.00 | 30,500,000.00 | 20,000,000.00 | 1,300,000.00 | 0.00 | 7,200,000.00 | 28,500,000.00 | 200,000.00 | 1,800,000.00 | 2,000,000.00 |
| 10,800,000.00 | 30,800,000.00 | 20,000,000.00 | 1,600,000.00 | 0.00 | 7,200,000.00 | 28,800,000.00 | 200,000.00 | 1,800,000.00 | 2,000,000.00 |
| 10,900,000.00 | 30,900,000.00 | 20,000,000.00 | 1,600,000.00 | 0.00 | 7,200,000.00 | 28,800,000.00 | 300,000.00 | 1,800,000.00 | 2,100,000.00 |
| 11,000,000.00 | 31,000,000.00 | 20,000,000.00 | 1,600,000.00 | 0.00 | 7,200,000.00 | 28,800,000.00 | 400,000.00 | 1,800,000.00 | 2,200,000.00 |
| 15,000,000.00 | 35,000,000.00 | 20,000,000.00 | 1,600,000.00 | 0.00 | 10,400,000.00 | 32,000,000.00 | 400,000.00 | 2,600,000.00 | 3,000,000.00 |

## Clawback

| X | Carry paid | Entitlement | Owed |
|---:|---:|---:|---:|
| 0.00 | 2,000,000.00 | 0.00 | 2,000,000.00 |
| 500,000.00 | 2,000,000.00 | 0.00 | 2,000,000.00 |
| 800,000.00 | 2,000,000.00 | 0.00 | 2,000,000.00 |
| 900,000.00 | 2,000,000.00 | 100,000.00 | 1,900,000.00 |
| 1,000,000.00 | 2,000,000.00 | 200,000.00 | 1,800,000.00 |
| 5,000,000.00 | 2,000,000.00 | 1,000,000.00 | 1,000,000.00 |
| 10,000,000.00 | 2,000,000.00 | 2,000,000.00 | 0.00 |
| 10,500,000.00 | 2,000,000.00 | 2,100,000.00 | 0.00 |
| 10,800,000.00 | 2,000,000.00 | 2,160,000.00 | 0.00 |
| 10,900,000.00 | 2,100,000.00 | 2,180,000.00 | 0.00 |
| 11,000,000.00 | 2,200,000.00 | 2,200,000.00 | 0.00 |
| 15,000,000.00 | 3,000,000.00 | 3,000,000.00 | 0.00 |

- **The entitlement:** from $1,000,000 on, 20% of all the totals' profit, 0.20 × X. Before that, the catch-up's dollars: X − $800,000.
- **Between $10,000,000 and $11,000,000** the totals' run would give the GP more than it has. F12 is one way only, so nothing is added.
