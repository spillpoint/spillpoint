# Review: f04d (spillpoint-fund 0.4.0)

Branch `f04d-fund-release-0.4.0`, from main after #125. The release step of spillpoint-fund 0.4.0: management fees, entered as fee calls or worked out by a schedule, and fee calls at a later close each LP's own.

**Nothing in `packages/engine`, `packages/fund/src`, `packages/fund/reference`, `apps/dashboard`, any cases or `reference/` changed:** `git diff --stat main --` over those prints nothing. No case file changed, so this PR doesn't need the cases label.

| Commit | What |
|---|---|
| `6636ee3` | the first commit: the headline's terms line names the schedule (§1) |
| `925264f` | the release: the version, the README, the release note, the repo README and `CLAUDE.md` (§2) |
| `94bcb12` | this note |
| `60ae5b7` | outside the fund rule, with your OK: the main page's two round-trip tests get a timeout of their own (§6) |
| the last | the same, with your second OK, for `ocf-check`'s note-base-unreadable test (§6) |

## 1. The first commit (your answer 3)

**With a schedule, the headline's terms line names it** after the GP commitment, in your words:
- **Case 29:** "Carry 20%; pref 8%, full catch-up; GP commitment 1%, fee-free; management fee 2% a year from 15 Feb 2021, 1.5% from 15 Feb 2026, called quarterly."
- **Case 30:** "…; GP commitment 2%, paying its share of fees; management fee 2% a year from 1 Jul 2020, 1.5% from 1 Mar 2022, called half-yearly."
- **One step, case 31:** "…; management fee 2% a year from 1 Jan 2022, called quarterly." Its classes follow, as before.
- **Fees entered as calls,** case 26: nothing added.
- **"Called"** reads as the Terms tab's picker does: quarterly, half-yearly or yearly.

The tests are in `apps/fund/test/fees.test.tsx`: your two cases, 29 and 30, and also 31 and 26. The plan's 0.4.0 Payouts section has the line, marked "From f04d".

## 2. The release

- **`packages/fund/package.json`** at 0.4.0, so the page's footer says "spillpoint-fund 0.4.0" too. I checked it in the built page. `files` is unchanged.
- **The package's README:**
  - **Its opening** adds management fees from a schedule, and back fees at a later close.
  - **Case 26's worked example, redone under F29.** The same input. The code now prints each LP's back fees too.
    - **The output:** the fund terms' paid-in is $4,050,000. Birchwood pays $666,666.67 and $9,863.01 at its close, with $50,000.00 of back fees.
    - **The text says why:** the January 2022 fee call counts at $150,000, and the fund terms need $5,400,000 to have their capital back. Fees aren't rebalanced, so Birchwood pays its back fees to the manager.
  - **A new worked example, "a management fee schedule,"** from case 31.
    - **`feeCalls`:** the first quarter's $70,000.00, of it Alder's $50,000.00, Cedar's $0.00 and Dogwood's $20,000.00.
    - **`equalization(fund)`:** each LP's capital, interest and back fees. Dogwood pays $1,600,000.00 and $68,383.56, with $60,000.00 of back fees.
    - **The text** explains the fees and that the schedule's calls are every LP's own.
  - **Where the outputs come from:** both are as the packed build prints them (§3), and both inputs are their cases' exactly.
  - **"What it covers"** is for 0.4.0, with your wording:
    - management fees, entered as calls or from a schedule: a rate on commitments, steps by date, quarterly, half-yearly or yearly
    - fee calls at a later close each LP's own, with back fees to the manager
    - the later closes' line now says only investment and expense calls are rebalanced
  - **"What it doesn't model yet"** adds F29's and F30's Later lines, in two bullets:
    - fees on invested capital, gross or net; anniversary periods; fees in arrears; offsets and waivers; a class's fee step that isn't proportional; an LP's own fee start
    - interest on back fees; back fees paid to the fund
  - **"How it's tested":** 28 worked cases and 83 refusals. Three of the cases and thirty-seven of the refusals are about management fees, with two of 0.3.0's cases worked again.
