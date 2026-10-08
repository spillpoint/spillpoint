# Edge case 21b: derivation

A post-money SAFE and a convertible note converting in the same Series A. This was refused until now, because the post-money SAFE's Company Capitalization counts the note's shares, which depend on the round (R24). You settled it in the 0.3.0 plan, answer 2: count them, solved together with the price.

## The company before the Series A

1. **Founding, Jan 10, 2022:** Founder A 6,000,000 common and Founder B 3,000,000, so 9,000,000 shares. There's no pool and no options.
2. **SAFE, Jan 1, 2023:** Investor S, $1,000,000, a $10,000,000 post-money cap, no discount.
3. **Note, Jan 1, 2023:** Investor N, $500,000 at 6% simple interest, an $8,000,000 pre-money cap on the shares outstanding and the pool (`with_pool`), a 20% discount.
4. **Series A, Jan 1, 2024:** Investor Y invests $5,000,000 at a $20,000,000 pre-money valuation, $25,000,000 post-money. It converts the SAFE (by default) and the note (`convert_notes`).

## The note (R23)

- **Interest:** 365 days, Actual/365: $500,000 × 6% = $30,000. $530,000 converts.
- **Its base leaves out every SAFE and note:** the 9,000,000 shares just before the round, with no pool.
- **Cap price:** $8,000,000 ÷ 9,000,000 = **$0.888889**.
- **Discount price:** 0.8 × the round's price, about $1.50 (below). The cap price is lower, so it converts at the cap: $530,000 ÷ $0.888889 = **596,250 shares**.

## The SAFE (R4, R24)

The YC post-money SAFE's Company Capitalization counts "all Converting Securities", other SAFEs and convertible notes included. So it counts the note's 596,250 shares, as well as the SAFE's own shares:
- **Capitalization** = (9,000,000 + 596,250) ÷ (1 − $1,000,000 ÷ $10,000,000) = 9,596,250 ÷ 0.9 = **10,662,500**.
- **Conversion price:** $10,000,000 ÷ 10,662,500 = **$0.937866**.
- **Shares:** $1,000,000 ÷ $0.937866 = **1,066,250**, exactly 10% of the Capitalization, as a post-money SAFE promises.

## The round's price

The round is priced on the post-money fully diluted shares, x:
- **What x counts:** the 9,000,000, the note's 596,250, the SAFE's 1,066,250, and the new shares.
- **The new shares** are $5,000,000 ÷ price, or $5M ÷ ($25M ÷ x) = x ÷ 5.
- **Solving:** x = 10,662,500 + x ÷ 5, so x = **13,328,125**.
- **The price:** $25,000,000 ÷ 13,328,125 = **$1.875733** ($1,600 ÷ 853 exactly).
- **Investor Y** gets 2,665,625 shares, 20%.

**Checking the branches:** the discount price is 0.8 × $1.875733 = $1.500586, above both caps' prices, so both convert at their caps. That's consistent.

Here the note's shares don't depend on the price, since it converts at its cap. They would if it converted at its discount; then the SAFE's Capitalization and the price would be solved together. Either way, each term is a straight line in x, so it solves exactly.

## The cap table after the Series A

| Holder | Class | Shares | Fully diluted |
|---|---|---:|---:|
| Founder A | Common | 6,000,000 | 45.0176% |
| Founder B | Common | 3,000,000 | 22.5088% |
| Investor S | Series A Preferred (from SAFEs), at $0.937866 | 1,066,250 | 8.0000% |
| Investor N | Series A Preferred (from notes), at $0.888889 | 596,250 | 4.4736% |
| Investor Y | Series A Preferred, at $1.875733 | 2,665,625 | 20.0000% |
| Total | | 13,328,125 | |

The SAFE ends with 10% of the Capitalization, and 8% of the company after the new money's 20%.

## For comparison: leaving the note out

If the SAFE's Capitalization left out the note:
- **The Capitalization** would be 9,000,000 ÷ 0.9 = 10,000,000, and the SAFE would get 1,000,000 shares.
- **The note's 596,250 shares** would dilute it.
- **The total** would be (9,000,000 + 596,250 + 1,000,000) ÷ 0.8 = 13,245,312.5.
- **The SAFE** would end with 7.55%, not 8%.

That reading isn't modeled.
