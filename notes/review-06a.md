# Review: 06a (the release checklist, the speed labels, the milestone names, and CLAUDE.md)

Branch `06a-milestone-names-and-claude-md`. The `cases/` edit rule is on, and no case file changed. No version bump: this ships in 0.6.0. It has four commits:
1. **The speed entry's timings relabeled** (item 2).
2. **The engine's refusals drop the milestone names** (item 3), with the tests, both READMEs and the ASSUMPTIONS lines that described them.
3. **CLAUDE.md brought up to date,** with the release checklist (items 1 and 4).
4. **This note.**

## 1. The release checklist: `pnpm pack` gives npm's shasum

**What I did:** checked out v0.5.0, which is the same commit as main's head (41b077f). Then I built the engine and ran `pnpm pack` in `packages/engine`.

**What I found:**
- **The shasum:** `6e3e623f8ce27ae5e3515f98f17dc21de7349e79`, npm's, as you said. `npm pack --dry-run` on the same build still gives `48858e1d…`.
- **The tarball:** 117,369 bytes, against `npm pack`'s 116,271, since pnpm compresses differently. The published one has the same shasum, so it's the same 117,369 bytes.
- **Its `package.json`:**
  - `scripts` moves after `devDependencies`
  - `prepublishOnly` is dropped
  - the final newline is dropped

  That's what `pnpm publish` wrote to npm.
- **The other 50 files** are byte for byte the built ones.
- **`pnpm pack --dry-run` prints no shasum.** It lists the 51 files and `spillpoint@0.5.0`, and writes nothing.

**So the checklist's step is:**
1. `pnpm pack --dry-run`, for the file list and the version.
2. `pnpm pack`, then `shasum spillpoint-<version>.tgz`, then delete the tarball, for the shasum npm will show.

I deleted the tarball here. Nothing was left behind, and `*.tgz` is gitignored anyway.

**Where the checklist lives now.** There was no checklist file. Each release's review note (03j, 04g, 05e) repeated the steps under "How to check the packed build". I've written them once into CLAUDE.md, under "Steps", with the pnpm step and why npm's shasum differs. Each future release note can point there. (Decision 1.)

## 2. The speed entry's timings

In ASSUMPTIONS' later list, the two lines that said "Jordan's 2-core machine" now say "a 2-core test machine":
- **After 05c4:** 1.1s with 2 SAFEs and 13.3s with 10; without the note, 0.4s and 6.7s.
- **0.5.0's packed build:** 8.65s with 10 SAFEs.

**What I kept:**
- **The attributions,** "(Jordan, after #73.)" and "(Jordan, 05e review.)", since they record when the figures came in.
- **The older notes** as they're written, as history: review-05c4, 05c5 and 05e say "your 2-core" figures. Say if you'd like those corrected too.

## 3. The milestone names are gone

**What's removed:**
- the `Milestone` type
- `UnsupportedTermError.milestone`
- the end of every refusal message that said when the term might arrive

A refusal now describes what's unsupported, as the 0.2.0 deprecation note promised for 1.0.

**Before,** from a cap table with two conversion groups:

