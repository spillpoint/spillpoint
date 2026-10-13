// Every X where the split bends (F15), worked out from each tier's size.
//
// X's run of the tiers starts where the fund stands at D. Its capital tier is
// the LPs' capital still out, its pref tier the pref accrued and unpaid, its
// catch-up tier what brings the GP to c of the profit, and each carry step what
// brings the LPs to the next step's multiple. Each tier ends where those sizes
// add up to: that's a breakpoint, in dollars of X once the GP commitment's
// share is taken out (F3). A tier with nothing to pay has no end of its own
// (FA7).
//
// When X is final, the clawback owed is carry paid less entitlement, when
// positive (F12). Carry paid bends where X's tiers end; the entitlement bends
// where the run on the fund's totals ends a tier, its tiers sized the same way
// from zero. Between those points both are straight lines, so the clawback's
// breakpoints are where it reaches zero or its slope changes (FA8).
//
// The reference finds the same points by searching instead, so the two
// methods check each other.

import { D, ONE, ZERO } from "./decimal.ts";
import type { Fund } from "./model.ts";
import { multiple, percent, usd } from "./reasons.ts";
import type { ClawbackChange, Reason, TierReasonCode } from "./reasons.ts";
import { splitAt, standingAtD, stepReached } from "./waterfall.ts";
import type { Start } from "./waterfall.ts";

export interface Breakpoint {
  /** The distribution on D where the split bends, at 40 digits. */
  x: D;
  /** X's own tier first, then the clawback's (FC5). */
  reasons: Reason[];
}

/**
 * Amounts within this of each other are the same point, and a tier smaller than it pays nothing (FA15). At 40 digits
 * two ways of working out one exact point agree to far closer; two different points never come this close.
 */
const TIE = new D("1e-18");

type Tier = { kind: "capital" | "pref" | "catch_up" } | { kind: "carry"; step: number };

/** One tier of a run with something to pay: the GP's share of each dollar in it, and where it ends (null: never). */
interface Segment {
  tier: Tier;
  gpRate: D;
  end: D | null;
}

/** A run's tiers, each sized from where the run starts, ends measured in dollars through the tiers from that start. */
function segments(fund: Fund, start: Start): Segment[] {
  const out: Segment[] = [];
  let at = ZERO;
  let { lps, profit } = start;
  const add = (tier: Tier, gpRate: D, size: D) => {
    at = at.plus(size);
    out.push({ tier, gpRate, end: at });
  };
  // F5: the capital still out.
  if (start.capitalDue.gt(TIE)) {
    add({ kind: "capital" }, ZERO, start.capitalDue);
    lps = lps.plus(start.capitalDue);
  }
  // F6: the pref accrued and unpaid.
  if (fund.prefRate && start.prefDue.gt(TIE)) {
    add({ kind: "pref" }, ZERO, start.prefDue);
    lps = lps.plus(start.prefDue);
    profit = profit.plus(start.prefDue);
  }
  // F8: what brings the GP's carry to c of the profit, closing by s − c a dollar.
  if (fund.catchUpShare) {
    const s = fund.catchUpShare;
    const c = fund.carry[0]!.rate;
    const size = c.times(profit).minus(start.gp).div(s.minus(c));
    if (size.gt(TIE)) {
      add({ kind: "catch_up" }, s, size);
      lps = lps.plus(ONE.minus(s).times(size));
    }
  }
  // F9 to F11: from the step the LPs have reached, what brings them to each next step's multiple.
  let k = stepReached(fund.carry, lps, start.paidIn);
  for (; k + 1 < fund.carry.length; k++) {
    const target = fund.carry[k + 1]!.fromLpMultiple!.times(start.paidIn);
    const size = target.minus(lps).div(ONE.minus(fund.carry[k]!.rate));
    if (size.gt(TIE)) {
      add({ kind: "carry", step: k }, fund.carry[k]!.rate, size);
      lps = target;
    }
  }
  out.push({ tier: { kind: "carry", step: k }, gpRate: fund.carry[k]!.rate, end: null });
  return out;
}

