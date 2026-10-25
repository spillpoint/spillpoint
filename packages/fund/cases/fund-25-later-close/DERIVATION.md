# Fund case 25, one later close: derivation

Three LPs on the fund's terms, one of them joining six months after the first call (F25). Carry is 20%, no pref, and a 2% GP commitment, fee-free (F3). Equalization interest is 8% (`equalization_rate`).

**Worked again under F29 (f04a).** The inputs are 0.3.0's. What changes is the fee call made before Cedar's close: a fee is each LP's own, so Cedar owes its own part of it to the manager, its back fees, and it isn't rebalanced between the LPs. "What changed from 0.3.0", at the end, sets the two side by side.

- **Calls:** on 2021-01-15, $4,000,000 of investment and an $80,000 fee call; on 2022-01-15, $3,000,000 of investment and a $100,000 fee call.
- **An earlier distribution:** $2,000,000 on 2024-06-30.
- **D** is `as_of`, 2024-12-31. X isn't final, and there's no NAV.
- **The LPs:** Alder Endowment ($6,000,000) and Birchwood Family Office ($2,000,000) in from the start, and Cedar Holdings ($2,000,000) with a close of 2021-07-15. That's after the first call, so Cedar joins at a later close.

## The fee call before the close (F29)

On 2021-01-15 only Alder and Birchwood were in: $8,000,000 of commitments, all on the fund's terms, so $8,000,000 of fee weight. The GP commitment pays no fees, so the LPs' part of the $80,000 call is all of it, and they paid it as it was made: 80,000 / 8,000,000 = **$0.01 for each dollar of fee weight**, $60,000 from Alder and $20,000 from Birchwood.

Every LP's part of the call, as if in from the start, is that rate times its own weight. Cedar's is $2,000,000 × 0.01 = **$20,000: its back fees,** paid at its close to the manager. Alder and Birchwood pay and get back nothing more for it. In the waterfall the call counts at its full size, **$100,000**, every LP's part from 2021-01-15.

The 2022-01-15 fee call came after the close: all three paid it as it was made, 0.6, 0.2 and 0.2. It's as entered.

## The waterfall: as if every LP were in from the start (F25, F29)

A later close changes no account and no tier. Every LP is on the fund's terms, so there's one account (F23).

**Paid in.** The GP commitment pays 2% of each investment call and none of the fee calls (F3). The LPs pay the rest, and the first fee call counts with Cedar's back fees in it.

| Call | Date | Kind | Amount | GP commitment | LPs |
|---|---|---|---:|---:|---:|
| `cash_flows[0]` | 2021-01-15 | investment | 4,000,000.00 | 80,000.00 | 3,920,000.00 |
| `cash_flows[1]` | 2021-01-15 | fee | 80,000.00 | 0.00 | 80,000.00 + 20,000.00 = 100,000.00 |
| `cash_flows[2]` | 2022-01-15 | investment | 3,000,000.00 | 60,000.00 | 2,940,000.00 |
| `cash_flows[3]` | 2022-01-15 | fee | 100,000.00 | 0.00 | 100,000.00 |
| **All** | | | 7,180,000.00 | 140,000.00 | **7,060,000.00** |

Each LP's share is its commitment over all three: 0.6, 0.2 and 0.2. Its paid-in is that share of every call, as if from the start (F25): what it paid at its close, back fees included, and what it got back left out.

| LP | Close | Commitment | Share | Paid in |
|---|---|---:|---:|---:|
| Alder Endowment |  | 6,000,000 | 0.6 | 4,236,000.00 |
| Birchwood Family Office |  | 2,000,000 | 0.2 | 1,412,000.00 |
| Cedar Holdings | 2021-07-15 | 2,000,000 | 0.2 | 1,412,000.00 |

**The earlier $2,000,000:** 2%, $40,000, to the GP commitment, and $1,960,000 down the tiers, all capital. $5,100,000 of capital is left.

**X:** 2% to the GP commitment and 98% down the tiers. Capital is back when 98% of X is $5,100,000: X = $5,100,000 / 0.98 = 255,000,000/49 = **$5,204,081.63**. Then 80/20.

## Breakpoints

One account, so the wording is as before (F27).

