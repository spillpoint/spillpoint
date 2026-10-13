# Fund case 05, a hard hurdle: derivation

An 8% simple pref with no catch-up (F8), so carry is paid only on profit above the pref. One $10,000,000 investment call on 2021-01-01. 20% carry, no GP commitment. D is `as_of`, 2024-01-01, and X isn't final.

**The pref (F6).** From 2021-01-01 to 2024-01-01 is 365 + 365 + 365 = 1,095 days. 2024's leap day comes after D. On $10,000,000 at 8%, Actual/365:

10,000,000 × 0.08 × 1,095 ÷ 365 = 800,000 × 3 = **$2,400,000**.

**X's tiers.**
- **Capital:** $0 to $10,000,000, all to LPs.
- **Pref:** $10,000,000 to $12,400,000, all to LPs.
- **Carry:** above $12,400,000, 80% to the LPs and 20% to the GP.

Capital and pref both go 100% to the LPs, but each is a tier, so each end is a breakpoint (F15).

## Breakpoints

| X | Exact | Reasons |
|---:|---|---|
| 10,000,000.00 | 10000000 | `capital_returned`: "LPs have their $10,000,000 of paid-in capital back" |
| 12,400,000.00 | 12400000 | `pref_met`: "LPs have their 8% pref, $2,400,000" |

## This distribution

| X | LP capital | LP pref | LP carry tier | LPs | GP carry 20% | GP |
|---:|---:|---:|---:|---:|---:|---:|
| 10,000,000.00 | 10,000,000.00 | 0.00 | 0.00 | 10,000,000.00 | 0.00 | 0.00 |
| 11,000,000.00 | 10,000,000.00 | 1,000,000.00 | 0.00 | 11,000,000.00 | 0.00 | 0.00 |
| 12,400,000.00 | 10,000,000.00 | 2,400,000.00 | 0.00 | 12,400,000.00 | 0.00 | 0.00 |
| 20,000,000.00 | 10,000,000.00 | 2,400,000.00 | 6,080,000.00 | 18,480,000.00 | 1,520,000.00 | 1,520,000.00 |

At $20,000,000, $7,600,000 is above the pref: 80% is $6,080,000 and 20% is $1,520,000. The GP has 15.2% of the $10,000,000 profit, short of 20%, since there's no catch-up.

Nothing was distributed before X, so the fund to date is X itself.
