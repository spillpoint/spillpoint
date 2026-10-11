# Review: 07e (release 0.7.0)

Branch `07e-release-0.7.0`. The cases lock is on, and no case file changed. One commit:
- **the version** in `packages/engine/package.json` is **0.7.0**
- **the release notes,** in `notes/release-0.7.0.md`
- **both READMEs**
- **CLAUDE.md's "Where things stand":** released through 0.7.0; next 1.0
- **the 0.7.0 plan** marks 07e done

The packed build is checked as the release checklist says (section 4). **I haven't published, tagged or pushed to main.**

## 1. First: the page's saved files are affected

You asked the notes to say plainly that the page's saved files are unaffected. I checked before writing it, and some aren't, so the notes say which.

**What happens:** a file whose rounds name a series from SAFEs in a round's seniority doesn't open on today's page. A scratch test opened 0.6.0's Millrace, saved from the page, and got: "Couldn't open saved.json. Its rounds can't be built. inputs.events[5].seniority: seed_shadow is not a preferred series." The engine gives the same error on 0.6.0's Millrace events.

**Which files:**
- **Any file saved from the Millrace example.** In every release so far, its Seed, Series A and Series B list `seed_shadow` in their seniority, and the page saves the example's events as they are.
- **Any company with a priced round added after one that converted SAFEs.** A new round's seniority starts as the cap table before it, series from SAFEs included (`roundsDraft.ts`'s `addEvent`). So the page wrote `<series>_shadow` into it before 07b, and writes `_safes` now.
- **Unaffected:** a file with a cap table and no rounds, or with rounds that convert no SAFEs. A series from notes is `_notes`, as before.

**It's live already.** `pages.yml` deploys main on every push, so this has been on spillpoint.github.io since #90 merged, whatever happens to the npm release.

**The plan's item 15 got this wrong.** It said the page's saved files don't name these ids, since its seniority leaves them out (R28). R28 lets a round leave them out; the page doesn't.

**The fix I'd propose,** as 07d2, before you publish:
- **A file migration:** a version 6 file becomes version 7.
- **Each priced round's `seniority`:** an id `<series>_shadow` or `<series>_shadow_<n>`, where `<series>` is the id of that round's series or an earlier round's, becomes `<series>_safes` or `<series>_safes_<n>`.
- **Nothing else changes.** Ids in a starting cap table are the table's own, so they stay as written.
- **Saving writes version 7.**
- **Tests:** 0.6.0's Millrace file, and a company of its own with a SAFE converted at a seed and a later round, each open and pay as before.

**What it changes in this PR's notes:** the release notes' "The page's saved files" paragraph says what's true today. If 07d2 lands first, it becomes one line: files saved before 0.7.0 open as before, and a series from SAFEs is renamed as it opens. Say which you'd like, and whether 07d2 goes before this PR merges.

## 2. The release notes

**The title I'd propose:** "spillpoint 0.7.0: names settled for 1.0". Other forms if you'd rather: "the API settled" or "the last break before 1.0".

**`notes/release-0.7.0.md` covers what you listed:**
- **What 0.7.0 is:** the naming review, the last release that breaks anything before 1.0, and "Changed answers: None".
- **What 0.7.0 kept, and why:** item 2's snake_case import results, the `start` event and `issue_order` (item 5), and the optional fields (item 14).
- **"Changes that can break 0.6.0 code", item by item:**
  - **07b's two first:** generated class names write a strike to the cent (item 1), and `<series>_safes` (item 15), with the error an input naming `_shadow` now gets.
  - **Then 07c's eight:** items 3, 4, 7, 8, 9, 10, 11 and 12, each with what changed, what TypeScript reports, what JavaScript sees, and what to change.
  - **Then the exports,** 19 to 18, with the six types gone, and the page's saved files (section 1).
- **No break, and new:** `parseExact`'s optional path. The README's "Stable from 1.0" lists, with their counts, what they promise, and how a test holds them. And the decimal.js paragraph.
- **On the page:** the pro-rata label, strikes to the cent on the Rounds tab and in the OCF report, and the class names.
- **How it's tested:**
  - the cases unchanged
  - 07b's byte-identical substitution and the reference's rebuild
  - your independent checks, in your figures: the 40-digit comparison of 07c with the code just before it, 07d's byte-identical results, your calculator's 54 fuzzed tables, and the old and new code under `nodenext`
  - the shapes test and the stable-names test
