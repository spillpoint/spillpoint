# Test zips

Zips of OCF case 12's package (Quillfern Labs, `cases/ocf-12-ledger/package`), our own fictional company, for the
page's zip reader (`test/zip.test.ts`, M6 plan, answer 11):

- `quillfern-macos.zip`: made by macOS's `ditto -c -k --sequesterRsrc --keepParent`, as Finder's Compress makes one.
  One file carried an extended attribute, so the zip has a `__MACOSX` resource fork beside it, as a downloaded file's
  would. Its entries use data descriptors, so their sizes are only in the zip's directory.
- `quillfern-zip.zip`: made by the `zip` command, `zip -r -X`.
- `quillfern-windows.zip`: written to match what Windows' `Compress-Archive` (PowerShell 5) and .NET's older
  `ZipFile` write: "\" between folders, made on MS-DOS, deflated. It was synthesized with Python's `zipfile`, since the
  machine that made these can't run Windows. A zip made on Windows itself can replace it.

# A test workbook

- `hollis-mill.xlsx`: OCX case 06, Hollis Mill Robotics (`cases/ocx-06-hollis-mill/workbook.json`), our own fictional
  company, written by `xlsxOf` in `test/workbooks.ts` with each formula's saved value only, so a spreadsheet app that
  opens it has nothing to work out (06g). `test/saved-workbook.test.ts` checks it's what the writer writes today.
- `hollis-mill-saved.xlsx`: that file opened in ONLYOFFICE 8.1 and saved again as .xlsx, unchanged, so the page's
  reader is tested on XML a spreadsheet app wrote (0.6.0 plan, answer 13). ONLYOFFICE rewrote every part and added
  `docProps/app.xml`, `docProps/core.xml` and a theme, with the same 473 cells and the same text. The author fields in
  `docProps/core.xml` were checked before it was committed: there's no `dc:creator`, and `cp:lastModifiedBy` is empty,
  so nothing needed blanking. The reader never reads `docProps/`.

# Files saved by the page at v0.6.0

Saved with the page as tag v0.6.0 has it (`apps/dashboard` at that tag, in a scratch worktree, clicked through by a
scratch test like `test/acceptance.test.tsx`), for `test/saved-0.6.0.test.tsx` (07d2). Each names a series from SAFEs
as 0.6.0 did, `<series>_shadow`, which 0.7.0 calls `<series>_safes`. Fictional names only.

- `millrace-saved-0.6.0.json`: the Millrace example, saved as it opens. Its Seed, Series A and Series B list
  `seed_shadow` in their seniority.
- `company-saved-0.6.0.json`: "My company", built on a blank company: Founder A's 8,000,000 common, a 10% pool, two
  $500,000 post-money SAFEs capped at $6M and $10M (Investor P and Investor Q), a Series A of $5M from Fund R at a $20M
  pre-money valuation that converts them at two prices, and a Series B of $15M from Fund S at $60M. The page filled the
  Series B's seniority from the table before it: `series_b`, `series_a`, `series_a_shadow` and `series_a_shadow_2`.
- `results-0.6.0.json`: what 0.6.0's engine paid on each file as the page opened it: every breakpoint, with its exact
  exit value and its reasons' codes and subjects, and every holder's and class's payout, to 40 digits, at each
  breakpoint and at six round exit values.
