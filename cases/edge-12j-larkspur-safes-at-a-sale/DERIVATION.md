# Edge case 12j: derivation

Larkspur Instruments' cap table, as OCF case 01 imports it, sold, without its note. Two post-money SAFEs sit beside a non-participating Seed and a capped participating Series A. `expected.json` comes from the reference, as for every exit case.

**Why this case exists:** under X1 and X13 alone, with every decision weighed at once, the Seed and the SAFEs go round in a circle near the Seed's conversion, and no set of decisions is stable. 0.4.0's engine stops there, at $16,531,000, with "went round in a circle (E15)". E20 settles it: the series, warrants and notes decide first, and the SAFEs' greater-of comes last (Jordan, 05c1). The circle becomes one breakpoint where payouts jump.

## The table

| Class | Holders | Terms |
|---|---|---|
| Series A Preferred, 2,000,000 | Investor Y 1,500,000, Investor X 500,000 | $2.00, 1x, participating with a 3x cap. **Senior.** |
| Seed Preferred, 2,925,000 | Investor X 2,000,000, Investor Y 800,000, Investor S 125,000 | $1.00, 1x, non-participating (its blank, filled as edge case 27 fills it). Converts at $0.80: 1.25 common a share. |
| Common, 9,130,000 | Founder A 5,400,000, Founder B 3,400,000, Investor Y 250,000, Employee C 50,000, Lender L 20,000, Employee D 10,000 | |
| Options at $0.08, 150,000 | Employee C | |
| Options at $0.10, 100,000 | Employee D 80,000, D Family Trust 20,000 | |
| RSUs, 30,000 | Employee D | no strike |
| Warrants for Seed Preferred at $1.00, 100,000 | Lender L 75,000, Investor X 25,000 | 125,000 common as converted |

**Two post-money SAFEs:**
- Investor X and Investor S, $250,000 each
- each with a $12,000,000 cap; their 20% discount applies only in a financing
- **their Cash-Out Amounts rank with the Seed,** the most junior tier (X9)

The unissued pool, 1,260,000, takes no part.

## The SAFEs' Liquidity Capitalization (X1, X13)

