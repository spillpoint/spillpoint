# Review: f04c (management fees on the page)

Branch `f04c-fund-fees-page`, from main after #124. The third step of spillpoint-fund 0.4.0, covering:
- the management fee on Terms: entered as fee calls, or a schedule
- on Cash flows, with a schedule: no Fee kind, a Fee row's problem, and the schedule's fee calls under the table
- pasting and files
- case 29 in the picker, and the page's pending list emptied

**Outside `apps/fund` and `notes/`, only the first commit changed anything:**
- `packages/fund/src/errors.ts` and `input.ts`: the schedule's own message
- `packages/fund/test/read.test.ts`: one line checking it
- `packages/fund/docs/ASSUMPTIONS.md`

After it, `git diff --stat 5af09b6 -- packages apps/dashboard cases reference` prints nothing. Nothing in `packages/fund/reference`, `apps/dashboard`, any cases or `reference/` changed. No case file changed, so this PR doesn't need the cases label.

**One PR, not two.** The page's source comes to about 450 lines added and 70 taken out, and its tests about 580 and 40. That fits one evening, so I didn't split it into f04c1 and f04c2.

| Commit | What |
|---|---|
| `5af09b6` | the first commit (§1) |
| `7a85406` | the page: Terms, Cash flows, paste, files, the example (§2 to §7) |
| `83a0950` | the page's fee tests (§8) |
| the last | this note |

## 1. The first commit

- **FA48** is "Confirmed (f04b review)", with that status added to the legend. FA47 stays withdrawn.
- **A known edge,** under "Known edges": the `D` values a result hands back can be the engine's own, so writing into one (`split.gpCommitmentPaidIn.d[0] = 7`) is unsupported and can change later answers. decimal.js documents them as read-only.
- **The engine's message for the schedule's `call_without_payers`** is its own. It's `SCHEDULE_WITHOUT_PAYERS` in `errors.ts`, passed by `input.ts`. The term and path don't change. `read.test.ts` checks the message.
  - **Its form:** "no listed LP pays this schedule's fees: every one is in a class at a fee rate of 0", lowercase and without the full stop, as every engine message is. `FundRefusal.message` puts the path and a colon before it, and the page's fallback puts a full stop after it.
- **`notes/plan-fund-page.md`:** the new section "0.4.0: management fees", with your words and layout, and mine marked "(mine)". The 0.3.0 section's three changed lines are marked "From f04c".

## 2. The Terms tab (`src/Terms.tsx`, `src/terms.ts`)

- **"Management fee",** a group after the GP commitment, with two radio buttons:
  - **"Entered as fee calls"** (the default), with your one line.
  - **"A schedule":**
    - **The fields:** "Fees start on"; "Called", with Quarterly, Half-yearly and Yearly; the rates by date, step by step as the carry's are; and, only when the fund lists no LPs, "The LPs' total commitments". Your line comes under them.
    - **Labels:** each step's rate is "Fee rate step 2", its date "Fee rate step 2 is in force from", and its buttons "Add a fee rate step" and "Remove fee rate step 2". On screen they read "Step 2", "from", "Add a step" and "Remove".
    - **Starting values (mine):** the first rate is 2%, selected so it's typed straight over. The start is the earliest call's date on Cash flows, and Called is quarterly.
- **With a schedule:**
  - **The management fee rate goes.** What was typed in it stays in the form, out of the input, and comes back with "Entered as fee calls". So do the schedule's fields the other way.
  - **The classes table's fee rate hint (mine):** "Blank: the schedule's rates. A class's rate is set against its first rate."
- **Without a schedule** the rate stays, and its hint ends "…and charges nothing itself."
- **The equalization rate:** your hint, problem line and file line.
- **The input** (`feeInput`): `start`, `frequency` written out, the steps with the first without `from`, and `commitments` only when the fund lists no LPs. A blank start or step date is left out, so the engine says it's missing.

