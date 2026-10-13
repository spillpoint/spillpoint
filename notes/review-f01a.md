# Review: f01a (the fund package: its spec, reference and cases)

Branch `f01a-fund-package`, from main. The first step of the fund workstream, for spillpoint-fund 0.1.0. No engine code yet.

Nothing in `packages/engine`, `apps/`, `reference/` or `cases/` changed: `git diff origin/main -- packages/engine apps reference cases` is empty.

## 1. What changed

### Where everything is (your answer during the step)

The brief put the cases in `cases/fund-*`. The engine's tests, the page's and spillpoint's reference all treat every folder there as an engine case:
- **The engine:** with the fund folders in, 15 engine test files failed on load.
- **Spillpoint's reference:** `reference/generate.py` tried to run them.

You chose to keep all of that untouched and put everything fund under `packages/fund`:

| What | Where |
|---|---|
| The package | `packages/fund`: `spillpoint-fund`, 0.0.0, private |
| The spec and assumptions | `packages/fund/docs/` |
| The reference | `packages/fund/reference/` |
| The cases | `packages/fund/cases/fund-01-one-call` … `fund-14-refused` |

The case lock covers the new folder in two places:
- **`cases-locked.yml`** now fails a PR that touches `packages/fund/cases/` without your label, as it does `cases/`.
- **`.claude/settings.json`** gets `Edit(packages/fund/cases/**)` in its deny list, as this PR's last commit, after the cases were written. Nothing else in that file changed.

### The package (`packages/fund`)

- **`package.json`:**
  - name `spillpoint-fund`, version 0.0.0, `"private": true`
  - decimal.js, TypeScript and Vitest at the engine's versions
  - `files` set now to `dist`, `README.md` and `LICENSE`, as the engine's, so a later publish carries only the build. `pnpm pack --dry-run` today lists only `package.json` and the root's `LICENSE`, which pnpm adds: no cases, reference, docs, source or tests.
  - no build script yet, since nothing ships
- **`src/decimal.ts`:** the 40-digit Decimal, configured exactly as the engine's (F17). `src/index.ts` exports it. It doesn't import `spillpoint`.
- **`test/cases.test.ts`:** 83 tests that guard the fund cases against themselves, with no engine code, as the engine's first case tests did.
  - **Every case:**
    - has its three files, naming the same case
    - has a point at every listed X, every breakpoint and the NAV point
    - lists its breakpoints in order with F15's codes
  - **Every point:**
    - adds up by tier, for X and for the fund to date
    - owes carry paid less entitlement, when positive
  - **Every refusal fixture** changes a real case and is refused with a kind, a term and a field.

### The spec and assumptions (`packages/fund/docs/`)

- **`SPEC.md`:** your spec in this repo's style.
  - F1 to F18 with their codes and defaults unchanged, the worked examples A, B and C, a list of the cases, and your decisions of 2026-10-12.
  - Each rule's "Later" items moved to ASSUMPTIONS.
  - The note about the outside checker's folder is dropped, since it's outside the repo.
