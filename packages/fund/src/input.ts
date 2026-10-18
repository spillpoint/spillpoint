// Reading a fund's input (SPEC.md, "Inputs"), or refusing it (F18).
//
// The order of checks is FA2's, each stage stopping at the first problem:
// 1. Unsupported terms: the keys under `terms` in the file's order, each
//    term's own keys in the file's order, and a compounding that isn't "simple".
// 2. The fields: unknown and missing top-level fields; `as_of`; `terms`
//    (carry, pref, catch-up, GP commitment, then the terms against each other);
//    each cash flow in the list's order; `distribution_date`; `final`; `nav`.
// 3. The cash flows against each other and against D.
// 4. The LPs (F21, FA19): `lps` itself, then each LP in the list's order,
//    checked through before the next: its shape and its fields, that the name
//    and commitment are there, the name, the commitment, then whether the name
//    repeats.
//
// null is the same as leaving an optional field out (FA3), except `carry`,
// whose null could mean "none" or "the default", so it's refused.

import { D, ONE, ZERO, exactOrNull } from "./decimal.ts";
import { dayNumber } from "./dates.ts";
import { refuse, unsupported } from "./errors.ts";
import type { CallKind, CarryStep, CashFlow, Fund, FundTerms, GpCommitment, Lp } from "./model.ts";

type Json = Record<string, unknown>;

const TERM_KEYS: Record<string, readonly string[] | null> = {
  carry: null, // a rate, or { steps }, checked below
  pref: ["rate", "compounding"],
  catch_up: ["gp_share"],
  gp_commitment: ["share", "pays_fees", "pays_expenses"],
};
const STEP_KEYS = ["rate", "from_lp_multiple"];
const TOP_KEYS = ["as_of", "terms", "cash_flows", "distribution_date", "final", "nav", "lps"];
const REQUIRED = ["as_of", "terms", "cash_flows"];
const FLOW_KEYS = ["date", "type", "kind", "amount"];
const CALL_KINDS: readonly CallKind[] = ["investment", "fee", "expense"];
const LP_KEYS = ["name", "commitment"];
/** F9: carry is 20% when the terms don't give it. */
const DEFAULT_CARRY = "0.2";

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** null and a missing key are the same (FA3). */
function given(obj: Json, key: string): boolean {
  return obj[key] !== undefined && obj[key] !== null;
}

/** Stage 1 (F7, F18): a term v1 doesn't model, named by its own key. */
function checkUnsupported(terms: unknown): void {
  if (!isObject(terms)) return;
  for (const [key, value] of Object.entries(terms)) {
    const field = `terms.${key}`;
    if (!(key in TERM_KEYS)) throw unsupported({ key }, field, `"${key}" is a term v1 doesn't model`);
    if (!isObject(value)) continue;
    if (key === "carry") {
      for (const [k2, steps] of Object.entries(value)) {
        if (k2 !== "steps") throw unsupported({ key: k2 }, `${field}.${k2}`, `"${k2}" is a carry term v1 doesn't model`);
        if (!Array.isArray(steps)) continue;
        steps.forEach((step, i) => {
          if (!isObject(step)) return;
          for (const k3 of Object.keys(step)) {
            if (!STEP_KEYS.includes(k3)) throw unsupported({ key: k3 }, `${field}.steps[${i}].${k3}`, `"${k3}" is a carry step term v1 doesn't model`);
          }
        });
      }
      continue;
    }
    for (const [k2, v2] of Object.entries(value)) {
      if (!TERM_KEYS[key]!.includes(k2)) throw unsupported({ key: k2 }, `${field}.${k2}`, `"${k2}" is a ${key} term v1 doesn't model`);
      if (key === "pref" && k2 === "compounding" && v2 !== null && v2 !== "simple") {
        throw unsupported("compounded_pref", `${field}.compounding`, "only a simple pref is modeled in v1 (F7)");
      }
    }
  }
}

function exact(value: unknown, field: string): D {
  const x = exactOrNull(value);
  if (x === null) throw refuse("bad_number", field);
  return x;
}

function date(value: unknown, field: string): string {
  if (dayNumber(value) === null) throw refuse("bad_date", field);
  return value as string;
}

function flag(obj: Json, key: string, field: string, otherwise: boolean): boolean {
  if (!given(obj, key)) return otherwise;
  if (typeof obj[key] !== "boolean") throw refuse("bad_field", field);
  return obj[key] as boolean;
}

/** F9, F18: a carry rate is from 0 up to, not including, 1. */
function carryRate(value: unknown, field: string): D {
  const r = exact(value, field);
  if (r.isNegative() && !r.isZero()) throw refuse("bad_number", field);
  if (r.gte(ONE)) throw refuse("carry_rate_not_below_one", field);
  return r;
}

