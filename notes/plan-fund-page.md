# Plan: the fund page, at /fund/

The fund waterfall's own page: spillpoint.github.io/spillpoint/fund/ now, spillpoint.io/fund/ after the engine's 1.0.
- **Its own page, not a tab** (your choice), so a GP who never touches a cap table gets a link of their own.
- **This is the plan, with no code.** Your answers of 2026-10-13 are at the end, and the plan follows them.
- **Live with spillpoint-fund 0.1.0,** switched on by its release step, f01n, and not before.

**What it runs on:** the fund engine with the names f01e's naming review settles, before the first page step:
- reading a fund, its split at X, its NAV point and its breakpoints
- its one refusal class, its Decimal, and its amounts to the cent

The split includes the LPs' net multiple, so the page does no fund arithmetic of its own (your answer 9).

## Who it's for

An emerging-manager GP: one or two funds, a spreadsheet of calls and distributions, an LPA they know well. They won't write JSON. They want to know:
- what a distribution would pay them in carry
- where the split changes as it grows
- whether a last distribution leaves them owing a clawback

So the page is a form and a table, not an input file. The file is how the page keeps a fund, and nobody needs to read it.

## What it shows

One column of cards, in the main page's style (`notes/design-m3.md`):
- plain words before numbers
- one accent
- never color alone
- nothing off the screen down to 320 pixels

### The order of the cards

The main page's (f01g review, from your look at the page): the answer, then X with its slider, the chart right under them, the split table after it, and the breakpoint list last. The clawback card, when there is one, sits after the split, so the chart and the split, both about this distribution, sit together (f01i; in f01h it was under the chart).

**Tabs, as the main page has them (f01i):** Payouts (everything above), Terms and Cash flows. Under the picker, one line on the fund behind the answers, as the main page's "built from its 10 events": "This fund: $11M paid in over 4 calls, $4M distributed before X and a NAV of $40M on 30 Sep 2026. X isn't its last distribution."

### The answer first

A headline at the chosen X, in neutral words, since the same file goes to LPs and co-GPs (your answer 6): "At a $40M distribution on 30 Sep 2026, the GP's carry is $6.81M. The LPs get $32.8M and the GP commitment $400K." Under it, the caveat every spillpoint page carries: the fund's documents govern, not this tool, and nothing leaves the computer.

**When the GP owes a clawback,** the headline says so, so it never shows carry without the clawback beside it (f01h). It stays in one frame (f01i):
- **A fund that isn't final:** this distribution, as before: "At a $34.5M distribution on 30 Sep 2026, the GP's carry is $5.45M." At NAV, the fund's life, since NAV is final by definition (f01i review, answer 1): "If the fund were liquidated at NAV, $40M on 30 Sep 2026, the GP would end with $6.81M of carry." When something would be owed: "…would end with $5M of carry: it would get $1M now and give back $750K." The line under it is this distribution's, as for a final fund: "Of the $40M, the LPs get $32.8M and the GP commitment $400K."
- **A final fund:** the GP's carry over the fund's life. "If $15M on 1 Jan 2025 is the last distribution, the GP ends with $5M of carry: it gets $1M now and gives back $750K." With nothing owed: "If $6M on 1 May 2026 is the last distribution, the GP ends with $792K of carry." At $0: "If nothing more is distributed after 1 Jan 2025, the GP ends with $2M of carry: it gives back $2.75M." The line under it says it's this distribution: "Of the $15M, the LPs get $14M." In f01h it read "the GP's carry is $1M, and it owes $750K back", as if the GP netted $250K.

### The chart

Three lines against X, each straight between breakpoints, so the chart is drawn exactly from the range's ends and the breakpoints, as the main page draws its curves:
- **the LPs,** all their tiers together
- **the GP's carry,** catch-up plus carry by step
- **the GP commitment's line,** a straight line at g of X

**Marks on the chart:**
- **Every breakpoint,** numbered.
- **The NAV point,** labelled "NAV".
- **The chosen X,** which a slider and a text box both set.

**The range** runs from 0 to a top the page chooses: the larger of 1.5 × NAV and 1.25 × the last breakpoint, and at least twice the LPs' paid-in. The top is editable. It also covers 1.25 × the X the page opens at, and an X typed past the top raises it to 1.25 × that X, so X's mark is never off the chart (f01g review, answer 1).

**No zoom:** the range's top does that job (f01g review, answer 3).

### The breakpoints, in sentences

A numbered list matching the chart's numbers, each the engine's reason, then what it means for the GP per extra $1M, as the main page's "For you" line does. That's the GP's carry only, not the GP commitment's line (f01g review, answer 2). For example: "2. At $34,500,000: LPs reach 3.0x: carry is 25% from here. The GP's carry goes from $198,000 to $247,500 per extra $1M." Where several reasons share a point, they're one item.

### The split at X

A table by tier, for X alone and for the fund to date:
- **Rows:**
  - capital and pref, to the LPs
  - the catch-up, with the GP's share and the LPs'
  - the carry tier at each step, with the GP's share and the LPs', both from the engine's `StepCarry` (f01f review, answer 2). Each step is labelled as a band of the LPs' multiple, one carry, not carry on top of carry: "Carry at 20% (up to 3.0x)", "Carry at 25% (3.0x to 5.0x)", "Carry at 30% (above 5.0x)"; a flat fund's row is "Carry at 20%" (f01g, from your look at the page).
  - the GP commitment's line, set apart
  - totals
- **Columns:** "This distribution" (LPs, GP) and "The fund to date" (LPs, GP).
- **A tier the terms don't have** isn't shown. The engine gives it as zero; the page chooses from the terms (your f01b answer 2).
- **Under the table:**
  - the LPs' paid-in and the GP commitment's paid-in
  - the pref accrued to D
  - the LPs' net multiple to date, F10's, which tells a GP where the next step is. It comes from the engine's split (f01e), not the page's own arithmetic (your answer 9). It shows to two places, rounded down after FA14's first rounding, so it never shows a step the LPs haven't reached (f01f review, answer 4).

### The NAV point

"At NAV, $40,000,000, as if the fund were liquidated on 30 Sep 2026", with a button that sets X to NAV. The NAV point is final by definition (F14), so its split comes with the clawback card.

### The clawback, when final or at NAV

**In one sentence:** "If this is the fund's last distribution, the GP has been paid $X of carry, has earned $Y on the fund's totals, and owes $Z back to the LPs."

**A small chart of its own** under the main one, not a fourth line on it:
- **What it shows:** the clawback owed against X, with its own breakpoints from F15, cleared or changes.
- **Why its own:** it's a different scale, and often zero.

**As built in f01h:**
- **Where:** the card sits after the split (f01i; in f01h it was under the main chart).
- **A final fund** has it at every X. Its chart marks the breakpoints where the clawback bends, numbered as in the breakpoint list, which gives their reasons. In f01h the card listed them too; f01i drops that list.
- **A final fund that owes nothing at $0** owes nothing at any X (FA9), so the card says so in place of a flat chart. That's case 12.
- **A fund that isn't final** has the card at the NAV point only, with the sentence and no chart: only that point is final (F14).

### Amounts: to the cent, not as paid (your answer 2)

**The main page's P1** rounds each holder's payment for each class down to the cent and shows the cents left over, because those are real payments, each one a wire.

