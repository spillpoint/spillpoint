# Review: 07d2 (saved files from before 0.7.0)

Branch `07d2-saved-file-migration`, from main. Nothing under `cases/` or `packages/` changed. Two commits:

| Commit | What |
|---|---|
| `9b2ff8d` | Saved files move to version 7, renaming a series from SAFEs |
| `35f2854` | Each file saved at v0.6.0 opens on the page |

**#93 is left as it is,** to be merged after this one.

## 1. The migration

**Saved files are version 7.** Opening a version 6 file renames every reference to a series from SAFEs:
- `<series>_shadow` becomes `<series>_safes`
- `<series>_shadow_<n>` becomes `<series>_safes_<n>`

**Where:** anywhere in the file's events. That covers each round's seniority, a pay-to-play's series and its conversion ratios, whose keys are series ids, a warrant's underlying, and a SAFE's cash-out rank.

**Only a name that:**
- **follows a series a priced round in the file issues,** from that round on. So `series_a_shadow` is renamed in the Series A's own seniority and after it, and nowhere before.
- **the file doesn't declare itself.** That's a holder's id, an event's, an issued security's, a round's series, a SAFE's or a note's. A security someone made with the id `seed_shadow`, named "Seed Shadow", keeps its id.
- **isn't in a starting cap table,** which declares its own securities and is left as it is.

**What it leaves alone:**
- A version 6 file saved since #90, already with `_safes`, has nothing to rename, so it opens unchanged.
- A file with a cap table and no rounds has no events, so it's unchanged too.

**Saving writes version 7.** A version 7 file never names `_shadow`, so nothing reads a version 7 file differently.

**Where it lives:** `apps/dashboard/src/file.ts`'s `renameSafeSeries`, the migration from 6 in its `MIGRATIONS` table. ASSUMPTIONS C13 adds version 7.

## 2. The fixtures, saved by the page at v0.6.0

**How they were made:**
- **The page at v0.6.0:** I checked out tag v0.6.0 in a scratch worktree outside the repo, installed with nothing downloaded, and drove its page with a scratch test like `test/acceptance.test.tsx`.
- **What saved them:** its own Save button, so each file is exactly what 0.6.0's page wrote.
- **The results:** the same test opened each saved file as the page does (`exitOf`) and recorded what 0.6.0's engine paid.
- **Not committed:** the scratch test and the worktree.

**`millrace-saved-0.6.0.json`:** the Millrace example, saved as it opens. Its Seed, Series A and Series B list `seed_shadow` in their seniority.

**`company-saved-0.6.0.json`:** "My company", built on a blank company, with fictional names:
- Founder A's 8,000,000 common, and a 10% pool
- two $500,000 post-money SAFEs, Investor P's capped at $6M and Investor Q's at $10M
- a Series A of $5M from Fund R at a $20M pre-money valuation, which converts the SAFEs at two prices: `series_a_shadow` and `series_a_shadow_2`
- a Series B of $15M from Fund S at $60M, whose seniority the page filled from the table before it: `series_b`, `series_a`, `series_a_shadow`, `series_a_shadow_2`

**`results-0.6.0.json`:** what 0.6.0's engine paid on each file:

| File | Breakpoints | Exit values with payouts |
|---|---:|---:|
| Millrace | 10 | 16 |
| My company | 5 | 11 |

Each breakpoint has its exact exit value and its reasons' codes and subjects. Each exit value has every holder's and class's payout, to 40 digits: each breakpoint, and six round exit values.

`fixtures/README.md` describes all three.

## 3. The tests, `test/saved-0.6.0.test.tsx`

**For each fixture:**
- **It names a series from SAFEs as 0.6.0 did,** and it's version 6.
- **It opens on the page,** through "Open a saved cap table", with no alert on the page or the Rounds tab. Before this branch, the page said its rounds couldn't be built.
- **It gives every breakpoint and payout 0.6.0 gave, to all 40 digits:**
  - each breakpoint's exact exit value, whether it jumps, and its reasons' codes and subjects
  - every holder's and class's payout at each recorded exit value

  0.6.0's ids are renamed, `_shadow` to `_safes`, wherever its results name a class or a reason's subject.
- **It saves back as version 7,** with no `_shadow` left. Opened again it gives the same exit, and saving it again gives the same file.

**What the migration leaves alone:**
- **A version 6 file already with `_safes`** opens with its events unchanged.
- **A declared "Seed Shadow":** a security issued with the id `seed_shadow`, then named in a later round's seniority, keeps its id, and it builds. This test fails with the declared-id rule taken out; I tried it.
- **A version 6 file with no rounds** opens to the same draft as the same file stamped version 7, and saves the same cap table.

**Seven tests that pinned version 6 now pin 7.** The "newer version" test moves from 7 to 8.

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   I got:
   - all 3,115 engine tests, unchanged
   - 670 page tests: 658 before, plus 12 here
   - the reference's 73 unit tests
   - all 83 exit and round cases matching the reference
2. **On the page,** with `pnpm dev` or the built page:
   - **The fixtures:** open `apps/dashboard/test/fixtures/millrace-saved-0.6.0.json` with "Open a saved cap table". It opens: "Opened millrace-saved-0.6.0.json." Save it, and the file says `"version": 7` and `seed_safes`, with no `seed_shadow`. Do the same with `company-saved-0.6.0.json`, whose Series B's seniority is then `series_a_safes` and `series_a_safes_2`.
   - **A file of your own,** if you have one saved from spillpoint.github.io before #90 merged, should open the same way. I haven't had one to try.
3. **Nothing else changed:** `git diff --stat main -- cases packages` prints nothing.

## Decisions for you to check

1. **The rename walks every value and key in a file's events,** not a list of fields. So any field that takes a series id is covered, today's and any added later, and what keeps it from touching anything else is the declared-id rule and the issued-series rule. A list of fields would need keeping up to date.
2. **A starting cap table is left whole,** since it declares its own securities. One that came from a table built before 07b, holding a `_shadow` series of its own, keeps that id and stays consistent with itself.
3. **The version 7 file itself has no new field.** Only its version number and the renamed ids differ from version 6.

## Assumptions added or changed

- **C13:** version 7, as above.
- **No modeling choice changed.**

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing ran outside the sandbox.** The v0.6.0 worktree was installed offline from the local store, and removed after.

## Next

#93, release 0.7.0. Once this merges, its saved-file paragraph becomes one line: files saved before 0.7.0 open as before, and a series from SAFEs is renamed as they open. I'll change it when you say. I'm stopping here.
