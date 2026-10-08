# Edge case 17i: derivation

A pay-to-play Series B that also converts a SAFE and a note. This was refused until now. The open question was which cap table the SAFE's Company Capitalization and the note's base count: the one before the pay-to-play conversion, or the one after it. You settled it in the 0.3.0 plan, answer 4: the cap table the round is priced on. That's after the conversion by default (R19), and before it under R19's toggle.

## The company before the Series B

1. **Founding, Jan 10, 2022:** Founder A 6,000,000 common and Founder B 3,000,000.
2. **Series A, Jan 1, 2023:** $3,000,000 at a $9,000,000 pre-money valuation, $1.00 a share, 1x non-participating, with no anti-dilution:
   - Investor X: 1,800,000 shares.
   - Investor W: 1,200,000 shares.
3. **SAFE, Jun 30, 2024:** Investor S, $1,000,000, a $10,000,000 post-money cap.
4. **Note, Jun 30, 2024:** Investor N, $500,000 at 6% simple interest, an $8,000,000 pre-money cap with the pool (there's none), and a 20% discount.
5. **Series B, Jun 30, 2025:** a $12,000,000 pre-money valuation:
   - Investor X invests $600,000 and Investor Y $2,400,000: $3,000,000 in all, $15,000,000 post-money.
   - It converts the SAFE and the note.

## The pay-to-play (R17–R20)

The round offers $1,000,000 to the Series A holders, split by their Series A:
- **Investor X** holds 60%, so must buy $600,000. It does, and keeps its 1,800,000 Series A.
- **Investor W** holds 40%, so must buy $400,000. It buys nothing, so its 1,200,000 Series A converts to common at 1 for 10: **120,000 common**.

The conversion happens just before the round, which is priced after it (R19's default).

## The cap table the round is priced on

After the conversion: 9,000,000 common + 120,000 common (W) + 1,800,000 Series A (X) = **10,920,000** shares, with no pool.

## The note (R23)

- **Interest:** 365 days at 6%, $30,000, so $530,000 converts.
- **Its base:** the shares the round is priced on, 10,920,000, leaving out every SAFE and note.
- **Cap price:** $8,000,000 ÷ 10,920,000 = **$0.732601**.
- **Discount price:** 0.8 × $0.927560 = $0.742048, just above the cap price, so the cap wins.
- **Shares:** $530,000 ÷ $0.732601 = **723,450**.

## The SAFE (R4, R24)

- **Capitalization:** (10,920,000 + 723,450) ÷ (1 − 0.1) = **12,937,166.67**. Like 21b, it counts the note's shares.
- **Conversion price:** $10,000,000 ÷ 12,937,166.67 = **$0.772967**.
- **Shares:** 1,293,716.67, rounded down to **1,293,716**.

## The round's price

- **x counts:** 10,920,000 + 723,450 + 1,293,716.67 + the new shares, x ÷ 5 (the $3M is a fifth of the $15M post-money).
- **Solving:** x = 12,937,166.67 + x ÷ 5, so x = **16,171,458.33**.
- **The price:** $15,000,000 ÷ 16,171,458.33 = **$0.927560**.
- **New shares,** rounded down:
  - Investor X: $600,000 buys **646,858**.
  - Investor Y: $2,400,000 buys **2,587,433**.

It's a down round from the Series A's $1.00, but the Series A has no anti-dilution, so nothing is adjusted.

## The cap table after the Series B

| Holder | Class | Shares | Fully diluted |
|---|---|---:|---:|
| Founder A | Common | 6,000,000 | 37.1024% |
| Founder B | Common | 3,000,000 | 18.5512% |
| Investor W | Common, from its Series A | 120,000 | 0.7420% |
| Investor X | Series A Preferred | 1,800,000 | 15.1307% with its Series B |
| Investor X | Series B Preferred | 646,858 | |
| Investor S | Series B Preferred (from SAFEs), at $0.772967 | 1,293,716 | 8.0000% |
| Investor N | Series B Preferred (from notes), at $0.732601 | 723,450 | 4.4736% |
| Investor Y | Series B Preferred | 2,587,433 | 16.0000% |
| Total | | 16,171,457 | |

The Series B, its series from SAFEs and from notes rank together, ahead of the Series A.

## For comparison: the table before the conversion

Suppose the SAFE and the note had counted the table before the conversion: 12,000,000 shares, with Investor W's 1,200,000 Series A as converted.
- **The note's cap price** would be $8,000,000 ÷ 12,000,000 = $0.666667, for 795,000 shares.
- **The SAFE's Capitalization** would be (12,000,000 + 795,000) ÷ 0.9 = 14,216,666.67, for 1,421,666 shares.

Both would get more shares, from Investor W's preferred, which the pay-to-play takes away before the round. Following R19, they count the table the round is priced on instead.
