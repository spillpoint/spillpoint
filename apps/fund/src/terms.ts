// The Terms tab's form (plan, "The terms: a form", f01i): what it holds, how it's written into the fund's input for the
// engine, and the page's words for a refusal, shown under the field the refusal's path names.
//
// Rates are typed as percents and written exactly, as strings: "7.25" is "0.0725", by moving the decimal point, so
// nothing is rounded however many places are typed. The page reads only what it can't hand the engine (text that isn't
// a number); every rule about the terms is the engine's, and its refusal says which (F18).

import { D, FundRefusal } from "spillpoint-fund";
import type { FundTerms } from "spillpoint-fund";

export interface StepText {
  rate: string;
  /** The LP multiple the step starts from; the first step has none. */
  from: string;
}

export interface TermsForm {
  carry: { mode: "flat" | "steps"; flat: string; steps: StepText[] };
  pref: { on: boolean; rate: string };
  /** Shown only with a pref (F8): none is a hard hurdle; full is the GP's share at 100%. */
  catchUp: { kind: "none" | "full" | "partial"; share: string };
  /** F3's flags: fee-free and paying its share of expenses unless the terms say otherwise. */
  gpCommitment: { on: boolean; share: string; paysFees: boolean; paysExpenses: boolean };
}

/** Where a problem is, as the engine's paths name it, and the page's words for it. */
export interface Problem {
  path: string;
  message: string;
}

/**
 * What the form starts a term at when it's turned on and the example didn't have it: a pref of 8% a year, a partial
 * catch-up of 50% to the GP, a GP commitment of 1%. Each is in its field, to be changed, never applied unseen.
 */
const STARTING = { pref: "8", catchUpShare: "50", gpCommitment: "1" };

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

/** The form for a fund's terms, as the engine read them; a term the fund doesn't have starts at its usual value. */
export function formFrom(terms: FundTerms): TermsForm {
  const steps = terms.carry.map((s) => ({ rate: percentOf(s.rate), from: s.fromLpMultiple ? s.fromLpMultiple.toFixed() : "" }));
  const share = terms.catchUp?.gpShare;
  const g = terms.gpCommitment;
  return {
    carry: { mode: steps.length > 1 ? "steps" : "flat", flat: steps[0]!.rate, steps: steps.length > 1 ? steps : [] },
    pref: { on: terms.pref !== null, rate: terms.pref ? percentOf(terms.pref.rate) : STARTING.pref },
    catchUp: !share ? { kind: "none", share: STARTING.catchUpShare } : share.eq(1) ? { kind: "full", share: STARTING.catchUpShare } : { kind: "partial", share: percentOf(share) },
    gpCommitment: g
      ? { on: true, share: percentOf(g.share), paysFees: g.paysFees, paysExpenses: g.paysExpenses }
      : { on: false, share: STARTING.gpCommitment, paysFees: false, paysExpenses: true },
  };
}

/** Flat to steps: the flat rate becomes the first step's, and any steps typed before come back. */
export function toSteps(form: TermsForm): TermsForm {
  const [first, ...rest] = form.carry.steps;
  const steps = first ? [{ ...first, rate: form.carry.flat }, ...rest] : [{ rate: form.carry.flat, from: "" }];
  return { ...form, carry: { ...form.carry, mode: "steps", steps } };
}

/** Steps to flat: the first step's rate is the flat rate; the other steps are kept, out of the input, for a way back. */
export function toFlat(form: TermsForm): TermsForm {
  return { ...form, carry: { ...form.carry, mode: "flat", flat: form.carry.steps[0]?.rate ?? form.carry.flat } };
}

// The page's words, one per kind of field (plan, "Refusals, in plain words").
const WORDS = {
  carryRate: "Write the carry rate as a percent, 0 or more: 20 or 27.5.",
  multiple: "Write the LP multiple this step starts from: 3 or 2.5.",
  prefRate: "Write the pref as a percent a year, above 0: 8 or 7.5.",
  catchUpShare: "Write the GP's share of the catch-up as a percent, up to 100: 50 or 80.",
  gpShare: "Write the GP commitment's share of the fund as a percent: 1 or 2.5.",
};

/**
 * The terms the engine reads, written from the form, in the engine's order (FA2): carry, pref, catch-up, GP
 * commitment. A field whose text isn't a number is the problem, under that field, and nothing goes to the engine.
 */
