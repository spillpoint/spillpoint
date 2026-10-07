# Review: M5f (carve-outs in the engine)

Branch `m5f-carve-outs`. The engine now pays management carve-outs:
- **Before the preferences:** case 10.
- **Alongside them:** case 10b, with its curved payouts (X17).

The breakpoint finder places breakpoints on a curve exactly, and flags the curved stretches.

**It was stacked on M5e3 (#32).** With #32 merged, main is merged into this branch, and the PR targets main; its diff is the carve-out work alone.

## Run it

```bash
pnpm payouts edge-10b-carve-out-alongside-preferences --all
```

```bash
pnpm breakpoints edge-10b-carve-out-alongside-preferences
```

- **Case 10:** "10 of 10 exit values match expected.json".
- **Case 10b:** "11 of 11".
- **Both:** all four breakpoints match, with the same curve flags.

## How to check it by behavior

1. **Case 10, before the preferences.** At $5M the carve-out takes $500,000 first, and Series A gets $4,500,000. The breakpoints:
   - **$10M:** "The carve-out's 10% tier, on exit value up to $10,000,000, ends here, with the carve-out at $1,000,000. Above this, it takes 5% of each further dollar, up to $20,000,000."
   - **$11,052,631.58:** Series A's preference is paid in full.
   - **$20M:** the carve-out's last tier ends, at $1,500,000.
   - **$26.5M:** Series A converts.
2. **Case 10b, alongside.** At $5M the carve-out gets $238,095.24, and at $10M $909,090.91, as you checked.
   - **$10M**, curved on both sides: "…with its claim at $1,000,000. It shares the most senior tier pro rata with the preferences there, and that tier isn't paid in full, so it gets $909,090.91. Above this, its claim grows by 5% of each further dollar, up to $20,000,000." A second reason says payouts curve on both sides.
   - **$11,052,631.58**, curved below: "Series A Preferred's preference and the management carve-out's claim are paid in full here: $11,052,631.58."
   - **Above that,** every payout is case 10's.
3. **The page.** A file with a carve-out says:
   > It has a management carve-out, which this page doesn't show yet. It won't open a cap table it can't show in full.

## How the engine handles carve-outs (C6, X6, X7)

- **What it reads** (C6):
  - **The tiers:** marginal, from $0 and contiguous; the last may have no upper end.
  - **The recipients:** listed holders, whose shares add up to 100%.
  - **The timing:** before or alongside the preferences.

  Anything else is refused, with the field named.
- **The pool** is a percentage of the exit value before any strike cash, tier by tier, like tax brackets.
- **Before the preferences,** it is paid first.
- **Alongside them,** it claims a share of the most senior tier, pro rata with the preferences there. With no preferred it is simply paid first.
- **Each recipient** gets a holder × `carve_out` line, after the lines for the positions. A recipient needs no equity.
- **No new decision-makers.** One new margin, the distance to the carve-out's next tier edge, puts the tier edges in the breakpoint finder.

## Curved stretches (X17)

**Where payouts curve.** A carve-out alongside the preferences, in a tier that isn't paid in full, makes payouts curve. On such a stretch the finder works differently:
1. **Placing the next change.** It uses only the two margins that stay straight on a curve: what is left for the tier less its claims, and the distance to the carve-out's next tier edge. So the breakpoint is exact, as on a straight stretch.
2. **Checking the stretch.** It checks the decisions at 64 points along the stretch, in place of checking that payouts lie on a line.
3. **Reading the breakpoint.** It reads payouts and slopes at the breakpoint itself, not by extending two readings. A curved side's slope is measured over $0.000000001, at 40 digits.
4. **A decision changing on a curve** stops it with a clear error, as it stops the reference. No case has one.
   - **Why it's rare** (now in X17, from your review): the curve exists only while the most senior tier is short. Common gets nothing then, so no conversion or exercise of an option or a warrant for common can become worth it.
   - **The exception:** a warrant for a series in that tier. Its shares join the tier's claim, so it is paid from the tier.
   - **Checked:** I ran case 8's company with a 10% carve-out alongside. The warrant comes into the money at about $1.05M, on the curve, and both the engine and the reference stop there with the error.

**The page's charts and the "For you" line** on curves still come with the dashboard work. Your approved wording is in X17.

## What changed

- **Engine** (`packages/engine/src/`):
  - **`model.ts`:** `CarveOut`, and an optional `CapTable.carveOut`.
  - **`input.ts`:** reads a carve-out (C6). The refusal is gone.
  - **`waterfall.ts`:**
    - the pool by marginal tiers
    - paid first, or in the senior tier
    - recipients' lines
    - `Payout.carveOut` and `Payout.curved`
  - **`decisions.ts`:** the tier-edge margin.
  - **`breakpoints.ts`:**
    - curved stretches
    - `Breakpoint.curveBelow` and `.curveAbove`
  - **`reasons.ts`:**
    - `carve_out_tier` and `payouts_curve` (the reference's codes)
    - the carve-out named in the tier it shares
  - **`index.ts`:** the `CarveOutHere` type.
- **Engine tests:**
  - **Cases 10 and 10b** join `EXIT_CASES`, and the breakpoint test now compares curve flags.
  - **`test/carve-out.test.ts`** (new):
    - reading a carve-out, and 7 refusals
    - alongside with no preferred
    - a curved stretch's breakpoints and flags, and the carve-out's exact share on it
- **Dashboard:**
  - **The test for a term the engine doesn't model yet** now uses a SAFE still outstanding, since carve-outs are modeled.
  - **A new test:** a carve-out gets the page's own message.
- **Docs:**
  - **The engine README:** carve-outs, the curve flags, and the input fields, marked *(0.2.0)*.
  - **`docs/ASSUMPTIONS.md`:**
    - **X7:** in the engine.
    - **X17:** how the engine's finder handles curves.
    - **C12:** carve-outs off the refused list.
  - **`notes/release-0.2.0.md`:** carve-outs, the new fields, two more reason codes, and the recipients' lines.

## Checks

- **Engine:** 949 tests pass, 58 more than M5e3.
- **Dashboard:** 180 tests pass, 1 more.
- **Reference:** 47 unit tests pass, and all 61 cases match.
- **`cases/`:** no changes.
- **Typecheck and build:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.

## Assumptions added

None. X7, X17 and C12 are updated.

## Decisions I made, for you to check

1. **The checks on a curve:** 64 sample points per curved stretch, and slopes measured over $0.000000001. At 40 digits the slope is right to far better than the finder's tie of 10⁻¹².
2. **`"carve_out"` is not exported as a constant.** The public API's list of exports is pinned on purpose. Recipients' lines are found by that security name, which the README documents.
3. **`readCapTable` leaves `carveOut` out** when there is none, rather than setting it to `null`. A table read back then matches one built from rounds field for field, as the page's round-trip test expects.
4. **"Alongside" with no preferred** pays the carve-out first, as X7 says.

## Open questions

**A warrant for a senior-tier series, on a curve:** do you want a case for it, or is the guard error enough? Until there's a case, a cap table like that is refused with the error above rather than answered.

M5g, SAFEs at a sale, is next. I'm stopping here.
