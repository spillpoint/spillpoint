// How the fund page writes and reads money, dates, rates and multiples. GPs and LPs read these, so:
// - short forms in the headline ("$6.81M"), as the main page's
// - to the cent in the split, half away from zero as the fund cases are (FC8, FA14): `toCents`. Not as paid (the main
//   page's P1): "the LPs" is every LP together, not one payment (plan answer 2)
// Amounts are spillpoint-fund Decimals throughout; nothing here uses floating point, and nothing here is fund
// arithmetic: every amount comes from the engine as it is.

import { D, toCents } from "spillpoint-fund";

type Decimal = D;

function grouped(whole: string): string {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** "$32,793,750.00": to the cent, as the cases give it. */
export function cents(amount: Decimal): string {
  const [whole, part] = toCents(amount).split(".") as [string, string];
  return whole.startsWith("-") ? `-$${grouped(whole.slice(1))}.${part}` : `$${grouped(whole)}.${part}`;
}

/** "$198,000": to the dollar, half up, for a rate per extra $1M, which is approximate. */
export function wholeDollars(amount: Decimal): string {
  const rounded = amount.toDecimalPlaces(20, D.ROUND_HALF_UP).toDecimalPlaces(0, D.ROUND_HALF_UP);
  const sign = rounded.isNegative() ? "-" : "";
  return `${sign}$${grouped(rounded.abs().toFixed(0))}`;
}

/** X as the box shows it: whole dollars when it has no cents, "$40,000,000"; to the cent when it has, "$63,833,333.33". */
export function xText(amount: Decimal): string {
  const c = cents(amount);
  return c.endsWith(".00") ? c.slice(0, -3) : c;
}

/** "$6.81M", "$32.8M", "$400K", "$812": three significant digits, for the headline. */
export function short(amount: Decimal): string {
  const a = amount.abs();
  const sign = amount.isNegative() ? "-" : "";
  for (const [size, suffix] of [["1e9", "B"], ["1e6", "M"], ["1e3", "K"]] as const) {
    if (a.gte(size)) return `${sign}$${a.div(size).toSignificantDigits(3, D.ROUND_HALF_UP).toString()}${suffix}`;
  }
  return `${sign}$${a.toDecimalPlaces(0, D.ROUND_HALF_UP).toFixed(0)}`;
}

/**
 * Reads a typed amount: "40000000", "40,000,000", "$40M", "40m", "34.5M", "250k". Null if it isn't a non-negative
 * amount in dollars. Exact: "34.5M" is 34,500,000, never a float.
 */
export function parseDollars(text: string): Decimal | null {
  const m = /^\s*\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?|\.[0-9]+)\s*([kKmMbB]?)\s*$/.exec(text);
  if (!m) return null;
  const scale = { "": "1", k: "1e3", m: "1e6", b: "1e9" }[m[2]!.toLowerCase() as "" | "k" | "m" | "b"];
  return new D(m[1]!.replace(/,/g, "")).times(scale);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "30 Sep 2026", from "2026-09-30", with no time zone to shift it. */
export function dateText(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** A rate as a percent, every place kept: "20%", "7.5%". */
export function percentText(rate: Decimal): string {
  return `${rate.times(100).toString()}%`;
}

/** A step's LP multiple as the engine's reasons write it, one place at least: "3.0x", "2.25x". */
export function stepMultiple(m: Decimal): string {
  const s = m.toString();
  return s.includes(".") ? `${s}x` : `${s}.0x`;
}

/**
 * The LPs' net multiple to date, to two places, rounded down: "3.37x" for 3.375. Rounded half up it could show a step
 * the LPs haven't reached: a fraction of a cent below case 8's 5.0x step it would read 5.00x while the 30% step
 * hasn't started (f01f review, answer 4). First to 20 places, as FA14 does, so a multiple that is exactly 5 in exact
 * math but a hair below it at 40 digits still reads 5.00x.
 */
export function lpMultipleText(m: Decimal): string {
  return `${m.toDecimalPlaces(20, D.ROUND_HALF_UP).toDecimalPlaces(2, D.ROUND_DOWN).toFixed(2)}x`;
}
