# Fund case 28, a clawback by class with carry steps: derivation

Case 19's fund (case 13's, with two LPs) with Birchwood in a seed class at a flat 15% carry (F22). The fund's carry is 20%, then 30% from 2x; no pref, no GP commitment, no fee calls.

- **Cash flows:** a $10,000,000 investment call on 2020-01-01, a $30,000,000 distribution on 2022-01-01, and a $10,000,000 late call on 2023-01-01.
- **D** is `as_of`, 2025-01-01, and X is final.
- **The LPs:** Alder Endowment ($7,000,000) on the fund's terms, and Birchwood Family Office ($3,000,000) in "Seed LPs", carry 0.15. The class has no fee rate of its own, and the fund has no fee calls.

## The accounts (F23)

One LP in each, so each LP has all of its account's amounts. Every call and distribution divides by commitment, 70/30.

| Account | LP | Commitment | Share of every call and distribution | Carry | Paid in |
|---|---|---:|---:|---|---:|
| Fund terms | Alder Endowment | 7,000,000 | 0.7 | 20%, then 30% from 2x | 7,000,000 + 7,000,000 = 14,000,000.00 |
| Seed LPs | Birchwood Family Office | 3,000,000 | 0.3 | 15% | 3,000,000 + 3,000,000 = 6,000,000.00 |
| **The fund** | | 10,000,000 | 1 | | 20,000,000.00 |

| LP | Class | Commitment | Share | Of its account | Paid in |
|---|---|---:|---:|---:|---:|
| Alder Endowment | | 7,000,000 | 0.7 | 1 | 14,000,000.00 |
| Birchwood Family Office | Seed LPs | 3,000,000 | 0.3 | 1 | 6,000,000.00 |

## The earlier $30,000,000

It divides 70/30, and each account runs its own tiers on what was paid in by then, $7,000,000 and $3,000,000.

**Fund terms, $21,000,000:**
1. $7,000,000 of capital.
2. 80/20 until its LPs reach 2x of $7,000,000, $14,000,000: they need $7,000,000 more, which at 80% takes $8,750,000. The GP gets $1,750,000.
3. The other $5,250,000 at 70/30: the GP gets $1,575,000 and the LPs $3,675,000.

Its GP is paid $3,325,000, and its LPs have $17,675,000.

**Seed LPs, $9,000,000:** $3,000,000 of capital, then $6,000,000 at 85/15. The GP gets $900,000 and its LPs $5,100,000.

Then the late call: $7,000,000 from the fund terms' account and $3,000,000 from the class's.

## Each account's tiers, as X grows

X divides 70/30.

**Fund terms:**
1. **Capital:** the late call's $7,000,000, at X = $7,000,000 / 0.7 = **$10,000,000**.
2. **Back to 20%.** Its paid-in is now $14,000,000, and its LPs have $17,675,000 + $7,000,000 = $24,675,000, 1.7625x: below 2x again (F11).
3. **80/20 until 2x of $14,000,000, $28,000,000:** $3,325,000 more at 80% takes $4,156,250 of its part, X = $5,937,500 more. So at X = **$15,937,500**.
4. **70/30 from there.**

**Seed LPs:** capital of $3,000,000 at X = $3,000,000 / 0.3 = **$10,000,000**, then 85/15.

## The clawback by account (F24)

X is final, so each account settles on its own.

**Fund terms.** The run on its own totals has its $14,000,000 paid-in as capital and $21,000,000 + 0.7X through the tiers:
1. $14,000,000 of capital
2. then 80/20 until its LPs have $28,000,000, which takes $17,500,000, the totals reaching $31,500,000 at 0.7X = $10,500,000, X = **$15,000,000**
3. then 70/30

Its entitlement and carry paid, and the owed between them:

