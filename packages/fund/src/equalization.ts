// Later closes and their equalization (F25, F29), once for the fund, not by X.
//
// The waterfall treats every LP as in from the start (F25), so nothing here
// changes an account or a tier. What it works out is the cash that moves at
// each later close:
// - each investment and expense call was paid, as the fund made it, by the LPs
//   in at its date (FA21), by commitment;
// - at each later close, in date order, the LPs in by then rebalance every
//   investment and expense call before the close: each one's part becomes the
//   LPs' part of the call times its commitment over theirs. The joining LPs pay
//   in their parts; the LPs already in get back what they had paid over theirs;
// - each joining LP pays interest at the equalization rate, simple, Actual/365,
//   on its part of each of those calls, from the call's date to its close. That
//   interest goes to the LPs already in by what each gets back of the call,
//   which is each receiving the rate on what it gets back, for the same days
//   (FA30): worked that way here, with no division between;
// - from 0.4.0 fee calls aren't rebalanced (F29): a fee is each LP's own, so a
//   joining LP pays its own part of each fee call before its close, its back
//   fees, to the manager, with no interest. The LPs already in pay and get back
//   nothing for fees.
// The GP commitment pays its part of each call as it's made and is in no
// equalization (F25), so a call's LPs' part is the call less the GP
// commitment's (F3). Amounts are 40-digit decimals; nothing is rounded.

import { ZERO } from "./decimal.ts";
import type { D } from "./decimal.ts";
import { dayNumber } from "./dates.ts";
import { refuse } from "./errors.ts";
import { ownFeePart, runFlows } from "./fees.ts";
import type { RunFlow } from "./fees.ts";
import { isIn, joinsLater, needsEqualizationRate } from "./input.ts";
import type { Fund, Lp } from "./model.ts";

/** One LP's equalization: at one later close, or over all of them (F26, F31). */
export interface EqualizationAmounts {
  name: string;
  /** The capital it paid in at its own close, catching up on the investment and expense calls before it. */
  capitalPaid: D;
  /** The capital it got back at a later close, having paid over its part. */
  capitalReturned: D;
  /** The interest it paid on what it caught up. */
  interestPaid: D;
  /** The interest it received from LPs joining after it. */
  interestReceived: D;
  /** From 0.4.0 (F29): its own part of each fee call before its close, paid at its close to the manager. Zero for an LP already in. */
  backFees: D;
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
  /** The equalization interest rate; from 0.4.0, null when none is given, which needs only fee calls before the closes (FA45). */
  rate: D | null;
  closes: LaterClose[];
  /** Every LP, in the input's order. */
  lps: EqualizationAmounts[];
}

const YEAR = 365; // Actual/365 (F25)

function nothing(name: string): EqualizationAmounts {
  return { name, capitalPaid: ZERO, capitalReturned: ZERO, interestPaid: ZERO, interestReceived: ZERO, backFees: ZERO };
}

function add(a: EqualizationAmounts, b: EqualizationAmounts): EqualizationAmounts {
  return {
    name: a.name,
    capitalPaid: a.capitalPaid.plus(b.capitalPaid),
    capitalReturned: a.capitalReturned.plus(b.capitalReturned),
    interestPaid: a.interestPaid.plus(b.interestPaid),
    interestReceived: a.interestReceived.plus(b.interestReceived),
    backFees: a.backFees.plus(b.backFees),
  };
}

/** F25: each LP's part of an investment or expense call's LPs' part among `members`, by commitment, multiplied first. Zero for an LP not among them. */
function parts(call: RunFlow, lps: Lp[], members: boolean[]): D[] {
  const weights = lps.map((lp, i) => (members[i] ? lp.commitment : ZERO));
  const all = weights.reduce((s, w) => s.plus(w), ZERO);
  return weights.map((w) => (w.isZero() ? ZERO : call.paid.times(w).div(all)));
}

/**
 * The fund's equalization (F25, F26, F31), once for the fund: each later close in date order, with what each LP in by
 * then paid in or got back, the interest it paid or received, and a joiner's back fees, and each LP's over all of
 * them. Null when no LP joins at a later close. Every amount exact, at 40 digits.
 */
export function equalization(fund: Fund): Equalization | null {
  const lps = fund.lps ?? [];
  const flows = runFlows(fund);
  const calls = flows.filter((f) => f.type === "call");
  // F25, F30: the fund's first call, entered or the schedule's, decides who joins at a later close.
  const firstCall = Math.min(...calls.map((f) => f.day));
  const dates = [...new Set(lps.filter((lp) => joinsLater(lp, firstCall)).map((lp) => lp.close!))].sort((a, b) => dayNumber(a)! - dayNumber(b)!);
  if (dates.length === 0) return null;
  // F29: it must be entered when an investment or expense call comes before a later close. readFund refuses a fund
  // without it then; one built by hand gets the same refusal here. Without one, only fee calls come before the
  // closes, so no interest is worked out (FA45).
  const rate = fund.terms.equalizationRate ?? null;
  if (rate === null && needsEqualizationRate(fund, firstCall)) throw refuse("missing_field", "terms.equalization_rate");

  // The fund's investment and expense calls as it made them: each paid by the LPs in at its date (FA21). F28 refuses
  // an entered call no LP pays. The schedule's calls are all fee calls.
  const rebalanced = calls.filter((c) => c.kind !== "fee");
  const held = new Map<RunFlow, D[]>(rebalanced.map((c) => [c, parts(c, lps, lps.map((lp) => isIn(lp, c.day)))]));
  const closes: LaterClose[] = dates.map((date) => {
    const day = dayNumber(date)!;
    const members = lps.map((lp) => isIn(lp, day));
    const joining = lps.map((lp) => lp.close != null && dayNumber(lp.close) === day);
    const moves = lps.map((lp) => nothing(lp.name));
    for (const c of calls) {
      // FA21, FA44: a call on the close's date was paid by the LPs joining that day, as it was made.
      if (!(c.day < day)) continue;
      const days = day - c.day;
      if (c.kind === "fee") {
        // F29: each joiner's own part of the fee call, as if it had been in from the start, paid to the manager.
        lps.forEach((_, i) => {
          if (joining[i]) moves[i] = { ...moves[i]!, backFees: moves[i]!.backFees.plus(ownFeePart(fund, c, i)) };
        });
        continue;
      }
      const before = held.get(c)!;
      const now = parts(c, lps, members);
      lps.forEach((_, i) => {
        if (!members[i]) return;
        const m = moves[i]!;
        if (joining[i]) {
          moves[i] = { ...m, capitalPaid: m.capitalPaid.plus(now[i]!), interestPaid: m.interestPaid.plus(rate!.times(now[i]!).times(days).div(YEAR)) };
        } else {
          const back = before[i]!.minus(now[i]!);
          moves[i] = { ...m, capitalReturned: m.capitalReturned.plus(back), interestReceived: m.interestReceived.plus(rate!.times(back).times(days).div(YEAR)) };
        }
      });
      held.set(c, now);
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
