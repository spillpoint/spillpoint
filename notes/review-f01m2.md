# Review: f01m2 (the fund page at phone and tablet widths)

Branch `f01m2-fund-tablet-split`, from main after #109. The two gaps from your f01m checks, and your two answers.
- **Not deployed:** `pages.yml` is unchanged.
- **Unchanged:** nothing in `apps/dashboard`, `packages/engine`, `packages/fund`, any cases, `reference/`, `.github/` or `.claude/`. The local `.claude/launch.json` I preview with is untracked and not committed.

## 1. What changed

**The cash flows never scroll sideways, at any width.**
- **Cards wherever the table wouldn't fit.** Tightened a little (6 pixels of padding a side, a 9rem amount field), the table needs 713 pixels. So each cash flow is a card up to a 760-pixel card, and the table from there up.
- **The card's own width decides,** with a container query, not the window's, so the page's padding at each width doesn't move the switch.
- **Checked in the browser at four widths:**

  | Window | The cards' box | Shown as | Scrolls sideways |
  |---:|---:|---|---|
  | 480 | 422 | cards | no |
  | 600 | 542 | cards | no |
  | 768 (iPad, upright) | 670 | cards, every field and "Remove" inside | no |
  | 900 | 802 | the table, Amount and Remove in view | no |

**The split on a phone (your answer 2).** Under 480 pixels it's two tables, one above the other: "This distribution", then "The fund to date".
- **Each table** has Tier, LPs and GP, each tier's name on its own line above its two amounts, as the main page's payouts table puts each holder's shares under the name (M3e).
- **For screen readers,** each tier is a row group, so its name is the header for both amounts.
- **At 320 pixels,** case 8's two tables are 262 pixels wide in a 294-pixel card, with nothing off screen: the GP's carry at 20%, $5,445,000.00, and the GP's total to date, $6,806,250.00, among them.
- **Nine-figure amounts fit too.** At X = $999,999,999.99 the longest, $648,763,499.99, fits with no cell overflowing.
- **The page follows the window** as it turns, back to one table at 480 and up.
- **How it switches:** a media query read in the page, not CSS alone, so the two layouts aren't both in the page at once.

**A tap near NAV (your answer 1).** A tap within 8 pixels of the NAV line lands on NAV exactly, as on a breakpoint.
- **When both are close,** the nearer of the two wins.
- **On case 8,** a tap 7 pixels short of the NAV line (about $650,000 short of NAV) lands on $40,000,000 exactly, and the headline reads "If the fund were liquidated at NAV, $40M on 30 Sep 2026, the GP would end with $6.81M of carry." The NAV line is on the main chart only, so the clawback's chart snaps to its bends alone, as before.

### Tests: 205 in `apps/fund`, up from 201

- **`phone.test.tsx` (2, new),** with the window's width set by the test, since nothing is laid out there:
  - **Case 8 at $40,000,000 as two tables:** the captions, the columns and the tiers in order. Its amounts are held to case 8's `expected.json`, $5,445,000.00 and $6,806,250.00 among them.
  - **A pref's and a catch-up's rows** show too, and the page turns back into one table and again as the window changes.
- **`keyboard.test.tsx` (11):**
  - **The rule:** NAV within 8 pixels; the nearer of NAV and a breakpoint.
  - **On case 8:** the NAV line tapped from X = $20M gives the NAV headline and "X is at NAV".
- **The cash flows' widths** are layout, which the tests can't see. The table above and the screenshots below are the check.

**CI, run locally:**
- the fund page's 205 tests
- the fund package's 318
- the engine's 3,115
- the main page's 673
- both references

## The screenshots

From a clean build of this branch's code commit (76acaf4), by the fund page's screenshot script, inside the sandbox:

| Shot | |
|---|---|
| Case 8's cash flows at 480 | [f01m2-case8-flows-480](screenshots/f01m2-case8-flows-480.webp) |
| at 600 | [f01m2-case8-flows-600](screenshots/f01m2-case8-flows-600.webp) |
| at 768 | [f01m2-case8-flows-768](screenshots/f01m2-case8-flows-768.webp) |
| at 900 | [f01m2-case8-flows-900](screenshots/f01m2-case8-flows-900.webp) |
| Case 8's split at 320 | [f01m2-case8-split-320](screenshots/f01m2-case8-split-320.webp) |

## How to run it on your machine

```bash
pnpm install
```

```bash
pnpm --filter @spillpoint/fund dev
```

Open the address it prints, `http://localhost:5173/` or the next port if that's taken, and use your browser's device toolbar for each width.

## What to check

1. **Case 8's Cash flows at 768 pixels.**
   - **Pick "A VC fund with premium carry…",** open Cash flows, and set the width to 768: each cash flow is a card. Date and type, kind and amount, and "Row 1" and "Remove" are all inside it, with nothing to scroll.
   - **At 900** it's the table, Amount and Remove in view. 480 and 600 are cards too.
2. **Case 8's Payouts at 320 pixels.** The split is two tables, "This distribution" then "The fund to date". The GP's carry at 20% ($5,445,000.00) and the GP's total to date ($6,806,250.00) are on screen without scrolling.
3. **A tap on the NAV line.** On case 8, type `20000000` as X, then tap the chart on the dashed NAV line. X is $40,000,000 exactly, and the headline reads "If the fund were liquidated at NAV, $40M on 30 Sep 2026, the GP would end with $6.81M of carry."

## Assumptions added

None in the fund engine, and nothing in `ASSUMPTIONS.md`. The page's choices are above and in the plan:
- **The switch to cards** is at a 760-pixel card.
- **The table** is a little tighter: 6 pixels of padding a side, a 9rem amount field.
- **The clawback's chart** doesn't snap to NAV, since it doesn't draw it.

## Open questions

None.
