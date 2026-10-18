// The one way the fund engine says no to an input (F18).

import type { InputTerm, UnsupportedTerm } from "./stable-names.ts";

/**
 * "unsupported": a term v1 doesn't model, named by its own key (`hurdle_irr`), or `compounded_pref`. The fund may well
 * have it; reading past it would change the split without saying so.
 * "input": the input is wrong or disagrees with itself, so there's no fund to run.
 */
export type RefusalKind = "unsupported" | "input";

/**
 * A fund input the engine won't run. `kind` and `term` say what's wrong, and `path` where, into the input:
 * "terms.carry.steps[1]", "cash_flows[0].amount", "" for the input itself, and "x" for X. One class for every
 * refusal, so a page catches one, as spillpoint's ImportRefusal. `path` is the engine's name for where (InputError,
 * UnsupportedTermError); the case files call it `field` (FC7).
 */
export class FundRefusal extends Error {
  override name = "FundRefusal";
  readonly kind: RefusalKind;
  readonly term: string;
  readonly path: string;

  constructor(kind: RefusalKind, term: string, path: string, message: string) {
    super(path ? `${path}: ${message}` : message);
    this.kind = kind;
    this.term = term;
    this.path = path;
  }
}

const MESSAGES: Record<InputTerm, string> = {
  bad_number: "not an exact number in range: amounts as exact strings, more than zero; no negative rate or share",
  bad_date: "not a date written YYYY-MM-DD that exists",
  bad_field: "not a value this field can take",
  missing_field: "missing",
  unknown_field: "not a field a fund input has",
  carry_rate_not_below_one: "a carry rate must be below 1",
  steps_out_of_order: "carry steps need rising rates, each from a higher LP multiple above 1, and none on the first step",
  catch_up_without_pref: "a catch-up needs a pref to catch up to",
  catch_up_share_not_above_carry: "the GP's share of the catch-up must be above the carry rate, or it never catches up",
  gp_commitment_not_below_one: "the GP commitment's share must be below 1",
  no_calls: "a fund needs at least one call",
  distribution_before_call: "a distribution comes before the fund's first call",
  cash_flow_after_distribution_date: "a cash flow comes after the distribution date",
  lp_name_repeated: "an earlier LP has this name; no two LPs share one",
};

/** An input refusal: only with a term the stable list has (stable-names.ts). */
export function refuse(term: InputTerm, path: string, message: string = MESSAGES[term]): FundRefusal {
  return new FundRefusal("input", term, path, message);
}

/** An unsupported refusal: `compounded_pref`, or a key v1 doesn't model, named by itself (F18). */
export function unsupported(term: UnsupportedTerm | { key: string }, path: string, what: string): FundRefusal {
  return new FundRefusal("unsupported", typeof term === "string" ? term : term.key, path, what);
}
