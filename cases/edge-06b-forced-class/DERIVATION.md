# Edge case 6b: derivation

Each holder compares two outcomes:
- **Group stays preferred:** Seed-1 gets $1M and Seed-2 gets $3M once the tier is covered (from a $4M exit up). Common gets the rest.
- **Group converts:** all 10,000,000 shares share the exit equally, so each series gets exit ÷ 10.

So **Investor X** (Seed-1) does better converting once exit ÷ 10 > $1M, which is above **$10M**. **Investor Y** (Seed-2) does better converting once exit ÷ 10 > $3M, which is above **$30M**. Below $4M, staying pays both more, since the tier is split 1:3 by preference.

Each series holds exactly 1,000,000 of the group's 2,000,000 shares, which is 50%. A vote of **more than 50%** therefore needs both holders, and both do better converting only **above $30M**, where Seed-2's bar binds. At exactly $30M, Investor Y is indifferent and votes to stay, so the group stays.

## Breakpoints

| Exit value | Why |
|---:|---|
| $4,000,000 | The tier ($1M + $3M) is fully paid. Below this, every dollar is split 1:3 by preference amount. |
| $30,000,000 | The group converts. **Payouts jump here instead of bending.** At $30M the group stays: Seed-1 $1M, Seed-2 $3M, common $26M. Just above, it has converted: Seed-1 and Seed-2 about $3M each and common about $24M. So Seed-1 jumps up by $2M and common drops by $2M; Seed-2 is continuous. The breakpoint sits exactly where Investor Y, the pivotal voter, becomes indifferent (`ASSUMPTIONS.md` E13). |

## Payouts

| Exit | Founder A | Founder B | Investor X | Investor Y | Group |
|---:|---:|---:|---:|---:|---|
| $2M | 0 | 0 | 500,000 | 1,500,000 | keeps preference |
| $4M | 0 | 0 | 1,000,000 | 3,000,000 | keeps preference |
| $8M | 3,000,000 | 1,000,000 | 1,000,000 | 3,000,000 | keeps preference |
| $12M | 6,000,000 | 2,000,000 | 1,000,000 | 3,000,000 | keeps preference |
| $16M | 9,000,000 | 3,000,000 | 1,000,000 | 3,000,000 | keeps preference |
| $20M | 12,000,000 | 4,000,000 | 1,000,000 | 3,000,000 | keeps preference |
| $25M | 15,750,000 | 5,250,000 | 1,000,000 | 3,000,000 | keeps preference |
| $30M | 19,500,000 | 6,500,000 | 1,000,000 | 3,000,000 | keeps preference |
| $40M | 24,000,000 | 8,000,000 | 4,000,000 | 4,000,000 | converts |

## Compared with 6a (each series decides alone)

- **$12M to $30M:** Seed-1 would convert on its own (6a), but it can't carry the vote, so it is held to its $1M preference. That leaves more for common: at $20M the founders get $16M here, against $15,111,111.11 in 6a.
- **Above $30M:** both cases agree, since both series would convert anyway.
- **At $30M itself:** common gets $26M here, against $24M in 6a. The jump just above $30M takes that $2M back.
