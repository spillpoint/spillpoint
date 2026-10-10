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
import { payout } from "./waterfall.ts";
import type { Decisions, NoteHere, Payout, PayoutLine, PreparedCapTable, SafeHere, TierPayment } from "./waterfall.ts";

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
function shape(p: Payout): string | null {
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
  private readonly p0: Payout;
  private readonly p1: Payout;
  private readonly perDollar: Decimal;
  private readonly bySecurity: Map<string, Line> = new Map();
  private readonly price: Line;
  private readonly tiers: { claim: Line; paid: Line }[];
  private readonly carve: { claim: Line; paid: Line } | null;
  private readonly rooms: { safes: Map<string, Line>; notes: Map<string, Line>; cap: Map<string, Line> };
  private readonly debtPaid: Line | null;
  private readonly cashPaid: Line | null;

  private constructor(p0: Payout, p1: Payout, perDollar: Decimal, interval: Interval) {
    this.p0 = p0;
    this.p1 = p1;
    this.perDollar = perDollar;
    this.interval = interval;
    const line = (pick: (p: Payout) => Decimal) => this.through(pick);
    this.price = line((p) => p.commonPrice);
    this.tiers = p0.tiers.map((_, i) => ({ claim: line((p) => p.tiers[i]!.claim), paid: line((p) => p.tiers[i]!.paid) }));
    this.carve = p0.carveOut && { claim: line((p) => p.carveOut!.claim), paid: line((p) => p.carveOut!.paid) };
    const roomsOf = <T extends { room: Decimal | null }>(m: (p: Payout) => Map<string, T>) =>
      new Map([...m(p0)].filter(([, v]) => v.room !== null).map(([id]) => [id, line((p) => m(p).get(id)!.room!)]));
    this.rooms = {
      safes: roomsOf((p) => p.safes),
      notes: roomsOf((p) => p.notes),
      cap: new Map([...p0.capRoom.keys()].map((sid) => [sid, line((p) => p.capRoom.get(sid)!)])),
    };
    this.debtPaid = p0.noteDebt && line((p) => p.noteDebt!.paid);
    this.cashPaid = p0.safeCash && line((p) => p.safeCash!.paid);
  }

  private through(pick: (p: Payout) => Decimal): Line {
    return lineThrough(this.p0.exitValue, pick(this.p0), pick(this.p1), this.perDollar);
  }

  /** The lines through two exact readings with the same shape, or null if they don't share one. */
  static through(p0: Payout, p1: Payout): PayoutLines | null {
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
  at(x: Decimal): Payout {
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
        new Map<string, SafeHere>(
          [...p0.safes].map(([id, f]) => {
            const room = this.rooms.safes.get(id);
            return [id, { ...f, room: room ? at(room, x) : null, shares: f.converts && f.liquidityCapitalization === null ? worthOver(f.shares) : f.shares }];
          }),
        ),
    );
    const notes = memo(
      () =>
        new Map<string, NoteHere>(
          [...p0.notes].map(([id, n]) => {
            const room = this.rooms.notes.get(id);
            return [id, { ...n, room: room ? at(room, x) : null, shares: n.converts && room ? worthOver(n.shares) : n.shares }];
          }),
        ),
    );
    const totals = (pick: (p: Payout) => Map<string, Decimal>) =>
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

/** One set of decisions' lines, once known. */
interface Readings {
  lines: PayoutLines | null;
}

const READINGS = new WeakMap<PreparedCapTable, Map<string, Readings>>();

function decisionsKey(d: Decisions): string {
  return `${[...d.converted].sort().join("\u0000")}/${[...d.exercised].sort().join("\u0000")}`;
}

/**
 * The payout for these decisions at x, from its lines where they hold, or else run exactly; with its lines, if
 * known, which hold on their interval.
 */
export function payoutWithLines(pc: PreparedCapTable, x: Decimal, decisions: Decisions): { payout: Payout; lines: PayoutLines | null } {
  let byKey = READINGS.get(pc);
  if (!byKey) READINGS.set(pc, (byKey = new Map()));
  const k = decisionsKey(decisions);
  let r = byKey.get(k);
  if (!r) byKey.set(k, (r = { lines: null }));
  if (r.lines && inside(r.lines.interval, x)) return { payout: r.lines.at(x), lines: r.lines };
  const exact = payout(pc, x, decisions);
  // A second reading just beside this one gives its lines at once, unless this exit value is next to a change.
  for (const beside of [x.plus(BESIDE), x.minus(BESIDE)]) {
    const lines = PayoutLines.through(exact, payout(pc, beside, decisions));
    if (lines && inside(lines.interval, x)) {
      r.lines = lines;
      return { payout: exact, lines };
    }
  }
  return { payout: exact, lines: null };
}

/** How far beside an exact reading the second one is taken, in dollars. */
const BESIDE = new D("1e-5");

