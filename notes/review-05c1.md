# Review: 05c1 (cases for SAFEs beside a note at a sale, and E20)

Branch `05c1-safes-beside-a-note-cases`, with the `cases/` edit rule lifted. The engine still refuses SAFEs beside a note until 05c2. It has four commits:
1. **The reference reads a note beside post-money SAFEs** (X18).
2. **Case 13i and the note-base fixtures.**
3. **E20 in the reference,** with cases 12j and 13j.
4. **The docs and this note.**

## 1. X18 in the reference

Your four defaults (0.5.0 plan, answer 11):
1. **The note's repayment is debt, paid first.** The reference already did this.
2. **A converting note counts in a post-money SAFE's Liquidity Capitalization,** at its conversion shares. A note being repaid doesn't count.
3. **The note's base counts no SAFE.** The reference already did this.
4. **Solved together where they depend on each other.** With a capped note there's nothing to solve together: its shares don't depend on the SAFE.

**Still refused:**
- a note with no cap beside a SAFE
- a SAFE with no post-money cap beside a note
- a note beside a carve-out

**A wording fix:** a note's switch now values its shares at the price just above the breakpoint, as a SAFE's switch does. Before X18, a note's switch never jumped, so the price from below was always right.

## 2. Case 13i: a post-money SAFE beside a capped note, common only

`cases/edge-13i-note-beside-a-safe/`:
- Founders hold 6,000,000 and 4,000,000 common.
- Investor S has a $1M SAFE with a $10M post-money cap.
- Investor N has a $1M note at 5% for a year, with a $5M pre-money cap and 2x repayment.

**Four breakpoints:**

| Exit value | What happens |
|---:|---|
| $2,100,000 | the note is repaid in full |
| $3,100,000 | the SAFE's cash is paid in full |
| $12,100,000 | the SAFE converts, on 11,111,111.11, with the note repaid |
| $13,444,444.44 | the note converts, and **payouts jump** |

At that jump, the note's 2,100,000 shares join the SAFE's count, so the SAFE converts into 1,344,444.44 shares, not 1,111,111.11. The SAFE gains $210,000, and common loses the same. The DERIVATION also shows what rule 2 changes: leaving the note out, the note would convert at $13,211,111.11, with no jump.

## 3. E20: the SAFEs' greater-of comes last

**What I found building Larkspur's case:** weighing every decision at once, the non-participating Seed and the post-money SAFEs go round in a circle near the Seed's conversion.
- **The Seed converting** joins the SAFEs' count, so they convert and dilute it, so it would rather stay.
- **The Seed staying,** they take cash, so it would rather convert.

It isn't X18's doing: the same happens with no note. **0.4.0's engine stops there** with "went round in a circle (E15)".

**Your rule, now E20 in ASSUMPTIONS** (Jordan to confirm): the series, warrants and notes decide first, each weighing its outcomes with the SAFEs paid as their terms then pay them, and the SAFEs' greater-of comes last.

**The scope test, as you asked:** applied wherever SAFEs are outstanding at a sale, it reproduces **every locked case exactly**: every payout, breakpoint and reason. So it's the one rule for SAFEs at a sale, not a fallback.

**How the reference does it,** independently, as you described: for each combination of the series', warrants' and notes' decisions, it finds the SAFEs' answer, with options settled under it. It then keeps the combinations that are stable given those answers.

**The band becomes one jump,** at its upper edge, flagged `payouts_jump`. At exactly that exit value the Seed keeps its preference, so the outcome from below holds, as for X16 and E13. The reasons there:
- **The Seed:** "Seed Preferred converts to common: with the SAFEs paid as their terms then pay them, converting pays it more above this exit value. Converting puts it in the SAFEs' Liquidity Capitalization, so Investor X's SAFE and Investor S's SAFE then take their Conversion Amounts. At this exit value its as-converted share that way (3,781,250 common shares at $0.8000 each = $3,025,000.00) equals its 1x preference of $3,025,000.00; below it, staying preferred pays more."
- **Each SAFE:** "Investor X's SAFE switches from its Cash-Out Amount to its Conversion Amount, following Seed Preferred: its Liquidity Capitalization now counts it, so its 330,244.57 conversion shares ($250,000.00 ÷ the Liquidity Price of $0.757015) are worth $0.800000 each just above this exit value, $264,195.65 in all, more than its $250,000.00 purchase amount."
- **The warrants:** they come into the money at the same point, with their usual reason.

**Your check holds:** on Larkspur without the note, at $16,545,000:
- the Seed keeps its preference, $2,925,000
- converting, with the SAFEs converting, would pay it **$2,921,654.22**

