# Review: f02d (spillpoint-fund 0.2.0)

Branch `f02d-fund-release-0.2.0`, from main. The release step for 0.2.0, as f01n was for 0.1.0, with your width gap and the examples' labels first.

**Nothing in `packages/engine`, `apps/dashboard`, any cases or either reference changed:** `git diff --stat main -- packages/engine apps/dashboard cases reference packages/fund/cases packages/fund/reference` prints nothing.

## 1. The first commit: the labels, and the tabs at 320

**The examples' labels** are yours (f02c review, answer 1):
- "A VC fund with premium carry and three LPs: 20%, then 25% from 3x and 30% from 5x"
- "A late call, a clawback and two LPs"

A saved file is named after the label, so the clawback example saves as `a-late-call-a-clawback-and-two-lps.json`.

**The four tabs on one line down to 320 pixels:**
- **The gap:** at 320 the tabs needed 330 pixels and had 296. Their words take 218, the rest was padding and gaps.
- **The fix:** below 480 pixels the gap goes and each tab's sides are 8 pixels; below 360, 6.
- **Room to spare:** 14 pixels at 320 and 30 below 360, in Chrome's default fonts.
- **They can still wrap,** so a larger font in the browser wraps them rather than scrolling the page sideways.
- **The plan says so** too (`notes/plan-fund-page.md`, "The examples").

**Every width from 320 to 1400, checked headless:**
- **What was checked:** each width, a pixel at a time, on every tab (Payouts, Terms, Cash flows, LPs) of the four examples and a blank fund. At each, the four tabs were on one line, and no page was wider than its window.
- **How:** a headless Chrome driven as `scripts/screenshots.mjs` drives it, against the dev page. The browser pane couldn't do it, since a hidden pane's page gets no frames.
- **The result:** 21,620 checks (1,081 widths, four tabs, five funds), and none failed: the tabs on one line at every width, and no page wider than its window.
- **The check catches the gap:** with this branch's style change set aside for a moment, it found the tabs on two lines at 343, as you saw below 375.

## 2. The release

- **`packages/fund/package.json`** at 0.2.0, so the page's footer says "spillpoint-fund 0.2.0" too. `files` is unchanged.
- **The package's README:**
  - **Its opening** says it gives each LP's share, given the fund's LPs.
  - **A third worked example, "each LP's share":** case 17's input, three LPs at $40,000,000, with its output exactly as the packed build prints it.
  - **"What it covers"** is for 0.2.0, with each LP's share.
  - **"What it doesn't model yet":** per-LP accounts where LPs differ: later closes and equalization, side-letter fee or carry breaks, defaulted or excused LPs.
  - **"How it's tested":** nineteen worked cases and twenty-six refusals, four and eleven about the LPs.
  - **Its inputs, API and stable lists** gained the LPs in f02b.
- **ASSUMPTIONS:**
  - **Under FA2 and FA18:** the integer-key edge, as a known edge.
  - **A new section, "Known edges":** f02b's table, and that both refuse the input. No reference change.
- **`notes/release-fund-0.2.0.md`,** in the 0.1.0 note's style:
  - **What's new:** `lps`, `fund.lps`, `split.byLp`, `lp_name_repeated`, and the page's tab, card and CSV.
  - **"Upgrading from 0.1.0":** the line for TypeScript code that builds a `Fund` by hand, which needs `lps: []`.
  - **How it was checked, independently,** in your numbers:
    - the reference against the separate checker on 1,100 random funds with LPs, 25,004 LP rows exact
    - the engine on 1,200: 177,011 LP rows and 620,354 amounts, with 3,600 faulty LP lists refused the same
    - the page on cases 17 to 20 and 80 random funds at two widths: 8,581 cells of the card, and every CSV byte for byte
- **The repo README's fund section** names 0.2.0 and the LPs: each LP's share, rounded down as paid, and the CSV.
- **`CLAUDE.md`'s "Where things stand"** names spillpoint-fund 0.2.0, its release note, the LPs, and both tags.
- **`scripts/screenshots.mjs`** gains f02d's shots (§4).

## 3. The packed build

**What would be published,** from `packages/fund`, `pnpm pack --dry-run`: `spillpoint-fund@0.2.0`, 23 files, the same as 0.1.0's:
- `package.json`, `README.md`, `LICENSE`
- `dist/`: `index`, `breakpoints`, `dates`, `decimal`, `errors`, `input`, `model`, `reasons`, `stable-names` and `waterfall`, each as `.js` and `.d.ts`

**The tarball:**
- **shasum:** `a2299c8115819221f8fb1e3cb31b976f4f61b2f1`. Three packs gave the same one.
- **Size:** 30,132 bytes packed, 95,952 unpacked.
- **Where:** packed into my scratchpad, not the repo, and deleted after the checks.
- **Its `package.json`** is as pnpm writes it: version 0.2.0, no `prepublishOnly`.

