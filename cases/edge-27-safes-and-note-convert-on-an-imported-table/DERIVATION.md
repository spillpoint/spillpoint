# Edge case 27: derivation

Larkspur Instruments starts from its cap table on Jun 30, 2025, as OCF case 01 imports it, with its two blanks filled in. It then raises a Series B on Dec 1, 2025 that:
- converts its two post-money SAFEs
- converts its note
- tops up the pool

A sale is then run on the table after it. It starts from a cap table, as edge case 26 does (R31, C17), and `expected.json` comes from the reference.

## The starting table

| Class | Holders | Terms |
|---|---|---|
| Series A Preferred, 2,000,000 | Investor Y 1,500,000, Investor X 500,000 | $2.00, 1x, participating with a 3x cap. **Senior** to the Seed. No anti-dilution. |
| Seed Preferred, 2,925,000 | Investor X 2,000,000, Investor Y 800,000, Investor S 125,000 | $1.00, 1x, **non-participating** (a blank, filled). Converts at $0.80, so 1.25 common a share: 3,656,250 as converted. No anti-dilution. |
| Common, 9,130,000 | Founder A 5,400,000, Founder B 3,400,000, Investor Y 250,000, Employee C 50,000, Lender L 20,000, Employee D 10,000 | |
| Options at $0.08, 150,000 | Employee C | |
| Options at $0.10, 100,000 | Employee D 80,000, D Family Trust 20,000 | |
| RSUs, 30,000 | Employee D | No strike: an option at $0 (O6). |
| Warrants for Seed Preferred at $1.00, 100,000 | Lender L 75,000, Investor X 25,000 | 125,000 common as converted. |
| Unissued pool, 1,260,000 | | |

**Two post-money SAFEs:**
- Investor X and Investor S, $250,000 each
- each with a $12,000,000 post-money cap and a 20% discount
- both came from one $500,000 SAFE that Investor S bought on Sep 1, 2024; half of it was transferred to Investor X on May 15, 2025

**A note:**
- Investor N, $250,000 at 6% simple interest from Oct 1, 2024
- a $10,000,000 pre-money cap, its base counted with the pool (`with_pool`)
- a 20% discount
- a repayment multiple of **1** (a blank, filled)

**The two blanks** are the ones the import leaves open. They're filled as the 0.5.0 plan reads them:
- **The Seed's participation:** non-participating.
- **The note's repayment multiple:** 1. It changes nothing here, since the note converts in the round.

**The issue order** is as the ledger has it (O14):
1. the Seed (Mar 1, 2024)
2. the two SAFEs (Sep 1, 2024: a SAFE from a transfer, or the balance left after one, keeps the date of the SAFE it came from)
3. the note (Oct 1, 2024)
4. Series A (Jan 15, 2025)

In this round the order changes nothing. No series is adjusted: the round is priced above both, and neither has anti-dilution. The reference builds the same table with no order given.

**Fully diluted before the round:**
- **Outstanding, as converted:** 9,130,000 common + 3,656,250 Seed + 2,000,000 Series A + 280,000 options and RSUs + 125,000 warrants = **15,191,250**.
- **With the unissued pool:** **16,451,250**.
- **The warrants** count like options (R29).

## The Series B

- **The money:** $50,000,000 pre-money. Investor Z invests $8,000,000, so **$58,000,000 post-money**.
- **The series:** 1x, non-participating, with broad-based anti-dilution.
- **The conversions:** it converts the SAFEs (`convert_safes`) and the note (`convert_notes`). Each converts into a series of its own, priced at its conversion price (R5, R23).
- **Seniority:** Series B and the two series from conversions share one tier, senior to Series A, which is senior to the Seed.
- **The pool** is topped up in the pre-money to 10% of the post-money fully diluted shares.

### The note (R23)

- **Interest:** Oct 1, 2024 to Dec 1, 2025 is 426 days, Actual/365. $250,000 × 6% × 426 ÷ 365 = **$17,506.85** (1,278,000 ÷ 73). So $267,506.85 converts.
- **Its base** is the fully diluted shares just before the round, with the pool as it stood before the top-up. It leaves out every SAFE and note: 16,451,250.
- **Cap price:** $10,000,000 ÷ 16,451,250 = **$0.6078565459** (8,000 ÷ 13,161).
- **Discount price:** 0.8 × the round's price, about $2.16 (below). The cap price is lower, so it converts at the cap.
- **Shares:** $267,506.85 ÷ $0.6078565459 = 440,082.2055, rounded down to **440,082**.

### The SAFEs (R4, R24)

