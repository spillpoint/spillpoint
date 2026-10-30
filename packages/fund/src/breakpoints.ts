// Every X where the split bends (F15, F27), worked out from each tier's size,
// account by account.
//
// Each account's run of the tiers starts where the account stands at D (F23).
// Its capital tier is its LPs' capital still out, its pref tier the pref
// accrued and unpaid, its catch-up tier what brings the GP to the account's c of
// its profit, and each carry step what brings its LPs to the next step's
// multiple. Each tier ends where those sizes add up to: that's a breakpoint, in
// dollars of X once the GP commitment's share is taken out (F3) and the
// account's part of the rest found (F23). A tier with nothing to pay has no end
// of its own (FA7).
//
// When X is final, each account's clawback owed is its carry paid less its
// entitlement, when positive (F12, F24). Carry paid bends where the account's
// tiers end; the entitlement bends where the run on its totals ends a tier, its
// tiers sized the same way from zero. Between those points both are straight
// lines, so the clawback's breakpoints are where it reaches zero or its slope
// changes (FA8).
//
// One X can carry reasons from several accounts: the fund's terms first, then
// the classes in the input's order (F27). With two or more accounts each
// reason's text starts with its account's name.
//
// From 0.5.0, deal by deal (F35), an account's capital tier is its due on X
// not yet back, and X comes from `distribution_from`'s investment. What's due
// on X doesn't change with X, so the tiers are sized as before and every point
// is exact. `capital_returned` names that due (FA57).
//
// The reference finds the same points by searching instead, so the two
// methods check each other.

import { D, ONE, ZERO } from "./decimal.ts";
import type { Fund } from "./model.ts";
import { multiple, percent, usd } from "./reasons.ts";
import type { Reason } from "./reasons.ts";
import { CHANGE_WORDS, FUND_TERMS, TOTALS_WORDINGS, WORDINGS } from "./stable-names.ts";
import type { ClawbackChange, TierReasonCode } from "./stable-names.ts";
import { perDollarOfX, runAccounts, standingsAtD, stepReached, throughTiersToX } from "./waterfall.ts";
import type { RunTerms, StandingAtD, Start } from "./waterfall.ts";

