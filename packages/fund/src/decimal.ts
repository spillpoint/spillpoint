// Numbers for the fund waterfall (F17).
//
// Every amount, rate and multiple is a decimal.js value at 40 significant
// digits, as in the spillpoint engine. Pref accrues Actual/365, so most amounts
// with a pref don't terminate; 40 digits agree with the reference's exact
// fractions to far less than a cent. No JavaScript float ever carries money,
// and nothing is rounded until an amount is shown (FC8).

import { Decimal } from "decimal.js";

/** The fund engine's Decimal: 40 significant digits, half-up rounding. */
export const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP, toExpNeg: -60, toExpPos: 60 });
export type D = Decimal;

export const ZERO = new D(0);
export const ONE = new D(1);

const EXACT = /^-?(?:[0-9]+|[0-9]+\.[0-9]+|[0-9]+\/[0-9]+)$/;

/**
 * An exact string (FC1, as spillpoint's C1): an integer, a terminating decimal, or "a/b". Anything else, a JSON
 * number included, isn't one, and gives null: F18 refuses it as `bad_number`, since a float may already have lost the
 * exact value.
 */
export function exactOrNull(value: unknown): Decimal | null {
  if (typeof value !== "string" || !EXACT.test(value)) return null;
  if (!value.includes("/")) return new D(value);
  const [num, den] = value.split("/") as [string, string];
  if (/^0+$/.test(den)) return null;
  return new D(num).div(den);
}

/**
 * An exact string (FC1) as a fraction of whole numbers, numerator and denominator, with nothing rounded: for comparing
 * amounts exactly as the input writes them (FA41). Null for anything exactOrNull refuses.
 */
export function exactRatio(value: unknown): [bigint, bigint] | null {
  if (exactOrNull(value) === null) return null;
  const s = value as string;
  if (s.includes("/")) {
    const [num, den] = s.split("/") as [string, string];
    return [BigInt(num), BigInt(den)];
  }
  const [whole, part = ""] = s.split(".") as [string, string?];
  return [BigInt(whole + part), 10n ** BigInt(part.length)];
}

/**
 * Rounds half away from zero to the cent, as the fund cases give every amount (FC8). For showing only.
 *
 * FA14: first to 20 places, so an amount that is exactly half a cent in exact math, but lands a hair below it at 40
 * digits (699,291.385 worked out as 699,291.38499…9), rounds up as the exact one does. An amount whose exact
 * denominator is under about 10^18 can't sit within 10^-20 of a half cent without being on it, so only true ties move.
 */
export function toCents(amount: Decimal): string {
  return amount.toDecimalPlaces(20, D.ROUND_HALF_UP).toDecimalPlaces(2, D.ROUND_HALF_UP).toFixed(2);
}
