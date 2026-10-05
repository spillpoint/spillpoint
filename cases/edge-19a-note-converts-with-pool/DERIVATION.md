# Edge case 19a: derivation

A round case. A convertible note converts in a priced round, with its cap dividing by **with_pool (the default)**.

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

In this case the count is `with_pool (the default)`: all issued stock and options and the unissued pool, 8,500,000 + 1,500,000, **10,000,000** shares. The cap price is $8,000,000 ÷ 10,000,000 = **$0.80**.

## The Series A

The Series A raises **$5,000,000** from **Investor Y** at a **$20,000,000 pre-money** valuation, $25,000,000 post-money. The unissued pool is topped up to **15%** of the post-money fully diluted shares, in the pre-money (R2, R16).

## Pricing the round

The note's shares, $1,060,000 ÷ $0.80 = **1,325,000**, sit in the pre-money with the pool top-up. The new money gets $5,000,000 ÷ $25,000,000 = 20% of the post-money fully diluted shares:
- **Post-money fully diluted:** x = 8,500,000 + 15% of x (the pool) + 1,325,000 (the note) + 20% of x, so x = **196,500,000/13 = 15,115,384.62**.
- **Price:** $25,000,000 ÷ x = **$1.653944** (exactly 650/393).
- **The discount price** is 80% of that, **$1.323155**. The cap price, $0.80, is lower, so the cap wins.
- **Shares issued,** each rounded down (R3):
  - **Investor N:** **1,325,000** shares of **Series A Preferred (from notes)**: a series of its own with the Series A's rights, priced at the note's $0.80, so its preference is the $1,060,000 that converted.
  - **Investor Y:** $5,000,000 ÷ $1.653944 = **3,023,076** Series A.
  - **The pool:** topped up to 15% of x, **2,267,307** shares.

## Cap table after the Series A

| Holder | Security | Shares | Fully diluted % |
|---|---|---:|---:|
| Founder A | Common | 6,000,000 | 39.69% |
| Founder B | Common | 2,000,000 | 13.23% |
| Employee C | Options ($0.25) | 500,000 | 3.31% |
| Investor N | Series A Preferred (from notes) | 1,325,000 | 8.77% |
| Investor Y | Series A Preferred | 3,023,076 | 20.00% |
| Unissued pool | | 2,267,307 | 15.00% |
| **Total** | | **15,115,383** | **100.00%** |

Series A and Series A Preferred (from notes) are pari passu.

## If the cap had counted this round's top-up

Notes have no standard form, and some count the pool as enlarged by the financing (as the YC pre-money SAFE does, edge case 20).
- **The count:** 8,500,000 + 15% of x.
- **Solving again:** x = 15,276,730.81, a price of $1.636476, and a cap price of $8,000,000 ÷ 10,791,509.62 = **$0.741324**.
- **The note:** **1,429,875** shares instead of 1,325,000, about 104,875 more, paid for by the founders and the other existing holders.

spillpoint counts the pool as it stood before the round (`with_pool`), as R4 does for post-money SAFEs.

## The three counts compared

| | 19a `with_pool` | 19b `without_pool` | 19c `common_only` |
|---|---:|---:|---:|
| Count the cap divides by | 10,000,000 | 8,500,000 | 8,000,000 |
| Cap price | $0.800000 | $0.941176 | $1.000000 |
| Note shares | 1,325,000 | 1,126,250 | 1,060,000 |
| Round price | $1.653944 | $1.688092 | $1.699791 |
| Founders A + B | 52.93% | 54.02% | 54.39% |

The bigger the count, the lower the cap price, and the more shares the note gets.
