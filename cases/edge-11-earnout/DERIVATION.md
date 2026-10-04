# Edge case 11: derivation

**The rule (`SPEC.md`; `ASSUMPTIONS.md` X8).** After each payment, run the waterfall on everything paid so far. A holder's take from a payment is its cumulative payout after the payment minus its cumulative payout before it. Conversion decisions are made fresh at each cumulative amount, as if the whole amount had been paid at closing.

## Breakpoints (on cumulative proceeds)

These are the same as edge case 2, because the waterfall is the same and only the timing of the cash differs.

| Cumulative proceeds | Why |
|---:|---|
| $3,000,000 | Seed's preference is fully paid. |
| $15,000,000 | Seed converts: 20% × $15M = $3M. |

| Exit | Founder A | Founder B | Investor X | Investor Y | Seed decision |
|---:|---:|---:|---:|---:|---|
| $2M | 0 | 0 | 1,500,000 | 500,000 | keeps preference |
| $3M | 0 | 0 | 2,250,000 | 750,000 | keeps preference |
| $5M | 1,500,000 | 500,000 | 2,250,000 | 750,000 | keeps preference |
| $10M | 5,250,000 | 1,750,000 | 2,250,000 | 750,000 | keeps preference |
| $15M | 9,000,000 | 3,000,000 | 2,250,000 | 750,000 | keeps preference |
| $20M | 12,000,000 | 4,000,000 | 3,000,000 | 1,000,000 | converts |

## Schedule A: the earnout finishes the preference, then reaches common

| Payment | Amount | Cumulative | Founder A | Founder B | Investor X | Investor Y | Seed decision at cumulative |
|---|---:|---:|---:|---:|---:|---:|---|
| closing | 2,000,000 | 2,000,000 | 0 | 0 | 1,500,000 | 500,000 | keeps preference |
| earnout | 3,000,000 | 5,000,000 | 1,500,000 | 500,000 | 750,000 | 250,000 | keeps preference |

- **Closing ($2M):** below Seed's $3M preference, so all of it goes to Seed, split 3:1 between X and Y.
- **Earnout ($3M):** cumulative proceeds are $5M, where Seed has $3M and common $2M. The earnout's take is the difference: Seed gets **$1M**, the rest of its preference, and common gets **$2M**.

If the $3M earnout were run through the waterfall on its own, Seed would take all $3M again. The cumulative rule prevents that, because Seed's preference is paid only once.

## Schedule B: the earnout makes Seed convert

| Payment | Amount | Cumulative | Founder A | Founder B | Investor X | Investor Y | Seed decision at cumulative |
|---|---:|---:|---:|---:|---:|---:|---|
| closing | 10,000,000 | 10,000,000 | 5,250,000 | 1,750,000 | 2,250,000 | 750,000 | keeps preference |
| earnout | 10,000,000 | 20,000,000 | 6,750,000 | 2,250,000 | 750,000 | 250,000 | converts |

- **Closing ($10M):** Seed takes its $3M preference and common gets $7M (Founder A $5.25M, Founder B $1.75M).
- **Earnout ($10M):** cumulative proceeds are $20M, above the $15M conversion point, so Seed converts and holds 20% of $20M = $4M. Common holds $16M. The earnout's take is Seed **$1M** and common **$9M**.

Seed's earnout take is only $1M, not 20% of $10M, because Seed took a $3M preference at closing that is worth less than its later as-converted share. The earnout tops it up to its converted value, and no further.

If the earnout is never paid, the closing takes stand as they are.
