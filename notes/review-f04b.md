# Review: f04b (management fees in the engine)

Branch `f04b-fund-fees-engine`, from main after #123. The second step of spillpoint-fund 0.4.0: F29's fee calls at a later close, the schedule and its calls (F30), and back fees in the equalization (F31), read with F32's refusals.

*This note is written in two parts. §1, the names, comes first, in its own commit, before any code uses them. The rest is added once the engine and the page are built.*

## 1. The names, proposed

Stable from 0.4.0 once you settle them. Where the idea is one the engine already has, it uses the engine's name for it. Your suggestions are taken as they are, except one addition, the last line of the table, which needs your answer (open question 1).

**The fund, as read:**

| Name | What it is |
|---|---|
| `FundTerms.managementFee: ManagementFee \| null` | F30's schedule, as the input gives it; null without one. Deeply frozen, as the rest of the fund is. A schedule's calls aren't in `fund.cashFlows`, which stays the input's (FA42). |
| `ManagementFee` | `{ start, frequency, steps, commitments }`: `start` a date as written; `frequency` with the default filled in; `steps` in the input's order; `commitments` a `D`, or null when it isn't given. |
| `FeeFrequency` | `"quarterly" \| "semiannual" \| "annual"`, as F30 writes them (FA41). |
| `FeeStep` | `{ rate, from }`: the annual rate on commitments, and the date it's in force from. The first step's `from` is null, since it's in force from `start`. It mirrors `CarryStep`'s `{ rate, fromLpMultiple }`, whose first step also has null. |

**The schedule's calls, once for the fund:**

| Name | What it is |
|---|---|
| `feeCalls(fund): FeeCall[] \| null` | Every one of the schedule's calls, in date order (F30, F31), worked out once for the fund, as `equalization(fund)` is. Null without a schedule. Empty when `start` is after D (FA39). |
| `FeeCall` | `{ date, firstDay, lastDay, call, lps, gpCommitment, byLp }`: its date; the first and last day it covers; the call; the LPs' part; the GP commitment's part, zero without one or when it's fee-free; and each LP's fee. Every amount exact, nothing rounded. |
| `LpFee` | `{ name, fee }`: one LP's fee for the period, as if in from the start (F29), in the input's order. `byLp` is empty without listed LPs. |

**The equalization:**

| Name | What it is |
|---|---|
| `EqualizationAmounts.backFees: D` | After `interestReceived`: at one close, the joiner's back fees paid to the manager there (F29, F31), and zero for an LP already in. Over all the closes, each LP's back fees summed. |
| `Equalization.rate: D \| null` | Null when no `equalization_rate` is given (FA45). **This changes a type that's stable from 0.3.0:** it was `D`. |

**The refusals' terms** (`INPUT_TERMS`, F32), from 0.4.0:
- `fee_rate_with_schedule`, at `terms.fee_rate`
- `fee_call_with_schedule`, at the first entered fee call
- `fee_commitments_mismatch`, at `terms.management_fee.commitments`

**One more, needed by FA40 (open question 1):**

| Name | What it is |
|---|---|
| `Split.lpMultiple: D \| null` | Null only when the LPs have paid in nothing at all, FA38's rule for an account applied to the split's own. **This changes a type that's stable from 0.1.0:** it was `D`. |

Here's why it needs your answer. In f03b you kept the split's own multiple as `D`, because `call_without_payers` saw to it that the LPs always paid in something.
- **FA40 makes a new case possible:** a schedule's calls have no payers to check, and a $0 call stays a call. So a fund whose listed LPs are all in a class at a fee rate of 0, with no investment or expense call, reads with nothing paid in by the LPs.
- **Its multiple is then 0 over 0** at nothing distributed, and anything over 0 after. Kept as `D`, those come out as NaN and Infinity.
- **What I did:** null, as FA38 does for an account.
- **The other choice** is to refuse such a fund, with a new term.
- **Only that fund gives null.** Today's page can't open one: its guard refuses a schedule until f04c.
