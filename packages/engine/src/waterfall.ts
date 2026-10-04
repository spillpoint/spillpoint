// The exit waterfall for a known set of decisions (SPEC, Exit waterfall).
//
// Given which preferred series convert and which option classes are
// exercised, this pays out one exit value:
//   1. Exercised options pay their strike, which joins the proceeds (E3).
//   2. Preference tiers are paid top-down; a tier that can't be paid in full
//      is split pro rata by preference amount (pari passu).
//   3. The residual is shared as common by common stock, exercised options,
//      converted preferred and participating preferred, all on an exact
//      as-converted basis (E2). A capped series stops at its cap.
//   4. Option payouts are reported net of strike, so the lines add up to the
//      exit value.
// Choosing the decisions themselves is M2c; this file takes them as given.

import type Decimal from "decimal.js";

import { ZERO, moreThan } from "./decimal.ts";
import { InputError } from "./errors.ts";
import type { CapTable, OptionClass, PreferredSeries } from "./model.ts";

/** Which preferred series convert to common, and which option classes (one per strike, E4) are exercised. */
export interface Decisions {
  converted: ReadonlySet<string>;
  exercised: ReadonlySet<string>;
}

/** What one holder receives on one security (E9). Option lines are net of strike. */
export interface PayoutLine {
  holder: string;
  security: string;
  amount: Decimal;
}

/** One seniority tier's preference claim at this exit value. */
export interface TierPayment {
  /** The tier's series that still claim their preference (converted series don't). */
  series: string[];
  claim: Decimal;
  paid: Decimal;
  /** The whole claim is paid. */
  full: boolean;
}

export interface Payout {
  exitValue: Decimal;
  decisions: Decisions;
  /** Strike paid by exercised options, added to the proceeds. */
  strikeCash: Decimal;
  /** What each share sharing the residual receives: the common price per share. */
  commonPrice: Decimal;
  /** Total per security; options net of strike. */
  bySecurity: Map<string, Decimal>;
  lines: PayoutLine[];
  holderTotals: Map<string, Decimal>;
  classTotals: Map<string, Decimal>;
  /** Tiers with a claim, most senior first. */
  tiers: TierPayment[];
  /** Capped participating series held at their cap. */
  atCap: string[];
}

/** The cap table with the quantities every waterfall run needs, worked out once. */
export interface PreparedCapTable {
  capTable: CapTable;
  shares: Map<string, Decimal>;
  preferred: Map<string, PreferredSeries>;
  options: Map<string, OptionClass>;
  commonIds: string[];
  /** Preference amount = shares × original issue price × multiple (SPEC, Preference amount). */
  preference: Map<string, Decimal>;
  /** Capped participating: the most preference plus participation can reach, cap multiple × original issue price × shares (E7). */
  capTotal: Map<string, Decimal>;
  /** Exact as-converted common shares for each preferred series (E2). */
  asConverted: Map<string, Decimal>;
}

export function prepare(capTable: CapTable): PreparedCapTable {
  const shares = new Map<string, Decimal>(capTable.securities.map((s) => [s.id, ZERO]));
  for (const p of capTable.positions) shares.set(p.security, shares.get(p.security)!.plus(p.shares));
  const preferred = new Map<string, PreferredSeries>();
  const options = new Map<string, OptionClass>();
  const commonIds: string[] = [];
  const preference = new Map<string, Decimal>();
  const capTotal = new Map<string, Decimal>();
  const asConverted = new Map<string, Decimal>();
  for (const s of capTable.securities) {
    if (s.kind === "common") commonIds.push(s.id);
    if (s.kind === "option") options.set(s.id, s);
    if (s.kind !== "preferred") continue;
    const n = shares.get(s.id)!;
    preferred.set(s.id, s);
    preference.set(s.id, n.times(s.originalIssuePrice).times(s.preferenceMultiple));
    if (s.capMultiple) capTotal.set(s.id, n.times(s.originalIssuePrice).times(s.capMultiple));
    asConverted.set(s.id, n.times(s.conversionRatio));
  }
  return { capTable, shares, preferred, options, commonIds, preference, capTotal, asConverted };
}

/** Decisions must name real convertible series and option classes, and a conversion group converts as one (E11). */
function checkDecisions(pc: PreparedCapTable, d: Decisions): void {
  for (const sid of d.converted) {
    const s = pc.preferred.get(sid);
    if (!s) throw new InputError(`decisions.converted`, `${sid} is not a preferred series`);
    if (s.participation === "participating") {
      throw new InputError(`decisions.converted`, `${sid} is uncapped participating preferred, which never converts`);
    }
  }
  for (const oid of d.exercised) {
    if (!pc.options.has(oid)) throw new InputError(`decisions.exercised`, `${oid} is not an option class`);
  }
  for (const g of pc.capTable.conversionGroups) {
    const n = g.series.filter((sid) => d.converted.has(sid)).length;
    if (n !== 0 && n !== g.series.length) {
      throw new InputError(`decisions.converted`, `${g.series.join(", ")} must convert together (E11)`);
    }
  }
}

