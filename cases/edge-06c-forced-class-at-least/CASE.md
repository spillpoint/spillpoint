# Edge case 6c: two series in one tier, forced class conversion (at least 50%)

This is identical to edge case 6b except for one term: the class vote needs **at least 50%** of the group's as-converted shares, not more than 50%. Each series holds exactly 50%, so **Seed-1 can carry the vote alone**. In `inputs.json`:

```json
"conversion_groups": [{ "series": ["seed_1", "seed_2"], "vote_threshold_percent": "50", "vote_rule": "at_least" }]
```

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

Payouts are given at $2M, $4M, $8M, $12M, $16M, $20M, $25M, $30M and $40M, the same exit values as 6a and 6b.
