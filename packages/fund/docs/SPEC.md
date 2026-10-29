# spillpoint fund waterfall: spec

The fund-level waterfall, `spillpoint-fund`. Each rule has a code (F1, F2, …) and a default. Jordan settled F1 to F18 on 2026-10-12 (S0), F19 to F21, the LPs, on 2026-10-18 for 0.2.0 (S1), F22 to F28, LPs in classes and later closes, on 2026-10-23 for 0.3.0 (S2), F29 to F32, management fees, on 2026-10-25 for 0.4.0 (S3), and F33 to F37, investments and carry deal by deal, on 2026-10-27 for 0.5.0 (S4); his decisions are listed at the end. `ASSUMPTIONS.md` has each rule's default in one table, the choices these rules don't settle (FA1 onward), the case-file conventions (FC1 onward), and each rule's later work.

## What it answers

Given a fund's terms, its dated calls and distributions, a date D, and an amount X distributed on D:
- how X splits between the LPs and the GP, tier by tier
- where the fund stands to date
- every X where the split changes, with a reason
- if X is the fund's last distribution, any clawback the GP owes
- for a fund whose LPs are all on the same terms: what each LP gets from X, what it has received to date, what it has paid in, and its share of any clawback the GP owes back (F19 to F21)
- for a fund whose LPs aren't all on the same terms (F22 to F28):
  - what each LP gets from a distribution, has received to date, and has paid in
  - what the GP gets in carry from each class, and owes back to each when the fund ends
  - at each later close, what the joining LPs pay in to catch up, with interest, and what the LPs already in get back
- for management fees (F29 to F32):
  - for a GP who hasn't entered fee calls: from "2% of commitments, called quarterly, stepping down to 1.5% from year six", every fee call to D, each LP's share of each, and the split with them in
  - for a fund with a later close: what each joining LP owes in fees from the initial close, paid to the manager, beside the capital and interest it pays the LPs already in
- for investments and carry deal by deal (F33 to F37):
  - for a GP whose fund pays carry deal by deal: how a distribution from one investment splits, when the LPs get back first only what's due on the investments exited or written off so far, not all their paid-in capital. So how much carry that pays the GP earlier than the whole fund would, and what the GP owes back at the end if later investments don't cover it.
  - for any fund: its investments, each with its cost, how much of it has been exited or written off, and what it has returned

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
- **From 0.3.0, classes and later closes** (F22 to F28): two more terms, the classes, and two more fields on an LP.

  ```json
  "terms": {
    "carry": { "steps": [{ "rate": "0.20" }, { "rate": "0.25", "from_lp_multiple": "3" }] },
    "fee_rate": "0.02",
    "equalization_rate": "0.08",
    "lp_classes": [
      { "name": "Friends and family", "fee_rate": "0", "carry": "0" },
      { "name": "Anchor", "fee_rate": "0.015", "carry": "0.15" }
    ]
  },
  "lps": [
    { "name": "Alder Endowment", "commitment": "6000000" },
    { "name": "Cedar Holdings", "commitment": "1000000", "class": "Friends and family", "close": "2021-07-15" }
  ]
  ```

  - **`fee_rate`:** the fund's standard management fee rate. Needed only when a class gives its own; it divides the fee calls between the classes, and isn't checked against them. With a schedule (F30) it isn't given: the schedule's first rate is the fund's.
  - **`equalization_rate`:** the interest a later-close LP pays on what it catches up, simple, a year. Needed when an investment or expense call comes before a later close (F29; in 0.3.0, whenever any LP had a later close): "0" for none.
  - **`lp_classes`:** each class a `name`, and optionally its own `fee_rate` and `carry`. A class without `fee_rate` pays the fund's fees; without `carry`, the fund's carry. `carry` is written as the fund's is (F9): a rate, or steps.
  - **`class` on an LP:** a class's name. Without one, the LP is on the fund's terms.
  - **`close` on an LP:** the date the LP joined. Without one, or on or before the fund's first call, it's in from the start.
  - **The LP list is every LP.** From 0.3.0 the commitments divide the calls and distributions between classes, not only within them.
- **From 0.4.0, a management fee schedule** (F29 to F32): one more term, which works out the fee calls.

  ```json
  "terms": {
    "carry": "0.20",
    "management_fee": {
      "start": "2021-02-15",
      "frequency": "quarterly",
      "steps": [
        { "rate": "0.02" },
        { "rate": "0.015", "from": "2026-02-15" }
      ],
      "commitments": "40000000"
    }
  }
  ```

  - **`management_fee`:** a schedule that works out the fund's fee calls. Without it, fee calls are entered as cash flows, as before.
  - **`start`:** the date fees start, usually the initial close.
  - **`frequency`:** `"quarterly"` (the default), `"semiannual"` or `"annual"`. Periods are calendar quarters, calendar half-years (January to June, July to December) or calendar years.
  - **`steps`:** the annual rate on commitments, the first from `start`, and each after it from its `from` date. A rate of `"0"` ends fees from its date. The first rate is above 0: a fee holiday is a later `start`.
  - **`commitments`:** the LPs' total commitments, the fee's base, for a fund that doesn't list its LPs. A fund that lists them uses their commitments; `commitments`, if given, must be their total.
