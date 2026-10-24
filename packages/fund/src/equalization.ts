// Later closes and their equalization (F25), once for the fund, not by X.
//
// The waterfall treats every LP as in from the start (F25), so nothing here
// changes an account or a tier. What it works out is the cash that moves
// between LPs at each later close:
// - each call was paid, as the fund made it, by the LPs in at its date (FA21),
//   by commitment, or by F22's fee weight for a fee call;
// - at each later close, in date order, the LPs in by then rebalance every
//   call before the close: each one's part becomes the LPs' part of the call
//   times its weight over theirs. The joining LPs pay in their parts; the LPs
//   already in get back what they had paid over theirs;
// - each joining LP pays interest at the equalization rate, simple, Actual/365,
//   on its part of each earlier call, from the call's date to its close. That
//   interest goes to the LPs already in by what each gets back of the call,
//   which is each receiving the rate on what it gets back, for the same days
//   (FA30): worked that way here, with no division between.
// The GP commitment pays its part of each call as it's made and is in no
// equalization (F25), so a call's LPs' part is the call less the GP
// commitment's (F3). Amounts are 40-digit decimals; nothing is rounded.

import { ZERO } from "./decimal.ts";
import type { D } from "./decimal.ts";
import { dayNumber } from "./dates.ts";
import { refuse } from "./errors.ts";
import { callWeight, isIn, joinsLater } from "./input.ts";
import type { CashFlow, Fund, Lp } from "./model.ts";
import { gpCommitmentPart } from "./waterfall.ts";

/** One LP's equalization: at one later close, or over all of them (F26). */
export interface EqualizationAmounts {
  name: string;
  /** The capital it paid in at its own close, catching up on the calls before it. */
  capitalPaid: D;
  /** The capital it got back at a later close, having paid over its part. */
  capitalReturned: D;
  /** The interest it paid on what it caught up. */
  interestPaid: D;
  /** The interest it received from LPs joining after it. */
  interestReceived: D;
}

/** One later close (F25): the LPs joining at it, and what every LP in by then paid in or got back. */
export interface LaterClose {
  date: string;
  /** The names of the LPs joining at it, in the input's order. */
  joining: string[];
  /** Every LP in by then, in the input's order. */
  lps: EqualizationAmounts[];
}

/** The fund's equalization (F26): each later close in date order, and each LP's over all of them. */
export interface Equalization {
  rate: D;
  closes: LaterClose[];
  /** Every LP, in the input's order. */
  lps: EqualizationAmounts[];
}

const YEAR = 365; // Actual/365 (F25)

function nothing(name: string): EqualizationAmounts {
  return { name, capitalPaid: ZERO, capitalReturned: ZERO, interestPaid: ZERO, interestReceived: ZERO };
}

function add(a: EqualizationAmounts, b: EqualizationAmounts): EqualizationAmounts {
  return {
    name: a.name,
    capitalPaid: a.capitalPaid.plus(b.capitalPaid),
    capitalReturned: a.capitalReturned.plus(b.capitalReturned),
    interestPaid: a.interestPaid.plus(b.interestPaid),
    interestReceived: a.interestReceived.plus(b.interestReceived),
  };
}

/** F25: each LP's part of a call's LPs' part among `members`, by weight, multiplied first. Zero for an LP not among them. */
function parts(fund: Fund, call: CashFlow, lps: Lp[], members: boolean[]): D[] {
  const lpsPart = call.amount.minus(gpCommitmentPart(fund, call.kind, call.amount));
  const weights = lps.map((lp, i) => (members[i] ? callWeight(fund, lp, call.kind) : ZERO));
  const all = weights.reduce((s, w) => s.plus(w), ZERO);
  return weights.map((w) => (w.isZero() ? ZERO : lpsPart.times(w).div(all)));
}

/**
 * The fund's equalization (F25, F26), once for the fund: each later close in date order, with what each LP in by then
 * paid in or got back and the interest it paid or received, and each LP's over all of them. Null when no LP joins at
 * a later close. Every amount exact, at 40 digits.
 */
export function equalization(fund: Fund): Equalization | null {
  const lps = fund.lps ?? [];
  const calls = fund.cashFlows.filter((f) => f.type === "call");
  const firstCall = Math.min(...calls.map((f) => dayNumber(f.date)!));
  const dates = [...new Set(lps.filter((lp) => joinsLater(lp, firstCall)).map((lp) => lp.close!))].sort((a, b) => dayNumber(a)! - dayNumber(b)!);
  if (dates.length === 0) return null;
  // F25: it must be entered when there's a later close. readFund refuses a fund without it; one built by hand gets
  // the same refusal here.
  const rate = fund.terms.equalizationRate;
  if (rate == null) throw refuse("missing_field", "terms.equalization_rate");

  // The fund's calls as it made them: each paid by the LPs in at its date (FA21). F28 refuses a call no LP pays.
  const held = new Map<number, D[]>(calls.map((c) => [c.index, parts(fund, c, lps, lps.map((lp) => isIn(lp, dayNumber(c.date)!)))]));
  const closes: LaterClose[] = dates.map((date) => {
    const day = dayNumber(date)!;
    const members = lps.map((lp) => isIn(lp, day));
    const joining = lps.map((lp) => lp.close != null && dayNumber(lp.close) === day);
    const moves = lps.map((lp) => nothing(lp.name));
    for (const c of calls) {
      // FA21: a call on the close's date was paid by the LPs joining that day, as it was made.
      if (!(dayNumber(c.date)! < day)) continue;
      const before = held.get(c.index)!;
      const now = parts(fund, c, lps, members);
      const days = day - dayNumber(c.date)!;
      lps.forEach((_, i) => {
        if (!members[i]) return;
        const m = moves[i]!;
        if (joining[i]) {
          moves[i] = { ...m, capitalPaid: m.capitalPaid.plus(now[i]!), interestPaid: m.interestPaid.plus(rate.times(now[i]!).times(days).div(YEAR)) };
        } else {
          const back = before[i]!.minus(now[i]!);
          moves[i] = { ...m, capitalReturned: m.capitalReturned.plus(back), interestReceived: m.interestReceived.plus(rate.times(back).times(days).div(YEAR)) };
        }
      });
      held.set(c.index, now);
    }
    return {
      date,
      joining: lps.filter((_, i) => joining[i]).map((lp) => lp.name),
      lps: moves.filter((_, i) => members[i]),
    };
  });
  const totals = lps.map((lp) => closes.reduce((t, close) => {
    const m = close.lps.find((x) => x.name === lp.name);
    return m ? add(t, m) : t;
  }, nothing(lp.name)));
  return { rate, closes, lps: totals };
}
