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
