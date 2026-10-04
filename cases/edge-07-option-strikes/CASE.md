# Edge case 7: options at several strikes

This isolates option exercise: each strike class comes into the money at its own exit value, and its strike cash joins the proceeds. There is no preferred stock, so the thresholds are easy to see.

| Holder | Security | Shares |
|---|---|---:|
| Founder A | Common | 6,000,000 |
| Founder B | Common | 2,000,000 |
| Employee C | Options, $0.25 strike | 400,000 |
| Employee C | Options, $3.00 strike | 200,000 |
| Employee D | Options, $1.00 strike | 600,000 |
| Employee E | Options, $3.00 strike | 800,000 |

All options are fully vested. Employee C holds two grants, which are reported as two lines. The exit range is $0 to $50M. Payouts are given at $1M, $2M, $5M, $8.3M, $10M, $26.3M, $30M and $50M.
