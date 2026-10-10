# Plan: 0.7.0, the naming review

0.7.0 is the last release that breaks anything. 1.0 has the same API, at its own domain. So every name in the public API is reviewed once, here, and settled.

**Written now, while 0.6.0 waits for an export's headers.** It settles the names `readOcx` will use, so 0.6.0 builds to them. The renames and removals themselves ship in 0.7.0, after 0.6.0's OCX import. Your answers are after the questions, and the plan follows them where they differ from what I first wrote.

**Each item says:**
- what it is today
- what I'd do
- what it breaks, for three readers:
  - code using the npm package
  - the page and its saved files
  - the locked cases
- what it means for `readOcx`, where it touches it

Your seven items come first, then eight more of mine. The questions are at the end.

## What's in scope

**The npm package's public API:**
- the 17 exports `index.ts` names
- every type it exports, field by field, read from the built declarations (`dist/*.d.ts`)
- the shape of an import's result
- the errors
- the names the engine generates for classes and series

**The page's one label** on your list.

**Out of scope: the case-file input format,** the snake_case JSON that `readExit`, `readInputs` and `buildCapTables` read. Every locked case is written in it, so renaming a field would edit every case's inputs. It stays as it is. The one exception I raise is the `_shadow` id (item 15).

**Two claims checked on every case first:**
- **`solve` returned exactly one answer, with `complete` true,** at all 356 exit points the cases list, and at their breakpoints too (your count, 470 points).
- **`payout.bySecurity` and `payout.classTotals` agree to the cent, but not exactly** (corrected after your check). My first check compared them within 10⁻²⁰, which hid the difference. Compared exactly, at the exit values and breakpoints together, 126 of the 519 points I took differ, by at most 2 × 10⁻³², from summing in a different order (your count, 105 of 470).

## Your list

### 1. Class names show money to the cent

**Today:** a generated class's name writes its strike as the engine writes the number: "Options ($0.1 strike)", "Options ($5 strike)", "Warrants for Seed Preferred ($1 strike)". The page shows these names.

**What I'd do:**
- **The strike, to at least two decimal places:** "Options ($0.10 strike)", "Options ($5.00 strike)", "Warrants for Seed Preferred ($1.00 strike)". A strike with more places keeps them all ("$0.0125").
- **"RSUs (no strike)"** is unchanged.
- **Ids stay as they are** (`options_0.1`, `warrants_seed_1`): they're keys, and inputs name them in positions.

**What it breaks:**
- **npm code:** anything matching a generated name's text.
- **The page:** nothing to migrate. A company built from rounds gets its names from the engine on every load, and a cap table entered directly keeps the names it was saved with.
- **The locked cases:** 34 `expected.json` files record generated names, from round cases and OCF imports, and 21 `inputs.json` files write names in the same form themselves, which are brought into line too (your answer 1). Names only: no amount, share count or breakpoint changes. It goes in 07b, with the engine's and the reference's naming code and the tests that pin names, all at once (your answer 17).

**For `readOcx`:** OCX has no strikes, so `readOcx` can't name an option class by its strike. Each option column becomes a class named by its own heading, as the export wrote it (the plan's name, or "Class A Common Stock Options"), with an id by position, `options_1`, `options_2`. Warrants likewise: "Warrants for Seed Preferred", with no strike in the name.

### 2. `readOcf`'s snake_case outer names

**Today:**
- **`OcfImport`:** `as_of`, `cap_table`, `issue_order`, `to_fill`, `report`.
- **The report:** `read`, `not_needed`, `notes`.
- **A blank:** `{ security?, safe?, note?, field }`.
- **A note:** `{ code, subject?, field? }`.

Everything else the engine returns is camelCase.

**What I'd do: keep snake_case, and write the rule down.** An import's result is data in the case-file format, ready to:
- save as JSON
- read with `readCapTable` once its blanks are filled
- pass to a `start` event, whose own fields are `date`, `cap_table` and `issue_order`

So its names are the fields it feeds. The rule, in the README: functions that read an input (`readExit`, `readInputs`, `readCapTable`, `buildCapTables`) return the engine's camelCase objects; `readOcf` and `readOcx` return case-file JSON.

