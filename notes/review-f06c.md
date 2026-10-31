# Review: f06c (fees on invested capital on the page)

Branch `f06c-fund-invested-capital-page`, from main after #133. The third step of spillpoint-fund 0.6.0, covering:
- **Terms:** each fee step's On, "Commitments" or "Invested capital", beside its rate, with your line under the steps, and the LPs' total commitments asked for only with a step on commitments.
- **Problems:** a step on invested capital without investments under its On, and a file's basis in one line naming the step.
- **Cash flows:** the fund's net invested capital under the schedule's calls, and the note beside a distribution that names no investment.
- **Files and the example:** each step's basis saved and opened, f06b's guard out, and case 38 in the picker.

**Outside `apps/fund` and `notes/`, one line:** FA67's status in `packages/fund/docs/ASSUMPTIONS.md`, as your brief's first commit asks. `git diff --stat origin/main HEAD -- packages apps/dashboard cases reference .github .claude` lists that file alone, 1 line in and 1 out. No case file changed, so this PR doesn't need the cases label.

**One PR, not two.** The page's source comes to 174 lines added and 38 taken out, and its tests 569 added and 18 taken out, one new file among them. That's smaller than f04c (1,324 lines in all) and f05c (1,878), each one PR.

| Commit | What |
|---|---|
| `aaed8a1` | FA67 to "Confirmed (f06b review)", and the plan's section, "0.6.0: fees on invested capital" (§1) |
| `f283204` | the page: Terms, problems, Cash flows, files and the example (§2 to §6) |
| `1c8e344` | the page's tests (§7) |
| the last | this note |

## 1. FA67 and the plan's section

- **FA67** is "Confirmed (f06b review)" in `packages/fund/docs/ASSUMPTIONS.md`. Nothing else there changed.
- **`notes/plan-fund-page.md`** gains "0.6.0: fees on invested capital": your words and layout as you gave them, and what they leave open marked "(mine)". f06b's guard line, under 0.3.0's Saving and opening with f04b's and f05b1's, now says f06c takes it out. Building it changed nothing in the section.

## 2. Terms (`src/Terms.tsx`, `src/terms.ts`)

- **Each step's On,** a picker after its rate and before its date: "Commitments" (the default) or "Invested capital". So a row reads "Step 2 [1.5] % On [Invested capital] from [1 Jan 2023] Remove".
  - **Its label for a screen reader (mine):** "Fee rate step 2 is on", as its date's is "Fee rate step 2 is in force from". On screen it reads "On", your word.
  - **A step added (mine)** is on the basis of the step above it, as a new cash flow copies the row above; its rate and date start blank, as before.
- **Your line under the steps,** after "Add a step": "Invested capital is the cost of the fund's investments, less the cost of what it has exited or written off. Each day of a period counts at that day's invested capital." It shows with any schedule **(mine)**, so what Invested capital means is there before it's chosen.
- **"The LPs' total commitments"** shows only when the fund lists no LPs and a step is on commitments. A schedule wholly on invested capital, case 40's, doesn't ask for it.
  - **What was typed (mine)** is kept, out of the input, while no step is on commitments, and comes back with one, as the fee rate is kept with a schedule. Written while hidden, a typo in it would be refused at a field you can't see.
- **The line at the schedule's end (mine)** said "Fees are worked out from the LPs' commitments, …", which a step on invested capital makes untrue. It now names what the steps are on:
  - **Every step on commitments:** as before.
  - **Every step on invested capital:** "Fees are worked out from the fund's invested capital, called in advance on calendar periods; the first period runs from the start date."
  - **Some of each:** "Fees are worked out from the LPs' commitments or the fund's invested capital, as each step says, called in …".
- **The input:** `"basis": "invested_capital"` on a step on invested capital; a step on commitments without the word (FA63). `commitments` only when the field shows.

## 3. Problems in the page's words (`src/terms.ts`, `src/App.tsx`, `src/file.ts`)

