// spillpoint: the exit waterfall engine. So far it reads and checks an exit
// input (M2a) and pays out an exit value for given decisions (M2b). Solving
// the decisions and finding the breakpoints arrive in M2c and M2d.

export { D, ONE, TIE, ZERO, moreThan, parseExact, sameAmount, toCents } from "./decimal.ts";
export { InputError, UnsupportedTermError } from "./errors.ts";
export type { Milestone } from "./errors.ts";
export { readCapTable, readCase, readExit } from "./input.ts";
export type { CapTableResolver } from "./input.ts";
export type * from "./model.ts";
export { payout, prepare } from "./waterfall.ts";
export type { Decisions, Payout, PayoutLine, PreparedCapTable, TierPayment } from "./waterfall.ts";
