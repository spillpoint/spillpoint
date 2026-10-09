# Review: 04g (release 0.4.0)

Branch `04g-release-0.4.0`, two commits:
1. **Your zip size limits,** and the note cap's report line.
2. **The release:**
   - the version in `packages/engine/package.json` is **0.4.0**
   - the release notes are final, in `notes/release-0.4.0.md`
   - both READMEs say what 0.4.0 adds
   - the README examples run against the packed build

**I haven't published.** The packed build is yours to check first.

## 1. Zip size limits, and the note cap's line

- **The total.** Before anything is inflated, the sizes the zip's directory lists are added up. Past 100 MB (100,000,000 bytes) it's refused: "It unzips to more than 100 MB, far more than an OCF export would be. Check it's the right file." Loose files opened together are held to the same total, with the message worded for several files.
- **Each entry.** While an entry inflates, it stops as soon as its output passes the size the directory lists. The stream is cancelled, and the zip is refused: "<name> is damaged in the zip: it inflates to more than its listed size."
- **The tests** build both zips from the small test zip, by changing the sizes in its directory. A third test gives loose files whose sizes add up past 100 MB without holding them. Nothing large is committed.
- **O13** has both limits.
- **The note cap's line** now reads "The cap on <holder>'s note is read as pre-money, the only kind spillpoint models for a note. OCF doesn't say which." The page test for Larkspur checks it for Investor N.

## 2. The release

- **`notes/release-0.4.0.md`** has these sections:
  - **New:** `readOcf`, what it gives, reads and refuses, and how it's tested.
  - **On the page:** opening an export, the zip reader and its limits, and the browsers it needs.
  - **Changed answers:** none.
  - **New in the API:** every refusal term, by kind, and every note code.
  - **Changes that can break 0.3.0 code:** none. It flags `readOcf`'s snake_case outer names for the 1.0 review.
  - **Still refused:** the OCF deferrals, beside the engine's own list, unchanged.

  The credit line is there, word for word.
- **The root README:**
  - the page can open an Open Cap Format export
  - the engine reads one, from 0.4.0
  - the credit line
  - "Coming next" is now 1.0
- **The engine README:** "What it covers" and "What it refuses" each point to the OCF section, which 04e added with its worked example.

## How to check the packed build

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   That's 1,789 engine tests, 343 dashboard tests, the 55 reference unit tests, and all 76 cases matching the reference.
2. **See exactly what would be published,** without publishing:

   ```bash
   cd packages/engine && npm pack --dry-run
   ```

   It should list **49 files at version 0.4.0**, 97.4 kB packed. That's 0.3.0's 31, plus the nine OCF modules, each with its declarations.
3. **What I checked as a user would.** I packed the package and unpacked the tarball into a throwaway project outside the repo. decimal.js was linked from the copy already installed here, so nothing was downloaded.
   - **The README's four examples,** taken from the packed README, each printed exactly their Output block from the built `dist/`. That includes the OCF one.
   - **The exports:** the 17 the API test pins, which are 0.3.0's 15 plus `readOcf` and `OcfRefusal`.
   - **A TypeScript file typechecked** under Node's own module resolution (`nodenext`), the package's declarations included. It uses `OcfFile`, `OcfImport`, `OcfNote` and `OcfToFill`.
   - **The packed build, run on the repository's OCF cases:**
     - **Quillfern** at $25M pays Founder A $6,462,965.75 and Angel S $367,213.02, as edge case 25 records.
     - **Millrace in OCF,** with Series B filled in as participating, pays Ana $9,750,989.67 and Cobalt $36,383,770.41 at $100M, as the locked case records, to the cent.
     - **An empty package** is refused as `malformed`, `no_manifest`.
4. **Publishing is yours.** From `packages/engine`, run `pnpm publish`. Its `prepublishOnly` step builds and tests first.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing run outside the sandbox.**

## Open questions

None for 0.4.0. After it's published, the 1.0 pass starts with 1.0a, removing the Milestone names. I'm stopping here.
