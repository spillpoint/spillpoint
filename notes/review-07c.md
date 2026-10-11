# Review: 07c (the naming review: the engine)

Branch `07c-engine-names`. It covers:
- items 3, 4 and 7 to 14 of `notes/plan-0.7.0.md`, with item 16's small things
- items 17 and 18's README sections
- both READMEs

**No version bump:** it ships in 0.7.0.

**The cases lock is on,** and nothing under `cases/` changed. No amount, breakpoint, refusal term or refusal message changed from 0.6.0: every case test passes on the same case files, and `generate.py --check` passes all 83.

**The page moved with the engine,** so main stays green. Nothing a user sees changes, and no page test changed (section 6).

**One commit per item,** so each can be checked on its own:

| Commit | What |
|---|---|
| `17b7e57` | Item 3: a solution has no `complete` |
| `6fa6b6c` | Item 4: a payout without the breakpoint finder's workings |
| `60e3586` | Item 9: a payout's `classTotals`, without `bySecurity` |
| `0710fe1` | Item 11: a prepared table shows its cap table and exit date |
| `91e0fd4` | Item 10: a built table's SAFEs and notes in one place |
| `a080f39` | Item 12: an anti-dilution piece's `kind` and `id` |
| `4bbce69` | Item 7: `ImportRefusal` and `CapTableImport`, the only names |
| `476b759` | Item 8: `solve` takes two arguments |
| `880ee84` | Item 13: `parseExact`'s path is optional |
| `a26d89c` | Item 14: optional fields, said why |
| `cc9d1cf` | Item 16: an orphaned doc comment, and `ReasonCode`'s `"other"` |
| `31f685c` | Everything the API hands back has exactly its type's fields |
| `096c876` | Item 17: the names code can match on, stable from 1.0 |
| `379a874` | Item 18: `D` is decimal.js's `Decimal`, in the README |
| `3f4bc1e` | Both READMEs |
| `d5a87a4` | ASSUMPTIONS follows the naming review |

Each item's commit carries the page's and the tests' share of it.

## 1. Changes that can break 0.6.0 code

**How these were checked:** I packed this branch, installed it in a throwaway project outside the repo, and ran 0.6.0-style code against it:
- a TypeScript file under `nodenext`
- a JavaScript file run on case 13e and case 16g

Each "TypeScript reports" is the compiler's message, and each "JavaScript sees" is what the run printed.

### Item 3: a solution has no `complete`

- **The change:** `Solution` is `{ exitValue, answers }`. `answers` holds exactly one answer. A second stable answer that pays holders differently stops `solve` with a `NoAnswerError`, which it already did in 0.6.0, so `complete` was always true.
- **TypeScript reports:** `error TS2339: Property 'complete' does not exist on type 'Solution'.`
- **JavaScript sees:** `undefined`, which is falsy. So `if (!solution.complete)` takes every solution as incomplete.
- **What to change:** drop the check. An answer is never incomplete; a second one throws.

### Item 4: a payout without the breakpoint finder's workings

- **The change:** `Payout` has no `structure` or `capRoom`. A payout's `SafeHere` and `NoteHere` have no `room`. They're gone from the type and from the object.
- **TypeScript reports:**
  - `error TS2339: Property 'structure' does not exist on type 'Payout'.`
  - `error TS2339: Property 'capRoom' does not exist on type 'Payout'.`
  - `error TS2339: Property 'room' does not exist on type 'SafeHere'.`, and likewise for `NoteHere`
- **JavaScript sees:** `undefined` for each.
- **What to change:** nothing replaces them. They described how the breakpoint finder works; `findBreakpoints` gives the breakpoints themselves.

### Item 7: `ImportRefusal` and `CapTableImport`, the only names

- **The change:**
  - `readOcf` throws an `ImportRefusal` itself, its `format` `"ocf"`.
  - `OcfRefusal` is no longer exported.
  - Nor are the types `OcfImport`, `OcfReport`, `OcfToFill` and `OcfNote`.
  - `OcfFile` stays.
