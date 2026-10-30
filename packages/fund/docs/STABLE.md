# spillpoint-fund: stable from 0.1.0

Code can match on these names and words, as the fund page will:
- the terms a refusal names
- the reasons a breakpoint gives
- how a clawback changes
- the words each reason reads

From 0.1.0, or the version that added it, none is renamed or reused for something else. A new one can be added, marked with the version that added it. One stops being given when the fund engine comes to model what it refuses; it stays here, marked "no longer given". A test fails if the engine can give one this list doesn't have, or this list has one the engine doesn't. The rules behind each are in `SPEC.md` and `ASSUMPTIONS.md`.

## `FundRefusal`'s kinds

- `unsupported`: a term v1 doesn't model. The fund may well have it.
- `input`: the input is wrong, or disagrees with itself, so there's no fund to run.

## `FundRefusal`'s input terms

Each with the `path` it names, into the input (F18, FA2):
- `bad_number`: not an exact string, or out of range. Out of range is a negative amount, rate or share; a zero amount or pref rate; a catch-up share above 1; an LP's commitment of 0 or less (F21); or an X below 0 (FA13), whose path is `x`. From 0.3.0 also the fund's `fee_rate` of 0 or less, and a class's fee rate or the `equalization_rate` below 0 (F28). From 0.4.0 also a schedule's rate below 0 or of 1 or more, or not an exact string; its first rate of 0; and its `commitments` of 0 or less (F32). From 0.5.0 also a check's amount of 0 or less, and a distribution's or `distribution_from`'s `share` of 0 or less or above 1 (F37).
- `bad_date`: not a date written YYYY-MM-DD that exists, an LP's `close` included (F28). From 0.4.0 also a schedule's `start` and a step's `from` (F32). From 0.5.0 also a check's `date` (F37).
- `bad_field`: an unknown call kind or flow type, a non-boolean flag, a blank LP name (FA17), or a value of the wrong shape. From 0.3.0 also `lp_classes` that isn't a list, a class that isn't an object, a class's name that isn't text or is blank (FA27), and an LP's `class` that isn't text (F28). From 0.4.0 also a `management_fee` that isn't an object, a `frequency` that isn't `"quarterly"`, `"semiannual"` or `"annual"` exactly, `steps` that isn't a list or is empty, and a step that isn't an object (F32, FA41). From 0.5.0 also a flow type other than `"call"`, `"distribution"` and `"write_off"`; a `carry_basis` other than `"whole_fund"` and `"deal_by_deal"`; `investments` that isn't a list; an investment, a check or `distribution_from` that isn't an object; an investment's `checks` that isn't a list or is empty; and an investment's name, or a distribution's, a write-off's or `distribution_from`'s `investment`, that isn't text or is blank (F37, FA52).
- `missing_field`: a field the input needs, left out. From 0.3.0 also a class's name; the fund's `fee_rate`, at `terms.fee_rate`, when a class gives a fee rate of its own; and the `equalization_rate`, at `terms.equalization_rate`, when an LP joins at a later close (F28). From 0.4.0 the `equalization_rate` is missing only when an investment or expense call comes before a later close (F29), and a class's fee rate needs the fund's `fee_rate` or a schedule; a schedule's `start`, `steps`, a step's `rate` and a later step's `from`, each at its own path; and the schedule's `commitments`, at `terms.management_fee.commitments`, when the fund doesn't list its LPs (F32). From 0.5.0 also an investment's `name` or `checks`, a check's `date` or `amount`, a write-off's `investment`, and `distribution_from`'s `investment`, each at its own path; a distribution's `investment` when it gives a `share`, or deal by deal; and deal by deal, `investments` and `distribution_from` (F37).
- `unknown_field`: a field outside `terms` that a fund input doesn't have, a distribution's `kind` included (FA12). From 0.5.0 also a call's `investment` or `share`, a write-off's `kind`, `amount` or `share`, and a key on an investment other than `name` and `checks`, on a check other than `date` and `amount`, or on `distribution_from` other than `investment` and `share` (F37).
- `carry_rate_not_below_one`: a carry rate of 1 or more, the fund's or, from 0.3.0, a class's at its own path.
- `steps_out_of_order`: carry steps whose rates don't rise, whose multiples don't rise from above 1, or whose first step has a multiple; from 0.3.0 a class's too. From 0.4.0 also a schedule's steps: the first given a `from`, or a later step's `from` not after the step before it's, the first's being `start`, at the step (F32).
- `catch_up_without_pref`: a catch-up with no pref.
- `catch_up_share_not_above_carry`: a catch-up share at or below the first carry rate. From 0.3.0 also at or below a class's first carry rate, at the class's `carry` (F28).
- `gp_commitment_not_below_one`: a GP commitment share of 1 or more.
- `no_calls`: no calls at all.
- `distribution_before_call`: a distribution before the fund's first call.
- `cash_flow_after_distribution_date`: a cash flow after D. From 0.5.0 also a write-off after D, and a check after D, at the check (F37).
- `lp_name_repeated`: an LP's name that an earlier LP already has, compared exactly as written, at the later LP's `name` (F21). From 0.2.0.
- `lp_class_name_repeated`: a class's name that an earlier class already has, compared exactly as written, at the later class's `name` (F28). From 0.3.0.
- `lp_class_unknown`: an LP's `class` that isn't the name of a class in the terms, compared exactly as written (F28, FA27). From 0.3.0.
- `lp_close_after_distribution`: an LP's `close` on or after the fund's first distribution, or on or after D (F28, FA31). From 0.3.0.
- `call_without_payers`: a call that no LP in the fund at its date would pay, because none had closed yet or none of them pays fees, at the call's path (F28, FA21). From 0.3.0. From 0.4.0 also a schedule no listed LP pays, every one in a class at a fee rate of 0, at `terms.management_fee` (F32).
- `fee_rate_with_schedule`: a `fee_rate` given beside a management fee schedule, whose first rate is the fund's, at `terms.fee_rate` (F32). From 0.4.0.
- `fee_call_with_schedule`: a fee call entered beside a management fee schedule, which would count it twice, at the first in the input's order (F32). From 0.4.0.
- `fee_commitments_mismatch`: a schedule's `commitments` that isn't the listed LPs' commitments added up, at `terms.management_fee.commitments` (F32, FA41). From 0.4.0.
- `investment_name_repeated`: an investment's name that an earlier investment already has, compared exactly as written, at the later investment's `name` (F37, FA52). From 0.5.0.
- `investment_unknown`: a distribution's, a write-off's or `distribution_from`'s `investment` that isn't the name of one of the fund's investments, compared exactly as written, at that `investment` (F37). From 0.5.0.
- `investment_not_made`: a distribution or a write-off dated before its investment's first check, at the cash flow (F37). From 0.5.0.
- `investments_exceed_calls`: the cost made by a check's date more than the investment calls up to that date, at the first such check's `amount`, checks in date order and on one date in the investments' order (F37, FA53). From 0.5.0.

