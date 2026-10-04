// spillpoint: the exit waterfall engine. M2a is the foundation: reading and
// checking an exit input. The waterfall, the decisions and the breakpoint
// finder arrive in M2b–M2d.

export { D, ONE, TIE, ZERO, moreThan, parseExact, sameAmount, toCents } from "./decimal.js";
export { InputError, UnsupportedTermError } from "./errors.js";
export type { Milestone } from "./errors.js";
export { readCapTable, readCase, readExit } from "./input.js";
export type { CapTableResolver } from "./input.js";
export type * from "./model.js";
