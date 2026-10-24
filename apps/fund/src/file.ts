// The fund page's file (plan, "Open and save", f01l). Saving downloads it; nothing leaves the computer, and nothing
// is kept in the browser or the address.
//
//   {"format": "spillpoint-fund", "version": 1, "name": ..., "fund": ..., "view": {"x": ...}}
//
// `fund` is exactly the input the Terms, Cash flows and LPs tabs write, which is readFund's input (SPEC.md, "Inputs"),
// so a saved file is also a fund the engine reads on its own. Only a fund the engine accepts is saved, so a saved file
// always opens. Opening also takes a bare input, or a case's inputs.json, which has the input as `fund`. A file's LP
// names are trimmed as the page reads them (FA17), so "Alder " never reaches the engine.

import { D, FundRefusal, readFund, splitAt } from "spillpoint-fund";
import type { Fund } from "spillpoint-fund";

import type { FlowsForm } from "./flows.ts";
import { flowsInput } from "./flows.ts";
import type { LpsForm } from "./lps.ts";
import { LP_WORDS, lpsInput, nameOf } from "./lps.ts";
import type { TermsForm } from "./terms.ts";
import { termsInput } from "./terms.ts";

export const FORMAT = "spillpoint-fund";
export const VERSION = 1;
const FIELDS = ["format", "version", "name", "fund", "view"];
/** A fund with no name of its own: a blank one, or a bare input. */
export const UNNAMED = "My fund";

/** The fund's input, as the three tabs write it: what the engine reads, and what a file keeps. No LPs: no `lps`. */
export function inputOf(terms: TermsForm, flows: FlowsForm, lps: LpsForm): Record<string, unknown> {
  const { as_of, ...rest } = flowsInput(flows);
  return { as_of, terms: termsInput(terms), ...rest, ...lpsInput(lps) };
}

/** The file, with X where it was: a save keeps X, though moving it isn't a change. */
export function fileText(name: string, fund: Record<string, unknown>, x: D): string {
  const file = { format: FORMAT, version: VERSION, name: name.trim() || UNNAMED, fund, view: { x: x.toFixed() } };
  return `${JSON.stringify(file, null, 2)}\n`;
}

/** "A late call and a clawback" → "a-late-call-and-a-clawback": how the page names the files it makes. */
export function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "fund"
  );
}

/** "A late call and a clawback" → "a-late-call-and-a-clawback.json". */
export function fileName(name: string): string {
  return `${slug(name)}.json`;
}

export type OpenedFile = { ok: true; name: string; fund: Fund; x: D | null; fraction: string | null } | { ok: false; message: string };

/**
 * The first exact fraction in a file, "10000000/3" (FC1), or null. The engine reads one to 40 digits, and the form
 * holds that decimal, so the fund in the form isn't quite the fund in the file: the page says so when it opens (f01l
 * review, answer 2).
 */
function firstFraction(value: unknown): string | null {
  if (typeof value === "string") return /^-?[0-9]+\/[0-9]+$/.test(value) ? value : null;
  if (Array.isArray(value)) return value.map(firstFraction).find((f) => f !== null) ?? null;
  if (isObject(value)) return Object.values(value).map(firstFraction).find((f) => f !== null) ?? null;
  return null;
}

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);

