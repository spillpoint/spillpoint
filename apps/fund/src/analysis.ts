// What the chart and the breakpoint list need, from the engine (plan step 2, f01g).
//
// X's split is a straight line between breakpoints (F14): the engine's
// findBreakpoints gives every X where any of X's tiers ends, and, for a final
// fund, where the clawback bends. So the three lines are drawn exactly from
// the engine's split at 0, at every breakpoint and at the range's top, and the
// NAV point and the chosen X sit on them. The GP's carry per extra $1M on each
// side of a breakpoint is read off those same lines. Nothing here is fund
// arithmetic: every amount is the engine's.

import { D, findBreakpoints, splitAt } from "spillpoint-fund";
import type { Breakpoint, Fund, ReasonCode } from "spillpoint-fund";

type Decimal = D;

/** One point of the chart: an X and X's split there. */
export interface ChartPoint {
  x: Decimal;
  lps: Decimal;
  gp: Decimal;
  gpCommitment: Decimal;
}

/** A breakpoint as the page shows it: numbered as on the chart, with the GP's carry per extra $1M on each side. */
export interface BreakpointView extends Breakpoint {
  n: number;
  gpPerMillion: { below: Decimal; above: Decimal };
}

const MILLION = new D(1_000_000);

/** The breakpoints, numbered, each with what an extra $1M of X gives the GP in carry just below and just above it. */
export function breakpointViews(fund: Fund): BreakpointView[] {
  const found = findBreakpoints(fund);
  const gp = (x: Decimal) => splitAt(fund, x).distribution.gp.total;
  // Where the lines run between: 0, each breakpoint, and a point past the last, where nothing bends any more.
  const last = found.at(-1)?.x ?? new D(0);
  const anchors = [new D(0), ...found.map((b) => b.x), last.times(2).plus(MILLION)];
  const at = anchors.map(gp);
  const slope = (i: number) => at[i + 1]!.minus(at[i]!).div(anchors[i + 1]!.minus(anchors[i]!)).times(MILLION);
  return found.map((b, i) => ({ ...b, n: i + 1, gpPerMillion: { below: slope(i), above: slope(i + 1) } }));
}

/** Rounds up to two significant digits: $79,791,666.67 to $80,000,000, $19.9M to $20M. */
export function niceUp(v: Decimal): Decimal {
  if (!v.gt(0)) return new D(1_000_000);
  const digits = v.toFixed(0).length;
  const unit = new D(10).pow(Math.max(0, digits - 2));
  return v.div(unit).ceil().times(unit);
}

/**
 * The chart's and the slider's top, unless one is typed (plan, "The chart"): the largest of 1.5 × NAV, 1.25 × the last
 * breakpoint, 1.25 × the X the page opens at (f01g review, answer 1), and twice the LPs' paid-in, rounded up to two
 * significant digits.
 */
export function defaultTop(fund: Fund, breakpoints: readonly Breakpoint[], opening: Decimal): Decimal {
  const paidIn = splitAt(fund, new D(0)).lpsPaidIn;
  const candidates = [paidIn.times(2), opening.times("1.25")];
  if (fund.nav) candidates.push(fund.nav.times("1.5"));
  const last = breakpoints.at(-1);
  if (last) candidates.push(last.x.times("1.25"));
  return niceUp(D.max(...candidates));
}

/** The chart's points: X's split at 0, at every breakpoint and the NAV below the top, and at the top. */
export function chartPoints(fund: Fund, breakpoints: readonly Breakpoint[], top: Decimal): ChartPoint[] {
  const xs = [new D(0), ...breakpoints.map((b) => b.x), ...(fund.nav ? [fund.nav] : []), top]
    .filter((x) => x.lte(top))
    .sort((a, b) => a.cmp(b))
    .filter((x, i, all) => i === 0 || !x.eq(all[i - 1]!));
  return xs.map((x) => {
    const d = splitAt(fund, x).distribution;
    return { x, lps: d.lps.total, gp: d.gp.total, gpCommitment: d.gpCommitment };
  });
}

/** One point of the clawback's chart: an X, and what the GP owes back to the LPs if X is the fund's last distribution. */
export interface OwedPoint {
  x: Decimal;
  owed: Decimal;
}

const CLAWBACK_REASONS: ReadonlySet<ReasonCode> = new Set<ReasonCode>(["clawback_cleared", "clawback_starts", "clawback_changes"]);

/** A reason that's the clawback's (F15): it clears, starts, or changes how fast it falls. */
export function isClawbackReason(code: ReasonCode): boolean {
  return CLAWBACK_REASONS.has(code);
}

/** A breakpoint where the clawback owed bends. */
export function bendsClawback(b: Breakpoint): boolean {
  return b.reasons.some((r) => isClawbackReason(r.code));
}

/**
 * The clawback chart's points, for a final fund (F12): what the GP owes back at 0, at every breakpoint where the
 * clawback bends, and at the top. The engine reports every X where what's owed bends, so it's a straight line between
 * them, and the chart is exact as the main one is.
 */
export function owedPoints(fund: Fund, breakpoints: readonly Breakpoint[], top: Decimal): OwedPoint[] {
  const xs = [new D(0), ...breakpoints.filter(bendsClawback).map((b) => b.x), top]
    .filter((x) => x.lte(top))
    .sort((a, b) => a.cmp(b))
    .filter((x, i, all) => i === 0 || !x.eq(all[i - 1]!));
  return xs.map((x) => ({ x, owed: splitAt(fund, x, { final: true }).clawback!.owed }));
}
