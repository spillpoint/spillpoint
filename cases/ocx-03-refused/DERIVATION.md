# OCX case 03, refused: derivation

One small change to an OCX 0.7 workbook for each thing the import refuses: 29 fixtures, 11 unsupported and 18 malformed. 27 change case 01's workbook, Alder Gate Labs, and two change case 02's, Ferncliff Labs, where preferred stock is needed. Each fixture file names its base and lists its change, cell by cell (C18). Each change leaves one problem, so each result is one refusal: its kind, its term, and its subject, the workbook's own text for what it's about (OX13).

**Two kinds of refusal:**
- **Unsupported:** the workbook may well be right, and spillpoint doesn't read what it says.
- **Malformed:** the workbook disagrees with itself or with the format, so there's no single cap table to read.

**The order of checks** (OX13) decides which refusal comes when a change could trip two. Eight steps, each stopping at the first refusal:
1. the layout
2. the layout's named tabs and their headers
3. the as-of date
4. the classes and the holdings columns
5. the holders
6. the ledgers
7. the rows, tab by tab in the workbook's order
8. the checks between tabs

Where a fixture changes more than one cell, the extra cells keep the rest of the workbook agreeing, so the one problem is the only one. Where an earlier step might have caught something, the row says why it doesn't.

## 1. The layout (OX4)

| Fixture | The change | Refused |
|---|---|---|
| `no-layout` | `Summary View` renamed "Summary", `Stakeholder View` renamed "Holders" | unsupported, `ocx_layout`, "0.7" |
| `mixed-layout` | `Summary View` renamed "Summary Snapshot" | malformed, `mixed_layout`, "Summary Snapshot" |

- **`no-layout`:** with none of the four tabs that set a layout, the reader can't say what the workbook is. The ledgers are still 0.7's, but they don't set it. The subject is the version label's version: Context still says "OCX Version 0.7", which decides nothing (OX4) and helps the page say what the workbook claims.
- **`mixed-layout`:** `Stakeholder View` sets 0.7. "Summary Snapshot" is 0.4/0.5's summary tab, so the workbook mixes layouts.

## 2. The named tabs

| Fixture | The change | Refused |
|---|---|---|
| `missing-tab` | `Stakeholder View` removed | malformed, `missing_tab`, "Stakeholder View" |

With no per-holder tab, `Summary View` sets 0.7 (step 1), and 0.7 needs a `Stakeholder View`. A missing header is refused the same way here, on these five tabs; the fixture for one is a ledger's, at step 6.

## 3. The as-of date (OX5)

| Fixture | The change | Refused |
|---|---|---|
| `as-of-weekday` | the Summary View's as-of label reads "As of Thu, 31 Oct 2025" | malformed, `bad_date`, "Summary View" |

31 October 2025 was a Friday. The label disagrees with itself, so the date can't be trusted. The other tabs still say "Fri", but the as-of date is read from the summary tab alone (OX13, step 3).

## 4. The classes and the holdings columns (OX7)

| Fixture | Base | The change | Refused |
|---|---|---|---|
| `unknown-class-heading` | Ferncliff | Series Seed Preferred's column headed "Series Seed Preferred (shares)" (D2) | unsupported, `unknown_class_heading`, "Series Seed Preferred" |
| `unknown-holdings-header` | Alder Gate | `Non-Plan Awards` headed "Restricted Stock Units" (G2) | unsupported, `unknown_holdings_header`, "Restricted Stock Units" |

- **`unknown-class-heading`:** the Summary lists Series Seed Preferred, and no column is headed "Series Seed Preferred Stock". This is OX7's refusal of a preferred class headed in a way the reader doesn't know, since 0.7's heading for preferred rests on no real export. The column itself is also a header the reader doesn't know, but classes are checked first, so the refusal names the class, which says more.
- **`unknown-holdings-header`:** "Restricted Stock Units" sits between `Stakeholder Group` and `Total Stock (outstanding)`, so it's a holdings column. It's not a class's `<class> Stock`, not a plan's `<plan> Options`, not `Stock Warrants` and not `Non-Plan Awards`. The column is all zeros, but a column the reader doesn't know could hold shares it would miss, so it's refused whatever it holds.

## 5. The holders (OX6)

| Fixture | The change | Refused |
|---|---|---|
| `duplicate-stakeholder` | the Stakeholder View's Founder B row (A8) renamed "Founder A" | malformed, `duplicate_stakeholder`, "Founder A" |

Two rows named Founder A, so which holds what would be a guess. Holders come before the ledgers (step 5), so CS-2 and CS-4, still naming Founder B, aren't reached.

## 6. The ledgers (OX8)

| Fixture | The change | Refused |
|---|---|---|
| `ledger-without-class` | the ledger whose tab name is cut short is titled "Alder Gate Labs Seed Conversion Ledger" (B1) | malformed, `ledger_without_class`, "Common Seed (SAFE conversion..." |
| `missing-class-ledger` | `Common Stock Ledger` removed | malformed, `missing_tab`, "Common Stock Ledger" |
| `missing-header` | Common Stock's ledger loses its `No. Shares Outstanding` header (M2) | malformed, `missing_header`, "Common Stock Ledger: No. Shares Outstanding" |

