# Review: M5e3 (dividends from a round, in the engine)

Branch `m5e3-dividends-in-rounds`, a small engine PR:
- **R30:** case 23 now builds and runs end to end.
- **0.1.0 code keeps working:** `cumulativeDividend` is optional.
- **The 0.2.0 release notes are started,** in `notes/release-0.2.0.md`.

## Run it

```bash
pnpm payouts edge-23-dividends-from-a-round --all
```

```bash
pnpm breakpoints edge-23-dividends-from-a-round
```

```bash
pnpm rounds edge-23-dividends-from-a-round
```

These print:
- **Payouts:** "11 of 11 exit values match expected.json".
- **Breakpoints:** the four, at $6,945,227.40, $8,445,227.40, $22,943,076.71 and $27,159,821.92, all matching.
- **Rounds:** five cap tables, each matching.

## What changed

- **R30 in the engine's round builder.** Where a priced round reads its series, a `cumulative_dividend` gets the round's date as its accrual start. The series from SAFEs and from notes are built from that same series, so they carry the same terms, each on its own issue price. Two refusals:
  - **A round's series with its own `accrual_start`.**
  - **A round with dividends and no date.**
- **Still refused** (milestone "later"): dividends on a series issued by an `issue` event. No case says when they start.
- **`cumulativeDividend` is optional** on `PreferredSeries`, and missing means no dividends. A test builds a series by hand the 0.1.0 way and gets no dividends.
- **`ExitInput.exitDate` is optional too,** for the same reason: 0.1.0 code that builds an `ExitInput` by hand keeps working. M5e had added it as required. That would have broken such code.
- **The page with case 23's rounds.** Opening them says:
  > It has cumulative dividends on Series A Preferred (from SAFEs), which this page doesn't show yet. It won't open a cap table it can't show in full.

  **The test caught an ordering problem.** The engine's check for a missing exit date came first, so the page asked for an exit date a saved file can't hold. Now the page checks what it can show right after building the rounds, before the engine's exit checks.
- **Tests:**
  - **Case 23** runs through every exit test (`EXIT_CASES`) and every round test: 29 cases with events, all built.
  - **New tests for R30:** both series' terms and issue prices, the two refusals, and the `issue` event refusal.
  - **M5e's test** that refused dividends in rounds now checks that a round's series takes them from its date.
- **Docs:**
  - **The engine README:** R30, the `priced_round` series field, and the narrowed refusal.
  - **`docs/ASSUMPTIONS.md`:**
    - **R30:** in the engine.
    - **X5:** updated.
    - **C14:** the round's series field.

## The 0.2.0 release notes (draft)

`notes/release-0.2.0.md` lists what's new since 0.1.0, the API additions, the changes in refusals, and what can break. You asked for the new `"warrant"` kind to be listed as the one unavoidable change. **It isn't the only union that grows:**
- **`Security`** gains `"warrant"`.
- **`EventDetails["kind"]`** gains `"issue_warrants"`.
- **`ReasonCode`** gains `"warrant_in_the_money"`. Carve-outs and SAFEs at a sale will add more.

Each breaks only code that switches over every member, and each comes with a new term. The draft lists all three, and leads with the security kind as the one people are most likely to meet. Say if you'd rather word it differently.

## Checks

- **Engine:** 891 tests pass, 29 more.
- **Dashboard:** 179 tests pass, 1 more.
- **Reference:** 47 unit tests pass, and all 61 cases match.
- **`cases/`:** no changes.
- **Typecheck and build:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`. `.claude/settings.json` is back to its committed state, with your `cases/` rule on.

## Assumptions added

None. R30 now notes it's in the engine. X5 and C14 are updated.

## Open questions

**The release notes' wording** about the three widened unions (above).

M5f (carve-outs) is next, as you said.
