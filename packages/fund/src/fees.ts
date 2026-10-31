// Management fees (F29 to F31): the schedule's calls, and every call as the
// waterfall and the equalization count it.
//
// A fee is each LP's own, on its own commitment by F22's fee weight (F29).
// Fee calls come in one of two ways:
// - entered as cash flows, as before. An entered fee call was paid, as the
//   fund made it, by the LPs in at its date (FA21): its rate per unit of fee
//   weight is what they paid, the LPs' part of it (F3), over their fee weights.
//   Every LP's own part of it, as if in from the start, is that rate times its
//   own weight, so in the waterfall the call counts at its full size, the
//   joiners' back fees in it (FA43). With no later close after it, the LPs in
//   at its date are all of them, and it counts as entered;
// - worked out by a schedule (F30): one call a calendar period, each LP's fee
//   its commitment times its class factor times the period's fee factor, the
//   call the LPs' fees over (1 − g) when the GP commitment pays fees. From
//   0.6.0 a step can be on invested capital instead (F39): its days charge the
//   LPs' part of each day's net invested capital (F38), (1 − g) of it, times
//   their fee weights over their commitments, shared between the LPs by fee
//   weight as on commitments. A period with nothing to call isn't a call.
// Either way an LP that joins at a later close owes its own part of each fee
// call before its close, its back fees, paid to the manager (equalization.ts).
// Nothing about fees moves between the LPs. Amounts are 40-digit decimals;
// nothing is rounded here.

import { D, ONE, ZERO } from "./decimal.ts";
import { dayNumber, isoDate } from "./dates.ts";
import { feeWeight, isIn, wasRead } from "./input.ts";
import type { CallKind, CashFlow, Fund } from "./model.ts";
import { investedDays } from "./portfolio.ts";
import { schedulePeriods } from "./schedule.ts";
import type { Period } from "./schedule.ts";

/** One LP's fee for one of the schedule's periods (F31). */
export interface LpFee {
  name: string;
  /** Its own fee, as if in from the start (F29): a joiner's for a period before its close is a back fee. */
  fee: D;
}

/** One of the schedule's fee calls (F30, F31), once for the fund. Every amount exact. */
export interface FeeCall {
  /** The period's first day, or the schedule's `start` for the first. */
  date: string;
  /** The first day it covers: `date`. */
  firstDay: string;
  /** The period's last day. */
  lastDay: string;
  /** The call: the LPs' fees, over (1 − g) when the GP commitment pays fees (F3). */
  call: D;
  /** The LPs' part: their fees added up. */
  lps: D;
  /** The GP commitment's part: g of the call when it pays fees; zero when it's fee-free or there's none. */
  gpCommitment: D;
  /** Each LP's fee, in the input's order; empty when the fund doesn't list its LPs. */
  byLp: LpFee[];
}

/**
 * A call or a distribution as the waterfall and the equalization run it: the entered cash flows, and the schedule's
 * calls among them (FA42). Not exported from the package.
 */
export interface RunFlow {
  date: string;
  day: number;
  type: "call" | "distribution";
  kind: CallKind | null;
  /** The call as made, or the distribution. */
  amount: D;
  /** F3: the GP commitment's part of a call. Zero on a distribution. */
  gpCommitment: D;
  /** The LPs' part of a call as made (F3): paid by the LPs in at its date (FA21), or a schedule's call's LPs' fees. */
  paid: D;
  /** A fee call's: the fee weights of the LPs who paid it as made. An LP's own part is `paid` times its weight over these. */
  paidBy: D;
  /** The LPs' part of a call as the waterfall counts it, every LP in from the start (F25, F29). */
  lps: D;
  /** Its place in the input's `cash_flows` (FA12), or null for one of the schedule's calls. */
  index: number | null;
  /** A schedule's call's: each listed LP's fee, in the input's order (F30). Null for an entered flow. */
  byLp: LpFee[] | null;
}

/** F3: the GP commitment's part of a call, by its kind: g of an investment call, and of an expense or fee call when it pays them. */
export function gpCommitmentPart(fund: Fund, kind: CallKind | null, amount: D): D {
  const g = fund.terms.gpCommitment;
  if (!g) return ZERO;
  const pays = kind === "investment" || (kind === "expense" && g.paysExpenses) || (kind === "fee" && g.paysFees);
  return pays ? g.share.times(amount) : ZERO;
}

const sum = (xs: D[]) => xs.reduce((t, x) => t.plus(x), ZERO);

/** A call or a distribution: a cash flow with an amount (F2). From 0.5.0 a write-off has none (F33). */
type MoneyFlow = CashFlow & { type: "call" | "distribution"; amount: D };

function movesMoney(f: CashFlow): f is MoneyFlow {
  return f.type !== "write_off";
}

