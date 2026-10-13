# spillpoint fund waterfall: spec

The fund-level waterfall, `spillpoint-fund`. Each rule has a code (F1, F2, …) and a default. Jordan settled them on 2026-10-12 (S0); his decisions are listed at the end. `ASSUMPTIONS.md` has each rule's default in one table, the choices these rules don't settle (FA1 onward), the case-file conventions (FC1 onward), and each rule's later work.

## What it answers

Given a fund's terms, its dated calls and distributions, a date D, and an amount X distributed on D:
- how X splits between the LPs and the GP, tier by tier
- where the fund stands to date
- every X where the split changes, with a reason
- if X is the fund's last distribution, any clawback the GP owes

## Inputs

```json
{
  "as_of": "2026-09-30",
  "terms": {
    "carry": "0.20",
    "pref": null,
    "catch_up": null,
    "gp_commitment": { "share": "0.01" }
  },
  "cash_flows": [
    { "date": "2021-01-15", "type": "call", "kind": "investment", "amount": "8000000" },
    { "date": "2021-01-15", "type": "call", "kind": "fee", "amount": "495000" },
    { "date": "2024-05-01", "type": "distribution", "amount": "4000000" }
  ],
  "distribution_date": "2026-09-30",
  "final": false,
  "nav": "40000000"
}
```

- **`carry`:** a rate, or steps: `{ "steps": [{ "rate": "0.20" }, { "rate": "0.25", "from_lp_multiple": "3" }] }`.
- **`pref`:** `{ "rate": "0.08" }`. Simple only in v1 (F7).
- **`catch_up`:** `{ "gp_share": "1" }` for full. A partial one gives the GP's share, such as `"0.5"`.
- **`gp_commitment`:** `share`, plus `pays_fees` (default false) and `pays_expenses` (default true).
- **`kind` on a call:** `investment`, `fee` or `expense`.
- **`distribution_date`** defaults to `as_of`. **`final`** (default false) marks X as the fund's last distribution. **`nav`** is optional.
- **Numbers** are exact strings, as in spillpoint. **Dates** are ISO.

## The rules

**F1, structure.** European (whole-fund), cumulative. Every distribution, earlier ones included, runs through the same tiers in date order, against the fund's running balances. Carry on interim distributions is paid as they're made; F12 trues it up at the end.

**F2, whole-fund amounts.** Calls and distributions are totals for all partners, the GP commitment included.

**F3, the GP commitment.** A share g, fee-free and carry-free by default (Jordan, 2026-10-12):
- It pays g of investment calls, g of expense calls (`pays_expenses`, default true), and none of fee calls (`pays_fees`, default false). The LPs pay the rest of every call, fees in full.
- It gets g of every distribution, its share of the investments, outside the tiers, with no carry.
- It's reported as its own line, never mixed with carry.

**F4, order of events.** On one date, calls come before distributions, so capital called that day is returned first (and accrues no pref). Same-day distributions go in the order listed. D must be on or after every cash flow. Refused: no calls at all; a distribution before the first call.

**F5, tier 1, capital.** LPs get back all their paid-in capital to date first: investment, fee and expense calls alike.

**F6, tier 2, pref** (default none). Rate r, accrued Actual/365 on the LPs' unreturned capital, from each call's actual date to the distribution's date, across the whole fund (Jordan, 2026-10-12). Within a distribution, capital comes before pref.

**F7, simple pref only in v1.** Compounding waits for a real fund that has it.

