# Edge case 1: common stock only

This isolates the simplest waterfall: there are no preferences, so every dollar is shared pro rata by common shares. The unissued pool is there to check one rule: it never participates.

| Holder | Common shares |
|---|---:|
| Founder A | 5,000,000 |
| Founder B | 3,000,000 |
| Employee C | 2,000,000 |
| Unissued pool | 1,000,000 (never participates) |

The exit range is $0 to $100M. Payouts are given at $1M, $10M, $12,345,678.91 and $100M. The odd value checks rounding to the cent.
