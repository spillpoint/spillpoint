# Edge case 6c: derivation

Each holder compares two outcomes:
- **Group stays preferred:** Seed-1 gets $1M and Seed-2 gets $3M once the tier is covered (from a $4M exit up). Common gets the rest.
- **Group converts:** all 10,000,000 shares share the exit equally, so each series gets exit ÷ 10.

So **Investor X** (Seed-1) does better converting once exit ÷ 10 > $1M, which is above **$10M**. **Investor Y** (Seed-2) does better converting once exit ÷ 10 > $3M, which is above **$30M**. Below $4M, staying pays both more, since the tier is split 1:3 by preference.

With an **at least 50%** vote, Investor X's 50% is enough on its own. The group converts as soon as X does better converting, which is **above $10M**. At exactly $10M, X is indifferent and votes to stay, so the group stays. Investor Y votes no throughout this range but is outvoted.

## Breakpoints

| Exit value | Why |
|---:|---|
| $4,000,000 | The tier ($1M + $3M) is fully paid. Below this, every dollar is split 1:3 by preference amount. |
| $10,000,000 | The group converts. **Payouts jump here instead of bending.** At $10M the group stays: Seed-1 $1M, Seed-2 $3M, common $6M. Just above, it has converted: Seed-1 and Seed-2 about $1M each and common about $8M. So Seed-2 drops by $2M and common rises by $2M; Seed-1 is continuous. The breakpoint sits exactly where Investor X, the pivotal voter, becomes indifferent (`ASSUMPTIONS.md` E13). |

## Payouts

| Exit | Founder A | Founder B | Investor X | Investor Y | Group |
|---:|---:|---:|---:|---:|---|
| $2M | 0 | 0 | 500,000 | 1,500,000 | keeps preference |
| $4M | 0 | 0 | 1,000,000 | 3,000,000 | keeps preference |
| $8M | 3,000,000 | 1,000,000 | 1,000,000 | 3,000,000 | keeps preference |
| $10M | 4,500,000 | 1,500,000 | 1,000,000 | 3,000,000 | keeps preference |
| $12M | 7,200,000 | 2,400,000 | 1,200,000 | 1,200,000 | converts |
| $16M | 9,600,000 | 3,200,000 | 1,600,000 | 1,600,000 | converts |
| $20M | 12,000,000 | 4,000,000 | 2,000,000 | 2,000,000 | converts |
| $25M | 15,000,000 | 5,000,000 | 2,500,000 | 2,500,000 | converts |
| $30M | 18,000,000 | 6,000,000 | 3,000,000 | 3,000,000 | converts |
| $40M | 24,000,000 | 8,000,000 | 4,000,000 | 4,000,000 | converts |

`expected.json` also lists the $10M breakpoint itself, with the group still preferred.

## Compared with 6a and 6b

- **$10M to $30M:** Seed-2 is pulled into converting before it would choose to. At $25M it gets $2.5M instead of its $3M preference (6a and 6b). The founders get $20M, against $19,555,555.56 in 6a and $21M in 6b.
- **Above $30M:** all three cases agree, since both series would convert anyway.
- **The threshold wording decides who controls the class.** "More than 50%" (6b) gives the series with the higher preference a veto. "At least 50%" (6c) lets the series with the lower bar force conversion.
