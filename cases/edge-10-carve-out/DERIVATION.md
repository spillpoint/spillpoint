# Edge case 10: derivation

The carve-out comes off the top. The preference waterfall then runs on what's left, the **net proceeds**:

| Exit value E | Carve-out pool | Net proceeds |
|---|---|---|
| up to $10M | 10% × E | 0.9 × E |
| $10M to $20M | $1M + 5% × (E − $10M) | 0.95 × E − $0.5M |
| above $20M | $1.5M, flat | E − $1.5M |

## Breakpoints

| Exit value | Why |
|---:|---|
| $10,000,000 | Tier 1 of the carve-out ends at $1,000,000. From here it takes 5% of each further dollar instead of 10%, so everyone below it now gets 95¢ of each dollar instead of 90¢. |
| $11,052,631.58 | Series A's $10M preference is fully paid: 0.95 × E − $0.5M = $10M gives E = $10.5M ÷ 0.95. Common starts receiving the residual. |
| $20,000,000 | Tier 2 ends. The carve-out stops growing at $1,500,000, and every further dollar goes to the waterfall. |
| $26,500,000 | Series A converts. Its 40% of net proceeds equals its $10M preference when net proceeds are $25M, which is E = $25M + $1.5M. Without the carve-out it would convert at $25M. |

## Payouts

| Exit | Founder A, common | Founder B | Investor X | Founder A, carve-out | Manager M, carve-out | Series A |
|---:|---:|---:|---:|---:|---:|---|
| $5M | 0 | 0 | 4,500,000 | 300,000 | 200,000 | keeps preference |
| $10M | 0 | 0 | 9,000,000 | 600,000 | 400,000 | keeps preference |
| $11M | 0 | 0 | 9,950,000 | 630,000 | 420,000 | keeps preference |
| $11.05M | 0 | 0 | 10,000,000 | 631,578.95 | 421,052.63 | keeps preference |
| $15M | 2,812,500 | 937,500 | 10,000,000 | 750,000 | 500,000 | keeps preference |
| $20M | 6,375,000 | 2,125,000 | 10,000,000 | 900,000 | 600,000 | keeps preference |
| $25M | 10,125,000 | 3,375,000 | 10,000,000 | 900,000 | 600,000 | keeps preference |
| $26.5M | 11,250,000 | 3,750,000 | 10,000,000 | 900,000 | 600,000 | keeps preference |
| $30M | 12,825,000 | 4,275,000 | 11,400,000 | 900,000 | 600,000 | converts |
| $50M | 21,825,000 | 7,275,000 | 19,400,000 | 900,000 | 600,000 | converts |

- **At $5M:** the pool is $500,000 ($300,000 to Founder A and $200,000 to Manager M). Series A gets the remaining $4.5M. Common gets nothing, but Founder A still receives $300,000 through the carve-out. That is what a carve-out is for: paying management in a sale where the preferences would otherwise take everything.
- **At $15M:** the pool is $1,250,000. Net proceeds of $13,750,000 pay Series A its $10M, and common splits $3,750,000 3:1. Founder A's total is $2,812,500 + $750,000 = $3,562,500.
- **At $30M:** the pool is $1,500,000. Series A has converted and takes 40% of the $28.5M net, which is $11,400,000.

Every row sums to the exit value. The carve-out is reported as its own holder × carve-out line, so Founder A has two lines.
