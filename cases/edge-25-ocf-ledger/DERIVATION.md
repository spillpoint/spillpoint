# Edge case 25: derivation

Quillfern Labs' cap table as its OCF ledger leaves it on Dec 31, 2025, at a sale. OCF case 12 works the ledger into this table by hand. Payouts are net of strike, so each row sums to the exit value (E3). `expected.json` comes from the reference, as for every exit case.

## The table

| Class | Holders | Terms |
|---|---|---|
| Series A Preferred, 3,500,000 | Fund U 3,000,000, Seed Fund T 500,000 | $1.00, 1x, participating with a 2.5x cap ($8,750,000 in all), 1 for 1. **Senior.** |
| Seed Preferred, 2,760,416 | Seed Fund T 2,200,000, Fund U 300,000, Angel S 260,416 | $1.20, 1x, non-participating. Converts at $1.00 after the down round, so 1.2 common a share: 3,312,499.2 as converted. Preference **$3,312,499.20**. |
| Common, 10,750,000 | Founder A 5,500,000, Founder B 4,000,000, Employee C 700,000, Trust V 500,000, Employee E 50,000 | |
| Options at $0.10, 200,000 | Employee D | |
| Options at $0.25, 700,000 | Employee C 400,000, Employee D 300,000 | |

The unissued pool, 1,950,000, takes no part.

**Angel S's Seed shares** carry the Seed's $1.20 preference, as the import reads them, though they were issued at $0.96 when Angel S's SAFE converted. The import's report says so (O5). If they should be a separate series with a lower preference, that's set up in the editor; this case pays them as the import gives them.

## Breakpoints

| Exit value | Why |
|---:|---|
| $3,500,000 | Series A's preference is paid: 3,500,000 × $1.00. |
| $6,812,499.20 | The Seed's preference is paid: $3,500,000 + $3,312,499.20. Above this, common and Series A share the rest: 10,750,000 + 3,500,000 = 14,250,000 shares. |
| $8,237,499.20 | The $0.10 options come into the money: $1,425,000 more is $0.10 on each of the 14,250,000 shares. |
| $10,404,999.20 | The $0.25 options come into the money. With the $0.10 options exercised there are 14,450,000 shares and $20,000 of strike cash: ($10,404,999.20 − $6,812,499.20 + $20,000) ÷ 14,450,000 = $0.25. |
| $21,767,499.20 | The Seed converts. At $1.00 a common share its 3,312,499.2 as-converted shares are worth exactly its $3,312,499.20 preference. With both option classes exercised, 15,150,000 shares share the rest, with $195,000 of strike cash: $3,500,000 + $3,312,499.20 + 15,150,000 × $1.00 − $195,000. |
| $30,998,748.80 | Series A reaches its cap: $3,500,000 + 3,500,000 × $1.50 = $8,750,000, 2.5x. With the Seed converted, 18,462,499.2 shares share the rest: $3,500,000 + 18,462,499.2 × $1.50 − $195,000. |
| $45,961,248.00 | Series A converts. Its 3,500,000 shares at $2.50 are worth its capped $8,750,000. Below it, the other 14,962,499.2 shares share the rest: $8,750,000 + 14,962,499.2 × $2.50 − $195,000. |

The Seed, non-participating, converts once common passes its $1.00 conversion price. Series A, capped at 2.5x, converts once common passes 2.5 × its $1.00.

## Payouts by holder

| Holder | $2M | $5M | $8M | $10M | $15M | $25M | $40M | $60M |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Founder A | 0 | 0 | 458,333.64 | 1,220,848.06 | 3,043,152.11 | 6,462,965.75 | 11,558,730.78 | 17,932,160.56 |
| Founder B | 0 | 0 | 333,333.56 | 887,889.49 | 2,213,201.53 | 4,700,338.73 | 8,406,349.66 | 13,041,571.32 |
| Employee C | 0 | 0 | 58,333.37 | 155,380.66 | 508,630.42 | 1,192,593.15 | 2,211,746.16 | 3,486,432.11 |
| Employee D | 0 | 0 | 0 | 24,394.47 | 181,650.19 | 492,542.34 | 955,793.71 | 1,535,196.41 |
| Employee E | 0 | 0 | 4,166.67 | 11,098.62 | 27,665.02 | 58,754.23 | 105,079.37 | 163,019.64 |
| Angel S | 0 | 141,509.11 | 312,499.20 | 312,499.20 | 312,499.20 | 367,213.02 | 656,744.39 | 1,018,870.15 |
| Seed Fund T | 285,714.29 | 1,695,471.99 | 3,181,666.69 | 3,250,986.19 | 3,416,650.19 | 4,189,765.90 | 6,798,190.77 | 10,237,633.48 |
| Fund U | 1,714,285.71 | 3,163,018.91 | 3,610,000.17 | 4,025,917.12 | 5,019,901.15 | 6,948,284.53 | 8,256,571.47 | 10,954,919.91 |
| Trust V | 0 | 0 | 41,666.69 | 110,986.19 | 276,650.19 | 587,542.34 | 1,050,793.71 | 1,630,196.41 |
| *Common, a share* | $0 | $0 | $0.083333 | $0.221972 | $0.553300 | $1.175085 | $2.101587 | $3.260393 |

**Four to check by hand:**
- **$2M:** all of it goes to Series A, which is senior: Fund U 3,000,000 ÷ 3,500,000 × $2M = $1,714,285.71.
- **$5M:** Series A takes $3,500,000. The Seed shares the other $1,500,000 by shares, so Angel S gets 260,416 ÷ 2,760,416 × $1,500,000 = $141,509.11.
- **$40M:** Series A is capped. Fund U gets 3,000,000 ÷ 3,500,000 × $8,750,000 = $7,500,000, plus its 300,000 Seed as 360,000 common. The other 14,962,499.2 shares share $40,000,000 − $8,750,000 + $195,000 = $31,445,000, $2.1015874 each, so that's $756,571.47: $8,256,571.47 in all.
- **$60M:** everything is common. ($60,000,000 + $195,000) ÷ (10,750,000 + 900,000 + 3,312,499.2 + 3,500,000) = $3.260393 a share.
