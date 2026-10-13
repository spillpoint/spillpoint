# Fund case 08, carry steps: derivation

The spec's example A with a third step. Carry is 20%, then 25% from 3x, then 30% from 5x (F9 to F11). There's a 1% GP commitment with the defaults (F3). No pref. D is `as_of`, 2026-09-30. X isn't final, and NAV is $40,000,000.

**Paid in.**

| Call | Amount | GP commitment pays | LPs pay |
|---|---:|---:|---:|
| 2021-01-15, investment | 8,000,000 | 1%: 80,000 | 7,920,000 |
| 2021-01-15, fee | 495,000 | none | 495,000 |
| 2022-01-15, fee | 495,000 | none | 495,000 |
| 2022-06-01, investment | 2,000,000 | 1%: 20,000 | 1,980,000 |
| **Total** | 10,990,000 | **100,000** | **10,890,000** |

**The earlier distribution.** $4,000,000 on 2024-05-01:
- **To the GP commitment:** 1%, $40,000.
- **Down the tiers:** $3,960,000, all capital.

That leaves $6,930,000 of the LPs' capital out.

**The steps (F10, F11).** The LP multiple is the LPs' distributions to date ÷ $10,890,000.
- **3x** is $32,670,000.
- **5x** is $54,450,000.

**X's tiers.** 1% of X goes to the GP commitment and 99% runs the tiers.
- **Capital:** the tiers' $6,930,000 is 99% of X = $7,000,000.
- **20%:**
  - **Where the LPs are:** after capital, $3,960,000 + $6,930,000 = $10,890,000 (1.0x).
  - **What 3x takes:** $21,780,000 more. At 80% of each dollar, that's $27,225,000 of the tiers, with $5,445,000 of carry.
  - **Where it ends:** the tiers have 6,930,000 + 27,225,000 = $34,155,000, which is 99% of X = $34,500,000. The GP commitment's line there is $345,000.
- **25%:**
  - **What 5x takes:** another $21,780,000 to the LPs. At 75% of each dollar, that's $29,040,000 of the tiers, with $7,260,000 of carry.
  - **Where it ends:** the tiers have $63,195,000, which is 99% of X = 63,195,000 ÷ 0.99 = 191,500,000/3 = $63,833,333.33…
- **30%:** above that.

## Breakpoints

| X | Exact | Reasons |
|---:|---|---|
| 7,000,000.00 | 7000000 | `capital_returned`: "LPs have their $10,890,000 of paid-in capital back" |
| 34,500,000.00 | 34500000 | `carry_step`: "LPs reach 3.0x: carry is 25% from here" |
| 63,833,333.33 | 191500000/3 | `carry_step`: "LPs reach 5.0x: carry is 30% from here" |

## This distribution

| X | GP commitment | LP capital | LP carry tier | LPs | GP carry 20% | GP carry 25% | GP carry 30% | GP |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 7,000,000.00 | 70,000.00 | 6,930,000.00 | 0.00 | 6,930,000.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 20,000,000.00 | 200,000.00 | 6,930,000.00 | 10,296,000.00 | 17,226,000.00 | 2,574,000.00 | 0.00 | 0.00 | 2,574,000.00 |
| 34,500,000.00 | 345,000.00 | 6,930,000.00 | 21,780,000.00 | 28,710,000.00 | 5,445,000.00 | 0.00 | 0.00 | 5,445,000.00 |
| 40,000,000.00 | 400,000.00 | 6,930,000.00 | 25,863,750.00 | 32,793,750.00 | 5,445,000.00 | 1,361,250.00 | 0.00 | 6,806,250.00 |
| 50,000,000.00 | 500,000.00 | 6,930,000.00 | 33,288,750.00 | 40,218,750.00 | 5,445,000.00 | 3,836,250.00 | 0.00 | 9,281,250.00 |
| 63,833,333.33 | 638,333.33 | 6,930,000.00 | 43,560,000.00 | 50,490,000.00 | 5,445,000.00 | 7,260,000.00 | 0.00 | 12,705,000.00 |
| 80,000,000.00 | 800,000.00 | 6,930,000.00 | 54,763,500.00 | 61,693,500.00 | 5,445,000.00 | 7,260,000.00 | 4,801,500.00 | 17,506,500.00 |

