# Edge case 15: derivation

A round case. It is edge case 14a's company plus a post-money SAFE that converts in the Series A. The round also tops up the option pool, and the SAFE's discount gives it a lower price than its cap does.

## Before the round

| Event | What happens | Result |
|---|---|---|
| Founding | Founder A gets 4,500,000 common and Founder B 1,500,000. | 6,000,000 common |
| Option pool | 20% of fully diluted shares (`ASSUMPTIONS.md` R2): 6,000,000 × 0.2 ÷ 0.8 = 1,500,000. | Pool 1,500,000 |
| Grants | Employee C is granted 500,000 options at $0.25. | 500,000 options, 1,000,000 unissued |
| SAFE | Investor S buys a $600,000 post-money SAFE with an $18,000,000 valuation cap and a 20% discount. | Not yet shares |

Just before the Series A, the company has 6,500,000 issued shares and options and 1,000,000 unissued pool shares. That is 7,500,000 fully diluted, not counting the SAFE.

## The Series A terms

- Investor X invests **$5,000,000** at a **$20,000,000 pre-money** valuation, so the post-money valuation is $25,000,000.
- The unissued pool is topped up to **12% of post-money fully diluted shares**, in the pre-money.
- The SAFE converts in the round. Its shares count in the post-money fully diluted shares (`SPEC.md`, Priced round), so, like the top-up, they dilute only the people who were there before the round.

## The SAFE's two prices

The SAFE converts at whichever of two prices gives it more shares, which means the lower price (`SPEC.md`, Post-money SAFE).

**The cap price** is the cap ÷ Company Capitalization (R4). Company Capitalization counts:
- the issued stock and options (6,500,000)
- the unissued pool as it stood before the round (1,000,000), not the 200,000-share top-up
- the SAFE itself, which owns its purchase amount ÷ its cap, $600,000 ÷ $18M = 1/30 of Company Capitalization

So Company Capitalization = 7,500,000 ÷ (1 − 1/30) = **7,758,620.69**. The cap price is $18,000,000 ÷ 7,758,620.69 = **$2.32**. Put more simply, that is ($18M − $600,000) ÷ 7,500,000.

**The discount price** is the Series A price × (1 − 20%). The Series A price depends on the share count, and the share count depends on the SAFE's shares, so this is circular. Call the post-money fully diluted shares x:
- **Existing issued shares and options:** 6,500,000.
- **The unissued pool at target:** 12% of x.
- **Investor X's new shares:** $5M ÷ ($25M ÷ x) = 20% of x.
- **The SAFE's shares at the discount price:** $600,000 ÷ (0.8 × $25M ÷ x) = 3% of x.

So x = 6,500,000 + 0.12x + 0.20x + 0.03x, which gives 0.65x = 6,500,000 and x = **10,000,000**. The Series A price is $25,000,000 ÷ 10,000,000 = **$2.50**, and the discount price is 0.8 × $2.50 = **$2.00**.

**The discount wins.** $2.00 is below $2.32, so the SAFE converts at $2.00. The other branch confirms it: priced at the cap, the round would solve to $2.515306 a share, and a 20% discount off that ($2.012245) would still beat $2.32. So converting at the cap contradicts itself, and the discount is the only consistent answer.

## The result

- **SAFE shares:** $600,000 ÷ $2.00 = **300,000**. At the cap price it would have been 258,620.
- **Series A shares:** $5,000,000 ÷ $2.50 = **2,000,000**.
- **Unissued pool:** 12% × 10,000,000 = **1,200,000**, a top-up of **200,000**. The 1,000,000 already there is below the target, so R16 doesn't apply.

Every count comes out whole, so no rounding is needed (R3).

The SAFE converts into **Series A Preferred (from SAFEs)**, a series of its own with Series A's rights (R5):
- Its original issue price and conversion price are the SAFE's $2.00, not $2.50.
- Its preference is 300,000 × $2.00 × 1 = **$600,000**, the amount Investor S paid.
- It sits in one seniority tier with Series A, pari passu, as Millrace's Seed Preferred (from SAFEs) does with Seed Preferred.

## Cap table after the Series A

| Holder | Security | Shares | Fully diluted % |
|---|---|---:|---:|
| Founder A | Common | 4,500,000 | 45.00% |
| Founder B | Common | 1,500,000 | 15.00% |
| Employee C | Options ($0.25) | 500,000 | 5.00% |
| Investor S | Series A Preferred (from SAFEs) | 300,000 | 3.00% |
| Investor X | Series A Preferred | 2,000,000 | 20.00% |
| Unissued pool | | 1,200,000 | 12.00% |
| **Total** | | **10,000,000** | **100.00%** |

Investor X holds exactly 20%, its $5M ÷ the $25M post-money valuation. Investor S's 300,000 shares are worth $750,000 at the Series A price, 25% more than it paid. That is what a 20% discount buys.

## How the top-up and the SAFE interact

- **Under the discount, the top-up helps the SAFE.** The top-up sits in the pre-money, so it lowers the Series A price, and with it the discount price. Without the top-up, the pool would stay at 1,000,000 and the round would solve to $2.566667 a share. That makes the discount price $2.053333, and the SAFE would get 292,207 shares instead of 300,000.
- **Under the cap, it wouldn't.** Company Capitalization leaves out the pool increase made in the round (R4), so the cap price doesn't move with the top-up.

## Checking this independently

The answer is the post–Series A cap table above. These wrong rules give different numbers, so the case catches them:
- **Always converting at the cap:** 258,620 SAFE shares.
- **Leaving the SAFE's shares out of the post-money shares the price is set on:** the Series A price would come out above $2.50, and Investor X would hold less than 20%.

This case doesn't test whether Company Capitalization leaves out the top-up, because the discount wins either way. Millrace's Seed round tests it: its SAFEs convert at the cap in a round that tops up the pool.

Tolerance is 1 share for share counts.
