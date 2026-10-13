# Plan: the fund page, at /fund/

The fund waterfall's own page: spillpoint.github.io/spillpoint/fund/ now, spillpoint.io/fund/ after the engine's 1.0.
- **Its own page, not a tab** (your choice), so a GP who never touches a cap table gets a link of their own.
- **This is the plan, with no code.** Nothing is built until you answer the questions at the end.
- **Not live until the fund's release step.**

**What it runs on:** the fund engine as it stands after f01c:
- `readFund`, `splitAt`, `splitAtNav`, `findBreakpoints`
- `FundRefusal`, `D`, `toCents`

Every name is provisional until the naming review, which should come before the page builds on them (question 4).

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

### The answer first

A headline at the chosen X, in the GP's voice (question 6): "At a $40M distribution on 30 Sep 2026, your carry is $6.81M. The LPs get $32.8M and your GP commitment $400K." Under it, the caveat every spillpoint page carries: the fund's documents govern, not this tool, and nothing leaves the computer.

### The chart

Three lines against X, each straight between breakpoints, so the chart is drawn exactly from the range's ends and the breakpoints, as the main page draws its curves:
- **the LPs,** all their tiers together
- **the GP's carry,** catch-up plus carry by step
- **the GP commitment's line,** a straight line at g of X

**Marks on the chart:**
- **Every breakpoint,** numbered.
- **The NAV point,** labelled "NAV".
- **The chosen X,** which a slider and a text box both set.

**The range** runs from 0 to a top the page chooses: the larger of 1.5 × NAV and 1.25 × the last breakpoint, and at least twice the LPs' paid-in. The top is editable.

### The breakpoints, in sentences

A numbered list matching the chart's numbers, each the engine's reason, then what it means for the GP per extra $1M, as the main page's "For you" line does. For example: "2. At $34,500,000: LPs reach 3.0x: carry is 25% from here. Your carry goes from $198,000 to $247,500 per extra $1M." Where several reasons share a point, they're one item.

### The split at X

A table by tier, for X alone and for the fund to date:
- **Rows:**
  - capital and pref, to the LPs
  - the catch-up, with the GP's share and the LPs'
  - the carry tier at each step, with the GP's share and the LPs'
  - the GP commitment's line, set apart
  - totals
- **Columns:** "This distribution" (LPs, GP) and "The fund to date" (LPs, GP).
- **A tier the terms don't have** isn't shown. The engine gives it as zero; the page chooses from the terms (your f01b answer 2).
- **Under the table:**
  - the LPs' paid-in and the GP commitment's paid-in
  - the pref accrued to D
  - the LPs' net multiple to date, F10's, which tells a GP where the next step is (question 9)

### The NAV point

"At NAV, $40,000,000, as if the fund were liquidated on 30 Sep 2026", with a button that sets X to NAV. The NAV point is final by definition (F14), so its split comes with the clawback card.

### The clawback, when final or at NAV

**In one sentence:** "If this is the fund's last distribution, the GP has been paid $X of carry, has earned $Y on the fund's totals, and owes $Z back to the LPs."

**A small chart of its own** under the main one, not a fourth line on it:
- **What it shows:** the clawback owed against X, with its own breakpoints from F15, cleared or changes.
- **Why its own:** it's a different scale, and often zero.

### Amounts: to the cent, not as paid (question 2)

**The main page's P1** rounds each holder's payment for each class down to the cent and shows the cents left over, because those are real payments, each one a wire.

