// The Investments tab's form (plan, "0.5.0: investments and carry deal by deal", f05c): each investment with its name
// and its checks (F33), how they're written into the fund's input, and the page's words for a refusal of them, or of X's
// source beside X, shown under the field its path names (F37).
//
// A check is the fund's cost: a whole-fund amount with the GP commitment's part included, as a call is (F2, F33). A
// follow-on is another check. Amounts are typed in dollars and written exactly, as the cash flows' are.
//
// Names: the page takes the whitespace off each end as it reads an investment's name, as it does an LP's or a class's
// (FA17, FA27, FA52), so "Alder " never reaches the engine, which compares names exactly. A distribution, a write-off
// and X's source hold their investment by its row, not its name, as an LP holds its class, so renaming an investment
// keeps them on it.

import { FundRefusal } from "spillpoint-fund";
import type { Fund } from "spillpoint-fund";

import type { FlowsForm } from "./flows.ts";
import { dateText, exactDollars, parseDollars } from "./format.ts";
import { nameOf } from "./lps.ts";
import type { Problem } from "./terms.ts";
import { UNREAD } from "./terms.ts";

export interface CheckRow {
  /** Stays with the check when checks are added or removed. */
  id: number;
  /** YYYY-MM-DD, as a browser's date picker gives it; "" until chosen. */
  date: string;
  amount: string;
}

export interface InvestmentRow {
  /** Stays with the row when rows are added or removed; a cash flow or X's source naming it holds it. */
  id: number;
  /** As typed: trimmed when the page reads it. */
  name: string;
  /** One or more: the first check, then any follow-ons (F33). */
  checks: CheckRow[];
}

let nextId = 1;

export function newCheck(): CheckRow {
  return { id: nextId++, date: "", amount: "" };
}

/** An investment just added: no name yet, and its first check to fill in. */
export function newInvestment(): InvestmentRow {
  return { id: nextId++, name: "", checks: [newCheck()] };
}

/** The investments of a fund the engine read, in the input's order, names trimmed, amounts with every place. */
export function investmentsFrom(fund: Fund): InvestmentRow[] {
  return (fund.investments ?? []).map((inv) => ({
    id: nextId++,
    name: nameOf(inv.name),
    checks: inv.checks.map((c) => ({ id: nextId++, date: c.date, amount: exactDollars(c.amount) })),
  }));
}

/** The row a cash flow or X's source holds, or null for none, or a row that's gone. */
export function investmentOf(rows: readonly InvestmentRow[], id: number | null): InvestmentRow | null {
  return id === null ? null : (rows.find((r) => r.id === id) ?? null);
}

/** An investment as the pickers show it: its name as the page reads it, or "Investment 2", its row, while it has none. */
export function investmentLabel(rows: readonly InvestmentRow[], row: InvestmentRow): string {
  return nameOf(row.name) || `Investment ${rows.indexOf(row) + 1}`;
}

/**
 * The investments as the engine reads them (F33): each name trimmed, each check's date as picked and its amount typed
 * in dollars as its exact string, or "" when it isn't one, which the engine refuses at that check. None: no
 * `investments` at all, which is none (FA52).
 */
export function investmentsInput(rows: readonly InvestmentRow[]): Record<string, unknown> {
  if (rows.length === 0) return {};
  return {
    investments: rows.map((r) => ({
      name: nameOf(r.name),
      checks: r.checks.map((c) => ({ date: c.date, amount: parseDollars(c.amount)?.toFixed() ?? UNREAD })),
    })),
  };
}

// The page's words (plan, "Problems, in the page's words").
export const INVESTMENT_WORDS = {
  needed: "Deal by deal needs the fund's investments: add each one, with its checks.",
  name: "Write the investment's name.",
  repeated: "An investment above already has this name; each investment needs its own.",
  checkDate: "Choose this check's date.",
  checkAmount: "Write the check's amount in dollars, more than zero: 3000000 or $3M.",
  // F37: the cost made by any check's date can't be more than the investment calls up to that date.
  exceedsCalls: "By this check's date the checks come to more than the investment calls. Checks are paid from capital called for investments.",
  unnamed: "This investment has no name yet: name it on the Investments tab.",
  xFrom: "Deal by deal, X comes from an investment: choose which.",
  xShare: "Write the share X sells as a percent, above 0 and at most 100: 100 or 40.",
};

/**
 * The page's words for the engine's refusal of the investments, at `investments…`, or of X's source, at
 * `distribution_from…` (F37), at the path it names.
 */
export function investmentsProblem(refusal: FundRefusal, form: FlowsForm): Problem {
  const { term, path } = refusal;
  const check = /^investments\[\d+\]\.checks\[\d+\](?:\.(date|amount))?$/.exec(path);
  const words = (): string => {
    // F37: deal by deal, the investments missing.
    if (path === "investments" && term === "missing_field") return INVESTMENT_WORDS.needed;
    if (/^investments\[\d+\]\.name$/.test(path)) return term === "investment_name_repeated" ? INVESTMENT_WORDS.repeated : INVESTMENT_WORDS.name;
    if (check) {
      if (term === "cash_flow_after_distribution_date") return `This check is after the distribution date, ${dateText(form.distributionDate || form.asOf)}.`;
      if (term === "investments_exceed_calls") return INVESTMENT_WORDS.exceedsCalls;
      if (check[1] === "date") return INVESTMENT_WORDS.checkDate;
      if (check[1] === "amount") return INVESTMENT_WORDS.checkAmount;
    }
    // F37: deal by deal, X's source missing; its investment unnamed; its share.
    if (path === "distribution_from" && term === "missing_field") return INVESTMENT_WORDS.xFrom;
    if (path === "distribution_from.investment" && term === "bad_field") return INVESTMENT_WORDS.unnamed;
    if (path === "distribution_from.share") return INVESTMENT_WORDS.xShare;
    // Anything else can only come from a file, which is refused as it opens: the engine's own words.
    return `The engine can't run this fund: ${refusal.message}.`;
  };
  return { path, message: words() };
}
