# Review: f01m (the fund page's keyboard, narrow screens and screenshots)

Branch `f01m-fund-keyboard-phones`, from main after #108. Your f01l answer 2 comes first, then the plan's step 8.
- **Not deployed:** `pages.yml` is unchanged.
- **Unchanged:** nothing in `apps/dashboard`, `packages/engine`, `packages/fund`, any cases, `reference/`, `.github/` or `.claude/`. The local `.claude/launch.json` I preview with is untracked and not committed.

## 1. What changed

### The first commit, from your f01l review

- **X keeps every digit (answer 1),** as it did. The plan says why.
- **A file's fractions, said when it opens (answer 2):** "Opened frac.json. Its fractions, like 10000000/3, are kept to 40 digits, and a save writes them that way." It names the first fraction in the fund, or in X. A test opens a file with a call of 10000000/3: it saves back as 3333333.333333333333333333333333333333333, with the same values as the engine reads them. A file with no fractions says only "Opened plain.json."

### The second commit: the keyboard, taps on the chart, and phones (the plan's step 8)

**A click or tap on the chart sets X there,** in place of a hover readout:
- **Where it lands:** the nearest 1/1000 of the chart's range, in whole dollars. Within 8 pixels of a breakpoint's line, it's the breakpoint exactly, every digit, so a tap near a bend lands on it.
- **The pixel only picks a step;** X itself is worked out exactly.
- **The clawback's small chart** does the same, onto its bends.
- **The chart says so** in its line ("Click or tap the chart to set X there."), and the pointer is a crosshair over it.
- **By keyboard,** the slider and the X box do this; the chart isn't a Tab stop.

**The keyboard:**
- **Every control on every tab** is a native control with a name a screen reader reads: each field's label, or its own name, like "Row 3's amount", "Step 2's carry rate" or "Remove row 3". A test checks every tab of all four examples and a blank fund, with every term's fields shown and the paste box open.
- **The tabs** take the arrow keys, Home and End (from f01i).
- **The charts' drawings aren't Tab stops,** since their values are in the legends. A test checks this. With Recharts' own keyboard layer turned on for a moment, it failed on all four examples (the blank fund has no chart).
- **Escape closes the paste box** as "Cancel" does: nothing is added, and the focus goes back to "Paste rows from a spreadsheet".
- **The Tab order** on Payouts runs: the picker, Save, Open a file, the tabs, the X box, the slider, its marks, the range's top, then the breakpoint list.

**Narrow screens:** under 480 pixels each cash flow is a card:
- date and type on one line
- kind and amount on the next
- its row number and "Remove" at its end
- a cash flow's own problem under its card

The column headings are kept for screen readers only, since each field has its own label. At 320 pixels a whole date and "Distribution" fit side by side; a small third commit made the date column a little wider for that.

**Screenshots:** `apps/fund/scripts/screenshots.mjs`, a copy of the main page's script (its driver unchanged, the fund page's shots its own), run as `pnpm --filter @spillpoint/fund screenshots`.
- **It ran inside the sandbox,** so it needed no OK to run outside it.
- **The shots** are under `notes/screenshots/f01m-*.webp`, from a clean build of this branch's last commit, 9b687f7. The footer says so, without "modified".

### Tests: 201 in `apps/fund`, up from 191

- **`keyboard.test.tsx` (9, new).**
  - **The rule:** the nearest thousandth in whole dollars, clamped at both ends; the breakpoint within 8 pixels and not 9.
  - **Case 6's inputs.json, opened:**
    - a click near $14M sets X to exactly $14,004,383.56, with "X is here"
    - a click near $5M gives $5,000,000
  - **Case 13's clawback chart:** a click near $15.1M lands on the bend at $15,000,000.
  - **Each of the five starting points:** every control labelled, and no stray Tab stops.
  - **Escape:** it closes the paste box and returns the focus.
- **`file.test.tsx` (26):** the fractions line.

**Checked in the browser:**
- **At 320 pixels,** no tab scrolls sideways, on case 8 (the longest example, its carry in three steps) with a refusal in its cash flows and the paste box open. The shots show the same.
- **The Tab order** is as above.

**What I couldn't drive:** the browser pane's synthetic keys can't open a native select on a Mac or type digits into a native date field. So the keyboard-only run from a blank fund (check 2) is yours, by hand. Both are the browser's own controls, which take the keyboard in Chrome, Safari and Firefox.

