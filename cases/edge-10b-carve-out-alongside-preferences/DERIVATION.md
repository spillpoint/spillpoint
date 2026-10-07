# Edge case 10b: derivation

This is edge case 10's company and carve-out, with one change: the carve-out is **paid alongside the preferences** instead of before them.

The company:
- **Common:** Founder A 4,500,000 and Founder B 1,500,000.
- **Series A Preferred:** 4,000,000 shares held by Investor X, bought at $2.50. A 1x non-participating preference of $10,000,000, in one tier.
- **The carve-out:** 10% of the first $10,000,000 of exit value and 5% of the next $10,000,000, marginal like tax brackets (X6). That is at most $1,500,000. Founder A gets 60% and Manager M 40%.

## The rule (`ASSUMPTIONS.md` X7)

**Alongside preferences, the carve-out joins the most senior tier.** It shares that tier pro rata by claim with the preferences there. Its claim is what case 10 would pay it: the percentages of the exit value. Here the senior tier is Series A's.
- **Where the tier is paid in full,** the carve-out gets its whole claim, exactly as in case 10.
- **Where it isn't,** the carve-out and Series A split the exit value in proportion to their claims.

**Why the senior tier, not the junior.** A carve-out exists to pay management when the preferences would otherwise leave common nothing. Joining the most junior tier would put it behind every senior series, unpaid in just the sales it is meant for. Joining the senior tier is the smallest step from "before all preferences", the same meaning of "alongside" a round's seniority uses (M4j).

## The payouts curve below $11,052,631.58

While the tier is short, the carve-out's share is:

> exit value × its claim ÷ (its claim + $10,000,000)

Its claim grows with the exit value, so this share isn't a straight line in the exit value. So **payouts curve** on this stretch: these are spillpoint's first curved payoffs.
- **Up to $10,000,000:** the claim is 10% of E, and the carve-out gets E² ÷ (E + $100,000,000).
- **From $10,000,000 to $11,052,631.58:** the claim is $500,000 + 5% of E.

`SPEC.md` defines a breakpoint as a slope change. On a curve the slope changes everywhere, so here a breakpoint is **where the formula changes**. `expected.json` flags each breakpoint with a curved stretch next to it: `payouts_curve_below`, `payouts_curve_above`.

## Breakpoints

| Exit value | Why |
|---:|---|
| $10,000,000 | The carve-out's 10% tier ends; its claim grows by 5% from here. The tier is short on both sides, so the payouts curve on both sides, and their slope changes here. |
| $11,052,631.58 | Series A's tier is paid in full: $10,000,000 for Series A and $1,052,631.58 for the carve-out. That is where E = $10,500,000 + 5% of E, so E = $10,500,000 ÷ 0.95. Above this, common shares the residual, and every payout is case 10's. |
| $20,000,000 | The carve-out's last tier ends, at $1,500,000 (as in case 10). |
| $26,500,000 | Series A converts: 4/10 of (exit value − $1,500,000) equals its $10,000,000 preference (as in case 10). |

## Payouts

| Exit | Carve-out, Founder A | Carve-out, Manager M | Investor X (Series A) | Founder A (common) | Founder B |
|---:|---:|---:|---:|---:|---:|
| $2M | 23,529.41 | 15,686.27 | 1,960,784.31 | 0 | 0 |
| $5M | 142,857.14 | 95,238.10 | 4,761,904.76 | 0 | 0 |
| $10M | 545,454.55 | 363,636.36 | 9,090,909.09 | 0 | 0 |
| $11M | 627,149.32 | 418,099.55 | 9,954,751.13 | 0 | 0 |
| $11,052,631.58 | 631,578.95 | 421,052.63 | 10,000,000 | 0 | 0 |
| $15M | 750,000 | 500,000 | 10,000,000 | 2,812,500 | 937,500 |
| $20M | 900,000 | 600,000 | 10,000,000 | 6,375,000 | 2,125,000 |
| $25M | 900,000 | 600,000 | 10,000,000 | 10,125,000 | 3,375,000 |
| $26.5M | 900,000 | 600,000 | 10,000,000 | 11,250,000 | 3,750,000 |
| $30M | 900,000 | 600,000 | 11,400,000 | 12,825,000 | 4,275,000 |
| $50M | 900,000 | 600,000 | 19,400,000 | 21,825,000 | 7,275,000 |

The whole carve-out, compared with case 10:

| Exit | Before preferences (case 10) | Alongside (here) |
|---:|---:|---:|
| $5M | $500,000.00 | $5M × $500,000 ÷ $10,500,000 = **$238,095.24** |
| $10M | $1,000,000.00 | $10M × $1,000,000 ÷ $11,000,000 = **$909,090.91** |
| $11M | $1,050,000.00 | $11M × $1,050,000 ÷ $11,050,000 = **$1,045,248.87** |

At $26.5M Series A is indifferent, and the case shows it keeping its preference (`ASSUMPTIONS.md` E5).