function readCarry(terms: Json): CarryStep[] {
  if (!("carry" in terms)) return [{ rate: new D(DEFAULT_CARRY), fromLpMultiple: null }];
  const carry = terms.carry;
  if (!isObject(carry)) return [{ rate: carryRate(carry, "terms.carry"), fromLpMultiple: null }];
  if (!given(carry, "steps")) throw refuse("missing_field", "terms.carry.steps");
  const raw = carry.steps;
  if (!Array.isArray(raw) || raw.length === 0) throw refuse("bad_field", "terms.carry.steps");
  const steps: CarryStep[] = [];
  raw.forEach((s: unknown, i) => {
    const field = `terms.carry.steps[${i}]`;
    if (!isObject(s)) throw refuse("bad_field", field);
    if (!given(s, "rate")) throw refuse("missing_field", `${field}.rate`);
    const rate = carryRate(s.rate, `${field}.rate`);
    if (i === 0) {
      if (given(s, "from_lp_multiple")) throw refuse("steps_out_of_order", field);
      steps.push({ rate, fromLpMultiple: null });
      return;
    }
    if (!given(s, "from_lp_multiple")) throw refuse("missing_field", `${field}.from_lp_multiple`);
    const multiple = exact(s.from_lp_multiple, `${field}.from_lp_multiple`);
    // F9: rates rising, each from a higher LP multiple above 1.
    const prev = steps[i - 1]!;
    if (rate.lte(prev.rate) || multiple.lte(prev.fromLpMultiple ?? ONE)) throw refuse("steps_out_of_order", field);
    steps.push({ rate, fromLpMultiple: multiple });
  });
  return steps;
}

function termObject(terms: Json, key: string): Json | null {
  if (!given(terms, key)) return null;
  if (!isObject(terms[key])) throw refuse("bad_field", `terms.${key}`);
  return terms[key] as Json;
}

function readTerms(terms: unknown): FundTerms {
  if (!isObject(terms)) throw refuse("bad_field", "terms");
  const carry = readCarry(terms);

  let prefRate: D | null = null;
  const pref = termObject(terms, "pref");
  if (pref) {
    if (!given(pref, "rate")) throw refuse("missing_field", "terms.pref.rate");
    prefRate = exact(pref.rate, "terms.pref.rate");
    if (!prefRate.gt(ZERO)) throw refuse("bad_number", "terms.pref.rate");
  }

  let catchUpShare: D | null = null;
  const catchUp = termObject(terms, "catch_up");
  if (catchUp) {
    if (!given(catchUp, "gp_share")) throw refuse("missing_field", "terms.catch_up.gp_share");
    catchUpShare = exact(catchUp.gp_share, "terms.catch_up.gp_share");
    if (catchUpShare.lt(ZERO) || catchUpShare.gt(ONE)) throw refuse("bad_number", "terms.catch_up.gp_share");
  }

  let gpCommitment: GpCommitment | null = null;
  const gp = termObject(terms, "gp_commitment");
  if (gp) {
    if (!given(gp, "share")) throw refuse("missing_field", "terms.gp_commitment.share");
    const share = exact(gp.share, "terms.gp_commitment.share");
    if (share.lt(ZERO)) throw refuse("bad_number", "terms.gp_commitment.share");
    if (share.gte(ONE)) throw refuse("gp_commitment_not_below_one", "terms.gp_commitment.share");
    // F3: fee-free by default, paying its share of expenses by default.
    gpCommitment = {
      share,
      paysFees: flag(gp, "pays_fees", "terms.gp_commitment.pays_fees", false),
      paysExpenses: flag(gp, "pays_expenses", "terms.gp_commitment.pays_expenses", true),
    };
  }

  // F8: a catch-up needs a pref, and its share must be above the first carry rate.
  if (catchUpShare !== null) {
    if (prefRate === null) throw refuse("catch_up_without_pref", "terms.catch_up");
    if (catchUpShare.lte(carry[0]!.rate)) throw refuse("catch_up_share_not_above_carry", "terms.catch_up.gp_share");
  }
  return { carry, pref: prefRate && { rate: prefRate }, catchUp: catchUpShare && { gpShare: catchUpShare }, gpCommitment };
}

function readFlows(raw: unknown): CashFlow[] {
  if (!Array.isArray(raw)) throw refuse("bad_field", "cash_flows");
  return raw.map((f: unknown, index): CashFlow => {
    const field = `cash_flows[${index}]`;
    if (!isObject(f)) throw refuse("bad_field", field);
    for (const key of Object.keys(f)) if (!FLOW_KEYS.includes(key)) throw refuse("unknown_field", `${field}.${key}`);
    for (const key of ["date", "type", "amount"]) if (!given(f, key)) throw refuse("missing_field", `${field}.${key}`);
    const when = date(f.date, `${field}.date`);
    if (f.type !== "call" && f.type !== "distribution") throw refuse("bad_field", `${field}.type`);
    let kind: CallKind | null = null;
    if (f.type === "call") {
      if (!given(f, "kind")) throw refuse("missing_field", `${field}.kind`);
      if (!CALL_KINDS.includes(f.kind as CallKind)) throw refuse("bad_field", `${field}.kind`);
      kind = f.kind as CallKind;
    } else if (given(f, "kind")) {
      // FA12: a distribution has no kind.
      throw refuse("unknown_field", `${field}.kind`);
    }
    const amount = exact(f.amount, `${field}.amount`);
    if (!amount.gt(ZERO)) throw refuse("bad_number", `${field}.amount`);
    return { index, date: when, type: f.type, kind, amount };
  });
}

