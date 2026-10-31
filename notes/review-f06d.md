# Review: f06d (spillpoint-fund 0.6.0)

Branch `f06d-fund-release-0.6.0`, from main after #134. The release step of spillpoint-fund 0.6.0, management fees on invested capital. It starts with your answers 1 and 3 from the f06c review, on the page.

**Nothing in `packages/engine`, `packages/fund/src`, `packages/fund/reference`, `packages/fund/docs`, `apps/dashboard`, any cases or `reference/` changed:** `git diff --stat origin/main HEAD --` over those prints nothing. In `packages/fund` only `package.json` and `README.md` changed. No case file changed, so this PR doesn't need the cases label.

| Commit | What |
|---|---|
| `b11d2a4` | the page: the terms line names each step's base, commitments saved while hidden, and two of 0.4.0's lines reworded, with tests and the plan (§1) |
| `0d62a9f` | the release: the version, the README, the release note, the repo README and `CLAUDE.md` (§2) |
| the last | this note |

## 1. The page: your answers 1 and 3

**The headline's terms line (answer 1)** names each step's base when any step is on invested capital:
- **Case 38:** "management fee 2% a year on commitments from 1 Jan 2020, 1.5% on invested capital from 1 Jan 2023, called quarterly"
- **Case 39:** "management fee 2% a year on commitments from 1 Jan 2021, 1.75% on invested capital from 1 Apr 2023, called half-yearly"
- **Case 40:** "management fee 2% a year on invested capital from 1 Jan 2022, called yearly"
- **Every step on commitments:** as 0.5.0 has it. Case 29's line is unchanged: "management fee 2% a year from 15 Feb 2021, 1.5% from 15 Feb 2026, called quarterly".
- **Case 29 switched to invested capital:** with an investment added and its second step on Invested capital, it names both bases. Back on Commitments, it reads as before.
- **A step at 0%,** which ends fees, names its base like any other step: "0% on commitments from …".

**The LPs' total commitments (answer 3).** Without listed LPs, the page writes them whenever the field holds an amount above zero, shown or hidden:
- **Case 40 with commitments of 2000000** opens without asking for them and saves as the same fund.
- **Case 40 switched to Commitments,** with 2000000 typed and switched back, saves `"commitments": "2000000"`.
- **Case 38 with its first step switched to Invested capital** keeps its $20,000,000 in the save.
- **Hidden text that isn't an amount above zero** stays out, so the fund runs and no problem lands on a field you can't see. The tests try "two million" and "0", each a problem while shown.
- **Beside listed LPs,** as in 0.4.0, nothing is written. See open question 1.

**The two reworded lines:**
- **Under the commitments field:** "Needed: the fund lists no LPs, so a fee on commitments is on this total."
- **From a file:** "Its management fee's total commitments are missing: they're needed when the fund lists no LPs and a step is on commitments."

**The plan** (`notes/plan-fund-page.md`):
- **0.6.0's section** says all this: Terms, Problems, the file's lines, Payouts, Saving and opening, and f06d's tests.
- **0.4.0's two lines** each say what they read from 0.6.0.
- **The terms line** is no longer an open question.

**Tests:**
- **The page's suite:** 827, from 823.
- **`invested.test.tsx`:**
  - **Added:** the terms lines, as above; case 40's commitments typed, switched back and saved; and hidden text left out.
  - **Changed:** f06c's test that saved without the commitments now opens case 40 with 2000000 and saves the same fund.
  - **Rewritten:** case 38's hidden commitments test now expects them in the save.
- **The two lines** are checked in the form and from a file, in `fees.test.tsx` and `invested.test.tsx`.

**Nine planted errors, each caught:**
- the terms line naming no base, as in f06c
- naming bases with every step on commitments
- a later step without its base
- hidden commitments left out, as in f06c
- hidden text that isn't an amount written
- a hidden 0 written
- commitments written beside listed LPs
- each of the two lines in 0.4.0's words

**On the running page:**
- **The footer** reads "spillpoint-fund 0.6.0".
- **Case 38 from the picker** shows its new terms line.
- **At 320 px,** cases 38 to 40 opened as files: each terms line wraps inside its box, and nothing scrolls sideways.
- **No console errors.**

## 2. The release

