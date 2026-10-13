# Review: f01n (spillpoint-fund 0.1.0)

Branch `f01n-fund-release`, from main after #110. The two width gaps from your f01m2 checks come first, then the plan's release step.
- **The version** in `packages/fund/package.json` is 0.1.0, published from there.
- **I haven't published, tagged or pushed to main.** That's yours, after merging (section 5).
- **Unchanged:** nothing in `packages/engine`, any cases or `reference/`. The local `.claude/launch.json` I preview with is untracked and not committed.

## 1. The two widths (the first commit)

**The masthead's picker shrinks.**
- **The cause:** each level of the masthead (the controls, the label, the select) kept its content's width, so the select stayed as wide as its longest example's name.
- **The fix:** each now may shrink, and the page no longer scrolls sideways between 644 and 692 pixels.

**The one-table split switches to two by its card's width,** as the cash flows do:
- **Two tables wherever the one wouldn't fit,** at any window width.
- **One wherever it would.**
- **Under 480 pixels,** always two, as before.

The page measures the one table, kept out of sight and out of the accessibility tree while the two show, to see when it fits again.

**Where the split switches,** by window width, every 4 pixels:

| Fund | Two tables | One table |
|---|---|---|
| Case 8 | 320 to 736 | 740 up |
| Case 13 | 320 to 592 | 596 up |
| The SPV (case 12) | 320 to 592, and 644 to 688 | 596 to 640, and 692 up |

The SPV's table fits at 596 to 640 but not from 644: at 641 the page's and the card's padding grow (12 and 16 pixels a side to 24 and 24), so its card is narrower at 644 than at 636.

**Checked from 320 to 1400 pixels,** every 2 pixels, in headless Chrome on the final code:
- **The sweep:** every tab of five funds (cases 3, 8, 12 and 13, and a blank fund), 8,115 checks. No width scrolls the page, and no table scrolls inside its card.
- **Case 8's Cash flows** with a refusal showing (row 5 dated before the first call) and the paste box open: 541 widths, none scrolling.

**A test** stubs the card's width, since nothing is laid out in the tests: a 500-pixel card with a table needing 700 is two tables, 800 one, 650 two again.

## 2. The release

**`packages/fund`, publishable:**
- **What changed from 0.0.0:**
  - not private
  - version 0.1.0
  - built to `dist` with its types, as `packages/engine` is: `tsconfig.build.json` and `scripts/fix-declarations.mjs`, copied from it
