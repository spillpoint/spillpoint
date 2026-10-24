# Fund case 22, a friends-and-family class: derivation

Three LPs, one of them in a class that pays no management fee and no carry (F22). The fund's carry is 20%, then 25% once LPs reach 3x; its standard fee rate is 2%. No pref, no GP commitment.

- **Calls:** $9,000,000 of investment and a $160,000 fee call on 2022-01-01, and another $160,000 fee call on 2023-01-01.
- **An earlier distribution:** $4,500,000 on 2024-06-30.
- **D** is `as_of`, 2026-06-30. X isn't final, and the NAV is $40,000,000.
- **The LPs:** Alder Endowment ($6,000,000) and Birchwood Family Office ($2,000,000) on the fund's terms; Cedar Holdings ($1,000,000) in "Friends and family", fee rate 0 and carry 0.

## The accounts (F23)

The LPs on the fund's terms form one account, and the class another. Distributions divide by commitment, and so do investment calls; fee calls divide by commitment times the class's fee rate over the fund's (F22). Cedar's weight is $1,000,000 × 0 / 2% = 0, so the fee calls fall on the fund terms' account alone.

| Account | LPs | Commitment | Share of distributions and investment calls | Fee weight | Share of fee calls |
|---|---|---:|---:|---:|---:|
| Fund terms | Alder, Birchwood | 8,000,000 | 8/9 | 8,000,000 | 1 |
| Friends and family | Cedar | 1,000,000 | 1/9 | 0 | 0 |

## Paid in

| Account | Investment | Fees | Paid in |
|---|---:|---:|---:|
| Fund terms | 8,000,000.00 | 320,000.00 | 8,320,000.00 |
| Friends and family | 1,000,000.00 | 0.00 | 1,000,000.00 |
| **The fund** | 9,000,000.00 | 320,000.00 | 9,320,000.00 |

Within an account its LPs share by commitment (F23): Alder has 6/8 of the fund terms' account and Birchwood 2/8; Cedar has all of its own.

| LP | Class | Commitment | Share of its account | Paid in |
|---|---|---:|---:|---:|
| Alder Endowment | | 6,000,000 | 0.75 | 6,240,000.00 |
| Birchwood Family Office | | 2,000,000 | 0.25 | 2,080,000.00 |
| Cedar Holdings | Friends and family | 1,000,000 | 1 | 1,000,000.00 |

## The earlier $4,500,000

It divides by commitment: $4,000,000 to the fund terms' account and $500,000 to the class's. Each is all capital (F5), since neither account has its capital back:
- **Fund terms:** $4,000,000 of $8,320,000 back, $4,320,000 still to come.
- **Friends and family:** $500,000 of $1,000,000 back, $500,000 still to come.

## Each account's tiers, as X grows

X divides the same way: 8/9 to the fund terms' account and 1/9 to the class's. Each account runs its own tiers on its part (F23).

**Fund terms** (20%, then 25% from 3x on its own multiple):
1. **Capital:** the $4,320,000 left. Its part reaches it at X = $4,320,000 × 9/8 = **$4,860,000**.
2. **80/20 until its LPs reach 3x:** 3 × $8,320,000 = $24,960,000 to its LPs to date. At capital back they have $8,320,000, so they need $16,640,000 more. At 80% that takes $20,800,000 of the account's part, which is $20,800,000 × 9/8 = $23,400,000 more of X. So at X = $4,860,000 + $23,400,000 = **$28,260,000**.
3. **75/25 from there.**

**Friends and family** (carry 0):
1. **Capital:** the $500,000 left, at X = $500,000 × 9 = **$4,500,000**.
2. **Then the carry tier at 0%:** its LPs keep every dollar.

## Breakpoints (F27)

Two accounts, so each reason names its account. They fall at different X, so each breakpoint has one reason.

| X | Exact | Reasons |
|---:|---|---|
| 4,500,000.00 | 4500000 | `capital_returned`: "Friends and family: LPs have their $1,000,000 of paid-in capital back" |
| 4,860,000.00 | 4860000 | `capital_returned`: "Fund terms: LPs have their $8,320,000 of paid-in capital back" |
| 28,260,000.00 | 28260000 | `carry_step`: "Fund terms: LPs reach 3.0x: carry is 25% from here" |

