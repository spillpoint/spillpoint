# Review: 10g (0.7's missing participation column, the Carta line, and the release note)

Branch `10g-ocx-07-participation`, from main at `8e12297` (#136 merged, CI green). One commit. Nothing under `cases/`, `reference/`, `apps/` or `packages/fund/` changed.

## 1. 0.7 gets 10f's rule (your item 1)

**`ocx-terms.ts`:** the list of the two columns now lives beside `readRound`, as `PARTICIPATION`. A new `missingParticipation(header, draft)` gives the columns a Financing History lacks, and adds a `no_participation_column` line for each. Both layouts call it, so the rule is written once.

**`ocx-05.ts` (0.4/0.5):** it calls that instead of its own copy. Nothing it does changes: the same check, the same lines, in the same place.

**`ocx-07.ts` (0.7):** where the workbook has a Financing History, it calls `missingParticipation` after matching the rounds, and passes `readRound` the same flag 0.4/0.5 does.
- **Without either column,** neither is read: each preferred series' participation is blank to fill, and each missing column gets its line.
- **A "Y" with no cap column** no longer reads as uncapped participating.
- **A 0.7 workbook with no Financing History** is unchanged: `no_financing_history`, and no participation line.

**ASSUMPTIONS:**
- **OX7, the 0.7 entry:** now says so, and why. A "Y" with no cap column would be a guess (O1), as it was before 10g. Its status notes 10g.
- **OX14:** unchanged. It's the 0.4/0.5 rule OX7 now points to.

**The README's entry for the note** now covers both layouts: "a workbook whose Financing History has no `Participating (Y/N)` or no `Participation Cap` column … In either layout; a 0.7 workbook with no Financing History gets `no_financing_history` instead."

**The page** needs no change: its line for the note doesn't name a layout.

## 2. What's known about Carta (your item 2)

**The engine README,** under Reading an OCX workbook, in place of "No Carta export has been tested yet…":
> **One Carta export has been tried,** a founder's, in the 0.4/0.5 layout. 0.7.0 refused it because its Financing History had no `Participating (Y/N)` column, which 1.0 reads *(1.0)*, asking each preferred series' participation. Whether the rest of it reads isn't known yet.

**CLAUDE.md's** line under Where things stand says the same: one Carta export has been tried, a founder's, in the 0.4/0.5 layout; 0.7.0 refused it because its Financing History had no Participating (Y/N) column, which 1.0 reads; whether the rest of it reads isn't known yet.

**The root README** said the same thing as those two, "no Carta export has been tested yet", in its line on 0.6.0, so it says the same now too (decision 1).

Nothing more about the export or the founder is anywhere.

## 3. The release note and the READMEs (your item 3)

**`notes/release-1.0.md`** has a new section after "Fixed since 0.7.0": "Reads more since 0.7.0". Its one entry is `readOcx` reading a workbook whose Financing History lacks a participation column (10f, 10g). It has the same parts as the two fixes:
- **What was wrong:**
  - **0.4/0.5** required both columns and refused the Carta export.
  - **0.7** read a "Y" with no cap column as uncapped.
- **Now:** participation is blank to fill, and the new note names each missing column.
- **TypeScript reports:** nothing, since `ImportNote`'s `code` is a string.
- **JavaScript sees:** an import with blanks where `readOcx` threw. In 0.7, participation is blank where it was uncapped participating.
- **What to change:** nothing.
- **Changed answers:** none.

**Both READMEs' "Two behaviors change in 1.0, both fixes"** lines add a sentence: "And `readOcx` reads a workbook whose Financing History lacks a participation column, which 0.7.0 refused". They then point to the release notes, as before.

## 4. Tests

**`packages/engine/test/ocx.test.ts`,** "a 0.7 workbook whose Financing History lacks a participation column". No case has a 0.7 Financing History, so it's built on ocx-02's 0.7 workbook, as OX7's existing test does: a Series Seed round at $1, 1.5x, "Y" with a 2x cap.

- **With both columns:** read as 0.4/0.5 reads them, capped at 2x, with no line and only seniority to fill.
- **Without `Participation Cap`:**
  - the "Y" isn't read as uncapped
  - participation is blank to fill
  - one line, "Participation Cap"
- **Without `Participating (Y/N)`:** one line.
- **Without either:** two lines, in the columns' order.
- **With `Participating (Y/N)` renamed** "Participating": its line, and the `unrecognized_field` line.
- **In each of the four without a column:** the issue price, conversion price and multiple are still read from Financing History; the cap is null; there's no `participation_cap_includes_preference` line; and the blanks to fill are participation, then seniority.
- **ocx-02 as it is,** with no Financing History: no participation line, and its `no_financing_history`.

**On main,** the four without a column fail:
- **Without the cap column,** the engine reads the "Y" as `"participating"`.
- **The other three** fail for want of the line.

**Every other test is unchanged and passes.** That includes 10f's 0.4/0.5 tests, which show 0.4/0.5's behavior didn't move.

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   The counts are in the PR description.
2. **The 0.7 rule,** with your own reader: build a 0.7 workbook with a Financing History, a "Y" in `Participating (Y/N)` and no `Participation Cap` column.
   - **On main:** `readOcx` gives that series `participation: "participating"`.
   - **On this branch:** `null`, to fill, with `{ code: "no_participation_column", subject: "Participation Cap" }`.
3. **Nothing else changed:** `git diff --stat main -- cases reference apps packages/fund` prints nothing.

## Decisions for you to check

1. **The root README's Carta clause** said the same thing as the engine README and CLAUDE.md, so it says the same now: one Carta export tried, refused by 0.7.0 for the missing column, which 1.0 reads, and the rest not yet known. You named the other two.
2. **Where 0.7's line goes:** right after the rounds are matched, after the unrecognized-header lines, since 0.7 adds those first. In 0.4/0.5 it comes before them, as in #136. The page shows the report's lines in order, so in 0.7 an unrecognized "Participating" line comes before the missing-column line.
3. **The release note's entry is numbered 1 in its own section,** not 3, since it isn't a fix.

## Assumptions added or changed

- **OX7:** 0.7's Financing History follows OX14's rule for a missing participation column.
- **No modeling choice changed.**

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **CLAUDE.md** changed (section 2). It's the project's instructions, not `.claude/`.
- **Nothing ran outside the sandbox.**

## Open questions

None.

## Next

I'm stopping here.
