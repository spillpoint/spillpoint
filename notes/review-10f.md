# Review: 10f (a Carta OCX export without "Participating (Y/N)")

Branch `10f-ocx-without-participating`, from main at `c1c3bd7` (f06d; no PR was open). One commit.
- **Changed:** the engine's OCX reader, its README and stable list, the page's OCX report, ASSUMPTIONS OX14, and their tests.
- **Unchanged:** nothing under `cases/`, `reference/` or `packages/fund/`.

## 0. Nothing locked expected this refusal

Before changing anything, I searched for any locked case or fixture that expects it. None does.
- **The search:** every case's `expected.json` for `missing_header`, and every fixture for the two headers.
- **What it found:** the only `missing_header` refusal is `ocx-03-refused`'s `missing-header.json`, a 0.7 ledger header, "Common Stock Ledger: No. Shares Outstanding".
- **The participation fixtures:** the ones that touch these columns, `cap-below-preference` and two in `ocx-05-reads`, change a cell, never a header.
- **No engine or page test** pinned the refusal either.

## 1. What changed

**`read05`** (`packages/engine/src/ocx-05.ts`):
- **Not required any more:** `Participating (Y/N)` and `Participation Cap`. Every other header it needed still is: Round through Liquidation Multiple, and Stock Plan Details'.
- **A missing column gets a line:** `no_participation_column`, with the missing header as its subject.
- **The comment** at the list says why: the first real Carta export had every header but `Participating (Y/N)`.

**`readRound`** (`ocx-terms.ts`):
- **A new last parameter, `participationRead`,** true unless `read05` says a column is missing.
- **Without both columns, it reads neither:** each preferred class's participation is null, so it's a term to fill (O1), and no cap is read.

**The stable list:**
- `no_participation_column` is in `stable-names.ts`'s `IMPORT_NOTE_CODES`, and in the README's "Stable from 1.0" list: "a 0.4/0.5 workbook whose Financing History has no `Participating (Y/N)` or no `Participation Cap` column, the one missing as its subject, so each preferred series' participation is blank to fill". It's marked *(OCX)* *(1.0)*.
- The drift test, which checks the README against the list, passes.

**A header that isn't OCX's** (your item 3) is still an `unrecognized_field` line, as before. "Participating" in place of `Participating (Y/N)` gives both lines: the missing column, and the unrecognized one.

**The page** (`apps/dashboard/src/ocxImport.ts`): the new note gets its own line in the import's review, never the bare code.
- **With preferred stock:** "The workbook's Financing History has no "Participating (Y/N)" column, so whether each preferred series participates is asked for below."
- **With none:** "… column. It has no preferred stock, so nothing depends on it."

The question itself is the one any blank participation already gets: "Does Series A Preferred participate?", with its "1x, non-participating" shortcut.

**The summary to share** says so without a change:
- **Its Notes line** counts the new code: `no_participation_column 1`.
- **Its workbook structure** lists the missing header under Context's "not found".

Neither prints anything from the workbook but the format's own names.

**ASSUMPTIONS OX14** (your item 5):
- **The header list** drops the two.
- **New: "Without a participation column"**:
  - **Why:** the first real Carta export, a founder's 0.4/0.5 workbook, had every other header but no `Participating (Y/N)`, and whether Carta renames or leaves out the column isn't known.
  - **The rule:** without either column, neither is read, and each preferred class's participation is blank to fill, never guessed. A `no_participation_column` line names each missing column. A header in its place that isn't OCX's is `unrecognized_field`.
  - **Before 10f:** either missing was `missing_header`.
- **The status** notes 10f.

## 2. Tests (your item 4)

**Engine, `test/ocx.test.ts`, "a 0.4/0.5 workbook without a participation column":**
- **Hollis Mill without `Participating (Y/N)`** (column H cleared, header and both rounds), **without `Participation Cap`** (column I), and **with `Participating (Y/N)` renamed** "Participating". Each import equals Hollis Mill's own expected result, with these changes:
  - both preferred classes' participation and cap null
  - their two participation blanks first in `to_fill`
  - a `no_participation_column` line naming the column
  - no `participation_cap_includes_preference` line, since the cap isn't read
  - for the renamed one, its `unrecognized_field` line too
- **A 0.4/0.5 workbook with no preferred stock**, two founders' common:
  - **With both columns:** it reads with nothing to fill and no line.
  - **Without `Participating (Y/N)`:** one line.
  - **Without either:** two lines.

**On main,** all four fail: the three Hollis Mill variants and the no-preferred one are refused with `missing_header`, "Context: Participating (Y/N): the tab has no "Participating (Y/N)" header", the founder's refusal, or "Participation Cap" for the second.

