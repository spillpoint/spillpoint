// The Terms tab's form (plan, "The terms: a form", f01i): what it holds, how it's written into the fund's input for the
// engine, and the page's words for a refusal, shown under the field the refusal's path names. From 0.4.0 it holds the
// management fee too: entered as fee calls, or a schedule (plan, "0.4.0: management fees"; F30). From 0.5.0, the carry
// basis: on the whole fund, or deal by deal (plan, "0.5.0: investments and carry deal by deal"; F34). From 0.6.0, each
// fee step's basis: the LPs' commitments, or the fund's invested capital (plan, "0.6.0: fees on invested capital"; F39).
//
// Rates are typed as percents and written exactly, as strings: "7.25" is "0.0725", by moving the decimal point, so
// nothing is rounded however many places are typed. The page reads only what it can't hand the engine (text that isn't
// a number), and hands that to the engine as "", which it refuses; every rule about the terms is the engine's, and its
// refusal says which (F18).

import { D, FundRefusal } from "spillpoint-fund";
import type { CarryBasis, CarryStep, FeeBasis, FeeFrequency, FundTerms } from "spillpoint-fund";

import { exactDollars, parseDollars } from "./format.ts";

export interface StepText {
  rate: string;
  /** The LP multiple the step starts from; the first step has none. */
  from: string;
}

/** A carry as the form holds it, the fund's or a class's: one rate, or steps. */
export interface CarryForm {
  mode: "flat" | "steps";
  flat: string;
  /** Kept while the carry is flat, out of the input, for a way back to them. */
  steps: StepText[];
}

/**
 * A step of the fee schedule's rates (F30): a percent a year, what it's on (F39), and the date it's in force from, ""
 * for the first.
 */
export interface FeeStepText {
  rate: string;
  basis: FeeBasis;
  from: string;
}

/**
 * The management fee: entered as fee calls on the Cash flows tab, or a schedule the engine works the calls out from
 * (F30). The schedule's fields are kept while fees are entered, out of the input, for a way back.
 */
export interface FeeForm {
  mode: "entered" | "schedule";
  /** YYYY-MM-DD, as a date picker gives it; "" until chosen. */
  start: string;
  frequency: FeeFrequency;
  steps: FeeStepText[];
  /**
   * The LPs' total commitments in dollars, the fee's base when the fund lists no LPs and a step is on commitments; ""
   * for none. Kept while no step is on them, out of the input, for a way back (F40).
   */
  commitments: string;
}

export interface TermsForm {
  carry: CarryForm;
  pref: { on: boolean; rate: string };
  /** Shown only with a pref (F8): none is a hard hurdle; full is the GP's share at 100%. */
  catchUp: { kind: "none" | "full" | "partial"; share: string };
  /** F3's flags: fee-free and paying its share of expenses unless the terms say otherwise. */
  gpCommitment: { on: boolean; share: string; paysFees: boolean; paysExpenses: boolean };
  /** F22's standard fee rate: blank is none, left out of the input. */
  feeRate: string;
  /** F25's equalization interest rate: blank is none, left out of the input; "0" is 0%. */
  equalizationRate: string;
  /** F30: the management fee, entered as fee calls or a schedule. */
  managementFee: FeeForm;
  /** F34: carry on the whole fund, or deal by deal. Deal by deal the pref and catch-up are kept here, out of the input. */
  basis: CarryBasis;
}

/** What the page writes for text it can't read: not a number, so the engine refuses it where it is. */
export const UNREAD = "";

/** Where a problem is, as the engine's paths name it, and the page's words for it. */
export interface Problem {
  path: string;
  message: string;
  /**
   * Other places with the same problem, shown with the same words: with a schedule, every Fee row, where the engine
   * names only the first (F32).
   */
  also?: readonly string[];
}

/** Whether a problem is at a path, its own or one of its others. */
export function isAt(problem: Problem | null, path: string): boolean {
  return problem !== null && (problem.path === path || (problem.also ?? []).includes(path));
}

