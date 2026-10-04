# Edge case 6b: derivation

The group compares two totals:
- keeping both preferences: $1M + $3M = **$4M**
- converting both: 2,000,000 of 10,000,000 shares, or **20% of the exit**

20% × exit = $4M at **exit = $20M**.

## Breakpoints

| Exit value | Why |
|---:|---|
| $4,000,000 | The tier is fully paid, exactly as in 6a. |
| $20,000,000 | The group converts. **Payouts jump here instead of bending:** below $20M, Seed-1 has $1M and Seed-2 has $3M; just above, each has $2M. The group's total is $4M either way, so the group is indifferent at exactly $20M. Both outcomes are stable there, and both are reported (`ASSUMPTIONS.md` E13). |

The common shareholders' payout does not jump. Founders get $16M either way at $20M, because the group's total is unchanged.

## Payouts

| Exit | Founder A | Founder B | Investor X | Investor Y | Decisions |
|---:|---:|---:|---:|---:|---|
| $2M | 0 | 0 | 500,000 | 1,500,000 | seed_1+seed_2: keeps preference |
| $4M | 0 | 0 | 1,000,000 | 3,000,000 | seed_1+seed_2: keeps preference |
| $8M | 3,000,000 | 1,000,000 | 1,000,000 | 3,000,000 | seed_1+seed_2: keeps preference |
| $12M | 6,000,000 | 2,000,000 | 1,000,000 | 3,000,000 | seed_1+seed_2: keeps preference |
| $16M | 9,000,000 | 3,000,000 | 1,000,000 | 3,000,000 | seed_1+seed_2: keeps preference |
| $20M (outcome 1) | 12,000,000 | 4,000,000 | 1,000,000 | 3,000,000 | seed_1+seed_2: keeps preference |
| $20M (outcome 2) | 12,000,000 | 4,000,000 | 2,000,000 | 2,000,000 | seed_1+seed_2: converts |
| $25M | 15,000,000 | 5,000,000 | 2,500,000 | 2,500,000 | seed_1+seed_2: converts |
| $30M | 18,000,000 | 6,000,000 | 3,000,000 | 3,000,000 | seed_1+seed_2: converts |
| $40M | 24,000,000 | 8,000,000 | 4,000,000 | 4,000,000 | seed_1+seed_2: converts |

## Compared with 6a

- **$12M to $20M:** Seed-1 would convert on its own (6a), but it is held to its $1M preference. That leaves more for common: at $16M the founders get $12M here, against $11,555,555.56 in 6a.
- **$20M to $30M:** Seed-2 is pulled into converting before it would choose to. At $25M it gets $2.5M instead of its $3M preference, and Seed-1 gets $2.5M instead of $2,444,444.44.
- **Above $30M:** both cases agree, since both series would convert anyway.

Under the total-payout rule, Seed-2 is outvoted by economics, not by votes. If the group instead decided by majority vote, with each holder voting its own interest, the answer would depend on who holds the majority. That is listed as an open question in the review note.
