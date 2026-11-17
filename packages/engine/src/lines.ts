// Payouts for fixed decisions as straight lines in the exit value (05c4).
//
// With the decisions fixed, the waterfall's formula changes only where one of
// its conditions changes: a debt, a carve-out or a tier paid in full, the
// carve-out's band, a SAFE or note with no cap able to convert, a capped series
// held at its cap (the payout's `structure`). Between those points every
// amount it pays moves in a straight line with the exit value, as the
// breakpoint finder already relies on. So two exact readings with the same
// structure give every amount at any exit value where that structure still
// holds: on the open interval where every condition keeps its sign, at least
// a billionth of a dollar from changing. Outside it, or where payouts curve
// (X17), the waterfall is run exactly. The solver weighs the same decisions at
// many exit values, so this saves most of its runs; nothing it decides comes
// from a line closer than that to a change.

import type { Decimal } from "decimal.js";

import { D } from "./decimal.ts";
import { settle } from "./waterfall.ts";
import type { Decisions, NoteSettled, PayoutLine, Prepared, SafeSettled, Settlement, TierPayment } from "./waterfall.ts";

/** How far from changing a condition must be, in dollars or shares, for a line to stand in for the waterfall. */
export const EPS = new D("1e-9");
/** A slope smaller than this is none: an amount that doesn't move with the exit value. */
const FLAT = new D("1e-24");

/** a + b × the exit value. */
export interface Line {
  a: Decimal;
  b: Decimal;
}

export function at(line: Line, x: Decimal): Decimal {
  return line.b.isZero() ? line.a : line.a.plus(line.b.times(x));
}

/** The open interval of exit values a result holds on; null at an end means it's unbounded that way. */
export interface Interval {
  lo: Decimal | null;
  hi: Decimal | null;
}

export const EVERYWHERE: Interval = { lo: null, hi: null };

export function inside(i: Interval, x: Decimal): boolean {
  return (i.lo === null || x.gt(i.lo)) && (i.hi === null || x.lt(i.hi));
}

/** Both intervals at once; null if they don't overlap at x. */
export function meet(a: Interval, b: Interval): Interval {
  const lo = a.lo === null ? b.lo : b.lo === null ? a.lo : D.max(a.lo, b.lo);
  const hi = a.hi === null ? b.hi : b.hi === null ? a.hi : D.min(a.hi, b.hi);
  return { lo, hi };
}

/**
 * Where a straight line keeps the sign it has at x, at least EPS from zero; null if at x it's closer than that. A
 * line that doesn't move keeps its sign everywhere.
 */
export function signHolds(line: Line, x: Decimal): Interval | null {
  const v = at(line, x);
  if (line.b.abs().lt(FLAT)) return v.isZero() ? null : EVERYWHERE;
  if (v.abs().lt(EPS)) return null;
  // s × (a + b × t) ≥ EPS, with s the sign at x.
  const s = v.isNegative() ? -1 : 1;
  const edge = EPS.times(s).minus(line.a).div(line.b);
  return line.b.times(s).isPositive() ? { lo: edge, hi: null } : { lo: null, hi: edge };
}

/** Where a straight line moving toward zero has passed it, and is EPS beyond; null if it isn't moving toward zero. */
export function pastZero(line: Line, x: Decimal): Decimal | null {
  if (line.b.abs().lt(FLAT)) return null;
  const v = at(line, x);
  if (v.isZero() || v.isNegative() === line.b.isNegative()) return null;
  return line.a.neg().plus(EPS.times(v.isNegative() ? 2 : -2)).div(line.b);
}

/** The line through (x0, v0) and (x1, v1), given 1 ÷ (x1 − x0). */
function lineThrough(x0: Decimal, v0: Decimal, v1: Decimal, perDollar: Decimal): Line {
  if (v0.eq(v1)) return { a: v0, b: ZERO_D };
  const b = v1.minus(v0).times(perDollar);
  return { a: v0.minus(b.times(x0)), b };
}

const ZERO_D = new D(0);

/** A payout's discrete shape, which two readings must share to be on one set of lines. */
function shape(p: Settlement): string | null {
  if (p.curved || p.structure.some((sl) => sl.value.abs().lt(EPS))) return null;
  const parts: string[] = [];
  for (const sl of p.structure) parts.push(sl.label, sl.value.isNegative() ? "-" : "+");
  for (const t of p.tiers) parts.push(`t${t.index}${t.full ? "f" : "s"}`, ...t.series);
  parts.push("cap", ...p.atCap, "band", String(p.carveOut?.band ?? ""));
  for (const [id, f] of p.safes) parts.push(id, `${f.converts}${f.room === null}${f.shares === null}`);
  for (const [id, n] of p.notes) parts.push(id, `${n.converts}${n.room === null}${n.shares === null}`);
  parts.push("debt", p.noteDebt ? `${p.noteDebt.full}` : "", ...(p.noteDebt?.notes ?? []));
  parts.push("cash", p.safeCash ? `${p.safeCash.full}` : "", ...(p.safeCash?.safes ?? []));
  parts.push("room", ...p.capRoom.keys());
  return parts.join("\u0000");
}

