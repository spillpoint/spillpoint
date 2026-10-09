# Review: 05b3b (what a round says about a starting table, and Larkspur)

Branch `05b3b-round-notes`. Nothing in `cases/` changes. It has three commits:
1. **Your answers** in the plan.
2. **The page.**
3. **The docs, the screenshot steps and this note.**

**No screenshots this time.** They need a fresh build of the page, and the question I asked you about it was cut off when the app quit, so I didn't build. The six shots are written in the screenshot script (`05b3b-*`) but not run, so they're untested. Say go and I'll build inside the sandbox, take them and add them here.

## 1. "Use it to add a round" (your answer 2)

**When it's offered:** the engine refuses a table at "Use this cap table" only for the limits a sale puts on SAFEs and notes still outstanding:
- `note_with_safe_or_carve_out`
- `pre_money_safe_with_preferred`
- `several_safes`
- `several_notes`

Then the import review says:

> This cap table can't be used at a sale yet. A convertible note at a sale alongside a SAFE or a carve-out. The engine supports this once a case needs it; until then it refuses the input rather than ignoring the term.
>
> Its SAFEs and notes can convert in a priced round, though. Use it to add one: it becomes the cap table the company's rounds start from, and the payouts are worked out on the cap table after the round.
>
> **[Use it to add a round]**

Any other refusal reads as before, with no offer. A test pins one: a sale dated before a note was issued.

**What it does:** the table becomes the starting table, dated and ordered as the import was, and the Rounds tab opens at a Series B. Both "Converts the SAFEs still outstanding" and "Converts the convertible notes still outstanding" are ticked.

**Until a round converts them,** the Payouts tab gives the engine's message:

> **The payouts can't be worked out yet.** A convertible note at a sale alongside a SAFE or a carve-out. The engine supports this once a case needs it; until then it refuses the input rather than ignoring the term. Once a round on the Rounds tab converts the SAFEs and notes, the payouts use the cap table after it.

Below it, any problem with the round as typed, with its "Fix it". Before this, the page always had a table it could pay out, so this state is new.

**The main test** is in `apps/dashboard/test/add-a-round.test.tsx`:
1. It imports Larkspur and answers its two blanks as case 27 fills them, with a sale date.
2. It uses it to add a round, and enters case 27's Series B through the page: Investor Z, added on the Rounds tab, $8M at $50M pre-money, the pool to 10%, senior.
3. It saves, and checks the file against case 27's locked expected values: every breakpoint, and every holder's payout there, to the cent. Holders are matched by name, since the page gives Investor Z its own id.
4. It opens the file and checks again.

It passes. It takes 9.5s here and runs full searches on case 27, so it has the 60-second timeout from #68.

## 2. A saved cap table keeps the import's date and issue order (your answer 1)

An imported table saved before a round is added writes them beside the cap table, each only when present:

```json
{ "format": "spillpoint", "version": 6, "name": "…", "cap_table": {…}, "as_of": "2025-12-31", "issue_order": ["seed", "series_a"], "range": […] }
```

**When it's reopened,** "Add a round" starts from the same date and order. A test saves Quillfern, reopens it, adds a round and saves again: the start event has Dec 31, 2025 and `["seed", "series_a"]`.

**Refused:**
- a date or an order the page can't read
- either one beside rounds, which keep them in their first event

## 3. What a round says about a starting table

Each note is tested on the engine's own build, as the Rounds tab shows it (`apps/dashboard/test/round-notes.test.ts`).

**A starting series with no anti-dilution, in a round priced below its conversion price.** This uses your wording. Quillfern with a $5M pre-money Series B, about $0.25 a share, gives one line for each of its series:

> Seed Preferred has no anti-dilution, so this down round doesn't adjust it. If its charter gives it some, add it in the starting cap table.
>
> Series A Preferred has no anti-dilution, so this down round doesn't adjust it. If its charter gives it some, add it in the starting cap table.

There's no line in an up round. A series given anti-dilution in the starting table is adjusted instead, and gets no line.

**A conversion group in the starting table,** in your wording. Case 6b's table with a Series A gives:

> Series A Preferred isn't in the group of series that must convert together (Seed-1 Preferred and Seed-2 Preferred), so at a sale it decides on its own whether to convert. If its charter puts it in that group, spillpoint can't model that yet.