- **TypeScript reports:** `error TS2305: Module '"spillpoint"' has no exported member 'OcfRefusal'.`, and the same for each of the four types.
- **JavaScript sees:**
  - **A named import** of `OcfRefusal` stops the module loading: `SyntaxError: The requested module 'spillpoint' does not provide an export named 'OcfRefusal'`.
  - **Through a namespace,** `spillpoint.OcfRefusal` is `undefined`, and `e instanceof spillpoint.OcfRefusal` throws `TypeError: Right-hand side of 'instanceof' is not an object`.
  - **The refusal's `name`** is `"ImportRefusal"`, where 0.6.0's was `"OcfRefusal"`.
- **What to change:** catch `ImportRefusal`, as 0.6.0 already allowed, and use the shared type names: `CapTableImport`, `ImportReport`, `ImportBlank` and `ImportNote`.

### Item 8: `solve` takes two arguments

- **The change:** `solve(table, exitValue)`. The third argument, `{ checkEveryCombination }`, and the `SolveOptions` type are gone.
- **TypeScript reports:**
  - `error TS2554: Expected 2 arguments, but got 3.`
  - importing the type: `error TS2305: Module '"spillpoint"' has no exported member 'SolveOptions'.`
- **JavaScript sees:** the third argument is ignored.
  - **With 12 or fewer decision-makers,** every combination is still checked, as it has been since 0.5.0, so nothing changes.
  - **Past 12,** where the two ends agree, it no longer checks every combination on request.
- **What to change:** drop the third argument.

### Item 9: a payout's `classTotals`, without `bySecurity`

- **The change:** `Payout` has no `bySecurity`. `classTotals` gives each security's total, options and warrants net of strike, the same to the cent. The two can differ in the last of their 40 digits, since they add up in a different order.
- **TypeScript reports:** `error TS2339: Property 'bySecurity' does not exist on type 'Payout'.`
- **JavaScript sees:** `undefined`, so `payout.bySecurity.get(id)` throws `TypeError: Cannot read properties of undefined (reading 'get')`.
- **What to change:** read `payout.classTotals`.

### Item 10: a built table's SAFEs and notes in one place

- **The change:** a `CapTableAfterEvent` is `{ event, date, capTable, details }`. The top-level `unconvertedSafes` and `unconvertedNotes` are gone. The same lists are on `capTable`, which leaves a list out when it's empty.
- **TypeScript reports:** `error TS2339: Property 'unconvertedSafes' does not exist on type 'CapTableAfterEvent'.`, and the same for `unconvertedNotes`.
- **JavaScript sees:** `undefined`, so `t.unconvertedSafes.map(...)` throws `TypeError: Cannot read properties of undefined (reading 'map')`.
- **What to change:** read `t.capTable.unconvertedSafes ?? []`, and the same for notes.

### Item 11: a prepared table shows its cap table and exit date

- **The change:** `PreparedCapTable` is `{ capTable, exitDate }`, and so is the object `prepare` returns. `Object.keys(prepare(t))` gives exactly those two. The 13 working quantities are gone from both type and object:
  - `shares`, `preferred`, `options`, `warrants`
  - `safes`, `notes`, `outstanding`, `commonIds`
  - `preference`, `dividends`, `capTotal`, `asConverted`

  `NoteTerms`, reachable only through `notes`, is no longer exported.
- **TypeScript reports:**
  - `error TS2339: Property 'preferred' does not exist on type 'PreparedCapTable'.`, and the same for each working field
  - `error TS2305: Module '"spillpoint"' has no exported member 'NoteTerms'.`
- **JavaScript sees:** `undefined` for each, so `pc.dividends.get(id)` throws `TypeError: Cannot read properties of undefined (reading 'get')`.
- **A table written by hand still works.** One built as `{ capTable, exitDate }` is prepared on first use, and a 0.6.0 table written out with all 13 fields still works too, the extra fields unread.
- **What to change:** read the cap table, or the payout:
  - each series' preference, accrued dividends, cap and as-converted shares are on `payout.series`
  - the preferred series, options and warrants are in `capTable.securities`

