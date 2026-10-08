# Review: 04b (six locked cases written in OCF), and a question about Millrace

Branch `04b-ocf-locked-cases`. Edge cases 4, 5a, 7, 8, 12b and 13a, each written by hand as an OCF package whose import is the locked case's cap table. So the locked payouts and breakpoints are its own: from 04d, the engine pays each imported table at the locked case's exit values and checks it against that case's `expected.json`.

**Before it merges, it needs:**
- your re-derivation
- the cases label

**Millrace isn't here yet.** It raises a question the rules don't settle, below. I'd add it in 04b2 once you've answered.

## The six

| OCF case | Locked case | What it exercises |
|---|---|---|
| `ocf-05-edge-04` | 4, participating capped | a participation cap of 3 above a 1x preference: participating, capped at 3x |
| `ocf-06-edge-05a` | 5a, stacked | seniority 3 ahead of 2, and caps equal to the preference: non-participating |
| `ocf-07-edge-07` | 7, option strikes | four grants at three strikes into option classes, and a plan with nothing left: pool 0 |
| `ocf-08-edge-08` | 8, warrant for preferred | a fixed-amount warrant into Seed |
| `ocf-09-edge-12b` | 12b, SAFE | a post-money SAFE with a cap, a discount and an exit multiple of 1; a plan with 1,000,000 left |
| `ocf-10-edge-13a` | 13a, note | a note with an exit multiple of 2, capitalization rules that read as "with pool", and **no discount given** |

**Ids:** each package uses the locked case's holder and class ids, so each import is the locked cap table exactly. The one exception is case 08, below.

**The derivations:** each maps OCF objects to cap table lines.

**A new check** confirms each expected result equals its locked case's cap table, up to the one rename.

## Decisions I made, for you to check

1. **The engine's own names for option and warrant classes (O6, O7).** The importer names a class as the engine does when it builds a company from its rounds.
   - **Options:** `options_<strike>`, "Options ($0.1 strike)".
   - **Warrants:** `warrants_<underlying>_<strike>`, "Warrants for Seed Preferred ($1 strike)".

   So an imported table looks like a built one. Two consequences:
   - **Case 08's warrant class** imports as `warrants_seed_0.5`, where edge case 8 named it by hand `warrant_seed`. Its `expected.json` says so (`renamed`), and the class is the same in every term.
   - **Larkspur's expected result:** two names corrected, "Options ($0.10 strike)" to "($0.1 strike)" and "($1.00 strike)" to "($1 strike)".
2. **An absent discount is none (O8, O9).** OCF gives a SAFE's or note's discount only where it applies. Case 10's note has none and imports with discount 0, as edge case 13a has it.

## The question: Millrace in OCF

**OCF's numbers carry at most 10 decimal places.** Millrace's cap table after its Series B has prices solved exactly from its rounds, and none of them terminates:
- **Seed:** $518,700,000 ÷ 1,119,057,997 = $0.463515…
- **Seed from SAFEs:** $455,000 ÷ 1,182,033
- **Series A:** $3,900,000 ÷ 1,879,091, converting at a 40-digit fraction after its anti-dilution
- **Series B:** a 17-digit fraction

So no valid OCF package imports to Millrace's locked table exactly.

**This bears on O4's ratio check too.** O4 refuses a class whose ratio isn't exactly its price ÷ its conversion price. With prices rounded to 10 places, an export's ratio won't equal its rounded prices' quotient exactly. That would refuse Millrace's Series A, and most real exports of anything converted after anti-dilution.

**Options for Millrace:**
- **(a) Write each price to 10 places, as an export would.** The expected result is Millrace's table with those prices. Its payouts and breakpoints match Millrace's locked ones to within a cent, not to 30 digits. Rounding to 10 places moves a price by at most 5×10⁻¹¹ a share, so with Millrace's few million preferred shares the difference stays well under a cent.
- **(b) Leave Millrace out of 04b.** The six cover the exit economics, and what's distinctive about Millrace is its rounds, which OCF doesn't carry.

**Options for the ratio check:**
- **(i) The conversion price as written governs.** The ratio must agree with price ÷ conversion price to within the rounding of the numbers as written: half a unit in their last written place.
- **(ii) The ratio governs,** and the conversion price is checked against price ÷ ratio the same way.
- **(iii) Exact equality,** as now: refuses rounded exports.

**I'd take (a) and (i).** The conversion price is what the engine stores, and what an export most often writes.

**Two other things Millrace would show,** both settled already:
- **Series B participates without a cap.** OCF can't say that, so participation is left to fill in (answer 3), and the test fills in "participating", as you would on the page.
- **Series A's broad-based anti-dilution** imports as none (O11). It doesn't affect an exit.

## Also in this PR

- **`docs/ASSUMPTIONS.md`:**
  - **O6, O7:** the names.
  - **O8, O9:** an absent discount.
  - **C16:** `locked_case` and `renamed`; notes compared as a set.
- **`docs/SPEC.md`:** OCF cases 05–10.
- **Tests:** the OCF case list, and the check that each locked-case import equals its locked table.

## Checks

- **Engine:** 1,615 tests pass, 48 more, all checking the case files.
- **Dashboard:** 322 tests pass.
- **Reference:** 55 unit tests pass, and all 75 cases match.
- **Typecheck:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`. `.claude/settings.json` has local changes that aren't committed.
- **Nothing run outside the sandbox.**

## Open question

Millrace: (a) or (b), and the ratio check: (i), (ii) or (iii). Then 04b2, Millrace, or 04c, the ledger case. I'm stopping here.
