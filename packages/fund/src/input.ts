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
//    and commitment are there, the name, the commitment, whether the name
//    repeats, then its class and its close (F28, FA25).
// 5. What the LPs need of the rest (F28, F32): the equalization rate, when an
//    investment or expense call comes before a later close (F29); the
//    schedule's `commitments`, missing or not the LPs' total; then each entered
//    call in date order for an LP in the fund at its date to pay it.
//
// Within `terms`, stage 1 takes each class's keys and its carry's among them,
// and the schedule's keys and its steps' among them. Stage 2 reads the fund's
// own terms, then `fee_rate`, `equalization_rate`, the schedule (its shape,
// `start`, `frequency`, each step in order, `commitments`), `fee_rate` against
// the schedule, and each class in order: its shape, its name, the name
// repeating, its fee rate, its carry, its carry against the catch-up (F28,
// F32). Stage 3 starts with an entered fee call beside a schedule, and counts
// the schedule's calls among the calls (F30, FA39, FA40).
//
// null is the same as leaving an optional field out (FA3, FA24, FA41), except
// a carry, the fund's or a class's, whose null could mean "none" or "the
// default", so it's refused.

import { D, ONE, ZERO, exactOrNull, exactRatio } from "./decimal.ts";
import { dayNumber } from "./dates.ts";
import { refuse, SCHEDULE_WITHOUT_PAYERS, unsupported } from "./errors.ts";
import type { CallKind, CarryStep, CashFlow, FeeFrequency, FeeStep, Fund, FundTerms, GpCommitment, Lp, LpClass, ManagementFee } from "./model.ts";
import { PERIODS, schedulePeriods } from "./schedule.ts";

type Json = Record<string, unknown>;

const TERM_KEYS: Record<string, readonly string[] | null> = {
  carry: null, // a rate, or { steps }, checked below
  pref: ["rate", "compounding"],
  catch_up: ["gp_share"],
  gp_commitment: ["share", "pays_fees", "pays_expenses"],
  fee_rate: null, // a rate (F22)
  equalization_rate: null, // a rate (F25)
  lp_classes: null, // a list of classes, checked below (F22)
  management_fee: ["start", "frequency", "steps", "commitments"], // the schedule (F30)
};
const STEP_KEYS = ["rate", "from_lp_multiple"];
const FEE_STEP_KEYS = ["rate", "from"];
const CLASS_KEYS = ["name", "fee_rate", "carry"];
const TOP_KEYS = ["as_of", "terms", "cash_flows", "distribution_date", "final", "nav", "lps"];
const REQUIRED = ["as_of", "terms", "cash_flows"];
const FLOW_KEYS = ["date", "type", "kind", "amount"];
const CALL_KINDS: readonly CallKind[] = ["investment", "fee", "expense"];
const LP_KEYS = ["name", "commitment", "class", "close"];
const REQUIRED_LP = ["name", "commitment"];
/** F9: carry is 20% when the terms don't give it. */
const DEFAULT_CARRY = "0.2";

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** null and a missing key are the same (FA3). */
function given(obj: Json, key: string): boolean {
  return obj[key] !== undefined && obj[key] !== null;
}

/** A carry's own keys, the fund's or a class's (F9): only `steps`, and each step's `rate` and `from_lp_multiple`. */
function checkUnsupportedCarry(carry: unknown, field: string): void {
  if (!isObject(carry)) return;
  for (const [k2, steps] of Object.entries(carry)) {
    if (k2 !== "steps") throw unsupported({ key: k2 }, `${field}.${k2}`, `"${k2}" is a carry term v1 doesn't model`);
    if (!Array.isArray(steps)) continue;
    steps.forEach((step, i) => {
      if (!isObject(step)) return;
      for (const k3 of Object.keys(step)) {
        if (!STEP_KEYS.includes(k3)) throw unsupported({ key: k3 }, `${field}.steps[${i}].${k3}`, `"${k3}" is a carry step term v1 doesn't model`);
      }
    });
  }
}

/**
 * F28: a class changes only its fee and its carry (F22), so any other field, a class's own pref for one, is a term the
 * engine doesn't model, named by its own key. Its carry's keys are checked at the carry's place among them (FA25).
 */
function checkUnsupportedClasses(classes: unknown): void {
  if (!Array.isArray(classes)) return;
  classes.forEach((c: unknown, i) => {
    if (!isObject(c)) return;
    for (const [key, value] of Object.entries(c)) {
      const field = `terms.lp_classes[${i}].${key}`;
      if (!CLASS_KEYS.includes(key)) throw unsupported({ key }, field, `"${key}" is a class term the engine doesn't model: a class changes only its fee and its carry (F22)`);
      if (key === "carry") checkUnsupportedCarry(value, field);
    }
  });
}