**Page, `test/ocx-import.test.tsx`, "Hollis Mill without a participation column (10f)":** the same three variants, each written as an .xlsx and opened on the page.
- **The review shows the line,** naming the column.
- **It asks** "Does Series Seed Preferred participate?" and "Does Series A Preferred participate?", with nothing preset.
- **Answered,** with Seed non-participating and Series A participating with a cap of 3, plus the other blanks as Hollis Mill's own page test answers them, the import opens. Saved, its two preferred classes are what the workbook with both columns reads: Seed non-participating, Series A capped at 3x.
- **Plus a check of the no-preferred line.**

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   **Install, typecheck and build passed. The tests all pass, but only with longer timeouts here.** This machine was very busy while I ran them, with load averages from 20 to 170, mostly from other processes. So with Vitest's usual timeouts some heavy tests timed out, different ones each run:
   - **Engine:** case 27's RSU test, Larkspur's timing test, edge-13j's breakpoint shapes and random-1-185's two answers.
   - **Page:** the Quillfern imports and add-a-round tests, the slider's marks, and starting over in the editor. One of these was a wait for the import review, the same slowness.

   None of them touches OCX's participation columns.
   - **With longer timeouts** (`vitest run --testTimeout=120000` in each package, one at a time):
     - **Engine:** all 3,181 tests pass, 3,177 before plus the 4 here.
     - **Page:** all 684 pass, 680 before plus the 4 here.
     - **Fund:** 2,115 pass with 13 skipped, and its page's 827. This step doesn't touch the fund.
   - **The reference:** 73 unit tests, and all 83 cases matching it.
   - **The fund reference:** 125 unit tests, and its 41 cases.
   - **GitHub's CI** is the clean run with the usual timeouts. If case 27 times out there, I'll rerun it and tell you.
2. **The founder's Carta export, on this branch:** `pnpm dev`, then "Open a cap table export" with the .xlsx.
   - **What should happen:** it should get past the header. If its preferred classes have rounds, the review says Financing History has no "Participating (Y/N)" column and asks each series' participation.
   - **If it's refused further on:** "Copy a summary to share" gives the code and counts, and nothing from the workbook. I haven't seen the export, and nothing from it is in the repository.
3. **Nothing else changed:** `git diff --stat main -- cases reference packages/fund` prints nothing.

## Decisions for you to check

1. **Without the cap column, an "N" isn't read either:** every preferred class's participation is blank, as your test asks.
   - **The cost:** an "N" alone would say non-participating whatever the cap.
   - **Why both stay unread:** reading the Y/N column without its cap would read a "Y" as uncapped. That's what a blank cap cell means today, and with no column it could be a guess. Hollis Mill's Series A, capped at 3x, would have read as uncapped participating.
   - **Each class is one click:** the "1x, non-participating" shortcut.
2. **The note's name is `no_participation_column`,** like `no_financing_history`, where the export lacks something the layout has. The `no_…_field` codes mean the format itself has no field. Its subject is the header, as you asked.
3. **The note comes even with no preferred stock,** so the summary to share still shows how the export is laid out. The page's line then says nothing depends on it.
4. **Where the line goes:** it's added with the other header lines, after the rounds are matched. The page shows it with the report's other lines.

## Assumptions added or changed

- **OX14:** the two headers aren't required, and why (section 1).
- **No modeling choice changed.** Nothing is guessed: what was refused is now asked.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing ran outside the sandbox.**

## Open questions

1. **0.7 has the same gap.**
   - **What it does today:** 0.7's Financing History needs only `Round`, and reads participation through the same `readRound`. A missing Y/N column already reads as blank. But with the Y/N column and no `Participation Cap`, a "Y" reads as uncapped participating, the guess this step avoids for 0.4/0.5.
   - **Why I left it:** you scoped this to `read05`.
   - **The fix:** shall 0.7 get the same rule? It's one argument to `readRound`, and no case covers it today.
2. **The engine README still says "No Carta export has been tested yet."** One has been tried now. Once you've run the founder's export on this branch, shall I change that paragraph, and CLAUDE.md's "no Carta export has been tested yet", to say what it showed? For example: Carta writes the 0.4/0.5 layout, without `Participating (Y/N)`.
3. **The release note:** `notes/release-1.0.md` has no entry for this. `readOcx` now reads workbooks it refused, with a new stable code. Shall it get one, under a heading for what's new rather than "Fixed since 0.7.0"?

## Next

I'm stopping here.
