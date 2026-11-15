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
// Most margins belong to a set of choices one switch away, and only bend the
// gain from that switch. Since 10j the finder doesn't stop where one of those
// reaches zero: it reads that set of choices again just above, by itself, and
// follows the gain on its new line (followStretch). It stops only where the
// answer's own margins, or a gain that decides it, reach zero.
//
// Where payouts curve (X17: a carve-out alongside the preferences sharing a
// tier that isn't paid in full), a breakpoint is where the formula changes:
// the carve-out's tier ends, or the tier it shares is paid in full. Those two
// margins stay straight on a curve, so they still place the change exactly.
// The stretch is checked at many points instead of against a line, and the
// payouts and slopes either side are read at the breakpoint itself. One
// decision may also change on a curve (case 8b, 0.3.0 work 03f): a warrant
// for a series in the short tier, whose gain from exercising is one straight
// line over another. Its gain is fitted from three readings, checked against
// a fourth, and solved where it is zero; anything else stops the finder.

import type { Decimal } from "decimal.js";

import { D, TIE, toCents } from "./decimal.ts";
import { NoAnswerError } from "./errors.ts";
import { StabilityWatch, snapshotAt, unitAt } from "./decisions.ts";
import type { Snapshot, Unit } from "./decisions.ts";
import { describeChange } from "./reasons.ts";
import type { Reason } from "./reasons.ts";
import { settle, working } from "./waterfall.ts";
import type { Decisions, Prepared, PreparedCapTable } from "./waterfall.ts";

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
/** A fitted gain must match its fourth reading this closely, relative to the reading (03f). */
const FIT_TIE = new D("1e-20");
/** Bisection steps allowed to gather four readings before a change on a curve. */
const MAX_BISECTIONS = 60;
/** The step for reading a slope at a breakpoint on a curved side. */
const SLOPE_STEP = new D("1e-9");

function sameDecisions(s: Snapshot, t: Snapshot): boolean {
  const d1 = s.answer.decisions;
  const d2 = t.answer.decisions;
  const sameSet = (x: ReadonlySet<string>, y: ReadonlySet<string>) => x.size === y.size && [...x].every((v) => y.has(v));
  return sameSet(d1.converted, d2.converted) && sameSet(d1.exercised, d2.exercised);
}

function sameState(s: Snapshot, t: Snapshot): boolean {
  if (!sameDecisions(s, t)) return false;
  if (s.margins.size !== t.margins.size) return false;
  for (const k of s.margins.keys()) if (!t.margins.has(k)) return false;
  return true;
}

