# Edge case 6a: two series in one tier, per-series conversion

Edge case 6 isolates how conversion works when two non-participating series in the same tier have **different per-share preferences**. In variant **a**, each series decides on its own whether to convert (the `SPEC.md` default). Variants 6b and 6c use the same inputs, but the two series must convert together by a class vote (more than 50% in 6b, at least 50% in 6c).

| Holder | Security | Shares |
|---|---|---:|
| Founder A | Common | 6,000,000 |
| Founder B | Common | 2,000,000 |
| Investor X | Seed-1 Preferred | 1,000,000 |
| Investor Y | Seed-2 Preferred | 1,000,000 |

Series terms:
- **Seed-1 Preferred:** original issue price $1.00, 1x non-participating, so a $1,000,000 preference.
- **Seed-2 Preferred:** original issue price $3.00, 1x non-participating, so a $3,000,000 preference.
- Both convert 1:1 and sit in one tier, pari passu.

There is no pool and there are no options. The exit range is $0 to $40M.

Payouts are given at $2M, $4M, $8M, $12M, $16M, $20M, $25M, $30M and $40M, the same exit values as 6b.
