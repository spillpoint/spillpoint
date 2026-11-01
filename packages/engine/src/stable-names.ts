// The names code can match on, stable from 1.0 (the naming review, item 17): every term the engine refuses an input
// with, every term an import refuses an export with, every code an import's report notes, and every reason a
// breakpoint gives. From 1.0 a name is never renamed or reused for something else; a new one can be added, and one
// stops being raised when spillpoint comes to model what it refuses.
//
// Each list is the only place a name can come from: the functions that raise or note one take these types, so the
// compiler refuses a name not listed here, and a test holds each list to the README's "Stable from 1.0".

/** UnsupportedTermError's terms: what the engine doesn't model in an input it reads. */
export const UNSUPPORTED_TERMS = [
  "anti_dilution_with_conversions",
  "conversion_groups",
  "cumulative_dividend_in_rounds",
  "discounted_conversion_in_anti_dilution_a",
  "dividends_added_to_conversion",
  "note_compounding_interest",
  "note_post_money_cap",
  "note_with_safe_or_carve_out",
  "pre_money_safe_with_preferred",
  "several_notes",
  "several_safes",
] as const;
export type UnsupportedTerm = (typeof UNSUPPORTED_TERMS)[number];

/** ImportRefusal's terms for an Open Cap Format package (O1–O14). */
export const OCF_TERMS = [
  "after_as_of",
  "ambiguous_file",
  "bad_value",
  "cancellation_behavior_missing",
  "cap_below_preference",
  "class_conversion_mechanism",
  "closed_security",
  "common_conversion_right",
  "compensation_type",
  "conversion_into_preferred",
  "conversion_ratio_mismatch",
  "convertible_mechanism_mismatch",
  "convertible_security",
  "convertible_seniority",
  "convertible_triggers_differ",
  "currency",
  "duplicate_id",
  "duplicate_security",
  "fractional_shares",
  "grant_of_preferred",
  "missing_field",
  "missing_file",
  "no_manifest",
  "not_an_ocf_file",
  "note_accrual_period",
  "note_base_counts_other_convertibles",
  "note_cash_interest",
  "note_compounding",
  "note_day_count",
  "note_mfn",
  "note_rate_periods",
  "ocf_version",
  "pool_overdrawn",
  "quantities_dont_reconcile",
  "return_to_pool_conflict",
  "safe_exit_multiple",
  "several_conversion_rights",
  "several_manifests",
  "split_of_preferred",
  "split_with_derivatives",
  "stock_appreciation_right",
  "too_many_shares",
  "unknown_file_type",
  "unknown_object_type",
  "unknown_security",
  "unknown_stakeholder",
  "unknown_stock_class",
  "unknown_stock_plan",
  "warrant_mechanism",
  "warrant_quantity",
] as const;
export type OcfTerm = (typeof OCF_TERMS)[number];

/** ImportRefusal's terms for an OCX workbook (OX1–OX14). */
export const OCX_TERMS = [
  "bad_date",
  "bad_number",
  "cap_below_preference",
  "class_without_round",
  "conversion_ratio_mismatch",
  "convertibles_mismatch",
  "currency",
  "duplicate_stakeholder",
  "formula_without_value",
  "fractional_shares",
  "grant_for_unknown_class",
  "grant_of_preferred",
  "holdings_mismatch",
  "ledger_without_class",
  "liquidation_preference_mismatch",
  "missing_header",
  "missing_tab",
  "mixed_layout",
  "non_plan_awards",
  "ocx_layout",
  "pool_mismatch",
  "round_without_class",
  "rsus_not_separated",
  "several_notes_in_row",
  "status_mismatch",
  "stock_appreciation_right",
  "total_mismatch",
  "unknown_class_heading",
  "unknown_holdings_header",
  "unknown_security_type",
  "unknown_stakeholder",
  "unknown_status",
  "warrant_for_future_series",
  "warrant_for_unknown_class",
] as const;
export type OcxTerm = (typeof OCX_TERMS)[number];

/** The codes an import's report notes (O10, OX12), for either format. */
export const IMPORT_NOTE_CODES = [
  "common_named_preferred",
  "common_preference_ignored",
  "conversion_ratio_rounded",
  "conversion_rounding_not_modeled",
  "convertible_seniority_ignored",
  "expired_option_left_out",
  "expired_warrant_left_out",
  "formula_totals_skipped",
  "issue_order_default",
  "issue_price_from_ledger",
  "issued_at_other_price",
  "left_out_stakeholder",
  "left_out_stock_class",
  "no_anti_dilution_field",
  "no_carve_out_field",
  "no_conversion_group_field",
  "no_dividend_field",
  "no_financing_history",
  "no_participation_column",
  "no_sale_date_field",
  "no_seniority_field",
  "no_strike_field",
  "not_in_manifest",
  "note_base_other_convertibles_ignored",
  "note_cap_read_as_pre_money",
  "note_from_convertibles_row",
  "participation_cap_includes_preference",
  "rsu_as_option",
  "safe_exit_multiple_read_as_1",
  "safes_combined",
  "unrecognized_field",
  "unrecognized_tab",
  "version_label",
  "warrant_counts_are_maximums",
] as const;
export type ImportNoteCode = (typeof IMPORT_NOTE_CODES)[number];

/** O11, OX12: the four lines every import's report starts with: what neither format has a field for. */
export const NO_FIELD: readonly ImportNoteCode[] = ["no_dividend_field", "no_conversion_group_field", "no_carve_out_field", "no_sale_date_field"];

/**
 * What a breakpoint's reason is about. "other" is a safety net: "Payout slopes change here.", where payouts bend and no
 * specific reason is found. No case produces it.
 */
export const REASON_CODES = [
  "tier_fully_paid",
  "cap_reached",
  "option_in_the_money",
  "warrant_in_the_money",
  "series_converts",
  "safe_cash_out_paid",
  "safe_switches",
  "note_repayment_paid",
  "note_switches",
  "carve_out_tier",
  "payouts_jump",
  "payouts_curve",
  "other",
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];
