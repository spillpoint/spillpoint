# Review: f01e (the naming review, the LP multiple, Stable from 0.1.0, cases 15 and 16)

Branch `f01e-fund-naming-review`, from main after #100. One PR.
- **Unchanged:** nothing in `packages/engine`, `apps/`, `cases/` or `reference/`.
- **CI and permissions:** no change to `.github/` or `.claude/`. `.claude/settings.json`, where you lifted the fund cases' lock locally, isn't committed.
- **This PR adds two fund cases,** so the cases-locked check fails until you add the cases label.

## 1. The first commit: the plan follows your answers

`notes/plan-fund-page.md`:
- **The app:** `apps/fund`, package `@spillpoint/fund-page`. It's live with 0.1.0, with no Worker at first.
- **Amounts:** to the cent, with the line under the table saying why.
- **The examples:** cases 8, 13 and 12. The headline is neutral, the LP multiple comes from the engine, and the footer links to the page, titled "spillpoint: fund waterfall".
- **The steps,** renumbered:
  - f01e, the naming review
  - f01f to f01m, the page, with pasting from a spreadsheet as f01k, right after the table
  - f01n, the release

  Each page step has what you check, with numbers from the cases.
- **Your answers** are at the end.

## 2. The naming review

Every public name in `packages/fund/src`. **Nothing is published, so there are no aliases:** a renamed name is simply gone. Where the fund and the engine name the same idea, the engine's name is used, unless there's a reason not to.

### Functions and the option

| Name | Verdict | Why |
|---|---|---|
| `readFund(input)` | keep | The engine's readers are `read` + what's read: `readExit`, `readInputs`, `readCapTable`. |
| `splitAt(fund, x, { final })` | keep | The engine has no same idea. Its `payout` takes decisions, and `solve` an exit value. The spec says X "splits between the LPs and the GP" (F16), and `final` is the input's own field (F12). |
| `splitAtNav(fund)` | keep | F14's NAV point, by name. It's final by definition, so a caller (the page's NAV button) needn't know to pass `final`. Returns null without a NAV. |
| `findBreakpoints(fund)` | keep | The engine's name. It takes no range: every fund breakpoint is above 0, and there are finitely many. |
| `D` | keep | The engine's name, the same 40-digit clone. |
| `toCents(amount)` | keep | The engine's name for the same idea. It rounds to 20 places first (FA14), which the engine's doesn't, so the fund's shows an exact half cent as exact math does. |

### The error

| Name | Verdict | Why |
|---|---|---|
| `FundRefusal` | keep | One class for every refusal, as the engine's `ImportRefusal` is for imports. Not an `InputError`: its kinds include `unsupported`. |
| `.kind`: `"unsupported"` or `"input"` | keep | F18's kinds, settled with you. |
| `.term` | keep | The engine's word, on `ImportRefusal` and `UnsupportedTermError`. |
| `.field` | **→ `.path`** | The engine's `InputError` and `UnsupportedTermError` call the place in the input `path`. The case files keep `field` (FC7), as case files keep their own names; FC7 now says so. |
| type `RefusalKind` | keep | |
| type `InputTerm` | keep, now from `stable-names.ts` | Its 13 values are F18's. |
| type `UnsupportedTerm` | **new** | `"compounded_pref"`: the one unsupported term with its own name. Any other is the key itself. |

### The fund

| Name | Verdict | Why |
|---|---|---|
| `Fund` | keep the name; **restructure** | It mirrors the input now, camelCase, as the engine's readers mirror theirs (`ExitInput`'s `capTable`, `range`). |
| `Fund.carry`, `.prefRate`, `.catchUpShare`, `.gpCommitment` | **→ `Fund.terms`:** `carry`, `pref` (`{ rate }` or null), `catchUp` (`{ gpShare }` or null), `gpCommitment` | Flattened, a refusal's path didn't lead anywhere: `terms.catch_up.gp_share` had to become `catchUpShare` by hand. Nested, it's `terms.catchUp.gpShare`, the same place in camelCase. The page maps a refusal to its field this way. |
| type `FundTerms` | **new** | The type of `Fund.terms`. |
| `Fund.asOf`, `.cashFlows`, `.distributionDate`, `.final`, `.nav` | keep | The input's own fields, camelCase. `distributionDate` keeps the input's word, not "D". |
| type `CarryStep`: `rate`, `fromLpMultiple` | keep | The input's step, camelCase. |
| type `GpCommitment`: `share`, `paysFees`, `paysExpenses` | keep | The input's, camelCase. |
| type `CashFlow`: `index`, `date`, `type`, `kind`, `amount` | keep | `index` is its place as listed, which a refusal's path names (FA12). |
| type `CallKind` | keep | |

