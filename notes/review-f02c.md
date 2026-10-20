# Review: f02c (the LPs on the page)

Branch `f02c-fund-lps-page`, from main. The third step of spillpoint-fund 0.2.0: the LPs tab, pasting LPs, the LPs' card on Payouts with its CSV, the examples with LPs, and files that keep the LPs.

**Only `apps/fund` and `notes/` changed:** `git diff --stat main -- packages apps/dashboard cases reference` prints nothing.

## 1. The plan first

The branch's first commit is `notes/plan-fund-page.md`'s new section, "0.2.0: the LPs", before any code.
- **Your words and layout** from f02b's review are as you gave them, with your correction: the leftover is at most a cent an LP, not under one.
- **What they leave open** is marked "(mine)" there, and listed in §9.
- **One wording changed while building:** a list of LPs that isn't a list reads "Its list of LPs isn't a value it can take.", not "Its LPs isn't …". The plan says so too.

## 2. The LPs tab (`src/Lps.tsx`, `src/lps.ts`)

**After Cash flows.**
- **The table:** one row an LP, Row, Name and Commitment, with "Remove" on each and "Add an LP" under it, which focuses the new name.
- **Commitments** read as the cash flows' amounts do.
- **The line under the table:**
  - "3 LPs, $10,000,000 committed. Commitments only divide what the LPs get between them; they aren't checked against the calls."
  - with no rows: "No LPs: Payouts shows the LPs together. Add one to see each LP's share."
  - no rows is no LPs, and the input leaves `lps` out

**Names are trimmed as the page reads them** (FA17, your answer 2 in f02a).
- **Typed:** the box keeps what's typed, so a space between two words isn't eaten. The engine and a saved file get the name trimmed, and the box shows it trimmed once it loses the focus.
- **Pasted, or from a file:** trimmed before anything else reads them.

**Problems** show under the cell, in your words:
- "Write the LP's name."
- "Write a commitment in dollars, more than zero: 5000000 or 5M."
- "An LP above already has this name; each LP needs its own."
- **Elsewhere:** at the top of the tab with "Show me", as on Cash flows. On Payouts the notice reads "Your last change to the LPs has a problem, …", and a save says "Not saved: the LPs have a problem to fix first. …".
- **Under 480 pixels of card** each LP is a card of its own: the name on one line, the commitment and "Remove" on the next.

## 3. Pasting LPs (`src/lpPaste.ts`)

As the cash flows paste: a box under the table, and more than one cell pasted into a name or commitment cell goes there.
- **The rows:** name, then commitment; cells past the second are ignored.
- **Each row it can't read, with why:** no name, no commitment, negative, "$ -", an amount it can't read, a name already in the paste ("… is already in this paste, in row 2"), a name already in the table.
- **The preview** reads "3 LPs, $10,000,000 committed; they'll be the table's first." Nothing is added until "Add them": after the rows already there, empty rows giving way.
- **Escape** closes the box as "Cancel" does.
- **Shared with the cash flows:** their cell splitting and amount reading (`cellsOf`, and a new `pastedAmount`). The cash flows' words are unchanged, and their 14 paste tests pass as they were.

## 4. Files (`src/file.ts`)

- **f02b's guard is gone,** with its two tests.
- **Opening:** the file's LPs go into the LPs tab, each name trimmed before the engine reads the file. So "Alder" and "Alder " in one file are refused as a repeat.
- **An LP problem in an opened file** reads as the others do, in one line under the masthead:
  - "The name in row 2 of its LPs is missing."
  - "The commitment in row 1 of its LPs isn't a number the page can use: …"
  - "The name in row 3 of its LPs: an LP above already has this name; each LP needs its own."
  - "Row 1 of its LPs isn't a value it can take."
  - "Its list of LPs isn't a value it can take."
  - "This file has a term the page doesn't model: `carry` on an LP (row 1 of its LPs). Every LP is on the same terms here."
- **Saving:** the LPs are in `fund.lps`, names trimmed. A fund with no LPs saves without `lps`.

## 5. The LPs' card (`src/LpsCard.tsx`, `src/lpsCard.ts`)

