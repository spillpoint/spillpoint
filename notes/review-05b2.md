# Review: 05b2 (the engine's starting table)

Branch `05b2-engine-start-event`. Nothing in `cases/` changes. It has three commits:
1. **The engine's starting event,** its split test and your RSU wording. With it, a fix found in passing, since they share files: a sale on a table built from rounds is now held to the limits a sale puts on SAFEs and notes.
2. **`readOcf`'s issue order** (O14).
3. **The docs and this note.**

The page reads a starting table in 05b3. Until then its only change is a title for one on the Rounds tab, and one line that keeps it working as before (section 3).

## 1. The starting event

**What a starting table is:** the engine's first event may now be `start`, the cap table a company stands at, as the reference's has been since 05b1 (R31, C17):
- **The cap table** is read as an exit's, with no carve-out, since a carve-out is a term of the sale.
- **Its holders** must be among the company's, by the same names.
- **Its SAFEs and notes** aren't held to the limits a sale puts on them, since a round after it may convert them. Case 27's two SAFEs beside its note need that.
- **`issue_order`** is optional. With none given, its SAFEs and notes count as issued after its series.

**Cases 26 and 27 now run through the engine** like every other round case with a sale:
- every cap table, field by field
- every round's details: price, conversions, pro-rata, pool
- the payouts at every listed exit value and every breakpoint
- every breakpoint and its reasons

Both match their locked files.

**The split test** (`packages/engine/test/start.test.ts`), as the reference's:
- **The test:** every round case built from founding is split at every event. The table after event k, written out in full and given as a starting table with its issue order, must rebuild every later table and round exactly.
- **The result:** 39 cases, 148 splits, all exact.
- **Without the order,** exactly one split differs: 16j after its Seed, as in the reference.

**Your RSU wording.** At case 27's $15,692,504.14, the engine says "Common starts to be paid here, so the 30,000 options with no strike, such as RSUs, start paying: above this exit value each gets what a common share does."
- **The engine's reasons have always had their own wording,** not the reference's ("Options at a $0.10 strike (100,000) come into the money here…"). The tests compare the reference's codes, not its text.
- **So for options with no strike,** it now uses your sentence word for word. Options with a strike keep the engine's wording, and so does the reverse, where options stop being exercised.

## 2. `readOcf`'s issue order

An import now gives `issue_order`: its preferred series, SAFEs and notes, earliest issued first, ready to pass to a `start` event (O14).

**Against the locked cases:**
- **Larkspur:** the import gives case 27's order, Seed, the two SAFEs, the note, then Series A. With its two blanks filled as 27 fills them, it builds exactly 27's starting table. The SAFEs keep Sep 1, 2024, the date of the SAFE they were transferred from.
- **Quillfern** (OCF case 12): it gives case 26's order, and builds exactly 26's starting table.

**The locked OCF cases** record an import as of 0.4.0 (C16), so they don't hold the order. Their tests now compare the fields they record. I didn't add the order to them, since they're locked. If you'd like them to carry it, that's a cases edit for you to lift.

**Rules O14 left open,** settled here, each with a test on a small package:
- **A retracted stock issuance doesn't date a series.** A retraction voids it, as if never issued.
- **A class with no stock issued,** kept for a warrant for it (O7), takes the date of the first warrant for it.
- **On one date,** series come before SAFEs and notes. Otherwise the cap table's order holds, which can't change anything: R25 only asks whether a SAFE or note came before a series.
- **The balance a conversion leaves** keeps the date, like one from a transfer.

## 3. A fix found in passing: the sale's limits on a table built from rounds

**Before:** `readInputs` didn't apply the limits a sale puts on SAFEs and notes still outstanding (X12–X15) to a table built from rounds. Case 16j's table after its Seed, a pre-money SAFE beside preferred, read and paid out, where X14 refuses it. A starting table makes this easier to reach: a sale straight after case 27's start, with its SAFEs beside its note, was paid too.

**Now** both are refused, naming the term. Your page never showed such payouts: it reads the table it shows through `readCapTable`, which always applied the limits.

**No locked case changes.** None has a sale on such a table.

**The page is unchanged.** Its check of the rounds now leaves these refusals to that same reading, so they come where they did. A test pins it on 16j.

**For 0.5.0's release notes:** this changes the npm API's behavior. An input `readInputs` read before is now refused. The engine README says so.

## How to check by behavior

1. Run the tests:
   ```bash
   pnpm test
   ```
   **Engine:** 2,048 pass, 242 more:
   - the 148 splits
   - cases 26 and 27 through the round, payout and breakpoint tests
   - the start event's own tests
   - the issue order's tests

   **Dashboard:** 423 pass, 1 more.
2. See case 27 through the engine, every breakpoint with its reason (Node 22.18 or later):
   ```bash
   node --input-type=module -e 'import { readFileSync } from "node:fs"; import { findBreakpoints, prepare, readInputs, toCents } from "./packages/engine/src/index.ts"; const exit = readInputs(JSON.parse(readFileSync("cases/edge-27-safes-and-note-convert-on-an-imported-table/inputs.json", "utf8"))); for (const b of findBreakpoints(prepare(exit.capTable, exit.exitDate), exit.range)) for (const r of b.reasons) console.log(`$${toCents(b.exitValue)}  ${r.text}`);'
   ```
   - It prints 13 lines for the 11 breakpoints in 27's DERIVATION, at the same exit values.
   - Two exit values have two lines each: $15,692,504.14 and $24,970,587.41.
   - The third line is your RSU sentence.

## Decisions for you to check

1. **A conversion group in a starting table is kept as it is** through the rounds after it. A later round's new series doesn't join it (R31).
   - **Why:** which series are in a group is the charter's to say, and the table names them.
   - **The catch:** the NVCA charter's mandatory conversion is usually voted by all preferred together, which a new series would join. That could become a toggle.
   - **No case** has a group with rounds.
2. **A starting table's holders must match the company's names.** A mismatch is refused, as the reference does.
3. **O14's four rules** in section 2.
4. **The OCF cases compared on what they record,** with the issue order tested against cases 26 and 27 instead.
5. **The sale-limit fix,** with the page leaving the refusal where it was.
6. **Your RSU sentence,** word for word, only for options with no strike, in the engine's otherwise different wording.

## Assumptions added or changed

- **R31:**
  - the holders' names
  - a starting table's SAFEs and notes not held to the sale's limits
  - its conversion group kept, with the toggle that could come
  - the `readInputs` fix
  - its status
- **O14:** the field's name and the four rules.
- **C17:** the engine reads it, and its `details` are `{ kind: "start" }`.

## For 05b3

- **Conversion groups:** the page writes a built table back with no conversion groups (`capTableJson` in `apps/dashboard/src/rounds.ts`). A company whose starting table has one would lose it there.
- **"The round says how the order was read"** (R31): the engine's anti-dilution `pieces` already say, for each conversion, whether it counted against the series. The page adds whether the order was given or the default.
- **The page test** of SAFEs and notes in round cases still leaves out the two starting-table cases, until the page reads a starting table.

## Checks

- **Engine:** 2,048 tests pass.
- **Dashboard:** 423 tests pass.
- **Reference:** 59 unit tests pass, and every `expected.json` matches.
- **Typecheck:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing run outside the sandbox.**

## Next

05b3: the page's "Add a round", saved file version 6, and the test that a grant at an imported option class's strike joins that class. I'm stopping here.
