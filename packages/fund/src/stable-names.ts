// The names and words code can match on, stable from 0.1.0 or the version that added them (docs/STABLE.md): every term a refusal names, every reason
// code a breakpoint gives, every way a clawback changes, and FC6's wordings. From 0.1.0 none is renamed or reused for
// something else; a new one can be added, and one stops being given when the fund engine comes to model what it
// refuses.
//
// Each list is the only place a name or a wording can come from: the functions that refuse or give a reason take these
// types and words, so the compiler refuses a name not listed here, and a test holds each list to docs/STABLE.md.

/** An input refusal's terms (F18). */
export const INPUT_TERMS = [
  "bad_number",
  "bad_date",
  "bad_field",
  "missing_field",
  "unknown_field",
  "carry_rate_not_below_one",
  "steps_out_of_order",
  "catch_up_without_pref",
  "catch_up_share_not_above_carry",
  "gp_commitment_not_below_one",
  "no_calls",
  "distribution_before_call",
  "cash_flow_after_distribution_date",
  // From 0.2.0 (F21).
  "lp_name_repeated",
] as const;
export type InputTerm = (typeof INPUT_TERMS)[number];

/**
 * The unsupported terms with a name of their own (F7, F18). Any other unsupported term is the key v1 doesn't model,
 * named by the key itself (`hurdle_irr`), so that list is open.
 */
export const UNSUPPORTED_TERMS = ["compounded_pref"] as const;
export type UnsupportedTerm = (typeof UNSUPPORTED_TERMS)[number];

/** A tier of a run ending (F15): X's own, or the run on the fund's totals' when it bends the clawback. */
export const TIER_REASON_CODES = ["capital_returned", "pref_met", "catch_up_done", "carry_step"] as const;
export type TierReasonCode = (typeof TIER_REASON_CODES)[number];

/** Every reason a breakpoint gives (F15). */
export const REASON_CODES = [...TIER_REASON_CODES, "clawback_cleared", "clawback_starts", "clawback_changes"] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

/** How the clawback owed changes as X grows (F15). v1 has only these: it never rises (FA9). */
export const CLAWBACK_CHANGES = ["starts_to_fall", "stops_falling", "falls_faster", "falls_more_slowly"] as const;
export type ClawbackChange = (typeof CLAWBACK_CHANGES)[number];

/**
 * FC6's wordings: every reason's text is one of these, its blanks filled with an amount, a rate or a multiple as FC6
 * writes them ("$10,890,000", "8%", "3.0x").
 */
export const WORDINGS = {
  capital_returned: (amount: string) => `LPs have their ${amount} of paid-in capital back`,
  pref_met: (rate: string, amount: string) => `LPs have their ${rate} pref, ${amount}`,
  catch_up_done: (carry: string) => `the GP has ${carry} of the profit`,
  carry_step: (multiple: string, rate: string) => `LPs reach ${multiple}: carry is ${rate} from here`,
  clawback_cleared: () => "from here the GP has earned all the carry it was paid earlier",
  clawback_starts: () => "from here the GP has been paid more carry than it has earned",
  /** X's own tier is the cause, and its reason sits beside this one. */
  clawback_changes: (change: string) => `the clawback owed ${change}`,
  /** The run on the fund's totals is the cause, its tier that ended named in TOTALS_WORDINGS's words. */
  clawback_changes_on_totals: (change: string, tier: string) => `the clawback owed ${change}: on the fund's totals, ${tier}`,
} as const;

/** How a clawback change reads (F15). */
export const CHANGE_WORDS: Record<ClawbackChange, string> = {
  starts_to_fall: "starts to fall",
  stops_falling: "stops falling",
  falls_faster: "falls faster",
  falls_more_slowly: "falls more slowly",
};

/** How a clawback change names the tier of the run on the fund's totals that ended (FC6). No amounts. */
export const TOTALS_WORDINGS = {
  capital_returned: () => "LPs have their capital back",
  pref_met: () => "LPs have their pref",
  catch_up_done: (carry: string) => `the GP has ${carry} of the profit`,
  carry_step: (multiple: string, rate: string) => `LPs reach ${multiple}: carry is ${rate} from here`,
} as const satisfies Record<TierReasonCode, (...blanks: string[]) => string>;