- **From 0.5.0, investments and carry deal by deal** (F33 to F37): one more term, the fund's investments, a new cash flow, two fields on a distribution, and X's source.

  ```json
  {
    "terms": { "carry": "0.20", "carry_basis": "deal_by_deal" },
    "investments": [
      { "name": "Alder Robotics", "checks": [{ "date": "2020-02-01", "amount": "3000000" }] },
      { "name": "Birch Health", "checks": [{ "date": "2020-03-01", "amount": "3000000" }] },
      { "name": "Cedar AI", "checks": [
        { "date": "2021-02-01", "amount": "2500000" },
        { "date": "2022-05-01", "amount": "1500000" }
      ] }
    ],
    "cash_flows": [
      { "date": "2022-06-30", "type": "distribution", "amount": "9000000", "investment": "Alder Robotics" },
      { "date": "2023-03-31", "type": "distribution", "amount": "1500000", "investment": "Cedar AI", "share": "0.4" },
      { "date": "2023-09-30", "type": "write_off", "investment": "Birch Health" }
    ],
    "distribution_from": { "investment": "Cedar AI", "share": "1" }
  }
  ```

  - **`carry_basis`:** `"whole_fund"`, the default, F1 as before, or `"deal_by_deal"` (F35).
  - **`investments`:** optional, a list in the order the GP shows them.
    - **`name`:** text, not blank. No two investments share a name, compared exactly as written.
    - **`checks`:** one or more, each with a `date` and an `amount` (an exact number above 0). A follow-on is another check.
    - **A check is the fund's cost,** a whole-fund amount with the GP commitment's part included, as calls are (F2).
  - **On a distribution:**
    - **`investment`:** the investment it comes from.
    - **`share`:** how much of what's left of that investment it sells, above 0 and at most 1, `"1"` by default.
    - **Whole fund:** both are optional and only fill the investments table.
    - **Deal by deal:** every distribution names an investment.
  - **`"type": "write_off"`:** a cash flow of its own, with a `date` and an `investment` and no amount. It ends what's left of the investment at its date. Nothing is distributed.
  - **`distribution_from`:** X's investment, and its share (`"1"` by default). Needed deal by deal. On the whole fund it's optional and changes nothing.
  - **Checks aren't calls.** Checks are what the fund paid for its investments; calls are what the partners paid in. They aren't matched one to one, but the cost made by any check's date can't be more than the investment calls up to that date (F37).
- **Numbers** are exact strings, as in spillpoint. **Dates** are ISO.

## The rules

**F1, structure.** European (whole-fund), cumulative. Every distribution, earlier ones included, runs through the same tiers in date order, against the fund's running balances. Carry on interim distributions is paid as they're made; F12 trues it up at the end. From 0.5.0 this is the default carry basis, `"whole_fund"`; a fund can pay carry deal by deal instead (F34, F35).

**F2, whole-fund amounts.** Calls and distributions are totals for all partners, the GP commitment included.

**F3, the GP commitment.** A share g, fee-free and carry-free by default (Jordan, 2026-10-12):
- It pays g of investment calls, g of expense calls (`pays_expenses`, default true), and none of fee calls (`pays_fees`, default false). The LPs pay the rest of every call, fees in full.
- It gets g of every distribution, its share of the investments, outside the tiers, with no carry.
- It's reported as its own line, never mixed with carry.

**F4, order of events.** On one date, calls come before distributions, so capital called that day is returned first (and accrues no pref). Same-day distributions go in the order listed. D must be on or after every cash flow. Refused: no calls at all; a distribution before the first call. From 0.5.0 (F33), widened for investments: on one date, calls, then checks, then write-offs, then distributions in the order listed; D must be on or after every check and every write-off too.

**F5, tier 1, capital.** LPs get back all their paid-in capital to date first: investment, fee and expense calls alike. From 0.5.0, deal by deal (F35), only what's due on the investments exited or written off so far: their cost, and their share of the fees and expenses.

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
  - `deal_by_deal_pref`, a pref deal by deal (F37)
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
  - `lp_class_name_repeated`, `lp_class_unknown`, `lp_close_after_distribution` and `call_without_payers` (F28)
  - `fee_rate_with_schedule`, `fee_call_with_schedule` and `fee_commitments_mismatch` (F32)
  - `investment_name_repeated`, `investment_unknown`, `investment_not_made` and `investments_exceed_calls` (F37)

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

**From 0.3.0, F22 to F28 let LPs differ:** a class of LPs can pay a different management fee or carry (side letters), and an LP can join at a later close. F19 to F21 are the case where every LP is on the fund's terms and in from the start, and there everything is exactly as in 0.2.0.

**F22, classes.** A class changes only the management fee and the carry. The pref, the catch-up's share and the GP commitment are the fund's for every class.
- **A class's fee rate** weights the fee calls: each LP pays fee calls in proportion to its commitment times its class's fee rate over the fund's. An LP on the fund's terms, or in a class without a fee rate, has a weight of its commitment. "0" pays no fees.
- **A class's carry** is its own, flat or in steps (F9, F11), and its catch-up runs to its own first carry rate (F8). "0" pays no carry.
- *Later: a class's own pref or catch-up; a fee break that isn't proportional (a different step-down, a fee offset); a class's own expenses.*

