// Reading a fund's input (SPEC.md, "Inputs"), or refusing it (F18).
//
// The order of checks is FA2's, each stage stopping at the first problem:
// 1. Unsupported terms: the keys under `terms` in the file's order, each
//    term's own keys in the file's order, and a compounding that isn't "simple";
//    then from 0.5.0 a pref deal by deal (F37).
// 2. The fields: unknown and missing top-level fields; `as_of`; `terms`
//    (carry, pref, catch-up, GP commitment, then the terms against each other);
//    each cash flow in the list's order; `distribution_date`; `final`; `nav`;
//    from 0.5.0 the investments in order, then `distribution_from` (F37).
// 3. The cash flows against each other and against D; from 0.5.0 then the
//    investments against the cash flows and D (F37).
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
// F32), then `carry_basis`. Stage 3 starts with an entered fee call beside a
// schedule, and counts the schedule's calls among the calls (F30, FA39, FA40).
//
// From 0.5.0 (F37, FA53) each cash flow is checked through in this order: its
// unknown fields in the file's order, a call's `investment` or `share` among
// them; the fields it needs (`amount` not for a write-off); the date; the type;
// a call's kind, or a distribution's; a write-off's own fields, then its
// `investment` missing; the `investment`; the `share`; the amount. Each
// investment: its shape, its unknown keys, `name` then `checks` missing, the
// name, `checks`, each check in order, then the name against the ones before.
//
// null is the same as leaving an optional field out (FA3, FA24, FA41), except
// a carry, the fund's or a class's, whose null could mean "none" or "the
// default", so it's refused.

