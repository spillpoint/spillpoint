// The LPs' card's figures (plan, "The LPs' card, on Payouts", f02c): each LP's amounts as it would be paid, rounded
// down to the cent; what rounding down leaves; and the LPs' own amounts, as the rest of the page shows them. Nothing
// here is fund arithmetic: each LP's amount is the engine's (F20), and this only rounds it and adds the rounded ones up.
// Also the card as a CSV file.

import { D, toCents } from "spillpoint-fund";
import type { Split } from "spillpoint-fund";

import { owesSomething } from "./Clawback.tsx";
import { slug } from "./file.ts";

/** A column of amounts: its heading, each LP's amount from the split, and the LPs' amount it divides. */
interface Column {
  heading: string;
  each: (lp: Split["byLp"][number]) => D;
  lps: D;
}

export interface LpsTable {
  headings: string[];
  rows: { name: string; share: string; amounts: D[] }[];
  /** In each column, the LPs' amount to the cent less the LPs' rounded-down amounts: never negative, at most a cent an LP. */
  leftover: D[];
  /** In each column, the LPs' amount with `toCents`: the page's own figure for the LPs. */
  total: D[];
}

/**
 * An LP's amount as it would be paid: rounded down to the cent, after `toCents`'s first step to 20 places, so an amount
 * that is whole cents in exact math, and a hair under at 40 digits, isn't a cent short (FA14's reason).
 */
export function downToCent(amount: D): D {
  return amount.toDecimalPlaces(20, D.ROUND_HALF_UP).toDecimalPlaces(2, D.ROUND_DOWN);
}

/** A share for showing, to two places, half up after 20 places: 1/3 is "33.33%", 11/21 "52.38%". */
export function shareText(share: D): string {
  return `${share.times(100).toDecimalPlaces(20, D.ROUND_HALF_UP).toDecimalPlaces(2, D.ROUND_HALF_UP).toFixed(2)}%`;
}

/**
 * The card for a split: paid in, this distribution and to date, and, when the split is final and something is owed,
 * each LP's share of the clawback (F20). Each LP's row is rounded down; the leftover and total rows follow from them.
 */
export function lpsTable(split: Split): LpsTable {
  const columns: Column[] = [
    { heading: "Paid in", each: (lp) => lp.paidIn, lps: split.lpsPaidIn },
    { heading: "This distribution", each: (lp) => lp.distribution, lps: split.distribution.lps.total },
    { heading: "To date", each: (lp) => lp.toDate, lps: split.toDate.lps.total },
  ];
  const owed = split.clawback?.owed;
  if (owed && owesSomething(owed)) columns.push({ heading: "Share of the clawback", each: (lp) => lp.clawback!, lps: owed });
  const rows = split.byLp.map((lp) => ({ name: lp.name, share: shareText(lp.share), amounts: columns.map((c) => downToCent(c.each(lp))) }));
  const total = columns.map((c) => new D(toCents(c.lps)));
  const leftover = columns.map((_, i) => rows.reduce((left, r) => left.minus(r.amounts[i]!), total[i]!));
  return { headings: ["LP", "Share", ...columns.map((c) => c.heading)], rows, leftover, total };
}

export const LEFTOVER = "Left over from rounding down";
export const TOTAL = "Total";

/**
 * A CSV field as RFC 4180 has it: in quotes when it holds a comma, a quote or a line break, its quotes doubled. A name
 * starting with =, +, - or @ gets a leading apostrophe first, so a spreadsheet shows it as text, not a formula.
 */
export function csvField(text: string): string {
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * The card as a CSV file: its columns, every LP with its rounded amounts, the leftover row and the total row. Numbers
 * without "$" or commas, shares as "33.33%". UTF-8 with a byte-order mark, so Excel reads names like "Ñandú" right;
 * lines end in CRLF, as RFC 4180 has them.
 */
export function lpsCsv(table: LpsTable): string {
  const line = (cells: string[]) => cells.map(csvField).join(",");
  const amounts = (xs: D[]) => xs.map((x) => x.toFixed(2));
  const lines = [
    line(table.headings),
    ...table.rows.map((r) => line([r.name, r.share, ...amounts(r.amounts)])),
    line([LEFTOVER, "", ...amounts(table.leftover)]),
    line([TOTAL, "100%", ...amounts(table.total)]),
  ];
  return `﻿${lines.join("\r\n")}\r\n`;
}

/**
 * The CSV's name, as Save names its file, with X and D: "a-late-call-and-a-clawback-lps-at-15000000-on-2025-01-01.csv".
 * X in whole dollars when it has no cents, and to the cent, with its point, when it has: "63833333.33".
 */
export function lpsCsvName(fundName: string, x: D, d: string): string {
  const atCent = toCents(x);
  const xPart = atCent.endsWith(".00") ? atCent.slice(0, -3) : atCent;
  return `${slug(fundName)}-lps-at-${xPart}-on-${d}.csv`;
}
