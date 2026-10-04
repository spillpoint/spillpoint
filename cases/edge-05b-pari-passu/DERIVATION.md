# Edge case 5b: derivation

## Breakpoints

| Exit value | Why |
|---:|---|
| $6,000,000 | The tier's combined $6M of preferences is fully paid. Below this, every dollar is split 1:2 between Series A and Series B. |
| $22,000,000 | Series A converts, exactly as in 5a: ($22M − $4M) ÷ 9M = $2.00 per share. |
| $40,000,000 | Series B converts, exactly as in 5a: $40M ÷ 10M = $4.00 per share. |

Compared with 5a, the $4M breakpoint is gone. There is no point where one series is full and the other is still waiting, because both fill together.

## Payouts

| Exit | Founder A | Founder B | Investor X | Investor Y |
|---:|---:|---:|---:|---:|
| $3M | 0 | 0 | 1,000,000 | 2,000,000 |
| $4M | 0 | 0 | 1,333,333.33 | 2,666,666.67 |
| $5M | 0 | 0 | 1,666,666.67 | 3,333,333.33 |
| $6M | 0 | 0 | 2,000,000 | 4,000,000 |
| $10M | 3,000,000 | 1,000,000 | 2,000,000 | 4,000,000 |
| $22M | 12,000,000 | 4,000,000 | 2,000,000 | 4,000,000 |
| $30M | 17,333,333.33 | 5,777,777.78 | 2,888,888.89 | 4,000,000 |
| $40M | 24,000,000 | 8,000,000 | 4,000,000 | 4,000,000 |
| $50M | 30,000,000 | 10,000,000 | 5,000,000 | 5,000,000 |

At $4M, Series A gets ⅓ × $4M = $1,333,333.33 and Series B gets ⅔ = $2,666,666.67. In 5a at the same exit, Series B gets all $4M and Series A gets nothing. From $6M up, every payout matches 5a.
