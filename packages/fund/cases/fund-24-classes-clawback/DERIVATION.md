# Fund case 24, a clawback owed to one class only: derivation

Example C (F12, case 10) with three LPs, one of them in a friends-and-family class that pays no carry (F22). Carry is 20%, no pref, no GP commitment, no fee calls.

- **Cash flows:** a $10,000,000 investment call on 2020-03-01, a $15,000,000 distribution on 2022-03-01, and a $2,000,000 follow-on call on 2023-03-01.
- **D** is `as_of`, 2025-03-01, and X is final.
- **The LPs:** Alder Endowment ($5,000,000) and Birchwood Family Office ($3,000,000) on the fund's terms; Cedar Holdings ($2,000,000) in "Friends and family", carry 0. The class gives no fee rate of its own, so it pays the fund's fees, and the fund needs no `fee_rate` (F22).

## The accounts (F23)

No class has a fee rate of its own, so every call divides by commitment, fee calls too: 80% and 20%.

| Account | LPs | Commitment | Share of every call and distribution | Paid in |
|---|---|---:|---:|---:|
| Fund terms | Alder, Birchwood | 8,000,000 | 0.8 | 8,000,000 + 1,600,000 = 9,600,000.00 |
| Friends and family | Cedar | 2,000,000 | 0.2 | 2,000,000 + 400,000 = 2,400,000.00 |
| **The fund** | | 10,000,000 | 1 | 12,000,000.00 |

Each LP's share is F19's, its commitment over all three LPs' $10,000,000. Within an account its LPs share the account's amounts by commitment (F23): Alder has 5/8 of the fund terms' account and Birchwood 3/8, and Cedar has all of its own.

| LP | Class | Commitment | Share | Of its account | Paid in |
|---|---|---:|---:|---:|---:|
| Alder Endowment | | 5,000,000 | 0.5 | 0.625 | 6,000,000.00 |
| Birchwood Family Office | | 3,000,000 | 0.3 | 0.375 | 3,600,000.00 |
| Cedar Holdings | Friends and family | 2,000,000 | 0.2 | 1 | 2,400,000.00 |

## The earlier $15,000,000

It divides 80/20 between the accounts, and each runs its own tiers on what was paid in by then:
- **Fund terms, $12,000,000:** $8,000,000 of capital, then $4,000,000 at 80/20. The GP is paid $800,000 of carry, and the LPs $3,200,000.
- **Friends and family, $3,000,000:** $2,000,000 of capital, then $1,000,000 at 0%, all to its LPs.

Then the $2,000,000 call: $1,600,000 from the fund terms' account and $400,000 from the class's, neither returned yet.

## Each account's tiers, as X grows

X divides 80/20.
- **Fund terms:** capital of $1,600,000 at X = $1,600,000 / 0.8 = **$2,000,000**, then 80/20.
- **Friends and family:** capital of $400,000 at X = $400,000 / 0.2 = **$2,000,000**, then all to its LPs.

## The clawback by account (F24)

X is final, so each account settles on its own.

**Fund terms.** The run on its totals has its $9,600,000 paid-in as capital and $12,000,000 + 0.8X through the tiers.
- **Its entitlement** is 20% of the profit beyond capital: 20% × ($2,400,000 + 0.8X) = $480,000 + 0.16X.
- **Its carry paid** is $800,000 until its part of X has returned the late call, at X = $2,000,000. After that it grows by 20% of 0.8X − $1,600,000.
- **Owed,** below X = $2,000,000: $800,000 − $480,000 − 0.16X = $320,000 − 0.16X. That's $320,000 at X = 0, $160,000 at $1,000,000, and $0 at $2,000,000.
- **From $2,000,000 on,** carry paid is $800,000 + 0.16X − $320,000 = $480,000 + 0.16X, the entitlement, so nothing is owed.

It's example C's clawback at 80%: case 10's fund owes $400,000 at X = 0, and 80% of that is $320,000.

**Friends and family.** Carry 0: nothing paid, nothing entitled, nothing owed.

**The fund** owes the accounts' sum (F24), which here is the fund terms' alone.

| X | Tags | Fund terms: carry paid | Fund terms: entitled | Fund terms: owed | Friends and family: carry paid | Friends and family: entitled | Friends and family: owed | The fund owes |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 800,000.00 | 480,000.00 | 320,000.00 | 0.00 | 0.00 | 0.00 | 320,000.00 |
| 1,000,000.00 | listed | 800,000.00 | 640,000.00 | 160,000.00 | 0.00 | 0.00 | 0.00 | 160,000.00 |
| 2,000,000.00 | listed, breakpoint | 800,000.00 | 800,000.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 5,000,000.00 | listed | 1,280,000.00 | 1,280,000.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |

## Breakpoints (F27)

Everything bends at one X, $2,000,000: both accounts' capital comes back, and the fund terms' clawback clears. One breakpoint, the fund terms' reasons first, each account's own tier before its clawback (FC5).

| X | Exact | Reasons |
|---:|---|---|
| 2,000,000.00 | 2000000 | `capital_returned`: "Fund terms: LPs have their $9,600,000 of paid-in capital back"; `clawback_cleared`: "Fund terms: from here the GP has earned all the carry it was paid earlier"; `capital_returned`: "Friends and family: LPs have their $2,400,000 of paid-in capital back" |

