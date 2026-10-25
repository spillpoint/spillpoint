# Fund case 32, the fees refused: derivation

Thirty-six small changes, one or more for each line of F32 and for the order of checks where the schedule meets the other checks, each to a base case named in its fixture (FC14). Each change leaves the problem it's about first in the order of checks, so each result is one refusal: its kind, its term, and the field, as a path into the input. The changes and the refusals they should give are Jordan's; each fixture's `about` sentence says what's changed.

**The bases:**
- **Case 29,** no listed LPs: the schedule's shape, `start`, `frequency`, `steps`, each step's `rate` and `from`, and `commitments` without LPs.
- **Case 30,** two LPs, half-yearly, with a step: the steps' order, an entered fee call beside the schedule, and `commitments` against the LPs' total.
- **Case 31,** classes and a later close: `fee_rate` beside the schedule, a class's fee rate with no fee terms, and the equalization rate.

**The order of checks** (F28, with the schedule in it, F32):
1. **Unsupported terms,** in the file's order: the schedule's keys among each term's own keys, its steps' keys at the steps' place among them.
2. **The fields.** Within `terms`, after `fee_rate` and `equalization_rate`: the schedule (its shape, `start`, `frequency`, `steps` in order, each its shape, its rate, then its `from`, then `commitments`); then `fee_rate_with_schedule`; then the classes. Then each cash flow's own fields.
3. **The cash flows:** first `fee_call_with_schedule`, at the first such call in the input's order; then F18's checks against each other and D, the schedule's calls among the calls.
4. **The LPs.**
5. **What the LPs need of the rest:** `equalization_rate` when an investment or expense call comes before a later close (F29); the schedule's `commitments`, missing without listed LPs or not their total; then each entered call for its payers.

The new input terms are `fee_rate_with_schedule`, `fee_call_with_schedule` and `fee_commitments_mismatch` (F18, F32).

