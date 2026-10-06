// What two cap tables pay, compared to the cent: the breakpoints the engine
// finds, to the cent as SPEC reports them, and every holder's and class's
// payout at each one. A cap table built from rounds holds its prices to 40
// digits where the locked case has exact fractions, so its breakpoints agree
// with the case's to far less than a cent, not to the 40th digit.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { findBreakpoints, prepare, readExit, solve, toCents } from "spillpoint";

import { buildExit } from "../src/draft.ts";
import { readFile } from "../src/file.ts";

export interface PayoutsAtBreakpoints {
  breakpoints: string[];
  /** By breakpoint, to the cent: each holder's and each class's payout there, in cents. */
  payouts: Record<string, { holders: Record<string, string>; classes: Record<string, string> }>;
}

export function payoutsAtBreakpoints(exitInput: unknown): PayoutsAtBreakpoints {
  const exit = readExit(exitInput);
  const pc = prepare(exit.capTable);
  const breakpoints = findBreakpoints(pc, exit.range).map((b) => b.exitValue);
  const payouts: PayoutsAtBreakpoints["payouts"] = {};
  for (const x of breakpoints) {
    const { payout } = solve(pc, x).answers[0]!;
    const cents = (m: typeof payout.holderTotals) => Object.fromEntries([...m].map(([k, v]) => [k, toCents(v)]));
    payouts[toCents(x)] = { holders: cents(payout.holderTotals), classes: cents(payout.classTotals) };
  }
  return { breakpoints: breakpoints.map(toCents), payouts };
}

/** A saved file as the page opens it, as an exit input: a cap table, or the one its rounds build. */
export const exitOf = (fileText: string) => {
  const opened = readFile(fileText);
  if (!opened.ok) throw new Error(opened.message);
  return buildExit(opened.draft).json;
};

/**
 * Millrace's exit on the post–Series B cap table recorded in its locked
 * expected.json (C2): what the page showed before M4i, and what the cap table
 * it now builds from the rounds must pay, to the cent.
 */
export function lockedMillraceExit(): unknown {
  const read = (file: string) => JSON.parse(readFileSync(resolve(import.meta.dirname, "../../../cases/millrace", file), "utf8"));
  const after = read("expected.json").cap_tables.find((t: { after_event: string }) => t.after_event === "series_b");
  const { totals: _totals, ...capTable } = after.cap_table;
  return { cap_table: capTable, range: read("inputs.json").exit.range, exit_values: [] };
}
