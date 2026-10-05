# Review: M4b (the second cases PR)

Branch `m4b-cases`, M4's second PR, and the last before the engine builds rounds. It adds nine cases:
- convertible notes converting in a round, one per base (19a–19c)
- a pre-money SAFE (20)
- a note and a pre-money SAFE together (21)
- the three toggles no case tested: the pool in A (16e), rounding the adjusted conversion price (16f), and the pool in the pro-rata base (18b)
- a holder investing beyond its pro-rata (18c)

**No existing case changes.** Every locked `expected.json` is byte for byte the same under the extended reference calculator.

**The `cases-locked` check fails on this PR until you add `unlock-cases`,** which you'll do once the cases are re-derived independently.

## Run it

```bash
python3 reference/generate.py --check
```

This prints `ok` for all 45 cases. Each new case's `DERIVATION.md` walks through the answer.

## How I made the cases

As for M4a:
1. I worked each case out by hand first, with exact fractions, from your M4b answers. That work didn't use the reference calculator.
2. I then extended the reference calculator to the same rules.
3. Its `expected.json` agrees with the hand numbers **exactly, as fractions**: every price, conversion, share count, pool top-up, conversion price and entitlement.

## The new cases

19a–19c, 20 and 21 share one company:
- 8,000,000 founder common
- a 20% pool, with 500,000 options granted
- a Series A raising $5,000,000 at $20,000,000 pre-money, with the pool topped up to 15%

The note in 19 and 21 is Investor N's $1,000,000 at 6% simple interest for a year, with an $8,000,000 pre-money cap and a 20% discount. So $1,060,000 converts.

| Case | What it isolates | Check |
|---|---|---|
| **19a** note, `with_pool` | R23: the cap divides by the count before the round, with the pool as it stood then (10,000,000) | Cap price $0.80, so **1,325,000** shares of "Series A Preferred (from notes)". Price $1.653944. The derivation also shows that counting the top-up would give 1,429,875. |
| **19b** note, `without_pool` | The same, without the pool (8,500,000) | Cap price $0.941176 (16/17), so **1,126,250** shares |
| **19c** note, `common_only` | The same, common only (8,000,000) | Cap price $1.00, so **1,060,000** shares |
| **20** pre-money SAFE | R24: the YC pre-money SAFE's Company Capitalization counts this round's pool increase | Company Capitalization 10,772,277.23; Safe Price $0.742647, so **1,346,534** shares |
| **21** note and SAFE together | Neither counts the other | Note 1,325,000 at $0.80; SAFE (a $10,000,000 cap) **1,102,165** at $0.907305. Price $1.487119 |
| **16e** pool in A | R7's toggle: A rises from 8,500,000 to 10,000,000 | New conversion price **$2.229167**, against 16a's $2.190476. X's Series A becomes 2,242,990.60 as converted. |
| **16f** rounded conversion price | R9's toggle, to $0.0001 as the NVCA model charter does | $2.1904762 → **$2.1905**. The round's price and shares are 16a's. |
| **18b** pool in the pro-rata base | R6's toggle, with a 5% pool | X's entitlement **$1,036,363.76** (17.272729%), against $1,085,714.34 without the pool |
| **18c** pro-rata and more | X invests $2,100,000: its $1,290,909.09 entitlement marked pro-rata, the rest ordinary | **700,000** Series A as one issuance; rounding each line would give 699,999 |

## What can't be a case: the refusals

A case records a successful outcome, so the reference calculator's unit tests check the refusals instead. They're new in this PR:

- **A pro-rata investment above the entitlement** (your M4d answer). Case 18 with $1,200,000 marked pro-rata gives:

  > Investor X's pro-rata investment of $1,200,000.00 is more than its pro-rata entitlement of $1,127,272.72 (18.181818% of the $6,200,000.00 round). Mark $1,127,272.72 as pro-rata and enter the other $72,727.28 as an ordinary investment in the same round.

  The entitlement is shown **rounded down** to the cent, so the advice always works. An expected file still reports it to the nearest cent.
- **A post-money SAFE converting alongside notes or pre-money SAFEs.** This is listed in the new "Owed before release" section of `ASSUMPTIONS.md`.
- **A SAFE with both a pre-money and a post-money cap.**

The engine (M4d) will refuse the same, with the same message.

## What changed outside `cases/`

- **The reference calculator:**
  - **Notes** convert in a round (`convert_notes`), each into a series of its own, "(from notes)".
  - **Pre-money SAFEs** convert in a round.
  - **The pro-rata base** counts converting notes, and can count the pool (the R6 toggle).
  - **The pro-rata refusal.**
  - **The rounding toggle** for the adjusted conversion price.
  - **One issuance per holder.** This also fixes a bug: with two investment lines for one holder, the reference kept only the last line's shares. No locked case had two lines, so nothing locked was affected.
  - **At exit,** a pre-money SAFE still outstanding is refused, rather than mistaken for an uncapped one.

  33 unit tests pass, 3 of them new.
- **`docs/ASSUMPTIONS.md`:**
  - **R3:** one issuance per holder.
  - **R6:** the refusal, and the pool toggle's name.
  - **R7 and R9:** the toggles' names and their cases. R9 also records the NVCA model charter's rounding.
  - **New R23 and R24:** notes and pre-money SAFEs in a round.
  - **A new "Owed before release" section,** with the refused mix.
  - **New C14:** the fields.
- **`docs/SPEC.md`:** the note and pre-money SAFE rules, and cases 16e, 16f, 18b, 18c and 19–21 in the list.
- **The engine's test** of refused cases now covers 19–21. The variants (16e, 16f, 18b, 18c) were already covered by its pattern.

## Checks

- **Reference:** 33 unit tests pass; all 45 cases match `generate.py --check`.
- **Engine:** 536 tests pass, 27 more than before, because its tests run every case. The new round cases are refused as rounds, naming M4, until M4c.
- **Dashboard:** 102 tests pass, and the build succeeds.

## CI and permissions

- **No changes to `.github/workflows/`.**
- **`.claude/settings.json`:** your local change lifting `Edit(cases/**)` is **not committed**.
- **`cases-locked`** fails until you add `unlock-cases`.

## Decisions I made, all agreed in your last message

1. **18b's pool is 5%, not 10%.** With 10%, X's $1,000,000 would exceed its $981,818.19 entitlement under the toggle, and the round would be refused.
2. **The rounding toggle is a field on the round,** `anti_dilution_cp2_rounding`, next to the other anti-dilution toggles. It's not a field on the series, which would have added a field to every cap table.
3. **The options in 19–21** have a $0.25 strike. The strike plays no part in a round, and the class reads "Options ($0.25 strike)".

## Open questions

None. With the cases locked, M4c starts building rounds in the engine: issuing, the pool, grants, and a priced round with its price and top-up.

I'm stopping here.