| Fixture | Base | Change | Kind | Term | Field | Why |
|---|---|---|---|---|---|---|
| `fee-schedule-not-an-object` | 29 | `terms.management_fee` = `"0.02"` | input | `bad_field` | `terms.management_fee` | The schedule isn't an object (F32, stage 2). |
| `fee-schedule-offset` | 29 | `terms.management_fee.offset` = `"0.5"` | unsupported | `offset` | `terms.management_fee.offset` | A key a schedule doesn't have: unsupported, named by the key (stage 1). |
| `fee-step-basis` | 29 | `terms.management_fee.steps[1].basis` = `"invested_capital"` | unsupported | `basis` | `terms.management_fee.steps[1].basis` | A key a step doesn't have, found among the schedule's keys at the steps' place (stage 1). |
| `fee-start-missing` | 29 | `terms.management_fee.start` removed | input | `missing_field` | `terms.management_fee.start` | `start` is needed (stage 2). |
| `fee-start-not-a-date` | 29 | `terms.management_fee.start` = `"2021-02-30"` | input | `bad_date` | `terms.management_fee.start` | 30 February 2021 isn't on the calendar. |
| `fee-frequency-monthly` | 29 | `terms.management_fee.frequency` = `"monthly"` | input | `bad_field` | `terms.management_fee.frequency` | Not one of quarterly, semiannual or annual. |
| `fee-steps-missing` | 29 | `terms.management_fee.steps` removed | input | `missing_field` | `terms.management_fee.steps` | `steps` is needed. |
| `fee-steps-not-a-list` | 29 | `terms.management_fee.steps` = `{"rate": "0.02"}` | input | `bad_field` | `terms.management_fee.steps` | One step, not a list. |
| `fee-steps-empty` | 29 | `terms.management_fee.steps` = `[]` | input | `bad_field` | `terms.management_fee.steps` | A list with no step. |
| `fee-step-not-an-object` | 29 | `terms.management_fee.steps[0]` = `"0.02"` | input | `bad_field` | `terms.management_fee.steps[0]` | A step isn't an object. |
| `fee-step-rate-missing` | 29 | `terms.management_fee.steps[1].rate` removed | input | `missing_field` | `terms.management_fee.steps[1].rate` | A step's rate is needed. |
| `fee-step-rate-not-a-number` | 29 | `terms.management_fee.steps[0].rate` = `"2%"` | input | `bad_number` | `terms.management_fee.steps[0].rate` | "2%" isn't an exact number (FC1). |
| `fee-step-rate-negative` | 29 | `terms.management_fee.steps[1].rate` = `"-0.005"` | input | `bad_number` | `terms.management_fee.steps[1].rate` | A rate below 0. |
| `fee-step-rate-one` | 29 | `terms.management_fee.steps[0].rate` = `"1"` | input | `bad_number` | `terms.management_fee.steps[0].rate` | A rate of 1 or more. |
| `fee-first-rate-zero` | 29 | `terms.management_fee.steps[0].rate` = `"0"` | input | `bad_number` | `terms.management_fee.steps[0].rate` | The first rate must be above 0: a fee holiday is a later `start`. |
| `fee-first-step-from` | 29 | `terms.management_fee.steps[0].from` = `"2021-02-15"` | input | `steps_out_of_order` | `terms.management_fee.steps[0]` | The first step is in force from `start`, so it isn't given a date: refused at the step. |
| `fee-step-from-missing` | 29 | `terms.management_fee.steps[1].from` removed | input | `missing_field` | `terms.management_fee.steps[1].from` | A later step needs the date it's in force from. |
| `fee-step-from-not-a-date` | 29 | `terms.management_fee.steps[1].from` = `"15/02/2026"` | input | `bad_date` | `terms.management_fee.steps[1].from` | "15/02/2026" isn't an ISO date. |
| `fee-step-from-at-start` | 30 | `terms.management_fee.steps[1].from` = `"2020-07-01"` | input | `steps_out_of_order` | `terms.management_fee.steps[1]` | Case 30's second step dated on `start`, 2020-07-01: not after the first step, whose date is `start`. |
| `fee-steps-out-of-order` | 30 | `terms.management_fee.steps[2]` = `{"rate": "0.01", "from": "2021-06-30"}` | input | `steps_out_of_order` | `terms.management_fee.steps[2]` | A third step dated 2021-06-30, before the second's 2022-03-01: refused at the third. |
| `fee-commitments-zero` | 29 | `terms.management_fee.commitments` = `"0"` | input | `bad_number` | `terms.management_fee.commitments` | Commitments of 0. |
| `fee-commitments-not-a-number` | 29 | `terms.management_fee.commitments` = `"40m"` | input | `bad_number` | `terms.management_fee.commitments` | "40m" isn't an exact number. |
| `fee-rate-with-schedule` | 31 | `terms.fee_rate` = `"0.02"` | input | `fee_rate_with_schedule` | `terms.fee_rate` | With a schedule its first rate is the fund's, so `fee_rate` isn't given (F32, new). |
| `class-fee-rate-without-fee-terms` | 31 | `terms.management_fee` removed | input | `missing_field` | `terms.fee_rate` | Anchor's 1% has neither `fee_rate` nor a schedule to be set against (F28, widened by F32). |
| `fee-call-with-schedule` | 30 | `cash_flows[4]` = `{"date": "2021-01-01", "type": "call", "kind": "fee", "amount": "250000"}` | input | `fee_call_with_schedule` | `cash_flows[4]` | An entered fee call beside a schedule would count fees twice (stage 3, new). |
| `distribution-before-schedule` | 29 | `cash_flows[5]` = `{"date": "2021-01-31", "type": "distribution", "amount": "1000000"}` | input | `distribution_before_call` | `cash_flows[5]` | The schedule's first call, 2021-02-15, is the fund's first call, so a distribution before it is before any call (F4, F30). It's named by its place in the list. |
| `fee-commitments-missing` | 29 | `terms.management_fee.commitments` removed | input | `missing_field` | `terms.management_fee.commitments` | Case 29 lists no LPs, so the schedule needs `commitments` (stage 5). |
| `fee-commitments-not-the-lps-total` | 30 | `terms.management_fee.commitments` = `"24000000"` | input | `fee_commitments_mismatch` | `terms.management_fee.commitments` | Case 30's LPs commit $25,000,000 (stage 5, new). |
| `later-close-without-rate` | 31 | `terms.equalization_rate` removed | input | `missing_field` | `terms.equalization_rate` | The 2022-02-01 investment call comes before Dogwood's close, so the rate is needed (F29, stage 5). |
| `order-unsupported-before-fields` | 29 | `terms.management_fee.offset` = `"0.5"`; `terms.management_fee.start` removed | unsupported | `offset` | `terms.management_fee.offset` | Stage 1 comes before stage 2: the offset before the missing start. |
| `order-schedule-before-fee-rate` | 31 | `terms.fee_rate` = `"0.02"`; `terms.management_fee.frequency` = `"monthly"` | input | `bad_field` | `terms.management_fee.frequency` | Within `terms`, the schedule's own fields come before `fee_rate_with_schedule`. |
| `order-fee-rate-before-classes` | 31 | `terms.fee_rate` = `"0.02"`; `terms.lp_classes[0].fee_rate` = `"-0.01"` | input | `fee_rate_with_schedule` | `terms.fee_rate` | `fee_rate_with_schedule` comes before the classes, and Anchor's fee rate below 0. |
| `order-fee-call-first-in-cash-flows` | 29 | `cash_flows[5]` = `{"date": "2027-01-01", "type": "call", "kind": "fee", "amount": "200000"}` | input | `fee_call_with_schedule` | `cash_flows[5]` | Stage 3 starts with `fee_call_with_schedule`, before the call is checked against D, 2026-06-30. |
| `order-fee-call-before-lps` | 30 | `cash_flows[4]` = `{"date": "2021-01-01", "type": "call", "kind": "fee", "amount": "250000"}`; `lps[1].commitment` = `"-1"` | input | `fee_call_with_schedule` | `cash_flows[4]` | Stage 3 comes before stage 4, Birchwood's commitment below 0. |
| `order-rate-before-commitments` | 31 | `terms.management_fee.commitments` = `"1"`; `terms.equalization_rate` removed | input | `missing_field` | `terms.equalization_rate` | In stage 5 the equalization rate comes before the schedule's commitments. |
| `order-commitments-after-lps` | 30 | `terms.management_fee.commitments` = `"24000000"`; `lps[1].close` = `"not a date"` | input | `bad_date` | `lps[1].close` | Stage 4 comes before stage 5: Birchwood's close, then the commitments. |

**Where a change adds to a list** (`terms.management_fee.steps[2]` on case 30's two steps, `cash_flows[4]` on case 30's four flows and `cash_flows[5]` on case 29's five), it adds the value at the list's end, as FC12 has `set` do.

Every refusal here is the one `cases-fees.json` gives, kind, term and path.
