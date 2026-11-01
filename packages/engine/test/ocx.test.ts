// 0.6.0: reading an OCX workbook (ASSUMPTIONS OX1–OX14). Each OCX case's import must equal its hand-worked
// expected.json (C18), each fixture must be refused by name or read to its own result, and each locked case written as
// OCX, its blanks answered, must pay as that case does: within a cent, with the same decisions and breakpoints.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { D, ImportRefusal, findBreakpoints, prepare, readCapTable, readInputs, readOcx, solve } from "../src/index.ts";
import type { Breakpoint, CapTableImport, Decisions, OcxWorkbook } from "../src/index.ts";
import { CASES_DIR, OCX_CASES, decisionsFrom, expectedPoints, readCaseFile } from "./support/cases.ts";
import { applyOcxChange, readOcxFixture, readOcxWorkbook } from "./support/ocx.ts";

const CENT = new D("0.01");
type Json = Record<string, unknown>;
interface Refused {
  kind: string;
  term: string;
  subject: string;
}
interface Answer {
  security?: string;
  safe?: string;
  note?: string;
  field: string;
  value: unknown;
}
interface CaseExpected {
  result: CapTableImport;
  locked_case?: string;
  renamed?: Record<string, string>;
  answers?: Answer[];
}

const expectedOf = <T>(name: string): T => JSON.parse(readFileSync(join(CASES_DIR, name, "expected.json"), "utf8")) as T;
const WORKBOOK_CASES = OCX_CASES.filter((name) => !("fixtures" in expectedOf<Json>(name)));
const FIXTURE_CASES = OCX_CASES.filter((name) => "fixtures" in expectedOf<Json>(name));

/** C16, C18: notes are compared as a set, in no order; everything else as written. */
const asSet = (r: CapTableImport) => ({ ...r, report: { ...r.report, notes: r.report.notes.map((n) => JSON.stringify(n)).sort() } });

function refusalOf(workbook: OcxWorkbook): Refused | null {
  try {
    readOcx(workbook);
    return null;
  } catch (e) {
    if (!(e instanceof ImportRefusal)) throw e;
    expect(e.format).toBe("ocx");
    return { kind: e.kind, term: e.term, subject: e.subject };
  }
}

describe.each(WORKBOOK_CASES)("OCX case %s", (name) => {
  const expected = expectedOf<CaseExpected>(name);

  it("imports to its hand-worked result", () => {
    expect(asSet(readOcx(readOcxWorkbook(name) as OcxWorkbook))).toEqual(asSet(expected.result));
  });

  if (expected.locked_case) payLikeLockedCase(expected);
});

describe.each(FIXTURE_CASES)("OCX fixtures %s", (name) => {
  const expected = expectedOf<{ fixtures: Record<string, { refused?: Refused; result?: CapTableImport }> }>(name);
  it.each(Object.keys(expected.fixtures).sort())("%s", (fixture) => {
    const f = readOcxFixture(name, fixture);
    const workbook = applyOcxChange(readOcxWorkbook(f.base), f.change) as OcxWorkbook;
    const { refused, result } = expected.fixtures[fixture]!;
    if (refused) expect(refusalOf(workbook)).toEqual(refused);
    else expect(asSet(readOcx(workbook))).toEqual(asSet(result!));
  });
});

/**
 * A locked case written as OCX pays as that case does (C18, 06e5): its blanks answered as `answers` gives them, at
 * every listed exit value and breakpoint, every payout within a cent, with the same answers and decisions and the same
 * breakpoints. Where a price was rounded to 15 digits, a breakpoint can move a fraction of a cent, so decisions there
 * are compared at the import's own breakpoint (04b2).
 */
