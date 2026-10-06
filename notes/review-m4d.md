# Review: M4d (SAFEs and pro-rata)

Branch `m4d-safes-pro-rata`, M4's second engine PR. The engine now converts SAFEs in a priced round:
- **post-money SAFEs** (R4)
- **pre-money SAFEs** (R24)
- **discounts**, at the lower of the cap and discount prices

Each SAFE converts into a series of its own, "… (from SAFEs)" (R5).

It also works out **pro-rata entitlements** (R6):
- converting SAFEs counted in the base
- the pool toggle
- several investment lines for one holder
- the refusals you agreed

**Still refused,** naming the term:
- anti-dilution (M4e)
- pay-to-play (M4f)
- converting notes (M4g)
- a post-money SAFE converting alongside notes or pre-money SAFEs (owed before release)

## Run it

```bash
pnpm install && pnpm rounds millrace
```

## What to check by behavior

1. **Millrace now builds up to its Series B,** nine events of ten:

   ```bash
   pnpm rounds millrace
   ```

   - **The Seed round** prices at **$0.4635148503**.
   - **Priya's and Marcus's SAFEs** convert at their cap price, **$0.384930**, into **779,362** and **389,681** shares of **Seed Preferred (from SAFEs)**.
   - **At the Series A,** Harbor Lane's pro-rata is **28.703080%** of the base, an entitlement of **$3,444,369.64**, of which it takes $3,000,000.
   - **Every table** says "matches expected.json".
   - **Then it stops at the Series B,** which triggers Series A's anti-dilution (M4e).
2. **The SAFE cases build in full,** each matching its locked tables:
   - **15:** the discount beats the cap.
   - **20:** a pre-money SAFE, whose Company Capitalization counts the round's pool increase: **1,346,534** shares at $0.742647.
3. **The pro-rata cases build in full:**

   ```bash
   pnpm rounds edge-18c-pro-rata-and-more
   ```

   - **18:** Investor X's entitlement is **$1,090,909.09**, with the SAFE's 1,000,000 shares in the base.
   - **18b:** **$1,036,363.76** with the pool counted.
   - **18c:** X's pro-rata and ordinary lines are issued once: **700,000** shares.
4. **The refusal you asked for.** Case 18 with $1,200,000 marked pro-rata gives:

   > Investor X's pro-rata investment of $1,200,000.00 is more than its pro-rata entitlement of $1,127,272.72 (18.181818% of the $6,200,000.00 round). Mark $1,127,272.72 as pro-rata and enter the other $72,727.28 as an ordinary investment in the same round.

   It's the reference's message, word for word. A test checks it.

## How the engine solves a round with SAFEs

**The reference** tries every combination of choices and keeps the consistent one:
- each SAFE at its cap or at its discount
- the pool topped up or not

**The engine settles the choices by rule instead:**
1. It solves the round for its current choices. With the choices fixed, the post-money share count is one division.
2. It re-decides each SAFE by comparing its two prices at that solution, and the top-up by R16.
3. It repeats until nothing changes. That takes two or three passes in every case.

When a SAFE's cap price exactly equals its discount price, the cap applies, as in the reference. Either way the price, and so the shares, are the same; only which one is reported differs.

**Share counts are worked out from the round's terms,** then rounded down (R3, E19). In 18, the SAFE's 1,000,000 shares come out of a $11,000,000 cap and an 11,000,000 Company Capitalization, both exact. At 40 digits, 1/11 doesn't divide out exactly, and E19 keeps the count at 1,000,000.

## What the tests check

- **All 26 round cases:** every cap table before each case's stop, field by field, now including each round's:
  - **SAFE conversions:** cap or discount, the conversion price to within one part in 10³⁰ of the exact fraction, shares, and series
  - **the post-money SAFEs' Company Capitalization**
  - **pro-rata entitlements,** to the cent and the percentage to six places

  The stops have moved:
  - **in full now:** 15, 18, 18b, 18c and 20
  - **Millrace:** stops at its Series B (anti-dilution)
  - **21:** stops at its note
- **New tests:**
  - Millrace through its Series A
  - 18's and 18c's key numbers
  - the over-entitlement message
  - the refusal when a SAFE stays outstanding
  - the refused mix of post-money and pre-money SAFEs
  - the tie going to the cap

**599 engine tests in all,** one more than M4c: the six new tests, less the five "refuses …" tests for 15, 18, 18b, 18c and 20, which now build in full.

## What changed

- **`packages/engine/src/rounds.ts`:**
  - SAFE conversion, settled by rule
  - the series from SAFEs
  - pro-rata, its refusals and its toggle
- **A round's details** now include:
  - `safeConversions`
  - `companyCapitalization`, for the post-money SAFEs
  - `proRata`
- **`pnpm rounds`** prints SAFE conversions and pro-rata entitlements.
- **`docs/ASSUMPTIONS.md`:** E19 confirmed.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **No changes** to `cases/`, and the edit rule is back on.

## Decisions I made, for you to check

1. **The pro-rata refusal allows an amount equal to the entitlement.** An amount above it by no more than one part in 10³⁰ counts as equal, so 40-digit arithmetic can't refuse an amount that is exactly the entitlement (E14's tie). The message shows the entitlement **rounded down** to the cent, as the reference does.
2. **The mix of post-money and pre-money instruments** is refused with milestone "later", not "M4". It's on the "Owed before release" list rather than in an M4 PR.
3. **When several later terms meet in one round,** the error names the first in this order:
   1. pay-to-play
   2. the refused SAFE mix
   3. note conversion
   4. anti-dilution, once the round is priced

## Open questions

None.

Next is M4e: anti-dilution, and **Millrace's exit running entirely from its rounds**. I'm stopping here.
