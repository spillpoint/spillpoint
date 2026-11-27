# Review: 11a (a plan for 2.0's first part, a cap table a founder keeps)

Branch `11a-plan-2-0`, from main at `c7e0af6` (#145 merged, no PR open). A plan only: no code, no cases, nothing under `cases/`, `reference/`, `apps/` or `packages/`.

**CI and permissions:** no change to `.github/workflows/` or `.claude/`.

## What changed

- **`notes/plan-2.0.md`,** new: the plan, in your seven parts. The ledger and how each event maps onto what the engine builds from rounds today; guided setup and its checks; the views; the file, its versions and the OCF export; what stays out and where each would attach; 13 steps; three questions. The second commit adds your answers and the new order, 14 steps (below).
- **This note.**
- **Not `CLAUDE.md`.** "Where things stand" and the repo layout get their lines in 11b, once you've answered.

## What to look at first

1. **A round is recorded as issued, and checked against its terms** (section 1, "A round as recorded"). This is the plan's center. Today's priced round works the shares out from the pre-money. A founder's cap table has to match the closing papers instead: the price the purchase agreement states, and the shares each investor and each SAFE got. So the founder enters those, and the engine works the same round out at the stated price and reports each difference, with its size. The page shows the worked-out count beside each field but never fills it in. The same "round at a stated price" is the SAFE view's trial round. If you'd rather founders entered terms and let the engine work out the counts, the plan changes most here.
2. **Warnings, not refusals,** for anything that still leaves a cap table (section 2, "The checks"): 13 of them, with codes and rough words, and a wording rule a test holds: never "must", "invalid", "illegal" or "you should". **`buildCapTables` is unchanged,** so a grant beyond the pool is still refused there. Only the new `buildLedger` records it with a warning.
3. **Quillfern is the first case** (section 1, last part). `ocf-12-ledger`'s 34 hand-written OCF transactions become about 20 ledger events, `ledger-01-quillfern`, whose last table must be edge case 25's locked table. It also gives the ledger two warnings to expect, and later the OCF export's round trip.
4. **The plan's pool follows O6** (section 1, "The plan's pool"): reserved, less grants outstanding, less shares delivered, less cancellations that don't go back. It's how the import already reads a pool, and it lets a grant beyond the pool be recorded with the pool at 0.
5. **Question 1, before anything else** (step names as first lettered). The engine's additions are all new names, so they're a minor release after 1.0. But 1.0 has to be cut before 11d merges, or it carries names that never had a naming review. The page isn't held up either way, since it builds from main.

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

None in `docs/ASSUMPTIONS.md`. The plan proposes R32 and R33, under "Rounds and cap tables", written in 11b and 11c. It proposes L1 to L20 for a new "The ledger" section, written in 11d with its first case, and C21 for the ledger case folder, since 0.8.0's plan holds C20 for Carta's. (The first commit had L1 to L21. Its L15 is now R32, and the second commit's section below says why.) The defaults I picked are in the plan's L table; the ones you might not expect:
- **A grant's expiry takes it out of the table on its date** (L18), as an import reads it (O6), so the table as of a date can differ from the table after its last event.
- **One answer for what goes back to the pool,** asked when the plan is entered, never preset: it covers cancellations, expiries, forfeitures and repurchases of stock from the plan (L4).
- **`within_rounding`** (L14): a recorded count that some price within half of the stated price's last written place would give is reported as the price's rounding, not as a mistake.
- **Out of this part:** transfers of options, pay-to-play in a recorded round, splits with anything outstanding on the class, several plans, RSUs.

## Open questions

The plan's three, in its section 7, as first asked:
1. **Which release, and 1.0 first:** (a) 1.0's release step on main before 11d, published from its tag when the second gate is met, the ledger as 1.1.0; (b) 2.0.0 to mark the stage; (c) 1.0 waits and carries the ledger. I'd take (a).
2. **Vesting out of this part?** I'd leave it out: nothing here needs a vested count, and it has rules of its own.
3. **The papers each event comes from,** with "I have it" and a note, in the file and never the papers? I'd include it, in 11f.

All three are answered: below.

## The second commit: your answers and the new order

**Your answers,** in the plan's new "Your answers (2026-11-27)":
1. **(a).**
2. **Vesting stays out.**
3. **Yes to the papers,** in our own general words with "usually", under the line that this isn't legal advice. That's now a paragraph in section 2, and `documents` in section 4 is no longer conditional.

The recorded round stays as planned: the counts come from the founder's papers, and the engine checks them.

**The new order** (section 6), with the SAFE view first:
- **11b, a priced round at a stated price** (R32). Tested by rebuilding every locked round case's priced rounds at the price each solves to, and getting the same tables exactly. I added one more test: at four other prices per case, it gives the same counts as today's round given the pre-money it implies. The SAFE view runs at prices no case solves to, and this ties them to the solve the cases check.
- **11c, the SAFEs tab,** on rounds, a cap table entered directly, and an import. "Add it to the ledger" moved to 11l, with the as-of date.
- **11d to 11o, the ledger,** in the planned order: its cases (11d to 11g), the engine (11h, 11i), the page (11j to 11l), the export (11m, 11n) and the release (11o).

**Which steps lift the cases lock:** 11d, 11e, 11f and 11g, the ledger's cases. 11b and 11c add no case.

**Does the reference need to learn it in 11b?** No, not for 11b's check. The locked tables are the reference's own, so matching them at the solved price is already an independent check. The reference learns the stated-price round in 11f, where the recorded round's check needs values at prices no case solves to: six-place prices, and `within_rounding`.

**Three things to look at:**
1. **1.0's release step now lands before 11b,** not just before the ledger's engine step. 11b is the first step that adds to the engine's API, and answer 1's reason, that 1.0 is 0.7.0's API, reaches it too. So the next step is 1.0's release step, a step of its own (10m, say), and then 11b. If you'd rather 11b go first and 1.0 carry its one addition, only section 6's "Before 11b" paragraph changes.
2. **L15 is now R32.** It's a round's rule, and it lands before the ledger, so it sits with the round rules. The L items after it move up one: warnings are L15, a grant's expiry L18, and holder kinds L20.
3. **R33, the price where the cap takes over, is given only where it's exact and simple.** That's where the cap price is the same at any round price: every note, a post-money SAFE with nothing beside it converting at a discount or without a cap, and a pre-money SAFE in a round that doesn't top up the pool. Elsewhere, a pre-money SAFE in a round that tops up the pool for one, the cap price moves with the round's price. There the tab says which one sets the price at the price chosen, and gives no crossover. The general case goes on the Later list, so 11c needs no new case. 11c tests the crossover on edge-15's SAFE from the case's own numbers: its post-money cap ÷ its Company Capitalization in `expected.json` ÷ (1 − its discount).

**Also in 11c's tests:** Larkspur's import, with a trial at case 27's Series B price, must give case 27's locked table, so the import's path is checked against a locked round.
