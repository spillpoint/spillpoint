# Edge case 4: derivation

Seed Preferred takes its $3M preference, then participates at 20% of the residual. That continues until preference plus participation reaches the **$9M cap** (3 × $1.50 × 2,000,000 shares). After that its payout is flat, until converting to common (20% of the exit) beats $9M.

## Breakpoints

| Exit value | Why |
|---:|---|
| $3,000,000 | The preference is fully paid; participation starts. |
| $33,000,000 | The cap is reached: $3M + 20% × ($33M − $3M) = $3M + $6M = $9M. Above this, Seed Preferred is flat at $9M and common takes every extra dollar. |
| $45,000,000 | Seed Preferred converts: 20% × $45M = $9M equals the cap. Above this, converting pays more. |

The slopes for Seed Preferred are 1, then 0.2, then 0 (in the dead zone), then 0.2 again. For common they are 0, then 0.8, then 1, then 0.8.

## Payouts

| Exit | Founder A | Founder B | Investor X | Investor Y | Seed decision |
|---:|---:|---:|---:|---:|---|
| $1M | 0 | 0 | 750,000 | 250,000 | keeps preference |
| $3M | 0 | 0 | 2,250,000 | 750,000 | keeps preference |
| $5M | 1,200,000 | 400,000 | 2,550,000 | 850,000 | keeps preference |
| $15M | 7,200,000 | 2,400,000 | 4,050,000 | 1,350,000 | keeps preference |
| $20M | 10,200,000 | 3,400,000 | 4,800,000 | 1,600,000 | keeps preference |
| $33M | 18,000,000 | 6,000,000 | 6,750,000 | 2,250,000 | keeps preference (at the cap) |
| $40M | 23,250,000 | 7,750,000 | 6,750,000 | 2,250,000 | keeps preference (capped) |
| $45M | 27,000,000 | 9,000,000 | 6,750,000 | 2,250,000 | indifferent; shown as keeping it |
| $60M | 36,000,000 | 12,000,000 | 9,000,000 | 3,000,000 | converts |

- **Up to $33M**, the payouts match edge case 3 (uncapped participating).
- **From $33M to $45M** is the dead zone. Seed Preferred stays at $9M, so at $40M common gets $40M − $9M = $31M, split 6:2.
- **Above $45M**, the payouts match edge case 2 (non-participating, converted): everyone shares by shares.

At exactly $45M, converting and keeping the capped payout pay the same. The case shows the series keeping its preference (`ASSUMPTIONS.md` E5), and the payouts are identical either way.
