# Review: f01j (the fund page's cash flows table)

Branch `f01j-fund-cash-flows`, from main after #105. Your f01i answers come first, then the plan's step 5.
- **Not deployed:** `pages.yml` is unchanged.
- **Unchanged:** nothing in `apps/dashboard`, `packages/engine`, `packages/fund`, any cases, `reference/`, `.github/` or `.claude/`. The local `.claude/launch.json` I preview with is untracked and not committed.

## 1. What changed

### The first commit, from your f01i answers

- **NAV in the fund's-life frame (answer 1).** A fund that isn't final reads, at NAV, as if liquidated there:
  - **Nothing owed (case 8 at NAV):** "If the fund were liquidated at NAV, $40M on 30 Sep 2026, the GP would end with $6.81M of carry."
  - **Something owed:** your sentence, "…would end with $5M of carry: it would get $1M now and give back $750K." A test gives it on case 13's terms, not final, with a NAV of $15M.
  - **When X itself pays the GP nothing:** "…: it would give back $750K."
  - **The line under it** is this distribution's, as for a final fund: "Of the $40M, the LPs get $32.8M and the GP commitment $400K."
  - **Away from NAV,** this distribution, as before: "At a $34.5M distribution on 30 Sep 2026, the GP's carry is $5.45M."
- **A term turned on (answer 3):** ticking the pref or the GP commitment, or choosing a partial catch-up, focuses its field with its value selected, so a GP types straight over it.
- **Answers 2 and 4** needed no change: "Of the $15M…" and dropping it at $0; the summary line under the governance note.

### The second commit: the cash flows table, and a blank fund (the plan's step 5)

**Above the table:**
- **As of** and **D**, date pickers. D left empty is the as-of date, which is what leaving it out of the input means; the field says so.
- **NAV on D,** optional.
- **"This is the fund's last distribution"**.

**Each row:**
- a date
- a type, Call or Distribution
- a kind for a call: Investment, Fee or Expense. A distribution has none (FA12); the row keeps the kind for a switch back.
- an amount in dollars: "$8,000,000", "8000000" or "8M", written exactly
- Remove

**Under the table:**
- **"Add a cash flow"** adds a call, its date focused.
- **"Sort by date"** keeps the order shown within a date.
- **The line under the table:** "On one date, calls run before distributions, and distributions run in the order shown here (F4). “Sort by date” keeps that order within a date."

**A refusal shows where its path names,** in the page's words:

| Path | Where | The page's words |
|---|---|---|
| `cash_flows[4]`, before the first call | a line under row 5 | This distribution is before the fund's first call. |
| `cash_flows[4]`, after D | a line under row 5 | This cash flow is after the distribution date, 1 Jan 2024. |
| `cash_flows[1].amount`, blank, 0 or "lots" | row 2's amount | Write an amount in dollars, more than zero: 250000 or 250000.50. |
| `cash_flows[0].date`, blank | row 1's date | Choose this cash flow's date. |
| `cash_flows`, no calls | under the table | A fund needs at least one call. Add one with “Add a cash flow”. |
| `as_of` | As of | Choose the fund's as-of date. |
| `nav` | NAV on D | Write NAV in dollars, 0 or more: 40000000 or $40M; or leave it empty. |

- **Payouts stays on the last good fund,** as the terms do. Its notice says which tab: "Your last change to the cash flows has a problem, so these payouts are from the fund before it." "Fix it" goes to the field.

**One problem at a time, in the engine's order (FA2), on either tab.**
- **The page hands the engine everything:** text it can't read (a blank amount, "lots", "twenty") goes as "", which the engine refuses at that field's path.
- **So the problem shown is the engine's first:** a blank fund asks for its as-of date before a carry rate it can't read, on whichever tab you're on.
- **This changes f01i's terms slightly:** the page used to read them before the engine ran. The words under each field are the same.
- **The notices on Terms and Cash flows** now read "The fund can't run as it is.", with "Show me" going to the problem's tab.