**CI, run locally:**
- the fund page's 201 tests
- the fund package's 318
- the engine's 3,115
- the main page's 673
- both references

## The screenshots

| | Phone | Desktop |
|---|---|---|
| Case 13, Payouts | [320](screenshots/f01m-case13-payouts-320.webp) | [1280](screenshots/f01m-case13-payouts-1280.webp) |
| Case 13, Terms | [320](screenshots/f01m-case13-terms-320.webp) | [1280](screenshots/f01m-case13-terms-1280.webp) |
| Case 13, Cash flows | [320](screenshots/f01m-case13-flows-320.webp) | [1280](screenshots/f01m-case13-flows-1280.webp) |
| A blank fund, Payouts | [320](screenshots/f01m-blank-payouts-320.webp) | [1280](screenshots/f01m-blank-payouts-1280.webp) |
| A blank fund, Terms | [320](screenshots/f01m-blank-terms-320.webp) | [1280](screenshots/f01m-blank-terms-1280.webp) |
| A blank fund, Cash flows | [320](screenshots/f01m-blank-flows-320.webp) | [1280](screenshots/f01m-blank-flows-1280.webp) |
| Case 8, Terms (three steps) | [320](screenshots/f01m-case8-terms-320.webp) | |
| Case 8, Cash flows (a refusal, the paste box open) | [320](screenshots/f01m-case8-flows-320.webp) | |

## How to run it on your machine

```bash
pnpm install
```

```bash
pnpm --filter @spillpoint/fund dev
```

Open the address it prints, `http://localhost:5173/` or the next port if that's taken. For a phone's width, use your browser's device toolbar at 320 pixels.

To take the screenshots again: build, serve the build, then run the script.

```bash
pnpm --filter @spillpoint/fund build
```

```bash
pnpm --filter @spillpoint/fund preview --port 4174
```

```bash
pnpm --filter @spillpoint/fund screenshots
```

## What to check

1. **At 320 pixels:**
   - **Every tab fits** without scrolling sideways, with case 8 (its carry in three steps), a refusal (set row 5's date to 2020-06-01) and the paste box open.
   - **The cash flows are one card a row:** date and type, kind and amount, then "Row 5" and "Remove".
   - **Payouts' split table** scrolls inside its card, its tier names held in view, as in f01f.
2. **By keyboard alone,** type case 6 in from a blank fund:
   - **The picker:** Tab to it, choose "A blank fund" with the arrow keys or by typing, and confirm.
   - **To Cash flows:** Tab to the tabs, then the right arrow to Cash flows.
   - **As of:** Tab to it and type 01 01 2025. In Chrome, Tab steps through a date's month, day and year.
   - **Row 1:** its date 01 01 2020, and its amount `10000000`. Call and Investment are already chosen.
   - **To Terms:** Shift-Tab back to the tabs, then the left arrow to Terms.
   - **The pref:** Tab to "A preferred return" and press Space. The 8 is selected; leave it.
   - **The catch-up:** Tab to the catch-up, then the right arrow to Full.
   - **On Payouts,** the breakpoints list reads $10,000,000.00, $14,004,383.56 and $15,005,479.45.
   - **Escape** in the paste box closes it.
3. **Click near $14M.** Open `packages/fund/cases/fund-06-full-catch-up/inputs.json` and click the chart on breakpoint 2's line, just left of the $15M tick. X becomes exactly $14,004,383.56, and the list says "X is here". Click halfway between $0 and $5M: X is $2,500,000, to the nearest thousandth of the range.

## Assumptions added

None in the fund engine, and nothing in `ASSUMPTIONS.md`. Page choices, in the plan:
- **The clawback's chart** takes taps too.
- **Breakpoints only:** a tap near NAV isn't pulled onto NAV; the NAV button does that.
- **The card's last line** carries the row number.

## Open questions

1. **NAV:** should a tap near the NAV line land on NAV, as one near a breakpoint does? I left it out, since the NAV button does that and you named breakpoints.
2. **The split table on a phone** still scrolls inside its card at 320 pixels, its tier names held in view, as in f01f. The page itself doesn't scroll sideways. Keep it, or make it cards too, as the cash flows now are?
