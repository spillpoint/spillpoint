// The fund page's file (plan, "Open and save", f01l). Saving downloads it; nothing leaves the computer, and nothing
// is kept in the browser or the address.
//
//   {"format": "spillpoint-fund", "version": 1, "name": ..., "fund": ..., "view": {"x": ...}}
//
// `fund` is exactly the input the Terms, Cash flows and LPs tabs write, which is readFund's input (SPEC.md, "Inputs"),
// so a saved file is also a fund the engine reads on its own. Only a fund the engine accepts is saved, so a saved file
// always opens. Opening also takes a bare input, or a case's inputs.json, which has the input as `fund`. A file's LP
// names, class names and LPs' classes are trimmed as the page reads them (FA17, FA27), so "Alder " never reaches the
// engine.

import { D, FundRefusal, readFund, splitAt } from "spillpoint-fund";
import type { Fund } from "spillpoint-fund";

import type { FlowsForm } from "./flows.ts";
import { flowsInput } from "./flows.ts";
import type { LpsForm } from "./lps.ts";
import { classesInput, fundTermsClass, LP_WORDS, lpsInput, nameOf } from "./lps.ts";
import type { TermsForm } from "./terms.ts";
import { termsInput } from "./terms.ts";

export const FORMAT = "spillpoint-fund";
export const VERSION = 1;
const FIELDS = ["format", "version", "name", "fund", "view"];
/** A fund with no name of its own: a blank one, or a bare input. */
export const UNNAMED = "My fund";

/**
 * The fund's input, as the three tabs write it: what the engine reads, and what a file keeps. The classes, on the LPs
 * tab, go in the terms (F22). No LPs: no `lps`; no classes: no `lp_classes`.
 */
