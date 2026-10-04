# Edge case 2: derivation

Seed Preferred is non-participating, so it takes **one** of two payouts, whichever is larger:
- its preference: 2,000,000 × $1.50 × 1 = **$3,000,000**
- converting to common: 20% of the exit value (2,000,000 of 10,000,000 shares)

Investor X and Investor Y split whatever the series gets 3:1, by shares.

## Breakpoints

| Exit value | Why |
|---:|---|
| $3,000,000 | The preference is fully paid. Below this, every dollar goes to Seed Preferred. Above it, the next dollar goes to common. |
| $15,000,000 | Seed Preferred converts. 20% × $15M = $3M equals its preference. Above this, 20% of the exit beats $3M. |

Between $3M and $15M, Seed Preferred is flat at $3M and common takes 100% of each extra dollar. Above $15M, everyone shares by shares (80% / 20%). So common's slope goes from 0 to 1 at $3M and from 1 to 0.8 at $15M. Seed's slope goes from 1 to 0 at $3M and from 0 to 0.2 at $15M.

## Payouts

| Exit | Founder A | Founder B | Investor X | Investor Y | Seed decision |
|---:|---:|---:|---:|---:|---|
| $1M | 0 | 0 | 750,000 | 250,000 | keeps preference |
| $3M | 0 | 0 | 2,250,000 | 750,000 | keeps preference |
| $5M | 1,500,000 | 500,000 | 2,250,000 | 750,000 | keeps preference |
| $15M | 9,000,000 | 3,000,000 | 2,250,000 | 750,000 | indifferent; shown as keeping it |
| $20M | 12,000,000 | 4,000,000 | 3,000,000 | 1,000,000 | converts |
| $33M | 19,800,000 | 6,600,000 | 4,950,000 | 1,650,000 | converts |
| $40M | 24,000,000 | 8,000,000 | 6,000,000 | 2,000,000 | converts |
| $45M | 27,000,000 | 9,000,000 | 6,750,000 | 2,250,000 | converts |
| $60M | 36,000,000 | 12,000,000 | 9,000,000 | 3,000,000 | converts |

At exactly $15M, converting and keeping the preference pay the same, so both are stable. The case shows the series keeping its preference (`ASSUMPTIONS.md` E5), and the payouts are identical either way.

Below $3M the common gets nothing. At $5M, common's $2M splits 6:2 between the founders.
