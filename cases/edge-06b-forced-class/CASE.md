# Edge case 6b: two series in one tier, forced class conversion

This is the same company as edge case 6a. One term changes: Seed-1 and Seed-2 **must convert together**, as when a class vote forces conversion (the `SPEC.md` toggle). In `inputs.json` this is `"conversion_groups": [["seed_1", "seed_2"]]`.

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

The group converts when converting pays its members more **in total** than keeping their preferences (`ASSUMPTIONS.md` E11).

Payouts are given at $2M, $4M, $8M, $12M, $16M, $20M, $25M, $30M and $40M, the same exit values as 6a.