/**
 * What the form starts a term at when it's turned on and the example didn't have it: a pref of 8% a year, a partial
 * catch-up of 50% to the GP, a GP commitment of 1%. Each is in its field, to be changed, never applied unseen.
 */
const STARTING = { pref: "8", catchUpShare: "50", gpCommitment: "1", feeRate: "2" };

/** A rate as the form shows it, a percent with every place: 0.0725 is "7.25". */
export function percentOf(rate: D): string {
  return rate.times(100).toFixed();
}

const NUMBER = /^\s*(\d+(?:\.\d*)?|\.\d+)\s*$/;

/** A percent as typed, "7.25" or "7.25%", as the exact rate the engine reads: "0.0725". Null if it isn't a number. */
export function rateFrom(text: string): string | null {
  const m = NUMBER.exec(text.replace(/%\s*$/, ""));
  if (!m) return null;
  // The point moves two places left, digit by digit, so the rate is exact however long it is.
  const [int, frac = ""] = m[1]!.split(".") as [string, string?];
  const digits = (int || "0").padStart(3, "0");
  const whole = digits.slice(0, -2).replace(/^0+(?=\d)/, "");
  const part = `${digits.slice(-2)}${frac}`.replace(/0+$/, "");
  return part ? `${whole}.${part}` : whole;
}

/** An LP multiple as typed, "3", "3x" or "2.5x", as the exact string the engine reads. Null if it isn't a number. */
export function multipleFrom(text: string): string | null {
  const m = NUMBER.exec(text.replace(/[x×]\s*$/i, ""));
  return m ? new D(m[1]!).toFixed() : null;
}

/** A carry the engine read, the fund's or a class's, as the form holds it. */
export function carryFormFrom(carry: readonly CarryStep[]): CarryForm {
  const steps = carry.map((s) => ({ rate: percentOf(s.rate), from: s.fromLpMultiple ? s.fromLpMultiple.toFixed() : "" }));
  return { mode: steps.length > 1 ? "steps" : "flat", flat: steps[0]!.rate, steps: steps.length > 1 ? steps : [] };
}

/** The form for a fund's terms, as the engine read them; a term the fund doesn't have starts at its usual value. */
export function formFrom(terms: FundTerms): TermsForm {
  const share = terms.catchUp?.gpShare;
  const g = terms.gpCommitment;
  return {
    carry: carryFormFrom(terms.carry),
    pref: { on: terms.pref !== null, rate: terms.pref ? percentOf(terms.pref.rate) : STARTING.pref },
    catchUp: !share ? { kind: "none", share: STARTING.catchUpShare } : share.eq(1) ? { kind: "full", share: STARTING.catchUpShare } : { kind: "partial", share: percentOf(share) },
    gpCommitment: g
      ? { on: true, share: percentOf(g.share), paysFees: g.paysFees, paysExpenses: g.paysExpenses }
      : { on: false, share: STARTING.gpCommitment, paysFees: false, paysExpenses: true },
    feeRate: terms.feeRate ? percentOf(terms.feeRate) : "",
    equalizationRate: terms.equalizationRate ? percentOf(terms.equalizationRate) : "",
    managementFee: feeFormFrom(terms),
    basis: terms.carryBasis,
  };
}

/** The management fee as the form holds it: the schedule as read, or fees entered, with a schedule's starting values. */
function feeFormFrom(terms: FundTerms): FeeForm {
  const m = terms.managementFee;
  if (!m) return { mode: "entered", start: "", frequency: "quarterly", steps: [{ rate: STARTING.feeRate, basis: "commitments", from: "" }], commitments: "" };
  return {
    mode: "schedule",
    start: m.start,
    frequency: m.frequency,
    steps: m.steps.map((s) => ({ rate: percentOf(s.rate), basis: s.basis, from: s.from ?? "" })),
    commitments: m.commitments ? exactDollars(m.commitments) : "",
  };
}

/**
 * Fees entered to a schedule: what was typed comes back, and a start not yet chosen starts at the fund's first call,
 * `firstCall`, in its field to be changed. Fees usually start when the fund first calls capital.
 */
export function toSchedule(fee: FeeForm, firstCall: string): FeeForm {
  return { ...fee, mode: "schedule", start: fee.start || firstCall };
}

