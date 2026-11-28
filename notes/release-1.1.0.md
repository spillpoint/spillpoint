# spillpoint 1.1.0

Started in 11b. The release step, 11o, finishes it.

1.1.0 adds to 1.0 and changes nothing in it, as the engine README's "Versions" says a minor release may. It's the engine's part of the first stage of 2.0 (`notes/plan-2.0.md`): first a SAFE's conversion at a chosen price, then a cap table a founder keeps.

## Added

1. **A priced round at a stated price** (11b, `docs/ASSUMPTIONS.md` R32).
   - **What:** a `priced_round` event may give `price_per_share` in place of `pre_money`, as a stock purchase agreement states the price. The round is worked out at that price by the rules that work out a round today (R3 to R28), with nothing to solve. Giving both is an `InputError`.
   - **Its details give `preMoney`.** At a stated price, it's the pre-money valuation the price implies: the price × the post-money fully diluted shares the round is priced on, less the new money. A round given its pre-money gives its own.
   - **At the price a round solves to, it builds the same table.** Every locked round case's priced rounds, at the exact price each solves to, build the case's tables. Every count is the same as a round given its pre-money, and every price and amount is within one part in 10^30.
   - **An example, Millrace's Series B at $1.082112,** six places, as a purchase agreement would write it. The solved price is $1.0821118…, so $1.082112 is a little above it:
     - Cobalt's $10,000,000 buys 9,241,187 shares, two fewer than the case's 9,241,189.
     - The price implies a $36,000,005.27 pre-money, where the case's is $36,000,000.
   - **Refused as a round is today:** at a stated price, a round refuses everything a round given its pre-money refuses. That includes a conversion counted in a series' A at its discount, in a round that adjusts the series (R25), although at a stated price its shares are fixed: no case settles that round at either.
   - **TypeScript reports:** nothing for code written for 1.0. `RoundDetails` has one more field, `preMoney`.
   - **JavaScript sees:**
     - a priced round's details with `preMoney`
     - `buildCapTables` reading `price_per_share`, which 1.0 refused as an unknown field
   - **What to change:** nothing.
   - **Changed answers:** none. A round given its pre-money builds as in 1.0, to every digit: the 191 tables the 41 cases with events build, and every detail but the new field.

## Stable from 1.0

**No list changes.** Its lists hold the terms, codes and reasons code matches on, and 1.1.0 so far adds none: nothing new is refused. The new names are the input field `price_per_share` and the field `preMoney`, each marked *(1.1.0)* in the README.

## On the page

- **One way to model the next round, on the Rounds tab** (11c, 11c2; ASSUMPTIONS R33 and P3). "Add a round" takes the round by its price per share or its pre-money valuation, and each round's summary explains every SAFE and note it converts: its cap price and discount price and which applies, a note's interest to the round's date, its shares and its share after the round, its series and that series' preference, and, where it's exact, the price where its cap takes over. On a cap table entered directly or imported, the Rounds tab says a round added there shows what its SAFEs and notes convert into and that removing it takes it back, and the Payouts tab points there. 11c's SAFEs tab, never released, was folded into it in 11c2.
