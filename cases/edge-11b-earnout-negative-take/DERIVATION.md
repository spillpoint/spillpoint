# Edge case 11b: derivation

This is edge case 6b's company:
- **Common:** Founder A 6,000,000 and Founder B 2,000,000.
- **Seed-1 Preferred:** Investor X's 1,000,000 shares, at $1.00.
- **Seed-2 Preferred:** Investor Y's 1,000,000 shares, at $3.00.

Both Seeds are 1x non-participating in one tier, and must convert together as a group, decided by class vote (E11). The sale's proceeds come as a **$29,000,000 closing** and a **$2,000,000 earnout**.

## The rule

The waterfall runs on **cumulative** proceeds (`ASSUMPTIONS.md` X8). Each payment goes where it would have gone had it all been paid at closing. A holder's take from a payment is its payout on everything paid so far, less its payout before the payment. The conversion decisions are made again at each cumulative amount.

## Where the group converts

Case 6b's group converts at **$30,000,000**, and payouts jump there:
- **Keeping their preferences,** the Seeds take $1,000,000 and $3,000,000. Common's 8,000,000 shares share the rest.
- **Converting,** all 10,000,000 shares share the whole exit value.

The group converts by class vote: more than 50% of its as-converted shares must gain from converting (C4's default). Each Seed holds half, so both must gain:
- **Seed-1** gains once its 10% of the exit value passes its $1,000,000 preference, above $10M.
- **Seed-2** gains once its 10% passes its $3,000,000 preference, above $30M.

So the group converts above $30M. At exactly $30M the outcome from below holds (E13).

## The closing: $29,000,000

$29M is below $30M, so the Seeds keep their preferences:

| Holder | Closing |
|---|---:|
| Investor X (Seed-1) | $1,000,000 |
| Investor Y (Seed-2) | $3,000,000 |
| Common: $25,000,000 over 8,000,000 shares, $3.125 each | |
| Founder A | $18,750,000 |
| Founder B | $6,250,000 |

## The earnout: $2,000,000, $31,000,000 in all

At the cumulative $31M the group converts. All 10,000,000 shares share $31,000,000, at $3.10 each:

| Holder | Cumulative after the earnout | Less the closing | The earnout's take |
|---|---:|---:|---:|
| Founder A | $18,600,000 | $18,750,000 | **−$150,000** |
| Founder B | $6,200,000 | $6,250,000 | **−$50,000** |
| Investor X | $3,100,000 | $1,000,000 | +$2,100,000 |
| Investor Y | $3,100,000 | $3,000,000 | +$100,000 |
| Total | $31,000,000 | $29,000,000 | $2,000,000 |

The takes add up to the $2,000,000 payment. The founders' takes are **negative**: the earnout tips the group into converting, and converting moves value from common to the Seeds. Paid all at once, $31M would have paid each founder less than the closing alone did. X8 reports a negative take as is, never hidden. For the payments view, X8 asks for a clear warning on that payment.

## Breakpoints

| Exit value | Why |
|---:|---|
| $4,000,000 | The Seeds' $4,000,000 of preferences are paid in full. Above this, the next dollar goes to common. |
| $30,000,000 | Payouts jump: the group converts (case 6b). |

## Payouts at the listed exit values

| Exit | Founder A | Founder B | Investor X | Investor Y |
|---:|---:|---:|---:|---:|
| $29M | 18,750,000 | 6,250,000 | 1,000,000 | 3,000,000 |
| $30M | 19,500,000 | 6,500,000 | 1,000,000 | 3,000,000 |
| $31M | 18,600,000 | 6,200,000 | 3,100,000 | 3,100,000 |

At $30M the outcome from below holds, so the Seeds still keep their preferences there.
