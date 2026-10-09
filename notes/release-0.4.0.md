# spillpoint 0.4.0: release notes

Open Cap Format import. The engine reads an OCF export into a cap table, and the page opens one. The version in `packages/engine/package.json` is 0.4.0; it is published from there.

Open Cap Format (OCF) is developed by the Open Cap Table Coalition: https://open-cap-table-coalition.github.io/Open-Cap-Format-OCF/. spillpoint reads files in that format.

## New

**`readOcf(files)`** reads an OCF package, versions 1.0 to 1.2 (04d, 04e). It takes the package's files, each already parsed from JSON. Opening a .zip is the caller's job.

It gives:
- **`as_of`:** the package's date. The cap table is as of it, and a transaction dated after it is refused.
- **`cap_table`:** in the case-file format, ready for `readCapTable`, with `null` wherever OCF doesn't settle a term. Nothing is guessed: a term OCF doesn't settle is left blank for you to fill in, or read a set way with a report line saying so.
- **`to_fill`:** each blank:
  - a series' participation when it gives no cap, since OCF has no participation flag
  - a series' price, preference multiple or conversion price when OCF gives none
  - a SAFE's cap kind when its conversion timing is missing
  - a note's base when its capitalization rules match neither reading
  - a note's repayment multiple when it gives no exit multiple
- **`report`:**
  - `read`: what was read, by object type
  - `not_needed`: what was read and set aside, such as vesting, valuations, legends and acceptances
  - `notes`: one line, by code, for each choice the import made

OCF records a ledger, not how a round was priced, so an import builds no rounds.

**What it reads:**
- **The package:** the manifest and the files it lists. A file it doesn't list is read too, with a line.
- **Stakeholders.** One with nothing outstanding is left out, and listed.
- **Stock classes:**
  - each preferred class's price and preference
  - participation, read from its cap, with the cap including the preference
  - its conversion price and seniority
  - the conversion ratio, checked against the price ÷ the conversion price, allowing only for the rounding the written numbers allow
- **The share ledger:** issuances, transfers, cancellations, repurchases, conversions, reissuances, consolidations, retractions, splits and conversion ratio adjustments. Balance securities are reconciled.
- **Stock plans and the unissued pool,** under each plan's cancellation behavior.
- **Options and RSUs:** exercises, releases, cancellations, transfers, retractions, repricings and expiry. RSUs are read as options at a $0 strike.
- **Warrants** for a fixed number of shares of a class.
- **SAFEs and notes still outstanding,** within the terms the engine models.

**It refuses by name** with an `OcfRefusal`, carrying a `kind`, a `term` and a `subject`:
- **`unsupported`:** valid OCF that spillpoint doesn't model.
- **`malformed`:** files that disagree with each other or with OCF.

Nothing is skipped. The rules, each with its default, are O1 to O13 in `docs/ASSUMPTIONS.md`.

**How it's tested:**
- **Twelve OCF cases of our own,** written by hand and re-derived independently: a 66-transaction fictional company, 36 refusals, 17 set-aside types, the terms left open, and six locked edge cases written in OCF.
- **Millrace,** with its prices written to OCF's 10 places. It pays as its locked case does, within a cent.
- **A 34-transaction ledger,** Quillfern Labs, whose cap table is the new edge case 25, paid by the reference.
- **OCF's own published examples,** run locally and described in the 04e review. Nothing from them is in the repository.

## On the page

- **"Open an OCF export"** (04f) takes a .zip, or a package's loose .json files.
  - **The report shows first,** in plain English, before anything is used.
  - **Each term OCF leaves open is asked,** with the sale's date when a note is outstanding, and how far up the exit values go.
  - **Then the cap table opens** as a saved file would. It isn't saved until you save it, as a spillpoint file.
- **The zip reader has no dependency** (04f, 04g):
  - it reads stored and deflated entries, the methods macOS, Windows and the zip command use
  - anything else is refused by name: another compression method, encryption, Zip64 or a split zip
  - an entry that fails its checksum, or inflates past its listed size, is refused as damaged
  - a zip that unzips to more than 100 MB is refused, and so are loose files that add up to more
  - macOS's `__MACOSX` resource forks are set aside
