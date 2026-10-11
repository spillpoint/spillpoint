# Review: 10a (payouts as they'd be paid)

Branch `10a-payouts-as-paid`, from main. A page change only: nothing under `packages/` or `cases/` changed. One commit.

## 1. The rule (ASSUMPTIONS P1)

**What it is:** every payment the page shows to the cent is the engine's exact amount for that holder and security, rounded down to the cent. A holder's total and a class's total are the sums of their rounded payments.

**`apps/dashboard/src/paid.ts`** does it:
- **`paidCents`** rounds one payment down.
- **`paid`** rounds a payout's lines and sums them by holder and by class.
- **`leftOver`** gives the exit value, as the table's total shows it, less every rounded payment.

**What it covers:**
- **The who-gets-what table,** by holder and by class.
- **"You get":** the headline and the summary read aloud are the short form of your rounded total.
- **"For you: your payout jumps $X here, from $A to $B":** $A and $B are what you'd be paid on each side, so $X is their difference. The analysis now carries each point's rounded holder totals, `paidHolders`, for this. The curves and the rates per $1M stay exact.
- **A payment schedule's takes:** each holder's take for each class is rounded down. A holder's take is the sum of those, and "In all" the sum of a holder's takes, so a row adds up exactly. "Gives back" uses the same amounts.

**The leftover:**
- **The row:** the cents left over get a row of their own, "Left over from rounding down", last before the total, in muted text. Its share of the company is "—". The column then adds up to exactly the exit value.
- **The line:** one line under the table replaces the old rounding footnote: "Each payment is rounded down to the cent, as payments usually are; the N cents left over aren't paid to any holder." With 1 cent it reads "the 1 cent left over isn't paid to any holder".
- **When nothing is left over,** neither shows.

**Unchanged:**
- the engine, its `toCents`, the cases and the README
- the charts and the rates per $1M
- breakpoint exit values
- prices per share
- amounts that aren't payments, such as accrued dividends, preferences and claims, which stay half-up

**ASSUMPTIONS:** a new section, "The page", holds P1. `format.ts`'s header comment no longer says the page rounds as `toCents` does; it says which amounts are payments, rounded down, and which stay half-up.

**Millrace at its default view, $100M:**
- 15 payments, and 6 cents left over: "the 6 cents left over aren't paid to any holder".
- Ana's row is $9,750,989.66, where half-up gave $9,750,989.67.

## 2. Tests

**New or rewritten, in `test/cents.test.tsx`:**
- **Millrace at its default view:**
  - each holder's row is the sum of their payments rounded down
  - the leftover row is last before the total, with the line under the table
  - the column adds up to $100,000,000.00, by holder and by class
- **A payment that rounded up before now rounds down:** Ana's exact $9,750,989.669… was $9,750,989.67 half-up, and is $9,750,989.66.
- **Neither the row nor the line when nothing is left over:** Millrace at $15M, where every payment comes to whole cents.
- **At every exit value the cases list,** 300 and more, breakpoints at their exact values included:
  - the rounded payments plus the leftover equal the exit value exactly
  - the leftover is under one cent per payment and never negative
  - the leftover as the table shows it brings the column to the exit value to the cent
- **A payment schedule's takes:** Millrace with payments of $62,400,001 and $7,600,003. Each cell is the holder's takes rounded down, and "In all" their sum. At least one take has a fraction of a cent to round. The footnote is checked too.

**Tests that pinned a half-up payment, updated:**

| Test | What changed |
|---|---|
| `test/app.test.tsx`: "shows who gets what by holder, with you marked, and by class" | Ana's row is "$9,750,989.66", was "$9,750,989.67". |
| `test/cents.test.tsx`: "shows each payout and the total to the cent, as the engine's toCents rounds them" | Replaced by the default-view test above. |
| `test/cents.test.tsx`: "says so, quietly, when the rounded payouts don't add up to the exit value" | Replaced by the row-and-line test. |
| `test/cents.test.tsx`: "says nothing when they do" | Replaced by "shows neither the row nor the line when nothing is left over". |
| `test/editor.test.tsx`: "pays every holder what the case expects, at every listed exit value" (case 6b) | See below. |
| `test/editor.test.tsx`: case 12's SAFE, case 13a's note (M5k) | See below. |
| `test/editor.test.tsx`: case 9's dividends, case 8's warrant (M5k2) | See below. |
| `test/editor.test.tsx`: "takes case 10b's carve-out, typed in, and pays what the case expects, curve and all" | See below. |

**How the editor tests changed:** each compared a typed-in company's rows with the case's half-up totals. Now each row must equal what the case's own exact payments round down to, from `test/payouts.ts`'s new `paidOnCase`. It must also be within a cent per payment below the case's half-up total, and never above it (`nearCaseTotal`). In two of the four places, `name` would have compiled as the browser's global `window.name`, so those name their case explicitly.

**Also touched:** `test/curves.test.ts`'s hand-made curve points get the new `paidHolders` field. That's a type change; nothing it checks changed.

**Checked, and unchanged:**
- **`breakpoint-list.test.tsx`'s jump test** passes its amounts straight to the line, so it doesn't depend on rounding.
- **The earnout tests in `exit-terms.test.tsx`** pay whole dollars, which round down to themselves.

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   I got:
   - all 3,115 engine tests, unchanged
   - 672 page tests: 670 before, less the 3 old rounding tests, plus the 5 new ones
   - the reference's 73 unit tests
   - all 83 cases matching the reference
2. **On the page,** with `pnpm dev`, Millrace at $100M:
   - **The table:** Ana's row reads $9,750,989.66. Under the holders, a muted row reads "Left over from rounding down $0.06". The line under the table reads "Each payment is rounded down to the cent, as payments usually are; the 6 cents left over aren't paid to any holder."
   - **By class:** the same row, and the column adds up to $100,000,000.00.
   - **Nothing left over:** at $15M there's no leftover row and no line.
3. **Unchanged:** `git diff --stat main -- packages cases` prints nothing.

## Decisions for you to check

1. **The step's name:** "10a", for the release this ships in. Steps are named for the next release, and 0.7.0 is out.
2. **The leftover is the exit value as the table's total shows it, to the cent, less the payments.** So the displayed column always adds up. Only at an exact breakpoint, whose exit value has a fraction of a cent, is the shown leftover off from the exact one, by that rounding.
3. **A hair under a cent counts as the cent:** an amount within 10⁻²⁰ below a whole cent, a trace of 40-digit arithmetic, rounds to that cent rather than the one below.
4. **A negative take rounds down too,** toward more given back, so no one keeps more than their share.
5. **A jump's size is the difference of the rounded amounts on each side,** not the exact jump rounded.
6. **The leftover row's style and shares:** muted text, its share of the proceeds shown, and "—" for its share of the company.
7. **The schedule footnote, in my words:** "Each take is rounded down to the cent, as payments usually are, so a row's takes add up to its total; the cents left over aren't paid to any holder." You gave the table's line; the schedule had a footnote that's no longer true. The schedule table has no leftover row: its column headers give each payment in whole dollars.

## Assumptions added or changed

- **P1** (new), in a new section, "The page".
- **No engine modeling choice changed.**

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing ran outside the sandbox.**

## Next

I'm stopping here.
