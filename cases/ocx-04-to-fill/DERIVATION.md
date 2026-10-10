# OCX case 04, terms to fill in: derivation

One small change to an OCX 0.7 workbook for each kind of blank 0.7 can leave, beyond what case 02 already shows. The workbook is valid, but leaves a term open, so the import leaves it blank and asks, rather than guess or refuse (O1). Each fixture names its base and lists its change, cell by cell (C18).

**Each result is the whole import** (C18), not what it adds to its base's: these blanks change a base's result, not only add to it. Below, each says what differs from its base's `expected.json`. Everything else is the base's, line for line.

**Which blanks 0.7 can leave** (OX3, OX7, OX11):
- **seniority,** whenever there's preferred stock: case 02
- **a preferred series' terms** where there's no Financing History: case 02's conversion price, multiple and participation, and here the issue price, when its ledger's prices differ
- **a SAFE's cap's kind,** when the ledger doesn't say: here
- **a note's terms,** with no notes ledger: here

## `safe-cap-kind-blank`, on Alder Gate (ocx-01)

**The change:** SAFE-2's `Valuation Method (Pre- or Post-Money)` (G4) is empty.

**How it's read** (OX11): the SAFE keeps its cap's amount as `valuation_cap`, $8,000,000, with `cap_type` blank, as OCF case 04's SAFE does (C16). It takes neither a `post_money_cap` nor a `pre_money_cap` field yet: both blank would mean a SAFE with no cap. The page asks whether the cap is pre-money or post-money (O8).

**The convertibles check still passes.** The Summary View's only convertibles row is `Post-$ SAFEs`, 1 for $200,000. A SAFE whose kind is blank is checked with the SAFE rows taken together, by count and amount (OX11): one SAFE for $200,000 against one row of 1 for $200,000. **The row doesn't fill the blank.** The table groups SAFEs by type and terms, never by holder, so which SAFE a row means is a guess when there are several. Here there's one, and the rule is the same.

**What differs from Alder Gate's result:**
- `unconverted_safes`: `safe_investor_s` has `valuation_cap` "8000000" and `cap_type` null, in place of `post_money_cap` "8000000". Its holder, amount and discount are unchanged.
- `to_fill`: `{ "safe": "safe_investor_s", "field": "cap_type" }`, where Alder Gate's is empty.

The SAFE is read and counted as before (`read.safes` 2, `convertible_rows` 1), and the report's notes are Alder Gate's.

## `note-in-a-row`, on Alder Gate (ocx-01)

**The change:** the Summary View's convertibles table gets a second row, "Convertible Notes": 1 note, `Outstanding Amount` $150,000, `Valuation Cap` $6,000,000, no `Discount`. `Total` moves from row 4 to row 5. There's no notes ledger.

**How it's read** (OX11). 0.7 has no notes ledger anyone has seen, so a note follows the 0.4/0.5 rule: one note per row, its terms blank to fill.
- **Its holder** is made for the row, since the row names none: "Convertible notes, $6,000,000 cap (1)", its type, then its cap, then its count (0.6.0 plan, question 10). Its id is the name made lower case, each run of anything but letters and digits made one "_", ends trimmed (OX3): `convertible_notes_6_000_000_cap_1`.
- **The note's id** is `note_` and its holder's: `note_convertible_notes_6_000_000_cap_1`.
- **Principal:** the `Outstanding Amount`, 150000. Whether that includes interest is open until an export shows a note (answer 11).
- **Cap:** 6000000, read as pre-money, the only kind the engine models (O9), with a `note_cap_read_as_pre_money` line.
- **Discount:** empty, so none, written "0", as for a SAFE.
- **Interest:** simple (`interest_method` "simple"), the only kind the engine models (X3). Its rate is blank.
- **Blank:** `interest_rate`, `issue_date`, `conversion_base` and `repayment_multiple`, in the note's own field order. The page asks for each. The sale's date, which interest runs to, the page already asks for wherever a note is outstanding (O13); it's not a blank of the import's, and `no_sale_date_field` is in every report.
- **A `note_from_convertibles_row` line** says where the note came from.

**The issue order** (OX12): SAFE-2 was issued 1 February 2025. The note has no issue date, so it falls back to the default, after everything with a date, with an `issue_order_default` line: `["safe_investor_s", "note_convertible_notes_6_000_000_cap_1"]`.

**The convertibles check:** the `Post-$ SAFEs` row still agrees with SAFE-2. The note's row is where the note came from, so there's nothing to check it against.

**What differs from Alder Gate's result:**
- `holders`: the made holder, after the workbook's seven.
- `unconverted_notes`: the note, as above.
- `issue_order`: the note after the SAFE.
- `to_fill`: the note's four blanks.
- `read.convertible_rows`: 2, since both rows are read now, the SAFEs' for a check and the note's for a value.
- `notes`: `note_from_convertibles_row`, `note_cap_read_as_pre_money` and `issue_order_default`, each naming the note, after `warrant_counts_are_maximums` and before the holders left out.

No other holder changes, and Employees E and F are still left out.

## `preferred-prices-differ`, on Ferncliff (ocx-02)

**The change:** PS-2, Investor Y's 500,000 Series Seed Preferred, was issued at $0.90 (H4), with `Cash Paid` $450,000 (I4) to match.

**How it's read** (OX7): with no Financing History, a preferred class's issue price comes from its ledger only when every certificate not made by a transfer has the same `Price`. PS-1 is at $1 and PS-2 at $0.90, and neither was made by a transfer (no `Cert. Transferred From`). So there's no one price, and `original_issue_price` is blank. Nothing picks one: not the first, the larger, or the average.

**What differs from Ferncliff's result:**
- `series_seed_preferred`: `original_issue_price` null, where Ferncliff's is "1".
- `to_fill`: `{ "security": "series_seed_preferred", "field": "original_issue_price" }` first, then Ferncliff's four: the conversion price, the multiple, participation, and seniority last.
- `notes`: no `issue_price_from_ledger` line, since the price doesn't come from the ledger. No line replaces it: the blank says the price wasn't found.

The holdings are unchanged: the price doesn't move a share. Neither does the issue order: Series Seed Preferred's earliest `Issue Date` is still 15 November 2024.

## What a re-derivation should check

1. **Each fixture against its base:** apply the change to the base's `workbook.json` and read it by OX3 to OX13. Each result should match `expected.json` exactly, notes compared as a set.
2. **That nothing is guessed:** each blank above is `null`, and listed to fill, and nothing the workbook doesn't say is filled. Especially: the SAFE's kind isn't taken from the `Post-$ SAFEs` row, and the series' price isn't taken from either certificate.
3. **The made holder's name and ids,** by OX3 and OX11.
4. **That every other line is the base's.**
