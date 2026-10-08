# Review: 03c (0.3.0 cases, part 3: 21b, 21c and 17i)

Branch `03c-cases`. Three new round cases, each worked out by hand in its `DERIVATION.md`. Two follow your answer 2 to the 0.3.0 plan, and one your answer 4. The reference calculator produced each `expected.json` and agrees with the hand working.

**Before it merges, it needs:**
- your re-derivation
- the `unlock-cases` label

21b and 21c share a simple company so they're quick to check: Founder A 6,000,000 and Founder B 3,000,000 common, no pool, then Investor Y's $5,000,000 Series A at a $20,000,000 pre-money valuation. In each, the new money is a fifth of the $25,000,000 post-money, so the post-money share count is what came before ÷ 0.8.

## 21b: a post-money SAFE and a note (answer 2)

- **Investor N's note,** $500,000 at 6%: $530,000 converts at its $8,000,000 cap on 9,000,000 shares, $0.888889, into **596,250 shares**. Its base leaves out every SAFE and note (R23).
- **Investor S's SAFE,** $1,000,000 at a $10,000,000 post-money cap. Its Company Capitalization counts the note's shares: (9,000,000 + 596,250) ÷ 0.9 = **10,662,500**. So it converts at $0.937866 into **1,066,250 shares**, 10% of that.
- **The round:** (9,000,000 + 596,250 + 1,066,250) ÷ 0.8 = **13,328,125** shares, at $1,600 ÷ 853 = **$1.875733**. Investor Y gets 2,665,625.

The SAFE ends with 8.0000% of the company. Leaving the note out would give it 1,000,000 shares and 7.55%. The derivation shows that, for comparison; it isn't modeled.

## 21c: a post-money SAFE and a pre-money SAFE (answer 2)

- **Investor P's pre-money SAFE,** $800,000 at an $8,000,000 cap. Its Company Capitalization leaves out every SAFE and note (R24): 9,000,000, so $0.888889 and **900,000 shares**.
- **Investor S's post-money SAFE,** $1,000,000 at $10,000,000. Its Capitalization counts P's shares: (9,000,000 + 900,000) ÷ 0.9 = **11,000,000**. So $0.909091 and **1,100,000 shares**.
- **The round:** 13,750,000 shares at **$20 ÷ 11 = $1.818182**. Investor Y gets 2,750,000.
- **Two series from SAFEs,** one per conversion price: "Series A Preferred (from SAFEs)" and "… (from SAFEs) 2" (R5).

## 17i: a pay-to-play round that converts a SAFE and a note (answer 4)

- **The Series A:** $1.00 a share, 1,800,000 to Investor X and 1,200,000 to Investor W.
- **The Series B** offers Series A holders $1,000,000. X buys its $600,000. W buys nothing, so its Series A converts to **120,000 common**, at 1 for 10, before the round.
- **The table the round is priced on** is the one after the conversion (R19's default): 10,920,000 shares. So:
  - **The note's base is 10,920,000:** $8,000,000 ÷ 10,920,000 = $0.732601, for **723,450 shares**.
  - **The SAFE's Capitalization** is (10,920,000 + 723,450) ÷ 0.9 = 12,937,166.67, for **1,293,716 shares**.
- **The round:** 16,171,458.33 shares at **$0.927560**. X gets 646,858 and Investor Y 2,587,433.

Counting the table before the conversion would give the note 795,000 shares and the SAFE 1,421,666, from W's preferred, which the pay-to-play takes away. The derivation shows it for comparison.

17i also converts a post-money SAFE beside a note, so it uses answer 2 as well.

## The reference calculator

- **Answer 2:** a post-money SAFE's Company Capitalization now counts the shares the notes and pre-money SAFEs converting beside it receive. Those can depend on the price, at a discount, so it's worked out inside the solve. With the cap-or-discount choices fixed, it stays a straight line in the share count, so it still solves exactly.
- **Answer 4 needed no change:** the reference already priced the Capitalization and the note's base on the table the round is priced on. It had no refusal for this combination; only the engine refused it.
- **The old unit test** expected a post-money SAFE beside a note to be refused. It's replaced with a hand-checkable test of answer 2. 51 tests in all.

## Until 03g

- **The engine:** it refuses all three, as `post_money_safe_with_pre_money_instruments` (17i meets that refusal before its pay-to-play one). Its round tests say so, and count 33 cases with events.
- **The page:** one of its tests checks which SAFEs and notes it reads as outstanding after each event. It used to check them against the engine; it now checks against the locked cases' own record of each cap table. That's independent of the engine, and works for these three now.

## What changed

- **`cases/`:** the three new cases. No existing case changed.
- **`reference/`:** `rounds.py`, the unit test, and the README's method.
- **`docs/ASSUMPTIONS.md`:**
  - **R24:** answer 2, with 21b and 21c.
  - **R19:** answer 4, with 17i.
  - **Owed before release:** both items name their cases. The engine follows in 03g.
- **`docs/SPEC.md`:** 17i, 21b and 21c in the list of edge cases.
- **Engine and page:** tests only.

## Checks

- **Engine:** 1,368 tests pass, 12 more.
- **Dashboard:** 298 tests pass.
- **Reference:** 51 unit tests pass, and all 69 cases match.
- **Typecheck and build:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`. `.claude/settings.json` has local changes that aren't committed.
- **Nothing run outside the sandbox.**

## Assumptions added

**No new IDs.** R19 and R24 updated, as above.

## Open questions

None. Next is 03d: 16g–16j and 17j, the conversions in a round that triggers anti-dilution. I'll split it if it won't fit one evening. I'm stopping here.