### The split

| Name | Verdict | Why |
|---|---|---|
| type `Split` | keep | |
| `Split.x` | keep | The spec's X throughout (F14, F15). The engine's `exitValue` names a sale's price, a different axis, so it isn't borrowed. |
| `.distribution`, `.toDate` | keep | F16's "this distribution and the fund to date". |
| `.lpsPaidIn`, `.gpCommitmentPaidIn` | keep | F16's words. |
| `.prefToD` | **→ `.prefAccrued`** | F16's "the pref accrued to D". "prefToD" read as "pref to D", with nothing saying what of it. The doc comment says "to D, paid or not". |
| `.lpMultiple` | **new** (FA16) | F10's LP multiple, X included. `lp` singular, as F10's "the LP multiple" and the `carry_step` reason's `lpMultiple`. |
| `.clawback` | keep | |
| type `Tiers`: `amount`, `gpCommitment`, `lps`, `gp` | keep | |
| `lps`: `capital`, `pref`, `catchUp`, `carryTier`, `total` | keep | `carryTier`, not `carry`: the LPs' share of the carry tier isn't carry. |
| `gp`: `catchUp`, `carry` (by step), `total` | keep | |
| type `StepCarry`: `rate`, `fromLpMultiple`, `amount` | keep | The GP's carry at one step, with the step's own fields. |
| type `Clawback`: `carryPaid`, `entitlement`, `owed`, `prefOnFundTotals` | keep | F12's words. `prefOnFundTotals` matches FC3's `pref_on_fund_totals`. |

### Breakpoints and reasons

| Name | Verdict | Why |
|---|---|---|
| type `Breakpoint`: `x`, `reasons` | keep | The engine's `Breakpoint` has `exitValue`, a different axis, as above. |
| type `Reason`, its fields `code`, `text`, `amount`, `rate`, `carry`, `lpMultiple`, `change`, `fundTotals` | keep | FC5's fields, camelCase. `fundTotals` is null when X's own tier is the cause. |
| types `ReasonCode`, `TierReasonCode`, `ClawbackChange` | keep, now from `stable-names.ts` | The engine's `ReasonCode` for the same idea. |

**Pinned:** `api.test.ts` now pins these field names, each shape's keys, as well as the seven exports. A rename after 0.1.0 is then on purpose.

## 3. The LPs' net multiple in the split (FA16)

**What it is:** `split.lpMultiple` = the LPs' distributions to date, X's included, after carry, ÷ their paid-in to date (F10). The page shows it and does no fund arithmetic of its own.

**Tested at every point of every case,** all 15 run cases:
- times the paid-in, it is the LPs' to date, within 10⁻²⁵
- times the case's paid-in, it gives the case's LP total to date, to the cent

The case files don't record it (FC4 unchanged), so no case is edited for it.

## 4. Stable from 0.1.0

**`packages/fund/docs/STABLE.md`,** like the engine README's "Stable from 1.0":
- `FundRefusal`'s kinds
- its 13 input terms
- its one named unsupported term (`compounded_pref`), and the rule that any other is the key itself
- the 7 reason codes and their fields
- the 4 clawback changes
- FC6's wordings: each reason's, each change's words, and the totals' four tiers, blanks marked `{amount}`, `{rate}`, `{carry}`, `{multiple}`, `{change}`, `{tier}`

**`src/stable-names.ts`** is the one place each comes from.
- **Every refusal and reason takes its types,** and every reason's text is built from its `WORDINGS`, `CHANGE_WORDS` and `TOTALS_WORDINGS`.
- **The compiler checks** that `Reason`'s codes and the list are the same set, both ways.

