// spillpoint: who gets what at every exit value, with every breakpoint
// explained in plain English.
//
//   const exit = readExit(json);                         // check the input
//   // or readInputs({ holders, events, exit }) to build the cap table from rounds
//   const table = prepare(exit.capTable);
//   const { answers } = solve(table, new D("20000000"));  // who converts, who gets what
//   const breakpoints = findBreakpoints(table, exit.range);
//
// Everything runs locally: no I/O, no network. Modeling choices are listed in
// docs/ASSUMPTIONS.md; the charter and the signed documents govern, not this.

// Numbers: 40-digit decimals (ASSUMPTIONS E14).
export { D, parseExact, toCents } from "./decimal.ts";

// What the engine refuses, and why.
export { InputError, NoAnswerError, UnsupportedTermError } from "./errors.ts";
export type { Milestone } from "./errors.ts";

// Reading an exit input in the case-file format (ASSUMPTIONS C1–C4, C12).
export { readCapTable, readExit } from "./input.ts";
// Reading a whole input: holders, events and an exit on the cap table after one of them (C2).
export { readInputs } from "./case.ts";
export type { CapTableResolver } from "./input.ts";
export type * from "./model.ts";

// The waterfall for given decisions, the decisions themselves, and the breakpoints.
export { payout, prepare } from "./waterfall.ts";
export type { CarveOutHere, Decisions, Payout, PayoutLine, PreparedCapTable, SeriesHere, TierPayment } from "./waterfall.ts";
export { solve } from "./decisions.ts";
export type { Answer, Solution, SolveOptions } from "./decisions.ts";
export { findBreakpoints } from "./breakpoints.ts";

// Building cap tables from a company's rounds (M4).
export { buildCapTables } from "./rounds.ts";
export type {
  AntiDilutionAdjustment, CapTableAfterEvent, EventDetails, Note, NoteConversion, PayToPlay, PayToPlayHolder, PayToPlaySeries, ProRata, RoundDetails, Safe,
  SafeConversion,
} from "./rounds.ts";
export type { Breakpoint } from "./breakpoints.ts";
export type { Reason, ReasonCode } from "./reasons.ts";
