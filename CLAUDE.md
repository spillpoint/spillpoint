# spillpoint

Open-source exit waterfall engine and dashboard. Given a cap table, or the rounds that built it, and an exit value, spillpoint computes who gets what. It finds every breakpoint where the payoff curve bends and explains each one in plain English. Everything runs in the browser.

Owner: Jordan Roga. Jordan reviews behavior (tests, dashboard), not code. The first user is a founder weighing a term sheet.

Math rules live in `docs/SPEC.md`. The main worked case lives in `cases/millrace/CASE.md`.

## Hard rules

1. **Test cases are locked.** Once Jordan locks `cases/` at the end of M1, it is the source of truth. Never edit an expected value, tolerance, or input to make a test pass. If the engine disagrees with a case:
   - stop
   - write `notes/disagreement-<case>-<yyyy-mm-dd>.md` covering the case, the exit value, expected vs. actual, which side you think is wrong and why, and the charter or SAFE clause involved
   - wait for Jordan

   CI rejects any PR that touches `cases/` unless Jordan has added the `unlock-cases` label.
2. **No floating point in money or share math.** Use decimal.js throughout the engine. Convert to `number` only for chart rendering.
3. **Git.** Use one branch and one PR per step (`05c4-engine-safe-rules-and-speed`, ...). Commit freely and open a PR. Never push to `main`, never force-push, and never publish to npm. Jordan merges and publishes.
4. **Stop at every step boundary.** End each step with `notes/review-<step>.md`, covering:
   - what changed
   - how Jordan can check it by behavior: which cases, which exit values, what to click
   - assumptions added
   - open questions

   Then stop. Do not start the next step.
5. **Cap table data never leaves the user's machine.** No backend, no analytics, no runtime network requests, nothing in URLs. Saving means a local JSON file.
6. **No real cap tables in git.** Anything real goes in `local/`, which is gitignored.
7. **Write every modeling choice down.** If the spec or a case doesn't settle something, add it to `docs/ASSUMPTIONS.md` with the default and whether it's a toggle, and list it in the review note. Never pick silently.
8. **Comments explain the finance, not the TypeScript.** Name the clause or convention a function implements, e.g. "Post-money SAFE: Company Capitalization excludes the pool increase made in the financing."
9. **Flag changes to CI or permissions.** Any change to `.github/workflows/` or `.claude/` gets its own line in the review note.
10. **Nothing copied from the Open Cap Table Coalition.** ASSUMPTIONS O12's rule covers OCX as well as OCF: every file in either format in the repo is our own, written by hand from the spec. Nothing from the Coalition's published OCF or OCX material is copied into the repo: no samples, templates, schemas or documentation text. Their published examples are read and run only locally, in `local/`.

## Steps

Work comes in steps, each named for the release it ships in: 05c4 went into 0.5.0, and 06a goes into 0.6.0. Each step is one branch and one PR (hard rules 3 and 4), sized so Jordan can review it in one evening; split any that won't fit.

A release usually goes:
- **The plan:** `notes/plan-<version>.md`, with the questions only Jordan can answer. Nothing is built until he answers.
- **Cases first,** wherever there's new math, worked by the reference with a `DERIVATION.md` to re-derive from. Jordan lifts the `cases/` edit rule for that step only, and has new cases re-derived independently, not by you, before he adds the label.
- **Then the engine, then the page.**
- **The release step:** the version in `packages/engine/package.json`, `notes/release-<version>.md`, both READMEs, and the packed build checked as below. Jordan publishes and tags.

**Checking the packed build** (the release checklist):
1. **What CI runs:** `pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference`.
2. **What would be published:** from `packages/engine`, `pnpm pack --dry-run` lists the files and the version. It doesn't print a shasum, so for that run `pnpm pack`, then `shasum spillpoint-<version>.tgz`, then delete the tarball. Use pnpm, not npm: `pnpm publish` rewrites `package.json` (it drops `prepublishOnly` and reorders the scripts), and `pnpm pack` writes it the same way, so its shasum is npm's. `npm pack` gives a different one (checked on 0.5.0 in 06a).
3. **As a user would:** unpack the tarball into a throwaway project outside the repo, and run the README's examples from the packed README, the exports the API test pins, a TypeScript file typechecked under `nodenext`, and the cases the release is about on the packed build.
4. **Publishing and tagging are Jordan's.**

## Where things stand