- **Still refused:** unchanged from 0.6.0.

**One wording to check:** "Changed answers: None" says the amounts, breakpoints and reasons are as in 0.6.0. The only differences are names, including the `_safes` id in a reason's `subject`, which lists ids.

## 3. The READMEs, and CLAUDE.md

**The root README:**
- **The engine paragraph** adds 0.7.0: its names are settled, what it hands back holds only what its types list, and it's the last release that can break earlier code.
- **"Coming next"** is now 1.0 alone: the same API at its own domain, waiting on an outside waterfall that matches spillpoint's, and a few outside users.

**The engine README:** a short "The API is settled *(0.7.0)*" paragraph near the top, pointing to "Stable from 1.0". Its 0.7.0 markers came with 07c.

**CLAUDE.md's "Where things stand":**
- released through 0.7.0, the naming review, the last release that breaks anything
- 0.6.0 reads OCX
- next, 1.0: the domain, no API changes, waiting on an outside waterfall that matches ours and a few outside users

## 4. The packed build

**From `packages/engine`, `pnpm pack --dry-run`** lists `spillpoint@0.7.0` and the 73 files below.

**The tarball, `spillpoint-0.7.0.tgz`:**
- **shasum:** `93d801e0e9357c706768ed7c20794a71bf4b4a44`. Two packs from this branch gave the same one.
- **Size:** 157,453 bytes packed, 567,552 bytes unpacked.
- **73 files:** 0.6.0's 71, plus `stable-names` and its declarations, which hold item 17's lists.
- **Where:** packed into my scratchpad, not the repo. It's deleted after the checks.

| File | Bytes | | File | Bytes |
|---|---:|---|---|---:|
| `LICENSE` | 11,341 | | `dist/ocf-notes.d.ts` | 384 |
| `README.md` | 65,264 | | `dist/ocf-notes.js` | 681 |
| `package.json` | 1,245 | | `dist/ocf-read.d.ts` | 2,040 |
| `dist/breakpoints.d.ts` | 771 | | `dist/ocf-read.js` | 4,219 |
| `dist/breakpoints.js` | 14,871 | | `dist/ocf-warrants.d.ts` | 1,751 |
| `dist/case.d.ts` | 108 | | `dist/ocf-warrants.js` | 6,795 |
| `dist/case.js` | 1,564 | | `dist/ocf.d.ts` | 476 |
| `dist/dates.d.ts` | 537 | | `dist/ocf.js` | 21,255 |
| `dist/dates.js` | 1,657 | | `dist/ocx-05.d.ts` | 156 |
| `dist/decimal.d.ts` | 1,873 | | `dist/ocx-05.js` | 15,209 |
| `dist/decimal.js` | 3,424 | | `dist/ocx-07.d.ts` | 156 |
| `dist/decisions.d.ts` | 4,657 | | `dist/ocx-07.js` | 30,318 |
| `dist/decisions.js` | 40,394 | | `dist/ocx-cells.d.ts` | 5,796 |
| `dist/dividends.d.ts` | 899 | | `dist/ocx-cells.js` | 11,796 |
| `dist/dividends.js` | 1,679 | | `dist/ocx-headers.d.ts` | 381 |
| `dist/errors.d.ts` | 2,329 | | `dist/ocx-headers.js` | 6,729 |
| `dist/errors.js` | 2,463 | | `dist/ocx-import.d.ts` | 2,908 |
| `dist/imports.d.ts` | 1,305 | | `dist/ocx-import.js` | 6,895 |
| `dist/imports.js` | 613 | | `dist/ocx-notes.d.ts` | 474 |
| `dist/index.d.ts` | 1,408 | | `dist/ocx-notes.js` | 633 |
| `dist/index.js` | 1,833 | | `dist/ocx-reader.d.ts` | 388 |
| `dist/input.d.ts` | 2,509 | | `dist/ocx-reader.js` | 2,756 |
| `dist/input.js` | 31,081 | | `dist/ocx-terms.d.ts` | 2,867 |
| `dist/lines.d.ts` | 2,535 | | `dist/ocx-terms.js` | 12,051 |
| `dist/lines.js` | 12,666 | | `dist/ocx.d.ts` | 1,299 |
| `dist/model.d.ts` | 8,149 | | `dist/ocx.js` | 613 |
| `dist/model.js` | 239 | | `dist/payments.d.ts` | 1,207 |
| `dist/ocf-book.d.ts` | 1,968 | | `dist/payments.js` | 2,300 |
| `dist/ocf-book.js` | 4,324 | | `dist/reasons.d.ts` | 996 |
| `dist/ocf-classes.d.ts` | 1,905 | | `dist/reasons.js` | 31,672 |
| `dist/ocf-classes.js` | 8,469 | | `dist/rounds.d.ts` | 7,752 |
| `dist/ocf-convertibles.d.ts` | 1,576 | | `dist/rounds.js` | 60,375 |
| `dist/ocf-convertibles.js` | 12,779 | | `dist/stable-names.d.ts` *(new)* | 4,436 |
| `dist/ocf-grants.d.ts` | 2,029 | | `dist/stable-names.js` *(new)* | 5,347 |
| `dist/ocf-grants.js` | 10,991 | | `dist/waterfall.d.ts` | 12,945 |
| `dist/ocf-ledger.d.ts` | 1,204 | | `dist/waterfall.js` | 30,564 |
| `dist/ocf-ledger.js` | 8,273 | |  |  |