export interface Breakpoint {
  /** The distribution on D where the split bends, at 40 digits. */
  x: D;
  /** Each account's reasons, the fund's terms first; within one, X's own tier first, then the clawback's (FC5, F27). */
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
function segments(terms: RunTerms, start: Start): Segment[] {
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
  if (terms.pref && start.prefDue.gt(TIE)) {
    add({ kind: "pref" }, ZERO, start.prefDue);
    lps = lps.plus(start.prefDue);
    profit = profit.plus(start.prefDue);
  }
  // F8, F22: what brings the GP's carry to the account's c of the profit, closing by s − c a dollar.
  if (terms.catchUp) {
    const s = terms.catchUp.gpShare;
    const c = terms.carry[0]!.rate;
    const size = c.times(profit).minus(start.gp).div(s.minus(c));
    if (size.gt(TIE)) {
      add({ kind: "catch_up" }, s, size);
      lps = lps.plus(ONE.minus(s).times(size));
    }
  }
  // F9 to F11: from the step the LPs have reached, what brings them to each next step's multiple.
  let k = stepReached(terms.carry, lps, start.paidIn);
  for (; k + 1 < terms.carry.length; k++) {
    const target = terms.carry[k + 1]!.fromLpMultiple!.times(start.paidIn);
    const size = target.minus(lps).div(ONE.minus(terms.carry[k]!.rate));
    if (size.gt(TIE)) {
      add({ kind: "carry", step: k }, terms.carry[k]!.rate, size);
      lps = target;
    }
  }
  out.push({ tier: { kind: "carry", step: k }, gpRate: terms.carry[k]!.rate, end: null });
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

/** One account as its reasons name it (F27): with two or more accounts, its name before each reason's words. */
interface Naming {
  class: string | null;
  named: boolean;
}

function words(naming: Naming, text: string): string {
  return naming.named ? WORDINGS.named(naming.class ?? FUND_TERMS, text) : text;
}

/** What an account's `capital_returned` names: its paid-in, or deal by deal its due on X (F36, FA57). */
interface CapitalBack {
  amount: D;
  /** Deal by deal and X not final: F36's words for what's due on the investments realized. */
  dealByDeal: boolean;
}

/** F15's reason for the account's own tier ending, `next` the tier the next dollar falls in. */
function tierReason(terms: RunTerms, ended: Tier, next: Tier, capital: CapitalBack, prefAccrued: D, naming: Naming): Reason {
  const cls = naming.class;
  switch (ended.kind) {
    case "capital": {
      // F36, FA57: deal by deal, the account's due on X. When X is final that's all its paid-in, and it reads as the
      // whole fund's, its amount the same.
      const wording = capital.dealByDeal ? WORDINGS.capital_returned_deal_by_deal : WORDINGS.capital_returned;
      return { class: cls, code: "capital_returned", amount: capital.amount, text: words(naming, wording(usd(capital.amount))) };
    }
    case "pref": {
      const rate = terms.pref!.rate;
      return { class: cls, code: "pref_met", rate, amount: prefAccrued, text: words(naming, WORDINGS.pref_met(percent(rate), usd(prefAccrued))) };
    }
    case "catch_up": {
      const c = terms.carry[0]!.rate;
      return { class: cls, code: "catch_up_done", carry: c, text: words(naming, WORDINGS.catch_up_done(percent(c))) };
    }
    case "carry": {
      const step = terms.carry[(next as { step: number }).step]!;
      const text = WORDINGS.carry_step(multiple(step.fromLpMultiple!), percent(step.rate));
      return { class: cls, code: "carry_step", lpMultiple: step.fromLpMultiple!, rate: step.rate, text: words(naming, text) };
    }
  }
}

/** How a clawback change names a tier of the run on the totals ending (F15). */
function totalsWording(terms: RunTerms, ended: Tier, next: Tier): string {
  switch (ended.kind) {
    case "capital":
      return TOTALS_WORDINGS.capital_returned();
    case "pref":
      return TOTALS_WORDINGS.pref_met();
    case "catch_up":
      return TOTALS_WORDINGS.catch_up_done(percent(terms.carry[0]!.rate));
    case "carry": {
      const step = terms.carry[(next as { step: number }).step]!;
      return TOTALS_WORDINGS.carry_step(multiple(step.fromLpMultiple!), percent(step.rate));
    }
  }
}

/**
 * F15's words for the clawback's slope changing, per dollar of X. Rising isn't worded: v1 can't produce it (FA9), so
 * reaching it is a bug in the engine, not a problem with the input, and it's a plain Error, not a FundRefusal.
 */
function change(below: D, above: D): ClawbackChange {
  const zero = (d: D) => d.abs().lte(TIE);
  if (zero(below) && above.lt(ZERO)) return "starts_to_fall";
  if (below.lt(ZERO) && zero(above)) return "stops_falling";
  if (below.lt(ZERO) && above.lt(below)) return "falls_faster";
  if (below.lt(ZERO) && above.gt(below) && above.lt(ZERO)) return "falls_more_slowly";
  throw new Error(
    `spillpoint-fund bug, please report it: the clawback rises as X grows (its slope goes from ${below.toString()} to ${above.toString()}), which v1's terms can't produce (FA9)`,
  );
}

const sign = (d: D): number => (d.gt(TIE) ? 1 : d.lt(TIE.neg()) ? -1 : 0);

/** One account's breakpoints (F15, F24): where its tiers end and, when X is final, where its clawback bends. */
function accountBreakpoints(fund: Fund, standing: StandingAtD, index: number, named: boolean): Breakpoint[] {
  const { account } = standing;
  const terms = account.terms;
  const naming: Naming = { class: account.class, named };
  const paidIn = standing.start.paidIn;
  const capital: CapitalBack = standing.due ? { amount: standing.due.total, dealByDeal: !fund.final } : { amount: paidIn, dealByDeal: false };
  // F3, F23: the account's tiers get its part of 1 − g of each dollar of X.
  const toX = (throughTiers: D) => throughTiersToX(fund, account, throughTiers);
  const perX = perDollarOfX(fund, account);

  // The account's own run, ends in dollars of X.
  const mine = segments(terms, standing.start).map((s) => ({ ...s, end: s.end && toX(s.end) }));
  const ownEnds = mine.filter((s) => s.end !== null).map((s) => s.end!);
  if (!fund.final) {
    return ownEnds.map((x, i) => ({ x, reasons: [tierReason(terms, mine[i]!.tier, mine[i + 1]!.tier, capital, standing.prefAccrued, naming)] }));
  }

  // F12, F24: the run on the account's totals, from zero: all its paid-in as capital and its hurdle pref, its amount
  // everything that ran its tiers before X plus X's part. Its ends in dollars of X; those at or before X = 0 are behind it.
  const totals = segments(terms, { capitalDue: paidIn, prefDue: standing.prefOnFundTotals, lps: ZERO, gp: ZERO, profit: ZERO, paidIn }).map((s) => ({
    ...s,
    end: s.end && toX(s.end.minus(standing.throughTiers)),
  }));
  const totalsEnds = totals.filter((s) => s.end !== null && s.end.gt(TIE)).map((s) => s.end!);

  // Carry paid less entitlement on each stretch, per dollar of X: the account's GP share less its totals' run's.
  const slope = (x: D, side: 1 | -1) => perX.times(mine[segmentAt(mine, x, side)]!.gpRate.minus(totals[segmentAt(totals, x, side)]!.gpRate));
  const g = fund.terms.gpCommitment?.share ?? ZERO;
  const owed = (x: D) => {
    const c = runAccounts(fund, x.minus(g.times(x)), true)[index]!.clawback!;
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
    if (ownBefore !== ownAfter) reasons.push(tierReason(terms, mine[ownBefore]!.tier, mine[ownAfter]!.tier, capital, standing.prefAccrued, naming));

    const [below, above] = [slope(x, -1), slope(x, 1)];
    const left = sign(f) !== 0 ? sign(f) : -sign(below);
    const right = sign(f) !== 0 ? sign(f) : sign(above);
    if (left > 0 && right <= 0) {
      reasons.push({ class: account.class, code: "clawback_cleared", text: words(naming, WORDINGS.clawback_cleared()) });
    } else if (left <= 0 && right > 0) {
      reasons.push({ class: account.class, code: "clawback_starts", text: words(naming, WORDINGS.clawback_starts()) });
    } else if (left > 0 && right > 0 && below.minus(above).abs().gt(TIE)) {
      const code = change(below, above);
      // FA8: the totals' run is the cause only where its GP rate changes here.
      const [totBefore, totAfter] = [segmentAt(totals, x, -1), segmentAt(totals, x, 1)];
      const totalsBend = totBefore !== totAfter && totals[totBefore]!.gpRate.minus(totals[totAfter]!.gpRate).abs().gt(TIE);
      // F27, FA29: with two or more accounts the run is on the account's own totals, and the words say so.
      const onTotals = named ? WORDINGS.clawback_changes_on_own_totals : WORDINGS.clawback_changes_on_totals;
      reasons.push(
        totalsBend
          ? {
              class: account.class,
              code: "clawback_changes",
              change: code,
              fundTotals: tierCode(totals[totBefore]!.tier),
              text: words(naming, onTotals(CHANGE_WORDS[code], totalsWording(terms, totals[totBefore]!.tier, totals[totAfter]!.tier))),
            }
          : { class: account.class, code: "clawback_changes", change: code, fundTotals: null, text: words(naming, WORDINGS.clawback_changes(CHANGE_WORDS[code])) },
      );
    }
    // FA8: a point that bends nothing F15 reports isn't a breakpoint.
    if (reasons.length) out.push({ x, reasons });
  }
  return out;
}

/**
 * Every X above 0 where the split bends (F15, F27), in order, each with its reasons: where each account's tiers end
 * and, when X is final, where its clawback owed reaches zero or changes slope (FA7, FA8, FA10). Two accounts' points
 * within FA15's tie are one breakpoint, the fund's terms' reasons first, then the classes' in the input's order.
 */
export function findBreakpoints(fund: Fund): Breakpoint[] {
  const standings = standingsAtD(fund);
  const named = standings.length > 1;
  const each = standings.flatMap((st, i) => accountBreakpoints(fund, st, i, named).map((b) => ({ ...b, account: i })));
  each.sort((a, b) => a.x.cmp(b.x) || a.account - b.account);
  const groups: (typeof each)[] = [];
  for (const b of each) {
    const last = groups.at(-1);
    if (last && b.x.minus(last[0]!.x).lte(TIE)) last.push(b);
    else groups.push([b]);
  }
  return groups.map((group) => {
    group.sort((a, b) => a.account - b.account);
    return { x: group[0]!.x, reasons: group.flatMap((b) => b.reasons) };
  });
}
