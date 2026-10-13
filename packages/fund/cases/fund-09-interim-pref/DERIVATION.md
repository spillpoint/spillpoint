# Fund case 09, an interim pref: derivation

An 8% simple pref and a full catch-up, with two interim distributions and a fee call between them. The pref accrues on a balance that rises and falls (F6). 20% carry, no GP commitment. D is `as_of`, 2025-07-01, and X isn't final.

**Paid in.** $6,000,000 on 2021-01-01, $4,000,000 on 2022-01-01, and a $500,000 fee on 2023-07-01: $10,500,000.

**The earlier distributions, in date order (F1, F4).**
- **2023-01-01, $3,000,000.** The LPs have $10,000,000 out, so all of it is capital (F5 before F6). $7,000,000 is still out. The pref accrued so far, $1,280,000, goes unpaid.
- **2023-07-01, the $500,000 fee call.** $7,500,000 is out.
- **2024-07-01, $9,000,000.** Capital first: $7,500,000, and all of it is back. Then $1,500,000 of pref, against the $2,159,342.47 accrued by then (below).

**The pref, Actual/365 on the LPs' unreturned capital (F6).**

| From | To | Days | Unreturned capital | Pref |
|---|---|---:|---:|---:|
| 2021-01-01 | 2022-01-01 | 365 | 6,000,000 | 480,000.00 |
| 2022-01-01 | 2023-01-01 | 365 | 10,000,000 | 800,000.00 |
| 2023-01-01 | 2023-07-01 | 181 | 7,000,000 | 277,698.63 |
| 2023-07-01 | 2024-07-01 | 366 | 7,500,000 | 601,643.84 |
| 2024-07-01 | 2025-07-01 | 365 | 0 | 0.00 |
| | | | **Accrued to D** | **2,159,342.47** |

- **181 days:** January to June 2023, 31 + 28 + 31 + 30 + 31 + 30.
- **366 days:** the year to 2024-07-01 includes 2024-02-29.
- **The two fractional lines:**
  - 560,000 × 181 ÷ 365 = $277,698.630136…
  - 600,000 × 366 ÷ 365 = $601,643.835616…
- **Exactly,** the pref to D is 157,632,000/73 = $2,159,342.465753…
- **After the $1,500,000 paid,** $659,342.465753… is owed: 48,132,000/73.

**X's tiers.**
- **Capital:** nothing. It was all back before X, so it isn't a breakpoint (FA7).
- **Pref:** to $659,342.47.
- **Catch-up:**
  - **Where it starts:** the profit to date is all pref, $2,159,342.47, and the GP has none of it.
  - **Its length:** a full catch-up runs a quarter of that, 39,408,000/73 = $539,835.616438….
  - **Where it ends:** at 87,540,000/73 = $1,199,178.08.
- **Then 80/20.**

## Breakpoints

| X | Exact | Reasons |
|---:|---|---|
| 659,342.47 | 48132000/73 | `pref_met`: "LPs have their 8% pref, $2,159,342.47" |
| 1,199,178.08 | 87540000/73 | `catch_up_done`: "the GP has 20% of the profit" |

The pref named is all the pref to D, not just X's part (FA4).

## This distribution

| X | LP capital | LP pref | LP catch-up | LP carry tier | LPs | GP catch-up | GP carry 20% | GP |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 500,000.00 | 0.00 | 500,000.00 | 0.00 | 0.00 | 500,000.00 | 0.00 | 0.00 | 0.00 |
| 659,342.47 | 0.00 | 659,342.47 | 0.00 | 0.00 | 659,342.47 | 0.00 | 0.00 | 0.00 |
| 1,000,000.00 | 0.00 | 659,342.47 | 0.00 | 0.00 | 659,342.47 | 340,657.53 | 0.00 | 340,657.53 |
| 1,199,178.08 | 0.00 | 659,342.47 | 0.00 | 0.00 | 659,342.47 | 539,835.62 | 0.00 | 539,835.62 |
| 3,000,000.00 | 0.00 | 659,342.47 | 0.00 | 1,440,657.53 | 2,100,000.00 | 539,835.62 | 360,164.38 | 900,000.00 |

At $3,000,000 the carry tier has $1,800,821.917808….
- **The split:** 20% is $360,164.38 and 80% is $1,440,657.53.
- **The totals:** the LPs have exactly $2,100,000 and the GP $900,000.

## The fund to date

Before X: $10,500,000 of capital and $1,500,000 of pref, $12,000,000 distributed.

| X | Distributed | LP capital | LP pref | LP catch-up | LP carry tier | LPs | GP catch-up | GP carry 20% | GP |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 500,000.00 | 12,500,000.00 | 10,500,000.00 | 2,000,000.00 | 0.00 | 0.00 | 12,500,000.00 | 0.00 | 0.00 | 0.00 |
| 659,342.47 | 12,659,342.47 | 10,500,000.00 | 2,159,342.47 | 0.00 | 0.00 | 12,659,342.47 | 0.00 | 0.00 | 0.00 |
| 1,000,000.00 | 13,000,000.00 | 10,500,000.00 | 2,159,342.47 | 0.00 | 0.00 | 12,659,342.47 | 340,657.53 | 0.00 | 340,657.53 |
| 1,199,178.08 | 13,199,178.08 | 10,500,000.00 | 2,159,342.47 | 0.00 | 0.00 | 12,659,342.47 | 539,835.62 | 0.00 | 539,835.62 |
| 3,000,000.00 | 15,000,000.00 | 10,500,000.00 | 2,159,342.47 | 0.00 | 1,440,657.53 | 14,100,000.00 | 539,835.62 | 360,164.38 | 900,000.00 |

At $3,000,000 the fund has distributed $15,000,000 on $10,500,000 paid in, so $4,500,000 of profit. The GP's $900,000 is 20% of it.