/** The segment X is in just past `x` (side +1) or just before it (side −1). */
function segmentAt(segs: Segment[], x: D, side: 1 | -1): number {
  const i = segs.findIndex((s) => s.end === null || s.end.gt(x.plus(TIE.times(side))));
  return i;
}

function tierCode(tier: Tier): TierReasonCode {
  return tier.kind === "capital" ? "capital_returned" : tier.kind === "pref" ? "pref_met" : tier.kind === "catch_up" ? "catch_up_done" : "carry_step";
}

/** F15's reason for X's own tier ending, `next` the tier the next dollar falls in. */
function tierReason(fund: Fund, ended: Tier, next: Tier, paidIn: D, prefToD: D): Reason {
  switch (ended.kind) {
    case "capital":
      return { code: "capital_returned", amount: paidIn, text: `LPs have their ${usd(paidIn)} of paid-in capital back` };
    case "pref":
      return { code: "pref_met", rate: fund.prefRate!, amount: prefToD, text: `LPs have their ${percent(fund.prefRate!)} pref, ${usd(prefToD)}` };
    case "catch_up": {
      const c = fund.carry[0]!.rate;
      return { code: "catch_up_done", carry: c, text: `the GP has ${percent(c)} of the profit` };
    }
    case "carry": {
      const step = fund.carry[(next as { step: number }).step]!;
      return { code: "carry_step", lpMultiple: step.fromLpMultiple!, rate: step.rate, text: `LPs reach ${multiple(step.fromLpMultiple!)}: carry is ${percent(step.rate)} from here` };
    }
  }
}

/** How a clawback change names a tier of the run on the fund's totals ending (F15). */
function totalsWording(fund: Fund, ended: Tier, next: Tier): string {
  switch (ended.kind) {
    case "capital":
      return "LPs have their capital back";
    case "pref":
      return "LPs have their pref";
    case "catch_up":
      return `the GP has ${percent(fund.carry[0]!.rate)} of the profit`;
    case "carry": {
      const step = fund.carry[(next as { step: number }).step]!;
      return `LPs reach ${multiple(step.fromLpMultiple!)}: carry is ${percent(step.rate)} from here`;
    }
  }
}

/**
 * F15's words for the clawback's slope changing, per dollar of X. Rising isn't worded: v1 can't produce it (FA9), so
 * reaching it is a bug in the engine, not a problem with the input, and it's a plain Error, not a FundRefusal.
 */
function change(below: D, above: D): [ClawbackChange, string] {
  const zero = (d: D) => d.abs().lte(TIE);
  if (zero(below) && above.lt(ZERO)) return ["starts_to_fall", "starts to fall"];
  if (below.lt(ZERO) && zero(above)) return ["stops_falling", "stops falling"];
  if (below.lt(ZERO) && above.lt(below)) return ["falls_faster", "falls faster"];
  if (below.lt(ZERO) && above.gt(below) && above.lt(ZERO)) return ["falls_more_slowly", "falls more slowly"];
  throw new Error(
    `spillpoint-fund bug, please report it: the clawback owed rises as X grows (its slope goes from ${below.toString()} to ${above.toString()}), which v1's terms can't produce (FA9)`,
  );
}

const sign = (d: D): number => (d.gt(TIE) ? 1 : d.lt(TIE.neg()) ? -1 : 0);

/**
 * Every X above 0 where the split bends (F15), in order, each with its reasons: where each of X's tiers ends and, when
 * X is final, where the clawback owed reaches zero or changes slope (FA7, FA8, FA10).
 */
