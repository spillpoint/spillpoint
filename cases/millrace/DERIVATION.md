# Millrace Robotics: how the expected values are derived

This walks through `expected.json` in plain English. Inputs are in `CASE.md` and `inputs.json`. Math rules are in `docs/SPEC.md`, and every choice the spec leaves open is in `docs/ASSUMPTIONS.md`, cited below by ID (R1, E3, …).

All numbers here come from the reference calculator (`reference/`). It works in exact fractions. Money below is rounded to the cent and prices to a few decimals, for reading only. `expected.json` keeps exact values wherever rounding would matter.

---

## Part 1: building the cap table

### Founding (2021-02-01)
Ana Ortiz holds 5,500,000 common and Dev Patel holds 4,500,000, for 10,000,000 shares.

### Early hire (2021-06-01): Lena Fischer gets 6%
Lena must hold 6% *after* her shares are issued, so x ÷ (10,000,000 + x) = 6%. That gives x = 0.06 × 10,000,000 ÷ 0.94 = 638,297.87, rounded down to **638,297** (R1). There are now 10,638,297 common shares.

### Pre-seed SAFEs (2021-09-15)
Priya Shah ($300,000) and Marcus Lee ($150,000) buy YC post-money SAFEs with a $5,000,000 post-money cap. They hold no shares until the Seed round.

### Option pool (2021-10-01)
The pool is 10% of (issued common + pool). SAFEs are excluded, as the case states. P ÷ (10,638,297 + P) = 10% gives P = 10,638,297 ÷ 9 = **1,182,033** exactly (R2).

Grants at $0.05: Lena 40,000 and other employees 450,000. That leaves 692,033 unissued.

### Seed (2022-06-30): $2.5M at $7.5M pre-money

**Step 1: the SAFE price (R4).** A post-money SAFE buys purchase amount ÷ post-money cap of the company's "Company Capitalization". Together the two SAFEs buy $450,000 ÷ $5,000,000 = **9%** of it.

Company Capitalization counts:
- the common: 10,638,297
- the issued options: 490,000
- the pool as it stood *before* this round: 692,033
- the SAFEs themselves

It does not count the pool top-up or the new money. So it is 11,820,330 ÷ (1 − 9%) = 12,989,373.63 shares, and the Safe Price is $5,000,000 ÷ 12,989,373.63 = **$0.384930**.

**Step 2: the Seed price.** The $7.5M pre-money includes the SAFE shares and the pool topped up to 18% of the post-money fully diluted count. The new money is $2.5M ÷ $10M = 25% of the post-money. So the stock and options that already exist, plus the SAFE shares, are the remaining 57%:

  (10,638,297 + 490,000 + 1,169,043.63) ÷ 0.57 = 21,574,281.80 post-money FD shares

  Price = $10,000,000 ÷ 21,574,281.80 = **$0.463515**

The SAFE price of $0.384930 is lower than the Seed price, so the cap governs the conversion. The SAFE shares are counted fractionally while the price is solved, and rounded only when issued (R3).

**Step 3: issue the shares.**

| | Shares | How |
|---|---:|---|
| Harbor Lane, Seed Preferred | 5,393,570 | $2,500,000 ÷ $0.463515, rounded down |
| Priya Shah, Seed shadow series | 779,362 | $300,000 ÷ $0.384930, rounded down |
| Marcus Lee, Seed shadow series | 389,681 | $150,000 ÷ $0.384930, rounded down |
| Pool top-up | 3,191,337 | unissued pool = floor(18% × 21,574,281.80) = 3,883,370 |

The SAFEs convert into a **shadow series** of Seed Preferred (R5). It has the same rights as Seed: 1.5x, non-participating, pari passu with Seed. Its original issue price is the SAFE price, $0.384930, rather than the Seed price. So its preference is 1,169,043 × $0.384930 × 1.5 = **$674,999.64**, against Seed Preferred's 5,393,570 × $0.463515 × 1.5 = **$3,749,999.69**.

Harbor Lane now holds exactly 25.0000% of the fully diluted company.

### Grants before Series A
Other employees receive 1,100,000 options at $0.11, leaving 2,783,370 unissued.

### Series A (2023-09-30): $12M at $48M pre-money

