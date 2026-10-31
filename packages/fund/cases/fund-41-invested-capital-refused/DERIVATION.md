# Fund case 41, fees on invested capital refused: derivation

Fifteen small changes, one or more for each line of F40 and where they meet 0.4.0's and 0.5.0's checks, each to a base case named in its fixture (FC17). Each change leaves the problem it's about first in the order of checks, so each result is one refusal: its kind, its term, and the field, as a path into the input. The changes and the refusals they should give are Jordan's; each fixture's `about` sentence says what's changed.

**The bases:**
- **Case 38,** no listed LPs, quarterly, a first step on commitments and a second, `steps[1]`, on invested capital from 2023-01-01, with `commitments` of $20,000,000. Its cash flows are three investment calls (`cash_flows[0]` to `[2]`), Alder Robotics' exit (`cash_flows[3]`) and Birch Health's write-off (`cash_flows[4]`); `cash_flows[5]` adds a sixth (FC12). Its investments are four, and X comes from Cedar AI.
- **Case 40,** the SPV: one step, `steps[0]`, on invested capital, no `commitments`, one investment, Larch Bio.
- **Case 39,** three listed LPs in two classes and the fund's terms, `lps[1]` Birch Family Office in Anchor, deal by deal, with a first step on commitments and a second on invested capital.

**The order of checks** (F28, with a step's basis and the investments it needs in it, F40):
1. **Unsupported terms:** a step's keys are `rate`, `from` and `basis`.
2. **The fields:** each step, its shape, its rate, its basis, then its `from`; `fee_rate` with a schedule after the schedule. After `distribution_from`, a step on invested capital without investments.
3. **The cash flows:** as 0.5.0, `fee_call_with_schedule` first. The schedule's periods count by date (F39).
4. **The LPs,** as F28 has them.
5. **What the LPs need of the rest:** `commitments` missing without LPs, only with a step on commitments; `commitments` not the LPs' total; a schedule no listed LP pays.

No new term: a step's `basis` is read from 0.6.0, so a bad one is `bad_field`, no longer unsupported, and a step on invested capital without investments is `missing_field`, as F37 has deal by deal without them.

| Fixture | Base | Change | Kind | Term | Field | Why |
|---|---|---|---|---|---|---|
| `fee-basis-unknown` | 38 | `terms.management_fee.steps[1].basis` = `"invested"` | input | `bad_field` | `terms.management_fee.steps[1].basis` | A step's basis is `"commitments"` or `"invested_capital"` (F40), checked in stage 2. |
| `fee-basis-not-text` | 38 | `terms.management_fee.steps[1].basis` = `1` | input | `bad_field` | `terms.management_fee.steps[1].basis` | Not text, so not one of the two words. |
| `fee-basis-capitalized` | 38 | `terms.management_fee.steps[1].basis` = `"Invested_Capital"` | input | `bad_field` | `terms.management_fee.steps[1].basis` | The word is compared exactly as written, as `frequency` is (FA63). |
| `fee-basis-before-from` | 38 | `terms.management_fee.steps[1].basis` = `"net"`; `terms.management_fee.steps[1].from` = `"2023-13-01"` | input | `bad_field` | `terms.management_fee.steps[1].basis` | Within a step, its basis comes before its `from` (stage 2), so the bad basis is named, not 2023-13-01, which isn't on the calendar. |
| `fee-rate-before-basis` | 38 | `terms.management_fee.steps[1].basis` = `"net"`; `terms.management_fee.steps[1].rate` = `"-0.01"` | input | `bad_number` | `terms.management_fee.steps[1].rate` | Within a step, its rate comes before its basis: a rate below 0 is `bad_number` (F32). |
| `fee-basis-on-the-first-step-bad` | 40 | `terms.management_fee.steps[0].basis` = `"committed"` | input | `bad_field` | `terms.management_fee.steps[0].basis` | The first step has a basis too. "committed" isn't one of the two words. |
| `fee-step-key-still-unsupported` | 38 | `terms.management_fee.steps[1].offset` = `"0.5"` | unsupported | `offset` | `terms.management_fee.steps[1].offset` | A step's keys are `rate`, `from` and `basis`; any other is still a term the schedule doesn't model, named by its key (F40, stage 1). |
| `fee-on-invested-capital-without-investments` | 38 | `investments` removed; `distribution_from` removed | input | `missing_field` | `investments` | A step on invested capital needs the fund's investments (F40), checked last in stage 2, after `distribution_from`. The exit and the write-off still name investments, which stage 3 would refuse as `investment_unknown`; stage 2 comes first. |
| `fee-on-invested-capital-empty-investments` | 40 | `investments` = `[]`; `distribution_from` removed | input | `missing_field` | `investments` | An empty list is none (FA52), so the SPV's one step, on invested capital, has nothing to charge. |
| `fee-on-invested-capital-investments-before-fee-call` | 38 | `cash_flows[5]` = `{"date": "2021-01-01", "type": "call", "kind": "fee", "amount": "100000"}`; `investments` removed; `distribution_from` removed | input | `missing_field` | `investments` | The investments are missed at the end of stage 2. An entered fee call beside a schedule, `fee_call_with_schedule`, is stage 3's first check. |
| `fee-on-invested-capital-investments-before-lps` | 39 | `lps[1].class` = `"Anchors"`; `terms.carry_basis` = `"whole_fund"`; `investments` removed | input | `missing_field` | `investments` | The investments are missed in stage 2. Birch's class, "Anchors", isn't one the terms have, `lp_class_unknown`, in stage 4. On the whole fund, so F37's deal by deal without investments doesn't come into it. |
| `fee-mixed-without-commitments` | 38 | `terms.management_fee.commitments` removed | input | `missing_field` | `terms.management_fee.commitments` | Case 38 lists no LPs and its first step is on commitments, so the schedule needs `commitments` (F40), in stage 5. |
| `fee-commitments-mismatch-on-invested-capital` | 39 | `terms.management_fee.commitments` = `"21000000"` | input | `fee_commitments_mismatch` | `terms.management_fee.commitments` | With listed LPs, `commitments` given must be their total, $20,000,000, whatever the steps' basis (F32, stage 5). |
| `fee-invested-capital-with-fee-rate` | 39 | `terms.fee_rate` = `"0.02"` | input | `fee_rate_with_schedule` | `terms.fee_rate` | With a schedule the fund's rate is its first step's, so `fee_rate` isn't given, on either basis (F32, stage 2). |
| `fee-invested-capital-nobody-pays` | 39 | `lps[0].class` = `"Friends and family"`; `lps[1].class` = `"Friends and family"` | input | `call_without_payers` | `terms.management_fee` | Every LP in a class at a fee rate of 0, so no listed LP pays the schedule, on commitments or on invested capital: refused at the schedule (F32, stage 5). |

**fund-32's `fee-step-basis` moves with these** (F40). It sets case 29's second step to `"invested_capital"`, which 0.4.0 and 0.5.0 refused as unsupported, `basis` at `terms.management_fee.steps[1].basis`. From 0.6.0 the basis is read, and case 29 has no investments, so it's refused as `missing_field` at `investments`, at the end of stage 2, as `fee-on-invested-capital-without-investments` is here. Its expectation and its `about` moved in fund-32; nothing else there did.
