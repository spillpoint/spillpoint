// The Terms tab's form (plan, "The terms: a form", f01i): what it holds, how it's written into the fund's input for the
// engine, and the page's words for a refusal, shown under the field the refusal's path names.
//
// Rates are typed as percents and written exactly, as strings: "7.25" is "0.0725", by moving the decimal point, so
// nothing is rounded however many places are typed. The page reads only what it can't hand the engine (text that isn't
// a number), and hands that to the engine as "", which it refuses; every rule about the terms is the engine's, and its
// refusal says which (F18).

import { D, FundRefusal } from "spillpoint-fund";
import type { CarryStep, FundTerms } from "spillpoint-fund";

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
}

/** What the page writes for text it can't read: not a number, so the engine refuses it where it is. */
export const UNREAD = "";

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
  };
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
  equalizationRateNeeded: "Needed: an LP joins at a later close. Write 0 for none.",
};

/** A carry as the engine reads it, the fund's or a class's: the flat rate, or the steps (F9). */
export function carryInput(carry: CarryForm): unknown {
  const rate = (text: string) => rateFrom(text) ?? UNREAD;
  return carry.mode === "flat"
    ? rate(carry.flat)
    : { steps: carry.steps.map((s, i) => (i === 0 ? { rate: rate(s.rate) } : { rate: rate(s.rate), from_lp_multiple: multipleFrom(s.from) ?? UNREAD })) };
}

/**
 * The terms the engine reads, written from the form. Text that isn't a number goes as "", which the engine refuses
 * at that field's path, so every problem, the page's reading included, comes one at a time in the engine's order (FA2).
 */
export function termsInput(form: TermsForm): Record<string, unknown> {
  const rate = (text: string) => rateFrom(text) ?? UNREAD;
  const terms: Record<string, unknown> = {};
  terms.carry = carryInput(form.carry);
  if (form.pref.on) {
    terms.pref = { rate: rate(form.pref.rate) };
    // F8: a catch-up only with a pref, so the form shows it only then.
    if (form.catchUp.kind !== "none") terms.catch_up = { gp_share: form.catchUp.kind === "full" ? "1" : rate(form.catchUp.share) };
  }
  if (form.gpCommitment.on) {
    terms.gp_commitment = { share: rate(form.gpCommitment.share), pays_fees: form.gpCommitment.paysFees, pays_expenses: form.gpCommitment.paysExpenses };
  }
  // F22, F25: each only when typed; blank leaves it out, which is none.
  if (form.feeRate.trim() !== "") terms.fee_rate = rate(form.feeRate);
  if (form.equalizationRate.trim() !== "") terms.equalization_rate = rate(form.equalizationRate);
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
    // Anything else can only come from a file (f01l): the engine's own words.
    return `The engine can't run this fund: ${refusal.message}.`;
  };
  return { path, message: words() };
}

/**
 * The form control a problem's path names, on any tab: a step's own problem goes to its rate, a cash flow's to its
 * date, an LP's or a class's to its name, the cash flows' to "Add a cash flow", the LPs' to "Add an LP" and the
 * classes' to "Add a class". A class's carry in steps, refused as a whole, has no box of its own: App focuses its first
 * step's rate.
 */
export function controlFor(path: string): string {
  if (/^terms\.(lp_classes\[\d+\]\.)?carry\.steps\[\d+\]$/.test(path)) return `${path}.rate`;
  if (path === "terms.catch_up") return "terms.catch_up.gp_share";
  if (/^cash_flows\[\d+\]$/.test(path)) return `${path}.date`;
  if (/^(lps|terms\.lp_classes)\[\d+\]$/.test(path)) return `${path}.name`;
  return path;
}

/**
 * The tab a problem's path is on: the terms on Terms, but for the classes, which are on LPs with the LPs (F21, F22);
 * everything else on Cash flows.
 */
export function tabFor(path: string): "terms" | "flows" | "lps" {
  if (path === "lps" || path.startsWith("lps[") || path.startsWith("terms.lp_classes")) return "lps";
  return path.startsWith("terms") ? "terms" : "flows";
}

/** What a tab holds, as a sentence names it: "Your last change to the LPs has a problem". */
export const TAB_WORDS = { terms: "terms", flows: "cash flows", lps: "LPs" } as const;
