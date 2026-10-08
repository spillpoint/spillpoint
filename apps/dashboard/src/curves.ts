// The payoff curves, from the analysis's curve points. A payout is a
// straight line between breakpoints (SPEC, Breakpoints), except where it
// curves (X17), so a straight stretch is exact as two nodes: the value at
// each breakpoint from below, and just above where it jumps. A curved stretch
// has sample nodes along it, which draw it; values between them are read
// from the engine, never from the straight line between them. Values are
// Decimals; they become numbers only for drawing.

import { D } from "spillpoint";

import type { CurvePoint } from "./analysis.ts";

type Decimal = D;

export type SeriesKind = "holder" | "class";

/** A curve's value at one exit value: from below (left) and just above (right). They differ only where it jumps. */
export interface Node {
  x: Decimal;
  left: Decimal;
  right: Decimal;
  /** A point along a curved stretch, not a breakpoint or an end of the range. */
  sample: boolean;
  /** Payouts curve from here to the next node (X17). */
  curvedAfter: boolean;
}

const ZERO = new D(0);

/** One holder's or class's curve, as nodes in exit-value order. */
export function seriesNodes(curve: readonly CurvePoint[], kind: SeriesKind, id: string): Node[] {
  const nodes: Node[] = [];
  for (const p of curve) {
    const value = new D((kind === "holder" ? p.holders : p.classes)[id] ?? "0");
    const x = new D(p.exitValue);
    if (p.side === "above") Object.assign(nodes[nodes.length - 1]!, { right: value, curvedAfter: p.curvedAfter });
    else nodes.push({ x, left: value, right: value, sample: p.side === "sample", curvedAfter: p.curvedAfter });
  }
  return nodes;
}

/**
 * Whether x falls strictly inside a curved stretch, between two nodes: there
 * the straight line between them isn't the payout, so it's read from the
 * engine instead.
 */
export function curvedAt(nodes: readonly Node[], x: Decimal): boolean {
  for (let i = 0; i < nodes.length - 1; i++) {
    if (x.gt(nodes[i]!.x) && x.lt(nodes[i + 1]!.x)) return nodes[i]!.curvedAfter;
  }
  return false;
}

/** The node at a breakpoint, by its exit value. */
export function nodeAt(nodes: readonly Node[], x: Decimal): number {
  return nodes.findIndex((n) => !n.sample && n.x.eq(x));
}

/** The value at any exit value: the node's own value there, or the straight line between its neighbours. */
export function valueAt(nodes: readonly Node[], x: Decimal): Decimal {
  if (nodes.length === 0) return ZERO;
  if (x.lte(nodes[0]!.x)) return nodes[0]!.left;
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i]!;
    const b = nodes[i + 1]!;
    if (x.eq(a.x)) return a.left;
    if (x.lt(b.x)) return a.right.plus(b.left.minus(a.right).times(x.minus(a.x)).div(b.x.minus(a.x)));
  }
  return nodes[nodes.length - 1]!.left;
}

/** Values closer than half a cent don't jump; rates closer than half a cent per extra $1M don't bend. */
const VALUE_TIE = new D("0.005");
const MILLION = new D("1e6");

/**
 * How a curve changes at node i, if it does: a jump from one payout to
 * another, or a bend, given as what each extra $1M of exit value adds to the
 * payout just below the breakpoint and just above it. On a straight side that
 * rate holds across the whole stretch. On a curved side it keeps changing
 * (X17), so it's the rate right at the breakpoint, given in `rates` per
 * dollar, and the change says which sides curve.
 */
export type Change =
  | { kind: "jump"; from: Decimal; to: Decimal }
  | { kind: "bend"; before: Decimal; after: Decimal; curvedBefore: boolean; curvedAfter: boolean };

export function changeAt(nodes: readonly Node[], i: number, rates: { below?: Decimal | undefined; above?: Decimal | undefined } = {}): Change | null {
  const n = nodes[i];
  const before = nodes[i - 1];
  const after = nodes[i + 1];
  if (!n || !before || !after) return null;
  if (n.right.minus(n.left).abs().gt(VALUE_TIE)) return { kind: "jump", from: n.left, to: n.right };
  const curvedBefore = before.curvedAfter && rates.below !== undefined;
  const curvedAfter = n.curvedAfter && rates.above !== undefined;
  const perMillionBefore = curvedBefore ? rates.below!.times(MILLION) : n.left.minus(before.right).div(n.x.minus(before.x)).times(MILLION);
  const perMillionAfter = curvedAfter ? rates.above!.times(MILLION) : after.left.minus(n.right).div(after.x.minus(n.x)).times(MILLION);
  if (perMillionBefore.minus(perMillionAfter).abs().gt(VALUE_TIE)) return { kind: "bend", before: perMillionBefore, after: perMillionAfter, curvedBefore, curvedAfter };
  return null;
}

/**
 * Whether this curve bends or jumps at node i: the breakpoints that change
 * the selected holder's payout, which the founder view points out.
 */
export function changesAt(nodes: readonly Node[], i: number): boolean {
  return changeAt(nodes, i) !== null;
}

/** A tidy axis top and step: 1, 2, 2.5 or 5 times a power of ten, in four to six steps. */
export function niceScale(max: number): { top: number; step: number } {
  if (!(max > 0)) return { top: 1, step: 0.25 };
  const rough = max / 5;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough)!;
  return { top: Math.ceil(max / step) * step, step };
}

/** One row of the chart: an exit value and each series' value there (null breaks a line at a jump). */
export type ChartRow = { x: number } & Record<string, number | null>;

/**
 * The rows the chart draws between from and to: every node inside, curved
 * stretches' samples among them, evenly spaced samples so hovering finds a
 * value anywhere, and at a jump three rows (below, a break, above) so the
 * line breaks there and the jump is drawn on its own. On a curved stretch a
 * row between samples is drawn on the line between them, far less than a
 * pixel from the curve; the readout and legend read the engine there.
 */
export function chartRows(series: ReadonlyMap<string, Node[]>, from: number, to: number, samples = 240): ChartRow[] {
  const xs = new Set<number>([from, to]);
  for (let i = 0; i <= samples; i++) xs.add(from + ((to - from) * i) / samples);
  const jumpsAt = new Map<number, Set<string>>();
  for (const [key, nodes] of series) {
    for (const n of nodes) {
      const x = n.x.toNumber();
      if (x < from || x > to) continue;
      xs.add(x);
      if (!n.left.eq(n.right)) {
        if (!jumpsAt.has(x)) jumpsAt.set(x, new Set());
        jumpsAt.get(x)!.add(key);
      }
    }
  }
  const rows: ChartRow[] = [];
  for (const x of [...xs].sort((a, b) => a - b)) {
    const at = new D(x);
    const row = (pick: (nodes: Node[], key: string) => number | null): ChartRow => {
      const r: ChartRow = { x } as ChartRow;
      for (const [key, nodes] of series) r[key] = pick(nodes, key);
      return r;
    };
    const jumping = jumpsAt.get(x);
    if (!jumping) {
      rows.push(row((nodes) => valueAt(nodes, at).toNumber()));
      continue;
    }
    const node = (nodes: Node[]) => nodes.find((n) => n.x.toNumber() === x);
    rows.push(row((nodes) => (node(nodes) ?? { left: valueAt(nodes, at) }).left.toNumber()));
    rows.push(row((nodes, key) => (jumping.has(key) ? null : valueAt(nodes, at).toNumber())));
    rows.push(row((nodes) => (node(nodes) ?? { right: valueAt(nodes, at) }).right.toNumber()));
  }
  return rows;
}
