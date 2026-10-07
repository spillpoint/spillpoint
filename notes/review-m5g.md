# Review: M5g (SAFEs at a sale, in the engine)

Branch `m5g-safes-at-a-sale`. The engine now pays SAFEs still outstanding at a sale (C8; X1, X9, X13, X14, X16). All eight SAFE cases, 12 to 12h, run through every exit test:
- the waterfall at every recorded point
- the solved decisions
- the breakpoints, with their reasons and jumps

All eight matched the first time they ran.

Also in this PR, as you asked: the senior-tier warrant on a curve is now in "Owed before release".

## Run it

```bash
pnpm payouts edge-12f-two-safes --all
```

```bash
pnpm breakpoints edge-12f-two-safes
```

Every SAFE case prints "N of N exit values match expected.json" and "All match expected.json (to the cent, with the same jumps)".

## How to check it by behavior

1. **Case 12, a post-money SAFE.** Its Cash-Out Amount is paid in full at $1,000,000. It switches to its Conversion Amount at $9,526,315.79: "Its 1,055,555.56 conversion shares ($1,000,000 ÷ the Liquidity Price of $0.947368) are worth…".
2. **Case 12c, no cap and a 20% discount.** At $1,250,000 the SAFE first can convert.
   > Payouts jump here instead of bending: Common Stock drops from $250,000 to $0 and Investor X's SAFE rises from $1,000,000 to $1,250,000. At exactly $1,250,000 the outcome from below still holds…
3. **Case 12f, two SAFEs.** The cash-outs are paid in full at $1.5M, and Y converts at $4,815,789.47. At $9,592,105.26, X converts and the payouts jump. The reason says why, as X17 and the derivation do: "…Investor Y's SAFE keeps its fixed share of that larger count, so its payout jumps up just above this exit value, and common's down." At exactly that point, X takes its cash (X16).
4. **Cases 12d and 12e, alongside preferred.**
   - **12d:** "Seed Preferred's preference and Investor X's SAFE's Cash-Out Amount are paid in full here: $2,000,000."
   - **12e:** the same with Series A at $3,000,000, since its SAFE ranks with Series A.
5. **Case 12g, a pre-money SAFE built from rounds:** it switches at $8,578,947.37.
6. **Case 12h, an MFN SAFE:** it takes its cash at every exit value, a claim of $1,000,000 ahead of common.
7. **The page:**
   - **A saved cap table with a SAFE still outstanding,** or Millrace's rounds with the payouts on the table after its option pool, says:
     > It has SAFEs still outstanding, which this page doesn't show yet. It won't open a cap table it can't show in full.
   - **Before this PR,** the engine refused that table, naming M5. It now reads it, so the page's own check catches it.

## How the engine handles SAFEs

- **A decision like a series':** a SAFE taking its Conversion Amount is in `Decisions.converted`, alongside converting series. Each SAFE is a free decision-maker (E15), with the options re-settled under each choice (E16).
- **X16.** A SAFE takes its Conversion Amount only when that strictly pays more. On a tie it takes its cash, both when the solver searches and when it checks a set is stable. In 12f, at X's indifference point, that gives the outcome from below.
- **The Cash-Out Amount:**
  - **With no preferred,** the SAFEs taking it share one claim ahead of common, pro rata.
  - **With preferred,** each is a claim in its tier: the most junior, or the one it names.
- **The Conversion Amount:**
  - **With a cap,** the SAFE shares as common on purchase amount ÷ Liquidity Price.
    - **Post-money:** one Liquidity Capitalization for every converting SAFE, leaving out series keeping their preference.
    - **Pre-money:** stock, options and warrants, with its shares on top.
  - **With no cap,** it is the fixed point. Where (1 − discount) × what's left is no more than the purchase amount, no price exists, and the SAFE is paid as if it took its cash.
- **Two new margins** let the breakpoint finder place the SAFE changes exactly:
  - **The shared cash claim** not yet paid in full.
  - **A SAFE with no cap's room to convert.** It reaches zero exactly at 12c's jump.

## Found and fixed

