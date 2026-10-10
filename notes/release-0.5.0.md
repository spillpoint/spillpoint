# spillpoint 0.5.0: release notes

From your cap table to your term sheet. The engine builds the next round on a cap table you already have, entered or imported, and pays SAFEs beside a capped note at a sale. The version in `packages/engine/package.json` is 0.5.0; it is published from there.

Open Cap Format (OCF) is developed by the Open Cap Table Coalition: https://open-cap-table-coalition.github.io/Open-Cap-Format-OCF/. spillpoint reads files in that format.

## New

**A starting cap table** (R31, C17; 05b2). A company's first event may be the cap table it stands at, and the events after it build on it, as on the table after any other event:

```json
{ "id": "start", "date": "2025-06-30", "type": "start", "cap_table": { ... }, "issue_order": ["seed", "safe_x", "series_a"] }
```

- **`cap_table`** is in the exit input's format, with no carve-out: that's a term of the sale. Its holders must be in the company's `holders`, by the same names.
- **Its SAFEs and notes may still convert** in a later round, so the at-a-sale limits on them don't apply to it.
- **`issue_order`** is optional: each preferred series, SAFE and note, earliest issued first. It decides whether a SAFE or note converting in a down round counts against a series (R25). With none given, the SAFEs and notes count as issued after the series.
- **`readOcf` gives one** (O14), as `issue_order`, ready to pass on:
  - a series is dated by its first issuance
  - a SAFE or note by its own date, or by the one it came from by a transfer
  - one dated the same day as a series counts as issued after it

**SAFEs beside a note at a sale** (X18; 05c2). A note with a cap now pays beside SAFEs with post-money caps, where 0.4.0 refused any note beside a SAFE:
- **The note's repayment is paid first.**
- **Once it converts,** its shares count in the SAFEs' Liquidity Capitalization.
- **Its own base counts no SAFE.**

Larkspur's table, a Seed, a Series A, two post-money SAFEs and a capped note, now pays at a sale (edge case 13j).

**The SAFEs' greater-of comes last** (E20; 05c2, 05c4):
- **The order:** the series, warrants and notes decide first, each weighing its choice with the SAFEs then paid as their terms pay them. The SAFEs take the greater of their two amounts after.
- **SAFEs converting together:** where several SAFEs would each convert only because the others do, they convert. A post-money SAFE is promised a fixed share once they all do.
- **Exercised warrant shares:** warrant shares exercised into a series that keeps its preference are left out of a post-money SAFE's Liquidity Capitalization, like the series' own shares (X1). An unexercised warrant still counts.
- **An indifferent warrant:** a warrant that gains nothing by exercising isn't exercised, even where that changes what the SAFEs get.

**A faster breakpoint search** (05c4). With the decisions fixed, every amount moves in a straight line until a formula changes, so the search reuses its work from one exit value to the next. A table with many SAFEs no longer takes minutes.
- **The table:** Larkspur with its note and 10 post-money SAFEs: the whole search from $0 to $150M, and the answer at each breakpoint.
- **0.5.0:** about 2 seconds on an M1 Pro laptop, and 4 to 9 seconds on GitHub's 2-core CI runners. On another 2-core machine it took 13 seconds, measured before 05c5's two-answer check, which adds about a third.
- **Before the speed work:** 204 seconds on the same laptop. 0.4.0 refused this table at a sale.
- **It depends on the machine.**

**The OCF import's note base** (O9; 05c2). A note whose cap counts other converting securities (`include_other_converting_securities`):
- **With another SAFE or note outstanding beside it,** it's refused by name, as `note_base_counts_other_convertibles`, since neither base spillpoint models would be right.
- **With nothing else outstanding,** the setting changes nothing, so the rest of the rules are read, with the report line `note_base_other_convertibles_ignored`.

**In the repository, not the package:** `scripts/ocf-check.mjs` (05a) checks an OCF export, `pnpm ocf-check export.zip`. It reads the export as the page does and runs the engine over the terms left open. It prints only counts and codes, never a name, an id, an amount or a date, so what it prints can be shared without the cap table. It needs Node 22.18 or later.