- **Its `package.json`,** as the engine's:
  - `exports`, `main`, `types`
  - `engines` (Node 22 and up), `sideEffects: false`
  - `repository` (directory `packages/fund`), `homepage` (the package's README on GitHub), `bugs`, `keywords`
  - `prepublishOnly`: build, then the tests
- **`files`** stays `dist`, `README.md` and `LICENSE`, so the cases, the reference and the docs stay out.

**Its README:**
- **What it does,** in plain words, and that the fund's documents govern.
- **Install.**
- **Two worked examples,** each with its output:
  - the spec's example A at $40,000,000: the split by tier, the multiple, the breakpoints
  - example C's clawback at $0, $1M and $2M
- **A refusal,** `hurdle_irr`, with its output.
- **What v1 covers, and what it doesn't yet.**
- **The inputs and the API.**
- **Every name stable from 0.1.0,** with the wordings, and the link to the page.
- **A test holds its stable lists** to the engine's, as STABLE.md's are: the package carries the README, not STABLE.md. With a term and a wording changed for a moment, the test failed.

**`LICENSE`:** the repo's Apache-2.0.

**`notes/release-fund-0.1.0.md`,** in the engine's release-note style. The repo README gains a section on the fund waterfall and the page, and the two folders in its list.

**`.github/workflows/pages.yml` changes (hard rule 9).**
- **The step:** after the tests and before the upload, `cp -r apps/fund/dist apps/dashboard/dist/fund`.
- **Comments:** its header comment and the build step's name say so.
- **What it doesn't need:** `pnpm build` already builds the fund page, and now `packages/fund` too.

**`apps/dashboard` changes, its first change from the fund work:**
- **The link:** its footer reads "spillpoint 0.7.0 (…) · Fund waterfall", linking to `./fund/`.
- **Its footer test** matched the footer exactly, so it now expects the link too, and a new test checks the link goes to `./fund/`.
- **Nothing else changes there.**

**The fund page's footer** links back: "spillpoint-fund 0.1.0 (…) · Exit waterfall", to `../`.

**The privacy test on the combined site,** `apps/fund/test/site.test.ts`:
- **How it builds:** both pages, as `pnpm build` does, then copies the fund page into the main page's folder as `fund/`, as `pages.yml` does.
- **What it checks:**
  - **The policy:** each page refuses every outside connection, the same way.
  - **Loading:** every file either page loads is inside the folder, at a relative path that's there, and the main page never loads the fund page's files.
  - **The links:** each page links to the other.
  - **Nothing sent or kept:** nothing in the folder can send anything or keep anything in the browser, and it names no address beyond the two pages' own lists.

**`CLAUDE.md`:**
- **"Where things stand"** names spillpoint-fund 0.1.0.
- **The fund rule** is "nothing in `apps/dashboard` but the footer link".
- **On npm and on the site:** spillpoint-fund is no longer private or off the site, its releases are checked as the engine's are and tagged `fund-v<version>`, and the repo layout says so.

**Tests:**

| Suite | Before | Now | Added |
|---|---:|---:|---|
| Fund package | 318 | 324 | the README's lists and wordings |
| Fund page | 205 | 211 | 5 for the combined site, 1 for the card's width |
| Main page | 673 | 674 | the link |
| Engine | 3,115 | 3,115 | |

Both references pass.

## 3. The packed build

**What would be published,** from `packages/fund`, `pnpm pack --dry-run`: `spillpoint-fund@0.1.0`, 23 files:
- `package.json`, `README.md`, `LICENSE`
- `dist/`:
  - `index`, `breakpoints`, `dates`, `decimal`, `errors`
  - `input`, `model`, `reasons`, `stable-names`, `waterfall`

  each as `.js` and `.d.ts`

**The tarball:**
- **shasum:** `94144a0259e5573c4614ab8186beea9660c43898`. Three packs gave the same one, the last from this branch's final commit.
- **Size:** 27,554 bytes packed, 87,345 bytes unpacked.
- **Where:** packed into my scratchpad, not the repo, and deleted after the checks.

**What I checked as a user would,** in a throwaway project outside the repo, with the tarball unpacked and decimal.js linked from the copy installed here, so nothing was downloaded:
- **The README's three examples,** run from the packed README, each print exactly their Output block.
- **The exports** are the seven the API test pins: `D`, `FundRefusal`, `findBreakpoints`, `readFund`, `splitAt`, `splitAtNav`, `toCents`.
- **A TypeScript file typechecks clean** under `nodenext`, with the package's declarations checked too. It uses every exported type. A line with a wrong type fails, so the check is real.
- **All 15 fund cases and the 15 refusals on the packed build,** 1,741 checks, none failed:
  - **The cases:** every top-level amount, every breakpoint to the cent and at its exact value, every reason's code, text and fields, and every point's split and clawback to the cent.
  - **The refusals:** each one's kind, term and path.
  - **The check itself:** with one expected amount changed in memory, one check failed.

**The combined site, served locally** as Pages would serve it, under `/spillpoint/`:
- **The main page's footer link** opens the fund page at `/spillpoint/fund/`, running.
- **"Exit waterfall"** brings it back to `/spillpoint/`.
- **Requests:** only the site's own files.

## 4. How to check it on your machine

```bash
pnpm install
```

**The two widths.** Run the fund page, and use your browser's device toolbar from 320 to 1400 pixels:

```bash
pnpm --filter @spillpoint/fund dev
```

- **Around 660 pixels** on any tab, the page doesn't scroll sideways.
- **On case 8's Payouts:** two tables up to about 736, one from 740, never a table scrolling inside its card.

**The combined build, served locally,** in `local/`, which git ignores:

```bash
pnpm build
```

```bash
rm -rf local/site && mkdir -p local/site/spillpoint && cp -r apps/dashboard/dist/. local/site/spillpoint/ && cp -r apps/fund/dist local/site/spillpoint/fund
```

```bash
python3 -m http.server 8000 --directory local/site
```

Open `http://localhost:8000/spillpoint/`.
- **"Fund waterfall"** in the footer opens the fund page at `/spillpoint/fund/`.
- **"Exit waterfall"** in its footer comes back.

**The pack.** From `packages/fund`:

```bash
pnpm pack --dry-run
```

It should list `spillpoint-fund@0.1.0` and the 23 files above. For the shasum, run `pnpm pack`, then `shasum spillpoint-fund-0.1.0.tgz`, then delete the tarball. It should be `94144a0259e5573c4614ab8186beea9660c43898`.

## 5. After merging: what you do

1. **The next deploy** (the merge to main runs it) publishes the fund page at `spillpoint.github.io/spillpoint/fund/`, with the main page's footer linking to it.
2. **Publish,** from `packages/fund`:

   ```bash
   pnpm publish
   ```

   Its `prepublishOnly` builds and runs the tests first.
3. **Tag** `fund-v0.1.0`, and make the GitHub release "spillpoint-fund 0.1.0" from `notes/release-fund-0.1.0.md`.

## Assumptions added

None in the fund engine, and nothing in `ASSUMPTIONS.md`. Choices, all in this note and the plan:
- **The links' words:** "Fund waterfall" and "Exit waterfall".
- **`homepage`:** the package's README on GitHub, where the engine's is the repo's.
- **The README's two examples:** the spec's A and C.

## Open questions

1. **The footer links' words:** "Fund waterfall" on the main page and "Exit waterfall" on the fund page. Keep them, or other words?
2. **Your publish:** the release note says Jordan re-derived the cases and his checker agreed on 6,026 random funds (f01c). Fine to say so in a public release note?
