# Edge case 10: a management carve-out

This isolates a management carve-out: a slice of the exit value paid to named people **before any preference** (the `SPEC.md` default). It is tiered, so it has tiers that start and end.

| Holder | Security | Shares |
|---|---|---:|
| Founder A | Common | 4,500,000 |
| Founder B | Common | 1,500,000 |
| Investor X | Series A Preferred | 4,000,000 |
| Manager M | (no equity) | — |

Series A Preferred: original issue price $2.50, 1x non-participating, so a $10,000,000 preference. It converts 1:1, so it is 40% as converted.

**Carve-out plan:**

| Tier | Exit value | Carve-out rate |
|---|---|---:|
| 1 | $0 to $10,000,000 | 10% |
| 2 | $10,000,000 to $20,000,000 | 5% |
| (none) | above $20,000,000 | 0% |

The tiers are **marginal**, like tax brackets: each rate applies only to the slice of exit value inside its tier (`ASSUMPTIONS.md` X6). The pool is split **60% to Founder A, 40% to Manager M**. Founder A also keeps their common stock; Manager M has no equity.

The exit range is $0 to $50M. Payouts are given at $5M, $10M, $11M, $15M, $20M, $25M, $26.5M, $30M and $50M.
