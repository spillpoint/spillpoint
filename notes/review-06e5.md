# Review: 06e5 (the locked cases as OCX, and the SAFE-row test)

Branch `06e5-ocx-locked-cases`. **This PR touches `cases/`,** so it needs the cases label once the cases have been re-derived independently. No engine code: `readOcx` is 06f.

Three commits:
1. **ASSUMPTIONS:** C18's locked-case fields, two OX14 rules the cases needed, and the plan.
2. **The six cases and the reference test,** with the case-file test that compares each answered import with its locked table.
3. **This note.**

## 1. The cases

**Six locked cases written as OCX 0.5,** as the plan lists them: 0.4/0.5's layout carries a series' terms, where 0.7's, as seen, has no Financing History.

| Case | Locked case | Blanks answered |
|---|---|---|
| `ocx-07-edge-04` | edge 4, participating with a cap | seniority |
| `ocx-08-edge-05a` | edge 5a, two series stacked | seniority, Series B over Series A |
| `ocx-09-edge-07` | edge 7, options at three strikes | three strikes: $0.25, $1, $3 |
| `ocx-10-edge-08` | edge 8, a warrant for preferred | the warrant's $0.50 strike; seniority |
| `ocx-11-edge-12b` | edge 12b, a SAFE with a cap and a discount | the options' $5 strike |
| `ocx-12-millrace` | Millrace after its Series B | three strikes, $0.05, $0.11, $0.42; seniority, B over A over the two seeds pari passu |

**Each expected file gives three things:**
- **The import, worked by hand.**
- **`answers`,** one for each blank in `to_fill`, in its order.
- **`renamed`:** the import's id for each of the locked case's holder, class and SAFE ids that the import makes differently. OCX has no ids, so the import makes them from names (OX3).

**Each DERIVATION** walks the workbook to the import, then tables each answer and why, then says how the import meets the locked table.

**Millrace's prices** are its exact fractions, stored as Excel stores them, the nearest binary double to 17 digits, and read to 15 significant digits.
- **Series A's ratio check** is worked digit by digit: it fits the window but isn't exact, so it gets a `conversion_ratio_rounded` line, as OCF's Millrace import does.
- **Its liquidation preferences** agree within billionths of a dollar.
- **Its `(as converted)` values** agree within a third of a share.

**What the workbooks use from the reference:** tab names, headers and row labels, as in 06e4. The titles and footnotes are our own, and every number is the locked case's. The workbooks were written out by a script in my scratchpad. It also checks that each stored price, read to 15 digits, is the locked price rounded half up to 15 digits.

## 2. The test that each answered import is its locked table

**A new case-file check, for each of the six,** in `cases.test`:
1. **The answers cover exactly the blanks,** in their order, none null.
2. **The answers are applied to the import,** and the result compared with the locked cap table under `renamed`, prices rounded half up to `price_digits`.

**Three things are compared as OCX can carry them** (C18):
- **Anti-dilution as none** (OX7). Only Millrace's Series A has any, broad-based. At a sale it changes nothing: the conversion price already holds the adjustment.
- **The name of a renamed class, or of an option or warrant class.** The import names those by their column's heading ("2019 Stock Plan Options"), never by strike.
- **The name of a holder made for a convertibles row:** edge 12b's "Investor X". OCX's convertibles table names no holder.

**To prove it bites,** I broke Millrace's expected file three ways, one at a time, and the comparison failed each time. The file was put back after each:
- a strike of "0.4" for "0.42"
- a conversion price off in its 15th digit
- a holder left out of `renamed`

**Payouts:** that each import, once answered, pays as its locked case does, within a cent where a price was rounded, needs `readOcx` and the engine. It comes in 06f, as 04b2's test did for OCF.

## 3. The SAFE-row test (`reference/tests/test_safe_row.py`)

Your 0.6.0 answer 10: a row of identical SAFEs pays as the SAFEs one by one.

**Post-money:**
- **The setup:** three $200,000 SAFEs at an $8M cap, against one $600,000 SAFE at the same cap, beside a preferred series, options and a pool.
- **What's compared,** in the reference:
  - the breakpoints, where and whether they jump
  - every other class's payout, every $100,000 to $30M and a cent either side of each breakpoint
  - the row's payout against its three SAFEs' together, each paid alike

