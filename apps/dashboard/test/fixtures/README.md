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
- `hollis-mill-saved.xlsx`, once added: that file opened in a spreadsheet app and saved again as .xlsx, unchanged, so
  the page's reader is tested on XML a spreadsheet app wrote (0.6.0 plan, answer 13).
