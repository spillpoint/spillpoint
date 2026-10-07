// Cumulative dividends accrued and unpaid at the exit date (SPEC, Cumulative
// dividends). They add to a series' preference at 1x: the preference multiple
// applies to the original issue price only (X4, following the NVCA form:
// "Original Issue Price, plus any Accruing Dividends accrued but unpaid").

import type { Decimal } from "decimal.js";

import { dayNumber, compoundingPeriods } from "./dates.ts";
import { ONE, ZERO } from "./decimal.ts";
import type { PreferredSeries } from "./model.ts";

/**
 * What `shares` of a series have accrued by the exit date.
 *
 * - Simple (X2): the original issue price × the rate × the actual days from
 *   the accrual start ÷ 365.
 * - Compounding (X5): annually, on the accrual start's anniversaries. Each
 *   full year multiplies the original issue price plus what has accrued by
 *   (1 + rate), whether it has 365 or 366 days; the part-year after the last
 *   anniversary is simple, Actual/365, on the compounded amount.
 *
 * Shares from a warrant exercised at exit accrue nothing: they weren't
 * outstanding while the dividends accrued (X5), so callers pass the series'
 * own shares. Divided once, at the end, to keep the 40 digits (E14).
 */
export function accruedDividends(s: PreferredSeries, shares: Decimal, exitDate: string): Decimal {
  const d = s.cumulativeDividend;
  if (!d) return ZERO;
  const base = shares.times(s.originalIssuePrice);
  if (d.method === "compounding") {
    const { years, stubDays } = compoundingPeriods(d.accrualStart, exitDate);
    return base.times(ONE.plus(d.rate).pow(years)).times(d.rate.times(stubDays).plus(365)).div(365).minus(base);
  }
  const days = dayNumber(exitDate, "exit_date") - dayNumber(d.accrualStart, "accrual_start");
  return base.times(d.rate).times(days).div(365);
}
