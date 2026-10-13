# Fund case 01, one call: derivation

One $5,000,000 investment call on 2022-03-01 and 20% carry, nothing else. D is `as_of`, 2026-03-01. There's no pref, no catch-up and no GP commitment, and X isn't final.

**Paid in.** With no GP commitment, the LPs pay every call in full (F3): $5,000,000.

**The tiers.** Nothing has been distributed, so X starts at tier 1.
- **Capital (F5):** the first $5,000,000 returns the LPs' paid-in capital.
- **Carry (F9):** above it, 80% to the LPs and 20% to the GP.

## Breakpoints

| X | Exact | Reasons |
|---:|---|---|
| 5,000,000.00 | 5000000 | `capital_returned`: "LPs have their $5,000,000 of paid-in capital back" |

## This distribution

| X | LP capital | LP carry tier | LPs | GP carry 20% | GP |
|---:|---:|---:|---:|---:|---:|
| 2,000,000.00 | 2,000,000.00 | 0.00 | 2,000,000.00 | 0.00 | 0.00 |
| 5,000,000.00 | 5,000,000.00 | 0.00 | 5,000,000.00 | 0.00 | 0.00 |
| 12,500,000.00 | 5,000,000.00 | 6,000,000.00 | 11,000,000.00 | 1,500,000.00 | 1,500,000.00 |

At $12,500,000, $7,500,000 is above capital: 80% of it, $6,000,000, goes to the LPs and 20%, $1,500,000, to the GP.

Nothing was distributed before X, so the fund to date is X itself.