## 3. The Cash flows tab (`src/CashFlows.tsx`, `src/flows.ts`)

- **No Fee kind with a schedule:**
  - **Existing Fee rows:** a row already of kind Fee keeps Fee in its own picker, so it shows what it is.
  - **New rows:** a row added after a Fee row is an investment.
- **A Fee row's problem:** your words, under every Fee row.
  - **How:** the engine names the first in the table's order. `flowsProblem` puts the problem at that row's Kind and lists the others in a new field, `Problem.also`, so `ProblemText` and `marks` show it under each. "Show me" goes to the first one's Kind.
- **"The schedule's fee calls,"** under the table, read-only:
  - **The columns (mine):** Date, Covers ("15 Feb 2021 to 31 Mar 2021") and Call, then "The GP commitment's part" when it pays fees. A Total row follows, with the number of calls under Covers. Amounts are to the cent.
  - **A line under its heading (mine):** "Worked out from the schedule on the Terms tab, and run as fee calls. They aren't rows of the table above."
  - **A start after D:** "No fee call yet: fees start on 1 Jan 2030."
  - **While the fund can't run (mine):** "The schedule's fee calls show here once the fund can run."
  - **On a phone,** each call is a card, through the same `CardTable` the Payouts cards use. At first it was a plain table, and the width sweep (§9) found it scrolling sideways inside its box below 480 pixels for case 30.

## 4. Pasting (`src/paste.ts`, `src/Paste.tsx`)

With a schedule, a Fee row is a row the preview can't read. My words for your reason: "Row 2: this fund's fees come from its schedule; set Management fee to Entered as fee calls to add fee calls".

## 5. Problems in the page's words (`src/terms.ts`, `src/file.ts`)

- **Under their fields,** from the form: your words for the first rate, a step's date out of order, the missing commitments and the schedule nobody pays, and mine for the rest, as the plan lists them.
  - **A first rate of 0** gets your line. Any other rate that doesn't read gets "Write the fee rate as a percent a year, 0 or more and below 100: 2 or 1.5."
  - **The schedule nobody pays** shows under Management fee, and "Show me" goes to the "A schedule" button.
- **From a file, in one line:**
  - **The schedule's places:** "Its management fee schedule", "Its management fee's start date", "Fee rate step 2's date" and so on.
  - **Lines of their own (mine):** the frequency, a step's rate, steps out of order, the commitments missing or not an amount, `fee_rate_with_schedule`, `fee_call_with_schedule`, your `fee_commitments_mismatch` line with my place before it, the schedule nobody pays, and an unsupported key on the schedule or on a step.
  - **Plural commitments (added while testing):** the amounts' line would have said "Its management fee's total commitments isn't a number…", so they have a line of their own that says "aren't".

## 6. Files (`src/file.ts`)

- **f04b's guard is gone,** and so are its two tests.
- **Saving keeps the schedule.** `inputOf` tells `termsInput` whether the fund lists LPs.
- **A file's schedule with `commitments` beside listed LPs** opens, since the engine has checked they're the LPs' total, and saves without them.
- **A file with a schedule and a fee call** is refused as it opens, in one line: "Row 5 of its cash flows: it's a fee call, and this fund's fees come from its schedule." See open question 1.

## 7. The example and Payouts

- **Case 29 in the picker,** after case 26: "A fund with a 2% fee schedule". It opens at $20,000,000 (mine), its listed X, between its second and third breakpoints, in the catch-up.
- **Outside your list, one line on Payouts:** the summary under the picker counts the schedule's calls among the calls paid in. For case 29 it reads "This fund: $34.2M paid in over 25 calls (22 from its fee schedule) and $24M distributed before X." Without that it said $30M over 3 calls, leaving out the fees. See open question 2.
- **Nothing else on Payouts changed:** the split, chart, breakpoints and cards were already the engine's, on the schedule's calls.

## 8. Tests

