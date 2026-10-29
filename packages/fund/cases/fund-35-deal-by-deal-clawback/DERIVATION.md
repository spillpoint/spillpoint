# Fund case 35, deal by deal with a clawback: derivation

Deal by deal, and final. Four investments: a partial sale after a follow-on, an exit with a release from escrow after it, a write-off, and one still held at D. Carry is paid on each distribution beyond what's due, and kept until the end (F35). X is the fund's last distribution, so it realizes everything left, and the clawback (F12) takes back whatever carry the fund's totals don't earn.

- **The terms:** 20% carry, no pref, deal by deal, and a 2% GP commitment, fee-free and paying its share of expenses (F3's defaults).
- **Investment calls:** $8,000,000 on 2020-01-10, $7,000,000 on 2021-01-10, $5,000,000 on 2022-01-10 and $3,000,000 on 2023-01-10, $23,000,000 in all.
- **Fee calls:** $600,000 on each of 2020-01-10, 2021-01-10 and 2022-01-10, and $450,000 on 2023-07-10, $2,250,000 in all. **An expense call:** $100,000 on 2021-06-30.
- **The investments:**
  - Dogwood Labs: $4,000,000 on 2020-02-01, and a $2,000,000 follow-on on 2021-03-01
  - Elm Bio: $4,000,000 on 2020-04-01
  - Fir Payments: $5,000,000 on 2021-05-01
  - Hazel Cloud: $5,000,000 on 2022-03-01, and a $3,000,000 follow-on on 2023-02-01
- **Distributions:** $6,000,000 from Dogwood on 2021-09-30, selling 40% of it; $12,000,000 from Elm on 2022-06-30, all of it; $1,000,000 from Elm on 2023-06-30, a release from escrow. **A write-off:** Fir on 2023-09-30.
- **X** comes from Dogwood. It's final. **D** is `as_of`, 2024-12-31.

**Paid in (F3, F5).** The GP commitment pays 2% of the investment calls, $460,000, and 2% of the expense call, $2,000: **$462,000**. The LPs pay $22,540,000 of the investment calls, all $2,250,000 of the fees and $98,000 of the expense call: **$24,888,000**. Of it, $2,348,000 is fees and expenses.

**The checks against the calls (F37).** The cost made by each check's date, on the investment calls to then: $4,000,000 on $8,000,000 (2020-02-01); $8,000,000 on $8,000,000 (2020-04-01); $10,000,000 on $15,000,000 (2021-03-01); $15,000,000 on $15,000,000 (2021-05-01); $20,000,000 on $20,000,000 (2022-03-01); $23,000,000 on $23,000,000 (2023-02-01). Never more, and by D the fund has invested all it called for investments.

## The investments (F33, F36)

Once, at D, before X:
- **Dogwood Labs:** $6,000,000 made, the follow-on included. The 2021 sale is of 40% of what's left then, the whole $6,000,000: $2,400,000 realized. $3,600,000 is left.
- **Elm Bio:** $4,000,000 made and all of it realized at its exit. The escrow release realizes nothing more: there's nothing left. Its proceeds are both distributions, $13,000,000.
- **Fir Payments:** $5,000,000 made and written off.
- **Hazel Cloud:** $8,000,000 made with the follow-on, nothing realized.

| Investment | Cost made | Cost realized | Written off | Proceeds |
|---|---:|---:|---:|---:|
| Dogwood Labs | 6,000,000.00 | 2,400,000.00 | 0.00 | 6,000,000.00 |
| Elm Bio | 4,000,000.00 | 4,000,000.00 | 0.00 | 13,000,000.00 |
| Fir Payments | 5,000,000.00 | 5,000,000.00 | 5,000,000.00 | 0.00 |
| Hazel Cloud | 8,000,000.00 | 0.00 | 0.00 | 0.00 |

## Each distribution: what's due, and the split (F35)

What's due at each is the LPs' part, 98%, of the cost realized so far, its own included, plus the LPs' fees and expenses to date times the cost realized over the cost made, both at the distribution.

| Date | From | Amount | Cost made | Cost realized | Share | Cost due | Fees and expenses to date | Their share due | Due | Back before | Tier 1 | Carry tier, LPs | Carry |
|---|---|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2021-09-30 | Dogwood, 40% | 6,000,000.00 | 15,000,000.00 | 2,400,000.00 | 0.16 | 2,352,000.00 | 1,298,000.00 | 207,680.00 | 2,559,680.00 | 0.00 | 2,559,680.00 | 2,656,256.00 | 664,064.00 |
| 2022-06-30 | Elm | 12,000,000.00 | 20,000,000.00 | 6,400,000.00 | 0.32 | 6,272,000.00 | 1,898,000.00 | 607,360.00 | 6,879,360.00 | 2,559,680.00 | 4,319,680.00 | 5,952,256.00 | 1,488,064.00 |
| 2023-06-30 | Elm, escrow | 1,000,000.00 | 23,000,000.00 | 6,400,000.00 | 32/115 | 6,272,000.00 | 1,898,000.00 | 528,139.13 | 6,800,139.13 | 6,879,360.00 | 0.00 | 784,000.00 | 196,000.00 |

- **Dogwood's sale, 2021-09-30.** The cost made is Dogwood's $6,000,000, Elm's $4,000,000 and Fir's $5,000,000: $15,000,000. The sale realizes $2,400,000, 16% of it. The fees and expenses to date are the 2020 and 2021 fee calls, $1,200,000, and the LPs' $98,000 of the expense call. Due: 0.98 × $2,400,000 = $2,352,000, plus 16% of $1,298,000, $207,680: **$2,559,680**. Of the $6,000,000, $120,000 goes to the GP commitment and $5,880,000 runs the tiers: $2,559,680 of tier 1, then $3,320,320 at 80/20, **$664,064 of carry**.
- **Elm's exit, 2022-06-30.** Hazel's first check makes the cost made $20,000,000; the exit realizes Elm's $4,000,000, $6,400,000 in all, 32%. The 2022 fee call brings the fees and expenses to $1,898,000. Due: $6,272,000 plus 32% of $1,898,000, $607,360: **$6,879,360**. $2,559,680 is back, so tier 1 is $4,319,680 of the $11,760,000 through the tiers; the other $7,440,320 at 80/20 is **$1,488,064 of carry**.
- **The escrow release, 2023-06-30.** It's from Elm, with nothing left, so it realizes nothing (F33): still $6,400,000. But Hazel's $3,000,000 follow-on on 2023-02-01 has made the cost made $23,000,000, so the fees' share falls to 6,400,000/23,000,000 = 32/115, and with no fee call since, the fees and expenses are still $1,898,000. Due: $6,272,000 plus 1,898,000 × 32/115 = 60,736,000/115 = $528,139.13: **$6,800,139.13**. That's under the **$6,879,360 already back**, so no capital comes first and nothing is taken back (F35): all $980,000 through the tiers is profit, **$196,000 of carry**.
- **Fir's write-off, 2023-09-30,** realizes its $5,000,000, with no proceeds, and distributes nothing.

Before X the GP has been paid **$2,348,128** of carry, and the LPs have $6,879,360 of capital back.

## X: what's due (F33, F35)

X is final, so everything left of every investment is realized at D: Dogwood's $3,600,000 and Hazel's $8,000,000. The cost realized is all **$23,000,000** of the $23,000,000 made. Due: 0.98 × $23,000,000 = **$22,540,000**, plus all **$2,348,000** of fees and expenses: **$24,888,000**, all the LPs' paid-in. $6,879,360 is back, so X's tier 1 is **$18,008,640**.

| X | Tags | Cost made | Cost realized | Cost | Fees and expenses | Due |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 23,000,000.00 | 23,000,000.00 | 22,540,000.00 | 2,348,000.00 | 24,888,000.00 |
| 5,000,000.00 | listed | 23,000,000.00 | 23,000,000.00 | 22,540,000.00 | 2,348,000.00 | 24,888,000.00 |
| 6,395,918.37 | listed, breakpoint | 23,000,000.00 | 23,000,000.00 | 22,540,000.00 | 2,348,000.00 | 24,888,000.00 |
| 12,000,000.00 | listed | 23,000,000.00 | 23,000,000.00 | 22,540,000.00 | 2,348,000.00 | 24,888,000.00 |
| 18,376,163.27 | listed, breakpoint | 23,000,000.00 | 23,000,000.00 | 22,540,000.00 | 2,348,000.00 | 24,888,000.00 |
| 25,000,000.00 | listed | 23,000,000.00 | 23,000,000.00 | 22,540,000.00 | 2,348,000.00 | 24,888,000.00 |

## X, distributed on D

2% to the GP commitment and 0.98 X through the tiers: tier 1 until 0.98 X = $18,008,640, at X = 18,008,640 / 0.98 = 900,432,000/49 = **$18,376,163.27**. Then 80/20.

## The clawback (F12, F35)

**The entitlement** is the tiers run once on the fund's totals: all $24,888,000 of paid-in as capital, and everything that ran the tiers as the amount, $5,880,000 + $11,760,000 + $980,000 = $18,620,000 before X, plus 0.98 X.
- **Its capital is back** when 0.98 X = 24,888,000 − 18,620,000 = $6,268,000, at X = 6,268,000 / 0.98 = 313,400,000/49 = **$6,395,918.37**.
- **Then 20%** of each further dollar through the tiers: the entitlement is 0.2 × (0.98 X − 6,268,000).

**The clawback owed** is the carry paid, $2,348,128 plus X's own, less the entitlement:
- **Up to $6,395,918.37:** X pays no carry (it's all tier 1) and the entitlement is 0. **All $2,348,128 is owed back**: on the fund's totals the LPs haven't had their capital back, so the GP has earned nothing.
- **From $6,395,918.37:** the entitlement grows by 0.196 a dollar of X while X still pays no carry: the clawback starts to fall, because on the fund's totals the LPs have their capital back. At **$12,000,000** the entitlement is 0.2 × (11,760,000 − 6,268,000) = **$1,098,400**, and **$1,249,728** is owed.
- **At $18,376,163.27:** the entitlement is 0.2 × (18,008,640 − 6,268,000) = $2,348,128, the carry paid: cleared. It's the same X as X's tier 1 ending. With everything invested, what's due at the end is all paid-in, so both runs have the LPs' $24,888,000 back there, and what's left through the tiers in each is the same profit.
- **Above it** X pays 20% and the entitlement grows 20%: nothing more is owed. At $25,000,000, X's tier 1 is $18,008,640 of the $24,500,000 through the tiers, so it pays $1,298,272 of carry, and the GP has $3,646,400, what the totals give it.

| X | Tags | Carry paid | Entitlement | Owed |
|---:|---|---:|---:|---:|
| 0.00 | listed | 2,348,128.00 | 0.00 | 2,348,128.00 |
| 5,000,000.00 | listed | 2,348,128.00 | 0.00 | 2,348,128.00 |
| 6,395,918.37 | listed, breakpoint | 2,348,128.00 | 0.00 | 2,348,128.00 |
| 12,000,000.00 | listed | 2,348,128.00 | 1,098,400.00 | 1,249,728.00 |
| 18,376,163.27 | listed, breakpoint | 2,348,128.00 | 2,348,128.00 | 0.00 |
| 25,000,000.00 | listed | 3,646,400.00 | 3,646,400.00 | 0.00 |

## Breakpoints

| X | Exact | Reasons |
|---:|---|---|
| 6,395,918.37 | 313400000/49 | `clawback_changes`: "the clawback owed starts to fall: on the fund's totals, LPs have their capital back" |
| 18,376,163.27 | 900432000/49 | `capital_returned`: "LPs have their $24,888,000 back for the investments exited or written off, fees and expenses included"; `clawback_cleared`: "from here the GP has earned all the carry it was paid earlier" |

At $6,395,918.37 X's own tier doesn't change: only the run on the totals does, so the reason is the clawback's alone (FC5, FC6).

## This distribution

| X | Tags | GP commitment | LPs, capital | LPs, carry tier | LPs | GP carry |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 5,000,000.00 | listed | 100,000.00 | 4,900,000.00 | 0.00 | 4,900,000.00 | 0.00 |
| 6,395,918.37 | listed, breakpoint | 127,918.37 | 6,268,000.00 | 0.00 | 6,268,000.00 | 0.00 |
| 12,000,000.00 | listed | 240,000.00 | 11,760,000.00 | 0.00 | 11,760,000.00 | 0.00 |
| 18,376,163.27 | listed, breakpoint | 367,523.27 | 18,008,640.00 | 0.00 | 18,008,640.00 | 0.00 |
| 25,000,000.00 | listed | 500,000.00 | 18,008,640.00 | 5,193,088.00 | 23,201,728.00 | 1,298,272.00 |

## The fund to date

The three earlier distributions: $6,879,360 of capital, $9,392,512 of the carry tier to the LPs, and $2,348,128 of carry; $380,000 to the GP commitment.

| X | Tags | GP commitment | LPs, capital | LPs, carry tier | LPs | GP carry |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 380,000.00 | 6,879,360.00 | 9,392,512.00 | 16,271,872.00 | 2,348,128.00 |
| 5,000,000.00 | listed | 480,000.00 | 11,779,360.00 | 9,392,512.00 | 21,171,872.00 | 2,348,128.00 |
| 6,395,918.37 | listed, breakpoint | 507,918.37 | 13,147,360.00 | 9,392,512.00 | 22,539,872.00 | 2,348,128.00 |
| 12,000,000.00 | listed | 620,000.00 | 18,639,360.00 | 9,392,512.00 | 28,031,872.00 | 2,348,128.00 |
| 18,376,163.27 | listed, breakpoint | 747,523.27 | 24,888,000.00 | 9,392,512.00 | 34,280,512.00 | 2,348,128.00 |
| 25,000,000.00 | listed | 880,000.00 | 24,888,000.00 | 14,585,600.00 | 39,473,600.00 | 3,646,400.00 |
