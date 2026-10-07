// The exit waterfall for a known set of decisions (SPEC, Exit waterfall).
//
// Given which preferred series convert and which option classes and warrants
// are exercised, this pays out one exit value:
//   1. Exercised options and warrants pay their strike, which joins the
//      proceeds (E3). Shares from an exercised warrant for a preferred series
//      become shares of that series (E12).
//   2. Preference tiers are paid top-down; a tier that can't be paid in full
//      is split pro rata by preference amount (pari passu). A preference
//      includes accrued cumulative dividends (X4); a series that converts
//      forfeits them, or keeps a claim for them in its tier when they are paid
//      on conversion (X5).
//   3. The residual is shared as common by common stock, exercised options and
//      warrants for common, converted preferred and participating preferred,
//      all on an exact as-converted basis (E2). A capped series stops at its cap.
//   4. Option and warrant payouts are reported net of strike, so the lines add
//      up to the exit value.
// Choosing the decisions themselves is M2c; this file takes them as given.

import type { Decimal } from "decimal.js";

import { ZERO, moreThan } from "./decimal.ts";
import { accruedDividends } from "./dividends.ts";
import { InputError } from "./errors.ts";
import type { CapTable, OptionClass, PreferredSeries, WarrantClass } from "./model.ts";

/** Which preferred series convert to common, and which option classes (one per strike, E4) and warrants are exercised. */
export interface Decisions {
  converted: ReadonlySet<string>;
  exercised: ReadonlySet<string>;
}

/** A preferred series at this exit value, counting the shares of exercised warrants for it (E12). */
export interface SeriesHere {
  shares: Decimal;
  /** Shares × original issue price × multiple, plus accrued dividends (SPEC, Preference amount; X4). */
  preference: Decimal;
  /** Accrued and unpaid cumulative dividends, on the series' own shares (X5), included in the preference. */
  dividends: Decimal;
  /** What it claims in its tier: its preference, or once converted only dividends paid on conversion (X5). */
  claim: Decimal;
  /** Capped participating only: cap multiple × original issue price × shares (E7). */
  capTotal: Decimal | null;
  /** Exact as-converted common shares (E2). */
  asConverted: Decimal;
}

/** What one holder receives on one security (E9). Option lines are net of strike. */
export interface PayoutLine {
  holder: string;
  security: string;
  amount: Decimal;
}

/** One seniority tier's preference claim at this exit value. */
export interface TierPayment {
  /** Position in the seniority order, most senior first. */
  index: number;
  /** The tier's series with a claim: those keeping their preference, and converted series whose dividends are paid on conversion (X5). */
  series: string[];
  claim: Decimal;
  paid: Decimal;
  /** The whole claim is paid. */
  full: boolean;
}

export interface Payout {
  exitValue: Decimal;
  decisions: Decisions;
  /** Strike paid by exercised options and warrants, added to the proceeds. */
  strikeCash: Decimal;
  /** What each share sharing the residual receives: the common price per share. */
  commonPrice: Decimal;
  /** Total per security; options and warrants net of strike. */
  bySecurity: Map<string, Decimal>;
  /** Each preferred series as it stands here, with any exercised warrant shares for it. */
  series: Map<string, SeriesHere>;
  lines: PayoutLine[];
  holderTotals: Map<string, Decimal>;
  classTotals: Map<string, Decimal>;
  /** Tiers with a claim, most senior first. */
  tiers: TierPayment[];
  /** Capped participating series held at their cap. */
  atCap: string[];
  /**
   * For each capped series sharing the residual but not yet at its cap: how
   * far it is from the cap (room left minus what it gets from the residual).
   * It reaches zero where the cap starts to bind; the breakpoint finder uses it.
   */
  capRoom: Map<string, Decimal>;
}

