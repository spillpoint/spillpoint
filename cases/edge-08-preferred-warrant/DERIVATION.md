# Edge case 8: derivation

If Lender L exercises, it pays $100,000 (200,000 × $0.50), which joins the proceeds. In return it gets 200,000 Seed Preferred shares, so Seed's preference grows to $2,200,000 across 2,200,000 shares.

## Breakpoints

| Exit value | Why |
|---:|---|
| $1,000,000 | The warrant comes into the money. Below Seed's full preference, Seed takes all proceeds, so after exercise each Seed share gets (exit + $100k) ÷ 2,200,000. That beats the $0.50 strike once exit > $1M. Lender L's net payout is zero at $1M and grows above it. |
| $2,100,000 | Seed Preferred's enlarged preference ($2.2M) is fully paid: exit + $100k of strike cash = $2.2M. Common starts receiving the residual. |
| $10,100,000 | Seed Preferred converts, warrant shares included. Converted, a share is worth (exit + $100k) ÷ 10,200,000, which beats the $1.00 per-share preference once exit > $10.1M. |

## Payouts

| Exit | Founder A | Founder B | Investor X | Lender L | Decisions |
|---:|---:|---:|---:|---:|---|
| $500k | 0 | 0 | 500,000 | 0 | seed: keeps preference, warrant_seed: not exercised |
| $1M | 0 | 0 | 1,000,000 | 0 | seed: keeps preference, warrant_seed: not exercised |
| $1.5M | 0 | 0 | 1,454,545.45 | 45,454.55 | seed: keeps preference, warrant_seed: exercised |
| $2.1M | 0 | 0 | 2,000,000 | 100,000 | seed: keeps preference, warrant_seed: exercised |
| $5M | 2,175,000 | 725,000 | 2,000,000 | 100,000 | seed: keeps preference, warrant_seed: exercised |
| $10.1M | 6,000,000 | 2,000,000 | 2,000,000 | 100,000 | seed: keeps preference, warrant_seed: exercised |
| $15M | 8,882,352.94 | 2,960,784.31 | 2,960,784.31 | 196,078.43 | seed: converts, warrant_seed: exercised |
| $20M | 11,823,529.41 | 3,941,176.47 | 3,941,176.47 | 294,117.65 | seed: converts, warrant_seed: exercised |

- **At $1.5M:** proceeds are $1.6M including strike cash, all to Seed's 2.2M shares. Lender L gets 200k/2.2M × $1.6M = $145,454.55, less the $100k strike, for **$45,454.55 net**. Investor X gets $1,454,545.45. Without the warrant, X would have had all $1.5M, so the warrant cost X $45,454.55.
- **Between $2.1M and $10.1M:** Lender L nets a flat $100,000 ($200k of preference less $100k of strike).
- **At $20M:** everyone is common at ($20M + $0.1M) ÷ 10.2M = $1.9706 per share. Lender L nets 200,000 × $1.9706 − $100,000 = $294,117.65.
