// A workbook saved by a spreadsheet app (0.6.0 plan, answer 13; 06g). `fixtures/hollis-mill.xlsx` is OCX case 06,
// Hollis Mill, as our own writer writes it with each formula's saved value only, so a spreadsheet app has nothing to
// work out. `fixtures/hollis-mill-saved.xlsx` is that file opened in a spreadsheet app and saved again, unchanged:
// it must import exactly as case 06 does, through the page's own reader. Until it's added, that test waits.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";
import type { CapTableImport, OcxWorkbook } from "spillpoint";

import { importOcx } from "../src/ocxImport.ts";
import { readZip } from "../src/zip.ts";
import { xlsxOf } from "./workbooks.ts";

const fixtures = resolve(import.meta.dirname, "fixtures");
const cases = resolve(import.meta.dirname, "../../../cases");
const book = JSON.parse(readFileSync(resolve(cases, "ocx-06-hollis-mill/workbook.json"), "utf8")) as OcxWorkbook;
const expected = (JSON.parse(readFileSync(resolve(cases, "ocx-06-hollis-mill/expected.json"), "utf8")) as { result: CapTableImport }).result;
const asSet = (r: CapTableImport) => ({ ...r, report: { ...r.report, notes: r.report.notes.map((n) => JSON.stringify(n)).sort() } });
const imported = async (name: string) => {
  const result = await importOcx({ name, bytes: new Uint8Array(readFileSync(resolve(fixtures, name))) });
  if (!result.ok) throw new Error(result.message);
  return result.result;
};

describe("a workbook for a spreadsheet app to save", () => {
  it("is case 06 as our writer writes it, with saved values only", () => {
    expect(new Uint8Array(readFileSync(resolve(fixtures, "hollis-mill.xlsx")))).toEqual(xlsxOf(book, { formulas: false }));
  });

  it("imports as case 06 does", async () => {
    expect(asSet(await imported("hollis-mill.xlsx"))).toEqual(asSet(expected));
  });

  it.skipIf(!existsSync(resolve(fixtures, "hollis-mill-saved.xlsx")))("imports as case 06 does once a spreadsheet app has saved it", async () => {
    expect(asSet(await imported("hollis-mill-saved.xlsx"))).toEqual(asSet(expected));
  });
});

// A spreadsheet app refuses a package whose parts have no content type (Jordan, after #88's review), so each part the
// writer writes has one: a default for its extension, or an override by its name.
it("gives every part of a workbook it writes a content type, so a spreadsheet app opens it", async () => {
  const entries = await readZip(xlsxOf(book));
  const types = new TextDecoder().decode(entries.find((e) => e.name === "[Content_Types].xml")!.bytes);
  const defaults = new Set([...types.matchAll(/<Default Extension="([^"]+)"/g)].map((m) => m[1]));
  const overrides = new Set([...types.matchAll(/<Override PartName="\/([^"]+)"/g)].map((m) => m[1]));
  const parts = entries.map((e) => e.name).filter((n) => n !== "[Content_Types].xml");
  for (const part of parts) expect(overrides.has(part) || defaults.has(part.split(".").pop()!), part).toBe(true);
  // Each override names a part that's there, and the workbook's own parts have one.
  for (const part of overrides) expect(parts, part!).toContain(part);
  for (const part of ["xl/workbook.xml", "xl/styles.xml", "xl/sharedStrings.xml", ...book.sheets.map((_, i) => `xl/worksheets/sheet${i + 1}.xml`)]) expect(overrides.has(part), part).toBe(true);
});
