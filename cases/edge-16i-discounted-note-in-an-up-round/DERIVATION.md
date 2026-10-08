# Edge case 16i: derivation

A note converting at its discount **below** the Seed's conversion price, in a round priced **above** it. This is where testing each piece at its own price (the 0.3.0 plan's answer 3c) differs from testing the round as one issue at its average price. The note was issued after the Seed, so its conversion is an issue of its own (answer 3a).

## The company before the Series A

1. **Founding:** Founder A 6,000,000 common and Founder B 2,000,000.
2. **Seed, Jun 30, 2022:** Investor X's 2,000,000 shares at **$1.00**, with broad-based anti-dilution (R7).
3. **Note, Jul 1, 2023:** Investor N, $500,000 at 6% simple interest, **no cap, a 20% discount**.
4. **Series A, Jun 30, 2024:** Investor Y's $3,000,000 at a $12,000,000 pre-money valuation, $15,000,000 post-money. It converts the note.

**The note's interest:** Jul 1, 2023 to Jun 30, 2024 is 365 days, a leap day among them, so 6% × 365 ÷ 365 = $30,000, and **$530,000 converts**. That's the debt its shares cancel, and what was paid for them (answer 3a).

## The pieces, against the Seed's $1.00

| Piece | Price | Below $1.00? |
|---|---:|---|
| The new money | P ≈ $1.1326 | **no**: it stays out of the formula |
| Investor N's note | 0.8P ≈ $0.9061 | **yes**: it counts in B and C |

So the note's conversion adjusts the Seed **on its own**, in a round priced above the Seed:
- **A** = 10,000,000.
- **B** = $530,000 ÷ $1.00 = 530,000.
- **C** = the note's shares.

## Solving the round (R10)

Call the post-money shares x; P = $15,000,000 ÷ x.
- **The note's shares:** $530,000 ÷ (0.8P) = 0.0441667x.
- **The Seed's ratio** becomes (10,000,000 + 0.0441667x) ÷ 10,530,000. Its 2,000,000 shares gain 2,000,000 × (0.0441667x − 530,000) ÷ 10,530,000.
- **Solving:** x = 10,000,000 + 0.0441667x + 0.2x + that gain, which gives x = **13,244,239.37**.
- **The price:** $15,000,000 ÷ x = **$1.132568**, above $1.00.
- **The note's conversion price:** 0.8 × $1.132568 = **$0.906054**, below $1.00.

## The Seed's new conversion price (R8)

- **The note's shares:** $530,000 ÷ $0.906054 = 584,953.4, issued **584,953**.
- **Investor Y:** $3,000,000 ÷ $1.132568 = 2,648,847.
- **A** = 10,000,000; **B** = 530,000; **C** = 584,953.
- **CP2** = $1.00 × 10,530,000 ÷ 10,584,953 = **$0.994808**.
- **Each Seed share** now converts into 1.005219 common.

## For comparison: the round as one issue (not modeled)

Test the round as one issue at its average price, everything it issues against everything paid for it:
- **Without an adjustment,** the round would price at $1.133750: x = 13,230,430, with no adjustment shares.
- **The note's shares:** 584,343 at $0.907.
- **Investor Y:** 2,646,085.
- **The average price:** ($2,999,998.87 + $530,000) ÷ (2,646,085 + 584,343) = **$1.092734**, above $1.00.

So under that reading **the Seed isn't adjusted at all.** Testing each piece at its own price adjusts it, because the note's discounted conversion is its own issue below the Seed's price. That's the usual reason bridges get carved out, which 16h's toggle allows. `ASSUMPTIONS.md` R25 records the one-issue reading as an alternative, not modeled.

## The cap table after the Series A

| Holder | Class | Shares | Fully diluted |
|---|---|---:|---:|
| Founder A | Common | 6,000,000 | 45.3027% |
| Founder B | Common | 2,000,000 | 15.1009% |
| Investor X | Seed Preferred, converting at 1.005219 | 2,000,000 | 15.1797% |
| Investor N | Series A Preferred (from notes), at $0.906054 | 584,953 | 4.4167% |
| Investor Y | Series A Preferred, at $1.132568 | 2,648,847 | 20.0000% |
