// The exit waterfall for a known set of decisions (SPEC, Exit waterfall).
//
// Given which preferred series convert and which option classes and warrants
// are exercised, this pays out one exit value:
//   0. A convertible note still outstanding and repaid is debt: paid ahead of
//      all equity, notes sharing a shortfall pro rata (X3, X12, X15).
//   1. Exercised options and warrants pay their strike, which joins the
//      proceeds (E3). Shares from an exercised warrant for a preferred series
//      become shares of that series (E12). A management carve-out, a
//      percentage of the exit value, is paid before the preferences, or
//      alongside them in the most senior tier (X6, X7).
//      A SAFE still outstanding takes its Cash-Out Amount ahead of common, or
//      with preferred in its tier, unless it takes its Conversion Amount and
//      shares as common (X1, X9, X13, X14).
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

import { ONE, ZERO, moreThan } from "./decimal.ts";
import { accruedDividends } from "./dividends.ts";
import { InputError } from "./errors.ts";
import { dayNumber } from "./dates.ts";
import type { CapTable, CarveOut, Note, OptionClass, PreferredSeries, Safe, WarrantClass } from "./model.ts";

/** The security payouts to a carve-out's recipients are reported under (C6). */
export const CARVE_OUT = "carve_out";

/** A SAFE still outstanding, at one exit value (X1, X9). */
export interface SafeHere {
  /** It takes its Conversion Amount. */
  converts: boolean;
  /** With a cap and converting: its Liquidity Capitalization, Liquidity Price and conversion shares, exact (E2). */
  liquidityCapitalization: Decimal | null;
  liquidityPrice: Decimal | null;
  shares: Decimal | null;
  /**
   * With no cap and set to convert: (1 − discount) × what is left for it and
   * common, less its purchase amount. Converting is possible only while it is
   * above zero (X9, reading (a)), so the breakpoint finder follows it.
   */
  room: Decimal | null;
}

/** A convertible note at the sale, worked out once from the exit date (X3, X10–X12). */
export interface NoteTerms {
  note: Note;
  /** Simple interest, Actual/365, from the issue date to the exit date. */
  days: number;
  interest: Decimal;
  /** Principal plus interest: what converts (X11). */
  amount: Decimal;
  /** The repayment multiple × the amount, paid as debt (X3). */
  repayment: Decimal;
  /** A note with neither a cap nor a discount is only ever repaid (X12). */
  canConvert: boolean;
  /** With a cap: the base it divides by, the price, and the conversion shares, exact (E2). */
  baseShares: Decimal | null;
  price: Decimal | null;
  shares: Decimal | null;
}

/** A convertible note at one exit value. */
export interface NoteHere {
  converts: boolean;
  /** Converting: its shares as common. */
  shares: Decimal | null;
  /** With no cap and set to convert: (1 − discount) × what is left for it and common, less what converts (X12). */
  room: Decimal | null;
}

/** The carve-out at one exit value. */
export interface CarveOutHere {
  /** What the tiers give at this exit value: paid in full before the preferences, or the claim it makes alongside them. */
  claim: Decimal;
  paid: Decimal;
  /** Which tier the exit value is in; tiers.length once past the last one's upper end, where the carve-out stops growing (X6). */
  band: number;
}

/**
 * X6: marginal tiers. Each contributes its rate × the part of the exit value
 * (before strike cash, X7) inside it. Also the tier the exit value is in.
 */
export function carveOutAt(c: CarveOut, exitValue: Decimal): { claim: Decimal; band: number } {
  let claim = ZERO;
  for (const t of c.tiers) {
    const top = t.to === null || exitValue.lt(t.to) ? exitValue : t.to;
    if (top.gt(t.from)) claim = claim.plus(top.minus(t.from).times(t.rate));
  }
  const band = c.tiers.findIndex((t) => t.to === null || exitValue.lt(t.to));
  return { claim, band: band < 0 ? c.tiers.length : band };
}