/** One payout for fixed decisions as straight lines, on the interval where its structure holds. */
export class PayoutLines {
  readonly interval: Interval;
  private readonly p0: Settlement;
  private readonly p1: Settlement;
  private readonly perDollar: Decimal;
  private readonly bySecurity: Map<string, Line> = new Map();
  private readonly price: Line;
  private readonly tiers: { claim: Line; paid: Line }[];
  private readonly carve: { claim: Line; paid: Line } | null;
  private readonly rooms: { safes: Map<string, Line>; notes: Map<string, Line>; cap: Map<string, Line> };
  private readonly debtPaid: Line | null;
  private readonly cashPaid: Line | null;

  private constructor(p0: Settlement, p1: Settlement, perDollar: Decimal, interval: Interval) {
    this.p0 = p0;
    this.p1 = p1;
    this.perDollar = perDollar;
    this.interval = interval;
    const line = (pick: (p: Settlement) => Decimal) => this.through(pick);
    this.price = line((p) => p.commonPrice);
    this.tiers = p0.tiers.map((_, i) => ({ claim: line((p) => p.tiers[i]!.claim), paid: line((p) => p.tiers[i]!.paid) }));
    this.carve = p0.carveOut && { claim: line((p) => p.carveOut!.claim), paid: line((p) => p.carveOut!.paid) };
    const roomsOf = <T extends { room: Decimal | null }>(m: (p: Settlement) => Map<string, T>) =>
      new Map([...m(p0)].filter(([, v]) => v.room !== null).map(([id]) => [id, line((p) => m(p).get(id)!.room!)]));
    this.rooms = {
      safes: roomsOf((p) => p.safes),
      notes: roomsOf((p) => p.notes),
      cap: new Map([...p0.capRoom.keys()].map((sid) => [sid, line((p) => p.capRoom.get(sid)!)])),
    };
    this.debtPaid = p0.noteDebt && line((p) => p.noteDebt!.paid);
    this.cashPaid = p0.safeCash && line((p) => p.safeCash!.paid);
  }

  private through(pick: (p: Settlement) => Decimal): Line {
    return lineThrough(this.p0.exitValue, pick(this.p0), pick(this.p1), this.perDollar);
  }

  /** The lines through two exact readings with the same shape, or null if they don't share one. */
  static through(p0: Settlement, p1: Settlement): PayoutLines | null {
    if (p0.exitValue.eq(p1.exitValue)) return null;
    const s0 = shape(p0);
    if (s0 === null || s0 !== shape(p1)) return null;
    const perDollar = new D(1).div(p1.exitValue.minus(p0.exitValue));
    let interval = EVERYWHERE;
    for (const [i, sl] of p0.structure.entries()) {
      const holds = signHolds(lineThrough(p0.exitValue, sl.value, p1.structure[i]!.value, perDollar), p0.exitValue);
      if (holds === null) return null;
      interval = meet(interval, holds);
    }
    if (!inside(interval, p0.exitValue) || !inside(interval, p1.exitValue)) return null;
    return new PayoutLines(p0, p1, perDollar, interval);
  }

  /** A security's total as a line, worked out when first asked for. */
  security(id: string): Line {
    let l = this.bySecurity.get(id);
    if (!l) this.bySecurity.set(id, (l = this.through((p) => p.bySecurity.get(id)!)));
    return l;
  }

