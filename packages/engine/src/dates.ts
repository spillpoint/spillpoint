// Dates for Actual/365 interest and dividends (X2, X3, X5): the actual number
// of days between two dates, leap days included, and the anniversaries a
// compounding dividend steps on.

import { InputError } from "./errors.ts";

/** A date as YYYY-MM-DD, as a whole number of days. */
export function dayNumber(value: unknown, path: string): number {
  if (typeof value !== "string") throw new InputError(path, "expected a date as YYYY-MM-DD");
  const date = value;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const ms = m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN;
  if (!m || Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== date) throw new InputError(path, "expected a date as YYYY-MM-DD");
  return ms / 86_400_000;
}

/** The date `years` after start. A 29 February start has its anniversaries on 28 February in other years (X5). */
export function anniversary(start: string, years: number): string {
  const [y, m, d] = start.split("-").map(Number) as [number, number, number];
  const year = y + years;
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const day = m === 2 && d === 29 && !leap ? 28 : d;
  return `${String(year).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Full years from start to end on start's anniversaries, and the days after the last one (X5). */
export function compoundingPeriods(start: string, end: string): { years: number; stubDays: number } {
  const last = dayNumber(end, "exit_date");
  let years = 0;
  while (dayNumber(anniversary(start, years + 1), "accrual_start") <= last) years++;
  return { years, stubDays: last - dayNumber(anniversary(start, years), "accrual_start") };
}
