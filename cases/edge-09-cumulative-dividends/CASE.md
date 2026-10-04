# Edge case 9: cumulative dividends

This isolates cumulative dividends: they accrue, add to the preference, and are forfeited if the series converts. The company is the same as edge case 2; the only change is the dividend.

| Holder | Security | Shares |
|---|---|---:|
| Founder A | Common | 6,000,000 |
| Founder B | Common | 2,000,000 |
| Investor X | Seed Preferred | 1,500,000 |
| Investor Y | Seed Preferred | 500,000 |

Seed Preferred terms:
- original issue price $1.50, 1x non-participating, conversion 1:1, so 20% as converted
- **cumulative dividend:** 8% a year on the original issue price, simple interest, accruing from **2022-03-31**, none ever paid
- on conversion, accrued dividends are **forfeited** (the `SPEC.md` default)

**Exit date: 2026-03-31.** The exit range is $0 to $60M. Payouts are given at $1M, $3M, $4M, $5M, $15M, $19M, $20M, $40M and $60M.