/** Flat to steps: the flat rate becomes the first step's, and any steps typed before come back. */
export function toSteps(carry: CarryForm): CarryForm {
  const [first, ...rest] = carry.steps;
  const steps = first ? [{ ...first, rate: carry.flat }, ...rest] : [{ rate: carry.flat, from: "" }];
  return { ...carry, mode: "steps", steps };
}

/** Steps to flat: the first step's rate is the flat rate; the other steps are kept, out of the input, for a way back. */
export function toFlat(carry: CarryForm): CarryForm {
  return { ...carry, mode: "flat", flat: carry.steps[0]?.rate ?? carry.flat };
}

// The page's words, one per kind of field (plan, "Refusals, in plain words").
const WORDS = {
  carryRate: "Write the carry rate as a percent, 0 or more: 20 or 27.5.",
  multiple: "Write the LP multiple this step starts from: 3 or 2.5.",
  prefRate: "Write the pref as a percent a year, above 0: 8 or 7.5.",
  catchUpShare: "Write the GP's share of the catch-up as a percent, up to 100: 50 or 80.",
  gpShare: "Write the GP commitment's share of the fund as a percent: 1 or 2.5.",
  feeRate: "Write the management fee rate as a percent, above 0: 2 or 1.5.",
  equalizationRate: "Write the equalization interest rate as a percent a year, 0 or more: 8 or 0.",
  feeRateNeeded: "Needed: a class has its own fee rate.",
  // F29: only an investment or expense call before a later close is rebalanced with interest; a fee call isn't.
  equalizationRateNeeded: "Needed: an investment or expense call comes before a later close. Write 0 for none.",
  feeStart: "Choose the date fees start on.",
  feeStepRate: "Write the fee rate as a percent a year, 0 or more and below 100: 2 or 1.5.",
  feeFirstRate: "The first rate must be above 0. To start fees later, change the start date.",
  feeStepDate: "Choose the date this rate is in force from.",
  feeStepsOrder: "Each step's date must come after the one before it.",
  feeCommitmentsNeeded: "Needed: the fund lists no LPs, so a fee on commitments is on this total.",
  feeCommitments: "Write the LPs' total commitments in dollars, more than zero: 40000000 or $40M.",
  // F32: the schedule's call_without_payers, a schedule no listed LP pays.
  feeWithoutPayers: "No LP pays this schedule: every LP is in a class at a fee rate of 0.",
  // F40, FA64: a step on invested capital charges the fund's investments, so it needs some.
  feeNeedsInvestments: "A fee on invested capital needs the fund's investments. Add them on the Investments tab.",
};

/** F39: a step of the schedule is on invested capital. */
export function onInvestedCapital(fee: FeeForm): boolean {
  return fee.steps.some((s) => s.basis === "invested_capital");
}

/**
 * F40: the fund lists no LPs and a step is on commitments, so the schedule needs the LPs' total commitments. A schedule
 * wholly on invested capital doesn't.
 */
export function needsCommitments(fee: FeeForm, listsLps: boolean): boolean {
  return !listsLps && fee.steps.some((s) => s.basis === "commitments");
}

/** A carry as the engine reads it, the fund's or a class's: the flat rate, or the steps (F9). */
export function carryInput(carry: CarryForm): unknown {
  const rate = (text: string) => rateFrom(text) ?? UNREAD;
  return carry.mode === "flat"
    ? rate(carry.flat)
    : { steps: carry.steps.map((s, i) => (i === 0 ? { rate: rate(s.rate) } : { rate: rate(s.rate), from_lp_multiple: multipleFrom(s.from) ?? UNREAD })) };
}

/**
 * The LPs' total commitments as the engine reads them, for a fund that lists no LPs (F40); with LPs their commitments
 * are the base. With a step on commitments they're needed: blank is left out, so the engine says they're missing, and
 * text that isn't an amount goes as "". With every step on invested capital they change no amount, but the engine
 * still reads them (FA64), so an amount above zero is kept and a file saves back the same fund; text that isn't one
 * stays out, so no problem lands on a field the form doesn't show (f06c review, answer 3).
 */