/** Read the stretch that starts just above x. */
function stretchAbove(pc: Prepared, x: Decimal): Stretch {
  for (const step of STEPS) {
    const a = x.plus(step);
    const b = a.plus(step);
    const at = snapshotAt(pc, a);
    const then = snapshotAt(pc, b);
    if (sameState(at, then)) return { start: x, a, b, at, then, curved: at.answer.payout.curved };
  }
  throw new NoAnswerError(`Just above $${toCents(x)} the decisions change too often to read the payout curve.`);
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

// ---------- following each gain on its own lines (10j) ----------
//
// Most of a stretch's margins don't decide the answer: they are the tiers, caps
// and next option class of a set of choices one switch away, and only bend the
// gain from that switch. Where one reaches zero, nothing paid changes, so the
// finder doesn't stop there. It reads that set of choices again just above,
// by itself, and follows the gain on its new line. It stops only where the
// answer's own margins reach zero, or a gain that decides it does: where what
// it pays can change. A set of choices whose gain decides another's, as a
// SAFE's switch decides how the SAFEs settle under a series' switch (E20), is
// followed the same way: where that gain reaches zero, the set it decides is
// read again with its switches. Every reading is the same as a stop would make
// there, two just above, so a gain's zero is placed as exactly as it was.

/** A margin or amount as a straight line, through two readings. */
interface TwoReadings {
  x1: Decimal;
  v1: Decimal;
  x2: Decimal;
  v2: Decimal;
}

function valueOn(l: TwoReadings, x: Decimal): Decimal {
  if (x.eq(l.x1)) return l.v1;
  if (x.eq(l.x2)) return l.v2;
  return l.v1.plus(l.v2.minus(l.v1).div(l.x2.minus(l.x1)).times(x.minus(l.x1)));
}

/** Where a line reaches zero beyond `after` and before `hi`, or null. */
function zeroOf(l: TwoReadings, after: Decimal, hi: Decimal): Decimal | null {
  const m = l.v2.minus(l.v1).div(l.x2.minus(l.x1));
  if (m.isZero()) return null;
  const zero = l.x1.minus(l.v1.div(m));
  return zero.gt(after) && zero.lt(hi) ? zero : null;
}

function first(x: Decimal | null, y: Decimal | null): Decimal | null {
  return x === null ? y : y === null || x.lte(y) ? x : y;
}

/** One unit as the finder follows it: its margins and amounts as lines, from two readings. */
interface Followed {
  unit: Unit;
  own: Map<string, TwoReadings>;
  value: Map<string, TwoReadings>;
  parent: Followed | null;
  children: Followed[];
  /** Where its own margins first reach zero, for a unit other than an answer. */
  ownZero: Decimal | null;
  /** Its gain from switching, its amount less its parent's, as a line; and where it reaches zero. */
  gain: TwoReadings | null;
  gainZero: Decimal | null;
}

/** Keys that leave and join the margins where a unit is read again: the check in the middle expects them (checkStretch). */
interface KeyChange {
  at: Decimal;
  removed: string[];
  added: string[];
}

/** Two readings of one unit, as lines; null if they don't share every key, or if a payout curves (X17). */
function pair(u1: Unit, u2: Unit, x1: Decimal, x2: Decimal, parent: Followed | null): Followed | null {
  if (u1.curved || u2.curved || u1.own.size !== u2.own.size || u1.children.length !== u2.children.length || u1.gain?.key !== u2.gain?.key) return null;
  const lines = (m1: Map<string, Decimal>, m2: Map<string, Decimal>) => {
    const out = new Map<string, TwoReadings>();
    for (const [k, v1] of m1) {
      const v2 = m2.get(k);
      if (v2 === undefined) return null;
      out.set(k, { x1, v1, x2, v2 });
    }
    return out;
  };
  const own = lines(u1.own, u2.own);
  const value = lines(u1.value, u2.value);
  if (!own || !value) return null;
  const f: Followed = { unit: u1, own, value, parent, children: [], ownZero: null, gain: null, gainZero: null };
  for (const [i, c] of u1.children.entries()) {
    const fc = pair(c, u2.children[i]!, x1, x2, f);
    if (!fc) return null;
    f.children.push(fc);
  }
  return f;
}

/** The unit whose decisions a gain decides: a step's switch decides the step's parent, every other unit its own parent. */
function decides(f: Followed): Followed {
  return f.parent!.unit.spec.kind === "step" ? f.parent!.parent! : f.parent!;
}

/** A gain as a line: its amount less its parent's, read at the later side's two exit values, as a stop there would read both. */
function gainLine(f: Followed): TwoReadings {
  const id = f.unit.gain!.id;
  const mine = f.value.get(id)!;
  const theirs = f.parent!.value.get(id)!;
  const later = mine.x1.gte(theirs.x1) ? mine : theirs;
  const at = (x: Decimal) => valueOn(mine, x).minus(valueOn(theirs, x));
  return { x1: later.x1, v1: at(later.x1), x2: later.x2, v2: at(later.x2) };
}

function ownKeys(f: Followed): string[] {
  return [...f.own.keys(), ...(f.unit.gain ? [f.unit.gain.key] : [])];
}

function subtree(f: Followed): Followed[] {
  return [f, ...f.children.flatMap(subtree)];
}

/** A gain's side of TIE: decisions turn where it crosses one (E14), so a reading on another side is a change. */
function side(v: Decimal): number {
  return v.gt(TIE) ? 1 : v.lt(TIE.neg()) ? -1 : 0;
}

/**
 * Where the next stop is above a straight stretch: the first exit value where the answer's own margins, a vote, or a
 * gain that decides the answer reaches zero, following each gain through the sets of choices it compares; null if
 * none does before hi. With the keys that change on the way. Null itself where a payout curves (X17): there the
 * stretch is read as before, every margin a stop.
 */
function followStretch(pc: Prepared, s: Stretch, hi: Decimal): { next: Decimal | null; changes: KeyChange[] } | null {
  const tops: Followed[] = [];
  for (const [i, u] of s.at.units.entries()) {
    const f = pair(u, s.then.units[i]!, s.a, s.b, null);
    if (!f) return null;
    tops.push(f);
  }
  // The answers' own margins and the votes are straight along the whole stretch.
  let stop: Decimal | null = null;
  for (const t of tops) for (const l of t.own.values()) stop = first(stop, zeroOf(l, s.b, hi));
  for (const [k, va] of s.at.margins) if (k.startsWith("vote:")) stop = first(stop, zeroOf({ x1: s.a, v1: va, x2: s.b, v2: s.then.margins.get(k)! }, s.b, hi));

  let all = tops.flatMap(subtree);
  const refresh = (f: Followed) => {
    if (f.unit.spec.kind !== "top") {
      f.ownZero = null;
      for (const l of f.own.values()) f.ownZero = first(f.ownZero, zeroOf(l, l.x2, hi));
    }
    if (f.unit.gain && f.parent) {
      f.gain = gainLine(f);
      f.gainZero = zeroOf(f.gain, f.gain.x2, hi);
    }
  };
  all.forEach(refresh);
  const changes: KeyChange[] = [];

  /** Reads unit u again just above z, with its switches unless it's a step; false if it can't be followed from there. */
  const reread = (u: Followed, z: Decimal): boolean => {
    const whole = u.unit.spec.kind !== "step";
    let f: Followed | null = null;
    try {
      for (const step of STEPS) {
        const y1 = z.plus(step);
        const y2 = y1.plus(step);
        f = pair(unitAt(pc, y1, u.unit.spec, whole), unitAt(pc, y2, u.unit.spec, whole), y1, y2, u.parent);
        if (f) break;
      }
    } catch (e) {
      // Whatever stops a reading here stops the finder as a stop here would: it reads everything above z.
      if (e instanceof NoAnswerError) return false;
      throw e;
    }
    if (!f) return false;
    const parent = u.parent!;
    const before = whole ? subtree(u) : [u];
    if (!whole) {
      f.children = u.children;
      for (const c of f.children) c.parent = f;
    }
    parent.children[parent.children.indexOf(u)] = f;
    const gone = new Set(before);
    const fresh = whole ? subtree(f) : [f];
    all = all.filter((g) => !gone.has(g)).concat(fresh);
    changes.push({ at: z, removed: before.flatMap(ownKeys), added: fresh.flatMap(ownKeys) });
    // The gains whose line this changes: its own, and, for a step, each of its switches'.
    const affected = whole ? [f] : [f, ...f.children];
    const old = new Map(affected.map((g) => [g, g === f ? u.gain : g.gain]));
    fresh.forEach(refresh);
    if (!whole) f.children.forEach(refresh);
    for (const g of affected) {
      const was = old.get(g);
      if (!g.gain || !was) continue;
      // A gain on another side of TIE just above z than just below: the decisions it decides change at z.
      const at = side(valueOn(was, z));
      if (at === side(g.gain.v1) && at === side(g.gain.v2)) continue;
      const d = decides(g);
      if (d.unit.spec.kind === "top") stop = first(stop, z);
      else if (!reread(d, z)) stop = first(stop, z);
    }
    return true;
  };

  for (let n = 0; n < MAX_STEPS; n++) {
    let next = stop;
    let event: { at: Decimal; unit: Followed } | null = null;
    for (const f of all) {
      if (f.ownZero && (event === null || f.ownZero.lt(event.at))) event = { at: f.ownZero, unit: f };
      if (f.gainZero) {
        const d = decides(f);
        if (d.unit.spec.kind === "top") next = first(next, f.gainZero);
        else if (event === null || f.gainZero.lt(event.at)) event = { at: f.gainZero, unit: d };
      }
    }
    if (event === null || (next !== null && !event.at.lt(next))) return { next, changes };
    if (!reread(event.unit, event.at)) return { next: event.at, changes };
  }
  throw new NoAnswerError(`The breakpoint finder took more than ${MAX_STEPS} steps; it stops rather than loop.`);
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
function exactlyAt(pc: Prepared, decisions: Decisions, x: Decimal, side: -1 | 1): { values: Decimal[]; slopes: Decimal[] } {
  const at = settle(pc, x, decisions).lines.map((l) => l.amount);
  const near = settle(pc, x.plus(SLOPE_STEP.times(side)), decisions).lines.map((l) => l.amount);
  return { values: at, slopes: at.map((v, i) => near[i]!.minus(v).div(SLOPE_STEP).times(side)) };
}

function curveGuard(s: Stretch, end: Decimal): NoAnswerError {
  return new NoAnswerError(
    `Between $${toCents(s.start)} and $${toCents(end)} payouts curve, and a decision changes there. The breakpoint finder places ` +
      "a change on a curve only where the carve-out's tier ends, the tier it shares is paid in full, or one holder's gain from " +
      "switching is one straight line over another and payouts meet there, so it stops rather than guess.",
  );
}

/**
 * A curved stretch, checked at many points up to `end`, where its straight
 * margins place the next change: the answer must be the same at each (X17).
 * Returns null if it is, or else where one decision changes on the curve.
 * That is rare: a curve exists only while the most senior tier is short, when
 * common gets nothing. The exception is a warrant for a series in that tier,
 * which is paid from the tier itself (case 8b).
 */
function checkCurve(pc: Prepared, s: Stretch, end: Decimal): Decimal | null {
  const readings: [Decimal, Snapshot][] = [
    [s.a, s.at],
    [s.b, s.then],
  ];
  for (let k = 1; k < CURVE_SAMPLES; k++) {
    const x = s.b.plus(end.minus(s.b).times(k).div(CURVE_SAMPLES));
    if (!x.gt(s.b)) continue;
    const reading = snapshotAt(pc, x);
    if (sameState(s.at, reading)) readings.push([x, reading]);
    else return decisionOnCurve(pc, s, readings, x, reading, end);
  }
  return null;
}

/**
 * Where one decision changes on a curved stretch, between the last reading in
 * the stretch's state and the first one out of it (03f; the 0.3.0 plan's
 * answer 7). Its holder's gain from switching is a share of a tier that isn't
 * paid in full, (x + strike cash) times its claim over the tier's claims,
 * which grow with x: one straight line over another, g = (a·x + b) ÷ (c·x + 1).
 * It is fitted from three readings spread along the stretch, checked against a
 * fourth, and solved where it is zero. Two decisions at once, a conversion
 * group, a gain of another shape, or a root outside the bracket stop the
 * finder with the guard error; so does a jump there, checked once the answer
 * above is read.
 */
function decisionOnCurve(pc: Prepared, s: Stretch, readings: [Decimal, Snapshot][], out: Decimal, outside: Snapshot, end: Decimal): Decimal {
  // Gather at least four readings in the stretch's state, bisecting towards the change.
  for (let i = 0; readings.length < 4; i++) {
    if (i >= MAX_BISECTIONS) throw curveGuard(s, end);
    const mid = readings[readings.length - 1]![0].plus(out).div(2);
    const reading = snapshotAt(pc, mid);
    if (sameState(s.at, reading)) readings.push([mid, reading]);
    else [out, outside] = [mid, reading];
  }
  const before = s.at.answer.decisions;
  const now = outside.answer.decisions;
  const changed = [...pc.warrants.keys(), ...pc.options.keys(), ...pc.preferred.keys(), ...pc.safes.keys(), ...pc.notes.keys()].filter(
    (id) => before.exercised.has(id) !== now.exercised.has(id) || before.converted.has(id) !== now.converted.has(id),
  );
  if (changed.length !== 1 || pc.capTable.conversionGroups.length > 0) throw curveGuard(s, end);
  const gainKey = [...s.at.margins.keys()].filter((k) => k.endsWith(`|gain:${changed[0]}`) && !k.includes(">"));
  if (gainKey.length !== 1) throw curveGuard(s, end);
  const gain = (r: [Decimal, Snapshot]) => r[1].margins.get(gainKey[0]!)!;

  // Three readings, first, middle and last, fit a·x + b − c·x·g = g; a fourth checks it.
  const n = readings.length;
  const fit = [readings[0]!, readings[Math.floor(n / 2)]!, readings[n - 1]!];
  const check = readings[Math.floor(n / 2) === 1 ? 2 : 1]!;
  const coefficients = solve3(fit.map(([x, r]) => [x, new D(1), x.neg().times(gain([x, r])), gain([x, r])]));
  if (!coefficients) throw curveGuard(s, end);
  const [a, b, c] = coefficients;
  const fitted = (x: Decimal) => a.times(x).plus(b).div(c.times(x).plus(1));
  const [x3] = check;
  if (c.times(x3).plus(1).isZero() || fitted(x3).minus(gain(check)).abs().gt(FIT_TIE.times(D.max(1, gain(check).abs())))) throw curveGuard(s, end);
  if (a.isZero()) throw curveGuard(s, end);
  const root = b.neg().div(a);
  // It must fall after the last reading in the stretch's state, and no later than the first one out of it.
  if (!root.gt(readings[n - 1]![0]) || root.gt(out) || c.times(root).plus(1).isZero()) throw curveGuard(s, end);
  return root;
}

/** Solves three linear equations, each row [x, y, z, right-hand side], by elimination with the largest pivot; null if singular. */
function solve3(rows: Decimal[][]): [Decimal, Decimal, Decimal] | null {
  const m = rows.map((r) => [...r]);
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let r = col + 1; r < 3; r++) if (m[r]![col]!.abs().gt(m[pivot]![col]!.abs())) pivot = r;
    if (m[pivot]![col]!.isZero()) return null;
    [m[col], m[pivot]] = [m[pivot]!, m[col]!];
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const k = m[r]![col]!.div(m[col]![col]!);
      m[r] = m[r]!.map((v, j) => v.minus(k.times(m[col]![j]!)));
    }
  }
  return [m[0]![3]!.div(m[0]![0]!), m[1]![3]!.div(m[1]![1]!), m[2]![3]!.div(m[2]![2]!)];
}

