// Checks that every locked case is internally consistent. No engine code is
// involved: these tests guard the case files themselves. The engine's own
// case tests arrive in M2.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import Decimal from "decimal.js";
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
interface Expected {
  case: string;
  exit?: { breakpoints: Breakpoint[]; payouts: PayoutPoint[] };
}
interface Inputs {
  case: string;
  exit?: { range: [string, string]; exit_values: string[] };
}

const caseDirs = readdirSync(CASES, { withFileTypes: true })
  .filter((d) => d.isDirectory())
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

  it("gives payouts at every listed exit value and every breakpoint", () => {
    const at = new Set(exit.payouts.map((p) => new Decimal(p.exit_value).toFixed(2)));
    for (const v of inputs.exit!.exit_values) expect(at.has(new Decimal(v).toFixed(2)), v).toBe(true);
    for (const b of exit.breakpoints) expect(at.has(b.exit_value), b.exit_value).toBe(true);
  });
});
