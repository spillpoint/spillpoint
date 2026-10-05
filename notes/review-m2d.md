# Review: M2d (breakpoints)

Branch `m2d-breakpoints`, the fourth of M2's five PRs. The engine now finds every breakpoint in a range, with a plain-English reason for each. With this PR, it passes everything M2 asked for on cases 1–7 and Millrace: payouts, decisions and breakpoints. M2e, the 0.0.1 release, is next.

## CI and permissions changes

- **`.github/workflows/` and `.claude/`:** no changes.
- **Config:** the root `package.json` gains a `breakpoints` script.

## What changed

- **`packages/engine/src/breakpoints.ts`:** `findBreakpoints(capTable, [low, high])`. It deliberately works differently from the reference, which scans a grid (E18):
  - It walks up from the bottom of the range.
  - Just above each point it reads the answer and every margin that decides it:
    - how far each tier is from being paid in full
    - how far each capped series is from its cap
    - what the next option class would net if exercised
    - what each series would gain by switching
    - how each group voter compares its two outcomes
    - the same margins for every alternative those comparisons use
  - Between changes all of these move in straight lines, so it steps straight to the point where the first one reaches zero. If a payout bends or jumps there, that's a breakpoint.
  - Each stretch is checked at its midpoint. If something changes that the margins didn't predict, it stops with an error rather than miss a breakpoint.
- **`packages/engine/src/reasons.ts`:** the reasons. Their codes match the reference's (`tier_fully_paid`, `cap_reached`, `option_in_the_money`, `series_converts`, `payouts_jump`). Each has a subject (which tier, series, group or option class) and its own wording, with the numbers at the breakpoint.
- **`packages/engine/src/decisions.ts`:**
  - **`snapshotAt`** reports the answer with all its margins, for the finder.
  - **`settleChoice`:** E15's both-ends search, pulled out as an internal routine so tests can force its rare paths. It's exported from the module but not from the package's public API.
- **`packages/engine/src/waterfall.ts`:** reports each tier's index and how far each capped series is from its cap.
- **`reference/`:** two fixes, with **no locked value changed**:
  - **Jumps where outcomes separate (E13, sharpened):** the finder now places a jump where the pivotal voter's two outcomes *separate after being equal*, not only where they cross. It tries the voter's comparison on both sides of the jump. M2c's failing example now gets its jump at exactly $7.5M.
  - **Strictly inside the range:** it no longer reports a breakpoint at the range's own end. It once reported one at exactly $0, where a group decided just above zero.

  There are 2 new unit tests (30 in all).
- **`docs/ASSUMPTIONS.md`:**
  - **E13** sharpened, as you confirmed.
  - **E18 (new):** how the engine finds breakpoints.
- **`notes/next-unlock.md`:** the new case you asked for, a pivotal voter indifferent over a range.
- **`pnpm breakpoints <case>`:** prints every breakpoint with its reasons, and says whether they match `expected.json`.

## How to check it by behavior

1. **Run it.** Everything should pass:
   ```bash
   pnpm install && pnpm test && pnpm test:reference
   ```
   That is 440 Vitest tests, 27 of them new. `generate.py --check` shows all 28 cases unchanged.
2. **What the new tests check:**
   - **For cases 1–7 and Millrace,** the engine finds exactly the breakpoints `expected.json` lists, each within $0.01 of the exact value, with the same reason codes, subjects and jump flags.
   - **M2c's example** gets its jump at exactly $7.5M, alongside the reference's other five breakpoints on that cap table.
   - **The two artificial E15 tests** you asked for:
     - "matching pennies" makes both ends cycle, giving a clear error
     - a 13-series coordination case is reported with both answers and flagged as possibly incomplete (with 12 series, every combination is checked instead)
   - **The range:** a breakpoint at either end isn't reported.
3. **Read the reasons:**
   ```bash
   pnpm breakpoints millrace
   ```
   ```bash
   pnpm breakpoints edge-06b-forced-class
   ```
   ```bash
   pnpm breakpoints edge-04-participating-capped
   ```
   Two examples of the wording:
   - **Millrace, breakpoint 7:** "Seed Preferred (SAFE shadow) converts to common here. Its 1,169,043 as-converted shares are worth $674,999.64 at $0.577395 each, the same as its 1.5x preference of $674,999.64."
   - **6b at $30M:** the vote rule, who now does better converting and what share of the group they hold, and a note that payouts jump, with the outcome from below holding at exactly $30M.

## A wider check against the reference

On 150 random cap tables (48 with a conversion group, 35 jumps in all), the engine and the reference found **the same 662 breakpoints**:
- every position within $3e-20 of the reference's exact value
- every reason code, subject and jump flag identical

The first run showed two differences. Both were the reference reporting a breakpoint at exactly $0, the range's end, which the second fix above removed. Millrace takes the engine about 0.3 seconds. As before, this comparison was a one-off and isn't committed.

## Assumptions

- **Confirmed, recorded here:** E13 sharpened.
- **New, for you to confirm: E18,** how the engine finds breakpoints. Three of its choices touch behavior:
  1. **Breakpoints are strictly inside the range,** as `SPEC.md` says, and the reference now agrees.
  2. **Two changes less than $0.0001 apart are reported as one.** The finder reads each stretch $0.0001 above its start.
  3. **If anywhere in the range there's more than one stable answer, the finder stops with an error.** E8 asks for a breakpoint wherever the set of answers changes. That isn't built, because the two-answer search never found such a range.

## Open questions

1. **Confirm E18,** or change any of its three behaviors.
2. **The reason wording is mine,** and the review note shows two examples. Anything you'd like said differently before the dashboard (M3) shows it to founders?

Next is M2e: the public API, a README with a worked example, the npm build, version 0.0.1, and `notes/review-m2.md`. I'm stopping here.