function commitmentsInput(fee: FeeForm, listsLps: boolean): Record<string, unknown> {
  if (listsLps || fee.commitments.trim() === "") return {};
  const amount = parseDollars(fee.commitments);
  if (needsCommitments(fee, listsLps)) return { commitments: amount?.toFixed() ?? UNREAD };
  return amount?.gt(0) ? { commitments: amount.toFixed() } : {};
}

/**
 * The schedule as the engine reads it (F30): the start, the frequency written out, the steps with the first's date its
 * start, each on invested capital saying so (F39) and one on commitments without the word, its default (FA63); and,
 * without listed LPs, the LPs' total commitments (F40, above). A field left blank is left out, so the engine says it's
 * missing.
 */
export function feeInput(fee: FeeForm, listsLps: boolean): Record<string, unknown> {
  const rate = (text: string) => rateFrom(text) ?? UNREAD;
  const basis = (s: FeeStepText) => (s.basis === "invested_capital" ? { basis: s.basis } : {});
  return {
    ...(fee.start ? { start: fee.start } : {}),
    frequency: fee.frequency,
    steps: fee.steps.map((s, i) => (i === 0 ? { rate: rate(s.rate), ...basis(s) } : { rate: rate(s.rate), ...basis(s), ...(s.from ? { from: s.from } : {}) })),
    ...commitmentsInput(fee, listsLps),
  };
}

/**
 * The terms the engine reads, written from the form. Text that isn't a number goes as "", which the engine refuses
 * at that field's path, so every problem, the page's reading included, comes one at a time in the engine's order (FA2).
 * `listsLps`: the LPs tab lists LPs, so a schedule's base is their commitments.
 */
export function termsInput(form: TermsForm, listsLps = false): Record<string, unknown> {
  const rate = (text: string) => rateFrom(text) ?? UNREAD;
  const terms: Record<string, unknown> = {};
  terms.carry = carryInput(form.carry);
  // F35, F37: no pref deal by deal in 0.5.0, so no catch-up either; what was typed waits in the form for the whole fund.
  const dealByDeal = form.basis === "deal_by_deal";
  if (form.pref.on && !dealByDeal) {
    terms.pref = { rate: rate(form.pref.rate) };
    // F8: a catch-up only with a pref, so the form shows it only then.
    if (form.catchUp.kind !== "none") terms.catch_up = { gp_share: form.catchUp.kind === "full" ? "1" : rate(form.catchUp.share) };
  }
  if (form.gpCommitment.on) {
    terms.gp_commitment = { share: rate(form.gpCommitment.share), pays_fees: form.gpCommitment.paysFees, pays_expenses: form.gpCommitment.paysExpenses };
  }
  // F34: the whole fund is the default, so only deal by deal is written.
  if (dealByDeal) terms.carry_basis = "deal_by_deal";
  // F22, F25: each only when typed; blank leaves it out, which is none. With a schedule its first rate is the fund's
  // (F30), so the fee rate typed is kept in the form, out of the input.
  const scheduled = form.managementFee.mode === "schedule";
  if (!scheduled && form.feeRate.trim() !== "") terms.fee_rate = rate(form.feeRate);
  if (form.equalizationRate.trim() !== "") terms.equalization_rate = rate(form.equalizationRate);
  if (scheduled) terms.management_fee = feeInput(form.managementFee, listsLps);
  return terms;
}

/** A percent as typed, tidied for a sentence: " 25 % " is "25%". */
export function typed(text: string): string {
  const rate = rateFrom(text);
  return rate === null ? text.trim() : `${percentOf(new D(rate))}%`;
}

/** A multiple as typed, for a sentence: "3" is "3.0x". */
function typedMultiple(text: string): string {
  const m = multipleFrom(text);
  if (m === null) return text.trim();
  return m.includes(".") ? `${m}x` : `${m}.0x`;
}

