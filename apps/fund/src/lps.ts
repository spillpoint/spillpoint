// The LPs tab's form (plan, "0.2.0: the LPs", f02c, and "0.3.0: classes and later closes", f03c): the classes, each
// with its name, its fee rate and its carry or the fund's (F22); one row an LP, its name, its commitment in dollars, its
// class and its close (F25); how they're written into the fund's input; the line under the table; and the page's words
// for a refusal, shown under the cell its path names.
//
// The LPs on the fund's terms are one account and each class with LPs another (F23); within an account each LP gets
// its commitment's share. The commitments only divide: they aren't checked against the calls. No rows is no LPs, and
// the input leaves `lps` out; no classes, and it leaves `lp_classes` out.
//
// Names: the page takes leading and trailing whitespace off as it reads a name, an LP's or a class's, typed, pasted or
// from a file, so "Alder " never reaches the engine, which compares names exactly (FA17, FA27; f02a review, answer 2).
// `trim` takes off the same characters FA17 lists. An LP holds its class by the class's row, not its name, so renaming
// a class keeps its LPs in it.

import { D, FundRefusal } from "spillpoint-fund";
import type { Fund } from "spillpoint-fund";

import { exactDollars, parseDollars } from "./format.ts";
import type { CarryForm, Problem, TermsForm } from "./terms.ts";
import { carryFormFrom, carryInput, carryWords, percentOf, rateFrom, typed, UNREAD } from "./terms.ts";

/** A class (F22): only its fee rate and its carry differ from the fund's terms. */
export interface ClassRow {
  /** Stays with the row when rows are added or removed; an LP in the class holds it. */
  id: number;
  /** As typed: trimmed when the page reads it, and in the box once it loses the focus. */
  name: string;
  /** A percent; blank for the fund's fees. */
  feeRate: string;
  /** Its own carry, or the fund's. */
  ownCarry: boolean;
  /** Its own carry as typed; kept while it's on the fund's, for a way back. Null until it first has one. */
  carry: CarryForm | null;
}

export interface LpRow {
  /** Stays with the row when rows are added or removed. */
  id: number;
  /** As typed: trimmed when the page reads it, and in the box once it loses the focus. */
  name: string;
  commitment: string;
  /** Its class's row, or null for the fund's terms. */
  class: number | null;
  /** YYYY-MM-DD, as a browser's date picker gives it; "" for in from the start. */
  close: string;
}

export interface LpsForm {
  classes: ClassRow[];
  rows: LpRow[];
}

/** The LPs on the fund's terms, as the picker and the cards name them: their account's name in the engine's reasons (FA28). */
export const FUND_TERMS = "Fund terms";

let nextId = 1;

export function newLp(): LpRow {
  return { id: nextId++, name: "", commitment: "", class: null, close: "" };
}

/** A class just added: no name yet, on the fund's fees and carry. */
export function newClass(): ClassRow {
  return { id: nextId++, name: "", feeRate: "", ownCarry: false, carry: null };
}

/** A name as the page reads it: leading and trailing whitespace off (FA17). */
export function nameOf(text: string): string {
  return text.trim();
}

/**
 * The form for a fund the engine read: its classes and its LPs in the input's order, names trimmed, commitments with
 * every place, each LP in its class's row.
 */
export function lpsFrom(fund: Fund): LpsForm {
  const classes: ClassRow[] = (fund.terms.lpClasses ?? []).map((c) => ({
    id: nextId++,
    name: nameOf(c.name),
    feeRate: c.feeRate !== null ? percentOf(c.feeRate) : "",
    ownCarry: c.carry !== null,
    carry: c.carry !== null ? carryFormFrom(c.carry) : null,
  }));
  const rowOf = (name: string | null) => (name === null ? null : (classes.find((c) => c.name === nameOf(name))?.id ?? null));
  return {
    classes,
    rows: fund.lps.map((lp) => ({ id: nextId++, name: nameOf(lp.name), commitment: exactDollars(lp.commitment), class: rowOf(lp.class ?? null), close: lp.close ?? "" })),
  };
}

/** A fund with no LPs yet, and no classes. */
export function noLps(): LpsForm {
  return { classes: [], rows: [] };
}

/** A row with nothing in it yet: one just added. A paste replaces these. */
export function isEmptyLp(row: LpRow): boolean {
  return nameOf(row.name) === "" && row.commitment.trim() === "" && row.close === "";
}

/** The class a row names, by its row: null for the fund's terms, or a row that's gone. */
function classOf(form: LpsForm, id: number | null): ClassRow | null {
  return id === null ? null : (form.classes.find((c) => c.id === id) ?? null);
}

/** A class as the LPs' picker shows it: its name as the page reads it, or "Class 2", its row, while it has none. */
export function classLabel(form: LpsForm, c: ClassRow): string {
  return nameOf(c.name) || `Class ${form.classes.indexOf(c) + 1}`;
}

/**
 * The LPs as the engine reads them (F19, F22, F25): each name trimmed, each commitment typed in dollars as its exact
 * string, or "" when it isn't one, which the engine refuses at that cell; a class by its name as the page reads it,
 * and a close when there is one. No rows: no `lps` at all.
 */