### Item 12: an anti-dilution piece's `kind` and `id`

- **The change:** `AntiDilutionPiece` is `{ kind, id, price, counted, inA }`:
  - `kind` is `"new_money"`, `"safe"` or `"note"`
  - `id` is null for the new money

  `piece` is gone. It was `"new money"` or an id, which couldn't be told apart.
- **TypeScript reports:** `error TS2551: Property 'piece' does not exist on type 'AntiDilutionPiece'. Did you mean 'price'?`
- **JavaScript sees:** `undefined`. So `p.piece === "new money"` is false for every piece, and code that tests it treats the new money as a conversion.
- **What to change:** read `p.kind === "new_money"`, and `p.id` for a SAFE or note.

### No break

- **Item 13:** `parseExact(value)` needs no path. An error then names `value`.
- **Item 14:** the optional fields stay optional, with comments that say why: code writing a table by hand needn't write what it doesn't have.
- **Item 16:** a doc comment. `ReasonCode` is unchanged, `"other"` included.
- **Item 17:** the README lists. The public types, terms and messages are unchanged.
- **Item 18:** the README says what's already so.
- **The rule for every object (section 3):** removes nothing beyond items 4, 9, 10 and 11. One thing to know: a payout's `lines`, `holderTotals` and `classTotals` are now plain fields, where 0.6.0 had getters. They read the same.

## 2. `index.ts`'s exports, before and after

**Runtime: 19 before, 18 after.** `OcfRefusal` goes.
- **Before:** `D`, `ImportRefusal`, `InputError`, `NoAnswerError`, `OcfRefusal`, `UnsupportedTermError`, `buildCapTables`, `findBreakpoints`, `parseExact`, `paySchedule`, `payout`, `prepare`, `readCapTable`, `readExit`, `readInputs`, `readOcf`, `readOcx`, `solve`, `toCents`.
- **After:** the same, without `OcfRefusal`. The API test pins the 18.

**Types: six go, none added.**

| Gone | Item | Use instead |
|---|---|---|
| `OcfImport` | 7 | `CapTableImport` |
| `OcfReport` | 7 | `ImportReport` |
| `OcfToFill` | 7 | `ImportBlank` |
| `OcfNote` | 7 | `ImportNote` |
| `SolveOptions` | 8 | nothing: `solve` takes two arguments |
| `NoteTerms` | 11 | nothing: it was a prepared table's working field |

**The diff:**

```diff
-export { ImportRefusal, InputError, NoAnswerError, OcfRefusal, UnsupportedTermError } from "./errors.ts";
+export { ImportRefusal, InputError, NoAnswerError, UnsupportedTermError } from "./errors.ts";
-export type { CarveOutHere, Decisions, NoteHere, NoteTerms, Payout, PayoutLine, PreparedCapTable, SafeHere, SeriesHere, TierPayment } from "./waterfall.ts";
+export type { CarveOutHere, Decisions, NoteHere, Payout, PayoutLine, PreparedCapTable, SafeHere, SeriesHere, TierPayment } from "./waterfall.ts";
-export type { Answer, Solution, SolveOptions } from "./decisions.ts";
+export type { Answer, Solution } from "./decisions.ts";
-export type { OcfFile, OcfImport, OcfNote, OcfReport, OcfToFill } from "./ocf.ts";
+export type { OcfFile } from "./ocf.ts";
```

## 3. Out of the type means out of the object

**How the engine does it.** It works on its own internal objects and builds the public one where it hands it back:
- **A payout:** the engine works on a `Settlement`, the public `Payout` plus `bySecurity`, `structure`, `capRoom`, and a SAFE's and note's `room`. `payout()` and `solve`'s answers return `publicPayout`'s copy, with `Payout`'s fields and no others. The breakpoint finder keeps the settlement.
- **A prepared table:** `prepare` returns `{ capTable, exitDate }`, and its working quantities stay with it in a WeakMap, `working()` in `waterfall.ts`. I chose a WeakMap over fields that don't show (decision 1).
- **The solver:** its internal answers carry the settlement, `Worked`. Only `exact()` builds the public `Answer`.

