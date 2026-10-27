// A fund as the engine holds it once read (SPEC.md, "Inputs"). It mirrors the input, camelCase, so a refusal's path
// into the input (`terms.catch_up.gp_share`) leads to the same place here (`terms.catchUp.gpShare`).

import type { D } from "./decimal.ts";

/** A carry rate and the LP multiple it starts from (F9). The first step starts from the beginning: null. */
export interface CarryStep {
  rate: D;
  fromLpMultiple: D | null;
}

/** The GP commitment (F3): its share g, and whether it pays its share of fee and expense calls. */
export interface GpCommitment {
  share: D;
  paysFees: boolean;
  paysExpenses: boolean;
}

/** The fund's terms, as the input's `terms` gives them, with F9's default carry filled in. */
export interface FundTerms {
  /** One step for flat carry (F9). */
  carry: CarryStep[];
  /** The simple pref (F6), or null for none. */
  pref: { rate: D } | null;
  /** The GP's share of each catch-up dollar (F8), or null for none. */
  catchUp: { gpShare: D } | null;
  gpCommitment: GpCommitment | null;
  /** F22: the fund's standard management fee rate, which a class's own fee rate is set against. Null when not given. */
  feeRate: D | null;
  /** F25: the interest a later-close LP pays on what it catches up, simple, a year. Null when not given. */
  equalizationRate: D | null;
  /** F22: the classes of LPs, in the input's order; empty when there are none. */
  lpClasses: LpClass[];
  /** F30: the management fee schedule that works out the fee calls, or null when they're entered as cash flows. */
  managementFee: ManagementFee | null;
}

/** F30: how often fees are called, on calendar quarters, half-years (January to June, July to December) or years. */
export type FeeFrequency = "quarterly" | "semiannual" | "annual";

/** F30: one step of the management fee, its annual rate on commitments, in force from its date. */
export interface FeeStep {
  rate: D;
  /** The date it's in force from. The first step is in force from the schedule's `start`: null. */
  from: string | null;
}

/**
 * F30: the management fee schedule, as the input gives it, with the default frequency filled in. Its calls are worked
 * out once for the fund (`feeCalls`), and aren't in `cashFlows`, which stays the input's (FA42).
 */
export interface ManagementFee {
  /** The date fees start, usually the initial close, as written. */
  start: string;
  frequency: FeeFrequency;
  /** In the input's order, which is date order (F32). The first rate is above 0 and is the fund's (F22, F30). */
  steps: FeeStep[];
  /** The LPs' total commitments, the fee's base for a fund that doesn't list its LPs; null when not given. */
  commitments: D | null;
}

/**
 * A class of LPs on different terms (F22): a side letter's fee break, its carry break, or both. A class changes only
 * the management fee and the carry; the pref, the catch-up's share and the GP commitment are the fund's.
 */
export interface LpClass {
  /** As written: not trimmed, case-folded or normalized (FA27). */
  name: string;
  /** Its own fee rate, set against the fund's `feeRate`; null when it pays the fund's fees. */
  feeRate: D | null;
  /** Its own carry, as the fund's is: one step for flat. Null when it pays the fund's carry. */
  carry: CarryStep[] | null;
}

export type CallKind = "investment" | "fee" | "expense";

/** One call or distribution, for the whole fund (F2). */
export interface CashFlow {
  /** Its place in the input's list, which a refusal's path names (FA12). */
  index: number;
  date: string;
  type: "call" | "distribution";
  /** A call's kind; null on a distribution. */
  kind: CallKind | null;
  amount: D;
}

/**
 * One LP (F19). Its commitment divides the calls and distributions between the classes' accounts, and its account's
 * amounts between the LPs in it (F23).
 */
export interface Lp {
  /** As written in the input: not trimmed, case-folded or normalized (FA17). */
  name: string;
  commitment: D;
  /** F22: its class's name, or null when it's on the fund's terms. */
  class: string | null;
  /**
   * F25: the date it joined, as the input gives it, or null. A close after the fund's first call is a later close;
   * one on or before it is in from the start.
   */
  close: string | null;
}

export interface Fund {
  asOf: string;
  terms: FundTerms;
  /** In F4's order: by date, calls before distributions, distributions in the order listed. */
  cashFlows: CashFlow[];
  /** D, the date X is distributed on (F14): `distribution_date`, or `as_of` when it isn't given (FA11). */
  distributionDate: string;
  /** X is the fund's last distribution (F12). */
  final: boolean;
  nav: D | null;
  /** The input's LPs in its order (F19); empty when it has none. */
  lps: Lp[];
}
