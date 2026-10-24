# Fund case 23, an anchor class with a pref and catch-up: derivation

Two LPs on different terms. The fund charges a 2% fee and 20% carry, with an 8% simple pref and a full catch-up. The "Anchor" class pays a 1% fee and 10% carry; the pref and the catch-up's share are the fund's for every class (F22). No GP commitment.

- **Calls:** $10,000,000 of investment and a $300,000 fee call, both on 2020-01-01. Nothing distributed before X.
- **D** is `as_of`, 2025-01-01, 1,827 days after the calls (2020 and 2024 are leap years). X isn't final, and there's no NAV.
- **The LPs:** Anchor Pension ($5,000,000) in Anchor, and Bluebell Trust ($5,000,000) on the fund's terms. The input lists Anchor Pension first, but the fund terms' account comes first (F26).

## The accounts (F22, F23)

One LP in each, so each LP is its account: its share of its account is 1.
- **Distributions and the investment call** divide by commitment: half each.
- **The fee call** divides by fee weight. Bluebell's is its commitment, $5,000,000; Anchor Pension's is $5,000,000 × 1% / 2% = $2,500,000. So the fund terms' account pays 2/3 of the fee call and Anchor 1/3.

| Account | LP | Commitment | Share of distributions and investment calls | Fee weight | Share of fee calls | Investment | Fees | Paid in |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Fund terms | Bluebell Trust | 5,000,000 | 0.5 | 5,000,000 | 2/3 | 5,000,000.00 | 200,000.00 | 5,200,000.00 |
| Anchor | Anchor Pension | 5,000,000 | 0.5 | 2,500,000 | 1/3 | 5,000,000.00 | 100,000.00 | 5,100,000.00 |
| **The fund** | | 10,000,000 | 1 | | 1 | 10,000,000.00 | 300,000.00 | 10,300,000.00 |

## Each account's pref (F6, F23)

Each account's pref accrues on its own unreturned capital, all of it, for 1,827 days:
- **Fund terms:** $5,200,000 × 8% × 1,827 / 365 = 152,006,400/73 = **$2,082,279.45**.
- **Anchor:** $5,100,000 × 8% × 1,827 / 365 = 149,083,200/73 = **$2,042,235.62**.
- **The fund's** is their sum, $4,124,515.07 (FA23).

## Each account's catch-up (F8, F22)

A full catch-up gives the GP every dollar until its carry is the account's own first carry rate c of the profit. Profit is the pref plus the catch-up, so the catch-up y solves y = c × (pref + y), and y = pref × c / (1 − c):
- **Fund terms,** c = 20%: y = 152,006,400/73 × 1/4 = 38,001,600/73 = **$520,569.86**.
- **Anchor,** c = 10%: y = 149,083,200/73 × 1/9 = 16,564,800/73 = **$226,915.07**.

## Each account's tiers, as X grows

Each account gets half of X. So each tier ends at X = 2 × the account's amount to its end.

| Account | Capital back | Pref met | Catch-up done | Then |
|---|---:|---:|---:|---|
| Fund terms | 2 × 5,200,000 = 10,400,000 | 2 × (5,200,000 + 152,006,400/73) = 1,063,212,800/73 | 2 × (5,200,000 + 190,008,000/73) = 1,139,216,000/73 | 80/20 |
| Anchor | 2 × 5,100,000 = 10,200,000 | 2 × (5,100,000 + 149,083,200/73) = 1,042,766,400/73 | 2 × (5,100,000 + 165,648,000/73) = 1,075,896,000/73 | 90/10 |

## Breakpoints (F27)

Six, three for each account, at six different X. Anchor's comes first each time, since its capital is smaller and its catch-up shorter.

| X | Exact | Reasons |
|---:|---|---|
| 10,200,000.00 | 10200000 | `capital_returned`: "Anchor: LPs have their $5,100,000 of paid-in capital back" |
| 10,400,000.00 | 10400000 | `capital_returned`: "Fund terms: LPs have their $5,200,000 of paid-in capital back" |
| 14,284,471.23 | 1042766400/73 | `pref_met`: "Anchor: LPs have their 8% pref, $2,042,235.62" |
| 14,564,558.90 | 1063212800/73 | `pref_met`: "Fund terms: LPs have their 8% pref, $2,082,279.45" |
| 14,738,301.37 | 1075896000/73 | `catch_up_done`: "Anchor: the GP has 10% of the profit" |
| 15,605,698.63 | 1139216000/73 | `catch_up_done`: "Fund terms: the GP has 20% of the profit" |

Each `pref_met` names its account's own pref, and each `catch_up_done` its account's own carry rate (F27).

## This distribution, by account

Nothing was distributed before X, so each account's amounts to date are X's.

