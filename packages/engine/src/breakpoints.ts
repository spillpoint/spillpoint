// The breakpoint finder (SPEC, Breakpoints). A breakpoint is an exit value
// where some holder's payout bends, or jumps (E13).
//
// Method, deliberately unlike the reference's grid scan: walk up from the
// bottom of the range. Just above the current point, read the answer and
// every margin that decides it (snapshotAt): tiers not yet paid in full,
// caps not yet reached, the next option class's net if exercised, each
// series' gain from switching, each group voter's preference. Between
// changes, every margin and every payout moves in a straight line, so the
// next change is exactly where the first margin reaches zero. Step there,
// read the new answer, and if any payout bends or jumps, that is a
// breakpoint. Each stretch is checked at its midpoint, so a change the
// margins failed to predict stops the finder instead of going unnoticed.

import type Decimal from "decimal.js";

import { D } from "./decimal.ts";
import { NoAnswerError } from "./errors.ts";
import { snapshotAt } from "./decisions.ts";
import type { Snapshot } from "./decisions.ts";
import { describeChange } from "./reasons.ts";
import type { Reason } from "./reasons.ts";
import type { PreparedCapTable } from "./waterfall.ts";

export interface Breakpoint {
  /** Where the payouts bend or jump, to 40 digits. */
  exitValue: Decimal;
  /** Payouts jump here rather than bend (E13). At this exit value itself the outcome from below holds. */
  jumps: boolean;
  /** Why, in plain English, one reason per change. */
  reasons: Reason[];
}

/** How far above a point the finder looks to read the stretch that starts there, tried in this order. */
const STEPS = ["1e-4", "1e-3", "1e-5", "1e-2", "1e-6", "1e-1", "1e-7"].map((s) => new D(s));
/** Payouts closer than this on either side of a point don't jump; slopes closer than SLOPE_TIE don't bend. */
const JUMP_TIE = new D("1e-6");
const SLOPE_TIE = new D("1e-12");
/** Safety stop: no realistic cap table has anywhere near this many changes. */
const MAX_STEPS = 100_000;

/** One stretch: two readings just above its start, between which nothing changes. */
interface Stretch {
  start: Decimal;
  a: Decimal;
  b: Decimal;
  at: Snapshot;
  then: Snapshot;
}

function sameState(s: Snapshot, t: Snapshot): boolean {
  const d1 = s.answer.decisions;
  const d2 = t.answer.decisions;
  const sameSet = (x: ReadonlySet<string>, y: ReadonlySet<string>) => x.size === y.size && [...x].every((v) => y.has(v));
  if (!sameSet(d1.converted, d2.converted) || !sameSet(d1.exercised, d2.exercised)) return false;
  if (s.margins.size !== t.margins.size) return false;
  for (const k of s.margins.keys()) if (!t.margins.has(k)) return false;
  return true;
}

/** Read the stretch that starts just above x. */
function stretchAbove(pc: PreparedCapTable, x: Decimal): Stretch {
  for (const step of STEPS) {
    const a = x.plus(step);
    const b = a.plus(step);
    const at = snapshotAt(pc, a);
    const then = snapshotAt(pc, b);
    if (sameState(at, then)) return { start: x, a, b, at, then };
  }
  throw new NoAnswerError(`Just above $${x.toFixed(2)} the decisions change too often to read the payout curve.`);
}

/** A straight line through the two readings, evaluated at x. */
function along(s: Stretch, va: Decimal, vb: Decimal, x: Decimal): Decimal {
  return va.plus(vb.minus(va).div(s.b.minus(s.a)).times(x.minus(s.a)));
}

function slope(s: Stretch, va: Decimal, vb: Decimal): Decimal {
  return vb.minus(va).div(s.b.minus(s.a));
}

/** Where the first margin reaches zero beyond this stretch's readings, or null if none does before hi. */
function nextChange(s: Stretch, hi: Decimal): Decimal | null {
  let next: Decimal | null = null;
  for (const [k, va] of s.at.margins) {
    const vb = s.then.margins.get(k)!;
    const m = slope(s, va, vb);
    if (m.isZero()) continue;
    const zero = s.a.minus(va.div(m));
    if (zero.gt(s.b) && zero.lt(hi) && (next === null || zero.lt(next))) next = zero;
  }
  return next;
}

/** The payouts at x, extended along this stretch. */
function payoutsAlong(s: Stretch, x: Decimal): { values: Decimal[]; slopes: Decimal[] } {
  const la = s.at.answer.payout.lines;
  const lb = s.then.answer.payout.lines;
  return {
    values: la.map((l, i) => along(s, l.amount, lb[i]!.amount, x)),
    slopes: la.map((l, i) => slope(s, l.amount, lb[i]!.amount)),
  };
}

/** Within a stretch, nothing should change: the answer and its payouts at the midpoint must match the straight line. */
function checkMidpoint(pc: PreparedCapTable, s: Stretch, end: Decimal): void {
  const mid = s.b.plus(end).div(2);
  if (!mid.gt(s.b)) return;
  const reading = snapshotAt(pc, mid);
  const expected = payoutsAlong(s, mid).values;
  const off = reading.answer.payout.lines.findIndex((l, i) => l.amount.minus(expected[i]!).abs().gt(JUMP_TIE));
  if (!sameState(s.at, reading) || off >= 0) {
    throw new NoAnswerError(
      `Between $${s.start.toFixed(2)} and $${end.toFixed(2)} something changed that the breakpoint finder didn't predict; it stops rather than miss a breakpoint.`,
    );
  }
}

/** Every breakpoint strictly inside the range, lowest first. */
export function findBreakpoints(pc: PreparedCapTable, range: readonly [Decimal, Decimal]): Breakpoint[] {
  const [lo, hi] = range;
  const found: Breakpoint[] = [];
  let stretch = stretchAbove(pc, lo);
  for (let i = 0; i < MAX_STEPS; i++) {
    const x = nextChange(stretch, hi);
    checkMidpoint(pc, stretch, x ?? hi);
    if (x === null) return found;
    const after = stretchAbove(pc, x);
    const below = payoutsAlong(stretch, x);
    const above = payoutsAlong(after, x);
    const jumps = below.values.some((v, j) => v.minus(above.values[j]!).abs().gt(JUMP_TIE));
    const bends = below.slopes.some((m, j) => m.minus(above.slopes[j]!).abs().gt(SLOPE_TIE));
    if (jumps || bends) {
      found.push({ exitValue: x, jumps, reasons: describeChange(pc, x, stretch.at, after.at, jumps) });
    }
    stretch = after;
  }
  throw new NoAnswerError(`The breakpoint finder took more than ${MAX_STEPS} steps; it stops rather than loop.`);
}
