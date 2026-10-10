// One refusal class and one result type for both imports (0.6.0; the naming review's item 7). Added beside the OCF
// names, which stay until 0.7.0, so nothing that reads 0.5.0's API breaks.

import { describe, expect, it } from "vitest";

import { ImportRefusal, OcfRefusal, readOcf } from "../src/index.ts";
import type { CapTableImport, ImportBlank, ImportNote, ImportReport, OcfImport, OcfNote, OcfReport, OcfToFill, OcxWorkbook } from "../src/index.ts";
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
  it("is what readOcf throws, as an OcfRefusal whose format is ocf", () => {
    const e = refusalOf(() => readOcf([{ name: "Notes.json", content: { file_type: "NOT_OCF" } }]));
    expect(e).toBeInstanceOf(ImportRefusal);
    expect(e).toBeInstanceOf(OcfRefusal);
    expect({ ...(e as object) }).toEqual({ name: "OcfRefusal", format: "ocf", kind: "unsupported", term: "unknown_file_type", subject: "Notes.json" });
  });

  it("can be raised for an OCX workbook, which isn't an OcfRefusal", () => {
    const e = new ImportRefusal("ocx", "malformed", "missing_tab", "Context", "The workbook has no Context tab");
    expect(e).toBeInstanceOf(Error);
    expect(e).not.toBeInstanceOf(OcfRefusal);
    expect({ ...e }).toEqual({ name: "ImportRefusal", format: "ocx", kind: "malformed", term: "missing_tab", subject: "Context" });
    expect(e.message).toBe("The workbook has no Context tab");
  });
});

describe("the shared result type", () => {
  it("is what readOcf returns, and the OCF names are the same types", () => {
    const imported: CapTableImport = readOcf(packageFiles("ocf-12-ledger"));
    // Each OCF name is an alias, so a value of one is a value of the other, both ways.
    const asOcf: OcfImport = imported;
    const report: ImportReport = asOcf.report satisfies OcfReport;
    const notes: ImportNote[] = report.notes satisfies OcfNote[];
    const blanks: ImportBlank[] = asOcf.to_fill satisfies OcfToFill[];
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
