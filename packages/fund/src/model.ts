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
}
