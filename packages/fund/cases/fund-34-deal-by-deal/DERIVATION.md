# Fund case 34, carry deal by deal: derivation

Case 33's fund with `carry_basis` `"deal_by_deal"` (F34). Every input but that one term is case 33's. Deal by deal, tier 1 at each distribution runs only to what's due on the investments exited or written off so far: their cost, the LPs' part of it, and their share of the fees and expenses, by cost (F35). The GP takes carry on the rest.

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

The table is case 33's: the investments are the same on either basis.

## Alder's exit: what's due (F35)

On 2022-06-30:
- **The cost made by then** is all three checks, **$10,000,000**.
- **The cost realized so far** is Alder's $3,000,000: the exit sells all of what's left of it, and this distribution's own realization counts (FA50). Nothing else has been realized.
- **The LPs' part of the cost realized:** (1 − 0.01) × $3,000,000 = **$2,970,000**. The GP commitment's 1% of the cost is aside (F3).
- **The fees and expenses to date:** the three $400,000 fee calls, all on or before 2022-06-30, all the LPs' ($1,200,000; no expense calls). Their share is realized over made, $3,000,000 / $10,000,000 = 30%: **$360,000**.
- **Due: $3,330,000.**

## Alder's exit: the split

$90,000 to the GP commitment, and $8,910,000 through the tiers:
- **Tier 1:** the LPs get 100% until their capital back to date reaches what's due. Nothing is back yet, so **$3,330,000**.
- **The carry tier:** the other $5,580,000 at 80/20: **$4,464,000** to the LPs and **$1,116,000 of carry** to the GP.

On the whole fund (case 33) this distribution pays no carry: the GP's first carry comes from X, two years later.

## Birch Health's write-off

On 2023-03-31 it realizes all of Birch's $3,000,000, with no proceeds (F33). It distributes nothing, so no tier runs. It raises the cost realized for the next distribution: $6,000,000 of $10,000,000.

## X: what's due (F35, F14)

X comes from Cedar AI and sells all of what's left of it, $4,000,000, so with X the cost realized is all **$10,000,000** of the $10,000,000 made:
- **Cost:** 0.99 × $10,000,000 = **$9,900,000**.
- **Fees and expenses:** all $1,200,000, times 10/10: **$1,200,000**.
- **Due: $11,100,000**, all the LPs' paid-in. $3,330,000 of it is back, so X's tier 1 is **$7,770,000**.

It doesn't change with X (F35), and at the NAV point everything left is realized too, which is the same Cedar AI.

| X | Tags | Cost made | Cost realized | Cost | Fees and expenses | Due |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 10,000,000.00 | 10,000,000.00 | 9,900,000.00 | 1,200,000.00 | 11,100,000.00 |
| 5,000,000.00 | listed | 10,000,000.00 | 10,000,000.00 | 9,900,000.00 | 1,200,000.00 | 11,100,000.00 |
| 7,848,484.85 | listed, breakpoint | 10,000,000.00 | 10,000,000.00 | 9,900,000.00 | 1,200,000.00 | 11,100,000.00 |
| 12,000,000.00 | listed, nav | 10,000,000.00 | 10,000,000.00 | 9,900,000.00 | 1,200,000.00 | 11,100,000.00 |

## X, distributed on D

1% to the GP commitment and 0.99 X through the tiers:
- **Tier 1** until 0.99 X = $7,770,000, at X = 7,770,000 / 0.99 = 259,000,000/33 = **$7,848,484.85**.
- **Then 80/20.**

| X | Exact | Reasons |
|---:|---|---|
| 7,848,484.85 | 259000000/33 | `capital_returned`: "LPs have their $11,100,000 back for the investments exited or written off, fees and expenses included" |

The reason gives what's due, $11,100,000, as its amount (F36, FA57).

**At $5,000,000:** $50,000 and $4,950,000, all tier 1. **At $12,000,000, the NAV point:** $120,000 and $11,880,000: $7,770,000 of tier 1, then $4,110,000 at 80/20, **$822,000 of carry** from X.

This distribution:

| X | Tags | GP commitment | LPs, capital | LPs, carry tier | LPs | GP carry |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 5,000,000.00 | listed | 50,000.00 | 4,950,000.00 | 0.00 | 4,950,000.00 | 0.00 |
| 7,848,484.85 | listed, breakpoint | 78,484.85 | 7,770,000.00 | 0.00 | 7,770,000.00 | 0.00 |
| 12,000,000.00 | listed, nav | 120,000.00 | 7,770,000.00 | 3,288,000.00 | 11,058,000.00 | 822,000.00 |

The fund to date, Alder's $3,330,000 of capital and $1,116,000 of carry among it:

| X | Tags | GP commitment | LPs, capital | LPs, carry tier | LPs | GP carry |
|---:|---|---:|---:|---:|---:|---:|
| 0.00 | listed | 90,000.00 | 3,330,000.00 | 4,464,000.00 | 7,794,000.00 | 1,116,000.00 |
| 5,000,000.00 | listed | 140,000.00 | 8,280,000.00 | 4,464,000.00 | 12,744,000.00 | 1,116,000.00 |
| 7,848,484.85 | listed, breakpoint | 168,484.85 | 11,100,000.00 | 4,464,000.00 | 15,564,000.00 | 1,116,000.00 |
| 12,000,000.00 | listed, nav | 210,000.00 | 11,100,000.00 | 7,752,000.00 | 18,852,000.00 | 1,938,000.00 |

## The NAV point: the clawback (F12, F35)

Final by definition. The entitlement is the tiers on the fund's totals with all paid-in as capital, as on the whole fund: the $8,910,000 and the $11,880,000 that ran the tiers, $20,790,000, less $11,100,000 of capital, leaves $9,690,000 of profit, 20% of it **$1,938,000**. The carry paid is $1,116,000 from Alder's exit and $822,000 from X, the same **$1,938,000**: nothing is owed back. Deal by deal paid it earlier, and the whole fund earns it all.

| X | Tags | Carry paid | Entitlement | Owed |
|---:|---|---:|---:|---:|
| 12,000,000.00 | listed, nav | 1,938,000.00 | 1,938,000.00 | 0.00 |

## Cases 33 and 34 side by side at $12,000,000

| At X = $12,000,000 | Case 33, whole fund | Case 34, deal by deal |
|---|---:|---:|
| X's tier 1 runs until the LPs have back | 11,100,000.00 (all paid-in) | 11,100,000.00 (what's due) |
| Alder's exit: LPs' capital | 8,910,000.00 | 3,330,000.00 |
| Alder's exit: carry | 0.00 | 1,116,000.00 |
| X: LPs' capital | 2,190,000.00 | 7,770,000.00 |
| X: carry | 1,938,000.00 | 822,000.00 |
| Carry to date | 1,938,000.00 | 1,938,000.00 |
| LPs to date | 18,852,000.00 | 18,852,000.00 |
| GP commitment to date | 210,000.00 | 210,000.00 |
| Entitlement | 1,938,000.00 | 1,938,000.00 |
| Owed back | 0.00 | 0.00 |

The same totals; only when the carry is paid differs.