/** F9's order, worded for the step the engine names, the fund's or a class's: which of its two rules the step breaks. */
export function stepWords(carry: CarryForm, i: number): string {
  const step = carry.steps[i]!;
  const before = carry.steps[i - 1]!;
  const [rate, prevRate] = [rateFrom(step.rate), rateFrom(before.rate)];
  if (rate !== null && prevRate !== null && new D(rate).lte(prevRate)) {
    return `This step's rate must be above ${typed(before.rate)}, the rate of the step before it.`;
  }
  return i === 1
    ? "This step must start from an LP multiple above 1.0x."
    : `This step must start from an LP multiple above ${typedMultiple(before.from)}, where the step before it starts.`;
}

/**
 * The page's words for a refusal of a carry the form wrote, the fund's at `terms.carry` or a class's at
 * `terms.lp_classes[i].carry` (F9, F22), or null when the refusal isn't about one. The words are the same for both.
 */
export function carryWords(refusal: FundRefusal, at: string, carry: CarryForm): string | null {
  const { term, path } = refusal;
  if (path !== at && !path.startsWith(`${at}.`)) return null;
  const step = /^\.steps\[(\d+)\](?:\.(rate|from_lp_multiple))?$/.exec(path.slice(at.length));
  if (term === "carry_rate_not_below_one") return "A carry rate must be below 100%.";
  if (term === "steps_out_of_order" && step) return stepWords(carry, Number(step[1]));
  if (term === "bad_number") {
    if (path === at || step?.[2] === "rate") return WORDS.carryRate;
    if (step?.[2] === "from_lp_multiple") return WORDS.multiple;
  }
  return null;
}

/** The page's words for the engine's refusal of the terms, at the path it names (F18). */
export function termsProblem(refusal: FundRefusal, form: TermsForm): Problem {
  const { term, path } = refusal;
  const words = (): string => {
    const carry = carryWords(refusal, "terms.carry", form.carry);
    if (carry) return carry;
    if (term === "catch_up_share_not_above_carry") {
      const first = form.carry.mode === "flat" ? form.carry.flat : form.carry.steps[0]!.rate;
      return `The GP's share of the catch-up must be above the carry rate, ${typed(first)}, or the catch-up never ends.`;
    }
    if (term === "catch_up_without_pref") return "A catch-up needs a pref to catch up to.";
    if (term === "gp_commitment_not_below_one") return "The GP commitment's share must be below 100%.";
    if (term === "bad_number") {
      if (path === "terms.pref.rate") return WORDS.prefRate;
      if (path === "terms.catch_up.gp_share") return WORDS.catchUpShare;
      if (path === "terms.gp_commitment.share") return WORDS.gpShare;
      if (path === "terms.fee_rate") return WORDS.feeRate;
      if (path === "terms.equalization_rate") return WORDS.equalizationRate;
    }
    // F28: a class's fee rate needs the fund's to be set against; a later close needs the equalization rate.
    if (term === "missing_field" && path === "terms.fee_rate") return WORDS.feeRateNeeded;
    if (term === "missing_field" && path === "terms.equalization_rate") return WORDS.equalizationRateNeeded;
    const fee = feeWords(refusal, form.managementFee);
    if (fee) return fee;
    // Anything else can only come from a file (f01l): the engine's own words.
    return `The engine can't run this fund: ${refusal.message}.`;
  };
  return { path, message: words() };
}

/**
 * F40, FA64: the engine's refusal of a schedule with a step on invested capital and no investments, at `investments`,
 * in the page's words under that step's On: under every step on invested capital, as a Fee row's problem is under every
 * Fee row with a schedule, the first's the one "Show me" goes to. Null for any other refusal: deal by deal's, with no
 * step on invested capital, is the investments' (F37). The engine checks the fee's at the end of stage 2, before deal by
 * deal's in stage 3, so with both it's the fee's.
 */
export function feeInvestmentsProblem(refusal: FundRefusal, form: TermsForm): Problem | null {
  const fee = form.managementFee;
  if (refusal.term !== "missing_field" || refusal.path !== "investments" || fee.mode !== "schedule") return null;
  const paths = fee.steps.flatMap((s, i) => (s.basis === "invested_capital" ? [`terms.management_fee.steps[${i}].basis`] : []));
  if (paths.length === 0) return null;
  const [path, ...also] = paths as [string, ...string[]];
  return { path, message: WORDS.feeNeedsInvestments, ...(also.length > 0 ? { also } : {}) };
}

