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
  /** F34, from 0.5.0: the carry basis, `"whole_fund"` when the input doesn't give one. */
  carryBasis: CarryBasis;
}

/**
 * F34: carry on the whole fund (F1, the default), or deal by deal, where tier 1 at each distribution runs only to what's
 * due on the investments exited or written off so far (F35).
 */
export type CarryBasis = "whole_fund" | "deal_by_deal";

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

/** One call, distribution or, from 0.5.0, write-off, for the whole fund (F2, F33). */
export interface CashFlow {
  /** Its place in the input's list, which a refusal's path names (FA12). */
  index: number;
  date: string;
  /** From 0.5.0 also `"write_off"`: the end of what's left of an investment, with no proceeds (F33). */
  type: "call" | "distribution" | "write_off";
  /** A call's kind; null on a distribution and a write-off. */
  kind: CallKind | null;
  /** From 0.5.0 null on a write-off, which has no amount (F33). */
  amount: D | null;
  /** F33, from 0.5.0: the investment a distribution comes from, or a write-off ends; null on a call, and on a distribution without one. */
  investment: string | null;
  /** F33, from 0.5.0: how much of what's left of its investment a distribution sells, 1 by default; null on a call and a write-off. */
  share: D | null;
}

/** F33, from 0.5.0: one of the fund's investments, as the input lists it. */
export interface Investment {
  /** As written: not trimmed, case-folded or normalized (FA52). */
  name: string;
  /** In the input's order; one or more. A follow-on is another check. */
  checks: InvestmentCheck[];
}

/** F33: a check, the fund's cost, a whole-fund amount with the GP commitment's part included, as a call is (F2). */
export interface InvestmentCheck {
  date: string;
  amount: D;
}

/** F33, F14, from 0.5.0: X's source, the investment it comes from and how much of what's left of it X sells. */
export interface DistributionFrom {
  investment: string;
  /** 1 by default. */
  share: D;
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
  /**
   * In F4's order, widened by F33: by date; on one date calls, then write-offs, then distributions; write-offs and
   * distributions each in the order listed.
   */
  cashFlows: CashFlow[];
  /** D, the date X is distributed on (F14): `distribution_date`, or `as_of` when it isn't given (FA11). */
  distributionDate: string;
  /** X is the fund's last distribution (F12). */
  final: boolean;
  nav: D | null;
  /** The input's LPs in its order (F19); empty when it has none. */
  lps: Lp[];
  /** F33, from 0.5.0: the input's investments in its order; empty when it has none. */
  investments: Investment[];
  /** F33, F14, from 0.5.0: X's source; null when the input doesn't give one. */
  distributionFrom: DistributionFrom | null;
}
