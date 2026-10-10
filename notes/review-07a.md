# Review: 07a (the plan for 0.7.0's naming review)

Branch `07a-plan-0.7.0`, from main. No code, and no case file changed. Two commits:
1. **`notes/plan-0.7.0.md`.**
2. **This note.**

It's written now, while 06c waits for an export's headers, so 06d builds `readOcx` to settled names. The renames ship in 0.7.0, after 0.6.0.

## What changed

**`notes/plan-0.7.0.md`.** Each item says:
- what the name or field is today
- what I'd do
- what it breaks: npm code, the page and its saved files, the locked cases
- what it means for 06d, where it touches `readOcx`

**Your seven items:**
1. **Class names to the cent:** "Options ($0.10 strike)". Ids unchanged.
2. **`readOcf`'s snake_case:** kept, with the rule written down. An import returns case-file JSON, whose names are the fields it feeds.
3. **`complete`:** dropped. `answers` is kept as a list, so "report both answers" can come after 1.0 without a break.
4. **`structure`:** out of the public payout, with `capRoom` and both `room` fields, which are the breakpoint finder's too.
5. **`start` and `issue_order`:** kept. They're in saved files, and nothing reads better.
6. **The pro-rata label:** "Pro-rata base includes the unused option pool (smaller pro-rata rights for earlier investors)", shown only when a round has a pro-rata investment, as 03i did.
7. **One `ImportRefusal` and one `CapTableImport`** for both imports, added in 0.6.0 beside the old names, which go in 0.7.0.

**Eight more of mine,** items 8 to 15, and a few that break nothing in 16:
- `checkEveryCombination`, a test switch, out of the public API
- `bySecurity`, the same as `classTotals` at every case point, dropped
- a built table's SAFEs and notes, in two places, kept in one
- `PreparedCapTable`'s 13 working fields narrowed
- the anti-dilution piece named "new money" given a kind and an id
- `parseExact`'s path made optional
- the "for 0.1.0" optional fields kept, with honest comments
- `_shadow` ids made `_safes`, to match `_notes`

**What I checked on the cases:** at all 356 exit points the cases list, `solve` gave exactly one answer with `complete` true, and `bySecurity` equalled `classTotals`.

**What the renames touch in `cases/`:** items 1 and 15 change names and ids only.
- **Generated names:** 34 `expected.json` files, 27 edge and Millrace and 7 OCF.
- **`_shadow` ids:** 40 files, 18 of them `inputs.json`.

So a cases PR, 07b, with no amount, share count or breakpoint changing. I've asked whether a check of the diff can stand in for a re-derivation there (question 17).

## How you can check it

Read the plan. The questions are at the end, one per item. The counts it gives can be re-run:
- the case files with generated names: `git grep -l -E '\(\$[0-9.]+ strike\)' -- cases`
- the case files with `_shadow` ids: `git grep -l _shadow -- cases`

## Decisions for you

The plan's 17 questions. The ones with the most behind them:
- **7, one import refusal and result:** 06d builds to it either way.
- **11, narrowing `PreparedCapTable`:** the page moves off 8 reads.
- **15, `_shadow` to `_safes`:** 40 case files.
- **17, how 07b is checked.**

## Assumptions added

None: no modeling choice changes.

## Open questions

The plan's 17.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing ran outside the sandbox,** and nothing used the network. I built the engine to read its declarations, and ran one script over the cases, inside the sandbox.

## Next

0.6.0 continues with 06c, once an export's headers are in, and 06d builds to these names once you've answered. I'm stopping here.