/** The cap table with the quantities every waterfall run needs, worked out once. */
export interface PreparedCapTable {
  capTable: CapTable;
  shares: Map<string, Decimal>;
  preferred: Map<string, PreferredSeries>;
  options: Map<string, OptionClass>;
  warrants: Map<string, WarrantClass>;
  commonIds: string[];
  /** Preference amount = shares × original issue price × multiple, plus accrued dividends (SPEC, Preference amount; X4). */
  preference: Map<string, Decimal>;
  /** Accrued and unpaid cumulative dividends at the exit date, by series (X2, X5). */
  dividends: Map<string, Decimal>;
  /** The day dividends accrue to, if the exit has one. */
  exitDate: string | null;
  /** Capped participating: the most preference plus participation can reach, cap multiple × original issue price × shares (E7). */
  capTotal: Map<string, Decimal>;
  /** Exact as-converted common shares for each preferred series (E2). */
  asConverted: Map<string, Decimal>;
}

/** The exit date is needed only when a series accrues cumulative dividends (X2): they accrue to it. */
export function prepare(capTable: CapTable, exitDate: string | null = null): PreparedCapTable {
  const shares = new Map<string, Decimal>(capTable.securities.map((s) => [s.id, ZERO]));
  for (const p of capTable.positions) shares.set(p.security, shares.get(p.security)!.plus(p.shares));
  const preferred = new Map<string, PreferredSeries>();
  const options = new Map<string, OptionClass>();
  const warrants = new Map<string, WarrantClass>();
  const commonIds: string[] = [];
  const preference = new Map<string, Decimal>();
  const dividends = new Map<string, Decimal>();
  const capTotal = new Map<string, Decimal>();
  const asConverted = new Map<string, Decimal>();
  for (const s of capTable.securities) {
    if (s.kind === "common") commonIds.push(s.id);
    if (s.kind === "option") options.set(s.id, s);
    if (s.kind === "warrant") warrants.set(s.id, s);
    if (s.kind !== "preferred") continue;
    const n = shares.get(s.id)!;
    preferred.set(s.id, s);
    if (s.cumulativeDividend && exitDate == null) throw new InputError("exit_date", `${s.name} accrues cumulative dividends, so the exit needs an exit date`);
    const accrued = exitDate == null ? ZERO : accruedDividends(s, n, exitDate);
    dividends.set(s.id, accrued);
    preference.set(s.id, n.times(s.originalIssuePrice).times(s.preferenceMultiple).plus(accrued));
    if (s.capMultiple) capTotal.set(s.id, n.times(s.originalIssuePrice).times(s.capMultiple));
    asConverted.set(s.id, n.times(s.conversionRatio));
  }
  return { capTable, shares, preferred, options, warrants, commonIds, preference, dividends, exitDate, capTotal, asConverted };
}