**On the fund page, most rows aren't a wire:**
- **The GP commitment's line and the GP's carry** are each one payment.
- **"The LPs" is every LP together.** v1 has no per-LP accounts (F3's later item), so the real payments, each LP's share rounded down, don't exist yet. Rounding the total down would show a "left over" that isn't what's left over.
- **The tier rows** aren't payments at all: they're the parts of the LPs' and the GP's amounts.

**So I'd show every amount as the cases do:** to the cent, half away from zero, with FA14's first rounding (`toCents`). There's no left-over row. A line under the table says each row is rounded on its own, so rows can differ from their total by a cent. P1 would come with per-LP accounts, when each LP's payment exists.

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

**Pasting rows from a spreadsheet** would save a GP the most typing. I'd leave it for later, after the table works (question 8).

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

**The examples** are read at build time from the locked fund cases, as the main page reads Millrace, so they can't drift from the tests (question 5):
- **"A VC fund: carry steps and a 1% GP commitment",** case 8, the default. It has a NAV.
- **"A late call and a clawback",** case 13, final.

**Saving** downloads a file the page makes, as the main page does:
- **The file:** `{"format": "spillpoint-fund", "version": 1, "name": …, "fund": <the input SPEC.md describes>, "view": {"x": …}}` (question 7).
- **Why the `fund` field matters:** it's exactly `readFund`'s input, so a saved file's `fund` is engine input as it stands.
- **The version** lets older files keep opening, as the main page's C13 does.

**Opening:**
- **What it takes:** a saved file; a bare fund input; or a fund case's `inputs.json`, which has `fund` inside.
- **A file that can't be read** says why in one line under the masthead, the main page's pattern.
- **"Not saved"** marks unsaved changes.

**The rule holds:** nothing is kept in the browser, and nothing goes in the URL.

## How it's built: its own app (question 1)

### The two ways

**(a) A second Vite entry in `apps/dashboard`:** `fund/index.html` beside `index.html`, one build, one `dist/`.
- **For:** it shares the CSP plugin, the privacy test, `styles.css`, the screenshot script and the masthead.
- **Against:**
  - **Every fund-page step edits the engine's page:** its `vite.config.ts`, `package.json` and tests.
  - **The fund page would sit in a bundle that imports `spillpoint`.** The fund workstream keeps the two apart until engine 1.0.
  - **Keeping it off the site** needs a build flag in the dashboard's config: an entry that exists in source but is left out of the built site until the release turns it on.

**(b) Its own app, `apps/fund-page` (`@spillpoint/fund-page`, private):**
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

**I'd take (b).** The page is for a different reader, depends on a different package, and ships on a different schedule. The copying is about a hundred lines, and one test keeps the part that matters, the CSP, the same as the main page's.

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

### The Worker (question 3)

The main page computes in a Web Worker because Millrace's breakpoints take about 0.3 seconds. The fund engine is much faster. A 300-cash-flow fund with three steps, a pref, a catch-up and a GP commitment, final, on this laptop:
- read in 1 ms
- every breakpoint found in 2 to 8 ms
- a split at each in about 1 ms

**So I'd start without a Worker,** computing in place, and add the main page's pattern, a Worker with an in-place fallback for the tests, when something slow arrives. The portfolio view would be the first candidate: its sweep replays every cash flow at each step. Adding it later changes one module, not the page. If you'd rather it match the main page from the start, it's a small first-step addition.

### How it deploys under /fund/, with no rewrites

**The build:** `apps/fund-page` builds with `base: "./"`, as the dashboard does, into `apps/fund-page/dist`: `index.html`, `assets/`, its icons.

**At the release step,** `pages.yml` copies that folder to `apps/dashboard/dist/fund/` before the upload. One step: `cp -r apps/fund-page/dist apps/dashboard/dist/fund`.

**Why no rewrites:**
- **GitHub Pages** serves `fund/index.html` at `/spillpoint/fund/`, and redirects `/spillpoint/fund` to it.
- **Every path is relative** (`./assets/…`), so they resolve under `/spillpoint/fund/` now and under `spillpoint.io/fund/` after the engine's 1.0, unchanged.
- **The fund page's assets** sit in `fund/assets/`, apart from the main page's `assets/`, so nothing collides.

**The links:**
- **Main page to the fund page:** `./fund/`.
- **Fund page back:** `../`.

## Not live until the fund's release step

**Every merge to main deploys** `apps/dashboard/dist`, and only that.
- **Before the release step,** `apps/fund-page` lands step by step on main. CI builds it and runs its tests and privacy test on every PR and push, through the workspace's `pnpm -r`, and `pages.yml` never uploads it. There's no flag, no hidden route, and no unlinked page on the site to find.
- **You check each step** with `pnpm --filter @spillpoint/fund-page dev`, or its `preview` of the built page, on your machine.

**What the release step switches on:**
1. **`pages.yml`:** the copy step above, so the next deploy publishes `/fund/`. A change to `.github/workflows/`, flagged in its review (hard rule 9).
2. **`apps/dashboard`:** one link to the fund page, in the masthead or the footer (question 10). The first change the fund workstream makes to the main page.
3. **`CLAUDE.md`:** the fund section's rule that nothing in `apps/` changes for the fund becomes "nothing in `apps/dashboard` but the link".

   That rule needs amending before the first page step anyway, to allow `apps/fund-page` (question 1).
4. **The privacy test** for the combined site: the dashboard's build checked with `fund/` inside it, or the fund page's own test run on the uploaded folder.

## The steps

Each is one branch, one PR and one evening, with a review note and what to check on the page. The letters depend on where the page falls among 0.1.0's steps (question 4), so they're numbered here.

1. **The app, and the split at one X.**
   - **What it adds:**
     - `apps/fund-page` with the CSP and its test against the dashboard's, the privacy test, the masthead and caveat, and the footer (spillpoint-fund's version and the commit)
     - the two example funds from the cases
     - the X box and the split table, X alone and to date, with the paid-in, the pref to D and the LP multiple
     - `CLAUDE.md`'s rule amended for `apps/fund-page`
   - **You check:** open the dev page; the VC example comes up. Type 40000000.
     - **The table:** LPs $32,793,750.00; carry $5,445,000.00 at 20% and $1,361,250.00 at 25%; GP commitment $400,000.00.
     - **To date:** LPs $36,753,750.00.
     - **Its tests** check these against case 8's expected values.
