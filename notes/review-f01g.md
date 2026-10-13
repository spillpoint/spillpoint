# Review: f01g (the fund page's chart and breakpoints)

Branch `f01g-fund-chart-breakpoints`, from main after #102. The plan's step 2.
- **Not deployed:** `pages.yml` is unchanged.
- **Unchanged:** nothing in `apps/dashboard`, `packages/engine`, any cases, `reference/`, `.github/` or `.claude/`. The local `.claude/launch.json` I preview with is untracked and not committed.

## 1. What changed

### The first commit, from your f01f answers

- **`StepCarry.lps`** (answer 2): the LPs' share of the carry tier at each step, added to the fund engine before 0.1.0.
  - **The field-name test** is updated.
  - **At every point of every case,** for X and the fund to date, each step's LP share is the GP's × (1 − rate) ÷ rate, and the steps add up to the carry tier.
  - **The split table** shows one row per step, both sides.
- **The LPs' net multiple** (answer 4): two places, rounded down, after rounding to 20 places as FA14 does.
  - **So it never shows a step the LPs haven't reached:** at $63,833,333.33, a fraction of a cent below the 5.0x step, it reads 4.99x.
  - **At the step itself,** chosen from the list, it reads 5.00x.
  - **Case 8 at $40M** is now 3.37x; it was 3.38x rounded half up.

### The second commit, from your look at the page (its own commit, since the first was made)

- **Case 3 is the default:** "A fund: 20% carry and a 2% GP commitment", opening at $20,000,000.
- **Case 8 comes second:** "A VC fund with premium carry: 20%, then 25% from 3x and 30% from 5x". Then cases 13 and 12.
- **Each step reads as a band of the LPs' multiple:** "Carry at 20% (up to 3.0x)", "Carry at 25% (3.0x to 5.0x)", "Carry at 30% (above 5.0x)". A flat fund's row is "Carry at 20%".
- **The plan** records both.
- **The tests** pick case 8 from the list where they check it.

### The package renamed: `@spillpoint/fund` (its own commit, from your message during the step)

**What changed:** the app's package was `@spillpoint/fund-page`, and is now `@spillpoint/fund`, to match `@spillpoint/dashboard` in `apps/dashboard`. It changed in:
- `apps/fund/package.json`
- `CLAUDE.md`'s fund section and repo layout
- the plan, which keeps your earlier answer 1 as written, with the rename noted beside it

**Unchanged:**
- **Earlier review notes,** which are history.
- **The plan's own file name,** `notes/plan-fund-page.md`, which isn't the package.
- **The lockfile,** which pnpm keys by folder.

**Checked:**
- **The new name:** `pnpm --filter @spillpoint/fund test` runs exactly the app's 66 tests. It names the package exactly, so it never selects the engine, `spillpoint-fund`.
- **The old name** now matches nothing.

### The chart and the breakpoints

- **`src/analysis.ts`,** no fund arithmetic:
  - **The breakpoints:** the engine's `findBreakpoints`, numbered.
  - **The GP's carry per extra $1M** on each side of each breakpoint, read off the engine's straight lines between consecutive breakpoints.
  - **The chart's points:** X's split at 0, every breakpoint, NAV and the range's top.
  - **The range's default top**, the plan's rule: the largest of 2 × the LPs' paid-in, 1.25 × the last breakpoint and 1.5 × NAV, rounded up to two significant digits. That gives case 3 $21M, case 8 $80M, case 13 $40M and case 12 $9M.
- **`src/Chart.tsx`** (Recharts, as the main page):
  - **The three lines:**
    - the GP's carry in blue, thicker
    - the LPs in grey ink
    - the GP commitment's line dashed, left out when there's none
  - **Breakpoints:** numbered marks, stepping up a row where they crowd.
  - **NAV:** a dashed mark labelled at the top.
  - **X:** the accent line, labelled at the bottom. Near the right edge, labels go on the left of their line.
  - **The legend** names each line beside a swatch of its stroke, with its value at X to the cent. That's never colour alone.
  - **A line under it** says when marks crowd, or a breakpoint is past the top.
  - **To assistive technology** it's one image with a description; the values are in the legend.
- **`src/Breakpoints.tsx`:**
  - **Each breakpoint:** its number, its X to the cent with the short form, then each reason in the engine's words, first letter up and a full stop after.
  - **The GP's line:** "The GP's carry goes from $198,000 to $247,500 per extra $1M", or "stays at", to the dollar.
  - **A final fund's clawback reasons** are listed too; the clawback card itself is f01h.
  - **Choosing one** moves X there exactly. The one X is at says "X is here".
- **The X card:**
  - **The slider** beside the box runs from $0 to the range's top in thousandths.
  - **Under it, the marks:** every breakpoint by number and NAV, in order of X. A mark too close to the one before steps down a row, so none overlap on a phone. Each moves X there exactly.
  - **"The slider and the chart run up to"** takes a typed top, says when the text isn't an amount, and rises to 1.25 × an X typed past it, to two digits.
- **Page order:** headline, X, the split, the chart, the breakpoints. That's the main page's order.

