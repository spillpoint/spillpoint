// Checks that every fund case is consistent with itself (FC2 to FC10). No engine code is involved: these tests guard
// the case files, and the engine's own case tests arrive in f01b. The LPs' cases are also held to the cases they add
// LPs to, since the engine reads LPs only from f02b.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
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
  "lp_name_repeated",
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
  fund: { nav?: string; lps?: { name: string; commitment: string }[] | null };
}
interface LpAmount {
  amount: string;
  exact: string;
}
interface LpPoint extends Point {
  by_lp?: { name: string; distribution: LpAmount; to_date: LpAmount; clawback?: LpAmount }[];
}
interface LpExpected extends Omit<Expected, "points"> {
  lps_paid_in: string;
  lps?: { name: string; commitment: string; share: string; paid_in: LpAmount }[];
  points: LpPoint[];
}

const readJson = <T,>(...path: string[]): T => JSON.parse(readFileSync(join(CASES, ...path), "utf8")) as T;
const exact = (s: string) => (s.includes("/") ? new D(s.split("/")[0]!).div(s.split("/")[1]!) : new D(s));
const sum = (xs: (string | undefined)[]) => xs.reduce((s, x) => (x === undefined ? s : s.plus(x)), new D(0));
// Each amount is rounded to the cent on its own, so a sum of n of them can drift by half a cent each.
const near = (a: D, b: D, n: number) => a.minus(b).abs().lte(CENT.times(n).div(2));
// FC8, FA14: to the cent, half away from zero, after 20 places.
const cents = (x: D) => x.toDecimalPlaces(20, D.ROUND_HALF_UP).toDecimalPlaces(2, D.ROUND_HALF_UP).toFixed(2);
// Two ways of working out one exact amount at 40 digits agree far closer than this (FA15).
const CLOSE = new D("1e-25");

const hasLps = (dir: string) => (readJson<Inputs>(dir, "inputs.json").fund.lps ?? []).length > 0;
const LP_RUN = RUN.filter(hasLps);

describe("fund cases", () => {
  it("are nineteen runs and two sets of refusals", () => {
    expect(RUN).toHaveLength(19);
    expect(REFUSED).toEqual(["fund-14-refused", "fund-21-lps-refused"]);
    expect([...RUN, ...REFUSED].sort()).toEqual(FUND);
  });

  it("have LPs in cases 17 to 20 only (F19)", () => {
    expect(LP_RUN).toEqual(["fund-17-lps-three", "fund-18-lps-thirds", "fund-19-lps-clawback", "fund-20-lps-spv"]);
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

describe.each(RUN.filter((d) => !hasLps(d)))("%s, with no LPs", (dir) => {
  it("gives no per-LP amounts (FC9)", () => {
    const expected = readJson<LpExpected>(dir, "expected.json");
    expect(expected.lps).toBeUndefined();
    for (const p of expected.points) expect(p.by_lp, p.x).toBeUndefined();
  });
});

describe.each(LP_RUN)("%s, its LPs", (dir) => {
  const inputs = readJson<Inputs>(dir, "inputs.json");
  const expected = readJson<LpExpected>(dir, "expected.json");
  const lps = expected.lps!;
  const shares = lps.map((lp) => exact(lp.share));

  it("lists each LP in the input's order, its share its commitment over all of them (F19)", () => {
    expect(lps.map((lp) => lp.name)).toEqual(inputs.fund.lps!.map((lp) => lp.name));
    lps.forEach((lp, i) => expect(exact(lp.commitment).eq(exact(inputs.fund.lps![i]!.commitment)), lp.name).toBe(true));
    const all = lps.reduce((s, lp) => s.plus(exact(lp.commitment)), new D(0));
    lps.forEach((lp, i) => expect(shares[i]!.minus(exact(lp.commitment).div(all)).abs().lte(CLOSE), lp.name).toBe(true));
    expect(shares.reduce((s, x) => s.plus(x), new D(0)).minus(1).abs().lte(CLOSE)).toBe(true);
  });

  /** F20: each LP's amount is its share of the LPs' amount, given to the cent and exact (FC9). */
  function divides(where: string, each: LpAmount[], lpsAmount: string) {
    const total = each.reduce((s, a) => s.plus(exact(a.exact)), new D(0));
    expect(cents(total), `${where}: the LPs' amounts add up to theirs`).toBe(lpsAmount);
    each.forEach((a, i) => {
      expect(a.amount, `${where}: ${lps[i]!.name} to the cent`).toBe(cents(exact(a.exact)));
      expect(exact(a.exact).minus(shares[i]!.times(total)).abs().lte(CLOSE), `${where}: ${lps[i]!.name}'s share`).toBe(true);
    });
  }

  it("gives each LP its share of the LPs' paid-in (F20)", () => {
    divides("paid in", lps.map((lp) => lp.paid_in), expected.lps_paid_in);
  });

  it("gives each LP its share of X, to date and of any clawback, at every point (F20)", () => {
    for (const p of expected.points) {
      const rows = p.by_lp!;
      expect(rows.map((r) => r.name), p.x).toEqual(lps.map((lp) => lp.name));
      divides(`${p.x} from X`, rows.map((r) => r.distribution), p.distribution.lps.total);
      divides(`${p.x} to date`, rows.map((r) => r.to_date), p.to_date.lps.total);
      // When final, and at the NAV point, each LP's share of the clawback owed; zero when nothing is.
      for (const r of rows) expect(r.clawback !== undefined, `${p.x} ${r.name}`).toBe(p.clawback !== undefined);
      if (p.clawback) divides(`${p.x} clawback`, rows.map((r) => r.clawback!), p.clawback.owed);
    }
  });

  it("is the case it adds LPs to, the LPs aside (F20)", () => {
    const { lps: _, ...fund } = inputs.fund;
    const base = RUN.filter((d) => !hasLps(d)).find((d) => isDeepStrictEqual(readJson<Inputs>(d, "inputs.json").fund, fund));
    expect(base, "a case with the same fund and no LPs").toBeDefined();
    const was = readJson<LpExpected>(base!, "expected.json");
    const { case: _c, lps: _l, points, ...top } = expected;
    const { case: _bc, points: basePoints, ...baseTop } = was;
    expect(top).toEqual(baseTop);
    const at = new Map(basePoints.map((p) => [p.x, p]));
    let shared = 0;
    for (const { by_lp: _b, ...p } of points) {
      if (!at.has(p.x)) continue;
      expect(p, p.x).toEqual(at.get(p.x));
      shared++;
    }
    expect(shared).toBe(basePoints.length);
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
