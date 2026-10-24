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
- `bad_number`: not an exact string, or out of range. Out of range is a negative amount, rate or share; a zero amount or pref rate; a catch-up share above 1; an LP's commitment of 0 or less (F21); or an X below 0 (FA13), whose path is `x`. From 0.3.0 also the fund's `fee_rate` of 0 or less, and a class's fee rate or the `equalization_rate` below 0 (F28).
- `bad_date`: not a date written YYYY-MM-DD that exists, an LP's `close` included (F28).
- `bad_field`: an unknown call kind or flow type, a non-boolean flag, a blank LP name (FA17), or a value of the wrong shape. From 0.3.0 also `lp_classes` that isn't a list, a class that isn't an object, a class's name that isn't text or is blank (FA27), and an LP's `class` that isn't text (F28).
- `missing_field`: a field the input needs, left out. From 0.3.0 also a class's name; the fund's `fee_rate`, at `terms.fee_rate`, when a class gives a fee rate of its own; and the `equalization_rate`, at `terms.equalization_rate`, when an LP joins at a later close (F28).
- `unknown_field`: a field outside `terms` that a fund input doesn't have, a distribution's `kind` included (FA12).
- `carry_rate_not_below_one`: a carry rate of 1 or more, the fund's or, from 0.3.0, a class's at its own path.
- `steps_out_of_order`: carry steps whose rates don't rise, whose multiples don't rise from above 1, or whose first step has a multiple; from 0.3.0 a class's too.
- `catch_up_without_pref`: a catch-up with no pref.
- `catch_up_share_not_above_carry`: a catch-up share at or below the first carry rate. From 0.3.0 also at or below a class's first carry rate, at the class's `carry` (F28).
- `gp_commitment_not_below_one`: a GP commitment share of 1 or more.
- `no_calls`: no calls at all.
- `distribution_before_call`: a distribution before the fund's first call.
- `cash_flow_after_distribution_date`: a cash flow after D.
- `lp_name_repeated`: an LP's name that an earlier LP already has, compared exactly as written, at the later LP's `name` (F21). From 0.2.0.
- `lp_class_name_repeated`: a class's name that an earlier class already has, compared exactly as written, at the later class's `name` (F28). From 0.3.0.
- `lp_class_unknown`: an LP's `class` that isn't the name of a class in the terms, compared exactly as written (F28, FA27). From 0.3.0.
- `lp_close_after_distribution`: an LP's `close` on or after the fund's first distribution, or on or after D (F28, FA31). From 0.3.0.
- `call_without_payers`: a call that no LP in the fund at its date would pay, because none had closed yet or none of them pays fees, at the call's path (F28, FA21). From 0.3.0.

## `FundRefusal`'s unsupported terms

- `compounded_pref`: a pref compounding other than simple (F7).

Any other unsupported term is the key v1 doesn't model, named by itself: `hurdle_irr` for `terms.hurdle_irr`, at that path. From 0.2.0 that includes a field on an LP other than its name and commitment: a side letter's `carry` at `lps[0].carry` (F21). From 0.3.0 an LP's `class` and `close` are read, and a field on a class other than its name, fee rate and carry is unsupported: a class's own `pref` at `terms.lp_classes[0].pref` (F28).

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
