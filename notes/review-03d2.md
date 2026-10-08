# Review: 03d2 (16j and 17j: a note and a SAFE from before the series, and pay-to-play with a SAFE)

Branch `03d2-cases`. This is the second half of the plan's 03d:
- **16j** settles your answer 3d: instruments issued before a series.
- **17j** combines pay-to-play, a converting SAFE and anti-dilution.
- **Your 03d refinement:** the quadratic case is refused only where a series would actually be adjusted.

**Before it merges, it needs:**
- your re-derivation
- the `unlock-cases` label

## 16j: a note and a SAFE from before the Seed (answer 3d)

16g's company: common 8,000,000, and the Seed's 2,000,000 at **$1.00** with broad-based anti-dilution. Both instruments were issued before the Seed, and the Seed left both outstanding (`convert_notes` and `convert_safes` off).
- **Investor N's note:** $400,000 at 5% for exactly two years, with a $4,000,000 pre-money cap. $440,000 converts at **$0.40**: 1,100,000 shares.
- **Investor S's pre-money SAFE:** $600,000 with a $4,000,000 cap. It converts at **$0.40**: 1,500,000 shares.
- **The Series A:** Investor Y's $2,000,000 at an $8,000,000 pre-money valuation, a down round.

Both conversions are below $1.00. Both were outstanding when the Seed bought in, so neither counts against it:
- **A** = 10,000,000 + 1,500,000 + 1,100,000 = 12,600,000.
- **B** = 2,000,000, and **C** = the new shares.
- **The round:** x = 2,249,500,000 ÷ 141 = **15,953,900.71**, at **$2,820 ÷ 4,499 = $0.626806**. Investor Y gets **3,190,780**.
- **CP2** = 14,599,999.91 ÷ 15,790,780 = **$0.924590**, a ratio of **1.081560**.

**For comparison,** the derivation also works the same instruments issued after the Seed (answer 3a). There both count in B and C, and CP2 is **$0.822295**: a 17.8% fall in the Seed's conversion price, against 7.5% under 3d.

Both instruments are capped, as you asked, so their shares are fixed and the price is exact.

## 17j: pay-to-play, a SAFE and anti-dilution (17e + a SAFE)

17e's company and round, plus Investor S's **$1,000,000 post-money SAFE, capped at $5,000,000**, issued after the Series A.

**What applies, all settled earlier:**
- **R21:** Investor W's 800,000 Series A become 80,000 common first, unadjusted, and A = **7,780,000**.
- **R19 and answer 4:** the SAFE's Company Capitalization counts the table after that conversion: 9,280,000 ÷ 0.8 = **11,600,000**. So it converts at **$25 ÷ 58 = $0.431034** into **2,320,000 shares**.
- **Answers 3a and 3c:** the new money and the SAFE are both below $2.50, so both count: B = $4,000,000 ÷ $2.50.

**The results:**
- **The round:** x = 3,427,250,000 ÷ 227 = **15,098,017.62**, at **$13,620 ÷ 13,709 = $0.993508**.
- **New shares:** Investor X gets **603,920**, and Investor Y **2,415,682**.
- **CP2** = **$1.787402**, against 17e's $2.214286. Investor X's 1,200,000 Series A convert into 1,678,414.01.

Working it by hand raised no question the earlier rules don't settle. Investor S holds no Series A, so it has no pay-to-play requirement. I kept it that way on purpose; see the open question.

## Your refinement: refused only where a series is adjusted

The reference already behaved this way. It refuses only when a branch that adjusts a series has a consistent price. If no piece is priced below any series' conversion price, those branches have no consistent price, and the round builds.

New unit tests pin it on both paths:
- **The toggle (16h with an uncapped 20% SAFE):**
  - A down round is refused.
  - In an up round ($3,000,000 at $12,000,000 pre-money), it builds at **$1.075** with no adjustment, though the SAFE converts at $0.86, below $1.00.
