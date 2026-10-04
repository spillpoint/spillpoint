# Edge case 6a: derivation

Each series converts once its slice of common beats its own per-share preference: $1.00 for Seed-1 and $3.00 for Seed-2. Because Seed-1's bar is lower, it converts much earlier.

## Breakpoints

| Exit value | Why |
|---:|---|
| $4,000,000 | The tier ($1M + $3M) is fully paid. Below this, every dollar is split 1:3 by preference amount. |
| $12,000,000 | Seed-1 converts. With Seed-2 still taking $3M, a converted Seed-1 share is worth (exit − $3M) ÷ 9,000,000, which reaches $1.00 at $12M. |
| $30,000,000 | Seed-2 converts. With everything converted, a share is worth exit ÷ 10,000,000, which reaches $3.00 at $30M. |

## Payouts

| Exit | Founder A | Founder B | Investor X | Investor Y | Decisions |
|---:|---:|---:|---:|---:|---|
| $2M | 0 | 0 | 500,000 | 1,500,000 | seed_1: keeps preference, seed_2: keeps preference |
| $4M | 0 | 0 | 1,000,000 | 3,000,000 | seed_1: keeps preference, seed_2: keeps preference |
| $8M | 3,000,000 | 1,000,000 | 1,000,000 | 3,000,000 | seed_1: keeps preference, seed_2: keeps preference |
| $12M | 6,000,000 | 2,000,000 | 1,000,000 | 3,000,000 | seed_1: keeps preference, seed_2: keeps preference |
| $16M | 8,666,666.67 | 2,888,888.89 | 1,444,444.44 | 3,000,000 | seed_1: converts, seed_2: keeps preference |
| $20M | 11,333,333.33 | 3,777,777.78 | 1,888,888.89 | 3,000,000 | seed_1: converts, seed_2: keeps preference |
| $25M | 14,666,666.67 | 4,888,888.89 | 2,444,444.44 | 3,000,000 | seed_1: converts, seed_2: keeps preference |
| $30M | 18,000,000 | 6,000,000 | 3,000,000 | 3,000,000 | seed_1: converts, seed_2: keeps preference |
| $40M | 24,000,000 | 8,000,000 | 4,000,000 | 4,000,000 | seed_1: converts, seed_2: converts |

Between $12M and $30M, Seed-1 rides common while Seed-2 sits on its $3M preference. At $20M, Investor X gets ($20M − $3M) ÷ 9M × 1M = $1,888,888.89.
