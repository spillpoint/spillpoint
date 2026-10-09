// Small readers for Open Cap Format JSON (M6). Each one refuses, by name, a
// value it can't read: OCF has no schema validator here (answer 12), so the
// importer checks every field it uses.

import type { Decimal } from "decimal.js";

import { D } from "./decimal.ts";
import { OcfRefusal } from "./errors.ts";

export type Json = Record<string, unknown>;

export const malformed = (term: string, subject: string, message: string): OcfRefusal =>
  new OcfRefusal("malformed", term, subject, message);
export const unsupported = (term: string, subject: string, message: string): OcfRefusal =>
  new OcfRefusal("unsupported", term, subject, message);

export function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A field every object of its type must give. */
export function required(o: Json, field: string, subject: string): unknown {
  if (o[field] == null) throw malformed("missing_field", subject, `${subject} has no ${field}, which OCF requires`);
  return o[field];
}

export function text(o: Json, field: string, subject: string): string {
  const v = required(o, field, subject);
  if (typeof v !== "string" || v === "") throw malformed("bad_value", subject, `${subject}'s ${field} should be text`);
  return v;
}

export function ids(o: Json, field: string, subject: string): string[] {
  const v = required(o, field, subject);
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) throw malformed("bad_value", subject, `${subject}'s ${field} should be a list of ids`);
  return v as string[];
}

/** OCF dates are YYYY-MM-DD. */
export function date(o: Json, field: string, subject: string): string {
  const v = text(o, field, subject);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  const ms = m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN;
  if (!m || Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== v) {
    throw malformed("bad_value", subject, `${subject}'s ${field}, "${v}", isn't a date written YYYY-MM-DD`);
  }
  return v;
}

const NUMERIC = /^[+-]?\d+(\.\d+)?$/;

/** OCF's Numeric: a number written as a decimal string, kept as written so its decimal places can be counted (O4). */
export function numericText(value: unknown, field: string, subject: string): string {
  // Some OCF integers (a convertible's seniority) are JSON numbers; a whole JSON number is exact.
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (typeof value !== "string" || !NUMERIC.test(value)) {
    throw malformed("bad_value", subject, `${subject}'s ${field}, ${JSON.stringify(value)}, isn't a number written as OCF writes one`);
  }
  return value;
}

export function numeric(o: Json, field: string, subject: string): Decimal {
  return new D(numericText(required(o, field, subject), field, subject));
}

export function optionalNumeric(o: Json, field: string, subject: string): Decimal | null {
  return o[field] == null ? null : numeric(o, field, subject);
}

/** A share count: OCF allows fractions, but a cap table holds whole shares, so a fraction is refused (O5). */
export function shares(o: Json, field: string, subject: string): Decimal {
  const n = numeric(o, field, subject);
  if (n.isNegative() || n.isZero()) throw malformed("bad_value", subject, `${subject}'s ${field} should be more than zero`);
  if (!n.isInteger()) throw unsupported("fractional_shares", subject, `${subject} has ${shown(n)} shares; spillpoint holds whole shares only`);
  return n;
}

/** OCF's Monetary, `{amount, currency}`. Every currency has already been checked as US dollars (O2). */
export function money(o: Json, field: string, subject: string): { amount: Decimal; written: string } {
  const m = required(o, field, subject);
  if (!isObject(m)) throw malformed("bad_value", subject, `${subject}'s ${field} should be an amount and a currency`);
  const written = numericText(m.amount, `${field}.amount`, subject);
  return { amount: new D(written), written };
}

/** Decimal places as written: "1.50" has 2, "2" has none. */
export function decimalPlaces(written: string): number {
  const dot = written.indexOf(".");
  return dot < 0 ? 0 : written.length - dot - 1;
}

/** A number for a message: 3,400,000. */
export function shown(n: Decimal): string {
  const [whole, fraction] = n.toFixed().split(".");
  return whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (fraction ? `.${fraction}` : "");
}

/** A number as the case-file format writes it: no exponent, no trailing zeros ("1.20" is "1.2"). */
export function asWritten(n: Decimal): string {
  return n.toFixed();
}
