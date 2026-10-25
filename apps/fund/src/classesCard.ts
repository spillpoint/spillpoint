// The classes card's figures (plan, "Payouts", f03c): with two or more accounts, each account's own split (F23, F26),
// the fund's terms first, as the engine gives it in `byAccount`. Nothing here is fund arithmetic: every amount is the
// engine's, written to the cent as the split table's are, and the multiple as the split's.

import type { Split } from "spillpoint-fund";

import { owesSomething } from "./Clawback.tsx";
import { cents, lpMultipleText } from "./format.ts";
import { FUND_TERMS } from "./lps.ts";

const NONE = "—";

export interface ClassesTable {
  headings: string[];
  /** One an account, the fund's terms first: its name, and its cells as shown. */
  rows: { name: string; cells: string[] }[];
}

/**
 * The card for a split with two or more accounts: each account's LPs and GP this distribution and to date, its paid-in,
 * its LP multiple ("—" with nothing paid in, FA38), and, when the split is final and some class is owed something, what
 * the GP owes each back (F24), $0.00 for a class owed nothing: one class's surplus doesn't offset another's. With nothing
 * owed to any class, the column is left out, as the LPs' card leaves out its clawback column (f03c review, answer 1).
 */
export function classesTable(split: Split): ClassesTable {
  const owed = split.clawback !== null && split.byAccount.some((a) => owesSomething(a.clawback!.owed));
  return {
    headings: ["Class", "LPs, this distribution", "GP, this distribution", "LPs, to date", "GP, to date", "Paid in", "LP multiple", ...(owed ? ["Owed back"] : [])],
    rows: split.byAccount.map((a) => ({
      name: a.class ?? FUND_TERMS,
      cells: [
        cents(a.distribution.lps.total),
        cents(a.distribution.gp.total),
        cents(a.toDate.lps.total),
        cents(a.toDate.gp.total),
        cents(a.paidIn),
        a.lpMultiple ? lpMultipleText(a.lpMultiple) : NONE,
        ...(owed ? [cents(a.clawback!.owed)] : []),
      ],
    })),
  };
}