**Pre-money:**
- **The reference refuses several pre-money SAFEs** (X14), as the engine does. That refusal is what combining a row gets past. So the SAFEs one by one are worked in the test itself, from X14's text:
  - each converts into a × LC ÷ cap shares, the Liquidity Capitalization leaving out the pool and every SAFE
  - or each takes its cash, ahead of common, pro rata with the others
- **The test shows the choice doesn't depend on the others:** with any number of them converting, one converting is worth exactly its cash at cap + N × a, so identical SAFEs never split.
- **Then it compares** the reference's combined SAFE with that, at the same exit values, and its breakpoints with the two the formula gives.

**To prove it bites,** I made the row a dollar more than its SAFEs, and both tests failed.

## How to check by behavior

1. **Re-derive the six cases** from their DERIVATIONs, by OX3 to OX14. Then apply each one's answers and compare the import with its locked case's cap table under `renamed`:
   - edge cases 4, 5a, 7, 8 and 12b from `inputs.json`'s exit cap table
   - Millrace from `expected.json`'s table after `series_b`
2. **Run the tests:**

   ```bash
   pnpm test
   pnpm test:reference
   ```

   - **Engine:** 2,649 pass, 78 new, 13 for each case.
   - **Page:** 541, unchanged.
   - **Reference:** 73 unit tests pass, 2 new, and every `expected.json` matches.

## Decisions for you

1. **`answers` and `renamed` in the expected file** (C18). The comparison is what the test does, in the order above, and the three exceptions are listed in C18.
2. **One plan per strike** (cases 09 and 12). 0.4/0.5 heads option columns by plan, never strike, so a plan with grants at several strikes can't be answered right. These workbooks write a plan for each strike. The DERIVATIONs say it's an encoding, not a claim about the company.
3. **A column no holder holds anything in makes no class** (OX14). It asks no strike, and classes are numbered among the columns that do. Every locked case's `Non-Plan Awards` is empty, as the template always has it.
4. **Two series on one day go in Financing History's order** (OX14): Millrace's two seed classes, both 30 June 2022.
5. **Edge 12b's SAFE holder isn't on the per-holder tab.** OCX gives a SAFE no column there, and the reference template lists none of its SAFE holders. So Investor X is renamed to the holder made for the row.
6. **Edge 8's warrant is headed by its series,** "Seed Preferred Warrants", which OX14 reads as written. The reference's converter would head it by the common class it converts into: that's still open (0.6.0 plan, question 9).
7. **The as-of dates:** Millrace's is its Series B's date, as OCF's import has it. The edge cases have no date, so they use 30 June 2025.
8. **Millrace's "Seed Preferred (from SAFEs)" round carries the class's whole name,** since nothing trails it to strip (OX14's matching).
9. **The pre-money half of the SAFE-row test is worked in the test,** not by the reference, which refuses several pre-money SAFEs. The alternative was to widen the reference for a table no case has. I'd rather not touch the reference for one test.

## Assumptions added

- **C18:** a locked case written as OCX: `locked_case`, `locked_after_event`, `renamed`, `price_digits` and `answers`, and what's compared.
- **OX14:**
  - a column with nothing in it makes no class
  - two series on one day go in Financing History's order
  - one strike per column, a limit stated, with a real export's mixed column open for 06g
- **OX11:** combining a row is exact, by the new reference test.

## Open questions

1. **A real export's option column with several strikes.** The import makes one class and asks one strike, and no answer is right. For 06g: should the page ask, before the strike, whether all of a column's options share one strike? If they don't, it could refuse by name rather than pay at a wrong price. Or should the import refuse any option column outright until an export shows strikes? I'd ask, since most early plans grant at a few strikes.
2. **The payout comparison in 06f:** each answered import against its locked case's payouts and breakpoints, within a cent, as `ocf.test` does for OCF. I'll plan it that way unless you'd like it otherwise.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **This PR touches `cases/`:** the `cases-locked` check fails until you add the cases label. It also adds a reference test, `reference/tests/test_safe_row.py`, which `pnpm test:reference` runs.
- **`.claude/settings.json` shows as changed on this machine:** your lift of the cases lock. I haven't touched it or committed it.
- **Nothing ran outside the sandbox, and nothing used the network.**

## Checks

- **Engine:** 2,649 tests pass.
- **Page:** 541 tests pass.
- **Reference:** 73 unit tests pass, and every `expected.json` matches.
- **Typecheck:** clean.

## Next

06f, the engine's `readOcx`, which takes the OCX cases from case files to imports. I'm stopping here.
