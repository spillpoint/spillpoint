# Review: 05c6 (the reference places jumps where SAFEs convert together)

Branch `05c6-reference-safe-jumps`. The `cases/` edit rule is on, and no case file changed. It has three commits:
1. **The reference's fix,** with a unit test.
2. **The random check compares the two-answer stops in full,** and an engine fix it led to.
3. **The docs and this note.**

**One thing beyond what you asked: an engine fix.** The stronger check found that on 3 of the 11 two-answer tables, the engine's breakpoint search stopped up to $136,000 after the second answer begins (section 3). The fix is small and changes no payout or breakpoint. I kept it here because without it the check you asked for fails. It can go in its own PR if you'd rather.

## 1. The fix

**Where only SAFEs change at a jump,** several can convert together: none would convert alone, but each does once the others do (E20, the most conversions). The jump is where the last of them becomes indifferent with the others already converting.
- **Before:** the reference flipped each changed SAFE from the answer below, one SAFE converting alone. That is never indifferent there, so it found no point and stopped with "cannot place the jump near …".
- **Now:** it also flips each changed SAFE from the answer above, as you said. Where a series, warrant or note changes, nothing is different.

**Every one of the 83 cases comes out unchanged.**

**The new unit test** (`reference/tests/test_safes_together.py`) uses random-1-001 without its note and options: common and four SAFEs. It checks by hand:
- **Above $6.6M,** SAFE 3 has converted, into 1/12 of what is left after $600,000 of cash.
- **At $8.1M,** SAFEs 0 and 1 ($250,000 each, $8M cap) convert together, with SAFE 2's $100,000 still in cash: 3.125% × ($8,100,000 − $100,000) = $250,000.
- **Alone,** either would get 3.125% × ($8,100,000 − $350,000) = $242,187.50, less than its cash.
- **SAFE 3 jumps** from $625,000 to $666,666.67, and common drops from $6,875,000 to $6,833,333.34.

The old reference stops on this table with "cannot place the jump near 8100000.00: []".

## 2. The 200 random tables, rerun

Regenerated from scratch (seed 1), then the check, the probes, and the check again:

| | 05c5 | 05c6 |
|---|---:|---:|
| **Agree in full:** every breakpoint within a cent, with the same reasons and jump flags, and every payout point | 150 | **189** |
| **Agree only at the listed exit values** and a cent either side of each breakpoint | 39 | 0 |
| **Two answers somewhere:** both stop | 11 | **11** |

**No other table falls short of a full comparison.** The 11 are the two-answer tables, and both sides stop with the same message.

## 3. The 11 two-answer tables, and the engine fix

**What the check compares now.** Before, the check accepted any stop on both sides containing "spillpoint doesn't pick one". Now:
- **The message:** the text after "At $X:" must match word for word. It does on all 11.
- **Where:** each side says where it first saw the second answer.
  - The reference reads its own grid, so its stop can only come at or after where the second answer begins.
  - The engine's stop must not come later than the reference's.
- **The start:** the reference is asked about a cent either side of where the engine says the second answer begins.
  - Below, it must give one answer, with the same payouts as the engine.
  - Above, it must stop with the same message.

**What it found.** On random-1-043, 121 and 140, the reference already had two answers a cent below the engine's stop. The engine's `solve` agreed with the reference there; only the breakpoint search was late:
- **The cause:** the search checks each stretch between breakpoints with a reading in its middle. That ran before the stability walk from 05c5, and on these three tables the middle fell inside the second answer, so the search stopped there with that exit value. The walk would have stopped at the start.
- **The fix:** where that middle reading stops the search, the walk runs to the middle first, and its stop is given if it stops first. It runs first only then, because running it first every time made Larkspur 15% slower.

The stops now:

| Table | The engine stops at (where the second answer begins) | The reference stops at (its grid reading) |
|---|---:|---:|
| random-1-008 | $12,575,842.70 | $12,600,000.00 |
| random-1-036 | $17,124,000 | $17,150,000.00 |
| random-1-039 | $11,640,000 | $11,800,000.00 |
| random-1-043 | $13,403,351.96 (was $13,539,664.80) | $13,600,000.00 |
| random-1-085 | $17,625,494.51 | $17,800,000.00 |
| random-1-096 | $12,980,612.24 | $13,000,000.00 |
| random-1-121 | $12,055,555.56 (was $12,083,333.33) | $12,100,000.00 |
| random-1-122 | $9,620,000 | $9,625,000.00 |
| random-1-140 | $14,246,889.40 (was $14,352,188.94) | $14,400,000.00 |
| random-1-149 | $10,896,153.85 | $11,000,000.00 |
| random-1-185 | $10,102,051.28 | $10,125,000.00 |

**On all 11, the reference agrees a cent either side of the engine's stop:** one answer below, with the same payouts, and the same message above. 039 is the one with a warrant among them ("could settle more than one way here").

**No cost:** Larkspur with its note and 10 SAFEs took 2.04–2.20s over five runs with this PR, and 2.05–2.19s with main's search, on the same M1 Pro laptop today.

**New tests:**
- **The engine** (`packages/engine/test/two-answers.test.ts`): random-1-121's search stops at $12,055,555.56, and `solve` gives one answer a cent below and stops a cent above. Without the fix, the first test gets $12,083,333.33.
- **The reference** (`reference/tests/test_two_answers.py`): the same cent either side.

## How to check by behavior

1. **The tests:** `pnpm test`, and `pnpm test:reference` (83 cases ok).
2. **The random check, as in 05c5.** Its last run should say:
   - "189 tables compared in full";
   - "11 tables have more than one stable answer somewhere; … On 11, the reference agrees a cent either side of where the engine says the second answer begins";
   - "The engine agrees with the reference on every one".
   ```bash
   python3 reference/tools/random_safes.py 200 1 local/random-safes
   ```
   ```bash
   pnpm check-random local/random-safes
   ```
   ```bash
   python3 reference/tools/random_safes.py probe local/random-safes
   ```
   ```bash
   pnpm check-random local/random-safes
   ```
   Start from an empty `local/random-safes`. Files from an older run can stay beside the new ones, and the check would read an old run's probes.
3. **On the page:** open random-1-121's table (in the engine test's support file) as a file. The curves and breakpoints say "Couldn't work out the curves and breakpoints: At $12,055,555.56: …", where main says $12,083,333.33.

## Decisions for you to check

1. **The engine fix rides in this PR** (above). It changes only which exit value a two-answer stop names in the breakpoint search.
2. **The check's comparison of the two stops** (section 3): the same text after "At $X:", the engine's stop no later than the reference's, and the reference a cent either side of the engine's stop.

## Assumptions added or changed

- **E15:** the search stops where the second answer begins, to the cent.
- **The reference's README:** how a jump is placed where only SAFEs change.
- **The plan:**
  - 05c6;
  - a line on the two-answer stop in 0.5.0's release notes.

## Checks

- **Engine:** 2,260 tests pass, 2 new.
- **Page:** 473 tests pass.
- **Reference:** 71 unit tests pass, 2 new, and every `expected.json` matches: 83 cases.
- **Typecheck and build:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing ran outside the sandbox.**

## Next

05e, release 0.5.0. I'm stopping here.