**Fund terms**

| X | Tags | Its part | Capital | Pref | GP catch-up | LPs, carry tier | GP carry | LPs | GP |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 10,200,000.00 | listed, breakpoint | 5,100,000.00 | 5,100,000.00 | 0.00 | 0.00 | 0.00 | 0.00 | 5,100,000.00 | 0.00 |
| 10,400,000.00 | listed, breakpoint | 5,200,000.00 | 5,200,000.00 | 0.00 | 0.00 | 0.00 | 0.00 | 5,200,000.00 | 0.00 |
| 14,284,471.23 | breakpoint | 7,142,235.62 | 5,200,000.00 | 1,942,235.62 | 0.00 | 0.00 | 0.00 | 7,142,235.62 | 0.00 |
| 14,500,000.00 | listed | 7,250,000.00 | 5,200,000.00 | 2,050,000.00 | 0.00 | 0.00 | 0.00 | 7,250,000.00 | 0.00 |
| 14,564,558.90 | breakpoint | 7,282,279.45 | 5,200,000.00 | 2,082,279.45 | 0.00 | 0.00 | 0.00 | 7,282,279.45 | 0.00 |
| 14,738,301.37 | breakpoint | 7,369,150.68 | 5,200,000.00 | 2,082,279.45 | 86,871.23 | 0.00 | 0.00 | 7,282,279.45 | 86,871.23 |
| 15,605,698.63 | breakpoint | 7,802,849.32 | 5,200,000.00 | 2,082,279.45 | 520,569.86 | 0.00 | 0.00 | 7,282,279.45 | 520,569.86 |
| 16,000,000.00 | listed | 8,000,000.00 | 5,200,000.00 | 2,082,279.45 | 520,569.86 | 157,720.55 | 39,430.14 | 7,440,000.00 | 560,000.00 |
| 30,000,000.00 | listed | 15,000,000.00 | 5,200,000.00 | 2,082,279.45 | 520,569.86 | 5,757,720.55 | 1,439,430.14 | 13,040,000.00 | 1,960,000.00 |

**Anchor**

| X | Tags | Its part | Capital | Pref | GP catch-up | LPs, carry tier | GP carry | LPs | GP |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 10,200,000.00 | listed, breakpoint | 5,100,000.00 | 5,100,000.00 | 0.00 | 0.00 | 0.00 | 0.00 | 5,100,000.00 | 0.00 |
| 10,400,000.00 | listed, breakpoint | 5,200,000.00 | 5,100,000.00 | 100,000.00 | 0.00 | 0.00 | 0.00 | 5,200,000.00 | 0.00 |
| 14,284,471.23 | breakpoint | 7,142,235.62 | 5,100,000.00 | 2,042,235.62 | 0.00 | 0.00 | 0.00 | 7,142,235.62 | 0.00 |
| 14,500,000.00 | listed | 7,250,000.00 | 5,100,000.00 | 2,042,235.62 | 107,764.38 | 0.00 | 0.00 | 7,142,235.62 | 107,764.38 |
| 14,564,558.90 | breakpoint | 7,282,279.45 | 5,100,000.00 | 2,042,235.62 | 140,043.84 | 0.00 | 0.00 | 7,142,235.62 | 140,043.84 |
| 14,738,301.37 | breakpoint | 7,369,150.68 | 5,100,000.00 | 2,042,235.62 | 226,915.07 | 0.00 | 0.00 | 7,142,235.62 | 226,915.07 |
| 15,605,698.63 | breakpoint | 7,802,849.32 | 5,100,000.00 | 2,042,235.62 | 226,915.07 | 390,328.77 | 43,369.86 | 7,532,564.38 | 270,284.93 |
| 16,000,000.00 | listed | 8,000,000.00 | 5,100,000.00 | 2,042,235.62 | 226,915.07 | 567,764.38 | 63,084.93 | 7,710,000.00 | 290,000.00 |
| 30,000,000.00 | listed | 15,000,000.00 | 5,100,000.00 | 2,042,235.62 | 226,915.07 | 6,867,764.38 | 763,084.93 | 14,010,000.00 | 990,000.00 |

- **At $14,500,000:** each part is $7,250,000. The fund terms' account is still in its pref: $7,250,000 − $5,200,000 = $2,050,000 of its $2,082,279.45. Anchor's has its pref and is in its catch-up: $7,250,000 − $5,100,000 − 149,083,200/73 = 7,866,800/73 = $107,764.38, all to the GP.
- **At $16,000,000:** each part is $8,000,000.
  - **Fund terms:** after capital, pref and catch-up, 14,392,000/73 = $197,150.68 runs at 80/20: GP $39,430.14.
  - **Anchor:** 46,052,000/73 = $630,849.32 runs at 90/10: GP $63,084.93.
  - **A check:** past its catch-up an account's GP has c of all its profit. The fund terms' profit is $8,000,000 − $5,200,000 = $2,800,000, and 20% of it is $560,000. Anchor's is $2,900,000, and 10% is $290,000. Together $850,000 exactly.
