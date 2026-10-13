# Review: f01k (pasting cash flows from a spreadsheet)

Branch `f01k-fund-paste`, from main after #106. Your f01j answers and three small things come first, then the plan's step 6.
- **Not deployed:** `pages.yml` is unchanged.
- **Unchanged:** nothing in `apps/dashboard`, `packages/engine`, `packages/fund`, any cases, `reference/`, `.github/` or `.claude/`. The local `.claude/launch.json` I preview with is untracked and not committed.

## 1. What changed

### The first commit, from your f01j review

- **A new row is like the one above it (answer 2):**
  - "Add a cash flow" gives it the type and kind of the row above: a call and an investment when there are none.
  - Its date and amount are empty, and its date takes the focus.
- **A blank fund at a flat 20% (answer 1)** is unchanged, and the plan says why.
- **"(F4)" is gone** from the line under the table.
- **Every place of an amount.** An amount comes into the form with all the places it has:
  - "$10,000,000.005", not "$10,000,000.01"
  - cents at least when there are any: "$495,000.50"

  So the fund in the form is the fund in the file. A test reads case 8 with a call of $8,000,000.005 and a NAV of $40,000,000.001: the form shows both as that, and writes them back exactly.
- **Commas only between groups of three digits,** in the cells, NAV and the X box:
  - **Refused:** "1,5M" (it read as $15M), "1,0000", "12,34" and a European "1.000.000,00".
  - **Still read:** "$1,234,567.891" and "999,000k".

### The second commit: pasting cash flows (the plan's step 6)

**Where:**
- **"Paste rows from a spreadsheet"** opens a box under the table.
- **More than one cell pasted into a cell** (a tab or a line break, after the one a spreadsheet puts after a single cell) goes to the same box instead of into the cell.

**The rules, as you set them:**
- **Columns:** date, type, kind, amount. A first row with no date in its first cell that names any of the four ("Amount ($)" counts) is a header, and skipped. Cells past the fourth, such as a notes column, are ignored.
- **Dates:**
  - **The forms:** YYYY-MM-DD; slashed with a four- or two-digit year (1/15/21 is 2021); or a month's name, as 15-Jan-2021, Jan 15, 2021, 15 Jan 2021, January 15 2021 or Sept 3, 2022.
  - **Which comes first:** the first slashed date with one number above 12, and that exists read that way, settles month first or day first for the whole paste. A row that can't be read that way is refused: "Row 3: '01/15/2021' isn't day/month/year, as this paste's dates are".
  - **When nothing settles it** and some date could be either, the page asks once, month first selected, showing how that date reads each way. A date the same either way, like 03/03/2021, doesn't ask.
- **Types:** Call, Capital call, Contribution, Drawdown; Distribution. Any case.
- **Kinds:**
  - **The names:** Investment; Fee or Management fee; Expense or Fund expense.
  - **A call with no kind** is an investment. The preview counts only the rows it read: "1 call had no kind: read as an investment."
  - **A distribution's kind cell** is ignored.
- **Amounts:**
  - **Read as the cells take them,** digits kept exactly: "$1,234.567" goes in as $1,234.567.
  - **A negative is refused,** however a spreadsheet writes it ("-500,000", "-$500,000", "$-500,000", "(500,000)", "$(500,000)"): "Write amounts as positive; the type says which way the money goes."
- **Adding:**
  - **Where they go:** after the rows already there, in the order pasted, unsorted.
  - **Empty rows give way:** rows with no date and no amount, like a blank fund's first, are replaced.
  - **Nothing is added until "Add them"** (greyed out when no row reads). "Cancel" leaves the table as it was.

**The preview,** live as the box changes:
- **The rows as read:** "5 cash flows: 3 calls, $10,500,000 called; 2 distributions, $12,000,000 distributed; they'll be the table's first." With rows already there, it ends "adds them to the 5 here".
- **Each row it can't read, one reason a row,** in the order of the columns:

  | The row | Why |
  |---|---|
  | `Q3 2021` | Row 2: 'Q3 2021' isn't a date |
  | `2/30/2021` | Row 3: '2/30/2021' isn't a date |
  | No date | Row 4: has no date |
  | `Transfer` | Row 5: 'Transfer' isn't a type: Call or Distribution |
  | `Carry` as the kind | Row 7: 'Carry' isn't a kind: Investment, Fee or Expense |
  | No amount column | Row 8: has no amount; the columns are date, type, kind and amount |
  | `lots`, `1,5M` | Row 9: 'lots' isn't an amount |
  | `0` | Row 10: '0' isn't an amount more than zero |

- **Row numbers** count the paste's lines, the header included, so a paste from a sheet's first row numbers as the sheet does.

**On a phone,** the box keeps one pasted row a line and scrolls inside itself. The page doesn't scroll sideways at 320 pixels.

