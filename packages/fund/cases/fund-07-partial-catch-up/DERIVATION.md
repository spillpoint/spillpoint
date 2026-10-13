# Fund case 07, a partial catch-up: derivation

Case 5 with a 50/50 catch-up (s = 0.5, above the 20% carry rate, F8). One $10,000,000 investment call on 2021-01-01, an 8% simple pref, 20% carry, no GP commitment. D is `as_of`, 2024-01-01, and X isn't final.

**The pref**, as in case 5: 1,095 days, so 10,000,000 × 0.08 × 1,095 ÷ 365 = **$2,400,000**.

**The catch-up (F8).**
- **Once the pref is paid,** the profit to date is $2,400,000 and the GP has none of it.
- **Each catch-up dollar** gives the GP $0.50 and the LPs $0.50, and adds a dollar of profit.
- **So each dollar** closes the gap between 20% of the profit and the GP's carry by 0.50 − 0.20 = 0.30.
- **The gap starts** at 0.20 × 2,400,000 = $480,000, so the catch-up runs 480,000 ÷ 0.30 = **$1,600,000**.
- **When it's done,** the GP has $800,000, 20% of the $4,000,000 profit.

**X's tiers.**
- **Capital:** to $10,000,000.
- **Pref:** to $12,400,000.
- **Catch-up:** to $14,000,000, half to each side.
- **Then 80/20.**

## Breakpoints

| X | Exact | Reasons |
|---:|---|---|
| 10,000,000.00 | 10000000 | `capital_returned`: "LPs have their $10,000,000 of paid-in capital back" |
| 12,400,000.00 | 12400000 | `pref_met`: "LPs have their 8% pref, $2,400,000" |
| 14,000,000.00 | 14000000 | `catch_up_done`: "the GP has 20% of the profit" |

## This distribution

| X | LP capital | LP pref | LP catch-up | LP carry tier | LPs | GP catch-up | GP carry 20% | GP |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10,000,000.00 | 10,000,000.00 | 0.00 | 0.00 | 0.00 | 10,000,000.00 | 0.00 | 0.00 | 0.00 |
| 12,400,000.00 | 10,000,000.00 | 2,400,000.00 | 0.00 | 0.00 | 12,400,000.00 | 0.00 | 0.00 | 0.00 |
| 13,000,000.00 | 10,000,000.00 | 2,400,000.00 | 300,000.00 | 0.00 | 12,700,000.00 | 300,000.00 | 0.00 | 300,000.00 |
| 14,000,000.00 | 10,000,000.00 | 2,400,000.00 | 800,000.00 | 0.00 | 13,200,000.00 | 800,000.00 | 0.00 | 800,000.00 |
| 18,000,000.00 | 10,000,000.00 | 2,400,000.00 | 800,000.00 | 3,200,000.00 | 16,400,000.00 | 800,000.00 | 800,000.00 | 1,600,000.00 |

- **At $13,000,000:** $600,000 is in the catch-up, half to each side.
- **At $18,000,000:** $4,000,000 is in the carry tier, 80% to the LPs and 20% to the GP. The GP's total, $1,600,000, is 20% of the $8,000,000 profit.

Nothing was distributed before X, so the fund to date is X itself.
