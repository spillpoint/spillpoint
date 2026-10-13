# Review: f01f (the fund page's first step: the app, and the split at one X)

Branch `f01f-fund-page-app`, from main after #101. The plan's step 1 (`notes/plan-fund-page.md`).
- **Not deployed:** `pages.yml` is unchanged and uploads only `apps/dashboard/dist`, so the fund page isn't on the site. CI builds and tests it.
- **Unchanged:** nothing in `apps/dashboard`, `packages/engine`, `packages/fund`'s code, any cases, `reference/` or `.github/`.
- **One local file:** a `.claude/launch.json`, used to preview the page in the browser pane while building it. It's untracked and not committed; `.claude/settings.json` is main's.

## 1. What changed

### The first commit, from your f01e answers

- **SPEC.md's F18:** each refusal names "a kind, a term and the path to what it's about in the input".
- **ASSUMPTIONS:**
  - **F18's row** says path.
  - **FA13** says "the path `x`".
  - **FC7** says "a case file's `field` is the error's `path`".
- **The case files** are unchanged.

### `apps/fund` (`@spillpoint/fund-page`, private)

- **`package.json`:** React and the test tools at the dashboard's versions, and `spillpoint-fund` from the workspace. Recharts comes with the chart in f01g.
- **`vite.config.ts`:**
  - **The engine:** `spillpoint-fund` is resolved to `packages/fund/src`, as the dashboard resolves `spillpoint`, so there's no build step. The page never imports `spillpoint`.
  - **The examples:** a virtual module reads `packages/fund/cases/<case>/inputs.json` at build time and keeps each one's `fund` input.
  - **The footer's build info:** spillpoint-fund's version and the commit.
  - **The CSP:** the main page's, word for word, injected into the built page's head.
  - **`base: "./"`,** so every path is relative and works under `/fund/` wherever the site is.
- **`index.html`:** the title "spillpoint: fund waterfall". The main page's two icons are copied into `public/`.
- **`src/App.tsx`:**
  - **The masthead:** the wordmark, "How a fund's distribution splits between LPs and GP", and "Start from" with the three examples.
  - **The caveat:** "The fund's documents govern, not this tool…"
  - **The headline card:**
    - **the fund's terms in one line:** "Carry 20%, 25% from 3.0x and 30% from 5.0x; no pref; GP commitment 1%, fee-free."
    - **the answer, in neutral words:** "At a $40M distribution on 30 Sep 2026, the GP's carry is $6.81M." / "The LPs get $32.8M and the GP commitment $400K."
  - **The X box:** under a label naming D.
  - **The split table,** with the GP commitment's line, the facts under it, and the line saying why amounts are to the cent.
  - **The footer.**
- **`src/format.ts`:**
  - amounts to the cent through the engine's `toCents` (FC8, FA14)
  - headline amounts to three significant digits
  - X in whole dollars unless it has cents
  - typed amounts read exactly ("$40M", "40,000,000", "34.5m", "250k")
  - dates as "30 Sep 2026"
  - rates as percents
  - a step's multiple as FC6 writes it ("3.0x")
  - the LP multiple to two places ("3.38x")

  None of it is fund arithmetic: every amount on the page is the engine's.
- **`src/styles.css`:** the main page's tokens and look, copied, since the apps share no code. On a phone, each tier's label stays on one line in a held column while the figures scroll sideways inside the card; f01m looks at the whole page on narrow screens again.

### The split table

| Row | This distribution: LPs, GP | The fund to date: LPs, GP |
|---|---|---|
| Capital | the LPs' capital; GP — | the same, to date |
| Pref, only with a pref | the LPs' pref; GP — | |
| Catch-up, only with one | each side's share | |
| Carry, flat carry: "Carry, at 20%" | each side's share | |
| Carry, in steps: "Carry tier" | the LPs' share of the carry tier; GP — | |
| Steps only: "GP's carry at 25%, from 3.0x", one row each | LPs —; the GP's carry at that step | |
| Total | the engine's totals | |

- **A tier the terms don't have isn't shown** (your f01b answer 2).
- **The GP commitment's line** sits under the table, outside the tiers: "$400,000.00 of this distribution, $440,000.00 to date".
- **The facts under it:**
  - distributed, now and to date
  - the LPs' paid-in
  - the GP commitment's paid-in, with one
  - the pref accrued to D, with a pref
  - the LPs' net multiple to date, `split.lpMultiple`
- **The line:** "Amounts are to the cent. "The LPs" is every LP together, not one payment, so nothing here is rounded down as it would be paid; each row is rounded on its own and can differ from its total by a cent."

### The examples (your answer 5)

| Example | Case | Opens at |
|---|---|---|
| A VC fund: carry steps and a 1% GP commitment | fund-08, the default | $40,000,000, its NAV |
| A late call and a clawback | fund-13 | $15,000,000, where the totals' run reaches 2x |
| An SPV: one company, the exit as its last distribution | fund-12 | $6,000,000, its NAV |

Each opening X is a point in its case, so the tests can hold the page to it. Cases 13 and 12 are final, and the engine works out their clawback; the page shows it from f01h.

### A typed X

**What the box reads:** "40000000", "40,000,000", "$40M", "34.5m", "250k", all exact.

**Anything else** shows, in the error red under the box: "Write an amount in dollars, 0 or more: 40000000, 40,000,000 or $40M. Showing $40,000,000, the last amount that worked." The table stays on that amount. The engine's own refusal of an X (FA13) would show the same way; the box's reading never lets one through.

### Tests: 21 in `apps/fund`

