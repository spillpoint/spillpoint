# spillpoint 0.7.0: names settled for 1.0

0.7.0 is the naming review. Every name in the public API was reviewed once, and settled (`notes/plan-0.7.0.md`). It's the last release that can break code written for an earlier one: 1.0 has the same API. No payout changes. The version in `packages/engine/package.json` is 0.7.0; it is published from there.

Open Cap Format (OCF) is developed by the Open Cap Table Coalition: https://open-cap-table-coalition.github.io/Open-Cap-Format-OCF/. spillpoint reads files in that format.

OCX is developed by the Open Cap Table Coalition: https://github.com/Open-Cap-Table-Coalition/ocx. spillpoint reads files in that format.

## What 0.7.0 is

**Renamed or removed,** each with what to change below:
- **Generated names:** class names write a strike to the cent, and a series from SAFEs is `<series>_safes`.
- **What the API hands back:** a solution has no `complete`, and a payout keeps neither the breakpoint finder's workings nor `bySecurity`. A built table has its SAFEs and notes in one place. A prepared table shows only its cap table and exit date, and an anti-dilution piece says its kind.
- **Old names:** the OCF names 0.6.0 kept beside their replacements are gone, and so is `solve`'s third argument.

**What the API hands back has exactly the fields its type lists,** and nothing else. `console.log` and `JSON.stringify` show only those, and only they are the API. The engine works on its own objects and builds the public one where it hands it back.

**Kept, and said why:**
- **An import's result stays snake_case,** since it's case-file input to save, fill in, and read or pass on. Everything else the engine returns is camelCase. The README now says so.
- **The `start` event and `issue_order` keep their names.**
- **Optional fields stay optional,** so code that writes a cap table or an exit by hand needn't write what it doesn't have.

## Changed answers

None. Every locked case gives the same amounts, breakpoints and reasons as 0.6.0. The only differences are names: the class names' strikes, and the `_safes` ids, in a reason's subject too.

## Changes that can break 0.6.0 code

Item numbers are the review's (`notes/plan-0.7.0.md`). Each says what changed, what TypeScript reports, what JavaScript sees, and what to change.

### 1. Generated class names write a strike to the cent

- **What changed:** a class the engine names shows its strike to two places at least, with every further place kept and nothing rounded:
  - "Options ($0.1 strike)" is now "Options ($0.10 strike)".
  - "Warrants for Seed Preferred ($5 strike)" is now "Warrants for Seed Preferred ($5.00 strike)".
  - "Options ($0.0025 strike)" is unchanged.

  That's the names a company's rounds make, and an OCF or OCX import's. Ids don't change: `options_0.1`, `warrants_seed_5`. "RSUs (no strike)" is unchanged.
- **TypeScript reports:** nothing. A name is a string.
- **JavaScript sees:** a different string. Code that matched a name's text, "Options ($0.1 strike)", no longer matches.
- **What to change:** match on the class's `id`, which doesn't change, or on the new form.

### 15. A series a round's SAFEs convert into is `<series>_safes`

- **What changed:** its id is `<series>_safes`, matching `<series>_notes` for notes. For example, `seed_safes`, and `series_a_safes_2` for a second price. It was `<series>_shadow`.
- **TypeScript reports:** nothing. An id is a string.
- **JavaScript sees:** an input that names the old id, such as a later round's seniority listing `seed_shadow`, is refused with an `InputError`: "inputs.events[5].seniority: seed_shadow is not a preferred series". Code that looks the series up by its old id finds nothing.
- **What to change:** rename `<series>_shadow` to `<series>_safes`, and `_shadow_2` to `_safes_2`, wherever an input or your code names it.

### 3. A solution has no `complete`

- **What changed:** `Solution` is `{ exitValue, answers }`. `answers` holds exactly one answer. Where a second stable answer pays holders differently, `solve` stops with a `NoAnswerError`, as it already did in 0.6.0, so `complete` was always true.
- **TypeScript reports:** `error TS2339: Property 'complete' does not exist on type 'Solution'.`
- **JavaScript sees:** `undefined`, which is falsy. So `if (!solution.complete)` takes every solution as incomplete.
- **What to change:** drop the check. An answer is never incomplete; a second one throws.

### 4. A payout without the breakpoint finder's workings

- **What changed:** a payout has no `structure` or `capRoom`, and its SAFEs and notes have no `room`.
- **TypeScript reports:**
  - `error TS2339: Property 'structure' does not exist on type 'Payout'.`
  - `error TS2339: Property 'capRoom' does not exist on type 'Payout'.`
  - `error TS2339: Property 'room' does not exist on type 'SafeHere'.`, and likewise for `NoteHere`
