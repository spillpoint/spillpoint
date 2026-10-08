# Review: 03j (release 0.3.0, ready to publish)

Branch `03j-release`. Two commits, as you asked:
1. **The page fixes,** on their own:
   - one money format per line
   - pieces indented under their adjustment
   - "(doesn't apply to this round)"
   - page tests for 8b and 11b
   - the later-list item
2. **The release:**
   - the version in `packages/engine/package.json` is **0.3.0**
   - the release notes are final, in `notes/release-0.3.0.md`
   - the README examples run against the packed build

**I haven't published.** The packed build is yours to check first.

## The page fixes (first commit)

1. **One money format per line.** The note line now reads "$530,000.00 ($500,000.00 and $30,000.00 interest)". I fixed two more lines that mixed formats the same way:
   - **The pay-to-play line:** to the dollar it said "buys $333,333 of its $333,333" for a holder a cent short, who converts. It's now to the cent.
   - **The pro-rata line:** "times the $12,000,000.00 raised. It takes $3,000,000.00 of it", beside its entitlement to the cent.

   Lines whose amounts are all to the dollar stay that way.
2. **Each piece is indented under its anti-dilution line,** as a nested list inside it. The tests check 16i's two pieces sit inside Seed Preferred's adjustment.
3. **"(doesn't apply to this round)"** follows a setting that's on where it doesn't apply. The test opens 16c with both settings on in its full-ratchet round, which converts nothing, so neither applies.
4. **8b and 11b, opened as files with exactly their inputs:**
   - **8b:** its cap table and range as the case gives them, its carve-out still in the cap table. At **$1,052,631.58**, the list says the warrant comes into the money. The "For you" line, for Investor X, reads: "just below here each extra $1M adds about $902,500; just above, about $824,201. The rate keeps changing on both sides, because the carve-out's claim grows with the exit value."
     - **Below:** I worked it by hand from x × $2,000,000 ÷ ($2,000,000 + 0.1x).
     - **Above:** from 2,000,000 × (x + $100,000) ÷ ($2,200,000 + 0.1x).
     - **Why Investor X:** the file's view makes it "you", since Founder A gets nothing on either side while the tier is short.
   - **11b:** with its payment schedule, Paid over time shows the warning in full. "The payment “earnout” lowers what Founder A and Founder B have been paid so far. Founder A gives back $150,000.00 and Founder B gives back $50,000.00. At $31,000,000 paid in all, Seed-1 Preferred and Seed-2 Preferred convert, unlike at $29,000,000. …"
5. **The later list** (`docs/ASSUMPTIONS.md`, "Later") has "relabel 'Pro-rata counts the unissued pool' in plain words", for the 1.0 pass.

## How to check the packed build

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   That's:
   - 1,485 engine tests, and 322 dashboard tests
   - the 55 reference unit tests, and all 75 cases matching the reference
2. **See exactly what would be published,** without publishing:

   ```bash
   cd packages/engine && npm pack --dry-run
   ```

   It should list **31 files at version 0.3.0**, 72.1 kB packed. They're the same files as 0.2.0's, with no new modules: `dist/`, the README, the license and `package.json`.
3. **What I checked as a user would.** I packed the package and unpacked the tarball into a throwaway project outside the repo. decimal.js was linked from the copy already installed here, so nothing was downloaded.
   - **The README's three examples,** taken from the packed README, each printed exactly their Output block from the built `dist/`.
   - **The exports:** the same 15 the API test pins.
   - **A TypeScript file typechecked** under Node's own module resolution (`nodenext`), the package's declarations included. It uses `AntiDilutionAdjustment`, the new `AntiDilutionPiece` and `ExitInput`.
   - **Run against the packed build, it gave:**
     - case 24's carve-out on the sale paying Manager M $1,000,000 at $10M
     - case 16i's CP2, $0.994808, with the new money left out and the note counted
     - case 8b's three breakpoints, $1,052,631.58 first
4. **Publishing is yours.** From `packages/engine`, run `pnpm publish`. Its `prepublishOnly` step builds and tests first.

## The release notes

`notes/release-0.3.0.md`, final. Its sections:
- **New:** the six engine changes, from the anti-dilution pieces to the carve-out on the sale.
- **On the page:** what 03i and this PR changed.
- **Changed answers:** 16i's kind of round, in your sentence; a post-money SAFE beside a SAFE with no cap; two warrants for one series.
- **New in the API:** `exit.carve_out`, the round field, `pieces` and its type, and the new refusal name.
- **Changes that can break 0.2.0 code.** As 0.2.0's notes had one for 0.1.0, this lists:
  - the changed answers
  - the refusal terms: what `anti_dilution_with_conversions` now covers, the new name, and the four no longer raised
  - `pieces` as a new required field, which matters only to code that builds an adjustment itself
  - the one reason whose wording changed
- **Still refused:** the two that remain from this work, and 0.2.0's list, unchanged.

## What changed

- **`packages/engine/package.json`:** version 0.3.0.
- **The root `README.md`:** "From 0.3.0 it also converts SAFEs and notes in a round that triggers anti-dilution or has pay-to-play, and a post-money SAFE beside notes or other SAFEs; and it takes a carve-out as a term of the sale."
- **`notes/release-0.3.0.md`:** final.
- **The first commit's page files and tests,** above. The engine's code is unchanged since 03h.

## Decisions I made, for you to check

1. **The two other money-format fixes,** in the pay-to-play and pro-rata lines, beyond the note line you named. "One format throughout" read as every line, and the pay-to-play line was hiding a cent short.
2. **A "Changes that can break 0.2.0 code" section** in the release notes, as 0.2.0 had for 0.1.0.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing run outside the sandbox.** No screenshots this time.

## Assumptions added

**No new IDs.** The "Later" section has one more item.

## Open questions

None. 0.3.0 is ready for you to pack and publish. After it, M6 (OCF import) is next. I'm stopping here.