The class's capital tier ends at $4,500,000 though the split doesn't change there: F15 counts a tier's end whether or not it does. The class's carry tier, at 0%, never ends.

## This distribution, by account

**Fund terms**

| X | Tags | Its part | Capital | LPs, carry tier | GP carry | LPs | GP |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 4,500,000.00 | listed, breakpoint | 4,000,000.00 | 4,000,000.00 | 0.00 | 0.00 | 4,000,000.00 | 0.00 |
| 4,860,000.00 | listed, breakpoint | 4,320,000.00 | 4,320,000.00 | 0.00 | 0.00 | 4,320,000.00 | 0.00 |
| 18,000,000.00 | listed | 16,000,000.00 | 4,320,000.00 | 9,344,000.00 | 2,336,000.00 | 13,664,000.00 | 2,336,000.00 |
| 28,260,000.00 | listed, breakpoint | 25,120,000.00 | 4,320,000.00 | 16,640,000.00 | 4,160,000.00 | 20,960,000.00 | 4,160,000.00 |
| 40,000,000.00 | listed, nav | 35,555,555.56 | 4,320,000.00 | 24,466,666.67 | 6,768,888.89 | 28,786,666.67 | 6,768,888.89 |

- **At $18,000,000:** its part is $16,000,000. After $4,320,000 of capital, $11,680,000 runs at 80/20: $2,336,000 to the GP, $9,344,000 to the LPs.
- **At $40,000,000:** its part is $320,000,000/9 = $35,555,555.56. After capital and the $20,800,000 at 80/20 (GP $4,160,000), $93,920,000/9 = $10,435,555.56 runs at 75/25: GP $23,480,000/9 = $2,608,888.89.

**Friends and family**

| X | Tags | Its part | Capital | LPs, carry tier | GP carry | LPs | GP |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 4,500,000.00 | listed, breakpoint | 500,000.00 | 500,000.00 | 0.00 | 0.00 | 500,000.00 | 0.00 |
| 4,860,000.00 | listed, breakpoint | 540,000.00 | 500,000.00 | 40,000.00 | 0.00 | 540,000.00 | 0.00 |
| 18,000,000.00 | listed | 2,000,000.00 | 500,000.00 | 1,500,000.00 | 0.00 | 2,000,000.00 | 0.00 |
| 28,260,000.00 | listed, breakpoint | 3,140,000.00 | 500,000.00 | 2,640,000.00 | 0.00 | 3,140,000.00 | 0.00 |
| 40,000,000.00 | listed, nav | 4,444,444.44 | 500,000.00 | 3,944,444.44 | 0.00 | 4,444,444.44 | 0.00 |

## The fund, the accounts' sums (F23, F26)

The GP's carry lists each account's steps, the fund's terms first (F26).

**This distribution**

| X | Tags | LPs, capital | LPs, carry tier | LPs | GP carry, Fund terms 20% | GP carry, Fund terms 25% from 3x | GP carry, Friends and family 0% | GP |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 4,500,000.00 | listed, breakpoint | 4,500,000.00 | 0.00 | 4,500,000.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 4,860,000.00 | listed, breakpoint | 4,820,000.00 | 40,000.00 | 4,860,000.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 18,000,000.00 | listed | 4,820,000.00 | 10,844,000.00 | 15,664,000.00 | 2,336,000.00 | 0.00 | 0.00 | 2,336,000.00 |
| 28,260,000.00 | listed, breakpoint | 4,820,000.00 | 19,280,000.00 | 24,100,000.00 | 4,160,000.00 | 0.00 | 0.00 | 4,160,000.00 |
| 40,000,000.00 | listed, nav | 4,820,000.00 | 28,411,111.11 | 33,231,111.11 | 4,160,000.00 | 2,608,888.89 | 0.00 | 6,768,888.89 |

**The fund to date,** X included

