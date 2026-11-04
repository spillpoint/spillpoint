# Edge case 12m: derivation

Six post-money SAFEs at a sale, the most open SAFEs any case has, three at each of two caps, beside two tiers of non-participating preferred. It checks X13's one Liquidity Capitalization at this size (0.8.0 plan, answer 10). `expected.json` comes from the reference, as for every exit case. Every figure below can be worked from the table here, without it.

## The company

- **Common:** Founder A 6,000,000 and Founder B 3,000,000, so 9,000,000 shares.
- **Options:** Employee C, 500,000 at a $0.25 strike.
- **Seed Preferred, the junior tier:** Seed Fund, 2,000,000 shares at $0.50. A 1x preference of $1,000,000, non-participating, converting one for one.
- **Series A Preferred, the senior tier:** Series A Fund, 1,000,000 shares at $2.00. A 1x preference of $2,000,000, non-participating, converting one for one.
- **Unissued pool:** 1,000,000. A sale doesn't count it (X1).

**The SAFEs,** none with a discount:

| SAFE | Purchase amount | Post-money cap | Purchase ÷ cap |
|---|---:|---:|---:|
| Investor P | $500,000 | $10,000,000 | 5% |
| Investor Q | $300,000 | $10,000,000 | 3% |
| Investor R | $200,000 | $10,000,000 | 2% |
| Investor S | $1,000,000 | $20,000,000 | 5% |
| Investor T | $600,000 | $20,000,000 | 3% |
| Investor U | $400,000 | $20,000,000 | 2% |

So the $10M SAFEs are $1,000,000 and 10%, the $20M SAFEs $2,000,000 and 10%, and all six $3,000,000 and 20%, well under X19's 100%.

## The rules (`ASSUMPTIONS.md` X1, X9, X13, X16, E20)

- **Each SAFE takes the greater** of its Cash-Out Amount, its purchase amount, or its Conversion Amount: its purchase amount ÷ its Liquidity Price, in common.
- **Cash-Out Amounts rank with the most junior tier,** Seed, sharing it pro rata (X9, as in 12d).
- **One Liquidity Capitalization (LC) for the company.** It counts all issued stock as converted, the options, and every SAFE taking its Conversion Amount. It leaves out the pool, any SAFE taking cash, and any series keeping its preference in lieu of converting. So LC = everything else ÷ (1 − Σ purchase ÷ cap over the converting SAFEs).
- **Each SAFE's Liquidity Price** is its own cap ÷ LC.
- **A cap's SAFEs share one price,** so they convert at the same exit value, whatever their amounts.

**Why a group converts where it does.** Let the residual be what common and everyone converting share, strikes included. The common price is the residual ÷ LC. A SAFE's price is its cap ÷ LC. So a SAFE converts where **the residual reaches its cap**, whatever LC is.

## Stage by stage

1. **Up to $2,000,000:** Series A's preference.
2. **$2,000,000 to $6,000,000:** the junior tier, $4,000,000 in all: Seed's $1,000,000 and the SAFEs' $3,000,000, pro rata. At $4,000,000 the tier has $2,000,000, half of its claims, so Seed has $500,000 and each SAFE half its purchase amount.
3. **$6,000,000 to $8,250,000:** the 9,000,000 common shares share the rest. At $8,000,000 that's $2,000,000, $0.222222 a share.
4. **The options come into the money at $8,250,000:** $6,000,000 + 9,000,000 × $0.25.
5. **Seed converts at $10,625,000.**
   - Converting, Seed's 2,000,000 shares join 9,500,000, and its $1,000,000 preference goes back to the residual. That is the exit value − $2,000,000 − $3,000,000 + the options' $125,000.
   - Its shares are worth its preference at $0.50, so the residual is 11,500,000 × $0.50 = $5,750,000.
   - The exit value is $5,750,000 + $4,875,000 = **$10,625,000**.
   - At $12,000,000 the residual is $7,125,000: $0.619565 a share, and Seed has $1,239,130.43.
