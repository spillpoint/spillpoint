# Review: M4a (the owed cases)

Branch `m4a-cases`, the first of M4's PRs, and the only cases PR before M4b. It adds the eight cases owed before M4: R20, R21, R22 and R6 from `ASSUMPTIONS.md`, plus the E13 case from `notes/next-unlock.md`. It also makes the next-unlock list's two text fixes. There is no engine work.

**The `cases-locked` check fails on this PR until you add `unlock-cases`,** which you'll do once the cases are re-derived independently.

## Run it

```bash
python3 reference/generate.py --check
```

This prints `ok` for all 36 cases. Each new case's `DERIVATION.md` walks through the answer by hand.

## How I made the cases

I followed the same process as M1:
1. Each case was worked out by hand first, with exact fractions, from the rules as you settled them in M4 planning. That work didn't use the reference calculator.
2. I extended the reference calculator to the same rules.
3. Its `expected.json` agrees with the hand numbers **exactly, as fractions**, for all eight cases.

## The new cases

| Case | What it isolates | Check |
|---|---|---|
| **17c** pay-to-play, partial | R20, default: Investor W buys $200,000 of its $400,000. All its 800,000 Series A still converts, to 80,000 common. | Price $1.293103 (75/58), as in 17a. Series B: X 464,000, W 154,666, Y 1,701,333. |
| **17d** partial, proportional | R20's toggle (`partial_participation: convert_proportionally`): W keeps floor(800,000 × ½) = 400,000 Series A, and 400,000 convert to 40,000 common. | Price $1.244813 (300/241). Series A's preference is $4,000,000. |
| **17e** pay-to-play with anti-dilution | R21, priced after the conversion: W converts unadjusted; X's 1,200,000 Series A are adjusted; A = 7,780,000, counted after the conversion. | Price $1.271882 (2325/1828). Series A's conversion price $2.50 → $2.214286; X's Series A becomes 1,354,838.61 as converted. |
| **17f** the same, priced before | R21 under R19's toggle: the same A; the price counts W's 800,000 Series A, but only X's shares are adjusted. | Price $1.178814 (2604/2209). Conversion price → $2.174349. |
| **17g** two series | R22: one $1,200,000 offer split by combined as-converted shares. X, in both Seed and Series A, must buy $800,000 and buys $400,000. All of its Seed converts at 1 for 5 and all of its Series A at 1 for 10. | Price $1.232877 (90/73). X gets 300,000 common. |
| **17h** two series, proportional | R22 with R20's toggle: X keeps half of each series. | Price $1.104294 (180/163). X gets 150,000 common. |
| **18** pro-rata with a SAFE | R6: Investor Z's SAFE converts in the Series A into 1,000,000 shares, which join the pro-rata base. | X's entitlement is **$1,090,909.09** (2,000,000 of 11,000,000, 18.181818%), not $1,200,000. |
| **06d** a voter indifferent over a range | E13: Investor R (Seed) gets nothing either way up to $7.5M, then converting pays it, and its 50% carries the group. | One breakpoint, a **jump at $7.5M**. The group stays at exactly $7.5M. |

The **engine already passes 06d**: its waterfall, decision and breakpoint tests run every exit case, and 06d is one. To see the jump:

```bash
pnpm payouts edge-06d-voter-indifferent-over-a-range 7500000
```

That shows Series A at $3,000,000. One dollar higher, at 7500001, Series B has its full $7,500,000 and Series A has $0.17.

The round cases (17c–17h, 18) are refused by the engine until M4c builds rounds. Its tests check that each is refused as "rounds", naming M4.

## What changed in existing cases