/** F22: every listed LP's fee weight added up, in the input's order. */
function allFeeWeights(fund: Fund): D {
  return sum((fund.lps ?? []).map((lp) => feeWeight(fund, lp)));
}

/**
 * The schedule's fee calls to D (F30, F31, F39), once for the fund, in date order: each its date, the days it covers,
 * the call, the LPs' part and the GP commitment's, and each listed LP's fee. Null without a schedule; empty when it
 * starts after D (FA39). A period with nothing to call isn't a call: every day of it at a rate of 0 (FA40), or from
 * 0.6.0 on invested capital with nothing invested (F39). Fresh each time, as a split is: what a caller does to them
 * changes nothing the waterfall keeps.
 */
export function feeCalls(fund: Fund): FeeCall[] | null {
  return scheduleCalls(fund)?.map((c) => ({ ...c, call: new D(c.call), lps: new D(c.lps), gpCommitment: new D(c.gpCommitment), byLp: c.byLp.map((f) => ({ name: f.name, fee: new D(f.fee) })) })) ?? null;
}

const scheduleKept = new WeakMap<Fund, FeeCall[] | null>();

/** The schedule's fee calls as the waterfall and the equalization run them, never handed out (feeCalls copies them). */
function scheduleCalls(fund: Fund): FeeCall[] | null {
  if (scheduleKept.has(fund)) return scheduleKept.get(fund)!;
  const fee = fund.terms.managementFee ?? null;
  let out: FeeCall[] | null = null;
  if (fee) {
    const firstRate = fee.steps[0]!.rate;
    const lps = fund.lps ?? [];
    const g = fund.terms.gpCommitment;
    // F3, F39: the LPs' part of net invested capital, the GP commitment's share g aside whether or not it pays fees.
    const lpsPart = ONE.minus(g?.share ?? ZERO);
    const commitments = sum(lps.map((lp) => lp.commitment));
    out = [];
    for (const p of schedulePeriods(fee, dayNumber(fund.distributionDate)!)) {
      const onInvested = investedRateDays(fund, p);
      // F39, FA40: a period with nothing to call isn't a call, so every call is above $0.
      if (p.onCommitments.isZero() && onInvested.isZero()) continue;
      // F30: an LP's fee is its commitment, times its class factor (its class's fee rate over the schedule's first
      // rate), times the fee factor. Its fee weight is its commitment times its class's rate, or the first rate on the
      // fund's terms (F22), so the fee is that weight times the rate-days, over the first rate times the divisor:
      // multiplied first, divided once. F39: a day on invested capital charges the LPs' part of that day's net
      // invested capital times their class factors over their commitments, shared by fee weight, so each LP's is its
      // weight times the LPs' part of the rate-days on invested capital over all their commitments, beside its
      // rate-days on commitments. Without a day on invested capital that's 0.5.0's, digit for digit.
      const perWeight = onInvested.isZero() ? p.onCommitments : p.onCommitments.times(commitments).plus(lpsPart.times(onInvested));
      const over = onInvested.isZero() ? firstRate.times(p.divisor) : firstRate.times(p.divisor).times(commitments);
      const byLp = lps.map((lp) => ({ name: lp.name, fee: feeWeight(fund, lp).times(perWeight).div(over) }));
      // Without listed LPs, the LPs' fee is `commitments` times the fee factor on commitments (F30), and the LPs' part
      // of net invested capital times the rate on invested capital, over the same divisor (F39).
      const lpsFee = lps.length > 0 ? sum(byLp.map((f) => f.fee)) : withoutLps(fee.commitments, p, lpsPart.times(onInvested));
      // F3, F30: when the GP commitment pays fees, the call is the LPs' fees over (1 − g), so it pays g of it.
      const call = g?.paysFees ? lpsFee.div(ONE.minus(g.share)) : lpsFee;
      out.push({
        date: isoDate(p.date),
        firstDay: isoDate(p.date),
        lastDay: isoDate(p.last),
        call,
        lps: lpsFee,
        gpCommitment: gpCommitmentPart(fund, "fee", call),
        byLp,
      });
    }
  }
  if (wasRead(fund)) scheduleKept.set(fund, out);
  return out;
}

/**
 * F39: a period's days on invested capital, each at its rate times that day's net invested capital (F38), added up:
 * the whole fund's, before the LPs' part is taken. A run of days at one rate charges its rate times the days' net
 * invested capital added up. Zero without a day on invested capital, or with nothing invested on any of them.
 */
function investedRateDays(fund: Fund, p: Period): D {
  return sum(p.onInvested.map((run) => run.rate.times(investedDays(fund, run.first, run.last))));
}

/**
 * F30, F39, without listed LPs: `commitments` times the rate-days on commitments, and the LPs' part of the rate-days on
 * invested capital, over the divisor. Without a day on invested capital that's 0.5.0's, digit for digit; without a day
 * on commitments `commitments` isn't used, and needn't be given (F40).
 */
