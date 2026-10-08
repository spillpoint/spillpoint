# Edge case 24: derivation

A company built from two events, then sold with a management carve-out given as a **term of the sale**: on the exit, not on a cap table (`ASSUMPTIONS.md` C6). Its cap table is built from its rounds, so there is no cap table in the inputs to put a carve-out on.

## The cap table the events build

1. **Founding, Jan 1, 2022:** Founder A 6,000,000 common and Founder B 2,000,000.
2. **Seed, Jan 1, 2023:** a $3,000,000 priced round at a $12,000,000 pre-money valuation. There's no pool and nothing converting, so the price is $12,000,000 ÷ 8,000,000 = **$1.50**. Investor X's $3,000,000 buys 2,000,000 shares of Seed Preferred: 1x, non-participating, with no anti-dilution.

The exit runs on the cap table after the Seed (C2):

| Holder | Class | Shares |
|---|---|---:|
| Founder A | Common | 6,000,000 |
| Founder B | Common | 2,000,000 |
| Investor X | Seed Preferred | 2,000,000 |

Manager M holds no shares.

## The carve-out

- **Size:** 10% of the exit value, one tier from $0 with no upper end (X6: a flat carve-out is one tier).
- **When it's paid:** before all preferences, the default (X7).
- **Who gets it:** all of it goes to Manager M.

So at exit value X, Manager M gets 0.1X, and 0.9X is left for the waterfall.

## The waterfall on what's left

- **Seed's preference:** 2,000,000 × $1.50 = $3,000,000. It's paid in full once 0.9X reaches $3,000,000, at **X = $3,333,333.33**.
- **Seed converts** once its 20% of what's left beats its preference: 0.2 × 0.9X > $3,000,000, so 0.18X > $3,000,000, at **X = $16,666,666.67**. There it is indifferent: 20% of $15,000,000 is $3,000,000. Converting changes no one's payout at that point, so payouts bend; they don't jump.

## Breakpoints

| Exit value | Why |
|---:|---|
| $3,333,333.33 | Seed's $3,000,000 preference is paid in full. Above this, the next dollar after the carve-out goes to common. |
| $16,666,666.67 | Seed converts: its 2,000,000 shares are worth $1.50 each, the same as its 1x preference. |

## Payouts at the listed exit values

| Exit | Manager M (carve-out) | Investor X (Seed) | Founder A | Founder B |
|---:|---:|---:|---:|---:|
| $2M | 200,000 | 1,800,000 | 0 | 0 |
| $10M | 1,000,000 | 3,000,000 | 4,500,000 | 1,500,000 |
| $20M | 2,000,000 | 3,600,000 | 10,800,000 | 3,600,000 |
| $40M | 4,000,000 | 7,200,000 | 21,600,000 | 7,200,000 |

- **At $10M:** $9,000,000 is left; Seed keeps its $3,000,000, and common's 8,000,000 shares share $6,000,000 at $0.75.
- **At $20M:** $18,000,000 is left. Seed has converted, so 10,000,000 shares share it at $1.80.

## Given once

A carve-out on both the cap table and the exit would leave unclear which governs, so the input is refused rather than either one being chosen (C6).
