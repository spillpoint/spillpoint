// How the dashboard writes and reads money. Founders read these, so:
// - short forms in headlines, chart axes and labels, and the slider's ends ("$9.75M")
// - to the cent wherever an amount is exact: every payout in the who-gets-what
//   table and its total, each breakpoint's exit value, the exit value once it has
//   cents, and a jump in your payout ("$9,750,989.67"), each rounded half-up, as
//   the engine's toCents and the locked cases round, so the page agrees with them
// - whole dollars elsewhere, such as the approximate per-$1M rates ("$250,000")
// Amounts are engine Decimals throughout; nothing here uses floating point.

import { D } from "spillpoint";

/** The engine's 40-digit Decimal. */
type Decimal = D;

function grouped(whole: string): string {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** "$9,750,990": to the dollar, for an approximate amount. */
export function dollars(amount: Decimal): string {
  const rounded = amount.toDecimalPlaces(0, D.ROUND_HALF_UP);
  const sign = rounded.isNegative() ? "-" : "";
  return `${sign}$${grouped(rounded.abs().toFixed(0))}`;
}

/** "$204,114.37": to the cent, half-up, for an exact amount: a payout, a breakpoint, a jump. */
export function dollarsAndCents(amount: Decimal): string {
  const rounded = amount.toDecimalPlaces(2, D.ROUND_HALF_UP);
  const sign = rounded.isNegative() ? "-" : "";
  const [whole, cents] = rounded.abs().toFixed(2).split(".");
  return `${sign}$${grouped(whole!)}.${cents}`;
}

/** An exit value as typed or chosen: to the cent when it has cents, as a breakpoint usually does; else whole dollars. */
export function exitValueText(amount: Decimal): string {
  return amount.toDecimalPlaces(2, D.ROUND_HALF_UP).isInteger() ? dollars(amount) : dollarsAndCents(amount);
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

/**
 * A price as the editor shows it: as written when it has six decimal places
 * or fewer ("1.5", "0.05"), otherwise rounded to six ("3900000/1879091" →
 * "2.075472"). Text that isn't a price is left as it is.
 */
export function priceText(text: string): string {
  const fraction = /^(\d+)\/(\d+)$/.exec(text);
  if (fraction && !/^0+$/.test(fraction[2]!)) {
    const value = new D(fraction[1]!).div(fraction[2]!);
    return value.decimalPlaces() <= 6 ? value.toFixed() : value.toFixed(6, D.ROUND_HALF_UP);
  }
  if (/^\d+\.\d{7,}$/.test(text)) return new D(text).toFixed(6, D.ROUND_HALF_UP);
  return text;
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

// An assumption code, or a range of them: "E7", "X10–X12".
const CODE = String.raw`[RECX]\d+(?:[–-][RECX]?\d+)?`;
const CODES = String.raw`${CODE}(?:,\s*${CODE})*`;

/**
 * An engine message as the page shows it: without the assumption codes
 * ("(E7)", "(E17: …)", "(…; E12)") that point developers to docs/ASSUMPTIONS.md,
 * as with the breakpoint reasons. The engine's errors keep them.
 */
export function withoutCodes(message: string): string {
  return message
    .replace(new RegExp(String.raw`\s*\(${CODES}\)`, "g"), "")
    .replace(new RegExp(String.raw`\(${CODES}:\s*`, "g"), "(")
    .replace(new RegExp(String.raw`[;,]\s*${CODES}\)`, "g"), ")");
}