- **`ledger-without-class`:** the tab's name, "Common Seed (SAFE conversion...", isn't "<class> Ledger" for a class the Summary lists. Its title ends " Seed Conversion Ledger", which isn't " Common Stock Ledger" or " Common Seed (SAFE conversion) Ledger". So no class. Each ledger's class is found before each class's ledger is looked for, so this isn't reported as Common Seed's ledger missing. The subject is the tab's name.
- **`missing-class-ledger`:** every other ledger finds its class, and Common Stock has none. The subject is the tab a class ledger would be, "<class> Ledger". The plan ledger isn't matched to a plan (OX9), so it doesn't stand in.
- **`missing-header`:** the ledger is still a class ledger by its header row (`Stockholder` and more of its kind's), and its class is still its tab's name, so it passes the first two checks. Its headers are checked third, and it lacks one a class ledger needs. The subject is the column, as its tab and its header.

## 7. The rows, tab by tab

Each row is read holder first, then what says whether it's read, then the cells it needs, left to right (OX13, step 7). In Alder Gate's tab order: `Summary View` (classes, then convertibles), `Common Stock Ledger`, the seed ledger, the plan ledger, `Warrants Ledger`, `SAFEs Ledger`, `Context`.

### The Summary View's convertibles table (OX10, OX11)

Each fixture puts a new row at L4 and moves `Total` to row 5.

| Fixture | The new row | Refused |
|---|---|---|
| `warrant-for-future-series` | "Warrants for future series of Preferred Stock": 1, $50,000 | unsupported, `warrant_for_future_series`, "Warrants for future series of Preferred Stock" |
| `several-notes-in-row` | "Convertible Notes": 2, $300,000, a $6,000,000 cap | unsupported, `several_notes_in_row`, "Convertible Notes" |
| `unknown-security-type` | "KISSes": 1, $50,000 | unsupported, `unknown_security_type`, "KISSes" |

- **`warrant-for-future-series`:** a warrant for a series not yet issued has no series to model it on (OX10).
- **`several-notes-in-row`:** combining two notes whose dates or rates may differ isn't exact (OX11). Alder Gate has no notes ledger, so the row is how notes would be read.
- **`unknown-security-type`:** OCX lists four types, `Pre-$ SAFEs`, `Post-$ SAFEs`, `Convertible Notes` and `Warrants for future series of Preferred Stock`. "KISSes" isn't one.

For each, the subject is the row's `Security Type`, the only name a convertibles row has.

### Common Stock's ledger (OX5, OX6, OX8)

| Fixture | The change | Refused |
|---|---|---|
| `unknown-stakeholder` | CS-6's `Stockholder` (A8) is "Employee G" | malformed, `unknown_stakeholder`, "CS-6" |
| `formula-without-value` | CS-1's `No. Shares Outstanding` (M3) is a formula with no saved value | malformed, `formula_without_value`, "CS-1" |
| `fractional-shares` | CS-6 issued and outstanding 40,000.5 shares (F8, M8), and the Stakeholder View gives Employee D 40,000.5 (C4) | malformed, `fractional_shares`, "CS-6" |

- **`unknown-stakeholder`:** Employee G isn't on the Stakeholder View. Employee D's holdings no longer match either, but that's step 8, after the rows.
- **`formula-without-value`:** CS-1 says "Y", so its outstanding shares are needed, and the reader never works a formula out. A total with no saved value is skipped; a value the import needs isn't (OX5).
- **`fractional-shares`:** a share count must be whole. The Stakeholder View agrees with the ledger, so the fraction is the only problem. The Stakeholder View's values aren't read until step 8, so the ledger's row is what's refused.

### The plan ledger (OX9)

| Fixture | Base | The change | Refused |
|---|---|---|---|
| `status-mismatch` | Alder Gate | EP-1's `Display Status` (P3) is "Exercised" | malformed, `status_mismatch`, "EP-1" |
| `stock-appreciation-right` | Alder Gate | EP-5's `Type` (E7) is "SAR" | unsupported, `stock_appreciation_right`, "EP-5" |
| `unknown-share-class` | Alder Gate | EP-5's `Share Class` (O7) is "Common Stock B" | malformed, `unknown_share_class`, "EP-5" |
| `grant-of-preferred` | Ferncliff | a plan: its ledger, with EP-1, 10,000 options for Founder B over Series Seed Preferred, and its column, "Ferncliff Stock Plan Options", in place of `Non-Plan Awards`, giving Founder B 10,000 | unsupported, `grant_of_preferred`, "EP-1" |

- **`status-mismatch`:** EP-1 still has 200,000 outstanding, so its status must be "Outstanding". "Exercised" and 200,000 outstanding can't both be right.
- **`stock-appreciation-right`:** EP-5 is outstanding (50,000, "Outstanding"), so its cells are read, and `Type` comes before `Share Class`. A SAR pays cash, which spillpoint doesn't model (O6).
- **`unknown-share-class`:** the Summary lists Common Stock and Common Seed (SAFE conversion), not "Common Stock B". EP-5's type, strike and expiration date before it are fine.
- **`grant-of-preferred`:** spillpoint's options are over common (O6). Ferncliff is the base because it has a preferred class, so the grant names one the workbook has. The new plan ledger has 0.7's plan ledger headers, all 17, so step 6 passes. Its column and Founder B's 10,000 make the holdings agree, so the class is the only problem. Ferncliff has no `Stock Plan Details`, so there's no pool to check.

### The Warrants Ledger (OX10)

| Fixture | The change | Refused |
|---|---|---|
| `warrant-for-unknown-class` | W-1's `Series of Stock` (E3) is "Series A Preferred" | unsupported, `warrant_for_unknown_class`, "W-1" |

W-1 is outstanding (30,000, "Outstanding"). Alder Gate has no Series A Preferred. A warrant for a series not issued yet is refused as a future series is.

### The SAFEs Ledger (OX5, OX11)

| Fixture | The change | Refused |
|---|---|---|
| `unknown-status` | SAFE-2's `Display Status` (N4) is "Pending" | unsupported, `unknown_status`, "SAFE-2" |
| `bad-date` | SAFE-2's `Issue Date` (C4) is "Feb 2025" | malformed, `bad_date`, "SAFE-2" |
| `bad-number` | SAFE-2's `Valuation Cap` (E4) is the text "8M" | malformed, `bad_number`, "SAFE-2" |
| `currency` | SAFE-2's `Investment Amount Currency` (O4) is "CAD" | unsupported, `currency`, "SAFE-2" |

- **SAFE-1 is set aside** by its status, "Converted", in every one, so nothing past its holder and status is read.
- **`unknown-status`:** a SAFE's status is read before its other cells. "Pending" is none of "Outstanding", "Converted", "Cancelled" and "Canceled", so whether it's outstanding would be a guess.
- **`bad-date`:** the issue date is needed for the issue order (OX12). "Feb 2025" has no day and is in no form the reader reads.
- **`bad-number`:** the cap is needed, and a number is read only from a number cell (OX5).
- **`currency`:** spillpoint pays in US dollars only, as for OCF (O2).

## 8. The checks between tabs

| Fixture | The change | Refused |
|---|---|---|
| `total-mismatch` | the Summary View gives Common Stock 8,040,100 outstanding shares (C5) | malformed, `total_mismatch`, "Common Stock" |
| `holdings-mismatch` | the Stakeholder View gives Founder A 5,000,100 Common Stock (C7) | malformed, `holdings_mismatch`, "Founder A" |
| `pool-mismatch` | Context's plan details give 600,000 shares available for grant (H12) | malformed, `pool_mismatch`, "Alder Gate 2023 Equity Plan" |
| `convertibles-mismatch` | the Summary View counts two post-money SAFEs (M3) | malformed, `convertibles_mismatch`, "Post-$ SAFEs" |

- **`total-mismatch`:** Common Stock's outstanding certificates, the "Y" ones, are CS-1 5,000,000, CS-4 2,500,000, CS-5 500,000 and CS-6 40,000: 8,040,000, not 8,040,100. The Summary's `Outstanding Shares` has a saved value, so it's checked (OX5). Totals come first in step 8.
- **`holdings-mismatch`:** Founder A's one certificate, CS-1, holds 5,000,000. The total checks pass first: the Summary still says 8,040,000, and the Stakeholder View's `Total` row is a formula with no saved value, so it's skipped. Holders are checked in the Stakeholder View's order, and Employees C to F agree, so Founder A is the first that doesn't.
- **`pool-mismatch`:** the pool row's value under "Alder Gate 2023 Equity Plan Options" is 610,000. Context's row for that plan says 600,000. Every holder's holdings agree, so the pool's is the first check to fail. The subject is the plan.
- **`convertibles-mismatch`:** the SAFEs Ledger has one outstanding post-money SAFE, SAFE-2, for $200,000. The `Post-$ SAFEs` row now counts 2 for the same $200,000.

## What a re-derivation should check

1. **Each fixture against its base:** apply the change to the base's `workbook.json` and read it by OX3 to OX13. Each should give exactly the refusal above, and no other check should fail before it.
2. **The order:** where a change could trip two checks, the earlier step's refusal is the one given. The rows above that say "isn't reached", "after the rows" or "first" mark each place this matters.
3. **The kinds:** each `unsupported` is a term OX13 lists as one. Note `unknown_holdings_header`, unsupported here where the plan listed it malformed.
4. **The subjects:** each is text in the base or the change: a name, a row's number or type, a tab, or a tab and header.
