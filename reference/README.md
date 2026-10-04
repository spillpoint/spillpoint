# Reference calculator

This is a standalone Python 3 brute-force calculator, and it produces every value in `cases/*/expected.json`. It uses only the standard library, with `fractions` for exact math, and the engine never imports it. It exists so the expected values don't come from the code they test.

## Run it

```bash
python3 -m unittest discover reference/tests -v   # hand-checkable unit tests
python3 reference/generate.py --check             # every expected.json matches the reference
python3 reference/generate.py millrace            # regenerate one case (before the lock only)
```

## Method

It deliberately differs from the engine's.

- **Rounds** (`rounds.py`). Each priced round is circular: the price depends on the share count and the share count depends on the price. Fix one combination of branch choices: cap or discount for each SAFE, and anti-dilution triggered or not for each series. The share count is then an affine function of the post-money fully diluted shares, so it solves exactly. The reference tries every combination and keeps the only consistent one.
- **Exit waterfall** (`waterfall.py`). At each exit value it runs the waterfall for *every* combination of decisions: each convertible series (or group of series that must convert together) converts or not, each option strike and each warrant exercises or not, and each unconverted SAFE takes its Cash-Out Amount or its Conversion Amount. It keeps the combinations that are stable, where nobody would gain by flipping their own decision.
- **Breakpoints** (`breakpoints.py`). Between breakpoints every payout is a straight line. The reference scans a $250,000 grid for changes in the stable decisions, the tiers that are filled, and the caps that bind, then bisects each change down to a tenth of a cent. It fits the line on each side and intersects them, which gives the exact breakpoint. If the two lines don't meet, the payouts jump; the jump is placed exactly where the decision-maker whose choice changed is indifferent. Last, it checks that every payout is a straight line between consecutive breakpoints, so nothing was skipped.

Modeling choices are in `docs/ASSUMPTIONS.md`.