- **`notes/release-fund-0.4.0.md`,** in the 0.3.0 note's style:
  - **What's new:**
    - the input's `management_fee`
    - `fund.terms.managementFee` (`ManagementFee`, `FeeStep`, `FeeFrequency`)
    - `feeCalls(fund)` (`FeeCall`, `LpFee`)
    - F29's fee calls at a later close
    - `EqualizationAmounts.backFees` and a nullable `Equalization.rate`
    - the three new input terms, and `call_without_payers` at `terms.management_fee`
    - the schedule's unsupported keys
    - the page's Management fee, the schedule's calls on Cash flows, the Back fees column, the headline and summary lines, and case 29 in the picker
  - **The fix:** 0.3.0's known limitation, fixed by F29. Cases 25 and 26 now have paid-ins of $7,060,000 and $5,300,000, and back fees of $20,000 and $50,000. Birchwood's capital and interest at its close change too.
  - **Upgrading from 0.3.0:** your four points. It adds that a fund with no schedule and no fee call before a later close splits as 0.3.0 did, digit for digit. f04b checked that against main on 392 funds.
  - **How it was checked, "independently,"** in your numbers, as the 0.3.0 note words it.
  - **Not modeled yet:** the fees' Later lines first, then 0.3.0's list. The "fee break that isn't proportional" moved from the classes' line to the fees' one.
- **The repo README's fund section** says what 0.4.0 adds, and the npm line reads 0.4.0.
- **`CLAUDE.md`'s "Where things stand"** names spillpoint-fund 0.4.0, its release note, management fees and back fees, the page's parts, and `fund-v0.4.0`.

## 3. The packed build

**What would be published,** from `packages/fund`, `pnpm pack --dry-run`: `spillpoint-fund@0.4.0`, 29 files. That's 0.3.0's 25 and two new modules, `fees` and `schedule`:
- `package.json`, `README.md`, `LICENSE`
- `dist/`, each as `.js` and `.d.ts`:
  - `index`, `breakpoints`, `dates`, `decimal`, `equalization`, `errors`
  - `input`, `model`, `reasons`, `stable-names`, `waterfall`
  - and, new, `fees` and `schedule`

**The tarball:**
- **shasum:** `77592c7bb036e8b91a1d0f40530b20a8767a1eda`. Three packs gave the same one, and a fourth after the release commit did too.
- **Size:** 52,301 bytes packed, 179,766 unpacked.
- **Where:** packed into my scratchpad, not the repo, and deleted after the checks.
- **Its `package.json`** is as pnpm writes it: version 0.4.0, no `prepublishOnly`.

**As a user would,** in a throwaway project outside the repo. The tarball is unpacked there, and decimal.js linked from the copy installed here, so nothing was downloaded.

**The README's six examples,** run from the packed README, each print exactly their Output block:
- one distribution
- the clawback
- each LP's share
- classes and later closes, redone under F29
- a management fee schedule, the new one
- the refusal

**The two case examples' inputs** are their cases' exactly: I captured what each gives `readFund` and compared it with `inputs.json`.

**The exports** are the nine the API test pins: `D`, `FundRefusal`, `equalization`, `feeCalls`, `findBreakpoints`, `readFund`, `splitAt`, `splitAtNav`, `toCents`.

**A TypeScript file typechecks clean** under `nodenext`, the package's declarations checked too (TypeScript 7.0.2):
- **What it uses:** every exported type, `ManagementFee`, `FeeStep`, `FeeFrequency`, `FeeCall` and `LpFee` among them.
- **What it reads and builds:**
  - case 31's `managementFee`: its frequency, steps and commitments
  - `feeCalls`, as `FeeCall[] | null`, with each call's days, amounts and `byLp`
  - `backFees`
  - `Equalization.rate` as `D | null`, null for a fund whose later close has only a fee call before it
  - a `Fund` built by hand with `managementFee: null`
- **Run,** it prints:
  - case 31's 16 fee calls, the first $70,000.00, and Dogwood's $60,000.00 of back fees
  - for the fee-only fund, a null rate and Cedar's $26,666.67 of back fees
  - `fee_rate_with_schedule`, for a refused input
- **The check is real:** a second file fails with exactly its three errors:
  - a `Fund`'s terms built as 0.3.0 built them ("Property 'managementFee' is missing")
  - `Equalization.rate` given to a `D`
  - `feeCalls(fund)` given to a `FeeCall[]`, though it can be null

