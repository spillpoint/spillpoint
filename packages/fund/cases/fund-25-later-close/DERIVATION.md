# Fund case 25, one later close: derivation

Three LPs on the fund's terms, one of them joining six months after the first call (F25). Carry is 20%, no pref, and a 2% GP commitment, fee-free (F3). Equalization interest is 8% (`equalization_rate`).

- **Calls:** on 2021-01-15, $4,000,000 of investment and an $80,000 fee call; on 2022-01-15, $3,000,000 of investment and a $100,000 fee call.
- **An earlier distribution:** $2,000,000 on 2024-06-30.
- **D** is `as_of`, 2024-12-31. X isn't final, and there's no NAV.
- **The LPs:** Alder Endowment ($6,000,000) and Birchwood Family Office ($2,000,000) in from the start, and Cedar Holdings ($2,000,000) with a close of 2021-07-15. That's after the first call, so Cedar joins at a later close.

## The waterfall: as if every LP were in from the start (F25)

A later close changes no account and no tier. Every LP is on the fund's terms, so there's one account, and the waterfall is 0.2.0's (F23).

**Paid in.** The GP commitment pays 2% of each investment call and none of the fee calls (F3). The LPs pay the rest.

| Call | Date | Kind | Amount | GP commitment | LPs |
|---|---|---|---:|---:|---:|
| `cash_flows[0]` | 2021-01-15 | investment | 4,000,000.00 | 80,000.00 | 3,920,000.00 |
| `cash_flows[1]` | 2021-01-15 | fee | 80,000.00 | 0.00 | 80,000.00 |
| `cash_flows[2]` | 2022-01-15 | investment | 3,000,000.00 | 60,000.00 | 2,940,000.00 |
| `cash_flows[3]` | 2022-01-15 | fee | 100,000.00 | 0.00 | 100,000.00 |
| **All** | | | 7,180,000.00 | 140,000.00 | 7,040,000.00 |

Each LP's share is its commitment over all three: 0.6, 0.2 and 0.2. Its paid-in is that share of every call, as if from the start (F25): what it paid at its close included, what it got back left out.

| LP | Close | Commitment | Share | Paid in |
|---|---|---:|---:|---:|
| Alder Endowment | | 6,000,000 | 0.6 | 4,224,000.00 |
| Birchwood Family Office | | 2,000,000 | 0.2 | 1,408,000.00 |
| Cedar Holdings | 2021-07-15 | 2,000,000 | 0.2 | 1,408,000.00 |

**The earlier $2,000,000:** 2%, $40,000, to the GP commitment, and $1,960,000 down the tiers, all capital. $5,080,000 of capital is left.

**X:** 2% to the GP commitment and 98% down the tiers. Capital is back when 98% of X is $5,080,000: X = $5,080,000 / 0.98 = 254,000,000/49 = **$5,183,673.47**. Then 80/20.

## Breakpoints

One account, so the wording is as before (F27).

| X | Exact | Reasons |
|---:|---|---|
| 5,183,673.47 | 254000000/49 | `capital_returned`: "LPs have their $7,040,000 of paid-in capital back" |

## This distribution

| X | Tags | GP commitment | LPs, capital | LPs, carry tier | LPs | GP carry 20% | GP |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 2,000,000.00 | listed | 40,000.00 | 1,960,000.00 | 0.00 | 1,960,000.00 | 0.00 | 0.00 |
| 5,183,673.47 | breakpoint | 103,673.47 | 5,080,000.00 | 0.00 | 5,080,000.00 | 0.00 | 0.00 |
| 5,200,000.00 | listed | 104,000.00 | 5,080,000.00 | 12,800.00 | 5,092,800.00 | 3,200.00 | 3,200.00 |
| 20,000,000.00 | listed | 400,000.00 | 5,080,000.00 | 11,616,000.00 | 16,696,000.00 | 2,904,000.00 | 2,904,000.00 |

- **At $5,200,000:** $104,000 to the GP commitment and $5,096,000 down the tiers: $5,080,000 of capital, then $16,000 at 80/20.
- **At $20,000,000:** $400,000 and $19,600,000: $5,080,000 of capital, then $14,520,000 at 80/20, $2,904,000 to the GP.

## The fund to date

| X | Tags | GP commitment | LPs, capital | LPs, carry tier | LPs | GP carry 20% | GP |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 40,000.00 | 1,960,000.00 | 0.00 | 1,960,000.00 | 0.00 | 0.00 |
| 2,000,000.00 | listed | 80,000.00 | 3,920,000.00 | 0.00 | 3,920,000.00 | 0.00 | 0.00 |
| 5,183,673.47 | breakpoint | 143,673.47 | 7,040,000.00 | 0.00 | 7,040,000.00 | 0.00 | 0.00 |
| 5,200,000.00 | listed | 144,000.00 | 7,040,000.00 | 12,800.00 | 7,052,800.00 | 3,200.00 | 3,200.00 |
| 20,000,000.00 | listed | 440,000.00 | 7,040,000.00 | 11,616,000.00 | 18,656,000.00 | 2,904,000.00 | 2,904,000.00 |

