// Dates for the fund waterfall: whole days between ISO dates, leap days
// included (F6's Actual/365, F17). Worked in plain integer calendar arithmetic,
// not JavaScript's Date, so a year before 100 means what it says.

function leap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * A date written YYYY-MM-DD that exists on the calendar, years 1 to 9999, as a day count (days since 1970-01-01); or
 * null, which F18 refuses as `bad_date`. 2020-02-30 has the right shape but no such day.
 */
export function dayNumber(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1 || mo < 1 || mo > 12 || d < 1) return null;
  if (d > (mo === 2 && leap(y) ? 29 : MONTH_DAYS[mo - 1]!)) return null;
  // Days from the civil date, counting years from March so the leap day falls last.
  const yy = mo <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * ((mo + 9) % 12) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146_097 + doe - 719_468;
}

/** The ISO date of a day count, the other way from dayNumber. Days since 1970-01-01, years 1 to 9999. */
export function isoDate(day: number): string {
  // The civil date from days, counting years from March so the leap day falls last.
  const z = day + 719_468;
  const era = Math.floor(z / 146_097);
  const doe = z - era * 146_097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36_524) - Math.floor(doe / 146_096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  const y = yoe + era * 400 + (m <= 2 ? 1 : 0);
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * F30: the calendar period a day is in, as its first and last day counts: a quarter (n = 4), a half-year, January to
 * June or July to December (n = 2), or a year (n = 1).
 */
export function calendarPeriod(day: number, n: number): { first: number; last: number } {
  const [y, m] = isoDate(day).split("-").map(Number) as [number, number];
  const months = 12 / n;
  const firstMonth = Math.floor((m - 1) / months) * months + 1;
  const nextMonth = firstMonth + months;
  const first = dayNumber(`${String(y).padStart(4, "0")}-${String(firstMonth).padStart(2, "0")}-01`)!;
  const next = nextMonth > 12 ? dayNumber(`${String(y + 1).padStart(4, "0")}-01-01`) : dayNumber(`${String(y).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-01`);
  // The year after 9999 has no date: its period ends on 9999-12-31.
  return { first, last: next === null ? dayNumber("9999-12-31")! : next - 1 };
}