/**
 * Which preferred series convert to common, which SAFEs take their Conversion
 * Amount rather than their Cash-Out Amount, and which option classes (one per
 * strike, E4) and warrants are exercised.
 */
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
  /** The carve-out here, if the cap table has one. */
  carveOut: CarveOutHere | null;
  /** Each SAFE still outstanding. */
  safes: Map<string, SafeHere>;
  /** Each convertible note still outstanding. */
  notes: Map<string, NoteHere>;
  /** The notes being repaid: one claim, ahead of all equity (X3, X15). */
  noteDebt: { claim: Decimal; paid: Decimal; full: boolean; notes: string[] } | null;
  /** With no preferred, the SAFEs taking their Cash-Out Amount share one claim ahead of common, pro rata (X13). */
  safeCash: { claim: Decimal; paid: Decimal; full: boolean; safes: string[] } | null;
  /**
   * Payouts curve here (X17): a carve-out paid alongside the preferences
   * shares a tier that isn't paid in full, and its claim grows with the exit
   * value, so its share, exit value × claim ÷ (claim + the preferences
   * there), isn't a straight line.
   */
  curved: boolean;
  lines: PayoutLine[];
  holderTotals: Map<string, Decimal>;
  classTotals: Map<string, Decimal>;
  /** Tiers with a claim, most senior first. A carve-out alongside the preferences is listed in its tier as "carve_out". */
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
  /** SAFEs still outstanding at the sale (C8). */
  safes: Map<string, Safe>;
  /** Convertible notes still outstanding at the sale (C9), with what accrues to the exit date. */
  notes: Map<string, NoteTerms>;
  /** All issued stock as converted, options and warrants included, without the unissued pool: what a SAFE's Liquidity Capitalization starts from (X1, X14). */
  outstanding: Decimal;
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
  const safes = new Map((capTable.unconvertedSafes ?? []).map((f) => [f.id, f]));
  // Warrants count as converted, as options do (R29): a warrant for a series at the series' ratio.
  const outstanding = capTable.securities.reduce((sum, s) => {
    const n = shares.get(s.id)!;
    if (s.kind === "preferred") return sum.plus(n.times(s.conversionRatio));
    if (s.kind === "warrant" && s.underlying !== "common") return sum.plus(n.times(preferred.get(s.underlying)!.conversionRatio));
    return sum.plus(n);
  }, ZERO);
  const notes = new Map<string, NoteTerms>();
  for (const n of capTable.unconvertedNotes ?? []) {
    if (exitDate == null) throw new InputError("exit_date", `${n.id} accrues interest, so the exit needs an exit date`);
    notes.set(n.id, noteTerms(n, exitDate, { outstanding, unissuedPool: capTable.unissuedPool, common: commonIds.reduce((sum, id) => sum.plus(shares.get(id)!), ZERO) }));
  }
  return { capTable, shares, preferred, options, warrants, safes, notes, outstanding, commonIds, preference, dividends, exitDate, capTotal, asConverted };
}

/**
 * A note at the sale (X3, X10–X12): simple interest, Actual/365, from its
 * issue date to the exit date; repayment of a multiple of principal plus
 * interest; and with a cap, conversion of principal plus interest (X11) at
 * the pre-money cap ÷ its base, counted just before the sale with the note
 * itself left out, and no other note either (X15):
 * - with_pool: issued stock as converted, options and warrants, and the unissued pool
 * - without_pool: the same without the pool
 * - common_only: issued common only
 */
function noteTerms(n: Note, exitDate: string, counts: { outstanding: Decimal; unissuedPool: Decimal; common: Decimal }): NoteTerms {
  const days = dayNumber(exitDate, "exit_date") - dayNumber(n.issueDate, "issue_date");
  const interest = n.principal.times(n.interestRate).times(days).div(365);
  const amount = n.principal.plus(interest);
  const base = !n.valuationCap
    ? null
    : n.conversionBase === "with_pool"
      ? counts.outstanding.plus(counts.unissuedPool)
      : n.conversionBase === "without_pool"
        ? counts.outstanding
        : counts.common;
  const price = base && n.valuationCap ? n.valuationCap.div(base) : null;
  return {
    note: n,
    days,
    interest,
    amount,
    repayment: amount.times(n.repaymentMultiple),
    canConvert: n.valuationCap !== null || n.discount.gt(0),
    baseShares: base,
    price,
    shares: price ? amount.div(price) : null,
  };
}

