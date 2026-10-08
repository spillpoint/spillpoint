# Review: 03c2 (case 21d, a discounted note beside a post-money SAFE)

Branch `03c2-case-21d`. The gap you found in 03c: in 21b, 21c and 17i the caps set every conversion price, so nothing depended on the round's price. Case 21d tests the "solved together with the price" part of answer 2, and settles your rule. It's its own small PR, since 03d is already full.

**Before it merges, it needs:**
- your re-derivation
- the `unlock-cases` label

## Case 21d

21b's company and post-money SAFE:
- **Common:** 9,000,000 shares.
- **Investor S's SAFE:** $1,000,000 at a $10,000,000 post-money cap.
- **Investor N's note:** $500,000 at 6%, now with **no cap and a 20% discount**.
- **Investor Y's Series A:** $5,000,000 at a $20,000,000 pre-money valuation.

**Solved by hand.** With x the post-money shares and the price $25,000,000 ÷ x:
- **The note's shares:** $530,000 ÷ (0.8 × price) = 0.0265x.
- **The SAFE's shares:** a tenth of its Capitalization, (9,000,000 + 0.0265x) ÷ 0.9.
- **The total:** x = 18,000,000,000 ÷ 1,387 = **12,977,649.60**, at **$1.926389** ($1,387 ÷ 720).

| | Exact | Issued |
|---|---:|---:|
| Investor N's note, at $1.541111 | 343,907.7145 shares | **343,907** |
| Investor S's SAFE's Capitalization | **10,382,119.68** | |
| Investor S's SAFE, at $0.963194 | 1,038,211.97 shares | **1,038,211** |
| Investor Y, at $1.926389 | 2,595,529.92 shares | **2,595,529** |

## The rule (R24, your 03c review)

**The SAFE's Company Capitalization counts the note's exact conversion shares, before rounding down,** as the round's price is solved exactly (R3). The exact Capitalization, 14,400,000,000 ÷ 1,387, is what `expected.json` records. Counting the rounded 343,907 would give 10,382,118.89, eight-tenths of a share less. Here that leaves the SAFE's whole shares the same.

## It found a bug in the reference

A real one, in my 03c change. To skip impossible branches, such as converting at a cap the instrument doesn't have, the reference priced each instrument's cap. For a post-money SAFE that means its Capitalization, which needs the other instruments' shares. With an uncapped note that division failed.
- **Why 03c missed it:** 21b, 21c and 17i all had capped notes, so they never reached it.
- **The fix:** the check now asks whether an instrument has a cap, without pricing anything.
- **The test:** a new hand-checkable unit test covers a discounted note beside a post-money SAFE, to the exact Capitalization: 144,000,000 ÷ 139.
- **Nothing else moved:** every existing case still matches exactly.

## What changed

- **`cases/`:** case 21d, new.
- **`reference/`:**
  - `rounds.py`: the branch check
  - the unit test (52)
- **`docs/ASSUMPTIONS.md`:**
  - **R24:** the exact-shares rule.
  - **Owed before release:** the R24 item names 21d.
- **`docs/SPEC.md`:** 21d in the list of edge cases.
- **Engine:** tests only. 21d is refused until 03g, with 34 cases with events.

## Checks

- **Engine:** 1,372 tests pass.
- **Dashboard:** 300 tests pass.
- **Reference:** 52 unit tests pass, and all 70 cases match.
- **Typecheck:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`. `.claude/settings.json` has local changes that aren't committed.
- **Nothing run outside the sandbox.**

## Assumptions added

**No new IDs.** R24 updated.

## Open questions

None. Next is 03d: 16g–16j and 17j. I'm stopping here.
