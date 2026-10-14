// The payouts as they'd actually be paid (ASSUMPTIONS P1). A paying agent pays whole cents, and payments are commonly
// each holder's amount for each class rounded down to the cent, so no one is paid more than their share and the total
// never comes to more than the price. Every payment the page shows to the cent is the engine's exact amount for that
// holder and security, rounded down; a holder's or a class's total is the sum of its rounded payments, so every figure
// is one a wire could carry. The cents left over aren't paid to any holder. The engine's amounts stay exact; only the
// page rounds, and only payments: not exit values, prices per share, or what a series is owed.

import { D } from "spillpoint";
import type { PayoutLine } from "spillpoint";

import { halfUp } from "./format.ts";

/**
 * 40-digit arithmetic can leave an amount that's a whole number of cents in exact arithmetic a hair under it (E14),
 * which rounding down would cost a cent. Within this, it's on the cent: far below any real fraction of a cent, far
 * above 40 digits' error.
 */
const HAIR = new D("1e-20");

/** One payment, as it would be paid: the exact amount rounded down to the cent. A take that's negative rounds down too. */
export function paidCents(amount: D): D {
  return amount.plus(HAIR).toDecimalPlaces(2, D.ROUND_FLOOR);
}

/** A payout's payments, each holder × security rounded down to the cent, and the totals they make. */
export interface Paid {
  holderTotals: Map<string, D>;
  classTotals: Map<string, D>;
  /** Every payment together. */
  total: D;
}

export function paid(lines: readonly PayoutLine[]): Paid {
  const holderTotals = new Map<string, D>();
  const classTotals = new Map<string, D>();
  let total = new D(0);
  for (const l of lines) {
    const cents = paidCents(l.amount);
    holderTotals.set(l.holder, (holderTotals.get(l.holder) ?? new D(0)).plus(cents));
    classTotals.set(l.security, (classTotals.get(l.security) ?? new D(0)).plus(cents));
    total = total.plus(cents);
  }
  return { holderTotals, classTotals, total };
}

/**
 * What's left over at an exit value, to the cent: the exit value as the table's total shows it, less every payment.
 * It's never negative, and it's under a cent for each payment, plus the exit value's own rounding where it has a
 * fraction of a cent, as only an exact breakpoint does.
 */
export function leftOver(exitValue: D, payments: Paid): D {
  return halfUp(exitValue, 2).minus(payments.total);
}