/**
 * A SAFE's Liquidity Capitalization when it takes its Conversion Amount.
 *
 * Post-money SAFE (YC, X1, X13): counted just before the Liquidity Event, all
 * issued stock as converted, all issued options and warrants whether or not
 * they are in the money, and every SAFE taking its Conversion Amount, this one
 * included: one count for the company. It leaves out the unissued pool and
 * anything taking a cash-out or a liquidation preference "in lieu of"
 * converting: a SAFE taking its Cash-Out Amount, or a non-participating
 * series that keeps its preference. Each converting SAFE's shares are its
 * purchase amount ÷ (its cap ÷ LC), so LC = everything else ÷ (1 − Σ purchase
 * amount ÷ cap).
 *
 * Pre-money SAFE (YC, X14): "shares of Capital Stock (on an as-converted
 * basis) outstanding, assuming exercise or conversion of all outstanding
 * vested and unvested options, warrants and other convertible securities",
 * leaving out the unissued pool, this SAFE, other SAFEs and notes. Its shares
 * sit on top.
 */
export function liquidityCapitalization(pc: PreparedCapTable, f: Safe, converted: ReadonlySet<string>): Decimal {
  if (f.preMoneyCap) return pc.outstanding;
  let others = pc.outstanding;
  for (const [sid, s] of pc.preferred) {
    if (s.participation === "non_participating" && !converted.has(sid)) others = others.minus(pc.asConverted.get(sid)!);
  }
  let own = ZERO;
  for (const g of pc.safes.values()) {
    if (g.postMoneyCap && (g.id === f.id || converted.has(g.id))) own = own.plus(g.purchaseAmount.div(g.postMoneyCap));
  }
  return others.div(ONE.minus(own));
}

/** The tier a SAFE's Cash-Out Amount ranks in: the series it names, or the most junior (X9). */
function safeTier(capTable: CapTable, f: Safe): number {
  if (f.cashOutRanksWith == null) return capTable.seniority.length - 1;
  return capTable.seniority.findIndex((tier) => tier.includes(f.cashOutRanksWith!));
}

