# Review: M2 (engine core), with M2e (0.0.1 release)

Branch `m2e-release`, the last of M2's five PRs. With it, the `spillpoint` package is ready for you to publish as 0.0.1. This note covers M2 as a whole, then what M2e itself changes. M2a–M2d each have their own note (`notes/review-m2a.md` … `review-m2d.md`).

## CI and permissions changes across M2

- **M2a:** `.claude/settings.json`, your change: `Edit(cases/**)` replaced the Millrace-only deny rule.
- **M2e:** `.github/workflows/ci.yml`:
  - **A new step, "Build the npm package"** (`pnpm build`), after the typecheck. Every PR now proves the package builds.
  - **A new job, `test-node-22`,** which installs, typechecks, builds and tests on Node 22, the oldest version the package claims (`engines: >=22`). It's a separate job rather than a matrix, so the existing `test` job keeps its name. Branch protection requires that name, and a matrix would have renamed it to "test (22)" and "test (24)". If you want Node 22 required too, add `test-node-22` to the required checks.
  - No permissions change.
- Nothing else in `.github/workflows/` or `.claude/` changed in M2.

## What M2 delivers

The exit waterfall on an existing cap table, as the npm package `spillpoint`:

| PR | What it added |
|---|---|
| M2a | 40-digit decimal arithmetic. Reading and checking inputs, with clear errors. Out-of-scope terms refused, naming their milestone. |
| M2b | The waterfall for given decisions: tiers, pari passu, participation, caps, residual, options net of strike. |
| M2c | Solving the decisions: per-series conversion, options following the price (E16), a group deciding first by vote (E17), the tie-break, every stable answer. The reference moved onto the same rules. |
| M2d | The breakpoint finder, with plain-English reasons and payout jumps placed by the sharpened E13. |
| M2e | Founder-ready reason wording, the public API, the npm build, version 0.0.1, the README. |

**It passes Millrace's exit tests and edge cases 1–7 exactly as locked:**
- payouts to the cent at every listed exit value and every breakpoint
- the recorded decisions, found by the engine itself
- every breakpoint within a cent, with the same reasons and jump flags

**Your own independent runs agreed.** You ran 493 points (about 430 random) for payouts and decisions, plus every breakpoint, and found Millrace's breakpoints within $5e-13.

**My one-off comparisons with the reference** on random cap tables agreed at 10,000 exit values and 249 exact ties (M2c), and on 662 breakpoints across 150 cap tables (M2d).

## What M2e changes

1. **Reason wording, per your six points.** For example, 6b's jump now reads: "Payouts jump here instead of bending: Common Stock drops from $26,000,000 to $24,000,000 and Seed-1 Preferred rises from $1,000,000 to $3,000,000. At exactly $30,000,000 the outcome from below still holds; the new one applies just above it." Specifically:
   - **No assumption codes in the text.** They stay in the structured fields and the code comments.
   - **The residual names who shares it.** For example, "shared as common by Common Stock, Series A Preferred and Series B Preferred".
   - **"Its investment"** replaces "its original issue price".
   - **A jump says what each class gains or loses.**
   - **The group vote is two sentences:** "Seed-1 Preferred and Seed-2 Preferred convert together if holders of more than half their shares vote for it. Above $30,000,000 Investor X and Investor Y both do better converting, so the vote passes."
   - **Options lead with the event:** "Options at a $0.05 strike (490,000) come into the money here. Above this, exercising pays, and the strike money joins the proceeds."
   - **When only one class takes the residual,** the reason says so: "the next dollar goes to Common Stock". With more than one, it's "is shared as common by ...".
   - **Whole-dollar amounts drop the cents** ("$26,000,000"); others keep them ("$19,999,999.79").
2. **E18 is confirmed, with your condition tested.** Two option strikes whose changes are $0.00005 apart come out as one breakpoint at $1,000,000 that keeps both reasons.
3. **The public API** is 12 exports, pinned by a test so it changes only on purpose:
   - `readExit`, `readCapTable`
   - `prepare`, `payout`, `solve`, `findBreakpoints`
   - `D`, `parseExact`, `toCents`
   - the three error classes

   It also exports the types. Helpers like `sameAmount`, and the case-file reader `readCase`, stay internal.