> exit.cap_table.conversion_groups: More than one conversion group (E17: the order in which groups decide isn't settled). The engine supports this once a case needs it; until then it refuses the input rather than ignoring the term.

**Now:**

> exit.cap_table.conversion_groups: More than one conversion group (E17: the order in which groups decide isn't settled). The engine doesn't model this, so it refuses the input rather than ignoring the term.

### Changes that can break 0.5.0 code

- **The `Milestone` type is no longer exported.** TypeScript that imports it doesn't compile. It was a type-only export, so the 17 exports the API test pins are unchanged.
- **`UnsupportedTermError` has no `milestone`.**
  - **In TypeScript,** reading it is a type error.
  - **In JavaScript,** it's `undefined`, where 0.5.0 always gave `"later"`.
- **`UnsupportedTermError`'s constructor takes `(term, path, what)`,** where 0.5.0 took `(term, milestone, path, what)`. Code that builds one, as the page's own sale-limit test did, drops the second argument.
  - **TypeScript** flags the old call.
  - **JavaScript** doesn't. With four arguments, `path` becomes `"later"`, the old path takes the description's place in the message, and the description is dropped.
- **Every refusal message ends differently.** "The engine supports this once a case needs it; until then it refuses the input rather than ignoring the term." is now "The engine doesn't model this, so it refuses the input rather than ignoring the term." Everything before it is unchanged: the path, then what isn't modeled. Code that matches the old ending breaks. The 11 refusals:
  - `anti_dilution_with_conversions`
  - `conversion_groups`
  - `cumulative_dividend_in_rounds`
  - `discounted_conversion_in_anti_dilution_a`
  - `dividends_added_to_conversion`
  - `note_compounding_interest`
  - `note_post_money_cap`
  - `note_with_safe_or_carve_out`
  - `pre_money_safe_with_preferred`
  - `several_notes`
  - `several_safes`

**Unchanged:**
- every term's name and every path
- which inputs are refused: nothing is added or lifted
- `InputError`, `NoAnswerError` and `OcfRefusal`

**One more, in the declarations only:** `UnsupportedTermError`'s doc comment had slipped above `NoAnswerError` in `errors.ts`. It's back on its class, so an editor's hover over `NoAnswerError` shows only its own text.

### The page

The page reads neither the type nor the field. It reads a refusal's `term` and `path`, and shows its message, so a refusal's last sentence on the page changes as above.
- **One page test** built an `UnsupportedTermError` with the old constructor.
- **Two pinned the old wording.**

All three are updated. The page's own sentences, such as "spillpoint can't yet work out a sale while…" (your 05b3b wording), are the page's, not the engine's, and don't say when, so they're unchanged.

### The docs

- **The engine README:**
  - "Not settled yet" loses `(milestone "later")` and "until one does".
  - The `UnsupportedTermError` entry gives `term` and `path`, with a *(0.6.0)* note on what went.
  - The version-marker line includes *(0.6.0)*.
- **The root README:** "Coming next" lists 0.6.0, 0.7.0 and 1.0 (decision 4).
- **ASSUMPTIONS,** where a line described the field as current:
  - the later list's opening
  - C12, which said refusals name the milestone
  - C13, which said the engine's message says when
  - X9 and X12, which named `milestone "later"`

  Each now says it was so until 0.6.0. The history elsewhere keeps its milestone tags, as you said, and so do code comments.

**For 0.6.0's release notes:** the four breaking changes above. 06b's plan will carry them.

## 4. CLAUDE.md

Each change:
1. **Hard rule 3:** one branch and one PR per step, with `05c4-engine-safe-rules-and-speed` as the example, where it said one branch per milestone (`m1-cases`, ...).
2. **Hard rule 4:** stop at every step boundary, and end each step with `notes/review-<step>.md`. The list of what the note covers is unchanged.
3. **A new hard rule 10:** O12's rule covers OCX too. Every file in either format is our own, nothing from the Open Cap Table Coalition's published OCF or OCX material is copied into the repo, and their published examples run only in `local/` (decision 3).
4. **The M1–M6 list is gone.** In its place:
   - **"Steps":**
     - steps named for the release they ship in (05c4 went into 0.5.0)
     - one evening each
     - how a release usually goes: the plan, cases first where there's new math, the engine, the page, then the release step
     - the release checklist from section 1
   - **"Where things stand":**
     - released through 0.5.0
     - next 0.6.0, OCX import plus this removal
     - then 0.7.0, the naming review, the last release that breaks anything
     - then 1.0, the spillpoint.io domain and the release, with no API changes

     Deferred work lives in ASSUMPTIONS' "Later" section.
5. **Repo layout:**
   - **`cases/`:** now says an OCF case has a package or fixtures in place of `inputs.json` (C16), and points to hard rule 1 for the lock, where it said "Locked after M1".
   - **`notes/`:** plans, release notes, step reviews and disagreement write-ups.
   - **`scripts/`:** added, for `ocf-check.mjs`.

**Kept as they were:**
- **Hard rules 1, 2 and 5 to 9.** Rule 1 still says `cases/` was locked "at the end of M1", which is history.
- **The opening.**
- **The stack.** Recharts is still what the page uses.

**One wording to check:** "Where things stand" says 0.6.0 reads OCX "as Carta exports it", in your words. A quick web search found that OCX is the Coalition's spreadsheet format built on OCF, but nothing confirming Carta exports it; Carta's documented exports are its own reports. 06b's plan looks at this, and your export's tab names should settle it. So the public README names OCX and leaves Carta out for now.

## How to check by behavior

1. **Run the tests:**

   ```bash
   pnpm test
   ```

   - **Engine:** 2,261 pass, 1 new: a refusal carries only `name`, `term` and `path`, with the new message, in `test/api.test.ts`.
   - **Page:** 480 pass, none new.
2. **See a refusal,** from case 6b's table given a second conversion group:

   ```bash
   node --input-type=module -e 'import { readFileSync } from "node:fs"; import { readInputs } from "./packages/engine/src/index.ts"; const c = JSON.parse(readFileSync("cases/edge-06b-forced-class/inputs.json", "utf8")); c.exit.cap_table.conversion_groups = [["seed_1"], ["seed_2"]]; try { readInputs(c); } catch (e) { console.log({ ...e }); console.log(e.message); }'
   ```

   - **On this branch:** `{ name: 'UnsupportedTermError', term: 'conversion_groups', path: 'exit.cap_table.conversion_groups' }`, then the message above.
   - **On main:** the same with `milestone: 'later'`, and the old ending.
3. **The shasum, as in section 1.** Check out v0.5.0, then:

   ```bash
   pnpm --filter spillpoint build
   ```

   Then, in `packages/engine`:

   ```bash
   pnpm pack
   ```

   ```bash
   shasum spillpoint-0.5.0.tgz
   ```

   ```bash
   rm spillpoint-0.5.0.tgz
   ```

   It prints `6e3e623f8ce27ae5e3515f98f17dc21de7349e79`.

## Decisions for you to check

1. **The checklist in CLAUDE.md,** since there was no checklist file. It could be a file of its own in `docs/` instead.
2. **The new ending,** "The engine doesn't model this, so it refuses the input rather than ignoring the term." I left out "yet", since that hints at when.
3. **The OCX rule as hard rule 10,** rather than a line in the layout.
4. **The root README's "Coming next":** OCX by name without Carta, and 1.0 as "the same API as 0.7.0" without the domain, which isn't public yet.
5. **The ASSUMPTIONS lines** (section 3) changed because they described the API, while the history around them kept its milestone tags.

## Assumptions added or changed

No modeling choice changed. In `docs/ASSUMPTIONS.md`:
- **The later list's speed entry:** the relabel (section 2).
- **The later list's opening, C12, C13, X9 and X12:** the milestone wording (section 3).

## Open questions

1. **The older notes'** "your 2-core" figures: leave them as history, or correct them as well?

## Checks

- **Engine:** 2,261 tests pass.
- **Page:** 480 tests pass.
- **Reference:** 71 unit tests pass, and every `expected.json` matches.
- **Typecheck and build:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **CLAUDE.md changes** how steps are named and stopped, and adds hard rule 10 (section 4). That's the project's instructions to me, not CI or a permission, but it's listed here since it changes how I work.
- **Nothing ran outside the sandbox.** The checkout of v0.5.0, the build and `pnpm pack` all ran inside it. The one network use was the web search above, made from my side, not from the repo.

## Next

06b, the plan for 0.6.0's OCX import, in a PR of its own with no code. I'm stopping here.