**`stable-names.test.ts`:**
- **STABLE.md's lists** equal the engine's, and its wordings equal the engine's templates, blanks and all.
- **Refusals** are made only in `errors.ts`'s two helpers: `refuse` takes an `InputTerm`; `unsupported` takes `compounded_pref` or the key.
- **A reason's words** appear in no source file but `stable-names.ts`, comments aside.
- **Every reason** at every breakpoint of every case, and of 300 seeded random funds, has a listed code, change and cause, and text matching a listed wording.
- **The random funds** reach every tier reason, the clearing, and three of the four changes.
- **Every refusal fixture** is refused with a listed term, or an unsupported key named by itself.

**Checked to fail:**
- **Taking a code off the list** is a compile error.
- **Writing a reason's text** outside `stable-names.ts` fails three tests.

**One wording change came with it:** the rising-clawback guard's message now says "the clawback rises", not "the clawback owed rises". It isn't a reason, and shouldn't share a reason's words.

## 5. Cases 15 and 16

**Why two cases, not one.** One fund can't show both wordings:
- **For the totals' capital to bend the clawback,** the next tier must change the GP's rate. With a pref, the next tier is the pref, at 0 like capital.
- **So "LPs have their capital back"** needs a fund with no pref, or one whose totals' pref is zero.
- **"The GP has 20% of the profit"** needs a pref, for a catch-up to exist, and a totals' pref above zero.

**fund-15-clawback-capital:** no pref, flat 20%. $10M called, $16M back, $10M called late.
- **At X = 0** the totals' run is $4M short of capital, so the clawback holds at $1.2M until it isn't.

**fund-16-clawback-catch-up:** an 8% pref and full catch-up. $10M called, $20M back, $10M called late, every pref period a whole non-leap year.
- **Its breakpoints:**
  - the totals' run reaches its pref at $800,000: "starts to fall: on the fund's totals, LPs have their pref"
  - and its catch-up at $1,000,000: "falls more slowly: on the fund's totals, the GP has 20% of the profit"
- **It also pins** the pref wording and `falls_more_slowly`, which no case had.
- **The totals' capital tier ends exactly at X = 0,** which isn't a breakpoint (F15, above 0): a check of that edge too.

**FC6 now says which case pins which wording:** 15 the capital, 16 the pref and catch-up, 13 the step.

**How they were made.** The reference wrote both `expected.json` files. I worked both `DERIVATION.md` files by hand; a script compared every table cell with `expected.json`, 331 cells, and none differ. All 15 cases' derivations still agree with the reference: 1,083 cells.

**How the files got there.** This session still refused the Write tool in `packages/fund/cases/`. That was the deny it loaded before you lifted the lock. So:
- **`inputs.json`** was written by a script.
- **`expected.json`** was written by the reference.
- **The two `DERIVATION.md` files** were written in my scratch folder, checked there, and copied in byte for byte with `cp`, as you said.

Their sha256, the same in both places:

| File | sha256, scratch folder and case folder |
|---|---|
| `fund-15-clawback-capital/DERIVATION.md` | `6162e5ebc21aaeb7f08771b17453fd0164b5b1a6d145e64dc72ed36c850bb834` |
| `fund-16-clawback-catch-up/DERIVATION.md` | `35e792d3ba94aec8d5a81b98a3dc5685920029854e4f001fbb0fb0a9e198e61b` |

### Expected values, to the cent

#### fund-15-clawback-capital

A late call leaves the fund's totals short of capital at X = 0. The clawback holds until the totals' run has the LPs' capital back, then falls, and clears where X returns the late call.

LPs' paid-in $20,000,000.00; X final.

| Breakpoint X | Reasons |
|---:|---|
| 4,000,000.00 | `clawback_changes`: the clawback owed starts to fall: on the fund's totals, LPs have their capital back |
| 10,000,000.00 | `capital_returned`: LPs have their $20,000,000 of paid-in capital back; `clawback_cleared`: from here the GP has earned all the carry it was paid earlier |

| X | Tags | LPs | GP catch-up + carry | Clawback owed |
|---:|---|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 1,200,000.00 |
| 2,000,000.00 | listed | 2,000,000.00 | 0.00 | 1,200,000.00 |
| 4,000,000.00 | listed, breakpoint | 4,000,000.00 | 0.00 | 1,200,000.00 |
| 7,000,000.00 | listed | 7,000,000.00 | 0.00 | 600,000.00 |
| 10,000,000.00 | listed, breakpoint | 10,000,000.00 | 0.00 | 0.00 |
| 12,000,000.00 | listed | 11,600,000.00 | 400,000.00 | 0.00 |

