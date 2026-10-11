// Checks that every locked case is internally consistent. No engine code is
// involved: these tests guard the case files themselves. The engine's own
// case tests arrive in M2.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";

import { applyOcxChange, cellPlace, readOcxFixture, readOcxWorkbook } from "./support/ocx.ts";
import type { OcxWorkbookJson } from "./support/ocx.ts";

const CASES = resolve(import.meta.dirname, "../../../cases");
const CENT = new Decimal("0.01");
// A locked price can be a long exact fraction; dividing it out at 40 digits rounds it to 10 places correctly.
const Decimal40 = Decimal.clone({ precision: 40 });
const byId = (a: Record<string, unknown>, b: Record<string, unknown>) => String(a.id).localeCompare(String(b.id));

interface Line {
  holder: string;
  security: string;
  amount: string;
}
interface Outcome {
  lines: Line[];
  holder_totals: Record<string, string>;
  class_totals: Record<string, string>;
}
interface PayoutPoint {
  exit_value: string;
  tags: string[];
  equilibria: Outcome[];
}
interface Breakpoint {
  exit_value: string;
  exact: string;
  reasons: { code: string; text: string }[];
}
interface Payment {
  label: string;
  amount: string;
  cumulative: string;
  lines: Line[];
  holder_totals: Record<string, string>;
}
interface Schedule {
  id: string;
  payments: Payment[];
}
interface Expected {
  case: string;
  exit?: { breakpoints: Breakpoint[]; payouts: PayoutPoint[]; payment_schedules?: Schedule[] };
}
interface Inputs {
  case: string;
  exit?: { range: [string, string]; exit_values: string[] };
}

const caseDirs = readdirSync(CASES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("ocf-") && !d.name.startsWith("ocx-"))
  .map((d) => d.name);
// OCF cases (M6, C16) hold an OCF package of our own and a result worked by hand; checked below.
const ocfDirs = readdirSync(CASES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith("ocf-"))
  .map((d) => d.name);

function readJson<T>(dir: string, file: string): T {
  return JSON.parse(readFileSync(join(CASES, dir, file), "utf8")) as T;
}

// Payouts are rounded to the cent line by line, so a sum can drift by up to
// half a cent per line.
function closeEnough(a: Decimal, b: Decimal, lines: number): boolean {
  return a.minus(b).abs().lte(CENT.times(lines).div(2));
}