- **`packages/fund/package.json`** is at 0.6.0, so the page's footer says "spillpoint-fund 0.6.0" too. `files` is unchanged.
- **The package's README:**
  - **Its opening** adds a fee step on the fund's invested capital, day by day.
  - **A new worked example, "a fee on invested capital",** from case 38, after carry deal by deal's.
    - **The code:** `feeCalls(fund)` from the switch on, the total of all 18 calls, and `netInvestedCapital(fund)`.
    - **The output:** the six calls on invested capital, $44,550.00, $48,303.30, $44,388.59, $37,125.00, $32,107.01 and $25,987.50; 18 calls, $1,432,461.39 of fees in all; and $7,000,000 at 30 Jun 2024.
    - **The text says why:** 1.5% of the LPs' 99% of each day's net invested capital. Each event counts from its own date, worked through Q3 2023's 45 days at $14,000,000 and 47 at $10,000,000. The six quarters cost $232,461.39 where 1.5% of commitments would have been $450,000. `commitments` is needed only for the step on commitments.
    - **Where it comes from:** the output is exactly as the packed build prints it, and the input is case 38's exactly (§3).
  - **"What it covers"** is for 0.6.0. The management fee line gains your sentences: a step on invested capital, day by day; the schedule that switches, or the SPV; and `netInvestedCapital(fund)`.
  - **"What it doesn't model yet":**
    - **The fee line:** F39's Later line replaces 0.4.0's "Management fees beyond a rate on commitments". It adds that a step's key other than its rate, basis and date is refused.
    - **The clawback lines, folded:** "an interim clawback, and carry escrow" is out of deal by deal's line. "An after-tax clawback cap, a carry holdback or escrow, and interim clawback tests" covers both.
    - **Tier 1's capital:** now "Tier 1's capital as invested capital only, or as committed capital, instead of everything paid in."
  - **"How it's tested":** 35 worked cases and 153 refusals; three of the cases and fifteen of the refusals about fees on invested capital.
  - **Inputs, API and stable names** were already 0.6.0's from f06b.
- **`notes/release-fund-0.6.0.md`,** in the 0.5.0 note's style:
  - **What's new:**
    - a step's basis, `FeeStep.basis` and `FeeBasis`
    - F38 and F39 as the engine works them
    - `feeCalls` in its usual shape, a period with nothing to call not listed
    - `netInvestedCapital(fund)`
    - F40's refusals
    - the page's parts, case 38 among them
  - **Upgrading from 0.5.0:** your four points.
    - **Digit for digit:** checked on the two packed builds (§3).
    - **FA67:** for a `FeeStep` built by hand without its basis.
  - **Stable names:** nothing renamed. Added: `FeeBasis` and its two words, `FeeStep.basis`, `netInvestedCapital` and the input's basis.
  - **How it's tested, "independently":** in your numbers, the 0.5.0 note's wording, with three new cases and fifteen refusals.
  - **Not modeled yet:** F39's Later line first, then 0.5.0's others, folded as in the README.
- **The repo README's fund section** says what 0.6.0 adds, and the npm line reads 0.6.0.
- **`CLAUDE.md`'s "Where things stand"** names spillpoint-fund 0.6.0 and its release note. It adds fees on invested capital with `netInvestedCapital(fund)` (F38 to F40), the page's parts, and `fund-v0.6.0`.

## 3. The packed build

**What would be published,** from `packages/fund`, `pnpm pack --dry-run`: `spillpoint-fund@0.6.0`, 31 files, the same list as 0.5.0's.
- **The top level:** `package.json`, `README.md`, `LICENSE`.
- **`dist/`,** each as `.js` and `.d.ts`: `index`, `breakpoints`, `dates`, `decimal`, `equalization`, `errors`, `fees`, `input`, `model`, `portfolio`, `reasons`, `schedule`, `stable-names` and `waterfall`.

**The tarball:**
- **shasum:** `69797ad79fe08a5164bcd43d3e50be4ca7faa8f8`. Three packs gave the same one.
- **Size:** 67,375 bytes packed, 237,452 unpacked.
- **Where:** packed into my scratchpad, not the repo, and deleted after the checks.
- **Its `package.json`** is as pnpm writes it: version 0.6.0, no `prepublishOnly`.

**As a user would,** in a throwaway project outside the repo. The tarball is unpacked there, with decimal.js and Node's types linked from the copies installed here, so nothing was downloaded.