**The other way:** camelCase the outer names (`asOf`, `toFill`, `notNeeded`, `issueOrder`), with `cap_table` inside still case format. That mixes the two conventions in one object, and the page's 9 uses and the README would change.

**What it breaks:** nothing, kept.

**For `readOcx`:** `readOcx` returns the same shape, snake_case.

### 3. `solve`'s `complete`

**Today:** `Solution` is `{ exitValue, answers, complete }`.
- **`answers` always holds exactly one answer.** A second stable answer that pays holders differently throws a `NoAnswerError` (E8). Answers that pay everyone the same are one.
- **`complete` is always true:** the one case that made it false, past 12 decision-makers with the two ends disagreeing, now has two answers, so it throws first.
- **The doc comment is stale:** it still says "Every distinct stable answer. Almost always exactly one."

**What I'd do:**
- **Drop `complete`.**
- **Keep `answers` as a list,** documented as "exactly one; a second stable answer stops with `NoAnswerError` (E8)". The later list has "report both answers, with a locked case": a list lets that come after 1.0 without a break, where a single `answer` field would need one.

**What it breaks:**
- **TypeScript** that reads `complete` doesn't compile.
- **JavaScript** gets `undefined`, which is falsy, so code testing `if (!solution.complete)` would think every answer incomplete. The release notes say so plainly.
- **The page and the cases:** nothing; neither reads it.

### 4. `payout.structure`, and the finder's other fields

**Today:** four fields on a payout exist only for the breakpoint finder:
- **`structure`:** a list of `Slack`, each a label and a signed amount, the conditions the waterfall's formula turns on (05c4). `Slack` isn't even exported.
- **`capRoom`:** for each capped series not yet at its cap, how far it is from the cap.
- **`room` on a SAFE or a note at the sale:** with no cap, how far it is from being able to convert.

**What I'd do: take all four out of the public `Payout` type.** The engine keeps them inside. They describe how the finder works, not what a payout is, and documenting them would freeze the finder's internals for 1.0.

**What it breaks:** TypeScript that reads them. The page reads none. Nothing in the cases.

### 5. The `start` event and `issue_order`

**Today:**
- **The event:** `{ "id", "date", "type": "start", "cap_table", "issue_order" }` (R31, C17).
- **Its result:** the details kind `"start"`.
- **An import:** `OcfImport.issue_order`.

**What I'd do: keep both.**
- **`start`** reads as where the company starts, beside `issue`, `create_pool` and `priced_round`.
- **`issue_order`:** I looked for a better name. `order_issued` and `issued_in_order` read no better, and "issue order" is how R25's question is put: issued before or after the series.

Both are in the page's saved files (version 6), so a rename would also need a file migration.

**What it breaks:** nothing, kept.

### 6. The page's "Pro-rata counts the unissued pool"

**Today:** a checkbox under a round's "More terms", worded as a developer would put it.

**What I'd do:** word it as 03i worded the anti-dilution pool setting: "Pro-rata base includes the unused option pool (smaller pro-rata rights for earlier investors)".
- **Why smaller:** a bigger base gives each investor a smaller share of it. Millrace's Harbor Lane goes from 28.70% to 25.00% (R6).
- **When it shows:** only when the round has an investment marked pro-rata, with "(doesn't apply to this round)" when it's on but nothing uses it, as 03i did for its two settings.

**What it breaks:** nothing. The field's name in a saved file is unchanged.

### 7. One refusal class and one result type for the two imports

**Today:**
- **The refusal:** `readOcf` throws `OcfRefusal { kind, term, subject }`.
- **The result:** `OcfImport`, with `OcfReport`, `OcfToFill` and `OcfNote`.
- **The input:** `OcfFile`.

**What I'd do: one of each, shared by both imports.**
- **`ImportRefusal`:** `kind` (`"unsupported"` or `"malformed"`), `term` and `subject`, plus `format`, `"ocf"` or `"ocx"`.
- **`CapTableImport`:** today's fields: `as_of`, `cap_table`, `issue_order`, `to_fill`, `report`.
- **`ImportReport`, `ImportBlank` and `ImportNote`:** for the report, a blank and a report note.
- **The inputs keep their own names:** `OcfFile`, and for OCX, `OcxWorkbook`, `OcxSheet` and `OcxCell` (below).