function payLikeLockedCase(expected: CaseExpected): void {
  const locked = expected.locked_case!;
  const renamed = expected.renamed ?? {};
  const rename = (id: string) => renamed[id] ?? id;
  const lockedExit = readInputs(readCaseFile(locked, "inputs.json"));

  const table = structuredClone(expected.result.cap_table) as Json & { securities: Json[]; unconverted_safes?: Json[]; unconverted_notes?: Json[] };
  for (const a of expected.answers!) {
    if (a.field === "seniority" && !a.security) table.seniority = a.value;
    else {
      const list = a.security ? table.securities : a.safe ? table.unconverted_safes! : table.unconverted_notes!;
      list.find((x) => x.id === (a.security ?? a.safe ?? a.note))![a.field] = a.value;
    }
  }
  const pc = prepare(readCapTable(table), lockedExit.exitDate);
  const points = expectedPoints(locked);
  const found = findBreakpoints(pc, lockedExit.range);
  const lockedBreakpoints = points.filter((p) => p.tags.includes("breakpoint"));
  const describeDecisions = (d: Decisions) => ({ converted: [...d.converted].sort(), exercised: [...d.exercised].sort() });
  const renamedDecisions = (d: Decisions) => ({ converted: new Set([...d.converted].map(rename)), exercised: new Set([...d.exercised].map(rename)) });

  it(`pays as ${locked} does, within a cent, at every exit value and breakpoint`, () => {
    for (const point of points) {
      const answers = solve(pc, point.exitValue).answers;
      expect(answers, point.label).toHaveLength(point.equilibria.length);
      answers.forEach((answer, i) => {
        const lines = new Map(answer.payout.lines.map((l) => [`${l.holder} ${l.security}`, l.amount]));
        for (const want of point.equilibria[i]!.lines) {
          const got = lines.get(`${rename(want.holder)} ${rename(want.security)}`);
          expect(got?.minus(want.amount).abs().lte(CENT), `${point.label}: ${want.holder} ${want.security}`).toBe(true);
        }
      });
    }
  });

  it(`decides as ${locked} does: at each listed exit value, and at each breakpoint its own`, () => {
    expect(found).toHaveLength(lockedBreakpoints.length);
    let b = 0;
    for (const point of points) {
      const at = point.tags.includes("breakpoint") ? found[b++]!.exitValue : point.exitValue;
      const answers = solve(pc, at).answers;
      expect(answers.map((a) => describeDecisions(a.decisions)), point.label).toEqual(
        point.equilibria.map((e) => describeDecisions(renamedDecisions(decisionsFrom(e.decisions)))),
      );
    }
  });

  it(`finds ${locked}'s breakpoints, each within a cent, with the same reasons and jumps`, () => {
    const lockedList = (readCaseFile(locked, "expected.json") as { exit: { breakpoints: { reasons: { code: string; security?: string; securities?: string[] }[]; payouts_jump?: boolean }[] } }).exit.breakpoints;
    const reasons = (b: Breakpoint) => b.reasons.map((r) => `${r.code}: ${[...r.subject].sort().join("+")}`).sort();
    found.forEach((b, i) => {
      const want = lockedList[i]!;
      expect(b.exitValue.minus(lockedBreakpoints[i]!.exitValue).abs().lte(CENT), `${b.exitValue.toFixed(4)}`).toBe(true);
      expect(reasons(b)).toEqual(
        want.reasons.map((r) => `${r.code}: ${(r.securities ?? (r.security ? r.security.split("+") : [])).map(rename).sort().join("+")}`).sort(),
      );
      expect(b.jumps).toBe(want.payouts_jump ?? false);
    });
  });
}

// ---------- rules the OCX cases don't reach, on small changes to them ----------