#### fund-16-clawback-catch-up

An 8% pref and a full catch-up, with a late call. The totals' run owes its pref and catch-up after X = 0: the clawback holds, falls a dollar a dollar through the totals' catch-up, then 20 cents a dollar, and clears where X returns the late call.

LPs' paid-in $20,000,000.00; pref accrued to D $1,600,000.00; pref on the fund's totals $800,000.00; X final.

| Breakpoint X | Reasons |
|---:|---|
| 800,000.00 | `clawback_changes`: the clawback owed starts to fall: on the fund's totals, LPs have their pref |
| 1,000,000.00 | `clawback_changes`: the clawback owed falls more slowly: on the fund's totals, the GP has 20% of the profit |
| 10,000,000.00 | `capital_returned`: LPs have their $20,000,000 of paid-in capital back; `clawback_cleared`: from here the GP has earned all the carry it was paid earlier |
| 10,800,000.00 | `pref_met`: LPs have their 8% pref, $1,600,000 |
| 11,000,000.00 | `catch_up_done`: the GP has 20% of the profit |

| X | Tags | LPs | GP catch-up + carry | Clawback owed |
|---:|---|---:|---:|---:|
| 0.00 | listed | 0.00 | 0.00 | 2,000,000.00 |
| 500,000.00 | listed | 500,000.00 | 0.00 | 2,000,000.00 |
| 800,000.00 | breakpoint | 800,000.00 | 0.00 | 2,000,000.00 |
| 900,000.00 | listed | 900,000.00 | 0.00 | 1,900,000.00 |
| 1,000,000.00 | breakpoint | 1,000,000.00 | 0.00 | 1,800,000.00 |
| 5,000,000.00 | listed | 5,000,000.00 | 0.00 | 1,000,000.00 |
| 10,000,000.00 | breakpoint | 10,000,000.00 | 0.00 | 0.00 |
| 10,500,000.00 | listed | 10,500,000.00 | 0.00 | 0.00 |
| 10,800,000.00 | breakpoint | 10,800,000.00 | 0.00 | 0.00 |
| 10,900,000.00 | listed | 10,800,000.00 | 100,000.00 | 0.00 |
| 11,000,000.00 | breakpoint | 10,800,000.00 | 200,000.00 | 0.00 |
| 15,000,000.00 | listed | 14,000,000.00 | 1,000,000.00 | 0.00 |

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   The fund package has 318 tests, up from 263. The fund reference checks 16 cases. The engine's 3,115 and the page's 673 are unchanged.
2. **Case 16's two new wordings, from the engine:**

   ```bash
   cd packages/fund && node -e '
   import("./src/index.ts").then(({ readFund, findBreakpoints, splitAt, toCents }) => {
     const { fund } = JSON.parse(require("fs").readFileSync("cases/fund-16-clawback-catch-up/inputs.json"));
     const f = readFund(fund);
     for (const b of findBreakpoints(f).slice(0, 2)) console.log(toCents(b.x), b.reasons[0].text);
     console.log(splitAt(f, "5000000").lpMultiple.toFixed(4));
   })'
   ```

   It prints:

   ```
   800000.00 the clawback owed starts to fall: on the fund's totals, LPs have their pref
   1000000.00 the clawback owed falls more slowly: on the fund's totals, the GP has 20% of the profit
   1.1500
   ```

   The last line is the LPs' multiple at $5,000,000: $23,000,000 to date on $20,000,000 paid in.
3. **Re-derive cases 15 and 16** independently, from `SPEC.md` and their `inputs.json`, before adding the label.

## Assumptions added

- **FA16 (new):** the split's LP multiple, X included; the cases don't record it.
- **FC6** says which case pins which totals' wording.
- **FC7** notes the engine's `path` beside the case files' `field`.

## Open questions

1. **`Fund.terms` nested:** it's the one restructure, for the page's refusal-to-field mapping. Fine, or would you rather keep a flat `Fund`?
2. **`.field` to `.path`:** the engine's word, though F18 says "the field (as a path)". Fine?
3. **STABLE.md's home:** in `packages/fund/docs/` for now. f01n's README can link to it, as the engine's README holds its own list. Or move it into the README at f01n?