  /** The payout at x, which must be inside the interval. Each part is worked out when first read: the solver reads few. */
  at(x: Decimal): Settlement {
    const { p0 } = this;
    const self = this;
    const memo = <T>(make: () => T) => {
      let v: T | undefined;
      return () => (v ??= make());
    };
    const price = memo(() => at(this.price, x));
    // A SAFE or note with no cap converts into amount ÷ ((1 − discount) × price) shares, a fixed amount's worth: its
    // shares are that amount ÷ the price, not a straight line. A capped one's shares are fixed.
    const worthOver = (n: Decimal | null) => (n === null || price().isZero() ? n : n.times(p0.commonPrice).div(price()));
    const safes = memo(
      () =>
        new Map<string, SafeSettled>(
          [...p0.safes].map(([id, f]) => {
            const room = this.rooms.safes.get(id);
            return [id, { ...f, room: room ? at(room, x) : null, shares: f.converts && f.liquidityCapitalization === null ? worthOver(f.shares) : f.shares }];
          }),
        ),
    );
    const notes = memo(
      () =>
        new Map<string, NoteSettled>(
          [...p0.notes].map(([id, n]) => {
            const room = this.rooms.notes.get(id);
            return [id, { ...n, room: room ? at(room, x) : null, shares: n.converts && room ? worthOver(n.shares) : n.shares }];
          }),
        ),
    );
    const totals = (pick: (p: Settlement) => Map<string, Decimal>) =>
      memo(() => new Map([...pick(p0).keys()].map((k) => [k, at(this.through((p) => pick(p).get(k)!), x)])));
    const holderTotals = totals((p) => p.holderTotals);
    const classTotals = totals((p) => p.classTotals);
    const tiers = memo(() => p0.tiers.map((t, i): TierPayment => ({ ...t, claim: at(this.tiers[i]!.claim, x), paid: at(this.tiers[i]!.paid, x) })));
    const capRoom = memo(() => new Map([...this.rooms.cap].map(([sid, l]) => [sid, at(l, x)])));
    const lines = memo(() => p0.lines.map((l, i): PayoutLine => ({ ...l, amount: at(self.through((p) => p.lines[i]!.amount), x) })));
    const structure = memo(() => p0.structure.map((sl, i) => ({ label: sl.label, value: at(self.through((p) => p.structure[i]!.value), x) })));
    return {
      exitValue: x,
      decisions: p0.decisions,
      strikeCash: p0.strikeCash,
      get commonPrice() {
        return price();
      },
      bySecurity: new LazyAmounts([...p0.bySecurity.keys()], (id) => at(self.security(id), x)),
      series: p0.series,
      get carveOut() {
        return p0.carveOut && { band: p0.carveOut.band, claim: at(self.carve!.claim, x), paid: at(self.carve!.paid, x) };
      },
      get safes() {
        return safes();
      },
      get notes() {
        return notes();
      },
      get noteDebt() {
        return p0.noteDebt && { ...p0.noteDebt, paid: at(self.debtPaid!, x) };
      },
      get safeCash() {
        return p0.safeCash && { ...p0.safeCash, paid: at(self.cashPaid!, x) };
      },
      curved: false,
      get tiers() {
        return tiers();
      },
      atCap: p0.atCap,
      get capRoom() {
        return capRoom();
      },
      get lines() {
        return lines();
      },
      get holderTotals() {
        return holderTotals();
      },
      get classTotals() {
        return classTotals();
      },
      get structure() {
        return structure();
      },
    };
  }
}

/** Each security's total at one exit value, from its line, worked out the first time it's read. */
class LazyAmounts extends Map<string, Decimal> {
  private readonly ids: string[];
  private readonly known: Set<string>;
  private readonly amount: (id: string) => Decimal;

  constructor(ids: string[], amount: (id: string) => Decimal) {
    super();
    this.ids = ids;
    this.known = new Set(ids);
    this.amount = amount;
  }

  override get(id: string): Decimal | undefined {
    if (!super.has(id) && this.known.has(id)) super.set(id, this.amount(id));
    return super.get(id);
  }

  override has(id: string): boolean {
    return this.known.has(id);
  }

  override get size(): number {
    return this.ids.length;
  }

  /** Every amount, in the order the waterfall gives them. */
  private all(): this {
    if (super.size === this.ids.length) return this;
    const read = new Map(super.entries());
    super.clear();
    for (const id of this.ids) super.set(id, read.get(id) ?? this.amount(id));
    return this;
  }

  override entries(): MapIterator<[string, Decimal]> {
    return super.entries.call(this.all());
  }

  override keys(): MapIterator<string> {
    return super.keys.call(this.all());
  }

  override values(): MapIterator<Decimal> {
    return super.values.call(this.all());
  }

  override forEach(fn: (value: Decimal, key: string, map: Map<string, Decimal>) => void): void {
    super.forEach.call(this.all(), fn);
  }

  override [Symbol.iterator](): MapIterator<[string, Decimal]> {
    return this.entries();
  }
}

/**
 * One set of decisions' lines, once known: the last few, the last one read first. The breakpoint finder reads a set
 * of choices ahead as it follows a gain, then behind as it checks a stretch (10j), so each set keeps the lines of more
 * than one structure.
 */
interface Readings {
  lines: PayoutLines[];
  /** The step they were last read on (nextStep). */
  read: number;
}

/** How many sets of lines each set of decisions keeps. */
const KEPT_LINES = 4;

/** Each prepared cap table's lines, and the step its reading has reached. */
interface Kept {
  step: number;
  /** Where the breakpoint finder's stretch begins, if this step is one: no line ending at or below it is read again. */
  from: Decimal | null;
  /** Each set of decisions with lines kept, the least recently read first. */
  byKey: Map<string, Readings>;
  /** How many lines are kept now. Never more than the sets of decisions that have had lines (keepLines). */
  lines: number;
  lined: Set<string>;
}