describe("rules the OCX cases don't reach", () => {
  const text = (address: string, value: string) => ({ address, kind: "text" as const, text: value, formula: false });
  const number = (address: string, value: string) => ({ address, kind: "number" as const, text: value, formula: false });
  const changed = (base: string, change: Parameters<typeof applyOcxChange>[1]) => applyOcxChange(readOcxWorkbook(base), change) as OcxWorkbook;

  it("counts days from 1900 through Excel's 29 February 1900, which it refuses, and from 1904 from day 0 (OX5)", () => {
    const expiring = (serial: string, system?: 1904) => {
      const change: Parameters<typeof applyOcxChange>[1] = [{ op: "set", tab: "Alder Gate 2023 Equity Plan...", cell: { address: "K3", kind: "date", text: serial, formula: false } }];
      if (system) change.unshift({ op: "date_system", to: system });
      return changed("ocx-01-alder-gate", change);
    };
    // Day 59 is 28 February 1900 and day 61 is 1 March 1900: both long expired, so EP-1 is left out.
    for (const serial of ["59", "61"]) expect(readOcx(expiring(serial)).report.notes).toContainEqual({ code: "expired_option_left_out", subject: "EP-1" });
    expect(refusalOf(expiring("60"))).toEqual({ kind: "malformed", term: "bad_date", subject: "EP-1" });
    // From 1904, day 0 is 1 January 1904.
    expect(readOcx(expiring("0", 1904)).report.notes).toContainEqual({ code: "expired_option_left_out", subject: "EP-1" });
  });

  it("gives a SAFE with no cap no cap fields, as an OCF import does (O8)", () => {
    const r = readOcx(changed("ocx-01-alder-gate", [{ op: "clear", tab: "SAFEs Ledger", address: "E4" }]));
    expect((r.cap_table as { unconverted_safes: Json[] }).unconverted_safes).toEqual([
      { id: "safe_investor_s", holder: "investor_s", purchase_amount: "200000", discount: "0" },
    ]);
    expect(r.to_fill).toEqual([]);
  });

  it("reads a 0.7 series' terms from Financing History, where the workbook has one (OX7)", () => {
    const headers = ["Round", "Initial Closing Date", "Most Recent Closing Date", "Original Issue Price", "Adjusted Conversion Price", "Conversion Ratio", "Liquidation Multiple", "Participating (Y/N)", "Participation Cap"];
    const r = readOcx(changed("ocx-02-ferncliff-preferred", [
      { op: "set", tab: "Context", cell: text("A5", "Financing History") },
      ...headers.map((h, i) => ({ op: "set" as const, tab: "Context", cell: text(`${"ABCDEFGHI"[i]}6`, h) })),
      { op: "set", tab: "Context", cell: text("A7", "Series Seed") },
      { op: "set", tab: "Context", cell: text("B7", "2024-11-01") },
      { op: "set", tab: "Context", cell: text("C7", "2024-11-15") },
      ...["D7", "E7", "F7"].map((a) => ({ op: "set" as const, tab: "Context", cell: number(a, "1") })),
      { op: "set", tab: "Context", cell: number("G7", "1.5") },
      { op: "set", tab: "Context", cell: text("H7", "N") },
      { op: "set", tab: "Context", cell: text("I7", "N/A") },
    ]));
    const seed = (r.cap_table as { securities: Json[] }).securities.find((s) => s.id === "series_seed_preferred");
    expect(seed).toMatchObject({ original_issue_price: "1", conversion_price: "1", preference_multiple: "1.5", participation: "non_participating" });
    expect(r.to_fill).toEqual([{ field: "seniority" }]);
    expect(r.report.read.financing_rounds).toBe(1);
    expect(r.report.notes.map((n) => n.code)).not.toContain("no_financing_history");
  });

  // OX12: a tab no layout names isn't read, and a line says so, naming it.
  it.each([
    ["ocx-01-alder-gate", "Context"],
    ["ocx-06-hollis-mill", "Context"],
  ])("sets aside a tab no layout names, with an unrecognized_tab line (%s)", (base, after) => {
    const r = readOcx(changed(base, [{ op: "add_tab", after, sheet: { name: "Notes to the export", cells: [text("A1", "Prepared for the board")] } }]));
    const want = expectedOf<CaseExpected>(base).result;
    expect(asSet(r)).toEqual(asSet({ ...want, report: { ...want.report, notes: [...want.report.notes, { code: "unrecognized_tab", subject: "Notes to the export" }] } }));
  });

  // Jordan, after #87: the Mantle export writes every computed column as a formula with no saved value, and only the
  // holdings as values. With every formula's value dropped, each case still reads, its unchecked totals noted (OX5).
  it.each(WORKBOOK_CASES)("reads %s with every formula's saved value dropped, noting the totals it skipped", (name) => {
    const workbook = readOcxWorkbook(name) as OcxWorkbook;
    for (const sheet of workbook.sheets) for (const c of sheet.cells) if (c.formula) c.text = "";
    const want = expectedOf<CaseExpected>(name).result;
    const notes = want.report.notes.some((n) => n.code === "formula_totals_skipped") ? want.report.notes : [...want.report.notes, { code: "formula_totals_skipped" }];
    expect(asSet(readOcx(workbook))).toEqual(asSet({ ...want, report: { ...want.report, notes } }));
  });

  it("refuses a convertibles row whose count or amount is blank, naming its type; a 0 written is read (OX13)", () => {
    expect(refusalOf(changed("ocx-06-hollis-mill", [{ op: "clear", tab: "Summary Snapshot", address: "M3" }]))).toEqual({ kind: "malformed", term: "bad_number", subject: "Post-$ SAFEs" });
    expect(refusalOf(changed("ocx-06-hollis-mill", [{ op: "clear", tab: "Summary Snapshot", address: "N4" }]))).toEqual({ kind: "malformed", term: "bad_number", subject: "Convertible Notes" });
    expect(refusalOf(changed("ocx-01-alder-gate", [{ op: "clear", tab: "Summary View", address: "M3" }]))).toEqual({ kind: "malformed", term: "bad_number", subject: "Post-$ SAFEs" });
    // A row of 0 SAFEs, written, makes no SAFE.
    const r = readOcx(changed("ocx-06-hollis-mill", [
      { op: "set", tab: "Summary Snapshot", cell: number("M3", "0") }, { op: "set", tab: "Summary Snapshot", cell: number("N3", "0") },
    ]));
    expect((r.cap_table as { unconverted_safes?: Json[] }).unconverted_safes).toBeUndefined();
  });

  it("refuses a conversion price of 0, naming the class (OX14)", () => {
    expect(refusalOf(changed("ocx-06-hollis-mill", [{ op: "set", tab: "Context", cell: number("E8", "0") }]))).toEqual({ kind: "malformed", term: "bad_number", subject: "Series A Preferred" });
  });

  it("names the holder when a holding is unreadable, though the per-holder Total row has a saved value (OX9)", () => {
    expect(refusalOf(changed("ocx-01-alder-gate", [
      { op: "set", tab: "Stakeholder View", cell: { address: "C15", kind: "number", text: "8040000", formula: true } },
      { op: "set", tab: "Stakeholder View", cell: text("C7", "5,000,000") },
    ]))).toEqual({ kind: "malformed", term: "bad_number", subject: "Founder A" });
  });

  it("refuses 0.3's per-holder tab beside 0.4/0.5's as a mix of layouts (OX13, step 1)", () => {
    expect(refusalOf(changed("ocx-06-hollis-mill", [{ op: "add_tab", after: "Context", sheet: { name: "Detailed Snapshot", cells: [text("A2", "Shareholder")] } }]))).toEqual({
      kind: "malformed", term: "mixed_layout", subject: "Detailed Snapshot",
    });
  });
});