/** Reads a file: a saved fund, a bare input, or a case's inputs.json. Its refusal, in the page's words, if it can't. */
export function readFile(text: string): OpenedFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: "It isn't a fund file: it isn't valid JSON." };
  }
  if (!isObject(parsed)) return { ok: false, message: NOT_A_FUND };
  const format = parsed.format;
  if (format === "spillpoint") return { ok: false, message: "This is a cap table file. Open it on the main page." };
  if (format !== undefined && format !== FORMAT) return { ok: false, message: `It isn't a fund file: its format is ${JSON.stringify(format)}, not "${FORMAT}".` };

  let name = UNNAMED;
  let input: unknown;
  let x: unknown = undefined;
  if (format === FORMAT) {
    const version = parsed.version;
    if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
      return { ok: false, message: "Its version number is missing or unreadable, so it's not clear how to read it." };
    }
    if (version > VERSION) {
      return { ok: false, message: `It was made by a newer spillpoint (file version ${version}); this page reads files up to version ${VERSION}.` };
    }
    // As the main page's files (C12): a field it doesn't read is refused, so a misspelt one can't be ignored.
    const unknown = Object.keys(parsed).filter((k) => !FIELDS.includes(k));
    if (unknown.length > 0) return { ok: false, message: `It has ${unknown.length === 1 ? "a field" : "fields"} this page doesn't read: ${unknown.join(", ")}.` };
    if (typeof parsed.name === "string" && parsed.name.trim()) name = parsed.name.trim();
    if (parsed.view !== undefined && parsed.view !== null) {
      if (!isObject(parsed.view) || Object.keys(parsed.view).some((k) => k !== "x")) return { ok: false, message: 'Its view isn\'t readable: it should be {"x": "15000000"}, or left out.' };
      x = parsed.view.x;
    }
    input = parsed.fund;
  } else if (isObject(parsed.fund)) {
    // A case's inputs.json: the fund's input as `fund`, named by its case id.
    if (typeof parsed.case === "string" && parsed.case.trim()) name = parsed.case.trim();
    input = parsed.fund;
  } else if (["as_of", "terms", "cash_flows"].some((k) => k in parsed)) {
    input = parsed;
  } else {
    return { ok: false, message: NOT_A_FUND };
  }

  // Until the page shows classes and later closes (f03c, which removes this), a file whose fund has them is refused, so
  // a save can't drop them: the forms have no place for them yet. Null is left out (FA24), and an empty list of classes
  // is none, so those open.
  if (hasClassesOrCloses(input)) return { ok: false, message: CLASSES_LATER };

  input = trimmedNames(input);
  let fund: Fund;
  try {
    fund = readFund(input);
  } catch (e) {
    if (!(e instanceof FundRefusal)) throw e;
    return { ok: false, message: fileProblem(e) };
  }
  const fraction = firstFraction(input) ?? firstFraction(x);
  if (x === undefined || x === null) return { ok: true, name, fund, x: null, fraction };
  const badX = 'Its X isn\'t readable: it should be an amount from 0 up, written as a string, like "15000000".';
  // A string, as every number in the input is (FC1): a JSON number could already have lost its digits.
  if (typeof x !== "string") return { ok: false, message: badX };
  try {
    // X as the engine takes it (FA13): an exact amount from 0 up.
    return { ok: true, name, fund, x: splitAt(fund, x).x, fraction };
  } catch (e) {
    if (!(e instanceof FundRefusal)) throw e;
    return { ok: false, message: badX };
  }
}

/**
 * The input with each LP's name trimmed, as the page reads every name (FA17; f02a review, answer 2). Only a name that is
 * text changes; anything else is left for the engine to refuse where it is (F21).
 */
function trimmedNames(input: unknown): unknown {
  if (!isObject(input) || !Array.isArray(input.lps)) return input;
  return { ...input, lps: input.lps.map((lp: unknown) => (isObject(lp) && typeof lp.name === "string" ? { ...lp, name: nameOf(lp.name) } : lp)) };
}

const CLASSES_LATER = "This file has LP classes or later closes; the page shows them from the next version.";

/** F22, F25: the fund's input gives a fee rate, an equalization rate or classes, or an LP gives a class or a close. */
function hasClassesOrCloses(input: unknown): boolean {
  if (!isObject(input)) return false;
  const given = (o: Json, key: string) => o[key] !== undefined && o[key] !== null;
  const terms = input.terms;
  if (isObject(terms)) {
    if (given(terms, "fee_rate") || given(terms, "equalization_rate")) return true;
    if (given(terms, "lp_classes") && !(Array.isArray(terms.lp_classes) && terms.lp_classes.length === 0)) return true;
  }
  return Array.isArray(input.lps) && input.lps.some((lp: unknown) => isObject(lp) && (given(lp, "class") || given(lp, "close")));
}

const NOT_A_FUND = 'It isn\'t a fund file: a fund file starts with "format": "spillpoint-fund", and a fund\'s input has as_of, terms and cash_flows.';