**What I checked as a user would:** I unpacked the tarball into a throwaway project outside the repo, with decimal.js linked from the copy already installed here, so nothing was downloaded.
- **The README's five examples,** from the packed README, each print exactly their Output block.
- **The exports:** the 18 the API test pins.
- **0.7.0-style TypeScript typechecks clean** under `nodenext`, against the package's declarations. It uses:
  - `solve`'s two arguments and the one-answer `Solution`
  - `classTotals` and a prepared table's two fields
  - a built table's `capTable.unconvertedSafes` and an anti-dilution piece's `kind` and `id`
  - `ImportRefusal`, `CapTableImport` and its parts
  - `parseExact` with one argument
  - `ReasonCode`
- **0.6.0-style TypeScript fails** with each error the release notes list, the 6 TS2305s, the TS2554, the TS2339s and the TS2551 among them.
- **The OCX cases on the packed build:**
  - all 9 workbook cases and 64 fixtures read to their expected results
  - the six locked cases written as OCX pay as their locked tables do: the edge cases exactly, Millrace within 3.66e-8 on a line
- **The names:**
  - every one of the 191 tables the round cases build matches the ids and names its `expected.json` records, 441 classes, with no `_shadow` id
  - the strikes the round cases and the imports name are 0.05, 0.08, 0.10, 0.11, 0.25, 0.42, 0.50, 1.00, 3.00 and 5.00

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   I got:
   - 3,115 engine tests
   - 658 page tests
   - the reference's 73 unit tests
   - all 83 exit and round cases matching the reference
2. **See what would be published.** From `packages/engine`:

   ```bash
   pnpm pack --dry-run
   ```

   It should list `spillpoint@0.7.0` and 73 files. For the shasum, run `pnpm pack`, then `shasum spillpoint-0.7.0.tgz`, then delete the tarball. It should be `93d801e0e9357c706768ed7c20794a71bf4b4a44`.
3. **The saved-file break,** on the built page: open a file saved from 0.6.0's Millrace example, or `git show v0.6.0:cases/millrace/inputs.json` wrapped as a version 6 file. It says its rounds can't be built, naming `seed_shadow`.
4. **Publishing and tagging are yours.** From `packages/engine`, run `pnpm publish`. Its `prepublishOnly` step builds and tests first.

## Decisions for you to check

1. **The saved-file paragraph** says which files are affected, not that none are (section 1). Decide whether 07d2's migration comes before you publish.
2. **The title:** "spillpoint 0.7.0: names settled for 1.0".
3. **Your independent checks are cited in your figures,** with the 07c comparison described as against the code just before it, which already had 07b's names, not against 0.6.0.

## Assumptions added or changed

None: no modeling choice changed.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing ran outside the sandbox.**

## Next

0.7.0 is ready for you to publish and tag, once you've decided on section 1. After it, 1.0. I'm stopping here.
