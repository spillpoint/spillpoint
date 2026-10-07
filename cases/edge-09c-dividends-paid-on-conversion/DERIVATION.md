# Edge case 9c: derivation

This is edge case 9's company and dividends, with one change: Seed's accrued dividends are **paid on conversion** instead of forfeited.

The company:
- **Common:** Founder A 6,000,000 and Founder B 2,000,000.
- **Seed Preferred:** 2,000,000 shares bought at $1.50. Investor X holds 1,500,000 and Investor Y 500,000. A 1x non-participating preference of $3,000,000, with an 8% simple cumulative dividend accruing from 2022-03-31.
- **The sale:** on 2026-03-31.

## The dividends

As in case 9, 1,461 days at 8% simple, Actual/365:
- **Per share:** $1.50 × 0.08 × 1,461/365 = $0.48033 (exactly 4,383/9,125).
- **In all:** **$960,657.53** (exactly 70,128,000/73).

Kept as a preference, they add to it at 1x: $3,000,000 + $960,657.53 = **$3,960,657.53** (X4).

## The rule (`ASSUMPTIONS.md` X5)

**Paid on conversion, in cash, in the series' own tier.** Converting gives up the original-issue-price part of Seed's preference, $3,000,000, and keeps the dividend part, $960,657.53, where it ranked. So:
- **Keeping its preference,** Seed is paid $3,960,657.53 in its tier.
- **Converting,** Seed is paid $960,657.53 in its tier, then shares what is left as common: 2/10 of (exit value − $960,657.53).

**The dividends are paid either way.** So Seed converts once its share of what is left after them beats its $3,000,000 original preference.

**The other reading** (X5, refused): the dividends are added to what converts. Each Seed share would convert ($1.50 + $0.48033) ÷ $1.50 into common: 2,640,438.36 shares in all, sharing the whole exit value. At $40M that would pay Seed $9,926,051.04, against $8,768,526.03 here. Charters are written both ways. The engine and the reference refuse that reading until a case settles it.

## Breakpoints

| Exit value | Why |
|---:|---|
| $3,960,657.53 | Seed's preference, with its dividends, is fully paid. Above this, common shares the residual. |
| $15,960,657.53 | Seed converts: 2/10 of (exit value − $960,657.53) equals its $3,000,000 original preference. That is at $960,657.53 + 5 × $3,000,000. |

In case 9, Seed converts at $19,803,287.67. There, converting forfeits the dividends, so its share of the whole exit value must reach $3,960,657.53.

## Payouts

| Exit | Founder A | Founder B | Investor X (Seed) | Investor Y (Seed) |
|---:|---:|---:|---:|---:|
| $1M | 0 | 0 | 750,000 | 250,000 |
| $3M | 0 | 0 | 2,250,000 | 750,000 |
| $3,960,657.53 | 0 | 0 | 2,970,493.15 | 990,164.38 |
| $4M | 29,506.85 | 9,835.62 | 2,970,493.15 | 990,164.38 |
| $5M | 779,506.85 | 259,835.62 | 2,970,493.15 | 990,164.38 |
| $15M | 8,279,506.85 | 2,759,835.62 | 2,970,493.15 | 990,164.38 |
| $15,960,657.53 | 9,000,000 | 3,000,000 | 2,970,493.15 | 990,164.38 |
| $19M | 10,823,605.48 | 3,607,868.49 | 3,426,394.52 | 1,142,131.51 |
| $20M | 11,423,605.48 | 3,807,868.49 | 3,576,394.52 | 1,192,131.51 |
| $40M | 23,423,605.48 | 7,807,868.49 | 6,576,394.52 | 2,192,131.51 |
| $60M | 35,423,605.48 | 11,807,868.49 | 9,576,394.52 | 3,192,131.51 |

- **At $20M:** Seed gets $960,657.53 + 2/10 × $19,039,342.47 = **$4,768,526.03**, against $4,000,000 in case 9.
- **At $15,960,657.53:** Seed is indifferent, and the case shows it keeping its preference (`ASSUMPTIONS.md` E5).
