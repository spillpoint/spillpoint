# Edge case 12k: derivation

Two equal post-money SAFEs at a sale, beside common only. Over a range of exit values each converts only if the other does, so both taking cash and both converting are each stable. They take the most conversions (E20; Jordan, after #71, reversing 05c1's fewest): a post-money SAFE promises its holder a fixed share once all the SAFEs convert, and each SAFE's greater-of points to the outcome where it gets more. `expected.json` comes from the reference, as for every exit case.

## The company

- **Common:** Founder A 6,000,000 and Founder B 4,000,000, so 10,000,000 shares. There are no options, no pool and no preferred.
- **Investor X's SAFE and Investor Y's SAFE:** $500,000 each, a $5,000,000 post-money cap, no discount.
- **Each buys** $500,000 ÷ $5,000,000 = **a tenth** of its Liquidity Capitalization (LC).

## The SAFEs' Liquidity Capitalization (X1, X13)

One count for the company: the common, and each SAFE taking its Conversion Amount. A SAFE taking its Cash-Out Amount is left out.

| | Counted besides the SAFEs | LC | Each converting SAFE's shares |
|---|---:|---:|---:|
| Both convert | 10,000,000 | ÷ (1 − 2/10) = 12,500,000 | 1,250,000 |
| One converts | 10,000,000 | ÷ (1 − 1/10) = 11,111,111.11 | 1,111,111.11 |

## The order of payment

1. **The SAFEs taking their Cash-Out Amounts:** $500,000 each, ahead of common, sharing a shortfall pro rata (X13).
2. **Common,** with any SAFE that converts.

## Each SAFE's choice

- **Both convert:** everything is shared on 12,500,000 shares, so each SAFE's 1,250,000 get **a tenth of the sale**, X ÷ 10. That's more than its $500,000 above **$5,000,000**.
- **One converts, the other takes cash:** the one converting gets a tenth of what the other's cash leaves, (X − $500,000) ÷ 10. That's more than $500,000 only above **$5,500,000**.

**So from $5,000,000 to $5,500,000** each SAFE's best choice is the other's:
- **If Y takes cash,** X does better taking cash too: (X − $500,000) ÷ 10 is less than $500,000. So both taking cash is stable.
- **If Y converts,** X does better converting too: X ÷ 10 is more than $500,000. So both converting is stable.

**E20's tie takes the most conversions,** so both convert from $5,000,000.

**At exactly $5,000,000** each SAFE converting beside the other gets $500,000, the same as its cash. A SAFE converts only when that strictly pays more (X16), so both take cash there. Payouts are the same either way, each SAFE $500,000 and common $4,000,000, so they bend: **no jump**.

**Under 05c1's fewest-conversions tie** they'd take cash until $5,500,000, and payouts would jump there. Each SAFE would rise from $500,000 to $550,000, and common would drop from $4,500,000 to $4,400,000. 0.4.0's engine reported both answers between $5,000,000 and $5,500,000.

## Breakpoints

| Exit value | Why |
|---:|---|
| $1,000,000 | The SAFEs' Cash-Out Amounts are paid in full: $500,000 each, shared pro rata until here. Common gets the next dollar. |
| $5,000,000 | **Both SAFEs convert.** X ÷ 10 = $500,000. Below it common gets every dollar past $1,000,000; above it, 80 cents of each, and each SAFE 10 cents. Converting alone would pay X's SAFE only (5,000,000 − 500,000) ÷ 10 = $450,000 here. |

## Payouts by holder

| Holder | $500K | $1M | $2M | $5M | $5.25M | $5.5M | $10M | $20M |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Founder A | 0 | 0 | 600,000.00 | 2,400,000.00 | 2,520,000.00 | 2,640,000.00 | 4,800,000.00 | 9,600,000.00 |
| Founder B | 0 | 0 | 400,000.00 | 1,600,000.00 | 1,680,000.00 | 1,760,000.00 | 3,200,000.00 | 6,400,000.00 |
| Investor X | 250,000.00 | 500,000.00 | 500,000.00 | 500,000.00 | 525,000.00 | 550,000.00 | 1,000,000.00 | 2,000,000.00 |
| Investor Y | 250,000.00 | 500,000.00 | 500,000.00 | 500,000.00 | 525,000.00 | 550,000.00 | 1,000,000.00 | 2,000,000.00 |
| *Common, a share* | $0 | $0 | $0.10 | $0.40 | $0.42 | $0.44 | $0.80 | $1.60 |

**Four to check by hand:**
- **$500K:** the SAFEs share it pro rata by purchase amount, $250,000 each.
- **$2M:** the SAFEs take $1,000,000, and common shares the other $1,000,000: $0.10 a share.
- **$5.25M,** inside the range where both choices are stable: both convert. 12,500,000 shares at $0.42 each, so each SAFE's 1,250,000 get $525,000. Converting alone would pay X's SAFE (5,250,000 − 500,000) ÷ 10 = $475,000.
- **$20M:** $1.60 a share. Each SAFE gets a tenth, $2,000,000.
