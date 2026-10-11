// What two cap tables pay, compared to the cent: the breakpoints the engine
// finds, to the cent as SPEC reports them, and every holder's and class's
// payout at each one. A cap table built from rounds holds its prices to 40
// digits where the locked case has exact fractions, so its breakpoints agree
// with the case's to far less than a cent, not to the 40th digit.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { D, findBreakpoints, prepare, readExit, readInputs, solve, toCents } from "spillpoint";

import { buildExit } from "../src/draft.ts";
import { readFile } from "../src/file.ts";
import { paidCents } from "../src/paid.ts";

export interface PayoutsAtBreakpoints {
  breakpoints: string[];
  /** By breakpoint, to the cent: each holder's and each class's payout there, in cents. */
  payouts: Record<string, { holders: Record<string, string>; classes: Record<string, string> }>;
}

export function payoutsAtBreakpoints(exitInput: unknown): PayoutsAtBreakpoints {
  const exit = readExit(exitInput);
  const pc = prepare(exit.capTable, exit.exitDate);
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

/**
 * What the page shows each holder on a case at an exit value, as it would be paid (P1): the engine's exact payments on
 * the case's own inputs, each rounded down to the cent, summed by holder; with how many payments each has.
 */
export function paidOnCase(name: string, exitValue: string): Map<string, { amount: D; payments: number }> {
  const exit = readInputs(JSON.parse(readFileSync(resolve(import.meta.dirname, "../../../cases", name, "inputs.json"), "utf8")));
  const { lines } = solve(prepare(exit.capTable, exit.exitDate), new D(exitValue)).answers[0]!.payout;
  const out = new Map<string, { amount: D; payments: number }>();
  for (const l of lines) {
    const was = out.get(l.holder) ?? { amount: new D(0), payments: 0 };
    out.set(l.holder, { amount: was.amount.plus(paidCents(l.amount)), payments: was.payments + 1 });
  }
  return out;
}

/** A case's own holder total, half-up to the cent, against the page's: never above it, and within a cent a payment below. */
export function nearCaseTotal(caseTotal: string, page: { amount: D; payments: number }): boolean {
  const gap = new D(caseTotal).minus(page.amount);
  return gap.gte("-0.005") && gap.lt(new D("0.01").times(page.payments).plus("0.005"));
}
