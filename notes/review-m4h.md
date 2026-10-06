# Review: M4h (release prep: spillpoint 0.1.0)

Branch `m4h-release-prep`. With it, the `spillpoint` package is ready for you to publish as **0.1.0**. There's no new engine behavior. It changes the README, the version, and one function that becomes public.

## What changed

1. **Version 0.1.0** in `packages/engine/package.json`, as agreed in the M4 plan (item 12).
2. **The engine README** (`packages/engine/README.md`):
   - **A second worked example, "from rounds to an exit":**
     - **The company:** a founder, a 10% pool, a post-money SAFE, and a Series A that converts the SAFE and tops up the pool.
     - **It prints** the cap table after each event, then runs an exit on the table after the Series A: payouts at $20M and $60M, and the three breakpoints with their reasons.
     - **Bullets** explain the numbers.
   - **"What it covers (0.1.0)":** the exit waterfall as before, plus everything the engine builds from events.
   - **"What it refuses",** in three plain lists:
     - **Not settled yet** (milestone `"later"`). The three "Owed before release" items come first and in bold, as common in real rounds and on the project's list to support:
       - **a post-money SAFE with notes or pre-money SAFEs**
       - **SAFEs or notes in a down round**
       - **a pay-to-play round that converts SAFEs or notes**

       Then two more: more than one conversion group, and notes with compound interest or a post-money cap.
     - **Not modeled yet** (`"M5"`): warrants, cumulative dividends, carve-outs, escrow and earnouts, and SAFEs and notes outstanding at a sale.
     - **Refused by design** (`InputError`):
       - pro-rata above the entitlement
       - pro-rata with a SAFE or note left outstanding
       - pro-rata in a pay-to-play round

       Two of these messages say what to enter instead.

     It opens with "Nothing is ever ignored… Don't assume anything below is supported."
   - **"Inputs"** gains the round input format: a table of the seven event types and their fields, and how `readInputs` names the event an exit runs on.
   - **"API"** gains `buildCapTables` and `readInputs`.
   - **"Errors"** says `milestone` is `"M5"` or `"later"`.
3. **`readInputs` is now public.** It was the internal `readCase`, renamed. It reads holders, events and an exit on the cap table after one of the events.

   It's what makes the README's rounds example safe: it refuses an exit on a table with a SAFE or note still outstanding. Calling `prepare` directly on a table from `buildCapTables` would leave them out of the waterfall without a word. The README says so, and says to check `unconvertedSafes` and `unconvertedNotes` first if you go that way. (Decision 1.)
4. **A new test, `test/readme.test.ts`:**
   - **What it does:** runs both README examples against the engine and compares what they print with the README's "Output" blocks, line for line.
   - **Why:** a change to the engine's output now fails CI until the README matches.
   - **Checked:** changing one cent in the README's output makes the test fail.
5. **The root `README.md`'s engine paragraph** adds: "From version 0.1.0 it also builds a cap table from a company's rounds…", and says its README lists what it still refuses.

## How to check it by behavior

1. **Read `packages/engine/README.md`,** above all "A worked example: from rounds to an exit" and "What it refuses". Is anything there you'd expect a reader to misread as supported?
2. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   That's 622 engine tests (3 new: the two README examples and their count), 102 dashboard tests, the 33 reference unit tests, and all 45 cases matching the reference.
3. **See exactly what would be published,** without publishing:

   ```bash
   cd packages/engine && npm pack --dry-run
   ```

   It should list **25 files at version 0.1.0**: `dist/` (now with `case.js` and `rounds.js`), the README, the license and `package.json`.
4. **What I checked as a user would.** I packed the package and installed the tarball in a throwaway project outside the repo:
   - **Both README examples** printed exactly the README's output from the built `dist/`.
   - **A TypeScript file** using `buildCapTables`, `readInputs` and the round types typechecked under Node's own module resolution (`nodenext`).
   - **The package's exports** are the 14 the API test pins.
5. **Publishing is yours.** From `packages/engine`, run `pnpm publish`. Its `prepublishOnly` step builds and tests first. I haven't published, and can't: the deny rules block it.

## What 0.1.0 adds over 0.0.1

For the release notes, if you want them:
- **`buildCapTables`:** a company's cap table after each event. It covers:
  - shares issued, and a percentage issue
  - the option pool and grants
  - priced rounds with pool top-ups
  - post-money and pre-money SAFEs, and convertible notes, each converting at the lower of the cap and discount prices
  - pro-rata entitlements
  - broad-based and narrow-based weighted-average and full-ratchet anti-dilution
  - pay-to-play
- **`readInputs`:** an exit on the cap table after one of those events.
- **The round detail types:** `RoundDetails`, `SafeConversion`, `NoteConversion`, `ProRata`, `AntiDilutionAdjustment` and `PayToPlay`.
- **One type narrows:** `Milestone` is now `"M5" | "later"`. In 0.0.1 only the internal case reader ever refused with `"M4"`, so no public function did. Code that compares a milestone with `"M4"` would no longer typecheck. Nothing else a 0.0.1 user relied on changes.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`. The new README test runs in the existing `test` job.
- **No changes** to `cases/`.

## Assumptions added

None.

## Decisions I made, for you to check

1. **Making `readInputs` public.** In M2 the case reader stayed internal on purpose. I've made it public because a rounds example that ends in `prepare(buildCapTables(...).at(-1).capTable)` would silently drop any SAFE or note still outstanding, which goes against "refused, never skipped".
   - **The name:** I renamed it from `readCase`, since "case" is this project's word for its test fixtures.
   - **The alternative:** keep it internal and rely on the README's warning to check `unconvertedSafes` and `unconvertedNotes`.
2. **The README test runs the examples on every CI run,** so the README can't drift from the engine.
3. **The dashboard's footer will say "spillpoint 0.1.0"** as soon as this merges, before you publish. As in M3e, it reads the version from `package.json`. Publishing soon after merging keeps the two in step.
4. **The root README names version 0.1.0** for building from rounds, so it stays accurate even in the gap before you publish.

## Open questions

None.

Next is M4i: the dashboard's Rounds tab, with Millrace opening from its rounds and save format version 2. I'm stopping here.
