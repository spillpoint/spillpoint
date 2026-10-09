# Edge case 13j: derivation

Larkspur Instruments' cap table as OCF case 01 imports it, sold on Dec 31, 2025: edge case 12j's table with Investor N's note beside its two SAFEs. Its two blanks are filled as edge case 27 fills them: the Seed non-participating, the note repaid at 1x. It's X18's second case (0.5.0 plan, answer 11), and, like 12j, it needs E20 near the Seed's conversion. `expected.json` comes from the reference, as for every exit case.

## The table

12j's table, which its DERIVATION lays out, and Investor N's note:
- $250,000 at 6% simple interest from Oct 1, 2024
- a $10,000,000 pre-money cap, its base counted with the pool (`with_pool`)
- a 20% discount, which applies only in a financing, since it has a cap
- repaid at 1x

## The note

- **Interest:** Oct 1, 2024 to Dec 31, 2025 is 456 days, Actual/365. $250,000 × 6% × 456 ÷ 365 = **$18,739.73** (1,368,000 ÷ 73).
- **Repayment:** **$268,739.73**, debt, paid first (X18's rule 1).
- **Its base:** the fully diluted shares with the pool, 16,451,250. It counts no SAFE (rule 3).
- **Converting:** at $10,000,000 ÷ 16,451,250 = **$0.607857** a share (8,000 ÷ 13,161), into $268,739.73 ÷ $0.607857 = **442,110.44 shares**. They don't depend on anything else.

## The SAFEs' Liquidity Capitalization (X1, X13, X18)

12j's count, with the note's 442,110.44 shares once it converts (rule 2). A note being repaid isn't counted. Both SAFEs buy 1/24 of it.

| | Counted besides the SAFEs | LC (÷ 23/24) | Each SAFE's shares |
|---|---:|---:|---:|
| The Seed converts, and the note converts | 15,633,360.44 | 16,313,071.77 | 339,855.66 |

## Breakpoints

All strike cash is $122,000, as in 12j.

| Exit value | Why |
|---:|---|
| $268,739.73 | The note is repaid in full, 1x its principal plus interest, as debt ahead of all equity. |
| $4,268,739.73 | Series A's preference is paid: + $4,000,000. |
| $7,693,739.73 | **Two at once.** The Seed's $2,925,000 preference and the SAFEs' $500,000 of cash are paid. Common gets its first dollar, so the RSUs are in. |
| $8,586,539.73 | The $0.08 options: 11,160,000 × $0.08 = $892,800 more. |
| $8,812,739.73 | The $0.10 options: 11,310,000 × $0.10 − $12,000 = $1,119,000 over the preferences. |
| $14,607,382.91 | **The note converts.** Its 442,110.44 shares join the 11,410,000 sharing what's left after Series A and the Seed tier: X − $7,425,000 + $22,000. They're worth its $268,739.73 repayment when a share is worth $0.607857, at 0.607857 × 11,852,110.44 + $7,403,000. The SAFEs are taking cash, so their count doesn't use the note, and nothing jumps. |
| $16,928,457.41 | **The Seed converts, and payouts jump** (E20). Its warrants come into the money with it, and both SAFEs switch to their Conversion Amounts, now counting the Seed and the converted note. At a share price of $0.80, the Seed's 3,781,250 shares that way are worth its $3,025,000 preference: 0.8 × 16,313,071.77 + $4,000,000 − $122,000. **Just below:** the SAFEs take $250,000 each, and common is worth $0.803693 a share. **Just above:** each SAFE's 339,855.66 shares are worth $271,884.53, and common $0.80. At exactly this exit value the Seed keeps its preference, so the outcome from below holds. |
| $69,130,287.06 | Series A reaches its 3x cap, $12,000,000, at $4.00 a share: $4,000,000 + 16,313,071.77 × $4.00 − $122,000. |
| $97,756,430.59 | Series A converts at $6.00 a share: $12,000,000 + 14,313,071.77 × $6.00 − $122,000. |

**The circle E20 settles here:** weighing every decision at once, there was no stable answer from **$16,884,688.35** to $16,928,457.41.
- **The lower edge:** with the SAFEs taking cash, converting first pays the Seed more there: 0.8 × (11,852,110.44 + 3,656,250) + $4,478,000.
- **In the band,** converting brings the SAFEs into their Conversion Amounts, and then it doesn't pay.

At $16,906,250, which the reference first failed on, the Seed now keeps its preference, the SAFEs take cash, and the note converts.

## Payouts by holder

Net of strike, so each column sums to the exit value, within a few cents (E3).

| Holder | $5M | $10M | $16,906,250 | $20M | $40M | $60M | $100M | $150M |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Founder A | 0 | 1,101,893.56 | 4,329,823.81 | 5,336,750.87 | 11,957,208.48 | 18,577,666.08 | 33,142,672.81 | 49,693,816.82 |
| Founder B | 0 | 693,784.83 | 2,726,185.36 | 3,360,176.48 | 7,528,612.74 | 11,697,049.01 | 20,867,608.80 | 31,288,699.48 |
| Employee C | 0 | 28,810.87 | 148,363.84 | 185,657.44 | 430,859.57 | 676,061.71 | 1,215,506.40 | 1,828,511.73 |
| Employee D | 0 | 16,486.52 | 88,218.31 | 110,594.46 | 257,715.74 | 404,837.02 | 728,503.84 | 1,096,307.04 |
| D Family Trust | 0 | 2,081.09 | 14,036.38 | 17,765.74 | 42,285.96 | 66,806.17 | 120,750.64 | 182,051.17 |
| Investor X | 1,480,389.96 | 3,352,027.18 | 3,650,909.61 | 4,306,620.57 | 8,439,632.07 | 12,572,643.58 | 20,665,268.88 | 30,997,797.63 |
| Investor Y | 3,170,805.32 | 4,157,095.13 | 5,203,183.64 | 5,717,789.80 | 9,089,319.13 | 12,460,848.47 | 16,878,213.00 | 25,307,036.34 |
| Investor S | 80,064.99 | 375,000.00 | 375,000.00 | 490,294.87 | 1,098,525.71 | 1,706,756.54 | 3,044,864.38 | 4,565,441.46 |
| Investor N | 268,739.73 | 268,739.73 | 354,492.65 | 436,932.09 | 978,964.21 | 1,520,996.33 | 2,713,466.98 | 4,068,547.28 |
| Lender L | 0 | 4,081.09 | 16,036.38 | 37,417.67 | 176,876.38 | 316,335.10 | 623,144.27 | 971,791.05 |
| *Common, a share* | $0 | $0.204054 | $0.801819 | $0.988287 | $2.214298 | $3.440309 | $6.137532 | $9.202559 |

**Four to check by hand:**
- **$5M:** the note takes $268,739.73 first and Series A $4,000,000. The Seed tier's $731,260.27 is shared by claim: $2,925,000 Seed and $500,000 SAFEs. Investor S gets $26,688.33 on its Seed and $53,376.66 on its SAFE, $80,064.99 in all.
- **$16,906,250:** the Seed keeps its preference, the SAFEs take cash, and the note converts. ($16,906,250 − $7,425,000 + $22,000) ÷ 11,852,110.44 = **$0.801819** a share, so Investor N gets 442,110.44 × that, $354,492.65.
- **$20M:** everything but Series A converts, with the warrants. ($20,000,000 − $4,000,000 + $122,000) ÷ 16,313,071.77 = **$0.988287** a share.
- **$150M:** everything converts. ($150,000,000 + $122,000) ÷ 16,313,071.77 = **$9.202559** a share.
