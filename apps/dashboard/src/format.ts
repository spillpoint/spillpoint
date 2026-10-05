// How the dashboard writes and reads money. Founders read these, so short
// forms in headlines ("$9.75M"), whole dollars in tables ("$9,750,990").
// Amounts are engine Decimals throughout; nothing here uses floating point.

import { D } from "spillpoint";

/** The engine's 40-digit Decimal. */
type Decimal = D;

function grouped(whole: string): string {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** "$9,750,990": to the dollar, for tables. */
export function dollars(amount: Decimal): string {
  const rounded = amount.toDecimalPlaces(0, D.ROUND_HALF_UP);
  const sign = rounded.isNegative() ? "-" : "";
  return `${sign}$${grouped(rounded.abs().toFixed(0))}`;
}

/** "$9.75M", "$39.4M", "$100M", "$450K", "$812": three significant digits, for headlines. */
export function shortDollars(amount: Decimal): string {
  const a = amount.abs();
  const sign = amount.isNegative() ? "-" : "";
  const units: [Decimal, string][] = [
    [new D("1e9"), "B"],
    [new D("1e6"), "M"],
    [new D("1e3"), "K"],
  ];
  for (const [size, suffix] of units) {
    if (a.gte(size)) {
      const scaled = a.div(size).toSignificantDigits(3, D.ROUND_HALF_UP);
      return `${sign}$${scaled.toString()}${suffix}`;
    }
  }
  return `${sign}$${a.toDecimalPlaces(0, D.ROUND_HALF_UP).toFixed(0)}`;
}

/** "9.8%": a fraction as a percentage to one place. */
export function percent(fraction: Decimal): string {
  return `${fraction.times(100).toDecimalPlaces(1, D.ROUND_HALF_UP).toFixed(1)}%`;
}

/**
 * Reads a typed exit value: "100000000", "$100M", "100m", "1.5B", "250,000",
 * "250k", "$39.4M". Returns null if it isn't a non-negative amount.
 */
export function parseDollars(text: string): Decimal | null {
  const m = /^\s*\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?|\.[0-9]+)\s*([kKmMbB]?)\s*$/.exec(text);
  if (!m) return null;
  const number = new D(m[1]!.replace(/,/g, ""));
  const scale = { "": "1", k: "1e3", m: "1e6", b: "1e9" }[m[2]!.toLowerCase() as "" | "k" | "m" | "b"];
  return number.times(scale);
}
