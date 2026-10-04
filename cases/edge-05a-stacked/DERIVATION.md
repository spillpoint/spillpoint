# Edge case 5a: derivation

## Breakpoints

| Exit value | Why |
|---:|---|
| $4,000,000 | Series B's $4M preference is fully paid. Below this, Series B takes every dollar; above it, Series A's preference starts filling. |
| $6,000,000 | Series A's $2M preference is fully paid ($4M + $2M). Common starts receiving the residual. |
| $22,000,000 | Series A converts. With Series B still taking $4M, common is worth (exit − $4M) ÷ 9,000,000 per share once Series A converts. That reaches Series A's $2.00 per-share preference at exit = $22M. |
| $40,000,000 | Series B converts. With everything converted, each share is worth exit ÷ 10,000,000, which reaches Series B's $4.00 per-share preference at $40M. |

The low-exit picture is what this case is about. At $3M, Series B takes all $3M and Series A gets nothing. At $5M, Series B has its $4M and Series A has $1M.

## Payouts

| Exit | Founder A | Founder B | Investor X | Investor Y |
|---:|---:|---:|---:|---:|
| $3M | 0 | 0 | 0 | 3,000,000 |
| $4M | 0 | 0 | 0 | 4,000,000 |
| $5M | 0 | 0 | 1,000,000 | 4,000,000 |
| $6M | 0 | 0 | 2,000,000 | 4,000,000 |
| $10M | 3,000,000 | 1,000,000 | 2,000,000 | 4,000,000 |
| $22M | 12,000,000 | 4,000,000 | 2,000,000 | 4,000,000 |
| $30M | 17,333,333.33 | 5,777,777.78 | 2,888,888.89 | 4,000,000 |
| $40M | 24,000,000 | 8,000,000 | 4,000,000 | 4,000,000 |
| $50M | 30,000,000 | 10,000,000 | 5,000,000 | 5,000,000 |

At $30M, Series A has converted: ($30M − $4M) ÷ 9M = $2.8889 per share. Investor X gets $2,888,888.89 and the founders get 8M shares' worth. Series B is still on its $4M preference, because $30M ÷ 10M = $3.00 per share is less than its $4.00.

Above $6M, payouts are identical to edge case 5b. Seniority only matters while the preferences aren't fully covered.
