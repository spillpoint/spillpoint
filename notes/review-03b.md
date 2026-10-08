# Review: 03b (case 8b, the warrant on the curve)

Branch `03b-cases`. One new case, worked out by hand in its `DERIVATION.md`, and the reason-wording fix you asked for in 12i and 13h.

**Before it merges, it needs:**
- your re-derivation
- the `unlock-cases` label: it touches `cases/`

## Case 8b

Edge case 8's company:
- **Common:** 8,000,000 shares.
- **The Seed:** Investor X's 2,000,000 at $1.00, 1x non-participating.
- **The warrant:** Lender L's, for 200,000 Seed shares at $0.50.

It adds a **flat 10% carve-out alongside the preferences**, all to Manager M. The carve-out shares the Seed's tier, so payouts curve until that tier is paid in full (X17).

**The warrant comes into the money on the curve.** Exercised, its strike cash adds $100,000, and its shares join the tier, so each Seed share gets (X + $100,000) ÷ ($2,200,000 + 0.1X). That reaches the $0.50 strike where 0.95X = $1,000,000: **$1,052,631.58**, exactly $20,000,000 ÷ 19.

**It's a kink, not a jump.** At that point:
- **Lender L** nets nothing.
- **Investor X** gets $1,000,000 either way.
- **Manager M** gets $52,631.58 either way.

| Exit value | Why |
|---:|---|
| $1,052,631.58 | The warrant comes into the money. Payouts curve on both sides. |
| $2,333,333.33 | The tier is paid in full: $2,200,000 to the Seed and $233,333.33 to the carve-out. Payouts curve just below. |
| $11,222,222.22 | The Seed converts, at $1.00 a share. |

| Exit | Investor X | Lender L | Manager M | Founder A | Founder B |
|---:|---:|---:|---:|---:|---:|
| $0.5M | 487,804.88 | 0 | 12,195.12 | 0 | 0 |
| $1.5M | 1,361,702.13 | 36,170.21 | 102,127.66 | 0 | 0 |
| $5M | 2,000,000 | 100,000 | 500,000 | 1,800,000 | 600,000 |
| $15M | 2,666,666.67 | 166,666.67 | 1,500,000 | 8,000,000 | 2,666,666.67 |
| $20M | 3,549,019.61 | 254,901.96 | 2,000,000 | 10,647,058.82 | 3,549,019.61 |

**Two notes for the engine's turn:**
- **The engine's "For you" line:** at the kink both sides curve, so it will use your approved both-sides wording (decision 7). That comes in 03f, since the page runs the engine.
- **The engine today:** it reads 8b, but its breakpoint finder stops there with the guard error. Its tests say exactly that until 03f.

## How the reference places it

Before this PR, a decision changing on a curve stopped the reference with its guard error. Now:
1. **Fit:** if exactly one decision-maker's choice changes, outside a group vote, its gain from switching is fitted as one straight line over another, (a·x + b) ÷ (c·x + 1), from three readings.
2. **Check:** the fit is checked against a fourth reading. That's what you asked the engine to do in 03f, so the reference does it too.
3. **Solve and confirm:** it's solved where the gain is zero, and the payouts must meet there.

Anything else still stops with the guard error: a group's vote, two decisions at once, a gain of another shape, or a jump. A new hand-checkable unit test covers it: a smaller company whose warrant comes into the money at $2,000,000 ÷ 19.

## The wording fix: 12i and 13h

At 12i's $4,250,000 and 13h's $4,400,000, the reason said "what is left for common and the SAFE" (or the note). The Seed participates in that residual too.
- **With preferred on the cap table,** it now says "what is left after the preferences", as the derivations do.
- **With none,** as in 12c and 13e, the old words are right, so they stay.

Only those two lines changed, one in each `expected.json`. The engine gets the same wording in 03e.

## What changed

- **`cases/`:**
  - case 8b, new
  - 12i's and 13h's `expected.json`, one reason line each
- **`reference/`:**
  - `breakpoints.py`: the decision on a curve, and the wording
  - `waterfall.py`: a helper for the payouts under fixed decisions
  - a unit test (51)
  - the README's method
- **`docs/ASSUMPTIONS.md`:**
  - **X17:** the exception now has its case, and how it's placed.
  - **Owed before release:** the warrant item names 8b.
- **`docs/SPEC.md`:** 8b in the list of edge cases.
- **Engine and page:** tests only. 8b is listed as read, with the finder stopping on the guard until 03f.

## Checks

- **Engine:** 1,356 tests pass, 8 more.
- **Dashboard:** 292 tests pass.
- **Reference:** 51 unit tests pass, and all 66 cases match.
- **Typecheck and build:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`. `.claude/settings.json` has local changes that aren't committed.
- **Nothing run outside the sandbox.**

## Assumptions added

**No new IDs.** X17 updated.

## Open questions

None. Next is 03c: cases 21b, 21c and 17i. I'm stopping here.