**Company Capitalization** counts the fully diluted shares before the round, with the pool before its top-up. It also counts the note's exact conversion shares, before rounding down, as YC's "Converting Securities" (21b, 21d), and both SAFEs' own shares. Together the SAFEs buy $500,000 ÷ $12,000,000 = 1/24 of it:
- Capitalization = (16,451,250 + 440,082.2055) ÷ (1 − 1/24) = **17,625,737.9535**
- **Conversion price:** $12,000,000 ÷ 17,625,737.9535 = **$0.6808225580** for each. Their discount price, about $2.16, is higher, so both convert at the cap.
- **Shares:** $250,000 ÷ $0.6808225580 = 367,202.87, rounded down to **367,202** each.

### Solving the price (R3)

Call the post-money fully diluted shares x. Then:
- **The outstanding:** 15,191,250.
- **The note's exact shares:** 440,082.2055.
- **The SAFEs' exact shares:** a twenty-fourth of the Capitalization, 734,405.7481.
- **The pool:** x ÷ 10.
- **The new money** buys $8M ÷ $58M = 4/29 of x.

So:
- x = 16,365,737.9536 + x ÷ 10 + 4x ÷ 29
- x × 221 ÷ 290 = 16,365,737.9536
- **x = 21,475,402.7445**

**The price:** $58,000,000 ÷ x = **$2.7007642506** (9,276,475,000 ÷ 3,434,759,253).

**Checking the branches:** the discount price is 0.8 × $2.7007642506 = $2.16, above both cap prices. That's consistent.

**An up round:** the price is above the Seed's $0.80 and Series A's $2.00. The SAFEs and the note convert below the Seed's $0.80, but neither series has anti-dilution, so nothing is adjusted.

### The shares issued

- **The pool:** 10% of x, rounded down, is **2,147,540**, a top-up of **887,540** on the 1,260,000.
- **Investor Z:** $8,000,000 ÷ $2.7007642506 = 2,962,124.52, rounded down to **2,962,124**.

## The cap table after the Series B

| Holder | Holds | Fully diluted |
|---|---|---:|
| Founder A | 5,400,000 common | 25.1450% |
| Founder B | 3,400,000 common | 15.8321% |
| Employee C | 50,000 common, 150,000 options at $0.08 | 0.9313% |
| Employee D | 10,000 common, 80,000 options at $0.10, 30,000 RSUs | 0.5588% |
| D Family Trust | 20,000 options at $0.10 | 0.0931% |
| Investor X | 2,000,000 Seed, 500,000 Series A, 25,000 Seed warrants, 367,202 Series B (from SAFEs) | 15.8249% |
| Investor Y | 250,000 common, 800,000 Seed, 1,500,000 Series A | 12.8053% |
| Investor S | 125,000 Seed, 367,202 Series B (from SAFEs) | 2.4374% |
| Lender L | 20,000 common, 75,000 Seed warrants | 0.5297% |
| Investor N | 440,082 Series B (from notes) | 2.0492% |
| Investor Z | 2,962,124 Series B | 13.7931% |
| Unissued pool | 2,147,540 | 10.0000% |

**Fully diluted:** 21,475,400 in all, under the solved x because each issue is rounded down.

**The Series B tier's preferences:**
- **Series B:** 2,962,124 × $2.7007642506 = $7,999,998.61
- **From SAFEs:** 734,404 × $0.6808225580 = $499,998.81, or $249,999.40 to each SAFE holder
- **From notes:** 440,082 × $0.6078565459 = $267,506.72

That's **$8,767,504.14** in all.

## Breakpoints

Strike cash is added to the proceeds. All the options, RSUs and warrants together bring $122,000:
- $12,000 from the $0.08 options
- $10,000 from the $0.10 options
- nothing from the RSUs
- $100,000 from the warrants

| Exit value | Why |
|---:|---|
| $8,767,504.14 | The Series B tier is paid. |
| $12,767,504.14 | Series A's preference is paid: + 2,000,000 × $2.00. |
| $15,692,504.14 | **Two at once.** The Seed's preference is paid: + 2,925,000 × $1.00. Common then gets its first dollar, so the RSUs, with no strike, are in the money from here. Above this, common, Series A and the RSUs share the rest: 9,130,000 + 2,000,000 + 30,000 = 11,160,000 shares. |
| $16,585,304.14 | The $0.08 options come into the money: 11,160,000 × $0.08 = $892,800 more. |
| $16,811,504.14 | The $0.10 options come into the money: 11,310,000 × $0.10 − $12,000 = $1,119,000 over the preferences. |
| $22,606,147.33 | The series from notes converts, at its $0.6078565459: 11,410,000 × $0.6078565459 − $22,000 = $6,913,643.19 over the preferences. |
| $23,470,800.55 | The series from SAFEs converts, at its $0.6808225580. With the notes' series converted, the preferences come to $15,424,997.42, and its 440,082 shares share as common: 11,850,082 × $0.6808225580 − $22,000. |
| $24,970,587.41 | **Two at once.** The Seed converts: at $0.80 a common share, its 1.25 common a share are worth its $1.00 preference. That's also where a Seed share is first worth more than the warrants' $1.00 strike, so they come into the money. Below it, a Seed share is worth exactly its $1.00 preference, so exercising gains nothing (E12). The preferences are $14,924,998.61, and 12,584,486 shares share the rest: 12,584,486 × $0.80 − $22,000. |
| $56,077,993.33 | Series B converts, at its $2.7007642506. The other 16,365,736 shares, Series A participating among them, share the rest, with all the strike cash: $7,999,998.61 + $4,000,000 + 16,365,736 × $2.7007642506 − $122,000. |
| $81,189,440.00 | Series A reaches its 3x cap, $12,000,000, at $4.00 a share: $4,000,000 + 19,327,860 × $4.00 − $122,000. |
| $115,845,160.00 | Series A converts. Its 2,000,000 shares at $6.00 are worth its capped $12,000,000. The other 17,327,860 shares share the rest: $12,000,000 + 17,327,860 × $6.00 − $122,000. |