**Only with LPs,** after the split and the clawback card, before the breakpoints, headed "Each LP at $40,000,000".
- **The columns:** LP, Share, Paid in, This distribution, To date, and "Share of the clawback" when the split is final and something is owed.
- **The rows:** each LP in the input's order, then "Left over from rounding down", then "Total".
- **Each LP's amount** is the engine's, rounded down to the cent after `toCents`'s 20-place step.
- **The leftover** in each column is the LPs' amount with `toCents`, less the rounded amounts: never negative, at most a cent an LP.
- **The total row** is that `toCents` amount. So it's the split table's LPs total, the paid-in line, and the clawback card's owed, to the cent.
- **Shares** to two places, half up after 20 places: 33.33%, 52.38%, 14.29%.
  - the leftover row's share is "—"
  - the total's is "100%"
- **Under the card,** your line.
- **At the NAV point** the card follows the NAV split, its clawback included.
- **On a narrow screen** each LP is a group: its name on its own line, wrapping, then each amount beside its column's name. That's wherever the one table wouldn't fit its card, and always under 480 pixels, as the split does.
  - The split's two width hooks moved to `src/layout.ts` to be shared; they're unchanged.
- **The split table's line,** when the fund has LPs: "Amounts are to the cent. "The LPs" is every LP together; each LP's amount, rounded down as it would be paid, is in the card below. Each row here is rounded on its own and can differ from its total by a cent."

## 6. The CSV

"Download as CSV" on the card: the card as shown, with a header row, every LP's rounded amounts, the leftover row and the total row.
- **Numbers:** without "$" or commas; shares as "33.33%".
- **Quoting, as RFC 4180,** lines ending in CRLF.
- **A name starting with =, +, - or @** gets a leading apostrophe.
- **UTF-8 with a byte-order mark.**
- **Its name:** as Save names its file, with X and D: `fund-18-lps-thirds-lps-at-2000000-on-2026-03-01.csv`. X in whole dollars, or to the cent, "63833333.33".
- **The page says where it went:** "Downloaded as …, in your downloads."
- **Nothing leaves the computer:** the privacy test passes as it was.

Case 18 at $2,000,000 gives, after the byte-order mark:

```
LP,Share,Paid in,This distribution,To date
Alder,33.33%,1666666.66,666666.66,666666.66
Birch,33.33%,1666666.66,666666.66,666666.66
Cedar,33.33%,1666666.66,666666.66,666666.66
Left over from rounding down,,0.02,0.02,0.02
Total,100%,5000000.00,2000000.00,2000000.00
```

## 7. The examples

- **"A VC fund with premium carry: …"** is case 17, the same fund with three LPs, and still opens at $40,000,000.
- **"A late call and a clawback"** is case 19, and still opens at $0.
- **Case 3 and the SPV** have no LPs.
- **The labels don't change** (§9).
- **The tests that pick these examples** pick the new ids. Their numbers are the same, since each LP case is its base case without its LPs. `scripts/screenshots.mjs` picks them too.

## 8. Tests

- **The page's pending list is empty,** so cases 17 to 21 run through its case tests:
  - the chart's lines
  - the clawback card for 19 and 20
  - each case's `inputs.json` opening and saving back with the same values, LPs included
  - the forms' round trips
- **`test/lpsCard.test.ts`, new:**
  - **At every point of cases 17 to 20,** 21 points:
    - each LP's row is the case's exact amount rounded down, worked in whole-number arithmetic as a separate check
    - the leftover is never negative and at most a cent an LP
    - the total row is the case's figure for the LPs
  - **Your $0.005 example:** $0.00, and $0.01 left over.
  - **Seven LPs at every cent from $0 to $3:** the leftover stays in bounds.
  - **The CSV** for case 18 at $2,000,000, character for character, and case 19's with its clawback column.
  - **Quoting and the formula guard.**
  - **The file's name.**
- **`test/lps.test.tsx`, new:**
  - **The tab:** rows, the line, add, remove, problems and "Fix it", and trimming.
  - **Pasting:** the preview, the rows it can't read, adding after the rows already there, cells pasted into a cell, Escape.
  - **The fund-21 refusals in the page's words:** all eleven opened as a file, and the six the form can make typed in beside their cells.
  - **The card:** case 17 against its expected values, case 19's clawback column, the NAV split for a fund that isn't final, none without LPs, and the CSV through the page, byte-order mark included.
  - **Saving and opening** with LPs.
- **`test/phone.test.tsx`:** the card's narrow form.
- **Changed, not new:**
  - the tab tests know four tabs
  - the split-table helpers look inside the split's own card, since Payouts can now have two tables
  - the card-order test has the LPs' card after the clawback

