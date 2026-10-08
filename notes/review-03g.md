# Review: 03g (engine: a post-money SAFE beside notes or other SAFEs, and pay-to-play conversions)

Branch `03g-engine`. The engine now builds four round cases you re-derived in 03c and 03c2, every cap table field by field:
- **21b:** a post-money SAFE converting beside a note.
- **21c:** a post-money SAFE beside a pre-money SAFE.
- **21d:** a post-money SAFE beside a note converting at its discount.
- **17i:** a pay-to-play round that also converts a SAFE and a note.

Two refusals are lifted: `post_money_safe_with_pre_money_instruments` and `pay_to_play_with_conversions`. No change to `cases/`.

## A post-money SAFE beside notes or other SAFEs (R24; your answer 2)

**What changed.** A post-money SAFE's Company Capitalization is now (stock and options outstanding + the pool before the round + the others' shares) ÷ (1 − Σ purchase ÷ cap).
- **The others:** every note and every other SAFE converting beside it, at their **exact** conversion shares, before rounding down (21d's rule).
- **A share count that moves with the price:** a note or SAFE at its discount has shares that move with the round's price, so the Capitalization moves with the round's share count too. The engine solves it together with the price, as one straight line, so the solve stays a single division.

**A changed answer** I found doing this. 0.2.0 refused a post-money SAFE beside a note or a pre-money SAFE. But it didn't refuse one beside a **SAFE with no cap**, and it left that SAFE's shares out of the Capitalization. The reference always counted them. So does YC's text: every Converting Security counts.
- **What 0.3.0 does:** it counts them.
- **Its test:** a new unit test, worked by hand and checked against the reference.
  - **The company:** 9,000,000 common; a $1,000,000 post-money SAFE capped at $10,000,000; a $500,000 SAFE at a 20% discount with no cap. The round is $5,000,000 at $20,000,000 pre-money.
  - **The round:** priced at **$139 ÷ 72 = $1.930556**.
  - **The Capitalization:** **1,440,000,000 ÷ 139 = 10,359,712.23**.
  - **The capped SAFE:** **1,035,971** shares.
  - **0.2.0's answer:** a Capitalization of 10,000,000 and 1,000,000 shares, at $1.9375.

  No case had this, so no expected value changes. The release notes list it under changed answers.

## Pay-to-play with conversions (R19; your answer 4)

The engine already priced the round on the cap table after the conversion, or before it under R19's toggle. A SAFE's Company Capitalization and a note's base count that same table, so lifting the refusal was most of the work. Two new tests check the tables they count:
- **A SAFE's Capitalization:** **7,200,000 ÷ 0.995** priced after the conversion, and **9,000,000 ÷ 0.995** under the toggle.
- **A note's base, on 17a's round:** **9,280,000**, after Investor W's conversion, not 10,000,000.

17j still waits for 03h. It now reaches the anti-dilution refusal, `anti_dilution_with_conversions`.

## How to check it by behavior

```bash
pnpm rounds edge-21d-post-money-safe-and-discounted-note
```

It shows, each matching `expected.json`:
- **The price:** $1.926389.
- **The SAFE's Company Capitalization:** **10,382,119.68**.
- **The SAFE:** converts at $0.963194 into **1,038,211** shares.
- **The note:** converts at its discount, $1.541111, into **343,907** shares.

```bash
pnpm rounds edge-17i-pay-to-play-with-conversions
```

It shows, each matching `expected.json`:
- **Investor W's conversion first:** 1,200,000 Series A into 120,000 common.
- **The SAFE's Company Capitalization:** **12,937,166.67**.
- **The note's base:** **10,920,000**, both counted after the conversion.
- **The price:** $0.927560.

The same command on `edge-21b-post-money-safe-and-note` and `edge-21c-post-money-and-pre-money-safes` also ends "matches expected.json, price matches".

## Decisions I made, for you to check

1. **A SAFE with no cap counts in a post-money SAFE's Company Capitalization,** at its exact shares at the discount price. It's a Converting Security in YC's text, the reference already did it, and your answer 2 counts notes and pre-money SAFEs the same way. It changes an answer 0.2.0 gave without refusing.

## Also in this PR

- **`docs/ASSUMPTIONS.md`:**
  - **R19 and R24:** the engine since 03g; R24 adds the SAFE with no cap.
  - **The owed list:** both items, since 03g.
- **The engine README:**
  - **The refusal list** loses both items. Its anti-dilution line narrows in 03h.
  - **Two new lines:** the post-money SAFE's Capitalization, and pay-to-play with conversions.
- **`notes/release-0.3.0.md`:** both under New, and the SAFE with no cap under changed answers.
- **A stale test label:** the round-count test said 37 cases where it checks 39. It now prints the constant.

## The tests

- **Engine:** **1,482 tests pass.**
  - **The four cases:** they build field by field in place of their four refusal tests.
  - **Three new hand-worked tests:** the SAFE with no cap, a SAFE's Capitalization under pay-to-play, and a note's base under pay-to-play. They replace three refusal tests.
- **Dashboard:** **310 tests pass.**
- **Reference:** unchanged, with 55 unit tests and all 75 cases matching.
- **Typecheck and build:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing run outside the sandbox.**

## Assumptions added

**No new IDs.** R19 and R24 updated.

## Open questions

None. Next is 03h: conversions in a round that triggers anti-dilution (16g–16j, 17j), the round toggle, and the README's narrowed refusal line. I'm stopping here.