describe.each(caseDirs)("case %s", (dir) => {
  it("has inputs.json, expected.json, and DERIVATION.md", () => {
    for (const f of ["inputs.json", "expected.json", "DERIVATION.md"]) {
      expect(existsSync(join(CASES, dir, f)), f).toBe(true);
    }
  });

  const inputs = readJson<Inputs>(dir, "inputs.json");
  const expected = readJson<Expected>(dir, "expected.json");

  it("names the same case in both files", () => {
    expect(expected.case).toBe(inputs.case);
    expect(inputs.case).toBe(dir);
  });

  if (!inputs.exit) return;
  const exit = expected.exit!;
  const [lo, hi] = inputs.exit.range.map((v) => new Decimal(v));

  it("pays out exactly the exit value at every point", () => {
    for (const p of exit.payouts) {
      for (const eq of p.equilibria) {
        const sum = eq.lines.reduce((s, l) => s.plus(l.amount), new Decimal(0));
        expect(closeEnough(sum, new Decimal(p.exit_value), eq.lines.length), `exit ${p.exit_value}`).toBe(true);
      }
    }
  });

  it("derives holder and class totals from the holder × security lines", () => {
    for (const p of exit.payouts) {
      for (const eq of p.equilibria) {
        const byHolder = new Map<string, Decimal>();
        const byClass = new Map<string, Decimal>();
        for (const l of eq.lines) {
          byHolder.set(l.holder, (byHolder.get(l.holder) ?? new Decimal(0)).plus(l.amount));
          byClass.set(l.security, (byClass.get(l.security) ?? new Decimal(0)).plus(l.amount));
        }
        for (const [h, v] of byHolder) {
          expect(closeEnough(v, new Decimal(eq.holder_totals[h]!), eq.lines.length), `${h} at ${p.exit_value}`).toBe(true);
        }
        for (const [c, v] of byClass) {
          expect(closeEnough(v, new Decimal(eq.class_totals[c]!), eq.lines.length), `${c} at ${p.exit_value}`).toBe(true);
        }
      }
    }
  });

  it("lists breakpoints in order, inside the range, each with a reason", () => {
    let prev = new Decimal(-1);
    for (const b of exit.breakpoints) {
      const x = new Decimal(b.exit_value);
      expect(x.gt(prev)).toBe(true);
      expect(x.gt(lo!) && x.lt(hi!)).toBe(true);
      expect(b.reasons.length).toBeGreaterThan(0);
      for (const r of b.reasons) expect(r.text.length).toBeGreaterThan(20);
      prev = x;
    }
  });

  it("splits each scheduled payment exactly, and the payments add up to the cumulative payout", () => {
    for (const sched of exit.payment_schedules ?? []) {
      const running = new Map<string, Decimal>();
      for (const pay of sched.payments) {
        const sum = pay.lines.reduce((s, l) => s.plus(l.amount), new Decimal(0));
        expect(closeEnough(sum, new Decimal(pay.amount), pay.lines.length), `${sched.id} ${pay.label}`).toBe(true);
        for (const l of pay.lines) {
          const k = `${l.holder}|${l.security}`;
          running.set(k, (running.get(k) ?? new Decimal(0)).plus(l.amount));
        }
        // Escrow and earnouts (SPEC): the waterfall runs on cumulative proceeds,
        // so the payments so far must add up to the payout at the cumulative amount.
        const point = exit.payouts.find((p) => new Decimal(p.exit_value).eq(pay.cumulative));
        if (point && point.equilibria.length === 1) {
          for (const l of point.equilibria[0]!.lines) {
            const got = running.get(`${l.holder}|${l.security}`) ?? new Decimal(0);
            expect(closeEnough(got, new Decimal(l.amount), sched.payments.length + 1), `${sched.id} ${l.holder} ${l.security}`).toBe(true);
          }
        }
      }
    }
  });

  it("gives payouts at every listed exit value and every breakpoint", () => {
    const at = new Set(exit.payouts.map((p) => new Decimal(p.exit_value).toFixed(2)));
    for (const v of inputs.exit!.exit_values) expect(at.has(new Decimal(v).toFixed(2)), v).toBe(true);
    for (const b of exit.breakpoints) expect(at.has(b.exit_value), b.exit_value).toBe(true);
  });
});

type Json = Record<string, unknown>;
interface OcfResult {
  as_of: string;
  cap_table: {
    holders: { id: string }[];
    securities: Json[];
    positions: { holder: string; security: string; shares: number }[];
    unconverted_safes?: Json[];
    unconverted_notes?: Json[];
  };
  to_fill: { security?: string; note?: string; safe?: string; field: string }[];
  report: { read: Record<string, number>; not_needed: Record<string, number>; notes: { code: string }[] };
}

// The importer arrives in 04d. Until then these check that each OCF case's package and its hand-worked result
// agree with each other: no engine code is involved.
const ocfPackageDirs = ocfDirs.filter((d) => existsSync(join(CASES, d, "package")));
const ocfFixtureDirs = ocfDirs.filter((d) => existsSync(join(CASES, d, "fixtures")));

describe("OCF cases", () => {
  it("are each a package or a set of fixtures", () => {
    expect([...ocfPackageDirs, ...ocfFixtureDirs].sort()).toEqual(ocfDirs);
  });
});

