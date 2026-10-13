# Fund case 13, a clawback against a carry step: derivation

A late call against a carry step. The step was reached on the paid-in capital of the day, and the later call raises it (F12's last paragraph). Carry is 20%, then 30% from 2x. No pref, no GP commitment. D is `as_of`, 2025-01-01, and X is final.

**The fund.** $10,000,000 called on 2020-01-01, $30,000,000 distributed on 2022-01-01, and $10,000,000 called on 2023-01-01.

**The earlier $30,000,000**, with paid-in of $10,000,000 that day:
- **Capital:** $10,000,000.
- **20%, until the LPs have 2x, $20,000,000:** they need $10,000,000 more at 80 cents a dollar, so $12,500,000 of it. The GP gets $2,500,000.
- **30% on the last $7,500,000:** $2,250,000 to the GP and $5,250,000 to the LPs.
- **So:** the LPs have $25,250,000 and the GP $4,750,000.

**After the late call** the paid-in is $20,000,000, and 2x is now $40,000,000. The LPs' $25,250,000 is 1.2625x.

**X's tiers.**
- **Capital:** to $10,000,000. The LPs reach $35,250,000.
- **20%, until the LPs have $40,000,000:** $4,750,000 more at 80 cents a dollar is $5,937,500. It ends at X = $15,937,500.
- **Then 30%.**

**The run on the fund's totals (F12).**
- **Capital:** $20,000,000.
- **Amount:** $30,000,000 + X.
- **20%, until the LPs have 2x, $40,000,000:** $25,000,000 of the amount past capital. It ends at an amount of $45,000,000, X = $15,000,000.
- **Then 30%.**

**The clawback.** Carry paid is $4,750,000 plus X's carry. The entitlement is the totals' run's carry.
- **0 to $10,000,000:** X is capital and pays no carry, while the totals' run pays 20%. The clawback falls 20 cents a dollar, from $2,750,000 to $750,000.
- **$10,000,000 to $15,000,000:** both pay 20%, so it holds at $750,000. X's tier ending is the cause, so `capital_returned` sits beside the change.
- **$15,000,000 to $15,937,500:** the totals' run reaches 2x and pays 30% while X still pays 20%. It falls 10 cents a dollar, by $93,750, to $656,250. The totals' run is the cause, so the reason says so.
- **Above $15,937,500:** both pay 30%, so it holds at $656,250 for good. More distributions never clear it.

## Breakpoints

| X | Exact | Reasons |
|---:|---|---|
| 10,000,000.00 | 10000000 | `capital_returned`: "LPs have their $20,000,000 of paid-in capital back"; `clawback_changes`: "the clawback owed stops falling" |
| 15,000,000.00 | 15000000 | `clawback_changes`: "the clawback owed starts to fall: on the fund's totals, LPs reach 2.0x: carry is 30% from here" |
| 15,937,500.00 | 15937500 | `carry_step`: "LPs reach 2.0x: carry is 30% from here"; `clawback_changes`: "the clawback owed stops falling" |

## This distribution

| X | LP capital | LP carry tier | LPs | GP carry 20% | GP carry 30% | GP |
|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 10,000,000.00 | 10,000,000.00 | 0.00 | 10,000,000.00 | 0.00 | 0.00 | 0.00 |
| 12,000,000.00 | 10,000,000.00 | 1,600,000.00 | 11,600,000.00 | 400,000.00 | 0.00 | 400,000.00 |
| 15,000,000.00 | 10,000,000.00 | 4,000,000.00 | 14,000,000.00 | 1,000,000.00 | 0.00 | 1,000,000.00 |
| 15,937,500.00 | 10,000,000.00 | 4,750,000.00 | 14,750,000.00 | 1,187,500.00 | 0.00 | 1,187,500.00 |
| 25,000,000.00 | 10,000,000.00 | 11,093,750.00 | 21,093,750.00 | 1,187,500.00 | 2,718,750.00 | 3,906,250.00 |

At $25,000,000, $9,062,500 is past 2x. At 30% that's $2,718,750 of carry and $6,343,750 to the LPs.

## The fund to date

| X | Distributed | LP capital | LP carry tier | LPs | GP carry 20% | GP carry 30% | GP |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | 30,000,000.00 | 10,000,000.00 | 15,250,000.00 | 25,250,000.00 | 2,500,000.00 | 2,250,000.00 | 4,750,000.00 |
| 10,000,000.00 | 40,000,000.00 | 20,000,000.00 | 15,250,000.00 | 35,250,000.00 | 2,500,000.00 | 2,250,000.00 | 4,750,000.00 |
| 12,000,000.00 | 42,000,000.00 | 20,000,000.00 | 16,850,000.00 | 36,850,000.00 | 2,900,000.00 | 2,250,000.00 | 5,150,000.00 |
| 15,000,000.00 | 45,000,000.00 | 20,000,000.00 | 19,250,000.00 | 39,250,000.00 | 3,500,000.00 | 2,250,000.00 | 5,750,000.00 |
| 15,937,500.00 | 45,937,500.00 | 20,000,000.00 | 20,000,000.00 | 40,000,000.00 | 3,687,500.00 | 2,250,000.00 | 5,937,500.00 |
| 25,000,000.00 | 55,000,000.00 | 20,000,000.00 | 26,343,750.00 | 46,343,750.00 | 3,687,500.00 | 4,968,750.00 | 8,656,250.00 |

## Clawback

| X | Totals' run: 20% on | 30% on | Carry paid | Entitlement | Owed |
|---:|---:|---:|---:|---:|---:|
| 0.00 | 10,000,000 | 0 | 4,750,000.00 | 2,000,000.00 | 2,750,000.00 |
| 10,000,000.00 | 20,000,000 | 0 | 4,750,000.00 | 4,000,000.00 | 750,000.00 |
| 12,000,000.00 | 22,000,000 | 0 | 5,150,000.00 | 4,400,000.00 | 750,000.00 |
| 15,000,000.00 | 25,000,000 | 0 | 5,750,000.00 | 5,000,000.00 | 750,000.00 |
| 15,937,500.00 | 25,000,000 | 937,500 | 5,937,500.00 | 5,281,250.00 | 656,250.00 |
| 25,000,000.00 | 25,000,000 | 10,000,000 | 8,656,250.00 | 8,000,000.00 | 656,250.00 |
