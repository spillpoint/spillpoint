# Plan: 0.5.0, from your cap table to your term sheet

0.4.0 reads a company's cap table from its cap table software. 0.5.0 takes it to the next round:
- **Real exports:** check that real exports read, without anyone sending a cap table (05a).
- **The next round:** add a round to an imported or hand-entered cap table (05b).
- **SAFEs beside a note:** pay them at a sale, which Larkspur needs (05c).
- **Fixes:** what real exports turn up (05d).

1.0a, removing the Milestone names, and 1.0b, the naming review, move after 0.5.0.

Each PR below is sized for an evening. Cases come first wherever there's new math, so you can re-derive them before any engine code. Your answers are at the end, after the questions, and the PRs follow them where they differ from what's written above.

## 05a: real exports (was 1.0c)

### 05a: the doc fixes and the check script

**First commit, three doc fixes:**
- **`packages/engine/README.md`:** "Items marked *(0.2.0)* or *(0.3.0)* are new" also names *(0.4.0)*.
- **`notes/release-0.4.0.md`:** "Nothing is guessed: never 1x, never $1" becomes "Nothing is guessed: a term OCF doesn't settle is left blank for you to fill in, or read a set way with a report line saying so."
- **The root README's "Coming next"** becomes 0.5.0.

**`scripts/ocf-check.mjs`**, which you run on your own exports:

```bash
pnpm ocf-check path/to/export.zip
```

It also takes a folder of `.ocf.json` files. It reads them as the page does:
- **zips:** the page's own zip reader, with its 100 MB limit
- **the import:** the engine's `readOcf`

It prints only counts and codes:
- the OCF version, the number of files and their total size in bytes
- objects read, by type, and objects set aside, by type
- the report's notes, by code, with how many of each
- the blanks, by field (`participation` 2, `repayment_multiple` 1), with how many of each
- a refusal's kind and term

It never prints a name, an id, an amount or a date. So a refusal's subject and message aren't printed, and neither are unrecognized fields' names, unless you say otherwise (question 3).

**Then it tries the blanks' answers.** For each set of answers it fills the blanks in, then runs the engine over the page's default range: `readExit`, then the breakpoint finder. For each set it prints one of:
- the engine reads it, finds every breakpoint, and pays at each one
- the engine's refusal term
- `NoAnswerError`
- `InputError`, with no detail, since its message names fields by id. It shouldn't happen, but if the filling has a gap I'd rather see it than hide it.

Each set is printed by blank number and answer, never by whose security it is:

```
set 3: #1 participation=participating, #2 repayment_multiple=1: note_with_safe_or_carve_out
```

**Cutting the sets down** (question 2):
- **A blank with set answers is tried with each one:**
  - participation: non-participating, participating, or capped when a cap is given
  - a SAFE's cap kind: pre-money or post-money
  - a note's base: with or without the pool
- **A number gets one placeholder,** since whether the engine reads a table doesn't turn on the value:
  - a price: $1.00
  - a preference or repayment multiple: 1
  - a conversion price: the issue price
- **The sale's date,** for notes, is the package's date.
- **How many sets:** if the answers give 64 sets or fewer, all are tried. Past that it tries the first answer to every blank, then each other answer one blank at a time, which is 1 + Σ(answers − 1) sets. It prints "12 sets tried, of 1,024 possible, one blank at a time".

**How it runs:** `pnpm ocf-check` builds the engine first and imports the built package, as a user would. It takes the page's zip reader and the new summary module from the dashboard's sources through Node's own TypeScript support, which needs Node 22.18 or later (question 1). It runs on your computer, reads only the files you name, and writes nothing.

**Tests:**
- **The script on our own OCF cases:** Larkspur, Millrace, Quillfern, and one refused fixture. The output matches a pinned summary exactly.
- **No leak:** a check that the output contains none of the cases' holder names, ids, amounts or dates.

### 05a2: "Copy a summary to share" on the page (on hold)

**On hold (2026-10-09)** until someone can produce an OCF export. Jordan has no real one, and it couldn't be confirmed that Carta or Pulley let users download one. The check script (05a) stays as merged, ready for when one turns up.


