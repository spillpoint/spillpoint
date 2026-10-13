// spillpoint-fund: how a fund's distribution splits between LPs and GP, tier
// by tier, and any clawback the GP owes. Private until its release step; every
// name here is provisional until a naming review before 0.1.0.
//
//   const fund = readFund(json);                 // check the input (F18)
//   const split = splitAt(fund, "20000000");     // X on D, by tier (F16)
//   const nav = splitAtNav(fund);                // the NAV point, final (F14)
//   const breakpoints = findBreakpoints(fund);   // every X where it bends, and why (F15)
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
export type { CallKind, CarryStep, CashFlow, Fund, FundTerms, GpCommitment } from "./model.ts";

// The split at X on D.
export { splitAt, splitAtNav } from "./waterfall.ts";
export type { Clawback, Split, StepCarry, Tiers } from "./waterfall.ts";

// Every X where the split bends, with its reasons (F15).
export { findBreakpoints } from "./breakpoints.ts";
export type { Breakpoint } from "./breakpoints.ts";
export type { Reason } from "./reasons.ts";

// The names and words code can match on, stable from 0.1.0 (docs/STABLE.md).
export type { ClawbackChange, InputTerm, ReasonCode, TierReasonCode, UnsupportedTerm } from "./stable-names.ts";