**The README's eight examples,** run from the packed README, each print exactly their Output block:
- one distribution
- the clawback
- each LP's share
- classes and later closes
- a management fee schedule
- carry deal by deal
- a fee on invested capital, the new one
- the refusal

**The four case examples' inputs** are their cases' exactly. I captured what each gives `readFund` and compared it with `inputs.json`: case 26's, case 31's, case 34's and case 33's, and the new one's, case 38's.

**The exports** are the eleven the API test pins: `D`, `FundRefusal`, `equalization`, `feeCalls`, `findBreakpoints`, `netInvestedCapital`, `portfolio`, `readFund`, `splitAt`, `splitAtNav`, `toCents`.

**A TypeScript file typechecks clean** under `nodenext`, with the package's declarations checked too (TypeScript 7.0.2):
- **What it uses:** `FeeBasis`, in a `Record<FeeBasis, string>` naming both words, so a third would fail to compile. Also `FeeStep`, its `basis` included, `ManagementFee`, `Fund`, `feeCalls` and `netInvestedCapital`.
- **What it reads:** cases 29, 38, 39 and 40, each step's rate, basis and date, the fee calls and their total, and the net invested capital.
- **What it builds:** a `Fund` by hand from case 40, its one step a `FeeStep` on commitments, with $2,000,000 of commitments.
- **Run,** it prints:
  - **Case 29:** 2% on commitments, 1.5% on commitments from 2026-02-15; 22 calls, $4,225,000.00; $0 invested.
  - **Case 38:** 2% on commitments, 1.5% on invested capital from 2023-01-01; 18 calls, $1,432,461.39; $7,000,000.
  - **Case 39:** 2% on commitments, 1.75% on invested capital from 2023-04-01; 8 calls, $759,404.86; $6,500,000.
  - **Case 40:** 2% on invested capital; 3 calls, $91,781.42; $0.
  - **Case 40 by hand, on commitments:** $40,000.00 for each of 2022 to 2025.
- **The check is real:** a second file fails with exactly its three errors:
  - a `FeeStep` built as 0.5.0 built it ("Property 'basis' is missing")
  - `"net"` given to a `FeeBasis`
  - `netInvestedCapital(…)` given to a `string`

**All 41 fund case folders on the packed build:** 35 cases and 153 refusals, 7,536 checks, none failed.
- **What each case's checks cover:** as f05d checked them, plus `netInvestedCapital(fund)` on every case.
  - **The check:** it must equal, exactly, the investments table's cost made less its cost realized, from `expected.json`, or zero without investments. The case files don't give the figure itself.
  - **The figures:** $7,000,000 for case 38, $6,500,000 for case 39 and $0 for case 40.
- **The checker:** f05d's, with 0.6.0's check added.
  - **Eight tamperings:** one expected value changed in memory at a time fails exactly one check, eight times over: f05d's seven, and case 38's Q3 2023 call off in its exact value.
  - **A ninth:** case 40's cost realized set to 0 fails two, its own and the net invested capital.

**Nothing changes without a step on invested capital, digit for digit,** against 0.5.0's packed build:
- **0.5.0's build:** f05d's unpacked 0.5.0 tarball, still in an earlier scratchpad. Its `dist/` and README are identical to a fresh build of the `fund-v0.5.0` tag.
- **What I compared:** the two packed builds on cases 01 to 37's 32 run cases.
  - **The splits:** each case's points and 200 more X, as is and final.
  - **The rest:** its breakpoints and their reasons, the NAV split, the fee calls, the equalization, the investments table, and the fund as read, each step's new `basis` aside. Every amount compared as its full 40-digit string.
- **Twice more for cases 29, 30, 31 and 36:**
  - **Named:** each step written `"basis": "commitments"` (FA63).
  - **By hand:** a `Fund` whose steps have no `basis`, as JavaScript built for 0.5.0 would make (FA67).
- **The result:** 40 funds, 16,688 comparisons, none differ. Case 34's NAV moved in its 18th decimal gives two differences, its NAV split and the fund as read, so the check is real.
- **The 138 earlier refusals:** 137 are refused alike. The other is fund-32's `fee-step-basis`, unsupported in 0.5.0 and `missing_field` at `investments` in 0.6.0, as F40 says and f06b found.

## 4. Tests and CI

What CI runs, `pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference`, passes, the suites one at a time:

