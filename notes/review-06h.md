# Review: 06h (release 0.6.0)

Branch `06h-release-0.6.0`. The cases lock is on, and no case file changed. One commit:
- **the version** in `packages/engine/package.json` is **0.6.0**
- **the release notes,** in `notes/release-0.6.0.md`
- **both READMEs,** with `readOcx` in the engine README's API section and a worked example
- **the README test** counts five worked examples, where it counted four
- **the 0.6.0 plan** marks 06h done

**The packed build is checked** as CLAUDE.md's release checklist says (section 3). **I haven't published, tagged or pushed to main.**

## 1. The release notes

`notes/release-0.6.0.md` has 0.5.0's sections, with one added for the names kept beside their replacements. **Your four items:**
1. **What's new** (under "New" and "On the page"):
   - **`readOcx`,** what it gives and both layouts.
   - **The page opening an .xlsx:** "Open a cap table export" (it was "Open an OCF export"), and the questions. Those are seniority, a series' terms with the two one-click answers, the one-strike question with its stop, a SAFE's kind of cap, and a note's four terms.
   - **"Copy a summary to share,"** where it shows and what it holds.
2. **The layouts, and Carta, said plainly:**
   - **The layouts:** 0.4/0.5, the Coalition's reference workbooks, and 0.7, as one real export lays it out, with its preferred resting on no real export.
   - **Carta:** a paragraph of its own, in bold: "No Carta export has been tested yet." It says Carta's release notes claim OCX, that no Carta workbook has been opened with spillpoint, and that which layout Carta writes isn't known. It points to `pnpm ocx-structure` for anyone who has one.
3. **06a's four breaking changes,** each with a **What to change:**
   - **`Milestone`:** remove the import; nothing replaces it.
   - **`milestone`:** stop reading it, and use `term` and `path`.
   - **The constructor:** drop the second argument. JavaScript's silent garbling is spelled out.
   - **The message ending:** check `term` instead of the text. The 11 refusals are listed.
4. **The names added beside the old ones:** a table of the five pairs.
   - It says the old type names are aliases now, and that `readOcf` still throws an `OcfRefusal`, a subclass.
   - **0.7.0 removes the old names,** and `readOcf` throws `ImportRefusal` itself.
   - **To be ready:** catch `ImportRefusal`, and import the types by their new names.

**The other sections:**
- **Changed answers:** none.
- **New in the API:** `readOcx` and its types, `ImportRefusal` with its `format`, the four import types, and 19 exports, up from 17.
- **Still refused:** OCX's unsupported terms, in plain words, grouped as layouts not read, what spillpoint doesn't model, and what the reader doesn't recognize. Also the page's one-strike stop.
- **How it's tested:**
  - the 12 OCX cases and 64 fixtures
  - the 96 earlier cases unchanged
  - the formula-free reading
  - the SAFE-row reference test
  - your independent reader and its fuzzed workbooks
  - the real export

**Going through the diff since v0.5.0, I found:**
- **An addition:** an `OcfRefusal` now also carries `format: "ocf"`. It's under "New in the API".
- **No further breaking change.**
  - **OCF's type names:** aliases now, the same shapes.
  - **`readOcf`'s import:** its declared type is `CapTableImport`, with the same fields.
  - **Payouts:** no payout rule changed.
  - **Saved files:** still version 6, since `file.ts` is unchanged.
- **A stale line:** the engine README still said "The import that reads them comes later in 0.6.0". It now points to the new section.

## 2. The READMEs

**The engine README:**
- **The intro** names the OCX workbook beside OCF.
- **A new section, "Reading an OCX workbook (0.6.0)",** after OCF's:
  - the credit line
  - the two layouts
  - the Carta paragraph
  - that the engine takes cells and doesn't open an .xlsx, with the page's reader named as in the repository, not the package
  - what an import gives, and what a workbook can leave blank in each layout
  - SAFEs, combined in 0.4/0.5
  - numbers, dates and formula totals
  - refusals and their subjects
