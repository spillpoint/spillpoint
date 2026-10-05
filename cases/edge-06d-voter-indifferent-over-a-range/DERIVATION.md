# Edge case 06d: derivation

A conversion group whose pivotal voter is **indifferent over a range** of exit values, and then prefers converting (`ASSUMPTIONS.md` E13).

## The cap table

| Holder | Security | Shares | Price | Preference |
|---|---|---:|---:|---:|
| Founder A | Common | 4,000,000 | | |
| Investor P | Series B Preferred | 1,000,000 | $7.50 | $7,500,000 |
| Investor Q | Series A Preferred | 1,000,000 | $5.00 | $5,000,000 |
| Investor R | Seed Preferred | 1,000,000 | $0.50 | $500,000 |

- **Every series** is 1x non-participating, converting one for one.
- **Series B and Series A** share the senior tier, pari passu. Seed is junior.
- **Series A and Seed must convert together** if at least 50% of their as-converted shares vote for it. Q and R each hold half. Series B is outside the group and decides for itself.

## The two outcomes

**If the group stays preferred:**
- The senior tier takes the first $12,500,000, split 3:2 between Series B and Series A.
- Seed takes the next $500,000.
- Common takes the rest.

**If the group converts:**
- Series B takes its $7,500,000.
- The rest is shared as common by 6,000,000 shares: Founder A's 4,000,000, and Series A's and Seed's 1,000,000 each.

Series B converts on its own only above $52,500,000, outside this case's $0–$40M range.

## The vote

**Investor R (Seed) decides it.** Its 50% carries an "at least 50%" vote.

**Up to $7,500,000, R gets nothing either way:**
- If the group stays, Seed is behind a $12.5M tier.
- If it converts, Series B takes everything first.

So R is indifferent, and an indifferent holder votes to stay (E11). Investor Q does better staying. **The group stays.**

**Above $7,500,000, converting pays R:**
- Converting gives R (exit − $7.5M) ÷ 6.
- Staying gives it nothing until $12.5M, and then at most $500,000.

So R votes to convert, and its 50% carries the vote; Q's vote can't stop it. **The group converts.** R's two outcomes never tie again in the range: by the time staying pays it anything, at $12.5M, converting already pays $833,333.

## Breakpoints

| Exit value | Why |
|---:|---|
| $7,500,000 | The group converts. **Payouts jump here instead of bending.** Investor R has been indifferent all the way up to here, and here it stops: above $7.5M, converting pays it. So the jump sits exactly where R stops being indifferent. That's the E13 rule sharpened in the M2c review, where before it only looked for a crossing. At exactly $7.5M the group still stays. Just above, Series B jumps from $4.5M to its full $7.5M, and Series A drops from $3M to almost nothing. |

There are no other breakpoints in range:
- **Below $7.5M** the senior tier is paid pro rata.
- **Above it** Series B is paid in full, and everyone else shares as common.

## Payouts

| Exit | Founder A | Investor P (Series B) | Investor Q (Series A) | Investor R (Seed) | Group |
|---:|---:|---:|---:|---:|---|
| $2M | 0 | 1,200,000.00 | 800,000.00 | 0 | stays |
| $5M | 0 | 3,000,000.00 | 2,000,000.00 | 0 | stays |
| $7.5M | 0 | 4,500,000.00 | 3,000,000.00 | 0 | stays |
| $10M | 1,666,666.67 | 7,500,000.00 | 416,666.67 | 416,666.67 | converts |
| $12.5M | 3,333,333.33 | 7,500,000.00 | 833,333.33 | 833,333.33 | converts |
| $13M | 3,666,666.67 | 7,500,000.00 | 916,666.67 | 916,666.67 | converts |
| $15M | 5,000,000.00 | 7,500,000.00 | 1,250,000.00 | 1,250,000.00 | converts |
| $20M | 8,333,333.33 | 7,500,000.00 | 2,083,333.33 | 2,083,333.33 | converts |
| $30M | 15,000,000.00 | 7,500,000.00 | 3,750,000.00 | 3,750,000.00 | converts |
| $40M | 21,666,666.67 | 7,500,000.00 | 5,416,666.67 | 5,416,666.67 | converts |

## Why Seed's preference is $500,000

With a preference of $1M or more, R's two outcomes would tie again at $13.5M. At $13.5M exactly, converting pays ($13.5M − $7.5M) ÷ 6 = $1M, and staying pays its $1M. At that one point the indifferent R would vote to stay, and the group would flip back for a single dollar. At $500,000, staying never catches up, so the case has one breakpoint and nothing else.
