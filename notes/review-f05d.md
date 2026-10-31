# Review: f05d (spillpoint-fund 0.5.0)

Branch `f05d-fund-release-0.5.0`, from main after #130. The release step of spillpoint-fund 0.5.0: a fund's investments, their table on either basis, and carry deal by deal.

**Nothing in `packages/engine`, `packages/fund/src`, `packages/fund/reference`, `apps/`, any cases or `reference/` changed:** `git diff --stat main --` over those prints nothing. No case file changed, so this PR doesn't need the cases label.

| Commit | What |
|---|---|
| `f775d47` | the release: the version, the README, the release note, the repo README and `CLAUDE.md` (§1) |
| the last | this note |

## 1. The release

- **`packages/fund/package.json`** at 0.5.0, so the page's footer says "spillpoint-fund 0.5.0" too. `files` is unchanged.
- **The package's README:**
  - **Its opening** adds a fund's investments, their checks, exits and write-offs, and carry deal by deal.
  - **A new worked example, "carry deal by deal",** from case 34, after the fee schedule's.
    - **The code:** `portfolio(fund)`, then `splitAt` at 0 and at 12,000,000 deal by deal, then the same fund on the whole fund, case 33, built from the same input with `carry_basis` taken out.
    - **The output:**
      - the three investments: Alder Robotics at 3x, Birch Health written off at 0x, Cedar AI "none yet"
      - deal by deal, $11,100,000.00 due before carry at both X; the GP's carry to date $1,116,000.00 at X = 0, Alder's exit's, and $1,938,000.00 in all at $12,000,000
      - on the whole fund, no carry to date at X = 0, and the same $1,938,000.00 at $12,000,000
    - **The text says why:**
      - Alder's exit returns its cost's 99%, $2,970,000, and its 30% share of the fees, $360,000, then pays $1,116,000 of carry
      - on the whole fund the same exit pays none
      - Birch's write-off already made its cost due, so what's due on X is all $11,100,000 and doesn't change with X
      - both bases come to the same carry in all, and the clawback covers what later write-offs undo
    - **Where it comes from:** the output is as the packed build prints it, and both inputs are their cases' exactly (§2).
  - **"What it covers"** is for 0.5.0. Its first line reads "on the whole fund (European) by default, or deal by deal". It gains two bullets:
    - **Investments:** checks and follow-ons, exits naming the investment and the share sold, write-offs, and `portfolio(fund)` on either basis.
    - **Carry deal by deal:** the cost of what's exited or written off, with its share of fees and expenses, before carry; everything paid in at the end; the clawback the whole fund's; `Split.due`.
  - **"What it doesn't model yet":**
    - **Out:** "American (deal-by-deal) carry".
    - **In:** a "Deal by deal beyond these" bullet with F35's Later lines, as you listed them. It says a pref with carry deal by deal is refused as `deal_by_deal_pref`.
  - **"How it's tested":** 32 worked cases and 138 refusals. Four of the cases and fifty-five of the refusals are about investments and carry deal by deal.
  - **Inputs, API and stable names** were already 0.5.0's from f05b1 and f05b2.
- **`notes/release-fund-0.5.0.md`,** in the 0.4.0 note's style:
  - **What's new:**
    - the input's `carry_basis`, `investments`, a distribution's `investment` and `share`, the `"write_off"` type, and `distribution_from`
    - `fund.terms.carryBasis` (`CarryBasis`), `fund.investments` (`Investment`, `InvestmentCheck`), a cash flow's `investment` and `share`, and `fund.distributionFrom` (`DistributionFrom`)
    - `portfolio(fund)` (`PortfolioRow`)
    - F35's rule
    - `Split.due` and `AccountSplit.due` (`Due`, `AccountDue`)
    - `capital_returned`'s amount and wording deal by deal
    - the four new input terms, and `deal_by_deal_pref`
    - the page's "Carry is paid", the Investments tab, From and Share sold on Cash flows and beside X, the due under the split and on the classes card, the NAV line, files, and case 34 in the picker
  - **Upgrading from 0.4.0:** your three points.
    - **The whole fund, digit for digit:** a fund on the whole fund splits as in 0.4.0, investments or not. I checked that on the two packed builds (§2).
    - **The widened types:** `CashFlow.type` gains `"write_off"`, and `CashFlow.amount` is `D | null`.
    - **A `Fund` built by hand** needs FA61's fields.
  - **Stable names:** the 0.4.0 note's shape: nothing renamed, two types widened, and what 0.5.0 adds.
  - **How it was checked, "independently,"** in your numbers, as the 0.4.0 note words it.
  - **Not modeled yet:** F35's Later lines first, then 0.4.0's list without "American (deal-by-deal) carry". See open question 1.
