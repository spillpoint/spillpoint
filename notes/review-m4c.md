# Review: M4c (the engine builds rounds: the basics)

Branch `m4c-rounds-basics`, M4's first engine PR. The engine now builds a company's cap tables from its events:
- shares issued
- a percentage issue (R1)
- the option pool (R2)
- grants (R14)
- SAFEs and notes as they're issued
- priced rounds, with their price, new shares and pool top-up (R3, R16)

Everything later in M4 is refused, with an error naming it:
- converting SAFEs and pro-rata (M4d)
- anti-dilution (M4e)
- pay-to-play (M4f)
- converting notes (M4g)

## Run it

```bash
pnpm install && pnpm rounds edge-14a-pool-top-up
```

It prints the cap table after each event, fully diluted, with what each event worked out: a round's price, new shares and pool top-up. Each table says whether it matches the case's locked `expected.json`.

## What to check by behavior

1. **14a builds in full.**

   ```bash
   pnpm rounds edge-14a-pool-top-up
   ```

   At the Series A:
   - **The price** is $2.50.
   - **Investor X** gets 2,000,000 shares.
   - **The pool** is topped up by 500,000 to 15%.
   - **Every table** says "matches expected.json, price matches".
2. **14b builds in full.**

   ```bash
   pnpm rounds edge-14b-no-top-up
   ```

   The 1,000,000-share pool already meets its 10% target, so the top-up is 0 (R16).
3. **Millrace builds up to its Seed round.**

   ```bash
   pnpm rounds millrace
   ```

   - **R1:** Lena's 6% is **638,297** shares.
   - **The SAFEs** (Priya's and Marcus's) wait as outstanding.
   - **R2:** the pool is **1,182,033** shares, leaving **692,033** after the grants.
   - **All five tables** match.
   - **Then it stops at the Seed round,** with the engine's own message: "Converting SAFEs in a round (R4, R5, R24). The engine supports this from M4; until then it refuses the input rather than ignoring the term."
4. **Every other round case** builds up to its first later-M4 event and stops there. Try any:
   - **15, 18, 18b, 18c, 20 and 21** stop at SAFE conversion.
   - **16a–16f** stop where anti-dilution is triggered.
   - **17a–17h** stop at pay-to-play.
   - **19a–19c** stop at note conversion.

## What the tests check

For **every locked round case**, all 26 of them:
- **Each cap table the engine builds** before the case's stop, field by field:
  - holders, securities and their terms
  - prices, to within one part in 10³⁰ of the exact fraction
  - seniority
  - every position, to the share
  - the unissued pool
  - outstanding SAFEs and notes
  - each event's details: shares issued, pool created, a round's price, solved and actual fully diluted counts, new shares, and pool top-up
- **The stop itself:** refused with an `UnsupportedTermError` naming the right term (`safe_conversion`, `anti_dilution`, `pay_to_play` or `note_conversion`), never skipped.

**Plus unit tests:**
- **The 40-digit rounding rule** (E19, below).
- **Inputs it won't read,** each with a clear error:
  - an unknown event type or field (C12's strictness, now for rounds)
  - a grant bigger than the pool
  - a SAFE with both kinds of cap
  - a new series left out of the seniority
  - shares for an unlisted holder

**62 new tests; 598 for the engine in all.**

## What changed

- **New `packages/engine/src/rounds.ts`:** `buildCapTables(inputs)` returns the cap table after each event: in the engine's own model, the one an exit runs on, with the SAFEs and notes still outstanding and what the event worked out. `inputs` is a case's `inputs.json`.
- **A different method from the reference.** The reference tries every top-up branch and keeps the consistent one. The engine decides by R16's rule and solves once, in closed form:
  - **No top-up:** price = pre-money ÷ (stock and options + pool).
  - **A top-up to t:** price = (pre-money − t × post-money) ÷ stock and options.
- **Share counts come from the exact terms,** not from the 40-digit price, so a count that is exactly whole stays whole.
- **The public API** gains `buildCapTables` and its types. That's a deliberate change, so the API test is updated.
- **`input.ts`** shares its small readers with `rounds.ts`, inside the package only.
- **New dev tool** `pnpm rounds <case>` (`packages/engine/scripts/rounds.ts`), beside `pnpm payouts` and `pnpm breakpoints`.
- **`docs/ASSUMPTIONS.md`:** new E19.

`readCase` still refuses a round case: the exit side doesn't use `buildCapTables` yet. In M4e, Millrace's exit will run on the cap table the engine builds, as you asked.

## CI and permissions

- **No changes to `.github/workflows/`.**
- **`.claude/settings.json` in my working copy still lacks the `Edit(cases/**)` deny rule.** It differs from the committed file, which has the rule. You said the rule is back on, so you may have restored it somewhere else. If not, `git checkout .claude/settings.json` restores the committed version. I haven't changed it, haven't committed it, and haven't touched `cases/`.

## Assumptions added

- **E19 (New):** share counts are rounded down from 40-digit arithmetic. A computed count within 10⁻²⁰ of a whole number counts as that whole number. Without this, a count that is exactly 464,000 in fractions could come out as 463,999.999… and round down to 463,999. No real count sits that close to a whole number without being one. Please confirm.

## Decisions I made, for you to check

1. **The order of refusals:** pay-to-play, then SAFE conversion, then note conversion, then pro-rata, then anti-dilution. So when a round has several later terms, the error names the first in that order. Case 21, with both a SAFE and a note, stops at SAFE conversion; 18, with a SAFE and pro-rata, stops at SAFE conversion too.
2. **The refusals name milestone "M4",** since all of these arrive within M4. The message reads "The engine supports this from M4".
3. **Toggles a later PR uses are already checked:** `anti_dilution_cp2_rounding` must be `exact`, `0.0001` or `0.01`, and the anti-dilution and pro-rata flags must be true or false. They change nothing until their terms are built.

## Open questions

1. **Confirm E19.**

Next is M4d: converting SAFEs, pro-rata entitlements, and the pro-rata refusal. I'm stopping here.
