# Review: 05e (release 0.5.0)

Branch `05e-release-0.5.0`. The `cases/` edit rule is on, and no case file changed. Two commits:
1. **The two polish items.**
2. **The release:**
   - the version in `packages/engine/package.json` is **0.5.0**
   - the release notes, in `notes/release-0.5.0.md`
   - both READMEs
   - the packed build, checked as 03j and 04g did

**I haven't published or tagged.** The tarball is below, for you to check first.

## 1. The polish items

**A blank field names itself.** Before, every blank said "Fill this in: it can't be blank." Now it names the field:
- "Series B's pre-money valuation can't be blank." (your example, on a round named Series B)
- "Investor X's SAFE valuation cap can't be blank."
- "The option pool's percentage can't be blank."
- "B Fund's investment in Series B can't be blank."
- "Seed Preferred's cumulative dividend rate can't be blank."
- "The Closing payment's amount can't be blank."

It reads the same wherever it shows: beside the field, on the Payouts tab, and in a save's status. That's why the name matters, since the last two are away from the field.
- **How a field is named:** from the engine's path and the names in the input. A round is named by its new series, a line by its holder, an event's own field by the event, and a cap table's field by its class, holder or position (`apps/dashboard/src/blankNames.ts`).
- **Where it can't name one,** such as a line on the Rounds tab whose holder isn't chosen yet, or a series' seniority, it says what it said before.

**A round's price, to the cent when exact.** "$4.00 a share", not "$4.000000".
- **Where it applies:** I applied the conversion prices' rule to every per-share price on the Rounds tab, not only the round's: SAFE and note conversion prices, a series' issue price, and anti-dilution's before and after. Each could show "$X.000000" the same way.
- **Six places stay** where a price isn't exact. The README example's SAFE still says $0.900000, as the engine README does, because its price isn't exactly 90 cents.

**Tests:** `apps/dashboard/test/names-and-prices.test.ts`, 5 new. Seven existing tests pinned the old wording or a six-place price that is now exact, and they take the new text.

## 2. The release notes

`notes/release-0.5.0.md` has 0.4.0's sections:
- **New:**
  - the starting cap table, with the import's issue order
  - SAFEs beside a note at a sale
  - the SAFEs' greater-of coming last
  - the faster search
  - the OCF note-base rule
  - the check script, marked as in the repository, not the package
  - how it's tested
- **On the page:** "Add a round", what a round says about its starting table, "Use it to add a round", Larkspur at a sale, file version 6, payouts to the cent, the two-answer message, and both polish items.
- **Changed answers:**
  - 12k, the two equal SAFEs
  - 12l, warrant shares, with the indifferent warrant
  - more than one stable answer
  - the 12j fix
  - It opens by saying every locked case from 0.4.0 gives the same answer.
- **New in the API:**
  - the `start` event and its `"start"` kind
  - `issue_order`
  - the new refusal term and note code
  - `NoAnswerError`'s message and its variants
  - no new exports
- **Changes that can break 0.4.0 code:** below.
- **Still refused:** below.

The credit line is there, word for word.

**Your five items:**
1. **#75's fix has no line.** I took out the plan's sentence about the stop's exit value, which 05c6 had added.
2. **"Changes that can break 0.4.0 code" has both of yours,** and two more, which I found going through the diff since v0.4.0:
   - **`solve`'s answers:** one answer, or a `NoAnswerError`, where 0.4.0 returned several. Its `complete` is now always true: the case it marked false, more than 12 decision-makers whose two ends disagree, now stops too.
   - **`readInputs`:** the at-a-sale refusals on a table built from rounds, each listed.
   - **Added: `readOcf`'s note base.** A note whose cap counts other converting securities was a blank in `to_fill` in 0.4.0. Now it's refused beside another SAFE or note, and read otherwise.
   - **Added: the `"start"` kind.** It joins a union, so an exhaustive TypeScript `switch` over an event's `details.kind` needs a case for it.
3. **"Still refused," in plain words:**
   - **The new refusal:** `note_base_counts_other_convertibles`.
   - **What stops rather than guess:**
     - more than one stable answer
     - more than 12 SAFEs whose answer doesn't settle from "every SAFE converts", which 05c4 added
   - **Where a second answer could go unseen:** past 12 decision-makers, and where payouts curve.
   - **A starting table with a carve-out.**
   - **What's narrowed at a sale, and what's still refused there.**
   - The engine README's "What it refuses" has the same stops and limits.
4. **Speed:**
   - **The table:** Larkspur with its note and 10 post-money SAFEs, the search from $0 to $150M with the answer at each breakpoint.
   - **The range:** about 2 seconds on an M1 Pro laptop, and 4 to 9 seconds on GitHub's 2-core runners. Your 2-core machine took 13 seconds before 05c5, which adds about a third.
   - **It says it depends on the machine.**
   - **A correction to the plan's wording:** the 204 seconds was 05c2's engine before the speed work, not 0.4.0, which refused this table at a sale. The notes say so.
5. **Packed, not published or tagged** (section 4).

**CI's numbers, for the later list's speed entry:** after 05c5 and 05c6, the timing test took 4.0s and 4.9s on the Node 24 job, and 8.1s and 8.5s on Node 22, on the last two runs on main. Node 22 was 4.1s after 05c4, so 05c5's check costs more there than on the laptop.

## 3. The READMEs

- **The root README:**
  - **The page:** it can add the next round to an entered or imported cap table, and offers a round when an import's SAFEs or notes can't be paid at a sale.
  - **The engine:** what 0.5.0 adds, in one sentence.
  - **"Coming next":** 1.0.
