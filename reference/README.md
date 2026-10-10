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

- **Rounds** (`rounds.py`). Each priced round is circular: the price depends on the share count and the share count depends on the price. Fix one combination of branch choices: cap or discount for each SAFE, and anti-dilution triggered or not for each series. The share count is then an affine function of the post-money fully diluted shares, so it solves exactly. The reference tries every combination and keeps the only consistent one. A post-money SAFE's Company Capitalization counts the shares the notes and pre-money SAFEs converting beside it receive, so under each combination it is worked out inside the solve, and it stays affine (21b, 21c). With SAFEs and notes converting, each protected series also has a choice per piece of the round, the new money and each conversion: priced below its conversion price or not, and only those below count in its B and C (R25; 16g–16i). A conversion issued before the series, or exempt under the round's toggle, is never a piece: it counts in that series' A at its shares. The reference records which event created each series, SAFE and note to tell (16j). The one combination that isn't affine is a conversion counted in A at its discount, in a round that adjusts that series, with the adjustment in the price. It is refused only where such a branch is consistent, so only where the series would actually be adjusted: a fine search for its roots decides whether to refuse, never an answer. A company may start from a cap table (R31, cases 26 and 27): the reference takes it as the table after an event, and ranks its series, SAFEs and notes by the issue order given beside it. `tests/test_start.py` splits every round case at every event, starts again from the table there, and checks that the later tables and rounds come out exactly the same.
- **Exit waterfall** (`waterfall.py`). At each exit value it runs the waterfall for *every* combination of decisions: each convertible series converts or not, each warrant exercises or not, and each unconverted SAFE or note takes its cash or converts. Option exercise isn't a free choice: under each combination, the option classes settle on the exercise set where no class gains by switching (E16). It keeps the combinations that are stable, where nobody would gain by switching, with the options re-settled under each choice. A conversion group decides first (E17): for each of its two choices everyone else settles, and the group votes on the two settled outcomes. A SAFE or note with no cap converts at the common price it helps set, less its discount, so converting is worth exactly its amount ÷ (1 − discount). Under each combination it takes that out of the residual first, and the rest is shared at one price, capped participating preferred stopping at its cap. Where no positive price exists the combination pays it as if it took its cash (X9, X12). A carve-out may be given on the exit, as a term of the sale, but not on both the exit and the cap table (C6). A note beside post-money SAFEs is repaid first, as debt, and, converting, counts in their Liquidity Capitalization (X18).
- **Breakpoints** (`breakpoints.py`). Between breakpoints every payout is a straight line. The reference scans a $250,000 grid for changes in the stable decisions, the tiers that are filled, and the caps that bind, then bisects each change down to a tenth of a cent. It fits the line on each side and intersects them, which gives the exact breakpoint. If the two lines don't meet, the payouts jump; the jump is placed exactly where the decision-maker whose choice changed is indifferent. Where only SAFEs change, several can convert together, none alone but each once the others do (E20, the most conversions); the jump is where the last of them is indifferent with the others converting, so each changed SAFE is flipped from the outcome above the jump as well as from the one below (05c6). Where payouts curve (X17), the change is placed from what still moves in straight lines there: a carve-out tier's edge, or what is left for a tier less its claims. A single decision changing on a curve, a warrant coming into the money in case 8b, is placed where its gain from switching is zero: that gain is one straight line over another, fitted exactly from three readings and checked against a fourth. Last, it checks that every payout is a straight line between consecutive breakpoints, or on a curve that nothing which sets the formula changes, so nothing was skipped.

## Tools

- `tools/random_safes.py` builds random cap tables with several SAFEs at a sale and works each one as a case, for the engine's check `packages/engine/scripts/check-random.ts` to compare against (05c4). Its docstring has the commands. The tables go in `local/`, which git ignores.
- `tools/stable_answers.py` searches random cap tables for exit values with more than one stable answer, or none. It was run before M2c (`ASSUMPTIONS.md` E8, E15) and takes about four minutes:
  ```bash
  python3 reference/tools/stable_answers.py
  ```

Modeling choices are in `docs/ASSUMPTIONS.md`.
