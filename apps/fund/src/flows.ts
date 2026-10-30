// The Cash flows tab's form (plan, "The cash flows: a table", f01j): the rows as entered, and the facts about D above
// them; how they're written into the fund's input; and the page's words for a refusal, shown in the cell its path
// names.
//
// Amounts are typed in dollars ("$8,000,000", "8000000", "8M") and written exactly. Text that isn't an amount goes to
// the engine as "", which it refuses at that cell's path, so every problem comes one at a time in its order (FA2).
//
// From 0.5.0 the form also holds the fund's investments, on the Investments tab, and X's source, beside X: a
// distribution's From, a write-off's and X's name an investment by its row (F33).

import { FundRefusal } from "spillpoint-fund";
import type { CallKind, Fund } from "spillpoint-fund";

import { dateText, exactDollars, parseDollars } from "./format.ts";
import type { InvestmentRow } from "./investments.ts";
import { investmentOf, investmentsFrom, investmentsInput, INVESTMENT_WORDS } from "./investments.ts";
import { nameOf } from "./lps.ts";
import type { Problem } from "./terms.ts";
import { percentOf, rateFrom, UNREAD } from "./terms.ts";

export interface FlowRow {
  /** Stays with the row when rows are added, removed or sorted. */
  id: number;
  /** YYYY-MM-DD, as a browser's date picker gives it; "" until chosen. */
  date: string;
  /** From 0.5.0 also a write-off: the end of what's left of an investment, with no amount (F33). */
  type: "call" | "distribution" | "write_off";
  /** A call's kind. A distribution has none (FA12); the row keeps the last kind chosen, for a switch back. */
  kind: CallKind;
  /** A write-off has none (F33); the row keeps what was typed, for a switch back. */
  amount: string;
  /** F33: the investment a distribution comes from, or a write-off ends, by its row; null for none. A call has none. */
  from: number | null;
  /** F33: a percent of what's left of its investment a distribution sells, "100" by default. Only with a From. */
  share: string;
}

/** F33, F14: X's source, beside X: the investment X comes from, by its row, and the percent of what's left of it X sells. */
export interface SourceForm {
  investment: number | null;
  share: string;
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
  /** F33: the fund's investments, on the Investments tab, in the order the GP lists them. */
  investments: InvestmentRow[];
  /** F33, F14: X's source; none on the whole fund unless a file gave one, since there it changes no amount. */
  source: SourceForm;
}

/** A share as the form starts it: all of what's left of the investment (F33). */
const ALL = "100";

let nextId = 1;

/**
 * A new row, its date and amount to come, of the type, kind and From of the row above it: a GP enters calls in a run and
 * distributions in a run (f01j review, answer 2). The first is a call, an investment.
 */
export function newRow(above?: FlowRow): FlowRow {
  return { id: nextId++, date: "", type: above?.type ?? "call", kind: above?.kind ?? "investment", amount: "", from: above?.from ?? null, share: ALL };
}

/**
 * The form for a fund the engine read: its cash flows in the order entered (FA12), every amount with all its places;
 * its investments; each distribution's and write-off's investment by its row, with a distribution's share; and X's
 * source.
 */
export function flowsFrom(fund: Fund): FlowsForm {
  const investments = investmentsFrom(fund);
  const rowOf = (name: string | null | undefined) => (name == null ? null : (investments.find((r) => r.name === nameOf(name))?.id ?? null));
  const from = fund.distributionFrom ?? null;
  return {
    asOf: fund.asOf,
    distributionDate: fund.distributionDate === fund.asOf ? "" : fund.distributionDate,
    final: fund.final,
    nav: fund.nav ? exactDollars(fund.nav) : "",
    rows: [...fund.cashFlows]
      .sort((a, b) => a.index - b.index)
      .map((f) => ({
        id: nextId++,
        date: f.date,
        type: f.type,
        kind: f.kind ?? "investment",
        // F33: a write-off has no amount.
        amount: f.amount ? exactDollars(f.amount) : "",
        from: f.type === "call" ? null : rowOf(f.investment),
        share: f.type === "distribution" && f.share ? percentOf(f.share) : ALL,
      })),
    investments,
    source: from ? { investment: rowOf(from.investment), share: percentOf(from.share) } : { investment: null, share: ALL },
  };
}

/** A row with nothing in it yet: a blank fund's first, or one just added. A paste replaces these. */
export function isEmptyRow(row: FlowRow): boolean {
  return row.date === "" && row.amount.trim() === "";
}

/** A blank fund's form: no dates yet, one call to fill in, no investments. */
export function blankFlows(): FlowsForm {
  return { asOf: "", distributionDate: "", final: false, nav: "", rows: [newRow()], investments: [], source: { investment: null, share: ALL } };
}

/** An amount typed in dollars, as the exact string the engine reads; "" if it isn't one. */
function dollars(text: string): string {
  return parseDollars(text)?.toFixed() ?? UNREAD;
}

/**
 * F33: an investment, by the name the page reads, and the share sold of it, typed as a percent and written exactly.
 * All of it, 100%, is the default, so it's left out (FA52); text that isn't a percent goes as "", which the engine
 * refuses at the share. No investment: neither, since a share needs one.
 */
function soldFrom(form: FlowsForm, id: number | null, share: string | null): Record<string, unknown> {
  const inv = investmentOf(form.investments, id);
  if (!inv) return {};
  if (share === null) return { investment: nameOf(inv.name) };
  const rate = rateFrom(share);
  return { investment: nameOf(inv.name), ...(rate === "1" ? {} : { share: rate ?? UNREAD }) };
}