function withoutLps(commitments: D | null, p: Period, onInvested: D): D {
  if (onInvested.isZero()) return commitments!.times(p.onCommitments).div(p.divisor);
  const onCommitments = p.onCommitments.isZero() ? ZERO : commitments!.times(p.onCommitments);
  return onCommitments.plus(onInvested).div(p.divisor);
}

/**
 * F25, F30, FA66: the fund's first call, entered or the schedule's, which decides who joins at a later close. The
 * schedule's periods count by their dates, as readFund counts them, even one on invested capital with nothing to call:
 * which periods count never turns on the investments.
 */
export function firstCallDay(fund: Fund): number {
  const days = fund.cashFlows.filter((f) => f.type === "call").map((f) => dayNumber(f.date)!);
  const fee = fund.terms.managementFee ?? null;
  if (fee) days.push(...schedulePeriods(fee, dayNumber(fund.distributionDate)!).map((p) => p.date));
  return Math.min(...days);
}

const flowsKept = new WeakMap<Fund, RunFlow[]>();

/**
 * Every call and distribution as the waterfall runs them, in F4's order: by date, calls before distributions, the
 * schedule's calls after a date's entered calls (FA42), distributions in the order listed. Each call's parts as made,
 * and its LPs' part as the waterfall counts it (F29, FA43). Not exported from the package.
 */
export function runFlows(fund: Fund): RunFlow[] {
  const known = flowsKept.get(fund);
  if (known) return known;
  const lps = fund.lps ?? [];
  const weightsAll = allFeeWeights(fund);
  // F33: a write-off calls and distributes nothing, so the waterfall doesn't run it as a cash flow.
  const entered = fund.cashFlows.filter(movesMoney).map((f): RunFlow => {
    const day = dayNumber(f.date)!;
    const gp = f.type === "call" ? gpCommitmentPart(fund, f.kind, f.amount) : ZERO;
    const paid = f.amount.minus(gp);
    if (f.type !== "call" || f.kind !== "fee" || lps.length === 0) {
      return { date: f.date, day, type: f.type, kind: f.kind, amount: f.amount, gpCommitment: gp, paid, paidBy: weightsAll, lps: paid, index: f.index, byLp: null };
    }
    // F29, FA43: an entered fee call's rate per unit of fee weight is what the LPs in at its date paid over their
    // weights, so all the LPs' part is that times all their weights, multiplied first. With every LP in, the two
    // weights are the same sum, and it counts as entered, digit for digit. With none paying (a fund built by hand that
    // readFund would refuse as call_without_payers), it counts as entered too, as 0.3.0 had it.
    const paidBy = sum(lps.filter((lp) => isIn(lp, day)).map((lp) => feeWeight(fund, lp)));
    const all = paidBy.eq(weightsAll) || paidBy.isZero() ? paid : paid.times(weightsAll).div(paidBy);
    return { date: f.date, day, type: f.type, kind: f.kind, amount: f.amount, gpCommitment: gp, paid, paidBy, lps: all, index: f.index, byLp: null };
  });
  const scheduled = (scheduleCalls(fund) ?? []).map(
    (c): RunFlow => ({
      date: c.date,
      day: dayNumber(c.date)!,
      type: "call",
      kind: "fee",
      amount: c.call,
      gpCommitment: c.gpCommitment,
      // F29, F30: every LP's own fee, whatever its close: the LPs' part is the same as made and as the waterfall counts it.
      paid: c.lps,
      paidBy: weightsAll,
      lps: c.lps,
      index: null,
      byLp: c.byLp,
    }),
  );
  // FA42: a schedule's call goes after its date's entered calls and before that date's distributions.
  const out: RunFlow[] = [];
  let next = 0;
  for (const f of entered) {
    while (next < scheduled.length && (scheduled[next]!.day < f.day || (scheduled[next]!.day === f.day && f.type === "distribution"))) out.push(scheduled[next++]!);
    out.push(f);
  }
  out.push(...scheduled.slice(next));
  if (wasRead(fund)) flowsKept.set(fund, out);
  return out;
}

/**
 * F29: the LP at `i` in the input's list, its own part of a fee call, as if in from the start: a schedule's call's fee
 * for it (F30), or for an entered call what the LPs who paid it as made paid, times its fee weight over theirs (FA43).
 * A joiner's part of a fee call before its close is a back fee.
 */
export function ownFeePart(fund: Fund, flow: RunFlow, i: number): D {
  if (flow.byLp) return flow.byLp[i]!.fee;
  return flow.paidBy.isZero() ? ZERO : flow.paid.times(feeWeight(fund, fund.lps[i]!)).div(flow.paidBy);
}
