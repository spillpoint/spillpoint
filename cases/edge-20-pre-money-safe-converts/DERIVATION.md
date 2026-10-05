# Edge case 20: derivation

A round case. A **pre-money SAFE** converts in a priced round.

## Before the Series A

- **Founders:** 8,000,000 common, Founder A 6,000,000 and Founder B 2,000,000.
- **An option pool** of 20%: 2,000,000 shares, with 500,000 options granted to Employee C at $0.25.

So there are 10,000,000 fully diluted shares: 8,500,000 issued stock and options, and an unissued pool of 1,500,000.

## Investor S's SAFE

Investor S paid **$1,000,000** for a YC pre-money SAFE: a **pre-money valuation cap of $8,000,000** and a **20% discount**. The Series A converts it. It converts at the lower of:
- **The discount price:** the round price × 80%.
- **The Safe Price:** $8,000,000 ÷ Company Capitalization.

**Company Capitalization,** in the YC pre-money SAFE's own definition, counts:
- the stock and options outstanding just before the round, **8,500,000**
- the pool **including the increase made in this financing**, so 15% of x after the top-up

It leaves out every SAFE and note (`ASSUMPTIONS.md` R24). Unlike edge case 19a's note, the SAFE's cap counts this round's top-up.

## The Series A

The Series A raises **$5,000,000** from **Investor Y** at a **$20,000,000 pre-money** valuation, $25,000,000 post-money. The unissued pool is topped up to **15%** of the post-money fully diluted shares, in the pre-money (R2, R16).

## Pricing the round

The SAFE's shares depend on the pool, which depends on the round:
- **Its shares at the cap:** $1,000,000 ÷ ($8,000,000 ÷ (8,500,000 + 15% of x)) = 1,062,500 + 1.875% of x.
- **Post-money fully diluted:** x = 8,500,000 + 15% of x (the pool) + 1,062,500 + 1.875% of x (the SAFE) + 20% of x (the new money), so x = 1,530,000,000/101 = **15,148,514.85**.
- **Price:** $25,000,000 ÷ x = **$1.650327** (exactly 505/306). The discount price is **$1.320261**.
- **Company Capitalization:** 8,500,000 + 15% of x = **10,772,277.23**. The Safe Price is $8,000,000 ÷ 10,772,277.23 = **$0.742647** (exactly 101/136). It's lower than the discount price, so the cap wins.
- **Shares issued,** each rounded down:
  - **Investor S:** $1,000,000 ÷ $0.742647 = 1,346,534.65, so **1,346,534** shares of **Series A Preferred (from SAFEs)** (R5). That's a $999,999.51 preference.
  - **Investor Y:** $5,000,000 ÷ $1.650327 = **3,029,702** Series A.
  - **The pool:** 15% of x, **2,272,277** shares.

## Cap table after the Series A

| Holder | Security | Shares | Fully diluted % |
|---|---|---:|---:|
| Founder A | Common | 6,000,000 | 39.61% |
| Founder B | Common | 2,000,000 | 13.20% |
| Employee C | Options ($0.25) | 500,000 | 3.30% |
| Investor S | Series A Preferred (from SAFEs) | 1,346,534 | 8.89% |
| Investor Y | Series A Preferred | 3,029,702 | 20.00% |
| Unissued pool | | 2,272,277 | 15.00% |
| **Total** | | **15,148,513** | **100.00%** |

## Compared with edge case 19a

The SAFE and 19a's note both have an $8,000,000 pre-money cap and a 20% discount. Two differences:
- **The SAFE converts only its $1,000,000.** A SAFE earns no interest, while the note converts $1,060,000.
- **The SAFE's cap counts the round's top-up.** So its cap price is $0.742647, against the note's $0.80.

Per dollar converted, the SAFE gets more shares: 1.35 against 1.25.
