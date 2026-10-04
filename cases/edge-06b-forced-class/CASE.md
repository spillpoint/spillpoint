# Edge case 6b: two series in one tier, forced class conversion (more than 50%)

This is the same company as edge case 6a. One term changes: Seed-1 and Seed-2 **must convert together**, as when a class vote forces conversion (the `SPEC.md` toggle). In `inputs.json` this is `"conversion_groups": [["seed_1", "seed_2"]]`. A bare list means the default vote: **more than 50%** of the group's as-converted shares.

| Holder | Security | Shares |
|---|---|---:|
| Founder A | Common | 6,000,000 |
| Founder B | Common | 2,000,000 |
| Investor X | Seed-1 Preferred | 1,000,000 |
| Investor Y | Seed-2 Preferred | 1,000,000 |

Series terms:
- **Seed-1 Preferred:** original issue price $1.00, 1x non-participating, so a $1,000,000 preference.
- **Seed-2 Preferred:** original issue price $3.00, 1x non-participating, so a $3,000,000 preference.
- Both convert 1:1 and sit in one tier, pari passu.

There is no pool and there are no options. The exit range is $0 to $40M.

**How the group decides (`ASSUMPTIONS.md` E11).** No charter converts a group because that maximizes the group's total. The mechanism is a class vote:
- Each holder votes for conversion only if it does **strictly** better converting than if the group stays preferred.
- A holder who is indifferent votes to stay.
- The group converts only if the holders voting yes hold the threshold share of the group's as-converted shares.

Edge case 6c is identical except that the vote needs **at least** 50%.

Payouts are given at $2M, $4M, $8M, $12M, $16M, $20M, $25M, $30M and $40M, the same exit values as 6a and 6c.
