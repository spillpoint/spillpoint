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

/** "$204,114.37": to the cent, where whole dollars would hide a difference. */
export function dollarsAndCents(amount: Decimal): string {
  const rounded = amount.toDecimalPlaces(2, D.ROUND_HALF_UP);
  const sign = rounded.isNegative() ? "-" : "";
  const [whole, cents] = rounded.abs().toFixed(2).split(".");
  return `${sign}$${grouped(whole!)}.${cents}`;
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

/** A price typed as a fraction ("455000/1182033", as rounds produce) to six significant digits: "0.384930". Null otherwise. */
export function fractionValue(text: string): string | null {
  const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(text);
  if (!m || /^0+$/.test(m[2]!)) return null;
  return new D(m[1]!).div(m[2]!).toSignificantDigits(6, D.ROUND_HALF_UP).toFixed();
}

/**
 * What a typed amount comes to, where that helps: "300M" → "$300,000,000",
 * and a long run of digits like "300000000" → "$300M". Null otherwise.
 */
export function amountHint(text: string): string | null {
  const parsed = parseDollars(text);
  if (!parsed) return null;
  if (/[kmb]\s*$/i.test(text)) return dollars(parsed);
  return parsed.gte("1000000") ? shortDollars(parsed) : null;
}