- **The worked example** is the OCF example's company, Ana's 8,000,000 common and the Seed Fund's 2,000,000 Seed Preferred at $1.50.
  - **The workbook:** 0.4/0.5's layout, cut to the three tabs and the headers `readOcx` needs.
  - **It prints:** the report, the one blank (seniority), and then, with seniority given, the same payouts at $20M as the OCF example.
  - **The README test** runs it against its Output block, like the other four.
- **"What it covers":** an OCX line beside OCF's.
- **"What it refuses":** both imports refuse with `ImportRefusal`.
- **The API table:** a `readOcx(workbook)` row.
- **The OCX types' line:** points to the new section.

**The root README:**
- **The page:** it opens an OCX workbook, and "Copy a summary to share" says what it copies.
- **The engine:** a 0.6.0 sentence: the OCX workbook, its two layouts, Carta not yet tested, and the refusals' new wording.
- **OCX's credit line,** beside OCF's.
- **"Coming next":** 0.6.0 is gone, and 0.7.0 says it removes the names 0.6.0 kept.
- **The repository list:** `ocf-check` takes an .xlsx too.

## 3. The packed build

**From `packages/engine`, `pnpm pack --dry-run`** lists `spillpoint@0.6.0` and the 71 files below.

**The tarball, `spillpoint-0.6.0.tgz`:**
- **shasum:** `301d5879a00af73135c0bf5c23dfe89ba37fe367`. Two packs from this branch gave the same one.
- **Size:** 147,395 bytes packed, 533,831 bytes unpacked.
- **71 files:** 0.5.0's 51, plus `imports` and the nine `ocx` modules, each with its declarations.
- **Where:** packed into my scratchpad, not the repo. It's deleted after the checks below.

| File | Bytes | | File | Bytes |
|---|---:|---|---|---:|
| `LICENSE` | 11,341 | | `dist/ocf-ledger.js` | 8,273 |
| `README.md` | 47,303 | | `dist/ocf-notes.d.ts` | 415 |
| `package.json` | 1,245 | | `dist/ocf-notes.js` | 681 |
| `dist/breakpoints.d.ts` | 768 | | `dist/ocf-read.d.ts` | 1,979 |
| `dist/breakpoints.js` | 14,828 | | `dist/ocf-read.js` | 4,196 |
| `dist/case.d.ts` | 108 | | `dist/ocf-warrants.d.ts` | 1,751 |
| `dist/case.js` | 1,564 | | `dist/ocf-warrants.js` | 6,759 |
| `dist/dates.d.ts` | 537 | | `dist/ocf.d.ts` | 852 |
| `dist/dates.js` | 1,657 | | `dist/ocf.js` | 21,289 |
| `dist/decimal.d.ts` | 1,263 | | `dist/ocx-05.d.ts` *(new)* | 156 |
| `dist/decimal.js` | 2,763 | | `dist/ocx-05.js` *(new)* | 15,209 |
| `dist/decisions.d.ts` | 4,287 | | `dist/ocx-07.d.ts` *(new)* | 156 |
| `dist/decisions.js` | 39,809 | | `dist/ocx-07.js` *(new)* | 30,299 |
| `dist/dividends.d.ts` | 899 | | `dist/ocx-cells.d.ts` *(new)* | 5,743 |
| `dist/dividends.js` | 1,679 | | `dist/ocx-cells.js` *(new)* | 11,796 |
| `dist/errors.d.ts` | 2,381 | | `dist/ocx-headers.d.ts` *(new)* | 381 |
| `dist/errors.js` | 2,583 | | `dist/ocx-headers.js` *(new)* | 6,729 |
| `dist/imports.d.ts` *(new)* | 1,305 | | `dist/ocx-import.d.ts` *(new)* | 3,076 |
| `dist/imports.js` *(new)* | 613 | | `dist/ocx-import.js` *(new)* | 7,146 |
| `dist/index.d.ts` | 1,487 | | `dist/ocx-notes.d.ts` *(new)* | 469 |
| `dist/index.js` | 1,845 | | `dist/ocx-notes.js` *(new)* | 707 |
| `dist/input.d.ts` | 2,509 | | `dist/ocx-reader.d.ts` *(new)* | 388 |
| `dist/input.js` | 31,158 | | `dist/ocx-reader.js` *(new)* | 2,756 |
| `dist/lines.d.ts` | 2,531 | | `dist/ocx-terms.d.ts` *(new)* | 2,867 |
| `dist/lines.js` | 12,666 | | `dist/ocx-terms.js` *(new)* | 12,051 |
| `dist/model.d.ts` | 7,996 | | `dist/ocx.d.ts` *(new)* | 1,299 |
| `dist/model.js` | 239 | | `dist/ocx.js` *(new)* | 613 |
| `dist/ocf-book.d.ts` | 1,968 | | `dist/payments.d.ts` | 1,207 |
| `dist/ocf-book.js` | 4,324 | | `dist/payments.js` | 2,323 |
| `dist/ocf-classes.d.ts` | 1,905 | | `dist/reasons.d.ts` | 1,145 |
| `dist/ocf-classes.js` | 8,469 | | `dist/reasons.js` | 31,672 |
| `dist/ocf-convertibles.d.ts` | 1,576 | | `dist/rounds.d.ts` | 7,288 |
| `dist/ocf-convertibles.js` | 12,779 | | `dist/rounds.js` | 60,359 |
| `dist/ocf-grants.d.ts` | 2,029 | | `dist/waterfall.d.ts` | 10,584 |
| `dist/ocf-grants.js` | 10,961 | | `dist/waterfall.js` | 28,638 |
| `dist/ocf-ledger.d.ts` | 1,204 | | | |