export function inputOf(terms: TermsForm, flows: FlowsForm, lps: LpsForm): Record<string, unknown> {
  const { as_of, ...rest } = flowsInput(flows);
  return { as_of, terms: { ...termsInput(terms), ...classesInput(lps) }, ...rest, ...lpsInput(lps) };
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

  // Until the page shows a management fee schedule (f04c, which removes this), a file whose fund has one is refused, so
  // a save can't drop it: the forms have no place for it yet. A null schedule is none (FA41), so it opens.
  if (hasSchedule(input)) return { ok: false, message: SCHEDULE_LATER };

  input = trimmedNames(input);
  let fund: Fund;
  try {
    fund = readFund(input);
  } catch (e) {
    if (!(e instanceof FundRefusal)) throw e;
    return { ok: false, message: fileProblem(e) };
  }
  // The page's own rule, after the engine's: no class takes the page's name for the fund's terms (f03c review, answer 3).
  const named = fundTermsClass(fund);
  if (named >= 0) return { ok: false, message: `${where(`terms.lp_classes[${named}].name`)}: ${sentencePart(LP_WORDS.classFundTerms)}.` };
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
 * The input with each name trimmed, as the page reads every name (FA17, FA27; f02a review, answer 2): each LP's, each
 * class's, and each LP's class, so "Seed " and "Seed" are one class. Only a name that is text changes; anything else is
 * left for the engine to refuse where it is (F21, F28).
 */
function trimmedNames(input: unknown): unknown {
  if (!isObject(input)) return input;
  const trimmed = (o: unknown, keys: string[]) => {
    if (!isObject(o)) return o;
    const out: Json = { ...o };
    for (const k of keys) if (typeof out[k] === "string") out[k] = nameOf(out[k] as string);
    return out;
  };
  let out: Json = input;
  if (isObject(input.terms) && Array.isArray(input.terms.lp_classes)) {
    out = { ...out, terms: { ...input.terms, lp_classes: input.terms.lp_classes.map((c: unknown) => trimmed(c, ["name"])) } };
  }
  if (Array.isArray(input.lps)) out = { ...out, lps: input.lps.map((lp: unknown) => trimmed(lp, ["name", "class"])) };
  return out;
}

const SCHEDULE_LATER = "This file has a management fee schedule; the page shows it from the next version.";

/** F30: the fund's terms give a management fee schedule. */
function hasSchedule(input: unknown): boolean {
  return isObject(input) && isObject(input.terms) && input.terms.management_fee !== undefined && input.terms.management_fee !== null;
}

const NOT_A_FUND = 'It isn\'t a fund file: a fund file starts with "format": "spillpoint-fund", and a fund\'s input has as_of, terms and cash_flows.';

/** The part of a fund's input a path names, as a sentence starts: "The amount in row 3 of its cash flows". */
function where(path: string): string {
  const flow = /^cash_flows\[(\d+)\](?:\.(\w+))?$/.exec(path);
  if (flow) return flow[2] ? `The ${flow[2]} in row ${Number(flow[1]) + 1} of its cash flows` : `Row ${Number(flow[1]) + 1} of its cash flows`;
  const lp = /^lps\[(\d+)\](?:\.(\w+))?$/.exec(path);
  if (lp) return lp[2] ? `The ${lp[2]} in row ${Number(lp[1]) + 1} of its LPs` : `Row ${Number(lp[1]) + 1} of its LPs`;
  const step = /^terms\.carry\.steps\[(\d+)\](?:\.(\w+))?$/.exec(path);
  if (step) return stepPlace(step);
  // A class (F22): "The fee rate in row 2 of its LP classes", "Carry step 2's rate in row 1 of its LP classes".
  const cls = /^terms\.lp_classes\[(\d+)\](?:\.(.+))?$/.exec(path);
  if (cls) {
    const row = `row ${Number(cls[1]) + 1} of its LP classes`;
    const field = cls[2];
    if (!field) return `Row ${Number(cls[1]) + 1} of its LP classes`;
    const classStep = /^carry\.steps\[(\d+)\](?:\.(\w+))?$/.exec(field);
    if (classStep) return `${stepPlace(classStep)} in ${row}`;
    const fields: Record<string, string> = { name: "The name", fee_rate: "The fee rate", carry: "The carry", "carry.steps": "The carry steps" };
    return `${fields[field] ?? `\`${field}\``} in ${row}`;
  }
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
    "terms.fee_rate": "Its management fee rate",
    "terms.equalization_rate": "Its equalization interest rate",
    "terms.lp_classes": "Its list of LP classes",
    cash_flows: "Its cash flows",
    lps: "Its list of LPs",
  };
  return named[path] ?? `\`${path}\``;
}

/** A carry step's place, from its match: "Carry step 2", "Carry step 2's rate", "Carry step 2's LP multiple". */
function stepPlace(step: RegExpExecArray): string {
  const n = `Carry step ${Number(step[1]) + 1}`;
  return step[2] === "from_lp_multiple" ? `${n}'s LP multiple` : step[2] ? `${n}'s ${step[2]}` : n;
}

/** A sentence of the page's, after a place and a colon: its first letter down, its full stop off. */
function sentencePart(words: string): string {
  return `${words.charAt(0).toLowerCase()}${words.slice(1).replace(/\.$/, "")}`;
}

/** The engine's refusal of an opened file, in the page's words, naming the row or term (F18). */
export function fileProblem(refusal: FundRefusal): string {
  const { kind, term, path } = refusal;
  if (kind === "unsupported") {
    if (term === "compounded_pref") return `This file has a term the page doesn't model: a pref compounded, not simple (\`${path}\`).`;
    // F21: a per-LP term, such as a side letter's carry. From 0.3.0 an LP's own terms are its class's (F22).
    const lp = /^lps\[(\d+)\]\./.exec(path);
    if (lp) return `This file has a term the page doesn't model: \`${term}\` on an LP (row ${Number(lp[1]) + 1} of its LPs). An LP's terms are its class's, or the fund's.`;
    // F22: a class term beyond the fee rate and the carry, such as a pref of its own.
    const cls = /^terms\.lp_classes\[(\d+)\]\./.exec(path);
    if (cls) {
      return `This file has a term the page doesn't model: \`${term}\` on an LP class (row ${Number(cls[1]) + 1} of its LP classes). A class changes only the fee rate and the carry.`;
    }
    return `This file has a term the page doesn't model: \`${term}\`.`;
  }
  const field: Record<string, string> = {
    bad_number: 'isn\'t a number the page can use: amounts and rates are exact strings, like "8000000" or "0.2", amounts more than zero and nothing negative',
    bad_date: "isn't a date that exists, written YYYY-MM-DD",
    bad_field: "isn't a value it can take",
    missing_field: "is missing",
    unknown_field: "isn't part of a fund's input",
  };
  // F28: a rate the classes or the closes need says why it's needed.
  if (term === "missing_field" && path === "terms.fee_rate") return "Its management fee rate is missing: it's needed when a class has its own fee rate.";
  if (term === "missing_field" && path === "terms.equalization_rate") return "Its equalization interest rate is missing: it's needed when an LP joins at a later close.";
  // F28: the standard fee rate is the one rate that must be above 0, which the amounts' line doesn't say.
  if (term === "bad_number" && path === "terms.fee_rate") return 'Its management fee rate isn\'t a number the page can use: it\'s a rate above 0, written as an exact string like "0.02".';
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
    lp_name_repeated: sentencePart(LP_WORDS.repeated),
    lp_class_name_repeated: sentencePart(LP_WORDS.classRepeated),
    lp_class_unknown: sentencePart(LP_WORDS.classUnknown),
    lp_close_after_distribution: sentencePart(LP_WORDS.closeAfterDistribution),
    call_without_payers: "no LP in the fund on this date pays this call, as none had closed yet or none of them pays fees",
  };
  return `${where(path)}: ${rule[term] ?? refusal.message}.`;
}