- **The repo README's fund section** says what 0.5.0 adds, and the npm line reads 0.5.0.
- **`CLAUDE.md`'s "Where things stand"** names spillpoint-fund 0.5.0 and its release note. It gives investments with `portfolio(fund)`, carry deal by deal (F33 to F37), the page's parts, and `fund-v0.5.0`.

## 2. The packed build

**What would be published,** from `packages/fund`, `pnpm pack --dry-run`: `spillpoint-fund@0.5.0`, 31 files. That's 0.4.0's 29 and one new module, `portfolio`:
- `package.json`, `README.md`, `LICENSE`
- `dist/`, each as `.js` and `.d.ts`:
  - `index`, `breakpoints`, `dates`, `decimal`, `equalization`, `errors`, `fees`
  - `input`, `model`, `reasons`, `schedule`, `stable-names`, `waterfall`
  - and, new, `portfolio`

**The tarball:**
- **shasum:** `7e30702fc20fcf5151d101e7d94613110ba7a633`. Three packs gave the same one.
- **Size:** 63,236 bytes packed, 221,460 unpacked.
- **Where:** packed into my scratchpad, not the repo, and deleted after the checks.
- **Its `package.json`** is as pnpm writes it: version 0.5.0, no `prepublishOnly`.

**As a user would,** in a throwaway project outside the repo. The tarball is unpacked there, with decimal.js and Node's types linked from the copies installed here, so nothing was downloaded.

**The README's seven examples,** run from the packed README, each print exactly their Output block:
- one distribution
- the clawback
- each LP's share
- classes and later closes
- a management fee schedule
- carry deal by deal, the new one
- the refusal

**The three case examples' inputs** are their cases' exactly. I captured what each gives `readFund` and compared it with `inputs.json`: case 26's, case 31's, and the new one's two, case 34's then case 33's.

**The exports** are the ten the API test pins: `D`, `FundRefusal`, `equalization`, `feeCalls`, `findBreakpoints`, `portfolio`, `readFund`, `splitAt`, `splitAtNav`, `toCents`.

**A TypeScript file typechecks clean** under `nodenext`, with the package's declarations checked too (TypeScript 7.0.2):
- **What it uses:** `CarryBasis`, `Investment`, `InvestmentCheck`, `DistributionFrom`, `CashFlow`, `PortfolioRow`, `Due`, `AccountDue` and `Split`.
- **What it reads:**
  - case 36's `carryBasis`, its investments and checks, and X's source
  - its write-off's `amount` as `D | null`, null, with distributions added up past it
  - `portfolio(fund)`'s rows
  - `Split.due` and each `AccountSplit.due`
  - `splitAtNav`'s due
- **What it builds:** a `Fund` by hand with FA61's fields.
- **Run,** it prints:
  - case 36's three investments and their table: Ivy Analytics at 2, Juniper Health written off, Kapok Robotics "none"
  - the due at X = 0, $10,069,750.00, and each class's: $5,240,500.00, $2,968,050.00 and $1,861,200.00
  - $12,855,000.00 at NAV
  - a null due on the whole fund (case 33)
  - `unsupported deal_by_deal_pref terms.pref` for a refused input
- **The check is real:** a second file fails with exactly its three errors:
  - a cash flow's `amount` given to a `D`, though it can be null
  - `splitAt(…).due` given to a `Due`, though it can be null
  - a `Fund`'s terms built as 0.4.0 built them ("Property 'carryBasis' is missing")

**All 37 fund case folders on the packed build:** 32 cases and 138 refusals, 6,368 checks, none failed.
- **What each case's checks cover:** as f04d checked them, plus 0.5.0's:
  - **the investments table:** each row's name, cost made, cost realized, cost written off and proceeds, to the cent and within 10^-24 of exact; its realized multiple, or null
  - **what's due:** at every point, its cost made and realized, cost, fees and expenses and total, and `uninvested` zero where the case gives none; on the whole fund, none
  - **each account's due,** the same way. Case 36's NAV point is read `final`, as the case gives it.
