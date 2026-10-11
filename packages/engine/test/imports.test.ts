// One refusal class and one result type for both imports (the naming review's item 7). Added in 0.6.0 beside the OCF
// names; since 0.7.0 they're the only names: readOcf throws ImportRefusal itself, and OcfRefusal and the Ocf* types
// are gone.

import { describe, expect, it } from "vitest";

import * as spillpoint from "../src/index.ts";
import { ImportRefusal, readOcf } from "../src/index.ts";
import type { CapTableImport, ImportBlank, ImportNote, ImportReport, OcxWorkbook } from "../src/index.ts";
import { packageFiles } from "./support/ocf.ts";

function refusalOf(read: () => unknown): unknown {
  try {
    read();
  } catch (e) {
    return e;
  }
  throw new Error("expected a refusal");
}

describe("ImportRefusal", () => {
  it("is what readOcf throws, itself, its format ocf", () => {
    const e = refusalOf(() => readOcf([{ name: "Notes.json", content: { file_type: "NOT_OCF" } }]));
    expect(e).toBeInstanceOf(ImportRefusal);
    expect(Object.getPrototypeOf(e)).toBe(ImportRefusal.prototype);
    expect({ ...(e as object) }).toEqual({ name: "ImportRefusal", format: "ocf", kind: "unsupported", term: "unknown_file_type", subject: "Notes.json" });
  });

  it("is raised for an OCX workbook the same way", () => {
    const e = new ImportRefusal("ocx", "malformed", "missing_tab", "Context", "The workbook has no Context tab");
    expect(e).toBeInstanceOf(Error);
    expect({ ...e }).toEqual({ name: "ImportRefusal", format: "ocx", kind: "malformed", term: "missing_tab", subject: "Context" });
    expect(e.message).toBe("The workbook has no Context tab");
  });

  it("is the only name: OcfRefusal is gone", () => {
    expect("OcfRefusal" in spillpoint).toBe(false);
  });
});

describe("the shared result type", () => {
  it("is what readOcf returns", () => {
    const imported: CapTableImport = readOcf(packageFiles("ocf-12-ledger"));
    const report: ImportReport = imported.report;
    const notes: ImportNote[] = report.notes;
    const blanks: ImportBlank[] = imported.to_fill;
    expect(imported.as_of).toBe("2025-12-31");
    expect(notes.length).toBeGreaterThan(0);
    expect(blanks).toEqual([]);
  });

  it("has an OCX input type with the workbook's date system", () => {
    const workbook: OcxWorkbook = {
      dateSystem: 1904,
      sheets: [{ name: "Context", cells: [{ address: "A1", kind: "date", text: "44196", formula: false }] }],
    };
    expect(workbook.sheets[0]!.cells[0]!.kind).toBe("date");
  });
});