**What it counts:**
- everything outstanding as converted: the common, the options and RSUs, the warrants (counted whether or not they're exercised) and Series A
- each SAFE converting, at its own shares

**What it leaves out:**
- the unissued pool
- a non-participating series keeping its preference in lieu of converting, here the Seed while it stays preferred

**Both SAFEs together** buy $500,000 ÷ $12,000,000 = 1/24 of it.

| | Counted besides the SAFEs | LC (÷ 23/24) | Each SAFE's shares (LC ÷ 48) |
|---|---:|---:|---:|
| The Seed keeps its preference | 11,535,000 | 12,036,521.74 | 250,760.87 |
| The Seed converts | 15,191,250 | 15,851,739.13 | 330,244.57 |

That's 9,130,000 + 280,000 + 125,000 + 2,000,000, plus the Seed's 3,656,250 as converted once it converts.

## The circle, and how E20 settles it

**Payment order:**
1. Series A takes $4,000,000 first.
2. The Seed's $2,925,000 preference and the SAFEs' $500,000 of cash share the next tier, pro rata by claim.
3. Common, Series A participating, and whatever converts share the rest.

So all preferences are paid at $7,425,000.

**Weighing every decision at once (the old rule),** above $16,531,000 nothing is stable:
- **The SAFEs take cash:** the Seed converting shares the rest with 15,066,250 shares (11,410,000 + 3,656,250), after $4,000,000 and the SAFEs' $500,000, with $22,000 of option strike cash. Its 3,656,250 are worth more than its $2,925,000 preference once a share is worth over $0.80: (X − $4,478,000) ÷ 15,066,250 > $0.80, so X > **$16,531,000**. So the Seed converts.
- **The Seed converts:** the SAFEs' LC now counts it, and each SAFE's 330,244.57 shares are worth more than $250,000 once a share is over $0.757015, so they convert. Their shares dilute the Seed. Everything then shares X − $3,878,000 (with the warrants' $100,000 of strike cash) on 15,851,739.13 shares, and the Seed's converted share falls below its preference until a share is worth $0.80 again. So it keeps its preference, the SAFEs take cash, and round it goes.

**Under E20** the Seed weighs converting with the SAFEs paid as their terms then pay them: converting, they convert too. So it compares its $2,925,000 preference with 3,781,250 × (X − $3,878,000) ÷ 15,851,739.13, warrants exercised. The two meet at a share price of $0.80, at X = **$16,559,391.30**.

**At $16,545,000,** inside the old circle (Jordan's check):
- **The Seed keeps its preference,** $2,925,000.
- **Converting,** with the SAFEs converting and the warrants not exercised, would pay it 3,656,250 × ($16,545,000 − $4,000,000 + $22,000) ÷ 15,726,739.13 = **$2,921,654.22**.

## Breakpoints

All strike cash is $122,000:
- $12,000 from the $0.08 options
- $10,000 from the $0.10 options
- nothing from the RSUs
- $100,000 from the warrants

| Exit value | Why |
|---:|---|
| $4,000,000 | Series A's preference is paid. |
| $7,425,000 | **Two at once.** The Seed's preference and the SAFEs' cash are paid: + $2,925,000 + $500,000. Common gets its first dollar, so the RSUs are in from here. Above this, 11,160,000 shares share the rest: common, Series A participating, and the RSUs. |
| $8,317,800 | The $0.08 options: 11,160,000 × $0.08 = $892,800 more. |
| $8,544,000 | The $0.10 options: 11,310,000 × $0.10 − $12,000 = $1,119,000 over the preferences. |
| $16,559,391.30 | **The Seed converts, and payouts jump** (E20). Its warrants come into the money with it, and both SAFEs switch to their Conversion Amounts. At a share price of $0.80, the Seed's 3,781,250 shares that way are worth its $3,025,000 preference, its 3,025,000 shares with the warrants'. The formula: 0.8 × 15,851,739.13 + $4,000,000 − $122,000. **Just below:** the SAFEs take $250,000 each, and common is worth $0.802488 a share. **Just above:** each SAFE's 330,244.57 shares are worth $264,195.65, and common $0.80. So the SAFEs' payouts jump up and common's down. At exactly this exit value the Seed keeps its preference, so the outcome from below holds. |
| $67,284,956.52 | Series A reaches its 3x cap, $12,000,000, at $4.00 a share: $4,000,000 + 15,851,739.13 × $4.00 − $122,000. |
| $94,988,434.78 | Series A converts at $6.00 a share: $12,000,000 + 13,851,739.13 × $6.00 − $122,000. |

## Payouts by holder

Net of strike, so each column sums to the exit value, within a few cents (E3).

| Holder | $5M | $10M | $16,545,000 | $20M | $40M | $60M | $100M | $150M |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Founder A | 0 | 1,229,079.75 | 4,326,625.77 | 5,492,066.16 | 12,305,198.72 | 19,118,331.28 | 34,107,222.91 | 51,140,054.31 |
| Founder B | 0 | 773,865.03 | 2,724,171.78 | 3,457,967.58 | 7,747,717.71 | 12,037,467.84 | 21,474,918.13 | 32,199,293.45 |
| Employee C | 0 | 33,521.47 | 148,245.40 | 191,409.86 | 443,748.10 | 696,086.34 | 1,251,230.48 | 1,882,076.09 |
| Employee D | 0 | 19,312.88 | 88,147.24 | 114,045.91 | 265,448.86 | 416,851.81 | 749,938.29 | 1,128,445.65 |
| D Family Trust | 0 | 2,552.15 | 14,024.54 | 18,340.99 | 43,574.81 | 68,808.63 | 124,323.05 | 187,407.61 |
| Investor X | 1,656,934.31 | 3,363,803.68 | 3,650,613.50 | 4,393,805.65 | 8,634,973.82 | 12,876,141.98 | 21,206,711.93 | 31,809,632.34 |
| Investor Y | 3,233,576.64 | 4,198,312.88 | 5,202,147.24 | 5,796,885.54 | 9,266,536.38 | 12,736,187.22 | 17,369,419.07 | 26,043,546.18 |
| Investor S | 109,489.05 | 375,000.00 | 375,000.00 | 494,788.95 | 1,108,594.87 | 1,722,400.79 | 3,072,773.81 | 4,607,288.61 |
| Lender L | 0 | 4,552.15 | 16,024.54 | 40,689.36 | 184,206.73 | 327,724.11 | 643,462.33 | 1,002,255.77 |
| *Common, a share* | $0 | $0.227607 | $0.801227 | $1.017049 | $2.278741 | $3.540432 | $6.316152 | $9.470380 |

**Four to check by hand:**
- **$5M:** Series A takes $4,000,000. The Seed tier's $1,000,000 is shared by claim: $2,925,000 Seed and $500,000 SAFEs.
  - **Investor X:** $1,000,000 from Series A, $583,941.61 on its Seed, and $72,992.70 on its SAFE, $1,656,934.31 in all.
- **$16,545,000:** the Seed keeps its preference and the SAFEs take cash. ($16,545,000 − $7,425,000 + $22,000) ÷ 11,410,000 = **$0.801227** a share. Investor S gets its $125,000 Seed preference and $250,000 of cash.
- **$20M:** the Seed converts, its warrants are exercised, and both SAFEs convert. ($20,000,000 − $4,000,000 + $122,000) ÷ 15,851,739.13 = **$1.017049** a share.
  - **Investor S:** 156,250 shares from its Seed and 330,244.57 from its SAFE, $494,788.95.
- **$150M:** everything converts. ($150,000,000 + $122,000) ÷ 15,851,739.13 = **$9.470380** a share.