/** Where checkStretch reads: halfway from the stretch's second reading to its end. */
function middle(s: Stretch, end: Decimal): Decimal {
  return s.b.plus(end).div(2);
}

/**
 * Within a straight stretch, nothing should change: the answer and its payouts at the midpoint must match the straight
 * line, and its margins must be those the finder expects there, the stretch's own, with the keys of each set of
 * choices read again below the midpoint changed as they were where it was read (10j).
 */
function checkStretch(pc: Prepared, s: Stretch, end: Decimal, changes: KeyChange[]): void {
  const mid = middle(s, end);
  if (!mid.gt(s.b)) return;
  const reading = snapshotAt(pc, mid);
  const expected = payoutsAlong(s, mid).values;
  const off = reading.answer.payout.lines.findIndex((l, i) => l.amount.minus(expected[i]!).abs().gt(JUMP_TIE));
  const keys = new Set(s.at.margins.keys());
  for (const c of changes) {
    if (!c.at.lt(mid)) break;
    for (const k of c.removed) keys.delete(k);
    for (const k of c.added) keys.add(k);
  }
  const sameKeys = keys.size === reading.margins.size && [...reading.margins.keys()].every((k) => keys.has(k));
  if (!sameDecisions(s.at, reading) || !sameKeys || off >= 0) {
    throw new NoAnswerError(
      `Between $${toCents(s.start)} and $${toCents(end)} something changed that the breakpoint finder didn't predict; it stops rather than miss a breakpoint.`,
    );
  }
}

