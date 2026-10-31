# Review: f06b (fees on invested capital: the engine)

Branch `f06b-fund-invested-capital-engine`, from main after #132. The engine for spillpoint-fund 0.6.0's fees on invested capital (F38 to F40), with the page's one-line guard. One PR.

## 1. The names (proposed: they're stable from 0.6.0)

Proposed here before anything is built on them. Where the idea is one the engine already has a name for, I've used that name. Your suggestions are taken as you gave them.

### The fund, as `readFund` gives it

| Name | Type | What |
|---|---|---|
| `FeeBasis` | `"commitments" \| "invested_capital"` | F39's basis of a fee step, a type of its own beside `FeeFrequency` |
| `FeeStep.basis` | `FeeBasis` | each step's basis, `"commitments"` filled in when the input leaves it out or gives null (FA63), as `frequency` is on the schedule |
| `ManagementFee.commitments` | `D \| null` | unchanged: null when not given. A schedule wholly on invested capital needs none without listed LPs (F40) |

So a step is `{ rate, from, basis }`, and `managementFee` is still `{ start, frequency, steps, commitments }`.

### What the engine gives

| Name | Type | What |
|---|---|---|
| `netInvestedCapital(fund)` | `D` | F38's net invested capital at D, before X: the checks made to D less the cost realized to D. Exact, whole-fund (the GP commitment's part included, as a check is), zero without investments. Once for the fund, as `portfolio(fund)` is; fresh each call |
| `feeCalls(fund)`, `FeeCall`, `LpFee` | unchanged | a call on invested capital is a call like any other: `{ date, firstDay, lastDay, call, lps, gpCommitment, byLp }`. A period with nothing to call isn't listed (F39) |

**Choices of mine:**
- **`netInvestedCapital(fund)` sits beside `portfolio(fund)`,** in the same module, since it's the investments table's cost made less its cost realized, added up. It's given for any fund, whatever its schedule: it's about the investments, not the fee.
- **It's at D before X,** as `portfolio(fund)` is, and as F39 counts the days after D: X never moves the fees.
- **No new refusal term.** F40's refusals are `bad_field`, and `missing_field` at `investments` or at `terms.management_fee.commitments`, all kinds STABLE.md already lists. A step's `basis` stops being an unsupported term, which STABLE.md's open list names by key, so nothing there is marked "no longer given".
- **A `FeeStep` built by hand without `basis`** is on commitments, as FA48 and FA61 have a fund built by hand without 0.4.0's or 0.5.0's fields. TypeScript requires the field. This is a new assumption, FA67.
