# Review: M5j (release 0.2.0, ready to publish)

Branch `m5j-release-0-2-0`. It readies spillpoint 0.2.0:
- **The version** in `packages/engine/package.json` is 0.2.0.
- **The README** has a third worked example, for `paySchedule`, which the README test runs.
- **The release notes** are final, in `notes/release-0.2.0.md`, with your deprecation note.

**I haven't published.** As you asked, the packed build is yours to check first.

## How to check the packed build

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   That's 1,302 engine tests (one more: the README's third example), 182 dashboard tests, the 47 reference unit tests, and all 61 cases matching the reference.
2. **See exactly what would be published,** without publishing:

   ```bash
   cd packages/engine && npm pack --dry-run
   ```

   It should list **31 files at version 0.2.0**, 67.2 kB packed:
   - **`dist/`:** with three new modules, `dates`, `dividends` and `payments`
   - **the README, the license and `package.json`**
3. **What I checked as a user would.** I packed the package and unpacked the tarball into a throwaway project outside the repo. Its one dependency, decimal.js, was linked from the copy already installed here, so nothing was downloaded.
   - **The README's three examples** each printed exactly their Output block from the built `dist/`.
   - **The exports** are the 15 the API test pins: 0.1.0's 14 and `paySchedule`.
   - **A TypeScript file typechecked** under Node's own module resolution (`nodenext`), with the package's declarations checked too. It uses every new 0.2.0 type and builds a `PreferredSeries`, a `CapTable` and an `ExitInput` the 0.1.0 way, without any new field.
4. **Publishing is yours.** From `packages/engine`, run `pnpm publish`. Its `prepublishOnly` step builds and tests first.

## The README's new example

**"A worked example: an earnout"** uses the first example's company, with a $10M closing and a $10M earnout. It prints each payment's takes:

```
closing: $10000000.00, $10000000.00 so far (converts: nobody)
  ana on common: $7000000.00
  fund on seed: $3000000.00
earnout: $10000000.00, $20000000.00 so far (converts: seed)
  ana on common: $9000000.00
  fund on seed: $1000000.00
```

The cumulative $20M passes the $15M where the fund converts. Below the output, the README explains negative takes and `lowered`.

## The release notes

`notes/release-0.2.0.md`, in full:
- **New:**
  - warrants, and the warrants event
  - cumulative dividends, including on a priced round's series
  - management carve-outs, with curved stretches
  - SAFEs and notes still outstanding at a sale
  - escrow and earnouts
  - R28's seniority
- **New in the API:**
  - `paySchedule`, and `prepare`'s exit date
  - the new types and fields
  - the optional fields that keep 0.1.0 code working
- **Changes that can break 0.1.0 code:** the three widened lists, `Security`, `EventDetails["kind"]` and `ReasonCode`, leading with the security kind, as you agreed.
- **Deprecated** (new, your wording): milestone names in the `Milestone` type. Nothing is refused as `"M5"` any more; the value stays for 0.1.0 code. Milestone names will be removed at 1.0, where a refusal will describe what's unsupported instead. The same note is on the type in `errors.ts` and in the README's description of `UnsupportedTermError`.
- **Refusals:** what's no longer refused, and the newly refused "later" terms.
- **Payouts:** the carve-out's, SAFEs' and notes' lines.
- **Messages:** the grant message's grouped digits.

## What changed

- **`packages/engine/package.json`:** version 0.2.0.
- **`packages/engine/README.md`:**
  - the earnout example
  - "Items marked *(0.2.0)* are new in 0.2.0", where it used to say they were coming
  - the deprecation note
- **`packages/engine/test/readme.test.ts`:** three examples.
- **`packages/engine/src/errors.ts`:** the deprecation note on `Milestone`. No behavior changes.
- **The root `README.md`:**
  - "From 0.2.0 it also pays warrants, cumulative dividends, management carve-outs, escrow and earnouts, and SAFEs and notes still outstanding at a sale."
  - The page's paragraph now says it refuses a cap table with those terms, rather than show it with something left out.
- **`notes/release-0.2.0.md`:** final.

The page shows the engine's version, read from `package.json` at build time. It will say 0.2.0.

## Checks

- **Engine:** 1,302 tests pass.
- **Dashboard:** 182 tests pass.
- **Reference:** 47 unit tests pass, and all 61 cases match.
- **`cases/`:** no changes.
- **Typecheck and build:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing published.**

## Assumptions added

None.

## Open questions

None. After you publish, M5k is next: the dashboard terms. I'm stopping here.
