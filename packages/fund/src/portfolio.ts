// The fund's investments (F33, F36): what each has cost, what's been realized
// of it, and its proceeds; and, deal by deal, the fund's cost made and realized
// that what's due before carry is worked from at each distribution and on X
// (F35).
//
// An investment's cost made is its checks to date. A distribution from it
// realizes its `share` of what's left of it, the cost made less the cost
// realized so far; a write-off realizes all that's left, with no proceeds. A
// follow-on check after a partial exit adds to what's left, and a distribution
// from an investment with nothing left, say a release from escrow, realizes
// nothing more. On one date: calls, then checks, then write-offs, then
// distributions in the order listed (F4, F33). X comes after every cash flow on
// D (FA50, FA58).
//
// Amounts are whole-fund, the GP commitment's part included, as a check is
// (F2). decimal.js at 40 digits; nothing is rounded here.

import { D, ONE, ZERO } from "./decimal.ts";
import { dayNumber } from "./dates.ts";
import { wasRead } from "./input.ts";
import type { Fund } from "./model.ts";

/** One investment in the investments table (F36), at D before X, on either basis. Every amount exact, whole-fund. */
export interface PortfolioRow {
  /** As the input writes it (FA52). */
  name: string;
  /** Its checks to D. */
  costMade: D;
  /** Exited or written off, by the distributions and write-offs before X. */
  costRealized: D;
  /** The part of the cost realized that was written off. */
  costWrittenOff: D;
  /** The amounts of the distributions naming it, whatever they realize: a release from escrow among them. */
  proceeds: D;
  /** Proceeds over the cost realized; null while nothing of it is realized (FA59). */
  realizedMultiple: D | null;
}

/** The fund's cost made and cost realized at one moment, whole-fund (FA50). */
export interface Realized {
  made: D;
  realized: D;
}

/** One investment as the walk through the cash flows leaves it. */
interface Holding {
  name: string;
  made: D;
  realized: D;
  writtenOff: D;
  proceeds: D;
}

interface Book {
  /** Each investment at D, before X, in the input's order. */
  holdings: Holding[];
  /** At each distribution, by its place in the input's `cash_flows`: the fund's cost made and realized, its own realization included. */
  atDistribution: Map<number, Realized>;
}

const sum = (xs: D[]) => xs.reduce((t, x) => t.plus(x), ZERO);

const booksKept = new WeakMap<Fund, Book>();

/**
 * The walk through the checks, write-offs and distributions to D, in F33's order. Kept for a fund readFund returned,
 * which is frozen; worked from scratch for one built by hand, which can change after use.
 */
function bookOf(fund: Fund): Book {
  const known = booksKept.get(fund);
  if (known) return known;
  const d = dayNumber(fund.distributionDate)!;
  const investments = fund.investments ?? [];
  const holdings: Holding[] = investments.map((inv) => ({ name: inv.name, made: ZERO, realized: ZERO, writtenOff: ZERO, proceeds: ZERO }));
  // F33, F37: checks in date order; on one date in the investments' order, then the checks' (the sort is stable).
  const checks = investments
    .flatMap((inv, i) => inv.checks.map((c) => ({ holding: holdings[i]!, day: dayNumber(c.date)!, amount: c.amount })))
    .filter((c) => c.day <= d)
    .sort((a, b) => a.day - b.day);
  let next = 0;
  // F4, F33: a date's checks come before its write-offs and distributions, so they're made by then.
  const makeTo = (day: number) => {
    for (; next < checks.length && checks[next]!.day <= day; next++) checks[next]!.holding.made = checks[next]!.holding.made.plus(checks[next]!.amount);
  };
  const atDistribution = new Map<number, Realized>();
  // cashFlows is in F4's order, widened: on one date, write-offs before distributions, each in the order listed.
  for (const flow of fund.cashFlows) {
    if (flow.type === "call") continue;
    makeTo(dayNumber(flow.date)!);
    const named = flow.investment ?? null;
    const h = named === null ? undefined : holdings.find((x) => x.name === named);
    if (h) {
      const left = h.made.minus(h.realized);
      if (flow.type === "write_off") {
        // F33: a write-off realizes all that's left of the investment, with no proceeds.
        h.realized = h.made;
        h.writtenOff = h.writtenOff.plus(left);
      } else {
        // F33: a distribution realizes its share of what's left, 1 by default; its amount is the investment's proceeds.
        h.realized = h.realized.plus((flow.share ?? ONE).times(left));
        h.proceeds = h.proceeds.plus(flow.amount!);
      }
    }
    if (flow.type === "distribution") atDistribution.set(flow.index, { made: sum(holdings.map((x) => x.made)), realized: sum(holdings.map((x) => x.realized)) });
  }
  makeTo(d);
  const book = { holdings, atDistribution };
  if (wasRead(fund)) booksKept.set(fund, book);
  return book;
}

/** FA50: the fund's cost made and realized at the distribution at `index` in the input's `cash_flows`, its own realization included. */
export function realizedAt(fund: Fund, index: number): Realized {
  return bookOf(fund).atDistribution.get(index) ?? { made: ZERO, realized: ZERO };
}

/**
 * F33, FA58: the fund's cost made and realized once X is distributed, after every cash flow on D. X realizes
 * `distribution_from`'s share of what's left of its investment. When X is final, and at the NAV point, the fund ends:
 * everything left of every investment is realized, so the cost realized is the cost made.
 */
export function realizedByX(fund: Fund, final: boolean): Realized {
  const { holdings } = bookOf(fund);
  const made = sum(holdings.map((h) => h.made));
  if (final) return { made, realized: made };
  const from = fund.distributionFrom ?? null;
  const h = from === null ? undefined : holdings.find((x) => x.name === from.investment);
  const before = sum(holdings.map((x) => x.realized));
  return { made, realized: h ? before.plus(from!.share.times(h.made.minus(h.realized))) : before };
}

/**
 * The investments table (F36, FA59): each investment at D, before X, in the input's order, on either basis; empty
 * without investments. Fresh each time, as a split is: what a caller does to it changes nothing the waterfall keeps.
 */
export function portfolio(fund: Fund): PortfolioRow[] {
  return bookOf(fund).holdings.map((h) => ({
    name: h.name,
    costMade: new D(h.made),
    costRealized: new D(h.realized),
    costWrittenOff: new D(h.writtenOff),
    proceeds: new D(h.proceeds),
    realizedMultiple: h.realized.isZero() ? null : h.proceeds.div(h.realized),
  }));
}
