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
- **Exit waterfall** (`waterfall.py`). At each exit value it runs the waterfall for *every* combination of decisions: each convertible series converts or not, each warrant exercises or not, and each unconverted SAFE or note takes its cash or converts. Option exercise isn't a free choice: under each combination, the option classes settle on the exercise set where no class gains by switching (E16). It keeps the combinations that are stable, where nobody would gain by switching, with the options re-settled under each choice. A conversion group decides first (E17): for each of its two choices everyone else settles, and the group votes on the two settled outcomes. A SAFE or note with no cap converts at the common price it helps set, less its discount, so converting is worth exactly its amount ÷ (1 − discount). Under each combination it takes that out of the residual first, and the rest is shared at one price, capped participating preferred stopping at its cap. Where no positive price exists the combination pays it as if it took its cash (X9, X12). A carve-out may be given on the exit, as a term of the sale, but not on both the exit and the cap table (C6).
- **Breakpoints** (`breakpoints.py`). Between breakpoints every payout is a straight line. The reference scans a $250,000 grid for changes in the stable decisions, the tiers that are filled, and the caps that bind, then bisects each change down to a tenth of a cent. It fits the line on each side and intersects them, which gives the exact breakpoint. If the two lines don't meet, the payouts jump; the jump is placed exactly where the decision-maker whose choice changed is indifferent. Last, it checks that every payout is a straight line between consecutive breakpoints, so nothing was skipped.

## Tools

- `tools/stable_answers.py` searches random cap tables for exit values with more than one stable answer, or none. It was run before M2c (`ASSUMPTIONS.md` E8, E15) and takes about four minutes:
  ```bash
  python3 reference/tools/stable_answers.py
  ```

Modeling choices are in `docs/ASSUMPTIONS.md`.
