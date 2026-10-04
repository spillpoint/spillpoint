# Edge case 7: derivation

An option is exercised once a common share is worth more than its strike. Its holder pays the strike, which is added to the proceeds, and then shares as common. Payouts are **net of strike**, so each row sums to the exit value (`ASSUMPTIONS.md` E3).

## Breakpoints

| Exit value | Why |
|---:|---|
| $2,000,000 | $0.25 options come into the money. Only common shares so far: $2M ÷ 8,000,000 = $0.25. |
| $8,300,000 | $1.00 options come into the money. With the $0.25 options exercised, there are 8,400,000 shares and $100,000 of strike cash, and ($8.3M + $0.1M) ÷ 8.4M = $1.00. |
| $26,300,000 | $3.00 options (1,000,000 across C and E) come into the money. With the $0.25 and $1.00 options exercised, there are 9,000,000 shares and $700,000 of strike cash, and ($26.3M + $0.7M) ÷ 9M = $3.00. |

Each exercise adds shares *and* cash, so the price per share keeps rising past each strike. Once an option class is in the money it stays in.

## Payouts

| Exit | Founder A | Founder B | Employee C, $0.25 | Employee C, $3.00 | Employee D | Employee E |
|---:|---:|---:|---:|---:|---:|---:|
| $1M | 750,000 | 250,000 | 0 | 0 | 0 | 0 |
| $2M | 1,500,000 | 500,000 | 0 | 0 | 0 | 0 |
| $5M | 3,642,857.14 | 1,214,285.71 | 142,857.14 | 0 | 0 | 0 |
| $8.3M | 6,000,000 | 2,000,000 | 300,000 | 0 | 0 | 0 |
| $10M | 7,133,333.33 | 2,377,777.78 | 375,555.56 | 0 | 113,333.33 | 0 |
| $26.3M | 18,000,000 | 6,000,000 | 1,100,000 | 0 | 1,200,000 | 0 |
| $30M | 20,220,000 | 6,740,000 | 1,248,000 | 74,000 | 1,422,000 | 296,000 |
| $50M | 32,220,000 | 10,740,000 | 2,048,000 | 474,000 | 2,622,000 | 1,896,000 |

At $50M, proceeds are $50M + $3.7M of strike cash ($100k + $600k + $3M) = $53.7M, over 10,000,000 shares, or $5.37 each.
- Employee D nets 600,000 × ($5.37 − $1.00) = $2,622,000.
- Employee E nets 800,000 × ($5.37 − $3.00) = $1,896,000.
- Founder A gets 6,000,000 × $5.37 = $32,220,000.
