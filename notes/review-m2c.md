# Review: M2c (decisions)

Branch `m2c-decisions`, the third of M2's five PRs. The engine now decides who converts and who exercises at any exit value, under the rules you confirmed after M2b (E16, E17). The reference calculator moved onto the same rules, and no locked value changed.

## CI and permissions changes

None. No changes to `.github/workflows/`, `.claude/`, or any config.

## What changed

- **`packages/engine/src/decisions.ts`:** `solve(capTable, exitValue)` returns every stable answer, each with its decisions and payouts, plus a flag if the list might be incomplete. The method, which differs from the reference's:
  - **Options follow the common price (E16).** For any set of conversions, option classes exercise lowest strike first, while the next class strictly gains. A check confirms that no class would gain by switching.
  - **A conversion group decides first (E17).** For each of its two choices, the other series settle. The group then votes (E11) on the two outcomes.
  - **The other series are solved from both ends (E15):** one switch at a time, from "nobody converts" and from "everyone converts". If the ends disagree, every combination is checked (up to 12 series). Above 12, the answers found are flagged as possibly incomplete. Going round in a circle is an error.
  - **The tie-break (E5):** the reported decisions have the fewest conversions and exercises.
- **`packages/engine/src/input.ts` and `errors.ts`:**
  - **A cap below its series' preference is refused (E7).** A cap equal to it is allowed.
  - **More than one conversion group is refused (E17)**, with the message "The engine supports this once a case needs it".
  - **New error type `NoAnswerError`,** for when the engine stops rather than guess: option exercise doesn't settle, a search cycles, or a group's vote has no single comparison.
- **`reference/`:** moved onto E16 and E17, keeping its every-combination method. It refuses the same two inputs. Jump placement for a group's vote now uses the two settled outcomes. There are 3 new unit tests (28 in all) and an updated README.
- **`docs/ASSUMPTIONS.md`:**
  - **E16 and E17** recorded.
  - **E7** refuses a cap below the preference.
  - **E15** now says options and the group aren't part of the both-ends search.
- **`pnpm payouts`:** with no flags, the engine now chooses the decisions and says whether they match `expected.json`. `--convert` and `--exercise` still force them.

## How to check it by behavior

1. **Run it.** Everything should pass:
   ```bash
   pnpm install && pnpm test && pnpm test:reference
   ```
   That is 413 Vitest tests, 108 of them new. `generate.py --check` shows **all 28 cases unchanged** under the reference's new rules.
2. **What the new tests check.** At all 104 points `expected.json` reports for cases 1–7 and Millrace (each breakpoint at its exact value):
   - the engine finds exactly the recorded decisions, with no second answer
   - every payout line is within $0.01
   - the payouts conserve the exit value

   Checking every combination at each point gives the same answers as solving from both ends.
3. **Try the command:**
   ```bash
   pnpm payouts edge-06b-forced-class 30000000
   ```
   ```bash
   pnpm payouts edge-06b-forced-class 30000001
   ```
   ```bash
   pnpm payouts millrace 57000000
   ```
   - **6b at $30,000,000:** the group stays. Investor Y is indifferent and votes to stay (E13). Seed-1 gets $1,000,000.
   - **One dollar later:** the group has converted, and Seed-1 jumps to $3,000,000.10.
   - **Millrace at $57M:** only the Seed shadow series has converted, between its conversion at $55.91M and Seed's at $59.69M.

## A wider check against the reference

Using the random cap tables from M2b's search (realistic caps, at most one group, all three participation types, options at several strikes), I ran the engine and the reference side by side:

| | Exit values | Same answers and decisions | Largest payout difference |
|---|---:|---:|---:|
| Random exit values on 500 cap tables | 10,000 | all 10,000 | $1e-31 |
| Every breakpoint, at its exact value, on 60 cap tables | 249 | all 249 | $3e-32 |

The breakpoint run matters because breakpoints are where ties sit. That's where the tie-break (E5) and "an indifferent voter votes to stay" (E11) decide the answer. These were one-off checks, so they aren't committed. Under the new rules, neither the engine nor the reference found an exit value without an answer.

## Found while checking: a jump the reference can't place (for M2d)

On one random cap table, the reference's *breakpoint finder* stopped with "cannot place the jump near $7,500,000". It fails the same way on `main`, so the new rules didn't cause it, and no locked case has this shape.

- **The cap table:** s0 and s2 must convert together by at least 50%, with half the vote each.
- **Below $7.5M:** s2's holder gets $0 whether the group converts or stays, so it's indifferent across that whole stretch.
- **Above $7.5M:** converting starts paying it, so it votes yes and carries the vote.
- **So the jump belongs at exactly $7.5M,** where that voter stops being indifferent.
- **Why the reference misses it:** it only looks for a point where the voter's two payout lines *cross*. Here they are equal and then separate.

I propose sharpening E13 for M2d: **a jump sits where the pivotal voter stops being indifferent. That can be where its two outcomes cross, or where they separate after being equal.** At the jump itself the outcome from below still holds, as E13 already says. M2d would fix the reference's finder and build the engine's to match.

## Assumptions

- **Confirmed in your M2b answers and recorded here:**
  - **E16:** options follow the price.
  - **E17:** a group decides first; more than one group is refused; and if the others settle more than one way, the engine stops with a clear error.
  - **E7:** a cap below the preference is refused.
  - **E15:** updated to match.
- **New, for you to confirm:** the E13 sharpening above.

## Open questions

1. **Confirm the E13 sharpening** before M2d.
2. **Two E15 paths have no case to exercise them:** the "possibly incomplete" flag above 12 series, and the error for a search that cycles. No realistic cap table reaches either: without a conversion group, the search never cycled in 313,680 exit values. Each is a few lines of code and is described in E15. Do you want a test that forces them artificially, or is the description enough?

Next is M2d, the breakpoint finder and its reasons. I'm stopping here.