**All 32 fund case folders on the packed build:** 28 cases and 83 refusals, 4,847 checks, none failed.
- **What each case's checks cover:** as f03d checked them, plus 0.4.0's:
  - **each fee call:** its date and the days it covers; its call, the LPs' part and the GP commitment's, to the cent and within 10^-24 of exact; and each LP's fee, the same way
  - **back fees:** in every equalization row, at each close and over all of them
  - **the equalization rate:** null where the case's is null
- **The checker:** f03d's, with 0.4.0's checks added. One expected amount changed in memory at a time fails exactly one check, five times over:
  - an LP's amount in case 18
  - Alder's interest in case 26
  - the seed class's GP in case 28
  - case 29's last fee call
  - Dogwood's back fees in case 31, in the 12th decimal

## 4. Tests and CI

What CI runs, `pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference`, passes:

| Suite | Before | Now | Changed |
|---|---:|---:|---|
| Fund page | 597 | 600 | the headline's terms line on cases 29, 30, 31 and 26 |
| Fund package | 1,310 (9 skipped) | 1,310 (9 skipped) | |
| Engine | 3,177 | 3,177 | |
| Main page | 680 | 680 | |

**Both references pass:**
- **spillpoint's:** its 73 unit tests and its cases.
- **The fund's:** its 92 unit tests and all 32 fund case folders.

## 5. CI and permissions (hard rule 9)

Nothing in `.github/workflows/` or `.claude/`.

## 6. Outside the fund rule, with your OK: the main page's two round-trip tests

**One change in `apps/dashboard`, to one test file,** because main's CI is red and f04d's would be too. `apps/dashboard/test/add-a-round.test.tsx`'s two round trips, case 26's ("Quillfern imported, …") and case 27's ("Larkspur imported, …"), take a timeout of 60 seconds as `it()`'s third argument.
- **The comment says why:** each imports a company, builds a round, saves, opens the file again and checks every breakpoint twice. Beside the other suites in the workspace's parallel run they take 15 to 25 seconds on GitHub's runners.
- **Nothing else in `apps/dashboard` changed:** no product code, no other test, no workflow. `vite.config.ts`'s 20-second default stays for every other test.
- **Not in the package:** `apps/` isn't published, so the tarball's shasum is unchanged, `77592c7bb036e8b91a1d0f40530b20a8767a1eda`.

**Your timings on GitHub:** case 27's round trip ran 21.0 s on #125's first PR run. On main after #125 merged, it timed out on both jobs on the first try, and on test-node-22 again on the re-run, the last at 23.4 s. Case 26's took 15.5 s.

**Here, in the workspace's parallel run:** a full `pnpm test` doesn't print each test's time. So I ran the same four suites the same way, with `pnpm -r exec vitest run --reporter=verbose`, twice:

| Test in `add-a-round.test.tsx` | Run 1 | Run 2 |
|---|---:|---:|
| case 26's round trip | 23.4 s | 23.5 s |
| case 27's round trip | 10.3 s | 7.5 s |
| case 26's "edits the starting table on the Cap table tab, …" | 14.8 s | 19.0 s |
| case 26's "keeps the starting table first, …" | 4.6 s | 4.8 s |

So case 26's round trip is the slower one here, and both runs would have timed it out at 20 s. Both pass at 60.

**Left as it is:** "edits the starting table" has no timeout of its own, as you said. It came to 19.0 s in run 2, a second under the default.

**`ocf-check.test.ts`'s "ocf-04-to-fill/note-base-unreadable.ocf.json: no name, id, amount or date"** timed out at 20 s in three of my five parallel runs here: 23.6, 23.4 and 29.3 s. It did once in f04c's run too. I left it in the first commit, and in a second, with your second OK, it got a timeout of its own (below).

**Three full `pnpm test` runs here, with the change:**
- **Run 1** failed case 26's round trip inside it, not at its timeout: after 17.3 s, `importQuillfern`'s wait for the import's "Importing" panel ran out. That wait is the page's 15-second `asyncUtilTimeout`, so the 60-second timeout wouldn't have helped there.
- **Run 2** passed all of every suite.
- **Run 3** failed only `ocf-check`'s test, above.
- **Every other suite** passed in all three: fund package 1,310 (9 skipped), engine 3,177, fund page 600.