- **The page's pending list is empty,** so cases 29 to 31 run through every case test:
  - the Terms, Cash flows and LPs forms write each case back exactly, with the same breakpoints
  - each `inputs.json` opens and saves back with the same values
  - the chart's lines and each breakpoint's slopes
  - case 30's clawback, now among the final cases
- **Lists that grew:** the examples (six), the chart ranges (case 29's $68M, twice its $33,925,000 paid in) and the final cases (case 30).
- **New, in `test/fees.test.tsx`, 74 tests:**
  - **Terms:** the default line; switching to a schedule (start, Called, the 2% rate selected); the fee rate and the classes hint with and without a schedule; adding and removing steps; the commitments only without LPs.
  - **Case 29's Cash flows:** 22 fee calls, the first "15 Feb 2021 to 31 Mar 2021" for $100,000.00, the last $150,000.00, and $4,225,000.00 in all, with no GP column, since its GP commitment is fee-free.
  - **Case 30's half-year with the step:** 1 Jan 2022 to 30 Jun 2022, $212,115.23, of it $4,242.30 the GP commitment's.
  - **A start after D,** and while the fund can't run.
  - **Case 26 switched to a schedule:** your words under Row 2's and Row 4's Kind, Fee offered only on those two, "Show me" to Row 2, the Payouts notice, and a new row an investment. Switching back clears it.
  - **The paste,** as `readPaste` reads it and as the box lists it.
  - **Saving:** case 29 with commitments, and case 31 without them, its frequency written out. A schedule with commitments beside LPs saves without them, and a null schedule opens as fees entered.
  - **Case 30 typed in from a blank fund** with the forms: at X = 0 the clawback card says it owes $150,000.00 back to the LPs, and the saved file reads as case 30, value for value, with the same breakpoints.
  - **The fund-32 refusals:**
    - **All thirty-seven,** opened as a file, are refused in one line, each checked word for word.
    - **The seventeen the form can make,** made on their base cases' tabs: the words under the field the fixture's path names, and in the Payouts notice. The Fee row's is under its Kind.
    - **Only a file can make the other twenty:** fee rate with a schedule, the shapes, the frequency, impossible dates, the first step with a date, the mismatch, and the order fixtures.
- **The counts:** the fund page has 597 tests, from 504. Two guard tests went, and the case tests gained cases 29 to 31.

## 9. Checked on the running page

- **Dev server, in the browser:** case 29's Terms and Cash flows at 1,280 pixels, and the summary line. No console errors.
- **Headless Chrome, as earlier sweeps:**
  - **Every 40 pixels from 320 to 1,400,** on cases 29, 30 and 31 opened as files, on each of the four tabs: 336 checks. No page wider than its window, no box scrolling sideways inside it, and no control outside its card.
  - **Screenshots at 375 pixels:** case 30's fee calls, a card each, and case 29's schedule form.

## 10. CI and permissions (hard rule 9)

Nothing in `.github/workflows/` or `.claude/` changed. `.claude/launch.json` is my local, untracked preview config, as before, and isn't committed.

**CI's commands, here:** `pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference` pass.

| Suite | Tests |
|---|---|
| fund package | 1,310 passed, 9 skipped, unchanged |
| fund page | 597 (504 before) |
| engine | 3,177, unchanged |
| main page | 680, unchanged |
| engine reference | 73 |
| fund reference | 92 |

**One flake:** in the full `pnpm test`, two of the main page's slowest tests timed out at about 25 seconds while every package ran at once. Run alone, the main page passed all 680. Nothing in `apps/dashboard` changed.

## How to check it by behavior

`pnpm --filter @spillpoint/fund dev`, then:

1. **Case 29 from the picker:** pick "A fund with a 2% fee schedule". It opens at $20,000,000.
   - **The breakpoints:** $10,267,676.77, $19,421,853.05 and $21,710,397.12.
   - **The line under the picker:** "This fund: $34.2M paid in over 25 calls (22 from its fee schedule) and $24M distributed before X. X isn't its last distribution."
   - **Terms:** "A schedule", from 15 Feb 2021, Quarterly, step 1 at 2% from the start and step 2 at 1.5% from 15 Feb 2026, and $40,000,000 of total commitments. No management fee rate.
   - **Cash flows:** "The schedule's fee calls" lists 22 calls: 15 Feb 2021, covering 15 Feb 2021 to 31 Mar 2021, for $100,000.00; then $200,000.00 a quarter, $175,000.00 for the quarter of the step, and $150,000.00 after. The total is $4,225,000.00. Each call is a card on a phone.
   - **Try:** set step 1 to 0 for "The first rate must be above 0. To start fees later, change the start date." Clear the total commitments for "Needed: the fund lists no LPs, so the fee is on this total."
2. **Case 30, typed in from a blank fund** with the schedule form:
   - **Cash flows:** As of 31 Mar 2027, ticked as the fund's last distribution. Calls: 1 Jul 2020, Investment, 10000000; 15 Sep 2021, Investment, 8000000. Distributions: 30 Jun 2023, 12000000; 31 Mar 2025, 20000000.
   - **LPs:** Alder Endowment, 15000000; Birchwood Family Office, 10000000.
   - **Terms:** a pref of 8%, a full catch-up, and a 2% GP commitment that pays its share of fees. Then "A schedule": it starts on 1 Jul 2020, the first call. Called Half-yearly; step 1 at 2%; "Add a step", 1.5 from 1 Mar 2022.
   - **Payouts at X = 0:** the clawback card says the GP owes $150,000.00 back to the LPs.
   - **Cash flows:** the 1 Jan 2022 half-year is $212,115.23, of it $4,242.30 the GP commitment's.
3. **Case 31 opened** (`packages/fund/cases/fund-31-fee-schedule-classes-closes/inputs.json`, "Open a file"):
   - **The equalization card:** Dogwood Pension's $60,000.00 of back fees, over all the closes.
   - **Try, on LPs:** put Alder Endowment in Friends and family, and set Anchor's fee rate to 0. Terms shows "No LP pays this schedule: every LP is in a class at a fee rate of 0." under Management fee.
4. **A Fee row with a schedule:** pick case 26, then choose "A schedule" on Terms. On Cash flows, rows 2 and 4 each have "This fund's fees come from its schedule. Remove this row, or set Management fee to Entered as fee calls." under them, and the other rows' Kind has no Fee.
5. **Save and open:** save case 29, then open the file. It comes back with its schedule, its calls and X.

## Assumptions added

- **Nothing new in `ASSUMPTIONS.md`** beyond the first commit's known edge (§1) and FA48 confirmed.
- **The page's own choices** are in the plan's "0.4.0: management fees", each marked "(mine)". The ones that shape what a GP sees are:
  - the starting start (the first call's date)
  - a Fee row's problem under every Fee row
  - the fee calls' columns and their cards on a phone
  - the summary line counting the schedule's calls
  - the file lines

## Open questions

1. **A Fee row "in an opened file".** I read it as a file with Fee rows and no schedule, opened, then switched to a schedule: the rows then show your problem. A file with both a schedule and a fee call is one the engine refuses, so it's refused in one line as it opens, as your "From a file" list has `fee_call_with_schedule`. Or did you want such a file to open into the tabs, with the problem under its rows?
2. **The line under the picker** now counts the schedule's calls. Without that, case 29's said "$30M paid in over 3 calls", leaving out $4.2M of fees. I added "(22 from its fee schedule)". Fine?
3. **The headline's terms line** ("Carry 20%; pref 8%, full catch-up; GP commitment 1%, fee-free.") says nothing about fees, with a schedule or without. Add the schedule to it ("fees 2% a year, quarterly, from 15 Feb 2021"), or leave it to Terms and Cash flows?
4. **The engine's new message** is written lowercase and without the full stop, as the engine's messages are (§1). Fine?