export function payout(pc: PreparedCapTable, exitValue: Decimal, decisions: Decisions): Payout {
  checkDecisions(pc, decisions);
  const { capTable } = pc;
  const total = new Map<string, Decimal>(capTable.securities.map((s) => [s.id, ZERO]));
  const add = (id: string, amount: Decimal) => total.set(id, total.get(id)!.plus(amount));

  // 1. Exercised options pay their strike, which is added to the proceeds.
  let strikeCash = ZERO;
  for (const oid of decisions.exercised) {
    strikeCash = strikeCash.plus(pc.shares.get(oid)!.times(pc.options.get(oid)!.strike));
  }
  let remaining = exitValue.plus(strikeCash);

  // 2. Preferences, tier by tier, most senior first. Within a tier the series
  // are pari passu: a shortfall is shared in proportion to preference amount.
  const tiers: TierPayment[] = [];
  for (const tier of capTable.seniority) {
    const claimants = tier.filter((sid) => !decisions.converted.has(sid) && pc.preference.get(sid)!.gt(0));
    const claim = claimants.reduce((sum, sid) => sum.plus(pc.preference.get(sid)!), ZERO);
    if (claim.isZero()) continue;
    const paid = remaining.lt(claim) ? remaining : claim;
    for (const sid of claimants) add(sid, paid.times(pc.preference.get(sid)!).div(claim));
    tiers.push({ series: claimants, claim, paid, full: remaining.gte(claim) });
    remaining = remaining.minus(paid);
  }

  // 3. The residual, shared as common. Who shares: common stock, exercised
  // options, converted preferred, and preferred that participates and hasn't
  // converted, each by its as-converted shares. Non-participating preferred
  // that keeps its preference takes no part.
  const sharing = new Map<string, Decimal>();
  for (const cid of pc.commonIds) sharing.set(cid, pc.shares.get(cid)!);
  for (const oid of decisions.exercised) sharing.set(oid, pc.shares.get(oid)!);
  for (const [sid, s] of pc.preferred) {
    if (decisions.converted.has(sid) || s.participation !== "non_participating") sharing.set(sid, pc.asConverted.get(sid)!);
  }
  for (const [id, n] of sharing) if (n.isZero()) sharing.delete(id);

  // Capped participation: preference plus participation stops at the cap
  // (E7). Whichever series would pass its cap first is held there, and the
  // rest of the residual is shared among the others; repeat until no one is
  // over. A series that converted has no cap.
  const room = new Map<string, Decimal>();
  for (const [sid, cap] of pc.capTotal) {
    if (sharing.has(sid) && !decisions.converted.has(sid)) room.set(sid, cap.minus(total.get(sid)!));
  }
  const atCap: string[] = [];
  let price = ZERO;
  for (;;) {
    const sharesSharing = [...sharing.values()].reduce((sum, n) => sum.plus(n), ZERO);
    price = sharesSharing.isZero() ? ZERO : remaining.div(sharesSharing);
    let first: string | null = null;
    for (const [sid, r] of room) {
      if (!sharing.has(sid) || !moreThan(price.times(sharing.get(sid)!), r)) continue;
      if (first === null || r.div(sharing.get(sid)!).lt(room.get(first)!.div(sharing.get(first)!))) first = sid;
    }
    if (first === null) break;
    add(first, room.get(first)!);
    remaining = remaining.minus(room.get(first)!);
    atCap.push(first);
    sharing.delete(first);
  }
  for (const [id, n] of sharing) add(id, price.times(n));

  // 4. Option payouts net of strike, so the lines add up to the exit value.
  for (const oid of decisions.exercised) add(oid, pc.shares.get(oid)!.times(pc.options.get(oid)!.strike).neg());

  // Each security's total splits among its holders in proportion to shares (E9).
  const lines: PayoutLine[] = [];
  const holderTotals = new Map<string, Decimal>();
  const classTotals = new Map<string, Decimal>();
  for (const p of capTable.positions) {
    if (p.shares.isZero()) continue;
    const amount = total.get(p.security)!.times(p.shares).div(pc.shares.get(p.security)!);
    lines.push({ holder: p.holder, security: p.security, amount });
    holderTotals.set(p.holder, (holderTotals.get(p.holder) ?? ZERO).plus(amount));
    classTotals.set(p.security, (classTotals.get(p.security) ?? ZERO).plus(amount));
  }

  return {
    exitValue,
    decisions,
    strikeCash,
    commonPrice: price,
    bySecurity: total,
    lines,
    holderTotals,
    classTotals,
    tiers,
    atCap,
  };
}
