# Review: 11d (the ledger's rules, and Quillfern)

Branch `11d-ledger-rules-and-quillfern`, from main at `13da1cd` (#150 merged, no PR open).
- **The cases lock is lifted for this step, by you.** One new folder, `cases/ledger-01-quillfern`; nothing else under `cases/` changed. It needs the cases label before CI passes.
- **Your local change to `.claude/settings.json`** (the `Edit(cases/**)` entry taken out) isn't committed. No change to `.github/workflows/` or `.claude/` is in this branch.
- **No engine or page code changed.** Only five tests and scripts that list case folders changed, to leave `ledger-` folders out (item 3).

## What changed

1. **The rules:**
   - **`docs/SPEC.md`:** a section, "The ledger (2.0)": what a ledger is, lots, the plan's pool, the events between rounds, a round as recorded and its check, warnings not refusals, movements, and the case.
   - **`docs/ASSUMPTIONS.md`:** a section, "The ledger (2.0)", L1 to L22. L1 to L20 are the plan's (section 6), with their fields settled; L21 and L22 are new, below. Also C21, the ledger case folder.
2. **`cases/ledger-01-quillfern`:**
   - **`inputs.json`:** Quillfern as a ledger, 18 dated events, with the company, its ten holders and its plan.
   - **`expected.json`:** for each event, the cap table after it, what it moved lot by lot, the pool's change, and its warnings. Two warnings in all, the plan's two.
   - **`DERIVATION.md`:** all of it by hand, event by event, with the pool, the two rounds' checks, why each other warning doesn't apply, and the last table against edge case 25's.
   - **The last table equals edge case 25's cap table,** in its order too.
3. **The case runners leave `ledger-` folders out until 11h,** one line each. The plan named two; five places list case folders, and each would have tried to read the ledger as a round case:
   - `packages/engine/test/cases.test.ts`, the engine's runner
   - `reference/generate.py`, the reference's
   - `packages/engine/test/support/cases.ts`, the list the engine's other case tests share
   - `reference/tests/test_start.py`, the reference's split test
   - `apps/dashboard/test/rounds-draft.test.ts`, the page's editor test
4. **ASSUMPTIONS' Later list:** the engine reporting both of a SAFE's or note's prices at a round, so the page stops keeping its own copy of the formula (from 11c).
5. **`CLAUDE.md`:** "Where things stand" has 11d and 11e next. The repo layout's line on `cases/` mentions ledger cases.

## What to look at first

1. **The ledger's input, settled here, so 11e's cases and 11h's engine build on it.** Every field is in L1 to L22. In Quillfern's case:
   - **Existing events** keep their shape, with `lot` on each line (`cs-a1`, `opt-c1`). The lot ids are OCF case 12's security ids, so each can be followed there.
   - **New events:** `split` (`"ratio": "2"`), `plan_increase` (`"shares_reserved"`), `cancel`, `exercise` and `transfer` (`"new_lot"`), `reprice` and `repurchase`.
   - **`recorded_round`:** the series with `authorized_shares`, `price_per_share`, `purchases` with their shares, `conversions` with their shares and series, `seniority`, `plan_shares_reserved` and `conversion_prices`.
2. **Which holders a table lists (L21, new).** A table after an event lists the holders holding something after it, as an import leaves one out (O3). That's what makes the last table equal edge case 25's: Employee F, granted then cancelled, holds nothing at the end.
   - **The other way:** list every holder in every table, as `buildCapTables` does. Then the last table equals edge case 25's but for F, listed with nothing.
   - **What it costs:** 11h's check that every round case read as a ledger gives `buildCapTables`' tables compares positions, classes and the pool, not holders where some hold nothing yet.
   - **An option or warrant class** is listed while something is outstanding in it. So D's repricing takes the $0.40 class out, as edge case 25 has it.
3. **What an event moved (L22, new).**
   - **For each lot it changed:** the signed change and the lot's shares after. A repricing is two lines, out of one class and into another; a split is a line for every lot.
   - **A SAFE:** its amount, out at conversion.
   - **The pool's change:** on the event.
   - **Why it matters:** this is what 11l's holder history and 11m's export read.
4. **The two warnings, word for word,** since the case pins them:
   - **The Seed:** "Angel S's 260,416 Seed Preferred, from its SAFE, were issued at $0.96 a share but carry Seed Preferred's $1.20 preference. A SAFE's shares often go into a series of their own, with a preference at the price they converted at. If these did, record that series in the round."
   - **The Series A:** "Seed Preferred's conversion price is recorded as falling from $1.20 to $1.00 in this round, but Seed Preferred has no anti-dilution recorded. A conversion price usually changes in a round only under the series' anti-dilution. If its charter gives it some, record it."
   - **The rule they follow (L15):** what was entered, what usually holds, what to record. No "must", "invalid", "illegal" or "you should".
5. **Where the check stops and those two warnings start (L14).** A recorded round's check compares counts and prices. Two things the plan names as warnings of their own aren't `recorded_differs`:
   - **A changed conversion price:** for a series with no anti-dilution, its recorded change is `conversion_price_without_anti_dilution`.
   - **The series a conversion goes into:** it's as recorded, and `conversion_preference_above_price` when its preference per share is above the conversion's price.

   So the Seed's SAFE going into the Seed, not "Seed Preferred (from SAFEs)", isn't a difference. Its preference is the warning.
6. **The plan increases are inside the rounds** (`plan_shares_reserved`), where OCF has them as their own adjustments on the same date. That exercises the field. A separate `plan_increase` just before each round would give the same tables, with one more table between.
7. **Rules I added past the plan,** each New in ASSUMPTIONS:
   - **Default lot ids** for lines without one (L3): `<event>:<holder>`, then `:2`; a worked-out round's conversion as `<event>:<SAFE or note>`; a starting table's position as `<event>:<holder>:<class>`.
   - **`under_plan` on an `issue` line** (L4), for restricted stock: plan stock, as an exercise's lot is.
   - **Refusals:** `create_pool` beside `plan_increase`; a cancellation or plan-stock repurchase with no plan (whether shares go back would be a guess); a split with plan shares reserved (L10); a plan's total going down (L4).
   - **`over_authorized`'s counts** (L16), and **a SAFE or note transferring whole** (L9).
   - **L19's last four:** a warrant's repricing, authorized share changes, a plan's total going down, and the splits L10 refuses.

## How to check it by behavior

1. **Re-derive the case** from `DERIVATION.md`, as you have new cases re-derived. Every number in `expected.json` is in its tables. I also checked my own working with a throwaway script, not committed and not the reference: it replays the 18 events lot by lot. It agrees with every table, movement and pool change, and confirms each recorded count is what the stated price gives.
2. **The last table is edge case 25's:**

   ```bash
   python3 -c "import json; a=json.load(open('cases/ledger-01-quillfern/expected.json'))['cap_tables'][-1]['cap_table']; b=json.load(open('cases/edge-25-ocf-ledger/inputs.json'))['exit']['cap_table']; print(a == b)"
   ```

   It prints `True`.
3. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   I got:
   - 3,938 engine tests
   - 836 page tests
   - 2,115 fund tests, 13 skipped
   - 838 fund page tests
   - the reference's 79 unit tests, and all 86 exit and round cases matching it
   - the fund reference's 125 unit tests, and its 41 cases

   Every count is as before: the ledger case is left out of every runner until 11h.
4. **Nothing else under `cases/` changed:**

   ```bash
   git diff --stat main -- cases/
   ```

   It lists only `cases/ledger-01-quillfern`'s three files.

## Assumptions added

- **L1 to L22,** in a new section, "The ledger (2.0)": L1 to L20 as planned, with their fields; L21 and L22 new. Each says Agreed for what the plan settled and New for what I added.
- **C21:** the ledger case folder.
- **The Later list:** the engine reporting both of a SAFE's or note's prices at a round.

## Decisions for you to check

1. **Which holders a table lists** (look-first 2): those holding something (L21), or every holder.
2. **Movements' shape** (look-first 3).
3. **The two warnings' words** (look-first 4).
4. **The check's boundaries** (look-first 5).
5. **The rules added past the plan** (look-first 7).

## Next

11e, refusals and warnings: `ledger-02-refused` and `ledger-03-warnings`, each a small change to Quillfern's ledger for each refusal and warning, worked by hand. It lifts the lock again. I'm stopping here.
