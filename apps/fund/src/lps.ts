// The LPs tab's form (plan, "0.2.0: the LPs", f02c): one row an LP, its name and its commitment in dollars; how
// they're written into the fund's input; the line under the table; and the page's words for a refusal, shown under the
// cell its path names.
//
// Every LP is on the same terms (F19), so each gets its commitment's share of what the LPs get. The commitments only
// divide: they aren't checked against the calls. No rows is no LPs, and the input leaves `lps` out.
//
// Names: the page takes leading and trailing whitespace off as it reads a name, typed, pasted or from a file, so
// "Alder " never reaches the engine, which compares names exactly (FA17; f02a review, answer 2). `trim` takes off the
// same characters FA17 lists.

import { D, FundRefusal } from "spillpoint-fund";
import type { Fund } from "spillpoint-fund";

import { exactDollars, parseDollars } from "./format.ts";
import type { Problem } from "./terms.ts";
import { UNREAD } from "./terms.ts";

export interface LpRow {
  /** Stays with the row when rows are added or removed. */
  id: number;
  /** As typed: trimmed when the page reads it, and in the box once it loses the focus. */
  name: string;
  commitment: string;
}

export interface LpsForm {
  rows: LpRow[];
}

let nextId = 1;

export function newLp(): LpRow {
  return { id: nextId++, name: "", commitment: "" };
}

/** A name as the page reads it: leading and trailing whitespace off (FA17). */
export function nameOf(text: string): string {
  return text.trim();
}

/** The form for a fund the engine read: its LPs in the input's order, names trimmed, commitments with every place. */
export function lpsFrom(fund: Fund): LpsForm {
  return { rows: fund.lps.map((lp) => ({ id: nextId++, name: nameOf(lp.name), commitment: exactDollars(lp.commitment) })) };
}

/** A fund with no LPs yet. */
export function noLps(): LpsForm {
  return { rows: [] };
}

/** A row with nothing in it yet: one just added. A paste replaces these. */
export function isEmptyLp(row: LpRow): boolean {
  return nameOf(row.name) === "" && row.commitment.trim() === "";
}

/**
 * The LPs as the engine reads them (F19): each name trimmed, each commitment typed in dollars as its exact string, or
 * "" when it isn't one, which the engine refuses at that cell. No rows: no `lps` at all.
 */
export function lpsInput(form: LpsForm): Record<string, unknown> {
  if (form.rows.length === 0) return {};
  return { lps: form.rows.map((r) => ({ name: nameOf(r.name), commitment: parseDollars(r.commitment)?.toFixed() ?? UNREAD })) };
}

function count(n: number): string {
  return `${n} ${n === 1 ? "LP" : "LPs"}`;
}

/**
 * The line under the table: "3 LPs, $10,000,000 committed. Commitments only divide …". The total waits until every
 * commitment reads; no rows is no LPs.
 */
export function lpsSummary(form: LpsForm): string {
  if (form.rows.length === 0) return "No LPs: Payouts shows the LPs together. Add one to see each LP's share.";
  const amounts = form.rows.map((r) => parseDollars(r.commitment));
  const total = amounts.every((a) => a !== null) ? `, ${exactDollars(amounts.reduce((sum: D, a) => sum.plus(a!), new D(0)))} committed` : "";
  return `${count(form.rows.length)}${total}. Commitments only divide what the LPs get between them; they aren't checked against the calls.`;
}

/** The page's words for a refusal of an LP the form wrote, under the cell its path names (F21). */
export const LP_WORDS = {
  name: "Write the LP's name.",
  commitment: "Write a commitment in dollars, more than zero: 5000000 or 5M.",
  repeated: "An LP above already has this name; each LP needs its own.",
};

/** The page's words for the engine's refusal of the LPs, at the path it names (F21). */
export function lpsProblem(refusal: FundRefusal): Problem {
  const { term, path } = refusal;
  const cell = /^lps\[(\d+)\]\.(name|commitment)$/.exec(path);
  const words = (): string => {
    if (term === "lp_name_repeated") return LP_WORDS.repeated;
    if (cell?.[2] === "name") return LP_WORDS.name;
    if (cell?.[2] === "commitment") return LP_WORDS.commitment;
    // Anything else can only come from a file, which is refused as it opens: the engine's own words.
    return `The engine can't run this fund: ${refusal.message}.`;
  };
  return { path, message: words() };
}