/** Decisions must name real convertible series, option classes and warrants, and a conversion group converts as one (E11). */
function checkDecisions(pc: PreparedCapTable, d: Decisions): void {
  for (const sid of d.converted) {
    const s = pc.preferred.get(sid);
    if (!s) throw new InputError(`decisions.converted`, `${sid} is not a preferred series`);
    if (s.participation === "participating") {
      throw new InputError(`decisions.converted`, `${sid} is uncapped participating preferred, which never converts`);
    }
  }
  for (const oid of d.exercised) {
    if (!pc.options.has(oid) && !pc.warrants.has(oid)) throw new InputError(`decisions.exercised`, `${oid} is not an option class or a warrant`);
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

  // 1. Exercised options and warrants pay their strike, which is added to the proceeds.
  const strike = (id: string) => (pc.options.get(id) ?? pc.warrants.get(id)!).strike;
  let strikeCash = ZERO;
  for (const id of decisions.exercised) strikeCash = strikeCash.plus(pc.shares.get(id)!.times(strike(id)));
  let remaining = exitValue.plus(strikeCash);

  // E12: an exercised warrant for a series adds its shares to the series. They
  // carry the series' per-share preference (its original issue price × the
  // multiple, not the strike), participation, cap and conversion.
  const preferredWarrants = [...decisions.exercised].map((id) => pc.warrants.get(id)).filter((w) => w && w.underlying !== "common") as WarrantClass[];
  const series = new Map<string, SeriesHere>();
  for (const [sid, s] of pc.preferred) {
    const n = preferredWarrants.filter((w) => w.underlying === sid).reduce((sum, w) => sum.plus(pc.shares.get(w.id)!), pc.shares.get(sid)!);
    // Shares from a warrant exercised at exit carry no accrued dividends: they weren't outstanding while they accrued (X5).
    const dividends = pc.dividends.get(sid)!;
    const preference = n.times(s.originalIssuePrice).times(s.preferenceMultiple).plus(dividends);
    const paidOnConversion = s.cumulativeDividend?.onConversion === "paid";
    series.set(sid, {
      shares: n,
      preference,
      dividends,
      claim: !decisions.converted.has(sid) ? preference : paidOnConversion ? dividends : ZERO,
      capTotal: s.capMultiple ? n.times(s.originalIssuePrice).times(s.capMultiple) : null,
      asConverted: n.times(s.conversionRatio),
    });
  }

  // 2. Preferences, tier by tier, most senior first. Within a tier the series
  // are pari passu: a shortfall is shared in proportion to preference amount.
  const tiers: TierPayment[] = [];
  for (const [index, tier] of capTable.seniority.entries()) {
    // A converted series claims only dividends paid on conversion (X5), where they ranked.
    const claimants = tier.filter((sid) => series.get(sid)!.claim.gt(0));
    const claim = claimants.reduce((sum, sid) => sum.plus(series.get(sid)!.claim), ZERO);
    if (claim.isZero()) continue;
    const paid = remaining.lt(claim) ? remaining : claim;
    for (const sid of claimants) add(sid, paid.times(series.get(sid)!.claim).div(claim));
    tiers.push({ index, series: claimants, claim, paid, full: remaining.gte(claim) });
    remaining = remaining.minus(paid);
  }

  // 3. The residual, shared as common. Who shares: common stock, exercised
  // options and warrants for common, converted preferred, and preferred that
  // participates and hasn't converted, each by its as-converted shares.
  // Non-participating preferred that keeps its preference takes no part.
  const sharing = new Map<string, Decimal>();
  for (const cid of pc.commonIds) sharing.set(cid, pc.shares.get(cid)!);
  for (const id of decisions.exercised) {
    if (pc.options.has(id) || pc.warrants.get(id)!.underlying === "common") sharing.set(id, pc.shares.get(id)!);
  }
  for (const [sid, s] of pc.preferred) {
    if (decisions.converted.has(sid) || s.participation !== "non_participating") sharing.set(sid, series.get(sid)!.asConverted);
  }
  for (const [id, n] of sharing) if (n.isZero()) sharing.delete(id);

  // Capped participation: preference plus participation stops at the cap
  // (E7). Whichever series would pass its cap first is held there, and the
  // rest of the residual is shared among the others; repeat until no one is
  // over. A series that converted has no cap.
  const room = new Map<string, Decimal>();
  for (const [sid, s] of series) {
    if (s.capTotal && sharing.has(sid) && !decisions.converted.has(sid)) room.set(sid, s.capTotal.minus(total.get(sid)!));
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
  const capRoom = new Map<string, Decimal>();
  for (const [sid, r] of room) if (sharing.has(sid)) capRoom.set(sid, r.minus(price.times(sharing.get(sid)!)));

  // E12: a series' total splits between its own shares and those from exercised warrants for it, pro rata by shares.
  for (const w of preferredWarrants) {
    const part = total.get(w.underlying)!.times(pc.shares.get(w.id)!).div(series.get(w.underlying)!.shares);
    add(w.id, part);
    add(w.underlying, part.neg());
  }

  // 4. Option and warrant payouts net of strike, so the lines add up to the exit value.
  for (const id of decisions.exercised) add(id, pc.shares.get(id)!.times(strike(id)).neg());

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
    series,
    lines,
    holderTotals,
    classTotals,
    tiers,
    atCap,
    capRoom,
  };
}
