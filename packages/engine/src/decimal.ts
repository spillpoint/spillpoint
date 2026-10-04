// Exact-enough arithmetic for money and shares (ASSUMPTIONS E14).
//
// Every amount, price and share count is a decimal.js value at 40 significant
// digits. Inputs arrive as the case-file strings of C1: an integer, a
// terminating decimal, or "a/b" for a value whose decimal repeats (a
// conversion price after anti-dilution, for example). "a/b" is divided out at
// 40 digits, which agrees with the exact fraction to far less than a cent.
// No JavaScript float ever carries a money or share amount.

import Decimal from "decimal.js";

import { InputError } from "./errors.ts";

/** The engine's Decimal: 40 significant digits, half-up rounding. */
export const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP, toExpNeg: -60, toExpPos: 60 });
export type D = Decimal;

export const ZERO = new D(0);
export const ONE = new D(1);

/**
 * Amounts closer than this count as equal (E14). At a breakpoint two choices
 * pay exactly the same in exact math; at 40 digits they can differ around the
 * 30th decimal place. Treating anything under a trillionth of a dollar as a
 * tie lets the tie-break (E5) apply there.
 */
export const TIE = new D("1e-12");

/** a and b are the same amount, within the tie threshold. */
export function sameAmount(a: Decimal, b: Decimal): boolean {
  return a.minus(b).abs().lt(TIE);
}

/** a is more than b by at least the tie threshold: strictly better, not a tie. */
export function moreThan(a: Decimal, b: Decimal): boolean {
  return a.minus(b).gte(TIE);
}

const INTEGER = /^-?\d+$/;
const TERMINATING = /^-?\d+\.\d+$/;
const FRACTION = /^-?\d+\/\d+$/;

/**
 * Reads an exact number from a case file (C1). JSON integers are accepted for
 * share counts; a non-integer JSON number is refused, because a float may
 * already have lost the exact value.
 */
export function parseExact(value: unknown, where: string): Decimal {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new InputError(where, `${value} is not a whole number; write exact non-integers as strings (C1)`);
    }
    return new D(value);
  }
  if (typeof value !== "string") {
    throw new InputError(where, `expected an exact number as a string, got ${JSON.stringify(value)}`);
  }
  if (INTEGER.test(value) || TERMINATING.test(value)) return new D(value);
  if (FRACTION.test(value)) {
    const [num, den] = value.split("/") as [string, string];
    if (/^0+$/.test(den)) throw new InputError(where, `"${value}" divides by zero`);
    return new D(num).div(den);
  }
  throw new InputError(where, `"${value}" is not an exact number (an integer, a decimal, or "a/b")`);
}

/** Rounds half-up (away from zero) to the cent, as amounts are reported (E10). */
export function toCents(amount: Decimal): string {
  return amount.toDecimalPlaces(2, D.ROUND_HALF_UP).toFixed(2);
}
