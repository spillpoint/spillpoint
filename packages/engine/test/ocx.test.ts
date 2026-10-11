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

  it("sets aside a tab no layout names and no ledger's header row marks, with no line (OX13)", () => {
    const r = readOcx(changed("ocx-01-alder-gate", [{ op: "add_tab", after: "Context", sheet: { name: "Notes to the export", cells: [text("A1", "Prepared for the board")] } }]));
    expect(asSet(r)).toEqual(asSet(expectedOf<CaseExpected>("ocx-01-alder-gate").result));
  });
});