/** The part of a fund's input a path names, as a sentence starts: "The amount in row 3 of its cash flows". */
function where(path: string): string {
  const flow = /^cash_flows\[(\d+)\](?:\.(\w+))?$/.exec(path);
  if (flow) return flow[2] ? `The ${flow[2]} in row ${Number(flow[1]) + 1} of its cash flows` : `Row ${Number(flow[1]) + 1} of its cash flows`;
  const lp = /^lps\[(\d+)\](?:\.(\w+))?$/.exec(path);
  if (lp) return lp[2] ? `The ${lp[2]} in row ${Number(lp[1]) + 1} of its LPs` : `Row ${Number(lp[1]) + 1} of its LPs`;
  const step = /^terms\.carry\.steps\[(\d+)\](?:\.(\w+))?$/.exec(path);
  if (step) return step[2] === "from_lp_multiple" ? `Carry step ${Number(step[1]) + 1}'s LP multiple` : step[2] ? `Carry step ${Number(step[1]) + 1}'s ${step[2]}` : `Carry step ${Number(step[1]) + 1}`;
  const named: Record<string, string> = {
    "": "The fund",
    as_of: "Its as-of date",
    distribution_date: "Its distribution date",
    final: "Whether X is its last distribution",
    nav: "Its NAV",
    terms: "Its terms",
    "terms.carry": "Its carry",
    "terms.carry.steps": "Its carry steps",
    "terms.pref": "Its pref",
    "terms.pref.rate": "Its pref's rate",
    "terms.catch_up": "Its catch-up",
    "terms.catch_up.gp_share": "The GP's share of its catch-up",
    "terms.gp_commitment": "Its GP commitment",
    "terms.gp_commitment.share": "Its GP commitment's share",
    "terms.gp_commitment.pays_fees": "Whether its GP commitment pays fees",
    "terms.gp_commitment.pays_expenses": "Whether its GP commitment pays expenses",
    cash_flows: "Its cash flows",
    lps: "Its list of LPs",
  };
  return named[path] ?? `\`${path}\``;
}

/** The engine's refusal of an opened file, in the page's words, naming the row or term (F18). */
export function fileProblem(refusal: FundRefusal): string {
  const { kind, term, path } = refusal;
  if (kind === "unsupported") {
    if (term === "compounded_pref") return `This file has a term the page doesn't model: a pref compounded, not simple (\`${path}\`).`;
    // F21: a per-LP term, such as a side letter's carry. Every LP is on the same terms (F19).
    const lp = /^lps\[(\d+)\]\./.exec(path);
    if (lp) return `This file has a term the page doesn't model: \`${term}\` on an LP (row ${Number(lp[1]) + 1} of its LPs). Every LP is on the same terms here.`;
    return `This file has a term the page doesn't model: \`${term}\`.`;
  }
  const field: Record<string, string> = {
    bad_number: 'isn\'t a number the page can use: amounts and rates are exact strings, like "8000000" or "0.2", amounts more than zero and nothing negative',
    bad_date: "isn't a date that exists, written YYYY-MM-DD",
    bad_field: "isn't a value it can take",
    missing_field: "is missing",
    unknown_field: "isn't part of a fund's input",
  };
  if (term in field) return `${where(path)} ${field[term]}.`;
  const rule: Record<string, string> = {
    carry_rate_not_below_one: "a carry rate must be below 100%",
    steps_out_of_order: "carry steps need rising rates, each from a higher LP multiple above 1.0x, and none on the first step",
    catch_up_without_pref: "a catch-up needs a pref to catch up to",
    catch_up_share_not_above_carry: "the GP's share of the catch-up must be above the first carry rate, or the catch-up never ends",
    gp_commitment_not_below_one: "the GP commitment's share must be below 100%",
    no_calls: "a fund needs at least one call",
    distribution_before_call: "this distribution is before the fund's first call",
    cash_flow_after_distribution_date: "this cash flow is after the distribution date",
    lp_name_repeated: LP_WORDS.repeated.replace(/^A/, "a").replace(/\.$/, ""),
  };
  return `${where(path)}: ${rule[term] ?? refusal.message}.`;
}
