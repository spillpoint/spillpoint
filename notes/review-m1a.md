# Review: M1a (workspace, CI, reference calculator, Millrace)

Branch `m1-cases`. M1 is split in two (your answer to S4). This PR is M1a. M1b, the 17 edge cases, comes next on the same branch name after this merges, and I haven't started it.

## CI and permissions changes

- **`.github/workflows/ci.yml` (new).** On every PR and on pushes to `main` it runs:
  - the TypeScript typecheck
  - Vitest
  - the reference calculator's unit tests
  - `reference/generate.py --check`, which fails if any `expected.json` differs from what the reference produces

  Permissions: `contents: read`.
- **`.github/workflows/cases-locked.yml` (new).** It fails any PR that touches `cases/` unless the PR has the `unlock-cases` label, and re-runs when labels change. Permissions: `contents: read` and `pull-requests: read`. It uses the built-in `GITHUB_TOKEN` to list the PR's files. **It will fail on this PR, as agreed (S3).**
- **`.claude/settings.json` (moved from the repo root).** It denies `npm publish`, `pnpm publish`, force-push and pushes to `main`. Moving it is what puts those deny rules into effect.
- **Two things only you can do in GitHub settings:**
  1. Create the `unlock-cases` label.
  2. Make `cases-locked` and `CI / test` required checks on `main` (branch protection). Until then the check reports failure but doesn't block a merge.

## What changed

- **Git:** connected to `spillpoint/spillpoint` and based on `origin/main`. The first commit holds `CLAUDE.md`, `docs/SPEC.md`, `cases/millrace/CASE.md` and `.claude/settings.json`.
- **`docs/SPEC.md`**, per your answers:
  - Pro-rata now means the NVCA share-of-the-round right.
  - The broad-based weighted-average definitions of A, B and C are written out, with the "include the unissued pool in A" toggle.
  - At exit, as-converted shares are exact fractions; this is now in the Rounding section.
  - I also wrote down a narrow-based A (outstanding preferred only). See open question 2.
- **`docs/ASSUMPTIONS.md` (new):** every default, its toggle status, and whether you confirmed it or it's new.
- **Workspace:** pnpm, with `packages/engine` (the `spillpoint` package, still empty) and a Vitest suite that checks the case files are internally consistent. There is no engine code yet.
- **`.gitignore`:** adds `local/` and Python cache files.
- **`reference/`:** the Python brute-force calculator. It has exact fractions, no dependencies, and 12 unit tests on examples small enough to check on paper. `reference/README.md` explains the method.
- **`cases/millrace/`:**
  - `inputs.json`: Millrace as a list of events, plus the exit settings.
  - `expected.json`: the cap table after each of the 10 events, the 10 breakpoints with reasons, and payouts by holder × security at the 9 listed exit values and every breakpoint.
  - `DERIVATION.md`: the plain-English walk-through.

## How to check it by behavior

1. **Run it.** All four should pass:
   ```bash
   pnpm install && pnpm test && pnpm test:reference
   ```
2. **Read `cases/millrace/DERIVATION.md`.** The cap-table numbers you can check with a calculator:
   - Lena's 638,297 shares
   - the 1,182,033-share pool
   - SAFE price $0.384930 and Seed price $0.463515
   - Series A price $2.075472
   - Series B price $1.082112 and Series A's CP2 of $1.824752
3. **Spot-check exits against the breakpoint conditions:**
   - **$25M:** Cobalt has $19,999,999.79 and Series A has the remaining $5,000,000.21. Everyone else gets $0.
   - **$40.75M (breakpoint 4):** common is exactly $0.05 per share.
   - **$55.91M and $59.69M:** common equals 1.5× the shadow price, then 1.5× the Seed price. That is where each converts.
   - **$150M:** Ridgeline is flat at $24,749,995.17. This is Series A's cap dead zone, from $136.07M to $206.40M.
   - **$300M:** every holder's line, in `expected.json` → `exit.payouts`.
4. **For the independent re-derivation**, the reviewer needs:
   - `CASE.md`
   - `docs/SPEC.md` and `docs/ASSUMPTIONS.md`
   - the "Checking this independently" section at the end of `DERIVATION.md`

   Tolerances are $1 for payouts and breakpoints and 1 share for share counts.

## A founder-level result worth checking makes sense

Common gets nothing until $39.42M. At $100M, Ana takes $9.75M, which is 9.8% of the proceeds for 12.9% of the fully diluted company. Series B's 2x participating preference takes 36%.

## Assumptions added (status "New" in `docs/ASSUMPTIONS.md`)

- **R1:** "6% of the company" means 6% of issued stock after the issuance, rounded down.
- **R2:** the pool percentage is of issued stock + issued options + pool, rounded down.
- **R8:** the anti-dilution B and C use the shares actually issued and the consideration actually received for them. This is how the charter computes it after closing.
- **R10:** inside the circular price solve, the anti-dilution shares are fractional. The final CP2 then uses the shares actually issued, so the two differ by a fraction of a share.
- **R12:** after Series A and before Series B, Series A is senior to the Seed tier. This has no effect on exit values.
- **R14:** the between-round grants have null dates and come from the unissued pool.
- **E4:** one exercise decision per strike price.
- **E5:** tie-break. Where converting or exercising pays exactly the same, the reported decision is "don't convert / don't exercise". This never changes a payout.
- **E10:** breakpoints are given to the cent, with the exact fraction alongside.
- **C1:** exact numbers in JSON are strings, `"a/b"` when the decimal repeats.
- **C2:** Millrace's exit input is the post–Series B cap table in `expected.json`, which `inputs.json` names by event ID.

## Open questions

1. **Pro-rata denominator.** Harbor Lane's $3M matches 25.000000% × $12M, but only if "fully diluted" counts the unissued pool. The NVCA Investors' Rights Agreement counts only outstanding shares, options and convertibles, which leaves the pool out. That base would give Harbor Lane about 28.7%, or about $3.44M. This changes no M1 value, because $3M is an input. It will matter in M4 if pro-rata amounts are computed. Which base should the spec use?
2. **Narrow-based A.** I wrote "outstanding preferred only, as converted" into `SPEC.md`. Charters vary. Is that the default you want for edge case 16?
3. **The engine package is `"private": true`.** That blocks an accidental publish. You'll need to remove it before the 0.0.1 release in M2.
4. **Tool versions:** pnpm 12.9.1 (pinned in `packageManager`), Vitest 5, TypeScript 7, Node 24 in CI and Python 3.12 in CI. These are the current versions. Pin differently if you prefer.
