# Review: 10c (prepare works on a frozen copy)

Branch `10c-prepare-frozen-copy`, from main at `4a63c1b` (f01n). One commit.

What changed:
- **The engine:** `src/waterfall.ts`, `src/decisions.ts` and `src/payments.ts`.
- **The engine's tests:** a new file, `test/frozen-copy.test.ts`.
- **The engine's README:** its `prepare` row.
- **A new release note,** `notes/release-1.0.md`.
- **Unchanged:** nothing in `apps/`, `cases/`, `reference/` or `packages/fund/` changed.

## 1. The bug, confirmed on main first

Before changing anything, I reproduced each part on main:

- **edge-02, edited after prepare:** I multiplied Founder A's common by 10 on the same object after `prepare`. At $5M, common was still paid $0.25 a share; prepared afresh, it's $0.0323. Founder A was paid $15,000,000.00 out of a $5,000,000 sale. These are your numbers.
- **A table written by hand,** `{ capTable, exitDate }`: solved, then edited, then solved again, it still gave $0.25.
- **A SAFE's purchase amount:** this was worse than a hand-built table missing the edit. `bought()` kept each post-money SAFE's purchase amount ÷ cap in a WeakMap keyed by the SAFE's own object. So after a caller changed edge-12's SAFE from $1M to $2M, **even a fresh `prepare`** paid Investor X $2,099,447.51 at $20M. The right figure is $4,175,824.18.
- **A fourth hole, found while listing the caches:** an answer could hand back a Set the solver keeps for the next exit value. On Millrace, the $20M answer's `exercised` set was the same Set object as the $20,000,001 answer's. Adding `options_0.42` to the first made the second exercise it. It's the same kind of bug: something a caller can change, inside what the engine keeps. So I fixed it here too (decision 1 below).

## 2. What changed

**`prepare`** (your item 1):
- It deep-copies the cap table it's given: every object and list, and every Decimal. Each Decimal is copied with its own constructor, so one made with the caller's own decimal.js settings keeps its precision and rounding.
- It deep-freezes the copy, every Decimal and its digit array included, and freezes the table it returns.
- The caller's table is never frozen or changed.
- `WORKING` keeps the working quantities only for a table `prepare` returned. The comment at `WORKING` now says so, and why that's safe.

**A table written by hand** (item 2):
- `working()` no longer stores anything for it, so its quantities are worked out afresh on each call. An edit between calls is always seen.
- `findBreakpoints` works one out once per call, as before.
- **`paySchedule`** works it out once per call. Before, it went through `solve` for each payment, which would have meant once per payment. It now calls an internal `solveWorking`.

**The SAFE share:** `BOUGHT` and `bought()` are gone. Each post-money SAFE's purchase amount ÷ cap is now worked out with the rest of the prepared quantities, as `bought`, a Map keyed by the SAFE's id.

**Answers:** `solve`'s answers get their own copies of the solver's decision Sets. An answer's `decisions` and its `payout.decisions` are still the same object, as before.

**The README:**
- **The `prepare` row now says:** "It works on its own frozen copy of the cap table *(1.0)*: changing your table afterwards changes nothing it gives, and assigning to anything in what it returns throws a `TypeError`. To change a table, edit yours and prepare it again. A table you write yourself, `{ capTable, exitDate }`, works too, worked out afresh on each call."
- **The legend** of version marks now includes *(1.0)*.

**`notes/release-1.0.md`:** it starts with a "Fixed since 0.7.0" list, with this as its first entry. The entry covers what was wrong, what changed, what TypeScript and JavaScript see, and what to change.

## 3. Every cache in the engine (item 3)

**Kept across calls:**

| Cache | Where | Keyed by | Why it's safe now |
|---|---|---|---|
| `WORKING` | `waterfall.ts` | A table `prepare` returned | Only `prepare` adds to it. The key is frozen, and the cap table it holds is a frozen copy no caller can change. A table written by hand is never added. |
| `READINGS` | `lines.ts` | The engine's own working object, `Prepared`, then a string of the decisions | A caller never sees a `Prepared`. One from `prepare` is built from the frozen copy. One from a table written by hand is new on each call and dropped after it, so its readings last one call. |
| `OPTIONS_SETTLED` | `decisions.ts` | `Prepared`, then a string of the choices | Safe for the same reason as `READINGS`. Its Sets no longer reach a caller: answers get copies. |
| `SAFES_SETTLED` | `decisions.ts` | `Prepared`, then a string of the choices | Safe for the same reason as `READINGS`. |
| ~~`BOUGHT`~~ | `waterfall.ts` | Was the caller's own `Safe` object | Removed. Now `Prepared.bought`, keyed by SAFE id. |