2. **The chart and the breakpoints.**
   - **What it adds:** the three lines, the numbered marks, the NAV mark, the slider, the range's top, and the breakpoint sentences with the GP's per-$1M line.
   - **You check:**
     - **The VC example:** marks at $7,000,000, $34,500,000 and $63,833,333.33, with case 8's sentences, and "NAV" at $40,000,000.
     - **The slider:** dragging it moves the table.
     - **A phone's width:** the chart fits at 320 pixels.
3. **The clawback.**
   - **What it adds:**
     - the clawback card and its small chart, when final
     - the NAV button and the NAV point's clawback for a fund that isn't final
   - **You check:**
     - **The clawback example (case 13):** owed $2,750,000.00 at 0, falling to $750,000.00 at $10,000,000, holding, falling to $656,250.00 at $15,937,500, then holding.
     - **Its sentences,** case 13's three.
     - **The VC example at NAV:** nothing owed.
4. **The terms form.**
   - **What it adds:** carry flat and in steps, pref, catch-up and GP commitment with its flags, percents converted exactly, and refusals beside their fields.
   - **You check:**
     - **Carry at 100%:** "A carry rate must be below 100%" under the carry rate, and the chart keeps the last good fund and says so.
     - **The catch-up:** turning on a pref brings it in. A partial catch-up of 20% is refused beside its share.
     - **The VC example at flat 20%:** its only breakpoint is $7,000,000. At $40,000,000 the carry is $6,534,000.00: 20% of the $32,670,000 above capital, of the 99% that runs the tiers.
5. **The cash flows table.**
   - **What it adds:** rows with date, type, kind and amount, add, remove and "Sort by date"; "as of", D, final and NAV; refusals in their cells; and "A blank fund" to start from.
   - **You check:**
     - **Case 6 typed in** from a blank fund, its terms and its one call, gives its three breakpoints: $10,000,000, $14,004,383.56 and $15,005,479.45.
     - **Example A typed in by hand** gives case 8's numbers without its third step.
     - **A distribution dated before the first call** is refused in its row.
     - **A blank amount** asks for an amount.
6. **Open and save.**
   - **What it adds:** the file format, opening a saved file, a bare input or a case's `inputs.json`, "Not saved", and the one-line status.
   - **You check:**
     - **A round trip:** save the clawback example, change a term, open the saved file, and it comes back with its X.
     - **A case's file:** open `packages/fund/cases/fund-11-clawback-pref/inputs.json` and see case 11.
     - **A file with `hurdle_irr`** is refused in plain words.
7. **The keyboard, narrow screens and screenshots,** as M3e did for the main page.
   - **What it adds:**
     - **The keyboard:** every control reachable and labelled, and the chart's values in its legend.
     - **Narrow screens:** the cash-flow table on a phone, one row a card under 480 pixels.
     - **Screenshots** for the review, from a copy of the screenshot script.
   - **You check:** the page at 320 pixels, and by keyboard alone.

**The release step** then switches the page on, as above, with the package's README, licence and pack check.

**Tests in every step:**
- **jsdom tests,** as the main page's: each step's checks above, run against the cases' `expected.json`, so the page's numbers can't drift from the engine's.
- **The privacy test** from step 1 on.

## Questions for you

1. **Its own app, `apps/fund-page`,** over a second entry in `apps/dashboard`? It means amending `CLAUDE.md`'s fund rule to allow `apps/fund-page`, keeping `apps/dashboard` untouched until the release step adds the link.
2. **Amounts to the cent (FC8),** not as paid (P1), until per-LP accounts exist? My reason: "the LPs" is every LP together, not one payment, so rounding it down would show a left-over that isn't real.
3. **No Worker at first,** since the engine takes milliseconds, adding the main page's pattern when something slow arrives? Or the Worker from step 1, for sameness?
4. **Where the page falls in 0.1.0.**
   - **Does it go live with 0.1.0's release?**
   - **The naming review first:** I'd do it before step 1, so the page is written to settled names.
   - **The letters:** you named f01e as the step with the README, licence and pack check. Is that the release, after the page steps, or a step before them?
5. **The examples:** case 8 (the VC fund, with NAV) as the default and case 13 (the clawback) as the second? Or case 6 (pref and full catch-up) in place of one?
6. **The headline in the GP's voice:** "your carry is $6.81M"? Or neutral, "the GP's carry is $6.81M", for an LP reading a GP's file?
7. **The saved file:** `{format, version, name, fund, view}`, and opening a bare input or a case's `inputs.json` too?
8. **Pasting cash flows from a spreadsheet:** later, after the table works? Or in step 5? It's the biggest saving for a GP with years of flows.
9. **The LP net multiple to date** (F10's DPI) under the split table? The engine doesn't output it; the page divides the LPs' to date by their paid-in. It's useful with steps, but it's the page's own arithmetic.
10. **The link at release:** in the main page's masthead or its footer? And the page's title: "spillpoint: fund waterfall", or something else?