- **JavaScript sees:** `undefined` for each.
- **What to change:** nothing replaces them. They described how the breakpoint finder works; `findBreakpoints` gives the breakpoints themselves.

### 7. `ImportRefusal` and `CapTableImport`, the only names

- **What changed:**
  - `readOcf` throws an `ImportRefusal`, its `format` `"ocf"`.
  - `OcfRefusal` is no longer exported.
  - Nor are `OcfImport`, `OcfReport`, `OcfToFill` and `OcfNote`, which 0.6.0 kept as aliases.
  - `OcfFile` stays.
- **TypeScript reports:** `error TS2305: Module '"spillpoint"' has no exported member 'OcfRefusal'.`, and the same for each of the four types.
- **JavaScript sees:**
  - **A named import** of `OcfRefusal` stops the module from loading: `SyntaxError: The requested module 'spillpoint' does not provide an export named 'OcfRefusal'`.
  - **Through a namespace,** `spillpoint.OcfRefusal` is `undefined`, and `e instanceof spillpoint.OcfRefusal` throws `TypeError: Right-hand side of 'instanceof' is not an object`.
  - **A refusal's `name`** is `"ImportRefusal"`, where 0.6.0 gave `"OcfRefusal"`.
- **What to change:** catch `ImportRefusal`, which 0.6.0 already allowed, and use `CapTableImport`, `ImportReport`, `ImportBlank` and `ImportNote`.

### 8. `solve` takes two arguments

- **What changed:** `solve(table, exitValue)`. The third argument, `{ checkEveryCombination }`, and the `SolveOptions` type are gone. Since 0.5.0, every combination is checked with 12 or fewer decision-makers anyway.
- **TypeScript reports:**
  - `error TS2554: Expected 2 arguments, but got 3.`
  - importing the type: `error TS2305: Module '"spillpoint"' has no exported member 'SolveOptions'.`
- **JavaScript sees:** the third argument is ignored.
- **What to change:** drop it.

### 9. A payout's `classTotals`, without `bySecurity`

- **What changed:** a payout has no `bySecurity`. `classTotals` gives each security's total, options and warrants net of strike, the same to the cent. The two can differ in the last of their 40 digits, since they add up in a different order.
- **TypeScript reports:** `error TS2339: Property 'bySecurity' does not exist on type 'Payout'.`
- **JavaScript sees:** `undefined`, so `payout.bySecurity.get(id)` throws `TypeError: Cannot read properties of undefined (reading 'get')`.
- **What to change:** read `payout.classTotals`.

### 10. A built table's SAFEs and notes in one place

- **What changed:** each table `buildCapTables` gives is `{ event, date, capTable, details }`. The top-level `unconvertedSafes` and `unconvertedNotes` are gone. The same lists are on `capTable`, which leaves a list out when it's empty.
- **TypeScript reports:** `error TS2339: Property 'unconvertedSafes' does not exist on type 'CapTableAfterEvent'.`, and the same for `unconvertedNotes`.
- **JavaScript sees:** `undefined`, so `t.unconvertedSafes.map(...)` throws `TypeError: Cannot read properties of undefined (reading 'map')`.
- **What to change:** read `t.capTable.unconvertedSafes ?? []`, and the same for notes.

### 11. A prepared table shows its cap table and exit date

- **What changed:** what `prepare` returns is `{ capTable, exitDate }`, in type and object. The 13 quantities the engine works out once stay with it inside the engine:
  - `shares`, `preferred`, `options`, `warrants`
  - `safes`, `notes`, `outstanding`, `commonIds`
  - `preference`, `dividends`, `capTotal`, `asConverted`

  `NoteTerms`, reachable only through them, is no longer exported.
- **TypeScript reports:**
  - `error TS2339: Property 'preferred' does not exist on type 'PreparedCapTable'.`, and the same for each
  - `error TS2305: Module '"spillpoint"' has no exported member 'NoteTerms'.`
- **JavaScript sees:** `undefined`, so `pc.dividends.get(id)` throws `TypeError: Cannot read properties of undefined (reading 'get')`.
- **A table written by hand still works.** One written as `{ capTable, exitDate }` is prepared on first use, and so is one written out with all 13 fields, the extra fields unread.
- **What to change:** read the cap table, or the payout:
  - each series' preference, accrued dividends, cap and as-converted shares are on `payout.series`
  - the series, options and warrants are in `capTable.securities`

### 12. An anti-dilution piece's `kind` and `id`

- **What changed:** each of an adjustment's `pieces` is `{ kind, id, price, counted, inA }`:
  - `kind` is `"new_money"`, `"safe"` or `"note"`
  - `id` is null for the new money

  `piece` is gone. It was the string "new money" or an id, which couldn't be told apart.