const READINGS = new WeakMap<Prepared, Kept>();

function keptFor(pc: Prepared): Kept {
  let k = READINGS.get(pc);
  if (!k) READINGS.set(pc, (k = { step: 0, from: null, byKey: new Map(), lines: 0, lined: new Set() }));
  return k;
}

/** The step a prepared cap table's reading has reached: what anything kept for it is stamped with when read. */
export function stepOf(pc: Prepared): number {
  return keptFor(pc).step;
}

/** How many steps back what was kept can last have been read and still be kept: the step just ended, and the one before it. */
const KEPT_STEPS = 2;

/** Whether what was last read on step `read` is passed, now that the reading is on step `step`. */
export function passed(read: number, step: number): boolean {
  return read < step - KEPT_STEPS;
}

/**
 * The next step of reading a prepared cap table (10j): the breakpoint finder begins its next stretch up, or a caller
 * asks solve for another exit value. The finder reads upward, a stretch at a time, so a set of decisions read on
 * neither of the last two steps is one it has passed: its lines are let go, and worked out again if it's read
 * again. A table with many SAFEs and option strikes reads tens of thousands of sets, and each set's lines hold two of
 * the waterfall's runs: kept for as long as the table, they were nearly all the memory the search took. Where the step
 * is the finder's next stretch, `from` is where it begins, and lines that end at or below it go too: the finder reads
 * above it from now on.
 */
export function nextStep(pc: Prepared, from: Decimal | null = null): number {
  const k = keptFor(pc);
  k.step += 1;
  k.from = from;
  // The least recently read come first: past the first that isn't passed, none is.
  for (const [key, r] of k.byKey) {
    if (!passed(r.read, k.step)) break;
    k.lines -= r.lines.length;
    k.byKey.delete(key);
  }
  if (from) {
    for (const [key, r] of k.byKey) {
      const still = r.lines.filter((l) => l.interval.hi === null || l.interval.hi.gt(from));
      k.lines -= r.lines.length - still.length;
      if (still.length === 0) k.byKey.delete(key);
      else r.lines = still;
    }
  }
  return k.step;
}

/**
 * Keep a set of decisions' new lines, the last read first (10j). Never more lines in all than there are sets of
 * decisions that have had them: main kept one for each, for as long as the table, and nothing kept may take more
 * memory than that. Where a set's second structure would make more, its new lines take the place of its last.
 */
function keepLines(k: Kept, key: string, r: Readings, lines: PayoutLines): void {
  k.lined.add(key);
  if (!k.byKey.has(key)) k.byKey.set(key, r);
  if (r.lines.length > 0 && k.lines >= k.lined.size) {
    r.lines.pop();
    k.lines -= 1;
  }
  r.lines.unshift(lines);
  k.lines += 1;
  if (r.lines.length > KEPT_LINES) {
    r.lines.pop();
    k.lines -= 1;
  }
}

function decisionsKey(d: Decisions): string {
  return `${[...d.converted].sort().join("\u0000")}/${[...d.exercised].sort().join("\u0000")}`;
}

/**
 * The payout for these decisions at x, from its lines where they hold, or else run exactly; with its lines, if
 * known, which hold on their interval.
 */
export function payoutWithLines(pc: Prepared, x: Decimal, decisions: Decisions): { payout: Settlement; lines: PayoutLines | null } {
  const kept = keptFor(pc);
  const k = decisionsKey(decisions);
  let r = kept.byKey.get(k);
  if (r) {
    // Read now: the last in the order the least recently read are let go in.
    kept.byKey.delete(k);
    kept.byKey.set(k, r);
    r.read = kept.step;
  } else r = { lines: [], read: kept.step };
  const known = r.lines.findIndex((l) => inside(l.interval, x));
  if (known >= 0) {
    const lines = r.lines[known]!;
    if (known > 0) r.lines.unshift(...r.lines.splice(known, 1));
    return { payout: lines.at(x), lines };
  }
  const exact = settle(pc, x, decisions);
  // A second reading just beside this one gives its lines at once, unless this exit value is next to a change.
  for (const beside of [x.plus(BESIDE), x.minus(BESIDE)]) {
    const lines = PayoutLines.through(exact, settle(pc, beside, decisions));
    if (lines && inside(lines.interval, x)) {
      keepLines(kept, k, r, lines);
      return { payout: exact, lines };
    }
  }
  return { payout: exact, lines: null };
}

/** How far beside an exact reading the second one is taken, in dollars. */
const BESIDE = new D("1e-5");

