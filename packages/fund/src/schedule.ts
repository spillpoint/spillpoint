// The management fee schedule's periods (F30): which calls it makes to D, and
// each one's fee factor. From the schedule and D alone, so reading a fund can
// count its calls before the LPs are read (F32, FA40).
//
// One call for each calendar period from `start`'s to D's, in advance: dated
// the period's first day, and the first dated `start`, covering `start` to the
// end of its period. None starts after D (FA39). A period's fee factor is the
// rate in force on each day it covers, added up, over n times the calendar
// period's days (n = 4, 2 or 1): a whole period at one rate is the rate over n,
// and a part period or a step within one is worked by its days. A period whose
// every day is at a rate of 0 isn't a call (FA40).

import { ZERO } from "./decimal.ts";
import type { D } from "./decimal.ts";
import { calendarPeriod, dayNumber } from "./dates.ts";
import type { FeeFrequency, ManagementFee } from "./model.ts";

/** F30: the periods a year: calendar quarters, half-years or years. */
export const PERIODS: Record<FeeFrequency, number> = { quarterly: 4, semiannual: 2, annual: 1 };

/** One of the schedule's calls (F30), before any LP's fee is worked out. */
export interface Period {
  /** Its date, the first day it covers: the period's first day, or `start` for the first. */
  date: number;
  /** The period's last day. */
  last: number;
  /** The rate in force on each day it covers, added up: the fee factor's numerator. Above 0 (FA40). */
  rateDays: D;
  /** n times the calendar period's days: the fee factor's denominator. */
  divisor: number;
}

/**
 * F30: the rate in force on each of the days from `first` to `last`, added up. The rate in force on a day is the last
 * step whose date (`start` for the first) is on or before it; the steps are in date order (F32).
 */
function rateDays(fee: ManagementFee, first: number, last: number): D {
  const from = fee.steps.map((s) => dayNumber(s.from ?? fee.start)!);
  return fee.steps.reduce((sum, step, i) => {
    const until = i + 1 < from.length ? from[i + 1]! - 1 : last;
    const days = Math.min(until, last) - Math.max(from[i]!, first) + 1;
    return days > 0 ? sum.plus(step.rate.times(days)) : sum;
  }, ZERO);
}

/** F30, FA39, FA40: the schedule's calls to D, in date order, each with its fee factor's two parts. */
export function schedulePeriods(fee: ManagementFee, d: number): Period[] {
  const n = PERIODS[fee.frequency];
  const out: Period[] = [];
  let covers = dayNumber(fee.start)!;
  while (covers <= d) {
    const { first, last } = calendarPeriod(covers, n);
    const added = rateDays(fee, covers, last);
    if (added.gt(ZERO)) out.push({ date: covers, last, rateDays: added, divisor: n * (last - first + 1) });
    covers = last + 1;
  }
  return out;
}