**The test:** `public-shapes.test.ts` holds every public object the API returns to its type's field list. Each list is checked against its type both ways when the tests compile; I tried a missing field and an extra one, and both fail to compile. Each object is then checked against its list when the tests run:
- **Inputs:** every input every exit case reads, everything in its cap table included.
- **Exit values:** every prepared table, solution, answer and payout, everything in the payout included, at every exit value every case lists.
- **Search results:** every breakpoint and reason, and every payment take.
- **Built tables:** every table each round case builds, with its details down to each anti-dilution piece and pay-to-play holder.
- **Imports:** every OCF and OCX import.

**What it pins,** as you asked: a payout's keys, an answer's, a built table's, and a prepared table's, which are exactly `capTable` and `exitDate`. It also checks that a table written by hand solves as `prepare`'s does. Beyond items 4, 9, 10 and 11, it found nothing else showing.

## 4. Item 17: a test that the README lists every name

**The README's new "Stable from 1.0" section** lists every name code can match on, each with what it means:

| List | Names | Also given |
|---|---:|---|
| `UnsupportedTermError`'s terms | 11 | |
| `ImportRefusal`'s OCF terms | 50 | each term's kind |
| `ImportRefusal`'s OCX terms | 34 | each term's kind |
| An import's report-note codes | 33 | which format each comes from |
| `ReasonCode` | 13 | |

It says a name is never renamed or reused from 1.0, and that one that stops being raised stays, marked so.

**How the test knows what the engine can raise:**
- **The lists:** `src/stable-names.ts`, internal and not exported.
- **The raise sites take the lists' types:**
  - `unsupportedTerm` in `errors.ts`, which the engine now raises through
  - `ocf-read.ts`'s and `ocx-cells.ts`'s refusal helpers
  - `Notes.add`
  - `ReasonCode`, now made from its list

  So the compiler refuses a name that isn't listed.
- **`stable-names.test.ts` checks:**
  - each list equals its README section, both ways
  - nothing builds an `UnsupportedTermError` or an `ImportRefusal` outside those helpers
  - every refusal term and note code any case records is listed

**It fails when it should:** with one README entry taken out, it fails.

**It caught one name already.** My first scan of the source matched names without digits, so it missed `safe_exit_multiple_read_as_1`, an OCF note code. The typed list caught it at compile time, and it's in the README.

**Four OCF terms come from a table:** `note_accrual_period`, `note_cash_interest`, `note_compounding` and `note_day_count`. A source scan would miss them too; the typed table can't.

## 5. The READMEs

**The engine README:**
- **The API table:**
  - `prepare` shows `capTable` and `exitDate`
  - `solve` returns `{ exitValue, answers }`, with no `complete` and no third argument
  - `payout` says what a payout holds, and what 0.7.0 took out
  - `buildCapTables` has its SAFEs and notes on `capTable`
  - `findBreakpoints`' reasons have `starts`, and their codes link to the stable list
  - `parseExact`'s `where` is optional
- **New lines:** what the API hands back has exactly its types' fields; item 2's rule (what reads an input returns camelCase objects, and `readOcf` and `readOcx` return case-file JSON in snake_case, since what they give is input); and item 18's paragraph under "Numbers".
- **The errors:** they link their terms to the stable list, and `ImportRefusal`'s entry says the OCF names are gone.
- **The rest:**
  - the OCF section's 0.6.0 notes say what 0.7.0 removed
  - the rounds example and the pieces sentence follow items 10 and 12
  - *(0.7.0)* joins the version markers

**The root README:**
- its engine paragraph says the engine's README lists every name code can match on, stable from 1.0
- its 0.7.0 bullet says what 0.7.0 settles

The release sentence itself waits for 07e.

