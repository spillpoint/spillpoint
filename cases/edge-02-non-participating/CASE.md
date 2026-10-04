# Edge case 2: one series, 1x non-participating

This isolates the conversion point of a non-participating preferred series. Edge cases 3 and 4 use the same company and change only the participation terms.

| Holder | Security | Shares |
|---|---|---:|
| Founder A | Common | 6,000,000 |
| Founder B | Common | 2,000,000 |
| Investor X | Seed Preferred | 1,500,000 |
| Investor Y | Seed Preferred | 500,000 |

Seed Preferred terms:
- original issue price $1.50, so $3,000,000 was invested
- 1x preference, non-participating
- conversion 1:1, so the series is 20% as converted

There is no pool and there are no options. The exit range is $0 to $60M. Payouts are given at $1M, $3M, $5M, $15M, $20M, $33M, $40M, $45M and $60M. These are the same exit values as edge cases 3 and 4, so the three can be compared side by side.
