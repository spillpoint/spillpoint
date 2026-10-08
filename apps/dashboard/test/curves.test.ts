// The payoff curves as nodes: exact values between breakpoints, jumps kept
// apart from bends, and the rows the chart draws.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { D, prepare, readExit, solve } from "spillpoint";
import { describe, expect, it } from "vitest";

import { computeAnalysis } from "../src/analysis.ts";
import type { CurvePoint } from "../src/analysis.ts";
import { changeAt, changesAt, chartRows, curvedAt, niceScale, nodeAt, seriesNodes, valueAt } from "../src/curves.ts";

// Two holders over exit values $0 to $30. "a" gets nothing until $10, then
// half of each dollar; at $20 its payout jumps from $5 to $8, then it gets
// every dollar. "b" gets every dollar throughout, a straight line.
const at = (exitValue: string, a: string, b: string): CurvePoint => ({ exitValue, side: "at", curvedAfter: false, holders: { a, b }, classes: {} });
const curve: CurvePoint[] = [at("0", "0", "0"), at("10", "0", "10"), at("20", "5", "20"), { ...at("20", "8", "20"), side: "above" }, at("30", "18", "30")];
const a = seriesNodes(curve, "holder", "a");
const b = seriesNodes(curve, "holder", "b");

describe("a curve's nodes", () => {
  it("has one node per exit value, with the value just above a jump kept on the same node", () => {
    expect(a.map((n) => [n.x.toString(), n.left.toString(), n.right.toString()])).toEqual([
      ["0", "0", "0"],
      ["10", "0", "0"],
      ["20", "5", "8"],
      ["30", "18", "18"],
    ]);
  });

  it("is a straight line between nodes, and takes the value from below at a jump", () => {
    expect(valueAt(a, new D(15)).toString()).toBe("2.5");
    expect(valueAt(a, new D(20)).toString()).toBe("5");
    expect(valueAt(a, new D(25)).toString()).toBe("13");
    expect(valueAt(b, new D("12.34")).toString()).toBe("12.34");
  });

  it("holds its end values outside the range", () => {
    expect(valueAt(a, new D(-1)).toString()).toBe("0");
    expect(valueAt(a, new D(40)).toString()).toBe("18");
  });
});

describe("which breakpoints change a payout", () => {
  it("counts a bend and a jump, but not a straight line through", () => {
    expect([1, 2].map((i) => changesAt(a, i))).toEqual([true, true]);
    expect([1, 2].map((i) => changesAt(b, i))).toEqual([false, false]);
  });

  it("never counts the ends of the range", () => {
    expect(changesAt(a, 0)).toBe(false);
    expect(changesAt(a, 3)).toBe(false);
  });

  it("gives a bend as what each extra $1M adds on either side, and a jump as from and to", () => {
    const bend = changeAt(a, 1);
    expect(bend?.kind).toBe("bend");
    // "a" gets nothing below $10, then half of each dollar: $500,000 of each extra $1M.
    if (bend?.kind === "bend") expect([bend.before.toString(), bend.after.toString()]).toEqual(["0", "500000"]);
    const jump = changeAt(a, 2);
    expect(jump?.kind).toBe("jump");
    if (jump?.kind === "jump") expect([jump.from.toString(), jump.to.toString()]).toEqual(["5", "8"]);
    expect(changeAt(b, 1)).toBeNull();
  });

  it("ignores a bend of less than half a cent per extra $1M", () => {
    // From $10 the rate rises by 0.4 billionths of a dollar per dollar: $0.0004 per $1M.
    const slight = seriesNodes([at("0", "0", "0"), at("10", "10", "0"), at("20", "20.000000004", "0")], "holder", "a");
    expect(changeAt(slight, 1)).toBeNull();
  });

  it("ignores a jump of less than half a cent", () => {
    const tiny = seriesNodes([at("0", "0", "0"), at("10", "10", "0"), { ...at("10", "10.004", "0"), side: "above" }, at("20", "20.004", "0")], "holder", "a");
    expect(changesAt(tiny, 1)).toBe(false);
  });
});

