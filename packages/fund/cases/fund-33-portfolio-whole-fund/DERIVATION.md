# Fund case 33, investments on the whole fund: derivation

Case 34's fund on the whole fund, the default (F34): `carry_basis` is left out. The fund lists its investments, the exit names the one it comes from, Birch Health is written off and X comes from Cedar AI. On the whole fund none of that changes an amount (F34): the investments only fill the table (F36). Every amount here is what the same fund gives with no investments, no tags, no write-off and no `distribution_from`, as in 0.4.0.

- **The terms:** 20% carry, no pref, and a 1% GP commitment, fee-free and paying its share of expenses (F3's defaults).
- **Investment calls:** $6,000,000 on 2020-01-15 and $4,000,000 on 2021-01-15. **Fee calls:** $400,000 on each of 2020-01-15, 2021-01-15 and 2022-01-15. No expense calls.
- **The investments:** Alder Robotics, a $3,000,000 check on 2020-02-01; Birch Health, $3,000,000 on 2020-03-01; Cedar AI, $4,000,000 on 2021-02-01. $10,000,000 of cost in all.
- **An exit:** $9,000,000 from Alder Robotics on 2022-06-30, its share left out, so 1: all of it.
- **A write-off:** Birch Health on 2023-03-31.
- **X** comes from Cedar AI, its share left out, so all of it. **D** is `as_of`, 2024-06-30. X isn't final; the NAV is $12,000,000.

**Paid in (F3, F5).** The GP commitment pays 1% of the investment calls, $100,000, and none of the fees. The LPs pay $9,900,000 of the investment calls and all $1,200,000 of the fees: **$11,100,000**.

**The checks against the calls (F37).** By 2020-02-01 the fund had made $3,000,000 of cost on $6,000,000 of investment calls; by 2020-03-01, $6,000,000 on $6,000,000; by 2021-02-01, $10,000,000 on $10,000,000. The cost made never runs ahead of the calls.

## The investments (F33, F36)

Once, at D, before X:
- **Alder Robotics:** $3,000,000 made. Its exit sells all of what's left, so $3,000,000 is realized, and its proceeds are the $9,000,000.
- **Birch Health:** $3,000,000 made, all of it written off on 2023-03-31, with no proceeds.
- **Cedar AI:** $4,000,000 made, nothing realized yet. X comes from it, but the table is before X.

| Investment | Cost made | Cost realized | Written off | Proceeds |
|---|---:|---:|---:|---:|
| Alder Robotics | 3,000,000.00 | 3,000,000.00 | 0.00 | 9,000,000.00 |
| Birch Health | 3,000,000.00 | 3,000,000.00 | 3,000,000.00 | 0.00 |
| Cedar AI | 4,000,000.00 | 0.00 | 0.00 | 0.00 |

**The realized multiple** (F36, FA59), proceeds over the cost realized: Alder Robotics 9,000,000 / 3,000,000 = **3x**; Birch Health, written off with none, **0x**; Cedar AI, nothing realized, **none** (null).

## The earlier distribution (F1, F5)

The $9,000,000 on 2022-06-30: the GP commitment's 1%, $90,000, outside the tiers (F3), and $8,910,000 through them. On the whole fund the LPs get back all their paid-in capital first, and they had $11,100,000 in, so all $8,910,000 is capital. No carry. $2,190,000 of capital is still to come back.

The write-off moves nothing: it's not a distribution, and on the whole fund it changes no amount.

## X, distributed on D

1% of X to the GP commitment, and 0.99 X through the tiers:
- **Capital:** the LPs' last $2,190,000, until 0.99 X = $2,190,000, at X = 2,190,000 / 0.99 = 73,000,000/33 = **$2,212,121.21**.
- **Then 80/20.**

No pref and one carry rate, so nothing else bends.

| X | Exact | Reasons |
|---:|---|---|
| 2,212,121.21 | 73000000/33 | `capital_returned`: "LPs have their $11,100,000 of paid-in capital back" |

**At $5,000,000:** $50,000 to the GP commitment and $4,950,000 through the tiers: $2,190,000 of capital, then $2,760,000 at 80/20, **$552,000 of carry**.

**At $12,000,000, the NAV point:** $120,000 and $11,880,000: $2,190,000 of capital, then $9,690,000 at 80/20, **$1,938,000 of carry**, all of it from X.

This distribution:

| X | Tags | GP commitment | LPs, capital | LPs, carry tier | LPs | GP carry |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 2,212,121.21 | listed, breakpoint | 22,121.21 | 2,190,000.00 | 0.00 | 2,190,000.00 | 0.00 |
| 5,000,000.00 | listed | 50,000.00 | 2,190,000.00 | 2,208,000.00 | 4,398,000.00 | 552,000.00 |
| 12,000,000.00 | listed, nav | 120,000.00 | 2,190,000.00 | 7,752,000.00 | 9,942,000.00 | 1,938,000.00 |

The fund to date:

| X | Tags | GP commitment | LPs, capital | LPs, carry tier | LPs | GP carry |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 90,000.00 | 8,910,000.00 | 0.00 | 8,910,000.00 | 0.00 |
| 2,212,121.21 | listed, breakpoint | 112,121.21 | 11,100,000.00 | 0.00 | 11,100,000.00 | 0.00 |
| 5,000,000.00 | listed | 140,000.00 | 11,100,000.00 | 2,208,000.00 | 13,308,000.00 | 552,000.00 |
| 12,000,000.00 | listed, nav | 210,000.00 | 11,100,000.00 | 7,752,000.00 | 18,852,000.00 | 1,938,000.00 |

## The NAV point: the clawback (F12, F14)

The NAV point is final by definition. The run on the fund's totals has all $11,100,000 of paid-in as capital and all $20,790,000 that ran the tiers ($8,910,000 earlier and $11,880,000 from X) as its amount: $9,690,000 of profit, 20% of it **$1,938,000**, the entitlement. The carry paid is the same $1,938,000, so nothing is owed: on the whole fund, carry is paid only once the LPs have all their capital back, and no capital is called after that.

| X | Tags | Carry paid | Entitlement | Owed |
|---:|---|---:|---:|---:|
| 12,000,000.00 | listed, nav | 1,938,000.00 | 1,938,000.00 | 0.00 |