**On the fund page, most rows aren't a wire:**
- **The GP commitment's line and the GP's carry** are each one payment.
- **"The LPs" is every LP together.** v1 has no per-LP accounts (F3's later item), so the real payments, each LP's share rounded down, don't exist yet. Rounding the total down would show a "left over" that isn't what's left over.
- **The tier rows** aren't payments at all: they're the parts of the LPs' and the GP's amounts.

**So I'd show every amount as the cases do:** to the cent, half away from zero, with FA14's first rounding (`toCents`). There's no left-over row. P1 would come with per-LP accounts, when each LP's payment exists.

**The line under the table says why** (your answer 2): "Amounts are to the cent. 'The LPs' is every LP together, not one payment, so nothing here is rounded down as it would be paid; each row is rounded on its own and can differ from its total by a cent." 

### The terms: a form

**Carry:**
- "Flat", one rate
- or "In steps": rows of a rate and the LP multiple it starts from, the first with none, with "Add a step" and "Remove"

**Pref:** "A preferred return" with its rate. Simple only, as v1 is. Off by default.

**Catch-up,** shown only with a pref: "None" (a hard hurdle), "Full", or "Partial", with the GP's share.

**GP commitment:** its share, with "pays its share of fees" (off) and "pays its share of expenses" (on), F3's defaults.

**Rates as percents:**
- The form writes "20%" and the file "0.2", converted exactly.
- A rate typed with more places keeps them all ("7.25%" is "0.0725").
- Nothing is rounded.

**As built in f01i:**
- **Where:** the Terms tab. Each change runs the engine again.
- **A term turned on** starts at its usual value, in its field to change: a pref of 8% a year, a partial catch-up of 50% to the GP, a GP commitment of 1%. A pref brings in the catch-up at "None", which is what leaving it out of the input means. The field is focused with its value selected, so a GP types straight over it (f01i review, answer 3).
- **Carry, flat or in steps:** switching keeps both. The flat rate becomes the first step's, and the steps come back on the way back.
- **Text the page can't read as a number** ("twenty") is said under its field, and nothing goes to the engine. Every other rule is the engine's, worded by the page.
- **Once a term changes,** the picker reads "An example, with your changes", and the line under it "This fund, with your changes to its terms: …". Picking an example asks first, as the main page does.

### The cash flows: a table

**Each row:**
- a date, a browser date picker giving YYYY-MM-DD
- a type: "Call" or "Distribution"
- a kind, for calls: "Investment", "Fee" or "Expense"
- an amount in dollars

**Rows:** "Add a cash flow" adds one, each row has "Remove", and "Sort by date" puts them in date order. Rows may stay in any order (FA12), and the page keeps them as entered. The form never makes F4's same-day order matter by itself: same-day distributions run in the order shown, and the table says so.

**Above the table:**
- **"As of"**
- **"Distribution date (D)",** which defaults to "as of"
- **"This is the fund's last distribution",** F12's final
- **"NAV on D",** optional

**As built in f01j:**
- **Amounts** are typed in dollars ("$8,000,000", "8000000" or "8M") and written exactly. Commas only between groups of three digits, in the cells, NAV and the X box: "1,5M" and a European "1.000.000,00" are refused (f01k). An amount comes into the form with every place it has, "$10,000,000.005", so the fund in the form is the fund in the file (f01k).
- **D left empty** is the as-of date, which is what leaving it out of the input means; the field says so.
- **A problem** shows in the cell its path names: a cash flow's own (before the first call, after D) in a line under its row, and "a fund needs a call" under the table. Text the page can't read (a blank amount, "lots") goes to the engine as "", so every problem, on either tab, comes one at a time in the engine's order (FA2): a blank fund asks for its as-of date before a carry rate.
- **"A blank fund"** is last in the list: no dates, a flat 20% carry (F9's), and one call to fill in. Until the engine can run it, Payouts says "No payouts yet" and what's needed first. It stays "A blank fund" as it's filled in.
- **"Add a cash flow"** adds a row of the type and kind of the row above it (a call, an investment, when there are none), with its date focused (f01j review, answer 2). **"Sort by date"** keeps the order shown within a date.
- **A blank fund's carry** starts at a flat 20%: F9's default, and most VC funds' (f01j review, answer 1).

**Pasting rows from a spreadsheet** is its own step, right after the table and before release (your answer 8): a GP won't type years of flows by hand. Copied cells from Excel, Numbers or Google Sheets arrive as tab-separated rows.
- **The page reads each row** as date, type, kind and amount, in that order, and skips a header row it recognizes.
  - **Dates:** YYYY-MM-DD, or month/day/year as US spreadsheets copy them. A date that could be either day-first or month-first (03/04/2021) is asked about once for the whole paste, never guessed.
  - **Amounts:** "$8,000,000.00" or "8000000": the dollar sign and commas are dropped, and the digits kept exactly.
  - **Types:** "Call", "Capital call", "Distribution".
  - **Kinds:** "Investment", "Fee", "Management fee", "Expense".
- **Before anything is added,** a preview lists the rows as read ("37 cash flows: 25 calls, 12 distributions, $41,250,000 called"), and any row it can't read with why ("Row 12: 'Q3 2021' isn't a date"). "Add them" adds the rows that read; nothing is added until then.
- **Its rules are its step's questions:** which date forms, whether a missing kind is asked or refused, and whether a paste adds to the table or replaces it.

**As built in f01k, with your answers:**
- **Where:** "Paste rows from a spreadsheet" opens a box under the table. More than one cell pasted into a table cell goes to the same box instead of into the cell.
- **Columns:** date, type, kind, amount, in that order. A first row with no date in its first cell that names any of the four is a header, and skipped. Cells past the fourth are ignored.
- **Dates:**
  - **The forms:** YYYY-MM-DD or YYYY/MM/DD (f01l); numbers with slashes and a four- or two-digit year (21 is 2021); or a month's name: 15-Jan-2021, Jan 15, 2021 or 15 Jan 2021.
  - **Which comes first:** the first slashed date with a number above 12 settles month first or day first for the whole paste. If none does and some date could be either, the page asks once, month first selected. A row that can't be read in the paste's order is refused.
  - **Whenever a date could be read either way,** the preview says which way it read them and why (f01k review, answer 1): "Dates read day first, as 13/1/2023 in row 3 can only be read that way.", or "…, as chosen above." when the page asked. A US paste with one typo would otherwise turn every other date day first without a word.
- **Types:** Call, Capital call, Contribution, Drawdown; Distribution. Any case.
- **Kinds:**
  - **The names:** Investment; Fee or Management fee; Expense or Fund expense.
  - **A call with no kind** is an investment, and the preview counts them: "1 call had no kind: read as an investment."
  - **A distribution's kind cell** is ignored.
- **Amounts:**
  - **Read as the cells take them,** digits kept exactly.
  - **A negative is refused,** in any of the ways a spreadsheet writes one ("-500,000", "(500,000)", "$(500,000)"): "Write amounts as positive; the type says which way the money goes." An accounting format's zero, "$ -", is a zero: "isn't an amount more than zero" (f01l).
- **Adding:** after the rows already there, in the order pasted, unsorted. Rows with nothing in them, like a blank fund's first, give way. Nothing is added until "Add them"; "Cancel" leaves the table as it was.
- **The preview:** "5 cash flows: 3 calls, $10,500,000 called; 2 distributions, $12,000,000 distributed; they'll be the table's first.", then each row it can't read with why: "Row 2: 'Q3 2021' isn't a date". Rows are numbered by their place in the paste, the header included, so a paste from a sheet's first row numbers as the sheet does.

### Refusals, in plain words, beside the field they name

A `FundRefusal`'s `field` is a path into the input, `cash_flows[3].amount` or `terms.carry.steps[1]`. The form keeps a map from each path to the control that writes it, so a refusal shows under that control, in the error red, in the page's own words. The page's words, one per term:
- **`bad_number`** on an amount: "Write an amount in dollars, more than zero: 250000 or 250000.50."
- **`carry_rate_not_below_one`:** "A carry rate must be below 100%."
- **`catch_up_share_not_above_carry`:** "The GP's share of the catch-up must be above the carry rate, 20%, or the catch-up never ends."
- **`distribution_before_call`:** "This distribution is before the fund's first call."
- **The rest** are written the same way, one per term.
- **The field `x`** belongs to the X box.

**The same refusal also shows at the top of the form,** with "Show me", which scrolls to the field. While the input has a problem, the chart and tables stay on the last fund the engine accepted, and say so ("Showing the fund as it was before your last change").

**One problem at a time.** The engine refuses at the first problem, in FA2's order, so the form shows one at a time.

**An unsupported term** can only come from an opened file, since the form doesn't write any. It shows at the top: "This file has a term the page doesn't model: `hurdle_irr`."

### The example funds, and open and save

**The examples** are read at build time from the locked fund cases, as the main page reads Millrace, so they can't drift from the tests (your answer 5):
- **"A fund: 20% carry and a 2% GP commitment",** case 3, the default, at $20,000,000. Most VC funds have flat 20%, so the page opens on one (f01g, from your look at the page).
- **"A VC fund with premium carry: 20%, then 25% from 3x and 30% from 5x",** case 8, second. It has a NAV.
- **"A late call and a clawback",** case 13, final. It opens at $0, where the clawback is the story: $2,750,000 owed if nothing more comes in (f01h).
- **"An SPV: one company, the exit as its last distribution",** case 12, final, with a NAV. Many emerging managers run SPVs, and it's the shortest example.

**Saving** downloads a file the page makes, as the main page does:
- **The file:** `{"format": "spillpoint-fund", "version": 1, "name": …, "fund": <the input SPEC.md describes>, "view": {"x": …}}` (your answer 7).
- **Why the `fund` field matters:** it's exactly `readFund`'s input, so a saved file's `fund` is engine input as it stands.
- **The version** lets older files keep opening, as the main page's C13 does.

**Opening:**
- **What it takes:** a saved file; a bare fund input; or a fund case's `inputs.json`, which has `fund` inside.
- **A file that can't be read** says why in one line under the masthead, the main page's pattern.
- **"Not saved"** marks unsaved changes.

**As built in f01l, with your answers:**
- **"Save"** downloads the file, named after the fund's name, and says where: "Saved as a-late-call-and-a-clawback.json, in your downloads."
- **The name** is a field at the top of the Terms tab, as the main page has the cap table's. It starts as the example's label, or "My fund" for a blank fund or a bare input. A case's `inputs.json` is named by its case id.
- **Only a fund the engine accepts is saved:** "Not saved: the cash flows have a problem to fix first. …" (or the terms), so a saved file always opens.
- **The fund in the form is the fund in the file.** A save writes the input the two tabs write, and an opened file goes into them. A file opened and saved with no change has the same values, as the engine reads them, for every case's `inputs.json`.
- **X** comes back from `view`, or $0 without one. Moving X isn't a change, but a save keeps it, with every digit, so a breakpoint chosen from the list reopens on the breakpoint, not a hair below it (f01l review, answer 1).
- **A file with fractions** ("10000000/3", which the engine reads to 40 digits) says so when it opens: "Opened frac.json. Its fractions, like 10000000/3, are kept to 40 digits, and a save writes them that way." (f01l review, answer 2)
- **"Open a file"** asks first if there are unsaved changes, as does picking another fund. So does leaving or reloading the page.
- **The picker** shows "<name>, opened from <file>".
- **Refused in one line under the masthead,** the current fund kept:
  - not JSON
  - a version above 1: "made by a newer spillpoint"
  - the main page's file: "This is a cap table file. Open it on the main page."
  - a term the page doesn't model: "This file has a term the page doesn't model: `hurdle_irr`."
  - any other refusal, naming the row or term: "Row 5 of its cash flows: this distribution is before the fund's first call."
- **A field the file format doesn't have** is refused, as the main page refuses one (C12), so a misspelt one can't be ignored.
- **Nothing is kept in the browser,** and nothing goes in the address.

**The rule holds:** nothing is kept in the browser, and nothing goes in the URL.

## 0.2.0: the LPs

spillpoint-fund 0.2.0 gives each LP's amounts (F19 to F21), and f02c puts them on the page. This section is f02c's first commit, before code builds on its words. Your words and layout from f02b's review are as you gave them; what they leave open is marked **(mine)**, and listed in `notes/review-f02c.md`.

### The LPs tab, after Cash flows

**Tabs:** Payouts, Terms, Cash flows, LPs.

**One row an LP:** its name, and its commitment in dollars, read as the cash flows' amounts are ("5000000", "$5,000,000", "5M").
- **"Add an LP" and "Remove,"** as the cash flows have them. An LP added has its name focused **(mine, as a cash flow's date is)**.
- **The columns:** Row, Name, Commitment, and Remove.
- **Under the table, one line:** "3 LPs, $10,000,000 committed. Commitments only divide what the LPs get between them; they aren't checked against the calls."
  - **One LP:** "1 LP, $5,000,000 committed." **(mine)**
  - **A commitment that doesn't read yet:** the line counts the LPs and leaves the total out, "3 LPs.", until every commitment reads **(mine)**.
  - **No rows:** "No LPs: Payouts shows the LPs together. Add one to see each LP's share." **(mine)**
- **No rows is no LPs,** and the input leaves `lps` out.
- **The card's intro:** "Each LP's name and commitment, in the order you list them. Every LP is on the same terms, so each gets its commitment's share of what the LPs get." **(mine)**

**Names:** leading and trailing whitespace, as `trim` takes it off (FA17), comes off as the page reads a name, typed, pasted or from an opened file. The engine stays exact.
- **Typed (mine):** the box keeps what's typed, so a space typed between two words isn't eaten. The input the page hands the engine and a saved file gets the name trimmed, and the box shows it trimmed once it loses the focus.
- **From a file (mine):** each LP's name is trimmed before the engine reads the file. So "Alder" and "Alder " in one file are refused as a repeat when it opens.

**Problems** show under the cell their path names, in the page's words:
- **A name missing or blank:** "Write the LP's name."
- **A commitment missing, unreadable, zero or negative:** "Write a commitment in dollars, more than zero: 5000000 or 5M."
- **`lp_name_repeated`:** "An LP above already has this name; each LP needs its own."
- **At the top of the tab,** as Cash flows has it: "The fund can't run as it is." with the words and "Show me". On Payouts, the notice names the LPs: "Your last change to the LPs has a problem, …" **(mine, as for the terms and the cash flows)**. "Not saved: the LPs have a problem to fix first." likewise.
- **The engine checks the LPs last** (FA19), so an LP's problem shows once everything else runs.

**An opened file's LP problem** reads as the others do, refused in one line under the masthead:
- **Where it is:** "The name in row 2 of its LPs …", "The commitment in row 2 of its LPs …", "Row 2 of its LPs …" for an LP that isn't an object, "Its list of LPs …" for a list that isn't one.
- **The words:** the field words the other refusals use. For a repeat, the rule: "The name in row 3 of its LPs: an LP above already has this name; each LP needs its own."
- **An LP field the page doesn't model** says which: "This file has a term the page doesn't model: `carry` on an LP (row 1 of its LPs). Every LP is on the same terms here." The term is set as code, as `hurdle_irr` is.

### Pasting LPs from a spreadsheet

As the cash flows paste: "Paste rows from a spreadsheet" opens a box under the table, and more than one cell pasted into a name or commitment cell goes to it.
- **Columns:** name, then commitment. Cells past the second are ignored.
- **A header row is skipped (mine):** a first row whose commitment cell isn't an amount, naming any of "name", "LP", "investor", "partner", "commitment", "committed" or "amount".
- **Amounts** are read the same way as a cash flow's.
  - "$5,000,000.00", "5000000" and "5M" read.
  - A negative is refused, in any of a spreadsheet's ways: "Row 4: '(500,000)' is negative. A commitment is more than zero." **(mine, the cash flows' line ends "the type says which way the money goes", which LPs don't have)**
  - "$ -" is a zero: "Row 4: '$ -' isn't an amount more than zero."
- **Each row it can't read, and why:**
  - "Row 2: has no name"
  - "Row 3: has no commitment"
  - "Row 4: 'lots' isn't an amount"
  - **A name repeated in the paste:** "Row 5: 'Alder' is already in this paste, in row 2"
  - **A name already in the table:** "Row 5: 'Alder' is already an LP in the table"
  - Names are trimmed before they're compared.
- **The preview:** "3 LPs, $10,000,000 committed; they'll be the table's first." or "…; adds them to the 2 here.", as the cash flows' does. Then the rows it can't read.
- **Adding:** nothing is added until "Add them". The rows go after those already there, in the order pasted; empty rows give way. "Cancel" and Escape leave the table as it was.

### The LPs' card, on Payouts

**When:** only when the fund has LPs. **Where:** after the split and the clawback card, before the breakpoints. **Its heading (mine):** "Each LP at $40,000,000".

**The table:**
- **Columns:** LP, Share, Paid in, This distribution, To date, and "Share of the clawback" when the split is final and something is owed.
- **Rows:** one an LP, in the input's order. Then "Left over from rounding down", then "Total".
- **Each LP's amount** is rounded down to the cent after `toCents`'s first step (to 20 places). So an amount that's whole cents in exact math, and a hair under at 40 digits, isn't a cent short.
- **The leftover in each column** is the LPs' amount with `toCents`, less the LPs' rounded amounts.
  - **Never negative, and at most a cent an LP** (your correction to the spec). One LP whose amount is $0.005 gets $0.00, and $0.01 is left over.
  - **Why it can't be more:** each LP's rounded-down amount is less than a cent under its exact one, and `toCents` is at most half a cent over the LPs' exact amount.
- **The total row** is that `toCents` amount, so it equals the page's own figure for the LPs:
  - the split table's LPs total, for this distribution and to date
  - the paid-in line under it
  - the clawback card's owed
- **The share columns (mine):** the leftover row's share is "—". The total's is "100%", which the shares are, exactly, though each is shown rounded.

**Shares** to two places, rounded half up after the 20-place step **(mine)**: "33.33%", "52.38%", "14.29%". One line under the card: "Each LP's amount is rounded down to the cent, as it would be paid; the leftover row is what rounding down leaves. Shares are rounded for display; every amount is worked from the exact share."

**At the NAV point,** the card follows the NAV split, its clawback included, as the clawback card does.

**Narrow screens:** nothing off the screen down to 320 pixels, long names wrapping.
- **Mine, as the split does:** wherever the one table wouldn't fit its card, and always under 480 pixels, each LP is a group. Its name is on its own line, wrapping, with each amount under it beside its column's name.

**The split table's line** says "The LPs" is every LP together. When the fund has LPs, it points to the card **(mine)**: "Amounts are to the cent. "The LPs" is every LP together; each LP's amount, rounded down as it would be paid, is in the card below. Each row here is rounded on its own and can differ from its total by a cent."

### Download as CSV

A button on the card: "Download as CSV".
- **What's in it:** the card as shown. A header row of the card's columns **(mine)**, every LP with its rounded amounts, the leftover row and the total row.
- **Numbers:** without "$" or commas, "666666.66". Shares as "33.33%".
- **Quoting, as RFC 4180:** a name with a comma, quote or line break is in quotes, its quotes doubled. Lines end in CRLF, as RFC 4180 has them **(mine)**.
- **A name starting with =, +, - or @** gets a leading apostrophe, so a spreadsheet shows it as text, not a formula.
- **Encoding:** UTF-8 with a byte-order mark, so Excel reads names like "Ñandú" right.
- **Its name:** as Save names its file, lowercase with hyphens, with X and D: "a-late-call-and-a-clawback-lps-at-15000000-on-2025-01-01.csv".
  - **X in the name (mine):** whole dollars when it has no cents, and to the cent with its point when it has, "63833333.33".
- **As with Save,** nothing leaves the computer. The page says where it went: "Downloaded as …, in your downloads." **(mine, as Save's line)**

### Saving and opening

- **Saving:** the LPs are in the saved file's `fund.lps`, names trimmed. A fund with no LPs saves without `lps`.
- **Opening:** a file's LPs go into the LPs tab, names trimmed. f02b's guard, which refused a file with LPs, comes out.

### The examples

- **The VC fund with premium carry becomes case 17:** the same fund, with three LPs.
- **The clawback example becomes case 19,** so the LPs' card and its clawback column both show from the picker.
- **Case 3 and the SPV stay without LPs.**
- **The labels say so** (f02c review, answer 1), since the picker is how a GP finds the LPs: "A VC fund with premium carry and three LPs: 20%, then 25% from 3x and 30% from 5x" and "A late call, a clawback and two LPs". Each opens at the X it did.
- **The four tabs fit on one line down to 320 pixels (f02d):** on a phone their padding and gap give way rather than "LPs" going to a second line, as it did below 375. They can still wrap, so a larger browser font doesn't scroll the page sideways.

### Tests

- **The page's pending list empties,** so cases 17 to 21 run through its case tests:
  - the forms round trip with the LPs
  - files open and save
  - the fund-21 refusals show in the page's words: beside their cells for the six the form can make (no name, no commitment, a blank name, zero, negative, a repeat), and in one line when opened from a file for all eleven
- **At every point of cases 17 to 20:**
  - each LP's row is its exact amount, rounded down after the 20-place step
  - the leftover is never negative and at most a cent an LP
  - the total row equals the page's figure for the LPs
- **The CSV for case 18 at $2,000,000:** 666666.66 three times, 0.02 left over, and 2000000.00 in all.

## 0.3.0: classes and later closes

spillpoint-fund 0.3.0 runs each LP class as its own account and works out the equalization at later closes (F22 to F28), and f03c puts them on the page. This section is f03c's first commit, before code builds on its words. Your words and layout from f03b's review are as you gave them; what they leave open is marked **(mine)**, and listed in `notes/review-f03c.md`.

### The Terms tab

Two percents, each starting blank; blank leaves it out of the input:
- **"Management fee rate":** "Needed only when a class has its own fee rate. It divides the fee calls between the classes."
  - **From f04c,** "…and charges nothing itself." at its end, and the field goes with a schedule ("0.4.0: management fees").
- **"Equalization interest rate":** "Needed when an LP joins at a later close; 0 for none."
  - **From f04c,** "Needed when an investment or expense call comes before a later close; 0 for none." (F29)
- **Where (mine):** after the GP commitment, in one group of their own, "For LP classes and later closes", each hint under its field.

**Problems under them:**
- **A class's fee rate without the fund's:** "Needed: a class has its own fee rate."
- **A later close without the rate:** "Needed: an LP joins at a later close. Write 0 for none."
  - **From f04c,** "Needed: an investment or expense call comes before a later close. Write 0 for none." (F29)
- **A fee rate that doesn't read, or 0 (mine):** "Write the management fee rate as a percent, above 0: 2 or 1.5."
- **An equalization rate that doesn't read (mine):** "Write the equalization interest rate as a percent a year, 0 or more: 8 or 0." A typed "-8" doesn't read as a percent, so it's this.

### The LPs tab

**The card's intro (mine):** with no classes, as now. With classes: "Each LP's name and commitment, in the order you list them, with its class and its close. The LPs in a class, or on the fund's terms, share what it gets by commitment."

**The classes, above the LPs:**
- **A heading (mine), "Classes",** then the table, if there are any, and "Add a class". The LPs' table follows under "Each LP" **(mine)**.
- **The columns:** Name; Fee rate, blank for the fund's fees; Carry; and "Remove".
- **The carry,** written as the Terms tab writes it, or the fund's:
  - **A choice (mine):** "The fund's carry", "Flat" or "In steps". A new class starts on the fund's carry.
  - **Flat and steps as on Terms:** a rate, or steps each with its rate and the LP multiple it starts from, "Add a step" and "Remove".
  - **Starting values (mine):** choosing Flat or In steps starts from the fund's carry, its first rate or its steps, in the fields to be changed. Switching between flat and steps keeps what was typed, as on Terms.
- **"Add a class"** adds a row with its name focused **(mine, as an LP's)**.
- **Under the table, one line:** "A class changes only the fee rate and the carry; the pref, the catch-up and the GP commitment are the fund's."
- **Class names** are trimmed as LP names are: the box keeps what's typed, and the input and a saved file get the name trimmed.
- **No class may be named "Fund terms"** (f03c review, answer 3), or the picker, the paste and the cards couldn't tell it from the fund's own terms. The engine takes the name (FA28's known edge), so the page checks it, after everything the engine checks. Compared exactly once trimmed, as every name on the page is **(mine)**: "fund terms" is a name of its own.

**Cards (f03d):** each class and each LP is a card of its own wherever its table wouldn't fit its card as one, measured on the card's own width, as the split is. What each needs changes with what's in it: with classes, the LPs' table needs about 910 pixels of window for cases 22 and 26, so an upright iPad (768) shows cards; without them, about 730. In f03c it was a fixed 640-pixel card, which the Class column outgrew.

**Each LP row** gains two columns after the commitment:
- **Class:** a picker of "Fund terms" and the classes.
  - **Shown only when the fund has classes (mine):** with none, the picker would have one choice.
  - **A class with no name yet (mine)** shows in the picker as "Class 2", its row in the table.
  - **Renaming a class** keeps its LPs in it.
  - **Removing a class that LPs are in** moves them to Fund terms. One line under the classes table says so **(mine)**: "Removed Friends and family: Cedar Holdings moves to Fund terms." With more than one: "Cedar Holdings and Delta Trust move to Fund terms." The line goes at the next change.
- **Close:** a date, blank for in from the start. **Its header's hint (mine):** "Blank: in from the start."

**Problems** under the cell their path names, in the page's words:
- **`lp_class_name_repeated`:** "A class above already has this name; each class needs its own."
- **A class named "Fund terms":** "That's the page's name for the fund's own terms; give this class another."
- **A class with no name (mine):** "Write the class's name."
- **A class's fee rate that doesn't read (mine):** "Write the class's fee rate as a percent, 0 or more: 0 or 1.5; or leave it blank for the fund's fees."
- **A class's carry,** as the Terms tab's carry problems read, under the class's carry:
  - "Write the carry rate as a percent, 0 or more: 20 or 27.5."
  - "A carry rate must be below 100%."
  - a step out of order, in the Terms tab's two sentences
  - **The catch-up's share not above the class's carry (mine):** "This class's carry rate must be below the GP's share of the catch-up, 50%, or its catch-up never ends." The engine names the class's carry, so it's under that, not under the catch-up on Terms.
- **`lp_close_after_distribution`:** "An LP's close must come before the fund's first distribution."
- **`lp_class_unknown`:** "This LP's class isn't one of the fund's classes." Only a file can name a class that isn't there, and a file is refused as it opens, below.
- **At the top of the tab,** as now. A class's problem is the LPs tab's, so on Payouts it's "Your last change to the LPs has a problem, …" **(mine)**.

**On Cash flows,** under the call's row, as a cash flow's own problem is shown: `call_without_payers`, "No LP in the fund on this date pays this call: none had closed yet, or none of them pays fees."

**An opened file's problem,** in one line under the masthead, as now:
- **Where it is (mine):** "The name in row 2 of its LP classes", "The fee rate in row 2 …", "The carry in row 2 …", "Carry step 2's rate in row 1 of its LP classes", "Row 2 of its LP classes", "Its list of LP classes", "Its management fee rate", "Its equalization interest rate", "The class in row 3 of its LPs", "The close in row 3 of its LPs".
- **The rules,** in the words above, after the place: "The class in row 3 of its LPs: this LP's class isn't one of the fund's classes."
- **A rate missing (mine)** says why it's needed: "Its management fee rate is missing: it's needed when a class has its own fee rate." "Its equalization interest rate is missing: it's needed when an LP joins at a later close." From f04c the second ends "…when an investment or expense call comes before a later close." (F29)
- **A management fee rate that isn't above 0 (mine, added while building):** the amounts' line says "amounts more than zero and nothing negative", which doesn't fit a rate of 0, so: 'Its management fee rate isn't a number the page can use: it's a rate above 0, written as an exact string like "0.02".'
- **`call_without_payers` (mine):** "Row 2 of its cash flows: no LP in the fund on this date pays this call, as none had closed yet or none of them pays fees."
- **A class term the page doesn't model (mine):** "This file has a term the page doesn't model: `pref` on an LP class (row 1 of its LP classes). A class changes only the fee rate and the carry."
- **An LP term the page doesn't model (mine, changed):** the line ended "Every LP is on the same terms here." From 0.3.0 an LP can be in a class, so it ends "An LP's terms are its class's, or the fund's."
- **Names in a file (mine):** each class's name and each LP's class are trimmed before the engine reads the file, as LP names are, so "Seed " and "Seed" are one class.
- **A class named "Fund terms",** once the engine has read the file: "The name in row 1 of its LP classes: that's the page's name for the fund's own terms; give this class another."

### Pasting LPs

Two optional columns after the commitment: class, then close.
- **A class** is matched by its name after trimming. One not in the table is a row it can't read: "Row 4: 'Friends & family' isn't one of the fund's classes".
  - **Blank is Fund terms (mine),** and so is "Fund terms" itself, the picker's word (f03c review, answer 3), which no class may take.
- **Close dates** are read as the cash flows' paste reads dates. A paste that could be either order asks once, "Which comes first in this paste's dates?", and has the same day-first or month-first line under the preview. A close it can't read is a row it can't read: "Row 4: 'Q3 2021' isn't a date".
- **A header row (mine)** may name "class" or "close" too.
- **The preview (mine)** adds what it read of the two columns: "3 LPs, $10,000,000 committed, 1 in a class and 2 with a close; they'll be the table's first."

### Payouts

**The split table stays the fund's.** Each carry row is labelled from the split's own steps **(mine)**, so a fund whose LPs are all in one class shows that class's carry.
- **With two or more accounts,** each carry row names its class: "Fund terms: carry at 20% (up to 3.0x)", "Friends and family: carry at 0%".

**The headline's terms line (mine)** adds each class that has LPs, after the fund's terms: "Carry 20% and 25% from 3.0x; no pref; no GP commitment. Friends and family: carry 0%, no fees." A class's fee rate reads "fees at 1%", or "no fees" at 0; its carry as the fund's; a class with neither, "the fund's terms".

**A classes card after the split,** only with two or more accounts:
- **Its heading (mine):** "Each class at $5,200,000".
- **One row an account,** Fund terms first.
- **The columns (mine):** Class; "LPs, this distribution" and "GP, this distribution"; "LPs, to date" and "GP, to date"; "Paid in"; "LP multiple"; and "Owed back" when some class is owed something.
- **The amounts** are to the cent, as the split table's.
- **The LP multiple:** two places, rounded down, as the split's. It's "—" when nothing is paid in (FA38).
- **"Owed back"** (f03c review, answer 1): shown when the split is final and some class is owed something, each class's own clawback, with $0.00 for a class owed nothing, since one class's surplus doesn't offset another's (F24). Left out when no class is owed anything, as the LPs' card leaves out its clawback column.
- **At the NAV point (mine),** the card follows the NAV split, its "Owed back" included, as the LPs' card does.
- **One line under it (mine):** "Each class runs the waterfall on its own part of every call and distribution, with its own fee rate and carry; the split above is their sum. Each amount is rounded on its own, so a column can differ from the split's by a cent."
- **Narrow screens (mine):** as the LPs' card, each class a group, wherever the one table wouldn't fit.

**The clawback card,** with two or more accounts:
- **Each class's owed** under the fund's, in a small table **(mine)**: "Owed back by class, each on its own totals", one row a class.
  - **Only when some class is owed something** (f03d review, answer 1), with $0.00 for a class owed nothing. Left out when no class is owed anything, as the classes card leaves out its "Owed back".
- **Its sentence stays the fund's.**
- **Its intro (mine)** ends "…one run of the waterfall for each class, on its own totals." in place of "one run of the waterfall on everything paid in and everything distributed".

**The LPs' card** gains a Class column after the LP's name, blank for Fund terms, and its CSV a Class column after the name.
- **Only when an LP is in a class (mine),** so a fund without classes keeps its card and CSV as they are.
- **Its line under the card (mine),** with classes: "Shares are of all the LPs' commitments, rounded for display; an LP in a class gets its commitment's part of its class's amounts." in place of "Shares are rounded for display; every amount is worked from the exact share."

**The breakpoints** stay in the engine's words, which name the account with two or more.

**An equalization card,** only with a later close, after the LPs' card:
- **Its heading (mine):** "Equalization at the later closes".
- **The rate (mine):** "Interest at 6% a year, simple, on the days from each call to the close (Actual/365)."
  - **From f04b (Jordan's words):** with no rate given, which only fee calls before the closes allow (FA45), "No equalization interest: only fee calls come before the later closes." in its place, and the interest columns are 0.00. After either, one sentence **(mine)**: "Back fees are each joining LP's own fees for the fee calls before its close, paid to the manager."
- **Each close:**
  - **Its heading (mine):** "1 Apr 2022: Birchwood Family Office joins". With more than one: "A and B join".
  - **One row for each LP in by then:** what it paid in or got back, and the interest it paid or received.
- **Then the same for all the closes together,** under "All the closes together" **(mine)**, every LP.
- **The columns (mine):** LP, "Paid in", "Got back", "Interest paid", "Interest received".
  - **From f04b, "Back fees" (Jordan's),** last: each joiner's back fees at its close, paid to the manager, and over all the closes (F29). Rounded down to the cent with a leftover, as the other columns. 0.00 for an LP already in.
- **Rounding:**
  - **Each amount** is rounded down to the cent.
  - **A leftover row in each block,** as the LPs' card has it: each column's exact total with `toCents`, less its rounded amounts. A Total row after it, as the LPs' card has **(mine)**.
  - **The all-closes block** rounds each LP's exact total, as `equalization(fund).lps` gives it. So a row there can be a cent more than its rows above added up: Alder's interest is 10,356.16 and 22,520.54 at the two closes, and 32,876.71 in all.
- **One line under it:** "Equalization is outside the waterfall: it moves money between LPs at each close and changes nothing above."
  - **From f04b, in Jordan's words,** as back fees go to the manager: "Equalization is outside the waterfall: at each close it moves capital and interest between the LPs, and back fees to the manager. It changes nothing above."
- **"Download as CSV,"** as the LPs' card's:
  - **Its name:** "<fund name> equalization.csv", the fund's name as Save writes it **(mine)**: "two-later-closes-and-a-friends-and-family-class-equalization.csv". It has no X or D, as the equalization has neither.
  - **Its columns (mine):** Close, LP, Paid in, Got back, Interest paid, Interest received; from f04b, Back fees after them.
  - **Its rows (mine):** each close's block, its date as YYYY-MM-DD in the first column, then "All closes". Each block has its leftover and total rows.

### Saving and opening

- **Saving** keeps the two rates, the classes, and each LP's class and close. A fund without them saves without them.
- **Opening:** f03b's guard comes out, so a file with classes or later closes opens into the tabs.
  - **From f04b until f04c,** a file whose terms have a `management_fee` is refused in one line, so a save can't drop it (Jordan's words): "This file has a management fee schedule; the page shows it from the next version." A null one is none, and opens.
  - **From f05b1 until f05c,** a file with investments, a write-off or a `carry_basis` was refused in one line, so a save couldn't drop them (Jordan's words): "This file has investments; the page shows them from the next version." Null, and an empty list of investments, were none, and opened. f05c took the guard out.
  - **From f06b until f06c,** a file with a fee step on invested capital is refused in one line, so a save can't drop it (Jordan's words): "This file has a management fee on invested capital; the page shows it from the next version." A step's basis left out, null or `"commitments"` is the default, and opens; any other, one the engine would refuse included, gets the same line.

### The examples

- **Case 26 joins the picker** as "Two later closes and a friends-and-family class", after the clawback example.
- **It opens at $5,200,000 (mine),** its listed X, between its two breakpoints: the class has its capital back, and the fund terms' LPs don't yet.
- **The others stay.**

### Tests

- **The page's pending list empties,** so cases 22 to 28 run through its case tests:
  - the forms round trip with classes and closes
  - files open and save
  - the fund-27 refusals show in the page's words: beside their cells for those the form can make, and in one line when opened from a file for all twenty
- **The classes card** matches the split's `byAccount` at every point of cases 22, 23, 24, 26 and 28.
- **Case 26's equalization card,** over both closes:

  | LP | Paid in | Got back | Interest paid | Interest received |
  |---|---:|---:|---:|---:|
  | Alder | 0.00 | 1,533,333.33 | 0.00 | 32,876.71 |
  | Birchwood | 700,000.00 | 416,666.66 | 10,356.16 | 11,260.27 |
  | Cedar | 1,250,000.00 | 0.00 | 33,780.82 | 0.00 |

  0.01 is left over in each of the last three columns, and its CSV says the same.

## 0.4.0: management fees

spillpoint-fund 0.4.0 works out management fees from a schedule, and makes fee calls at a later close each LP's own (F29 to F32). f04c puts the schedule on the page, where a GP looks for fees: on Terms, beside the other terms, and on Cash flows, beside the calls. This section is f04c's first commit, before code builds on its words. Your words and layout from the f04c brief are as you gave them; what they leave open is marked **(mine)**, and listed in `notes/review-f04c.md`.

### The Terms tab

**"Management fee",** a choice of two, in a group of its own after the GP commitment **(mine)**:
- **"Entered as fee calls"** (the default), with one line: "Enter each fee call on the Cash flows tab as a call of kind Fee. Fees are paid-in capital, returned to the LPs first."
- **"A schedule":**
  - **"Fees start on":** a date.
  - **"Called":** quarterly, half-yearly or yearly, quarterly first. The picker reads "Quarterly", "Half-yearly" and "Yearly" **(mine)**, for the input's `quarterly`, `semiannual` and `annual`.
  - **The rates by date,** a step at a time as the carry's are: the first "from the start", each later one "from" a date, with "Add a step" and "Remove".
  - **"The LPs' total commitments,"** only when the fund lists no LPs, in dollars as the cash flows' amounts are typed.
  - **One line under it:** "Fees are worked out from the LPs' commitments, called in advance on calendar periods; the first period runs from the start date."
- **Starting values (mine),** in their fields to be changed, as a term turned on starts at its usual value:
  - **The first rate:** 2%, selected in its field, so it's typed straight over.
  - **The start:** the earliest call's date on the Cash flows tab, or blank when no call has a date.
  - **Called:** quarterly.
- **Switching back (mine):** "Entered as fee calls" keeps what was typed in the schedule, out of the input, for a way back, as the carry keeps its steps when it's flat.

**With a schedule, the "Management fee rate" field goes:** the schedule's first rate is the fund's, and a class's fee rate is set against it.
- **What was typed in it (mine)** is kept out of the input, and comes back with "Entered as fee calls".
- **The classes table on the LPs tab** says so in its fee rate's hint **(mine)**: "Blank: the schedule's rates. A class's rate is set against its first rate." Without a schedule, as now: "Blank: the fund's fees."

**Without a schedule the field stays.** Its hint says it divides fee calls between classes and charges nothing **(the words mine)**: "Needed only when a class has its own fee rate. It divides the fee calls between the classes and charges nothing itself."

**"Equalization interest rate":**
- **Its hint:** "Needed when an investment or expense call comes before a later close; 0 for none."
- **Its problem line:** "Needed: an investment or expense call comes before a later close. Write 0 for none."
- **A file's line:** "Its equalization interest rate is missing: it's needed when an investment or expense call comes before a later close."

### The Cash flows tab, with a schedule

- **Fee isn't offered as a kind.**
  - **A row already of kind Fee (mine)** keeps Fee in its own picker, so it shows what it is.
  - **A new row after a Fee row (mine)** is an investment, as it would otherwise copy the row above.
- **A Fee row already in the table** is a problem under its row: "This fund's fees come from its schedule. Remove this row, or set Management fee to Entered as fee calls."
  - **Under every Fee row (mine):** the engine names the first in the table's order, and the page shows the same words under each, so every row to fix shows at once. "Show me" goes to the first one's Kind.
  - **A Fee row in an opened file (mine)** is in the table once the file is open and the schedule chosen. A file that has both a schedule and a fee call is refused as it opens, in one line, below.
- **Under the table, "The schedule's fee calls",** read-only:
  - **Each call:** its date, the days it covers, the call, and the GP commitment's part when it pays fees.
  - **Then a total.**
  - **Amounts to the cent,** as the split table's.
  - **With a start after D:** "No fee call yet: fees start on <date>."
  - **Its columns (mine):** "Date", "Covers" (as "15 Feb 2021 to 31 Mar 2021"), "Call", and "The GP commitment's part" when it pays fees. The total row is "Total".
  - **A line under its heading (mine):** "Worked out from the schedule on the Terms tab, and run as fee calls. They aren't rows of the table above."
  - **While the fund can't run (mine):** "The schedule's fee calls show here once the fund can run." in the table's place, since they're the engine's.
  - **On a phone (mine),** and wherever the table wouldn't fit its card, each call is a card of its own, as Payouts' cards are, so nothing scrolls sideways.
- **Pasting cash flows:** a Fee row is a row the preview can't read, with the same reason **(the words mine)**: "Row 3: this fund's fees come from its schedule; set Management fee to Entered as fee calls to add fee calls".

### Problems, in the page's words, under the field their path names

- **The start missing or not a date (mine):** "Choose the date fees start on."
- **A step's rate missing, not a number, below 0, or 1 or more (mine):** "Write the fee rate as a percent a year, 0 or more and below 100: 2 or 1.5."
- **The first rate 0:** "The first rate must be above 0. To start fees later, change the start date."
- **A later step without a date (mine):** "Choose the date this rate is in force from."
- **A step's date not after the one before:** "Each step's date must come after the one before it."
- **The commitments missing without LPs:** "Needed: the fund lists no LPs, so the fee is on this total."
- **The commitments not an amount, or 0 (mine):** "Write the LPs' total commitments in dollars, more than zero: 40000000 or $40M."
- **The schedule's `call_without_payers`, under Management fee:** "No LP pays this schedule: every LP is in a class at a fee rate of 0."
- **At the top of the tab,** as now. The schedule is on Terms, so on Payouts it's "Your last change to the terms has a problem, …".
- **What the form can't make:** `fee_rate_with_schedule`, since the field goes with a schedule; `fee_commitments_mismatch`, since the form writes commitments only when the fund lists no LPs; a frequency it doesn't know; the first step given a date; and the schedule's unsupported keys. Only a file has them.

**An opened file's problem, in one line,** as now, its place then its words **(the places mine)**:
- **The places:** "Its management fee schedule", "Its management fee's start date", "Its management fee's list of rates", "Fee rate step 2", "Fee rate step 2's rate", "Fee rate step 2's date" and "Its management fee's total commitments". So: "Its management fee's start date isn't a date that exists, written YYYY-MM-DD."
- **A frequency it doesn't know (mine):** "Its management fee's frequency isn't one the page knows: it's quarterly, semiannual or annual."
- **A step's rate (mine):** 'Fee rate step 1's rate isn't a number the page can use: it's a rate from 0 up to, not including, 1, the first above 0, written as an exact string like "0.02".'
- **Steps out of order (mine):** "Fee rate step 2: each step's date must come after the one before it, and the first has none of its own."
- **The commitments missing (mine):** "Its management fee's total commitments are missing: they're needed when the fund lists no LPs."
- **The commitments not an amount (mine):** 'Its management fee's total commitments aren't an amount the page can use: they're an exact string more than zero, like "40000000".' The amounts' line would say "isn't" of them.
- **`fee_rate_with_schedule` (mine):** "Its management fee rate: with a schedule, the schedule's first rate is the fund's, so there's no rate of its own."
- **`fee_call_with_schedule` (mine):** "Row 5 of its cash flows: it's a fee call, and this fund's fees come from its schedule."
- **`fee_commitments_mismatch`:** "Its management fee schedule: its commitments for the schedule aren't the LPs' total." The place is mine.
- **The schedule's `call_without_payers` (mine):** "Its management fee schedule: no LP pays it, as every LP is in a class at a fee rate of 0."
- **An unsupported key in the schedule (mine):**
  - "This file has a term the page doesn't model: `offset` on its management fee schedule. A schedule has a start date, how often it's called, its rates by date and the LPs' total commitments."
  - "This file has a term the page doesn't model: `basis` on a fee rate step (step 2 of its management fee schedule). A step has only its rate and the date it's in force from."

### Payouts

**Nothing on Payouts changes but one line (mine):** the split, the chart, the breakpoints and every card run on the schedule's calls as on entered ones (F31).
- **The summary under the picker** counts the schedule's calls among the calls paid in, as it counts the cash flows: "This fund: $34.2M paid in over 25 calls (22 from its fee schedule) and $24M distributed before X." for case 29. Without them the paid-in it gives would leave out the fees.
- **From f04d, the headline's terms line names the schedule** (f04c review, answer 3), after the GP commitment: "management fee 2% a year from 15 Feb 2021, 1.5% from 15 Feb 2026, called quarterly". With one step, "management fee 2% a year from 15 Feb 2021, called quarterly". "Called" reads as the Terms tab's picker does: quarterly, half-yearly or yearly. Fees entered as calls add nothing.

### Saving and opening

- **Saving keeps the schedule:** `start`; `frequency` written out, quarterly too; the steps, the first without `from`; and `commitments` only when the fund lists no LPs.
- **Opening brings it back.** f04b's guard comes out, and its tests.
- **A file's schedule with `commitments` and listed LPs (mine)** opens, since the engine has checked they're the LPs' total, and a save leaves them out, as the form has no place for them with LPs.

### The examples

- **Case 29 joins the picker** as "A fund with a 2% fee schedule", after case 26.
- **It opens at $20,000,000 (mine),** its listed X, between its second and third breakpoints: the GP is catching up.
- **The others stay.**

### Tests

- **The page's pending list empties,** so cases 29 to 32 run through its case tests:
  - the forms round trip with the schedule
  - files open and save
  - the fund-32 refusals show in the page's words: beside their fields for those the form can make, and in one line when opened from a file for all thirty-seven
- **Case 29's Cash flows** list 22 fee calls, $100,000.00 first, $150,000.00 last and $4,225,000.00 in all.
- **Case 30's half-year with the step** reads $212,115.23, of it $4,242.30 the GP commitment's.
- **Case 26 switched to a schedule** shows the problem under its two Fee rows.

## 0.5.0: investments and carry deal by deal

spillpoint-fund 0.5.0 lists a fund's investments and can pay carry deal by deal (F33 to F37). f05c puts them on the page: the basis on Terms, the investments on a tab of their own, their tags on Cash flows, X's source beside X, and what's due before carry beside the split. This section is f05c's first commit, before code builds on its words. Your words and layout from the f05c brief are as you gave them; what they leave open is marked **(mine)**, and listed in `notes/review-f05c.md`.

### The Terms tab

**"Carry is paid",** a choice of two, in a group of its own after Carry **(mine)**:
- **"On the whole fund"** (the default), and **"Deal by deal"**.
- **One line under them,** whichever is chosen **(mine)**: "Deal by deal: before carry, LPs get back the cost of each investment exited or written off, with its share of fees and expenses. At the end the GP owes back any carry the whole fund doesn't earn."

**Deal by deal, the pref and catch-up are off and say why** (no pref deal by deal in 0.5.0):
- **The pref's box** is unticked and can't be ticked, with one line **(the words mine)**: "Off deal by deal: this version has no pref deal by deal, so no catch-up either."
- **The catch-up group goes,** as it does without a pref.
- **What was typed (mine)** is kept, out of the input, and comes back on the whole fund, as the carry keeps its steps when it's flat.

### The Investments tab

**A tab of its own, after Cash flows (mine):** the tabs run Payouts, Terms, Cash flows, Investments, LPs. The brief has it "between Cash flows and Payouts", which aren't next to each other; after Cash flows, since a distribution's From names one of them.
- **A line under its heading (mine):** "Each investment the fund has made, with its checks: a follow-on is another check. Amounts in dollars: 3000000, $3,000,000 or $3M."
- **Each investment:** its name, then its checks, each a date and an amount, with "Add a follow-on".
  - **"Remove"** on each check after the first **(mine)**: the first goes with its investment.
  - **"Remove this investment"** under its checks **(the words mine)**.
  - **Labels (mine):** "Investment 1's name", "Investment 1, check 2's date", "Investment 1, check 2's amount", "Add a follow-on to investment 1", "Remove investment 1, check 2" and "Remove investment 1". On screen: "Name", "Check 2", "Remove", "Add a follow-on" and "Remove this investment".
- **"Add an investment"** under them: one check, its date and amount to come, and the focus in its name **(mine)**.
- **With none (mine):** "No investments yet. Add them to tag distributions and write-offs, and to pay carry deal by deal."
- **Under them, the table from `portfolio(fund)`,** read-only, at D before X: cost, exited or written off, written off, proceeds, and the realized multiple, "—" while nothing is realized.
  - **Its heading (mine):** "The investments at 30 Jun 2024, before X".
  - **Its columns (mine):** "Investment", "Cost", "Exited or written off", "Written off", "Proceeds" and "Realized multiple". Amounts to the cent; the multiple to two places, rounded down, as the LPs' net multiple is: "3.00x".
  - **A line under it (mine):** "Cost is each investment's checks to D. The realized multiple is its proceeds over the cost exited or written off."
  - **While the fund can't run (mine):** "The table shows here once the fund can run." in its place, since it's the engine's.
  - **On a phone,** and wherever it wouldn't fit its card, each investment is a card, through the same `CardTable` Payouts' cards use.

**Names (mine),** as LPs' and classes' are (FA17, FA27): the page takes the whitespace off each end as it reads an investment's name, typed or from a file, and a distribution's, a write-off's and X's investment in a file, so "Alder " never reaches the engine. A tag holds its investment by its row, not its name, as an LP holds its class, so renaming an investment keeps its tags; removing one leaves them on "—".

### The Cash flows tab

- **A distribution gets "From"** (an investment; "—" for none on the whole fund) **and "Share sold"** (100% by default).
  - **One column, "Kind / From" (mine):** a call's kind, or a distribution's or write-off's investment, since a row has one or the other. With a column each the table needed 1,018 pixels, more than the card's 926 at a 1,024-pixel window; with one it needs about 845. A long name shortens in its picker rather than widen the table.
  - **"From":** each investment by name, or "Investment 2" while it has none **(mine)**. Deal by deal, and on a write-off, "—" isn't offered **(mine)**, but a row already on it keeps it, with the problem under it, as a Fee row does with a schedule.
  - **"Share sold":** a percent, as the terms' rates are typed, only on a distribution with a From **(mine)**; "—" otherwise. 100% is left out of the input, which is its default **(mine)**.
- **A "Write-off" type,** with its investment and no amount: "—" under Kind, Share sold and Amount.
- **A new row (mine)** copies the type, kind and From of the row above, as it copies the type and kind now.
- **The line under the tab's heading (mine):** "Every call, distribution and write-off before X, in the order entered. …"
- **The line under the table (mine):** "On one date, calls run first, then the investments' checks, then write-offs, then distributions in the order shown here. “Sort by date” keeps that order within a date."
- **On a phone (mine),** each row is a card as now, with only its type's fields: a call's kind and amount, a distribution's From, share and amount, a write-off's From. The share says "Share sold" beside its box, since the headings go. The cards go up to an 880-pixel card, from 760, for the wider table.
- **Pasting (mine):** pasted rows are calls and distributions as now, with no From; deal by deal each distribution then asks for one.

### Beside X

**Deal by deal, "From" and "Share sold"** under the X box **(where, mine)**, for `distribution_from`: the same picker, "—" not offered, and 100% by default.
- **On the whole fund (mine)** they're hidden, and a file's X source is kept as it is, since it changes no amount there.
- **While the fund has never run (mine),** as a blank fund built deal by deal hasn't, they're in the "No payouts yet" card, so X's source can be set before there are payouts.

### Payouts

- **The headline's terms line:** "deal by deal" after the carry: "Carry 20% deal by deal; no pref; GP commitment 1%, fee-free."
- **Deal by deal, beside the split:** "Due to LPs before carry", among the facts under the split table, after the paid-ins, to the cent as they are **(mine)**: "$11,100,000.00".
  - **At the end,** X final or the NAV point, its parts **(the words mine)**: "$11,100,000.00, all their paid-in: $9,900,000.00 of cost and $1,200,000.00 of fees and expenses". With capital called and never invested: "…: $9,000,000.00 of cost, $900,000.00 called and never invested and $1,200,000.00 of fees and expenses", listed as the headline lists carry steps, with no comma before the "and". Only an amount of a cent or more counts as some.
- **The classes card:** each class's due, a column "Due before carry" **(the heading mine)**, deal by deal.
- **At the NAV point of a fund whose X isn't final (mine),** the split, its due and the headline are the NAV split's, as the cards after the split already are. On the whole fund they're the same as the x-axis's split there. Deal by deal they can differ, since at the NAV point what's due is the end's (FA58): case 36 has $12,855,000 due at its NAV point and $10,069,750 on its axis. The chart's lines stay on the x-axis, with no jump at NAV (Jordan, f05c review, answer 4).
  - **The line under the chart's values says so (Jordan's words, f05c review, answer 4):** deal by deal, at the NAV point, when what's due at the end differs from what's due on the axis, it reads "Values at NAV, $15,000,000.00, as if the fund were liquidated: everything left of every investment counts as realized, so all the LPs' paid-in comes back before carry. The lines are X from Kapok Robotics, 50% sold.", with the investment and share as X's source has them. Otherwise it's as before: "Values at X = $15,000,000.00, from this distribution."
  - **"Differs" is to the cent (mine),** as the two dues show: case 34's NAV point, whose X from Cedar AI realizes everything left, keeps the line as before.
- **The notice on Payouts (mine)** names the tab the last change was made on, not the problem's: switching to deal by deal on Terms, with no investments, reads "Your last change to the terms has a problem, …", and "Fix it" goes to the Investments tab.

### Problems, in the page's words, under the field their path names

**From the form (the words mine):**
- **Deal by deal without investments,** under "Add an investment": "Deal by deal needs the fund's investments: add each one, with its checks."
- **An investment's name blank:** "Write the investment's name."
- **A name used twice:** "An investment above already has this name; each investment needs its own."
- **A check's date:** "Choose this check's date."
- **A check's amount:** "Write the check's amount in dollars, more than zero: 3000000 or $3M."
- **A check after D:** "This check is after the distribution date, 30 Jun 2024."
- **Checks past the investment calls,** under the first such check's amount: "By this check's date the checks come to more than the investment calls. Checks are paid from capital called for investments."
- **Deal by deal, a distribution without a From:** "Deal by deal, every distribution comes from an investment: choose which."
- **A write-off without one:** "Choose the investment this write-off ends."
- **A From whose investment has no name yet:** "This investment has no name yet: name it on the Investments tab."
- **A share that isn't one:** "Write the share sold as a percent, above 0 and at most 100: 100 or 40."
- **Before its investment's first check,** in its row: "This distribution is before the first check in Alder Robotics, on 1 Feb 2020." A write-off's says "This write-off".
- **A write-off after D:** the cash flows' line, as now.
- **Deal by deal, X without a From:** "Deal by deal, X comes from an investment: choose which."
- **X's share:** "Write the share X sells as a percent, above 0 and at most 100: 100 or 40."
- **At the top of the tab,** as now, the Investments tab too. X's are on Payouts: "Your last change to X's source has a problem, …", and saving says "Not saved: X's source has a problem to fix first."
- **What the form can't make:** a pref deal by deal, since the box is off; a basis it doesn't know; an investment or share on a call; a kind, amount or share on a write-off; an investment that isn't text, or isn't listed; a share without an investment; the shapes of the investments, their checks and X's source; and an empty list of checks. Only a file has them.

**An opened file's problem, in one line,** as now, its place then its words **(all mine)**:
- **The places:** "Its list of investments", "Row 2 of its investments", "The name in row 2 of its investments", "The list of checks in row 2 of its investments", "Check 1 in row 2 of its investments", "The date of check 1 in row 2 of its investments", "The amount of check 1 in row 2 of its investments", "`sector` in row 2 of its investments", "`shares` on check 1 in row 2 of its investments", "X's source", "The investment X comes from", "The share X sells", "`note` in X's source", "Its carry basis", and a cash flow's "The investment in row 6 of its cash flows" and "The share in row 6 of its cash flows".
- **A pref deal by deal:** "This file has a term the page doesn't model: a pref with carry deal by deal (`terms.pref`). Deal by deal, this version has no pref, so no catch-up either."
- **A basis it doesn't know:** "Its carry basis isn't one the page knows: it's whole_fund or deal_by_deal."
- **On a call:** "Row 1 of its cash flows is a call, which has no investment or share: only a distribution or a write-off does."
- **On a write-off:** "Row 7 of its cash flows is a write-off, which has no kind, amount or share: only its date and investment."
- **A share that isn't one:** 'The share in row 6 of its cash flows isn't a share the page can use: it's above 0 and at most 1, written as an exact string like "0.4".' X's the same, after "The share X sells".
- **A missing investment,** by what the row is: "The investment in row 7 of its cash flows is missing: a write-off names the investment it ends." / "…: a share sold needs the investment it's sold from." / "…: deal by deal, every distribution comes from one."
- **Deal by deal without investments:** "Its list of investments is missing: it's needed to pay carry deal by deal."
- **Deal by deal without X's source:** "X's source is missing: deal by deal, X comes from an investment."
- **`investment_name_repeated`:** "The name in row 2 of its investments: an investment above already has this name; each needs its own."
- **`investment_unknown`:** "The investment in row 6 of its cash flows: it isn't one of the fund's investments." X's the same, after "The investment X comes from".
- **`investment_not_made`:** "Row 6 of its cash flows: it's before the first check in the investment it names."
- **A check after D:** "Check 1 in row 3 of its investments: this check is after the distribution date."
- **`investments_exceed_calls`:** "The amount of check 1 in row 2 of its investments: by its date, the checks come to more than the investment calls."
- **Everything else** in the lines files already have: "isn't a value it can take", "is missing", "isn't part of a fund's input", the amounts' line, the dates' line.

### Saving and opening

- **Saving keeps** the investments, the tags (a distribution's investment and share, a write-off's investment), the write-offs, X's source and the basis. A fund without them saves without them; the whole fund's basis is left out, as its default **(mine)**.
- **Opening brings them back.** f05b1's guard comes out, and its tests.

### The examples

- **Case 34 joins the picker** as "A fund that pays carry deal by deal", after case 29.
- **It opens at $5,000,000 (mine),** its listed X, below its one breakpoint: X from Cedar AI goes to the LPs as capital, toward the $11,100,000 due.
- **The others stay.**

### Tests

- **The page's pending list empties,** so cases 33 to 37 run through its case tests:
  - the forms round trip with the investments
  - files open and save
  - the fund-37 refusals show in the page's words: beside their fields for those the form can make, and in one line when opened from a file for all of them
- **Case 34's numbers** as the review checks them, and as case 33 once switched to the whole fund.
- **Case 26 switched to deal by deal and back.**

## How it's built: its own app, `apps/fund` (your answer 1)

### The two ways

**(a) A second Vite entry in `apps/dashboard`:** `fund/index.html` beside `index.html`, one build, one `dist/`.
- **For:** it shares the CSP plugin, the privacy test, `styles.css`, the screenshot script and the masthead.
- **Against:**
  - **Every fund-page step edits the engine's page:** its `vite.config.ts`, `package.json` and tests.
  - **The fund page would sit in a bundle that imports `spillpoint`.** The fund workstream keeps the two apart until engine 1.0.
  - **Keeping it off the site** needs a build flag in the dashboard's config: an entry that exists in source but is left out of the built site until the release turns it on.

**(b) Its own app, `apps/fund`, the package `@spillpoint/fund`, private,** named as `@spillpoint/dashboard` is in `apps/dashboard` (f01g). `pnpm --filter @spillpoint/fund` names it exactly, so it never selects the engine, `spillpoint-fund`.
- **What it has:**
  - its own Vite config
  - React and Recharts at the dashboard's versions
  - `spillpoint-fund` resolved to `packages/fund/src`, as the dashboard resolves `spillpoint` (no build step)
  - its own tests and privacy test
- **For:**
  - It never touches `apps/dashboard` until the release step, and never imports `spillpoint`.
  - Keeping it off the site needs nothing: CI builds and tests it, and Pages doesn't upload it.
- **Against:** a few small things are copied, not shared:
  - the CSP list, which a test holds equal to the dashboard's (below)
  - the masthead's caveat
  - the file download
  - the tabular-figures CSS

**(b), as you chose.** The page is for a different reader, depends on a different package, and ships on a different schedule. The copying is about a hundred lines, and one test keeps the part that matters, the CSP, the same as the main page's.

### The rules it keeps

**The CSP, the dashboard's exactly:**
- `default-src 'none'`, `connect-src 'none'`, `form-action 'none'`, `script-src 'self'`, `worker-src 'self'`, and the rest
- injected into the built page's head, before any script

A test reads `CONTENT_SECURITY_POLICY` from `apps/dashboard/vite.config.ts` and checks the fund page's policy is the same string, so the two can't drift. That reads the dashboard's file; it doesn't change it.

**The privacy test, the dashboard's checks on the fund page's build:**
- the policy is there and comes first
- it loads only its own files
- there's no `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon` or browser storage in its scripts
- there's no web address beyond the libraries' error-message links

**No network, nothing in URLs, nothing kept in the browser** (hard rule 5). A fund is kept only as a local file.

### No Worker at first (your answer 3)

The main page computes in a Web Worker because Millrace's breakpoints take about 0.3 seconds. The fund engine is much faster. A 300-cash-flow fund with three steps, a pref, a catch-up and a GP commitment, final, on this laptop:
- read in 1 ms
- every breakpoint found in 2 to 8 ms
- a split at each in about 1 ms

**So it starts without a Worker,** computing in place, and adds the main page's pattern, a Worker with an in-place fallback for the tests, when something slow arrives. The portfolio view would be the first candidate: its sweep replays every cash flow at each step. Adding it later changes one module, not the page.

### How it deploys under /fund/, with no rewrites

**The build:** `apps/fund` builds with `base: "./"`, as the dashboard does, into `apps/fund/dist`: `index.html`, `assets/`, its icons.

**At the release step,** `pages.yml` copies that folder to `apps/dashboard/dist/fund/` before the upload. One step: `cp -r apps/fund/dist apps/dashboard/dist/fund`.

**Why no rewrites:**
- **GitHub Pages** serves `fund/index.html` at `/spillpoint/fund/`, and redirects `/spillpoint/fund` to it.
- **Every path is relative** (`./assets/…`), so they resolve under `/spillpoint/fund/` now and under `spillpoint.io/fund/` after the engine's 1.0, unchanged.
- **The fund page's assets** sit in `fund/assets/`, apart from the main page's `assets/`, so nothing collides.

**The links:**
- **Main page to the fund page:** `./fund/`.
- **Fund page back:** `../`.

## Not live until the fund's release step

**Every merge to main deploys** `apps/dashboard/dist`, and only that.
- **Before the release step,** `apps/fund` lands step by step on main. CI builds it and runs its tests and privacy test on every PR and push, through the workspace's `pnpm -r`, and `pages.yml` never uploads it. There's no flag, no hidden route, and no unlinked page on the site to find.
- **You check each step** with `pnpm --filter @spillpoint/fund dev`, or its `preview` of the built page, on your machine.

**What the release step, f01n, switches on,** with npm 0.1.0, the package's README, licence and pack check:
1. **`pages.yml`:** the copy step above, so the next deploy publishes `/fund/`. A change to `.github/workflows/`, flagged in its review (hard rule 9).
2. **`apps/dashboard`:** one link to the fund page, in the main page's footer (your answer 10). The first change the fund workstream makes to the main page.
3. **`CLAUDE.md`:** the fund section's rule becomes "nothing in `apps/dashboard` but the footer link".

   It's amended once before that, in f01f, to allow `apps/fund` (your answer 1).
4. **The privacy test** for the combined site: the dashboard's build checked with `fund/` inside it, or the fund page's own test run on the uploaded folder.

**The page's title** is "spillpoint: fund waterfall" (your answer 10).

## The steps

Each is one branch, one PR and one evening, with a review note and what to check on the page. In 0.1.0's order (your answer 4):
- **f01e:** the naming review, before any page code. It also puts the LPs' net multiple in the split, adds the stable-names list, and adds the case that pins FC6's capital and catch-up wordings.
- **f01f to f01m:** the page, below.
- **f01n:** the release.

1. **f01f: the app, and the split at one X.**
   - **What it adds:**
     - `apps/fund` (`@spillpoint/fund`) with the CSP and its test against the dashboard's, the privacy test, the masthead and caveat, the title "spillpoint: fund waterfall", and the footer (spillpoint-fund's version and the commit)
     - the three example funds from the cases: 8, 13 and 12
     - the X box and the split table, X alone and to date, with the paid-in, the pref to D and the LP multiple
     - the line under the table saying why amounts are to the cent
     - `CLAUDE.md`'s rule amended for `apps/fund`
   - **You check:** open the dev page; the VC example comes up. Type 40000000.
     - **The table:** LPs $32,793,750.00; carry $5,445,000.00 at 20% and $1,361,250.00 at 25%; GP commitment $400,000.00.
     - **To date:** LPs $36,753,750.00.
     - **Its tests** check these against case 8's expected values.
2. **f01g: the chart and the breakpoints.**
   - **What it adds:** the three lines, the numbered marks, the NAV mark, the slider, the range's top, and the breakpoint sentences with the GP's per-$1M line.
   - **You check:**
     - **The VC example:** marks at $7,000,000, $34,500,000 and $63,833,333.33, with case 8's sentences, and "NAV" at $40,000,000.
     - **The slider:** dragging it moves the table.
     - **A phone's width:** the chart fits at 320 pixels.
3. **f01h: the clawback.**
   - **What it adds:**
     - the clawback card and its small chart, when final
     - the NAV button and the NAV point's clawback for a fund that isn't final
   - **You check:**
     - **The clawback example (case 13):** owed $2,750,000.00 at 0, falling to $750,000.00 at $10,000,000, holding, falling to $656,250.00 at $15,937,500, then holding.
     - **Its sentences,** case 13's three.
     - **The VC example at NAV:** nothing owed.
     - **The SPV example (case 12):** nothing owed at any X, with one breakpoint, $2,040,000.
4. **f01i: the terms form.**
   - **What it adds:** carry flat and in steps, pref, catch-up and GP commitment with its flags, percents converted exactly, and refusals beside their fields.
   - **You check:**
     - **Carry at 100%:** "A carry rate must be below 100%" under the carry rate, and the chart keeps the last good fund and says so.
     - **The catch-up:** turning on a pref brings it in. A partial catch-up of 20% is refused beside its share.
     - **The VC example at flat 20%:** its only breakpoint is $7,000,000. At $40,000,000 the carry is $6,534,000.00: 20% of the $32,670,000 above capital, of the 99% that runs the tiers.
5. **f01j: the cash flows table.**
   - **What it adds:** rows with date, type, kind and amount, add, remove and "Sort by date"; "as of", D, final and NAV; refusals in their cells; and "A blank fund" to start from.
   - **You check:**
     - **Case 6 typed in** from a blank fund, its terms and its one call, gives its three breakpoints: $10,000,000, $14,004,383.56 and $15,005,479.45.
     - **Example A typed in by hand** gives case 8's numbers without its third step.
     - **A distribution dated before the first call** is refused in its row.
     - **A blank amount** asks for an amount.
6. **f01k: pasting cash flows from a spreadsheet.**
   - **What it adds:** the paste, its preview with the rows it can't read and why, and "Add them".
   - **You check:**
     - **Case 9's five cash flows,** pasted from a spreadsheet with dollar signs and commas, then its terms, give case 9's two breakpoints, $659,342.47 and $1,199,178.08.
     - **A row reading "Q3 2021"** is listed as unreadable, and nothing is added until "Add them".
7. **f01l: open and save.**
   - **What it adds:** the file format, opening a saved file, a bare input or a case's `inputs.json`, "Not saved", and the one-line status.
   - **You check:**
     - **A round trip:** save the clawback example, change a term, open the saved file, and it comes back with its X.
     - **A case's file:** open `packages/fund/cases/fund-11-clawback-pref/inputs.json` and see case 11.
     - **A file with `hurdle_irr`** is refused in plain words.
8. **f01m: the keyboard, narrow screens and screenshots,** as M3e did for the main page.
   - **What it adds:**
     - **Clicking or tapping the chart sets X there,** in place of a hover readout (f01g review, answer 3). As built: the nearest 1/1000 of the range, in whole dollars; within 8 pixels of a breakpoint, the breakpoint exactly. The clawback's small chart does the same, onto its bends.
     - **The keyboard:** every control reachable and labelled, and the chart's values in its legend.
     - **Narrow screens:** the cash-flow table on a phone, one row a card under 480 pixels. As built: date and type on one line, kind and amount on the next, the row's number and "Remove" at its end.
     - **Escape** closes the paste box as "Cancel" does, and the focus goes back to its button.
     - **f01m2, before the release:**
       - **The cash flows never scroll sideways.** They're cards wherever the table wouldn't fit, up to a 760-pixel card, whatever the window. A container query on the card's own width decides, so an upright iPad (768) shows cards, and 900 the table.
       - **The split on a phone:** under 480 pixels it's two tables, one above the other, "This distribution" then "The fund to date". Each has Tier, LPs and GP, with the tier's name on its own line above its two amounts, as the main page's payouts table puts shares under each name (M3e) (f01m review, answer 2).
       - **A tap within 8 pixels of the NAV line** lands on NAV exactly, as on a breakpoint. When a breakpoint is as close, the nearer of the two wins (f01m review, answer 1).
     - **f01n's first commit:**
       - **The masthead's picker shrinks** with the masthead, so no window width scrolls the page; from f01k to f01m2 it did between 644 and 692 pixels.
       - **The split switches to its two tables by its card's width,** as the cash flows do: wherever the one table wouldn't fit, at any window width. Under 480 pixels it's always two. The page measures the one table, out of sight while the two show, to see when it fits again.
     - **Screenshots** for the review, from a copy of the screenshot script.
   - **You check:** the page at 320 pixels, and by keyboard alone.

**f01n, the release,** then switches the page on, as above: npm 0.1.0, `pages.yml`'s copy step, the footer link, the package's README and licence, and the pack check. As built: `packages/fund` publishable at 0.1.0, built to `dist` as the engine is; its README and Apache-2.0 licence; `notes/release-fund-0.1.0.md`; `pages.yml` copying `apps/fund/dist` into the dashboard's as `fund/`; the main page's footer linking to `./fund/` and the fund page's back with `../`; `apps/fund/test/site.test.ts` holding the two together to the privacy rules.

**Tests in every step:**
- **jsdom tests,** as the main page's: each step's checks above, run against the cases' `expected.json`, so the page's numbers can't drift from the engine's.
- **The privacy test** from step 1 on.

## Your answers (2026-10-13)

The plan above follows them.

1. **Its own app,** in `apps/fund`, not `apps/fund-page`. The package name stays `@spillpoint/fund-page`, distinct from the engine's, so `pnpm --filter` can't mix them up. `CLAUDE.md`'s fund rule is amended for `apps/fund` in the first page step.

   **Renamed in f01g:** `@spillpoint/fund`, to match `@spillpoint/dashboard` in `apps/dashboard` (your answer during f01g).
2. **To the cent, not as paid,** for the reason given. The page's line under the table says so.
3. **No Worker at first.**
4. **The page goes live with 0.1.0,** and the naming review comes first. The order:
   - f01e, the naming review
   - f01f to f01m, the page's steps
   - f01n, the release: npm 0.1.0, `pages.yml`'s copy step, the footer link, README, licence and pack check
5. **Cases 8 and 13, and case 12** (the SPV) as a third: many emerging managers run SPVs, and it's the shortest example.
6. **Neutral:** "the GP's carry is $6.81M". The same file goes to LPs and co-GPs.
7. **The file shape,** and opening a saved file, a bare input or a case's `inputs.json`: yes.
8. **Pasting cash flows from a spreadsheet:** before release, as its own step right after the cash-flow table. A GP won't type years of flows by hand; that's where they'd give up.
9. **The LP multiple:** yes, but from the engine, not the page's own arithmetic. It's in the split from f01e, so the page does no fund math.
10. **A link in the main page's footer** at release, and the title "spillpoint: fund waterfall".