| X | Carry paid | Entitlement | Owed | Why |
|---|---|---|---|---|
| 0 to 10,000,000 | 3,325,000 | 1,400,000 + 0.14X | 1,925,000 − 0.14X | X returns capital, while the totals run at 20% |
| 10,000,000 to 15,000,000 | 3,325,000 + 0.14 (X − 10,000,000) | 1,400,000 + 0.14X | 525,000 | both at 20% of 0.7X |
| 15,000,000 to 15,937,500 | as above | 3,500,000 + 0.21 (X − 15,000,000) | 525,000 − 0.07 (X − 15,000,000) | the totals are at 30% |
| 15,937,500 on | 4,156,250 + 0.21 (X − 15,937,500) | as above | 459,375 | both at 30% |

At X = 0 the totals' $21,000,000 gives $7,000,000 at 20%, $1,400,000, so the GP owes $3,325,000 − $1,400,000 = $1,925,000.

**Seed LPs.** Its totals have $6,000,000 of capital and $9,000,000 + 0.3X through the tiers. Its entitlement is 15% of the profit, $3,000,000 + 0.3X: $450,000 + 0.045X. Carry paid is $900,000 until X = $10,000,000, so the GP owes $450,000 − 0.045X, cleared at X = $10,000,000. From there both pay 15% of 0.3X, and nothing is owed.

**The fund** owes the two accounts' sum (F24): $1,925,000 + $450,000 = $2,375,000 at X = 0, where case 19, one account, owes $2,750,000. The seed class's lower carry leaves its GP $450,000 to give back, not 30% of $2,750,000 = $825,000.

| X | Tags | Fund terms: carry paid | Fund terms: entitled | Fund terms: owed | Seed LPs: carry paid | Seed LPs: entitled | Seed LPs: owed | The fund owes |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 3,325,000.00 | 1,400,000.00 | 1,925,000.00 | 900,000.00 | 450,000.00 | 450,000.00 | 2,375,000.00 |
| 10,000,000.00 | listed, breakpoint | 3,325,000.00 | 2,800,000.00 | 525,000.00 | 900,000.00 | 900,000.00 | 0.00 | 525,000.00 |
| 12,000,000.00 | listed | 3,605,000.00 | 3,080,000.00 | 525,000.00 | 990,000.00 | 990,000.00 | 0.00 | 525,000.00 |
| 15,000,000.00 | listed, breakpoint | 4,025,000.00 | 3,500,000.00 | 525,000.00 | 1,125,000.00 | 1,125,000.00 | 0.00 | 525,000.00 |
| 15,937,500.00 | listed, breakpoint | 4,156,250.00 | 3,696,875.00 | 459,375.00 | 1,167,187.50 | 1,167,187.50 | 0.00 | 459,375.00 |
| 25,000,000.00 | listed | 6,059,375.00 | 5,600,000.00 | 459,375.00 | 1,575,000.00 | 1,575,000.00 | 0.00 | 459,375.00 |

The fund terms' $459,375 is 70% of case 19's $656,250 for good: the late call against the step, as F12's last paragraph has it.

## Breakpoints (F27)

Two accounts, so each reason names its account, the fund's terms first, each account's tier before its clawback (FC5).

| X | Exact | Reasons |
|---:|---|---|
| 10,000,000.00 | 10000000 | `capital_returned`: "Fund terms: LPs have their $14,000,000 of paid-in capital back"; `clawback_changes`: "Fund terms: the clawback owed stops falling"; `capital_returned`: "Seed LPs: LPs have their $6,000,000 of paid-in capital back"; `clawback_cleared`: "Seed LPs: from here the GP has earned all the carry it was paid earlier" |
| 15,000,000.00 | 15000000 | `clawback_changes`: "Fund terms: the clawback owed starts to fall: on its own totals, LPs reach 2.0x: carry is 30% from here" |
| 15,937,500.00 | 15937500 | `carry_step`: "Fund terms: LPs reach 2.0x: carry is 30% from here"; `clawback_changes`: "Fund terms: the clawback owed stops falling" |