**ASSUMPTIONS:**
- E15 said that past 12 decision-makers the engine reports the answers it found and flags the list as possibly incomplete. Since 0.5.0 it stops, and since 0.7.0 there's no flag, so E15 now says so.
- Two Later items are settled and removed: the snake_case outer names (item 2) and `complete` (item 3).

## 6. The page

**What moved:**
- **`capTable.ts` and `PayoutTable.tsx`:** read preferred series and warrants from `capTable.securities`, where they used `pc.preferred` and `pc.warrants`. The dividends footnote reads each series' accrued dividends from `answer.payout.series`, the same amounts as `pc.dividends`.
- **`rounds.ts`:** reads a built table's SAFEs and notes from its cap table, and an anti-dilution piece's `kind` and `id`.
- **`ocfImport.ts` and `ocfCheck.ts`** (and so `pnpm ocf-check`): catch `ImportRefusal` and use the shared type names.

**Nothing a user sees changes.** No page test changed, and all 654 pass, among them those that pin:
- **the dividends footnote:** "Seed Preferred has accrued $960,657.53 …"
- **the anti-dilution lines:** "New money at $1.13 a share: …"

**The engine's dev scripts** (`packages/engine/scripts`: `payouts.ts`, `rounds.ts`) moved too.

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   I got:
   - 3,115 engine tests
   - 654 page tests, unchanged
   - the reference's 73 unit tests
   - all 83 exit and round cases matching the reference
2. **No case changed:**

   ```bash
   git diff --stat main -- cases
   ```

   It prints nothing.
3. **A prepared table, as JavaScript sees it.** From `packages/engine`, this prints `[ 'capTable', 'exitDate' ]`:

   ```bash
   node --input-type=module -e 'import { readFileSync } from "node:fs"; import { prepare, readInputs } from "./src/index.ts"; const e = readInputs(JSON.parse(readFileSync("../../cases/millrace/inputs.json", "utf8"))); console.log(Object.keys(prepare(e.capTable, e.exitDate)));'
   ```
4. **The shapes test on its own,** from `packages/engine`:

   ```bash
   npx vitest run test/public-shapes.test.ts test/stable-names.test.ts
   ```
5. **On the page,** with `pnpm dev`, nothing should look different:
   - Millrace opens with the same payouts, breakpoints and Rounds-tab lines.
   - A cap table with cumulative dividends shows the same accrued amount in its footnote.

## Decisions for you to check

1. **A WeakMap for a prepared table's working quantities,** not fields that don't show. Nothing on the object can be reached, even by name. A table written by hand is prepared on first use, so `{ capTable, exitDate }` is all a caller needs to write.
2. **`NoteTerms` is no longer exported.** Item 11 left it reachable only through a prepared table's working fields.
3. **The stable lists are typed constants in the engine,** internal and not exported, rather than a scan of the source. A scan missed one name; the compiler doesn't.
   - **The README's entries:** each import term gives its kind, and each note code its format.
   - **The test** reads the README's "### …" lists.
4. **`parseExact` with no path names `value`** in its error.
5. **Item 2's rule is written into the README** (camelCase objects, and snake_case case-file JSON from the imports). The plan said the README would say it, though your 07c list didn't name item 2. Item 16's small things are a commit of their own.
6. **ASSUMPTIONS:** E15's wording corrected, and the two settled Later items removed.

## Open questions

1. **Export the stable lists?** Code could check a term against `UNSUPPORTED_TERMS`, for one. Adding exports breaks nothing, so it can come after 1.0 too. I've left them internal.
2. **`Draft.late()` in `ocx-import.ts`** is never called, so the late notes it keeps are always empty. Remove it in 07d, or leave it?

## Assumptions added or changed

No modeling choice changed. In ASSUMPTIONS:
- E15's wording follows what the engine has done since 0.5.0
- two Later items are removed, settled

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing ran outside the sandbox.** The packed check linked the installed decimal.js, and nothing was downloaded.

## Next

07d, the page: item 6, and anything 07b and 07c change that a user sees. I'm stopping here.