- **At $30,000,000:** the same check gives 20% of $9,800,000 = $1,960,000 and 10% of $9,900,000 = $990,000, so $2,950,000.

## The fund, the accounts' sums (F23, F26)

The LPs' share of a full catch-up is zero, so the case file's `catch_up` for the LPs is $0.00 at every point. The GP's carry lists the fund terms' 20% step, then Anchor's 10%.

| X | Tags | LPs, capital | LPs, pref | LPs, carry tier | LPs | GP catch-up | GP carry, Fund terms 20% | GP carry, Anchor 10% | GP |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 10,200,000.00 | listed, breakpoint | 10,200,000.00 | 0.00 | 0.00 | 10,200,000.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 10,400,000.00 | listed, breakpoint | 10,300,000.00 | 100,000.00 | 0.00 | 10,400,000.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 14,284,471.23 | breakpoint | 10,300,000.00 | 3,984,471.23 | 0.00 | 14,284,471.23 | 0.00 | 0.00 | 0.00 | 0.00 |
| 14,500,000.00 | listed | 10,300,000.00 | 4,092,235.62 | 0.00 | 14,392,235.62 | 107,764.38 | 0.00 | 0.00 | 107,764.38 |
| 14,564,558.90 | breakpoint | 10,300,000.00 | 4,124,515.07 | 0.00 | 14,424,515.07 | 140,043.84 | 0.00 | 0.00 | 140,043.84 |
| 14,738,301.37 | breakpoint | 10,300,000.00 | 4,124,515.07 | 0.00 | 14,424,515.07 | 313,786.30 | 0.00 | 0.00 | 313,786.30 |
| 15,605,698.63 | breakpoint | 10,300,000.00 | 4,124,515.07 | 390,328.77 | 14,814,843.84 | 747,484.93 | 0.00 | 43,369.86 | 790,854.79 |
| 16,000,000.00 | listed | 10,300,000.00 | 4,124,515.07 | 725,484.93 | 15,150,000.00 | 747,484.93 | 39,430.14 | 63,084.93 | 850,000.00 |
| 30,000,000.00 | listed | 10,300,000.00 | 4,124,515.07 | 12,625,484.93 | 27,050,000.00 | 747,484.93 | 1,439,430.14 | 763,084.93 | 2,950,000.00 |

The fund to date is the same table: nothing was distributed before X.

From $15,605,698.63 on, the GP has both accounts' catch-ups in full: 38,001,600/73 + 16,564,800/73 = 54,566,400/73 = $747,484.93.

## Each LP (F20, F23)

Each LP is its account, so its amounts are its account's LPs' amounts.

| X | Tags | Anchor Pension | Bluebell Trust |
|---:|---|---:|---:|
| 0.00 | listed | 0.00 | 0.00 |
| 10,200,000.00 | listed, breakpoint | 5,100,000.00 | 5,100,000.00 |
| 10,400,000.00 | listed, breakpoint | 5,200,000.00 | 5,200,000.00 |
| 14,284,471.23 | breakpoint | 7,142,235.62 | 7,142,235.62 |
| 14,500,000.00 | listed | 7,142,235.62 | 7,250,000.00 |
| 14,564,558.90 | breakpoint | 7,142,235.62 | 7,282,279.45 |
| 14,738,301.37 | breakpoint | 7,142,235.62 | 7,282,279.45 |
| 15,605,698.63 | breakpoint | 7,532,564.38 | 7,282,279.45 |
| 16,000,000.00 | listed | 7,710,000.00 | 7,440,000.00 |
| 30,000,000.00 | listed | 14,010,000.00 | 13,040,000.00 |

To date is the same, as nothing came before X.

- **From $14,284,471.23 to $14,738,301.37,** Anchor's GP takes its catch-up, so Anchor Pension holds at $7,142,235.62 while Bluebell is still getting its pref, up to $14,564,558.90.
- **From $14,564,558.90 to $15,605,698.63,** the fund terms' GP takes its catch-up, so Bluebell holds at $7,282,279.45. From $14,738,301.37 Anchor Pension gets 90 cents of each of its account's dollars and passes Bluebell.
- **From $15,605,698.63,** Anchor Pension gets 90 cents and Bluebell 80, so Anchor Pension stays ahead: $14,010,000 against $13,040,000 at $30,000,000.

Not final and no NAV, so no point has a clawback.
