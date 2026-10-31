# Review: f05c (investments and carry deal by deal on the page)

Branch `f05c-fund-deals-page`, from main after #129. The third step of spillpoint-fund 0.5.0, covering:
- **Terms:** "Carry is paid", on the whole fund or deal by deal, with the pref and catch-up off deal by deal.
- **An Investments tab:** each investment with its checks, and under them the table from `portfolio(fund)`.
- **Cash flows:** a distribution's From and Share sold, and a Write-off type.
- **Beside X:** From and Share sold, deal by deal.
- **Payouts:** the headline's "deal by deal", what's due beside the split, and each class's due.
- **Problems, files, the example:** every F37 refusal in the page's words, files keeping all of it, and case 34 in the picker.

**Nothing outside `apps/fund` and `notes/` changed.** `git diff --stat main -- packages apps/dashboard cases reference .github .claude` prints nothing. No case file changed, so this PR doesn't need the cases label.

**One PR, not two.** The page's source comes to 864 lines added and 127 taken out, two new files among them, and its tests 838 added and 49 taken out. That's more than f04c (1,324 lines in all) and less than f03c (2,721), each one PR. Splitting it would have shipped the forms to the site before the payouts that explain them, since Pages deploys main, so I kept it whole.

| Commit | What |
|---|---|
| `a07ab8b` | the plan's section, "0.5.0: investments and carry deal by deal" (§1) |
| `22f5c42` | the page: Terms, Investments, Cash flows, X's source, Payouts, problems, files, the example, and the plan's lines building settled (§2 to §9) |
| `108fbb3` | the page's tests (§10) |
| the last | this note |

## 1. The plan's section

`notes/plan-fund-page.md` gains "0.5.0: investments and carry deal by deal": your words and layout as you gave them, and what they leave open marked "(mine)". Its Saving and opening line for f05b1's guard now says f05c took it out. The page's commit adds what building it settled: the one Kind / From column and the cards' threshold (§4), the tab's new intro line, the due after the paid-ins, and the due's list without a comma before its "and" (§6).

## 2. Terms (`src/Terms.tsx`, `src/terms.ts`)

- **"Carry is paid",** a group after Carry: "On the whole fund" (the default) and "Deal by deal", with your line under them whichever is chosen.
- **Deal by deal, the pref's box** is unticked and can't be ticked, with "Off deal by deal: this version has no pref deal by deal, so no catch-up either." The catch-up group goes, as without a pref. What was typed in them is kept out of the input and comes back on the whole fund, as the carry keeps its steps when it's flat.
- **The input:** `carry_basis: "deal_by_deal"` only deal by deal; the whole fund is left out, as its default. Deal by deal, no `pref` or `catch_up`.

## 3. The Investments tab (`src/Investments.tsx`, `src/investments.ts`, new)