**How it's tested:**
- **83 locked cases,** 7 more than 0.4.0, each re-derived independently before it was locked:
  - **Starting from a cap table:**
    - 26, Quillfern plus a Series B
    - 27, Larkspur plus a Series B converting its SAFEs and note
  - **SAFEs at a sale:**
    - 13i, a note beside a SAFE
    - 12j, Larkspur without its note
    - 13j, Larkspur with it
    - 12k, two equal SAFEs
    - 12l, a warrant below its series' preference beside a SAFE
- **Every locked case from 0.4.0 gives the same answer.** The OCF refusal case gained one fixture, for the new refusal.
- **The split test:** every round case is split at each event, with the table after it given as a starting table and the later events built on it. All 148 splits rebuild the case's later tables exactly.
- **200 random tables** with two to four SAFEs of different amounts and caps, worked by the reference calculator:
  - 189 agree in full: every breakpoint within a cent, with the same reasons, and every payout.
  - The other 11 have two stable answers somewhere, and the reference and the engine both stop there, with the same message.

## On the page

- **"Add a round"** (05b3a) on a cap table entered directly or imported:
  - The table becomes the company's starting table, and the Rounds tab opens with a new round after it.
  - The starting table stays editable on the Cap table tab, and the rounds after it are rebuilt on it.
  - A starting table's conversion group is carried through.
- **What a round says about its starting table** (05b3b):
  - **No anti-dilution:** a series with none, as an imported series has, in a down round that would otherwise adjust it.
  - **The conversion group:** whether the round's new series is in the starting table's conversion group.
  - **The issue order:** how the order its SAFEs and notes were issued in was read, when that decides a down round.
- **"Use it to add a round"** (05b3b) at an import's review, when the engine refuses the table at a sale only because of its SAFEs or notes. It opens a priced round that converts them. Until a round does, the Payouts tab shows the engine's message.
- **Larkspur opens at a sale** (05c2), its SAFEs beside its note.
- **Saved files are version 6:**
  - A company's first event may be its starting table.
  - An import saved before adding a round keeps its date and issue order.
  - Version 5 files open as they are.
