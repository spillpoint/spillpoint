# spillpoint fund waterfall: spec

The fund-level waterfall, `spillpoint-fund`. Each rule has a code (F1, F2, …) and a default. Jordan settled F1 to F18 on 2026-10-12 (S0), and F19 to F21, the LPs, on 2026-10-18 for 0.2.0 (S1); his decisions are listed at the end. `ASSUMPTIONS.md` has each rule's default in one table, the choices these rules don't settle (FA1 onward), the case-file conventions (FC1 onward), and each rule's later work.

## What it answers

Given a fund's terms, its dated calls and distributions, a date D, and an amount X distributed on D:
- how X splits between the LPs and the GP, tier by tier
- where the fund stands to date
- every X where the split changes, with a reason
- if X is the fund's last distribution, any clawback the GP owes
- for a fund whose LPs are all on the same terms: what each LP gets from X, what it has received to date, what it has paid in, and its share of any clawback the GP owes back (F19 to F21)

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
  "nav": "40000000",
  "lps": [
    { "name": "Alder Endowment", "commitment": "5000000" },
    { "name": "Birchwood Family Office", "commitment": "3500000" },
    { "name": "Cedar Fund of Funds", "commitment": "1500000" }
  ]
}
```

- **`carry`:** a rate, or steps: `{ "steps": [{ "rate": "0.20" }, { "rate": "0.25", "from_lp_multiple": "3" }] }`.
- **`pref`:** `{ "rate": "0.08" }`. Simple only in v1 (F7).
- **`catch_up`:** `{ "gp_share": "1" }` for full. A partial one gives the GP's share, such as `"0.5"`.
- **`gp_commitment`:** `share`, plus `pays_fees` (default false) and `pays_expenses` (default true).
- **`kind` on a call:** `investment`, `fee` or `expense`.
- **`distribution_date`** defaults to `as_of`. **`final`** (default false) marks X as the fund's last distribution. **`nav`** is optional.
- **`lps`** is optional: the fund's LPs in the order the GP lists them, each a `name` and a `commitment` (F19 to F21).
  - **`name`:** text, not blank. No two LPs share a name, compared exactly as written.
  - **`commitment`:** an exact number above 0, a string as every number is (F17).
  - **No LPs:** leaving `lps` out, `null`, or an empty list all mean the same thing: no per-LP amounts.
  - **Commitments only divide.** They aren't checked against the calls: the waterfall runs on the whole fund's amounts as before (F2), and the list divides the LPs' amounts between them. Commitments in dollars are usual, but any amounts in the right proportions give the same shares.
  - **The GP commitment** (F3) isn't an LP and isn't in the list. Its own line stays as it is.
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
- `clawback_starts`: "from here the GP has been paid more carry than it has earned". v1's terms can't produce it (FA9); it's kept for later terms.
- `clawback_changes`: where the clawback starts to fall, stops falling, or falls faster or more slowly.
  - **When a tier of the fund-total run ending causes it,** the reason says so: "the clawback owed starts to fall: on the fund's totals, LPs have their pref".
  - **When one of this distribution's tiers causes it,** that tier's own reason sits beside it.

One X can carry several reasons: capital returned and clawback cleared together, in example C.

**F16, outputs at each X.**
- **This distribution and the fund to date,** each by tier: the LPs' capital, pref, catch-up share and carry-tier share; the GP's catch-up and carry by step; the GP commitment's line.
- **When final:** the GP's entitlement and the clawback owed.
- **Also:** the LPs' paid-in, the GP commitment's paid-in, and the pref accrued to D.

**F17, numbers.** The engine uses decimal.js at 40 digits, as spillpoint does. The reference uses exact fractions. Day counts are whole days. Cases are compared as spillpoint's are.

**F18, refusals.** Each names a kind, a term and the path to what it's about in the input: `terms.carry.steps[1]`, `cash_flows[0].amount`.
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
  - `lp_name_repeated` (F21)

**F19, the LPs.** Every LP is on the same terms: the same fees, the same carry, and every call made pro rata to commitments. LP *i*'s share is its commitment over the sum of all the LPs' commitments, exactly. *Later: per-LP accounts, where LPs differ: later closes and equalization, side-letter fee or carry breaks, defaulted or excused LPs.*

**F20, each LP's amounts.** At each X, and at the NAV point, for each LP in the input's order:
- **Its commitment and share.**
- **Paid in:** its share of the LPs' paid-in (F5).
- **This distribution:** its share of the LPs' total from X.
- **To date:** its share of the LPs' total to date, X included.
- **Clawback,** when final (F12): its share of the clawback owed, which comes back to the LPs. Zero when nothing is owed.

All exact; nothing is rounded. Nothing else changes: the GP commitment's line, the GP's carry and the breakpoints are as before. Each LP's amounts are the LPs' amounts scaled, so they bend exactly where the LPs' do (F15).

**F21, refusals,** added to F18, each with a path into `lps`:
- **`lps` not a list:** `bad_field` at `lps`.
- **An LP that isn't an object:** `bad_field` at `lps[i]`.
- **An LP with a field other than `name` and `commitment`:** *unsupported*, named by the field, as for terms: a per-LP term v1 doesn't model. A side letter's carry is `carry` at `lps[i].carry`.
- **A missing or `null` name or commitment:** `missing_field`.
- **A name that isn't text, or is blank:** `bad_field`.
- **A commitment that isn't an exact string, or isn't above 0:** `bad_number`.
- **A name an earlier LP already has:** `lp_name_repeated`, at the later LP's `name`. A new input term, stable from 0.2.0.

The LPs are checked after everything else, one LP at a time in order. Within an LP: its shape and its fields, then that the name and commitment are there, then the name, then the commitment, then whether the name repeats.

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

Nineteen cases and two sets of refusals, in `packages/fund/cases/` (FC2):

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
15. A late call leaves the fund's totals short of capital: the clawback holds until the totals' run has the LPs' capital back, then falls (f01e).
16. A pref and full catch-up with a late call: the clawback falls through the totals' pref and catch-up, a dollar a dollar, then 20 cents (f01e).
17. Case 8 with three LPs at $5M, $3.5M and $1.5M: the commitments add up to $10M, not the LPs' $10,890,000 paid in (f02a).
18. Case 1 with three equal LPs, so each LP's amount is a fraction of a cent: at X = $2,000,000 each is $666,666.66 rounded down, with $0.02 left over (f02a).
19. Case 13 with two LPs, 70% and 30%: each one's share of the clawback, $1,925,000 and $825,000 at X = $0 (f02a).
20. Case 12, the SPV, with three LPs whose shares don't terminate: 1/3, 11/21 and 1/7. Final, with a NAV (f02a).
21. Eleven refusals on case 1, at least one for each line of F21 (f02a).

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
- **2026-10-18 (Jordan), for spillpoint-fund 0.2.0:**
  - F19 to F21: each LP's share of what the LPs get, for LPs all on the same terms
  - each LP's share is worked out in the engine, so the page does no fund math, and it's part of the npm API
  - each LP's amount on the page is rounded down to the cent, with a "Left over from rounding down" line
  - when the GP owes a clawback, the page shows each LP's share of it
  - the LPs' table downloads as a CSV
