# Review: f01d (FC6's totals wording, and the fund page's plan)

Branch `f01d-fund-page-plan`, from main after #99. A plan with no page code.
- **Unchanged:** nothing in `packages/engine`, `apps/`, `cases/` or `packages/fund/cases`. `git diff origin/main` over them is empty.
- **CI and permissions:** no change to `.github/` or `.claude/`.

## 1. What changed

### The first commit, from your f01c answers

- **FC6** now gives the four ways a `clawback_changes` reason names the totals' tier. The engine and the reference already shared them; now the spec says them too:
  - "LPs have their capital back"
  - "LPs have their pref"
  - "the GP has 25% of the profit", with c, the first carry rate
  - "LPs reach 2.0x: carry is 30% from here", with the step reached

  Each is no amounts, after "the clawback owed <change>: on the fund's totals,". FC6 says only the last is pinned by a case (13) so far, and that one for the other two comes with the naming review.
- **The rising-clawback guard** stays a plain Error, not a FundRefusal (your answer 2). Its message now reads "spillpoint-fund bug, please report it: the clawback owed rises as X grows (…), which v1's terms can't produce (FA9)".
  - **The only code change:** that message and its comment in `packages/fund/src/breakpoints.ts`. Behavior is unchanged.
  - **Not tested:** no input reaches it, so no test can show the new message.
  - **FA9** says why it's an Error and not a refusal.
- **FA15** is marked confirmed. The status legend gains "Confirmed (f01c review)".

### The plan: `notes/plan-fund-page.md`

The fund's own page at /fund/, for an emerging-manager GP who won't write JSON. It covers:
- **What it shows:**
  - the headline at X, in the GP's voice
  - the LPs, the GP's carry and the GP commitment against X, every breakpoint numbered with its reason and the GP's per-$1M change, and the NAV mark
  - the split at X by tier, for X and the fund to date
  - the NAV point
  - when final, the entitlement and the clawback, with its own small chart
- **The inputs:** a form for the terms, and a table for the cash flows with "as of", D, final and NAV. Refusals show in plain words beside the field they name, and the page stays on the last good fund while one shows.
- **Examples and files:** two examples from the locked fund cases (8 and 13), and open and save of a versioned file whose `fund` is `readFund`'s input.
- **Amounts:** I recommend to the cent as the cases are, not P1's as-paid rounding. "The LPs" is every LP together, not one payment, so a left-over row wouldn't be real until per-LP accounts exist. The plan says why; it's question 2.
- **How it's built:** I recommend its own app, `apps/fund-page`, over a second entry in the dashboard.
  - **Why:**
    - it never touches the main page until release
    - it never imports `spillpoint`
    - nothing extra is needed to keep it off the site
  - **The CSP** is held equal to the dashboard's by a test.
  - **The privacy test** comes with it.
  - **No Worker at first:** a 300-cash-flow fund reads and finds every breakpoint in under 10 ms.
- **Deploy:** under `/fund/` by copying its build into the uploaded site at the release step. There are no rewrites, since every path is relative.
- **Not live until release:** CI builds and tests it on every PR, and Pages never uploads it. The release step switches on the copy in `pages.yml`, the link from the main page, `CLAUDE.md`'s rule, and the privacy test of the combined site.
- **Seven steps,** each with numbers to check on the page from the fund cases. Every number in the plan was checked with the engine:
  - case 8 at $40M
  - the per-$1M change at 3x
  - flat 20% at $40M
  - case 13's clawback
  - case 6's breakpoints
- **Ten questions,** below.

## How to check it

1. **Read the plan.** The questions are at its end.
2. **The fund package's tests** still pass (263): `pnpm --filter spillpoint-fund test`.
3. **FC6:** read it in `packages/fund/docs/ASSUMPTIONS.md` against case 13's breakpoint at $15,000,000, whose text uses the step's wording.

## Assumptions added

None. FC6 is extended as you asked, and FA9 notes the guard.

## Open questions

The plan's ten, in brief:
1. Its own app, `apps/fund-page`, with `CLAUDE.md`'s fund rule amended to allow it?
2. To the cent, not as paid, until per-LP accounts?
3. No Worker at first?
4. Does the page go live with 0.1.0? Is the naming review first? Is your f01e the release?
5. Cases 8 and 13 as the examples?
6. The headline in the GP's voice?
7. The saved file's shape, and opening bare inputs and case files?
8. Pasting cash flows from a spreadsheet: later, or in step 5?
9. The LP net multiple under the split table?
10. Where the main page links to it, and the page's title?
