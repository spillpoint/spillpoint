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
- **Breakpoints** (`breakpoints.py`), found by search, never from a tier's size.
  - **The signature:** at any X, the tier its last dollar falls in; when final, also the tier the totals' run ends in and the sign of carry paid less entitlement.
  - **Why the grid is enough:** tiers only move forward as X grows, and carry paid less entitlement is a straight line while both tiers hold. So two points with the same signature have no breakpoint between them, and a grid finds every change.
  - **The search:**
    1. Grid the signature up to a point where both runs are in their top carry step.
    2. Bisect each change to a millionth of a dollar.
    3. Fit a line to every amount on each side and intersect them, which gives the exact breakpoint.
    4. Check every amount is a straight line between breakpoints.
  - **The grid's offset:** every sample point is offset by 1/1000003, a prime no breakpoint's denominator has, so no sample lands on a breakpoint.
- **The LPs** (`lps.py`). Each LP's share is its commitment over the sum of the LPs' commitments, exactly (F19). Its amounts are the LPs' paid-in, total from X, total to date and the clawback owed, each times its share (F20). Nothing in the waterfall reads them.
- **Refusals** (`inputs.py`). F18's refusals, in FA2's order of checks, then F21's for the LPs, after everything else (FA19).

The engine will work out where each tier ends from its size: a different method from this search, so the two can check each other.

## Cases

`generate.py` reads `packages/fund/cases/fund-*`:
- **A folder with `inputs.json`** is run as a fund (FC2 to FC5), with each LP's amounts when it has LPs (FC9).
- **A folder with `fixtures/`** is a set of refusals, each a change to a base case's inputs (FC7).

`tests/test_fund_ref.py` also runs 60 random funds, checking that every breakpoint is found and that the clawback never rises as X grows (FA9).

Modeling choices are in `packages/fund/docs/ASSUMPTIONS.md`.