New money is $12M ÷ $60M = 20% of the post-money, and the unissued pool is topped up to 15%. Everything else already issued (21,574,280 − 2,783,370 unissued = 18,790,910) is the remaining 65%:

  18,790,910 ÷ 0.65 = 28,909,092.31 post-money FD shares

  Price = $60,000,000 ÷ 28,909,092.31 = **$2.075472**

| | Shares |
|---|---:|
| Ridgeline, $9,000,000 | 4,336,363 |
| Harbor Lane, $3,000,000 | 1,445,454 |
| Pool top-up (unissued becomes floor(15% × 28,909,092.31) = 4,336,363) | 1,552,993 |

Harbor Lane's $3M is its pro-rata. Its pre-round fully diluted share was 25.0000%, and 25% × $12M = $3,000,000.00, so the amount the case gives matches the NVCA definition (R6). Series A is 1.25x participating, capped at a 2.75x total return. That makes its preference 5,781,817 × $2.075472 × 1.25 = **$14,999,996.21** and its cap **$32,999,991.66**.

### Grants before Series B
At $0.42: Dev 250,000, Lena 300,000, other employees 2,250,000. That leaves 1,536,363 unissued.

### Series B (2025-03-31): $10M at $36M pre-money, a down round

New money is $10M ÷ $46M = 21.74% of the post-money, and the pool is topped up to 12%. Because the Series B price ends up below Series A's $2.075472, Series A's **broad-based weighted-average anti-dilution** triggers. The extra common that Series A becomes convertible into is counted in the post-money share count too, per the spec default. So the price depends on the anti-dilution adjustment, and the adjustment depends on the price. Under fixed assumptions both are linear, so they solve exactly:

- **A** = shares outstanding before the round, as converted, without the unissued pool (R7): 28,909,090 − 1,536,363 = **27,372,727**.
- **Solved post-money FD:** 42,509,469.85 shares. That includes 794,417.37 anti-dilution shares.
- **Series B price:** $46,000,000 ÷ 42,509,469.85 = **$1.082112**. Cobalt gets $10,000,000 ÷ $1.082112 = **9,241,189** shares, rounded down.
- **CP2 (R8):** NVCA's formula CP2 = CP1 × (A + B) ÷ (A + C) uses:
  - CP1 = $2.075472
  - B = the consideration actually received (9,241,189 shares × $1.082112 = $9,999,999.90) ÷ CP1 = 4,818,182.00
  - C = the 9,241,189 shares issued

  CP2 = $2.075472 × (27,372,727 + 4,818,182.00) ÷ (27,372,727 + 9,241,189) = **$1.824752**. It is kept exact, with no rounding (R9).
- **Series A's new conversion ratio:** $2.075472 ÷ $1.824752 = **1.137399**. Its 5,781,817 shares now convert into **6,576,234.36** common, an extra 794,417.36. Its preference ($14,999,996.21) and cap ($32,999,991.66) do *not* change (E7).
- **Pool:** unissued becomes floor(12% × 42,509,469.85) = 5,101,136, a top-up of 3,564,773.

Series B is 2x participating, uncapped. Its preference is 9,241,189 × $1.082112 × 2 = **$19,999,999.79**. Payouts are cents under round numbers because shares round down at issuance.

### Final cap table (the exit input)

| Holder | Security | Shares | As-converted |
|---|---|---:|---:|
| Ana Ortiz | Common | 5,500,000 | 5,500,000 |
| Dev Patel | Common | 4,500,000 | 4,500,000 |
| Dev Patel | Options $0.42 | 250,000 | 250,000 |
| Lena Fischer | Common | 638,297 | 638,297 |
| Lena Fischer | Options $0.05 | 40,000 | 40,000 |
| Lena Fischer | Options $0.42 | 300,000 | 300,000 |
| Other employees | Options $0.05 | 450,000 | 450,000 |
| Other employees | Options $0.11 | 1,100,000 | 1,100,000 |
| Other employees | Options $0.42 | 2,250,000 | 2,250,000 |
| Priya Shah | Seed shadow | 779,362 | 779,362 |
| Marcus Lee | Seed shadow | 389,681 | 389,681 |
| Harbor Lane | Seed Preferred | 5,393,570 | 5,393,570 |
| Harbor Lane | Series A Preferred | 1,445,454 | 1,644,058.31 |
| Ridgeline | Series A Preferred | 4,336,363 | 4,932,176.06 |
| Cobalt | Series B Preferred | 9,241,189 | 9,241,189 |
| Unissued pool | | 5,101,136 | never participates |

