# Edge case 22: derivation

A round case: `expected.json` gives the cap table after each event. It shows that **warrants count like options** (`ASSUMPTIONS.md` R29).
- **The rule.** NVCA's "Option" includes warrants, and so does the YC SAFE's "Options". So every count that includes issued options includes warrants too.
- **Here, three counts:** the Series A's post-money fully diluted shares, its pool top-up target, and the SAFE's Company Capitalization.

## The events

1. **Founding, 2022-01-10:** 9,000,000 common. Founder A 6,000,000, Founder B 3,000,000.
2. **Option pool, 2022-03-01:** 10% of the fully diluted shares after it: **1,000,000**.
3. **Grants, 2022-03-01:** 400,000 options at $0.10 to Employee C. 600,000 remain unissued.
4. **Warrants, 2022-09-01:** Lender L gets warrants for **200,000 common shares at $0.50**.
   - **Not from the pool:** the unissued pool stays at 600,000.
   - **The fully diluted count** rises from 10,000,000 to 10,200,000.
   - **No anti-dilution:** issuing them never triggers it. NVCA's Exempted Securities cover warrants issued to lenders and equipment lessors; here there is no preferred to adjust anyway.
5. **SAFE, 2023-01-01:** Investor S's $1,000,000 post-money SAFE, capped at $10,000,000.
6. **Series A, 2024-01-01:**
   - $5,000,000 from Investor Y at a $20,000,000 pre-money valuation, $25,000,000 post-money.
   - The unissued pool topped up to 10% of the post-money fully diluted shares.
   - The SAFE converts.

## The SAFE's Company Capitalization (R4)

It counts:
- all issued stock: 9,000,000
- issued options and warrants: 400,000 + **200,000**
- the unissued pool before the round: 600,000
- the converting SAFE itself, at $1M ÷ $10M of the count

So it is 10,200,000 ÷ 0.9 = **11,333,333.33** (exactly 34,000,000/3).
- **Safe Price:** $10,000,000 ÷ 11,333,333.33 = **$0.882353** (15/17).
- **Shares:** $1,000,000 ÷ $0.882353 = 1,133,333.33, rounded down to **1,133,333** of "Series A Preferred (from SAFEs)".

## The round's price (R2, R3, R16)

Call the post-money fully diluted shares x. Then:
- **The price** is $25,000,000 ÷ x.
- **The new shares** are $5,000,000 ÷ price = x/5.
- **The unissued pool after the round** is 10% of x.

So x = 9,600,000 (stock, options and **the warrants**) + 0.1x (the pool) + 1,133,333.33 (the SAFE) + 0.2x (the new shares).
- **Post-money fully diluted shares:** x = 10,733,333.33 ÷ 0.7 = **15,333,333.33** (exactly 46,000,000/3).
- **Price:** $25,000,000 ÷ 15,333,333.33 = **$1.630435** (75/46).
- **The pool:** 10% of x is 1,533,333.33, rounded down to **1,533,333**. That is a top-up of 933,333 from 600,000.
- **Investor Y:** $5,000,000 ÷ $1.630435 = 3,066,666.67, rounded down to **3,066,666** Series A shares.

## What the warrants changed

Without Lender L's 200,000 warrants:

| | With the warrants | Without |
|---|---:|---:|
| SAFE's Company Capitalization | 11,333,333.33 | 11,111,111.11 |
| SAFE's shares | 1,133,333 | 1,111,111 |
| Post-money fully diluted shares | 15,333,333.33 | 15,015,873.02 |
| Price per share | $1.630435 | $1.664905 |

The warrants dilute the pre-money holders, as options do: the price falls, so Investor Y buys more shares for its $5,000,000, and the pool is topped up on a larger count.

## The cap table after the Series A

| Holder | Security | Shares |
|---|---|---:|
| Founder A | Common Stock | 6,000,000 |
| Founder B | Common Stock | 3,000,000 |
| Employee C | Options ($0.10 strike) | 400,000 |
| Lender L | Warrants for Common Stock ($0.50 strike) | 200,000 |
| Investor S | Series A Preferred (from SAFEs) | 1,133,333 |
| Investor Y | Series A Preferred | 3,066,666 |
| Unissued pool | | 1,533,333 |

That is 15,333,332 fully diluted, with the pool at 10.0000% to four places. The solved count, 15,333,333.33, is a little higher because the counts actually issued are rounded down (R3).