- **A step on invested capital without investments,** under its On: "A fee on invested capital needs the fund's investments. Add them on the Investments tab."
  - **The engine names `investments`,** at the end of stage 2 (F40, FA64), the same path as deal by deal's refusal in stage 3. The page tells them apart by the form: with a step on invested capital it's the fee's, under that step's On, whatever the carry basis, since the engine checks it first. With no step on invested capital it's deal by deal's, under "Add an investment", as in 0.5.0.
  - **Under every step on invested capital (mine),** as a Fee row's problem is under every Fee row with a schedule. "Show me" goes to the first one's On.
  - **At the top of every tab,** as before, and on Payouts the notice names the tab of the change: "the terms" after switching a step, "the investments" after removing case 40's one investment.
- **A file's lines (mine):**
  - **A basis that isn't one of the two:** "Fee rate step 2's basis isn't one the page knows: it's commitments or invested_capital."
  - **A step on invested capital without investments:** "Its list of investments is missing: it's needed for a management fee on invested capital." A file deal by deal with no step on invested capital keeps 0.5.0's "…: it's needed to pay carry deal by deal."
  - **An unsupported key on a step:** "… A step has only its rate, what it's on and the date it's in force from." It said "its rate and the date".
- **Everything else is 0.4.0's words,** on either basis.

## 4. Cash flows (`src/CashFlows.tsx`, `src/App.tsx`)

- **The schedule's fee calls,** as in 0.4.0.
- **With a step on invested capital, your line under them,** from `netInvestedCapital(fund)`: "Net invested capital at 30 Jun 2024: $7,000,000."
  - **The amount (mine)** is in whole dollars when it has no cents and to the cent when it has, as the X box shows X.
  - **While the fund can't run (mine)** it isn't there, since it's the engine's.
- **Fees started with nothing to call (mine).** A schedule on invested capital can start on or before D and still call nothing, when the fund has had no invested capital on any day the fee is on it. 0.4.0's "No fee call yet: fees start on 1 Jul 2024." would then name a date already past, so it reads "No fee call yet: the fund has had no invested capital while its fee has been on it." Case 40 with its fee starting the day after its exit shows it. A start after D reads as before.
- **Your note beside a distribution that names no investment,** on the whole fund with a step on invested capital: "Names no investment, so it doesn't lower invested capital."
  - **Where (mine):** in a line under its row, where a problem in its row goes, in a hint's grey; on a phone, under its card. In the From cell it would widen the table past its card.
  - **Deal by deal** From "—" is a problem, as in 0.5.0, so the note isn't there.

## 5. Files (`src/file.ts`)

- **Saving keeps each step's basis.** A step on commitments is saved without the word, so a fund with no step on invested capital saves exactly as before.
- **f06b's guard is out,** with two of its three tests. The third, "opens fee steps written on commitments, and saves them as the same fund without the basis", is now f06c's own rule, so it stays.
- **A file's commitments, with no LPs and every step on invested capital (mine),** open, and a save leaves them out, as the form doesn't ask for them there. Without a step on commitments they change no amount (F39). It's 0.4.0's rule for commitments beside listed LPs.

## 6. The example (`vite.config.ts`)

- **Case 38 is in the picker** as "A fee that moves to invested capital", after case 34. The others stay.
- **It opens at $5,000,000 (mine),** a listed X, below its one breakpoint at $5,446,930.70, where the LPs have their $15,292,461.39 of paid-in back, the schedule's fees among it.

## 7. Tests

- **The page's pending list is empty,** so cases 38 to 41 run through every case test:
  - the Terms, Cash flows and LPs forms write cases 38 to 40 back exactly, with the same breakpoints, each step's basis among the terms
  - each `inputs.json` opens and saves back with the same values
  - the chart's lines and each breakpoint's slopes
