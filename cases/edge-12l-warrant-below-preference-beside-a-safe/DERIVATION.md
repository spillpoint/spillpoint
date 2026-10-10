# Edge case 12l: derivation

Edge case 8's table with a post-money SAFE outstanding at the sale. Case 8's warrant buys Seed Preferred at $0.50, below the Seed's $1.00 preference per share, so it's exercised while the Seed still keeps its preference. Those shares are Seed Preferred (E12): they take the preference in lieu of converting, so the SAFE's Liquidity Capitalization leaves them out, like the Seed's own (X1; Jordan, after #71). `expected.json` comes from the reference, as for every exit case.

## The table

| Class | Holders | Terms |
|---|---|---|
| Common, 8,000,000 | Founder A 6,000,000, Founder B 2,000,000 | |
| Seed Preferred, 2,000,000 | Investor X | $1.00, 1x, non-participating. Converts 1:1. |
| Warrant for Seed Preferred, 200,000 | Lender L | $0.50 strike |

**Investor S's SAFE:**
- $500,000, a $5,000,000 post-money cap, no discount
- it buys **a tenth** of its Liquidity Capitalization (LC)
- **its Cash-Out Amount ranks with the Seed,** the only tier (X9)

## The SAFE's Liquidity Capitalization (X1)

**What it counts:**
- the common
- the warrant while it isn't exercised: an outstanding Option, counted whether or not it's in the money (R29)
- the Seed once it converts, and the warrant's shares with it

**What it leaves out:**
- the Seed while it keeps its preference
- **new: the warrant's shares, once exercised, while the Seed keeps its preference.** They're Seed Preferred, taking the preference in lieu of converting.

| | Counted besides the SAFE | LC (÷ 0.9) | The SAFE's shares |
|---|---:|---:|---:|
| The Seed keeps its preference, the warrant exercised | 8,000,000 | 8,888,888.89 | 888,888.89 |
| The Seed keeps its preference, the warrant not exercised | 8,200,000 | 9,111,111.11 | 911,111.11 |
| The Seed converts, the warrant exercised | 10,200,000 | 11,333,333.33 | 1,133,333.33 |

**Before this rule,** the first row counted the warrant's 200,000 too: 9,111,111.11, and 911,111.11 shares.

## The order of payment

1. **The Seed's tier,** pro rata by claim:
   - the Seed's $2,000,000 preference
   - $200,000 more once the warrant is exercised, at the Seed's $1.00 a share (E12)
   - the SAFE's $500,000 Cash-Out Amount, unless it converts
2. **Common,** with the SAFE if it converts, and the Seed if it converts.

The warrant's $100,000 of strike joins the proceeds once it's exercised.

## Breakpoints

| Exit value | Why |
|---:|---|
| $1,250,000 | **The warrant comes into the money.** Exercised, the tier claims $2,700,000 against X + $100,000, so each warrant share gets (X + $100,000) ÷ $2,700,000 of its $1.00 preference. That equals the $0.50 strike when X + $100,000 = $1,350,000. |
| $2,600,000 | **The Seed's tier is paid in full,** $2,700,000, at X + $100,000 = $2,700,000. Common gets its first dollar. |
| $7,100,000 | **The SAFE converts.** The Seed keeps its preference, so the SAFE's 888,888.89 shares and common's 8,000,000 share what's left, X + $100,000 − $2,200,000, on 8,888,888.89 shares: the SAFE gets a tenth. That's $500,000 when what's left is $5,000,000, at X = $7,100,000. Nothing jumps: common gets $4,500,000 either way. |
| $11,233,333.33 | **The Seed converts, and payouts jump.** With the SAFE converting, everything is counted: 11,333,333.33 shares share X + $100,000. The Seed's 2,200,000, its own and the warrant's, are worth its $2,200,000 preference at $1.00 a share, at X + $100,000 = $11,333,333.33. **Just below:** the SAFE gets a tenth of X − $2,100,000, $913,333.33, and common $8,220,000, $1.0275 a share. **Just above:** the SAFE's 1,133,333.33 shares at $1.00, $1,133,333.33, and common $8,000,000. The SAFE rises $220,000 and common drops the same; the Seed and the warrant get the same either side. At exactly this exit value the Seed keeps its preference, so the outcome from below holds (E20). |

**What the new rule changes:** counting the warrant's exercised shares, the SAFE would hold 911,111.11 of the 8,911,111.11 shares sharing what's left. The warrant's shares are Seed shares, taking the preference, not a share of what's left. That's 41/401 of it, $500,000 at X = **$6,990,243.90**, not $7,100,000.
- **At $7,000,000,** a listed exit value, it would convert, for $500,997.51.
- **Under the rule,** it takes its $500,000: converting would pay it a tenth of $4,900,000, $490,000.

## Payouts by holder

Net of strike, so each column sums to the exit value.

| Holder | $1M | $2M | $5M | $7M | $10M | $15M | $20M |
|---|---:|---:|---:|---:|---:|---:|---:|
| Founder A | 0 | 0 | 1,800,000.00 | 3,300,000.00 | 5,332,500.00 | 7,994,117.65 | 10,641,176.47 |
| Founder B | 0 | 0 | 600,000.00 | 1,100,000.00 | 1,777,500.00 | 2,664,705.88 | 3,547,058.82 |
| Investor X | 800,000.00 | 1,555,555.56 | 2,000,000.00 | 2,000,000.00 | 2,000,000.00 | 2,664,705.88 | 3,547,058.82 |
| Lender L | 0 | 55,555.56 | 100,000.00 | 100,000.00 | 100,000.00 | 166,470.59 | 254,705.88 |
| Investor S | 200,000.00 | 388,888.89 | 500,000.00 | 500,000.00 | 790,000.00 | 1,510,000.00 | 2,010,000.00 |
| *Common, a share* | $0 | $0 | $0.30 | $0.55 | $0.88875 | $1.332353 | $1.773529 |

**Four to check by hand:**
- **$2M:** the warrant is exercised. The tier claims $2,700,000 and gets $2,100,000, seven-ninths:
  - **the Seed:** $1,555,555.56
  - **the warrant:** $155,555.56, less its $100,000 strike, $55,555.56
  - **the SAFE:** $388,888.89
- **$7M:** the SAFE takes its cash, and common shares $7,100,000 − $2,700,000 on 8,000,000 shares: $0.55.
- **$10M:** the SAFE converts and the Seed keeps its preference. $10,100,000 − $2,200,000 = $7,900,000 is left:
  - **the SAFE:** a tenth, $790,000
  - **common:** $7,110,000, $0.88875 a share
- **$15M:** everything converts. The SAFE gets a tenth of $15,100,000, $1,510,000. The rest is $13,590,000 on 10,200,000 shares, $1.332353 each, so the warrant nets 200,000 × $1.332353 − $100,000 = $166,470.59.