4. **The npm package** (`packages/engine/package.json`):
   - version **0.0.1**, with `"private": true` removed
   - `engines` requires Node 22 or later, which CI now tests alongside 24
   - `exports` and `types` point at the built `dist/`
   - it ships `dist`, the README and the license
   - `prepublishOnly` builds and tests before any publish
   - **The build** (`tsconfig.build.json`, then `scripts/fix-declarations.ts`) emits JavaScript and type declarations. The fix-up step makes the declarations import `.js` paths too, for older TypeScript versions.
   - **Two fixes from checking the build with a throwaway project that installs it:**
     - The engine now imports decimal.js's `Decimal` by name, so projects using Node's own module resolution typecheck as well as bundler-style ones.
     - The worked example in the README is that project's real output.
   - **The build's declaration fix-up is plain JavaScript** (`scripts/fix-declarations.mjs`), so the build runs on every Node 22 release, not only those that run TypeScript directly.
5. **`packages/engine/README.md`:** what it does, a worked example with its real output, what 0.0.1 covers and refuses, the input format, the numbers, the API, and the note that **the charter and the signed documents govern, not this tool**.
6. **`packages/engine/LICENSE`:** a copy of the root Apache-2.0 license, so it ships with the package.
7. **The root `README.md`** now says only what exists today. The engine is on npm. The dashboard and Open Cap Format import are listed as coming, not claimed.

## How to check it by behavior

1. **Run what CI runs:**
   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```
   That is 457 Vitest tests and 30 reference unit tests, and all 28 cases match the reference.
2. **Read the reasons:**
   ```bash
   pnpm breakpoints millrace
   ```
   ```bash
   pnpm breakpoints edge-06b-forced-class
   ```
   ```bash
   pnpm breakpoints edge-06c-forced-class-at-least
   ```
3. **Check payouts for any case and exit value:**
   ```bash
   pnpm payouts millrace 100000000
   ```
4. **See exactly what would be published,** without publishing:
   ```bash
   cd packages/engine && npm pack --dry-run
   ```
   That should list 21 files at version 0.0.1: `dist/`, the README, the license and `package.json`.
5. **Publishing is yours.** From `packages/engine`, `pnpm publish`. Its `prepublishOnly` step builds and tests first. I haven't published, and can't: the deny rules block it.

## Assumptions added in M2 (all confirmed)

- **E14:** 40-digit decimals, the tie threshold, and the tests to the cent.
- **E15:** solving from both ends.
- **E16:** options follow the price.
- **E17:** a group decides first.
- **E18:** how breakpoints are found.
- **C12:** input strictness.
- **C13:** saved files carry a version.
- **E7:** a cap below its preference is refused.
- **E13:** jump placement, sharpened.
- **E8:** records the two-answer search.
- **R6:** the before-M4 note.

**Still owed:**
- **Before M4:** cases for partial pay-to-play (R20), pay-to-play with anti-dilution (R21), pay-to-play on more than one series (R22), and a pro-rata base that counts outstanding SAFEs and notes (R6).
- **Before M5:** SAFE and note exit cases with a discount, with no cap, and alongside preferred (X9, X12).
- **The next `cases/` unlock:** `notes/next-unlock.md` lists Millrace's "within $1" wording and the range-indifferent voter case.

## Open questions: answered

1. **How the dashboard uses the engine (M3).** Vite will import the engine's sources directly, so the dashboard always runs the current engine with no build step. npm users keep getting `dist/`.
2. **The root `README.md`** is reworded (item 7 above).
3. **Before publishing:** you asked for `engines` `>=22` with Node 22 in CI, the root README reworded, and "goes to Common Stock" when one class takes the residual. All three are done in this PR.

M2 is complete. I'm stopping here and won't start M3.