| X | Exact | Reasons |
|---:|---|---|
| 5,204,081.63 | 255000000/49 | `capital_returned`: "LPs have their $7,060,000 of paid-in capital back" |

## This distribution

| X | Tags | GP commitment | LPs, capital | LPs, carry tier | LPs | GP carry | GP |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 2,000,000.00 | listed | 40,000.00 | 1,960,000.00 | 0.00 | 1,960,000.00 | 0.00 | 0.00 |
| 5,200,000.00 | listed | 104,000.00 | 5,096,000.00 | 0.00 | 5,096,000.00 | 0.00 | 0.00 |
| 5,204,081.63 | breakpoint | 104,081.63 | 5,100,000.00 | 0.00 | 5,100,000.00 | 0.00 | 0.00 |
| 20,000,000.00 | listed | 400,000.00 | 5,100,000.00 | 11,600,000.00 | 16,700,000.00 | 2,900,000.00 | 2,900,000.00 |

- **At $5,200,000:** $104,000 to the GP commitment and $5,096,000 down the tiers, all capital, $4,000 short of the $5,100,000.
- **At $20,000,000:** $400,000 and $19,600,000: $5,100,000 of capital, then $14,500,000 at 80/20, $2,900,000 to the GP.

## The fund to date

| X | Tags | GP commitment | LPs, capital | LPs, carry tier | LPs | GP carry | GP |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 40,000.00 | 1,960,000.00 | 0.00 | 1,960,000.00 | 0.00 | 0.00 |
| 2,000,000.00 | listed | 80,000.00 | 3,920,000.00 | 0.00 | 3,920,000.00 | 0.00 | 0.00 |
| 5,200,000.00 | listed | 144,000.00 | 7,056,000.00 | 0.00 | 7,056,000.00 | 0.00 | 0.00 |
| 5,204,081.63 | breakpoint | 144,081.63 | 7,060,000.00 | 0.00 | 7,060,000.00 | 0.00 | 0.00 |
| 20,000,000.00 | listed | 440,000.00 | 7,060,000.00 | 11,600,000.00 | 18,660,000.00 | 2,900,000.00 | 2,900,000.00 |

## Each LP (F20)

Each LP's share of the LPs' total. Cedar gets its share of the earlier $2,000,000 too, since it joined before it.

**This distribution**

| X | Tags | Alder Endowment | Birchwood Family Office | Cedar Holdings |
|---:|---|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 |
| 2,000,000.00 | listed | 1,176,000.00 | 392,000.00 | 392,000.00 |
| 5,200,000.00 | listed | 3,057,600.00 | 1,019,200.00 | 1,019,200.00 |
| 5,204,081.63 | breakpoint | 3,060,000.00 | 1,020,000.00 | 1,020,000.00 |
| 20,000,000.00 | listed | 10,020,000.00 | 3,340,000.00 | 3,340,000.00 |

**To date**

| X | Tags | Alder Endowment | Birchwood Family Office | Cedar Holdings |
|---:|---|---:|---:|---:|
| 0.00 | listed | 1,176,000.00 | 392,000.00 | 392,000.00 |
| 2,000,000.00 | listed | 2,352,000.00 | 784,000.00 | 784,000.00 |
| 5,200,000.00 | listed | 4,233,600.00 | 1,411,200.00 | 1,411,200.00 |
| 5,204,081.63 | breakpoint | 4,236,000.00 | 1,412,000.00 | 1,412,000.00 |
| 20,000,000.00 | listed | 11,196,000.00 | 3,732,000.00 | 3,732,000.00 |

At the breakpoint each LP has its paid-in back: Cedar's $1,412,000 included, though part of what it paid in was at its close.

## The equalization (F25, F29)

**The investment call before the close.** On 2021-01-15 only Alder and Birchwood were in, so they paid its LPs' part as made, 3/4 and 1/4. The GP commitment paid its $80,000 itself and isn't in the equalization. At Cedar's close the call rebalances among all three: 0.6, 0.2 and 0.2. Cedar pays in its part, and Alder and Birchwood get back what they had paid over theirs.

| Call | LPs' part | Alder, paid | Birchwood, paid | Alder, after | Birchwood, after | Cedar pays in | Alder gets back | Birchwood gets back |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2021-01-15 investment | 3,920,000.00 | 2,940,000.00 | 980,000.00 | 2,352,000.00 | 784,000.00 | **784,000.00** | **588,000.00** | **196,000.00** |

