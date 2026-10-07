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
//
// Where payouts curve (X17: a carve-out alongside the preferences sharing a
// tier that isn't paid in full), a breakpoint is where the formula changes:
// the carve-out's tier ends, or the tier it shares is paid in full. Those two
// margins stay straight on a curve, so they still place the change exactly.
// The stretch is checked at many points instead of against a line, and the
// payouts and slopes either side are read at the breakpoint itself.

import type { Decimal } from "decimal.js";

import { D } from "./decimal.ts";
import { NoAnswerError } from "./errors.ts";
import { snapshotAt } from "./decisions.ts";
import type { Snapshot } from "./decisions.ts";
import { describeChange } from "./reasons.ts";
import type { Reason } from "./reasons.ts";
import { payout } from "./waterfall.ts";
import type { Decisions, PreparedCapTable } from "./waterfall.ts";

export interface Breakpoint {
  /** Where the payouts bend or jump, to 40 digits. */
  exitValue: Decimal;
  /** Payouts jump here rather than bend (E13). At this exit value itself the outcome from below holds. */
  jumps: boolean;
  /** Payouts curve just below, or just above, this exit value (X17). */
  curveBelow: boolean;
  curveAbove: boolean;
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
  /** Payouts curve along it (X17). */
  curved: boolean;
}

/** Margins that stay straight lines where payouts curve (X17): a tier's shortfall, and the distance to the carve-out's next tier edge. */
const STRAIGHT_ON_A_CURVE = /\|(tier|carve):/;
/** How many points a curved stretch is checked at. */
const CURVE_SAMPLES = 64;
/** The step for reading a slope at a breakpoint on a curved side. */
const SLOPE_STEP = new D("1e-9");

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
    if (sameState(at, then)) return { start: x, a, b, at, then, curved: at.answer.payout.curved };
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
    // On a curve only the straight margins can be extended; any other change there is caught by checkStretch.
    if (s.curved && !STRAIGHT_ON_A_CURVE.test(k)) continue;
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

/** The payouts exactly at x under one side's decisions, and their slopes on that side (X17). */
function exactlyAt(pc: PreparedCapTable, decisions: Decisions, x: Decimal, side: -1 | 1): { values: Decimal[]; slopes: Decimal[] } {
  const at = payout(pc, x, decisions).lines.map((l) => l.amount);
  const near = payout(pc, x.plus(SLOPE_STEP.times(side)), decisions).lines.map((l) => l.amount);
  return { values: at, slopes: at.map((v, i) => near[i]!.minus(v).div(SLOPE_STEP).times(side)) };
}

/**
 * Within a stretch, nothing should change. On a straight stretch, the answer
 * and its payouts at the midpoint must match the straight line. On a curved
 * one, the answer must be the same at every one of many points along it: a
 * decision changing on a curve isn't something the finder can place, so it
 * stops (X17).
 */
function checkStretch(pc: PreparedCapTable, s: Stretch, end: Decimal): void {
  if (s.curved) {
    for (let k = 1; k < CURVE_SAMPLES; k++) {
      const x = s.b.plus(end.minus(s.b).times(k).div(CURVE_SAMPLES));
      if (!x.gt(s.b)) continue;
      if (!sameState(s.at, snapshotAt(pc, x))) {
        throw new NoAnswerError(
          `Between $${s.start.toFixed(2)} and $${end.toFixed(2)} payouts curve, and a decision changes there. The breakpoint finder places ` +
            "a change on a curve only where the carve-out's tier ends or the tier it shares is paid in full, so it stops rather than miss one.",
        );
      }
    }
    return;
  }
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
    checkStretch(pc, stretch, x ?? hi);
    if (x === null) return found;
    const after = stretchAbove(pc, x);
    // A straight side extends its two readings; a curved one is read at x itself (X17).
    const below = stretch.curved ? exactlyAt(pc, stretch.at.answer.decisions, x, -1) : payoutsAlong(stretch, x);
    const above = after.curved ? exactlyAt(pc, after.at.answer.decisions, x, 1) : payoutsAlong(after, x);
    const jumps = below.values.some((v, j) => v.minus(above.values[j]!).abs().gt(JUMP_TIE));
    const bends = below.slopes.some((m, j) => m.minus(above.slopes[j]!).abs().gt(SLOPE_TIE));
    if (jumps || bends) {
      found.push({
        exitValue: x,
        jumps,
        curveBelow: stretch.curved,
        curveAbove: after.curved,
        reasons: describeChange(pc, x, stretch.at, after.at, jumps),
      });
    }
    stretch = after;
  }
  throw new NoAnswerError(`The breakpoint finder took more than ${MAX_STEPS} steps; it stops rather than loop.`);
}