## Each LP (F20)

Each LP's share of the LPs' total. Cedar gets its share of the earlier $2,000,000 too, since it joined before it.

**This distribution**

| X | Tags | Alder Endowment | Birchwood Family Office | Cedar Holdings |
|---:|---|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 |
| 2,000,000.00 | listed | 1,176,000.00 | 392,000.00 | 392,000.00 |
| 5,183,673.47 | breakpoint | 3,048,000.00 | 1,016,000.00 | 1,016,000.00 |
| 5,200,000.00 | listed | 3,055,680.00 | 1,018,560.00 | 1,018,560.00 |
| 20,000,000.00 | listed | 10,017,600.00 | 3,339,200.00 | 3,339,200.00 |

**To date**

| X | Tags | Alder Endowment | Birchwood Family Office | Cedar Holdings |
|---:|---|---:|---:|---:|
| 0.00 | listed | 1,176,000.00 | 392,000.00 | 392,000.00 |
| 2,000,000.00 | listed | 2,352,000.00 | 784,000.00 | 784,000.00 |
| 5,183,673.47 | breakpoint | 4,224,000.00 | 1,408,000.00 | 1,408,000.00 |
| 5,200,000.00 | listed | 4,231,680.00 | 1,410,560.00 | 1,410,560.00 |
| 20,000,000.00 | listed | 11,193,600.00 | 3,731,200.00 | 3,731,200.00 |

At the breakpoint each LP has its paid-in back: Cedar's $1,408,000 included, though part of what it paid in was at its close.

## The equalization (F25)

**The calls as the fund made them.** On 2021-01-15 only Alder and Birchwood were in ($8,000,000 of commitments), so they paid those calls' LPs' parts, 3/4 and 1/4. The GP commitment paid its $80,000 itself and isn't in the equalization.

**Cedar's close, 2021-07-15.** The two calls before it rebalance among all three: 0.6, 0.2 and 0.2. Cedar pays in its part, and Alder and Birchwood get back what they had paid over theirs.

| Call | LPs' part | Alder, paid | Birchwood, paid | Alder, after | Birchwood, after | Cedar pays in | Alder gets back | Birchwood gets back |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2021-01-15 investment | 3,920,000.00 | 2,940,000.00 | 980,000.00 | 2,352,000.00 | 784,000.00 | 784,000.00 | 588,000.00 | 196,000.00 |
| 2021-01-15 fee | 80,000.00 | 60,000.00 | 20,000.00 | 48,000.00 | 16,000.00 | 16,000.00 | 12,000.00 | 4,000.00 |
| **Both** | 4,000,000.00 | 3,000,000.00 | 1,000,000.00 | 2,400,000.00 | 800,000.00 | **800,000.00** | **600,000.00** | **200,000.00** |

**Interest.** From 2021-01-15 to 2021-07-15 is 181 days (16 + 28 + 31 + 30 + 31 + 30 + 15). Cedar pays 8% on its $800,000 for 181 days:
- $800,000 × 8% × 181 / 365 = 11,584,000/365 = 2,316,800/73 = **$31,736.99**.

Both calls have the same date, so the interest on each goes to Alder and Birchwood by what each gets back of it, 3 to 1. Over both calls:
- **Alder:** $600,000 × 8% × 181 / 365 = 1,737,600/73 = **$23,802.74**.
- **Birchwood:** $200,000 × 8% × 181 / 365 = 579,200/73 = **$7,934.25**.

Together 2,316,800/73, what Cedar paid.

**The 2022-01-15 calls** came after the close, so all three paid them as they were made, 0.6, 0.2 and 0.2. They're in no equalization.

| LP | Capital paid in at its close | Capital got back | Interest paid | Interest received |
|---|---:|---:|---:|---:|
| Alder Endowment | 0.00 | 600,000.00 | 0.00 | 23,802.74 |
| Birchwood Family Office | 0.00 | 200,000.00 | 0.00 | 7,934.25 |
| Cedar Holdings | 800,000.00 | 0.00 | 31,736.99 | 0.00 |

The case file has one close, 2021-07-15, with Cedar joining and these three rows; over all the closes each LP's four are the same.

**A check on paid-in.** Alder paid $2,940,000 + $60,000 in 2021, got $600,000 back, and paid 0.6 × ($2,940,000 + $100,000) = $1,824,000 in 2022: $4,224,000, its paid-in as if in from the start. Cedar paid $800,000 at its close and $608,000 in 2022: $1,408,000.

Not final and no NAV, so no point has a clawback.