### Tests: 66 in `apps/fund`, up from 21; 318 in `packages/fund`

- **`chart.test.tsx` (43):**
  - **The lines are exact** for all 15 fund cases: X's split at a quarter, half and three-quarters of the way between two chart points is on the straight line between them, within 10⁻²⁰. With the breakpoints left out of the chart's points, all 15 fail.
  - **The per-$1M rates** equal the engine's a dollar either side of every breakpoint of every case.
  - **The four examples' default tops.**
  - **Each example's breakpoint list** equals its case's `expected.json` reasons, in order.
  - **Case 8's and case 13's lists,** written out.
  - **Choosing case 8's third breakpoint:** X exactly, 5.00x, "X is here".
  - **The slider, the marks and NAV,** in order of X, NAV a row down.
  - **The range:** typed, refused, and raised.
  - **The chart's marks and legend,** and no GP commitment line where there's none.
- **`app.test.tsx` (11):** case 3 at $20M opens first, and case 8 picked from the list. Each step row is checked against the case's GP carry and the engine's LP share, which add up to the case's carry tier to a cent a step.
- **`privacy.test.ts`:** now also allows Redux Toolkit's and Immer's error-message links, which Recharts brings in, as the main page's privacy test does.

**Checked in the browser:** the dev page, desktop and 375 pixels wide. The page never scrolls sideways; the chart fits; the slider's marks don't overlap.

## How to run it on your machine

```bash
pnpm install
```

```bash
pnpm --filter @spillpoint/fund dev
```

Open the address it prints, `http://localhost:5173/` or the next port if that's taken.

## What to check

1. **It opens on "A fund: 20% carry and a 2% GP commitment"** at $20,000,000.
   - **The carry row:** "Carry at 20%", $7,320,800.00 to the LPs and $1,830,200.00 to the GP.
   - **One breakpoint,** under the slider and in the list: $10,662,244.90, "LPs have their $10,449,000 of paid-in capital back." and "The GP's carry goes from $0 to $196,000 per extra $1M." That's 20% of the 98% that runs the tiers.
2. **Pick "A VC fund with premium carry…" (case 8).** It opens at $40,000,000.
   - **The slider's marks:** 1, 2, NAV and 3, with NAV a row down where it's close to 2. The range runs to $80,000,000.
   - **The chart:**
     - numbered marks at $7,000,000, $34,500,000 and $63,833,333.33
     - "NAV" at $40,000,000
     - "X = $40M"
   - **The legend:** the GP's carry $6,806,250.00, the LPs $32,793,750.00, the GP commitment $400,000.00.
   - **The breakpoints:**

     | | X | Reason | The GP's carry per extra $1M |
     |---|---:|---|---|
     | 1 | $7,000,000.00 | LPs have their $10,890,000 of paid-in capital back. | from $0 to $198,000 |
     | 2 | $34,500,000.00 | LPs reach 3.0x: carry is 25% from here. | from $198,000 to $247,500 |
     | 3 | $63,833,333.33 | LPs reach 5.0x: carry is 30% from here. | from $247,500 to $297,000 |

   - **The split:**
     - Carry at 20% (up to 3.0x): $21,780,000.00 and $5,445,000.00.
     - Carry at 25% (3.0x to 5.0x): $4,083,750.00 and $1,361,250.00.
     - Carry at 30% (above 5.0x): $0.00 and $0.00.
     - The LPs' net multiple: 3.37x.
3. **Choose breakpoint 3** in the list or under the slider. X is $63,833,333.33, the multiple 5.00x, and the list says "X is here". Type `63833333.33`: the multiple is 4.99x, since that's a fraction of a cent short.
4. **Drag the slider** a quarter of the way: X is $20,000,000. Choose NAV: X is $40,000,000 again.
5. **Type `$50M`** in "The slider and the chart run up to". Breakpoint 3 leaves the slider, and the chart says one breakpoint is past $50M. Then type `$150M` as X: the range rises to $190M.
6. **Pick "A late call and a clawback" (case 13).** Its breakpoints list the clawback's reasons too:
   - **1:** "LPs have their $20,000,000 of paid-in capital back." / "The clawback owed stops falling."
   - **2:** "The clawback owed starts to fall: on the fund's totals, LPs reach 2.0x: carry is 30% from here."
   - **3:** "LPs reach 2.0x: carry is 30% from here." / "The clawback owed stops falling."
7. **At a phone's width,** the slider's marks don't overlap and the chart fits.

## Assumptions added

None in the fund engine beyond `StepCarry.lps`, which you asked for. The page's choices are above and in the plan.

## Open questions

1. **Case 3's range:** it tops out at $21M, just past its opening X of $20M, so X's label sits left of its line. Should the default top also take in 1.25 × the opening X, which would be $25M?
2. **The per-$1M line** counts the GP's carry only, not the GP commitment's line. Right?
3. **Hover readouts and zoom:** the chart has neither, though the main page has both. The legend gives the values at X, and the range's top zooms from $0. Enough for now, or add them in f01m?