**"A blank fund,"** last in the list:
- **It starts with:**
  - no dates
  - a flat 20% carry (F9's)
  - one call to fill in
- **Payouts says what's needed first:** "No payouts yet. Choose the fund's as-of date. Fix it". The line under the picker: "A blank fund: its payouts show here once it has an as-of date, its terms and its cash flows."
- **As it's filled in,** it stays "A blank fund" in the list. An example changed reads "An example, with your changes", and the line under the picker "This fund, with your changes: …". Picking another fund after any change asks first: "Start over? Your changes to this fund will be lost."

**Two layout fixes,** found on a phone:
- **A table's scroll box** now contains its visually hidden "Remove" header, which pushed the new Cash flows tab more than 300 pixels past a phone's width until it did.
- **A chart is clipped to its box.** A chart drawn while its tab was hidden keeps its first width until shown, and could widen the page for a frame.

### Tests: 149 in `apps/fund`, up from 121

- **`flows.test.tsx` (27, new):**
  - **Every fund case, 15 of them:** the form writes the cash flows, D, final and NAV back exactly, with the same breakpoints.
  - **Sorting** keeps the order shown within a date.
  - **Case 6 typed in from a blank fund:**
    - its three breakpoints
    - its split at every point of its `expected.json`: this distribution's and the fund to date's totals, to the cent
  - **Example A typed in by hand:**
    - $7,000,000 and $34,500,000
    - case 8's totals at its five points below 5.0x: $7M, $20M, $34.5M, $40M and $50M
  - **A distribution before the first call,** refused in its row; Payouts keeps the last good fund; "Fix it" focuses the date.
  - **A blank amount, 0 and "lots",** each asking for an amount.
  - **A cash flow after D, and a NAV it can't read.** With D moved and NAV cleared, the headline and the NAV button follow.
  - **No calls:** under the table, and "Show me" goes to "Add a cash flow".
  - **The engine's order across tabs:** the as-of date before the carry rate.
  - **The rows:** "Add a cash flow" focuses the new date, then sort and remove. Ticking the box makes X the last distribution.
  - **Starting over** from a blank fund with changes asks first.
- **`terms.test.tsx` (28):** a turned-on term's value focused and selected.
- **`clawback.test.tsx`, `app.test.tsx`:** the NAV wording, at NAV and away from it.
- **`tabs.test.tsx`:** case 8's cash flows, each in its field.

**Checked in the browser:**
- No tab scrolls sideways at 375 pixels for any of the five starting points (four examples and the blank fund), at 320 for cases 8 and 13 and the blank fund, or at 1,100 on case 8's Cash flows.
- On a phone the cash flows table scrolls inside its card. One row a card under 480 pixels is f01m's.

**CI, run locally:**
- the fund page's 149 tests
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

1. **Case 6 typed in from a blank fund.**
   - **Pick "A blank fund".** Payouts reads "No payouts yet. Choose the fund's as-of date."
   - **On Cash flows:** as of 2025-01-01; row 1 on 2020-01-01, a Call, Investment, `10000000`.
   - **On Terms:** tick "A preferred return" (8 is selected; leave it) and choose Full.
   - **On Payouts,** three breakpoints: $10,000,000.00, $14,004,383.56 and $15,005,479.45.
2. **Example A typed in by hand.**
   - **Pick "A blank fund"** again (it asks first).
   - **On Cash flows:** as of 2026-09-30, then these five rows, using "Add a cash flow":

     | Date | Type | Kind | Amount |
     |---|---|---|---|
     | 2021-01-15 | Call | Investment | $8,000,000 |
     | 2021-01-15 | Call | Fee | 495,000 |
     | 2022-01-15 | Call | Fee | $495,000.00 |
     | 2022-06-01 | Call | Investment | 2M |
     | 2024-05-01 | Distribution | | 4000000 |

   - **On Terms:** In steps; "Add a step", 25 from 3; tick "A GP commitment" (1 is selected; leave it).
   - **On Payouts:** two breakpoints, $7,000,000.00 and $34,500,000.00.
   - **Type X = `40000000`:** the split's totals are case 8's: $32,793,750.00 and $6,806,250.00 now, $36,753,750.00 and $6,806,250.00 to date.
3. **A distribution before the first call.** On case 8's Cash flows, set row 5's date to 2020-06-01. "This distribution is before the fund's first call." shows under row 5, and Payouts says its payouts are from the fund before your change.
4. **A blank amount.** Clear row 2's amount: "Write an amount in dollars, more than zero: 250000 or 250000.50." under it.
5. **The NAV wording.**
   - **Case 8 opens at NAV:** "If the fund were liquidated at NAV, $40M on 30 Sep 2026, the GP would end with $6.81M of carry."
   - **Type `34500000`:** "At a $34.5M distribution on 30 Sep 2026, the GP's carry is $5.45M."
6. **On Terms, tick "A preferred return":** the 8 is selected, so typing `7.25` replaces it.

## Assumptions added

None in the fund engine, and nothing in `ASSUMPTIONS.md`. The page's choices are above and in the plan's "The cash flows: a table":
- a blank fund's starting point
- D left empty is the as-of date
- the words for each refusal
- text the page can't read goes to the engine as ""

## Open questions

1. **A blank fund's carry:** it starts at a flat 20%, F9's default, so the Terms tab never starts empty. Keep it, or start the carry rate empty like the dates?
2. **"Add a cash flow" adds a call** (an investment). Most rows a GP types are calls, but a distribution could be the default after the first row. Keep calls?