- **Released through 0.7.0,** on npm and as GitHub releases. 0.7.0 is the naming review (`notes/plan-0.7.0.md`): every name in the API settled, the last release that breaks anything. 0.6.0 reads OCX in its 0.4/0.5 and 0.7 layouts; no Carta export has been tested yet.
- **spillpoint-fund 0.1.0** (`packages/fund`, `notes/release-fund-0.1.0.md`): the fund waterfall, published from `packages/fund` and tagged `fund-v0.1.0`; its page is at `spillpoint.github.io/spillpoint/fund/`.
- **Next, 1.0:** the spillpoint.io domain and the release, with no API changes. It waits on an outside waterfall that matches ours, and a few outside users.

Deferred work lives in the "Later" section of `docs/ASSUMPTIONS.md`.

## The fund workstream

A second package, `packages/fund` (`spillpoint-fund`): the fund-level waterfall, how a distribution splits between LPs and GP. Its rules are `packages/fund/docs/SPEC.md` (F1 to F21) and `ASSUMPTIONS.md` beside it.

- **The engine comes first.** If an engine step comes up, Jordan says whether to finish or park the fund step. The two never have PRs open at once.
- **On npm from 0.1.0, and on the site** (f01n). Its releases are checked as the engine's are ("Checking the packed build", above), from `packages/fund`, and Jordan publishes and tags them `fund-v<version>`.
  - **Its page is `apps/fund`** (`@spillpoint/fund`, a private app; `notes/plan-fund-page.md`). Pages copies its build into the dashboard's as `fund/` before the upload, so it's at `spillpoint.github.io/spillpoint/fund/`. `apps/fund/test/site.test.ts` checks the two together.
  - **Nothing in `apps/dashboard` but the footer link** to `./fund/`. The fund page links back with `../`.
- **No `spillpoint` import** until engine 1.0.
- **Steps** are named f01a, f01b and so on for its 0.1.0, and f02a, f02b and so on for its 0.2.0 (each LP's share, F19 to F21: f02a the spec, reference and cases; f02b the engine; f02c the page; f02d the release). The same hard rules: one branch and one PR each, a review note, then stop.
- **Everything fund lives under `packages/fund`:**
  - its docs in `docs/`
  - its cases in `cases/`
  - its reference in `reference/`, with the same discipline as spillpoint's `reference/`

  Its page is the one exception, in `apps/fund`, above. Nothing in `packages/engine`, `apps/dashboard` (but its footer link), `reference/` or `cases/` changes for it. If something there seems to need a change, stop and ask. `files` in its `package.json` keeps the cases and the reference out of a publish.
- **The fund cases are locked like `cases/`** (hard rule 1):
  - `cases-locked.yml` fails a PR that touches `packages/fund/cases/` without Jordan's label.
  - `.claude/settings.json` denies `Edit(packages/fund/cases/**)`.
  - Jordan lifts the lock for a step by removing that one entry locally, as with `cases/`.
- **Nothing from published waterfall material** goes in the repo: ILPA's model LPA, law-firm templates, anything else. The same rule as hard rule 10.

## Repo layout (pnpm workspace)

- `packages/engine`: the npm package `spillpoint`. Pure functions, no UI, no I/O.
- `packages/fund`: the npm package `spillpoint-fund`, with its own docs, cases and reference ("The fund workstream", above).
- `apps/fund`: the fund page, `@spillpoint/fund`, deployed under `/fund/` ("The fund workstream", above).
- `cases/`: one folder per case, each with `expected.json` and `DERIVATION.md` (a plain-English walk-through of the answer). An exit or round case has `inputs.json`; an OCF case has an OCF package or one-file fixtures instead (ASSUMPTIONS C16). Locked (hard rule 1).
- `reference/`: a standalone Python brute-force calculator that produced the expected values. The engine never imports it. It exists so expected values don't come from the code they test, and it uses a different method from the engine: at each exit value it tries every combination of conversion and exercise decisions and keeps the stable ones.
- `apps/dashboard`: Vite + React, deployed to GitHub Pages at `spillpoint.github.io/spillpoint`.
- `docs/`: `SPEC.md` and `ASSUMPTIONS.md`.
- `notes/`: plans, release notes, step reviews and disagreement write-ups.
- `scripts/`: `ocf-check.mjs`, which checks an OCF export and prints only counts and codes.
- `local/`: gitignored.

## Stack

TypeScript (strict), pnpm, Vitest, decimal.js, Vite + React, and Recharts unless it can't mark breakpoints cleanly. Deploy through GitHub Actions. The reference calculator is plain Python 3 with `fractions` for exact math and no dependencies.
