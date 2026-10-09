# Plan: 0.5.0, from your cap table to your term sheet

0.4.0 reads a company's cap table from its cap table software. 0.5.0 takes it to the next round:
- **Real exports:** check that real exports read, without anyone sending a cap table (05a).
- **The next round:** add a round to an imported or hand-entered cap table (05b).
- **SAFEs beside a note:** pay them at a sale, which Larkspur needs (05c).
- **Fixes:** what real exports turn up (05d).

1.0a, removing the Milestone names, and 1.0b, the naming review, move after 0.5.0.

Each PR below is sized for an evening. Cases come first wherever there's new math, so you can re-derive them before any engine code. Your questions are at the end. **Nothing is built until you've answered them.**

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

### 05a2: "Copy a summary to share" on the page

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

## 05d: fixes from real exports

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