`dist/imports.js` and `dist/ocx.js` hold only comments, since their modules export only types.

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   I got:
   - 2,759 engine tests, one more than main's 2,758: the README's `readOcx` example
   - 654 page tests
   - the reference's 73 unit tests
   - all 83 exit and round cases matching the reference
2. **See what would be published.** From `packages/engine`:

   ```bash
   pnpm pack --dry-run
   ```

   It should list `spillpoint@0.6.0` and 71 files. For the shasum, run `pnpm pack`, then `shasum spillpoint-0.6.0.tgz`, then delete the tarball. It should be `301d5879a00af73135c0bf5c23dfe89ba37fe367`.
3. **What I checked as a user would.** I unpacked the tarball into a throwaway project outside the repo, with decimal.js linked from the copy already installed here, so nothing was downloaded.
   - **The README's five examples,** taken from the packed README, each printed exactly its Output block from the built `dist/`. That includes the new `readOcx` example.
   - **The exports:** the 19 the API test pins.
   - **A TypeScript file typechecked** under Node's own module resolution (`nodenext`), against the package's declarations. It uses:
     - `readOcx` with `OcxWorkbook`, `OcxSheet` and `OcxCell`
     - `CapTableImport` and its parts by their new names
     - catching `ImportRefusal` and reading its `format`
     - the old names `OcfImport`, `OcfReport`, `OcfToFill` and `OcfNote` as the same types
     - an `OcfRefusal` assigned to an `ImportRefusal`
     - `UnsupportedTermError(term, path, what)`

     It also checks, as expected errors, that `Milestone` no longer imports and `milestone` is no longer there.
   - **The release's cases on the packed build:**
     - **The workbook cases:** all 9 import to their `expected.json` results, notes as a set.
     - **The fixtures:** all 64 are refused by name or read to their own results, each fixture's changes applied by a plain-JS copy of the test helper.
     - **The six locked cases written as OCX,** with their blanks answered, pay as their locked cap tables do on the packed build:

       | Case | Locked case | Lines | Worst line | Breakpoints | Worst breakpoint |
       |---|---|---:|---:|---:|---:|
       | ocx-07 | edge-04 | 36 | exact | 3 | exact |
       | ocx-08 | edge-05a | 36 | exact | 4 | 1.6e-22 |
       | ocx-09 | edge-07 | 48 | exact | 3 | 3.3e-22 |
       | ocx-10 | edge-08 | 32 | exact | 3 | 2.5e-22 |
       | ocx-11 | edge-12b | 32 | exact | 2 | 1.2e-23 |
       | ocx-12 | Millrace | 285 | 3.66e-8 | 10 | 3.94e-7 |

       Against the locked `expected.json` values, which are written to the cent, every line is within half a cent.
