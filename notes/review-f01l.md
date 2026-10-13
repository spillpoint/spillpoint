# Review: f01l (the fund page's open and save)

Branch `f01l-fund-open-save`, from main after #107. Your f01k answer 1 and two small things come first, then the plan's step 7.
- **Not deployed:** `pages.yml` is unchanged.
- **Unchanged:** nothing in `apps/dashboard`, `packages/engine`, `packages/fund`, any cases, `reference/`, `.github/` or `.claude/`. The local `.claude/launch.json` I preview with is untracked and not committed.

## 1. What changed

### The first commit, from your f01k review

- **Which way a paste's dates were read (answer 1).** Whenever a date in the paste could be read either way, the preview says which way it read them and why:
  - **Your typo case:** 3/4/2021, 6/7/2022 and 13/1/2023 read as 3 Apr 2021, 6 Jul 2022 and 13 Jan 2023, and the preview says "Dates read day first, as 13/1/2023 in row 3 can only be read that way."
  - **Fixed to 1/15/2021,** the paste reads month first and says so.
  - **When the page asked,** it says "Dates read month first, as chosen above." (or day first).
  - **When no date could be either** (each settled, or the same either way like 3/3/2021, or none slashed), there's no line.
- **Answer 2:** NAV and the dates above the table are unchanged; only the table's cells send a paste to the box.
- **Excel's accounting zero, "$ -" (or "-"),** is a zero: "Row 1: '$ -' isn't an amount more than zero".
- **YYYY/MM/DD** is read: 2021/01/15 and 2021/1/15, as 15 Jan 2021.

### The second commit: open and save (the plan's step 7)

The main page's patterns, in the masthead: "Save" and "Open a file" beside the picker, and a line under them for what happened.

**Saving:**
- **The file:** `{"format": "spillpoint-fund", "version": 1, "name", "fund", "view": {"x"}}`. `fund` is exactly the input the two tabs write, which is `readFund`'s input. `view.x` is X as an exact string.
- **"Save" downloads it and says where:** "Saved as a-late-call-and-a-clawback.json, in your downloads."
- **The name** is a field at the top of the Terms tab, "Name of this fund": "A saved file is named after it." It starts as the example's label, or "My fund" for a blank fund.
- **Only a fund the engine accepts is saved,** so a saved file always opens:
  - "Not saved: the cash flows have a problem to fix first. Write an amount in dollars, more than zero: 250000 or 250000.50."
  - or "the terms have", with the terms' words
- **X:** moving it isn't a change, but a save keeps it.

**Opening:**
- **What it takes:**
  - a saved file
  - a bare input, named "My fund"
  - a case's `inputs.json`, named by its case id
- **X** comes back from `view`, or $0 without one.
- **The picker** shows "<name>, opened from <file>". Changes to an opened fund keep that, and the line under it reads "This fund, with your changes: …".
- **Refused in one line under the masthead,** the current fund kept:

  | The file | The line, after "Couldn't open <file>." |
  |---|---|
  | Not JSON | It isn't a fund file: it isn't valid JSON. |
  | Version 2 | It was made by a newer spillpoint (file version 2); this page reads files up to version 1. |
  | The main page's file | This is a cap table file. Open it on the main page. |
  | `hurdle_irr` in its terms | This file has a term the page doesn't model: `hurdle_irr`. |
  | A compounded pref | This file has a term the page doesn't model: a pref compounded, not simple (`terms.pref.compounding`). |
  | A distribution before the first call | Row 5 of its cash flows: this distribution is before the fund's first call. |
  | An amount "lots" | The amount in row 2 of its cash flows isn't a number the page can use: amounts and rates are exact strings, like "8000000" or "0.2", amounts more than zero and nothing negative. |
  | A carry of 1 | Its carry: a carry rate must be below 100%. |
  | A field the format doesn't have | It has a field this page doesn't read: notes. |
  | X as a number, or negative | Its X isn't readable: it should be an amount from 0 up, written as a string, like "15000000". |

  A term in backticks is set as code.

**"Not saved"** sits beside the line under the picker:
- **It marks** a change since the last open, save or example: a term, a cash flow or the name.
- **Asking first:** "Open a file", picking another fund and leaving or reloading the page ask first: "Open a file? Your unsaved changes to this fund will be lost."
- **This changes f01i and f01j's start-over question,** which asked whenever anything had changed since the example. It now asks only about unsaved changes, so after a save, picking another fund doesn't ask. It reads "Start over? Your unsaved changes to this fund will be lost.", as the main page's does.

**The fund in the form is the fund in the file.**
- **Both ways:** a save writes the input the two tabs write, and an opened file goes into the two tabs.
- **For all 15 cases:** a test opens each case's `inputs.json`, saves it with no change, and the saved `fund` has the same values as the engine reads them, and the same breakpoints.
- **A fraction in a file,** such as `"1000000/3"`, which the engine accepts, goes into the form as the 40-digit decimal the engine reads it as. So the values are the same, but the text isn't. No case has one.

**Nothing is kept in the browser, and nothing goes in the address.** The privacy test passes unchanged.

### Tests: 191 in `apps/fund`, up from 165