/**
 * No second stable answer may appear inside a stretch unseen (05c5; Jordan, after #73). Which sets of choices are
 * stable is followed from the stretch's second reading to its end, compared again wherever it could next change
 * (StabilityWatch). A second stable answer stops the finder with its plain message.
 */
function walkStability(watch: StabilityWatch, s: Stretch, end: Decimal): void {
  let y: Decimal | null = s.b;
  for (let i = 0; i < MAX_STEPS && y !== null && y.lt(end); i++) y = watch.at(y);
  if (y !== null && y.lt(end)) throw new NoAnswerError(`The breakpoint finder took more than ${MAX_STEPS} steps; it stops rather than loop.`);
}

/** Every breakpoint strictly inside the range, lowest first. */
export function findBreakpoints(table: PreparedCapTable, range: readonly [Decimal, Decimal]): Breakpoint[] {
  const pc = working(table);
  const [lo, hi] = range;
  const found: Breakpoint[] = [];
  const watch = new StabilityWatch(pc);
  let stretch = stretchAbove(pc, lo);
  for (let i = 0; i < MAX_STEPS; i++) {
    // A straight stretch is followed set of choices by set of choices (10j); a curved one is read as before (X17).
    const followed = stretch.curved ? null : followStretch(pc, stretch, hi);
    const straight = followed ? followed.next : nextChange(stretch, hi);
    // On a curve one decision may change before the next straight margin does (03f).
    const onCurve = stretch.curved ? checkCurve(pc, stretch, straight ?? hi) : null;
    if (!stretch.curved) {
      const end = straight ?? hi;
      try {
        checkStretch(pc, stretch, end, followed?.changes ?? []);
      } catch (e) {
        // Its reading in the middle can be the first to see a second answer: there, not where it begins. The walk
        // follows the stretch from its start, so it runs to the middle first, and where it stops, its stop is given
        // instead (05c6). It runs first only here: reading back to the middle after the walk has read ahead would
        // cost the lines kept between readings.
        walkStability(watch, stretch, middle(stretch, end));
        throw e;
      }
      walkStability(watch, stretch, end);
    }
    const x = onCurve ?? straight;
    if (x === null) return found;
    const after = stretchAbove(pc, x);
    // A straight side extends its two readings; a curved one is read at x itself (X17).
    const below = stretch.curved ? exactlyAt(pc, stretch.at.answer.decisions, x, -1) : payoutsAlong(stretch, x);
    const above = after.curved ? exactlyAt(pc, after.at.answer.decisions, x, 1) : payoutsAlong(after, x);
    const jumps = below.values.some((v, j) => v.minus(above.values[j]!).abs().gt(JUMP_TIE));
    const bends = below.slopes.some((m, j) => m.minus(above.slopes[j]!).abs().gt(SLOPE_TIE));
    // A decision placed on a curve must actually change there, and payouts must meet: a kink, not a jump.
    if (onCurve && (jumps || sameState(stretch.at, after.at))) throw curveGuard(stretch, straight ?? hi);
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
