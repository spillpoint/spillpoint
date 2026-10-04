# Edge case 11: an earnout

This isolates proceeds paid as a schedule: a closing payment plus one later earnout payment. Following `SPEC.md`, the waterfall runs on **cumulative** proceeds, so the later payment goes where it would have gone if it had been paid at closing. The company is the same as edge case 2.

| Holder | Security | Shares |
|---|---|---:|
| Founder A | Common | 6,000,000 |
| Founder B | Common | 2,000,000 |
| Investor X | Seed Preferred | 1,500,000 |
| Investor Y | Seed Preferred | 500,000 |

Seed Preferred: original issue price $1.50, 1x non-participating ($3,000,000 preference), conversion 1:1, so 20% as converted.

**Payment schedules:**

| Schedule | Closing | Earnout | Total |
|---|---:|---:|---:|
| A | $2,000,000 | $3,000,000 | $5,000,000 |
| B | $10,000,000 | $10,000,000 | $20,000,000 |

`expected.json` gives each holder's take from each payment under `exit.payment_schedules`. It also gives the usual payouts and breakpoints on cumulative proceeds: range $0 to $30M, with payouts at $2M, $5M, $10M and $20M.