- **`file.test.tsx` (25, new).**
  - **Every case's `inputs.json` (15):** opened through the page, saved with no change, with:
    - the same values and breakpoints
    - its case id as its name
    - X at $0
  - **The clawback example, end to end:**
    - saved at $15,000,000
    - a term changed: "Not saved", and "Open a file" asks first
    - the saved file opened: its terms and X back
  - **Case 11's `inputs.json`:** its breakpoints.
  - **The name and the file name.**
  - **Leaving the page** asks with unsaved changes, and not after a save.
  - **Saves refused** for a blank amount and for a carry of 100%, each saying which tab.
  - **Every refusal in the table above.**
  - **A bare input** opened as "My fund".
- **`paste.test.tsx` (14):** the order line, your typo case among them; "$ -"; YYYY/MM/DD.
- **`terms.test.tsx`, `flows.test.tsx`:**
  - the start-over question's new words
  - "Not saved" in the line under the picker

**Checked in the browser:**
- **Desktop and 320 pixels:** the masthead's buttons, the status line, and a fund opened from a file with a 73-character name. No tab scrolls sideways.
- **Opening a real file** in the browser reads it.

**CI, run locally:**
- the fund page's 191 tests
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

1. **Save the clawback example at $15,000,000, change a term, and open it again.**
   - **Pick "A late call and a clawback"** and type `15000000` as X. There's no "Not saved", since X isn't a change.
   - **Choose "Save":** "Saved as a-late-call-and-a-clawback.json, in your downloads."
   - **On Terms,** set step 1's carry rate to `25`. "Not saved" appears, and the picker reads "An example, with your changes".
   - **Choose "Open a file":** it asks first. Say yes and open the saved file.
   - **It comes back:**
     - The picker reads "A late call and a clawback, opened from a-late-call-and-a-clawback.json", and step 1 is 20% again.
     - On Payouts, X is $15,000,000 and the headline reads "If $15M on 1 Jan 2025 is the last distribution, the GP ends with $5M of carry: it gets $1M now and gives back $750K."
2. **Open `packages/fund/cases/fund-11-clawback-pref/inputs.json`.**
   - **The picker** reads "fund-11-clawback-pref, opened from inputs.json", at X $0.
   - **The breakpoints** are case 11's: $5,000,000.00, $5,801,095.89, $6,001,369.86.
3. **A file with `hurdle_irr`.** Save this as `hurdle.json` and open it:

   ```json
   {"format": "spillpoint-fund", "version": 1, "name": "A fund with an IRR hurdle", "fund": {"as_of": "2026-09-30", "terms": {"carry": {"steps": [{"rate": "0.20"}, {"rate": "0.25", "from_lp_multiple": "3"}, {"rate": "0.30", "from_lp_multiple": "5"}]}, "gp_commitment": {"share": "0.01"}, "hurdle_irr": "0.08"}, "cash_flows": [{"date": "2021-01-15", "type": "call", "kind": "investment", "amount": "8000000"}, {"date": "2021-01-15", "type": "call", "kind": "fee", "amount": "495000"}, {"date": "2022-01-15", "type": "call", "kind": "fee", "amount": "495000"}, {"date": "2022-06-01", "type": "call", "kind": "investment", "amount": "2000000"}, {"date": "2024-05-01", "type": "distribution", "amount": "4000000"}], "nav": "40000000"}}
   ```

   "Couldn't open hurdle.json. This file has a term the page doesn't model: hurdle_irr.", with `hurdle_irr` set as code. The fund you had stays.
4. **A cap table from the main page.** Save any cap table on the main page (Millrace will do) and open it here: "Couldn't open millrace-robotics-fictional.json. This is a cap table file. Open it on the main page."
5. **A blank fund with a blank amount.**
   - **Pick "A blank fund";** on Cash flows set As of to 2025-01-01 and row 1's date to 2020-01-01, and leave its amount blank.
   - **"Save"** reads "Not saved: the cash flows have a problem to fix first. Write an amount in dollars, more than zero: 250000 or 250000.50.", and nothing downloads.
6. **The paste's order line.** On Cash flows, "Paste rows from a spreadsheet", and paste these three rows (tab-separated):

   ```
   3/4/2021	Call	Investment	100
   6/7/2022	Call	Fee	200
   13/1/2023	Distribution		300
   ```

   "Dates read day first, as 13/1/2023 in row 3 can only be read that way."

## Assumptions added

None in the fund engine, and nothing in `ASSUMPTIONS.md`. The page's choices are above and in the plan's "The example funds, and open and save":
- **Names:** a bare input is "My fund".
- **Fields:** a field the file format doesn't have is refused, as the main page refuses one.
- **X** must be a string.
- **The start-over question** asks only about unsaved changes.

## Open questions

1. **A saved file's X** is the exact X, so a breakpoint chosen from the list saves with all its places: "63833333.33333333333333333333333333333333". Keep that, so it reopens on the breakpoint exactly, or write it to the cent?
2. **A file with a fraction,** which the engine accepts as an exact amount, goes into the form as the engine's 40-digit decimal. The values are the same, but the text isn't. Fine as it is, or should such a file say so when it opens?
