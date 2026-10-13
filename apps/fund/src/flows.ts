// The Cash flows tab's form (plan, "The cash flows: a table", f01j): the rows as entered, and the facts about D above
// them; how they're written into the fund's input; and the page's words for a refusal, shown in the cell its path
// names.
//
// Amounts are typed in dollars ("$8,000,000", "8000000", "8M") and written exactly. Text that isn't an amount goes to
// the engine as "", which it refuses at that cell's path, so every problem comes one at a time in its order (FA2).

import { FundRefusal } from "spillpoint-fund";
import type { CallKind, Fund } from "spillpoint-fund";

import { dateText, exactDollars, parseDollars } from "./format.ts";
import type { Problem } from "./terms.ts";
import { UNREAD } from "./terms.ts";

export interface FlowRow {
  /** Stays with the row when rows are added, removed or sorted. */
  id: number;
  /** YYYY-MM-DD, as a browser's date picker gives it; "" until chosen. */
  date: string;
  type: "call" | "distribution";
  /** A call's kind. A distribution has none (FA12); the row keeps the last kind chosen, for a switch back. */
  kind: CallKind;
  amount: string;
}

export interface FlowsForm {
  asOf: string;
  /** D; "" is the as-of date, which is what leaving it out of the input means. */
  distributionDate: string;
  /** F12: this distribution is the fund's last. */
  final: boolean;
  /** NAV on D; "" for none. */
  nav: string;
  rows: FlowRow[];
}

let nextId = 1;

/**
 * A new row, its date and amount to come, of the type and kind of the row above it: a GP enters calls in a run and
 * distributions in a run (f01j review, answer 2). The first is a call, an investment.
 */
export function newRow(above?: FlowRow): FlowRow {
  return { id: nextId++, date: "", type: above?.type ?? "call", kind: above?.kind ?? "investment", amount: "" };
}

/** The form for a fund the engine read: its cash flows in the order entered (FA12), every amount with all its places. */
export function flowsFrom(fund: Fund): FlowsForm {
  return {
    asOf: fund.asOf,
    distributionDate: fund.distributionDate === fund.asOf ? "" : fund.distributionDate,
    final: fund.final,
    nav: fund.nav ? exactDollars(fund.nav) : "",
    rows: [...fund.cashFlows]
      .sort((a, b) => a.index - b.index)
      .map((f) => ({ id: nextId++, date: f.date, type: f.type, kind: f.kind ?? "investment", amount: exactDollars(f.amount) })),
  };
}

/** A row with nothing in it yet: a blank fund's first, or one just added. A paste replaces these. */
export function isEmptyRow(row: FlowRow): boolean {
  return row.date === "" && row.amount.trim() === "";
}

/** A blank fund's form: no dates yet, one call to fill in. */
export function blankFlows(): FlowsForm {
  return { asOf: "", distributionDate: "", final: false, nav: "", rows: [newRow()] };
}

/** An amount typed in dollars, as the exact string the engine reads; "" if it isn't one. */
function dollars(text: string): string {
  return parseDollars(text)?.toFixed() ?? UNREAD;
}

/** Everything but the terms, as the engine reads it (SPEC.md, "Inputs"). */
export function flowsInput(form: FlowsForm): Record<string, unknown> {
  return {
    as_of: form.asOf,
    cash_flows: form.rows.map((r) => ({ date: r.date, type: r.type, ...(r.type === "call" ? { kind: r.kind } : {}), amount: dollars(r.amount) })),
    ...(form.distributionDate ? { distribution_date: form.distributionDate } : {}),
    final: form.final,
    ...(form.nav.trim() ? { nav: dollars(form.nav) } : {}),
  };
}

/**
 * Sorted by date, earliest first; rows without a date go last. A sort that keeps the order shown within a date, since
 * same-day distributions run in that order (F4).
 */
export function sortByDate(form: FlowsForm): FlowsForm {
  const rank = (r: FlowRow) => r.date || "9999-99-99";
  return { ...form, rows: [...form.rows].sort((a, b) => (rank(a) < rank(b) ? -1 : rank(a) > rank(b) ? 1 : 0)) };
}

/** The page's words for the engine's refusal of the cash flows or the facts about D, at the path it names (F18). */
export function flowsProblem(refusal: FundRefusal, form: FlowsForm): Problem {
  const { term, path } = refusal;
  const cell = /^cash_flows\[(\d+)\](?:\.(\w+))?$/.exec(path);
  const words = (): string => {
    if (path === "as_of") return "Choose the fund's as-of date.";
    if (path === "distribution_date") return "Choose the distribution date, or leave it empty for the as-of date.";
    if (path === "nav") return "Write NAV in dollars, 0 or more: 40000000 or $40M; or leave it empty.";
    if (term === "no_calls") return "A fund needs at least one call. Add one with “Add a cash flow”.";
    if (cell) {
      if (term === "distribution_before_call") return "This distribution is before the fund's first call.";
      if (term === "cash_flow_after_distribution_date") return `This cash flow is after the distribution date, ${dateText(form.distributionDate || form.asOf)}.`;
      if (cell[2] === "date") return "Choose this cash flow's date.";
      if (cell[2] === "amount") return "Write an amount in dollars, more than zero: 250000 or 250000.50.";
    }
    return `The engine can't run this fund: ${refusal.message}.`;
  };
  return { path, message: words() };
}