// 10f: the first real Carta export, a 0.4/0.5 workbook, was refused for having no `Participating (Y/N)`: every header
// before it was there. Without either participation column, each preferred class's participation is a term to fill,
// never guessed, and a line names the column; a header OCX doesn't have is still an unrecognized_field line (OX14).
describe("a 0.4/0.5 workbook without a participation column (OX14; 10f)", () => {
  const text = (address: string, value: string) => ({ address, kind: "text" as const, text: value, formula: false });
  const hollis = expectedOf<CaseExpected>("ocx-06-hollis-mill").result;
  // Financing History's header is row 6, Seed's round row 7 and Series A's row 8; H is `Participating (Y/N)`, I `Participation Cap`.
  const removed = (column: string) => [6, 7, 8].map((row) => ({ op: "clear" as const, tab: "Context", address: `${column}${row}` }));

  it.each([
    ["without Participating (Y/N)", removed("H"), "Participating (Y/N)", []],
    ["without Participation Cap", removed("I"), "Participation Cap", []],
    ["with Participating (Y/N) renamed", [{ op: "set" as const, tab: "Context", cell: text("H6", "Participating") }], "Participating (Y/N)", [{ code: "unrecognized_field", subject: "Context", field: "Participating" }]],
  ])("reads Hollis Mill %s: each preferred class's participation blank to fill, with a line naming the column", (_, change, column, more) => {
    const r = readOcx(applyOcxChange(readOcxWorkbook("ocx-06-hollis-mill"), change) as OcxWorkbook);
    const preferred = ["series_seed_preferred", "series_a_preferred"];
    const securities = (hollis.cap_table as { securities: Json[] }).securities.map((s) => (preferred.includes(String(s.id)) ? { ...s, participation: null, cap_multiple: null } : s));
    const want: CapTableImport = {
      ...hollis,
      cap_table: { ...hollis.cap_table, securities },
      to_fill: [...preferred.map((security) => ({ security, field: "participation" })), ...hollis.to_fill],
      report: {
        ...hollis.report,
        // Series A's cap isn't read, so neither is how it's read.
        notes: [...hollis.report.notes.filter((n) => n.code !== "participation_cap_includes_preference"), { code: "no_participation_column", subject: column }, ...more] as CapTableImport["report"]["notes"],
      },
    };
    expect(asSet(r)).toEqual(asSet(want));
  });

  /** A 0.4/0.5 workbook with common stock only, and Financing History's header with these participation columns. */
  const commonOnly = (participation: string[]): OcxWorkbook => {
    const tab = (name: string, rows: string[][]) => ({
      name,
      cells: rows.flatMap((row, r) =>
        row.flatMap((value, c) => (value === "" ? [] : [{ address: `${"ABCDEFGHI"[c]}${r + 1}`, kind: /^\d+$/.test(value) ? ("number" as const) : ("text" as const), text: value, formula: false }])),
      ),
    });
    return {
      dateSystem: 1900,
      sheets: [
        tab("Summary Snapshot", [
          ["As of 2025.06.30"],
          ["Share Class", "Outstanding Shares", "Liquidation Preference", "Security Type", "# of Securities", "Outstanding Amount", "Discount", "Valuation Cap"],
          ["Common Stock"],
          ["Common Stock", "8000000", "N/A"],
        ]),
        tab("Stakeholder Snapshot", [
          ["As of 2025.06.30"],
          ["Stakeholder", "Stakeholder Group", "Common Stock", "Total Stock (outstanding)"],
          ["Founder A", "", "6000000", "6000000"],
          ["Founder B", "", "2000000", "2000000"],
        ]),
        tab("Context", [
          ["Financing History"],
          ["Round", "Initial Closing Date", "Original Issue Price", "Adjusted Conversion Price", "Conversion Ratio", "Liquidation Multiple", ...participation],
          [],
          ["Stock Plan Details"],
          ["Plan Name", "Outstanding RSUs", "Shares Available for Grant"],
        ]),
      ],
    } as OcxWorkbook;
  };

  it("reads a workbook with no preferred stock, with or without the columns, and asks nothing", () => {
    const codes = (r: CapTableImport) => r.report.notes.filter((n) => n.code === "no_participation_column").map((n) => n.subject);
    for (const [columns, missing] of [
      [["Participating (Y/N)", "Participation Cap"], []],
      [["Participation Cap"], ["Participating (Y/N)"]],
      [[], ["Participating (Y/N)", "Participation Cap"]],
    ] as const) {
      const r = readOcx(commonOnly([...columns]));
      expect((r.cap_table as { securities: Json[] }).securities.map((s) => s.kind)).toEqual(["common"]);
      expect(r.to_fill).toEqual([]);
      expect(codes(r), columns.join(", ")).toEqual(missing);
    }
  });
});