- **The checker:** f04d's, with 0.5.0's checks added. One expected value changed in memory at a time fails exactly one check, seven times over: f04d's five, case 34's due total, and Dogwood Labs' realized multiple in case 35.

**The whole fund, digit for digit, against 0.4.0's tarball:**
- **What I compared:** f04d's unpacked 0.4.0, still in an earlier scratchpad, against this 0.5.0, both packed builds.
- **Cases 01 to 32:** each case's points and 200 more X, as is and final, plus its breakpoints and NAV split. 0.5.0's split was cut to 0.4.0's fields, and every amount compared as its full 40-digit string, with `due` checked null.
- **Case 33,** read by 0.4.0 without its investments, tags and write-off, and by 0.5.0 with them.
- **The result:** 29 funds, 11,974 comparisons, none differ. A NAV changed in its 18th decimal gives one difference, so the check is real.

## 3. Tests and CI

What CI runs, `pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference`, passes, the suites one at a time since #130:

| Suite | Before | Now |
|---|---:|---:|
| Fund page | 751 | 751 |
| Fund package | 1,871 (10 skipped) | 1,871 (10 skipped) |
| Engine | 3,177 | 3,177 |
| Main page | 680 | 680 |

**Both references pass:**
- **spillpoint's:** its 73 unit tests and its cases.
- **The fund's:** its 114 unit tests and all 37 fund case folders.

**The whole run** took 336 seconds here, with no timeouts.

**The built page** carries version 0.5.0 for its footer: `apps/fund/dist` has `fundVersion: 0.5.0`.

## 4. CI and permissions (hard rule 9)

Nothing in `.github/workflows/` or `.claude/`.

## How to check it on your machine

```bash
pnpm install
```

**The page's footer.** Run the fund page:

```bash
pnpm --filter @spillpoint/fund dev
```

The footer reads "spillpoint-fund 0.5.0". "A fund that pays carry deal by deal" is in the picker, as #130 left it.

**The pack.** From `packages/fund`:

```bash
pnpm pack --dry-run
```

It should list `spillpoint-fund@0.5.0` and the 31 files in §2. For the shasum, run `pnpm pack`, then `shasum spillpoint-fund-0.5.0.tgz`, then delete the tarball. It should be `7e30702fc20fcf5151d101e7d94613110ba7a633`.

**The README's new example,** from `packages/fund`, against the sources:

```bash
node -e '
import("./src/index.ts").then(({ portfolio, readFund, splitAt, toCents }) => {
  const { fund } = JSON.parse(require("fs").readFileSync("cases/fund-34-deal-by-deal/inputs.json"));
  const f = readFund(fund);
  for (const r of portfolio(f)) console.log(r.name, toCents(r.costRealized), toCents(r.proceeds));
  for (const x of ["0", "12000000"]) { const s = splitAt(f, x); console.log(x, toCents(s.due.total), toCents(s.toDate.gp.total)); }
})'
```

It prints Alder Robotics 3000000.00 9000000.00, Birch Health 3000000.00 0.00, Cedar AI 0.00 0.00, then 0 11100000.00 1116000.00, and 12000000 11100000.00 1938000.00.

## After merging: what you do

1. **The next deploy** (the merge to main runs it) updates the page at `spillpoint.github.io/spillpoint/fund/`, its footer reading "spillpoint-fund 0.5.0".
2. **Publish,** from `packages/fund`:

   ```bash
   pnpm publish
   ```

   Its `prepublishOnly` builds and runs the tests first.
3. **Tag** `fund-v0.5.0`.
4. **Make the GitHub release** "spillpoint-fund 0.5.0" from `notes/release-fund-0.5.0.md`, with `--latest=false`, so the engine's release stays the repo's latest:

   ```bash
   gh release create fund-v0.5.0 --title "spillpoint-fund 0.5.0" --notes-file notes/release-fund-0.5.0.md --latest=false
   ```

## Assumptions added

None.

## Open questions

1. **Two lines that overlap in "Not modeled yet",** in the README and the release note. The new deal-by-deal line has "an interim clawback, and carry escrow", from F35's Later. The whole fund's older line still says "An after-tax clawback cap, a carry holdback or escrow, and interim clawback tests". I kept both, since the old one is about the whole fund too. Or fold escrow and the interim clawback into one line?