**F23, each class's account.** The LPs' side runs as one account per class: the LPs on the fund's terms form one, and each class with LPs another. A fund without listed LPs has one account, the whole LPs' side, as before.
- **Calls:** the LPs' part of each call (F3: the call less the GP commitment's part) is divided between the accounts. Investment and expense calls by commitment; fee calls by commitment times fee rate (F22).
- **Distributions:** the LPs' part of each distribution (less the GP commitment's g, F3), X's included, is divided by commitment.
- **Each account runs the tiers on its own** (F5 to F11): its own paid-in as capital, the pref on its own unreturned capital, the catch-up to its own carry rate, and the carry steps by its own LP multiple, its distributions after carry over its own paid-in.
- **Within an account,** its LPs share its amounts by commitment, as F20 has them.
- **The fund's amounts** (F16) are the accounts' sums, with the GP commitment's line beside them as before.
- **When every LP is on the fund's terms,** there's one account and this is exactly 0.2.0. A class with exactly the fund's terms gives the same amounts as none.

**F24, the clawback by account.** When X is final, and at the NAV point (F12), each account settles on its own (Jordan, 2026-10-23):
- the carry paid from it, against one run of the tiers on its own totals;
- the clawback owed to it, when that's positive, goes to its LPs by commitment;
- the fund's clawback owed is the accounts' sum. One account's surplus never offsets another's.