**The fee call isn't rebalanced (F29).** Alder and Birchwood keep their $60,000 and $20,000 of it, and Cedar pays its own $20,000 of back fees to the manager.

**Interest,** on the investment call alone. From 2021-01-15 to 2021-07-15 is 181 days (16 + 28 + 31 + 30 + 31 + 30 + 15). Cedar pays 8% on its $784,000 for 181 days:
- $784,000 × 8% × 181 / 365 = 11,352,320/365 = 2,270,464/73 = **$31,102.25**.

It goes to Alder and Birchwood by what each gets back, 3 to 1:
- **Alder:** $588,000 × 8% × 181 / 365 = 1,702,848/73 = **$23,326.68**.
- **Birchwood:** $196,000 × 8% × 181 / 365 = 567,616/73 = **$7,775.56**.

Together 2,270,464/73, what Cedar paid. There's no interest on back fees.

**The 2022-01-15 calls** came after the close, so all three paid them as they were made. They're in no equalization.

| LP | Capital paid in at its close | Capital got back | Interest paid | Interest received | Back fees |
|---|---:|---:|---:|---:|---:|
| Alder Endowment | 0.00 | 588,000.00 | 0.00 | 23,326.68 | 0.00 |
| Birchwood Family Office | 0.00 | 196,000.00 | 0.00 | 7,775.56 | 0.00 |
| Cedar Holdings | 784,000.00 | 0.00 | 31,102.25 | 0.00 | 20,000.00 |

The case file has one close, 2021-07-15, with Cedar joining and these three rows; over all the closes each LP's five are the same.

**A check on paid-in.** Alder paid $2,940,000 + $60,000 in 2021, got $588,000 back, and paid 0.6 × ($2,940,000 + $100,000) = $1,824,000 in 2022: $4,236,000, its paid-in as if in from the start. Cedar paid $784,000 and $20,000 of back fees at its close, and $608,000 in 2022: $1,412,000.

Not final and no NAV, so no point has a clawback.

## What changed from 0.3.0

In 0.3.0 the fee call before Cedar's close was rebalanced as the investment call was: Cedar paid $16,000 of it to Alder and Birchwood, with interest, and the call counted at the $80,000 the fund made it. Under F29 it's each LP's own fee: Cedar owes its own $20,000, the call counts at $100,000, and nothing about it moves between the LPs. So the LPs' paid-in rises by Cedar's $20,000 of back fees, capital comes back $20,000 later down the tiers (at $5,204,081.63 of X, not $5,183,673.47), and the equalization moves only the investment call.

|  | 0.3.0 | Now |
|---|---:|---:|
| The LPs' paid-in | 7,040,000.00 | 7,060,000.00 |
| Each LP's paid-in: Alder, Birchwood, Cedar | 4,224,000.00 / 1,408,000.00 / 1,408,000.00 | 4,236,000.00 / 1,412,000.00 / 1,412,000.00 |
| The breakpoint, capital back | 5,183,673.47 | 5,204,081.63 |
| At X = 5,200,000: LPs / GP | 5,092,800.00 / 3,200.00 | 5,096,000.00 / 0.00 |
| At X = 20,000,000: LPs / GP | 16,696,000.00 / 2,904,000.00 | 16,700,000.00 / 2,900,000.00 |
| Alder Endowment: capital got back | 600,000.00 | 588,000.00 |
| Alder Endowment: interest received | 23,802.74 | 23,326.68 |
| Alder Endowment: back fees | — | 0.00 |
| Birchwood Family Office: capital got back | 200,000.00 | 196,000.00 |
| Birchwood Family Office: interest received | 7,934.25 | 7,775.56 |
| Birchwood Family Office: back fees | — | 0.00 |
| Cedar Holdings: capital paid in | 800,000.00 | 784,000.00 |
| Cedar Holdings: interest paid | 31,736.99 | 31,102.25 |
| Cedar Holdings: back fees | — | 20,000.00 |

Everything that doesn't depend on the fee call is as it was: the investment call's rebalancing, worked the same way, and the 2022 calls.
