// spillpoint: the exit waterfall engine. It reads and checks an exit input
// (M2a), pays out an exit value for given decisions (M2b), solves who converts
// and who exercises (M2c), and finds every breakpoint with a plain-English
// reason (M2d).

export { D, ONE, TIE, ZERO, moreThan, parseExact, sameAmount, toCents } from "./decimal.ts";
export { InputError, NoAnswerError, UnsupportedTermError } from "./errors.ts";
export type { Milestone } from "./errors.ts";
export { readCapTable, readCase, readExit } from "./input.ts";
export type { CapTableResolver } from "./input.ts";
export type * from "./model.ts";
export { payout, prepare } from "./waterfall.ts";
export type { Decisions, Payout, PayoutLine, PreparedCapTable, TierPayment } from "./waterfall.ts";
export { MAX_CHECKED, solve } from "./decisions.ts";
export type { Answer, Solution, SolveOptions } from "./decisions.ts";
export { findBreakpoints } from "./breakpoints.ts";
export type { Breakpoint } from "./breakpoints.ts";
export type { Reason, ReasonCode } from "./reasons.ts";
