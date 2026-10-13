// Numbers for the fund waterfall (F17).
//
// Every amount, rate and multiple is a decimal.js value at 40 significant
// digits, as in the spillpoint engine. Pref accrues Actual/365, so most amounts
// with a pref don't terminate; 40 digits agree with the reference's exact
// fractions to far less than a cent. No JavaScript float ever carries money.

import { Decimal } from "decimal.js";

/** The fund engine's Decimal: 40 significant digits, half-up rounding. */
export const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP, toExpNeg: -60, toExpPos: 60 });
export type D = Decimal;