**Kept only within one call,** and gone when the call returns:
- **The solver's working at one exit value,** `AtExit`: `settled`, `followedCache`, `followedPaths` and `runs`, keyed by strings.
- **The lines for one set of decisions,** `PayoutLines`: `bySecurity` and its `memo` readings.
- **`settle`'s `postMoneyCount`.**
- **The imports' Maps,** in the `ocf-*` and `ocx-*` files: working state for one read, not caches.

The `Prepared` object's own Maps (`shares`, `preferred`, `bought` and so on) are keyed by ids, which are strings.

## 4. Tests (item 4)

`test/frozen-copy.test.ts` has 56 tests. **All 56 fail on main and pass here.** I ran them against main's engine to check.

- **edge-02 as you described:**
  - Founder A's common is multiplied by 10 on the caller's table after `prepare`.
  - The table prepared before the edit still gives every exit value the case lists, its common price and each holder's total, as `expected.json` has them, and the case's two breakpoints, $3M and $15M.
  - A fresh `prepare` gives $0.0323 a share at $5M, Founder A $1,935,483.87 and Founder B $64,516.13.
  - A fresh `prepare` finds one breakpoint, $3M. The Seed would convert only above $96M, outside the range.
- **Assigning throws** a `TypeError`:
  - to the prepared table's `capTable` and `exitDate`
  - to a position's shares, and the unissued pool
  - pushing to the holders, or to a seniority tier
  - to a Decimal's sign, or one of its digits
- **For each of the 48 exit cases:**
  - the prepared table and everything in its copy is frozen
  - nothing in the caller's table is frozen
  - the copy shares no object with the caller's table
  - every copied Decimal keeps the engine's constructor
- **A Decimal at the caller's own precision:** one made with 60 digits is copied at 60 digits, with its constructor.
- **A table written by hand,** edge-02: solved, with breakpoints $3M and $15M. Then edited: $0.0323, Founder A $1,935,483.87, and one breakpoint. The caller's table isn't frozen.
- **A SAFE's purchase amount,** edge-12, changed from $1M to $2M:
  - on a table written by hand, Investor X goes from $2,099,447.51 to $4,175,824.18 at $20M
  - a fresh `prepare` gives $4,175,824.18; on main, it gave $2,099,447.51
  - the table prepared before the change stays at $2,099,447.51
  - the case file with `purchase_amount` set to `"2000000"`, read afresh, also gives $4,175,824.18

  The arithmetic is in the test's comment.
- **`paySchedule` on a table written by hand:** it gives the same takes as `prepare`'s table, before an edit and after it.
- **Answers' own decisions:** Millrace at $20M. Adding `options_0.42` to one answer's `exercised` set, and `seed` to its payout's `converted` set, doesn't reach the answer at $20,000,001.
- **The caller's table emptied after `prepare`:** `readExit`'s table has its positions and securities cleared after `prepare`. Founder A is still paid $1,500,000.00 at $5M.

**Every locked case is unchanged:**
- `cases.test.ts` passes.
- **Every digit, not just the cent:** I dumped every exit case from main and from this branch and compared the two files. That covers all 48 exit cases: their breakpoints and reasons, every answer and line at each exit value they list, and every payment take. The files are byte-identical.

## 5. The page (item 6)

**The page never edits a prepared table.**
- It prepares in three places: `draft.ts`'s `checkBuilt`, `analysis.ts`'s `computeAnalysis` and `ocfCheck.ts`. Each one prepares a table it has just read, and only reads `pc.capTable` after that.
- Its one write to a cap table is in `ocxImport.ts`, to a `structuredClone` of an import's JSON before it is read.
- It never writes a prepared table by hand.

Nothing in `apps/dashboard` changed, and its 674 tests pass.

**The built page in the browser pane:**
- **Millrace opens:** Ana's row is $9,750,989.66 at $100M, with 10 breakpoints.
- **An edit is followed:** I clicked "Edit the cap table directly" and set Ana's common to 55,000,000. The page then showed her $41,971,610.53 at $100M.
- **No console errors.**
- **The confirmation:** that button asks first with `window.confirm`, which the browser pane dismisses. I made it answer yes in the page for that one click.

## 6. Timing (your request)

**The copy runs inside `prepare`.** The timing test's clock starts after `prepare`, so the copy itself isn't in the number it prints.

**The timing test,** `safes-last.test.ts`'s Larkspur with its note and 10 SAFEs, run alone:

| | Run 1 | Run 2 | Run 3 |
|---|---:|---:|---:|
| Before (main), three runs in a row | 2.30s | 2.23s | 2.26s |
| Main, alternating with this branch | 2.22s | 2.28s | 2.31s |
| This branch, alternating with main | 2.39s | 2.50s | 2.37s |

In the full CI command, where the four packages' tests run at once, it printed 9.45s. That figure can't be compared with the others.

**Why it's slower, measured in one process:**
- **The method:** the same workload as the test, three times in each process. Each variant ran three times, in turn, so all of them ran under the same load.
- **Main:** 2.00–2.25s.
- **This branch:** 2.17–2.35s.
- **The Decimals frozen, but not their digit arrays:** 1.99–2.23s.
- **The Decimals copied but not frozen:** 2.00–2.29s.

So the copy and the frozen objects cost nothing measurable. **Freezing each Decimal's digit array costs about 7%:** the arithmetic reads the cap table's own Decimals at every exit value it tries. That's 0.15s on Larkspur, against your 5-second target.

**`prepare` itself,** timed over many runs:
- **Larkspur:** from 20µs to 75µs.
- **All 48 exit cases:** about 8µs to 17µs each.

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   I got:
   - **Engine:** 3,171 tests, 3,115 before plus the 56 here.
   - **Page:** 674 tests, unchanged.
   - **Fund:** 324 tests, and its page's 211.
   - **The reference:** 73 unit tests, and all 83 cases matching it.
   - **The fund reference:** 23 unit tests, and its 16 cases.
2. **The bug, from the command line:** this prints what a table prepared before the edit pays, and what one prepared after it pays:

   ```bash
   node --input-type=module -e 'import { readFileSync } from "node:fs"; import { D, prepare, solve, readInputs } from "./packages/engine/src/index.ts"; const exit = readInputs(JSON.parse(readFileSync("cases/edge-02-non-participating/inputs.json", "utf8"))); const pc = prepare(exit.capTable, exit.exitDate); const a = exit.capTable.positions.find((p) => p.holder === "founder_a"); a.shares = a.shares.times(10); for (const [what, t] of [["prepared before the edit", pc], ["prepared after it", prepare(exit.capTable, exit.exitDate)]]) { const p = solve(t, new D(5000000)).answers[0].payout; console.log(what + ": common $" + p.commonPrice.toFixed(4) + " a share, Founder A $" + p.holderTotals.get("founder_a").toFixed(2)); }'
   ```

   - **On this branch:** "common $0.2500 a share, Founder A $1500000.00", then "common $0.0323 a share, Founder A $1935483.87".
   - **On main:** the first line says Founder A $15000000.00.
3. **The page:** `pnpm dev`, then edit any cap table. The payouts follow every edit, as before.
4. **Nothing else changed:** `git diff --stat main -- cases apps reference packages/fund` prints nothing.

## Decisions for you to check

1. **Answers get copies of the solver's Sets.** You didn't ask for this. It's the same kind of bug (section 1), and it was found while listing the caches for item 3. Without it, "nothing a caller can change reaches what the engine keeps" wasn't true.
2. **Freezing the digits costs about 7% of solving time** (section 6). I froze them, as you asked. The alternative is to freeze each Decimal but not its digit array:
   - **What it saves:** the 7%.
   - **What it leaves open:** reaching into decimal.js's own internals to write a digit, `shares.d[0] = 5`. No decimal.js method does that, and its types mark `d` readonly.

   Your call.
3. **A copied Decimal keeps its own constructor,** not the engine's `D`. A Decimal made with other settings is copied exactly. It's then worked with as before, at its own precision, so no answer changes.
4. **Anything in a cap table that isn't a plain object, a list or a Decimal** is copied as a plain object. A cap table has nothing else (`model.ts`).
5. **`paySchedule` works out a table written by hand once per call,** not once per payment.

## Assumptions added or changed

None. This step has no modeling choices.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/` are committed.
- **`.claude/launch.json` was edited temporarily,** and is restored byte for byte. It's another session's file, kept out of git by `.git/info/exclude`. I added one entry, to serve the built page for the browser check, then put the file back as it was.
- **Nothing ran outside the sandbox.**

## Open questions

1. **Should `PreparedCapTable`'s fields be `readonly` in its type?** Then TypeScript would catch the assignment that now throws at run time. It's a type change, though only code that assigns to a prepared table would notice. I haven't made it, since 1.0 has no API changes.
2. **The README's opening says** "1.0 has the same API". Names and types are unchanged. The one behavior change is for code that changed a table after preparing it. The release note says so; does the README line need saying so too?

## Next

I'm stopping here.