6. **The three $10M SAFEs convert together at $13,875,000.**
   - **Everything else** is 9,000,000 + 500,000 + 2,000,000 = 11,500,000 shares. Series A keeps its preference, so it's left out.
   - **LC** is 11,500,000 ÷ (1 − 10%) = 12,777,777.78, so their Liquidity Price is $10,000,000 ÷ LC = $0.782609.
   - **The residual** is the exit value − $2,000,000 (Series A) − $2,000,000 (the $20M SAFEs' cash) + $125,000. It reaches their $10,000,000 cap at **$13,875,000**.
   - **Nothing jumps.** With the three taking cash, the common price at that exit value is $9,000,000 ÷ 11,500,000 = $0.782609, the same.
   - **Their shares:** P 638,888.89, Q 383,333.33, R 255,555.56, each purchase ÷ $0.782609.
7. **The three $20M SAFEs convert together at $21,875,000.**
   - **LC** is 11,500,000 ÷ (1 − 20%) = 14,375,000, so their Liquidity Price is $20,000,000 ÷ LC = $1.391304.
   - **The residual** is the exit value − $2,000,000 + $125,000. It reaches their $20,000,000 cap at **$21,875,000**.
8. **Series A converts at $31,125,000.**
   - **LC** counts it now: 12,500,000 ÷ (1 − 20%) = **15,625,000**.
   - **The residual** is the exit value + $125,000, and the common price is that ÷ LC. Series A's 1,000,000 shares are worth its $2,000,000 preference at $2.00.
   - So the exit value is 15,625,000 × $2.00 − $125,000 = **$31,125,000**.

## Convert together: the most conversions (E20)

Each of the $10M SAFEs would convert alone only higher up: P at $14,375,000, Q at $14,575,000 and R at $14,675,000, each where the residual with the other five taking cash reaches $10,000,000. So from $13,875,000 up to $14,375,000 two outcomes are stable: none of the three converting, and all three. E20 takes the most conversions, so all three convert from $13,875,000. The $20M SAFEs do the same at theirs.

## Two jumps (X16)

**At $21,875,000.** The $20M SAFEs are indifferent, but their conversion enlarges LC from 12,777,777.78 to 14,375,000, and the $10M SAFEs hold 10% of it either way.

| | Just below | Just above |
|---|---:|---:|
| Common price | $1.408696 | $1.391304 |
| The $10M SAFEs | $1,800,000.00 | $2,000,000.00 |
| The $20M SAFEs | $2,000,000.00 | $2,000,000.00 |

The $10M SAFEs gain $200,000. Common, the options and Seed, 11,500,000 shares, lose $0.017391 each, which is the same $200,000. At exactly $21,875,000 the outcome from below holds.

**At $31,125,000.** Series A is indifferent, but its conversion enlarges LC from 14,375,000 to 15,625,000.

| | Just below | Just above |
|---|---:|---:|
| Common price | $2.034783 | $2.000000 |
| The $10M SAFEs | $2,925,000.00 | $3,125,000.00 |
| The $20M SAFEs | $2,925,000.00 | $3,125,000.00 |

Each group gains $200,000, and the 11,500,000 shares lose $0.034783 each, which is the same $400,000. At exactly $31,125,000 the outcome from below holds.

## Payouts

Within a cap, each SAFE has its share of its group: P and S half, Q and T three tenths, R and U a fifth.

| Exit value | Common price | Founder A | Founder B | Employee C | Seed Fund | Series A Fund | $10M SAFEs | $20M SAFEs |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $4,000,000 | $0 | $0 | $0 | $0 | $500,000.00 | $2,000,000.00 | $500,000.00 | $1,000,000.00 |
| $8,000,000 | $0.222222 | $1,333,333.33 | $666,666.67 | $0 | $1,000,000.00 | $2,000,000.00 | $1,000,000.00 | $2,000,000.00 |
| $12,000,000 | $0.619565 | $3,717,391.30 | $1,858,695.65 | $184,782.61 | $1,239,130.43 | $2,000,000.00 | $1,000,000.00 | $2,000,000.00 |
| $20,000,000 | $1.261957 | $7,571,739.13 | $3,785,869.57 | $505,978.26 | $2,523,913.04 | $2,000,000.00 | $1,612,500.00 | $2,000,000.00 |
| $30,000,000 | $1.956522 | $11,739,130.43 | $5,869,565.22 | $853,260.87 | $3,913,043.48 | $2,000,000.00 | $2,812,500.00 | $2,812,500.00 |
| $40,000,000 | $2.568000 | $15,408,000.00 | $7,704,000.00 | $1,159,000.00 | $5,136,000.00 | $2,568,000.00 | $4,012,500.00 | $4,012,500.00 |

**At $20,000,000:** the residual is $16,125,000, shared over 12,777,777.78 shares. The $10M SAFEs hold 10% of them, so 10% of the residual: $1,612,500.

**At $30,000,000:** the residual is $28,125,000, and each group holds 10% of it: $2,812,500.

**At $40,000,000:** the residual is $40,125,000, and each group holds 10% of it: $4,012,500. Series A's 1,000,000 shares are worth $2,568,000, more than its preference.