- **TypeScript reports:** `error TS2551: Property 'piece' does not exist on type 'AntiDilutionPiece'. Did you mean 'price'?`
- **JavaScript sees:** `undefined`. So `p.piece === "new money"` is false for every piece, and code that tests it takes the new money for a conversion.
- **What to change:** read `p.kind === "new_money"`, and `p.id` for a SAFE or note.

### The exports

**At runtime, 18,** down from 0.6.0's 19: `OcfRefusal` is gone.

**Six types are gone:** `OcfImport`, `OcfReport`, `OcfToFill`, `OcfNote`, `SolveOptions` and `NoteTerms`. None is new.

### The page's saved files

**Files saved before 0.7.0 open as before, unless a round names a series from SAFEs in its seniority.** Such a file doesn't open: "Its rounds can't be built. inputs.events[5].seniority: seed_shadow is not a preferred series". That's the case for:
- **any file saved from the Millrace example**, whose rounds list `seed_shadow`
- **any company with a priced round after one that converted SAFEs**, since the page writes a round's seniority from the cap table before it, series from SAFEs included

A file with a cap table and no rounds, or rounds that convert no SAFEs, opens unchanged.

## No break, and new

- **`parseExact(value)`** needs no path. An error then names `value`.
- **Stable from 1.0.** The engine README's new section lists every name code can match on, each with what it means:

  | List | Names | Also given |
  |---|---:|---|
  | `UnsupportedTermError`'s terms | 11 | |
  | `ImportRefusal`'s OCF terms | 50 | each term's kind |
  | `ImportRefusal`'s OCX terms | 34 | each term's kind |
  | An import's report-note codes | 33 | which format each comes from |
  | `ReasonCode` | 13 | |

  **What it promises:** from 1.0, a name is never renamed or reused for something else. A new one can be added. One stops being raised when spillpoint comes to model what it refuses, and stays listed, marked as no longer raised.

  **How it's held:** the engine raises these names only through typed lists, so the compiler refuses one that isn't listed, and a test fails if the README's lists and the engine's differ.
- **`D` is decimal.js's `Decimal`,** at 40 significant digits. Every amount the API takes or returns is one, so it's part of the API: a major decimal.js release that changed `Decimal` would be a major spillpoint release. spillpoint stays on decimal.js 10 (`^10.6.0`), and moves to a new major only with a new major of its own.

## On the page

- **The pro-rata setting, in plain words.** A round's "More terms" said "Pro-rata counts the unissued pool". It now says "Pro-rata base includes the unused option pool (smaller pro-rata rights for earlier investors)".
  - It shows only for a round with an investment under its pro-rata right.
  - On without one, it stays shown, marked "(doesn't apply to this round)".
  - The saved file's field name is unchanged.
- **Strikes to the cent.** The Rounds tab writes a grant's and a warrant's strike as the class names do: "options at $0.10 a share", beside "Options ($0.10 strike)". It used to write what was typed, "$0.1". So does the OCF import's report, which rounded a strike past six places.
- **Class names to the cent,** from the engine, wherever the page shows a class.
- **Saved files:** as above.

## How it's tested

- **Every locked case gives the same results as 0.6.0.** The 83 exit and round cases, the 13 OCF and the 12 OCX, apart from the names above.
- **The names and ids (07b):**
  - two substitutions, given as a script, turn 0.6.0's 74 case files into 0.7.0's, byte for byte
  - the reference calculator, renamed the same way, rebuilds every exit and round case exactly
- **Checked independently, on packed builds:**
  - **The API changes,** on the code just before them: the same results to all 40 digits. That covers 356 exit values with every payout field, 163 breakpoints with their reasons, 3 payment schedules, 191 built tables with their details, and the 18 OCF and OCX imports. The only difference is the dropped top-level SAFE and note lists, which always equalled the cap table's.
  - **The page's changes:** the engine's results, byte for byte.
  - **An independent calculator,** on 54 fuzzed tables: 216 payouts, 51 breakpoint lists and 3 two-answer stops.
  - **The old and new code:** new-style code typechecks under `nodenext`, and old-style code fails with the errors above.
- **Every object the API hands back has exactly its type's fields.** A test checks each against its type's list at every exit value every case lists, and each list against its type when the tests compile.
- **The stable names:** a test holds the README's "Stable from 1.0" lists to the engine's, and checks that every refusal term and note code a case records is listed.

## Still refused

Unchanged from 0.6.0: the engine's list (its README's "What it refuses") and the OCF and OCX deferrals.