With a SAFE in the starting table that the round converts, the plural reads:

> Series A Preferred and Series A Preferred (from SAFEs) aren't in the group of series that must convert together (Seed-1 Preferred and Seed-2 Preferred), so at a sale each decides on its own whether to convert. If the charter puts them in that group, spillpoint can't model that yet.

**How the issue order was read.** This applies when a round adjusts a starting series and a SAFE or note from the starting table converts in it. It's the last line under the adjustment, after each piece's line. Case 16j from the table after its Seed, with its down Series A, shows both readings:
- **As the starting table gives it:** "Which SAFEs and notes were issued before Seed Preferred follows the order the starting cap table gives." The note's and the SAFE's lines then say each "was issued before Seed Preferred, so it counts in the starting share count instead."
- **With none given:** "The starting cap table doesn't give the order things were issued in, so its SAFEs and notes count as issued after Seed Preferred: they usually bridge to the next round." Their lines then say they count against it.

## How to check by behavior

1. **Run the tests:**
   ```bash
   pnpm test
   ```
   - **Dashboard:** 447 pass, 12 more.
   - **Engine:** 2,048 pass, unchanged.
2. **Or click through it** with `pnpm dev`:
   1. **Import Larkspur:** "Open an OCF export", choose the eight files in `cases/ocf-01-larkspur/package`.
   2. **Answer its questions:**
      - Seed Preferred: non-participating
      - Investor N's repayment multiple: 1
      - a sale date
   3. **"Use this cap table",** then "Use it to add a round". The Payouts tab gives the message above.
   4. **On the Rounds tab:** add Investor Z under Holders.
   5. **In the Series B form:**
      - **Date:** 2025-12-01
      - **Pre-money valuation:** 50000000
      - **Option pool after the round:** 10
      - **Investor 1:** Investor Z, 8000000
      - **How it ranks:** "Senior to every earlier series"
   6. **Payouts tab:** case 27's payouts. At $50M, the middle of the import's range, Founder A gets $12.6M: Investor Z's Series B still takes its $7,999,998.61 there, and common is $2.329379 a share.
3. **For the down-round notes:** import Quillfern, "Add a round", and give it a $5M pre-money.

## Decisions for you to check

1. **The plural of your conversion group sentence:** "aren't", "each decides", and "If the charter puts them" in place of "If its charter puts it".
2. **The order note's wording** (R31 left it to 05b3).
3. **Where the order note goes:** the last line under the adjustment, after each piece's line.
4. **The Payouts tab's lead-in** to the engine's message, and its closing sentence.
5. **The offer shows the engine's words without their path** ("import.cap_table.unconverted_notes:"), since the offer says what to do. Other refusals keep the path, as before.
6. **Save waits for a payable table.** While no round converts the SAFEs and notes yet, Save says "Not saved: the cap table has a problem to fix first", as it does for any table the engine refuses, because such a file wouldn't open. Say if you'd rather it save the rounds as typed.

## Open question

**The anti-dilution note only looks at the round's price.** Case 27's note and SAFEs convert at $0.61 and $0.68, below the Seed's $0.80, in an up round. If the Seed had broad-based protection, those conversions would adjust it on their own (R25's pieces). With none, as imported, the page says nothing there, because it isn't a down round.

Should the note also fire when only a conversion is priced below a starting series' conversion price? A sentence like "Seed Preferred has no anti-dilution, so its SAFEs' and notes' conversions below its $0.80 don't adjust it" could cover it.

## Assumptions added or changed

- **R31:** "Settled in 05b3b".
  - the offer, and the Payouts tab before a round converts
  - the three notes, in their exact words
  - a saved cap table now keeps the import's date and order
- **C13:** version 6's `as_of` and `issue_order` beside a cap table entered directly.

## Checks

- **Dashboard:** 447 tests pass.
- **Engine:** 2,048 tests pass.
- **Reference:** passes, unchanged.
- **Typecheck:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **The screenshot script** gains six `05b3b-*` shots, written but not run.
- **Nothing ran outside the sandbox.**

## Next

0.5.0 continues with 05c: SAFEs beside a note at a sale. I'm stopping here.