/** The page's words for the engine's refusal of the schedule the form wrote (F32), or null when it isn't about it. */
function feeWords(refusal: FundRefusal, fee: FeeForm): string | null {
  const { term, path } = refusal;
  const at = "terms.management_fee";
  if (path !== at && !path.startsWith(`${at}.`)) return null;
  if (path === at && term === "call_without_payers") return WORDS.feeWithoutPayers;
  if (path === `${at}.start`) return WORDS.feeStart;
  if (path === `${at}.commitments`) return term === "missing_field" ? WORDS.feeCommitmentsNeeded : WORDS.feeCommitments;
  const step = /^\.steps\[(\d+)\](?:\.(rate|from))?$/.exec(path.slice(at.length));
  if (!step) return null;
  if (term === "steps_out_of_order") return WORDS.feeStepsOrder;
  if (step[2] === "from") return WORDS.feeStepDate;
  if (step[2] !== "rate") return null;
  // F32: the first rate must be above 0, since a fee holiday at the start is a later start date.
  const typedRate = rateFrom(fee.steps[Number(step[1])]?.rate ?? "");
  return step[1] === "0" && typedRate !== null && new D(typedRate).isZero() ? WORDS.feeFirstRate : WORDS.feeStepRate;
}

/**
 * The form control a problem's path names, on any tab: a carry step's own problem goes to its rate, a fee step's to its
 * date, a cash flow's or a check's to its date, an LP's, a class's or an investment's to its name, X's source to its
 * investment, the cash flows' to "Add a cash flow", the investments' to "Add an investment", the LPs' to "Add an LP"
 * and the classes' to "Add a class". A class's carry in steps, refused as a whole, has no box of its own: App focuses
 * its first step's rate.
 */
export function controlFor(path: string): string {
  if (/^terms\.(lp_classes\[\d+\]\.)?carry\.steps\[\d+\]$/.test(path)) return `${path}.rate`;
  // A fee step out of order is about its date (F32).
  if (/^terms\.management_fee\.steps\[\d+\]$/.test(path)) return `${path}.from`;
  if (path === "terms.catch_up") return "terms.catch_up.gp_share";
  // F37: a cash flow before its investment's first check, or a check after D, is about its date.
  if (/^(cash_flows|investments\[\d+\]\.checks)\[\d+\]$/.test(path)) return `${path}.date`;
  if (/^(lps|terms\.lp_classes|investments)\[\d+\]$/.test(path)) return `${path}.name`;
  // F37: deal by deal, X's source missing is about which investment it comes from.
  if (path === "distribution_from") return "distribution_from.investment";
  return path;
}

/** Where a problem can be: a tab, or X's source, beside X on Payouts (F33, F14). */
export type Place = "terms" | "flows" | "investments" | "lps" | "payouts";

/**
 * The place a problem's path is on: the terms on Terms, but for the classes, which are on LPs with the LPs (F21, F22);
 * the investments on Investments, and X's source beside X (F33); everything else on Cash flows.
 */
export function tabFor(path: string): Place {
  if (path === "lps" || path.startsWith("lps[") || path.startsWith("terms.lp_classes")) return "lps";
  if (path === "investments" || path.startsWith("investments[")) return "investments";
  if (path === "distribution_from" || path.startsWith("distribution_from.")) return "payouts";
  return path.startsWith("terms") ? "terms" : "flows";
}

/**
 * What a place holds, as a sentence names it, and whether it's many things or one: "the LPs have a problem", "X's
 * source has a problem".
 */
export const PLACE_WORDS: Record<Place, { name: string; many: boolean }> = {
  terms: { name: "the terms", many: true },
  flows: { name: "the cash flows", many: true },
  investments: { name: "the investments", many: true },
  lps: { name: "the LPs", many: true },
  payouts: { name: "X's source", many: false },
};
