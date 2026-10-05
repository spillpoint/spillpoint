# Millrace Robotics (fictional)

This is the main worked case. It follows one company from founding through a down-round Series B, then runs exits from $0 to $300M. This file gives inputs only. M1 produces the answers.

## Founding — 2021-02-01

| Holder | Role | Common shares |
|---|---|---|
| Ana Ortiz | CEO | 5,500,000 |
| Dev Patel | CTO | 4,500,000 |

## Early hire — 2021-06-01

Lena Fischer (COO) receives restricted common equal to 6% of the company immediately after the issuance.

## Pre-seed SAFEs — 2021-09-15

YC post-money SAFEs with a $5,000,000 post-money valuation cap and no discount.

| Investor | Purchase amount |
|---|---|
| Priya Shah | $300,000 |
| Marcus Lee | $150,000 |

## Option pool — 2021-10-01

The pool is created equal to 10% of fully diluted shares after creation, where fully diluted means issued common plus the pool. SAFEs are excluded.

Grants at a $0.05 strike:

| Grantee | Options |
|---|---|
| Lena Fischer | 40,000 |
| Other employees | 450,000 |

## Seed — 2022-06-30

Harbor Lane Ventures Fund I invests $2,500,000 at a $7,500,000 pre-money valuation.

- The pre-money includes the SAFEs, which convert in this round.
- The unissued pool is topped up to 18% of post-money fully diluted shares, with the top-up in the pre-money.
- Seed Preferred: 1.5x non-participating, plus pro-rata rights.
- The SAFE holders receive a series of their own, Seed Preferred (from SAFEs), with Seed Preferred's rights, per `docs/SPEC.md`.

## Grants between Seed and Series A

Other employees: 1,100,000 options at a $0.11 strike.

## Series A — 2023-09-30

$12,000,000 at a $48,000,000 pre-money valuation.

| Investor | Amount |
|---|---|
| Ridgeline Capital Fund III | $9,000,000 |
| Harbor Lane Ventures Fund I (pro-rata) | $3,000,000 |

- The unissued pool is topped up to 15% of post-money fully diluted shares, with the top-up in the pre-money.
- Series A Preferred: 1.25x participating, capped at 2.75x total return (the preference counts toward the cap).
- Anti-dilution: broad-based weighted average.

## Grants between Series A and Series B

All at a $0.42 strike:

| Grantee | Options |
|---|---|
| Dev Patel | 250,000 |
| Lena Fischer | 300,000 |
| Other employees | 2,250,000 |

## Series B — 2025-03-31

Cobalt Family Office LLC invests $10,000,000 at a $36,000,000 pre-money valuation.

- The unissued pool is topped up to 12% of post-money fully diluted shares, with the top-up in the pre-money.
- Series B Preferred: 2x participating, uncapped.
- Post-money fully diluted shares include any anti-dilution adjustment shares this round triggers, per the `docs/SPEC.md` default.

## Seniority

Series B is paid first, then Series A, then the Seed tier. Within the Seed tier, Seed Preferred and Seed Preferred (from SAFEs) are pari passu.

## Expected outputs (M1 produces these)

1. The cap table after each event: shares per holder and per class, prices, conversion ratios, and the unissued pool.
2. The exit range is $0 to $300M. Give payouts per holder and per class at $10M, $25M, $40M, $50M, $75M, $100M, $150M, $225M, and $300M, and at every breakpoint.
3. The full breakpoint list in the range, each with its reason.
4. `DERIVATION.md`: a plain-English walk-through a founder could follow, covering why each breakpoint sits where it does.
