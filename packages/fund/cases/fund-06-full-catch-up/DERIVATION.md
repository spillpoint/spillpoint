# Fund case 06, a full catch-up: derivation

The spec's example B. One $10,000,000 investment call on 2020-01-01; 8% simple pref, full catch-up (s = 1), 20% carry, no GP commitment. D is `as_of`, 2025-01-01, and X isn't final.

**The pref (F6).** From 2020-01-01 to 2025-01-01 is 1,827 days. Five years, two with leap days: 366 + 365 + 365 + 365 + 366.

10,000,000 × 0.08 × 1,827 ÷ 365 = 1,461,600,000 ÷ 365 = 292,320,000/73 = $4,004,383.561643…, which shows as **$4,004,383.56**.

**The catch-up (F8).** Once the pref is paid, the profit to date is the pref, and the GP has none of it. Each catch-up dollar goes all to the GP and adds a dollar of profit. It stops when the GP has 20% of the profit:

C = 0.20 × (4,004,383.56 + C), so C = 0.25 × 4,004,383.56 = 73,080,000/73 = $1,001,095.890410…

So C shows as $1,001,095.89: 20% of $5,005,479.45 of profit.

**X's tiers.**
- **Capital:** to $10,000,000.
- **Pref:** to 10,000,000 + 292,320,000/73 = 1,022,320,000/73 = $14,004,383.56.
- **Catch-up:** to 1,022,320,000/73 + 73,080,000/73 = 1,095,400,000/73 = $15,005,479.45.
- **Then 80/20.**

## Breakpoints

| X | Exact | Reasons |
|---:|---|---|
| 10,000,000.00 | 10000000 | `capital_returned`: "LPs have their $10,000,000 of paid-in capital back" |
| 14,004,383.56 | 1022320000/73 | `pref_met`: "LPs have their 8% pref, $4,004,383.56" |
| 15,005,479.45 | 1095400000/73 | `catch_up_done`: "the GP has 20% of the profit" |

## This distribution

| X | LP capital | LP pref | LP catch-up | LP carry tier | LPs | GP catch-up | GP carry 20% | GP |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10,000,000.00 | 10,000,000.00 | 0.00 | 0.00 | 0.00 | 10,000,000.00 | 0.00 | 0.00 | 0.00 |
| 12,000,000.00 | 10,000,000.00 | 2,000,000.00 | 0.00 | 0.00 | 12,000,000.00 | 0.00 | 0.00 | 0.00 |
| 14,004,383.56 | 10,000,000.00 | 4,004,383.56 | 0.00 | 0.00 | 14,004,383.56 | 0.00 | 0.00 | 0.00 |
| 14,500,000.00 | 10,000,000.00 | 4,004,383.56 | 0.00 | 0.00 | 14,004,383.56 | 495,616.44 | 0.00 | 495,616.44 |
| 15,005,479.45 | 10,000,000.00 | 4,004,383.56 | 0.00 | 0.00 | 14,004,383.56 | 1,001,095.89 | 0.00 | 1,001,095.89 |
| 20,000,000.00 | 10,000,000.00 | 4,004,383.56 | 0.00 | 3,995,616.44 | 18,000,000.00 | 1,001,095.89 | 998,904.11 | 2,000,000.00 |

- **At $14,500,000:** the catch-up has $14,500,000 − $14,004,383.5616… = $495,616.4384…, all to the GP. The LPs' share of a full catch-up is nothing.
- **At $20,000,000:** the carry tier has $20,000,000 − $15,005,479.4521… = $4,994,520.5479….
  - **The split:** 20% is $998,904.1096…, which shows as $998,904.11, and 80% is $3,995,616.4384…, which shows as $3,995,616.44.
  - **The GP's total** is exactly $2,000,000, 20% of the $10,000,000 profit. The LPs' total is exactly $18,000,000.

Nothing was distributed before X, so the fund to date is X itself.