- **The engine README:** its 0.5.0 lines came in with each PR. This one adds the stops and the limits under "What it refuses".

## 4. The packed build

**The tarball:** `spillpoint-0.5.0.tgz`
- **Size:** 116.3 kB packed (116,271 bytes), 421.2 kB unpacked.
- **51 files:** 0.4.0's 49, plus the new `lines` module and its declarations.
- **shasum:** `48858e1da346c8aa4db1cd457633cde189a1c9ce`.

`npm pack --dry-run` from this branch gives the same shasum.

| File | Bytes | | File | Bytes |
|---|---:|---|---|---:|
| `LICENSE` | 11,341 | | `dist/ocf-book.d.ts` | 1,968 |
| `README.md` | 39,058 | | `dist/ocf-book.js` | 4,324 |
| `package.json` | 1,295 | | `dist/ocf-classes.d.ts` | 1,905 |
| `dist/breakpoints.d.ts` | 768 | | `dist/ocf-classes.js` | 8,469 |
| `dist/breakpoints.js` | 14,828 | | `dist/ocf-convertibles.d.ts` | 1,576 |
| `dist/case.d.ts` | 108 | | `dist/ocf-convertibles.js` | 12,779 |
| `dist/case.js` | 1,564 | | `dist/ocf-grants.d.ts` | 2,029 |
| `dist/dates.d.ts` | 537 | | `dist/ocf-grants.js` | 10,961 |
| `dist/dates.js` | 1,657 | | `dist/ocf-ledger.d.ts` | 1,204 |
| `dist/decimal.d.ts` | 1,263 | | `dist/ocf-ledger.js` | 8,273 |
| `dist/decimal.js` | 2,763 | | `dist/ocf-notes.d.ts` | 357 |
| `dist/decisions.d.ts` | 4,287 | | `dist/ocf-notes.js` | 681 |
| `dist/decisions.js` | 39,809 | | `dist/ocf-read.d.ts` | 1,979 |
| `dist/dividends.d.ts` | 899 | | `dist/ocf-read.js` | 4,196 |
| `dist/dividends.js` | 1,679 | | `dist/ocf-warrants.d.ts` | 1,751 |
| `dist/errors.d.ts` | 2,028 | | `dist/ocf-warrants.js` | 6,759 |
| `dist/errors.js` | 1,954 | | `dist/ocf.d.ts` | 1,485 |
| `dist/index.d.ts` | 1,320 | | `dist/ocf.js` | 21,270 |
| `dist/index.js` | 1,637 | | `dist/payments.d.ts` | 1,207 |
| `dist/input.d.ts` | 2,509 | | `dist/payments.js` | 2,323 |
| `dist/input.js` | 31,230 | | `dist/reasons.d.ts` | 1,145 |
| `dist/lines.d.ts` *(new)* | 2,531 | | `dist/reasons.js` | 31,672 |
| `dist/lines.js` *(new)* | 12,666 | | `dist/rounds.d.ts` | 7,288 |
| `dist/model.d.ts` | 7,996 | | `dist/rounds.js` | 60,386 |
| `dist/model.js` | 239 | | `dist/waterfall.d.ts` | 10,584 |
| | | | `dist/waterfall.js` | 28,638 |

## How to check the packed build

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   That's 2,260 engine tests, 478 dashboard tests, the 71 reference unit tests, and all 83 cases matching the reference.
2. **See exactly what would be published,** without publishing:

   ```bash
   cd packages/engine && npm pack --dry-run
   ```

   It should list **51 files at version 0.5.0**, 116.3 kB packed, with the shasum above.
3. **What I checked as a user would.** I packed the package and unpacked the tarball into a throwaway project outside the repo. decimal.js was linked from the copy already installed here, so nothing was downloaded.
   - **The README's four examples,** taken from the packed README, each printed exactly their Output block from the built `dist/`.
   - **The exports:** the 17 the API test pins, the same as 0.4.0's.
   - **A TypeScript file typechecked** under Node's own module resolution (`nodenext`), with the package's declarations. It uses `OcfImport`'s `issue_order`, a `switch` over `EventDetails` with a `"start"` case, and `NoAnswerError`.
   - **The packed build, run on the repository's cases:**
     - **12j, Larkspur without its note:** all 7 breakpoints within a cent of the locked case, and all 285 lines at its 15 exit values to the cent. The jump is at $16,559,391.30.
     - **13j, Larkspur with its note:** 9 breakpoints, and 340 lines at 17 exit values, all matching.
     - **27, a starting table plus a Series B, through `readInputs`:** 11 breakpoints, and 378 lines at 18 exit values, all matching.
     - **random-1-149 at $11,047,000:** stops with the plain message.
     - **Larkspur's OCF package** (case ocf-01) gives the issue order `cls-seed, safe-x1, safe-s3, note-n1, cls-series-a`.
4. **Publishing and tagging are yours.** From `packages/engine`, run `pnpm publish`. Its `prepublishOnly` step builds and tests first.

## Decisions for you to check

1. **The price rule on every per-share price on the Rounds tab** (section 1), not only the round's.
2. **The blank messages' wording,** and the old message kept where a field can't be named.
3. **The two additions** to "Changes that can break 0.4.0 code" (section 2, item 2).
4. **The speed figures,** with the 204 seconds attributed to 05c2's engine.

## Assumptions added or changed

None: no modeling choice changed.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing ran outside the sandbox.**

## Next

0.5.0 is ready for you to check, publish and tag. After it, the 1.0 pass starts with 1.0a, removing the Milestone names. I'm stopping here.
