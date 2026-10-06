# Edge case 13g: derivation

This is edge case 13a's company and note, with a second note. The company: 9,000,000 common (Founder A 6,000,000, Founder B 3,000,000), 500,000 options at $5.00 held by Employee C, and a 1,000,000-share unissued pool. The sale is on 2024-01-01.

## The notes (`ASSUMPTIONS.md` X3, X10–X12)

| | Investor X's note | Investor Y's note |
|---|---:|---:|
| Principal | $1,000,000 | $500,000 |
| Interest, simple, Actual/365 | 6% from 2022-01-01: 730 days, **$120,000** | 8% from 2023-01-01: 365 days, **$40,000** |
| Principal plus interest | $1,120,000 | $540,000 |
| Repayment, 2x | **$2,240,000** | **$1,080,000** |
| Pre-money cap | $8,000,000 | $5,000,000 |
| Base (`with_pool`) | 10,500,000 | 10,500,000 |
| Conversion price | **$0.761905** (16/21) | **$0.476190** (10/21) |
| Conversion shares | **1,470,000** | **1,134,000** |

**Two rules settle the case (`ASSUMPTIONS.md` X15):**
- **The repayments rank equally.** Both are debt, ahead of all equity, and nothing puts one behind the other. A shortfall is shared pro rata by repayment.
- **Neither note counts the other in its base.** Each base is common, options and the unissued pool: 10,500,000. That is X10's rule, that a note isn't counted in its own base, applied to every note, as in a round (R23).

## Stage by stage

1. **Up to $3,320,000:** both notes are repaid, sharing every dollar pro rata: X 224/332, Y 108/332. At $1M, X has $674,698.80 and Y $325,301.20.
2. **$3,320,000 to $11,891,428.57:** both are repaid in full, and common shares the rest.
3. **Y converts at $11,891,428.57.**
   - **Its share:** converting, Y's 1,134,000 shares join common's 9,000,000 in what is left after X's $2,240,000. That is 1,134/10,134 of (exit value − $2,240,000).
   - **The switch:** that equals Y's $1,080,000 repayment at $2,240,000 + $1,080,000 × 10,134/1,134 = **$11,891,428.57** (exactly 83,240,000/7).
4. **X converts at $17,682,285.71.**
   - **Its share:** with Y converted, X's 1,470,000 shares join 10,134,000, and its share is 1,470/11,604 of the exit value.
   - **The switch:** that equals its $2,240,000 repayment at **$17,682,285.71** (exactly 123,776,000/7).

**Why Y first.** A note converts once common is worth its repayment per conversion share:
- **Y:** $1,080,000 ÷ 1,134,000 = **$0.952381** a share.
- **X:** $2,240,000 ÷ 1,470,000 = **$1.523810** a share.

Common reaches Y's figure first. Even alone, with Y still repaid, X would convert only above $17,034,285.71, well after Y.

**No jumps.** Each note's base is fixed, so one note converting doesn't change the other's shares.

**The options never come into the money in this range.** With both notes converted, they would be exercised above $58,020,000.

## Breakpoints

| Exit value | Why |
|---:|---|
| $3,320,000 | Both notes are fully repaid: $2,240,000 and $1,080,000. Above this, the next dollar goes to common. |
| $11,891,428.57 | Y's note converts: 1,134/10,134 of (exit value − $2,240,000) equals its $1,080,000 repayment. |
| $17,682,285.71 | X's note converts: 1,470/11,604 of the exit value equals its $2,240,000 repayment. |

## Payouts

| Exit | Founder A | Founder B | Employee C | Investor X (note) | Investor Y (note) |
|---:|---:|---:|---:|---:|---:|
| $1M | 0 | 0 | 0 | 674,698.80 | 325,301.20 |
| $3.32M | 0 | 0 | 0 | 2,240,000 | 1,080,000 |
| $5M | 1,120,000 | 560,000 | 0 | 2,240,000 | 1,080,000 |
| $10M | 4,453,333.33 | 2,226,666.67 | 0 | 2,240,000 | 1,080,000 |
| $11,891,428.57 | 5,714,285.71 | 2,857,142.86 | 0 | 2,240,000 | 1,080,000 |
| $15M | 7,554,766.13 | 3,777,383.07 | 0 | 2,240,000 | 1,427,850.80 |
| $17,682,285.71 | 9,142,857.14 | 4,571,428.57 | 0 | 2,240,000 | 1,728,000 |
| $20M | 10,341,261.63 | 5,170,630.82 | 0 | 2,533,609.10 | 1,954,498.45 |
| $40M | 20,682,523.27 | 10,341,261.63 | 0 | 5,067,218.20 | 3,908,996.90 |

At $11,891,428.57 and $17,682,285.71 the converting note is indifferent. The case shows it repaid (`ASSUMPTIONS.md` E5).