| Suite | Before (main) | Now |
|---|---:|---:|
| Fund page | 823 | 827 |
| Fund package | 2,115 (13 skipped) | 2,115 (13 skipped) |
| Engine | 3,177 | 3,177 |
| Main page | 680 | 680 |

**Both references pass:**
- **spillpoint's:** its 73 unit tests and its cases.
- **The fund's:** its 125 unit tests and all 41 fund case folders.

**The built page** carries version 0.6.0 for its footer: `apps/fund/dist` has `fundVersion: 0.6.0`.

## 5. CI and permissions (hard rule 9)

Nothing in `.github/workflows/` or `.claude/`.

## How to check it on your machine

```bash
pnpm install
```

**The page.** Run the fund page:

```bash
pnpm --filter @spillpoint/fund dev
```

- **The footer** reads "spillpoint-fund 0.6.0".
- **"A fee that moves to invested capital"** from the picker: the headline's terms line ends "management fee 2% a year on commitments from 1 Jan 2020, 1.5% on invested capital from 1 Jan 2023, called quarterly."
- **"A management fee schedule"** (case 29): its line has no "on" anywhere.
- **Open case 40's `inputs.json`** with `"commitments": "2000000"` added to its `management_fee`, and save it. The saved file has the commitments back. On Terms, "The LPs' total commitments" isn't asked for.

**The pack.** From `packages/fund`:

```bash
pnpm pack --dry-run
```

It should list `spillpoint-fund@0.6.0` and the 31 files in §3. For the shasum, run `pnpm pack`, then `shasum spillpoint-fund-0.6.0.tgz`, then delete the tarball. It should be `69797ad79fe08a5164bcd43d3e50be4ca7faa8f8`.

**The README's new example,** from `packages/fund`, against the sources:

```bash
node -e '
import("./src/index.ts").then(({ feeCalls, netInvestedCapital, readFund, toCents }) => {
  const { fund } = JSON.parse(require("fs").readFileSync("cases/fund-38-fees-on-invested-capital/inputs.json"));
  const f = readFund(fund);
  for (const c of feeCalls(f).filter((c) => c.date >= "2023-01-01")) console.log(c.date, toCents(c.call));
  console.log(toCents(netInvestedCapital(f)));
})'
```

It prints 2023-01-01 44550.00, 2023-04-01 48303.30, 2023-07-01 44388.59, 2023-10-01 37125.00, 2024-01-01 32107.01 and 2024-04-01 25987.50, then 7000000.00.

## After merging: what you do

1. **The next deploy** (the merge to main runs it) updates the page at `spillpoint.github.io/spillpoint/fund/`, its footer reading "spillpoint-fund 0.6.0".
2. **Publish,** from `packages/fund`:

   ```bash
   pnpm publish
   ```

   Its `prepublishOnly` builds and runs the tests first.
3. **Tag** `fund-v0.6.0`.
4. **Make the GitHub release** "spillpoint-fund 0.6.0" from `notes/release-fund-0.6.0.md`, with `--latest=false`, so the engine's release stays the repo's latest:

   ```bash
   gh release create fund-v0.6.0 --title "spillpoint-fund 0.6.0" --notes-file notes/release-fund-0.6.0.md --latest=false
   ```

## Assumptions added

None in `ASSUMPTIONS.md`. On the page, both changes are your answers.
- **A step at 0% names its base,** as every step does once one is on invested capital.
- **"An amount above zero"** is read as the field reads it when shown: "$2M" and "2,000,000" are kept as 2000000.

## Open questions

1. **Commitments beside listed LPs,** in a file. With listed LPs the page never writes a schedule's `commitments`, as in 0.4.0, so a file that gives them, equal to the LPs' total as the engine requires, saves without them. The fund is the same: the LPs' commitments are the base, and the total is only checked against them. But the file changes, as it did for answer 3. Keep it, or write them back too when they're the LPs' total?

## Your answers (f06d review)

1. **Commitments beside listed LPs stay out of a saved file,** as in 0.4.0: they only repeat the LPs' total, which the LPs tab holds, and a copy written back would go stale, and be refused, the moment an LP's commitment changes; without LPs, answer 3's number exists nowhere else.

## The fix-up (f06d review)

- **The release note's case 38 line** reads "A new investment, an exit and a write-off", since Dogwood Labs is a new investment, not a follow-on, as the README says. Nothing in the package changed, so the tarball and its shasum are the same.
