// Escrow and earnouts (SPEC; ASSUMPTIONS C7, X8): the sale's proceeds arrive
// as a schedule of payments. The waterfall runs on cumulative proceeds, so
// each later payment goes where it would have gone had it all been paid at
// closing. A payment's take for a holder × security is its cumulative payout
// after the payment less its cumulative payout before it. Conversion and
// exercise decisions are re-made at each cumulative amount, so a strike is
// paid in the payment where the option is first exercised. Payments are
// nominal, with no discounting for time; a payment never made leaves the
// earlier takes standing.

import type { Decimal } from "decimal.js";

import { ZERO } from "./decimal.ts";
import { NoAnswerError } from "./errors.ts";
import { solve } from "./decisions.ts";
import type { PaymentSchedule } from "./model.ts";
import type { Decisions, PayoutLine, PreparedCapTable } from "./waterfall.ts";

/** One payment's takes. */
export interface PaymentTake {
  label: string;
  amount: Decimal;
  /** Everything paid so far, this payment included: what the waterfall runs on. */
  cumulative: Decimal;
  /** The decisions at the cumulative amount, re-made as if it had all been paid at closing. */
  decisions: Decisions;
  /**
   * Each holder × security's take: its cumulative payout after this payment
   * less before it. A take is negative when a later payment lowers a running
   * total, as when it tips a series into converting; it is reported as is,
   * never hidden (X8). The takes add up to the payment.
   */
  lines: PayoutLine[];
  holderTotals: Map<string, Decimal>;
  classTotals: Map<string, Decimal>;
  /** Holders whose running total this payment lowers: a payments view warns about each (X8). */
  lowered: string[];
}

/** The takes of each payment in a schedule, in order. */
export function paySchedule(pc: PreparedCapTable, schedule: PaymentSchedule): PaymentTake[] {
  let cumulative = ZERO;
  let before: PayoutLine[] | null = null;
  return schedule.payments.map((payment) => {
    cumulative = cumulative.plus(payment.amount);
    const { answers, complete } = solve(pc, cumulative);
    if (answers.length !== 1 || !complete) {
      // E8: the takes need one answer at each cumulative amount.
      throw new NoAnswerError(
        `Schedule ${schedule.id}: at the cumulative $${cumulative.toFixed(2)} after ${payment.label} there is more than one stable answer, so its takes aren't settled.`,
      );
    }
    const answer = answers[0]!;
    const after = answer.payout.lines;
    const lines = after.map((l, i) => ({ holder: l.holder, security: l.security, amount: l.amount.minus(before?.[i]!.amount ?? ZERO) }));
    const holderTotals = new Map<string, Decimal>();
    const classTotals = new Map<string, Decimal>();
    for (const l of lines) {
      holderTotals.set(l.holder, (holderTotals.get(l.holder) ?? ZERO).plus(l.amount));
      classTotals.set(l.security, (classTotals.get(l.security) ?? ZERO).plus(l.amount));
    }
    // Anything above half a cent of loss is a real fall, not a trace of 40-digit rounding (E14).
    const lowered = [...holderTotals].filter(([, take]) => take.lt("-0.005")).map(([holder]) => holder);
    before = after;
    return { label: payment.label, amount: payment.amount, cumulative, decisions: answer.decisions, lines, holderTotals, classTotals, lowered };
  });
}