export function lpsInput(form: LpsForm): Record<string, unknown> {
  if (form.rows.length === 0) return {};
  return {
    lps: form.rows.map((r) => {
      const c = classOf(form, r.class);
      return { name: nameOf(r.name), commitment: parseDollars(r.commitment)?.toFixed() ?? UNREAD, ...(c ? { class: nameOf(c.name) } : {}), ...(r.close ? { close: r.close } : {}) };
    }),
  };
}

/**
 * The classes as the engine reads them, in the terms (F22): each name trimmed, a fee rate only when typed, a carry only
 * when it's the class's own. No classes: no `lp_classes` at all.
 */
export function classesInput(form: LpsForm): Record<string, unknown> {
  if (form.classes.length === 0) return {};
  return {
    lp_classes: form.classes.map((c) => ({
      name: nameOf(c.name),
      ...(c.feeRate.trim() !== "" ? { fee_rate: rateFrom(c.feeRate) ?? UNREAD } : {}),
      ...(c.ownCarry && c.carry ? { carry: carryInput(c.carry) } : {}),
    })),
  };
}

/** A class removed: its LPs move to the fund's terms (plan, "The LPs tab"). The names of the LPs it moved. */
export function removeClass(form: LpsForm, i: number): { form: LpsForm; moved: string[] } {
  const gone = form.classes[i]!;
  const moved = form.rows.filter((r) => r.class === gone.id).map((r) => nameOf(r.name) || `LP ${form.rows.indexOf(r) + 1}`);
  return {
    form: { classes: form.classes.filter((_, j) => j !== i), rows: form.rows.map((r) => (r.class === gone.id ? { ...r, class: null } : r)) },
    moved,
  };
}

/** The line under the classes when a removed class had LPs: "Removed Friends and family: Cedar Holdings moves to Fund terms." */
export function removedLine(name: string, moved: readonly string[]): string {
  const who = moved.length < 2 ? moved.join("") : `${moved.slice(0, -1).join(", ")} and ${moved.at(-1)}`;
  return `Removed ${name}: ${who} ${moved.length === 1 ? "moves" : "move"} to ${FUND_TERMS}.`;
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

/** The page's words for a refusal of an LP or a class the form wrote, under the cell its path names (F21, F28). */
export const LP_WORDS = {
  name: "Write the LP's name.",
  commitment: "Write a commitment in dollars, more than zero: 5000000 or 5M.",
  repeated: "An LP above already has this name; each LP needs its own.",
  classUnknown: "This LP's class isn't one of the fund's classes.",
  closeAfterDistribution: "An LP's close must come before the fund's first distribution.",
  className: "Write the class's name.",
  classRepeated: "A class above already has this name; each class needs its own.",
  classFeeRate: "Write the class's fee rate as a percent, 0 or more: 0 or 1.5; or leave it blank for the fund's fees.",
  classFundTerms: "That's the page's name for the fund's own terms; give this class another.",
};

/**
 * The first class named as the page names the fund's own terms, "Fund terms", or -1 (f03c review, answer 3). The engine
 * takes the name (FA28's known edge); the page doesn't, or its picker, its paste and its cards couldn't tell the class
 * from the fund's terms. Checked after everything the engine checks, and compared exactly once trimmed, as every name on
 * the page is (FA17, FA27).
 */
export function fundTermsClass(fund: Fund): number {
  return fund.terms.lpClasses.findIndex((c) => c.name === FUND_TERMS);
}

/** The GP's share of the catch-up as the Terms tab has it, for a sentence: "100%" for a full one. */
function catchUpShare(terms: TermsForm): string {
  return terms.catchUp.kind === "full" ? "100%" : typed(terms.catchUp.share);
}

/** The page's words for the engine's refusal of the LPs or the classes, at the path it names (F21, F28). */
export function lpsProblem(refusal: FundRefusal, form: LpsForm, terms: TermsForm): Problem {
  const { term, path } = refusal;
  const cell = /^lps\[(\d+)\]\.(name|commitment|class|close)$/.exec(path);
  const cls = /^terms\.lp_classes\[(\d+)\](?:\.(name|fee_rate|carry))?/.exec(path);
  const words = (): string => {
    if (term === "lp_name_repeated") return LP_WORDS.repeated;
    if (term === "lp_class_unknown") return LP_WORDS.classUnknown;
    if (term === "lp_close_after_distribution") return LP_WORDS.closeAfterDistribution;
    if (cell?.[2] === "name") return LP_WORDS.name;
    if (cell?.[2] === "commitment") return LP_WORDS.commitment;
    if (cls) {
      const c = form.classes[Number(cls[1])];
      if (term === "lp_class_name_repeated") return LP_WORDS.classRepeated;
      if (cls[2] === "name" && (term === "missing_field" || term === "bad_field")) return LP_WORDS.className;
      if (cls[2] === "fee_rate" && term === "bad_number") return LP_WORDS.classFeeRate;
      // F8, F22: the class's catch-up runs to its own first carry rate, which the catch-up's share must be above.
      if (cls[2] === "carry" && term === "catch_up_share_not_above_carry") {
        return `This class's carry rate must be below the GP's share of the catch-up, ${catchUpShare(terms)}, or its catch-up never ends.`;
      }
      const carry = c?.carry ? carryWords(refusal, `terms.lp_classes[${cls[1]}].carry`, c.carry) : null;
      if (carry) return carry;
    }
    // Anything else can only come from a file, which is refused as it opens: the engine's own words.
    return `The engine can't run this fund: ${refusal.message}.`;
  };
  return { path, message: words() };
}
