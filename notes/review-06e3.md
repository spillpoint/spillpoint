# Review: 06e3 (the OCX reads)

Branch `06e3-ocx-reads`. **This PR touches `cases/`,** so it needs the cases label once the case has been re-derived independently. No engine code: `readOcx` is 06f.

Three commits:
1. **ASSUMPTIONS:** the rules these reads settle, and the plan.
2. **The case,** `cases/ocx-05-reads`, with the tests that check it.
3. **This note.**

## 1. The case

**`cases/ocx-05-reads`: 15 fixtures, each one small change to Alder Gate (ocx-01), each read, none refused.** One for each reading rule no case or fixture reached, as your 06e2 review asked. Each changes the import, so each result is the whole import, as in ocx-04 (C18). The DERIVATION says what differs from Alder Gate's for each.

| Fixture | The rule | What changes |
|---|---|---|
| `pre-money-safe` | "Pre Money" (OX11) | SAFE-2 has a `pre_money_cap` |
| `safe-discount` | a discount as a fraction (OX11) | SAFE-2's discount is 0.2 |
| `cancelled-safe` | "Cancelled" set aside (OX11) | no SAFE; Investor S left out |
| `unknown-issue-date` | "Unknown" falls back (OX5, OX12) | an `issue_order_default` line |
| `split-adjusted-grant` | split-adjusted count and strike (OX9) | EP-1 is 400,000 at $0.05 |
| `seventeen-digit-strike` | 15 significant digits (OX5) | "2.5000000000000001E-3" is a $0.0025 strike |
| `day-count-date` | a day count from 1900 (OX5) | EP-1 expires on 30 October 2025, and is left out |
| `date-system-1904` | the 1904 system (OX5) | EP-4 runs to 31 March 2026, and is kept |
| `expired-warrant` | an expired warrant (OX10) | W-1 and Lender L left out |
| `warrant-without-outstanding-column` | maximum less exercised (OX10) | W-1 is 25,000 |
| `common-named-preferred` | "Preferred" under `Common Stock` (OX7) | `seed_preferred`, common, with its line |
| `same-id-twice` | "_2" (OX3) | "Employee-C" is `employee_c_2` |
| `unrecognized-header` | an unknown header (OX12) | an `unrecognized_field` line |
| `two-plans` | plans together, pools by plan (OX9) | a $0.5 grant; the pool is 1,010,000 |
| `saved-by-a-spreadsheet` | totals with saved values (OX5) | every share total checked; no `formula_totals_skipped` |

**Beyond the plan's list:**
- `cancelled-safe` and `warrant-without-outstanding-column`, two more reading rules no fixture reached
- `saved-by-a-spreadsheet`, which is how the plan's "a total with a saved value that agrees" changes the import: with one total saved, the result wouldn't change. It's also your 0.6.0 answer 13, a workbook saved by a spreadsheet app. It sets 109 cells, each formula's value as the spreadsheet works it out. The DERIVATION tables the 19 totals now checked.

**Not here:**
- **The MFN column:** it's now not read at all (decision 2).
- **A date followed by a reference:** it isn't reachable in 0.7, where it's only on a converted SAFE's conversion date.
- **Rules that change nothing,** such as a status in lower case: Alder Gate already shows them.

**The two date fixtures** each show which system was read:
- **`day-count-date`:** day 45,960 from 1900 is the day before the as-of date, so EP-1 is left out.
- **`date-system-1904`:** day 44,650 from 1904 is 31 March 2026, so EP-4 is kept. From 1900 it would be 2022, and EP-4 left out as in Alder Gate.

**What the workbooks use from the Mantle export:** only 0.7's tab names and headers, as before. The second plan's ledger has 0.7's plan ledger headers, all 17, with our own grant. "Board Approval Date" and "Employee-C" are our own. The fixtures were written out by a script in my scratchpad, not in the repo; it computed the 109 saved values.

## 2. The rules these settle (ASSUMPTIONS)

- **OX5, which totals are checked:** 06e2 said every `Total` row. Writing `saved-by-a-spreadsheet` showed that's too wide. Now only totals that count shares are checked:
  - the per-holder tab's `Total` row under each holdings column
  - each ledger's `Total` row under its share-count columns, summed over every row, set aside or not, as the spreadsheet sums them
  - each class's `Outstanding Shares`

  Money and percentages aren't checked (decision 1).
