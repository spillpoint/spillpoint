# Review: 08a (a plan for reading Carta's cap table report)

Branch `08a-plan-carta-report`, from main at `3942c34` (#137 merged, no PR open). No code, no cases, nothing under `cases/`, `reference/`, `apps/` or `packages/`.

**CI and permissions:** no change to `.github/workflows/` or `.claude/`.

## What changed

- **`notes/plan-0.8.0.md`,** new: the plan, laid out as 0.6.0's was, with each of your 16 items confirmed, corrected or questioned.
- **`CLAUDE.md`:**
  - **Hard rule 11** (your item 13), after rule 10. Your two sentences, with "what's written here" as `notes/plan-0.8.0.md`. I added a third, from your message: a founder's report stays on your machine, only Carta's tab titles and header names reach the repo, and no fixture is made from it.
  - **Where things stand:** a "Next, 0.8.0" line, and 1.0 now reads "no API changes after 0.8.0". "Which 1.0 reads" became "which the next release reads", which holds whatever you answer to question 3.

## What to look at first

**Five things changed from your starting points:**

1. **Item 6 against `as_of`** (question 1). Row 2 is the only place the as-of date is, and `as_of` is required. I'd read only what's before the first "•".
2. **Item 3** (question 2). `Options Outstanding` sits beside `Canceled Date` and `Quantity Canceled`, so a grant can be part cancelled, and skipping on the date would drop what's live. The outstanding column decides in those ledgers. I don't know that it happens: fact 5 says.
3. **Item 4.** A note needs a repayment multiple and a rate too.
4. **Item 10.** A class, series or plan name can carry the company's name, as can a tab named for a plan and the headings that name a class or plan.
5. **Item 12** (question 3). 0.8.0 cut from main ships everything in `notes/release-1.0.md`, including 10c, which can break code that changes a table after preparing it. And `ImportRefusal.format` widening fails an exhaustive `switch` in TypeScript. Both READMEs say these come in 1.0, and that 1.0 has 0.7.0's API.

**One engine gap, found checking item 8** (question 4). Post-money SAFEs that together promise 100% or more of the company aren't refused, and common is paid a negative amount. Same on main and 0.7.0. Nothing in this PR changes it.

**A smaller one** (question 9): `unissued_pool: null` reads as 0, and `conversion_price: null` as the issue price, so those two blanks don't stop an unfilled table. It's true of OCX's today.

## How to check it by behavior

**The engine gap.** Save this as `local/safes-over-100.mjs`, which git ignores, and run it from the repo root:

```js
import { readCapTable, prepare, solve, D } from "../packages/engine/src/index.ts";

const table = prepare(readCapTable({
  holders: [{ id: "founder", name: "Founder" }, { id: "a", name: "A" }, { id: "b", name: "B" }],
  securities: [{ id: "common", name: "Common", kind: "common" }],
  seniority: [],
  positions: [{ holder: "founder", security: "common", shares: 1000000 }],
  unconverted_safes: [
    { id: "safe_a", holder: "a", purchase_amount: "100000", post_money_cap: "8000", discount: "0" },
    { id: "safe_b", holder: "b", purchase_amount: "100000", post_money_cap: "8000000", discount: "0" },
  ],
}), "2026-11-03");
for (const line of solve(table, new D(20000000)).answers[0].payout.lines) console.log(line.holder, line.amount.toFixed(2));
```

```bash
node --no-warnings local/safes-over-100.mjs
```

It prints `founder -230250000.00`, `a 250000000.00` and `b 250000.00`. Change the $8,000 cap to $100,000 for the plan's second row. Then try a cap you've seen in your report, at that row's amount: only caps low enough to reach 100% do this.

**The speed.** Your timing table, with 1, 3 and 8 option strikes. Here that's about 2.4, 6.4 and 23.5 seconds at 26 SAFEs. The plan's table is this Mac under load, so your numbers will differ. If they don't climb with the strikes, I've got the shape wrong.

**The cell-kinds script on your report:** `pnpm ocx-structure <the report>`, fact 1. I ran it on a made-up workbook of this shape, with a name, an email, a date, amounts and holders in it, and searched its output for each: none came out. It works as it stands, and it's safe to paste. The plan ledger prints fewer columns than the rest, since it's known by OCX 0.7's headers.

**The reasoning:** read the "Your items, checked" table, then the questions.

I ran no test suite: nothing that runs has changed.

## Assumptions added

None in `docs/ASSUMPTIONS.md`: its new section comes with 08b, once you've answered. **What the plan proposes beyond your items,** each there for you to overrule:
- `readCarta` takes `OcxWorkbook` as it is, with no new type and no alias.
- The page runs `readOcx`, then `readCarta` on `ocx_layout`. No detection function is exported.
- Only `1:1` is read as a ratio. Only the whole shape "Converts <r> <word>, <n>x multiple" is read as a multiple.
- A formula saved as 0 counts as no saved value.
- A Converted Date alone closes a convertible, beside item 3's Canceled Date.
- A note's rate and repayment multiple are asked, not read from `Interest Rate` and `Change in Control Percent`, since no export has shown a value in either.
- `Other Consideration` above 0 on an open convertible is refused. So is `RSAs not purchased` above 0.
- Amounts are read as US dollars, with a report line.
- Locked cases: edge-12d and edge-12f. Millrace's ratio isn't a heading anyone has seen, and edge-12j and 13j have warrants and RSUs.
- 08b in three parts, with an 08b0 ahead of them if you agree to question 4.

## What I kept out

**Your report's counts aren't in the repo.** Your message gave me titles, counts and kinds, and said header names can go in the plan. It didn't say the counts can, and the repo is public, so the plan says what a row looks like, not how many. Two exceptions, to answer what you asked: the timing table's sizes (10 and 26), which it gives as sizes of a made-up table, and "one report" having nine tabs. Say if you want more in, or the sizes out.

**I read nothing of Carta's** for this plan, nor the migration guide you mention (item 13). The settings' names are from your message. The plan doesn't name that competitor.

**`notes/plan-0.6.0.md`** still suggests a Carta Launch test company, which rule 11 now closes. I left the old plan as written and said so in the new one.

## Open questions

All in the plan:
- **Ten questions for you,** each with what I'd do.
- **Nine facts your copy can settle before 08b,** counts and kinds only. Each changes what a case says, so they matter before 08b starts.
- **Fourteen open questions only another export can settle.** Your eight are there, with export settings (item 16), a ratio other than 1:1, ISO, several plans, another currency, and `Summary by Relationship`'s labels added.