Seniority: Series B first, then Series A, then the Seed tier (Seed Preferred and the shadow series, pari passu).

---

## Part 2: the exit waterfall, $0 to $300M

How the waterfall works at any exit value:

1. Pay preferences tier by tier, top-down. A tier that can't be paid in full splits what's left in proportion to each series' preference amount.
2. Share what remains (the residual) per as-converted share among:
   - common
   - exercised options
   - converted preferred
   - participating preferred (Series B always; Series A until it hits its cap)

   As-converted shares are exact fractions (E2).
3. Each non-participating series, and capped Series A, takes whichever pays more: staying preferred or converting. Each option strike class exercises if it is in the money. Exercising pays the strike into the proceeds. Option payouts here are net of strike, so every column sums to the exit value (E3).

The reference tries all 64 combinations of these six decisions at every exit value and keeps the stable ones. Millrace has a single stable answer everywhere.

### The 10 breakpoints

| # | Exit value | What changes |
|---|---:|---|
| 1 | $19,999,999.79 | Series B's 2x preference is fully paid. Series A's preference starts filling. |
| 2 | $34,999,996.00 | Series A's 1.25x preference ($14,999,996.21) is fully paid. The Seed tier starts filling. |
| 3 | $39,424,995.32 | The Seed tier ($3,749,999.69 + $674,999.64) is fully paid. Common, Series A and Series B start sharing the residual. |
| 4 | $40,747,781.34 | Common reaches $0.05. The 490,000 $0.05 options are exercised. |
| 5 | $42,364,524.56 | Common reaches $0.11. The 1,100,000 $0.11 options are exercised. |
| 6 | $51,058,697.87 | Common reaches $0.42. The 2,800,000 $0.42 options are exercised. |
| 7 | $55,913,661.49 | The Seed shadow series converts. Common reaches $0.577395 = 1.5 × $0.384930, its preference per share. |
| 8 | $59,687,473.06 | Seed Preferred converts. Common reaches $0.695272 = 1.5 × $0.463515. |
| 9 | $136,069,894.04 | Series A hits its 2.75x cap ($32,999,991.66) and stops growing. |
| 10 | $206,396,062.86 | Series A converts. 6,576,234.36 as-converted shares × $5.018068 = $32,999,991.66, equal to its cap. Above this, converting pays more. |

### Why each one sits where it does

**1–3: the preference stack.** Below $20M, Cobalt (Series B) takes every dollar. At $10M, Cobalt gets all $10M and everyone else gets nothing. From $20M to $35M the dollars go to Series A, split between Ridgeline and Harbor Lane in proportion to their shares. From $35M to $39.42M they go to the Seed tier: Harbor Lane's Seed Preferred and Priya and Marcus's shadow series, in proportion to their preferences (3,749,999.69 : 674,999.64). The total stack is 19,999,999.79 + 14,999,996.21 + 4,424,999.33 = **$39,424,995.32**. Until then common, including Ana, Dev and Lena, gets **nothing**.

**4–6: options come into the money.** Above $39.42M, the residual is shared per as-converted share. The sharers are common (10,638,297), Series A (6,576,234.36) and Series B (9,241,189). Seed and the shadow series sit out for now because they're better off keeping their preference. That is 26,455,720.36 shares, so each extra dollar of exit raises common by 1 ÷ 26,455,720.36.

When the price per share reaches a strike, that strike class exercises. Its holders pay in the strike, and from then on each extra dollar is shared across more shares. For the $0.05 options: (40,747,781.34 − 39,424,995.32) ÷ 26,455,720.36 = $0.05. Each later strike works the same way, on the larger share count.

**7–8: the Seed tier converts.** A non-participating holder converts once its per-share slice of common beats its per-share preference. The shadow series' preference per share is 1.5 × $0.384930 = **$0.577395**. Seed Preferred's is 1.5 × $0.463515 = **$0.695272**. Because the SAFE converted at a lower price, the shadow series' preference per share is lower, so it converts first, at $55.91M, and Seed follows at $59.69M. Between those two exit values, Priya and Marcus share in the upside while Harbor Lane's Seed still sits on its preference.