- **Payouts to the cent** (#65):
  - **To the cent:** every payout in the who-gets-what table and its total, each breakpoint's exit value in the list and on the slider, and a jump in your payout.
  - **When they don't add up:** if the rounded payouts don't add up to the exit value, a quiet line says by how much.
  - **Still short:** headlines, chart labels and the slider's ends.
- **Two stable answers** (05c5) show the engine's message, both at the exit value you're on and for the curves and breakpoints.
- **A blank field says which it is,** beside the field, on the Payouts tab and in a save's status: "Series B's pre-money valuation can't be blank."
- **Prices on the Rounds tab** show to the cent when that's exact, "$4.00 a share", and to six places otherwise.

## Changed answers

**Every locked case from 0.4.0 gives the same answer.** These inputs change:

- **Two equal post-money SAFEs** (E20; edge case 12k) can each take cash or both convert over a range of exit values.
  - **0.4.0:** `solve` reported both answers there.
  - **0.5.0:** takes the most conversions, so they convert where converting together first pays, and payouts bend there.
  - **In 12k,** two $500,000 SAFEs with a $5,000,000 cap beside 10,000,000 common convert from $5,000,000, where 0.4.0 gave both answers up to $5,500,000.
- **Warrant shares exercised into a series that keeps its preference** (X1; edge case 12l) are left out of a post-money SAFE's Liquidity Capitalization.
  - **0.4.0** counted them, which mattered only where the strike is below the series' preference per share.
  - **In 12l,** the SAFE converts from $7,100,000, where 0.4.0's count had it convert from $6,990,243.90.
  - **A warrant whose strike equals its series' preference per share** isn't exercised while the series keeps its preference, as an indifferent holder stays put.
- **More than one stable answer** (E8, E15; 05c5): where the series, warrants and notes have more than one stable answer and they pay holders differently, `solve` and the breakpoint search stop with a plain message naming them.
  - **0.4.0** reported every answer, and could miss one where its search from both ends agreed.
  - **The message:** "At $11,047,000: Series 0 Preferred and Series 1 Preferred are at the same price, so with the SAFEs outstanding either could convert here, and the documents don't say which. spillpoint doesn't pick one. Adding a round that converts the SAFEs avoids this."
- **A fix:** 0.4.0's breakpoint search stopped on Larkspur's table at a sale (edge case 12j), with "went round in a circle (E15)" from $16,531,000. There the non-participating Seed and the post-money SAFEs went round in a circle. Under E20 it's one breakpoint where payouts jump, at $16,559,391.30.

## New in the API

- **The `start` event,** as above, and the kind `"start"` in each built table's event details.
- **`readOcf`'s `issue_order`,** on `OcfImport`.
- **The refusal term** `note_base_counts_other_convertibles`, an `"unsupported"` `OcfRefusal`.
- **The report's note code** `note_base_other_convertibles_ignored`.
- **`NoAnswerError`'s new message** where more than one answer is stable (above). Its variants:
  - where the series' prices differ: "…could each be the one that converts here…"
  - where a warrant or note is among them: "…could settle more than one way here…"
- **No new exports.**

## Changes that can break 0.4.0 code

- **`solve`'s `answers` holds one answer** where 0.4.0 gave several.
  - **Paying holders differently:** where more than one stable answer does, `solve` throws a `NoAnswerError`, where 0.4.0 returned them all.
  - **Paying every holder the same:** they're one answer, as before (E5).
  - **`complete`:** the case it marked false, more than 12 decision-makers whose two ends disagreed, now stops too, so it's always true.
  - Code that read `answers[1]`, or looped over several, gets one answer or the error.
- **`readInputs` applies the at-a-sale limits to a table built from rounds** (X12–X15), as to a cap table given in full. So some inputs 0.4.0 paid now throw an `UnsupportedTermError`:
  - more than one SAFE unless each has a post-money cap
  - a pre-money SAFE beside preferred stock
  - more than one note unless each has a cap
  - a note beside a carve-out
  - a note beside a SAFE, unless the note has a cap and every SAFE a post-money cap

  0.4.0 checked these only on a cap table given in full.
- **`readOcf` reads a note base 0.4.0 left blank:** a note whose cap counts other converting securities.
  - **0.4.0** left its base in `to_fill`.
  - **0.5.0** refuses it where another SAFE or note is outstanding beside it, and otherwise reads it, so there's no blank to fill.
- **An event's details can have the kind `"start"`.** An exhaustive `switch` over `details.kind` in TypeScript needs a case for it.

## Still refused

**New in 0.5.0:**
- **In an OCF import:** a note whose cap counts other converting securities, with another SAFE or note outstanding beside it (`note_base_counts_other_convertibles`).
- **Stopped rather than guessed,** with a `NoAnswerError`:
  - **More than one stable answer that pays holders differently.** spillpoint doesn't pick one. Reporting both, with a locked case, is on the later list.
  - **More than 12 SAFEs at a sale** whose answer doesn't settle from "every SAFE converts": too many to weigh every combination.
- **Where a second answer could go unseen:**
  - **More than 12 series, warrants and notes deciding.** Not every combination is checked; where solving from both ends reaches the same answer, that one is given.
  - **Payouts that curve,** with a carve-out alongside the preferences. The breakpoint search checks for a second answer only at the exit values it reads, not between them.
- **A starting cap table with a carve-out,** with an `InputError`: a carve-out is a term of the sale, given on the exit.

**Narrowed:** at a sale, a note beside SAFEs now pays when the note has a cap and every SAFE a post-money cap. Still refused at a sale, on the later list until a case or a real export settles them:
- a pre-money SAFE beside preferred stock
- more than one SAFE unless each has a post-money cap
- a note beside a SAFE otherwise
- a note beside a carve-out

**Unchanged from 0.4.0:** the OCF deferrals, and the rest of the engine's own list (its README's "Not settled yet").