/** Decisions must name real convertible series, option classes and warrants, and a conversion group converts as one (E11). */
function checkDecisions(pc: PreparedCapTable, d: Decisions): void {
  for (const sid of d.converted) {
    if (pc.safes.has(sid)) continue;
    if (pc.notes.has(sid)) {
      if (!pc.notes.get(sid)!.canConvert) throw new InputError(`decisions.converted`, `${sid} has neither a cap nor a discount, so it is only ever repaid`);
      continue;
    }
    const s = pc.preferred.get(sid);
    if (!s) throw new InputError(`decisions.converted`, `${sid} is not a preferred series or a SAFE`);
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
  for (const id of pc.safes.keys()) total.set(id, ZERO);
  for (const id of pc.notes.keys()) total.set(id, ZERO);
  const add = (id: string, amount: Decimal) => total.set(id, total.get(id)!.plus(amount));

  // 1. Exercised options and warrants pay their strike, which is added to the proceeds.
  const strike = (id: string) => (pc.options.get(id) ?? pc.warrants.get(id)!).strike;
  let strikeCash = ZERO;
  for (const id of decisions.exercised) strikeCash = strikeCash.plus(pc.shares.get(id)!.times(strike(id)));
  let remaining = exitValue.plus(strikeCash);

  // X3, X12, X15: a note repaid is debt, paid ahead of all equity; notes share a shortfall pro rata by repayment.
  const repaid = [...pc.notes.values()].filter((t) => !decisions.converted.has(t.note.id));
  let noteDebt: Payout["noteDebt"] = null;
  if (repaid.length > 0) {
    const claim = repaid.reduce((sum, t) => sum.plus(t.repayment), ZERO);
    const paid = remaining.lt(claim) ? remaining : claim;
    for (const t of repaid) add(t.note.id, paid.times(t.repayment).div(claim));
    noteDebt = { claim, paid, full: remaining.gte(claim), notes: repaid.map((t) => t.note.id) };
    remaining = remaining.minus(paid);
  }

  // X7: the carve-out, a percentage of the exit value before any strike cash.
  // Before the preferences it is paid first. Alongside them it claims a share
  // of the most senior tier, pro rata with the preferences there; with no
  // preferred, that means first too.
  const carve = capTable.carveOut ? carveOutAt(capTable.carveOut, exitValue) : null;
  const carveInTier = carve !== null && capTable.carveOut!.timing === "alongside_preferences" && capTable.seniority.length > 0;
  let carvePaid = ZERO;
  if (carve && !carveInTier) {
    carvePaid = remaining.lt(carve.claim) ? remaining : carve.claim;
    remaining = remaining.minus(carvePaid);
  }

  // SAFEs taking their Cash-Out Amount (YC): paid ahead of common. With no
  // preferred they share one claim, "with equal priority and pro rata" by
  // purchase amount (X13); with preferred, each ranks in a tier (X9), below.
  const cashSafes = [...pc.safes.values()].filter((f) => !decisions.converted.has(f.id));
  let safeCash: Payout["safeCash"] = null;
  if (cashSafes.length > 0 && capTable.seniority.length === 0) {
    const claim = cashSafes.reduce((sum, f) => sum.plus(f.purchaseAmount), ZERO);
    const paid = remaining.lt(claim) ? remaining : claim;
    for (const f of cashSafes) add(f.id, paid.times(f.purchaseAmount).div(claim));
    safeCash = { claim, paid, full: remaining.gte(claim), safes: cashSafes.map((f) => f.id) };
    remaining = remaining.minus(paid);
  }

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
    const claims = new Map(tier.filter((sid) => series.get(sid)!.claim.gt(0)).map((sid) => [sid, series.get(sid)!.claim]));
    if (index === 0 && carveInTier && carve!.claim.gt(0)) claims.set(CARVE_OUT, carve!.claim);
    for (const f of cashSafes) if (safeTier(capTable, f) === index) claims.set(f.id, f.purchaseAmount);
    const claim = [...claims.values()].reduce((sum, c) => sum.plus(c), ZERO);
    if (claim.isZero()) continue;
    const paid = remaining.lt(claim) ? remaining : claim;
    for (const [id, c] of claims) {
      if (id === CARVE_OUT) carvePaid = paid.times(c).div(claim);
      else add(id, paid.times(c).div(claim));
    }
    tiers.push({ index, series: [...claims.keys()], claim, paid, full: remaining.gte(claim) });
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

  // A SAFE taking its Conversion Amount shares as common. With a cap, on
  // purchase amount ÷ Liquidity Price shares, where the Liquidity Price is its
  // cap ÷ the Liquidity Capitalization (X1, X13, X14).
  const safes = new Map<string, SafeHere>();
  for (const f of cashSafes) safes.set(f.id, { converts: false, liquidityCapitalization: null, liquidityPrice: null, shares: null, room: null });
  const convertingSafes = [...pc.safes.values()].filter((f) => decisions.converted.has(f.id));
  for (const f of convertingSafes) {
    const cap = f.postMoneyCap ?? f.preMoneyCap;
    if (!cap) continue;
    const lc = liquidityCapitalization(pc, f, decisions.converted);
    const lp = cap.div(lc);
    const n = f.purchaseAmount.div(lp);
    sharing.set(f.id, n);
    safes.set(f.id, { converts: true, liquidityCapitalization: lc, liquidityPrice: lp, shares: n, room: null });
  }
  // A note converting shares as common. With a cap, on principal plus
  // interest ÷ its conversion price (X10, X11).
  const notes = new Map<string, NoteHere>();
  for (const t of repaid) notes.set(t.note.id, { converts: false, shares: null, room: null });
  const convertingNotes = [...pc.notes.values()].filter((t) => decisions.converted.has(t.note.id));
  for (const t of convertingNotes) {
    if (!t.shares) continue;
    sharing.set(t.note.id, t.shares);
    notes.set(t.note.id, { converts: true, shares: t.shares, room: null });
  }

  // With no cap a SAFE or a note converts at the sale's common price p less
  // its discount d, a price it helps set: amount ÷ ((1 − d) × p) shares, each
  // worth p, so converting is worth exactly amount ÷ (1 − d) whatever p is.
  // It takes that out of what is left after the preferences first, and the
  // rest is shared below, capped participating preferred stopping at its cap
  // (cases 12i, 13h); p is the price they share it at. Where (1 − d) × what
  // is left is no more than the amount, no such price exists, and the
  // greater-of has only the Cash-Out Amount or repayment to take (X9, X12,
  // reading (a)): it is paid as if it took that, a tie, which X16 settles
  // that way. One such instrument at most: notes and SAFEs aren't modeled
  // together, and several of either need caps (X13, X15).
  const uncappedSafe = convertingSafes.find((f) => !f.postMoneyCap && !f.preMoneyCap);
  const uncappedNote = convertingNotes.find((t) => !t.shares);
  const uncapped = uncappedSafe
    ? { id: uncappedSafe.id, amount: uncappedSafe.purchaseAmount, discount: uncappedSafe.discount }
    : uncappedNote
      ? { id: uncappedNote.note.id, amount: uncappedNote.amount, discount: uncappedNote.note.discount }
      : null;
  let uncappedRoom: Decimal | null = null;
  if (uncapped) {
    const others = [...sharing.values()].reduce((sum, n) => sum.plus(n), ZERO);
    const room = ONE.minus(uncapped.discount).times(remaining).minus(uncapped.amount);
    if (!room.gt(0) || others.isZero()) {
      const asCash = payout(pc, exitValue, { converted: new Set([...decisions.converted].filter((id) => id !== uncapped.id)), exercised: decisions.exercised });
      if (uncappedSafe) asCash.safes.set(uncapped.id, { ...asCash.safes.get(uncapped.id)!, room });
      else asCash.notes.set(uncapped.id, { ...asCash.notes.get(uncapped.id)!, room });
      return { ...asCash, decisions };
    }
    const worth = uncapped.amount.div(ONE.minus(uncapped.discount));
    add(uncapped.id, worth);
    remaining = remaining.minus(worth);
    uncappedRoom = room;
  }

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
  // Its shares, now that the price they share at is known: amount ÷ ((1 − d) × p).
  if (uncapped) {
    const n = uncapped.amount.div(ONE.minus(uncapped.discount).times(price));
    if (uncappedSafe) safes.set(uncapped.id, { converts: true, liquidityCapitalization: null, liquidityPrice: null, shares: n, room: uncappedRoom });
    else notes.set(uncapped.id, { converts: true, shares: n, room: uncappedRoom });
  }
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
  const addLine = (holder: string, security: string, amount: Decimal) => {
    lines.push({ holder, security, amount });
    holderTotals.set(holder, (holderTotals.get(holder) ?? ZERO).plus(amount));
    classTotals.set(security, (classTotals.get(security) ?? ZERO).plus(amount));
  };
  for (const p of capTable.positions) {
    if (p.shares.isZero()) continue;
    addLine(p.holder, p.security, total.get(p.security)!.times(p.shares).div(pc.shares.get(p.security)!));
  }
  // C6: each recipient gets a holder × carve-out line, its fixed share of what the carve-out is paid.
  if (carve) {
    total.set(CARVE_OUT, carvePaid);
    for (const a of capTable.carveOut!.allocation) addLine(a.holder, CARVE_OUT, carvePaid.times(a.share));
  }
  // C8, C9: each SAFE and each note is its own holder × security line.
  for (const f of pc.safes.values()) addLine(f.holder, f.id, total.get(f.id)!);
  for (const t of pc.notes.values()) addLine(t.note.holder, t.note.id, total.get(t.note.id)!);
  const firstTier = tiers.find((t) => t.index === 0);
  const curved =
    carveInTier && firstTier !== undefined && !firstTier.full && firstTier.series.includes(CARVE_OUT) && carve!.band < capTable.carveOut!.tiers.length && capTable.carveOut!.tiers[carve!.band]!.rate.gt(0);

  return {
    exitValue,
    decisions,
    strikeCash,
    commonPrice: price,
    bySecurity: total,
    series,
    carveOut: carve ? { claim: carve.claim, paid: carvePaid, band: carve.band } : null,
    safes,
    safeCash,
    notes,
    noteDebt,
    curved,
    lines,
    holderTotals,
    classTotals,
    tiers,
    atCap,
    capRoom,
  };
}