**12c's jump reason listed nothing.** At exactly $1,250,000 the SAFE can't convert yet, so the "new outcome" read there was still the old one. The jump reason now reads the new outcome $0.000000000001 above the point. That is far below a cent at any slope. The other jump reasons (6b, 6d, 12f) read the same as before.

## What changed

- **Engine** (`packages/engine/src/`):
  - **`model.ts`:** `Safe` moved here from `rounds.ts`, the same shape plus an optional `cashOutRanksWith`. Also an optional `CapTable.unconvertedSafes`.
  - **`input.ts`:**
    - reads outstanding SAFEs (C8), checking their holders, ids and ranking
    - refuses three setups no case settles, milestone "later": `several_safes`, `pre_money_safe_with_preferred` and `uncapped_safe_with_capped_participation`
    - shares one SAFE reader with the round builder
  - **`rounds.ts`:** a table after an event carries its outstanding SAFEs.
  - **`case.ts`:** no longer refuses an exit on such a table. Notes still are, until M5h.
  - **`waterfall.ts`:**
    - SAFEs paid
    - `liquidityCapitalization`
    - `Payout.safes` and `Payout.safeCash`
  - **`decisions.ts`:** SAFEs as decision-makers, X16, and the two margins.
  - **`reasons.ts`:**
    - `safe_cash_out_paid` and `safe_switches`
    - a SAFE named in the tier it shares
    - the jump read just above
  - **`index.ts`:** the `SafeHere` type. `Safe` is still exported, now from the model.
- **Engine tests:**
  - **Cases 12 to 12h** join `EXIT_CASES`, and the test reader knows `conversion_amount` and `cash_out_amount`.
  - **`test/safes.test.ts`** (new):
    - each capped case's Liquidity Capitalization, Liquidity Price and shares at the top of its range, against its own report, to 30 digits
    - the three refusals
    - four malformed SAFEs
  - **The test that refused an exit after Millrace's SAFEs** now reads that table, with both SAFEs on it.
- **Dashboard:**
  - **`rounds.ts`:** writes a built table's outstanding SAFEs out, so `checkShown` refuses them rather than drop them.
  - **File tests:**
    - **The term the engine doesn't model yet** is now a note.
    - **Two tests check the page's message for SAFEs:** in a file, and from rounds.
- **Docs:**
  - **The engine README:** SAFEs at a sale, the input field, the reasons, the refusals, and what `readInputs` does now, all marked *(0.2.0)*.
  - **`docs/ASSUMPTIONS.md`:**
    - **X1, X9, X13, X14, X16 and C8:** in the engine.
    - **C12:** SAFEs off the refused list.
    - **"Owed before release":** the senior-tier warrant on a curve, with case 8's company and your $1,052,631.58 as its starting point.
  - **`notes/release-0.2.0.md`:**
    - SAFEs at a sale
    - the new fields
    - `Decisions.converted` holding SAFEs
    - two more reason codes
    - the refusal changes
    - SAFE lines

## Checks

- **Engine:** 1,121 tests pass, 172 more than after M5f.
- **Dashboard:** 181 tests pass, 1 more.
- **Reference:** 47 unit tests pass, and all 61 cases match.
- **`cases/`:** no changes.
- **Typecheck and build:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.

## Assumptions added

**No new IDs.** Updates:
- **X1, X9, X13, X14, X16 and C8:** in the engine.
- **C12:** updated.
- **"Owed before release":** the new item.

## Decisions I made, for you to check

1. **A SAFE's decision goes in `Decisions.converted`,** next to series, rather than a new field. `"conversion_amount"` is a conversion, and it keeps `Decisions` the same shape as 0.1.0's.
2. **A SAFE with no cap that can't convert yet** is paid as if it took its cash, and X16 then reports the cash. That is the reference's reading (a), done the same way.
3. **`CapTableAfterEvent.unconvertedSafes` stays** beside the new `capTable.unconvertedSafes`, so 0.1.0 code that reads it keeps working.
4. **The three refusals use milestone "later"** with their own term names. None is planned in M5.

## Open questions

None. M5h, notes at a sale, is next. I'm stopping here.
