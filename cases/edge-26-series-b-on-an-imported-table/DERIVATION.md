# Edge case 26: derivation

Quillfern Labs starts from its cap table on Dec 31, 2025, then raises a Series B on Mar 31, 2026, with a new lead investor, Fund U's pro-rata and a pool top-up. A sale is then run on the table after it. The starting table is edge case 25's, the one Quillfern's OCF ledger imports to (OCF case 12).

This is the first case that starts from a cap table rather than from founding: its first event is `start` (R31, C17). `expected.json` comes from the reference, as for every case. Its first cap table is the starting table itself, with nothing worked out.

## The starting table

The table is edge case 25's:

| Class | Holders | Terms |
|---|---|---|
| Series A Preferred, 3,500,000 | Fund U 3,000,000, Seed Fund T 500,000 | $1.00, 1x, participating with a 2.5x cap. **Senior** to the Seed. No anti-dilution. |
| Seed Preferred, 2,760,416 | Seed Fund T 2,200,000, Fund U 300,000, Angel S 260,416 | $1.20, 1x, non-participating. Converts at $1.00, so 1.2 common a share: 3,312,499.2 as converted. No anti-dilution. |
| Common, 10,750,000 | Founder A 5,500,000, Founder B 4,000,000, Employee C 700,000, Trust V 500,000, Employee E 50,000 | |
| Options at $0.10, 200,000 | Employee D | |
| Options at $0.25, 700,000 | Employee C 400,000, Employee D 300,000 | |
| Unissued pool, 1,950,000 | | |

**The issue order** is Seed, then Series A, as the ledger has it (O14). There are no SAFEs or notes, so the order changes nothing here. It's given because an import gives it.

**Fully diluted before the round:**
- **Outstanding, as converted:** 10,750,000 common + 3,312,499.2 Seed + 3,500,000 Series A + 900,000 options = **18,462,499.2**.
- **With the unissued pool:** **20,412,499.2**.

## The Series B

- **$40,000,000 pre-money.**
- **The investors:**
  - Fund W, the new lead: $8,000,000
  - Fund U, marked pro-rata: $1,500,000

  That's $9,500,000 in all, so **$49,500,000 post-money**.
- **The series:** 1x, non-participating, with broad-based anti-dilution. Senior to Series A, which is senior to the Seed.
- **The pool** is topped up in the pre-money, so the unissued pool is 10% of the post-money fully diluted shares, as in edge case 14.

### Solving the price (R3)

Call the post-money fully diluted shares x. Then:
- **The new money** buys $9.5M ÷ $49.5M = 19/99 of x.
- **The pool** is x ÷ 10.
- **The rest** is the 18,462,499.2 outstanding.

So:
- x = 18,462,499.2 + x ÷ 10 + 19x ÷ 99
- x × 701 ÷ 990 = 18,462,499.2
- **x = 26,074,000.2967** (18,277,874,208 ÷ 701)

**The price:** $49,500,000 ÷ x = **$1.8984428717** (10,953,125 ÷ 5,769,531).

That's above the Seed's and Series A's $1.00 conversion prices. It's an up round, so nothing is adjusted, and neither series has anti-dilution anyway.

### The shares issued

- **The pool:** 10% of x, rounded down, is **2,607,400**. That's a top-up of **657,400** on the 1,950,000.
- **Fund W:** $8,000,000 ÷ $1.8984428717 = 4,213,979.43, rounded down to **4,213,979**.
- **Fund U:** $1,500,000 ÷ $1.8984428717 = 790,121.14, rounded down to **790,121**.

### Fund U's pro-rata (R6)

1. **The base** counts what's outstanding, as converted, and leaves out the unissued pool: 18,462,499.2.
2. **Fund U holds** 300,000 Seed × 1.2 = 360,000, plus 3,000,000 Series A: 3,360,000 in all. That's **18.199053%**.
3. **Its entitlement** is 18.199053% × $9,500,000 = **$1,728,910.03**.

Its $1,500,000 is within that: a partial take-up.

## The cap table after the Series B

| Holder | Holds | Fully diluted |
|---|---|---:|
| Founder A | 5,500,000 common | 21.0938% |
| Founder B | 4,000,000 common | 15.3410% |
| Employee C | 700,000 common, 400,000 options at $0.25 | 4.2188% |
| Employee D | 200,000 options at $0.10, 300,000 at $0.25 | 1.9176% |
| Employee E | 50,000 common | 0.1918% |
| Angel S | 260,416 Seed | 1.1985% |
| Seed Fund T | 2,200,000 Seed, 500,000 Series A | 12.0426% |
| Fund U | 300,000 Seed, 3,000,000 Series A, 790,121 Series B | 15.9167% |
| Trust V | 500,000 common | 1.9176% |
| Fund W | 4,213,979 Series B | 16.1616% |
| Unissued pool | 2,607,400 | 10.0000% |

**Fully diluted:** 26,073,999.2 in all. That's 18,462,499.2 + 2,607,400 + 5,004,100 Series B. It's under the solved x because each issue is rounded down.

**Series B's preference:** 5,004,100 × $1.8984428717 = **$9,499,997.97**, a little under $9,500,000 for the same reason:
- Fund W: $7,999,998.39
- Fund U: $1,499,999.58

## Breakpoints

