// What two cap tables pay, compared to the cent: the breakpoints the engine
// finds, and every holder's and class's payout at each one.

import { findBreakpoints, prepare, readExit, solve, toCents } from "spillpoint";

export interface PayoutsAtBreakpoints {
  breakpoints: string[];
  /** By breakpoint: each holder's and each class's payout there, in cents. */
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
    payouts[x.toString()] = { holders: cents(payout.holderTotals), classes: cents(payout.classTotals) };
  }
  return { breakpoints: breakpoints.map(String), payouts };
}

/** A saved file as the engine reads it. */
export const exitOf = (fileText: string) => {
  const file = JSON.parse(fileText);
  return { cap_table: file.cap_table, range: file.range, exit_values: [] };
};