- **`ASSUMPTIONS.md`:**
  - **F1 to F18** in one table, each with its default, whether it's a term, a toggle or fixed, and "Settled (S0)", marked "Jordan" where you decided it.
  - **FA1 to FA12:** the choices the spec doesn't settle (§3).
  - **A Later section:** each rule's later work.
  - **FC1 to FC8:** the case-file conventions.
  - **The published-material rule** (ILPA's model LPA, law-firm templates), the same as O12, at the top.

### The reference (`packages/fund/reference/`)

Python 3, standard library and `fractions` only. It's written from `SPEC.md` alone and doesn't import spillpoint's `reference/`.
- **`fund_ref/inputs.py`:** reading and refusing (F18), in FA2's order of checks.
- **`fund_ref/waterfall.py`:** the tiers, the running balances and the run on the fund's totals.
  - **The cash flows** are replayed in F4's order.
  - **The pref** accrues Actual/365 on unreturned capital (F6), and F12's hurdle pref beside it.
  - **X** is one more distribution on D (F14).
- **`fund_ref/breakpoints.py`:** breakpoints found by search, not by formula, so the engine's closed form will have something different to check against.
  - **The signature:** the tier X's last dollar is in; when final, also the totals' run's tier and the sign of carry paid less entitlement.
  - **The search:**
    1. Grid it.
    2. Bisect each change.
    3. Fit a line to every amount on each side and intersect them, for the exact point.
    4. Check that every amount is straight between breakpoints.
  - **The proof it's complete** is in the file's docstring and the README.
- **`generate.py`:** writes every `expected.json`; `--check` fails if one differs.
- **`tests/test_fund_ref.py`:** 23 tests with numbers small enough to check on paper.
  - **What they cover:**
    - the spec's examples A, B and C to the cent
    - the pref on a falling balance and on capital called on D
    - the hurdle balance's floor
    - a step reached before the carry tier starts
    - case 13's shape at a millionth of the size
    - the NAV point, and the refusals the fixtures don't cover
  - **60 random funds:** every breakpoint is found, and the clawback never rises (§4).

### The cases (`packages/fund/cases/`)

- **13 cases from `local/fund/cases.json`,** each with:
  - `inputs.json`: `{case, description, xs, fund}`, as written in `cases.json`
  - `expected.json` from the reference
  - a `DERIVATION.md` worked by hand
- **`fund-14-refused`:** the 15 refusals, one fixture each (`{base, about, change}`), with a derivation. Each fixture's `about` sentence is mine.

**How the hand work was checked against the reference:**
- **Every table cell:** a script, not committed, compared every cell of every derivation table with `expected.json`. That's 752 cells, and none differ.
- **Every point:** every point in `expected.json` appears in its derivation's tables. Where nothing was distributed before X, the fund to date equals X exactly.
- **The refusals:** the 15 refusals match `cases.json`'s expectations and the derivation's table.

No case contradicted the spec, and the reference and the hand work never disagreed.

### Also

- **The root `package.json`:** `pnpm test:reference` now runs the fund reference after spillpoint's, through a new `pnpm test:reference:fund`. So the release checklist's "what CI runs" still covers everything.
- **`pnpm-lock.yaml`** gains the new package's entry and nothing else.
- **`CLAUDE.md`:**
  - **A new section, "The fund workstream":**
    - the engine first, never two PRs open
    - private and off the page until its release step
    - no `spillpoint` import until engine 1.0
    - steps f01a, f01b…
    - everything fund under `packages/fund`
    - the fund cases' lock and how you lift it
    - the published-material rule
  - **"Repo layout"** gains one line for `packages/fund`.

## 2. CI and permissions (hard rule 9)

- **`.github/workflows/ci.yml`:** both Node jobs run the fund reference's unit tests and its `--check`.
  - **Node 22:** gains `actions/setup-python@v5` (3.12) to do it.
  - **The package's typecheck and tests** run in both jobs through the existing `pnpm typecheck` and `pnpm test`, which cover every workspace package. A comment says so.
- **`.github/workflows/cases-locked.yml`:** also covers `packages/fund/cases/`. The check matches `^(cases|packages/fund/cases)/`. **This PR adds the fund cases, so the check fails until you add the label,** as for any case step.
- **`.claude/settings.json`:** `"Edit(packages/fund/cases/**)"` added to `deny`, in the last commit. Nothing else changed.

## 3. Assumptions added (all New, in `packages/fund/docs/ASSUMPTIONS.md`)

| ID | Default |
|---|---|
| FA1 | The GP's catch-up counts as carry in the clawback test, on both sides: carry paid and entitlement. Case 11 turns on it. |
| FA2 | The order of checks for refusals. Unsupported terms first, then the fields in the spec's order, then the cash flows against each other and D. So carry of 100% with a full catch-up is `carry_rate_not_below_one`. |
| FA3 | null is the same as leaving an optional field out, except `carry`, where null is refused (`bad_number`). It could mean "none" or "the default 20%". |
| FA4 | `pref_met` names all the pref accrued to D, not just the part X pays. Case 9's says $2,159,342.47 where X pays $659,342.47. |
| FA5 | F12's "distributions" are what ran the tiers, net of the GP commitment's share. |
| FA6 | LPs reach a step at exactly its multiple. Their distributions count every tier: capital, pref, catch-up share and carry-tier share. |
| FA7 | Only a tier X pays into and goes past is a breakpoint. One already over before X (case 9's capital), one with nothing to pay, and the top step aren't. |
| FA8 | A change that bends nothing F15 reports isn't a breakpoint. Case 11 at its catch-up: carry paid less entitlement rises from below zero to exactly zero, owing nothing either side. |
| FA9 | A rising clawback isn't worded by F15; the reference stops if it sees one. In v1 none can happen (§4). |
| FA10 | NAV can be any amount from 0 up. The NAV point carries the entitlement and the clawback; a fund whose X isn't final lists no clawback breakpoints. |
| FA11 | `as_of` only sets D's default. |
| FA12 | Cash flows may be listed in any order. A distribution with a `kind` is refused. A refusal's path is the flow's place as listed. |
| FC1–FC8 | The case files' shapes: exact strings; folders and files; `expected.json`'s top level, points, breakpoints and reasons; reason wording; refusal fixtures; comparing to the cent. FC3 gives F16's paid-in and pref to D once per case, since they don't change with X. |

## 4. A finding: the clawback never rises as X grows (FA9)

In v1, as X grows, the clawback owed only holds or falls. So `clawback_starts` can't happen, and F15's four "falls" wordings cover every change.

**Why.** Both runs split the same total between LPs and GP, so something is owed exactly when the LPs to date have less than the run on the totals gives them. While that's true, X's run never gives the GP more of a dollar than the totals' run does:
- **X in capital or pref:** the GP gets nothing.
- **X in a carry step:** X's LPs have less, so the totals' run is at the same step or a higher one.
- **X in its catch-up:** X's capital is all back, so both runs have the same profit.
  - **The totals' run is past its pref.** Its hurdle balance is never more than unreturned capital, so its pref is never more than the running pref.
  - **So it's in its own catch-up,** at the same share, or past it. Past it, the GP has at least c of the profit there and less than c in X's run, so nothing is owed.

And where X's run does give the GP more (its catch-up, or a higher step), the LPs to date already have at least what the totals give them. That lasts until the two rates meet, so a clawback can't start.

**Checked.**
- **1,000 random funds,** run once here: 294 owed a clawback at X = 0, and none rose or started.
- **60 in CI:** they cover every kind of change, `falls_faster` and `falls_more_slowly` included.

`clawback_starts` stays in the spec and the code: it costs nothing, and later terms (interim tests, American carry) could make it happen.

## 5. Expected values, to the cent

Each case's breakpoints, then each point:
- what the GP commitment gets
- what the LPs get, all their tiers together
- what the GP gets: catch-up plus carry
- when final or at NAV, the clawback owed

Every tier, the fund to date and the clawback's working are in each case's `DERIVATION.md`.

### fund-01-one-call

One investment call, 20% carry, nothing else.

LPs' paid-in $5,000,000.00; X not final.

| Breakpoint X | Reasons |
|---:|---|
| 5,000,000.00 | `capital_returned`: LPs have their $5,000,000 of paid-in capital back |

| X | Tags | LPs | GP catch-up + carry |
|---:|---|---:|---:|
| 2,000,000.00 | listed | 2,000,000.00 | 0.00 |
| 5,000,000.00 | listed, breakpoint | 5,000,000.00 | 0.00 |
| 12,500,000.00 | listed | 11,000,000.00 | 1,500,000.00 |

### fund-02-fees-as-capital

Investment, fee and expense calls all count as capital; an interim distribution returns part of it.

LPs' paid-in $6,000,000.00; X not final.

| Breakpoint X | Reasons |
|---:|---|
| 4,500,000.00 | `capital_returned`: LPs have their $6,000,000 of paid-in capital back |

| X | Tags | LPs | GP catch-up + carry |
|---:|---|---:|---:|
| 1,000,000.00 | listed | 1,000,000.00 | 0.00 |
| 4,500,000.00 | listed, breakpoint | 4,500,000.00 | 0.00 |
| 10,000,000.00 | listed | 8,900,000.00 | 1,100,000.00 |

### fund-03-gp-commitment

A 2% GP commitment, fee-free and carry-free (the defaults): it pays its share of investments and expenses, none of the fees.

LPs' paid-in $10,449,000.00; GP commitment's paid-in $201,000.00; X not final.

| Breakpoint X | Reasons |
|---:|---|
| 10,662,244.90 | `capital_returned`: LPs have their $10,449,000 of paid-in capital back |

| X | Tags | GP commitment | LPs | GP catch-up + carry |
|---:|---|---:|---:|---:|
| 5,000,000.00 | listed | 100,000.00 | 4,900,000.00 | 0.00 |
| 10,662,244.90 | breakpoint | 213,244.90 | 10,449,000.00 | 0.00 |
| 20,000,000.00 | listed | 400,000.00 | 17,769,800.00 | 1,830,200.00 |

### fund-04-gp-commitment-pays-fees

fund-03 with the GP commitment paying fees and not expenses.

LPs' paid-in $10,438,000.00; GP commitment's paid-in $212,000.00; X not final.

| Breakpoint X | Reasons |
|---:|---|
| 10,651,020.41 | `capital_returned`: LPs have their $10,438,000 of paid-in capital back |

| X | Tags | GP commitment | LPs | GP catch-up + carry |
|---:|---|---:|---:|---:|
| 5,000,000.00 | listed | 100,000.00 | 4,900,000.00 | 0.00 |
| 10,651,020.41 | breakpoint | 213,020.41 | 10,438,000.00 | 0.00 |
| 20,000,000.00 | listed | 400,000.00 | 17,767,600.00 | 1,832,400.00 |

### fund-05-hard-hurdle

An 8% simple pref with no catch-up: carry only on profit above the pref.

LPs' paid-in $10,000,000.00; pref accrued to D $2,400,000.00; X not final.

| Breakpoint X | Reasons |
|---:|---|
| 10,000,000.00 | `capital_returned`: LPs have their $10,000,000 of paid-in capital back |
| 12,400,000.00 | `pref_met`: LPs have their 8% pref, $2,400,000 |

| X | Tags | LPs | GP catch-up + carry |
|---:|---|---:|---:|
| 10,000,000.00 | breakpoint | 10,000,000.00 | 0.00 |
| 11,000,000.00 | listed | 11,000,000.00 | 0.00 |
| 12,400,000.00 | listed, breakpoint | 12,400,000.00 | 0.00 |
| 20,000,000.00 | listed | 18,480,000.00 | 1,520,000.00 |

### fund-06-full-catch-up

Spec example B: 8% pref over 1,827 days (two leap days), full catch-up.

LPs' paid-in $10,000,000.00; pref accrued to D $4,004,383.56; X not final.

| Breakpoint X | Reasons |
|---:|---|
| 10,000,000.00 | `capital_returned`: LPs have their $10,000,000 of paid-in capital back |
| 14,004,383.56 | `pref_met`: LPs have their 8% pref, $4,004,383.56 |
| 15,005,479.45 | `catch_up_done`: the GP has 20% of the profit |

| X | Tags | LPs | GP catch-up + carry |
|---:|---|---:|---:|
| 10,000,000.00 | breakpoint | 10,000,000.00 | 0.00 |
| 12,000,000.00 | listed | 12,000,000.00 | 0.00 |
| 14,004,383.56 | breakpoint | 14,004,383.56 | 0.00 |
| 14,500,000.00 | listed | 14,004,383.56 | 495,616.44 |
| 15,005,479.45 | breakpoint | 14,004,383.56 | 1,001,095.89 |
| 20,000,000.00 | listed | 18,000,000.00 | 2,000,000.00 |

### fund-07-partial-catch-up

fund-05 with a 50/50 catch-up.

LPs' paid-in $10,000,000.00; pref accrued to D $2,400,000.00; X not final.

| Breakpoint X | Reasons |
|---:|---|
| 10,000,000.00 | `capital_returned`: LPs have their $10,000,000 of paid-in capital back |
| 12,400,000.00 | `pref_met`: LPs have their 8% pref, $2,400,000 |
| 14,000,000.00 | `catch_up_done`: the GP has 20% of the profit |

| X | Tags | LPs | GP catch-up + carry |
|---:|---|---:|---:|
| 10,000,000.00 | breakpoint | 10,000,000.00 | 0.00 |
| 12,400,000.00 | breakpoint | 12,400,000.00 | 0.00 |
| 13,000,000.00 | listed | 12,700,000.00 | 300,000.00 |
| 14,000,000.00 | listed, breakpoint | 13,200,000.00 | 800,000.00 |
| 18,000,000.00 | listed | 16,400,000.00 | 1,600,000.00 |

### fund-08-carry-steps

Spec example A plus a third step: a fee-free 1% GP commitment; carry 20%, 25% from 3x, 30% from 5x. NAV given.

LPs' paid-in $10,890,000.00; GP commitment's paid-in $100,000.00; X not final.

| Breakpoint X | Reasons |
|---:|---|
| 7,000,000.00 | `capital_returned`: LPs have their $10,890,000 of paid-in capital back |
| 34,500,000.00 | `carry_step`: LPs reach 3.0x: carry is 25% from here |
| 63,833,333.33 | `carry_step`: LPs reach 5.0x: carry is 30% from here |

| X | Tags | GP commitment | LPs | GP catch-up + carry | Clawback owed |
|---:|---|---:|---:|---:|---:|
| 7,000,000.00 | breakpoint | 70,000.00 | 6,930,000.00 | 0.00 | — |
| 20,000,000.00 | listed | 200,000.00 | 17,226,000.00 | 2,574,000.00 | — |
| 34,500,000.00 | listed, breakpoint | 345,000.00 | 28,710,000.00 | 5,445,000.00 | — |
| 40,000,000.00 | nav | 400,000.00 | 32,793,750.00 | 6,806,250.00 | 0.00 |
| 50,000,000.00 | listed | 500,000.00 | 40,218,750.00 | 9,281,250.00 | — |
| 63,833,333.33 | breakpoint | 638,333.33 | 50,490,000.00 | 12,705,000.00 | — |
| 80,000,000.00 | listed | 800,000.00 | 61,693,500.00 | 17,506,500.00 | — |

### fund-09-interim-pref

8% pref and full catch-up with two interim distributions and a fee call between them: the pref accrues on a balance that rises and falls.

LPs' paid-in $10,500,000.00; pref accrued to D $2,159,342.47; X not final.

| Breakpoint X | Reasons |
|---:|---|
| 659,342.47 | `pref_met`: LPs have their 8% pref, $2,159,342.47 |
| 1,199,178.08 | `catch_up_done`: the GP has 20% of the profit |

| X | Tags | LPs | GP catch-up + carry |
|---:|---|---:|---:|
| 500,000.00 | listed | 500,000.00 | 0.00 |
| 659,342.47 | breakpoint | 659,342.47 | 0.00 |
| 1,000,000.00 | listed | 659,342.47 | 340,657.53 |
| 1,199,178.08 | breakpoint | 659,342.47 | 539,835.62 |
| 3,000,000.00 | listed | 2,100,000.00 | 900,000.00 |

### fund-10-clawback

Spec example C: carry paid early, then a written-off follow-on. The last distribution trues it up.

LPs' paid-in $12,000,000.00; X final.

| Breakpoint X | Reasons |
|---:|---|
| 2,000,000.00 | `capital_returned`: LPs have their $12,000,000 of paid-in capital back; `clawback_cleared`: from here the GP has earned all the carry it was paid earlier |

| X | Tags | LPs | GP catch-up + carry | Clawback owed |
|---:|---|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 400,000.00 |
| 1,000,000.00 | listed, nav | 1,000,000.00 | 0.00 | 200,000.00 |
| 2,000,000.00 | listed, breakpoint | 2,000,000.00 | 0.00 | 0.00 |
| 5,000,000.00 | listed | 4,400,000.00 | 600,000.00 | 0.00 |

### fund-11-clawback-pref

A clawback with a pref and full catch-up: the fund-total run owes no pref on the later call, since earlier gains cover it.

LPs' paid-in $15,000,000.00; pref accrued to D $2,403,287.67; pref on the fund's totals $1,602,191.78; X final.

| Breakpoint X | Reasons |
|---:|---|
| 5,000,000.00 | `capital_returned`: LPs have their $15,000,000 of paid-in capital back; `clawback_cleared`: from here the GP has earned all the carry it was paid earlier |
| 5,801,095.89 | `pref_met`: LPs have their 8% pref, $2,403,287.67 |
| 6,001,369.86 | `catch_up_done`: the GP has 20% of the profit |

| X | Tags | LPs | GP catch-up + carry | Clawback owed |
|---:|---|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 1,000,000.00 |
| 2,000,000.00 | listed | 2,000,000.00 | 0.00 | 600,000.00 |
| 5,000,000.00 | listed, breakpoint | 5,000,000.00 | 0.00 | 0.00 |
| 5,801,095.89 | breakpoint | 5,801,095.89 | 0.00 | 0.00 |
| 5,900,000.00 | listed | 5,801,095.89 | 98,904.11 | 0.00 |
| 6,001,369.86 | breakpoint | 5,801,095.89 | 200,273.97 | 0.00 |
| 8,000,000.00 | listed | 7,400,000.00 | 600,000.00 | 0.00 |

### fund-12-spv

An SPV: one company, one investment and a setup fee, 20% carry, the exit as its final distribution. NAV given.

LPs' paid-in $2,040,000.00; X final.

| Breakpoint X | Reasons |
|---:|---|
| 2,040,000.00 | `capital_returned`: LPs have their $2,040,000 of paid-in capital back |

| X | Tags | LPs | GP catch-up + carry | Clawback owed |
|---:|---|---:|---:|---:|
| 1,000,000.00 | listed | 1,000,000.00 | 0.00 | 0.00 |
| 2,040,000.00 | listed, breakpoint | 2,040,000.00 | 0.00 | 0.00 |
| 6,000,000.00 | nav | 5,208,000.00 | 792,000.00 | 0.00 |
| 10,000,000.00 | listed | 8,408,000.00 | 1,592,000.00 | 0.00 |

### fund-13-clawback-steps

A late call against a carry step: the step was reached on the day's paid-in, which the later call raises. Final; the clawback falls, holds, falls again and then holds for good.

LPs' paid-in $20,000,000.00; X final.

| Breakpoint X | Reasons |
|---:|---|
| 10,000,000.00 | `capital_returned`: LPs have their $20,000,000 of paid-in capital back; `clawback_changes`: the clawback owed stops falling |
| 15,000,000.00 | `clawback_changes`: the clawback owed starts to fall: on the fund's totals, LPs reach 2.0x: carry is 30% from here |
| 15,937,500.00 | `carry_step`: LPs reach 2.0x: carry is 30% from here; `clawback_changes`: the clawback owed stops falling |

| X | Tags | LPs | GP catch-up + carry | Clawback owed |
|---:|---|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 2,750,000.00 |
| 10,000,000.00 | listed, breakpoint | 10,000,000.00 | 0.00 | 750,000.00 |
| 12,000,000.00 | listed | 11,600,000.00 | 400,000.00 | 750,000.00 |
| 15,000,000.00 | listed, breakpoint | 14,000,000.00 | 1,000,000.00 | 750,000.00 |
| 15,937,500.00 | listed, breakpoint | 14,750,000.00 | 1,187,500.00 | 656,250.00 |
| 25,000,000.00 | listed | 21,093,750.00 | 3,906,250.00 | 656,250.00 |

### fund-14-refused

| Fixture | Kind | Term | Field |
|---|---|---|---|
| unknown-term | unsupported | `hurdle_irr` | `terms.hurdle_irr` |
| compounded-pref | unsupported | `compounded_pref` | `terms.pref.compounding` |
| carry-rate-one | input | `carry_rate_not_below_one` | `terms.carry` |
| steps-rates-fall | input | `steps_out_of_order` | `terms.carry.steps[1]` |
| steps-multiple-one | input | `steps_out_of_order` | `terms.carry.steps[1]` |
| gp-commitment-whole | input | `gp_commitment_not_below_one` | `terms.gp_commitment.share` |
| catch-up-without-pref | input | `catch_up_without_pref` | `terms.catch_up` |
| catch-up-share-at-carry | input | `catch_up_share_not_above_carry` | `terms.catch_up.gp_share` |
| negative-amount | input | `bad_number` | `cash_flows[0].amount` |
| amount-not-a-string | input | `bad_number` | `cash_flows[0].amount` |
| bad-date | input | `bad_date` | `cash_flows[0].date` |
| bad-kind | input | `bad_field` | `cash_flows[0].kind` |
| no-calls | input | `no_calls` | `cash_flows` |
| distribution-first | input | `distribution_before_call` | `cash_flows[0]` |
| flow-after-d | input | `cash_flow_after_distribution_date` | `cash_flows[0]` |

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   The engine's 3,115 tests and the page's 673 are unchanged. The fund package adds 83. The fund reference adds 23 unit tests and a `--check` of all 14 cases.
2. **Hold the spec's examples against the tables above:**
   - **A** is fund-08 without its 5x step: capital back at $7,000,000; 3.0x at $34,500,000, with $5,445,000 of carry and $345,000 to the GP commitment.
   - **B** is fund-06: $10,000,000, $14,004,383.56 and $15,005,479.45, the GP at $1,001,095.89.
   - **C** is fund-10: owed $400,000, $200,000 and $0 at X = 0, $1,000,000 and $2,000,000, with capital back and the clawback cleared together at $2,000,000.
3. **Case 13, the clawback that never clears:** it falls from $2,750,000 to $750,000, holds, falls to $656,250 between $15,000,000 and $15,937,500, then holds for good. The middle breakpoint names the totals' run as the cause.
4. **Nothing outside the fund package moved:**

   ```bash
   git diff --stat origin/main -- packages/engine apps reference cases
   ```

   It prints nothing.
5. **What a publish would carry:** from `packages/fund`, `pnpm pack --dry-run` lists only `package.json` and `LICENSE`.
6. **Have the new cases re-derived** independently, from `packages/fund/docs/SPEC.md` and each case's `inputs.json`, before adding the label.

## Open questions

1. **FA1:** is the catch-up carry for the clawback, on both sides? I think it must be: F12's entitlement is what the tiers give the GP, catch-up included. Case 11's $1,000,000 owed at X = 0 depends on it.
2. **FA4:** should `pref_met` name all the pref to D, as now, or only the part X pays? The spec's example has one distribution, so both read the same there.
3. **FA9:** keep `clawback_starts` in F15 though v1 can't produce it, or note in the spec that it waits for later terms?
4. **FC3:** F16's paid-in and pref to D are given once per case, not at every X. Fine, or repeat them at each point?
5. **`files`:** it lists `README.md` and `LICENSE` as the engine's does, though neither exists in `packages/fund` yet. Fine for now?