describe("the rows the chart draws", () => {
  const series = new Map([
    ["s0", a],
    ["s1", b],
  ]);

  it("draws a jump as three rows: below, a break in the jumping line only, and above", () => {
    const rows = chartRows(series, 0, 30, 3);
    expect(rows.map((r) => r.x)).toEqual([0, 10, 20, 20, 20, 30]);
    expect(rows.slice(2, 5)).toEqual([
      { x: 20, s0: 5, s1: 20 },
      { x: 20, s0: null, s1: 20 },
      { x: 20, s0: 8, s1: 20 },
    ]);
  });

  it("samples evenly between the ends of a zoomed range, with values from the straight lines", () => {
    const rows = chartRows(series, 12, 18, 2);
    expect(rows).toEqual([
      { x: 12, s0: 1, s1: 12 },
      { x: 15, s0: 2.5, s1: 15 },
      { x: 18, s0: 4, s1: 18 },
    ]);
  });
});

describe("tidy axes", () => {
  it("steps by 1, 2, 2.5 or 5 times a power of ten, in about five steps", () => {
    expect(niceScale(9_750_990)).toEqual({ top: 10_000_000, step: 2_000_000 });
    expect(niceScale(300_000_000)).toEqual({ top: 300_000_000, step: 100_000_000 });
    expect(niceScale(36_383_770)).toEqual({ top: 40_000_000, step: 10_000_000 });
  });

  it("still draws an axis when every value is zero", () => {
    expect(niceScale(0)).toEqual({ top: 1, step: 0.25 });
  });
});

describe("curved stretches (X17), on case 10b", () => {
  // 10b's carve-out shares the Series A tier until it's paid in full, so payouts curve from $0 to $10M, where the
  // carve-out's first tier ends, and on to $11,052,631.58, where the tier is paid in full.
  const exit = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../../cases/edge-10b-carve-out-alongside-preferences/inputs.json"), "utf8")).exit;
  const analysis = computeAnalysis(exit);
  const read = readExit(exit);
  const pc = prepare(read.capTable);
  const nodes = seriesNodes(analysis.curve, "holder", "founder_a");

  it("flags the breakpoints next to a curve, as the case does", () => {
    expect(analysis.breakpoints.map((b) => [new D(b.exitValue).toFixed(2), b.curveBelow, b.curveAbove])).toEqual([
      ["10000000.00", true, true],
      ["11052631.58", true, false],
      ["20000000.00", false, false],
      ["26500000.00", false, false],
    ]);
  });

  it("draws each curved stretch through 63 points along it, each the engine's own payout, and no others", () => {
    const samples = nodes.filter((n) => n.sample);
    expect(samples).toHaveLength(126);
    expect(samples.every((n) => n.x.gt(0) && n.x.lt("11052631.58"))).toBe(true);
    for (const n of samples.filter((_, i) => i % 9 === 0)) expect(n.left.eq(solve(pc, n.x).answers[0]!.payout.holderTotals.get("founder_a")!)).toBe(true);
  });

  it("knows where it curves, so values there are read from the engine, not the line between two points", () => {
    expect(curvedAt(nodes, new D("5100000"))).toBe(true);
    expect(curvedAt(nodes, new D("10500000"))).toBe(true);
    expect(curvedAt(nodes, new D("15000000"))).toBe(false);
    // Between two samples the straight line is near the curve, not on it. It's farthest where the curve bends most,
    // midway to the first sample, $78,125: there the line is $36.54 off, under a pixel on the chart but not to the cent.
    const x = new D("78125");
    const exact = solve(pc, x).answers[0]!.payout.holderTotals.get("founder_a")!;
    expect(exact.minus(valueAt(nodes, x)).abs().toFixed(2)).toBe("36.54");
  });

  it("gives Founder A's rate right at each breakpoint on a curved side, as X17's approved wording reads it", () => {
    const at = (x: string) => {
      const b = analysis.breakpoints.find((v) => new D(v.exitValue).toFixed(2) === x)!;
      const rate = (r: { holders: Record<string, string> } | undefined) => (r ? new D(r.holders.founder_a!) : undefined);
      return changeAt(nodes, nodeAt(nodes, new D(b.exitValue)), { below: rate(b.rates.below), above: rate(b.rates.above) });
    };
    const ten = at("10000000.00");
    expect(ten).toMatchObject({ kind: "bend", curvedBefore: true, curvedAfter: true });
    if (ten?.kind === "bend") expect([ten.before.toFixed(0), ten.after.toFixed(0)]).toEqual(["104132", "79339"]);
    const paid = at("11052631.58");
    expect(paid).toMatchObject({ kind: "bend", curvedBefore: true, curvedAfter: false });
    if (paid?.kind === "bend") expect([paid.before.toFixed(0), paid.after.toFixed(0)]).toEqual(["84286", "742500"]);
  });
});
