// The one way the fund engine says no to an input (F18).

/**
 * "unsupported": a term v1 doesn't model, named by its own key (`hurdle_irr`), or `compounded_pref`. The fund may well
 * have it; reading past it would change the split without saying so.
 * "input": the input is wrong or disagrees with itself, so there's no fund to run.
 */
export type RefusalKind = "unsupported" | "input";

/** The terms an input refusal names (F18). An unsupported refusal's term is the key it found, so it isn't listed. */
export type InputTerm =
  | "bad_number"
  | "bad_date"
  | "bad_field"
  | "missing_field"
  | "unknown_field"
  | "carry_rate_not_below_one"
  | "steps_out_of_order"
  | "catch_up_without_pref"
  | "catch_up_share_not_above_carry"
  | "gp_commitment_not_below_one"
  | "no_calls"
  | "distribution_before_call"
  | "cash_flow_after_distribution_date";

/**
 * A fund input the engine won't run. `kind` and `term` say what's wrong, and `field` where, as a path into the input:
 * "terms.carry.steps[1]", "cash_flows[0].amount", "" for the input itself. One class for every refusal, so a page
 * catches one, as spillpoint's ImportRefusal.
 */
export class FundRefusal extends Error {
  override name = "FundRefusal";
  readonly kind: RefusalKind;
  readonly term: string;
  readonly field: string;

  constructor(kind: RefusalKind, term: string, field: string, message: string) {
    super(field ? `${field}: ${message}` : message);
    this.kind = kind;
    this.term = term;
    this.field = field;
  }
}