- **Lists that grew:** the examples (eight), the chart ranges (case 38's $31,000,000, twice its $15,432,461.39 paid in, rounded up) and the final cases (case 40).
- **fund-32's `fee-step-basis`:** opened as a file, it now reads "Its list of investments is missing: it's needed for a management fee on invested capital." The form can make it too, case 29's second step switched to Invested capital, so fund-32's form-made fixtures go from seventeen to eighteen.
- **New, in `test/invested.test.tsx`, 45 tests:**
  - **Terms:** case 38's two steps, the On picker and its label, your line, the end's line on each basis, a step added on the basis above.
  - **The commitments:** asked in case 38; never in case 40, a step added included, until a step is on commitments; kept and left out of the save while hidden; not asked beside LPs.
  - **Your checks:** case 38's 18 fee calls, the six on invested capital, $1,432,461.39 in all and "Net invested capital at 30 Jun 2024: $7,000,000."; case 39's line, $6,500,000; case 40 never asking for the commitments, its three calls and its line, $0 at 31 Mar 2025; case 29's second step switched to Invested capital and back.
  - **The investments line:** under each step on invested capital, "Show me" to the first, before deal by deal's, and case 40 with its investment removed.
  - **Cash flows:** no line with every step on commitments or while the fund can't run; fees started with nothing to call; the note, and invested capital rising to $11,000,000 when Alder's exit names no investment; no note deal by deal.
  - **Saving and opening:** case 38's and case 40's steps; commitments beside a schedule wholly on invested capital; a step switched in the form.
  - **Case 38 in the picker:** its label, its X, its one breakpoint and the line under the picker.
  - **The fund-41 refusals:**
    - **All fifteen,** opened as a file, are refused in one line, each word for word.
    - **The five the form can make,** made on their base cases' tabs: the words under the field, and in the Payouts notice. The three on missing investments are under a step's On, and the test checks the fixture's path is `investments`. On case 38, its write-off goes first: a write-off names the investment it ends, so with its investment removed it's refused before the investments, where the fixture's write-off names one the file doesn't list.
    - **Only a file can make the other ten:** the five bases, the mismatch, a fee rate beside the schedule, an unknown class, a rate before a basis, and an offset.
- **Planted errors:** nineteen in the page, one at a time, each run against the whole page suite and restored from git. Every one failed at least one test; fourteen were caught only by `invested.test.tsx`. The plants:
  - **The input:** a step's basis never written; a step on commitments written with the word; the commitments written beside a schedule wholly on invested capital.
  - **Terms:** the commitments asked for whatever the basis; a step added always on commitments; the line at the schedule's end always on commitments.
  - **The investments line:** under the first step only; left to the Investments tab, as deal by deal's; claimed with no step on invested capital.
  - **Cash flows:** the invested capital line with every step on commitments, or to the cent; fees started with nothing to call said to start later; the note deal by deal too, or with every step on commitments.
  - **Files:** a basis in the generic words; missing investments in deal by deal's words; a step's key in 0.5.0's words; f06b's guard left in.
  - **The example:** case 38 opening at $12,000,000.
- **The counts:** the fund page has 823 tests, from 758.

## 8. Checked on the running page

- **Dev server, in the browser pane:** case 38 from the picker, its Terms with the two Ons and the commitments, its Cash flows with the 18 calls and the line, and Alder's exit switched to "—" with the note under its row and the line at $11,000,000. No console errors.
- **Every width from 320 to 1,400,** one pixel at a time, on Terms and Cash flows of cases 38 to 40 opened as files: 6,486 checks, none failing. No page wider than its window, no box scrolling sideways inside it, and no control outside its card, the On pickers included.
  - **How:** the page in an iframe on the dev server, set to each width in turn, in the browser pane rather than headless Chrome, so nothing ran outside the sandbox. Every layout rule the page has goes by width, a media query, a container query or a measurement, so the iframe's width is the window's for them. A phone's touch emulation isn't on, and nothing in the layout reads it.
  - **The check catches what it looks for:** with the On pickers forced to 420 pixels wide, it reported the page wider than its window and each picker outside its card at 320 pixels.
  - **Case 38's cash flows** are cards up to 977 pixels and a table from 978, as 0.5.0's are.
- **Phone (375 pixels), case 38's Terms:** each fee step wraps, its rate on one line and On with its picker on the next. Step 1's "from the start" fits beside its On, and step 2's date and Remove go on a third line.

## 9. CI and permissions (hard rule 9)

Nothing in `.github/workflows/` or `.claude/` changed. `.claude/launch.json` is my local, untracked preview config, as before, and isn't committed.

**CI's commands, here:** `pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference` pass, on the first try.

| Suite | Tests |
|---|---|
| Fund page | 823 (758 before) |
| Fund package | 2,115 passed, 13 skipped, unchanged |
| Engine | 3,177, unchanged |
| Main page | 680, unchanged |
| Spillpoint reference | 73, and `generate.py --check` on every case |
| Fund reference | 125, and `generate.py --check` on all 41 folders |

## How to check it by behavior

`pnpm --filter @spillpoint/fund dev`, then:

1. **Case 38 from the picker:** "A fee that moves to invested capital". It opens at $5,000,000.
   - **One breakpoint, at $5,446,930.70:** "LPs have their $15,292,461.39 of paid-in capital back".
   - **Terms:** step 1 at 2% On Commitments from the start, step 2 at 1.5% On Invested capital from 1 Jan 2023, your line under them, and the LPs' total commitments, $20,000,000.
   - **Cash flows:** 18 fee calls, twelve of $100,000.00, then $44,550.00, $48,303.30, $44,388.59, $37,125.00, $32,107.01 and $25,987.50; the total $1,432,461.39 over 18 calls; under them, "Net invested capital at 30 Jun 2024: $7,000,000."
   - **Try:** set row 4's From (Alder's exit) to "—". Under its row: "Names no investment, so it doesn't lower invested capital." The line goes to $11,000,000, and the later calls rise.
