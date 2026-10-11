# Review: 06e4 (OCX 0.4/0.5: Hollis Mill and its fixtures)

Branch `06e4-ocx-0.5`. **This PR touches `cases/`,** so it needs the cases label once the case and fixtures have been re-derived independently. No engine code: `readOcx` is 06f.

Three commits:
1. **ASSUMPTIONS OX14,** 0.4/0.5's rules in one place, with pointers from OX9, OX10, OX13 and C18, and the plan.
2. **The case and its fixtures,** with the tests that check them.
3. **This note.**

## 1. The case

**`cases/ocx-06-hollis-mill`:** Hollis Mill Robotics, OCX 0.5, using every table the reader reads there:
- **Classes:** Common Stock, and two preferred series from Financing History.
  - **Series Seed:** 1x, non-participating, at a ratio of 1.
  - **Series A:** $2.00 converting at $1.50, so its ratio is stored as Excel computes it, 1.3333333333333333. 1x, participating with a 3x cap.
- **Options, non-plan awards and a common warrant,** none with a strike in the workbook.
- **Two post-money SAFEs combined in one row, and one note,** from the convertibles table.
- **Context's set-aside tables:** 409A valuations, plan history, a split and shareholder groups.
- **Every formula with a saved value,** as 0.4/0.5's are, so every share total is checked.

Result:
- 9 holders, Former F left out, and two holders made for the convertibles rows
- 6 securities and 11 positions
- a 750,000 pool
- one SAFE and one note
- **To fill:** the three strikes, the note's four terms, and seniority

**The DERIVATION walks the workbook,** table by table. Series A's ratio check is worked digit by digit, and every check is tabled with its sums.

**What the workbook uses from the reference:** 0.4/0.5's tab names, headers and row labels (`Common Stock`, `Options Remaining for Issuance` and the like), and the version label. Everything else is our own: the company, holders, numbers, titles and footnotes. **The arrangement is ours too:** the tables are where we put them, and the shareholder groups sit in their own rows. The workbook was written out by a script in my scratchpad, not in the repo.

**I read the reference workbooks locally** to settle three questions, printing to my terminal and copying nothing:
- **a discount's form:** a fraction, 0.2
- **the participation cap:** a multiple
- **"N/A"** where a value is absent

They are templates, and their sample numbers don't agree with each other. One round's ratio isn't its prices' quotient, and one class is headed without its name's "Stock". So they can't be a reading test; ocx-06 is. ASSUMPTIONS says so.

## 2. The fixtures

**In `ocx-03-refused`, 11 refusals on Hollis Mill,** for what only 0.4/0.5 refuses. The terms it shares with 0.7 refuse the same way, so they aren't repeated.

| Fixture | Refused |
|---|---|
| `layout-0.3` | unsupported, `ocx_layout`, "" (0.3 has no label) |
| `round-without-class` | malformed, `round_without_class`, "Series B" |
| `class-without-round` | malformed, `class_without_round`, "Series Seed Preferred" |
| `conversion-ratio-mismatch` | malformed, `conversion_ratio_mismatch`, "Series A Preferred" |
| `cap-below-preference` | unsupported, `cap_below_preference`, "Series A Preferred" |
| `rsus-not-separated` | unsupported, `rsus_not_separated`, "Hollis Mill 2022 Stock Plan" |
| `snapshot-total-mismatch` | malformed, `total_mismatch`, "Stakeholder Snapshot: Common Stock" |
| `summary-outstanding-mismatch` | malformed, `total_mismatch`, "Series Seed Preferred" |
| `as-converted-mismatch` | malformed, `holdings_mismatch`, "Investor U" |
| `liquidation-preference-mismatch` | malformed, `liquidation_preference_mismatch`, "Series A Preferred" |
| `pool-summed-mismatch` | malformed, `pool_mismatch`, "Options Remaining for Issuance" |

**Each 0.4/0.5 check has a fixture that refuses it.** That follows your 06e3 note on the ledger total. ocx-03 now has 42 refusals.

**In `ocx-05-reads`, four reads on Hollis Mill:**
- `version-0.4`: the label says 0.4, and the workbook reads the same
- `pre-money-safes-combined`
- `participating-uncapped`
- `cap-equal-to-multiple`: non-participating, keeping the cap's line

Each DERIVATION has a new section for them.

## 3. The rules (ASSUMPTIONS OX14)

**OX14 gathers 0.4/0.5's rules in one row,** rather than spreading them over nine:
- **Tabs and headers:** which ones it needs, and Context's tables found by their titles.
- **The as-of form** and **"N/A".**
- **The holdings columns:** class, `(outstanding)`, `(as converted)`, option, warrant and awards columns.
- **Rounds:** matched to classes.
- **A series' terms:** O4's ratio check at 15 digits, and the participation reading.
- **Strike-less classes:** named and numbered.
- **The pool:** summed.
- **SAFEs and notes,** and the issue order.
- **0.4/0.5's checks,** in order, and what's set aside.