**9–10: Series A's cap and the dead zone.** Series A takes its preference and then participates, until preference plus participation reaches 2.75 × its $12M investment, which is $32,999,991.66. That happens at $136.07M. From there, Series A's payout is **flat**: Ridgeline gets $24,749,995.17 at every exit value from $136.07M to $206.40M. Series A converts once its as-converted share of common is worth more than the cap. Anti-dilution gave it 6,576,234.36 as-converted shares, and $32,999,991.66 ÷ 6,576,234.36 = $5.018068 per share, which common reaches at **$206.40M**. Without the Series B anti-dilution adjustment, Series A would have only 5,781,817 as-converted shares. It would then need common to reach $5.7075 per share before converting.

### Payouts by holder (net of strike, rounded to the cent)

| Holder | $10M | $25M | $40M | $50M | $75M | $100M | $150M | $225M | $300M |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Ana Ortiz | 0.00 | 0.00 | 119,540.34 | 2,102,380.50 | 6,075,338.08 | 9,750,989.67 | 17,539,133.39 | 30,334,638.01 | 41,361,592.78 |
| Dev Patel | 0.00 | 0.00 | 97,805.73 | 1,720,129.50 | 5,141,882.88 | 8,316,309.26 | 15,042,433.38 | 26,093,096.46 | 35,616,375.58 |
| Lena Fischer | 0.00 | 0.00 | 13,873.13 | 257,279.71 | 952,633.64 | 1,606,429.81 | 2,991,723.92 | 5,267,688.25 | 7,229,076.75 |
| Other employees | 0.00 | 0.00 | 0.00 | 448,989.05 | 3,109,006.31 | 5,648,547.41 | 11,029,446.71 | 19,869,977.17 | 27,488,600.47 |
| Priya Shah | 0.00 | 0.00 | 449,999.76 | 449,999.76 | 860,888.66 | 1,381,736.51 | 2,485,333.47 | 4,298,484.39 | 5,861,027.94 |
| Marcus Lee | 0.00 | 0.00 | 224,999.88 | 224,999.88 | 430,444.33 | 690,868.26 | 1,242,666.73 | 2,149,242.20 | 2,930,513.97 |
| Harbor Lane Ventures Fund I | 0.00 | 1,249,999.84 | 7,535,731.05 | 8,128,441.02 | 11,523,811.35 | 16,227,060.38 | 25,449,731.70 | 38,815,255.84 | 52,925,002.94 |
| Ridgeline Capital Fund III | 0.00 | 3,750,000.38 | 11,357,196.71 | 13,135,327.04 | 16,698,113.62 | 19,994,288.31 | 24,749,995.17 | 27,202,868.24 | 37,091,392.29 |
| Cobalt Family Office LLC | 10,000,000.00 | 19,999,999.79 | 20,200,853.40 | 23,532,453.53 | 30,207,881.13 | 36,383,770.41 | 49,469,535.52 | 70,968,749.44 | 89,496,417.28 |
| **Price per common share** | $0.0000 | $0.0000 | $0.0217 | $0.3823 | $1.1046 | $1.7729 | $3.1889 | $5.5154 | $7.5203 |

`expected.json` also has payouts at every breakpoint and splits every holder by security, e.g. Lena's common, $0.05 options and $0.42 options as three lines (E9).

### A founder's reading

- **Below $39.4M, the founders get nothing.** The preference stack ahead of common is $39.42M. Series B's 2x preference alone is half of it.
- **Series B dominates at every exit.** It holds 21.7% of the fully diluted company, but because it is participating and uncapped it takes its $20M preference *and* its full pro-rata share. At $100M that is $36.4M, or 36% of the proceeds.
- **The down round cost common twice.** Series B came in at $1.08 against Series A's $2.08. Anti-dilution gave Series A 794,417 extra as-converted shares, which dilutes common in every exit above $39.4M. Those extra shares also moved Series A's conversion point down to $206.4M.
- **At $100M**, Ana takes $9.75M (9.8%) for 12.9% of the fully diluted company.

### Checking this independently

To re-derive by hand or in a spreadsheet:
1. Rebuild the cap table above. The share counts must match exactly, within 1 share.
2. At each exit value, apply the decisions shown in `expected.json` → `decisions`. Run the tiers, then share the residual. Check the payouts within $1.
3. Check each breakpoint by its condition in the table above, e.g. common price = strike, or a tier's total paid. Each should hold within $1.