2. **Case 39 opened** (`packages/fund/cases/fund-39-invested-capital-deal-by-deal-classes/inputs.json`, "Open a file"):
   - **Terms:** half-yearly, step 2 at 1.75% On Invested capital from 1 Apr 2023. No commitments field: it lists its LPs.
   - **Cash flows:** 8 calls with the GP commitment's part, $759,404.86 in all, and "Net invested capital at 30 Sep 2024: $6,500,000."
   - **Its three breakpoints:** $5,000,000.00, $5,279,539.50 and $5,559,079.01, a class's capital back at each.
3. **Case 40 opened** (`fund-40-spv-fees-on-invested-capital`):
   - **Terms:** one step, 2% On Invested capital, yearly, and no commitments field. "Fees are worked out from the fund's invested capital, …". Add a step: it's on Invested capital, and still no commitments. Switch it to Commitments, and the field shows.
   - **Cash flows:** three calls, $32,000.00, $40,000.00 and $19,781.42, nothing for 2025, and "Net invested capital at 31 Mar 2025: $0."
4. **Try:**
   - **Case 29 to invested capital:** pick "A fund with a 2% fee schedule", and on Terms set step 2's On to Invested capital. Under it: "A fee on invested capital needs the fund's investments. Add them on the Investments tab." Payouts says "Your last change to the terms has a problem, …". Back to Commitments, and it's as it was.
   - **Save and open:** save case 38, then open the file. Step 2 is on Invested capital, step 1 on Commitments, and the file's step 1 has no `basis`.

## Assumptions added

- **Nothing new in `ASSUMPTIONS.md`:** nothing in the engine changed, and every page choice is in the plan's section, marked "(mine)".
- **The ones that shape what a GP sees:**
  - the line at the schedule's end naming what the steps are on (§2)
  - the investments line under every step on invested capital (§3)
  - fees started with nothing to call (§4)
  - the note under the row (§4)
  - commitments kept out of the input, and out of a save, while no step is on them (§2, §5)
  - a step added on the basis above
  - case 38 opening at $5,000,000

## Open questions

1. **The headline's terms line.** It names the schedule as before, without a step's basis: case 38 reads "…; management fee 2% a year from 1 Jan 2020, 1.5% from 1 Jan 2023, called quarterly." Should a step on invested capital say so, as "1.5% of invested capital from 1 Jan 2023"? 0.4.0's line came from f04c's review and went in at f04d, so I left it for your answer.
2. **The line at the schedule's end.** I changed your 0.4.0 wording when a step is on invested capital, since "worked out from the LPs' commitments" isn't true of case 40 (§2). Fine, or other words?
3. **Commitments while no step is on them.** The page keeps what was typed but leaves it out of the input and the save, so a file with commitments and every step on invested capital saves without them (§5). They change no amount, but the file changes. Fine, or keep writing them when typed?
