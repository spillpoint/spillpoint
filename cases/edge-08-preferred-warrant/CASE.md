# Edge case 8: a warrant for preferred

This isolates a warrant whose underlying is a preferred series rather than common. Once exercised, the warrant's shares **are** Seed Preferred: they carry Seed's $1.00 per-share preference and its conversion right, even though the warrant cost only $0.50 a share (`ASSUMPTIONS.md` E12).

| Holder | Security | Shares |
|---|---|---:|
| Founder A | Common | 6,000,000 |
| Founder B | Common | 2,000,000 |
| Investor X | Seed Preferred | 2,000,000 |
| Lender L | Warrant for Seed Preferred, $0.50 strike | 200,000 |

Seed Preferred terms: original issue price $1.00, 1x non-participating, so a $2,000,000 preference before the warrant. It converts 1:1. The warrant is fully vested.

The exit range is $0 to $20M. Payouts are given at $0.5M, $1M, $1.5M, $2.1M, $5M, $10.1M, $15M and $20M.