**Why one:** the page and the check script handle a refused or read import the same way, whichever format it came from. One class means one `catch` and one report. A term is specific to its format already (`unknown_object_type` is OCF's), and `format` says which.

**The order it goes in:**
- **0.6.0:** `ImportRefusal` and `CapTableImport` are new exports from 06c, the step that doesn't wait for headers, and `readOcx` is built with them after. `OcfRefusal` becomes a subclass of `ImportRefusal`, and `OcfImport` and its parts become aliases of the new types. **Nothing breaks in 0.6.0,** and code can move early.
- **0.7.0:** the old names go. `readOcf` throws `ImportRefusal` itself.

**What it breaks, in 0.7.0:** `instanceof OcfRefusal` and the four type names. The page has 3 uses, and the README 3.

**For `readOcx`:**
- **A blank:** keeps today's shape, `{ security?, safe?, note?, field }`. OCX's seniority blank, which belongs to no one security, is `{ field: "seniority" }`.
- **`subject`** for an OCX refusal names the tab and the header or row it's about. It's never printed by the summary or the check script (O15).
- **The input types:**
  - **`OcxWorkbook`:** `{ dateSystem, sheets: OcxSheet[] }`.
  - **`OcxSheet`:** `{ name, cells: OcxCell[] }`.
  - **`OcxCell`:** `{ address, kind, text, formula }`.

  A cell's `kind` is `"number"`, `"text"`, `"boolean"`, `"error"` or `"date"` (a number formatted as a date), and its `text` is as stored.

  **Two fields added since I first wrote this,** because 06c's reader needs them:
  - **`dateSystem`,** `1900` or `1904`: a date-formatted number is a day count from one or the other, and only the workbook says which.
  - **`formula`:** whether the cell holds a formula. Its `text` is then the value Excel saved with it, or empty if none was saved. That's how the cell-kinds script answers whether Carta writes values or formulas, and how `readOcx` refuses a formula with no value.

## More I'd flag

### 8. `SolveOptions.checkEveryCombination`

**Today:** `solve(pc, exitValue, { checkEveryCombination: true })` checks every combination even where the two ends agree. Its own comment says tests use it. Since 05c5, every combination is checked with 12 or fewer decision-makers anyway, so it changes anything only past 12.

**What I'd do:** take it out of the public API. With it gone `SolveOptions` is empty, so `solve` takes two arguments and `SolveOptions` isn't exported. The tests keep their switch inside.

**What it breaks:** code passing a third argument: TypeScript flags it, and JavaScript ignores it. The page doesn't pass it.

### 9. `payout.bySecurity` is `payout.classTotals`

**Today:** both map each security to its total, options net of strike. E9's classes are the securities. They agree to the cent, and differ only in the last of their 40 digits, at 126 of 519 points, because they add up in a different order.

**What I'd do:** drop `bySecurity` from the public type. Keep `classTotals` beside `holderTotals` and `lines`, the three names `PaymentTake` already uses. The engine keeps its own total inside, worked out early for the solver.

**What it breaks:** code reading `bySecurity`, including 3 uses on the page, which move to `classTotals`.

### 10. A built table's SAFEs and notes, in two places

**Today:** each `CapTableAfterEvent` has `unconvertedSafes` and `unconvertedNotes` at the top level, and its `capTable` carries the same lists (since 0.2.0, left out when empty), which an exit on that table pays.

**What I'd do:** drop the top-level pair. `capTable.unconvertedSafes` is where an exit reads them, and the README already describes them there.

**What it breaks:**
- **npm code** reading the top-level pair, including the README's own round example, which is rewritten.
- **The page:** one use.

### 11. `PreparedCapTable` shows the engine's working

**Today:** what `prepare` returns exposes 13 working quantities beside `capTable`: `shares`, `preferred`, `options`, `warrants`, `safes`, `notes`, `outstanding`, `commonIds`, `preference`, `dividends`, `exitDate`, `capTotal`, `asConverted`. You pass it to `solve`, `payout`, `findBreakpoints` and `paySchedule`; you needn't read it.

**What I'd do:** the public type shows `capTable` and `exitDate`, and the rest stay inside. What a reader needs is on the payout already: each series' preference, accrued dividends, cap and as-converted shares are on `payout.series`.

**What it breaks:** code reading the working fields. The page reads `preferred`, `warrants` and `dividends` (8 uses), which move to the cap table and the payout. **The other way** is to document all 13 as stable, which freezes how the engine prepares a table.

### 12. An anti-dilution piece named "new money"

**Today:** `AntiDilutionPiece.piece` is the string `"new money"` for the round's new money, or a SAFE's or note's id. An id can't be told from the sentinel, and the page compares against the string.

**What I'd do:** `{ kind: "new_money" | "safe" | "note", id: string | null, price, counted, inA }`, with `id` null for the new money.

**What it breaks:** code reading `piece`, including one use on the page.

### 13. `parseExact`'s second argument

**Today:** `parseExact(value, where)` needs `where`, the path its error names.

**What I'd do:** make it optional. A caller parsing one number has no path to give.

**What it breaks:** nothing.

### 14. Fields optional "so 0.1.0 code keeps working"

**Today:** `CapTable.carveOut`, `unconvertedSafes` and `unconvertedNotes`, `PreferredSeries.cumulativeDividend`, `ExitInput.exitDate` and `paymentSchedules`, and `Safe.cashOutRanksWith` are optional. Their comments give 0.1.0 compatibility as the reason.

**What I'd do:** keep them optional, since code that builds a cap table by hand needn't write empty lists, and change the comments to say that.

**What it breaks:** nothing.

### 15. The `_shadow` id

**Today:** a series a round's SAFEs convert into has the id `<series>_shadow` (`_shadow_2` for a second price). One from notes has `<series>_notes`. "Shadow" is the jargon R5 took out of the names in M4a. The ids kept it because cases' inputs use them.

**Settled (your answer 15): `<series>_safes`,** matching `_notes`.
- **It's the last chance.** After 1.0 the asymmetry would be permanent.
- **It's never shown on the page.**

**What it breaks:**
- **npm code** naming such a series by id, in seniority or positions, including the README's example.
- **The page:** its saved files don't name these ids, since its seniority leaves them out (R28).
- **The locked cases:** 40 files, 18 of them `inputs.json`, whose seniority lists the series. Ids only, in 07b with item 1.

### 16. Small things, no break

- **`rounds.d.ts`** has a doc comment orphaned above `SafeConversion`'s. Removed.
- **`Solution.answers`'s doc comment,** item 3.
- **`ReasonCode`'s `"other"`,** the fallback "Payout slopes change here." where no specific reason is found. Kept as a safety net and documented. No case produces it.

### 17. Refusal terms and report-note codes, stable from 1.0

**Your answer 16(a).** Code matches on them: the page's sale-limit wording turns on `note_with_safe_or_carve_out` and its three neighbours, and the check script prints them.

**What I'd do:** the README lists every one, each with what it means, under "Stable from 1.0":
- **`UnsupportedTermError`'s terms**
- **`ImportRefusal`'s terms, for OCF and OCX**
- **an import's report-note codes**
- **`ReasonCode`,** which code can match on the same way (my addition)

After 1.0 a term is never renamed or reused for something else. A new one can be added, and one stops being raised when its term becomes supported.

**What it breaks:** nothing. It's a promise about the names as they are after 0.7.0.

### 18. `D` is decimal.js's `Decimal`

**Your answer 16(b).** Every amount the API takes or returns is a decimal.js `Decimal`, at 40 significant digits (E14). So a major decimal.js release that changes `Decimal` would be a major spillpoint release.

**What I'd do:**
- **The README says so,** under "Numbers".
- **The dependency stays on decimal.js 10** (`^10.6.0` today).
- **A move to a new major** comes only with a new spillpoint major.

**What it breaks:** nothing.

## The steps

**The order (your answer):** 0.7.0's code can't land before 0.6.0 ships, and 0.6.0 waits on real headers. So none of 07b to 07e starts yet.
- **0.6.0 first.** Its 06c doesn't wait for headers. It adds:
  - item 7's `ImportRefusal` and `CapTableImport` beside the old names, nothing breaking
  - the OCX input types
  - the .xlsx reader
  - the cell-kinds script

  `readOcx` follows, after the headers, built to these names.
- **07b, items 1 and 15 everywhere at once** (the `cases/` edit rule lifted): generated names to the cent and `_shadow` to `_safes`, in:
  - the engine's naming code
  - the reference's naming code
  - the tests that pin names
  - the cases: `expected.json`, `inputs.json` and the DERIVATIONs

  **Why at once:** `rounds.test.ts` compares names with `expected.json`, and `generate.py --check` rebuilds them, so a cases-only PR would leave main red.

  **Your check, instead of a re-derivation** (your answer 17):
  - `generate.py --check` passes
  - main's case files, with only the name and id substitutions applied, are byte-identical to 07b's

  07b's review note lists the substitutions exactly, as a script you can run on main.
- **07c, the engine:** items 3, 4 and 7 to 14, items 17 and 18's README sections, and both READMEs.
- **07d, the page:** item 6, and the page following 07b's and 07c's changes.
- **07e, release 0.7.0:** "Changes that can break 0.6.0 code", item by item.

**Then 1.0:** the domain and the release, with no API changes.

## Questions for you

1. **Class names to the cent,** and the 21 inputs that write names the same way brought into line in the same cases PR?
2. **Keep snake_case** for an import's result, with the rule in the README?
3. **Drop `complete`,** keeping `answers` as a list?
4. **Take `structure`, `capRoom` and both `room` fields** out of the public payout?
5. **Keep `start` and `issue_order`?**
6. **The pro-rata label,** and showing it only when a round has a pro-rata investment?
7. **One `ImportRefusal` and one `CapTableImport`,** with `format` on the refusal, added in 0.6.0 and the old names gone in 0.7.0?
8. **Take `checkEveryCombination` out,** and with it `SolveOptions`?
9. **Drop `bySecurity`** for `classTotals`?
10. **Drop the top-level `unconvertedSafes` and `unconvertedNotes`** on a built table?
11. **Narrow `PreparedCapTable`** to `capTable` and `exitDate`, or document all its fields?
12. **The anti-dilution piece's `kind` and `id`?**
13. **`parseExact`'s `where` optional?**
14. **Keep the optional fields,** with the comments changed?
15. **`_shadow` to `_safes`,** or keep it?
16. **Anything else** in the API you'd want reviewed while it can still change?
17. **The names-and-ids cases PR (07b):** a check of the diff, names and ids only, rather than an independent re-derivation?

## Your answers (2026-10-10)

**Your check:**
- **`complete`** is true with one answer at every case point: 470 by your count, breakpoints included.
- **The file counts** for items 1 and 15 are right: 34 and 21; 40 and 18.
- **`bySecurity` and `classTotals`** agree to the cent but not exactly. Corrected above, and dropping `bySecurity` still stands.

**The answers:**
1. **Items 1 to 14:** as I'd do them, including the 21 inputs brought into line.
2. **Item 15:** `_safes`.
3. **Item 16, two more,** now items 17 and 18:
   - **(a)** refusal terms and report-note codes: code matches on them, so the README lists them as stable from 1.0.
   - **(b)** `D` is decimal.js's `Decimal` at 40 digits, so a major decimal.js upgrade would be a major spillpoint one. The README says so.
4. **Item 17, a check instead of a re-derivation,** on two conditions:
   - **07b carries items 1 and 15 everywhere at once:** the engine's and the reference's naming code, the tests that pin names, and the cases. `rounds.test.ts` compares names with `expected.json`, and `generate.py --check` rebuilds them, so a cases-only PR would leave main red.
   - **Your check:** `generate.py --check` passes, and main's case files, with only the name and id substitutions applied, are byte-identical to 07b's.
5. **The order:** 0.7.0's code can't land before 0.6.0 ships, and 0.6.0 waits on real headers. So no 07b to 07e yet. Meanwhile 0.6.0's 06c does the part of OCX that doesn't depend on Carta's headers:
   - the .xlsx reader
   - `pnpm ocx-structure`
   - item 7's `ImportRefusal` and `CapTableImport` beside the old names