**As a user would,** in a throwaway project outside the repo, with the tarball unpacked and decimal.js linked from the copy installed here, so nothing was downloaded:
- **The README's four examples,** run from the packed README, each print exactly their Output block: one distribution, the clawback, each LP's share, and the refusal.
- **The exports** are the seven the API test pins: `D`, `FundRefusal`, `findBreakpoints`, `readFund`, `splitAt`, `splitAtNav`, `toCents`.
- **A TypeScript file typechecks clean** under `nodenext`, the package's declarations checked too.
  - **What it uses:** every exported type, `Lp` and `LpAmounts` among them. It reads `fund.lps` and each `split.byLp` entry's fields, and builds a `Fund` with `lps: []`.
  - **Run,** it prints case 19's clawback shares, $1,925,000.00 and $825,000.00.
  - **The check is real:** a second file fails with two errors, a Decimal assigned to a string and a `Fund` built without `lps` ("Property 'lps' is missing").
- **All 21 fund case folders on the packed build:** 19 cases and 26 refusals, 1,498 checks, none failed.
  - **Each case:** every top-level amount, every breakpoint to the cent and at its exact value with every reason's code, text and fields, and every point's split and clawback to the cent.
  - **Each LP:** its commitment, share and paid-in, and its amounts at every point, to the cent and within 10^-18 of exact.
  - **Each refusal:** its kind, term and path.
  - **The check itself:** with one expected LP amount changed in memory, one check failed.

## 4. Screenshots

From `pnpm --filter @spillpoint/fund screenshots`, on the built page:

| What | Shot |
|---|---|
| The LPs' card, the clawback example at $0, at 1,100 | [f02d-card-1100](screenshots/f02d-card-1100.webp) |
| The same at 320, each LP a group | [f02d-card-320](screenshots/f02d-card-320.webp) |
| The LPs tab, the premium-carry example, at 1,100 | [f02d-lps-tab-1100](screenshots/f02d-lps-tab-1100.webp) |
| The same at 320, each LP a card | [f02d-lps-tab-320](screenshots/f02d-lps-tab-320.webp) |
| The masthead and the four tabs on one line at 320 | [f02d-tabs-320](screenshots/f02d-tabs-320.webp) |

## 5. Tests and CI

What CI runs, `pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference`, passes:

| Suite | Before | Now | Changed |
|---|---:|---:|---|
| Fund page | 321 | 321 | two tests name the new labels, and the saved file's name that follows them |
| Fund package | 588 | 588 | |
| Engine | 3,177 | 3,177 | |
| Main page | 680 | 680 | |

**Both references pass:** spillpoint's, with its 73 unit tests and 83 cases, and the fund's, with its 39 and 21 cases.

## 6. CI and permissions (hard rule 9)

Nothing in `.github/workflows/` or `.claude/`.

## How to check it on your machine

```bash
pnpm install
```

**The tabs.** Run the fund page and use your browser's device toolbar from 320 to 1400 pixels:

```bash
pnpm --filter @spillpoint/fund dev
```

The four tabs stay on one line at every width, "LPs" included at 320, 340 and 360. The picker reads "A VC fund with premium carry and three LPs: …" and "A late call, a clawback and two LPs".

**The pack.** From `packages/fund`:

```bash
pnpm pack --dry-run
```

It should list `spillpoint-fund@0.2.0` and the 23 files above. For the shasum, run `pnpm pack`, then `shasum spillpoint-fund-0.2.0.tgz`, then delete the tarball. It should be `a2299c8115819221f8fb1e3cb31b976f4f61b2f1`.

**The README's LP example,** from `packages/fund`, against the sources:

```bash
node -e '
import("./src/index.ts").then(({ readFund, splitAt, toCents }) => {
  const { fund } = JSON.parse(require("fs").readFileSync("cases/fund-17-lps-three/inputs.json"));
  for (const lp of splitAt(readFund(fund), "40000000").byLp) console.log(lp.name, toCents(lp.paidIn), toCents(lp.distribution), toCents(lp.toDate));
})'
```

It prints the README's three LP lines' amounts: 5445000.00, 16396875.00, 18376875.00 for Alder Endowment, and so on.

## After merging: what you do

1. **The next deploy** (the merge to main runs it) updates the page at `spillpoint.github.io/spillpoint/fund/`, its footer reading "spillpoint-fund 0.2.0".
2. **Publish,** from `packages/fund`:

   ```bash
   pnpm publish
   ```

   Its `prepublishOnly` builds and runs the tests first.
3. **Tag** `fund-v0.2.0`.
4. **Make the GitHub release** "spillpoint-fund 0.2.0" from `notes/release-fund-0.2.0.md`, with `--latest=false`, so the engine's release stays the repo's latest:

   ```bash
   gh release create fund-v0.2.0 --title "spillpoint-fund 0.2.0" --notes-file notes/release-fund-0.2.0.md --latest=false
   ```

## Assumptions added

- **Known edges (new section), under FA2 and FA18:** the integer-key edge, as you said. No new FA code.
- **The tabs' spacing below 480 and 360 pixels:** a layout choice, in the plan.

## Open questions

1. **The release note's "How it's tested"** uses your checks' numbers as you gave them, and calls the checker "a separate checker in exact fractions written from SPEC.md alone", as 0.1.0's did. Fine to publish so?
2. **The README's LP example** prints each LP's `share` as the engine gives it, "0.5", "0.35", "0.15", which reads well for case 17. A fund whose shares don't terminate would print 40 digits. Fine for the README, or show `toCents`-style rounding there?
