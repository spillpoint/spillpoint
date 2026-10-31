// The management fee schedule's periods (F30, F39): which calls it makes to
// D, and the rate on each day each one covers. From the schedule and D alone,
// so reading a fund can count its calls before the LPs are read (F32, FA40).
//
// One call for each calendar period from `start`'s to D's, in advance: dated
// the period's first day, and the first dated `start`, covering `start` to the
// end of its period. None starts after D (FA39). The rate in force on a day is
// the last step whose date (`start` for the first) is on or before it, on that
// step's basis (F39). A period's days on commitments add up to one sum, the
// rate in force on each, over n times the calendar period's days (n = 4, 2 or
// 1): a whole period at one rate is the rate over n, and a part period or a
// step within one is worked by its days. Its days on invested capital are kept
// as runs of days at one rate, to be charged on each day's net invested
// capital once the investments are read (F38, fees.ts).
//
// A period whose every day is at a rate of 0 isn't a call (FA40). One with a
// day at a rate above 0 counts by its date, on either basis (FA66), though one
// on invested capital may turn out to have nothing to call.

import { ZERO } from "./decimal.ts";
import type { D } from "./decimal.ts";
import { calendarPeriod, dayNumber } from "./dates.ts";
import type { FeeFrequency, ManagementFee } from "./model.ts";

/** F30: the periods a year: calendar quarters, half-years or years. */
export const PERIODS: Record<FeeFrequency, number> = { quarterly: 4, semiannual: 2, annual: 1 };

/** F39: a run of a period's days at one rate on invested capital, from `first` to `last`, both in. */
export interface InvestedRun {
  first: number;
  last: number;
  /** Above 0: a run at a rate of 0 charges nothing. */
  rate: D;
}

/** One of the schedule's periods by date (F30, FA66), before any LP's fee is worked out. */
export interface Period {
  /** Its date, the first day it covers: the period's first day, or `start` for the first. */
  date: number;
  /** The period's last day. */
  last: number;
  /** F30: the rate in force on each of its days on commitments, added up. Zero when none is. */
  onCommitments: D;
  /** F39: its days on invested capital at a rate above 0, in date order. Empty when none is. */
  onInvested: InvestedRun[];
  /** n times the calendar period's days: the fee's denominator, on either basis. */
  divisor: number;
}

/**
 * F30, F39: the days from `first` to `last` split by the step in force on each, the last step whose date (`start` for
 * the first) is on or before it; the steps are in date order (F32). A step without a basis, built by hand, is on
 * commitments (FA67).
 */
function daysByStep(fee: ManagementFee, first: number, last: number): Pick<Period, "onCommitments" | "onInvested"> {
  const from = fee.steps.map((s) => dayNumber(s.from ?? fee.start)!);
  let onCommitments = ZERO;
  const onInvested: InvestedRun[] = [];
  fee.steps.forEach((step, i) => {
    const until = i + 1 < from.length ? from[i + 1]! - 1 : last;
    const [a, b] = [Math.max(from[i]!, first), Math.min(until, last)];
    if (b < a || step.rate.isZero()) return;
    if (step.basis === "invested_capital") onInvested.push({ first: a, last: b, rate: step.rate });
    else onCommitments = onCommitments.plus(step.rate.times(b - a + 1));
  });
  return { onCommitments, onInvested };
}

/**
 * F30, FA39, FA40, FA66: the schedule's periods to D by date, in date order: each with a day at a rate above 0, on
 * either basis. Whether one on invested capital has anything to call waits for the investments (fees.ts).
 */
export function schedulePeriods(fee: ManagementFee, d: number): Period[] {
  const n = PERIODS[fee.frequency];
  const out: Period[] = [];
  let covers = dayNumber(fee.start)!;
  while (covers <= d) {
    const { first, last } = calendarPeriod(covers, n);
    const days = daysByStep(fee, covers, last);
    if (days.onCommitments.gt(ZERO) || days.onInvested.length > 0) out.push({ date: covers, last, ...days, divisor: n * (last - first + 1) });
    covers = last + 1;
  }
  return out;
}