| X | Tags | LPs, capital | LPs, carry tier | LPs | GP carry, Fund terms 20% | GP carry, Fund terms 25% from 3x | GP carry, Friends and family 0% | GP |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 4,500,000.00 | 0.00 | 4,500,000.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 4,500,000.00 | listed, breakpoint | 9,000,000.00 | 0.00 | 9,000,000.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 4,860,000.00 | listed, breakpoint | 9,320,000.00 | 40,000.00 | 9,360,000.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 18,000,000.00 | listed | 9,320,000.00 | 10,844,000.00 | 20,164,000.00 | 2,336,000.00 | 0.00 | 0.00 | 2,336,000.00 |
| 28,260,000.00 | listed, breakpoint | 9,320,000.00 | 19,280,000.00 | 28,600,000.00 | 4,160,000.00 | 0.00 | 0.00 | 4,160,000.00 |
| 40,000,000.00 | listed, nav | 9,320,000.00 | 28,411,111.11 | 37,731,111.11 | 4,160,000.00 | 2,608,888.89 | 0.00 | 6,768,888.89 |

At $28,260,000 the fund terms' LPs have $4,000,000 + $20,960,000 = $24,960,000 to date, 3.0x their $8,320,000. The fund's LPs as a whole are at $28,600,000 on $9,320,000, about 3.07x, but each account's step is on its own multiple (F23).

## Each LP (F20, F23)

Alder has 0.75 of the fund terms' LPs' amounts, Birchwood 0.25; Cedar has all of the class's.

**This distribution**

| X | Tags | Alder Endowment | Birchwood Family Office | Cedar Holdings |
|---:|---|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 |
| 4,500,000.00 | listed, breakpoint | 3,000,000.00 | 1,000,000.00 | 500,000.00 |
| 4,860,000.00 | listed, breakpoint | 3,240,000.00 | 1,080,000.00 | 540,000.00 |
| 18,000,000.00 | listed | 10,248,000.00 | 3,416,000.00 | 2,000,000.00 |
| 28,260,000.00 | listed, breakpoint | 15,720,000.00 | 5,240,000.00 | 3,140,000.00 |
| 40,000,000.00 | listed, nav | 21,590,000.00 | 7,196,666.67 | 4,444,444.44 |

**To date**

| X | Tags | Alder Endowment | Birchwood Family Office | Cedar Holdings |
|---:|---|---:|---:|---:|
| 0.00 | listed | 3,000,000.00 | 1,000,000.00 | 500,000.00 |
| 4,500,000.00 | listed, breakpoint | 6,000,000.00 | 2,000,000.00 | 1,000,000.00 |
| 4,860,000.00 | listed, breakpoint | 6,240,000.00 | 2,080,000.00 | 1,040,000.00 |
| 18,000,000.00 | listed | 13,248,000.00 | 4,416,000.00 | 2,500,000.00 |
| 28,260,000.00 | listed, breakpoint | 18,720,000.00 | 6,240,000.00 | 3,640,000.00 |
| 40,000,000.00 | listed, nav | 24,590,000.00 | 8,196,666.67 | 4,944,444.44 |

At $40,000,000 two amounts don't end in whole cents. Birchwood's quarter of $28,786,666.666… is exactly 21,590,000/3, and Cedar's is 40,000,000/9.

## The NAV point (F12, F24)

X = $40,000,000 is the NAV point, final by definition, so each account settles its clawback on its own.
- **Fund terms:** the run on its totals has its $8,320,000 paid-in as capital and $4,000,000 + $35,555,555.56 = $39,555,555.56 through the tiers. Nothing was called after its capital came back, so that run pays what the distributions did: $4,160,000 at 20% and $2,608,888.89 at 25%. Carry paid equals the entitlement, $6,768,888.89, and nothing is owed.
- **Friends and family:** carry 0, so nothing paid, nothing entitled, nothing owed.

| X | Tags | Fund terms: carry paid | Fund terms: entitled | Fund terms: owed | Friends and family: carry paid | Friends and family: entitled | Friends and family: owed | The fund owes |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 40,000,000.00 | listed, nav | 6,768,888.89 | 6,768,888.89 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |

Each LP's share of the clawback is zero. X isn't final, so no other point has a clawback, and the clawback's breakpoints aren't listed (FA10).