- **$20,000,000:** the tiers have $19,800,000, and $12,870,000 is above capital. At 20% that's $2,574,000 of carry and $10,296,000 to the LPs, who reach $21,186,000 (1.95x), short of 3x.
- **$40,000,000:** the tiers have $39,600,000, and $5,445,000 is past 3x. At 25%: $1,361,250 of carry and $4,083,750 to the LPs.
- **$50,000,000:** the tiers have $49,500,000, and $15,345,000 is past 3x. At 25%: $3,836,250 of carry and $11,508,750 to the LPs.
- **$63,833,333.33:** the GP commitment's line is 1,915,000/3 = $638,333.33…. The tiers have exactly $63,195,000.
- **$80,000,000:** the tiers have $79,200,000, and $16,005,000 is past 5x. At 30%: $4,801,500 of carry and $11,203,500 to the LPs.

## The fund to date

The earlier distribution added: $40,000 to the GP commitment and $3,960,000 to the LPs' capital.

| X | Distributed | GP commitment | LP capital | LP carry tier | LPs | GP carry 20% | GP carry 25% | GP carry 30% | GP |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 7,000,000.00 | 11,000,000.00 | 110,000.00 | 10,890,000.00 | 0.00 | 10,890,000.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 20,000,000.00 | 24,000,000.00 | 240,000.00 | 10,890,000.00 | 10,296,000.00 | 21,186,000.00 | 2,574,000.00 | 0.00 | 0.00 | 2,574,000.00 |
| 34,500,000.00 | 38,500,000.00 | 385,000.00 | 10,890,000.00 | 21,780,000.00 | 32,670,000.00 | 5,445,000.00 | 0.00 | 0.00 | 5,445,000.00 |
| 40,000,000.00 | 44,000,000.00 | 440,000.00 | 10,890,000.00 | 25,863,750.00 | 36,753,750.00 | 5,445,000.00 | 1,361,250.00 | 0.00 | 6,806,250.00 |
| 50,000,000.00 | 54,000,000.00 | 540,000.00 | 10,890,000.00 | 33,288,750.00 | 44,178,750.00 | 5,445,000.00 | 3,836,250.00 | 0.00 | 9,281,250.00 |
| 63,833,333.33 | 67,833,333.33 | 678,333.33 | 10,890,000.00 | 43,560,000.00 | 54,450,000.00 | 5,445,000.00 | 7,260,000.00 | 0.00 | 12,705,000.00 |
| 80,000,000.00 | 84,000,000.00 | 840,000.00 | 10,890,000.00 | 54,763,500.00 | 65,653,500.00 | 5,445,000.00 | 7,260,000.00 | 4,801,500.00 | 17,506,500.00 |

The LPs have $32,670,000 at $34,500,000, exactly 3x, and $54,450,000 at $63,833,333.33, exactly 5x.

## Clawback at the NAV point

X = NAV = $40,000,000 is final by definition (F14), so its entitlement is worked out (F12).
- **The run on the fund's totals:**
  - **Capital:** all LP paid-in, $10,890,000.
  - **Pref:** none.
  - **Amount:** all that ran the tiers, $3,960,000 + $39,600,000 = $43,560,000.
- **Its tiers:**
  - **20%:** $27,225,000 brings the LPs to 3x, with $5,445,000 of carry.
  - **25%:** the last $5,445,000, with $1,361,250 of carry.
- **The entitlement** is $6,806,250, the carry paid, so nothing is owed. No capital was called after the LPs first had it all back, which F12 says always ends this way.

| X | Carry paid | Entitlement | Owed |
|---:|---:|---:|---:|
| 40,000,000.00 | 6,806,250.00 | 6,806,250.00 | 0.00 |