/**
 * FA17: a blank name is empty or nothing but whitespace, as `trim` takes it off. The reference lists the same characters
 * one by one, so the two agree on every name.
 */
function blank(name: string): boolean {
  return name.trim() === "";
}

/** Stage 4 (F21, FA19): the fund's LPs, each a name and a commitment (F19). Left out, null or an empty list: none. */
function readLps(raw: unknown): Lp[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw refuse("bad_field", "lps");
  const names = new Set<string>();
  return raw.map((lp: unknown, i): Lp => {
    const field = `lps[${i}]`;
    if (!isObject(lp)) throw refuse("bad_field", field);
    // F21, FA18: a per-LP term v1 doesn't model, such as a side letter's carry, named by its own key, whatever its value.
    for (const key of Object.keys(lp)) {
      if (!LP_KEYS.includes(key)) throw unsupported({ key }, `${field}.${key}`, `"${key}" is a per-LP term v1 doesn't model: every LP is on the same terms (F19)`);
    }
    for (const key of LP_KEYS) if (!given(lp, key)) throw refuse("missing_field", `${field}.${key}`);
    if (typeof lp.name !== "string" || blank(lp.name)) throw refuse("bad_field", `${field}.name`);
    const commitment = exact(lp.commitment, `${field}.commitment`);
    if (!commitment.gt(ZERO)) throw refuse("bad_number", `${field}.commitment`);
    // F19: no two LPs share a name, compared exactly as written (FA17).
    if (names.has(lp.name)) throw refuse("lp_name_repeated", `${field}.name`);
    names.add(lp.name);
    return { name: lp.name, commitment };
  });
}

/**
 * Reads a fund's input as SPEC.md describes it, or throws a FundRefusal naming the kind, the term and the field (F18).
 * The input is parsed JSON: numbers are exact strings, dates ISO.
 */
export function readFund(input: unknown): Fund {
  if (!isObject(input)) throw refuse("bad_field", "");
  checkUnsupported(input.terms);
  for (const key of Object.keys(input)) if (!TOP_KEYS.includes(key)) throw refuse("unknown_field", key);
  for (const key of REQUIRED) if (!(key in input)) throw refuse("missing_field", key);

  const asOf = date(input.as_of, "as_of");
  const terms = readTerms(input.terms);
  const flows = readFlows(input.cash_flows);
  const distributionDate = given(input, "distribution_date") ? date(input.distribution_date, "distribution_date") : asOf;
  const final = flag(input, "final", "final", false);
  let nav: D | null = null;
  if (given(input, "nav")) {
    nav = exact(input.nav, "nav");
    if (nav.isNegative() && !nav.isZero()) throw refuse("bad_number", "nav");
  }

  // F4: no calls at all, or a distribution before the first call, is refused; D is on or after every cash flow.
  const calls = flows.filter((f) => f.type === "call");
  if (calls.length === 0) throw refuse("no_calls", "cash_flows");
  const firstCall = Math.min(...calls.map((f) => dayNumber(f.date)!));
  const early = flows.find((f) => f.type === "distribution" && dayNumber(f.date)! < firstCall);
  if (early) throw refuse("distribution_before_call", `cash_flows[${early.index}]`);
  const d = dayNumber(distributionDate)!;
  const late = flows.find((f) => dayNumber(f.date)! > d);
  if (late) throw refuse("cash_flow_after_distribution_date", `cash_flows[${late.index}]`);

  // Stage 4: the LPs, after everything else (FA19).
  const lps = readLps(input.lps);

  // F4: on one date, calls come before distributions; same-day distributions go in the order listed.
  const cashFlows = [...flows].sort(
    (a, b) => dayNumber(a.date)! - dayNumber(b.date)! || (a.type === b.type ? 0 : a.type === "call" ? -1 : 1) || a.index - b.index,
  );
  const fund: Fund = deepFreeze({ asOf, terms, cashFlows, distributionDate, final, nav, lps });
  readFunds.add(fund);
  return fund;
}

/** The funds readFund returned: frozen, so what's worked out for one can be kept. */
const readFunds = new WeakSet<Fund>();

/** Whether readFund returned this fund. A fund built by hand can change after use, so nothing is kept for it. */
export function wasRead(fund: Fund): boolean {
  return readFunds.has(fund);
}

/** A fund is read once and never changed, so the split can keep what it has worked out for it. Decimals are immutable. */
function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !(value instanceof D)) {
    for (const v of Object.values(value)) deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}
