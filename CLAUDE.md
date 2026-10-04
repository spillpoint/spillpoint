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
3. **Git.** Use one branch per milestone (`m1-cases`, `m2-engine-core`, ...). Commit freely and open a PR. Never push to `main`, never force-push, and never publish to npm. Jordan merges and publishes.
4. **Stop at every milestone boundary.** End each milestone with `notes/review-mN.md`, covering:
   - what changed
   - how Jordan can check it by behavior: which cases, which exit values, what to click
   - assumptions added
   - open questions

   Then stop. Do not start the next milestone.
5. **Cap table data never leaves the user's machine.** No backend, no analytics, no runtime network requests, nothing in URLs. Saving means a local JSON file.
6. **No real cap tables in git.** Anything real goes in `local/`, which is gitignored.
7. **Write every modeling choice down.** If the spec or a case doesn't settle something, add it to `docs/ASSUMPTIONS.md` with the default and whether it's a toggle, and list it in the review note. Never pick silently.
8. **Comments explain the finance, not the TypeScript.** Name the clause or convention a function implements, e.g. "Post-money SAFE: Company Capitalization excludes the pool increase made in the financing."
9. **Flag changes to CI or permissions.** Any change to `.github/workflows/` or `.claude/` gets its own line in the review note.

## Repo layout (pnpm workspace)

- `packages/engine`: the npm package `spillpoint`. Pure functions, no UI, no I/O.
- `cases/`: one folder per case, each with `inputs.json`, `expected.json`, and `DERIVATION.md` (a plain-English walk-through of the answer). Locked after M1.
- `reference/`: a standalone Python brute-force calculator that produced the expected values. The engine never imports it. It exists so expected values don't come from the code they test, and it uses a different method from the engine: at each exit value it tries every combination of conversion and exercise decisions and keeps the stable ones.
- `apps/dashboard`: Vite + React, deployed to GitHub Pages at `spillpoint.github.io/spillpoint`.
- `docs/`: `SPEC.md` and `ASSUMPTIONS.md`.
- `notes/`: milestone reviews and disagreement write-ups.
- `local/`: gitignored.

## Stack

TypeScript (strict), pnpm, Vitest, decimal.js, Vite + React, and Recharts unless it can't mark breakpoints cleanly. Deploy through GitHub Actions. The reference calculator is plain Python 3 with `fractions` for exact math and no dependencies.

## Milestones

Size each milestone so Jordan can review it in one evening. Split any that won't fit.

- **M1: Test cases. No engine code.**
  - Set up the workspace, `.gitignore`, and CI: tests, plus a `cases-locked` check that fails any PR touching `cases/` without the `unlock-cases` label.
  - Build `reference/`.
  - Write the Millrace case and the edge cases listed in `docs/SPEC.md`.
  - For each exit case: inputs, payouts per holder at the listed exit values, and the full breakpoint list with reasons.
  - For each round case: the cap table after each round.

  Jordan has the expected values re-derived independently before he locks them.
- **M2: Engine core.**
  - Exit waterfall on an existing cap table: preferences, participation, caps, seniority and pari passu tiers, per-series conversion, and options with strikes.
  - The breakpoint finder.
  - Must pass the Millrace exit tests and the matching edge cases, ready for a 0.0.1 release.
- **M3: Dashboard.** Built on the M2 engine. Includes the GitHub Pages deploy.
  - First screen: the founder view.
  - Cap table editor.
  - Exit-value slider with a who-gets-what table, by holder and by class.
  - Payoff curves by holder and by class, with breakpoints marked.
  - Breakpoint list, each with its plain-English reason.
  - Save and load a JSON file.
  - A visible note that the charter and signed documents govern, not this tool.
- **M4: Rounds.**
  - Priced rounds, pool top-ups, SAFE and note conversion, pro-rata, anti-dilution, and pay-to-play.
  - Building Millrace from its rounds must reproduce the M1 cap table exactly.
  - Add a rounds editor to the dashboard.
- **M5: Remaining terms.**
  - Cumulative dividends, warrants, management carve-outs, escrow and earnouts, and SAFEs and notes still unconverted at exit.
  - Each term appears in the dashboard.
- **M6: OCF import.**
  - Read Open Cap Format files into the engine's model.
  - Test against OCF's published examples.
  - Give a clear error for anything unsupported, never a silent skip.
