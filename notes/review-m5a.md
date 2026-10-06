# Review: M5a (the owed cases)

Branch `m5a-cases`, the first of M5's PRs. It adds the six exit cases owed before M5 (X9, X12): for SAFEs and for notes, one each with a cap and a discount, with a discount and no cap, and alongside preferred. There is no engine work. The engine still refuses SAFEs and notes at a sale, naming M5; M5f and M5g build them.

**The `cases-locked` check fails on this PR until you add `unlock-cases`,** which you'll do once the cases are re-derived independently.

## Run it

```bash
python3 reference/generate.py --check
```

This prints `ok` for all 51 cases. Each new case's `DERIVATION.md` walks through the answer by hand.

## How I made the cases

I followed the same process as M1 and M4a:
1. **By hand.** I worked out each case first, with exact fractions, from your M5 answers. That work didn't use the reference calculator.
2. **The reference.** I extended the reference calculator to the same rules.
3. **The comparison.** Its `expected.json` matches the hand numbers **exactly, as fractions**, for all six cases, including where the payouts jump.

## The new cases

| Case | What it isolates | Check |
|---|---|---|
| **12b** SAFE, cap and discount | Case 12's SAFE with a 20% discount too. At a sale only the cap counts. | **Every payout and breakpoint is case 12's:** $1,000,000 and $9,526,315.79. At $20M the SAFE gets $2,099,447.51. |
| **12c** SAFE, discount only | No cap, 20% discount. It converts at the common price less 20%, a fixed point always worth $1,000,000 ÷ 0.8 = **$1,250,000**. | Breakpoints $1,000,000 and **$1,250,000, flagged as a jump**. At $1.2M the SAFE gets $1,000,000. At $2M it gets $1,250,000 (15,000,000 shares at $0.066667). |
| **12d** SAFE alongside preferred | Series A senior, Seed junior. The SAFE's Cash-Out Amount shares Seed's tier. Its Liquidity Capitalization leaves out Series A, which keeps its preference. | Breakpoints $2M, $4M, **$8.5M** (Seed converts) and **$12M** (the SAFE converts). At $3M Seed and the SAFE get $500,000 each. Liquidity Price $0.818182 (9/11). |
| **13d** note, cap and discount | 13a's note with a 20% discount, repaid at 1x. It converts at its cap only. | Breakpoints $1,120,000 and **$7,977,142.86** (55,840,000/7). At $5M the note gets $1,120,000; at $10M, $1,404,011.46. |
| **13e** note, discount only | No cap, 20% discount, 1x. A fixed point worth $1,120,000 ÷ 0.8 = **$1,400,000**. | Breakpoints $1,120,000 and **$1,400,000, a jump**. At $1.3M the note gets $1,120,000; at $2M, $1,400,000. |
| **13f** note alongside preferred | 13a's note (2x) with a 2,000,000-share Series A at $1.00. Repayment is ahead of Series A; the base counts Series A. | Base **12,500,000**, price $0.64, 1,750,000 shares. Breakpoints $2.24M, $4.24M, $13.24M (Series A converts) and $16.32M (the note converts). |

### What to look at, by behavior

1. **12b against 12.** The two `expected.json` files have the same breakpoints and payouts. Only the inputs and the description differ.
2. **12c and 13e, the jump.** At 12c's $1.2M the SAFE has $1,000,000 and the founders $200,000. At $2M the SAFE has $1,250,000. The breakpoint at $1,250,000 says why: "this is the first exit value where there is" room for the conversion.
3. **12d, the junior tier.** At $3M Seed and the SAFE split the $1M above Series A's $2M, half each.
4. **13d, the cap only.** At $2M and $5M the note gets its $1,120,000 repayment. If the discount applied at a sale, it would get $1,400,000 there. 13d's derivation shows this.
5. **13f, the base.** Without Series A in the base, the price would be $0.761905 and the note would get 1,470,000 shares, as in 13a.

## Your M5 answers, as the rules

