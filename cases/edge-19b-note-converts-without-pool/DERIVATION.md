# Edge case 19b: derivation

A round case. A convertible note converts in a priced round, with its cap dividing by **without_pool**.

## Before the Series A

- **Founders:** 8,000,000 common, Founder A 6,000,000 and Founder B 2,000,000.
- **An option pool** of 20%: 2,000,000 shares, with 500,000 options granted to Employee C at $0.25.

So there are 10,000,000 fully diluted shares: 8,500,000 issued stock and options, and an unissued pool of 1,500,000.

## Investor N's note

Investor N lent **$1,000,000** on a convertible note on 2023-01-01:
- 6% simple interest
- a **pre-money valuation cap of $8,000,000**
- a **20% discount**

The Series A closes on 2024-01-01 and converts the note (`convert_notes`).

**What converts:** principal plus simple interest, Actual/365, to the round's date (`ASSUMPTIONS.md` X3, X11). That's 365 days at 6%: $1,000,000 × 6% × 365/365 = **$60,000** of interest, so **$1,060,000** converts.

**At the lower of two prices:**
- **The discount price** is the round price × 80%.
- **The cap price** is $8,000,000 ÷ the share count just before the round. Notes have no standard form, so what that count includes is a toggle (X10's `conversion_base`). Whatever it includes, it counts the pool as it stood before this round, not the top-up, and it counts no SAFE or note converting in the round.

In this case the count is `without_pool`: all issued stock and options, without the unissued pool, **8,500,000** shares. The cap price is $8,000,000 ÷ 8,500,000 = **$0.941176** (exactly 16/17).

## The Series A

The Series A raises **$5,000,000** from **Investor Y** at a **$20,000,000 pre-money** valuation, $25,000,000 post-money. The unissued pool is topped up to **15%** of the post-money fully diluted shares, in the pre-money (R2, R16).

## Pricing the round

The note's shares, $1,060,000 ÷ $0.941176 = **1,126,250**, sit in the pre-money with the pool top-up. The new money gets $5,000,000 ÷ $25,000,000 = 20% of the post-money fully diluted shares:
- **Post-money fully diluted:** x = 8,500,000 + 15% of x (the pool) + 1,126,250 (the note) + 20% of x, so x = **192,525,000/13 = 14,809,615.38**.
- **Price:** $25,000,000 ÷ x = **$1.688092** (exactly 13000/7701).
- **The discount price** is 80% of that, **$1.350474**. The cap price, $0.941176, is lower, so the cap wins.
- **Shares issued,** each rounded down (R3):
  - **Investor N:** **1,126,250** shares of **Series A Preferred (from notes)**: a series of its own with the Series A's rights, priced at the note's $0.941176, so its preference is the $1,060,000 that converted.
  - **Investor Y:** $5,000,000 ÷ $1.688092 = **2,961,923** Series A.
  - **The pool:** topped up to 15% of x, **2,221,442** shares.

## Cap table after the Series A

| Holder | Security | Shares | Fully diluted % |
|---|---|---:|---:|
| Founder A | Common | 6,000,000 | 40.51% |
| Founder B | Common | 2,000,000 | 13.50% |
| Employee C | Options ($0.25) | 500,000 | 3.38% |
| Investor N | Series A Preferred (from notes) | 1,126,250 | 7.60% |
| Investor Y | Series A Preferred | 2,961,923 | 20.00% |
| Unissued pool | | 2,221,442 | 15.00% |
| **Total** | | **14,809,615** | **100.00%** |

Series A and Series A Preferred (from notes) are pari passu.

Leaving the pool out raises the cap price from 19a's $0.80 to $0.941176, so the note gets 198,750 fewer shares. 19a compares all three counts.
