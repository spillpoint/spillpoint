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