**OX13** points its steps at OX14 for 0.4/0.5. **OX9 and OX10** point to it where 0.4/0.5 differs. **C18** names ocx-06.

## How to check by behavior

1. **Re-derive the case** from `cases/ocx-06-hollis-mill/DERIVATION.md`, by OX3 to OX14. Your reader needs 0.4/0.5's layout for it. The fixtures run on it as on Alder Gate.
2. **Re-derive the new fixtures** from the 0.4/0.5 sections of `cases/ocx-03-refused/DERIVATION.md` and `cases/ocx-05-reads/DERIVATION.md`.
3. **Run the tests:**

   ```bash
   pnpm test
   ```

   - **Engine:** 2,571 pass, 62 new: 11 for Hollis Mill, and the fixture checks for 15 fixtures.
   - **Page:** 541 pass, unchanged.

   **To prove the checks bite,** I broke the case two ways, one at a time, and a check failed each time. Each file was put back after:
   - a strike not listed to fill
   - one tab's as-of label changed by a day

## Decisions for you

1. **The as-of date in 0.4/0.5** is "As of " and any date form OX5 reads. Hollis Mill uses the dotted one, as Context's dates are. The reference has only "[DATE]", so what an export writes is open.
2. **"N/A" is a blank** where a value may be absent: a discount, a valuation cap, a participation cap, or a common class's liquidation preference. The reference writes all four that way. Anywhere a value is needed, it's `bad_number`.
3. **A preferred heading's ratio isn't read.** "(1.3333)" is Financing History's ratio to four places. The full one is read there.
4. **`(as converted)` is checked within one share** of outstanding × issue price ÷ conversion price. OCX doesn't say how the export rounds, but it can't be off by more than one share.
5. **The liquidation preference is checked within a cent.** It's a product, not a sum, so rounding is tiny, but it's money.
6. **0.4/0.5's pool is summed across plans:** the option columns are headed by class, not plan, so no column matches a plan's name.
7. **The participation cap is a multiple of the issue price,** as OCF's is and the reference's numbers suggest. "N" with a cap doesn't read the cap. A cap equal to the multiple is non-participating, and keeps the line, as OCF does.
8. **Strike-less classes are named as 07a's item 1 has it:** each by its heading, numbered by position. So "Common Stock Options" is `options_1`, "Non-Plan Awards" `options_2`, and "Warrants for Common Stock" `warrants_1`.
9. **The warrant-maximums line comes in 0.4/0.5 too:** the reference's own warrant footnote says counts are maximums.
10. **Two new terms for the rounds,** `round_without_class` and `class_without_round`, and one for the check, `liquidation_preference_mismatch`. All three are malformed. `conversion_ratio_mismatch` and `cap_below_preference` are OCF's own terms, reused.
11. **A split is counted in `not_needed`, with no line.** The plan said "with a report line", but the count already says it was set aside, and the counts elsewhere are after it. Tell me if you'd rather have a line.
12. **SAFEs and notes in the issue order** come after every series, in the convertibles table's order.

## Assumptions added

- **OX14:** OCX 0.4/0.5, in full.
- **Pointers to it** from OX9, OX10, OX13 and C18.

## Open questions

1. **The reference heads one class without its name's "Stock":** a column "X Preferred" for the Summary's "X Preferred Stock". As OX14 stands, that's refused, `unknown_class_heading`. Should a class's column also match its name less a trailing "Stock"? I'd keep it strict until an export does it: the template's numbers don't agree elsewhere either.
2. **The reference's shareholder groups sit beside Financing History, starting on its header row.** As OX12 stands, the list's first cell would read as a header the reader doesn't know, and get an `unrecognized_field` line. Should a table's header row stop at its first empty cell? The summary tabs have gaps inside their header rows, so that rule would need to apply only to Context. Hollis Mill puts the groups in rows of their own, so it doesn't decide this.
3. **The new terms:** `round_without_class`, `class_without_round` and `liquidation_preference_mismatch`. They're stable from 1.0, so they're worth a look now.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **This PR touches `cases/`:** the `cases-locked` check fails until you add the cases label.
- **`.claude/settings.json` shows as changed on this machine:** your lift of the cases lock. I haven't touched it or committed it.
- **I read the local reference workbooks with a standard-library script** in my scratchpad, printing to the terminal only, under your 06b terms. Nothing from them is in the repo beyond tab names, headers and row labels.
- **Nothing ran outside the sandbox, and nothing used the network.**

## Checks

- **Engine:** 2,571 tests pass.
- **Page:** 541 tests pass.
- **Reference:** 71 unit tests pass, and every `expected.json` matches.
- **Typecheck:** clean.

## Next

06e5, the locked cases written as OCX, with the reference test for a row of identical SAFEs, and the cases lock still lifted. I'm stopping here.
