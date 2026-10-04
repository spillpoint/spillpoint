# Edge case 9: derivation

## The accrued dividend

Day count is Actual/365 (`ASSUMPTIONS.md` X2): the actual number of days from 2022-03-31 to 2026-03-31, divided by 365. That is 1,461 days, not 1,460, because the period includes 29 February 2024.

| | |
|---|---:|
| Days | 1,461 |
| Per share | $1.50 × 8% × 1,461 ÷ 365 = **$0.480329** (exactly 4,383/9,125) |
| Total, 2,000,000 shares | **$960,657.53** |
| Preference: $3,000,000 + dividends | **$3,960,657.53** |

The 1x multiple applies to the original issue price only, and the dividends are added on top at 1x (`ASSUMPTIONS.md` X4). A plain 4 × 8% = 32% would give $960,000; the leap day adds $657.53.

## Breakpoints

| Exit value | Why |
|---:|---|
| $3,960,657.53 | The preference, dividends included, is fully paid. Below this, every dollar goes to Seed, split 3:1 between X and Y. |
| $19,803,287.67 | Seed converts. As common it gets 20% of the exit, which beats $3,960,657.53 once the exit passes 5 × that amount. Converting forfeits the dividends, so they only push the conversion point out. Without them (edge case 2) it was $15M. |

## Payouts

| Exit | Founder A | Founder B | Investor X | Investor Y | Seed decision |
|---:|---:|---:|---:|---:|---|
| $1M | 0 | 0 | 750,000 | 250,000 | keeps preference |
| $3M | 0 | 0 | 2,250,000 | 750,000 | keeps preference |
| $3.96M | 0 | 0 | 2,970,493.15 | 990,164.38 | keeps preference |
| $4M | 29,506.85 | 9,835.62 | 2,970,493.15 | 990,164.38 | keeps preference |
| $5M | 779,506.85 | 259,835.62 | 2,970,493.15 | 990,164.38 | keeps preference |
| $15M | 8,279,506.85 | 2,759,835.62 | 2,970,493.15 | 990,164.38 | keeps preference |
| $19M | 11,279,506.85 | 3,759,835.62 | 2,970,493.15 | 990,164.38 | keeps preference |
| $19.8M | 11,881,972.60 | 3,960,657.53 | 2,970,493.15 | 990,164.38 | keeps preference |
| $20M | 12,000,000 | 4,000,000 | 3,000,000 | 1,000,000 | converts (dividends forfeited) |
| $40M | 24,000,000 | 8,000,000 | 6,000,000 | 2,000,000 | converts (dividends forfeited) |
| $60M | 36,000,000 | 12,000,000 | 9,000,000 | 3,000,000 | converts (dividends forfeited) |

## Compared with edge case 2 (no dividend)

- **Below $3.96M:** identical, since Seed takes everything either way.
- **$3.96M to $19.8M:** Seed holds $960,657.53 more than in edge case 2, and common holds that much less. At $15M the founders get $11,039,342.47 here, against $12,000,000.
- **Above $19.8M:** identical again. Seed has converted, the dividends are gone, and everyone shares 80% / 20%.

The dividends never show up in a converted payout. They matter only in the band where Seed is better off keeping its preference, and they widen that band.
