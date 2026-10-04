# Review: M2a (engine foundations)

Branch `m2a-foundations`, the first of M2's five PRs. It sets up the engine's arithmetic and teaches it to read and check an exit input. There is no waterfall yet; that's M2b.

## CI and permissions changes

- **`.claude/settings.json`:** your change, committed here as you asked. It replaces the deny rule `Edit(cases/millrace/**)` with `Edit(cases/**)`, so Claude can't edit any locked case.
- **`.github/workflows/`** has no changes.
- **`cases-locked`:** this PR doesn't touch `cases/`, so it should pass without the label.

## What changed

- **`docs/SPEC.md`:** test tolerances for payouts and breakpoints tightened from $1 to $0.01. The Rounding section's mention of "the $1 tolerance" now says $0.01.
- **`docs/ASSUMPTIONS.md`:**
  - **R6:** the before-M4 note that the pro-rata base must count outstanding SAFEs and notes, with a case.
  - **E14 and E15:** your answers to the M2 plan.
  - **C12 (new):** how strictly the engine reads its input.
  - The status legend now explains "(Jordan, M2 plan)".
- **`packages/engine/src/`:**
  - **`decimal.ts`:** the engine's Decimal, at 40 significant digits. It reads exact numbers (integers, decimals, `"a/b"`), refuses floats, applies the $0.000000000001 tie threshold, and rounds half-up to the cent.
  - **`errors.ts`:** two error types. `InputError` is for malformed input. `UnsupportedTermError` is for terms that arrive later, and names the term and the milestone.
  - **`model.ts`:** the cap table the waterfall will run on.
  - **`input.ts`:** `readCapTable`, `readExit` and `readCase`, which read the case-file format and check it.
  - **`index.ts`:** the exports.
- **`packages/engine/test/`:**
  - **`decimal.test.ts`** and **`input.test.ts`:** the new tests.
  - **`support/cases.ts`:** reads the locked case files. The engine itself does no I/O.
  - The existing `cases.test.ts` is unchanged.

## How to check it by behavior

1. **Run it.** Everything should pass:
   ```bash
   pnpm install && pnpm test && pnpm test:reference
   ```
   That is 198 Vitest tests (the 151 case-file checks plus 47 engine tests), 25 reference unit tests, and all 28 cases matching the reference.
2. **Cases in M2's scope read cleanly:** edge cases 1–7 (including 5a/5b and 6a–6c) and Millrace. Millrace's exit reads the post–Series B cap table from its `expected.json` (C2). Series A's conversion ratio comes out as 1.1373992577, reflecting the down round.
3. **Every other case is refused, never skipped.** These are the actual messages:

   | Case | Message |
   |---|---|
   | 8 | `exit.cap_table.securities[2]: Warrants (warrant_seed; E12). The engine supports this from M5; until then it refuses the input rather than ignoring the term.` |
   | 9 | `…securities[1].cumulative_dividend: Cumulative dividends (X2, X4).` …from M5… |
   | 10 | `exit.cap_table.carve_out: Management carve-outs (X6, X7).` …from M5… |
   | 11 | `exit.payment_schedules: Escrow and earnout payment schedules (X8).` …from M5… |
   | 12 | `exit.cap_table.unconverted_safes: SAFEs still outstanding at exit (X1).` …from M5… |
   | 13a–13c | `exit.cap_table.unconverted_notes: Convertible notes still outstanding at exit (X3, X10–X12).` …from M5… |
   | 14a–17b | `inputs.events: Building a cap table from rounds.` …from M4… |

4. **Malformed inputs fail with a clear error** that names the field. Each of these has a test:
   - an unknown or misspelt field
   - a preferred series missing from the seniority tiers
   - a cap multiple on a series that isn't capped participating
   - fractional or float share counts
   - an unknown holder
   - a stated conversion ratio that disagrees with the prices
   - a conversion group containing a series that can't convert
5. **Precision (E14):**
   - 552/473 (16a's Series B price) reads as 1.1670190274841437632135306553911205074, the same 40 digits Python's decimal module gives.
   - 1/3 × 3 counts as a tie with 1.
   - $2.675 rounds to $2.68.

## Assumptions added

- **E14 and E15,** confirmed in your answers to the M2 plan:
  - **E14:** 40 digits, the tie threshold, tests to the cent, and the check that every point's payouts add up.
  - **E15:** solving from both ends; checking every combination when the ends disagree and there are 12 or fewer decision-makers; the incomplete flag above 12; and stopping with an error on a cycle.
- **R6:** the before-M4 note.
- **C12 (new, for you to confirm):** how strictly the engine reads input:
  - unknown fields are errors
  - `totals`, `approx` and `exit_date` are accepted and unused
  - a stated conversion ratio must agree with the prices to one part in 10^30
  - a missing conversion price means the original issue price, and a missing pool means 0
  - each holder × security appears once, and share counts are whole

## Not changed: locked files

Millrace's `DERIVATION.md`, in its "Checking this independently" steps 2 and 3, still says payouts and breakpoints should hold "within $1". `cases/` is locked, so I left it. The engine's tests will use $0.01 regardless. Case 12's line about "the $1 tolerance" is still true at $0.01.

## Open questions

1. **C12:** confirm, or change any of it?
2. **Millrace's "within $1" wording:** leave it, or fix it in a one-line unlock PR?
3. **A gap in E15, for the search before M2c.** E15 checks every combination only when the two ends *disagree*. If both ends settle on the same answer, a different stable answer could in principle still exist between them. When I use the reference to look for a case with two stable answers, I'll also check whether this can happen under our rules, and report before M2c.

Next is M2b, the waterfall for given decisions. I'm stopping here.
