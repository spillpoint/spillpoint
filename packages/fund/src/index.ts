// spillpoint-fund: how a fund's distribution splits between LPs and GP, tier
// by tier, and any clawback the GP owes. On npm from 0.1.0; the names code can
// match on are stable from then (docs/STABLE.md, and the README).
//
//   const fund = readFund(json);                 // check the input (F18)
//   const split = splitAt(fund, "20000000");     // X on D, by tier (F16)
//   const nav = splitAtNav(fund);                // the NAV point, final (F14)
//   split.byLp                                   // each LP's amounts, when the fund lists LPs (F20)
//   split.byAccount                              // each class's account, with two or more (F23, F26)
//   const breakpoints = findBreakpoints(fund);   // every X where it bends, and why (F15, F27)
//   const eq = equalization(fund);               // what moves between LPs at later closes (F25)
//   const fees = feeCalls(fund);                 // a fee schedule's calls, from 0.4.0 (F30)
//
// Everything runs locally: no I/O, no network. Rules are in docs/SPEC.md and
// choices in docs/ASSUMPTIONS.md; the fund's own documents govern, not this.

// Numbers: 40-digit decimals (F17), and amounts to the cent for showing (FC8).
export { D, toCents } from "./decimal.ts";

// What the engine refuses, and why (F18).
export { FundRefusal } from "./errors.ts";
export type { RefusalKind } from "./errors.ts";

// Reading a fund's input.
export { readFund } from "./input.ts";
export type { CallKind, CarryStep, CashFlow, FeeFrequency, FeeStep, Fund, FundTerms, GpCommitment, Lp, LpClass, ManagementFee } from "./model.ts";

// The split at X on D.
export { splitAt, splitAtNav } from "./waterfall.ts";
export type { AccountSplit, Clawback, LpAmounts, Split, StepCarry, Tiers } from "./waterfall.ts";

// Later closes: what the joining LPs pay in and the LPs already in get back, with interest (F25), and from 0.4.0 the
// back fees each joiner pays the manager (F29).
export { equalization } from "./equalization.ts";
export type { Equalization, EqualizationAmounts, LaterClose } from "./equalization.ts";

// A management fee schedule's calls, once for the fund, from 0.4.0 (F30, F31).
export { feeCalls } from "./fees.ts";
export type { FeeCall, LpFee } from "./fees.ts";

// Every X where the split bends, with its reasons (F15).
export { findBreakpoints } from "./breakpoints.ts";
export type { Breakpoint } from "./breakpoints.ts";
export type { Reason } from "./reasons.ts";

// The names and words code can match on, stable from 0.1.0 or the version that added them (docs/STABLE.md).
export type { ClawbackChange, InputTerm, ReasonCode, TierReasonCode, UnsupportedTerm } from "./stable-names.ts";
