# spillpoint-fund: stable from 0.1.0

Code can match on these names and words, as the fund page will:
- the terms a refusal names
- the reasons a breakpoint gives
- how a clawback changes
- the words each reason reads

From 0.1.0 none is renamed or reused for something else. A new one can be added, and one stops being given when the fund engine comes to model what it refuses; it stays here, marked "no longer given". A test fails if the engine can give one this list doesn't have, or this list has one the engine doesn't. The rules behind each are in `SPEC.md` and `ASSUMPTIONS.md`.

## `FundRefusal`'s kinds

- `unsupported`: a term v1 doesn't model. The fund may well have it.
- `input`: the input is wrong, or disagrees with itself, so there's no fund to run.

## `FundRefusal`'s input terms

Each with the `path` it names, into the input (F18, FA2):
- `bad_number`: not an exact string, or out of range. Out of range is a negative amount, rate or share; a zero amount or pref rate; a catch-up share above 1; or an X below 0 (FA13), whose path is `x`.
- `bad_date`: not a date written YYYY-MM-DD that exists.
- `bad_field`: an unknown call kind or flow type, a non-boolean flag, or a value of the wrong shape.
- `missing_field`: a field the input needs, left out.
- `unknown_field`: a field outside `terms` that a fund input doesn't have, a distribution's `kind` included (FA12).
- `carry_rate_not_below_one`: a carry rate of 1 or more.
- `steps_out_of_order`: carry steps whose rates don't rise, whose multiples don't rise from above 1, or whose first step has a multiple.
- `catch_up_without_pref`: a catch-up with no pref.
- `catch_up_share_not_above_carry`: a catch-up share at or below the first carry rate.
- `gp_commitment_not_below_one`: a GP commitment share of 1 or more.
- `no_calls`: no calls at all.
- `distribution_before_call`: a distribution before the fund's first call.
- `cash_flow_after_distribution_date`: a cash flow after D.

## `FundRefusal`'s unsupported terms

- `compounded_pref`: a pref compounding other than simple (F7).

Any other unsupported term is the key v1 doesn't model, named by itself: `hurdle_irr` for `terms.hurdle_irr`, at that path.

## `ReasonCode`

What a breakpoint's reason is about (F15, FC5):
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
- `pref_met`: "LPs have their {rate} pref, {amount}"
- `catch_up_done`: "the GP has {carry} of the profit"
- `carry_step`: "LPs reach {multiple}: carry is {rate} from here"
- `clawback_cleared`: "from here the GP has earned all the carry it was paid earlier"
- `clawback_starts`: "from here the GP has been paid more carry than it has earned"
- `clawback_changes`, X's own tier the cause: "the clawback owed {change}"
- `clawback_changes`, the run on the fund's totals the cause: "the clawback owed {change}: on the fund's totals, {tier}"

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
