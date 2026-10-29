# Fund case 37, the deals refused: derivation

Fifty-five small changes, one or more for each line of F37 and for the order of checks where the investments meet the other checks, each to a base case named in its fixture (FC16). Each change leaves the problem it's about first in the order of checks, so each result is one refusal: its kind, its term, and the field, as a path into the input. The changes and the refusals they should give are Jordan's; each fixture's `about` sentence says what's changed.

**The bases:**
- **Case 34,** deal by deal with no listed LPs: most of them. Its cash flows are five calls (`cash_flows[0]` to `[4]`), Alder Robotics' exit (`cash_flows[5]`) and Birch Health's write-off (`cash_flows[6]`); its investments Alder Robotics, Birch Health and Cedar AI; X from Cedar AI; D 2024-06-30.
- **Case 33,** the same fund on the whole fund: a share without an investment, and an investment not listed, on the whole fund.
- **Case 36,** deal by deal with classes, a later close and a schedule: `carry_basis` after the classes, an investment not listed before an LP's unknown class, and the equalization rate.

**The order of checks** (F28, with the investments in it, F37):
1. **Unsupported terms,** in the file's order, then a compounding that isn't simple, then `deal_by_deal_pref`. `carry_basis` is a term.
2. **The fields.** Within `terms`, `carry_basis` after the classes. Each cash flow: its unknown fields (an `investment` or `share` on a call among them), the fields it needs (`amount` not for a write-off), the date, the type, a call's kind, a write-off's own fields, the `investment`, the `share`, then the amount. After `nav`: the investments in order, each with its fields, its checks in order, then its name against the ones before; then `distribution_from`.
3. **The cash flows:** 0.4.0's checks, write-offs among the cash flows after D. Then: a check after D; deal by deal, the investments missing; each distribution and write-off in the input's order (deal by deal, its investment missing; its investment not listed; before its investment's first check); `distribution_from` (deal by deal, missing; its investment not listed); then the cost made against the investment calls.
4. **The LPs.**
5. **What the LPs need of the rest.**

The new terms are `deal_by_deal_pref` (unsupported) and the input terms `investment_name_repeated`, `investment_unknown`, `investment_not_made` and `investments_exceed_calls` (F18, F37). A write-off is a new cash flow type.

| Fixture | Base | Change | Kind | Term | Field | Why |
|---|---|---|---|---|---|---|
| `deal-by-deal-with-pref` | 34 | `terms.pref` = `{"rate": "0.08"}` | unsupported | `deal_by_deal_pref` | `terms.pref` | No pref deal by deal in 0.5.0, so it's refused as unsupported, not guessed (F35, F37). Last in stage 1. |
| `deal-by-deal-compounded-pref` | 34 | `terms.pref` = `{"rate": "0.08", "compounding": "annual"}` | unsupported | `compounded_pref` | `terms.pref.compounding` | A compounding that isn't simple comes before `deal_by_deal_pref` in stage 1. |
| `deal-by-deal-pref-and-a-term-not-modeled` | 34 | `terms.pref` = `{"rate": "0.08"}`; `terms.hurdle_irr` = `"0.1"` | unsupported | `hurdle_irr` | `terms.hurdle_irr` | A key under `terms` v1 doesn't model comes before `deal_by_deal_pref` in stage 1. |
| `carry-basis-unknown` | 34 | `terms.carry_basis` = `"american"` | input | `bad_field` | `terms.carry_basis` | `carry_basis` is `"whole_fund"` or `"deal_by_deal"` (F37, stage 2). |
| `carry-basis-not-text` | 34 | `terms.carry_basis` = `1` | input | `bad_field` | `terms.carry_basis` | Not text, so not one of the two. |
| `carry-basis-after-the-classes` | 36 | `terms.carry_basis` = `"European"`; `terms.lp_classes[0].name` = `" "` | input | `bad_field` | `terms.lp_classes[0].name` | Within `terms`, `carry_basis` comes after the classes (stage 2), and a blank class name is `bad_field` (F28). |
| `investment-on-a-call` | 34 | `cash_flows[0].investment` = `"Alder Robotics"` | input | `unknown_field` | `cash_flows[0].investment` | A call has no investment (F37): an unknown field, in the first place a cash flow's checks look (stage 2). |
| `call-unknown-fields-in-order` | 34 | `cash_flows[0].note` = `"first close"`; `cash_flows[0].investment` = `"Alder Robotics"` | input | `unknown_field` | `cash_flows[0].note` | A call's investment is among its unknown fields, in the file's order (FA53). |
| `write-off-with-an-amount` | 34 | `cash_flows[6].amount` = `"0"` | input | `unknown_field` | `cash_flows[6].amount` | A write-off has no amount: it ends all that's left (F33). Checked as a write-off's own field, before the amount would be read (FA53). |
| `write-off-with-a-share` | 34 | `cash_flows[6].share` = `"0.5"` | input | `unknown_field` | `cash_flows[6].share` | A write-off has no share: it ends all that's left of its investment. |
| `write-off-without-investment` | 34 | `cash_flows[6].investment` removed | input | `missing_field` | `cash_flows[6].investment` | A write-off needs its investment. |
| `share-above-one` | 34 | `cash_flows[5].share` = `"1.5"` | input | `bad_number` | `cash_flows[5].share` | A share sold is above 0 and at most 1 (F33). |
| `share-zero` | 34 | `cash_flows[5].share` = `"0"` | input | `bad_number` | `cash_flows[5].share` | A share of 0 sells nothing. |
| `share-percent` | 34 | `cash_flows[5].share` = `"40%"` | input | `bad_number` | `cash_flows[5].share` | "40%" isn't an exact number (FC1). |
| `share-without-investment` | 33 | `cash_flows[5].share` = `"0.5"`; `cash_flows[5].investment` removed | input | `missing_field` | `cash_flows[5].investment` | A share is of an investment, so without one the investment is missing, on the whole fund too (F37). |
| `flow-investment-not-text` | 34 | `cash_flows[5].investment` = `7` | input | `bad_field` | `cash_flows[5].investment` | An investment is named by text. |
| `flow-investment-blank` | 34 | `cash_flows[5].investment` = `""` | input | `bad_field` | `cash_flows[5].investment` | An empty name is blank (FA52). |
| `investments-not-a-list` | 34 | `investments` = `{"name": "Alder Robotics"}` | input | `bad_field` | `investments` | `investments` is a list (F37, stage 2, after `nav`). |
| `investment-not-an-object` | 34 | `investments[1]` = `"Birch Health"` | input | `bad_field` | `investments[1]` | Each investment is an object. |
| `investment-unknown-key` | 34 | `investments[0].sector` = `"robotics"` | input | `unknown_field` | `investments[0].sector` | An investment has a `name` and `checks` and nothing else. |
| `investment-name-missing` | 34 | `investments[0].name` removed | input | `missing_field` | `investments[0].name` | An investment needs its name. |
| `investment-name-blank` | 34 | `investments[2].name` = `" "` | input | `bad_field` | `investments[2].name` | A single space is blank (FA52). |
| `investment-checks-missing` | 34 | `investments[1].checks` removed | input | `missing_field` | `investments[1].checks` | An investment needs its checks. |
| `investment-checks-empty` | 34 | `investments[1].checks` = `[]` | input | `bad_field` | `investments[1].checks` | An investment has one check or more (F33). |
| `check-not-an-object` | 34 | `investments[0].checks[0]` = `"3000000"` | input | `bad_field` | `investments[0].checks[0]` | Each check is an object, with a date and an amount. |
| `check-unknown-key` | 34 | `investments[0].checks[0].shares` = `"1000000"` | input | `unknown_field` | `investments[0].checks[0].shares` | A check has a `date` and an `amount` and nothing else. |
| `check-date-not-a-date` | 34 | `investments[0].checks[0].date` = `"2020-02-30"` | input | `bad_date` | `investments[0].checks[0].date` | 30 February 2020 isn't on the calendar. |
| `check-amount-zero` | 34 | `investments[0].checks[0].amount` = `"0"` | input | `bad_number` | `investments[0].checks[0].amount` | A check is an amount above 0 (F33). |
| `check-amount-missing` | 34 | `investments[2].checks[0].amount` removed | input | `missing_field` | `investments[2].checks[0].amount` | A check needs its amount. |
| `investment-name-repeated` | 34 | `investments[2].name` = `"Alder Robotics"` | input | `investment_name_repeated` | `investments[2].name` | No two investments share a name (F33). Refused at the second one's name (new). |
| `investment-name-repeated-after-its-checks` | 34 | `investments[2].name` = `"Alder Robotics"`; `investments[2].checks[0].amount` = `"-1"` | input | `bad_number` | `investments[2].checks[0].amount` | An investment's checks are checked before its name repeating (F37): the -1 comes first. |
| `distribution-from-not-an-object` | 34 | `distribution_from` = `"Cedar AI"` | input | `bad_field` | `distribution_from` | `distribution_from` is an object: X's investment and its share. |
| `distribution-from-unknown-key` | 34 | `distribution_from.amount` = `"1000"` | input | `unknown_field` | `distribution_from.amount` | `distribution_from` has an `investment` and a `share` and nothing else. |
| `distribution-from-share-above-one` | 34 | `distribution_from.share` = `"2"` | input | `bad_number` | `distribution_from.share` | X's share is a share sold's: above 0 and at most 1. |
| `distribution-from-without-investment` | 34 | `distribution_from` = `{"share": "0.5"}` | input | `missing_field` | `distribution_from.investment` | `distribution_from` needs its investment. |
| `investments-before-distribution-from` | 34 | `distribution_from` = `5`; `investments[0].name` = `5` | input | `bad_field` | `investments[0].name` | Stage 2 checks the investments, then `distribution_from`. |
| `write-off-after-distribution-date` | 34 | `cash_flows[6].date` = `"2024-07-01"` | input | `cash_flow_after_distribution_date` | `cash_flows[6]` | D must be on or after every cash flow, a write-off among them, in the input's order (F4, F37, stage 3). |
| `check-after-distribution-date` | 34 | `investments[2].checks[0].date` = `"2024-07-01"` | input | `cash_flow_after_distribution_date` | `investments[2].checks[0]` | D must be on or after every check too (F4, F37), refused at the check. |
| `deal-by-deal-without-investments` | 34 | `investments` removed | input | `missing_field` | `investments` | Deal by deal needs the fund's investments (F35): stage 3, after D's checks. |
| `deal-by-deal-distribution-without-investment` | 34 | `cash_flows[5].investment` removed | input | `missing_field` | `cash_flows[5].investment` | Deal by deal, every distribution names an investment; a distribution of unused capital is later (F35). |
| `investment-unknown` | 34 | `cash_flows[5].investment` = `"Alder"` | input | `investment_unknown` | `cash_flows[5].investment` | "Alder" isn't "Alder Robotics": names compare exactly as written (FA52). An investment not listed (new). |
| `write-off-investment-unknown` | 34 | `cash_flows[6].investment` = `"Birch"` | input | `investment_unknown` | `cash_flows[6].investment` | A write-off's investment must be listed too. |
| `whole-fund-investment-unknown` | 33 | `cash_flows[5].investment` = `"Zeta"` | input | `investment_unknown` | `cash_flows[5].investment` | On the whole fund the tags are optional, but one given must name a listed investment (FA55). |
| `distribution-before-its-investment` | 34 | `cash_flows[5].date` = `"2020-01-20"` | input | `investment_not_made` | `cash_flows[5]` | A distribution from an investment before its first check (new). After the first call, so not `distribution_before_call`. |
| `write-off-before-its-investment` | 34 | `cash_flows[6].date` = `"2020-02-15"` | input | `investment_not_made` | `cash_flows[6]` | A write-off before its investment's first check. |
| `deal-by-deal-distribution-from-missing` | 34 | `distribution_from` removed | input | `missing_field` | `distribution_from` | Deal by deal, X needs its source: what's due on X depends on what it realizes (F35). |
| `distribution-from-investment-unknown` | 34 | `distribution_from.investment` = `"Dogwood"` | input | `investment_unknown` | `distribution_from.investment` | X's investment must be listed. |
| `investments-exceed-calls` | 34 | `investments[2].checks[0].amount` = `"4500000"` | input | `investments_exceed_calls` | `investments[2].checks[0].amount` | A check can't be paid before its money is called: the cost made by a check's date can't be more than the investment calls up to then (F37, new). Refused at the check's amount. |
| `check-before-any-call` | 34 | `investments[1].checks[0].date` = `"2020-01-10"` | input | `investments_exceed_calls` | `investments[1].checks[0].amount` | By 10 January 2020 nothing had been called, so a $3,000,000 check is more than the calls. |
| `check-after-d-before-unknown-investment` | 34 | `investments[2].checks[0].date` = `"2025-01-01"`; `cash_flows[5].investment` = `"Zeta"` | input | `cash_flow_after_distribution_date` | `investments[2].checks[0]` | In stage 3 a check after D comes before each cash flow's investment. |
| `flow-after-d-before-investment-checks` | 34 | `cash_flows[5].date` = `"2024-07-01"`; `cash_flows[5].investment` = `"Zeta"` | input | `cash_flow_after_distribution_date` | `cash_flows[5]` | 0.4.0's checks against D come before F37's, so the flow after D is named, not its unknown investment. |
| `unknown-investment-before-not-made` | 34 | `cash_flows[5].date` = `"2020-01-20"`; `cash_flows[6].investment` = `"Zeta"` | input | `investment_not_made` | `cash_flows[5]` | Each distribution and write-off in the input's order, each checked through before the next: the exit, `cash_flows[5]`, before the write-off, `cash_flows[6]`. |
| `unknown-investment-before-exceed-calls` | 34 | `cash_flows[5].investment` = `"Zeta"`; `investments[2].checks[0].amount` = `"4500000"` | input | `investment_unknown` | `cash_flows[5].investment` | Each cash flow's investment comes before the cost made against the calls. |
| `investment-unknown-before-lp-class-unknown` | 36 | `lps[1].class` = `"Anchors"`; `cash_flows[2].investment` = `"Zeta"` | input | `investment_unknown` | `cash_flows[2].investment` | The investments are stage 3; the LPs' classes are stage 4. |
| `deal-by-deal-later-close-without-rate` | 36 | `terms.equalization_rate` removed | input | `missing_field` | `terms.equalization_rate` | Deal by deal changes nothing in stage 5: the 2021-01-05 investment call comes before Birch Family Office's close, so the equalization rate is needed (F29). |

**Where a change adds a key to an object** (`terms.pref` on case 34, a cash flow's `share` or `note`, an investment's `sector`, a check's `shares`, `distribution_from.amount`), it's added at the object's end, after the keys already there, so a cash flow's unknown fields are named in that order: `call-unknown-fields-in-order` adds the note before the investment.
