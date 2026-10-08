# Review: 03h (engine: SAFEs and notes converting in a round that triggers anti-dilution)

Branch `03h-engine`. The last engine PR of 0.3.0. The engine now builds the five anti-dilution cases you re-derived in 03d and 03d2, every cap table field by field, including each adjustment's A, B, C and pieces:
- **16g:** a bridge SAFE in a down round.
- **16h:** the same SAFE, its conversion exempt.
- **16i:** a discounted note below the Seed in an up round.
- **16j:** a note and a SAFE from before the Seed.
- **17j:** pay-to-play with a SAFE.

Every round case now builds; none is left out of the engine's tests. No change to `cases/`.

## What the engine does (R25; your answers 3a–3d)

The engine settles a round's choices by rule: it solves the round, re-decides each choice at that solution, and repeats until nothing changes. It does this for a SAFE's cap or discount, and for the pool top-up. Now it also settles, **for each protected series, each piece of the round**: the new money, and each SAFE and note converting. A piece counts when it's priced below that series' conversion price.
- **The prices:** the new money is tested at the round's price, and each conversion at the price it converts at.
- **B and C:** only the pieces below the conversion price go in, and a series is adjusted when any piece is below.
  - **B** is what was paid: the new money's cash, a SAFE's purchase amount, a note's principal plus interest.
  - **C** is their shares.
- **When a conversion goes in A instead,** at the shares it receives:
  - when the round exempts conversions: the new field `anti_dilution_exempts_conversions` (3a, 3b)
  - when the SAFE or note was issued before the series (3d)

  For 3d, the engine now records which event first issued each series, SAFE and note.
- **The solve stays exact:** every term is still a straight line in the round's share count, so the solve stays one division. The final CP2 uses the shares actually issued and what was paid (R8), as before.
- **Each adjustment reports its pieces:** price, whether it counted, and its shares in A where it went there. The round tests compare them with `expected.json`.

## What stays refused (your 03d answers; ASSUMPTIONS "Later")

- **Full-ratchet or narrow-based anti-dilution** in a round that converts SAFEs or notes: `anti_dilution_with_conversions`. The message now names the rule.
- **A SAFE or note at its discount counted in a series' A,** in a round that adjusts that series with the adjustment shares in its price: `discounted_conversion_in_anti_dilution_a`, a new term. It's refused only where the series is actually adjusted. The tests run it on the reference's own inputs:
  - **16h's SAFE without its cap:** refused in 16h's down round. In an up round it builds at **$1.075**, with the SAFE at $0.86 and no adjustment.
  - **16j's note without its cap:** refused in 16j's down round. In an up round it builds at **$259 ÷ 230**, with the note at $518 ÷ 575 and no adjustment.
  - **The same note issued after the Seed:** it adjusts the Seed on its own, while the SAFE from before the Seed counts in A: A = **11,500,000**, B = **440,000**.

The engine README's refusal list now names those two, in place of "SAFEs or notes converting in a round that triggers anti-dilution".

## The changed answer (16i)

Until 03h the engine built 16i's kind of round under the old rule, adjusting only when the round's own price was below the conversion price, so it left the Seed at $1.00. It now adjusts it to **$0.994808**, as the case does.

The release notes carry your sentence word for word, under changed answers.

## How to check it by behavior

```bash
pnpm rounds edge-16j-note-and-safe-from-before-the-seed
```

It shows, for the Seed:
- **A:** 12,600,000. **B:** $1,999,999.91 ÷ $1.00. **C:** 3,190,780.
- **CP2:** $0.924590.
- **Its pieces:**
  - the new money at $0.626806, counted
  - the SAFE at $0.40, in A at 1,500,000 shares
  - the note at $0.40, in A at 1,100,000 shares

It ends "matches expected.json".

```bash
pnpm rounds edge-16i-discounted-note-in-an-up-round
```

It shows:
- **The new money** at $1.132568, left out.
- **The note** at $0.906054, counted.
- **CP2:** **$0.994808**.

The same command on 16g, 16h and 17j shows CP2 $0.862069, $0.931034 and $1.787402, each matching. I added the pieces to the script's output for this.

## Decisions I made, for you to check

1. **The refusal's name,** `discounted_conversion_in_anti_dilution_a`, milestone `"later"`. It's new, so a program catching `anti_dilution_with_conversions` from 0.2.0 won't see it under that name. The README and release notes list it.
2. **The engine refuses the quadratic case where it reaches it.** That's when, while settling, it lands on a state where the series is adjusted and a discounted conversion sits in its A. The reference instead searches every combination for a consistent root.
   - **Why they agree:** an adjustment only lowers the round's price, and a conversion's price falls with it or stays at its cap. So once a piece is below the conversion price, it stays below.
   - **Where it's checked:** the tests check agreement on the inputs above.
3. **`AntiDilutionAdjustment.a` now includes the conversions counted in A,** matching the case files' A. Without conversions nothing changes.

## Also in this PR

- **`docs/ASSUMPTIONS.md`:**
  - **R25:** the engine since 03h, with the two refusals' names.
  - **R21:** 17j.
  - **The owed list:** the anti-dilution item.
  - **"Later":** the term names.
- **The engine README:**
  - two lines on conversions in anti-dilution
  - the new round field
  - the narrowed refusal list
- **`notes/release-0.3.0.md`:** the work under New, the API additions (`pieces`, `AntiDilutionPiece`, the field), and the narrowed refusals. Only 03i, the page, is left to come.
- **`pnpm rounds`:** prints each piece.

## The tests

- **Engine:** **1,485 tests pass.**
  - **The five cases:** they build field by field, pieces included, in place of the four refusal tests and the old-rule test for 16i.
  - **New:** the full-ratchet and narrow-based refusals, and the two refused-only-where-adjusted tests.
- **Dashboard:** **310 tests pass.**
- **Reference:** unchanged, with 55 unit tests and all 75 cases matching.
- **Typecheck and build:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing run outside the sandbox.**

## Assumptions added

**No new IDs.** R21 and R25 updated.

## Open question

**Should the page show each adjustment's pieces in 03i?** The engine reports them now, and they're what explains 16i and 16j. I'd add one line per piece under the round's anti-dilution figures, if it stays small. Otherwise 03i is as planned:
- the carve-out on the sale, in file version 5
- the round toggle under "More terms"
- the blank-fields polish

Next is 03i. I'm stopping here.
