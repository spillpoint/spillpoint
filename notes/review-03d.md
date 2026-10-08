# Review: 03d (conversions in a round that triggers anti-dilution: 16g, 16h, 16i)

Branch `03d-cases`. The plan's 03d was five cases and a rework of the reference's anti-dilution, too much for one evening, so I split it:
- **This PR, 03d:** 16g, 16h and 16i, settling your answers 3a, 3b and 3c.
- **03d2:** 16j, for answer 3d, with a note and a SAFE each left outstanding through the Seed's round, and 17j.

**Before it merges, it needs:**
- your re-derivation
- the `unlock-cases` label

The three cases share one company:
- **Common:** Founder A 6,000,000 and Founder B 2,000,000.
- **The Seed:** Investor X's 2,000,000 shares at **$1.00**, with broad-based weighted-average anti-dilution.

## 16g: a bridge SAFE in a down round (answers 3a, 3c)

Investor S's $1,000,000 SAFE, capped at $6,000,000 post-money and issued after the Seed, converts at **$0.50** into 2,000,000 shares. It does so in a Series A: Investor Y's $2,000,000 at an $8,000,000 pre-money valuation.
- **Both pieces are below $1.00,** so both count. That gives A = 10,000,000, B = $3,000,000 ÷ $1.00 and C = the new shares + 2,000,000.
- **Solved with the adjustment in the price (R10):** **15,400,000** shares, at **$50 ÷ 77 = $0.649351**. Investor Y gets 3,080,000.
- **The Seed's new conversion price:** CP2 = $1.00 × 13,000,000 ÷ 15,080,000 = **$25 ÷ 29 = $0.862069**, so each Seed share converts into **1.16** common.

In a down round every piece is below the conversion price, so here your reading and the one-issue reading agree.

## 16h: the same, with the conversion exempt (answers 3a's toggle, 3b)

The round's new field, `anti_dilution_exempts_conversions`, is on. The SAFE's 2,000,000 shares go in A, and only the new money is in B and C:
- **The round:** 410,000,000 ÷ 27 = 15,185,185.19 shares, at **$27 ÷ 41 = $0.658537**. Investor Y gets 3,037,037.
- **The Seed's new conversion price:** **$0.931034**, a ratio of 1.074074. That's about half 16g's adjustment.

## 16i: a discounted note below $1.00 in a round priced above it (answer 3c)

Investor N's $500,000 note has no cap and a 20% discount, and was issued after the Seed. $530,000 converts. Investor Y's $3,000,000 comes in at a $12,000,000 pre-money valuation.
- **The new money** is at **$1.132568**, above $1.00, so it stays out of the formula.
- **The note** converts at 0.8 × that = **$0.906054**, below $1.00, so it counts: A = 10,000,000, B = 530,000, C = 584,953.
- **The Seed's new conversion price:** CP2 = **$0.994808**. The note adjusts the Seed on its own.
- **For comparison:** the derivation gives the one-issue answer, as you asked. The round's average price is **$1.092734**, above $1.00, so the Seed isn't adjusted at all. R25 records that reading as an alternative, not modeled.

## How the reference does it

- **One choice per piece:** for each protected series, the reference now chooses, for each piece of the round, whether it's priced below that series' conversion price: the new money, and each SAFE or note. It keeps the one consistent combination, as it does for its other choices.
  - **B** counts what was paid for the counted pieces: the new money's cash for its whole shares (R8), a SAFE's purchase amount, and a note's principal plus interest.
  - **C** counts their whole shares.
  - **A** is the shares outstanding before the round. Under the toggle it also counts the conversions' shares.
- **Every new term is a straight line** in the round's share count, so the solve stays exact.
- **Nothing else changed:** all 70 earlier cases come out exactly as before.
- **For 03d2:** the reference now records which event issued each series, SAFE and note, which answer 3d needs.

## Decisions I made, for you to check

1. **A SAFE's consideration is its purchase amount, in full,** as a note's is its principal plus interest (your answer 3a). The conversion's shares are rounded down, but what was paid isn't. That follows NVCA's "aggregate consideration received". The new money still counts its cash for whole shares (R8): the cash its investors actually pay.
2. **Still refused in a round with conversions,** with a clear error: **full-ratchet** and **narrow-based** anti-dilution.
   - **Full ratchet:** which piece's price would it ratchet to?
   - **Narrow-based:** under the toggle, would conversion shares count in a preferred-only A?

   No case settles either.
3. **A SAFE or note issued before the series** is refused until 03d2, where 16j settles it under your answer 3d.
4. **The engine until 03h:**
   - **16g:** it refuses, as `anti_dilution_with_conversions`.
   - **16h:** it refuses the new field, as `anti_dilution_exempts_conversions`. Before, it would have called it an unknown field.
   - **16i:** it doesn't refuse; it builds it under the old rule: adjust only when the round's own price is below. So until 03h it leaves the Seed at $1.00 where the case adjusts it to $0.994808. Its tests say exactly that, and the page would show the old answer for such a company until 03h.

## Open question

**An exempt conversion at its discount, with the adjustment in the price.** Under the toggle, a conversion counts in A at the shares it receives. At its discount, those depend on the round's price. With the adjustment shares in the price (R10's default), A moves with the price, and the price comes out as the root of a quadratic: generally irrational, so it can't be solved exactly.
- **What the reference does now:** it refuses that combination, with a clear error and a unit test. 16h avoids it: its SAFE converts at its cap, a fixed share count.
- **How to settle it?** Some options:
  - **(a)** Keep refusing it until a case needs it.
  - **(b)** Count an exempt discounted conversion in A at its shares at the price before the adjustment, a two-step price.
  - **(c)** Solve it to 40 digits instead of exactly, as the engine stores everything anyway.

  I lean to (a) for 0.3.0, and recording the question.

The same question will come up in 03d2: under answer 3d, a note issued before the series and converting at its discount also goes in A at the shares it receives. 16j will use capped instruments unless you decide otherwise.

## What changed

- **`cases/`:** the three new cases. No existing case changed.
- **`reference/`:**
  - `rounds.py`: the pieces, the toggle, the refusals, and the not-exact search
  - `model.py`: event order
  - a unit test (53)
  - the README's method
- **`docs/ASSUMPTIONS.md`:**
  - **R25:** answers 3a–3c, the toggle, the alternatives recorded, and what's still refused.
  - **C14:** the new field.
  - **Owed before release:** the item names the cases.
- **`docs/SPEC.md`:** 16g–16i in the list of edge cases.
- **Engine:** the new field accepted and refused by name, and the round tests: 37 cases with events.

## Checks

- **Engine:** 1,384 tests pass, 12 more.
- **Dashboard:** 306 tests pass.
- **Reference:** 53 unit tests pass, and all 73 cases match.
- **Typecheck and build:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`. `.claude/settings.json` has local changes that aren't committed.
- **Nothing run outside the sandbox.**

## Assumptions added

**No new IDs.** R25 and C14 updated.

Next is 03d2: 16j and 17j. I'm stopping here.