describe.each(ocfPackageDirs)("OCF case %s", (dir) => {
  const packageDir = join(CASES, dir, "package");
  it("has a package, expected.json and DERIVATION.md", () => {
    for (const f of ["package", "expected.json", "DERIVATION.md"]) expect(existsSync(join(CASES, dir, f)), f).toBe(true);
  });
  const files = new Map(readdirSync(packageDir).map((name) => [name, JSON.parse(readFileSync(join(packageDir, name), "utf8")) as Json]));
  const expected = readJson<{ case: string; result: OcfResult }>(dir, "expected.json");
  const result = expected.result;
  const manifests = [...files.values()].filter((f) => f.file_type === "OCF_MANIFEST_FILE");
  const objects = [...files.values()].flatMap((f) => (Array.isArray(f.items) ? (f.items as Json[]) : []));

  it("names itself, and has one manifest listing every other file, each present", () => {
    expect(expected.case).toBe(dir);
    expect(manifests).toHaveLength(1);
    const listed = Object.entries(manifests[0]!)
      .filter(([k]) => k.endsWith("_files"))
      .flatMap(([, v]) => (v as { filepath: string }[]).map((x) => x.filepath));
    expect(listed.sort()).toEqual([...files.keys()].filter((n) => n !== "Manifest.ocf.json").sort());
    expect(manifests[0]!.as_of).toBe(result.as_of);
  });

  it("gives every object a unique id", () => {
    const ids = objects.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("counts each object type in its report exactly as the package has it", () => {
    const counts: Record<string, number> = { ISSUER: 1 };
    for (const o of objects) counts[o.object_type as string] = (counts[o.object_type as string] ?? 0) + 1;
    expect({ ...result.report.read, ...result.report.not_needed }).toEqual(counts);
  });

  it("dates every transaction on or before the package's date", () => {
    for (const o of objects) if (typeof o.date === "string") expect(o.date <= result.as_of, String(o.id)).toBe(true);
  });

  it("holds positions only in its own holders and securities, each holder holding something", () => {
    const ct = result.cap_table;
    const holders = new Set(ct.holders.map((h) => h.id));
    const securities = new Set(ct.securities.map((s) => s.id as string));
    for (const p of ct.positions) expect(holders.has(p.holder) && securities.has(p.security) && p.shares > 0, `${p.holder} ${p.security}`).toBe(true);
    const holding = new Set([...ct.positions, ...(ct.unconverted_safes ?? []), ...(ct.unconverted_notes ?? [])].map((x) => x.holder as string));
    expect([...holders].filter((h) => !holding.has(h))).toEqual([]);
  });

  // 04b: a locked case written in OCF imports to that case's cap table, up to the ids the import names its own way.
  // 04b2: a case built from rounds gives the event its table follows. OCF writes numbers to at most 10 places, so
  // such a case writes each price rounded to nearest, and its table is the locked one with those prices.
  const lockedTerms = expected as { locked_case?: string; locked_after_event?: string; price_places?: number; renamed?: Record<string, string> };
  const locked = lockedTerms.locked_case;
  if (locked) {
    it(`imports to ${locked}'s cap table`, () => {
      type Table = Json & { holders: Json[]; securities: Json[]; positions: { holder: string; security: string }[]; seniority?: string[][] };
      const renamed = lockedTerms.renamed ?? {};
      const name = (id: string) => renamed[id] ?? id;
      const ct = lockedTerms.locked_after_event
        ? readJson<{ cap_tables: { after_event: string; cap_table: Table }[] }>(locked, "expected.json").cap_tables.find((t) => t.after_event === lockedTerms.locked_after_event)!.cap_table
        : readJson<{ exit: { cap_table: Table } }>(locked, "inputs.json").exit.cap_table;
      // A built table also gives its totals and each series' conversion ratio, and an empty list of SAFEs: none is a term the import reads.
      const { totals: _totals, unconverted_safes, ...rest } = ct;
      const theirs = {
        ...rest,
        ...((unconverted_safes as Json[] | undefined)?.length ? { unconverted_safes } : {}),
        conversion_groups: ct.conversion_groups ?? [],
        securities: ct.securities.map(({ conversion_ratio: _ratio, approx: _approx, ...s }) => ({ ...s, id: name(s.id as string) })),
        positions: ct.positions.map((p) => ({ ...p, security: name(p.security) })),
        seniority: ct.seniority?.map((tier) => tier.map(name)),
      };
      // What OCF can't carry: anti-dilution imports as none (O11), and each blank the import lists to fill in is
      // compared as a blank. A price is compared at the places the package writes it to, rounded to nearest.
      const blank = new Set(result.to_fill.filter((f) => f.security).map((f) => `${f.security} ${f.field}`));
      const places = lockedTerms.price_places;
      const price = (v: unknown, rounded: boolean) => {
        if (typeof v !== "string") return v;
        const [n, d = "1"] = v.split("/");
        const x = new Decimal40(n!).div(d);
        return (rounded && places !== undefined ? x.toDecimalPlaces(places, Decimal.ROUND_HALF_UP) : x).toFixed();
      };
      const asImported = (s: Json, rounded: boolean) =>
        Object.fromEntries(
          Object.entries(s).map(([k, v]) => [
            k,
            blank.has(`${s.id} ${k}`) ? null : k === "anti_dilution" ? "none" : k === "original_issue_price" || k === "conversion_price" ? price(v, rounded) : v,
          ]),
        );
      // A renamed class keeps every term; only its name differs, so names aren't compared there.
      const imported = new Set(Object.values(renamed));
      const comparable = (t: Table, rounded: boolean) => ({
        ...t,
        holders: [...t.holders].sort(byId),
        securities: t.securities.map((s) => asImported(imported.has(s.id as string) ? { ...s, name: undefined } : s, rounded)).sort(byId),
        positions: [...t.positions].sort((a, b) => `${a.holder} ${a.security}`.localeCompare(`${b.holder} ${b.security}`)),
        seniority: t.seniority?.map((tier) => [...tier].sort()),
      });
      for (const s of result.cap_table.securities) if (s.kind === "preferred") expect(s.anti_dilution, String(s.id)).toBe("none");
      expect(comparable(result.cap_table as unknown as Table, false)).toEqual(comparable(theirs as Table, true));
    });
  }

  it("leaves blank exactly the terms it lists to fill in", () => {
    const ct = result.cap_table;
    const blanks = [
      ...ct.securities.flatMap((s) => Object.entries(s).filter(([, v]) => v === null).map(([k]) => ({ security: s.id as string, field: k }))),
      ...(ct.unconverted_safes ?? []).flatMap((f) => Object.entries(f).filter(([, v]) => v === null).map(([k]) => ({ safe: f.id as string, field: k }))),
      ...(ct.unconverted_notes ?? []).flatMap((n) => Object.entries(n).filter(([, v]) => v === null).map(([k]) => ({ note: n.id as string, field: k }))),
      // A series that isn't capped has no cap multiple: that blank isn't a term to fill in.
    ].filter((b) => b.field !== "cap_multiple");
    expect(blanks).toEqual(result.to_fill);
  });
});

interface FixtureExpected {
  case: string;
  base: string;
  fixtures: Record<
    string,
    {
      adds?: {
        read?: Record<string, number>;
        not_needed?: Record<string, number>;
        notes?: { code: string; subject?: string }[];
        unconverted_safes?: Json[];
        unconverted_notes?: Json[];
        to_fill?: { safe?: string; note?: string; field: string }[];
      };
      refused?: { kind: string; term: string; subject: string };
    }
  >;
}

// Fixture cases (C16): each file is added to a base package, or replaces its manifest.
describe.each(ocfFixtureDirs)("OCF fixtures %s", (dir) => {
  const fixtureDir = join(CASES, dir, "fixtures");
  const expected = readJson<FixtureExpected>(dir, "expected.json");
  const names = readdirSync(fixtureDir).sort();
  const read = (name: string) => JSON.parse(readFileSync(join(fixtureDir, name), "utf8")) as Json;
  const baseIds = new Set(
    readdirSync(join(CASES, expected.base, "package")).flatMap((name) => {
      const f = JSON.parse(readFileSync(join(CASES, expected.base, "package", name), "utf8")) as Json;
      return Array.isArray(f.items) ? (f.items as Json[]).map((o) => o.id as string) : [];
    }),
  );
  const FILE_TYPES = ["OCF_MANIFEST_FILE", "OCF_STAKEHOLDERS_FILE", "OCF_STOCK_CLASSES_FILE", "OCF_STOCK_LEGEND_TEMPLATES_FILE", "OCF_STOCK_PLANS_FILE",
    "OCF_TRANSACTIONS_FILE", "OCF_VALUATIONS_FILE", "OCF_VESTING_TERMS_FILE", "OCF_FINANCINGS_FILE", "OCF_DOCUMENTS_FILE"];

  it("has fixtures, expected.json and DERIVATION.md, and a base package", () => {
    expect(expected.case).toBe(dir);
    expect(existsSync(join(CASES, dir, "DERIVATION.md"))).toBe(true);
    expect(existsSync(join(CASES, expected.base, "package"))).toBe(true);
  });

  it("gives one result for each fixture file, and only for those", () => {
    expect(Object.keys(expected.fixtures).sort()).toEqual(names);
    for (const [name, r] of Object.entries(expected.fixtures)) expect(("adds" in r) !== ("refused" in r), name).toBe(true);
  });

  it.each(names)("%s is one OCF file of a known type", (name) => {
    expect(FILE_TYPES).toContain(read(name).file_type);
  });

  it("counts what each fixture adds as the file has it, and notes the unlisted file", () => {
    for (const [name, r] of Object.entries(expected.fixtures)) {
      if (!r.adds) continue;
      const f = read(name);
      if (f.file_type === "OCF_MANIFEST_FILE") {
        expect(r.adds, name).toEqual({});
        continue;
      }
      const counts: Record<string, number> = {};
      for (const o of f.items as Json[]) counts[o.object_type as string] = (counts[o.object_type as string] ?? 0) + 1;
      expect({ ...r.adds.read, ...r.adds.not_needed }, name).toEqual(counts);
      expect(r.adds.notes?.[0], name).toEqual({ code: "not_in_manifest", subject: name });
    }
  });

  it("leaves blank, in what a fixture adds, exactly the terms it adds to fill in", () => {
    for (const [name, r] of Object.entries(expected.fixtures)) {
      if (!r.adds) continue;
      const blanks = [
        ...(r.adds.unconverted_safes ?? []).flatMap((x) => Object.entries(x).filter(([, v]) => v === null).map(([k]) => ({ safe: x.id as string, field: k }))),
        ...(r.adds.unconverted_notes ?? []).flatMap((x) => Object.entries(x).filter(([, v]) => v === null).map(([k]) => ({ note: x.id as string, field: k }))),
      ];
      expect(blanks, name).toEqual(r.adds.to_fill ?? []);
    }
  });

  it("names, in each refusal, something its fixture contains", () => {
    for (const [name, r] of Object.entries(expected.fixtures)) {
      if (!r.refused) continue;
      expect(["unsupported", "malformed"], name).toContain(r.refused.kind);
      expect(readFileSync(join(fixtureDir, name), "utf8"), name).toContain(r.refused.subject);
    }
  });

  it("reuses a base id only where the refusal is the duplicate id", () => {
    for (const [name, r] of Object.entries(expected.fixtures)) {
      const f = read(name);
      const ids = Array.isArray(f.items) ? (f.items as Json[]).map((o) => o.id as string) : [];
      const reused = ids.filter((id) => baseIds.has(id));
      expect(reused, name).toEqual(r.refused?.term === "duplicate_id" ? [r.refused.subject] : []);
    }
  });
});

// OCX cases (0.6.0, C18): an OCX workbook of our own, in the engine's OcxWorkbook shape, and its import worked by hand.
// readOcx comes in 06f; until then these check the files themselves: the workbook's shape, and that the result agrees
// with itself and with the workbook where that needs no reading of it.
interface OcxResult {
  as_of: string;
  cap_table: {
    holders: { id: string; name: string }[];
    securities: Json[];
    seniority: string[][] | null;
    positions: { holder: string; security: string; shares: number }[];
    unconverted_safes?: Json[];
    unconverted_notes?: Json[];
  };
  issue_order: string[];
  to_fill: { security?: string; note?: string; safe?: string; field: string }[];
  report: { read: Record<string, number>; not_needed: Record<string, number>; notes: { code: string; subject?: string; field?: string }[] };
}
interface OcxRefusal {
  kind: string;
  term: string;
  subject: string;
}
const ocxDirs = readdirSync(CASES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith("ocx-"))
  .map((d) => d.name);
const ocxWorkbookDirs = ocxDirs.filter((d) => existsSync(join(CASES, d, "workbook.json")));
const ocxFixtureDirs = ocxDirs.filter((d) => existsSync(join(CASES, d, "fixtures")));
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ASSUMPTIONS = readFileSync(resolve(CASES, "../docs/ASSUMPTIONS.md"), "utf8");

/** OX1's shape: a date system, and tabs of cells, each placed once, in row order, of a known kind. */
function expectOcxWorkbook(workbook: OcxWorkbookJson) {
  expect([1900, 1904]).toContain(workbook.dateSystem);
  const names = workbook.sheets.map((s) => s.name);
  expect(new Set(names).size).toBe(names.length);
  for (const sheet of workbook.sheets) {
    expect(sheet.name.length, sheet.name).toBeLessThanOrEqual(31);
    for (const c of sheet.cells) expect(c.address, `${sheet.name}!${c.address}`).toMatch(/^[A-Z]{1,3}[1-9]\d*$/);
    const places = sheet.cells.map((c) => cellPlace(c.address));
    expect(places, sheet.name).toEqual([...places].sort((a, b) => a - b));
    expect(new Set(places).size, sheet.name).toBe(places.length);
    for (const c of sheet.cells) {
      const at = `${sheet.name}!${c.address}`;
      expect(["number", "text", "boolean", "error", "date"], at).toContain(c.kind);
      expect(typeof c.formula, at).toBe("boolean");
      if (!c.formula) expect(c.text, at).not.toBe("");
      if (c.text !== "" && (c.kind === "number" || (c.kind === "date" && !c.text.includes("-")))) {
        expect(c.text, at).toMatch(/^-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/);
      }
    }
  }
}

// A holder made for a convertibles row, which names no holder (OX11): its type, its terms and its count.
const MADE_HOLDER = /^(?:Post-money SAFEs|Pre-money SAFEs|Convertible notes)(?:, .+)? \(\d+\)$/;

/** The checks an import's result must pass against its workbook: a case's, or a fixture's that isn't refused. */
function ocxResultChecks(workbook: OcxWorkbookJson, layout: string, result: OcxResult) {
  const cells = workbook.sheets.flatMap((s) => s.cells);
  const texts = new Set(cells.filter((c) => c.kind === "text").map((c) => c.text));

  it("gives its as-of date on every tab, in 0.7's form", () => {
    if (layout !== "0.7") return;
    const [y, m, d] = result.as_of.split("-").map(Number);
    const day = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
    const label = `As of ${DAYS[day]}, ${String(d).padStart(2, "0")} ${MONTHS[m! - 1]} ${y}`;
    for (const sheet of workbook.sheets) expect(sheet.cells.some((c) => c.text === label), `${sheet.name}: ${label}`).toBe(true);
  });

  it("reports the version label the workbook gives", () => {
    const label = cells.map((c) => /^OCX Version\s+(\S+)$/.exec(c.text)).find((m) => m != null);
    const note = result.report.notes.find((n) => n.code === "version_label") as { field?: string } | undefined;
    expect(note?.field).toBe(label?.[1]);
  });

  it("holds positions only in its own holders and securities, each holder named in the workbook or made for a row, and holding something", () => {
    const ct = result.cap_table;
    const holders = new Set(ct.holders.map((h) => h.id));
    const securities = new Set(ct.securities.map((s) => s.id as string));
    for (const h of ct.holders) expect(texts.has(h.name) || MADE_HOLDER.test(h.name), h.name).toBe(true);
    for (const p of ct.positions) expect(holders.has(p.holder) && securities.has(p.security) && p.shares > 0, `${p.holder} ${p.security}`).toBe(true);
    const holding = new Set([...ct.positions, ...(ct.unconverted_safes ?? []), ...(ct.unconverted_notes ?? [])].map((x) => x.holder as string));
    expect([...holders].filter((h) => !holding.has(h))).toEqual([]);
  });

  it("leaves blank exactly the terms it lists to fill in, seniority last", () => {
    const ct = result.cap_table;
    const blanks = [
      ...ct.securities.flatMap((s) => Object.entries(s).filter(([, v]) => v === null).map(([k]) => ({ security: s.id as string, field: k }))),
      ...(ct.unconverted_safes ?? []).flatMap((f) => Object.entries(f).filter(([, v]) => v === null).map(([k]) => ({ safe: f.id as string, field: k }))),
      ...(ct.unconverted_notes ?? []).flatMap((n) => Object.entries(n).filter(([, v]) => v === null).map(([k]) => ({ note: n.id as string, field: k }))),
    ].filter((b) => b.field !== "cap_multiple");
    const preferred = ct.securities.some((s) => s.kind === "preferred");
    // OX3: with preferred stock, seniority is always blank; with none, it's an empty list.
    expect(ct.seniority).toEqual(preferred ? null : []);
    expect(result.to_fill).toEqual([...blanks, ...(preferred ? [{ field: "seniority" }] : [])]);
  });

  it("orders every preferred series, SAFE and note once (O14)", () => {
    const ct = result.cap_table;
    const ranked = [
      ...ct.securities.filter((s) => s.kind === "preferred").map((s) => s.id as string),
      ...(ct.unconverted_safes ?? []).map((f) => f.id as string),
      ...(ct.unconverted_notes ?? []).map((n) => n.id as string),
    ];
    expect([...result.issue_order].sort()).toEqual(ranked.sort());
  });

  it("notes skipped formula totals exactly when the workbook has a formula with no saved value (OX5)", () => {
    const skipped = result.report.notes.some((n) => n.code === "formula_totals_skipped");
    expect(skipped).toBe(cells.some((c) => c.formula && c.text === ""));
  });

  it("names, in each note, something of its own, or a tab or text the workbook holds", () => {
    const ct = result.cap_table;
    const ids = new Set([
      ...ct.holders.map((h) => h.id),
      ...ct.securities.map((s) => s.id as string),
      ...[...(ct.unconverted_safes ?? []), ...(ct.unconverted_notes ?? [])].map((x) => x.id as string),
    ]);
    // An unrecognized header's line names its tab (OX12).
    const tabs = new Set(workbook.sheets.map((s) => s.name));
    for (const n of result.report.notes) {
      if (!n.subject) continue;
      const leftOut = n.code === "left_out_stakeholder";
      expect(ids.has(n.subject) || leftOut || texts.has(n.subject) || tabs.has(n.subject), `${n.code} ${n.subject}`).toBe(true);
    }
  });

  it("uses only note codes ASSUMPTIONS names", () => {
    for (const n of result.report.notes) expect(ASSUMPTIONS, n.code).toContain(`\`${n.code}\``);
  });
}

describe("OCX cases", () => {
  it("are each a workbook or a set of fixtures", () => {
    expect([...ocxWorkbookDirs, ...ocxFixtureDirs].sort()).toEqual(ocxDirs);
  });
});

describe.each(ocxWorkbookDirs)("OCX case %s", (dir) => {
  it("has workbook.json, expected.json and DERIVATION.md", () => {
    for (const f of ["workbook.json", "expected.json", "DERIVATION.md"]) expect(existsSync(join(CASES, dir, f)), f).toBe(true);
  });
  const workbook = readOcxWorkbook(dir);
  const expected = readJson<{ case: string; layout: string; result: OcxResult }>(dir, "expected.json");

  it("names itself and its layout", () => {
    expect(expected.case).toBe(dir);
    expect(["0.4/0.5", "0.7"]).toContain(expected.layout);
  });

  it("is an OcxWorkbook: a date system, and tabs of cells, each placed once, in row order, of a known kind", () => {
    expectOcxWorkbook(workbook);
  });

  ocxResultChecks(workbook, expected.layout, expected.result);
});

// Fixture cases (C18, 06e2, 06e3): each a base case's workbook with one small change, refused, read with blanks, or
// read by a rule no case reaches on its own.
describe.each(ocxFixtureDirs)("OCX fixtures %s", (dir) => {
  const expected = readJson<{ case: string; fixtures: Record<string, { refused?: OcxRefusal; result?: OcxResult }> }>(dir, "expected.json");
  const names = readdirSync(join(CASES, dir, "fixtures")).sort();
  const fixtures = new Map(names.map((name) => [name, readOcxFixture(dir, name)]));
  const fixture = (name: string) => fixtures.get(name)!;

  it("has fixtures, expected.json and DERIVATION.md", () => {
    expect(expected.case).toBe(dir);
    expect(existsSync(join(CASES, dir, "DERIVATION.md"))).toBe(true);
  });

  it("gives one result for each fixture file, and only for those, each refused or read", () => {
    expect(Object.keys(expected.fixtures).sort()).toEqual(names);
    for (const [name, r] of Object.entries(expected.fixtures)) expect(("result" in r) !== ("refused" in r), name).toBe(true);
  });

  it.each(names)("%s changes an OCX case's workbook, each step changing something, and leaves an OcxWorkbook", (name) => {
    const f = fixture(name);
    expect(ocxWorkbookDirs, name).toContain(f.base);
    expect(f.about.length, name).toBeGreaterThan(0);
    expect(f.change.length, name).toBeGreaterThan(0);
    expectOcxWorkbook(applyOcxChange(readOcxWorkbook(f.base), f.change));
  });

  it("names, in each refusal, a known kind and a term ASSUMPTIONS names, and a subject its base or its change holds", () => {
    for (const [name, r] of Object.entries(expected.fixtures)) {
      if (!r.refused) continue;
      expect(["unsupported", "malformed"], name).toContain(r.refused.kind);
      expect(ASSUMPTIONS, `${name}: ${r.refused.term}`).toContain(`\`${r.refused.term}\``);
      // OX13: a column is its tab and header, "Common Stock Ledger: No. Shares Outstanding"; each part is in the files.
      const files = readFileSync(join(CASES, fixture(name).base, "workbook.json"), "utf8") + readFileSync(join(CASES, dir, "fixtures", name), "utf8");
      for (const part of r.refused.subject.split(": ")) expect(files, `${name}: ${part}`).toContain(JSON.stringify(part).slice(1, -1));
    }
  });

  const read = names.filter((name) => expected.fixtures[name]?.result);
  if (read.length > 0) {
    describe.each(read)("%s", (name) => {
      const f = fixture(name);
      const base = readJson<{ layout: string; result: OcxResult }>(f.base, "expected.json");
      const result = expected.fixtures[name]!.result!;

      it("reads differently from its base", () => {
        expect(result).not.toEqual(base.result);
      });

      // A step that doesn't apply fails the step check above, by name, rather than every check here.
      let workbook: OcxWorkbookJson | undefined;
      try {
        workbook = applyOcxChange(readOcxWorkbook(f.base), f.change);
      } catch {
        workbook = undefined;
      }
      if (workbook) ocxResultChecks(workbook, base.layout, result);
    });
  }
});