## `FundRefusal`'s unsupported terms

- `compounded_pref`: a pref compounding other than simple (F7).
- `deal_by_deal_pref`: a pref, whatever its shape, with carry deal by deal, at `terms.pref` (F35, F37, FA54). From 0.5.0.

Any other unsupported term is the key v1 doesn't model, named by itself: `hurdle_irr` for `terms.hurdle_irr`, at that path. From 0.2.0 that includes a field on an LP other than its name and commitment: a side letter's `carry` at `lps[0].carry` (F21). From 0.3.0 an LP's `class` and `close` are read, and a field on a class other than its name, fee rate and carry is unsupported: a class's own `pref` at `terms.lp_classes[0].pref` (F28). From 0.4.0 a `management_fee` is read, and a field on it other than `start`, `frequency`, `steps` and `commitments`, or on a step other than `rate` and `from`, is unsupported: an `offset` at `terms.management_fee.offset`, a `basis` at `terms.management_fee.steps[0].basis` (F32). From 0.5.0 `carry_basis` is a term the engine reads.

## `ReasonCode`

What a breakpoint's reason is about (F15, FC5). From 0.3.0 every reason's `class` is the account it's about, its class's name or null for the fund's terms, and its amounts and rates are that account's own (F27):
- `capital_returned`: X's capital tier ends; the LPs have their paid-in capital back. Its `amount` is the LPs' paid-in.
- `pref_met`: X's pref tier ends. Its `rate`, and its `amount`, all the pref accrued to D (FA4).
- `catch_up_done`: X's catch-up tier ends. Its `carry` is c, the first carry rate.
- `carry_step`: the LPs reach a carry step. Its `lpMultiple` and `rate`.
- `clawback_cleared`: the clawback owed reaches zero, owed below and not above.
- `clawback_starts`: the clawback owed leaves zero. v1's terms can't produce it (FA9).
- `clawback_changes`: the clawback owed changes slope, owed on both sides.
  - Its `change` says how.
  - Its `fundTotals` names the totals' tier that ended, one of the four tier codes above, when the run on the fund's totals is the cause. It's null when X's own tier is.

## `ClawbackChange`

How the clawback owed changes as X grows (F15):
- `starts_to_fall`
- `stops_falling`
- `falls_faster`
- `falls_more_slowly`

## The wordings

Each reason's text is one of these (FC6), its blanks filled as FC6 writes them: an amount as "$10,890,000" or "$4,004,383.56", a rate as "8%" or "7.5%", a multiple as "3.0x" or "2.25x".