On the import's report, and on a refusal's message too (question 5), so a founder whose export won't read can still send what went wrong:
- **"Copy a summary to share"** opens the summary first, in full, in a box you can read: the same counts and codes as the script's first part, from one shared module. The engine runs over the blanks stay in the script, since they'd take a while on the page.
- **"Copy" copies exactly that text.** It's copied to the clipboard on your computer, and nothing is sent.
- **Tests:** the shown text is what's copied, and it has no name, id, amount or date from Larkspur.

**Then you run the script on your exports and paste its output,** which scopes 05d.

## 05b: add a round to an imported cap table

### 05b1: the case, and the reference's starting event (cases; the edit rule lifted)

**The reference gets the new first event:** a starting cap table, which later events build on (shape in question 6).

**One new case:** Quillfern (edge case 25) plus a Series B, worked by the reference, with a DERIVATION for you to re-derive. Its design is question 9: an up round with a pool top-up, a new investor and Fund U's pro-rata, or a down round that adjusts the Seed because the starting table gives it anti-dilution.

### 05b2: the engine's starting event, and the split test

**The engine:** a new first event, `start`, that gives the starting cap table. It's additive: nothing that reads today changes, and a company without one builds as before.

**The test, with no new expected values:** every locked round case (39 of them, 187 events) is split at each event. The table after event k, given as a starting table, plus the events after k, must rebuild the case's later tables exactly.

Wherever it doesn't, the split shows what a starting table has to carry beyond the cap table. I expect one thing from the code. The builder remembers which event first issued each series, SAFE and note (`order`, the 0.3.0 plan's answer 3d). The "issued before the series" rule (R25) uses that order, and a cap table doesn't hold it. Notes' issue dates and dividend accrual starts are already in the cap table.