- **Millrace's and case 15's `expected.json`:** the rename only. The series from SAFEs is now "Seed Preferred (from SAFEs)" and "Series A Preferred (from SAFEs)". I diffed Millrace against the locked file: it's identical once "(SAFE shadow)" is replaced, including the breakpoint reason that names the series. **No share count, price or payout changed.**
- **17a's and 17b's `expected.json`:** the pay-to-play part of the round details is now reported per holder and per series, so R20 and R22 can be read in it:
  - the fraction bought
  - for each series, the shares kept, converted, and the common received

  `conversion_ratio` became `conversion_ratios`, one per series. Nothing else changed: **no share count, price or payout**. I checked that every difference is inside those details.
- **Millrace's `DERIVATION.md`:**
  - "within $1" becomes "within $0.01", twice.
  - The "shadow series" wording is gone, on **ten** lines, not the nine I counted. The tenth was on a long line my search had cut short.
- **Millrace's `CASE.md` and case 15's `DERIVATION.md`:** the "SAFE shadow" wording, in 2 and 3 places.
- **The ids stay `seed_shadow` and `series_a_shadow`,** as you agreed, so every input is unchanged.

## What changed outside `cases/`

- **The reference calculator** (`reference/spillpoint_ref/rounds.py`):
  - R20's toggle
  - R21's order: the conversion first, A after the conversion under both R19 settings, and adjustment only for the preferred that remains
  - R22's several series, with one ratio each
  - R6's base, with SAFEs at their whole shares, and the refusal when a SAFE stays outstanding
  - the new name

  Its pay-to-play unit test now checks this behavior instead of the old refusals.
- **`docs/ASSUMPTIONS.md`:**
  - **R5:** the new name.
  - **R6, R20, R21, R22:** your M4-planning answers, now the rules.
  - **C11:** the new pay-to-play fields.
  - **C3:** a related case can share a number (06d, 17c–17h).
  - **R11 and E9:** the new name.
- **`docs/SPEC.md`:** the pay-to-play rules, case 18, and 06d in the list.
- **`notes/next-unlock.md`:** nothing is waiting now.
- **Tests:**
  - **The engine's case lists** gain 06d (in scope) and case 18 (refused until M4).
  - **The dashboard's editor test** quotes the new name, which the dashboard picks up from Millrace's regenerated cap table.

## Checks

- **Reference:** 30 unit tests pass; all 36 cases match `generate.py --check`.
- **Engine:** 509 tests pass, 52 more than before, because its tests run every case.
- **Dashboard:** 102 tests pass, and the build succeeds.

## CI and permissions

- **No changes to `.github/workflows/`.**
- **`.claude/settings.json`:** you lifted the `Edit(cases/**)` deny rule locally for M4a and M4b. The change is **not committed**, as you asked.
- **`cases-locked`** fails on this PR until you add `unlock-cases`.

## Decisions I made, for you to check

1. **17f** is a variant of 17e you didn't list. You asked for the same A under both settings of R19, so each setting gets a case.
2. **06d's Seed preference is $500,000.** At $1M or more, R's two outcomes tie again at $13.5M exactly. The tie rule (E11) would then flip the group back to staying for that one dollar.
3. **The input format:**
   - **The R20 toggle** is `partial_participation`: `convert_all` (the default) or `convert_proportionally`.
   - **R22's ratios** are `conversion_ratio` as an object, `{"seed": "0.2", "series_a": "0.1"}`.
   - **A single number** still works for one series, so 17a's and 17b's inputs are unchanged.
4. **The new cases' companies:**
   - **17c–17f** are 17a's company with one input changed each.
   - **17g, 17h and 18** are new companies without an option pool, so their numbers stay round.
   - **06d** follows the shape of the M2c example.
5. **Rounding,** as you confirmed: preferred kept = floor(shares × fraction bought), common received = floor(converted × ratio), separately for each series.

## Open questions

1. **For M4d: should a pro-rata investment above its entitlement be refused?** Today the entitlement is only reported: case 18's X invests $1,000,000 against $1,090,909.09. R6 calls the entitlement "the most the investor may buy". I'd refuse an investment above it, with a clear error, unless you'd rather report it and carry on.

Next is M4b: the notes, pre-money SAFEs and toggle cases, with their own decisions. I'm stopping here.