- **OX7, "named preferred":** a name with the word "Preferred", in any case.
- **OX10, the maximums line:** `warrant_counts_are_maximums` comes only where the cap table has a warrant once every rule has run.
- **OX11:**
  - **A discount** is a number cell holding a fraction below 1; anything else is `bad_number` (decision 3).
  - **`Most Favored Nation` isn't read** (decision 2).
- **OX12, the unrecognized header's line:** its subject is the tab and its field the header. The headers the reader knows are those of the one 0.7 export seen, as the cell-kinds script lists them.
- **OX13, step 6:** `Warrant Shares Outstanding` is optional, and the maximum less exercised and cancelled stands in for it. `Most Favored Nation` leaves the optional list.
- **C18:**
  - a sixth kind of step, `date_system`
  - reads go in `ocx-05-reads`

## 3. The tests

`ocx-05-reads` runs through the same fixture checks as ocx-04:
- each change applies to Alder Gate, step by step
- each result passes the cases' own checks against its workbook

Three changes:
- **The fixture helper** knows `date_system`.
- **A note's subject may be a tab,** for `unrecognized_field`.
- **A fixture whose step doesn't apply** now fails as one named test. Before, it stopped the whole file before any test ran, which I found by breaking `date-system-1904` on purpose.

**To prove the checks bite,** I broke two fixtures, one at a time, and a check failed each time. Each file was put back after:
- a date-system step that changes nothing
- one total in `saved-by-a-spreadsheet` left unsaved: its result has no `formula_totals_skipped` line, so a check fails

## How to check by behavior

1. **Re-derive the case,** from `cases/ocx-05-reads/DERIVATION.md`. Apply each fixture's change to Alder Gate's `workbook.json`, read it by OX3 to OX13, and compare with `expected.json`. Your reader from 06e2 needs one more kind of step, `date_system`.
2. **Run the tests:**

   ```bash
   pnpm test
   ```

   - **Engine:** 2,508 pass, 153 new: the fixture checks for 15 fixtures.
   - **Page:** 541 pass, unchanged.

## Decisions for you

1. **Only share totals are checked** (OX5), not money or percentages. A sum of amounts each rounded to 15 digits needn't equal the total rounded once, so checking `Cash Paid` could refuse a workbook that's fine. Share counts are whole, so their sums are exact. This narrows 06e2's wording.
2. **`Most Favored Nation` isn't read** (OX11). The cap table carries a SAFE's terms as they stand at the sale (12h), MFN or not, as OCF's import does. So nothing the column says would change the import, and reading it would only add ways to refuse.
3. **A discount is a fraction below 1** (OX11), or blank. A 20 is refused, `bad_number`, not read as 20%: it could be either, and which would be a guess. Strict, like the numbers rule. If a real export writes percentages, it'll be refused by name and we'll know.
4. **The maximums line goes with the last warrant** (OX10). It's about the counts the import uses, so with every warrant left out there's nothing for it to qualify.
5. **"Named preferred" is the word "Preferred"** (OX7), in any case. A class named "Preferential Common" wouldn't count; "Seed Preferred" does.
6. **`cancelled-safe` spells it "Cancelled",** so both spellings are in the cases: Alder Gate's EP-3 has "Canceled", though it's a grant at 0 that's set aside whatever it says.

## Assumptions added

All in rows already there, each marked "06e3":
- OX5, OX7, OX10, OX11, OX12 and OX13: listed in section 2
- C18: the `date_system` step, and the reads case

## Open questions

1. **The second plan in `two-plans`** gets a column in place of `Non-Plan Awards`, as `grant-of-preferred` does. Inserting one would shift every later column, and the rule doesn't need `Non-Plan Awards`. No real export with two plans has been seen (06d question 14), so whether 0.7 writes a column per plan is still open.
2. **`split-adjusted-grant` adjusts one grant only,** where a real split adjusts everything. It shows the column rule, not a split. Tell me if you'd rather it adjusted every grant and certificate, as a real 2-for-1 would.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **This PR touches `cases/`:** the `cases-locked` check fails until you add the cases label.
- **`.claude/settings.json` shows as changed on this machine:** your lift of the cases lock. I haven't touched it or committed it.
- **Nothing ran outside the sandbox, and nothing used the network.**

## Checks

- **Engine:** 2,508 tests pass.
- **Page:** 541 tests pass.
- **Reference:** 71 unit tests pass, and every `expected.json` matches.
- **Typecheck:** clean.

## Next

06e4, 0.4/0.5's workbook and its fixtures, with the cases lock still lifted. I'm stopping here.
