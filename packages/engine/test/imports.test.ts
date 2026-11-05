// One refusal class and one result type for both imports (the naming review's item 7). Added in 0.6.0 beside the OCF
// names; since 0.7.0 they're the only names: readOcf throws ImportRefusal itself, and OcfRefusal and the Ocf* types
// are gone.

import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import * as spillpoint from "../src/index.ts";
import { ImportRefusal, InputError, readCapTable, readOcf, readOcx } from "../src/index.ts";
import type { CapTableImport, ImportBlank, ImportNote, ImportReport, OcxWorkbook } from "../src/index.ts";
import { readStartingTable } from "../src/input.ts";
import { CASES_DIR, OCX_CASES } from "./support/cases.ts";
import { OCF_FIXTURE_CASES, OCF_PACKAGE_CASES, fixtureNames, packageFiles, withFixture } from "./support/ocf.ts";
import { applyOcxChange, readOcxFixture, readOcxWorkbook } from "./support/ocx.ts";

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

describe("a table with a blank left doesn't read (O1, C19)", () => {
  // Structural, not field by field: every import the locked cases give, each package, workbook and fixture read by the
  // importer itself. A blank that read as a default would pass unfilled, on a guess nobody made, as a null pool, a null
  // conversion price and a null conversion_base did until 08b0. So a new kind of blank can't pass unnoticed.
  type Row = Record<string, unknown>;
  type Table = Row & { securities: Row[]; seniority: unknown; unconverted_safes?: Row[]; unconverted_notes?: Row[] };

  const readers: [string, () => CapTableImport][] = [
    ...OCF_PACKAGE_CASES.map((name): [string, () => CapTableImport] => [name, () => readOcf(packageFiles(name))]),
    ...OCF_FIXTURE_CASES.flatMap((name) => fixtureNames(name).map((f): [string, () => CapTableImport] => [`${name}/${f}`, () => readOcf(withFixture(name, f))])),
    ...OCX_CASES.filter((name) => existsSync(join(CASES_DIR, name, "workbook.json"))).map((name): [string, () => CapTableImport] => [
      name, () => readOcx(readOcxWorkbook(name) as unknown as OcxWorkbook),
    ]),
    ...OCX_CASES.filter((name) => existsSync(join(CASES_DIR, name, "fixtures"))).flatMap((name) =>
      fixtureNames(name).map((f): [string, () => CapTableImport] => {
        const fixture = readOcxFixture(name, f);
        return [`${name}/${f}`, () => readOcx(applyOcxChange(readOcxWorkbook(fixture.base), fixture.change) as unknown as OcxWorkbook)];
      }),
    ),
  ];
  // A refused export gives no table to look at.
  const imports = readers.flatMap(([name, read]): [string, CapTableImport][] => {
    try {
      return [[name, read()]];
    } catch (e) {
      if (e instanceof ImportRefusal) return [];
      throw e;
    }
  });
  const withBlanks = imports.filter(([, r]) => r.to_fill.length > 0);
  const blankName = (b: ImportBlank) => `${b.security ?? b.safe ?? b.note ?? "the table"}'s ${b.field}`;
  const eachBlank = withBlanks.flatMap(([name, r]) => r.to_fill.map((b): [string, CapTableImport, ImportBlank] => [`${name}: ${blankName(b)}`, r, b]));

  /** A stand-in answer, as the page's questions write one. A new kind of blank has none, so the test stops and says so. */
  const STAND_INS: Row = {
    original_issue_price: "1", conversion_price: "1", preference_multiple: "1", strike: "1",
    interest_rate: "0.05", issue_date: "2024-01-01", conversion_base: "with_pool", repayment_multiple: "1",
  };
  function answer(ct: Table, b: ImportBlank): void {
    if (b.field === "seniority" && !b.security) {
      ct.seniority = [ct.securities.filter((s) => s.kind === "preferred").map((s) => s.id)];
    } else if (b.safe && b.field === "cap_type") {
      ct.unconverted_safes = ct.unconverted_safes!.map((f) => {
        if (f.id !== b.safe) return f;
        const { valuation_cap, cap_type: _blank, ...rest } = f;
        return { ...rest, post_money_cap: valuation_cap };
      });
    } else {
      const row = (b.security ? ct.securities : b.safe ? ct.unconverted_safes! : ct.unconverted_notes!).find((x) => x.id === (b.security ?? b.safe ?? b.note))!;
      const value = b.field === "participation" ? (row.cap_multiple == null ? "non_participating" : "participating_capped") : STAND_INS[b.field];
      if (value === undefined) throw new Error(`a new kind of blank, ${b.field}: give it a stand-in here, and make sure it doesn't read as a default`);
      row[b.field] = value;
    }
  }
  const answered = (r: CapTableImport, leave?: ImportBlank): Table => {
    const ct = structuredClone(r.cap_table) as Table;
    for (const b of r.to_fill) if (b !== leave) answer(ct, b);
    return ct;
  };

  it("has imports to look at: blanks of every kind a question asks", () => {
    expect(imports.length).toBeGreaterThan(50);
    expect(new Set(eachBlank.map(([, , b]) => b.field))).toEqual(new Set([...Object.keys(STAND_INS), "participation", "seniority", "cap_type"]));
  });

  it.each(withBlanks)("%s doesn't read as it stands, its blanks unanswered", (_, r) => {
    expect(() => readCapTable(r.cap_table)).toThrow();
  });

  // One blank can't hide behind another, or behind a sale's limits: read as a starting table, which has none of those,
  // with every other blank answered, the one left is what stops it.
  it.each(eachBlank)("%s, left alone, stops the table", (_, r, b) => {
    let refused: unknown;
    try {
      readStartingTable(answered(r, b), "cap_table");
    } catch (e) {
      refused = e;
    }
    expect(refused).toBeInstanceOf(InputError);
    // A blank SAFE's cap is two fields the engine doesn't read: valuation_cap is the one it meets first.
    expect((refused as InputError).path).toMatch(b.field === "cap_type" ? /\.valuation_cap$/ : new RegExp(`(^|\\.)${b.field === "seniority" ? "cap_table\\.seniority" : b.field}$`));
  });

  // And the other way: a null left that no question asks about could never be filled in, and a good import would stop.
  it.each(imports)("%s reads, with every blank answered", (_, r) => {
    expect(() => readStartingTable(answered(r), "cap_table")).not.toThrow();
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
