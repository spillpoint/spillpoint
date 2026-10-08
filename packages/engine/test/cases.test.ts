// Checks that every locked case is internally consistent. No engine code is
// involved: these tests guard the case files themselves. The engine's own
// case tests arrive in M2.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";

const CASES = resolve(import.meta.dirname, "../../../cases");
const CENT = new Decimal("0.01");

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
  .filter((d) => d.isDirectory() && !d.name.startsWith("ocf-"))
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
  fixtures: Record<string, { adds?: { not_needed?: Record<string, number>; notes?: { code: string; subject?: string }[] }; refused?: { kind: string; term: string; subject: string } }>;
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

  it("counts what each set-aside fixture adds as the file has it, and notes the unlisted file", () => {
    for (const [name, r] of Object.entries(expected.fixtures)) {
      if (!r.adds) continue;
      const f = read(name);
      if (f.file_type === "OCF_MANIFEST_FILE") {
        expect(r.adds, name).toEqual({});
        continue;
      }
      const counts: Record<string, number> = {};
      for (const o of f.items as Json[]) counts[o.object_type as string] = (counts[o.object_type as string] ?? 0) + 1;
      expect(r.adds.not_needed, name).toEqual(counts);
      expect(r.adds.notes, name).toEqual([{ code: "not_in_manifest", subject: name }]);
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