/** A cash flow as the engine reads it: a call's kind; a distribution's investment and share; a write-off's investment and no amount (F33). */
function flowInput(form: FlowsForm, r: FlowRow): Record<string, unknown> {
  if (r.type === "call") return { date: r.date, type: r.type, kind: r.kind, amount: dollars(r.amount) };
  if (r.type === "write_off") return { date: r.date, type: r.type, ...soldFrom(form, r.from, null) };
  return { date: r.date, type: r.type, amount: dollars(r.amount), ...soldFrom(form, r.from, r.share) };
}

/** Everything but the terms, as the engine reads it (SPEC.md, "Inputs"), the investments and X's source among it. */
export function flowsInput(form: FlowsForm): Record<string, unknown> {
  const source = soldFrom(form, form.source.investment, form.source.share);
  return {
    as_of: form.asOf,
    ...investmentsInput(form.investments),
    cash_flows: form.rows.map((r) => flowInput(form, r)),
    ...(source.investment !== undefined ? { distribution_from: source } : {}),
    ...(form.distributionDate ? { distribution_date: form.distributionDate } : {}),
    final: form.final,
    ...(form.nav.trim() ? { nav: dollars(form.nav) } : {}),
  };
}

/** F33: an investment removed, the cash flows and X's source that named it name none. */
export function withoutInvestment(form: FlowsForm, id: number): FlowsForm {
  return {
    ...form,
    investments: form.investments.filter((r) => r.id !== id),
    rows: form.rows.map((r) => (r.from === id ? { ...r, from: null } : r)),
    source: form.source.investment === id ? { ...form.source, investment: null } : form.source,
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

/** F32: with a schedule, the schedule works out the fee calls, so none is entered as well. */
export const FEE_ROW = "This fund's fees come from its schedule. Remove this row, or set Management fee to Entered as fee calls.";

// F37's words for a cash flow's investment and share (plan, "Problems, in the page's words").
export const FLOW_WORDS = {
  distributionFrom: "Deal by deal, every distribution comes from an investment: choose which.",
  writeOffFrom: "Choose the investment this write-off ends.",
  share: "Write the share sold as a percent, above 0 and at most 100: 100 or 40.",
};

/**
 * F37's `investment_not_made`: "This distribution is before the first check in Alder Robotics, on 1 Feb 2020." The
 * first check is the earliest by date; the engine has read every check's date by then.
 */
function beforeFirstCheck(form: FlowsForm, row: FlowRow | undefined): string {
  const what = row?.type === "write_off" ? "This write-off" : "This distribution";
  const inv = investmentOf(form.investments, row?.from ?? null);
  const first = inv?.checks.map((c) => c.date).filter((d) => d !== "").sort()[0];
  return inv && first ? `${what} is before the first check in ${nameOf(inv.name)}, on ${dateText(first)}.` : `${what} is before its investment's first check.`;
}

/** The page's words for the engine's refusal of the cash flows or the facts about D, at the path it names (F18). */
export function flowsProblem(refusal: FundRefusal, form: FlowsForm): Problem {
  const { term, path } = refusal;
  const cell = /^cash_flows\[(\d+)\](?:\.(\w+))?$/.exec(path);
  // F32: the engine names the first Fee row in the table's order; every one has the problem, so each shows it, at its
  // kind, which is what makes it one.
  if (term === "fee_call_with_schedule" && cell) {
    const fees = form.rows.flatMap((r, i) => (r.type === "call" && r.kind === "fee" ? [`cash_flows[${i}].kind`] : []));
    const first = `cash_flows[${cell[1]}].kind`;
    return { path: first, message: FEE_ROW, also: fees.filter((f) => f !== first) };
  }
  const words = (): string => {
    if (path === "as_of") return "Choose the fund's as-of date.";
    if (path === "distribution_date") return "Choose the distribution date, or leave it empty for the as-of date.";
    if (path === "nav") return "Write NAV in dollars, 0 or more: 40000000 or $40M; or leave it empty.";
    if (term === "no_calls") return "A fund needs at least one call. Add one with “Add a cash flow”.";
    if (cell) {
      const row = form.rows[Number(cell[1])];
      if (term === "distribution_before_call") return "This distribution is before the fund's first call.";
      if (term === "investment_not_made") return beforeFirstCheck(form, row);
      // F37: a write-off names the investment it ends; deal by deal a distribution names the one it comes from.
      if (cell[2] === "investment" && term === "missing_field") return row?.type === "write_off" ? FLOW_WORDS.writeOffFrom : FLOW_WORDS.distributionFrom;
      // A From whose investment has no name yet is written blank, which the engine refuses at the cash flow (F37).
      if (cell[2] === "investment" && term === "bad_field") return INVESTMENT_WORDS.unnamed;
      if (cell[2] === "share") return FLOW_WORDS.share;
      // F28: every call needs an LP in on its date that pays its kind (FA21).
      if (term === "call_without_payers") return "No LP in the fund on this date pays this call: none had closed yet, or none of them pays fees.";
      if (term === "cash_flow_after_distribution_date") return `This cash flow is after the distribution date, ${dateText(form.distributionDate || form.asOf)}.`;
      if (cell[2] === "date") return "Choose this cash flow's date.";
      if (cell[2] === "amount") return "Write an amount in dollars, more than zero: 250000 or 250000.50.";
    }
    return `The engine can't run this fund: ${refusal.message}.`;
  };
  return { path, message: words() };
}