- **At $15,000,000** nothing in X's own tiers ends. The run on the fund terms' own totals reaches 2x and moves to 30%, so the clawback starts to fall. With two accounts the reason says "on its own totals" (F27, FA29), where case 19's says "on the fund's totals". Its `fund_totals` is `carry_step`.
- **The seed class's clawback only clears,** at $10,000,000. Its flat 15% has no step for a late call to catch.

## This distribution, by account

**Fund terms**

| X | Tags | Its part | Capital | LPs, carry tier | GP carry | LPs | GP |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 10,000,000.00 | listed, breakpoint | 7,000,000.00 | 7,000,000.00 | 0.00 | 0.00 | 7,000,000.00 | 0.00 |
| 12,000,000.00 | listed | 8,400,000.00 | 7,000,000.00 | 1,120,000.00 | 280,000.00 | 8,120,000.00 | 280,000.00 |
| 15,000,000.00 | listed, breakpoint | 10,500,000.00 | 7,000,000.00 | 2,800,000.00 | 700,000.00 | 9,800,000.00 | 700,000.00 |
| 15,937,500.00 | listed, breakpoint | 11,156,250.00 | 7,000,000.00 | 3,325,000.00 | 831,250.00 | 10,325,000.00 | 831,250.00 |
| 25,000,000.00 | listed | 17,500,000.00 | 7,000,000.00 | 7,765,625.00 | 2,734,375.00 | 14,765,625.00 | 2,734,375.00 |

At $25,000,000 its part is $17,500,000: $7,000,000 of capital, $4,156,250 at 80/20 (GP $831,250), and $6,343,750 at 70/30 (GP $1,903,125).

**Seed LPs**

| X | Tags | Its part | Capital | LPs, carry tier | GP carry | LPs | GP |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 10,000,000.00 | listed, breakpoint | 3,000,000.00 | 3,000,000.00 | 0.00 | 0.00 | 3,000,000.00 | 0.00 |
| 12,000,000.00 | listed | 3,600,000.00 | 3,000,000.00 | 510,000.00 | 90,000.00 | 3,510,000.00 | 90,000.00 |
| 15,000,000.00 | listed, breakpoint | 4,500,000.00 | 3,000,000.00 | 1,275,000.00 | 225,000.00 | 4,275,000.00 | 225,000.00 |
| 15,937,500.00 | listed, breakpoint | 4,781,250.00 | 3,000,000.00 | 1,514,062.50 | 267,187.50 | 4,514,062.50 | 267,187.50 |
| 25,000,000.00 | listed | 7,500,000.00 | 3,000,000.00 | 3,825,000.00 | 675,000.00 | 6,825,000.00 | 675,000.00 |

## The fund, the accounts' sums (F23, F26)

The GP's carry lists the fund terms' two steps, then the seed class's one.

**This distribution**

| X | Tags | LPs, capital | LPs, carry tier | LPs | GP carry, Fund terms 20% | GP carry, Fund terms 30% from 2x | GP carry, Seed LPs 15% | GP |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 10,000,000.00 | listed, breakpoint | 10,000,000.00 | 0.00 | 10,000,000.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 12,000,000.00 | listed | 10,000,000.00 | 1,630,000.00 | 11,630,000.00 | 280,000.00 | 0.00 | 90,000.00 | 370,000.00 |
| 15,000,000.00 | listed, breakpoint | 10,000,000.00 | 4,075,000.00 | 14,075,000.00 | 700,000.00 | 0.00 | 225,000.00 | 925,000.00 |
| 15,937,500.00 | listed, breakpoint | 10,000,000.00 | 4,839,062.50 | 14,839,062.50 | 831,250.00 | 0.00 | 267,187.50 | 1,098,437.50 |
| 25,000,000.00 | listed | 10,000,000.00 | 11,590,625.00 | 21,590,625.00 | 831,250.00 | 1,903,125.00 | 675,000.00 | 3,409,375.00 |

**The fund to date,** X included. The earlier $30,000,000 gave the LPs $10,000,000 of capital and $15,775,000 from the carry tier ($10,675,000 and $5,100,000), and the GP $4,225,000.