export function findBreakpoints(fund: Fund): Breakpoint[] {
  const standing = standingAtD(fund);
  const paidIn = standing.start.paidIn;
  // F3: X's tiers get 1 − g of each dollar of X.
  const share = ONE.minus(fund.gpCommitment?.share ?? ZERO);
  const toX = (throughTiers: D) => throughTiers.div(share);

  // X's own run, ends in dollars of X.
  const mine = segments(fund, standing.start).map((s) => ({ ...s, end: s.end && toX(s.end) }));
  const ownEnds = mine.filter((s) => s.end !== null).map((s) => s.end!);
  if (!fund.final) {
    return ownEnds.map((x, i) => ({ x, reasons: [tierReason(fund, mine[i]!.tier, mine[i + 1]!.tier, paidIn, standing.prefToD)] }));
  }

  // F12: the run on the fund's totals, from zero: all LP paid-in as capital and the hurdle pref, its amount everything
  // that ran the tiers before X plus X's share. Its ends in dollars of X; those at or before X = 0 are behind it.
  const totals = segments(fund, { capitalDue: paidIn, prefDue: standing.prefOnFundTotals, lps: ZERO, gp: ZERO, profit: ZERO, paidIn }).map((s) => ({
    ...s,
    end: s.end && toX(s.end.minus(standing.throughTiers)),
  }));
  const totalsEnds = totals.filter((s) => s.end !== null && s.end.gt(TIE)).map((s) => s.end!);

  // Carry paid less entitlement on each stretch, per dollar of X: X's GP share less the totals' run's.
  const slope = (x: D, side: 1 | -1) => share.times(mine[segmentAt(mine, x, side)]!.gpRate.minus(totals[segmentAt(totals, x, side)]!.gpRate));
  const owed = (x: D) => {
    const c = splitAt(fund, x, { final: true }).clawback!;
    return c.carryPaid.minus(c.entitlement);
  };

  // The points where either run ends a tier, and where carry paid less entitlement crosses zero between them.
  const kinks: D[] = [];
  for (const x of [...ownEnds, ...totalsEnds].sort((a, b) => a.cmp(b))) {
    if (!kinks.length || x.minus(kinks.at(-1)!).gt(TIE)) kinks.push(x);
  }
  const points: { x: D; f: D }[] = [];
  const bounds = [ZERO, ...kinks];
  bounds.forEach((from, i) => {
    const f = owed(from);
    if (i > 0) points.push({ x: from, f });
    const m = slope(from, 1);
    if (sign(f) * sign(m) >= 0 || sign(m) === 0) return;
    const cross = from.plus(f.div(m.neg()));
    const to = bounds[i + 1];
    if (cross.gt(from.plus(TIE)) && (!to || cross.lt(to.minus(TIE)))) points.push({ x: cross, f: ZERO });
  });
  points.sort((a, b) => a.x.cmp(b.x));

  const out: Breakpoint[] = [];
  for (const { x, f } of points) {
    const reasons: Reason[] = [];
    const [ownBefore, ownAfter] = [segmentAt(mine, x, -1), segmentAt(mine, x, 1)];
    if (ownBefore !== ownAfter) reasons.push(tierReason(fund, mine[ownBefore]!.tier, mine[ownAfter]!.tier, paidIn, standing.prefToD));

    const [below, above] = [slope(x, -1), slope(x, 1)];
    const left = sign(f) !== 0 ? sign(f) : -sign(below);
    const right = sign(f) !== 0 ? sign(f) : sign(above);
    if (left > 0 && right <= 0) {
      reasons.push({ code: "clawback_cleared", text: "from here the GP has earned all the carry it was paid earlier" });
    } else if (left <= 0 && right > 0) {
      reasons.push({ code: "clawback_starts", text: "from here the GP has been paid more carry than it has earned" });
    } else if (left > 0 && right > 0 && below.minus(above).abs().gt(TIE)) {
      const [code, words] = change(below, above);
      // FA8: the totals' run is the cause only where its GP rate changes here.
      const [totBefore, totAfter] = [segmentAt(totals, x, -1), segmentAt(totals, x, 1)];
      const totalsBend = totBefore !== totAfter && totals[totBefore]!.gpRate.minus(totals[totAfter]!.gpRate).abs().gt(TIE);
      reasons.push(
        totalsBend
          ? {
              code: "clawback_changes",
              change: code,
              fundTotals: tierCode(totals[totBefore]!.tier),
              text: `the clawback owed ${words}: on the fund's totals, ${totalsWording(fund, totals[totBefore]!.tier, totals[totAfter]!.tier)}`,
            }
          : { code: "clawback_changes", change: code, fundTotals: null, text: `the clawback owed ${words}` },
      );
    }
    // FA8: a point that bends nothing F15 reports isn't a breakpoint.
    if (reasons.length) out.push({ x, reasons });
  }
  return out;
}
