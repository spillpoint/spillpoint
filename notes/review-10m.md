# Review: 10m (1.0's release step)

Branch `10m-release-1-0`, from main at `4c3ab32` (#146 merged, no PR open).
- **The cases lock is on,** and no case file changed.
- **No engine code changed.** Under `packages/` there are only the version and the engine README's text.
- **I haven't published, tagged or pushed to main.** You publish from this step's merge commit once the second gate is met, with the commands below.

**CI and permissions:** no change to `.github/workflows/` or `.claude/`.

## What changed

1. **`packages/engine/package.json`:** version **1.0.0**.
2. **The engine README:**
   - **The top paragraph:** "1.0 is the stability release", with 0.7.0's API and nothing breaking before a 2.0. It keeps the four fixes and the OCX read, and adds the faster search.
   - **Install** gains **"Versions"** *(1.0)*. From 1.0, semantic versioning: a patch only fixes; a minor can also add a function, a field or a name on a Stable list; anything that would break waits for 2.0; and every release's notes say whether any answer changed, and why.
   - **Stable from 1.0:** "never renamed or reused" now adds "that would wait for 2.0", linking to Versions. The lists are unchanged, and the stable-names test still holds them to the engine's.
3. **The root README:** "Coming next: 1.0" is now "1.0 is ready". It goes on npm once a few outside users have tried it, and npm has 0.7.0 until then. A new short paragraph says what's after 1.0, pointing to `notes/plan-2.0.md`.
4. **`notes/release-1.0.md`, finished:**
   - **The title:** "spillpoint 1.0: the stability release".
   - **What 1.0 is,** and the OCF and OCX attribution lines, as 0.7.0's notes have them.
   - **"Its two gates":** the first met (10i), the second open, and npm on 0.7.0 meanwhile while the page runs this code.
   - **"Changed answers":** none in the locked cases, with what each change does.
   - **The existing sections, as they were:** "Fixed since 0.7.0", "Reads more" and "Faster".
   - **"The API, against npm 0.7.0":** new (section 2).
   - **"On the page":** everything since 0.7.0, where it had only 10l: 10a, 10b, 10d, 10e, 10h, the fund page and the footer.
   - **"How it's tested" and "Still refused":** new.
5. **`CLAUDE.md`'s "Where things stand":** 1.0 is ready on main and waits on its second gate. You publish from 10m's merge commit with the commands here. Next is 11b. The "On main, unreleased" and "Next, 1.0's gates" lines are folded into it.

## 1. The packed build

**From `packages/engine`, `pnpm pack --dry-run`** lists `spillpoint@1.0.0` and 73 files.

**The tarball, `spillpoint-1.0.0.tgz`:**
- **shasum:** `c028ccef3df7f4e787394e944c7fa7c4128c2f99`. Two packs from this branch gave the same one.
- **Size:** 170,266 bytes packed, 608,551 unpacked.
- **Where:** packed into my scratchpad, not the repo.

**The 73 files have the same names as 0.7.0's.** 23 differ in size, all of them from the changes in the release notes:

| File | 0.7.0 | 1.0 |
|---|---:|---:|
| `README.md` | 65,264 | 68,273 |
| `dist/breakpoints.js` | 14,871 | 23,897 |
| `dist/decimal.d.ts` | 1,873 | 3,105 |
| `dist/decimal.js` | 3,424 | 5,006 |
| `dist/decisions.d.ts` | 4,657 | 7,803 |
| `dist/decisions.js` | 40,394 | 49,098 |
| `dist/input.d.ts` | 2,509 | 3,549 |
| `dist/input.js` | 31,081 | 34,625 |
| `dist/lines.d.ts` | 2,535 | 3,684 |
| `dist/lines.js` | 12,666 | 15,892 |
| `dist/ocx-05.js` | 15,209 | 15,413 |
| `dist/ocx-07.js` | 30,318 | 30,699 |
| `dist/ocx-import.js` | 6,895 | 6,772 |
| `dist/ocx-terms.d.ts` | 2,867 | 3,175 |
| `dist/ocx-terms.js` | 12,051 | 13,290 |
| `dist/payments.js` | 2,300 | 2,512 |
| `dist/reasons.d.ts` | 996 | 1,060 |
| `dist/reasons.js` | 31,672 | 31,741 |
| `dist/rounds.js` | 60,375 | 60,642 |
| `dist/stable-names.d.ts` | 4,436 | 4,463 |
| `dist/stable-names.js` | 5,347 | 5,378 |
| `dist/waterfall.d.ts` | 12,945 | 13,756 |
| `dist/waterfall.js` | 30,564 | 32,415 |

**What I checked as a user would.** The tarball was unpacked into a throwaway project outside the repo, with decimal.js linked from the copy already installed here:
- **The README's five examples,** taken from the packed README, each run as its own file and each print exactly their Output block.
- **The exports:** the 18 the API test pins, at runtime.
- **A TypeScript file written for 1.0 typechecks clean under `nodenext`** against the package's declarations. It uses every runtime export, the types code reaches for, a `switch` on `ReasonCode` with a default, and the readonly assignment, marked `@ts-expect-error`. At runtime that assignment throws `TypeError: Cannot assign to read only property 'capTable'`.
- **The cases the release is about,** on the packed build, beside a build of 0.7.0 (section 2 says which one):
  - **Every case with an exit,** 51, pays the same at all 500 of their exit values, holder by holder, within a cent of `expected.json`, and finds the same 178 breakpoints with the same reasons. That's true on both builds, so the three cases added since 0.7.0 pay the same on 0.7.0 too.
  - **The 18 whole OCF packages and OCX workbooks** each read to their case's result on both, with report notes compared as a set (C16, C18).
  - **Each change in the notes shows on 1.0 and not on 0.7.0,** in the notes' own figures:
    - edge-02 with Founder A's common multiplied by 10 after `prepare`, at $5M: Founder A gets $15,000,000.00 on 0.7.0 and $1,500,000.00 on 1.0
    - the four half cents, through a payout, as the notes describe: .62, .82, .84 and .42 on 0.7.0; .63, .83, .85 and .43 on 1.0
    - the five SAFE tables: 0.7.0 pays the notes' figures; 1.0 refuses all but the $200,001 caps, which pay $100.00, $9,999,950.00 and $9,999,950.00 on both
    - the two nulls: read on 0.7.0, "is blank" on 1.0
    - Hollis Mill with Context's H6 to H8 cleared: 0.7.0 refuses it with `missing_header`, "Participating (Y/N)". 1.0 reads it, with both series' participation to fill and the note `no_participation_column`

## 2. The API, against npm 0.7.0

**The baseline is npm's own 0.7.0.** I read its record (`npm view spillpoint@0.7.0`) and fetched its tarball (`npm pack spillpoint@0.7.0`), both read-only from the registry, into my scratchpad.
- **Its shasum,** `93d801e0e9357c706768ed7c20794a71bf4b4a44`, is the one 07e recorded.
- **A build from the `v0.7.0` tag,** in a scratch worktree, packs to the same shasum. That build is the "0.7.0" I ran beside 1.0 in section 1.

**What differs:**
- **The entry point is 0.7.0's, byte for byte:** `dist/index.js`, `dist/index.d.ts` and `dist/model.d.ts`. So the 18 runtime exports and every exported type name are the same.
- **One type changes:** `PreparedCapTable`'s `capTable` and `exitDate` are `readonly` (10c). That's the one error the 1.0 TypeScript file gets against 0.7.0's declarations, TS2578, an unused `@ts-expect-error`.
- **One name is added to a list:** the report-note code `no_participation_column` (10f, 10g), 33 to 34. The other lists stay at 11, 50, 34 and 13. Nothing is removed.
- **The rest is internal.** Every other change in `dist/*.d.ts` is in a module the entry point doesn't re-export, and `exports` lists only ".":
  - `halfUp`, `roundDown` and `grouped` in `decimal`
  - the search's `Unit`, `UnitSpec`, `moveOn` and their kin in `decisions` and `lines`
  - `ownWholeCompany` and `refuseSafesOwningTheCompany` in `input`
  - `missingParticipation` and a parameter of `readRound` in `ocx-terms`
  - `Prepared`'s `bought`
  - `IMPORT_NOTE_CODES`' new code, the list the README's is held to
  - comments

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   I got:
   - 3,545 engine tests
   - 713 page tests
   - 2,115 fund tests, 13 skipped
   - 838 fund page tests
   - the reference's 79 unit tests and all 86 exit and round cases matching it
   - the fund reference's tests and cases, which all pass
2. **See what would be published.** From `packages/engine`:

   ```bash
   pnpm pack --dry-run
   ```

   It should list `spillpoint@1.0.0` and 73 files. For the shasum, run `pnpm pack`, then `shasum spillpoint-1.0.0.tgz`, then delete the tarball. It should be `c028ccef3df7f4e787394e944c7fa7c4128c2f99`.
3. **The API against npm's 0.7.0,** from a folder outside the repo:

   ```bash
   npm pack spillpoint@0.7.0 && tar -xzf spillpoint-0.7.0.tgz && diff package/dist/index.d.ts <repo>/packages/engine/dist/index.d.ts && diff package/dist/index.js <repo>/packages/engine/dist/index.js
   ```

   Both diffs should be empty, after the build in step 1.
4. **On the page, once merged:** the footer says "spillpoint 1.0.0". `pages.yml` deploys main, so the live page says it from this merge, while npm still has 0.7.0 (decision 3).

## Publishing, from this step's merge commit

Once the second gate is met. From the repo root, on a clean checkout:

1. **Find 10m's merge commit** and check that it's this step's:

   ```bash
   git fetch origin
   ```

   ```bash
   MERGE=$(git log origin/main --format=%H --grep='^10m: ' -n 1) && git show --no-patch --oneline "$MERGE"
   ```

   It should print 10m's commit, "10m: 1.0's release step (#…)".
2. **Check it out**, detached:

   ```bash
   git switch --detach "$MERGE"
   ```

   ```bash
   git status --short && grep '"version"' packages/engine/package.json
   ```

   It should print nothing from `git status`, then `"version": "1.0.0",`.
3. **Rerun the checks** (step 1 above), on that commit:

   ```bash
   pnpm install --frozen-lockfile && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

4. **Check the tarball** from `packages/engine`:

   ```bash
   cd packages/engine
   ```

   ```bash
   pnpm pack --dry-run
   ```

   ```bash
   pnpm pack && shasum spillpoint-1.0.0.tgz && rm spillpoint-1.0.0.tgz
   ```

   It should say `spillpoint@1.0.0` and 73 files, then `c028ccef3df7f4e787394e944c7fa7c4128c2f99`. If the shasum differs, stop: the commit isn't what was reviewed.
5. **Publish,** still in `packages/engine`:

   ```bash
   pnpm publish --no-git-checks
   ```

   - **Why `--no-git-checks`:** pnpm's checks want a branch, and a detached commit has none. Step 2's `git status` did the check that matters, that nothing is uncommitted.
   - **`prepublishOnly`** builds and tests again first.
   - **If npm asks for a one-time code,** pnpm prompts for it, or add `--otp <code>`.
6. **Check npm has what you checked:**

   ```bash
   npm view spillpoint@1.0.0 version dist.shasum
   ```

   It should print `1.0.0` and `c028ccef3df7f4e787394e944c7fa7c4128c2f99`. `pnpm pack` writes `package.json` as `pnpm publish` does, so the two shasums agree.
7. **Tag v1.0.0,** a lightweight tag on the merge commit, as `v0.7.0` is:

   ```bash
   cd ../.. && git tag v1.0.0 "$MERGE" && git push origin v1.0.0
   ```

8. **The GitHub release,** titled from the notes' first line, with the rest as its body, as 0.7.0's is. `--latest` makes it the repository's latest release: the fund's releases aren't marked latest, so v0.7.0 is now.

   ```bash
   tail -n +3 notes/release-1.0.md > /tmp/release-1.0-body.md
   ```

   ```bash
   gh release create v1.0.0 --verify-tag --latest --title "spillpoint 1.0: the stability release" --notes-file /tmp/release-1.0-body.md && rm /tmp/release-1.0-body.md
   ```

9. **Back to main:**

   ```bash
   git switch main
   ```

**After publishing,** the root README's 1.0 paragraph and `CLAUDE.md`'s line still say 1.0 waits. Each needs a line changed, in 11b or a small step of its own. Tell me when it's out.

## Decisions for you to check

1. **The title:** "spillpoint 1.0: the stability release".
2. **"Versions" in the engine README** is new wording, and a promise:
   - a patch only fixes
   - a minor can add
   - anything that would break waits for 2.0
   - every release's notes say whether any answer changed, and why

   The last is what every release's notes have done, as "Changed answers". It's the line to cut if you'd rather not promise it.
3. **The page says 1.0.0 before npm does.** The footer reads the engine's `package.json`, and `pages.yml` deploys main on merge. The notes and the root README say so: npm has 0.7.0 until you publish. The other way is to bump the version only when you publish. But then this merge commit isn't the one you publish, as you asked.

## Assumptions added or changed

None: no modeling choice changed.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing ran outside the sandbox.** The only network use was reading npm's public record of 0.7.0 and fetching its tarball, as section 2 says.

## Next

1.0 is ready on main once this merges, and waits on its second gate. Next is 11b, a priced round at a stated price. I'm stopping here.