### Tests: 165 in `apps/fund`, up from 149

- **`paste.test.tsx` (13, new).**
  - **Eight of the reader's rules:**
    - case 9 as a spreadsheet copies it, with CRLF line breaks
    - every date form
    - a date that settles the order, and rows that disagree
    - asking when nothing settles it
    - each reason a row can't be read
    - every negative form
    - every type and kind
    - exact amounts, blank lines and extra cells
  - **Five through the page:**
    - case 9 pasted into a blank fund gives its two breakpoints
    - the 'Q3 2021' row, with "Cancel"
    - the 03/04/2021 question, choosing day first
    - "(500,000)"
    - a paste into a cell, which goes to the box and adds after the rows there, unsorted
- **`format.test.ts`:** commas in threes, and every place of an amount.
- **`flows.test.tsx`:**
  - the sub-cent call and NAV
  - a new row's type and kind
  - "1,5M" and "495.000,00" refused in a cell
- **`app.test.tsx`:** "1,5M" refused in the X box.

**CI, run locally:**
- the fund page's 165 tests
- the fund package's 318
- the engine's 3,115
- the main page's 673
- both references

## How to run it on your machine

```bash
pnpm install
```

```bash
pnpm --filter @spillpoint/fund dev
```

Open the address it prints, `http://localhost:5173/` or the next port if that's taken.

## What to check

The pastes below are tab-separated, as a spreadsheet copies them. If your viewer turns the tabs into spaces, copy them from the raw file (`notes/review-f01k.md`).

1. **Case 9 pasted into a blank fund.**
   - **Pick "A blank fund",** open Cash flows, and set As of to 2025-07-01.
   - **Choose "Paste rows from a spreadsheet"** and paste:

     ```
     Date	Type	Kind	Amount
     1/1/2021	Call	Investment	$6,000,000.00
     1/1/2022	Call	Investment	$4,000,000.00
     1/1/2023	Distribution		$3,000,000.00
     7/1/2023	Call	Fee	$500,000.00
     7/1/2024	Distribution		$9,000,000.00
     ```

   - **The page asks** which comes first, since 7/1/2023 could be either, with "Month first: 7/1/2023 is 1 Jul 2023" selected.
   - **The preview reads** "5 cash flows: 3 calls, $10,500,000 called; 2 distributions, $12,000,000 distributed; they'll be the table's first."
   - **Choose "Add them":** five rows replace the empty one.
   - **On Terms,** tick "A preferred return" (8%) and choose Full.
   - **On Payouts,** two breakpoints: $659,342.47 and $1,199,178.08.
2. **A 'Q3 2021' row.** On case 8's Cash flows, paste:

   ```
   Date	Type	Kind	Amount
   Q3 2021	Distribution		$1,000,000
   9/30/2025	Distribution		$2,000,000
   ```

   - **The preview:** "1 cash flow: no calls; 1 distribution, $2,000,000 distributed; adds them to the 5 here.", then "Row 2: 'Q3 2021' isn't a date."
   - **The table** still has five rows. "Cancel" closes the box with the table as it was. Pasted again, "Add them" adds one row, dated 30 Sep 2025.
3. **Dates that could be either.** Paste:

   ```
   03/04/2021	Call	Fee	100
   05/06/2022	Call	Fee	200
   ```

   The page asks once, "Which comes first in this paste's dates?", with "Month first: 03/04/2021 is 4 Mar 2021" selected. Choose day first, then "Add them": the rows are dated 3 Apr 2021 and 5 Jun 2022.
4. **A bracketed amount.** Paste:

   ```
   2024-06-01	Distribution		(500,000)
   ```

   "Row 1: '(500,000)' is negative. Write amounts as positive; the type says which way the money goes." "Add them" stays greyed out.
5. **Commas.** Type `1,5M` as X, or in an amount cell: it's refused, not read as $15M.

## Assumptions added

None in the fund engine, and nothing in `ASSUMPTIONS.md`. Choices where your rules were silent, all in the plan:
- **Two-digit years:** a two-digit year is this century's.
- **Cells:** cells past the fourth are ignored, and a cell's surrounding quotes are dropped.
- **Unreadable rows:** a zero amount is refused in the preview, rather than added for the engine to refuse.
- **Empty rows:** rows with no date and no amount give way to a paste, not only a blank fund's first.
- **Row numbers** count the header.

## Open questions

1. **Day first when the paste settles it:** a paste whose dates settle day first (15/01/2021) reads that way without asking. The question only comes when nothing settles it. Right, or should a settled day-first paste say so in the preview, since a US GP might not expect it?
2. **Pasting into a NAV or as-of field:** only the table's date and amount cells send a multi-cell paste to the box. Should NAV and the dates above the table too?