4. **On the page:**
   - **Start it** with `pnpm dev`. The footer should say "spillpoint 0.6.0".
   - **Click "Open a cap table export"** and pick `apps/dashboard/test/fixtures/hollis-mill-saved.xlsx`. The report shows first, named "hollis-mill-saved".
   - **Then the questions:**
     - seniority, unset
     - "Do all the options in "Common Stock Options" have the same strike?", and the same for "Non-Plan Awards" and "Warrants for Common Stock", each strike asked only after "Yes"
     - the note's four terms
   - **"Copy a summary to share"** is on the report.
5. **Publishing and tagging are yours.** From `packages/engine`, run `pnpm publish`. Its `prepublishOnly` step builds and tests first.

## Decisions for you to check

1. **The app behind 0.7's layout isn't named** in the READMEs or the release notes. They say "one real export … from a cap table app other than Carta". ASSUMPTIONS OX4 names it, as it has since 06d. I left it out of the user-facing text, given your no-outreach rule, but it's your call.
2. **The README example is cut to the minimum,** three tabs with only the headers `readOcx` needs, not a full workbook. It's a real 0.4/0.5 layout, but no export would be this bare. The text says so: "cut to the tabs and headers the reader needs".
3. **The release notes cite your independent reader** and its roughly 17,000 broken workbooks (13,000 at #87, 4,000 more after) under "How it's tested". Say if you'd rather they didn't.
4. **"Changed answers: None."** No payout rule changed, and every locked case gives the same answer.

## Open questions

1. **CLAUDE.md's "Where things stand"** still says "Released through 0.5.0". I left it, since it's true until you publish. It could change in 07b's first commit, or I can add it here if you'd rather it went in with the release.

## Assumptions added or changed

None: no modeling choice changed.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing ran outside the sandbox.** CI's commands ran with `pnpm install --offline`, and the throwaway project linked the installed decimal.js. Nothing was downloaded.

## After your review (Jordan, after #89)

**Your pre-publish checks pass:**
- your own pack gives the shasum above, with 71 files
- against 0.5.0 from npm, only the 20 new files are added, and `package.json` changes only its version
- the README's five examples print their Output blocks from the packed package
- the old and new names typecheck as the notes say
- every claim about 0.5.0 in the breaking changes holds against 0.5.0 from npm
- the engine suite passes against the packed dist
- the packed engine matches your calculator on 54 fuzzed tables and 1,500 more fuzzed OCX workbooks

**Decisions 1, 2 and 4 are agreed.** Decision 3 is settled by your wording below.

**The fix, in `notes/release-0.6.0.md`.** The independent-reader bullet said it agreed with `readOcx` on about 17,000 broken workbooks, which isn't what happened. It now reads, in your words: "An independent reader, written from the rules alone, agrees with readOcx on every case and fixture. Run against about 20,000 randomly broken workbooks, it found five places where readOcx strayed from the rules; each was fixed before this release, and none has turned up since."

**Nothing under `packages/` changed,** so the tarball is still `301d5879a00af73135c0bf5c23dfe89ba37fe367`.

**For 07b:** CLAUDE.md's "Released through" line moves to 0.6.0 in its first commit (open question 1).

## Next

0.6.0 is ready for you to publish and tag. After it come 07b to 07e, the naming review. I'm stopping here.
