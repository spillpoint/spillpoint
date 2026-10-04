# Edge case 5a: two series, stacked

Edge case 5 isolates seniority. Variant **a** stacks the two series: **Series B is senior** and is paid in full before Series A gets anything. Variant 5b uses the same inputs with the two series pari passu.

| Holder | Security | Shares |
|---|---|---:|
| Founder A | Common | 6,000,000 |
| Founder B | Common | 2,000,000 |
| Investor X | Series A Preferred | 1,000,000 |
| Investor Y | Series B Preferred | 1,000,000 |

Series terms:
- **Series A Preferred:** original issue price $2.00, 1x non-participating, so a $2,000,000 preference.
- **Series B Preferred:** original issue price $4.00, 1x non-participating, so a $4,000,000 preference.
- Both convert 1:1, so each is 10% as converted.

There is no pool and there are no options. The exit range is $0 to $50M.

Seniority: Series B, then Series A.

Payouts are given at $3M, $4M, $5M, $6M, $10M, $22M, $30M, $40M and $50M, the same exit values as 5b.
