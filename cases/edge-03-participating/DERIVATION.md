# Edge case 3: derivation

Participating preferred takes its preference **and then** shares in what's left as if converted. With no cap, converting could only lose it the preference, so it never converts (`SPEC.md`). The exit decisions are therefore empty in `expected.json`.

- Seed Preferred: $3,000,000 + 20% × (exit − $3,000,000)
- Common: 80% × (exit − $3,000,000), split 6:2 between the founders

Below $3M, everything goes to Seed Preferred.

## Breakpoints

| Exit value | Why |
|---:|---|
| $3,000,000 | The preference is fully paid. Above this, the residual is shared 80% / 20%. |

That is the only one. Above $3M the slopes stay fixed at 0.8 for common and 0.2 for Seed Preferred, all the way to $60M.

## Payouts

| Exit | Founder A | Founder B | Investor X | Investor Y |
|---:|---:|---:|---:|---:|
| $1M | 0 | 0 | 750,000 | 250,000 |
| $3M | 0 | 0 | 2,250,000 | 750,000 |
| $5M | 1,200,000 | 400,000 | 2,550,000 | 850,000 |
| $15M | 7,200,000 | 2,400,000 | 4,050,000 | 1,350,000 |
| $20M | 10,200,000 | 3,400,000 | 4,800,000 | 1,600,000 |
| $33M | 18,000,000 | 6,000,000 | 6,750,000 | 2,250,000 |
| $40M | 22,200,000 | 7,400,000 | 7,800,000 | 2,600,000 |
| $45M | 25,200,000 | 8,400,000 | 8,550,000 | 2,850,000 |
| $60M | 34,200,000 | 11,400,000 | 10,800,000 | 3,600,000 |

Example at $20M: Seed takes $3M first, then 20% of the remaining $17M ($3.4M), for $6.4M in total, split 3:1 between X and Y. Common takes 80% of $17M = $13.6M.

Compared with edge case 2, the founders get $2.4M less at $20M and still $2.4M less at $60M. Participation without a cap costs common 80% of the $3M preference at every exit above $3M.
