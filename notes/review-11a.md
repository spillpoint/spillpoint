# Review: 11a (a plan for 2.0's first part, a cap table a founder keeps)

Branch `11a-plan-2-0`, from main at `c7e0af6` (#145 merged, no PR open). A plan only: no code, no cases, nothing under `cases/`, `reference/`, `apps/` or `packages/`.

**CI and permissions:** no change to `.github/workflows/` or `.claude/`.

## What changed

- **`notes/plan-2.0.md`,** new: the plan, in your seven parts. The ledger and how each event maps onto what the engine builds from rounds today; guided setup and its checks; the views; the file, its versions and the OCF export; what stays out and where each would attach; 13 steps; three questions.
- **This note.**
- **Not `CLAUDE.md`.** "Where things stand" and the repo layout get their lines in 11b, once you've answered.

## What to look at first

1. **A round is recorded as issued, and checked against its terms** (section 1, "A round as recorded"). This is the plan's center. Today's priced round works the shares out from the pre-money. A founder's cap table has to match the closing papers instead: the price the purchase agreement states, and the shares each investor and each SAFE got. So the founder enters those, and the engine works the same round out at the stated price and reports each difference, with its size. The page shows the worked-out count beside each field but never fills it in. The same "round at a stated price" is the SAFE view's trial round. If you'd rather founders entered terms and let the engine work out the counts, the plan changes most here.
2. **Warnings, not refusals,** for anything that still leaves a cap table (section 2, "The checks"): 13 of them, with codes and rough words, and a wording rule a test holds: never "must", "invalid", "illegal" or "you should". **`buildCapTables` is unchanged,** so a grant beyond the pool is still refused there. Only the new `buildLedger` records it with a warning.
3. **Quillfern is the first case** (section 1, last part). `ocf-12-ledger`'s 34 hand-written OCF transactions become about 20 ledger events, `ledger-01-quillfern`, whose last table must be edge case 25's locked table. It also gives the ledger two warnings to expect, and later the OCF export's round trip.
4. **The plan's pool follows O6** (section 1, "The plan's pool"): reserved, less grants outstanding, less shares delivered, less cancellations that don't go back. It's how the import already reads a pool, and it lets a grant beyond the pool be recorded with the pool at 0.
5. **Question 1, before anything else.** The engine's additions are all new names, so they're a minor release after 1.0. But 1.0 has to be cut before 11d merges, or it carries names that never had a naming review. The page isn't held up either way, since it builds from main.

## How to check it by behavior

**What the plan builds on, on the page today.** On spillpoint.io, choose Start from "A blank company, built from its rounds", then the Rounds tab, then "Add an event":
- **The eight kinds listed** are the events the ledger starts from: shares issued, a percentage, a pool, options granted, warrants, SAFEs, notes, a priced round. Nothing for an exercise, a cancellation, a transfer or a repurchase.
- **Add "Options granted",** 100,000 to anyone at $0.10. The blank company has no pool, so the round shows the engine's refusal: "a grant of 100,000 options is more than the 0 left in the unissued pool". I ran the same input through `buildCapTables` and got those words. In a ledger, that grant is recorded, with `over_pool`, the pool at 0.

**Millrace's undated grants.** Choose Start from Millrace and open the Rounds tab. Its two grant events between rounds have no date (R14). Opened as a version 8 ledger, those two would be listed as `undated_event`, and its three rounds as `worked_out_round`, since they're worked out from their terms. Its payouts wouldn't change.

**Quillfern, by hand.** Set `cases/ocf-12-ledger/DERIVATION.md`'s ledger table beside the plan's Quillfern table:
- **Every row maps to an event** in the plan's events table, but D's 400,000 that was retracted, which a ledger deletes instead.
- **The pool:** 3,000,000 reserved − 900,000 outstanding − 150,000 exercised = 1,950,000. `ocf-12`'s `expected.json` and edge case 25's `inputs.json` both have 1,950,000.
- **The recorded Seed's check:** $250,000 ÷ $0.96 = 260,416.67, so 260,416 shares, which is what Angel S got: no `recorded_differs`. $0.96 is the $1.20 price less the 20% discount.

**The reasoning:** read the short version, then question 1, then section 1's events table and section 6's steps.

I ran no test suite: nothing that runs has changed.

## Assumptions added

None in `docs/ASSUMPTIONS.md`. The plan proposes L1 to L21 for a new "The ledger" section, written in 11b with its first case, and C21 for the ledger case folder, since 0.8.0's plan holds C20 for Carta's. The defaults I picked are in the plan's L table; the ones you might not expect:
- **A grant's expiry takes it out of the table on its date** (L19), as an import reads it (O6), so the table as of a date can differ from the table after its last event.
- **One answer for what goes back to the pool,** asked when the plan is entered, never preset: it covers cancellations, expiries, forfeitures and repurchases of stock from the plan (L4).
- **`within_rounding`** (L14): a recorded count that some price within half of the stated price's last written place would give is reported as the price's rounding, not as a mistake.
- **Out of this part:** transfers of options, pay-to-play in a recorded round, splits with anything outstanding on the class, several plans, RSUs.

## Open questions

The plan's three, in its section 7:
1. **Which release, and 1.0 first:** (a) 1.0's release step on main before 11d, published from its tag when the second gate is met, the ledger as 1.1.0; (b) 2.0.0 to mark the stage; (c) 1.0 waits and carries the ledger. I'd take (a).
2. **Vesting out of this part?** I'd leave it out: nothing here needs a vested count, and it has rules of its own.
3. **The papers each event comes from,** with "I have it" and a note, in the file and never the papers? I'd include it, in 11f.