- **Answer 3d (16j with an uncapped note):**
  - A down round is refused.
  - In an up round ($3,000,000 at $13,500,000 pre-money), it builds at **$259 ÷ 230 = $1.126087** with no adjustment, though the note converts at $0.900870, below $1.00.
  - The same note issued after the Seed adjusts it on its own, as in 16i. In that round the SAFE from before the Seed still counts in A at its 1,500,000 shares, so one round shows both treatments.

## How the reference does it

- **Which treatment applies:** for each protected series and each conversion, the reference asks whether the conversion counts in that series' A:
  - when it's exempt under the toggle
  - or when its SAFE or note was created by an earlier event than the series (answer 3d)

  If so, it's never a piece of the round for that series.
- **The 03d placeholder is gone:** it refused any instrument issued before the series.
- **Nothing else moved:** all 73 earlier cases come out exactly as before.

## Decisions I made, for you to check

1. **Written down now, used since 16g.** A SAFE's Company Capitalization, and a note's or pre-money SAFE's base, count each series at its conversion ratio **before** the round's adjustment.
   - **Why:** they're counted "immediately prior to" the financing, and the adjustment comes from the financing.
   - **Where it matters:** 16g's 12,000,000, 16j's 10,000,000 and 17j's 11,600,000 all depend on it.
   - **Why now:** I hadn't recorded it in 03d. It's in R25 now.
2. **A SAFE staying outstanding through a priced round,** as you asked, if possible. 16j's Seed has `convert_safes` off. The derivation gives a plausible reason: the holder agrees to wait. YC's SAFE converts at the next equity financing, so that's unusual for a SAFE, though common for a note below its qualified-financing threshold.
3. **The engine README's refusal list changes in 03h, not now.** Today it says all rounds with conversions and anti-dilution are refused, which is still true of the engine. In 03h that line narrows to the three combinations you kept refused as "later":
   - full ratchet with conversions
   - narrow-based with conversions
   - a conversion counted in A at its discount where the series is adjusted

   R25 lists them now.

## The engine until 03h

- **16j:** refused as `anti_dilution_with_conversions`.
- **17j:** refused as `pay_to_play_with_conversions`. After 03g it reaches the anti-dilution refusal, until 03h.

## Open question

**A pay-to-play holder who also holds a SAFE converting in the round.** Does the SAFE's conversion count toward its pay-to-play requirement?
- **Today:** the reference counts only the holder's new money in the round. No rule says so; R17 defines only the requirement.
- **In practice:** some recapitalizations do count converting bridge notes toward pay-to-play.
- **Why no case:** 17j keeps Investor S separate to stay within settled rules.

I'd record "new money only" as the default in R17 and refuse nothing, unless you want a toggle or a case.

## What changed

- **`cases/`:** 16j and 17j, new. No existing case changed.
- **`reference/`:**
  - `rounds.py`: answer 3d, and the refusal message covers both reasons a conversion is in A
  - two unit tests changed or added (54)
  - the README's method
- **`docs/ASSUMPTIONS.md`:**
  - **R25:** answer 3d; the Company Capitalization rule; the refusals still in place, as "later"
  - **R21:** 17j
  - **Owed before release:** the anti-dilution and pay-to-play items name 16j and 17j
- **`docs/SPEC.md`:** 16j and 17j in the list of edge cases.
- **Engine:** tests only, with 39 cases with events.

## Checks

- **Engine:** 1,392 tests pass, 8 more.
- **Dashboard:** 310 tests pass.
- **Reference:** 54 unit tests pass, and all 75 cases match.
- **Typecheck:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`. `.claude/settings.json` has local changes that aren't committed.
- **Nothing run outside the sandbox.**

## Assumptions added

**No new IDs.** R25, R21 and the owed list updated.

Next is 03e, the first engine PR: `exit.carve_out`, 12i and 13h, 11b, and the "what is left after the preferences" wording. I'm stopping here.