export function termsInput(form: TermsForm): { terms: Record<string, unknown> } | { problem: Problem } {
  const terms: Record<string, unknown> = {};
  if (form.carry.mode === "flat") {
    const rate = rateFrom(form.carry.flat);
    if (rate === null) return { problem: { path: "terms.carry", message: WORDS.carryRate } };
    terms.carry = rate;
  } else {
    const steps: Record<string, string>[] = [];
    for (const [i, s] of form.carry.steps.entries()) {
      const at = `terms.carry.steps[${i}]`;
      const rate = rateFrom(s.rate);
      if (rate === null) return { problem: { path: `${at}.rate`, message: WORDS.carryRate } };
      if (i === 0) {
        steps.push({ rate });
        continue;
      }
      const from = multipleFrom(s.from);
      if (from === null) return { problem: { path: `${at}.from_lp_multiple`, message: WORDS.multiple } };
      steps.push({ rate, from_lp_multiple: from });
    }
    terms.carry = { steps };
  }
  if (form.pref.on) {
    const rate = rateFrom(form.pref.rate);
    if (rate === null) return { problem: { path: "terms.pref.rate", message: WORDS.prefRate } };
    terms.pref = { rate };
    // F8: a catch-up only with a pref, so the form shows it only then.
    if (form.catchUp.kind !== "none") {
      const share = form.catchUp.kind === "full" ? "1" : rateFrom(form.catchUp.share);
      if (share === null) return { problem: { path: "terms.catch_up.gp_share", message: WORDS.catchUpShare } };
      terms.catch_up = { gp_share: share };
    }
  }
  if (form.gpCommitment.on) {
    const share = rateFrom(form.gpCommitment.share);
    if (share === null) return { problem: { path: "terms.gp_commitment.share", message: WORDS.gpShare } };
    terms.gp_commitment = { share, pays_fees: form.gpCommitment.paysFees, pays_expenses: form.gpCommitment.paysExpenses };
  }
  return { terms };
}

/** A percent as typed, tidied for a sentence: " 25 % " is "25%". */
function typed(text: string): string {
  const rate = rateFrom(text);
  return rate === null ? text.trim() : `${percentOf(new D(rate))}%`;
}

/** A multiple as typed, for a sentence: "3" is "3.0x". */
function typedMultiple(text: string): string {
  const m = multipleFrom(text);
  if (m === null) return text.trim();
  return m.includes(".") ? `${m}x` : `${m}.0x`;
}

/** F9's order, worded for the step the engine names: which of its two rules the step breaks. */
function stepWords(form: TermsForm, i: number): string {
  const step = form.carry.steps[i]!;
  const before = form.carry.steps[i - 1]!;
  const [rate, prevRate] = [rateFrom(step.rate), rateFrom(before.rate)];
  if (rate !== null && prevRate !== null && new D(rate).lte(prevRate)) {
    return `This step's rate must be above ${typed(before.rate)}, the rate of the step before it.`;
  }
  return i === 1
    ? "This step must start from an LP multiple above 1.0x."
    : `This step must start from an LP multiple above ${typedMultiple(before.from)}, where the step before it starts.`;
}

/** The page's words for the engine's refusal of the terms, at the path it names (F18). */
export function termsProblem(refusal: FundRefusal, form: TermsForm): Problem {
  const { term, path } = refusal;
  const step = /^terms\.carry\.steps\[(\d+)\](?:\.(rate|from_lp_multiple))?$/.exec(path);
  const words = (): string => {
    if (term === "carry_rate_not_below_one") return "A carry rate must be below 100%.";
    if (term === "steps_out_of_order" && step) return stepWords(form, Number(step[1]));
    if (term === "catch_up_share_not_above_carry") {
      const first = form.carry.mode === "flat" ? form.carry.flat : form.carry.steps[0]!.rate;
      return `The GP's share of the catch-up must be above the carry rate, ${typed(first)}, or the catch-up never ends.`;
    }
    if (term === "catch_up_without_pref") return "A catch-up needs a pref to catch up to.";
    if (term === "gp_commitment_not_below_one") return "The GP commitment's share must be below 100%.";
    if (term === "bad_number") {
      if (path === "terms.carry" || step?.[2] === "rate") return WORDS.carryRate;
      if (step?.[2] === "from_lp_multiple") return WORDS.multiple;
      if (path === "terms.pref.rate") return WORDS.prefRate;
      if (path === "terms.catch_up.gp_share") return WORDS.catchUpShare;
      if (path === "terms.gp_commitment.share") return WORDS.gpShare;
    }
    // Anything else can only come from a file (f01l): the engine's own words.
    return `The engine can't run this fund: ${refusal.message}.`;
  };
  return { path, message: words() };
}

/** The form control a problem's path names: a step's own problem goes to its rate. */
export function controlFor(path: string): string {
  if (/^terms\.carry\.steps\[\d+\]$/.test(path)) return `${path}.rate`;
  if (path === "terms.catch_up") return "terms.catch_up.gp_share";
  return path;
}
