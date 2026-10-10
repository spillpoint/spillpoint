# OCX case 02: Ferncliff Labs, preferred stock in OCX 0.7

**This case rests on no real export** (ASSUMPTIONS OX7; Jordan, 06d review, answer 3). The one OCX 0.7 export seen, Mantle's, has no preferred stock. So how a preferred class is headed in 0.7, and whether 0.7 has Financing History, aren't known. This case reads a preferred class by the same rules as 0.7's common classes:
- **Its heading:** `<class> Stock`.
- **Its issue price:** from its ledger.
- **Every other term:** blank to fill.

It's the one case for preferred stock in 0.7 until an export with preferred stock shows more.

As in ocx-01, only the format's tab names and headers come from that export. The company, holders, numbers, titles and footnotes are our own.

## The layout and the date

- **The layout is 0.7** (OX4): `Summary View`, `Stakeholder View`, two ledgers whose header rows start `Stockholder`, and an empty `Warrants Ledger` and `SAFEs Ledger`. The label "OCX Version 0.7" is reported: `version_label`, field `0.7`.
- **The as-of date:** "As of Mon, 30 Jun 2025". 30 June 2025 is a Monday, so **`as_of` is 2025-06-30**.
- **Context has no Financing History:** only its title, the date it was generated and the label.

## The classes (OX7)

| Row | Share Class | Outstanding Shares |
|---:|---|---:|
| 4 | Common Stock**** | (a formula, no saved value) |
| 5 | Common Stock | 6,000,000 |
| 7 | Preferred Stock | (a formula, no saved value) |
| 8 | Series Seed Preferred | 1,500,000 |
| 10 | Total | (formulas, no saved value) |

- **Row 4 labels the `Common Stock` section,** whose class is row 5's "Common Stock", `common_stock`.
- **Row 7 labels the `Preferred Stock` section,** whose class is row 8's "Series Seed Preferred", `series_seed_preferred`, before `Total`.

`read.share_classes` is 2.

**Series Seed Preferred's terms:**
- **The workbook has no Financing History,** so no term comes from there. One `no_financing_history` line.
- **Its issue price comes from its ledger** (below): every certificate not made by a transfer has the price 1, so `original_issue_price` is "1", with an `issue_price_from_ledger` line naming the class.
- **Its conversion price, multiple and participation are blank** (`null`), each listed to fill: `conversion_price`, `preference_multiple`, `participation`. Nothing is guessed: not the issue price for the conversion price, and not 1x (O1). The page offers one-click answers for these, which you click, never preset (06g).
- **Its cap multiple is `null` too,** but that's not a term to fill: a cap belongs only to capped participation, which the answer to participation would bring.
- **Anti-dilution is "none,"** with a `no_anti_dilution_field` line (O11).
- **The Summary's `Liquidation Preference` for the class is empty,** so there's nothing to check it against. With no multiple, there couldn't be anyway.

**Seniority is blank,** since there's preferred stock and no layout says it: `seniority` is `null`, listed as `{ "field": "seniority" }`, with a `no_seniority_field` line.

## The heading (OX7, answer 4)

The Stakeholder View heads Series Seed Preferred's column "Series Seed Preferred Stock": `<class> Stock`, a pattern 0.7 has. A preferred class headed some other way would be refused (`unknown_class_heading`). This one isn't.

## The holders and holdings (OX6, OX8)

| Stakeholder | Common Stock Stock | Series Seed Preferred Stock | Stock Warrants | Non-Plan Awards |
|---|---:|---:|---:|---:|
| Founder A | 4,000,000 | 0 | 0 | 0 |
| Founder B | 2,000,000 | 0 | 0 | 0 |
| Investor X | 0 | 1,000,000 | 0 | 0 |
| Investor Y | 0 | 500,000 | 0 | 0 |
| *Options remaining for issuance* | 0 | 0 | 0 | 0 |

**Four holders:** `read.stakeholders` is 4. The pool's row is read for the pool's value (below): `read.pool_rows` is 1. The totals' columns and row are formulas with no saved value: `formula_totals_skipped`.

**The ledgers,** each named "<class> Ledger" for a class the Summary lists:

| Ledger | Cert No. | Stockholder | Price | Certificate Outstanding (Y/N) | No. Shares Outstanding |
|---|---|---|---:|---|---:|
| Common Stock | CS-1 | Founder A | 0.0001 | Y | 4,000,000 |
| Common Stock | CS-2 | Founder B | 0.0001 | Y | 2,000,000 |
| Series Seed Preferred | PS-1 | Investor X | 1 | Y | 1,000,000 |
| Series Seed Preferred | PS-2 | Investor Y | 1 | Y | 500,000 |

- **Four certificates:** `read.certificates` is 4.
- **Each holder's sum equals the Stakeholder View's column.**
- **No certificate was made by a transfer,** and Series Seed Preferred's two both have the price 1, so its issue price is 1.
- **The currencies** are "USD".

**Positions:** Founder A 4,000,000 and Founder B 2,000,000 in `common_stock`; Investor X 1,000,000 and Investor Y 500,000 in `series_seed_preferred`.

## The pool, warrants and SAFEs

- **The pool:** the pool's row has no plan column, so it sums to nothing, and `unissued_pool` is 0. There's no `Stock Plan Details` to check against.
- **The warrants and SAFEs ledgers** have only their header and `Total` rows: no warrant and no SAFE. So `read` has no count for them, and the cap table has no `unconverted_safes`.

## The issue order (OX12)

Series Seed Preferred's earliest `Issue Date` is 15 November 2024, and there's no SAFE or note: **`["series_seed_preferred"]`.**

## The report

- **`read`:** stakeholders 4, pool rows 1, share classes 2, certificates 4. The Summary View's convertibles table has no row, only its `Total`. `not_needed` is empty.
- **The notes:**
  - `version_label` (0.7)
  - O11's four
  - `no_seniority_field`
  - `formula_totals_skipped`
  - `no_financing_history`
  - `issue_price_from_ledger` and `no_anti_dilution_field` (both for `series_seed_preferred`)
- **To fill:** Series Seed Preferred's conversion price, multiple and participation, then seniority.

## What a re-derivation should check

1. The holdings against the Stakeholder View.
2. That the issue price is the one price on Series Seed Preferred's certificates.
3. That exactly the three terms and seniority are blank, and nothing else.
4. That this case says nothing about how a real 0.7 export heads or prices preferred stock: it shows only what the rules do with this workbook.
