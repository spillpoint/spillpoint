// Checks that every fund case is consistent with itself (FC2 to FC8). No engine code is involved: these tests guard
// the case files, and the engine's own case tests arrive in f01b.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { D } from "../src/index.ts";

const CASES = resolve(import.meta.dirname, "../cases");
const FUND = readdirSync(CASES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith("fund-"))
  .map((d) => d.name)
  .sort();
const RUN = FUND.filter((n) => existsSync(join(CASES, n, "inputs.json")));
const REFUSED = FUND.filter((n) => existsSync(join(CASES, n, "fixtures")));

const CENT = new D("0.01");
const TIER_CODES = ["capital_returned", "pref_met", "catch_up_done", "carry_step"];
const CLAWBACK_CODES = ["clawback_cleared", "clawback_starts", "clawback_changes"];
const TERMS = [
  "bad_number",
  "bad_date",
  "bad_field",
  "missing_field",
  "unknown_field",
  "carry_rate_not_below_one",
  "steps_out_of_order",
  "catch_up_without_pref",
  "catch_up_share_not_above_carry",
  "gp_commitment_not_below_one",
  "no_calls",
  "distribution_before_call",
  "cash_flow_after_distribution_date",
];

interface Block {
  amount: string;
  gp_commitment?: string;
  lps: { capital: string; pref?: string; catch_up?: string; carry_tier: string; total: string };
  gp: { catch_up?: string; carry: { rate: string; from_lp_multiple?: string; amount: string }[]; total: string };
}
interface Point {
  x: string;
  exact: string;
  tags: string[];
  distribution: Block;
  to_date: Block;
  clawback?: { carry_paid: string; entitlement: string; owed: string };
}
interface Reason {
  code: string;
  text: string;
}
interface Expected {
  case: string;
  final: boolean;
  breakpoints: { x: string; exact: string; reasons: Reason[] }[];
  points: Point[];
}
interface Inputs {
  case: string;
  xs: string[];
  fund: { nav?: string };
}

const readJson = <T,>(...path: string[]): T => JSON.parse(readFileSync(join(CASES, ...path), "utf8")) as T;
const exact = (s: string) => (s.includes("/") ? new D(s.split("/")[0]!).div(s.split("/")[1]!) : new D(s));
const sum = (xs: (string | undefined)[]) => xs.reduce((s, x) => (x === undefined ? s : s.plus(x)), new D(0));
// Each amount is rounded to the cent on its own, so a sum of n of them can drift by half a cent each.
const near = (a: D, b: D, n: number) => a.minus(b).abs().lte(CENT.times(n).div(2));

describe("fund cases", () => {
  it("are thirteen runs and one set of refusals", () => {
    expect(RUN).toHaveLength(13);
    expect(REFUSED).toEqual(["fund-14-refused"]);
    expect([...RUN, ...REFUSED].sort()).toEqual(FUND);
  });

  it("use 40 significant digits (F17)", () => {
    expect(new D(1).div(3).toString()).toBe(`0.${"3".repeat(40)}`);
  });
});

describe.each(RUN)("%s", (dir) => {
  it("has inputs.json, expected.json and DERIVATION.md, naming the same case", () => {
    for (const f of ["inputs.json", "expected.json", "DERIVATION.md"]) expect(existsSync(join(CASES, dir, f)), f).toBe(true);
    expect(readJson<Inputs>(dir, "inputs.json").case).toBe(dir);
    expect(readJson<Expected>(dir, "expected.json").case).toBe(dir);
  });

  const inputs = readJson<Inputs>(dir, "inputs.json");
  const expected = readJson<Expected>(dir, "expected.json");

  it("gives a point at every listed X, every breakpoint and the NAV point, tagged (FC4)", () => {
    const at = new Map(expected.points.map((p) => [exact(p.exact).toString(), p]));
    for (const x of inputs.xs) expect(at.get(exact(x).toString())?.tags, x).toContain("listed");
    for (const b of expected.breakpoints) expect(at.get(exact(b.exact).toString())?.tags, b.x).toContain("breakpoint");
    if (inputs.fund.nav !== undefined) expect(at.get(exact(inputs.fund.nav).toString())?.tags).toContain("nav");
    for (const p of expected.points) expect(p.x).toBe(exact(p.exact).toFixed(2));
  });

  it("lists breakpoints in order, above 0, each with F15's reasons", () => {
    let prev = new D(0);
    for (const b of expected.breakpoints) {
      const x = exact(b.exact);
      expect(x.gt(prev), b.x).toBe(true);
      expect(b.reasons.length).toBeGreaterThan(0);
      for (const r of b.reasons) {
        expect([...TIER_CODES, ...(expected.final ? CLAWBACK_CODES : [])]).toContain(r.code);
        expect(r.text.length).toBeGreaterThan(20);
      }
      prev = x;
    }
  });

  it("splits each distribution, and the fund to date, exactly by tier (F16)", () => {
    for (const p of expected.points) {
      for (const block of [p.distribution, p.to_date]) {
        const lps = [block.lps.capital, block.lps.pref, block.lps.catch_up, block.lps.carry_tier];
        const gp = [block.gp.catch_up, ...block.gp.carry.map((s) => s.amount)];
        expect(near(sum(lps), new D(block.lps.total), lps.length), `LPs at ${p.x}`).toBe(true);
        expect(near(sum(gp), new D(block.gp.total), gp.length), `GP at ${p.x}`).toBe(true);
        const all = sum([block.gp_commitment, block.lps.total, block.gp.total]);
        expect(near(all, new D(block.amount), 3), `all at ${p.x}`).toBe(true);
      }
      expect(p.distribution.amount).toBe(p.x);
    }
  });

  it("owes the carry paid less the entitlement, when positive, when final or at the NAV point (F12)", () => {
    for (const p of expected.points) {
      expect(p.clawback !== undefined, p.x).toBe(expected.final || p.tags.includes("nav"));
      if (!p.clawback) continue;
      expect(p.clawback.carry_paid).toBe(p.to_date.gp.total);
      const owed = D.max(0, new D(p.clawback.carry_paid).minus(p.clawback.entitlement));
      expect(near(owed, new D(p.clawback.owed), 2), p.x).toBe(true);
    }
  });
});

describe.each(REFUSED)("%s", (dir) => {
  const expected = readJson<{ case: string; fixtures: Record<string, { refused: { kind: string; term: string; field: string } }> }>(dir, "expected.json");
  const files = readdirSync(join(CASES, dir, "fixtures")).sort();

  it("has a refusal for every fixture, and a DERIVATION.md", () => {
    expect(expected.case).toBe(dir);
    expect(Object.keys(expected.fixtures).sort()).toEqual(files);
    expect(existsSync(join(CASES, dir, "DERIVATION.md"))).toBe(true);
  });

  it.each(files)("%s changes a fund case and is refused with a kind, a term and a field (F18)", (file) => {
    const fixture = readJson<{ base: string; about: string; change: object }>(dir, "fixtures", file);
    expect(RUN).toContain(fixture.base);
    expect(fixture.about.length).toBeGreaterThan(10);
    const { kind, term, field } = expected.fixtures[file]!.refused;
    expect(["unsupported", "input"]).toContain(kind);
    if (kind === "input") expect(TERMS).toContain(term);
    expect(field.length).toBeGreaterThan(0);
  });
});