/**
 * F32: a schedule's fields are `start`, `frequency`, `steps` and `commitments`, and a step's `rate` and `from`: any
 * other, an `offset` or a `basis`, is a fee term the engine doesn't model, named by its own key. The steps' keys are
 * checked at `steps`' place among the schedule's.
 */
function checkUnsupportedSchedule(schedule: unknown): void {
  if (!isObject(schedule)) return;
  for (const [key, steps] of Object.entries(schedule)) {
    const field = `terms.management_fee.${key}`;
    if (!TERM_KEYS.management_fee!.includes(key)) throw unsupported({ key }, field, `"${key}" is a management fee term v1 doesn't model`);
    if (key !== "steps" || !Array.isArray(steps)) continue;
    steps.forEach((step: unknown, i) => {
      if (!isObject(step)) return;
      for (const k of Object.keys(step)) {
        if (!FEE_STEP_KEYS.includes(k)) throw unsupported({ key: k }, `${field}[${i}].${k}`, `"${k}" is a management fee step term v1 doesn't model`);
      }
    });
  }
}

/** Stage 1 (F7, F18): a term v1 doesn't model, named by its own key. */
function checkUnsupported(terms: unknown): void {
  if (!isObject(terms)) return;
  for (const [key, value] of Object.entries(terms)) {
    const field = `terms.${key}`;
    if (!(key in TERM_KEYS)) throw unsupported({ key }, field, `"${key}" is a term v1 doesn't model`);
    if (key === "lp_classes") {
      checkUnsupportedClasses(value);
      continue;
    }
    if (key === "management_fee") {
      checkUnsupportedSchedule(value);
      continue;
    }
    // A rate given as an object is stage 2's bad_number, not a term with keys of its own.
    if (!isObject(value) || key === "fee_rate" || key === "equalization_rate") continue;
    if (key === "carry") {
      checkUnsupportedCarry(value, field);
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
  return readCarryAt(terms.carry, "terms.carry");
}

/** F9: a carry, the fund's or a class's (F22), a rate or steps, refused at its own path. */
function readCarryAt(carry: unknown, at: string): CarryStep[] {
  if (!isObject(carry)) return [{ rate: carryRate(carry, at), fromLpMultiple: null }];
  if (!given(carry, "steps")) throw refuse("missing_field", `${at}.steps`);
  const raw = carry.steps;
  if (!Array.isArray(raw) || raw.length === 0) throw refuse("bad_field", `${at}.steps`);
  const steps: CarryStep[] = [];
  raw.forEach((s: unknown, i) => {
    const field = `${at}.steps[${i}]`;
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

  // F28: the fund's standard fee rate is above 0, since a class's is set against it; equalization interest is 0 or more.
  let feeRate: D | null = null;
  if (given(terms, "fee_rate")) {
    feeRate = exact(terms.fee_rate, "terms.fee_rate");
    if (!feeRate.gt(ZERO)) throw refuse("bad_number", "terms.fee_rate");
  }
  let equalizationRate: D | null = null;
  if (given(terms, "equalization_rate")) {
    equalizationRate = exact(terms.equalization_rate, "terms.equalization_rate");
    if (equalizationRate.lt(ZERO)) throw refuse("bad_number", "terms.equalization_rate");
  }
  const managementFee = readSchedule(terms);
  // F30, F32: with a schedule, the schedule's first rate is the fund's, so a `fee_rate` beside it is refused.
  if (managementFee && feeRate !== null) throw refuse("fee_rate_with_schedule", "terms.fee_rate");
  // F28, F32: a class's own fee rate is set against `fee_rate`, or against the schedule's first rate.
  const lpClasses = readClasses(terms.lp_classes, feeRate !== null || managementFee !== null, catchUpShare);
  return { carry, pref: prefRate && { rate: prefRate }, catchUp: catchUpShare && { gpShare: catchUpShare }, gpCommitment, feeRate, equalizationRate, lpClasses, managementFee };
}

/** F30: a management fee rate is from 0 up to, not including, 1, a year on commitments (F32). */
function feeRate(value: unknown, field: string): D {
  const r = exact(value, field);
  if (r.lt(ZERO) || r.gte(ONE)) throw refuse("bad_number", field);
  return r;
}

/**
 * F30, F32: the management fee schedule, checked through in order: its shape, `start`, `frequency`, each step in turn
 * (its shape, its rate, then its `from`), then `commitments`. Left out or null: none, and the fee calls are entered.
 * FA41: null is the same as leaving out `frequency` (quarterly), `commitments` and the first step's `from`; a null
 * `start`, `steps`, rate or later `from` is missing.
 */
function readSchedule(terms: Json): ManagementFee | null {
  if (!given(terms, "management_fee")) return null;
  const at = "terms.management_fee";
  const raw = terms.management_fee;
  if (!isObject(raw)) throw refuse("bad_field", at);
  if (!given(raw, "start")) throw refuse("missing_field", `${at}.start`);
  const start = date(raw.start, `${at}.start`);
  let frequency: FeeFrequency = "quarterly";
  if (given(raw, "frequency")) {
    // FA41: one of the three words exactly, as written.
    if (typeof raw.frequency !== "string" || !Object.hasOwn(PERIODS, raw.frequency)) throw refuse("bad_field", `${at}.frequency`);
    frequency = raw.frequency as FeeFrequency;
  }
  if (!given(raw, "steps")) throw refuse("missing_field", `${at}.steps`);
  if (!Array.isArray(raw.steps) || raw.steps.length === 0) throw refuse("bad_field", `${at}.steps`);
  const steps: FeeStep[] = [];
  raw.steps.forEach((s: unknown, i) => {
    const field = `${at}.steps[${i}]`;
    if (!isObject(s)) throw refuse("bad_field", field);
    if (!given(s, "rate")) throw refuse("missing_field", `${field}.rate`);
    const rate = feeRate(s.rate, `${field}.rate`);
    if (i === 0) {
      // F32: the first rate is above 0, since a fee holiday is a later `start`; and it's in force from `start`.
      if (rate.isZero()) throw refuse("bad_number", `${field}.rate`);
      if (given(s, "from")) throw refuse("steps_out_of_order", field);
      steps.push({ rate, from: null });
      return;
    }
    if (!given(s, "from")) throw refuse("missing_field", `${field}.from`);
    const from = date(s.from, `${field}.from`);
    // F32, FA46: steps in date order, each after the one before it, the first's date being `start`. Rates in any order.
    if (dayNumber(from)! <= dayNumber(steps[i - 1]!.from ?? start)!) throw refuse("steps_out_of_order", field);
    steps.push({ rate, from });
  });
  let commitments: D | null = null;
  if (given(raw, "commitments")) {
    commitments = exact(raw.commitments, `${at}.commitments`);
    if (!commitments.gt(ZERO)) throw refuse("bad_number", `${at}.commitments`);
  }
  return { start, frequency, steps, commitments };
}

/**
 * F22, F28: the classes, each checked through before the next: its shape, its name, the name repeating, its fee rate,
 * its carry, then its carry against the catch-up. Left out, null or an empty list: none (FA24).
 */
function readClasses(raw: unknown, fundFeeRate: boolean, catchUpShare: D | null): LpClass[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw refuse("bad_field", "terms.lp_classes");
  const names = new Set<string>();
  return raw.map((c: unknown, i): LpClass => {
    const field = `terms.lp_classes[${i}]`;
    if (!isObject(c)) throw refuse("bad_field", field);
    if (!given(c, "name")) throw refuse("missing_field", `${field}.name`);
    if (typeof c.name !== "string" || blank(c.name)) throw refuse("bad_field", `${field}.name`);
    // FA27: class names compare exactly as written, as LP names do (FA17).
    if (names.has(c.name)) throw refuse("lp_class_name_repeated", `${field}.name`);
    names.add(c.name);
    // F22: a class's fee rate is 0 or more, set against the fund's standard rate, which must then be given. The class's
    // own number is checked before the fund's rate is looked for (FA25).
    let feeRate: D | null = null;
    if (given(c, "fee_rate")) {
      feeRate = exact(c.fee_rate, `${field}.fee_rate`);
      if (feeRate.lt(ZERO)) throw refuse("bad_number", `${field}.fee_rate`);
      if (!fundFeeRate) throw refuse("missing_field", "terms.fee_rate");
    }
    // F22: without a carry, the class pays the fund's. A null carry is refused, as the fund's is (FA3, FA24).
    let carry: CarryStep[] | null = null;
    if ("carry" in c) {
      carry = readCarryAt(c.carry, `${field}.carry`);
      // F8, F22: the class's catch-up runs to its own first carry rate, so a catch-up's share must be above it.
      if (catchUpShare !== null && catchUpShare.lte(carry[0]!.rate)) throw refuse("catch_up_share_not_above_carry", `${field}.carry`);
    }
    return { name: c.name, feeRate, carry };
  });
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

/**
 * Stage 4 (F21, FA19): the fund's LPs, each a name and a commitment (F19), and from 0.3.0 a class and a close (F28).
 * Left out, null or an empty list: none. A close must come before `closeLimit`: the first distribution, or D (FA31).
 */
function readLps(raw: unknown, classes: LpClass[], closeLimit: number): Lp[] {
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
    for (const key of REQUIRED_LP) if (!given(lp, key)) throw refuse("missing_field", `${field}.${key}`);
    if (typeof lp.name !== "string" || blank(lp.name)) throw refuse("bad_field", `${field}.name`);
    const commitment = exact(lp.commitment, `${field}.commitment`);
    if (!commitment.gt(ZERO)) throw refuse("bad_number", `${field}.commitment`);
    // F19: no two LPs share a name, compared exactly as written (FA17).
    if (names.has(lp.name)) throw refuse("lp_name_repeated", `${field}.name`);
    names.add(lp.name);
    // F28: a class is a class's name, compared exactly (FA27). null is none: the fund's terms (FA24).
    let cls: string | null = null;
    if (given(lp, "class")) {
      if (typeof lp.class !== "string") throw refuse("bad_field", `${field}.class`);
      if (!classes.some((c) => c.name === lp.class)) throw refuse("lp_class_unknown", `${field}.class`);
      cls = lp.class;
    }
    // F25, F28: a close comes before the fund's first distribution, X's on D included (FA31).
    let close: string | null = null;
    if (given(lp, "close")) {
      close = date(lp.close, `${field}.close`);
      if (dayNumber(close)! >= closeLimit) throw refuse("lp_close_after_distribution", `${field}.close`);
    }
    return { name: lp.name, commitment, class: cls, close };
  });
}

/**
 * F22: an LP's weight in the fee calls, its commitment times its class's fee rate over the fund's. Every weight here
 * is that times the fund's rate, which divides out: its commitment times its class's rate, or the fund's, or 1 when no
 * rate is given at all (and then no class has one, F28). With a schedule the fund's rate is the schedule's first
 * (F30), so a weight is the LP's fee at that rate, a year. Only the weights' proportions are used, except by the
 * schedule, which divides the first rate back out (fees.ts).
 */
export function feeWeight(fund: Fund, lp: Lp): D {
  const terms = fund.terms;
  const cls = lp.class == null ? undefined : (terms.lpClasses ?? []).find((c) => c.name === lp.class);
  return lp.commitment.times(cls?.feeRate ?? terms.feeRate ?? terms.managementFee?.steps[0]?.rate ?? ONE);
}

/** F23: investment and expense calls divide by commitment, fee calls by F22's fee weight. */
export function callWeight(fund: Fund, lp: Lp, kind: CallKind | null): D {
  return kind === "fee" ? feeWeight(fund, lp) : lp.commitment;
}

/** F25: an LP whose close is after the fund's first call joins at a later close. */
export function joinsLater(lp: Lp, firstCall: number): boolean {
  return lp.close != null && dayNumber(lp.close)! > firstCall;
}

/** FA21: an LP is in the fund at a date when it has no close, or its close is on or before that date. */
export function isIn(lp: Lp, day: number): boolean {
  return lp.close == null || dayNumber(lp.close)! <= day;
}

/**
 * F29: an investment or expense call before an LP's later close is rebalanced at the close, with interest, so the fund
 * needs an equalization rate. A fee call isn't: a joiner pays its own back fees, with no interest.
 */
export function needsEqualizationRate(fund: Fund, firstCall: number): boolean {
  return (fund.lps ?? []).some(
    (lp) => joinsLater(lp, firstCall) && fund.cashFlows.some((f) => f.type === "call" && f.kind !== "fee" && dayNumber(f.date)! < dayNumber(lp.close!)!),
  );
}

/**
 * Stage 5 (F28, F32): an investment or expense call before a later close needs an equalization rate (F29); a schedule
 * needs its base, `commitments` without listed LPs, and with them `commitments`, if given, is their total; a schedule
 * needs a listed LP that pays it, as an entered fee call does; then each entered call, in F4's order, needs an LP in
 * the fund at its date to pay it (FA21): for a fee call, one with a fee weight above 0 (F22).
 */
function checkWhatTheLpsNeed(fund: Fund, firstCall: number, raw: Json): void {
  if (fund.terms.equalizationRate === null && needsEqualizationRate(fund, firstCall)) throw refuse("missing_field", "terms.equalization_rate");
  const fee = fund.terms.managementFee;
  if (fee) {
    const at = "terms.management_fee.commitments";
    if (fund.lps.length === 0 && fee.commitments === null) throw refuse("missing_field", at);
    // FA41: compared as a number, exactly, with the commitments as the input writes them: "40000000.00" is 40,000,000.
    if (fund.lps.length > 0 && fee.commitments !== null && !sameTotal(raw)) throw refuse("fee_commitments_mismatch", at);
    // F32: with every listed LP in a class at a fee rate of 0, each of the schedule's calls would be $0. Its calls are
    // every LP's own fee, whatever its close (F29), so the fee weights alone say whether anyone pays them.
    if (fund.lps.length > 0 && !fund.lps.some((lp) => feeWeight(fund, lp).gt(ZERO))) throw refuse("call_without_payers", "terms.management_fee", SCHEDULE_WITHOUT_PAYERS);
  }
  if (fund.lps.length === 0) return;
  for (const f of fund.cashFlows) {
    if (f.type !== "call") continue;
    const day = dayNumber(f.date)!;
    if (!fund.lps.some((lp) => isIn(lp, day) && callWeight(fund, lp, f.kind).gt(ZERO))) throw refuse("call_without_payers", `cash_flows[${f.index}]`);
  }
}

/**
 * F32, FA41: whether the schedule's `commitments` is the LPs' total, exactly. Each is taken as the input writes it, an
 * exact string (FC1) that stages 2 and 4 have read, so commitments written as fractions, "1/3", total exactly as they
 * would on paper, with no rounding at 40 digits between.
 */
function sameTotal(raw: Json): boolean {
  let [num, den] = [0n, 1n];
  for (const lp of raw.lps as Json[]) {
    const [n, d] = exactRatio(lp.commitment)!;
    [num, den] = [num * d + n * den, den * d];
  }
  const [n, d] = exactRatio(((raw.terms as Json).management_fee as Json).commitments)!;
  return num * d === n * den;
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

  // F32: with a schedule, an entered fee call would be counted twice: the first in the input's order is refused.
  if (terms.managementFee) {
    const fee = flows.find((f) => f.kind === "fee");
    if (fee) throw refuse("fee_call_with_schedule", `cash_flows[${fee.index}]`);
  }
  // F4: no calls at all, or a distribution before the first call, is refused; D is on or after every cash flow. The
  // schedule's calls are calls (F30), dated to D (FA39); a period with nothing to call isn't one (FA40).
  const d = dayNumber(distributionDate)!;
  const calls = flows.filter((f) => f.type === "call");
  const scheduled = terms.managementFee ? schedulePeriods(terms.managementFee, d) : [];
  if (calls.length === 0 && scheduled.length === 0) throw refuse("no_calls", "cash_flows");
  const firstCall = Math.min(...calls.map((f) => dayNumber(f.date)!), ...scheduled.map((p) => p.date));
  const early = flows.find((f) => f.type === "distribution" && dayNumber(f.date)! < firstCall);
  if (early) throw refuse("distribution_before_call", `cash_flows[${early.index}]`);
  // FA39: the schedule's calls are never after D, so this is about an entered flow.
  const late = flows.find((f) => dayNumber(f.date)! > d);
  if (late) throw refuse("cash_flow_after_distribution_date", `cash_flows[${late.index}]`);

  // Stage 4: the LPs, after everything else (FA19). FA31: a close comes before the first distribution, and before D.
  const firstDistribution = Math.min(d, ...flows.filter((f) => f.type === "distribution").map((f) => dayNumber(f.date)!));
  const lps = readLps(input.lps, terms.lpClasses, firstDistribution);

  // F4: on one date, calls come before distributions; same-day distributions go in the order listed.
  const cashFlows = [...flows].sort(
    (a, b) => dayNumber(a.date)! - dayNumber(b.date)! || (a.type === b.type ? 0 : a.type === "call" ? -1 : 1) || a.index - b.index,
  );
  const unfrozen: Fund = { asOf, terms, cashFlows, distributionDate, final, nav, lps };
  // Stage 5: what the LPs need of the rest (F28, F32).
  checkWhatTheLpsNeed(unfrozen, firstCall, input);
  const fund: Fund = deepFreeze(unfrozen);
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