- **Browsers:** zips need a browser with DecompressionStream for deflate: Chrome 103, Safari 16.4, Firefox 113 or later. Loose files work in any browser.

## Changed answers

None. 0.4.0 adds to the engine and changes nothing it already did: every input 0.3.0 read gives the same answer.

## New in the API

- **`readOcf(files)`** and **`OcfRefusal`**, with the types `OcfFile`, `OcfImport`, `OcfReport`, `OcfNote` and `OcfToFill`.
- **The refusal terms:**
  - **`unsupported`:**
    - `cancellation_behavior_missing`, `cap_below_preference`
    - `class_conversion_mechanism`, `common_conversion_right`, `compensation_type`, `conversion_into_preferred`
    - `convertible_security`, `convertible_seniority`, `convertible_triggers_differ`
    - `currency`, `fractional_shares`, `grant_of_preferred`
    - `note_accrual_period`, `note_cash_interest`, `note_compounding`, `note_day_count`, `note_mfn`, `note_rate_periods`
    - `ocf_version`, `return_to_pool_conflict`, `safe_exit_multiple`, `several_conversion_rights`
    - `split_of_preferred`, `split_with_derivatives`, `stock_appreciation_right`
    - `too_many_shares`, `unknown_file_type`, `unknown_object_type`, `warrant_mechanism`
  - **`malformed`:**
    - `after_as_of`, `ambiguous_file`, `bad_value`, `closed_security`
    - `conversion_ratio_mismatch`, `convertible_mechanism_mismatch`
    - `duplicate_id`, `duplicate_security`, `missing_field`, `missing_file`
    - `no_manifest`, `not_an_ocf_file`, `pool_overdrawn`, `quantities_dont_reconcile`, `several_manifests`
    - `unknown_security`, `unknown_stakeholder`, `unknown_stock_class`, `unknown_stock_plan`
    - `warrant_quantity`
- **The report's note codes:**
  - **Fields OCF doesn't have:** `no_dividend_field`, `no_conversion_group_field`, `no_carve_out_field`, `no_sale_date_field`, `no_anti_dilution_field`.
  - **How a class is read:** `participation_cap_includes_preference`, `common_preference_ignored`, `conversion_rounding_not_modeled`, `conversion_ratio_rounded`.
  - **Securities:** `issued_at_other_price`, `rsu_as_option`.
  - **Convertibles:** `safe_exit_multiple_read_as_1`, `note_cap_read_as_pre_money`, `convertible_seniority_ignored`.
  - **What's left out:** `expired_option_left_out`, `expired_warrant_left_out`, `left_out_stakeholder`, `left_out_stock_class`.
  - **The package's files:** `not_in_manifest`, `unrecognized_field`.

## Changes that can break 0.3.0 code

None: 0.4.0 only adds.

One thing to know: `readOcf`'s outer names (`as_of`, `to_fill`, `not_needed`) are snake_case, where the rest of the API is camelCase. The 1.0 review of the API's names settles that once, and may rename them. The cap table inside stays in the case format.

## Still refused

**OCF terms deferred,** each until a case or a real export settles it (`docs/ASSUMPTIONS.md`, "Later"):
- **The package:**
  - importing as of an earlier date than the package's
  - amounts in a currency other than US dollars
  - fractional shares
  - a common class with a conversion right, as dual-class common might be
- **Classes and splits:**
  - a participation cap below the preference
  - splits of a preferred class, or of a class with options, warrants or convertible preferred outstanding on it
- **Plans:**
  - a return to pool under a plan whose own rule already decides it
  - a plan with no cancellation behavior, with a grant cancelled or expired under it
- **Convertibles:**
  - convertibles still outstanding with differing seniority
  - notes with compounding, 30/360, interest paid in cash, an accrual period other than daily, several rates, or an MFN clause

**The engine's own list is unchanged from 0.3.0** (its README's "Not settled yet").