Strike cash is added to the proceeds, so each breakpoint subtracts the strike cash of the options in the money there.

| Exit value | Why |
|---:|---|
| $9,499,997.97 | Series B's preference is paid. |
| $12,999,997.97 | Series A's preference is paid: + 3,500,000 × $1.00. |
| $16,312,497.17 | The Seed's preference is paid: + $3,312,499.20. Above this, common and Series A share the rest: 10,750,000 + 3,500,000 = 14,250,000 shares. |
| $17,737,497.17 | The $0.10 options come into the money: 14,250,000 × $0.10 = $1,425,000 more. |
| $19,904,997.17 | The $0.25 options come into the money. With the $0.10 options in, 14,450,000 × $0.25 − $20,000 of strike cash = $3,592,500 over the preferences. |
| $31,267,497.17 | The Seed converts. At $1.00 a common share, its 3,312,499.2 as converted are worth its preference. Both option classes are in, so 15,150,000 × $1.00 − $195,000 = $14,955,000 over the preferences. |
| $40,498,746.77 | Series A reaches its 2.5x cap, $8,750,000, at $1.50 a share. With the Seed converted: $12,999,997.97 + 18,462,499.2 × $1.50 − $195,000. |
| $46,460,447.92 | Series B converts, at its $1.8984428717. Below it, Series B takes $9,499,997.97 and Series A its capped $8,750,000. The other 14,962,499.2 shares share the rest: $18,249,997.97 + 14,962,499.2 × $1.8984428717 − $195,000. |
| $58,471,498.00 | Series A converts. Its 3,500,000 shares at $2.50 are worth its capped $8,750,000. The other 19,966,599.2 shares share the rest: $8,750,000 + 19,966,599.2 × $2.50 − $195,000. |

**The order of conversions:**
- The Seed, non-participating, converts once common passes its $1.00 conversion price.
- Series B converts once common passes its own price.
- Series A, capped at 2.5x, converts once common passes 2.5 × its $1.00.

## Payouts by holder

Payouts are net of strike, so each column sums to the exit value, within a cent of rounding (E3).

| Holder | $10M | $20M | $30M | $50M | $75M | $100M | $150M |
|---|---:|---:|---:|---:|---:|---:|---:|
| Founder A | 0 | 1,409,489.47 | 5,039,852.51 | 11,416,440.91 | 17,623,878.79 | 23,483,270.64 | 35,202,054.33 |
| Founder B | 0 | 1,025,083.25 | 3,665,347.28 | 8,302,866.12 | 12,817,366.40 | 17,078,742.28 | 25,601,494.06 |
| Employee C | 0 | 181,897.89 | 907,970.50 | 2,183,288.18 | 3,424,775.76 | 4,596,654.13 | 6,940,410.87 |
| Employee D | 0 | 33,135.41 | 363,168.41 | 942,858.26 | 1,507,170.80 | 2,039,842.79 | 3,105,186.76 |
| Employee E | 0 | 12,813.54 | 45,816.84 | 103,785.83 | 160,217.08 | 213,484.28 | 320,018.68 |
| Angel S | 0 | 312,499.20 | 312,499.20 | 648,659.75 | 1,001,354.19 | 1,334,273.33 | 2,000,111.60 |
| Seed Fund T | 71,428.86 | 3,268,135.41 | 3,598,168.41 | 6,729,891.64 | 10,061,632.62 | 13,406,812.69 | 20,097,172.84 |
| Fund U | 1,928,572.75 | 5,628,812.02 | 7,609,010.04 | 9,887,325.17 | 13,298,405.36 | 17,719,711.75 | 26,562,324.53 |
| Trust V | 0 | 128,135.41 | 458,168.41 | 1,037,858.26 | 1,602,170.80 | 2,134,842.79 | 3,200,186.76 |
| Fund W | 7,999,998.39 | 7,999,998.39 | 7,999,998.39 | 8,747,025.87 | 13,503,028.21 | 17,992,365.33 | 26,971,039.58 |
| *Common, a share* | $0 | $0.256271 | $0.916337 | $2.075717 | $3.204342 | $4.269686 | $6.400374 |

**Four to check by hand:**
- **$10M:** Series B takes $9,499,997.97. Series A, next, shares the other $500,002.03 by shares, so Seed Fund T gets 500,000 ÷ 3,500,000 of it, $71,428.86. Fund U gets 3,000,000 ÷ 3,500,000 of it, $428,573.17, plus its $1,499,999.58 of Series B: $1,928,572.75.
- **$20M:** every preference is paid and both option classes are in. ($20,000,000 − $16,312,497.17 + $195,000) ÷ 15,150,000 = **$0.256271** a share. Fund U's total:
  - its Series B preference, $1,499,999.58
  - its Series A's preference and participation, 3,000,000 × $1.256271 = $3,768,812.44
  - its Seed preference, 300,000 × $1.20 = $360,000

  That's $5,628,812.02 in all.
- **$50M:** the Seed and Series B have converted, and Series A is at its cap. ($50,000,000 − $8,750,000 + $195,000) ÷ 19,966,599.2 = **$2.075717** a share. Fund W gets 4,213,979 × that, $8,747,025.87.
- **$150M:** everything is common. ($150,000,000 + $195,000) ÷ 23,466,599.2 = **$6.400374** a share.