- **After Cash flows:** the tabs run Payouts, Terms, Cash flows, Investments, LPs. See open question 1.
- **Each investment:** a group "Investment 1" with its name, then its checks, "Check 1", "Check 2", each a date and an amount.
  - **Its buttons:** "Add a follow-on" (focusing the new check's date) and "Remove this investment". Each check after the first has "Remove"; the first goes with its investment.
  - **"Add an investment"** under them adds one with its first check, its name focused.
  - **With none:** "No investments yet. Add them to tag distributions and write-offs, and to pay carry deal by deal."
- **Under them, "The investments at 30 Jun 2024, before X":** the engine's `portfolio(fund)`, read-only.
  - **Columns:** Investment, Cost, Exited or written off, Written off, Proceeds and Realized multiple. Amounts to the cent; the multiple to two places, rounded down, as the LPs' net multiple is ("3.00x"), and "—" while nothing is realized.
  - **A line under it:** "Cost is each investment's checks to D. The realized multiple is its proceeds over the cost exited or written off."
  - **While the fund can't run:** "The table shows here once the fund can run."
  - **On a phone,** each investment is a card, through `CardTable` as Payouts' cards are.
- **Where the form keeps them:** with the cash flows, in `FlowsForm`, so `flowsInput` writes the investments, the tags and X's source together.
  - **A tag holds its investment's row,** not its name, as an LP holds its class, so renaming an investment keeps its tags.
  - **Removing an investment** leaves the cash flows and X's source that named it on "—".

## 4. Cash flows (`src/CashFlows.tsx`, `src/flows.ts`)

- **Type:** Call, Distribution or Write-off.
- **One column, "Kind / From" (mine):** a call's kind, or a distribution's or write-off's investment. A row has one or the other. See open question 2.
  - **The picker:** each investment by name, or "Investment 2" while it has none.
  - **"—":** offered on a distribution on the whole fund. Deal by deal, and on a write-off, it isn't offered, but a row already on none keeps it, with the problem under it, as a Fee row does with a schedule.
- **"Share sold":** a percent box, 100 by default, on a distribution with a From. Otherwise "—".
  - **The input:** typed and written as the terms' rates are, so 40 is `"0.4"` and "40%" reads too. 100% is left out, as the default.
- **A write-off:** its date and investment, with "—" under Share sold and Amount, and no `amount` in the input.
- **A new row** copies the type, kind and From of the row above.
- **The tab's lines:** the intro now reads "Every call, distribution and write-off before X, in the order entered." Under the table: "On one date, calls run first, then the investments' checks, then write-offs, then distributions in the order shown here. “Sort by date” keeps that order within a date."
- **On a phone,** each row is a card as before, with only its type's fields:
  - a call's kind and amount
  - a distribution's From, amount, and "Share sold" beside its box
  - a write-off's From
  - **The threshold:** the table now needs about 845 pixels, so the cards go up to an 880-pixel card, from 760. A 1,024-pixel window shows the table; about 980 and under shows cards.
- **Pasting** is unchanged: pasted rows are calls and distributions with no From. Deal by deal, each distribution then asks for one.

## 5. Beside X (`src/Investments.tsx`, `src/App.tsx`)

- **Deal by deal, "From" and "Share sold"** under the X box, for `distribution_from`: the same picker with no "—", and 100% by default. A change to them is a change to the fund, so it's "Not saved" and runs the engine again.
- **On the whole fund** they're hidden. A file's X source is kept and saved as it was, since it changes no amount there.
- **A fund that has never run,** as a blank fund built deal by deal hasn't, has them in the "No payouts yet" card, so X's source can be set before there are payouts.
- **A problem with X's source** shows under From or Share sold. Payouts' notice says "Your last change to X's source has a problem, …", and saving says "Not saved: X's source has a problem to fix first."

## 6. Payouts (`src/App.tsx`, `src/classesCard.ts`)

- **The headline's terms line:** "Carry 20% deal by deal; no pref; GP commitment 1%, fee-free."
- **"Due to LPs before carry",** deal by deal, among the facts under the split table, after the paid-ins. It's to the cent, as they are: "$11,100,000.00". See open question 3.
  - **At the end,** X final or the NAV point: "$11,100,000.00, all their paid-in: $9,900,000.00 of cost and $1,200,000.00 of fees and expenses".
  - **With capital called and never invested,** its part too: "…: $9,000,000.00 of cost, $900,000.00 called and never invested and $1,200,000.00 of fees and expenses". It's listed as the headline lists carry steps, and counts only from a cent.
- **The classes card:** a "Due before carry" column after Paid in, deal by deal.
- **At the NAV point of a fund whose X isn't final,** the split, its due, the headline and the chart's X readout are now the NAV split's, as the cards after the split already were (mine). See open question 4.
  - **On the whole fund** the NAV split's tiers equal the axis's there, so nothing on it changes.
  - **Deal by deal** what's due at the NAV point is the end's (FA58). Case 36 has $12,855,000 due at its NAV point and $10,069,750 on its axis, so the split differs. Its expected point at $15,000,000 is the NAV point's, and the page now matches it.
  - **The chart's lines** stay on the axis.
- **Payouts' notice** names the tab the change was made on, not the problem's (mine). Switching case 26 to deal by deal on Terms reads "Your last change to the terms has a problem, …", and "Fix it" goes to "Add an investment" on Investments. See open question 5.

## 7. Problems in the page's words (`src/investments.ts`, `src/flows.ts`, `src/file.ts`, `src/terms.ts`)

- **From the form,** under the field the path names, in the plan's words:
  - **Investments:** none deal by deal; a blank name; a repeated name; a check's date, amount, date after D, or checks past the investment calls.
  - **Cash flows:** a distribution without a From deal by deal; a write-off without one; a From whose investment has no name yet; a share; a distribution or write-off before its investment's first check ("This distribution is before the first check in Alder Robotics, on 1 Feb 2020.").
  - **X's source:** none deal by deal, and its share.
- **"Show me" and "Fix it":**
  - **The investments** go to the Investments tab, and X's source to Payouts.
  - **The fields:** a check's problem to its date, an investment's to its name, and X's source missing to its From.
- **From a file, in one line:** a place for each investment, check and X-source path, and a line for each new rule. A missing cash-flow investment says why by what the row is: "…: a write-off names the investment it ends", "…: a share sold needs the investment it's sold from", or "…: deal by deal, every distribution comes from one". The page reads the row's type from the file itself, since one term at one path can be any of the three.

## 8. Files (`src/file.ts`)

- **f05b1's guard is gone,** and so are its two tests.
- **Saving keeps** the basis, the investments, a distribution's investment and share, the write-offs and X's source.
- **Names are trimmed as a file opens** (mine): each investment's, and the investment a cash flow and X's source name, as LP and class names are (FA17, FA27). So "Alder " never reaches the engine.

## 9. The example (`vite.config.ts`)

Case 34 in the picker as "A fund that pays carry deal by deal", after case 29. It opens at $5,000,000 (mine), its listed X, below its one breakpoint: X from Cedar AI goes to the LPs as capital, toward the $11,100,000 due. The others stay.

## 10. Tests

- **The page's pending list is empty,** so cases 33 to 37 run through every case test:
  - the Terms, Cash flows and LPs forms write each case back exactly, with the same breakpoints. The Cash flows round trip now compares the investments and X's source too.
  - each `inputs.json` opens and saves back with the same values
  - the chart's lines and each breakpoint's slopes
  - case 35's clawback, now among the final cases
- **Lists that grew:** the examples (seven), the tabs (five), the chart ranges (case 34's $23,000,000, twice its $11,200,000 paid in, rounded up) and the final cases (case 35).
- **New, in `test/deals.test.tsx`, 117 tests:**
  - **The forms:** the round trip for cases 33 to 36; a 100% share left out and 40% written `"0.4"`.
  - **Terms:** the basis and its line; the pref off deal by deal and back; a pref typed on the whole fund kept out of a deal-by-deal input; the saved terms.
  - **Investments:** case 34's checks and table; case 35's, row for row (Dogwood Labs 40% sold, 2.50x; Elm Bio's escrow release among its proceeds); adding an investment and a follow-on with their focus; removing a check; removing an investment, its tags on "—"; the lines with none, and while the fund can't run.
  - **Cash flows:** case 34's exit and write-off; "—" only on the whole fund; a new row's From; a share saved and dropped.
  - **Beside X:** shown deal by deal, hidden on the whole fund and saved as it was; a 50% share moving the due to $8,880,000.00 and the breakpoint to $5,606,060.61; in the "No payouts yet" card.
  - **Your checks below,** for cases 34, 33, 35 and 36, and case 36 at its NAV point.
  - **Case 26 switched to deal by deal and back,** then run deal by deal once it has an investment and X's source.
  - **Saving and opening:** cases 34 to 36 save their basis, investments, tags, write-offs and X's source; names trimmed as a file opens.
  - **The due's words:** before and at the end, with and without capital never invested, a part under a cent not counted.
  - **The fund-37 refusals:**
    - **All fifty-five,** opened as a file, are refused in one line, each word for word.
    - **The twenty-two the form can make,** made on their base cases' tabs: the words under the field the fixture's path names, and in the Payouts notice.
    - **Only a file can make the other thirty-three:** the shapes, a pref deal by deal, the basis, an investment on a call, a kind, amount or share on a write-off, an unknown investment, a share without one, the order fixtures. Also "40%", which the form reads as 40, and a test says so.
- **Planted errors:** eighteen, one at a time, each run against the page's deal, cash flows, file, terms and classes tests. Seventeen were caught at once. The one that got through, a pref typed on the whole fund still written deal by deal, now has a test ("keeps a pref typed on the whole fund out of the input deal by deal"), and is caught. The plants: a share sold never written; a write-off written with an amount; a file's share not read; the basis never written; deal by deal keeping the pref; the end's parts not shown; a class's due as its paid-in; the NAV point on the axis; a file's investment names not trimmed; the call and write-off lines swapped; Written off showing the cost realized; "—" offered deal by deal; the checks past the calls in the amount's words; the headline without "deal by deal"; the notice naming the problem's tab; X's source written without its share; the table dropping a row; a distribution before its check in generic words.
- **The counts:** the fund page has 749 tests, from 607.

## 11. Checked on the running page

- **Dev server, in the browser:** case 34 from the picker on each tab at a 1,024-pixel window: Terms, the cash flows table (it fits its 926-pixel card), the Investments tab and its table, and the X box with its source. No console errors.
- **Every 40 pixels from 320 to 1,400** on cases 33 to 36, opened as files, on each of the five tabs, as f04c's sweep: no page wider than its window, no box scrolling sideways inside it, and no control outside its card.
  - **One thing that isn't new:** at 480 pixels, showing Payouts after the window narrowed while another tab was open, the split shows as one table, scrolling sideways, for under a second before it measures and becomes two. Case 26 does the same on code from main, so I left it.
- **Phone (375 pixels):** the cash flows' cards with only their type's fields, the investments one under another, their table as cards, and X's source under the X box.

## 12. CI and permissions (hard rule 9)

Nothing in `.github/workflows/` or `.claude/` changed. `.claude/launch.json` is my local, untracked preview config, as before, and isn't committed.

**CI's commands, here:** `pnpm install && pnpm typecheck && pnpm build` pass. `pnpm test`, which runs every package at once, failed on its three tries here, each time on timeouts alone:
- **The first try:** two of the fund package's random-fund tests timed out at 5 seconds. Nothing under `packages/` changed, and both passed on the next two tries.
- **The second and third:** three of the fund page's tests timed out at 20 seconds, different ones each time. They're existing tests that type a fund in field by field, or make a refusal in the form. Under that load the page's suite takes 213 seconds against 35 alone.

**Each suite alone** passes every test, and `pnpm test:reference` passes. That's what f04c saw on the main page.

**Is the page slower?** On the 605 tests main and this branch share, the branch takes 114 seconds of test time against main's 108, about 6% more. The suite as a whole runs in about 26 seconds on either. So I left the timeouts as they are. If GitHub's run times out the same way, a rerun should clear it, and I'll say so on the PR.

| Suite | Tests |
|---|---|
| fund package | 1,871 passed, 10 skipped, unchanged |
| fund page | 749 (607 before) |
| engine | 3,177, unchanged |
| main page | 680, unchanged |
| engine reference | 73 |
| fund reference | 114 |

## How to check it by behavior

`pnpm --filter @spillpoint/fund dev`, then:

1. **Case 34 from the picker:** "A fund that pays carry deal by deal". It opens at $5,000,000.
   - **The headline:** "Carry 20% deal by deal; no pref; GP commitment 1%, fee-free."
   - **Under the X box:** From Cedar AI, Share sold 100%.
   - **One breakpoint, at $7,848,484.85:** "LPs have their $11,100,000 back for the investments exited or written off, fees and expenses included."
   - **Under the split:** "Due to LPs before carry $11,100,000.00".
   - **Alder's exit:** type 0 into the X box. The fund to date is Alder's exit: $3,330,000.00 of capital to the LPs, then on "Carry at 20%" $4,464,000.00 to the LPs and $1,116,000.00 to the GP.
   - **At NAV:** "Set X to NAV". The Total row's GP to date is $1,938,000.00 in all, and the clawback card owes nothing back. The due reads "$11,100,000.00, all their paid-in: $9,900,000.00 of cost and $1,200,000.00 of fees and expenses".
   - **The Investments tab:** Alder Robotics cost $3,000,000.00, all exited, proceeds $9,000,000.00, 3.00x. Birch Health $3,000,000.00 written off, 0.00x. Cedar AI $4,000,000.00 held, "—".
   - **Cash flows:** row 6 is a Distribution from Alder Robotics, 100% sold, $9,000,000. Row 7 is a Write-off of Birch Health, with no amount.
2. **Case 34 switched to "On the whole fund"** on Terms, which is case 33:
   - **The headline:** "Carry 20%; no pref; …". From and Share sold go from under the X box, and there's no due line.
   - **No carry at the exit:** at X = 0 the fund to date is $8,910,000.00 of capital and nothing to the GP.
   - **One breakpoint,** at $2,212,121.21.
   - **At $12,000,000,** the GP's carry to date is the same $1,938,000.00.
   - **The Investments tab's table** is the same on either basis.
3. **Case 35 opened** (`packages/fund/cases/fund-35-deal-by-deal-clawback/inputs.json`, "Open a file"):
   - **At X = 0:** "…the GP has been paid $2,348,128.00 of carry, has earned $0.00 on the fund's totals, and owes $2,348,128.00 back to the LPs."
   - **Cleared at $18,376,163.27,** its second breakpoint. Choose it: it owes nothing back.
   - **X is final,** so the due is all the LPs' paid-in: $24,888,000.00, with its parts.
   - **The Investments tab:**
     - Dogwood Labs: 40% sold, $2,400,000.00 of its $6,000,000.00 exited, 2.50x.
     - Elm Bio: $13,000,000.00 of proceeds, its escrow release among them, 3.25x.
     - Fir Payments: $5,000,000.00 written off.
     - Hazel Cloud: held, "—".
4. **Case 36 opened** (`fund-36-deal-by-deal-classes-closes`):
   - **Its three breakpoints:** $5,400,000.00, $5,841,919.19 and $6,283,838.38.
   - **At X = 0, the classes card's "Due before carry":** Fund terms $5,240,500.00, Anchor $2,968,050.00, Friends and family $1,861,200.00. Under the split, their $10,069,750.00.
   - **"Set X to NAV":** the due is the end's, $12,855,000.00, all their paid-in, and each class's: $6,690,000.00, $3,789,000.00 and $2,376,000.00.
5. **Try:**
   - **Case 26 to deal by deal:** pick "Two later closes and a friends-and-family class", then choose "Deal by deal" on Terms. Every tab says "Deal by deal needs the fund's investments: add each one, with its checks." Payouts says "Your last change to the terms has a problem, …", and "Fix it" goes to "Add an investment". Back to "On the whole fund", and it's as it was.
   - **A check past the calls:** on case 34's Investments tab, set Cedar AI's check to 4500000. Under it: "By this check's date the checks come to more than the investment calls. Checks are paid from capital called for investments."
   - **Save and open:** save case 34, then open the file. It comes back with its investments, tags, write-off, X's source and the basis, at the X it had.

## Assumptions added

- **Nothing new in `ASSUMPTIONS.md`:** nothing in the engine changed, and every page choice is in the plan's section, marked "(mine)".
- **The ones that shape what a GP sees:**
  - the Investments tab after Cash flows
  - one Kind / From column
  - the due to the cent, after the paid-ins, with its parts only at the end
  - the NAV split at the NAV point
  - the notice naming the tab of the change
  - names trimmed as a file opens
  - case 34 opening at $5,000,000

## Open questions

1. **The tab's place.** You wrote "between Cash flows and Payouts". The tabs run Payouts, Terms, Cash flows, LPs, so those two aren't next to each other. I put Investments right after Cash flows, before LPs, since a distribution's From names one. Or did you want it before Terms, next to Payouts?
2. **"Kind / From" as one column.** With a From column and a Share sold column, the table needed 1,018 pixels, more than the 926 the card has at a 1,024-pixel window. One column, holding a call's kind or a distribution's investment, brings it to about 845. Or keep two columns, and let the cash flows be cards up to about a 1,060-pixel card, which means cards at every desktop width?
3. **The due to the cent.** Your line reads "Due to LPs before carry: $11,100,000". It's in the facts under the split, which are to the cent, so it reads "$11,100,000.00". The breakpoint's reason keeps the engine's "$11,100,000". Fine?
4. **The NAV split at the NAV point.** Deal by deal, at a fund's NAV point, the split as if liquidated differs from the axis's split at the same X (case 36: $12,855,000 due against $10,069,750). The page now shows the NAV split's split, due and headline there, as its cards already did and as the case's point at NAV has it. The chart's lines stay on the axis, so for case 36 the GP's dot at NAV sits off its line: $857,850.00 as if liquidated, against $1,270,892.50 on the axis at $15,000,000. On the whole fund nothing changes. Fine, or should the chart show a jump at NAV?
5. **The notice naming the tab of the change.** Before, Payouts' notice named the problem's tab. Switching to deal by deal on Terms would then have said "Your last change to the investments has a problem", about a tab you hadn't touched. It now names the tab the change was made on. That also changes one existing case: a class change on LPs that leaves a fee call unpaid now says "the LPs", not "the cash flows". "Fix it" still goes to the problem. Fine?

## Your answers (f05c review)

Your checks on the built page: 2,055 against your own checker, no failures, no console errors. CI ran clean for you twice all at once and once one suite at a time.

1. **Investments after Cash flows:** yes.
2. **One "Kind / From" column:** yes.
3. **The due to the cent:** yes, as the facts beside it are.
4. **The liquidation's split at the NAV point:** keep it, and say so in the line under the chart's values, deal by deal, when what's due at the end differs from the axis's. No jump in the chart. Done in the fix-up, §1 below.
5. **The notice naming the tab of the change:** yes.

## The fix-up (f05c review)

### 1. The line under the chart's values at the NAV point (`src/App.tsx`, `src/Chart.tsx`)

- **Your words,** deal by deal, at the NAV point of a fund whose X isn't final, when what's due at the end differs from what's due on the axis at the same X: "Values at NAV, $15,000,000.00, as if the fund were liquidated: everything left of every investment counts as realized, so all the LPs' paid-in comes back before carry. The lines are X from Kapok Robotics, 50% sold."
  - **The investment and share** are X's source's, the share as a percent, so all of it reads "100% sold".
  - **Otherwise it's as before:** "Values at X = $15,000,000.00, from this distribution." The chart's lines stay on the axis, with no jump.
- **"Differs" is to the cent (mine),** as the two dues show on the page. Case 34's NAV point keeps the line as before, since its X from Cedar AI realizes everything left, and so does the whole fund.
- **Where:** `navValuesLine` in `App.tsx` works out the line from the fund and the two splits; `Chart` takes it as `valuesLine` and shows it in place of the usual line.
- **The plan's section** says so under Payouts.
- **Tests,** in `test/deals.test.tsx`:
  - **Case 36:** at X = 0 the line is as before. At NAV it's yours word for word, and the GP's value beside it is the liquidation's $857,850.00, not the axis's $1,270,892.50. A cent past NAV, it's as before again.
  - **Case 34 at its NAV point, and case 33 at its,** keep the line as before.
- **Planted errors,** three, one at a time: the line never shown, and the share written as `0.5`, were each caught. The third, dropping "whose X isn't final", changes nothing: at a final fund's NAV the split is the axis's, so the two dues already match.

### 2. Outside the fund rule, with your OK: the root `package.json`'s `test` script

- **One line:** `"test": "pnpm -r test"` is now `"test": "pnpm -r --workspace-concurrency=1 test"`. The suites run one at a time, so the page's and the main page's long tests stop timing out under the parallel load (§12).
- **Nothing in `.github/` changes:** CI already runs `pnpm test`. Nothing else in `package.json` changes. Neither the tarballs nor `apps/` code change.
- **Left as they are:** two test comments in `apps/dashboard` still describe "the workspace's parallel run (pnpm -r test)". They're `add-a-round.test.tsx`'s and `ocf-check.test.ts`'s, beside their own timeouts. The timeouts stay; the comments are outside your OK, so I didn't touch them.
- **Here:** `pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference` passes the first time, with no timeouts. That's 347 seconds for the whole of it, references included. Each suite's own run:
  - engine 3,177 tests in 5 seconds
  - fund package 1,871 in 1.4
  - main page 680 in 53
  - fund page 751 in 25

  Before, all at once, the page's suite alone took 213 seconds (§12).

### The counts after the fix-up

| Suite | Tests |
|---|---|
| fund package | 1,871 passed, 10 skipped, unchanged |
| fund page | 751 (749 before the fix-up, 607 on main) |
| engine | 3,177, unchanged |
| main page | 680, unchanged |
| engine reference | 73 |
| fund reference | 114 |