**F8, tier 3, catch-up** (default none).
- **It needs a pref.** A catch-up without one is refused, since with no hurdle it does nothing.
- **Without one,** a pref is a hard hurdle: carry only on profit above the pref.
- **With one,** the GP gets share s of each dollar and the LPs the rest, until the GP's carry to date is c of all profit to date. s = 1 for a full catch-up; a partial s must be above the carry rate.
- **Profit** is everything distributed through the tiers beyond capital, LPs' and GP's together (the GP commitment's line aside).
- **c** is the first carry rate.

**F9, tier 4, carry.** Flat c (default 0.20), or steps: rates rising, each from a higher LP multiple above 1. Refused: a rate of 1 or more, or steps out of order.

**F10, the LP multiple.** The LPs' net multiple on distributions (net DPI): their distributions to date, after carry, divided by their paid-in capital to date. Paid-in includes fees and expenses and excludes the GP commitment (Jordan, 2026-10-12). It counts cash distributed, not NAV: a step can't pay carry on unrealized value.

**F11, how a step applies.** A higher rate applies only to profit above its threshold, with no catch-up for the profit below it (Jordan, 2026-10-12). If LPs are already past a threshold when the carry tier starts, the carry tier starts at that step.

**F12, clawback.** Fund-level, at the end (Jordan, 2026-10-12). When X is final, and at the NAV point:
- **The GP's entitlement** is what the tiers give run once on the fund's totals:
  - all LP paid-in as capital
  - the pref accrued on the LPs' hurdle balance, from each call's and each distribution's actual date. The hurdle balance is paid-in minus every distribution that ran the tiers, never below zero.
  - all distributions, X included, as the amount
- **The clawback owed** is the carry paid to date, X's included, minus the entitlement, when that's positive. It goes to the LPs, so the GP keeps at most its entitlement.
- **One way only:** if the GP is owed more, nothing is added.
- **Gross of tax,** no interest.

When no capital is called after the LPs first have all their capital back, the entitlement equals the carry paid and nothing is owed. When capital is called later, two things can make the GP owe:
- carry paid on gains that later losses offset
- carry steps measured on the paid-in capital of the day, which a later call raises. This one can leave a clawback that more distributions never clear, since both runs then pay the same top rate.

**F13, in kind.** A distribution in kind counts at its stated value.

**F14, the x-axis.** X is one more distribution on D, every earlier cash flow fixed. On that axis every v1 term is piecewise linear in X, so each breakpoint is exact. X = NAV gives "carry if the fund were liquidated at NAV on D", shown as a marked point, final by definition.

**F15, breakpoints.** A breakpoint is each X above 0 where a tier of this distribution ends, whether or not the LP/GP split changes there. A hard hurdle's capital and pref are both 100% to LPs, but each is a tier.
- `capital_returned`: "LPs have their $10,890,000 of paid-in capital back"
- `pref_met`: "LPs have their 8% pref, $4,004,383.56"
- `catch_up_done`: "the GP has 20% of the profit"
- `carry_step`: "LPs reach 3.0x: carry is 25% from here"

When final, there are also breakpoints where the clawback owed bends:
- `clawback_cleared`: "from here the GP has earned all the carry it was paid earlier"
- `clawback_starts`: "from here the GP has been paid more carry than it has earned"
- `clawback_changes`: where the clawback starts to fall, stops falling, or falls faster or more slowly.
  - **When a tier of the fund-total run ending causes it,** the reason says so: "the clawback owed starts to fall: on the fund's totals, LPs have their pref".
  - **When one of this distribution's tiers causes it,** that tier's own reason sits beside it.

One X can carry several reasons: capital returned and clawback cleared together, in example C.

**F16, outputs at each X.**
- **This distribution and the fund to date,** each by tier: the LPs' capital, pref, catch-up share and carry-tier share; the GP's catch-up and carry by step; the GP commitment's line.
- **When final:** the GP's entitlement and the clawback owed.
- **Also:** the LPs' paid-in, the GP commitment's paid-in, and the pref accrued to D.

**F17, numbers.** The engine uses decimal.js at 40 digits, as spillpoint does. The reference uses exact fractions. Day counts are whole days. Cases are compared as spillpoint's are.

**F18, refusals.** Each names a kind, a term and the field (as a path).
- **Unsupported,** a term v1 doesn't model:
  - any key under `terms` (or inside a term) that isn't listed above, named by the key itself (`hurdle_irr`)
  - `compounded_pref`, for any `compounding` but `"simple"`
- **Input:**
  - `bad_number`: not an exact string, or out of range. Out of range is a negative amount, rate or share, a zero amount or pref rate, or a catch-up share above 1.
  - `bad_date`
  - `bad_field`: an unknown call kind or flow type, or a non-boolean flag
  - `missing_field`
  - `unknown_field`: outside `terms`
  - `carry_rate_not_below_one`
  - `steps_out_of_order`: rates not rising, multiples not rising from above 1, or the first step given a multiple
  - `catch_up_without_pref`
  - `catch_up_share_not_above_carry`
  - `gp_commitment_not_below_one`
  - `no_calls`
  - `distribution_before_call`
  - `cash_flow_after_distribution_date`

## Worked examples (exact, to the cent)

**A, the VC default.** Case fund-08 is this with a third step.
- **The fund:**
  - investment calls of $8,000,000 on 2021-01-15 and $2,000,000 on 2022-06-01
  - fee calls of $495,000 on 2021-01-15 and 2022-01-15
  - a 1% GP commitment, fee-free: it pays $100,000, the LPs $10,890,000
  - a $4,000,000 distribution on 2024-05-01
  - carry 20%, stepping to 25% when LPs reach 3x; D = 2026-09-30
- **The earlier $4,000,000:** $40,000 to the GP commitment; $3,960,000 to LPs as capital.
- **X up to $7,000,000:** 1% to the GP commitment. The rest returns the LPs' remaining $6,930,000. Breakpoint: capital returned.
- **$7,000,000 to $34,500,000:** 1% to the GP commitment; of the rest, 80% LPs, 20% carry. Breakpoint at $34,500,000: LPs reach 3.0x ($32,670,000 on $10,890,000). Carry is $5,445,000 and the GP commitment's line $345,000.
- **Above $34,500,000:** 75% LPs, 25% carry.

**B, a pref and full catch-up.** Case fund-06.
- **The fund:** one $10,000,000 call on 2020-01-01. 8% pref, full catch-up, 20% carry, no GP commitment. D = 2025-01-01, 1,827 days later. The pref is $4,004,383.56.
- **Breakpoints:**
  - $10,000,000: capital back
  - $14,004,383.56: pref met
  - $15,005,479.45: catch-up done. The GP has $1,001,095.89, 20% of $5,005,479.45 profit.
- **Then 80/20.** Without the catch-up (a hard hurdle), 80/20 starts at $14,004,383.56.

**C, a clawback.** Case fund-10.
- **The fund:**
  - a $10,000,000 investment call
  - then a $15,000,000 distribution: capital back, then $1,000,000 carry on $5,000,000 profit
  - then a $2,000,000 follow-on call that's written off
  - flat 20%, no pref, no GP commitment
  - a final distribution X
- **X = 0:** total profit is $3,000,000, so the GP is entitled to $600,000 and owes back $400,000.
- **X = $1,000,000:** entitled $800,000; owes $200,000.
- **X = $2,000,000:** entitled $1,000,000, what it was paid. Breakpoint: capital returned and clawback cleared together.
- **Above $2,000,000:** 80/20, nothing owed.

## Cases

Thirteen cases and a set of refusals, in `packages/fund/cases/` (FC2):

1. One investment call, 20% carry.
2. Investment, fee and expense calls all count as capital; an interim distribution returns part of it.
3. A 2% GP commitment, fee-free and carry-free (the defaults).
4. Case 3 with the GP commitment paying fees and not expenses.
5. An 8% simple pref with no catch-up: a hard hurdle.
6. Example B: an 8% pref over 1,827 days, full catch-up.
7. Case 5 with a 50/50 catch-up.
8. Example A plus a third step, 30% from 5x, with NAV.
9. A pref and full catch-up with two interim distributions and a fee call between them: the pref accrues on a balance that rises and falls.
10. Example C: a clawback the last distribution clears.
11. A clawback with a pref and full catch-up: the fund-total run owes no pref on the later call.
12. An SPV: one investment and a setup fee, the exit as its final distribution, with NAV.
13. A late call against a carry step: the clawback falls, holds, falls again and holds for good.
14. Fifteen refusals, each one change to case 6.

## Decided

- **2026-10-12 (Jordan):**
  - the GP commitment is fee-free and carry-free by default, with both as options (F3)
  - a carry step applies only above its threshold (F11)
  - the multiple is net DPI on paid-in capital (F10)
  - the pref accrues from each call's actual date across the whole fund (F6)
  - a fund-level clawback is in v1 (F12)
- **2026-10-12, on Claude's recommendation:**
  - compounded pref leaves v1 (F7)
  - the clawback test is one run of the tiers on the fund's totals, with the pref on paid-in minus distributions, gross of tax and one way only (F12)