**The reasons, by code:**
- `capital_returned`: "LPs have their {amount} of paid-in capital back"
- `capital_returned`, from 0.5.0 deal by deal when X isn't final, its amount what's due on X (F36, FA57): "LPs have their {amount} back for the investments exited or written off, fees and expenses included"
- `pref_met`: "LPs have their {rate} pref, {amount}"
- `catch_up_done`: "the GP has {carry} of the profit"
- `carry_step`: "LPs reach {multiple}: carry is {rate} from here"
- `clawback_cleared`: "from here the GP has earned all the carry it was paid earlier"
- `clawback_starts`: "from here the GP has been paid more carry than it has earned"
- `clawback_changes`, X's own tier the cause: "the clawback owed {change}"
- `clawback_changes`, the run on the fund's totals the cause: "the clawback owed {change}: on the fund's totals, {tier}"
- `clawback_changes`, from 0.3.0 with two or more accounts, the run on the account's own totals the cause (FA29): "the clawback owed {change}: on its own totals, {tier}"

**{account}, from 0.3.0, with two or more accounts (F27).** Every reason's words follow its account's name: the class's, as written, or the fund's terms':
- `named`, every reason: "{account}: {reason}"
- `fund_terms`, the account of the LPs on the fund's terms: "Fund terms"

**{change}, by `ClawbackChange`:**
- `starts_to_fall`: "starts to fall"
- `stops_falling`: "stops falling"
- `falls_faster`: "falls faster"
- `falls_more_slowly`: "falls more slowly"

**{tier}, the totals' tier that ended, by its code.** No amounts, since the totals' run isn't a distribution:
- `capital_returned`: "LPs have their capital back"
- `pref_met`: "LPs have their pref"
- `catch_up_done`: "the GP has {carry} of the profit"
- `carry_step`: "LPs reach {multiple}: carry is {rate} from here"

## The management fees' names

From 0.4.0 (F29 to F31), beside the API's other names:
- `managementFee`, on a fund's `terms`: the schedule as read, `{ start, frequency, steps, commitments }`, its `frequency` filled in (`"quarterly"`, `"semiannual"` or `"annual"`), each step `{ rate, from }` with the first's `from` null, and `commitments` null when not given. Null without a schedule.
- `feeCalls(fund)`: the schedule's calls in date order, each `{ date, firstDay, lastDay, call, lps, gpCommitment, byLp }`, and in `byLp` each LP's `{ name, fee }`. Null without a schedule.
- `backFees`, on each LP's equalization amounts: its own part of each fee call before its close, paid to the manager.

## The investments' names

From 0.5.0 (F33, F34), beside the API's other names, on the `Fund` `readFund` returns:
- `carryBasis`, on a fund's `terms`: `"whole_fund"` or `"deal_by_deal"`, `"whole_fund"` filled in when the input leaves it out.
- `investments`: the input's investments in its order, each `{ name, checks }`, each check `{ date, amount }`. Empty without any.
- `investment` and `share`, on each cash flow: a distribution's investment (null without one) and share (1 when the input leaves it out), or a write-off's investment; both null on a call, and `share` null on a write-off.
- `distributionFrom`: X's source, `{ investment, share }`, the share 1 when the input leaves it out. Null without one.

And in what the engine gives (F35, F36):
- `portfolio(fund)`: the investments table, at D before X, in the input's order, on either basis; empty without investments. Each row a `PortfolioRow`: `name`, `costMade`, `costRealized`, `costWrittenOff`, `proceeds`, and `realizedMultiple`, null while nothing of it is realized.
- `due`, on a `Split`: deal by deal, what's due before carry on X, a `Due`: `costMade`, `costRealized`, `cost`, `uninvested`, `feesAndExpenses` and `total`. Null on the whole fund.
- `due`, on an `AccountSplit`: deal by deal, the account's own, an `AccountDue`: `cost`, `uninvested`, `feesAndExpenses` and `total`. Null on the whole fund.
- `uninvested` is always given, zero before the end, and exactly zero at the end when every dollar called for investments was invested; `total` is `cost` + `uninvested` + `feesAndExpenses` within FA15's tolerance, and at the end exactly the LPs' paid-in (FA49).
- `capital_returned`'s `amount`, deal by deal: the account's due on X, which is its paid-in when X is final (FA57).

## Types that can be null from 0.4.0

One type stable from an earlier version can now be null, so code that reads it checks first:
- `Equalization.rate`, stable from 0.3.0: `D | null`, was `D`. Null when no `equalization_rate` is given, which is allowed when only fee calls come before the later closes: each joiner pays its own back fees, with no interest (F29, FA45).

## Types widened in 0.5.0

Two fields of `CashFlow`, stable from 0.1.0, take one more value, so code that reads them checks first:
- `CashFlow.type`: `"call" | "distribution" | "write_off"`, was `"call" | "distribution"`. A write-off ends what's left of an investment, with no proceeds (F33).
- `CashFlow.amount`: `D | null`, was `D`. Null on a write-off, which has no amount; a call's and a distribution's are never null.
