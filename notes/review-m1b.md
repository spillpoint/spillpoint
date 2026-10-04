# Review: M1b (the 17 edge cases)

Branch `m1b-edge-cases`, PR [spillpoint/spillpoint#2](https://github.com/spillpoint/spillpoint/pull/2). This finishes M1. There is no engine code. I haven't started M2.

## CI and permissions changes

- **`.claude/settings.json`** adds deny rules: `gh pr merge`, `gh label`, `gh pr edit … label`, `gh api … labels`, and `Edit(cases/millrace/**)`. So Claude can't merge a PR, add or remove the `unlock-cases` label, or edit the Millrace case. (`3759915`, the first commit of M1b.)
- **`.github/workflows/`** has no changes.
- **`cases-locked` will fail on this PR,** because it touches `cases/`. It needs the `unlock-cases` label, which only you can add. `cases/millrace/` itself is unchanged.
- **Not CI, but config:** `.gitignore` now ignores `.DS_Store`. `packages/engine/test/cases.test.ts` gained one check, for edge case 11: each payment's lines add up to the payment, and a schedule's payments add up to the payout at the cumulative amount.

## What changed

- **`cases/`:** 27 edge-case folders, each with `inputs.json`, `expected.json` and `DERIVATION.md`. They cover the 17 cases in `docs/SPEC.md`, with variants where changing one term is the point. Within a case, the variants' inputs are identical except for that term (C3).
- **`reference/`:** the calculator now handles everything the cases use:
  - conversion groups decided by a class vote, and payouts that jump
  - warrants for preferred
  - cumulative dividends and management carve-outs
  - escrow and earnout schedules
  - unconverted SAFEs and notes at exit, with a toggle for what a note's cap divides by
  - the named anti-dilution definition of A
  - pay-to-play

  It has 25 unit tests you can check on paper, up from 12 in M1a.
- **One reference fix:** a round whose pool already meets its target now gets no top-up and is priced on the actual pool (R16). Before, it was priced as if the pool were at target. No existing value changed; Millrace regenerates byte for byte.
- **What the reference refuses, with a clear error, rather than guessing.** Each is recorded in `ASSUMPTIONS.md`:
  - compounding dividends, and dividends paid on conversion
  - a carve-out paid alongside preferences
  - more than one unconverted SAFE or note
  - a SAFE or note with no cap or with a discount, or alongside preferred
  - partial pay-to-play participation
  - pay-to-play on more than one series
  - pay-to-play in a round that triggers anti-dilution
- **`docs/ASSUMPTIONS.md`:** your M1a decisions (R6, R8, R15), plus everything M1b added. See below.

## How to check it by behavior

1. **Run it.** Everything should pass:
   ```bash
   pnpm install && pnpm test && pnpm test:reference
   ```
   That is 149 Vitest checks on the case files, 25 reference unit tests, and all 28 cases matching the reference.
2. **Read each case's `DERIVATION.md`.** Each one works the answer out step by step and ends with "Checking this independently": which wrong rules the case catches, and which it can't. These are the numbers worth spot-checking:

**Exit cases** (payouts per holder, plus every breakpoint with its reason):

| Case | Check |
|---|---|
| 1 common only | No breakpoints; payouts are pro rata by shares, and the pool gets nothing. |
| 2 non-participating | Breakpoints $3M (preference paid) and $15M (converts: 20% × $15M = $3M). |
| 3 participating | One breakpoint, $3M. Above it, Seed takes $3M plus 20% of the rest, and never converts. |
| 4 participating, capped | $3M, $33M (the 3x cap is reached), $45M (converts). |
| 5a stacked / 5b pari passu | 5a has $4M (Series B paid) and $6M (Series A paid); 5b has only $6M. Both convert at $22M and $40M. |
| 6a / 6b / 6c conversion groups | 6a: each series converts on its own ($12M, $30M). 6b (more than 50%): one jump at $30M, where Seed-1 gains $2M and common loses $2M. 6c (at least 50%): the jump is at $10M. |
| 7 option strikes | $2M, $8.3M, $26.3M. At $50M, Employee D nets $2,622,000. |
| 8 warrant for preferred | $1M (warrant exercised), $2.1M (tier paid), $10.1M (converts). |
| 9 cumulative dividends | $3,960,657.53 (the preference plus $960,657.53 of dividends is paid), $19,803,287.67 (converts and forfeits the dividends). |
| 10 carve-out | $10M and $20M (carve-out tiers end), $11,052,631.58 (preference paid), $26.5M (converts). |
| 11 earnout | Schedule A's earnout pays Seed $1M and common $2M. Schedule B's earnout makes Seed convert and pays it $1M and common $9M. |
| 12 unconverted SAFE | $1M and $9,526,315.79. At $20M the SAFE gets $2,099,447.51. |
| 13a / 13b / 13c unconverted note | Repayment is paid at $2,240,000. The note switches to converting at $15,954,285.71 (with pool), $17,397,894.74 (without) and $18,240,000 (common only). |

**Round cases** (the cap table after each event):

| Case | Check |
|---|---|
| 14a pool top-up | $2.50 a share; Investor X 2,000,000 (20%); the pool tops up by 500,000 to 15%. |
| 14b pool already at target | No top-up; $2.666667; Investor X 1,875,000 (20%); founders 64%. |
| 15 SAFE, discount beats cap | The cap price is $2.32 and the discount price $2.00, so the SAFE gets 300,000 shadow shares. Investor X still holds 20%. |
| 16a / 16b / 16c / 16d down round | Price $1.167019 / $1.094595 / $0.875 / $1.20. Series A's new conversion price is $2.190476 / $1.6875 / $0.875 / $2.204545. Investor X ends at 17.76% / 21.62% / 33.33% / 17.76%, and Investor Y at 20% in all but 16d (19.58%). |
| 17 pay-to-play | Investor W's 800,000 Series A becomes 80,000 common; $1.293103 a share; Investor Y 16%; founders 51.72%. |

3. **For the independent re-derivation,** the reviewer needs:
   - `docs/SPEC.md` and `docs/ASSUMPTIONS.md`
   - each case's `inputs.json` and `DERIVATION.md`

   Tolerances are $1 for payouts and breakpoints and 1 share for share counts. Most round cases use round numbers on purpose, so they are easy to check by hand. Millrace's three rounds are what exercise share rounding.

## Assumptions added

**Confirmed by you during M1b:**
- **Exit waterfall:** E11 (conversion groups decide by class vote), E13 (payout jumps).
- **Exit terms:** X1 (unconverted SAFE), X4–X8 (dividends, carve-out, escrow and earnouts), X9 (SAFE setups refused), X10–X12 (note at exit, with X10's toggle for what the cap divides by).
- **Rounds:** R10 (now a toggle: whether the anti-dilution shares count in the round's price), R16 (pool already at target), R17–R21 (pay-to-play, with R19's toggle for pricing before or after the conversion).
- **Case file conventions:** C5–C10.

**Still New, for you to confirm:**
- **E12:** warrant for preferred. Exercised shares join the series, with its $1.00-a-share preference rather than the strike.
- **C4:** the `conversion_groups` and warrant fields.
- **R22:** the smaller pay-to-play choices:
  - a holder passes if its total investment in the round meets the requirement
  - only one series per round
  - the ratio is per preferred share, not per as-converted share
- **C11:** the `pay_to_play` input and output fields.

**Cases still owed, as you asked:**
- **Before M4:** partial pay-to-play participation (R20), and pay-to-play in a round that triggers anti-dilution (R21).
- **Before M5:** SAFE exit cases with a discount, with no cap, and alongside preferred (X9); the same three for notes (X12).

**Not in M1b, as agreed:** the X8 note about a visible dashboard warning on a negative take. It comes with the M3 instructions.

## Open questions

1. **M1a items still marked New:** R1, R2, R12, R14, E4, E5 and E10. Should I mark them confirmed, or do any need another look?
2. **Variant 17b?** Pricing a pay-to-play round before the conversion (the R19 toggle) is covered only by a reference unit test. The other two toggles added in M1b each have cases: X10's in 13a–13c and R10's in 16d. Do you want 17b, with the toggle off, for the same coverage? Its numbers are already in 17's derivation: $1.20 a share, and Investor Y at 16.98%.
3. **The Millrace pro-rata fix.** After this merges, you planned one small separate PR to `cases/millrace`. It covers the pro-rata record and wording under the NVCA base (R6), the reference's pro-rata base, and the $9,999,999.89 cash figure. No share count or payout changes. It needs you to lift the `Edit(cases/millrace/**)` deny rule and add the `unlock-cases` label. Should I start it once you say the rule is lifted?
4. **Locking.** Once the independent re-derivation agrees, locking `cases/` ends M1, and from then on any change goes through the disagreement process. Is there anything you want added or varied before you lock?