import { D, ONE, ZERO, exactOrNull, exactRatio } from "./decimal.ts";
import { dayNumber } from "./dates.ts";
import { refuse, SCHEDULE_WITHOUT_PAYERS, unsupported } from "./errors.ts";
import type {
  CallKind,
  CarryBasis,
  CarryStep,
  CashFlow,
  DistributionFrom,
  FeeFrequency,
  FeeStep,
  Fund,
  FundTerms,
  GpCommitment,
  Investment,
  InvestmentCheck,
  Lp,
  LpClass,
  ManagementFee,
} from "./model.ts";
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
  carry_basis: null, // "whole_fund" or "deal_by_deal" (F34)
};
const STEP_KEYS = ["rate", "from_lp_multiple"];
const FEE_STEP_KEYS = ["rate", "from"];
const CLASS_KEYS = ["name", "fee_rate", "carry"];
const TOP_KEYS = ["as_of", "terms", "cash_flows", "distribution_date", "final", "nav", "lps", "investments", "distribution_from"];
const REQUIRED = ["as_of", "terms", "cash_flows"];
const FLOW_KEYS = ["date", "type", "kind", "amount", "investment", "share"];
const FLOW_TYPES: readonly CashFlow["type"][] = ["call", "distribution", "write_off"];
/** F37: what a write-off doesn't have, refused in the file's order. */
const NOT_ON_A_WRITE_OFF = ["kind", "amount", "share"];
const INVESTMENT_KEYS = ["name", "checks"];
const CHECK_KEYS = ["date", "amount"];
const DISTRIBUTION_FROM_KEYS = ["investment", "share"];
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
    // A rate given as an object is stage 2's bad_number, not a term with keys of its own; so is a carry basis, bad_field.
    if (!isObject(value) || key === "fee_rate" || key === "equalization_rate" || key === "carry_basis") continue;
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
  // F35, F37, FA54: no pref deal by deal in 0.5.0, whatever the pref's shape. A carry basis that isn't one of the two
  // words isn't deal by deal here: it's stage 2's bad_field.
  if (terms.carry_basis === "deal_by_deal" && given(terms, "pref")) {
    throw unsupported("deal_by_deal_pref", "terms.pref", "a pref deal by deal isn't modeled in 0.5.0, so neither is a catch-up (F35)");
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
  // F34, F37: one of the two words exactly; null or left out is the whole fund (FA52).
  let carryBasis: CarryBasis = "whole_fund";
  if (given(terms, "carry_basis")) {
    if (terms.carry_basis !== "whole_fund" && terms.carry_basis !== "deal_by_deal") throw refuse("bad_field", "terms.carry_basis");
    carryBasis = terms.carry_basis;
  }
  return {
    carry,
    pref: prefRate && { rate: prefRate },
    catchUp: catchUpShare && { gpShare: catchUpShare },
    gpCommitment,
    feeRate,
    equalizationRate,
    lpClasses,
    managementFee,
    carryBasis,
  };
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

/** F33, F37: how much of what's left of an investment a distribution sells: above 0, at most 1. */
function shareOf(value: unknown, field: string): D {
  const share = exact(value, field);
  if (!share.gt(ZERO) || share.gt(ONE)) throw refuse("bad_number", field);
  return share;
}

/** F18, F37: each cash flow checked through before the next, in FA53's order (the header). */
function readFlows(raw: unknown): CashFlow[] {
  if (!Array.isArray(raw)) throw refuse("bad_field", "cash_flows");
  return raw.map((f: unknown, index): CashFlow => {
    const field = `cash_flows[${index}]`;
    if (!isObject(f)) throw refuse("bad_field", field);
    // F37: a call has no investment and no share. FA52: null on one is left out, not refused.
    const onACall = (key: string) => f.type === "call" && (key === "investment" || key === "share") && given(f, key);
    for (const key of Object.keys(f)) if (!FLOW_KEYS.includes(key) || onACall(key)) throw refuse("unknown_field", `${field}.${key}`);
    // F33: a write-off has no amount, by the type as given.
    for (const key of f.type === "write_off" ? ["date", "type"] : ["date", "type", "amount"]) if (!given(f, key)) throw refuse("missing_field", `${field}.${key}`);
    const when = date(f.date, `${field}.date`);
    if (!FLOW_TYPES.includes(f.type as CashFlow["type"])) throw refuse("bad_field", `${field}.type`);
    const type = f.type as CashFlow["type"];
    let kind: CallKind | null = null;
    if (type === "call") {
      if (!given(f, "kind")) throw refuse("missing_field", `${field}.kind`);
      if (!CALL_KINDS.includes(f.kind as CallKind)) throw refuse("bad_field", `${field}.kind`);
      kind = f.kind as CallKind;
    } else if (type === "distribution" && given(f, "kind")) {
      // FA12: a distribution has no kind.
      throw refuse("unknown_field", `${field}.kind`);
    }
    if (type === "write_off") {
      // F37, FA52: a write-off has no kind, amount or share, null being left out; it needs its investment.
      for (const key of Object.keys(f)) if (NOT_ON_A_WRITE_OFF.includes(key) && given(f, key)) throw refuse("unknown_field", `${field}.${key}`);
      if (!given(f, "investment")) throw refuse("missing_field", `${field}.investment`);
    }
    // F33, F37: a distribution's investment and share, or a write-off's investment. A share sells part of an investment,
    // so it needs one named.
    let investment: string | null = null;
    let share: D | null = null;
    if (type !== "call") {
      if (given(f, "investment")) {
        // FA52: an investment's name as LP names are: text, not blank, compared exactly as written.
        if (typeof f.investment !== "string" || blank(f.investment)) throw refuse("bad_field", `${field}.investment`);
        investment = f.investment;
      } else if (given(f, "share")) {
        throw refuse("missing_field", `${field}.investment`);
      }
      if (type === "distribution") share = given(f, "share") ? shareOf(f.share, `${field}.share`) : ONE;
    }
    let amount: D | null = null;
    if (type !== "write_off") {
      amount = exact(f.amount, `${field}.amount`);
      if (!amount.gt(ZERO)) throw refuse("bad_number", `${field}.amount`);
    }
    return { index, date: when, type, kind, amount, investment, share };
  });
}

/**
 * F33, F37: the fund's investments, each checked through before the next (FA53): its shape, its unknown keys in the
 * file's order, `name` then `checks` missing, the name, `checks`, each check in order (its shape, its unknown keys,
 * `date` then `amount` missing, the date, the amount), then its name against the ones before. Left out, null or an empty
 * list: none (FA52).
 */
function readInvestments(raw: unknown): Investment[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw refuse("bad_field", "investments");
  const names = new Set<string>();
  return raw.map((inv: unknown, i): Investment => {
    const field = `investments[${i}]`;
    if (!isObject(inv)) throw refuse("bad_field", field);
    for (const key of Object.keys(inv)) if (!INVESTMENT_KEYS.includes(key)) throw refuse("unknown_field", `${field}.${key}`);
    for (const key of INVESTMENT_KEYS) if (!given(inv, key)) throw refuse("missing_field", `${field}.${key}`);
    if (typeof inv.name !== "string" || blank(inv.name)) throw refuse("bad_field", `${field}.name`);
    if (!Array.isArray(inv.checks) || inv.checks.length === 0) throw refuse("bad_field", `${field}.checks`);
    const checks = inv.checks.map((c: unknown, j): InvestmentCheck => {
      const at = `${field}.checks[${j}]`;
      if (!isObject(c)) throw refuse("bad_field", at);
      for (const key of Object.keys(c)) if (!CHECK_KEYS.includes(key)) throw refuse("unknown_field", `${at}.${key}`);
      for (const key of CHECK_KEYS) if (!given(c, key)) throw refuse("missing_field", `${at}.${key}`);
      const when = date(c.date, `${at}.date`);
      // F33: a check is the fund's cost, an exact amount above 0.
      const amount = exact(c.amount, `${at}.amount`);
      if (!amount.gt(ZERO)) throw refuse("bad_number", `${at}.amount`);
      return { date: when, amount };
    });
    // F37: no two investments share a name, compared exactly as written (FA52), checked once its checks are read.
    if (names.has(inv.name)) throw refuse("investment_name_repeated", `${field}.name`);
    names.add(inv.name);
    return { name: inv.name, checks };
  });
}

/** F14, F37: X's source, its shape, its unknown keys in the file's order, its investment, then its share. Null: none (FA52). */
function readDistributionFrom(raw: unknown): DistributionFrom | null {
  if (raw === undefined || raw === null) return null;
  const at = "distribution_from";
  if (!isObject(raw)) throw refuse("bad_field", at);
  for (const key of Object.keys(raw)) if (!DISTRIBUTION_FROM_KEYS.includes(key)) throw refuse("unknown_field", `${at}.${key}`);
  if (!given(raw, "investment")) throw refuse("missing_field", `${at}.investment`);
  if (typeof raw.investment !== "string" || blank(raw.investment)) throw refuse("bad_field", `${at}.investment`);
  return { investment: raw.investment, share: given(raw, "share") ? shareOf(raw.share, `${at}.share`) : ONE };
}

/**
 * Stage 3, from 0.5.0 (F37), after the cash flows against each other and D. On the whole fund the investments are
 * checked as deal by deal, and a distribution without one, or no `distribution_from`, is fine (FA55):
 * - a check after D: the first in the investments' order, then its checks';
 * - deal by deal, no investments;
 * - each distribution and write-off in the input's order: deal by deal, a distribution naming none; an investment not
 *   listed; one dated before its investment's first check (a write-off as a distribution, FA56);
 * - `distribution_from`: deal by deal, missing; an investment not listed;
 * - the cost made by a check's date more than the investment calls to then (FA53): checks in date order, on one date in
 *   the investments' order then the checks', each with every check on or before its date, so the first check of a date
 *   that runs past the calls is named.
 */
function checkInvestments(flows: CashFlow[], investments: Investment[], from: DistributionFrom | null, basis: CarryBasis, d: number): void {
  investments.forEach((inv, i) =>
    inv.checks.forEach((c, j) => {
      if (dayNumber(c.date)! > d) throw refuse("cash_flow_after_distribution_date", `investments[${i}].checks[${j}]`);
    }),
  );
  const dealByDeal = basis === "deal_by_deal";
  if (dealByDeal && investments.length === 0) throw refuse("missing_field", "investments");
  const firstCheck = new Map(investments.map((inv) => [inv.name, Math.min(...inv.checks.map((c) => dayNumber(c.date)!))]));
  for (const f of flows) {
    if (f.type === "call") continue;
    const at = `cash_flows[${f.index}]`;
    if (f.investment === null) {
      // F35: deal by deal, every distribution is from an investment; a write-off always names one.
      if (dealByDeal) throw refuse("missing_field", `${at}.investment`);
      continue;
    }
    const first = firstCheck.get(f.investment);
    if (first === undefined) throw refuse("investment_unknown", `${at}.investment`);
    if (dayNumber(f.date)! < first) throw refuse("investment_not_made", at);
  }
  if (from === null) {
    if (dealByDeal) throw refuse("missing_field", "distribution_from");
  } else if (!firstCheck.has(from.investment)) {
    throw refuse("investment_unknown", "distribution_from.investment");
  }
  // F37: checks aren't calls, but the cost made by any check's date can't be more than the investment calls to then.
  // Calls come before checks on one date (F33). The sort is stable, so one date's checks stay in the investments' order.
  const checks = investments
    .flatMap((inv, i) => inv.checks.map((c, j) => ({ day: dayNumber(c.date)!, amount: c.amount, path: `investments[${i}].checks[${j}].amount` })))
    .sort((a, b) => a.day - b.day);
  const calls = flows.filter((f) => f.type === "call" && f.kind === "investment").map((f) => ({ day: dayNumber(f.date)!, amount: f.amount! }));
  const upTo = (xs: { day: number; amount: D }[], day: number) => xs.filter((x) => x.day <= day).reduce((t, x) => t.plus(x.amount), ZERO);
  const over = checks.find((c) => upTo(checks, c.day).gt(upTo(calls, c.day)));
  if (over) throw refuse("investments_exceed_calls", over.path);
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
  // F37: after `nav`, the investments, then X's source.
  const investments = readInvestments(input.investments);
  const distributionFrom = readDistributionFrom(input.distribution_from);

  // F32: with a schedule, an entered fee call would be counted twice: the first in the input's order is refused.
  if (terms.managementFee) {
    const fee = flows.find((f) => f.kind === "fee");
    if (fee) throw refuse("fee_call_with_schedule", `cash_flows[${fee.index}]`);
  }
  // F4: no calls at all, or a distribution before the first call, is refused; D is on or after every cash flow. The
  // schedule's calls are calls (F30), dated to D (FA39); a period with nothing to call isn't one (FA40). A write-off
  // isn't a distribution, but it's a cash flow after D like any other (FA56).
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
  checkInvestments(flows, investments, distributionFrom, terms.carryBasis, d);

  // Stage 4: the LPs, after everything else (FA19). FA31: a close comes before the first distribution, and before D;
  // a write-off isn't a distribution (FA56).
  const firstDistribution = Math.min(d, ...flows.filter((f) => f.type === "distribution").map((f) => dayNumber(f.date)!));
  const lps = readLps(input.lps, terms.lpClasses, firstDistribution);

  // F4, widened by F33: on one date, calls, then write-offs, then distributions; write-offs and distributions each in
  // the order listed.
  const rank = { call: 0, write_off: 1, distribution: 2 };
  const cashFlows = [...flows].sort((a, b) => dayNumber(a.date)! - dayNumber(b.date)! || rank[a.type] - rank[b.type] || a.index - b.index);
  const unfrozen: Fund = { asOf, terms, cashFlows, distributionDate, final, nav, lps, investments, distributionFrom };
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