The start event would give that order beside the table, not as new cap table fields, so C1's format doesn't change (question 7 for a starting table that doesn't give it). Anything else the split finds goes in the review note, each with its fix.

### 05b3: the page

- **"Add a round"** on a cap table entered directly or imported. It turns the table into a company built from rounds, whose first event is the starting table, and opens the Rounds tab with a new event after it.
- **The starting table stays editable:** the Cap table tab edits it, with a line saying the rounds after it are rebuilt on it (question 8). "Edit the cap table directly" still drops the rounds, as today.
- **Saved files go to version 6,** where a company's first event may be its starting table. Version 5 files migrate as they are.
- **Imported series have no anti-dilution** (O11). Where a priced round is below a starting series' conversion price and that series has none, the round says so: "Seed Preferred has no anti-dilution, so this down round doesn't adjust it. If its charter gives it some, add it in the starting cap table."
- **Tests:**
  - Quillfern imported, a Series B added, saved and opened again, pays as the 05b1 case does.
  - A version 5 file opens.

**Added after 05b2 (Jordan, 2026-10-09):**
- **A starting table's conversion groups** are carried through. The page used to write a built table back with none.
- **A round after a starting table with a conversion group** says, with its own series' names, and those of the series its SAFEs and notes convert into when it creates them: "Series B Preferred isn't in the group of series that must convert together (Seed Preferred and Series A Preferred), so at a sale it decides on its own whether to convert. If its charter puts it in that group, spillpoint can't model that yet." A round's new series joining the group stays on the later list.

**Split in two,** to fit an evening each:
- **05b3a:**
  - "Add a round"
  - the starting table on the Cap table tab
  - saved files version 6
  - conversion groups carried through
  - the tests above, and the one from your answers: a grant at an imported option class's strike joins that class
- **05b3b:** what a round says about a starting table:
  - an imported series with no anti-dilution in a down round
  - the conversion group
  - how the issue order was read, when a down round adjusts a starting series and a SAFE or note converts in it (R31)

**Your answers for 05b3b (after #68):**
1. **A saved cap table keeps the import's date and issue order:** two optional fields in version 6, written only when present, so an import saved before adding a round starts from the same table when it's reopened.
2. **"Use it to add a round"** at the import review, offered when the engine refuses the table at Use only because of SAFEs or notes still outstanding at a sale (`note_with_safe_or_carve_out`, `pre_money_safe_with_preferred`, `several_safes`, `several_notes`), never for any other refusal.
   - **It makes the table a starting table,** and opens a priced round with converting the SAFEs and notes ticked.
   - **Until a round converts them,** the Payouts tab shows the engine's message.
   - **The main test:** Larkspur imported, case 27's Series B entered through the page, saved and opened again, matching case 27's locked file at every breakpoint.
3. **05b3a's other decisions:** agreed.

## 05c: SAFEs beside a note at a sale

Larkspur imports, but its SAFEs sit beside a note, which the engine refuses at a sale (X12, `note_with_safe_or_carve_out`). New math, so cases first.

### 05c1: cases (the edit rule lifted)

Each case is worked by the reference and re-derived by you. The defaults I'd propose (question 11):
1. **The note's repayment is debt,** paid before the SAFE's Cash-Out Amount and before every preference, as X12 already pays a note ahead of preferred.
2. **A converting note counts in a post-money SAFE's Liquidity Capitalization,** at its conversion shares, as one of the YC SAFE's Converting Securities. A note being repaid doesn't count, as the SAFE text leaves out holders "receiving … payments in lieu of" converting.
3. **A note's base doesn't count a converting SAFE.** "With pool" and "without pool" count outstanding shares and options, and the unissued pool for "with pool", not other converting securities, as OCF's capitalization rules have it too.
4. **Where each depends on the other, they're solved together,** as 03g does in a round.

**Cases:**
- a post-money SAFE beside a capped note, common only
- Larkspur's shape: two post-money SAFEs, a note, and preferred, one series non-participating and one capped participating
- possibly a SAFE with a discount and no cap beside a note, which is a fixed point within a fixed point

### 05c2: the engine

The engine lifts `note_with_safe_or_carve_out` for SAFEs, and passes the cases. A note beside a carve-out stays refused unless you want it in too.

**Done in 05c2 (Jordan, after #70):** the engine reads a capped note beside post-money SAFEs (X18), applies E20 wherever SAFEs are outstanding at a sale, reads the note-base rule (O9), and passes 12j, 13i, 13j and OCF case 13. A note beside a carve-out stays refused.

### After #71 (Jordan's three items)

1. **Speed is a release blocker.** Larkspur at a sale, on a 2-core machine: 2 SAFEs 2.3s, 4 SAFEs 15s, 6 SAFEs 61s without the note; 6.4s, 38s and 155s with it. It roughly doubles per SAFE, and pre-seed tables often have 5 to 10. **Target:** Larkspur and its note with 10 post-money SAFEs under 5 seconds on CI's machine, checked against the reference's brute force on randomized tables. If it can't be met, the page gets a limit with a plain message.
2. **Several SAFEs that could settle more than one way take the most conversions,** not the fewest (E20). Series, warrants and notes keep E5 and X16.
3. **Warrant shares exercised into a series that keeps its preference** are left out of the SAFEs' Liquidity Capitalization, like the series' other shares (X1).

### 05c3: cases (the edit rule lifted)

- **12k:** two equal post-money SAFEs beside common only, under rule 2.
- **12l:** a warrant for a non-participating series at a strike below its preference, beside a post-money SAFE, under rule 3.
- **The reference takes both rules,** with DERIVATIONs for re-derivation.

### 05c4: the engine

Both rules, and the speed work.

**Done in 05c4:**
- **The engine takes both rules,** and passes 12k and 12l.
- **The speed:** Larkspur at a sale with its note and 10 SAFEs went from 204s to 1.4s on a laptop. The SAFEs' answer now comes from dropping SAFEs from "every SAFE converts", and the search reuses its work from one exit value to the next.
- **The 60-second test timeouts** go back to the defaults.
- **Two findings for you:**
  - **A warrant at its series' preference per share:** indifferent, but under rule 3 its choice moves the SAFEs. Its tie is now "isn't exercised", New.
  - **Two equal-priced non-participating series beside post-money SAFEs** can have two stable answers.

### 05c5: more than one stable answer (Jordan, after #73)

**Jordan's decisions after #73:**
- **The warrant's tie is confirmed:** a warrant whose strike equals its series' preference per share doesn't exercise while the series keeps its preference, as an indifferent holder stays put.
- **More than one stable answer stops the engine.** Wherever the series, warrants and notes have more than one stable answer and those answers pay holders differently, the engine stops with a plain message instead of picking one, and never reports just one of them. The reference does the same. Reporting both, with a locked case, goes on the later list.

**Done in 05c5:**
- **Every combination is checked** with 12 or fewer series, warrants and notes.
- **The breakpoint search follows** which combinations are stable between the exit values it reads.
- **The plain message,** in the engine and the reference.
- **Tests** from two random tables, and a page test.
- **The cost:** Larkspur with its note and 10 SAFEs went from 1.4s to 2.0s on a laptop.

### What it would take to lift the other two refusals at a sale (question 12)

- **A pre-money SAFE beside preferred** (X14, `pre_money_safe_with_preferred`):
  - The math is simple: its Liquidity Capitalization doesn't depend on who converts.
  - The open question is where its cash ranks. The pre-money text ranks it only against other SAFEs, and versions differ: one filed copy puts earlier preferred first. It needs a default, on par with the most junior preferred tier, as the post-money SAFE does (X9), with `cash_out_ranks_with` as the toggle.
  - About two cases and an evening of engine work.
- **Several SAFEs that aren't all post-money** (X13, `several_safes`):
  - Each kind counts the others differently:
    - a post-money SAFE counts every converting SAFE
    - a pre-money SAFE counts none
    - a SAFE with only a discount converts at the sale's price, a fixed point coupled to the others
  - The pairs that matter are post-money with pre-money, post-money with discount-only, and two discount-only SAFEs.
  - About three or four cases, and a solver like 03g's.
- **My suggestion:** both go on the later list for now, unless your exports show them. 05d is where they'd come back.

## 05d: fixes from real exports (on hold)

**On hold (2026-10-09),** for the same reason as 05a2: there's no real OCF export to run the check on. The real-data check for 1.0 becomes a real cap table instead, entered by hand on the owner's machine and compared against a waterfall someone else built. There's nothing to build for that.


Scoped once your 05a output is in. The 1.0c watch list is the starting guess, from the likeliest:
- **A plan with no cancellation behavior:** the likely fix is your to-fill question, "Do cancelled grants under [plan] go back to the pool?"
- **Splits with options, warrants or convertible preferred outstanding:** the common practice is to adjust each by the split ratio, so options and warrants multiply and their strikes divide, and a series' conversion ratio follows.
- **A common class with a conversion right** (dual-class common): read it as common, with a report line.
- **Fractional shares:** a cap table holds whole shares. Rounding them would be a choice to write down; holding fractions would be a bigger change.
- **Return-to-pool conflicts.**
- **Outstanding convertibles with differing seniority.**
- **Notes beyond the subset:** compounding, 30/360, cash interest, other accrual periods, several rates, MFN.
- **An earlier as-of date, and other currencies.**
- **Anything new** the counts show: an object type, a refusal term or a note code I haven't seen.

Each fix that changes what's read comes with a fixture or a case, as in 04a.

## 05e: release 0.5.0

Version bump, release notes, both READMEs, and the packed build checked as 03j and 04g did. You pack it and run the README examples before publishing.

**Polish (Jordan, after #69):**
- **A round's price shows six places even when exact** ("$4.000000 a share"): use the conversion prices' rule, to the cent when exact.
- **"Fill this in: it can't be blank" should name the field,** for example "Series B's pre-money valuation can't be blank."

**Changed behavior, for the release notes** (Jordan, 05b2 review): a sale on a table built from rounds now applies the same at-a-sale limits as a cap table entered directly (X12–X15), so some inputs 0.4.0 paid are now refused. `readInputs` didn't apply them to a table built from rounds before.

**Changed behavior, for the release notes** (Jordan, after #71): two equal post-money SAFEs can each take cash or both convert over a range of exit values. 0.4.0's `solve` reported both answers there (E8); 0.5.0 takes the most conversions, so they convert where converting together first pays, and payouts bend there (edge case 12k).

**Changed behavior, for the release notes** (Jordan, after #73): where the series, warrants and notes have more than one stable answer and they pay holders differently, `solve` and the breakpoint search stop with a plain message naming them, where 0.4.0 reported every answer (E8), and could miss one where its search from both ends agreed.

**Changed behavior, for the release notes** (Jordan, after #71): a warrant exercised into a series that keeps its preference is left out of a post-money SAFE's Liquidity Capitalization, like the series' own shares (X1, edge case 12l). 0.4.0 counted it, which mattered only where the strike is below the series' preference per share.

**A fix, for the release notes** (Jordan, after #70): 0.4.0's breakpoint search stopped on Larkspur's table at a sale (edge case 12j), with "went round in a circle (E15)" from $16,531,000, where the non-participating Seed and the post-money SAFEs went round in a circle. Under E20 the SAFEs' greater-of comes last, so it's one breakpoint where payouts jump, at $16,559,391.30.

**New, for the release notes:**
- SAFEs beside a capped note at a sale (X18)
- the note-base rule in the OCF import (O9)
- a faster breakpoint search, which takes a table with many SAFEs from minutes to seconds (05c4)

## Questions

1. **The script's runtime.** `pnpm ocf-check` builds the engine, then runs `scripts/ocf-check.mjs` on Node 22.18 or later, importing the page's zip reader and summary module through Node's TypeScript support. Or would you rather a self-contained script, with its own copy of the zip reader?
2. **The answer sets:**
   - every set up to 64; past that, one blank at a time
   - numbers as placeholders
   - the sale's date as the package's date

   Agreed?
3. **Unrecognized fields.** Their count only, or also their names? Names are schema keys, not data, and would show which software made the export, but they come from the files.
4. **`InputError` as a fourth outcome** of a set, with no detail. Agreed?
5. **The page's summary.** Offer it on a refused import too, not only on the report? I'd say yes: a refusal is what's most worth sending.
6. **The starting event's shape:** `{"id": "start", "date": ..., "type": "start", "cap_table": {...}}`. Whatever the split test finds a starting table must carry, such as the order things were issued in, would go on the event beside the table, not in the cap table format. Agreed?
7. **The order in a starting table that doesn't give one.** Are its SAFEs and notes taken as issued after its series, since they usually bridge to the next round? They'd then count against a series in a down round. And should `readOcf` return the order from the ledger's dates, as a new field, so an imported table carries it? I'd say yes to both.
8. **Editing the starting table:** on the Cap table tab, with the rounds after it rebuilt as you edit. Agreed?
9. **The 05b1 case:** an up round with a pool top-up, a new investor and pro-rata, or a down round over a Seed given broad-based anti-dilution in the starting table? Or both, as two cases?
10. **The `cases/` edit rule:** lift it for 05b1 and 05c1, the new cases and the reference's starting event?
11. **05c's four defaults:** repayment first; a converting note in the post-money SAFE's Liquidity Capitalization; a note's base without the SAFE; solved together. And the two or three cases?
12. **The other two refusals at a sale:** on the later list for now, as I suggest, or in 0.5.0?
13. **New API before the naming review.** 0.5.0 adds the `start` event, and maybe `readOcf`'s issue order, before 1.0b settles names. Fine to add them now and have 1.0b review them with the rest?

## Your answers (2026-10-09)

1. **The script's runtime:** the page's own zip reader through Node's TypeScript support, not a second copy. You check `node -v` for 22.18 or later.
2. **The answer sets:** agreed. Every set up to 64, then one blank at a time; numbers as placeholders; the sale's date as the package's date.
3. **Names that look like schema keys are printed:**
   - **Unrecognized fields:** their names are printed when they're letters, digits and underscores, up to 64 characters; anything else counts as "other".
   - **Five refusals whose term alone tells us nothing** get the same treatment, each with its value looked up in the files from the refusal's subject:
     - the object type, for `unknown_object_type`
     - the file type, for `unknown_file_type`
     - the version, for `ocf_version`
     - the currency code, for `currency`
     - the grant kind, for `compensation_type`
   - **The subject itself is never printed.**
4. **`InputError`** is a fourth outcome, printed with its path where any id is replaced by its position, if that's easy; otherwise bare.
5. **The summary on the page:**
   - on the report
   - on a refused import too
   - when the engine refuses at Use: with the engine's term and the kind of each answer you gave, never a value
6. **The start event's shape:** agreed. Two additions:
   - **No carve-out:** a start event's cap table may not carry one, since that's a term of the sale.
   - **The issue order:** `readOcf` returns it in the same shape the start event takes, so the page passes it straight through.
7. **The issue order, yes to both:**
   - **With no order given,** a starting table's SAFEs and notes count as issued after its series.
   - **`readOcf` takes the order from the ledger:**
     - a series from its first issuance
     - a SAFE or note from its issue date
     - a SAFE or note dated the same day as a series counts as after it
   - **When a down round adjusts a starting series** and a SAFE or note converts in it, the round says how the order was read.
8. **Editing the starting table:** agreed. If an edit breaks a later round, that round shows the engine's message, and the rounds are kept.
9. **Two cases, both up rounds, and no down-round case.** The split test covers the anti-dilution math, and a unit test covers question 7's default order.
   - **(a) Quillfern plus a Series B:** a pool top-up, a new lead investor, and Fund U's pro-rata.
   - **(b) Larkspur plus a new round,** converting its two SAFEs and its note, then a sale on the table after it.
10. **The `cases/` edit rule:** lifted for 05b1 and 05c1 only. Jordan lifts and restores it around each, and adds the cases label after re-derivation.
11. **05c's four defaults:** agreed. The first two follow the YC post-money SAFE's liquidation priority and its Liquidity Capitalization.
    - **Cases:** the post-money SAFE beside a capped note, and Larkspur's shape.
    - **The discount-only SAFE beside a note** goes on the later list, unless it comes out simple.
    - **A note whose OCF capitalization rules count other converting securities** (`include_other_converting_securities`):
      - **with another SAFE or note outstanding beside it,** it's refused by name, where today it becomes a with-or-without-pool blank and neither answer is right
      - **with nothing else outstanding,** the flag changes nothing, so it's read, with a report line
12. **Both other at-a-sale refusals** go on the later list, unless the exports show them.
13. **New API before the naming review:** yes. 1.0b reviews the start event, its name, and `readOcf`'s new field with the rest.

**One more test for 05b3:** a grant at a strike an imported option class already has joins that class.

### Two readings I've written in, to confirm

- **Answer 9(b) says "Larkspur + Series A",** but Larkspur already has a Series A Preferred outstanding, so the new round is a Series B.
  - **Larkspur's two blanks have to be filled in the starting table:** Seed's participation, and the note's repayment multiple.
  - **I'd fill them** with non-participating, and a repayment multiple of 1.
  - **The multiple changes nothing here,** since the note converts in the round.
- **Answer 7's "a SAFE or note from its issue date":** one that came from a transfer or a balance keeps the issue date of the one it came from, not its own issuance's date. Larkspur's two outstanding SAFEs were issued on Sep 1, 2024, before its Series A, and transferred on May 15, 2025, after it. Read from their own issuances, they'd move after the Series A.

### Where the answers are in ASSUMPTIONS

- **R31:** the starting table (answers 6 to 8).
- **O9:** a note's base counting other converting securities (answer 11).
- **O14:** the issue order from the ledger (answers 6 and 7).
- **O15:** the summary to share and the check script (answers 1 to 5).
- **X18:** SAFEs beside a note at a sale (answer 11).
- **The later list:** the three at-a-sale refusals that stay (answers 11 and 12).

## Change of plan (2026-10-09)

Jordan has no real OCF export, and it couldn't be confirmed that Carta or Pulley let users download one. So:
- **05a2,** the page's summary to share, is on hold until someone can produce an export. The check script stays as merged.
- **05d,** fixes from real exports, is on hold too.
- **The real-data check for 1.0** becomes a real cap table, entered by hand on the owner's machine, compared against a waterfall someone else built. There's nothing to build for it.
- **Next is 05b1,** with the cases edit rule lifted.
