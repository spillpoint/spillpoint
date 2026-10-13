# Fund case 14, refused: derivation

One small change to case 6's inputs for each refusal F18 names, fifteen in all. Each change leaves one problem, so each result is one refusal: its kind, its term, and the field, as a path into the inputs.

**Two kinds of refusal:**
- **Unsupported:** the fund may well have the term; v1 doesn't model it.
- **Input:** the inputs are wrong, or disagree with each other, so there's no fund to run.

**The order of checks** (FA2) decides which refusal comes when a change could trip two, each stage stopping at the first problem:
1. unsupported terms
2. the fields, in the order the spec lists them, the terms against each other last among the terms
3. the cash flows against each other and against D

**The base, case 6:**
- carry 20%, an 8% pref and a full catch-up
- one $10,000,000 investment call on 2020-01-01
- D = `as_of` = 2025-01-01

## Unsupported terms (F7, F18)

| Fixture | The change | Refused |
|---|---|---|
| `unknown-term` | `terms.hurdle_irr` set to "0.08" | unsupported, `hurdle_irr`, `terms.hurdle_irr` |
| `compounded-pref` | `terms.pref.compounding` set to "annual" | unsupported, `compounded_pref`, `terms.pref.compounding` |

- **`unknown-term`:** an IRR hurdle isn't one of the four terms, so it's named by its own key.
- **`compounded-pref`:** `compounding` is a key the pref has, but only "simple" is modeled (F7).

## The terms (F3, F8, F9)

| Fixture | The change | Refused |
|---|---|---|
| `carry-rate-one` | `terms.carry` set to "1" | input, `carry_rate_not_below_one`, `terms.carry` |
| `steps-rates-fall` | carry steps of 25%, then 20% from 3x | input, `steps_out_of_order`, `terms.carry.steps[1]` |
| `steps-multiple-one` | carry steps of 20%, then 25% from 1x | input, `steps_out_of_order`, `terms.carry.steps[1]` |
| `gp-commitment-whole` | `terms.gp_commitment` set to a share of "1" | input, `gp_commitment_not_below_one`, `terms.gp_commitment.share` |
| `catch-up-without-pref` | `terms.pref` removed | input, `catch_up_without_pref`, `terms.catch_up` |
| `catch-up-share-at-carry` | `terms.catch_up.gp_share` set to "0.2" | input, `catch_up_share_not_above_carry`, `terms.catch_up.gp_share` |

- **`carry-rate-one`:** carry of 100% is refused (F9). The full catch-up, s = 1, is now not above the carry rate either. But the carry is checked before the terms are checked against each other (FA2), so this refusal is the carry's.
- **`steps-rates-fall`:** the second step's rate is below the first's. The path names the step that breaks the order, not its rate.
- **`steps-multiple-one`:** a step's multiple must be above 1 (F9), so a step from 1x is out of order.
- **`gp-commitment-whole`:** a GP commitment of 100% would leave the LPs paying only fees. F18 refuses a share of 1 or more.
- **`catch-up-without-pref`:** with no pref, a catch-up has no hurdle to catch up to (F8). The path is the catch-up, the term that can't stand.
- **`catch-up-share-at-carry`:** at 20%, the GP's share of each catch-up dollar equals the carry rate, so the gap never closes (F8). It must be above the carry rate.

## The cash flows (F4, F18)

| Fixture | The change | Refused |
|---|---|---|
| `negative-amount` | the call's amount set to "-5" | input, `bad_number`, `cash_flows[0].amount` |
| `amount-not-a-string` | the call's amount set to the JSON number 5000 | input, `bad_number`, `cash_flows[0].amount` |
| `bad-date` | the call dated "2020-02-30" | input, `bad_date`, `cash_flows[0].date` |
| `bad-kind` | the call's kind set to "carry" | input, `bad_field`, `cash_flows[0].kind` |
| `no-calls` | the cash flows replaced by one $1 distribution | input, `no_calls`, `cash_flows` |
| `distribution-first` | a $1 distribution on 2019-12-31, listed before the call | input, `distribution_before_call`, `cash_flows[0]` |
| `flow-after-d` | `distribution_date` set to 2019-06-30 | input, `cash_flow_after_distribution_date`, `cash_flows[0]` |

- **`negative-amount`:** an amount must be more than zero.
- **`amount-not-a-string`:** numbers are exact strings, so the JSON number 5000 is refused although its value is fine.
- **`bad-date`:** 30 February doesn't exist, though the date has the right shape.
- **`bad-kind`:** a call is an investment, a fee or an expense.
- **`no-calls`:** a fund with nothing called has no capital to return (F4).
- **`distribution-first`:** F4 refuses a distribution before the first call. The flows are listed out of date order, which is allowed (FA12). The path is the distribution's place in the list as given, `cash_flows[0]`.
- **`flow-after-d`:** D must be on or after every cash flow (F4). The call on 2020-01-01 is after D. The refusal names the first flow in the list that breaks the rule.
