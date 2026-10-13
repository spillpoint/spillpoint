# Fund case 12, an SPV: derivation

An SPV: one company, a $2,000,000 investment and a $40,000 setup fee on 2023-05-01, and 20% carry. No pref, no GP commitment. D is `as_of`, 2026-05-01. The exit is the final distribution, and NAV is $6,000,000.

**Paid in.** The investment and the fee: $2,040,000 (F5).

**X's tiers.** Capital to $2,040,000, then 80/20.

**The clawback (F12).**
- **The run on the fund's totals** has the same capital and the same amount, X, as X's own run, since nothing was distributed before.
- **So** the entitlement is the carry X pays at every X, and nothing is ever owed.
- **No breakpoint:** the clawback never bends, so it adds none (FA8).

## Breakpoints

| X | Exact | Reasons |
|---:|---|---|
| 2,040,000.00 | 2040000 | `capital_returned`: "LPs have their $2,040,000 of paid-in capital back" |

## This distribution

| X | LP capital | LP carry tier | LPs | GP carry 20% | GP |
|---:|---:|---:|---:|---:|---:|
| 1,000,000.00 | 1,000,000.00 | 0.00 | 1,000,000.00 | 0.00 | 0.00 |
| 2,040,000.00 | 2,040,000.00 | 0.00 | 2,040,000.00 | 0.00 | 0.00 |
| 6,000,000.00 | 2,040,000.00 | 3,168,000.00 | 5,208,000.00 | 792,000.00 | 792,000.00 |
| 10,000,000.00 | 2,040,000.00 | 6,368,000.00 | 8,408,000.00 | 1,592,000.00 | 1,592,000.00 |

- **At NAV, $6,000,000:** $3,960,000 is above capital. 20% is $792,000 and 80% is $3,168,000.
- **At $10,000,000:** $7,960,000 is above capital. 20% is $1,592,000 and 80% is $6,368,000.

Nothing was distributed before X, so the fund to date is X itself.

## Clawback

| X | Carry paid | Entitlement | Owed |
|---:|---:|---:|---:|
| 1,000,000.00 | 0.00 | 0.00 | 0.00 |
| 2,040,000.00 | 0.00 | 0.00 | 0.00 |
| 6,000,000.00 | 792,000.00 | 792,000.00 | 0.00 |
| 10,000,000.00 | 1,592,000.00 | 1,592,000.00 | 0.00 |