The page has 321 tests, 233 before; 2 of f02b's came out.

## 9. Decisions I made (the plan's "(mine)")

1. **The line under the LPs table:** its total waits until every commitment reads, and it has its own wording for no LPs.
2. **A typed name** is trimmed when read, and in the box once it loses the focus.
3. **A file's names are trimmed before the engine reads them,** so a repeat after trimming refuses the file.
4. **The paste's header row:** the first row, whose commitment isn't an amount and which names a column (name, LP, investor, partner, commitment, committed, amount).
5. **A negative pasted commitment:** "… is negative. A commitment is more than zero".
6. **The card's heading:** "Each LP at $X". The leftover row's share is "—" and the total's "100%".
7. **Shares rounded half up** to two places.
8. **The split's line, with LPs,** points to the card.
9. **The CSV:** a header row, CRLF line ends, "Downloaded as …" after it, and X in its name.
10. **The examples keep their labels and opening X.**
11. **The card's header row** sits over its columns, as the split's does; the LPs tab's headers are centered as Cash flows' are.

## 10. Checked on the running page

`fund-page` on port 5174, in the browser pane:
- **At 1,100 pixels,** the clawback example's card: Alder Endowment 70.00%, $14,000,000.00 paid in, $17,675,000.00 to date, $1,925,000.00 of the clawback; Birchwood 30.00%; leftover $0.00 in every column; total $2,750,000.00, the clawback card's figure.
- **At 320 pixels:**
  - **The LPs tab:** each LP a card, a 52-character name typed in.
  - **The card on Payouts:** each LP a group, the long name wrapping over two lines.
  - **Nothing wider than 320 pixels,** on either.
- **No console errors.**

## 11. CI and permissions (hard rule 9)

Nothing in `.github/workflows/` or `.claude/`.

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   I got:
   - **The fund page:** 321 tests, 233 before.
   - **Unchanged:** the fund package's 588, the engine's 3,177 and the main page's 680.
   - **Both references:** passing.
2. **On the page:** `pnpm --filter @spillpoint/fund dev`, then:
   - **"A VC fund with premium carry",** Payouts, the card "Each LP at $40,000,000":

     | LP | Share | Paid in | This distribution | To date |
     |---|---:|---:|---:|---:|
     | Alder Endowment | 50.00% | $5,445,000.00 | $16,396,875.00 | $18,376,875.00 |
     | Birchwood Family Office | 35.00% | $3,811,500.00 | $11,477,812.50 | $12,863,812.50 |
     | Cedar Fund of Funds | 15.00% | $1,633,500.00 | $4,919,062.50 | $5,513,062.50 |
     | Left over from rounding down | — | $0.00 | $0.00 | $0.00 |
     | Total | 100% | $10,890,000.00 | $32,793,750.00 | $36,753,750.00 |

   - **"A late call and a clawback":** the card has "Share of the clawback", $1,925,000.00 and $825,000.00, totalling the clawback card's $2,750,000.00.
   - **"Open a file":** pick `packages/fund/cases/fund-18-lps-thirds/inputs.json`, then type 2000000 as X.
     - **The card:** $666,666.66 for each LP, $0.02 left over, $2,000,000.00 in all.
     - **"Download as CSV"** saves the file in §6.
   - **The LPs tab:**
     - **Add an LP** and type a name and "2M": the line and the card follow.
     - **Type a name an LP above has:** "An LP above already has this name; each LP needs its own." under it.
     - **Paste two rows** from a spreadsheet.
   - **At 320 pixels:** the LPs tab and the card, with nothing off the screen.
3. **Nothing outside the page moved:**

   ```bash
   git diff --stat main -- packages apps/dashboard cases reference
   ```

   It prints nothing.

## Open questions

1. **The examples' labels:** unchanged, though the two now have LPs. Would you rather they say so, as "A VC fund with premium carry and three LPs: …"?
2. **The paste's header words** (§9, 4). Are there others your GPs' sheets use, "Limited partner", say?
3. **"Its list of LPs isn't a value it can take."** It's the one wording off your pattern, for grammar. Fine?
4. **Screenshots:** I checked the page in the browser pane rather than adding LP shots to `scripts/screenshots.mjs`. Want them added, for the release step?
5. **For f02d, as you said:**
   - the README's worked example
   - the release note's line for TypeScript code that builds a `Fund` by hand
   - the integer-key edge recorded under FA2 and FA18 with f02b's table