- **Reading (a) for a discount-only SAFE or note.** Where no conversion price exists, the instrument takes its cash-out or repayment, and the payouts jump where conversion first becomes possible. At exactly that exit value the outcome from below holds, as for E13's jumps. **X9 and X12 record (b) as the other defensible reading:** conversion takes everything left up to amount ÷ (1 − discount), with no jump.
- **The Liquidity Capitalization alongside preferred (X1).** It leaves out a non-participating series that keeps its preference: that series takes its preference in lieu of converting. Participating preferred is counted.
- **The ranking toggle.** Where a SAFE's Cash-Out Amount ranks is fixed at the most junior tier for now. The toggle that names another tier comes with its case in M5b.
- **13d's 1x repayment.** At 2x, converting at the discount ($1.4M) could never beat repayment ($2.24M), so the case couldn't tell the two rules apart.

## What changed outside `cases/`

- **The reference calculator** (`reference/spillpoint_ref/`):
  - **`waterfall.py`:**
    - SAFEs with no cap, a discount, or alongside preferred.
    - Notes with no cap, a discount, or alongside preferred.
    - The fixed point.
    - The cash-out in the junior tier.
    - The Liquidity Capitalization without series keeping their preference.
  - **`breakpoints.py`:** placing the jump, and the new reasons.
  - **`case.py`:** the new report fields (C8, C9).
  - **`reference/tests/`:** 5 new tests replace the old refusal test: 3 for SAFEs and 2 for notes.
  - **The reference README:** one sentence on the fixed point.
- **`docs/ASSUMPTIONS.md`:**
  - **X1:** preferred in the Liquidity Capitalization.
  - **X9 and X12:** the M5a rules, with reading (b), and what is still refused.
  - **C3:** 12b–12d and 13d–13f.
  - **C8 and C9:** the new fields, and `null` for no cap.
- **`docs/SPEC.md`:** the variants in the case list.
- **The engine's case list** (`packages/engine/test/input.test.ts`): the six new cases are refused, as SAFEs or notes at a sale, naming M5. No engine code changed.

## Checks

- **Reference:** 37 unit tests pass, 4 more than at the end of M4. All 51 cases match `generate.py --check`. The 45 locked cases are unchanged.
- **Engine:** 673 tests pass, 48 more, because its tests run every case.
- **Dashboard:** 169 tests pass, and the build succeeds.
- **Typecheck:** clean.

## CI and permissions

- **No changes to `.github/workflows/`.**
- **`.claude/settings.json`:** you lifted the `Edit(cases/**)` deny rule locally for M5a and M5b. The change is **not committed**, as you asked.
- **`cases-locked`** fails on this PR until you add `unlock-cases`.

## Assumptions added

None new. X1, X9, X12, C3, C8 and C9 are updated with your M5 answers.

## Decisions I made, for you to check

1. **No cap is written as `null`.** It is `"post_money_cap": null` on a SAFE and `"valuation_cap": null` on a note, so the inputs say so rather than leaving the field out.
2. **Two setups are still refused,** with no case planned:
   - **A pre-money SAFE at a sale.** It follows a different document, YC's pre-money SAFE, whose sale terms aren't modeled.
   - **A SAFE or note with no cap alongside capped participating preferred.** There, the fixed point is no longer a straight line in the exit value.

   Both are recorded in X9 and X12. Say if you want a case for either.
3. **An MFN SAFE has no case.** With neither a cap nor a discount, converting is worth exactly its Cash-Out Amount, so it is just a claim ahead of common.
4. **The reported Liquidity Capitalization** is the one at the top of the case's range, where every decision has settled (C8). In 12d that counts Seed. Each `DERIVATION.md` gives the figures at the exit value where the SAFE switches.
5. **The companies:**
   - **12b, 12c, 13d and 13e** are 12's or 13a's company with one or two inputs changed.
   - **12d** is a new company with no option pool, so its numbers stay round.
   - **13f** is 13a's company plus Series A.

## Open questions

None for this PR. M5b is next: more cases. Before writing its cases, I'll propose how dividends paid on conversion are paid and where a carve-out alongside preferences ranks, and wait for your answer. I'm stopping here.
