# Edge case 21c: derivation

A pre-money SAFE and a post-money SAFE converting in the same Series A. This was refused until now: the post-money SAFE's Company Capitalization counts the pre-money SAFE's shares (R24). It follows the rule 21b settles, the 0.3.0 plan's answer 2.

## The company before the Series A

1. **Founding, Jan 10, 2022:** Founder A 6,000,000 common and Founder B 3,000,000, so 9,000,000 shares. There's no pool.
2. **Pre-money SAFE, Jun 1, 2022:** Investor P, $800,000, an $8,000,000 pre-money cap, no discount.
3. **Post-money SAFE, Jan 1, 2023:** Investor S, $1,000,000, a $10,000,000 post-money cap, no discount.
4. **Series A, Jan 1, 2024:** Investor Y invests $5,000,000 at a $20,000,000 pre-money valuation, $25,000,000 post-money.

## The pre-money SAFE (R24)

The YC pre-money SAFE's Company Capitalization counts the stock and options outstanding and the unissued pool, and **leaves out every SAFE and note**: here 9,000,000.
- **Conversion price:** $8,000,000 ÷ 9,000,000 = **$0.888889**.
- **Shares:** $800,000 ÷ $0.888889 = **900,000**.

## The post-money SAFE (R4, R24)

Its Company Capitalization counts the converting securities, Investor P's 900,000 shares included, and the SAFE itself:
- **Capitalization** = (9,000,000 + 900,000) ÷ (1 − $1,000,000 ÷ $10,000,000) = 9,900,000 ÷ 0.9 = **11,000,000**.
- **Conversion price:** $10,000,000 ÷ 11,000,000 = **$0.909091**.
- **Shares:** **1,100,000**, 10% of the Capitalization.

## The round's price

- **x counts:** 9,000,000 + 900,000 + 1,100,000 + the new shares, which are x ÷ 5 (the $5M is a fifth of the $25M post-money).
- **Solving:** x = 11,000,000 + x ÷ 5, so x = **13,750,000**.
- **The price:** $25,000,000 ÷ 13,750,000 = **$1.818182** ($20 ÷ 11).
- **Investor Y** gets 2,750,000 shares.

Neither SAFE has a discount, so each converts at its cap price, both below the round price.

## Two series from SAFEs

Each conversion price gets a series of its own (R5), with the Series A's rights, priced at that price:
- **Series A Preferred (from SAFEs):** Investor P's 900,000, at $0.888889.
- **Series A Preferred (from SAFEs) 2:** Investor S's 1,100,000, at $0.909091.

The round's seniority lists all three series in one tier.

## The cap table after the Series A

| Holder | Class | Shares | Fully diluted |
|---|---|---:|---:|
| Founder A | Common | 6,000,000 | 43.6364% |
| Founder B | Common | 3,000,000 | 21.8182% |
| Investor P | Series A Preferred (from SAFEs) | 900,000 | 6.5455% |
| Investor S | Series A Preferred (from SAFEs) 2 | 1,100,000 | 8.0000% |
| Investor Y | Series A Preferred | 2,750,000 | 20.0000% |
| Total | | 13,750,000 | |

**For comparison:** if the post-money SAFE left out Investor P's shares, its Capitalization would be 10,000,000 and its shares 1,000,000. That reading isn't modeled.