**Then, with your second OK: `ocf-check`'s note-base-unreadable test, a timeout of its own.**
- **Why it's slow:** it's one row of the leak check's `it.each` over every OCF case and fixture, and the first of `ocf-04-to-fill`'s fixtures. So it runs the searches over Larkspur's filled table, which the fixtures after it share through `engineRuns`. Alone it takes 2.4 s, its next fixture 1.2 s and every other row under 0.6 s.
- **The change:** the `it.each` became a `for` loop over the same rows, in the same order, with the same names and the same body, so that this one row could have a 60-second timeout. A comment says why. Every other row keeps the 20-second default.
  - **Why not `it.each` with a third argument:** that would give every row the timeout.
  - **Why the same order:** the searches have to stay in this row. Moved after the others, the next fixture would run them, and be the slow one.
- **The file still has its 150 tests,** with the same names.
- **Nothing else** in `apps/dashboard` changed.

**Two more parallel runs here, with both changes,** both passing every suite:

| Test | Run 3 | Run 4 |
|---|---:|---:|
| `ocf-check`'s note-base-unreadable | 20.6 s | 15.0 s |
| case 26's round trip | 26.0 s | 13.5 s |
| case 26's "edits the starting table" | 11.3 s | 10.8 s |
| case 27's round trip | 7.0 s | 8.3 s |

A full `pnpm test` then passed every suite too: fund package 1,310 (9 skipped), engine 3,177, fund page 600, main page 680.

## How to check it on your machine

```bash
pnpm install
```

**The headline.** Run the fund page and pick "A fund with a 2% fee schedule":

```bash
pnpm --filter @spillpoint/fund dev
```

- **The headline's terms line,** at the top of Payouts, reads "…GP commitment 1%, fee-free; management fee 2% a year from 15 Feb 2021, 1.5% from 15 Feb 2026, called quarterly."
- **Open case 30** (`packages/fund/cases/fund-30-fee-step-down/inputs.json`, "Open a file"): "…called half-yearly."
- **Pick "Two later closes and a friends-and-family class":** no management fee in the line.
- **The footer** reads "spillpoint-fund 0.4.0".

**The pack.** From `packages/fund`:

```bash
pnpm pack --dry-run
```

It should list `spillpoint-fund@0.4.0` and the 29 files in §3. For the shasum, run `pnpm pack`, then `shasum spillpoint-fund-0.4.0.tgz`, then delete the tarball. It should be `77592c7bb036e8b91a1d0f40530b20a8767a1eda`.

**The README's new example,** from `packages/fund`, against the sources:

```bash
node -e '
import("./src/index.ts").then(({ equalization, feeCalls, readFund, toCents }) => {
  const { fund } = JSON.parse(require("fs").readFileSync("cases/fund-31-fee-schedule-classes-closes/inputs.json"));
  const f = readFund(fund);
  const [first] = feeCalls(f);
  console.log(first.date, toCents(first.call), first.byLp.map((lp) => toCents(lp.fee)).join(" "));
  for (const lp of equalization(f).lps) console.log(lp.name, toCents(lp.capitalPaid), toCents(lp.interestPaid), toCents(lp.backFees));
})'
```

It prints 2022-01-01 70000.00 50000.00 0.00 20000.00, then Alder 0.00 0.00 0.00, Cedar 0.00 0.00 0.00, and Dogwood 1600000.00 68383.56 60000.00.

## After merging: what you do

1. **The next deploy** (the merge to main runs it) updates the page at `spillpoint.github.io/spillpoint/fund/`, its footer reading "spillpoint-fund 0.4.0".
2. **Publish,** from `packages/fund`:

   ```bash
   pnpm publish
   ```

   Its `prepublishOnly` builds and runs the tests first.
3. **Tag** `fund-v0.4.0`.
4. **Make the GitHub release** "spillpoint-fund 0.4.0" from `notes/release-fund-0.4.0.md`, with `--latest=false`, so the engine's release stays the repo's latest:

   ```bash
   gh release create fund-v0.4.0 --title "spillpoint-fund 0.4.0" --notes-file notes/release-fund-0.4.0.md --latest=false
   ```

## Assumptions added

None. The headline's wording is yours, in the plan.

## Open questions

None.