| X | Tags | LPs, capital | LPs, carry tier | LPs | GP carry, Fund terms 20% | GP carry, Fund terms 30% from 2x | GP carry, Seed LPs 15% | GP |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 10,000,000.00 | 15,775,000.00 | 25,775,000.00 | 1,750,000.00 | 1,575,000.00 | 900,000.00 | 4,225,000.00 |
| 10,000,000.00 | listed, breakpoint | 20,000,000.00 | 15,775,000.00 | 35,775,000.00 | 1,750,000.00 | 1,575,000.00 | 900,000.00 | 4,225,000.00 |
| 12,000,000.00 | listed | 20,000,000.00 | 17,405,000.00 | 37,405,000.00 | 2,030,000.00 | 1,575,000.00 | 990,000.00 | 4,595,000.00 |
| 15,000,000.00 | listed, breakpoint | 20,000,000.00 | 19,850,000.00 | 39,850,000.00 | 2,450,000.00 | 1,575,000.00 | 1,125,000.00 | 5,150,000.00 |
| 15,937,500.00 | listed, breakpoint | 20,000,000.00 | 20,614,062.50 | 40,614,062.50 | 2,581,250.00 | 1,575,000.00 | 1,167,187.50 | 5,323,437.50 |
| 25,000,000.00 | listed | 20,000,000.00 | 27,365,625.00 | 47,365,625.00 | 2,581,250.00 | 3,478,125.00 | 1,575,000.00 | 7,634,375.00 |

The fund's clawback is the accounts' sums: carry paid and entitlement as in the table above, and owed $2,375,000 at X = 0.

## Each LP (F20, F24)

Each LP has all of its account's amounts.

**This distribution**

| X | Tags | Alder Endowment | Birchwood Family Office |
|---:|---|---:|---:|
| 0.00 | listed | 0.00 | 0.00 |
| 10,000,000.00 | listed, breakpoint | 7,000,000.00 | 3,000,000.00 |
| 12,000,000.00 | listed | 8,120,000.00 | 3,510,000.00 |
| 15,000,000.00 | listed, breakpoint | 9,800,000.00 | 4,275,000.00 |
| 15,937,500.00 | listed, breakpoint | 10,325,000.00 | 4,514,062.50 |
| 25,000,000.00 | listed | 14,765,625.00 | 6,825,000.00 |

**To date**

| X | Tags | Alder Endowment | Birchwood Family Office |
|---:|---|---:|---:|
| 0.00 | listed | 17,675,000.00 | 8,100,000.00 |
| 10,000,000.00 | listed, breakpoint | 24,675,000.00 | 11,100,000.00 |
| 12,000,000.00 | listed | 25,795,000.00 | 11,610,000.00 |
| 15,000,000.00 | listed, breakpoint | 27,475,000.00 | 12,375,000.00 |
| 15,937,500.00 | listed, breakpoint | 28,000,000.00 | 12,614,062.50 |
| 25,000,000.00 | listed | 32,440,625.00 | 14,925,000.00 |

Alder's amounts are case 19's: it's alone on the fund's terms, so its account runs as case 19's whole fund at 70%. Birchwood gets more than case 19's 30%, since its class pays 15% carry, not 20% then 30%.

**The clawback, each LP's share of what its account is owed**

| X | Tags | Alder Endowment | Birchwood Family Office |
|---:|---|---:|---:|
| 0.00 | listed | 1,925,000.00 | 450,000.00 |
| 10,000,000.00 | listed, breakpoint | 525,000.00 | 0.00 |
| 12,000,000.00 | listed | 525,000.00 | 0.00 |
| 15,000,000.00 | listed, breakpoint | 525,000.00 | 0.00 |
| 15,937,500.00 | listed, breakpoint | 459,375.00 | 0.00 |
| 25,000,000.00 | listed | 459,375.00 | 0.00 |

Alder's clawback is case 19's to the cent: $1,925,000 at X = 0 and $459,375 for good. Every amount in this case ends in whole cents.
