// The cap table the exit waterfall runs on, as the engine holds it after
// reading and checking an input (see input.ts). It mirrors the case-file
// format (ASSUMPTIONS C1–C4), with every number as a 40-digit Decimal (E14).

import type { D } from "./decimal.ts";

export interface Holder {
  id: string;
  name: string;
}

/** Non-participating takes its preference or converts; participating takes both and never converts; capped participating stops at its cap, then may convert (SPEC, Participation types). */
export type Participation = "non_participating" | "participating" | "participating_capped";

/** Recorded for display only: at exit the cap table already reflects every anti-dilution adjustment. */
export type AntiDilution = "none" | "broad_based" | "narrow_based" | "full_ratchet";

export interface CommonStock {
  kind: "common";
  id: string;
  name: string;
}

/** Fully vested options at one strike (E1). Exercised once a common share is worth more than the strike (SPEC, Options and warrants). */
export interface OptionClass {
  kind: "option";
  id: string;
  name: string;
  strike: D;
}

/**
 * Warrants at one strike for one underlying (C4, C15): like options, but for
 * common or for a preferred series. Each warrant decides for itself whether to
 * exercise (E4). Exercised warrant shares for a series become shares of it,
 * with its per-share preference, participation, cap and conversion (E12).
 */
export interface WarrantClass {
  kind: "warrant";
  id: string;
  name: string;
  strike: D;
  /** "common", or the id of a preferred series. */
  underlying: string;
}

/** Cumulative dividends on a preferred series (C5). They add to its preference at 1x (X4). */
export interface CumulativeDividend {
  /** A year's dividend as a fraction of the original issue price: 0.08 for 8%. */
  rate: D;
  /** Simple, Actual/365 (X2); or compounding annually on the accrual start's anniversaries, the part-year simple (X5). */
  method: "simple" | "compounding";
  /** When they start to accrue, as YYYY-MM-DD. */
  accrualStart: string;
  /** Forfeited by a series that converts, or paid on conversion: in cash, in its own tier (X5). */
  onConversion: "forfeited" | "paid";
}

export interface PreferredSeries {
  kind: "preferred";
  id: string;
  name: string;
  /** The price the series was sold at; the preference and the cap are multiples of it. */
  originalIssuePrice: D;
  /** Lowered by anti-dilution; the preference never changes (SPEC, Anti-dilution). */
  conversionPrice: D;
  /** Common shares per preferred share: original issue price ÷ conversion price. */
  conversionRatio: D;
  /** Preference amount = shares × original issue price × this multiple (SPEC, Preference amount). */
  preferenceMultiple: D;
  participation: Participation;
  /** Total return cap as a multiple of the original issue price, preference included (E7). Only for participating_capped. */
  capMultiple: D | null;
  antiDilution: AntiDilution;
  /** What A counts in the weighted-average formula (C10), if the input names it. */
  antiDilutionA: string | null;
  cumulativeDividend: CumulativeDividend | null;
}

export type Security = CommonStock | OptionClass | WarrantClass | PreferredSeries;

/** A group of series that must convert together, decided by a class vote (E11). */
export interface ConversionGroup {
  series: string[];
  /** Share of the group's as-converted shares that must vote yes, as a fraction (0.5 for 50%). */
  voteThreshold: D;
  voteRule: "more_than" | "at_least";
}

/** One holder's shares of one security (E9: payouts are reported per holder × security). */
export interface Position {
  holder: string;
  security: string;
  shares: D;
}

export interface CapTable {
  holders: Holder[];
  securities: Security[];
  /** Preference tiers, most senior first. Series in one tier are pari passu (SPEC, Tiers). */
  seniority: string[][];
  conversionGroups: ConversionGroup[];
  positions: Position[];
  /** Never participates in an exit (SPEC). */
  unissuedPool: D;
}

/** What the engine needs to run an exit: the cap table, the range to analyse, and the exit values to report. */
export interface ExitInput {
  capTable: CapTable;
  /** Breakpoints are reported strictly inside this range (SPEC, Breakpoints). */
  range: [D, D];
  exitValues: D[];
  /** YYYY-MM-DD: the day dividends accrue to. Required when a series has cumulative dividends. */
  exitDate: string | null;
}
