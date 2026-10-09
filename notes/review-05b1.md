# Review: 05b1 (two cases that start from a cap table)

Branch `05b1-starting-table-cases`. The `cases/` edit rule is lifted for this PR, as you said. It has three commits:
1. **05a2 and 05d on hold,** with the reason, in the plan and O15.
2. **The reference's starting event,** with its tests.
3. **Edge cases 26 and 27,** each with a DERIVATION for re-derivation, and the docs.

The engine doesn't read a starting table yet; that's 05b2. Until then its tests name the two cases and check it refuses them, so they're never skipped silently.

## 1. On hold

`notes/plan-0.5.0.md` marks 05a2 (the page's "Copy a summary to share") and 05d (fixes from real exports) on hold: there's no real OCF export to check. The real-data check for 1.0 becomes a hand-entered real cap table, compared against someone else's waterfall. O15 says the page summary is on hold.

## 2. The reference's starting event

A company built from rounds may now have a cap table as its first event (R31, C17):

```json
{"id": "start", "date": "2025-12-31", "type": "start", "cap_table": {…}, "issue_order": ["seed", "series_a"]}
```

- **The cap table** is in the same shape as an exit's.
- **`issue_order`** lists every preferred series, SAFE and note in it, earliest first. It's optional. With none given, its SAFEs and notes count as issued after its series.
- **Refused:**
  - a starting table that carries a carve-out
  - a start event that isn't first
  - a holder in it that isn't listed in `holders`
  - an order that doesn't list each series, SAFE and note exactly once

**The split test** (`reference/tests/test_start.py`):
- **The test:** every round case is split at every event. The table after event k is given as a starting table with its issue order, followed by the events after k. It must rebuild every later table, and what each later round worked out, exactly.
- **The result:** all 39 cases, 148 splits, pass. Nothing beyond the issue order was needed, as the plan expected.
- **Without the order,** exactly one split differs: 16j after its Seed. A unit test pins it:
  - 16j's note and SAFE were issued before the Seed, so in the down Series A they count in the Seed's A, not against it (R25)
  - with no order given, they count as issued after the Seed, so they count against it, and the Seed's new conversion price differs

05b2 runs the same split test on the engine.

## 3. Edge case 26: Quillfern plus a Series B

**The starting table:** edge case 25's, the one Quillfern's ledger imports to, on Dec 31, 2025.

**The round, Mar 31, 2026:**
- $40M pre-money
- Fund W, a new lead, puts in $8M
- Fund U puts in $1.5M, marked pro-rata
- the pool is topped up to 10%

**What it works out:**
- **Price:** $1.8984428717, an up round.
- **Pool:** 2,607,400, a top-up of 657,400.
- **Shares:** Fund W 4,213,979, Fund U 790,121.
- **Fund U's pro-rata:** its entitlement is 18.199053% × $9.5M = $1,728,910.03, so its $1.5M is a partial take-up.

**At the sale:** 9 breakpoints from $0 to $150M, with payouts at seven exit values. Series B converts at $46,460,447.92.

## 4. Edge case 27: Larkspur plus a Series B

**The starting table:** Larkspur's import, OCF case 01, on Jun 30, 2025, with its two blanks filled.

**The round, Dec 1, 2025:**
- $50M pre-money
- Investor Z puts in $8M
- it converts both post-money SAFEs and the note
- the pool is topped up to 10%

**What it works out:**
- **The note:** 426 days of interest, $17,506.85. It converts at its cap price, $0.6078565459, into 440,082 shares.
- **The SAFEs:** Company Capitalization 17,625,737.9535, counting the note's exact shares (R24). Each converts at $0.6808225580 into 367,202 shares.
- **Price:** $2.7007642506, an up round.
- **Pool:** 2,147,540, a top-up of 887,540.
- **Investor Z:** 2,962,124 shares.

**At the sale:** 11 breakpoints from $0 to $200M, with payouts at seven exit values. The three cheapest series convert in turn: from notes, from SAFEs, then the Seed.

## How to check by behavior

1. **Re-derive from the two `DERIVATION.md` files:**
   - `cases/edge-26-series-b-on-an-imported-table/`
   - `cases/edge-27-safes-and-note-convert-on-an-imported-table/`

   Each walks through, by hand:
   - the round: price, shares, pool, and the pro-rata or the note and SAFEs
   - the cap table after it
   - every breakpoint, as a formula
   - four payouts

   Every number in them matches `expected.json` to the cent.
2. **Run the reference:**
   ```bash
   pnpm test:reference
   ```
   That runs 59 unit tests, 4 of them new, then checks every `expected.json` against the reference.
3. **Once they're re-derived,** add the cases label, and restore the edit rule.

## Decisions for you to check

1. **27's two blanks,** as the plan reads them:
   - **The Seed's participation:** non-participating.
   - **The note's repayment multiple:** 1. It changes nothing, since the note converts in the round.
2. **27's issue order:**
   - **The order:** Seed, the two SAFEs, the note, Series A.
   - **Why the SAFEs come second:** they came from Investor S's Sep 1, 2024 SAFE, by a transfer and its balance on May 15, 2025, so they keep Sep 1 (O14), as the plan reads answer 7.
   - **What it changes:** nothing in this round. It's an up round and neither starting series has anti-dilution; the reference builds the identical table with no order given.
   - **Why it's given anyway:** it's what `readOcf` will return in 05b2.
3. **Two breakpoints in 27 each carry two reasons,** because two things happen at one exit value:
   - **$15,692,504.14:** the Seed's preference is paid, and common's first dollar puts the RSUs, which have no strike, in the money.
   - **$24,970,587.41:** the Seed converts. A Seed share is first worth more than the warrants' $1.00 strike there. Below it a Seed share is worth exactly its $1.00 preference, so exercising gains nothing (E12).
4. **The exit values,** one in each kind of stretch:
   - inside the senior tier
   - every preference paid
   - Seed converted
   - Series B converted
   - all common

## Assumptions added

- **C17:** the start event's fields, and how `expected.json` records the starting table.
- **R31:** now records that the reference has it since 05b1.
- **No new modeling choices.** Both cases use rules already written down: R3, R6, R23, R24, R29, E12, O14.

## Open questions

1. **The RSUs' breakpoint wording.** At $15,692,504.14 the reason reads "Common reaches $0.00 per share, the strike on the 30,000 options at that price…". It's accurate, but odd for RSUs. Something like "Common's first dollar: the 30,000 RSUs, with no strike, share in it from here" would read better.

   The engine has to match the reference's text, so a new wording changes both. Should it be done in 05b2, or left for the 1.0a wording pass?

## Checks

- **Reference:** 59 unit tests pass, 4 new. Every `expected.json` matches.
- **Engine:** 1,806 tests pass, 17 new:
  - the case file checks on 26 and 27
  - a test that names the two cases
  - a test that each one is refused, with `unknown event type "start"`
- **Dashboard:** 418 tests pass. The test of SAFEs and notes in round cases leaves out the two starting-table cases until 05b3.
- **Typecheck:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`. The `cases-locked` check will want the cases label on this PR.
- **Nothing run outside the sandbox.**

## Next

05b2: the engine's starting event, its split test, and `readOcf`'s issue order. I'm stopping here.