**F25, later closes.** An LP whose close is after the fund's first call joins at a later close.
- **It's treated as in from the start** (Jordan, 2026-10-23): its share of every call, by F23, from each call's own date, so its pref accrues from the original calls. Later closes change no account and no tier.
- **The cash flows are the fund's calls as it made them,** each its total from the LPs in at the time. Equalization isn't entered: it's worked out.
- **At each later close,** the LPs in by then rebalance: for each investment and expense call before the close, every LP's part becomes its share among them by commitment. The joining LPs pay in their parts, and the LPs already in get back what they had paid over theirs. Fee calls aren't rebalanced: each joining LP pays its own back fees to the manager (F29, from 0.4.0; 0.3.0 rebalanced them by F22's weights).
- **Equalization interest:** each joining LP pays interest at `equalization_rate` (Jordan, 2026-10-23: it must be entered, "0" for none; from 0.4.0, only when an investment or expense call comes before a later close, F29), simple, Actual/365, on its part of each earlier investment and expense call, from that call's date to its close. It goes to the LPs already in, in proportion to what each gets back of that call.
- **Outside the waterfall:** equalization capital and interest, and back fees, aren't distributions and don't run the tiers. An LP's paid-in is its share of every call, as if from the start: the catch-up included, and what it got back left out.
- **Several later closes** rebalance in date order, each among the LPs in by then. LPs closing on the same date join together.
- **A close must come before the fund's first distribution,** X's included.
- **The GP commitment** is in from the start, at its share of the final fund, and isn't in the equalization.
- *Later: a close after a distribution; a fund that keeps a joining LP's catch-up to reduce its next call; equalization interest treated as capital; the GP commitment in the equalization.*

**F26, outputs.** At each X, and at the NAV point:
- **The fund's amounts** as F16 gives them, the accounts' sums.
- **Each account:** its class (none for the fund's terms), this distribution and the fund to date by tier, its LPs' paid-in, its LP multiple, and when final its carry paid, entitlement and clawback owed.
- **The GP's carry by step** lists each account's steps: the fund's terms first, then the classes in the input's order, each naming its account.
- **Each LP** as F20 has it, now its account's amounts by its commitment within the account; plus its class and its close.

Once for the fund, not by X, for each LP: its **equalization**: the capital it paid in at its close, the capital it got back at later closes, and the interest it paid and received; from 0.4.0, its back fees too (F31). All exact; nothing rounded.

**F27, breakpoints.** Each account's breakpoints (F15) at the X that gives them: the X where its part of the LPs' share reaches the tier's end.
- **With two or more accounts,** each reason's text starts with its account's name: "Friends and family: LPs have their $1,000,000 of paid-in capital back", "Fund terms: LPs reach 3.0x: carry is 25% from here". Its amounts and rates are the account's own.
- **The clawback's reasons** (F15) come from each account's own clawback, named the same way. A reason the run on the totals causes gives the account's own totals: "Fund terms: the clawback owed starts to fall: on its own totals, LPs reach 2.0x: carry is 30% from here" (Jordan, f03a review).
- **One X can carry reasons from several accounts:** the fund's terms first, then the classes in the input's order.
- **With one account,** the wording is as before.

**F28, refusals,** added to F18 and F21. From 0.3.0 an LP's fields are `name`, `commitment`, `class` and `close`; any other is unsupported, as F21 has it.
- **A class:**
  - `lp_classes` not a list, or a class that isn't an object: `bad_field`.
  - A class's field other than `name`, `fee_rate` and `carry`: *unsupported*, named by the field (a class's own `pref`).
  - A missing name: `missing_field`. A name that isn't text, or is blank (FA17): `bad_field`.
  - A name an earlier class has: `lp_class_name_repeated`, new.
  - A class's fee rate below 0: `bad_number`. A class's fee rate when the terms have neither `fee_rate` nor a schedule (F32): `missing_field` at `terms.fee_rate`.
  - A class's carry: F9's refusals at the class's path. A catch-up share not above the class's first carry rate: `catch_up_share_not_above_carry` at the class's `carry`.
- **The terms:** `fee_rate` of 0 or less, or `equalization_rate` below 0: `bad_number`.
- **An LP:**
  - `class` not text: `bad_field`. A class the terms don't have: `lp_class_unknown`, new.
  - `close` not a date: `bad_date`. A close on or after the fund's first distribution, or D: `lp_close_after_distribution`, new.
- **Once the LPs are read:**
  - An investment or expense call before a later close, without `equalization_rate` (F29; in 0.3.0, any later close): `missing_field` at `terms.equalization_rate`.
  - An entered call that no LP in the fund at its date would pay, because none had closed yet or none of them pays fees: `call_without_payers`, new, at the call. A schedule no listed LP pays, every one in a class at a fee rate of 0, is refused the same way, at `terms.management_fee` (F32).

**The order of checks.** FA2's three stages, then F21's LPs (FA19), then one more, with the schedule in them from 0.4.0 (F32) and the investments from 0.5.0 (F37):
1. **Unsupported terms:** the keys under `terms` in the file's order, then each term's own keys in the file's order, each class's keys and its carry's among them, and the schedule's keys and its steps' among them; a compounding that isn't simple; then `deal_by_deal_pref`. `carry_basis` is a term.
2. **The fields,** as FA2 has them. Within `terms`: the carry, pref, catch-up, GP commitment, and the terms against each other; then `fee_rate`; `equalization_rate`; the schedule (its shape, `start`, `frequency`, `steps` in order, each its shape, rate, then `from`, then `commitments`); then `fee_rate_with_schedule`; then each class in order (its shape, its name, the name repeating, its fee rate, its carry, its carry against the catch-up); then `carry_basis`.
   - **Each cash flow** as F18 has it: unknown fields (an `investment` or `share` on a call among them), then the fields it needs (`amount` not for a write-off), the date, the type, a call's kind, a write-off's own fields, the `investment`, the `share`, then the amount.
   - **After `nav`:** the investments in order, each with its fields, its checks in order, then its name against the ones before. Then `distribution_from`.
3. **The cash flows:** first `fee_call_with_schedule`, then against each other and D, the schedule's calls among the calls, and write-offs among the cash flows after D. Then F37's against each other and D: a check after D; deal by deal, the investments missing; each distribution and write-off in the input's order, for its investment; `distribution_from`; then `investments_exceed_calls`.
4. **The LPs,** as F21 checks them, each through before the next: then its class, then its close.
5. **What the LPs need of the rest:** `equalization_rate`, when an investment or expense call comes before a later close (F29); the schedule's `commitments`, missing or not the LPs' total; a schedule no listed LP pays; then each entered call in date order for its payers.

**From 0.4.0, F29 to F32 are management fees:** fee calls at a later close are each LP's own, not rebalanced, which fixes 0.3.0's F25, and a schedule works out the fee calls from a rate on commitments. A fund with no schedule and no fee call before a later close is exactly as in 0.3.0.

**Why the fix (Jordan, 2026-10-25).** 0.3.0's F25 rebalances every call before a later close between the LPs, fee calls included: the joining LP pays its share of an earlier fee call to the LPs already in, with interest. That isn't how funds work. A fee is each LP's own, on its own commitment: a joining LP owes its own fees from the initial close and pays them to the manager, and the LPs already in pay and get back nothing for it. Equalization rebalances contributions, but not the part of them drawn for the management fee. So in 0.3.0 a fund with a fee call before a later close has its LPs' paid-in short by the joiners' back fees, and its equalization moves fee money between LPs. 0.3.0's release notes it as a known limitation.

**F29, fee calls at a later close** (amends F25 for fee calls; Jordan, 2026-10-25).
- **A fee call is each LP's own fee,** on its own commitment, by F22's fee weights. An LP that joins at a later close owes its own part of each fee call before its close, as if it had been in from the start: its **back fees**. It pays them at its close, to the manager. The LPs already in pay and get back nothing for fee calls: fees are never rebalanced between LPs.
- **An entered fee call before a later close** was paid by the LPs in at its date (FA21). Its rate per unit of fee weight is the LPs' part of it (F3) over the fee weights of the LPs in at its date. Every LP's part of it, as if in from the start, is that rate times its own fee weight; a joiner's part is its back fees.
- **In the waterfall,** every LP is in from the start (F25): each fee call counts at its full size, every LP's part as above, from the call's own date. So the LPs' part of a fee call before a later close grows by the joiners' back fees, and so does the LPs' paid-in. Each account's part of a fee call is its LPs' fee weights times the call's rate (F23).
- **Investment and expense calls** rebalance at a later close as F25 has them, and equalization interest runs on them alone: there's none on back fees. So `equalization_rate` is needed only when an investment or expense call comes before a later close; F28 asked for it after any call.
- **The GP commitment's part of an entered fee call** (F3, when it pays fees) is g of the call as entered. It's in from the start and isn't in the equalization.
- *Later: interest on back fees; back fees paid to the fund and shared between the LPs already in.*

**F30, the management fee schedule.**
- **The fee calls:** one for each period from `start` to D's period, in advance: dated the period's first day, and the first dated `start`, covering `start` to the end of its period. No period starting after D.
- **Each LP's fee for a period:** its commitment, times its class factor, times the period's fee factor.
  - **The period's fee factor:** the rate in force on each of the period's days, from its first day (or `start`) to its last, added up, over (n × the calendar period's days), with n = 4, 2 or 1. So a whole period at one rate is the rate over n, and a part period or a step within one is worked by its days.
  - **The rate in force on a day** is the last step whose date (`start` for the first) is on or before it.
  - **The class factor:** a class's own `fee_rate` over the schedule's first rate, so a class's rate steps down in proportion with the fund's (F22). 1 for the fund's terms and for a class without a fee rate.
  - **Without listed LPs,** the LPs' fee is `commitments` times the fee factor.
- **The call:** the LPs' fees added up. When the GP commitment pays fees (F3), the call is that over (1 − g), so the GP commitment pays g of it.
- **As if in from the start** (F25, F29): a schedule's calls are every LP's own fee, whatever its close. A joiner's part of those before its close is its back fees.
- **A period with nothing to call,** every day of it at a rate of 0, isn't a call (FA40).
- **With a schedule,** no fee call is entered and `fee_rate` isn't given: the schedule's rate is the fund's. A class's `fee_rate` is against the schedule's first rate.
- **The schedule's calls are calls:** they run as entered fee calls do (F3, F5, F6, F23), come before distributions on one date (F4), and count for `no_calls` and `distribution_before_call`. The fund's first call, entered or the schedule's, decides who joins at a later close (F25): an LP whose close is after it, so after `start` at the latest, owes back fees.
- **Defaults (Claude's, settled with the spec):**
  - fees called quarterly in advance on calendar periods, the first pro-rated by days from `start`, with semiannual and annual as options
  - each LP pays the rate on its own commitment: with a schedule, LP commitments are the real base, not only shares
  - a class's fee steps down in proportion with the fund's (F22)
  - a schedule and entered fee calls together are refused, so nothing is counted twice
  - no interest on back fees: equalization interest stays on capital, and nothing that moves money is assumed (2026-10-23)
  - a joiner owes the whole of each fee call before its close, as if in from the start, even for the period it joins in the middle of
  - the GP commitment stays fee-free unless `pays_fees`; when it pays, it pays g of each call (F3)
- *Later: fees on invested capital, gross or net of exits and write-offs; anniversary periods; fees in arrears; fee offsets and waivers; a fee step that isn't proportional for a class (F22's Later); an LP's own fee start.*

**F31, outputs.**
- **The schedule's fee calls,** once for the fund, not by X: each its date, the first and last day it covers, the call, the LPs' part and the GP commitment's, and with listed LPs, each LP's fee. Exact.
- **The split, breakpoints and clawback** run on the schedule's calls as on entered ones.
- **The equalization** (F26): at each later close, each joining LP's back fees, paid to the manager, beside the capital it pays in and the interest; and the back fees over all the closes. Capital paid and got back, and the interest, are for investment and expense calls alone.

**F32, refusals,** added to F18, F21 and F28.
- **The schedule:**
  - `management_fee` not an object: `bad_field`. A key other than `start`, `frequency`, `steps` and `commitments`, or a step's other than `rate` and `from`: *unsupported*, named by the key (an `offset`, a `basis`).
  - `start` missing: `missing_field`; not a date: `bad_date`.
  - `frequency` not `"quarterly"`, `"semiannual"` or `"annual"`: `bad_field`.
  - `steps` missing: `missing_field`; not a list, or empty: `bad_field`; a step not an object: `bad_field`.
  - A step's `rate` missing: `missing_field`; not a number, below 0, or 1 or more: `bad_number`; the first rate 0: `bad_number`.
  - The first step given a `from`: `steps_out_of_order` at the step. A later step without one: `missing_field`; not a date: `bad_date`; not after the step before it (the first's is `start`): `steps_out_of_order` at the step.
  - `commitments` not a number, or 0 or less: `bad_number`.
- **The terms:** `fee_rate` given with a schedule: `fee_rate_with_schedule`, new, at `terms.fee_rate`. A class's own fee rate when the terms have neither `fee_rate` nor a schedule: `missing_field` at `terms.fee_rate` (F28, widened).
- **The cash flows:** an entered fee call with a schedule: `fee_call_with_schedule`, new, at the first such call in the input's order.
- **Once the LPs are read:** a schedule without `commitments` when the fund doesn't list its LPs: `missing_field` at `terms.management_fee.commitments`. `commitments` that isn't the listed LPs' total: `fee_commitments_mismatch`, new, there. A schedule no listed LP pays, every one in a class at a fee rate of 0: `call_without_payers` at `terms.management_fee`, as an entered fee call nobody pays is (F28).
- **The order of checks** is F28's five stages, with the schedule in them, as F28 lists them.

**From 0.5.0, F33 to F37 are a fund's investments, and a carry basis:** the whole fund (F1, the default) or deal by deal. A fund without investments, or with them on the whole fund, gives exactly 0.4.0's numbers.

**Why (Jordan, 2026-10-27).** 0.4.0 pays carry only on the whole fund: nothing until the LPs have all their paid-in capital back. Some funds pay it deal by deal instead: as each investment exits, the LPs get back what's due on the investments exited or written off so far, their cost and their share of fees and expenses, and the GP takes carry on the rest, owing back at the end whatever the whole fund doesn't earn. That needs the fund's investments, which also give every fund a portfolio view.

**F33, investments.**
- **Cost made:** an investment's checks to date. **What's left of it:** the cost made, less the cost realized so far.
- **A distribution from an investment** realizes `share` of what's left of it at its date. That much cost is exited.
- **A write-off** realizes all that's left of it, with no proceeds.
- **A distribution from an investment with nothing left,** say a release from escrow after a full exit, realizes nothing more.
- **A follow-on check** after a partial exit adds to what's left.
- **Proceeds:** the distributions from the investment, as whole-fund amounts.
- **On one date:** calls, then checks, then write-offs, then distributions in the order listed (F4, widened).
- **X** realizes its share of what's left of its investment at D. When X is final, and at the NAV point, everything left of every investment is realized at D: the fund ends.

**F34, the carry basis.**
- **`whole_fund`:** F1 as before. The investments change no amount.
- **`deal_by_deal`:** F35 changes tier 1 (F5). Everything else is as before:
  - carry flat or in steps (F9 to F11), with the LP multiple on all paid-in (F10)
  - each class its own account (F23)
  - later closes as if every LP were in from the start, with their equalization (F25, F29)
  - fees entered or worked out by a schedule (F30)
  - the GP commitment's own line (F3)
  - the clawback at the end (F12, F24)

**F35, deal by deal: what's due before carry** (Jordan, 2026-10-27; amends F5).
- **What's due.** At each distribution, before the GP takes carry, the LPs have back what's due on the investments realized so far (exited or written off):
  - **The cost realized,** the LPs' part of it: (1 − g) of it, with the GP commitment's part aside (F3).
  - **Fees and expenses to date,** the LPs' part, times the share of all cost made that's been realized: realized over made, both at the distribution, by cost (Jordan: "their share, by cost").
- **Tier 1 (F5) becomes:** the LPs get 100% until their capital back to date, over every distribution so far, reaches what's due. The rest of the distribution goes through the carry tier.
- **What's due can be less than what the LPs have already had back.** A new investment adds to the cost made, so the fees' share falls. Then no capital comes first, and nothing already returned is taken back.
- **Each account (F23):** its part of the cost, by commitment; its own fees, by its fee weights (F29); its expenses, by commitment. The share is the fund's.
- **No pref deal by deal in 0.5.0,** so no catch-up either (F8 needs a pref). It's refused as unsupported (F37).
- **Carry is paid on each distribution as it's made, and kept until the end.** No interim clawback and no escrow (Jordan, 2026-10-27).
- **At the end (X final, and the NAV point), what's due is all the LPs' paid-in,** capital called and never invested included: the fund ends, and its unused cash comes back as capital, as on the whole fund (Jordan, f05a review). Before the end, nothing changes.
- **At the end, the clawback is F12's,** and F24's by account. The GP's entitlement is the tiers run once on the fund's totals, with all paid-in as capital, as on the whole fund. So deal by deal, the GP keeps at most what the whole fund would give it at the end. Carry it got early on exits that later write-offs offset, it owes back.
- **The x-axis (F14):** X comes from `distribution_from`'s investment and realizes its share (everything, when final). What's due on X doesn't change with X, so the split stays piecewise linear in X and every breakpoint is exact.
- *Later: a pref, and a catch-up, deal by deal, on what's due, from each check's and each fee call's date; unrealized write-downs due before carry (marks below cost); an interim clawback, and carry escrow (a share of each carry payment held back); a distribution of unused capital, not from an investment; checks funded from a credit line, ahead of their calls; fees and expenses by another rule (all of them first, or by how long each investment was held); spillpoint exits feeding the investments' proceeds, after engine 1.0.*

**F36, outputs.**
- **The investments,** once, at D, before X: each with its name, cost made, cost realized (exited or written off), cost written off, proceeds, and its realized multiple: proceeds over the cost realized, none while nothing of it is realized (Jordan, f05a review). Exact.
- **Deal by deal, at each X and at the NAV point:** what's due before carry on X, and each class's part.
- **Breakpoints:** deal by deal, `capital_returned` reads "LPs have their $11,100,000 back for the investments exited or written off, fees and expenses included", with the class's name in front when there are two or more accounts (F27). When X is final, what's due is all paid-in (F35), and it reads as the whole fund's: "LPs have their $24,888,000 of paid-in capital back", its amount the same. The code doesn't change.
- **Everything else** is as before.

**F37, refusals,** added to F18, F21, F28 and F32.
- **The terms:**
  - Deal by deal with a pref: *unsupported*, `deal_by_deal_pref`, new, at `terms.pref`.
  - `carry_basis` not `"whole_fund"` or `"deal_by_deal"`: `bad_field`.
- **A cash flow:**
  - **A new type:** `write_off`.
  - **On a call:** `investment` or `share`: `unknown_field`.
  - **On a write-off:** `kind`, `amount` or `share`: `unknown_field`. `investment` missing: `missing_field`.
  - **On a distribution or a write-off:** `investment` not text, or blank: `bad_field`. `share` not a number, 0 or less, or above 1: `bad_number`. A `share` without an `investment`: `missing_field` at the investment.
- **The investments:**
  - **The list:** not a list: `bad_field`.
  - **An investment:** not an object: `bad_field`. A key other than `name` and `checks`: `unknown_field`. `name` or `checks` missing: `missing_field`. `name` not text, or blank: `bad_field`. `checks` not a list, or empty: `bad_field`.
  - **A check:** not an object: `bad_field`. A key other than `date` and `amount`: `unknown_field`. Either missing: `missing_field`. `date` not a date: `bad_date`. `amount` not a number, or 0 or less: `bad_number`.
  - **A name used twice:** `investment_name_repeated`, new, at the second one's name, after its checks.
- **`distribution_from`:** not an object: `bad_field`. A key other than `investment` and `share`: `unknown_field`. `investment` missing: `missing_field`; not text, or blank: `bad_field`. `share` as a distribution's.
- **Against each other and D:**
  - A write-off after D: `cash_flow_after_distribution_date`, as any cash flow, among them in the input's order. Then a check after D: the same term, at the check.
  - Deal by deal without investments: `missing_field` at `investments`.
  - Each distribution and write-off, in the input's order:
    - deal by deal, a distribution naming no investment: `missing_field` at its `investment`
    - an investment not listed: `investment_unknown`, new, at its `investment`
    - dated before the investment's first check: `investment_not_made`, new, at the cash flow
  - `distribution_from`: deal by deal, missing: `missing_field`. An investment not listed: `investment_unknown` at `distribution_from.investment`.
  - The cost made by a check's date more than the investment calls up to that date: `investments_exceed_calls`, new, at the first such check's `amount`. Checks go in date order; on one date, in the investments' order, then the checks'.
- **The order of checks** is F28's five stages, with the investments in them, as F28 lists them.

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

Thirty-two cases and five sets of refusals, in `packages/fund/cases/` (FC2):

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
22. A friends-and-family class paying no fees and no carry, beside LPs on the fund's terms (20%, then 25% from 3x). Fee calls fall only on the LPs paying fees. A NAV (f03a).
23. An anchor class at a 1% fee and 10% carry, beside the fund's 2% and 20%, with an 8% pref and full catch-up. Each account reaches its pref and finishes its catch-up at its own X (f03a).
24. Example C with a friends-and-family class at no carry: the GP owes only the LPs on the fund's terms, each its share (f03a).
25. One later close with 8% interest, and a 2% GP commitment outside the equalization. The waterfall is as if every LP were in from the start (f03a). Worked again under F29 (f04a): Cedar owes $20,000 of back fees for the January 2021 fee call, and the LPs' paid-in is $7,060,000, not $7,040,000.
26. Two later closes, the second a friends-and-family LP paying no fees (f03a). Worked again under F29 (f04a): Birchwood owes $50,000 of back fees for the January 2022 fee call, and the LPs' paid-in is $5,300,000, not $5,250,000.
27. Twenty refusals on cases 22, 23 and 25, one or more for each new line of F28 (f03a).
28. Case 19 with Birchwood in a seed class at 15% carry: each class settles its own clawback, and the fund terms' reasons say the clawback is worked on their own totals (f03a review).
29. A fee schedule with no listed LPs: $40,000,000 of commitments, 2% a year called quarterly from 15 Feb 2021 and 1.5% from 15 Feb 2026, $4,225,000 in all. A 1% GP commitment, fee-free; an 8% pref with a full catch-up, so the pref runs on each fee call from its date (f04a).
30. Two LPs, fees called half-yearly, 2% stepping down to 1.5% on 1 Mar 2022, inside a half-year; a 2% GP commitment that pays fees; an 8% pref with a full catch-up; final. The fees called after the last distribution are paid-in the final distribution returns first, so at X = 0 the GP owes back $150,000 of carry (f04a).
31. Quarterly fees at 2%; an Anchor class at a 1% fee joining at a later close in the middle of a quarter, a friends-and-family class paying no fees, and an investment call before the close: back fees and capital equalization side by side (f04a).
32. Thirty-seven refusals on cases 29 to 31: each line of F32, and the order of checks where the schedule meets the other checks (f04a; the thirty-seventh, a schedule no listed LP pays, in the f04b review).
33. Case 34's fund on the whole fund, the default: three investments, a $9,000,000 exit from Alder Robotics, Birch Health written off, X from Cedar AI. The investments change no amount: the exit returns paid-in capital with no carry, and carry starts once the LPs have all $11,100,000 back, at X = $2,212,121.21. At $12,000,000 the GP has $1,938,000, all of it from X (f05a).
34. Deal by deal: three investments, $10,000,000 of cost, $1,200,000 of fees and a 1% GP commitment that's fee-free. Alder's exit returns the LPs' $2,970,000 of its cost and $360,000 of fees (its 30% of the cost made), then pays $1,116,000 of carry, two years before the whole fund would pay any. Birch Health is written off; X from Cedar AI realizes the rest, so $11,100,000 is due. At the NAV point, $12,000,000, the GP has $1,938,000 in all, what case 33 gives, so it owes nothing back (f05a).
35. Deal by deal, final, a 2% GP commitment: a 40% secondary sale of Dogwood Labs after a follow-on, Elm Bio's exit and a $1,000,000 escrow release from it after, Fir Payments written off, and Hazel Cloud still held, with a follow-on after Elm's exit that lowers the fees' share due to $6,800,139.13, under the $6,879,360 already back, so the escrow release is all profit. At X = 0 the GP owes back all $2,348,128 of its carry; X from Dogwood clears it at $18,376,163.27, where the LPs have all $24,888,000 back (f05a).
36. Deal by deal with classes, a later close and a quarterly 2% fee schedule: Alder Endowment on the fund's terms, Birch Family Office in an Anchor class (15% carry, 1% fee) joining at a later close, Cedar Holdings friends and family (no fee, no carry). At Ivy Analytics' exit a third of the cost made is realized: $2,130,000, $1,233,000 and $792,000 due by class. X sells half of Kapok Robotics, with breakpoints at $5,400,000, $5,841,919.19 and $6,283,838.38. Birch's equalization at its close: $2,376,000, $99,466.52 of interest and $45,000 of back fees (f05a).
37. Fifty-five refusals on cases 33, 34 and 36: each line of F37, and the order of checks where the investments meet the other checks (f05a).

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
- **2026-10-23 (Jordan), for spillpoint-fund 0.3.0:**
  - 0.3.0 covers both classes and later closes, in one release (F22 to F28)
  - LPs on different terms are named classes, each LP picking one (F22)
  - a fee break is a fee rate, against the fund's standard rate (F22)
  - the clawback settles per account: one class's surplus never offsets another's (F24)
  - a later-close LP's pref runs from the original calls, as if in from the start, with equalization interest to the LPs already in (F25)
  - equalization interest must be entered when there's a later close: nothing that moves money between LPs is assumed (F25)
- **2026-10-25 (Jordan), for spillpoint-fund 0.4.0:**
  - 0.4.0 is management fees: the page and README say where fees go, and a schedule works out the fee calls (F30)
  - 0.3.0's fee calls at a later close are fixed in 0.4.0 (F29), and noted as a known limitation on 0.3.0's GitHub release
  - the fee is on commitments, with rate steps by date; invested capital, gross or net, is later (F30)
  - a schedule no listed LP pays is refused, as an entered fee call nobody pays is, so no call is $0 and the LPs always pay something in (F32; f04b review)
- **2026-10-25, Claude's defaults settled with the spec:** the seven in F30, from quarterly calendar periods in advance to the GP commitment fee-free unless it pays fees
- **2026-10-27 (Jordan), for spillpoint-fund 0.5.0:**
  - 0.5.0 is investments and carry deal by deal, with the whole fund staying the default (F34)
  - before carry deal by deal: the cost of the investments exited or written off, with fees and expenses (F35)
  - fees and expenses: their share, by cost (F35)
  - a final clawback only; escrow and interim clawbacks are later (F35)
  - partial exits: the share sold, 100% by default (F33)
- **2026-10-27, Claude's defaults settled with the spec:**
  - no pref deal by deal in 0.5.0: refused, not guessed; VC funds mostly have none (F35, F37)
  - the share sold is of what's left at that moment, and follow-ons add to what's left (F33)
  - an escrow release, a distribution from an investment with nothing left, realizes nothing more, so beyond what's due it's profit (F33)
  - the fees' share is realized over made at the distribution; it can fall when a new investment is made, and nothing already returned is taken back (F35)
  - on one date: calls, then checks, then write-offs, then distributions (F4, F33)
  - every distribution names an investment deal by deal; a distribution of unused capital is later (F35)
  - the cost made can't run ahead of the investment calls; funding from a credit line is later (F37)
  - the end: a final X and the NAV point realize everything left, so an investment still held counts as written off (F33)
  - carry steps keep F10's LP multiple on all paid-in (F34)
  - the clawback at the end is the whole fund's (F12), so both bases end at the same entitlement (F35)
- **2026-10-29 (Jordan), the f05a review:**
  - at the end, a final X and the NAV point, all the LPs' paid-in is due deal by deal, capital called and never invested included, so no final clawback rises (F35, FA49)
  - each investment's realized multiple, proceeds over the cost realized, in the engine's outputs (F36, FA59)
  - `expected.json`'s investments and what's due as proposed (FC15)
  - where several checks on one date run past the calls, the first of them is named (FA53)
