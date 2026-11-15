# Outside case 1: derivation

**Source:** Brian Nichols, ["Waterfall modeling for startup exits: A step-by-step guide"](https://www.hustlefund.vc/post/exit-waterfall-modeling), Hustle Fund, August 10, 2026. Read on 2026-11-14. Only the article's numbers are used here: its inputs (`CASE.md`), and its payouts and breakpoints, set beside ours below. The working is our own.

`expected.json` comes from the reference calculator, as for every case. The article's figures match it exactly: all 20 payouts and all five breakpoints.

## How it pays

Series A is senior and Seed junior. As-converted, the company is 10,000,000 shares: Series A 2,000,000, Seed 2,000,000, and common 6,000,000.

1. **Up to $6M:** every dollar goes to Series A's 1x preference, $6,000,000.
2. **$6M to $8M:** every dollar goes to Seed's 1x preference, $2,000,000.
3. **$8M to $16M:** the residual, X − $8M, is shared by the 8,000,000 shares that take part:
   - Series A's 2,000,000, participating
   - common's 6,000,000

   Each gets (X − $8M) / 8,000,000. Seed stays preferred: its $2,000,000 beats its as-converted share while that price is under $1.00.
4. **At $16M,** the price reaches $1.00: (16 − 8) / 8. Seed's 2,000,000 shares as converted are worth $2,000,000, its preference exactly, so Seed is indifferent.
5. **$16M to $36M:** Seed converts. After Series A's $6M preference, all 10,000,000 shares share X − $6M, at (X − $6M) / 10,000,000 each. At $16M that's $1.00 too, so nothing jumps. Series A's total is $6M plus 2,000,000 × that price.
6. **At $36M,** Series A's total reaches its cap: $6M + 2,000,000 × (36 − 6) / 10 = $6M + $6M = $12M, 2x its original issue price.
7. **$36M to $60M:** Series A stays at $12M. The other 8,000,000 shares share X − $12M, at (X − $12M) / 8,000,000 each.
8. **At $60M,** that price is $6.00: (60 − 12) / 8. Series A's 2,000,000 shares as converted are worth $12,000,000, its cap exactly, so Series A is indifferent.
9. **Above $60M:** Series A converts too, and all 10,000,000 shares share the whole exit, X / 10,000,000 each.

At the two indifference points, $16M for Seed and $60M for Series A, the case shows the series keeping its preference (`ASSUMPTIONS.md` E5). The payouts are the same either way.

## Breakpoints

| Exit value | The article | Ours | Why |
|---:|---:|---:|---|
| $6,000,000 | $6M | $6,000,000.00 | Series A's preference is fully paid; Seed's starts. |
| $8,000,000 | $8M | $8,000,000.00 | Seed's preference is fully paid; the residual starts, shared as common with Series A participating. |
| $16,000,000 | $16M | $16,000,000.00 | Seed converts: at $1.00 a share, its as-converted share equals its $2M preference. |
| $36,000,000 | $36M | $36,000,000.00 | Series A reaches its 2x cap, $12M; it stays flat above. |
| $60,000,000 | $60M | $60,000,000.00 | Series A converts: at $6.00 a share, its as-converted share equals its $12M cap. |

Every breakpoint is exact: no rounding between the article's figure and ours.

## Payouts

The article gives each class's payout in millions; ours are to the cent, from `expected.json`. Each class here is one holder.

| Exit | | Series A | Seed | Founders | Employees |
|---:|---|---:|---:|---:|---:|
| $5M | the article | $5M | $0 | $0 | $0 |
| | ours | $5,000,000.00 | $0.00 | $0.00 | $0.00 |
| $10M | the article | $6.5M | $2M | $1.35M | $0.15M |
| | ours | $6,500,000.00 | $2,000,000.00 | $1,350,000.00 | $150,000.00 |
| $20M | the article | $8.8M | $2.8M | $7.56M | $0.84M |
| | ours | $8,800,000.00 | $2,800,000.00 | $7,560,000.00 | $840,000.00 |
| $45M | the article | $12M | $8.25M | $22.275M | $2.475M |
| | ours | $12,000,000.00 | $8,250,000.00 | $22,275,000.00 | $2,475,000.00 |
| $100M | the article | $20M | $20M | $54M | $6M |
| | ours | $20,000,000.00 | $20,000,000.00 | $54,000,000.00 | $6,000,000.00 |

All 20 match exactly. By hand, from "How it pays":

- **$5M** is under Series A's $6M preference, so all of it goes to Series A.
- **$10M:** the price is (10 − 8) / 8 = $0.25.
  - Series A: $6M + 2,000,000 × $0.25 = $6.5M
  - Seed: its $2M preference
  - Founders: 5,400,000 × $0.25 = $1.35M
  - Employees: 600,000 × $0.25 = $0.15M
- **$20M:** Seed has converted, so the price is (20 − 6) / 10 = $1.40.
  - Series A: $6M + 2,000,000 × $1.40 = $8.8M
  - Seed: 2,000,000 × $1.40 = $2.8M
  - Founders: $7.56M
  - Employees: $0.84M
- **$45M:** Series A is capped at $12M, so the price is (45 − 12) / 8 = $4.125.
  - Seed: $8.25M
  - Founders: $22.275M
  - Employees: $2.475M
- **$100M:** everyone has converted, so the price is $10.00.
  - Series A and Seed: $20M each
  - Founders: $54M
  - Employees: $6M

## What the case adds

It's the first case not written by us: a waterfall another party worked out and published, run through the engine with its inputs as stated. Its terms are covered by other cases already: a senior capped participating series over a junior non-participating one, as in case 25. What it adds is the check against outside arithmetic, which is 1.0's first gate.
