# Review: M2b (the waterfall for given decisions)

Branch `m2b-waterfall`, the second of M2's five PRs. The engine can now pay out an exit value once the decisions are known: who converts and who exercises. Solving those decisions is M2c. This note also reports the search for exits with two stable answers, which you asked for before M2c. It needs four decisions from you before M2c starts.

## CI and permissions changes

- **`.github/workflows/` and `.claude/`:** no changes.
- **Not CI or permissions, but config:**
  - **`packages/engine/tsconfig.json`:** the engine's sources now import each other with `.ts` extensions, so Node 24 can run them directly and the payouts command needs no new dependency. Four compiler settings make that work and keep it safe: `allowImportingTsExtensions`, `rewriteRelativeImportExtensions`, `erasableSyntaxOnly` and `verbatimModuleSyntax`. It also now typechecks `scripts/`.
  - **Root `package.json`:** a new `payouts` script.

## What changed

- **`packages/engine/src/waterfall.ts`:** `prepare` and `payout`. Given which series convert and which option classes are exercised, `payout` does the following:
  - adds exercised options' strike cash to the proceeds
  - pays the seniority tiers top-down, sharing a shortfall within a tier by preference amount
  - shares the residual as common, holding a capped series at its cap
  - reports options net of strike
  - splits each security's total among its holders by shares

  It refuses decisions that can't happen: converting uncapped participating preferred, or splitting a conversion group. This one file is the whole waterfall.
- **`packages/engine/test/waterfall.test.ts`:** the M2b tests (below).
- **`packages/engine/scripts/payouts.ts`:** `pnpm payouts`, for checking by hand (below). It reads case files, so it isn't part of the engine package.
- **`reference/tools/stable_answers.py`:** the two-answer search (below).
- **`docs/ASSUMPTIONS.md`:**
  - C12 confirmed.
  - **C13:** saved files get a format version field (for M3).
  - **E15:** the plan to close its gap, if needed.
  - **E8:** records what the search found.
- **`notes/next-unlock.md`:** the list of fixes for the next `cases/` unlock, starting with Millrace's "within $1".
- **`errors.ts`:** a small rewrite so Node can run the sources directly. No behavior changed.

## How to check it by behavior

1. **Run it.** Everything should pass:
   ```bash
   pnpm install && pnpm test && pnpm test:reference
   ```
   That is 305 Vitest tests, 107 of them new.
2. **What the new tests do.** At every point `expected.json` reports, the engine runs the waterfall with the decisions recorded there. That's every listed exit value, plus every breakpoint at its exact value, for cases 1–7 and Millrace: 104 points and 637 payout lines in all. The tests check:
   - every line within $0.01
   - conservation: the lines add up to the exit value, and holder and class totals equal the sums of their lines
   - the common price per share, to six places

   **Rounded to the cent, all 637 engine amounts equal `expected.json` exactly.** The largest gap before rounding is $0.005, which is the rounding itself.
3. **Try the command.** With no flags at an exit value `expected.json` reports, it uses the recorded decisions and shows `expected.json`'s amounts alongside:
   ```bash
   pnpm payouts millrace 100000000
   ```
   ```bash
   pnpm payouts edge-07-option-strikes 30000000
   ```
   ```bash
   pnpm payouts edge-02-non-participating 20000000 --convert seed
   ```
   - **Millrace at $100M:** Ana Ortiz gets $9,750,989.67 and Cobalt $36,383,770.41, matching `expected.json`.
   - **Case 7 at $30M:** Founder A gets $20,220,000 and Employee D nets $1,422,000. Strike cash of $3,700,000 joins the proceeds, and common gets $3.37 a share.
   - **Case 2 at $20M, with Seed told to convert:** Seed gets 20%, $4,000,000.

## The two-answer search (before M2c)

`reference/tools/stable_answers.py` builds random cap tables under our rules and uses the reference's own method (every combination of decisions) to find every stable answer at 120 exit values each. Fixed seeds make every number below reproducible; it takes about four minutes.

**1. More than one stable answer: none under realistic terms.**
- **Volume:** 3,600 random cap tables with every cap above its preference, 432,000 exit values, and no exit value with two stable answers.
- **Why, in the simple case:** when a series converts, the common price moves partway toward that series' preference per share. So one conversion makes the others *less* inclined to convert. Series convert in order of their preference per share, and two can't each be "the one that converts".
- **The only two-answer case found** combines a cap *below* its own series' preference with a second cap equal to its preference. No real charter has that, and neither odd cap alone does it.
- **The E15 gap never appeared:** the two ends agreeing while another answer exists.
- **E8** now records all of this.

**2. No stable answer at all: it happens, and only with conversion groups.**
- **How often:** 137 exit values in the random search, every one in a cap table with a conversion group. In 2,614 cap tables *without* a group (313,680 exit values) there was never a missing answer, a second answer, or a cycle.
- **The reference refuses those exit values** ("no stable decision set"), and under E15 the engine would stop with an error.
- **A minimal example.** Series A and B must convert together by a vote of more than 50%. There are 500,000 options at $0.50. At $7.2M:
  1. With the group staying preferred and the options unexercised, Series B votes to convert and carries the vote.
  2. Once converted, common is worth $1.20, so the options exercise.
  3. With the options exercised, B now votes to stay. Its comparison holds the options exercised, so their $250,000 of strike cash would go to its unpaid preference.
  4. Staying makes common worthless, so the options stop exercising, and the cycle repeats.

  Step 3 is artificial: if the group stayed, nobody would exercise.

**3. E15's both-ends search can cycle even when an answer exists:** 5 exit values, all with a conversion group.

## Decisions needed before M2c

1. **Option exercise follows the common price.**
   - **The rule:** when a series or a group weighs converting, option exercise is re-settled under each choice. Options aren't separate decision-makers. E15 already says this for its combination check; this extends it everywhere.
   - **Evidence:** on 180,000 exit values in small group-and-options cap tables, the no-answer points drop from 339 to 0, and no answer changes where the reference's method has one.
   - **I'd record it as E16.**
2. **A conversion group decides first.**
   - **The rule:** for each of the group's two choices, everyone else settles. The group then votes (E11) on those two settled outcomes.
   - **Evidence:** on 131,760 exit values in cap tables with one group, it gives exactly one answer every time. That answer is the reference's wherever the reference has one, and there is an answer at the 99 exit values where the reference has none.
   - **Cases 6b and 6c are unaffected:** everything there is in the group.
   - **More than one group** needs an order. I'd refuse it with a clear error until a case needs it.
3. **Refuse a cap below its series' preference.** It's the one input that produced two stable answers, and it has no economic meaning. A cap equal to the preference would stay allowed. This would extend C12.
4. **Bring the reference onto the same rules in M2c.** It would keep its own method (trying every combination), so it can produce expected values wherever the engine gives an answer. `generate.py --check` would have to show that no locked value changes.

With 1 and 2, groups no longer take part in E15's both-ends search, which then runs only on series that aren't in a group. On cap tables without groups it never cycled. The stop-on-a-cycle rule stays as a safeguard.

## Open questions

1. **The four decisions above.**
2. **A case.** You asked me to propose a new case if two stable answers can exist. Under realistic terms the search found none, so I'm not proposing one. If you want the degenerate-cap example recorded anyway, it's in the script as `DEGENERATE_CAPS`, at $28,318,750. With decision 3 the engine would refuse it.

I'm stopping here. M2c starts after you merge and answer the decisions above.
