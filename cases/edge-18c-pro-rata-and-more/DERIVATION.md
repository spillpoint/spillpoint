# Edge case 18c: derivation

A round case. Edge case 18 with Investor X investing **more than its pro-rata**: its full entitlement marked pro-rata, and the rest as an ordinary investment in the same round.

## Before the Series A

- **Founder A:** 8,000,000 common.
- **The Seed:** $2,000,000 at $1.00 a share. **Investor X** holds 2,000,000 Seed, and has pro-rata rights.
- **Investor Z's post-money SAFE:** $1,000,000 with an $11,000,000 cap.

## The Series A

The Series A raises **$7,100,000** at a **$33,000,000 pre-money** valuation, $40,100,000 post-money:
- **Investor Y:** $5,000,000
- **Investor X:** **$2,100,000** in all, as two lines:
  - **$1,290,909.09,** marked pro-rata
  - **$809,090.91,** an ordinary investment

**Investor X's entitlement (R6):** its 2,000,000 Seed of an 11,000,000-share base (the SAFE's 1,000,000 shares counted, as in case 18), 18.181818% of the $7,100,000 round: **$1,290,909.09** (exactly $1,290,909.0909…).
- **The pro-rata line** is the entitlement rounded down to the cent, so it's within it.
- **Above the entitlement:** marking more as pro-rata would be refused, with a message to mark only the entitlement as pro-rata and enter the rest as an ordinary investment (M4d). That's what this case does.

**The SAFE converts** at $11,000,000 ÷ 11,000,000 = **$1.00** (R4), into **1,000,000** shares of Series A Preferred (from SAFEs).

**The round's price:** x = 11,000,000 + (7.1/40.1) x, so x = 13,366,666.67, and the price is $40,100,000 ÷ x = **$3.00**.

## One issuance per holder

A holder's lines in a round are added up and issued once, rounded down once (R3):
- **Investor X:** $2,100,000 ÷ $3.00 = **700,000** Series A.
- **Rounding each line separately** would give 430,303 + 269,696 = 699,999, a share less, because both lines' fractions would be dropped.
- **Investor Y:** $5,000,000 ÷ $3.00 = **1,666,666**.

## Cap table after the Series A

| Holder | Security | Shares | Fully diluted % |
|---|---|---:|---:|
| Founder A | Common | 8,000,000 | 59.85% |
| Investor X | Seed Preferred | 2,000,000 | 14.96% |
| Investor Z | Series A Preferred (from SAFEs) | 1,000,000 | 7.48% |
| Investor Y | Series A Preferred | 1,666,666 | 12.47% |
| Investor X | Series A Preferred | 700,000 | 5.24% |
| **Total** | | **13,366,666** | **100.00%** |