It switches at the band's upper edge, $16,559,391.30. A reference unit test pins both.

## 4. Cases 12j and 13j: Larkspur at a sale

Both are on Dec 31, 2025, with Larkspur's blanks filled as case 27 fills them.

| | 12j, without the note (X1, X13, E20) | 13j, with the note (X18, E20) |
|---|---|---|
| Breakpoints | 7 | 9 |
| The old circle | $16,531,000 to $16,559,391.30 | $16,884,688.35 to $16,928,457.41 |
| The jump (E20) | $16,559,391.30 | $16,928,457.41 |
| The note | none | repaid in full at $268,739.73; converts at $14,607,382.91, with no jump since the SAFEs take cash there |

**12j's lower edge, $16,531,000,** is where 0.4.0's engine stops: converting with the SAFEs taking cash pays the Seed more from there.

**Each listed exit value includes the point inside the old circle:** $16,545,000 in 12j and $16,906,250 in 13j.

Each DERIVATION works the SAFEs' count, every breakpoint as a formula, the circle's edges, and four payouts by hand.

## 5. The note-base rule (your answer 11), as fixtures

- **`cases/ocf-03-refused/fixtures/note-base-counts-other-convertibles.ocf.json`:** a note whose capitalization rules count other converting securities, beside Larkspur's two SAFEs and note. Refused as `note_base_counts_other_convertibles`.
- **`cases/ocf-13-note-base/`** (new): the same rule on a note with nothing outstanding beside it, added to Quillfern's package. It's read with a `with_pool` base and the report line `note_base_other_convertibles_ignored`.

The engine reads this rule in 05c2. Until then its OCF tests name both fixtures and check what it does today: it leaves the base blank.

## How to check by behavior

1. **Re-derive from the four DERIVATIONs:**
   - `cases/edge-13i-note-beside-a-safe/`
   - `cases/edge-12j-larkspur-safes-at-a-sale/`
   - `cases/edge-13j-larkspur-at-a-sale/`
   - `cases/ocf-13-note-base/`
2. **Run the reference:**
   ```bash
   pnpm test:reference
   ```
   That runs 63 unit tests, 4 of them new for E20, then checks every case it works: 81 now, the 78 from before unchanged.
3. **See the engine fail today, as 0.4.0 does,** on 12j: `pnpm test` includes a test that its breakpoint search stops "went round in a circle". It's for 05c2 to turn around.

## Decisions for you to check

1. **E20 itself:** a new assumption, for you to confirm.
2. **Warrants decide with the series, as before (E4).**
   - **Your wording:** you wrote "options and warrants follow the common price as always (E16)". E16 covers options; warrants have always decided for themselves, alongside the series.
   - **Why I kept them there:** making warrants followers too breaks the reference's breakpoint finder on case 8b, where a warrant comes into the money on a curve.
   - **At 12j's and 13j's jump** the warrants switch with the Seed either way.
3. **Several SAFEs that could settle more than one way:** they take the fewest conversions (E5), the outcome from below. With Larkspur's two equal SAFEs, both taking cash and both converting are each stable for some decisions the search weighs. Taking the most conversions instead gives every case the same answers.
4. **A series or note indifferent where its choice moves the SAFEs** keeps its preference, or is repaid, at exactly that exit value: the outcome from below.
5. **The case numbers:**
   - **12j:** SAFEs at a sale, X1 and X13; it already fails in 0.4.0.
   - **13i and 13j:** notes at a sale, beside SAFEs.
   - **OCF case 13:** the fixture case.
6. **The new report code's name,** `note_base_other_convertibles_ignored`, and the refusal term, `note_base_counts_other_convertibles`.

## Assumptions added or changed

- **E20 (new):**
  - the rule and your reasoning
  - its ties
  - the bands it settles
  - its scope test
- **X18:** the reference since 05c1, what stays refused, and 13i's jump.
- **The plan:** your two items on 05e's polish list:
  - a round's price to the cent when exact
  - "can't be blank" naming the field

## Checks

- **Engine:** 2,082 tests pass, including the cases' file checks. The new cases are refused or pinned by name until 05c2.
- **Dashboard:** 463 tests pass.
- **Reference:** 63 unit tests pass, and every `expected.json` matches.
- **Typecheck:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing ran outside the sandbox.**

## Next

05c2: the engine follows X18 and E20, lifts `note_with_safe_or_carve_out` for SAFEs, reads the note-base rule, and passes 12j, 13i and 13j. I'm stopping here.
