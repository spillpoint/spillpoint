# Fund reference calculator

This is a standalone Python 3 calculator for the fund waterfall, and it produces every value in `packages/fund/cases/*/expected.json`.
- **Exact:** standard library only, with `fractions` for exact math.
- **Written from `packages/fund/docs/SPEC.md` alone.** It doesn't import spillpoint's `reference/`, and the fund package's TypeScript never imports it.
- **Why:** it exists so the fund cases' expected values don't come from the code they test, the same discipline as spillpoint's `reference/`.
- **Where:** it lives in the fund package, so spillpoint's reference and its test discovery never see it. `files` in the package's `package.json` keeps it out of a publish.

## Run it

```bash
python3 -m unittest discover packages/fund/reference/tests -v         # hand-checkable unit tests
python3 packages/fund/reference/generate.py --check                   # every fund expected.json matches the reference
python3 packages/fund/reference/generate.py fund-06-full-catch-up     # regenerate one case (only while the fund cases are unlocked)
```

`pnpm test:reference` runs both, after spillpoint's own reference.

## Method

- **The waterfall** (`waterfall.py`).
  - **The cash flows:** each case's flows are replayed in F4's order: by date, calls first, distributions in the order listed. Each distribution runs the tiers against the running balances (F1).
  - **The pref** accrues Actual/365 between flows on the LPs' unreturned capital (F6). Beside it accrues F12's hurdle pref, on paid-in less everything that has run the tiers, never below zero.
  - **X** is one more distribution on D (F14).
  - **When final, or at the NAV point:** the tiers also run once on the fund's totals. The GP's catch-up and carry there are its entitlement (F12, FA1).
- **The accounts** (`accounts.py`, F22 to F24). The LPs on the fund's terms form one account and each class with LPs another; without listed LPs there's one, the whole LPs' side.
  - **Each account is a fund of its own,** run by `waterfall.py`: the fund's terms with its class's carry, and its part of every flow. Investment and expense calls divide by commitment, fee calls by F22's fee weight, and distributions, X's included, by commitment, each after the GP commitment's part. A fee call's LPs' part is every LP's own fee, as if in from the start (F29, `fees.py`).
  - **The fund's amounts are the accounts' sums,** with the GP commitment's line beside them. Each account settles its own clawback, and the fund owes their sum, each floored at zero first (F24).
  - **With one account** the run is the fund's own, so cases 01 to 21 come out byte for byte as before.
- **Management fees** (`fees.py`, F29, F30). A fee is each LP's own, on its own commitment by F22's fee weight.
  - **An entered fee call** was paid by the LPs in at its date: its charge per unit of fee weight is the LPs' part over their weights, and every LP's part is that times its own weight. In the waterfall it counts at its full size, so before a later close it grows by the joiners' back fees.
  - **A schedule** works out the fee calls: one for each calendar quarter, half-year or year from `start`'s to D's, in advance, the first dated `start`. Its fee factor is the rate in force on each day it covers, added up day by day, over n times the period's days. Each LP's fee is its fee weight times that; without listed LPs, `commitments` times it. With a GP commitment that pays fees, the call is the LPs' fees over 1 − g.
- **Later closes** (`closes.py`, F25, F29). The waterfall has every LP in from the start; the equalization is worked out beside it.
  - **Each investment and expense call** was paid by the LPs in at its date.
  - **At each later close,** in date order, the LPs in by then rebalance every earlier investment and expense call: the joining LPs pay in their parts, and the LPs already in get back what they'd paid over theirs.
  - **Interest:** each joining LP pays interest on its part of each of those calls, from the call's date to its close, and the interest on a call goes to the LPs already in by what each gets back of it.
  - **Back fees:** each joining LP's own part of each fee call before its close, paid to the manager, with no interest. Fee calls aren't rebalanced (F29).
- **Breakpoints** (`breakpoints.py`), found by search, never from a tier's size.
  - **The signature:** at any X, in each account, the tier its part of X's last dollar falls in; when final, also the tier the totals' run ends in and the sign of carry paid less entitlement.
  - **Why the grid is enough:** tiers only move forward as X grows, and carry paid less entitlement is a straight line while both tiers hold. So two points with the same signature have no breakpoint between them, and a grid finds every change.
  - **The search:**
    1. Grid the signature up to a point where every account's runs are in their top carry step.
    2. Bisect each change to a millionth of a dollar.
    3. Fit a line to every amount on each side and intersect them, which gives the exact breakpoint.
    4. Check every amount is a straight line between breakpoints.
  - **The grid's offset:** every sample point is offset by 1/1000003, a prime no breakpoint's denominator has, so no sample lands on a breakpoint.
  - **With two or more accounts,** each reason names its account (F27).
- **The LPs** (`case.py`, `lps.py`). Within its account each LP's share is its commitment over the account's (F23), exactly, and its amounts are its account's paid-in, total from X, total to date and clawback owed, each times its share (F20). With one account that's F19's share, its commitment over all of them (`lps.py`).
- **Refusals** (`inputs.py`). F18's refusals, in FA2's order of checks, then F21's for the LPs, after everything else (FA19), with F28's for the classes, an LP's class and close, and a fifth stage for what the LPs need of the rest. F32's for the schedule sit in those stages.

The engine will work out where each tier ends from its size: a different method from this search, so the two can check each other.

## Cases

`generate.py` reads `packages/fund/cases/fund-*`:
- **A folder with `inputs.json`** is run as a fund (FC2 to FC5), with each LP's amounts when it has LPs (FC9), the accounts and equalization when it has them (FC11), and the schedule's fee calls and each joiner's back fees when it has them (FC13).
- **A folder with `fixtures/`** is a set of refusals, each a change to a base case's inputs (FC7, FC12, FC14).

`tests/test_fund_ref.py` also runs 60 random funds, checking that every breakpoint is found and that the clawback never rises as X grows (FA9), and 40 of them again with LPs in classes and at later closes: every account's breakpoints found, no account's clawback rising, the fund's amounts the accounts' sums, and the LPs on the fund's terms alone giving exactly 0.2.0's amounts. Then 30 more with fees (F29, F30): half with a schedule in place of their entered fee calls, half with entered fee calls before later closes. Every account's breakpoints are found and no account's clawback rises; what the waterfall counts as the LPs' fees is what the LPs in at each call paid as it was made plus every joiner's back fees; and with no fee call before a later close, the closes change no amount, as in 0.3.0.

Modeling choices are in `packages/fund/docs/ASSUMPTIONS.md`.