The fund terms' run on its totals is in its carry tier from X = 0, since $12,000,000 is already more than its $9,600,000 of capital, so that run adds no breakpoint.

## This distribution, by account

**Fund terms**

| X | Tags | Its part | Capital | LPs, carry tier | GP carry | LPs | GP |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 1,000,000.00 | listed | 800,000.00 | 800,000.00 | 0.00 | 0.00 | 800,000.00 | 0.00 |
| 2,000,000.00 | listed, breakpoint | 1,600,000.00 | 1,600,000.00 | 0.00 | 0.00 | 1,600,000.00 | 0.00 |
| 5,000,000.00 | listed | 4,000,000.00 | 1,600,000.00 | 1,920,000.00 | 480,000.00 | 3,520,000.00 | 480,000.00 |

**Friends and family**

| X | Tags | Its part | Capital | LPs, carry tier | GP carry | LPs | GP |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 1,000,000.00 | listed | 200,000.00 | 200,000.00 | 0.00 | 0.00 | 200,000.00 | 0.00 |
| 2,000,000.00 | listed, breakpoint | 400,000.00 | 400,000.00 | 0.00 | 0.00 | 400,000.00 | 0.00 |
| 5,000,000.00 | listed | 1,000,000.00 | 400,000.00 | 600,000.00 | 0.00 | 1,000,000.00 | 0.00 |

## The fund, the accounts' sums (F23, F26)

**This distribution**

| X | Tags | LPs, capital | LPs, carry tier | LPs | GP carry, Fund terms 20% | GP carry, Friends and family 0% | GP |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 1,000,000.00 | listed | 1,000,000.00 | 0.00 | 1,000,000.00 | 0.00 | 0.00 | 0.00 |
| 2,000,000.00 | listed, breakpoint | 2,000,000.00 | 0.00 | 2,000,000.00 | 0.00 | 0.00 | 0.00 |
| 5,000,000.00 | listed | 2,000,000.00 | 2,520,000.00 | 4,520,000.00 | 480,000.00 | 0.00 | 480,000.00 |

**The fund to date,** X included. The earlier $15,000,000 gave the LPs $10,000,000 of capital and $4,200,000 from the carry tier ($3,200,000 and $1,000,000), and the GP $800,000.

| X | Tags | LPs, capital | LPs, carry tier | LPs | GP carry, Fund terms 20% | GP carry, Friends and family 0% | GP |
|---:|---|---:|---:|---:|---:|---:|---:|
| 0.00 | listed | 10,000,000.00 | 4,200,000.00 | 14,200,000.00 | 800,000.00 | 0.00 | 800,000.00 |
| 1,000,000.00 | listed | 11,000,000.00 | 4,200,000.00 | 15,200,000.00 | 800,000.00 | 0.00 | 800,000.00 |
| 2,000,000.00 | listed, breakpoint | 12,000,000.00 | 4,200,000.00 | 16,200,000.00 | 800,000.00 | 0.00 | 800,000.00 |
| 5,000,000.00 | listed | 12,000,000.00 | 6,720,000.00 | 18,720,000.00 | 1,280,000.00 | 0.00 | 1,280,000.00 |

The fund's clawback is the fund terms', as above: carry paid and entitlement the accounts' sums, owed their sum.

## Each LP (F20, F24)

Alder has 0.625 of the fund terms' LPs' amounts and Birchwood 0.375; Cedar has all of the class's.

**This distribution**

| X | Tags | Alder Endowment | Birchwood Family Office | Cedar Holdings |
|---:|---|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 0.00 |
| 1,000,000.00 | listed | 500,000.00 | 300,000.00 | 200,000.00 |
| 2,000,000.00 | listed, breakpoint | 1,000,000.00 | 600,000.00 | 400,000.00 |
| 5,000,000.00 | listed | 2,200,000.00 | 1,320,000.00 | 1,000,000.00 |

**To date**

| X | Tags | Alder Endowment | Birchwood Family Office | Cedar Holdings |
|---:|---|---:|---:|---:|
| 0.00 | listed | 7,000,000.00 | 4,200,000.00 | 3,000,000.00 |
| 1,000,000.00 | listed | 7,500,000.00 | 4,500,000.00 | 3,200,000.00 |
| 2,000,000.00 | listed, breakpoint | 8,000,000.00 | 4,800,000.00 | 3,400,000.00 |
| 5,000,000.00 | listed | 9,200,000.00 | 5,520,000.00 | 4,000,000.00 |

**The clawback, each LP's share of what its account is owed**

The GP owes back only to the LPs on the fund's terms, each its share (F24). Cedar's class paid no carry, so it's owed nothing.

| X | Tags | Alder Endowment | Birchwood Family Office | Cedar Holdings |
|---:|---|---:|---:|---:|
| 0.00 | listed | 200,000.00 | 120,000.00 | 0.00 |
| 1,000,000.00 | listed | 100,000.00 | 60,000.00 | 0.00 |
| 2,000,000.00 | listed, breakpoint | 0.00 | 0.00 | 0.00 |
| 5,000,000.00 | listed | 0.00 | 0.00 | 0.00 |

At X = 0: 0.625 × $320,000 = $200,000 to Alder and 0.375 × $320,000 = $120,000 to Birchwood. Every amount in this case ends in whole cents.