**The order of conversions:** the three series with the lowest conversion prices convert first:
1. the notes' series, at $0.61
2. the SAFEs' series, at $0.68
3. the Seed, at $0.80

Then Series B converts at its own price, and Series A, capped at 3x, at 3 × its $2.00.

## Payouts by holder

Payouts are net of strike, so each column sums to the exit value, within a few cents of rounding (E3).

| Holder | $10M | $25M | $40M | $60M | $80M | $120M | $200M |
|---|---:|---:|---:|---:|---:|---:|---:|
| Founder A | 0 | 4,329,704.91 | 9,279,069.85 | 15,679,894.20 | 21,267,683.02 | 33,560,818.42 | 55,911,973.70 |
| Founder B | 0 | 2,726,110.50 | 5,842,377.31 | 9,872,525.98 | 13,390,763.39 | 21,130,885.67 | 35,203,835.29 |
| Employee C | 0 | 148,359.44 | 331,669.25 | 568,736.82 | 775,691.96 | 1,230,993.27 | 2,058,813.84 |
| Employee D | 0 | 88,215.66 | 198,201.55 | 340,442.09 | 464,615.18 | 737,795.96 | 1,234,488.30 |
| D Family Trust | 0 | 14,035.94 | 32,366.93 | 56,073.68 | 76,769.20 | 122,299.33 | 205,081.38 |
| Investor X | 558,123.37 | 3,699,869.32 | 6,814,717.31 | 10,843,031.08 | 14,359,666.65 | 21,096,264.91 | 35,162,807.19 |
| Investor Y | 924,371.90 | 5,204,942.32 | 7,725,452.24 | 10,985,131.31 | 13,830,764.50 | 17,091,157.53 | 28,473,690.31 |
| Investor S | 249,999.40 | 419,702.35 | 899,471.79 | 1,519,939.26 | 2,061,594.67 | 3,253,236.58 | 5,419,858.23 |
| Investor N | 267,506.72 | 352,856.52 | 756,213.26 | 1,277,859.11 | 1,733,245.27 | 2,735,094.83 | 4,556,639.48 |
| Lender L | 0 | 16,204.43 | 120,461.89 | 255,294.07 | 372,999.80 | 631,952.43 | 1,102,775.37 |
| Investor Z | 7,999,998.61 | 7,999,998.61 | 7,999,998.61 | 8,601,072.40 | 11,666,206.35 | 18,409,501.06 | 30,670,036.89 |
| *Common, a share* | $0 | $0.801797 | $1.718346 | $2.903684 | $3.938460 | $6.214966 | $10.354069 |

**Four to check by hand:**
- **$10M:**
  - The Series B tier takes $8,767,504.14:
    - Investor Z: $7,999,998.61
    - Investors X and S: $249,999.40 each
    - Investor N: $267,506.72
  - Series A shares the other $1,232,495.86 by shares:
    - Investor Y: 1,500,000 ÷ 2,000,000 of it, $924,371.90
    - Investor X: 500,000 ÷ 2,000,000 of it, $308,123.97, so $558,123.37 with its SAFE's
- **$25M:** just past the Seed's conversion. Series B still takes its preference and Series A participates. The price is ($25,000,000 − $7,999,998.61 − $4,000,000 + $122,000) ÷ 16,365,736 = **$0.801797** a share. So:
  - **Investor N:** 440,082 × that, $352,856.52.
  - **Investor S:** 125,000 Seed × 1.25 + 367,202 from SAFEs = 523,452 shares, $419,702.35.
- **$40M:** the same decisions, at ($40,000,000 − $7,999,998.61 − $4,000,000 + $122,000) ÷ 16,365,736 = **$1.718346** a share. Lender L's total is $120,461.89, net of strike:
  - its common: 20,000 × $1.718346 = $34,366.93
  - its warrants: 75,000 × (1.25 × $1.718346 − $1.00) = $86,094.96
- **$200M:** everything is common. ($200,000,000 + $122,000) ÷ 19,327,860 = **$10.354069** a share.
