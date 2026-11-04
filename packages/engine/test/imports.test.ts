// One refusal class and one result type for both imports (the naming review's item 7). Added in 0.6.0 beside the OCF
// names; since 0.7.0 they're the only names: readOcf throws ImportRefusal itself, and OcfRefusal and the Ocf* types
// are gone.

import { describe, expect, it } from "vitest";

import * as spillpoint from "../src/index.ts";
import { ImportRefusal, readOcf } from "../src/index.ts";
import type { CapTableImport, ImportBlank, ImportNote, ImportReport, OcxWorkbook } from "../src/index.ts";
import { OCF_CASES, OCX_CASES, readCaseFile } from "./support/cases.ts";
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

describe("a blank is always asked for (O1, C19)", () => {
  // readCapTable refuses a null conversion price or pool, so one an import left and didn't list could never be filled
  // in, and a good import would stop at Use. Every import result in the locked cases, fixtures included.
  type Found = { cap_table: { securities: Record<string, unknown>[]; unissued_pool?: unknown }; to_fill: ImportBlank[] };
  const results = (value: unknown): Found[] => {
    if (typeof value !== "object" || value === null) return [];
    const found = (value as Partial<Found>).cap_table && (value as Partial<Found>).to_fill ? [value as Found] : [];
    return [...found, ...Object.values(value).flatMap(results)];
  };
  const dirs = [...OCF_CASES, ...OCX_CASES];
  const imports = dirs.flatMap((d) => results(readCaseFile(d, "expected.json")).map((r) => [d, r] as const));

  it("finds the import results to look at, the two with this blank among them", () => {
    expect(imports.length).toBeGreaterThan(dirs.length / 2);
    const blank = imports.filter(([, r]) => r.cap_table.securities.some((s) => s.conversion_price === null));
    expect(new Set(blank.map(([d]) => d))).toEqual(new Set(["ocx-02-ferncliff-preferred", "ocx-04-to-fill"]));
  });

  it("lists every null conversion price in to_fill, and never leaves the pool null", () => {
    for (const [dir, { cap_table: table, to_fill: blanks }] of imports) {
      expect(table.unissued_pool, dir).not.toBeNull();
      for (const s of table.securities.filter((x) => x.conversion_price === null)) {
        expect(blanks, `${dir} ${String(s.id)}`).toContainEqual({ security: s.id, field: "conversion_price" });
      }
    }
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
