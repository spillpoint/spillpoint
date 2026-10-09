# Review: 04d (the engine reads a package: files, stakeholders, classes and the share ledger)

Branch `04d-ocf-reading`. The engine gets `readOcf(files)`, built as planned for 04d:
- **The package (O1, O2):** the manifest, its files, versions, dates and currency.
- **Stakeholders (O3).**
- **Stock classes (O4).**
- **The share ledger (O5):** splits and ratio adjustments included.
- **The report (O10, O11).**
- **The refusals.**

It takes the parsed files and returns the import in the case-file format (C16): `as_of`, `cap_table`, `to_fill` and `report`. Anything it won't read throws an `OcfRefusal` carrying `kind`, `term` and `subject`, with a plain-English message for the page.

**04e reads the rest:** plans and the pool, options and RSUs, warrants, SAFEs and notes. Until then a package holding any of those is refused as `not_yet_read`. That refusal comes only after every other check, so the rest of each package is still checked.

**`cases/` is untouched.**

## How to check it

Run `pnpm test`. Then, case by case:

1. **Cases 05 and 06,** edge cases 4 and 5a written in OCF, import to their hand-worked results exactly. Each is then paid at its locked case's exit values and breakpoints, and matches it:
   - the same answers and decisions
   - every payout within the recorded cent
   - the same breakpoints, each within a cent, with the same reasons and jump flags

   This is the check you set out for Millrace in the 04b2 review, written once for every package that writes a locked case.
2. **Nineteen of case 03's 36 refusals** are refused with exactly the kind, term and subject `expected.json` gives:
   - **The package:** `version-2`, `missing-file`, `currency`, `after-as-of`, `unknown-object-type`, `duplicate-id`.
   - **References and the ledger:** `unknown-stakeholder`, `unknown-stock-class`, `unknown-security`, `closed-security`, `quantities-dont-reconcile`, `split-of-preferred`, `split-with-derivatives`.
   - **Stock classes:** `class-conversion-mechanism`, `several-conversion-rights`, `conversion-into-preferred`, `conversion-ratio-mismatch`, `conversion-ratio-loose`, `cap-below-preference`.

   The other 17 are about grants, the pool, warrants, SAFEs and notes. They come in 04e.
3. **The other seven packages** are refused only as not yet read: Larkspur, Millrace, Quillfern, and cases 07 to 10. Read without their options, plans, warrants and convertibles, each gives exactly its case's:
   - classes
   - seniority tiers
   - shares of stock
   - class and stock notes

   That checks the share ledger against your re-derived tallies now. **Larkspur's ledger** takes in a split with its reissuance, a transfer, a repurchase, a consolidation, a cancellation, a conversion, a retraction and a ratio adjustment. It gives:
   - **Common:** Founder A 5,400,000, Founder B 3,400,000, Investor Y 250,000, C 50,000, Lender L 20,000, D 10,000.
   - **Seed:** Investor X 2,000,000, Investor Y 800,000, Investor S 125,000.
   - **Series A:** Investor Y 1,500,000, Investor X 500,000.

   Millrace's Series A reads with `conversion_ratio_rounded`. Quillfern's Angel S shares read with `issued_at_other_price`.
4. **Small packages written in the tests** cover the rules no case reaches:
   - a split only multiplies what was outstanding before its date
   - a split leaving a fraction is refused
   - a transfer without a balance leaves the rest with the original
   - a balance can't move to another holder
   - a security cancelled in full can't be named again
   - a holder whose only security was retracted is left out
   - a consolidation must add up
   - the ratio check at 2, 4 and 10 places
   - an empty preferred class is left out
   - a cap with no preference multiple
   - common with a conversion right is refused
   - versions, the manifest, an unlisted file and an unrecognized field
   - a fraction of a share is refused

**What a refusal says.** These are the messages the page will show in 04f, for example:
- **`quantities-dont-reconcile`:** "tx-r-transfer: sec-b5 held 3,400,000, so taking 400,000 leaves 3,000,000, but its balance, sec-r-balance, holds 3,100,000".
- **`conversion-ratio-loose`:** "Class cls-r-loose's conversion ratio (1.04 for 1) doesn't agree with its issue price ÷ conversion price ($1.5 ÷ $1.5), even allowing for how the numbers are written".

## Moved to 04e

- **Paying Millrace, Quillfern and cases 07 to 10.** You asked for Millrace's pay check in 04d, but its package has options and SAFE conversions, which 04e reads. The check is written, as above, and runs on them as soon as they import.
- **The README's OCF section,** with the credit line and an example. The credit is already at the top of the importer, `src/ocf.ts`. The README describes the published package, so its section lands when the importer reads everything.
- **Running OCF's published examples in `local/`.** Most of them hold options, so a run now would mostly report "not yet". Downloading them needs network access. I'll ask before running anything outside the sandbox.

The locked derivations of cases 05 to 12 say "from 04d the engine pays…". Read that as "from the engine work on". They're locked, so they're unchanged.

## Decisions for you to check (all New, in ASSUMPTIONS)

1. **Not yet read.** Until 04e, a package holding options, plans, warrants or convertibles is refused as `not_yet_read`, last, after every other check. It never ships: 0.4.0 comes after 04e.
2. **A preferred class with nothing outstanding** on the package's date is left out, with a report line, `left_out_stock_class` (O4). An authorized Series B with no shares issued would otherwise ask you to fill in terms that change nothing. Every common class stays.
3. **Whole shares only** (O5). An issuance of a fraction of a share, or a split that leaves one, is refused as `fractional_shares`, since a cap table holds whole shares.
4. **A conversion right on a common class,** or a ratio adjustment to one, is refused as `common_conversion_right` (O4). An empty list of rights on common is fine.
5. **A participation cap with no preference multiple** (O4). Participation stays blank, since there's nothing to compare the cap with. The cap is kept, so it's there once you fill in the multiple.
6. **A balance stays with its holder, in its class** (O5). So do a reissuance's and a consolidation's results. Otherwise they don't reconcile.
7. **The date check skips what's set aside** (O1). A transaction of a type set aside, such as a vesting event, isn't checked against the package's date.
8. **Files** (O2):
   - a file without a `file_type`, or with one OCF doesn't have, is refused
   - files are matched to the manifest by name, ignoring any folder, since a .zip may keep them in one

## Checks

- **Engine:** 1,772 tests pass, 99 more, all reading OCF.
- **Dashboard:** 322 tests pass.
- **Typecheck:** clean.
- **The public API** adds `readOcf` and `OcfRefusal`, with types `OcfFile`, `OcfImport`, `OcfReport`, `OcfNote` and `OcfToFill`.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`. `.claude/settings.json` has local changes that aren't committed.
- **Nothing run outside the sandbox.**

## Open questions

The decisions above. Next is 04e: plans, options, warrants, SAFEs and notes, then the full cases and the OCF examples run. I'm stopping here.
