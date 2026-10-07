# Review: M5h (notes at a sale, in the engine)

Branch `m5h-notes-at-a-sale`. The engine now pays convertible notes still outstanding at a sale (C9; X3, X10–X12, X15, X16). All seven notes cases, 13a to 13g, run through every exit test:
- the waterfall at every recorded point
- the solved decisions
- the breakpoints, with their reasons and the 13e jump

All seven matched the first time they ran.

**Every exit case but one now runs in the engine.** Only case 11, the earnout, is still refused, until M5i.

## Run it

```bash
pnpm payouts edge-13g-two-notes --all
```

```bash
pnpm breakpoints edge-13f-note-alongside-preferred
```

Every notes case prints "N of N exit values match expected.json" and "All match expected.json (to the cent, with the same jumps)".

## How to check it by behavior

1. **Case 13a, a note on the `with_pool` base:**
   - **Repaid in full** at $2,240,000: "2x its principal plus interest, $2,240,000, paid ahead of all equity as debt."
   - **It converts** at $15,954,285.71.
2. **Cases 13b and 13c, the other bases:** the note converts at $17,397,894.74 and $18,240,000.
3. **Case 13d, a cap and a discount:** it converts at its cap only, at $7,977,142.86.
4. **Case 13e, no cap:** the jump at $1,400,000.
   > Common Stock drops from $280,000 to $0 and Investor X's convertible note rises from $1,120,000 to $1,400,000. At exactly $1,400,000 the outcome from below still holds…
5. **Case 13f, alongside Series A:** "…repaid in full here… Above this exit value, the next dollar goes to Series A Preferred's preference." The note's base counts Series A as converted, so it converts at $16,320,000.
6. **Case 13g, two notes:**
   - **Repaid together** at $3,320,000: "The convertible notes are repaid in full here: Investor X's convertible note ($2,240,000) and Investor Y's convertible note ($1,080,000), $3,320,000 in all… Until here they shared every dollar pro rata by repayment."
   - **Y converts first,** at $11,891,428.57, then X at $17,682,285.71.
7. **The page.** A saved cap table with a note outstanding, or rounds whose payouts' table has one, says:
   > It has convertible notes still outstanding, which this page doesn't show yet. It won't open a cap table it can't show in full.

## How the engine handles notes

- **Worked out once,** in `prepare`, from the exit date:
  - **Interest:** simple, Actual/365, from the issue date.
  - **Repayment:** the multiple × principal plus interest.
  - **With a cap:** the base, price and conversion shares. The base leaves out every note (X10, X15).
- **Repayment is debt,** paid first, before any carve-out, SAFE or preference. Notes being repaid share a shortfall pro rata.
- **Converting:**
  - **With a cap,** the note shares as common on its fixed conversion shares.
  - **With no cap,** it goes through the same fixed point as a SAFE, and is repaid where no price exists (X12, reading (a)).
  - **With neither a cap nor a discount,** it isn't a decision-maker: it is only repaid.
- **Decisions:**
  - **A converting note** is in `Decisions.converted`.
  - **Each note that can convert** is a free decision-maker.
  - **X16:** it converts only when that strictly pays more.
- **Two new margins** for the breakpoint finder:
  - **The debt** not yet repaid in full.
  - **A note with no cap's room to convert.**

## What changed

- **Engine** (`packages/engine/src/`):
  - **`model.ts`:** `Note` moved here from `rounds.ts`, unchanged, and an optional `CapTable.unconvertedNotes`.
  - **`input.ts`:**
    - reads outstanding notes (C9), checking holders and ids
    - refuses, milestone "later": `several_notes`, `note_with_safe_or_carve_out` and `uncapped_note_with_capped_participation`
    - requires an exit date on or after every issue date
    - shares one note reader with the round builder
  - **`rounds.ts`:** a table after an event carries its outstanding notes.
  - **`case.ts`:** no longer refuses them.
  - **`waterfall.ts`:**
    - `NoteTerms` in `PreparedCapTable.notes`
    - the debt first, then conversion
    - the fixed point shared with SAFEs
    - `Payout.notes` and `Payout.noteDebt`
  - **`decisions.ts`:** notes as decision-makers, X16 for them, and the two margins.
  - **`reasons.ts`:** `note_repayment_paid` and `note_switches`, naming what the next dollar goes to.
  - **`index.ts`:** the `NoteTerms` and `NoteHere` types. `Note` is still exported, now from the model.
- **Engine tests:**
  - **Cases 13a to 13g** join `EXIT_CASES`, and the test reader knows `"repayment"`.
  - **`test/notes.test.ts`** (new):
    - each note's days, interest, repayment, base, price and shares against its case's report, to 30 digits
    - a note that can only be repaid
    - the exit date
    - the three refusals and two malformed notes
- **Dashboard:**
  - **`rounds.ts`:** writes a built table's outstanding notes out, so `checkShown` refuses them.
  - **File tests:**
    - **The term the engine doesn't model yet** is now two conversion groups, the last such term a cap table can carry.
    - **A new test:** a note gets the page's own message.
- **Docs:**
  - **The engine README:** notes at a sale, the input field, the exit date, the reasons and the refusals. "Not modeled yet" is down to escrow and earnouts.
  - **`docs/ASSUMPTIONS.md`:**
    - **X3, X10, X12, X15, X16 and C9:** in the engine.
    - **C12:** notes off the refused list.
  - **`notes/release-0.2.0.md`:** notes at a sale, the new fields and types, two more reason codes, and the refusals.

## Checks

- **Engine:** 1,278 tests pass, 157 more than after M5g.
- **Dashboard:** 182 tests pass, 1 more.
- **Reference:** 47 unit tests pass, and all 61 cases match.
- **`cases/`:** no changes.
- **Typecheck and build:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.

## Assumptions added

**No new IDs.** X3, X10, X12, X15, X16, C9 and C12 are updated.

## Decisions I made, for you to check

1. **A converting note goes in `Decisions.converted`,** as a SAFE taking its Conversion Amount does. `"converts"` is what `expected.json` already says.
2. **The page's test for "a term the engine doesn't model yet"** now uses two conversion groups. Notes were the last term a saved cap table can carry that the engine refused, so the test needed a new example. Payment schedules belong to the exit, which a saved file doesn't hold.
3. **The refusals use milestone "later"** with their own term names. None is planned in M5.

## Open questions

None. M5i, escrow and earnouts, is next. I'm stopping here.