- **`app.test.tsx` (9):**
  - **The examples:** they come from the cases, case 8 first, labelled "(fictional)".
  - **Case 8 at $40,000,000:** the headline and terms line; every row, step and total; the GP commitment's line; the facts; the line on rounding.
  - **Case 8 at a typed $34.5M:** the 3.0x breakpoint, every row, and a multiple of exactly 3.00x.
  - **A bad X:** the message and the kept split, then a good one.
  - **Cases 13 and 12** at their opening X.
  - **The footer.**

  Every figure in the table is compared with the case's `expected.json` point, not with numbers typed into the test.
- **`csp.test.ts` (1):** the policy equals `CONTENT_SECURITY_POLICY` in `apps/dashboard/vite.config.ts`. It reads that file; it changes nothing there.
- **`privacy.test.ts` (6):** builds the page as it would ship, and checks:
  - the policy comes first and refuses every connection
  - only its own files load, by relative paths
  - its icons ship
  - there's no `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon` or browser storage in its scripts
  - there are no web addresses beyond library error links
  - the bundle carries the fund engine (one of `readFund`'s refusal messages) and none of the company engine's error classes
- **`format.test.ts` (5):** money, X, headlines, typed amounts, dates, rates and multiples, FA14's half cent included.

**Checked in the browser too.** The dev page renders at desktop and phone widths. The built page, with its CSP in force, renders and switches examples. It logged nothing and made no requests beyond its own files.

## How to run it on your machine

From the repo, on this branch (or on main once it's merged):

```bash
pnpm install
```

```bash
pnpm --filter @spillpoint/fund-page dev
```

Open the address it prints: `http://localhost:5173/`, or `5174` if the main page's dev server already has 5173.

To see the page as it would ship, with its CSP:

```bash
pnpm --filter @spillpoint/fund-page build && pnpm --filter @spillpoint/fund-page preview
```

Then open `http://localhost:4173/`.

## What to check

1. **It opens on "A VC fund: carry steps and a 1% GP commitment (fictional)"** at $40,000,000, case 8 at its NAV.
   - **The terms line:** "Carry 20%, 25% from 3.0x and 30% from 5.0x; no pref; GP commitment 1%, fee-free."
   - **The headline:** "At a $40M distribution on 30 Sep 2026, the GP's carry is $6.81M." Under it: "The LPs get $32.8M and the GP commitment $400K."
2. **"The split at $40,000,000",** against case 8's `expected.json`:

   | Row | This distribution: LPs | GP | To date: LPs | GP |
   |---|---:|---:|---:|---:|
   | Capital | $6,930,000.00 | — | $10,890,000.00 | — |
   | Carry tier | $25,863,750.00 | — | $25,863,750.00 | — |
   | GP's carry at 20% | — | $5,445,000.00 | — | $5,445,000.00 |
   | GP's carry at 25%, from 3.0x | — | $1,361,250.00 | — | $1,361,250.00 |
   | GP's carry at 30%, from 5.0x | — | $0.00 | — | $0.00 |
   | Total | $32,793,750.00 | $6,806,250.00 | $36,753,750.00 | $6,806,250.00 |

   - **Under it:**
     - "The GP commitment's line, outside the tiers: $400,000.00 of this distribution, $440,000.00 to date."
     - Distributed "$40,000,000.00 now, $44,000,000.00 to date".
     - The LPs' paid-in $10,890,000.00; the GP commitment's paid-in $100,000.00.
     - The LPs' net multiple to date 3.38x: $36,753,750 on $10,890,000, which is 3.375.
   - **The line** saying amounts are to the cent and why.
3. **Type `$34.5M`.** The split is at $34,500,000, case 8's 3.0x breakpoint: LPs $28,710,000.00 and GP $5,445,000.00 in this distribution, and the multiple is exactly 3.00x.
4. **Type `forty`.** A red line under the box says what to write and that it's showing $40,000,000. The table doesn't change.
5. **Start from "A late call and a clawback".** It opens at $15,000,000.
   - **Its terms:** "Carry 20% and 30% from 2.0x; no pref; no GP commitment."
   - **The totals:** LPs $14,000,000.00 and GP $1,000,000.00 now; $39,250,000.00 and $5,750,000.00 to date.
   - **The multiple:** 1.96x.
   - **No clawback yet:** that's f01h.
6. **Start from "An SPV".** It opens at $6,000,000, its NAV.
   - **The headline:** "the GP's carry is $792K"; "The LPs get $5.21M."
   - **The split:** capital $2,040,000.00, then "Carry, at 20%" with $3,168,000.00 to the LPs and $792,000.00 to the GP.
   - **The multiple:** 2.55x.
   - **No GP commitment line.**
7. **The footer** reads "spillpoint-fund 0.0.0 (<commit>)".
8. **At a phone's width,** the tier labels stay on one line and the figures scroll sideways inside the card.
9. **On the built page,** the browser's Network panel shows only the page's own files.

## Assumptions added

None in the fund engine. The page's choices are above and in the plan: the opening X's, the table's rows, the terms line and the multiple to two places.

## Open questions

1. **The opening X:** case 13 at $15,000,000, and case 12 at its NAV. Fine, or another point?
2. **The carry tier in steps:** the LPs' share is one row, since the engine gives the LPs' share of the carry tier in all, and the GP's carry is one row a step. Should the engine give the LPs' share by step too, so each step's row has both sides? It would be a new field on a name the naming review just settled, `StepCarry`.
3. **The terms line's wording** ("Carry 20%, 25% from 3.0x…; no pref; GP commitment 1%, fee-free."): fine as the page's own summary, or would you rather it wait for the form in f01i?
4. **The LP multiple to two places,** "3.38x", as DPI usually reads. Or three?
