// The split of a distribution X on D (F14): this distribution and the fund to
// date by tier, and, when X is final or at the NAV point, the clawback (F12).
// With LPs, each one's share of the LPs' amounts (F20).
//
// European, cumulative (F1): every earlier distribution has run the same tiers
// in date order against the fund's running balances, and X runs them last.
// Amounts are decimal.js at 40 digits throughout; nothing is rounded here.

import { D, ONE, ZERO, exactOrNull } from "./decimal.ts";
import { dayNumber } from "./dates.ts";
import { refuse } from "./errors.ts";
import { wasRead } from "./input.ts";
import type { CarryStep, Fund, Lp } from "./model.ts";

/** One carry step's part of a split (F16): the GP's carry at this rate, and the LPs' share of the carry tier beside it. */
export interface StepCarry {
  rate: D;
  fromLpMultiple: D | null;
  /** The GP's carry at this step. */
  amount: D;
  /** The LPs' share of the carry tier at this step: 1 − rate of each dollar. The steps' add up to `lps.carryTier`. */
  lps: D;
}

/** A distribution, or the fund to date, by tier (F16). A tier the fund's terms don't have is zero. */
export interface Tiers {
  /** What was distributed: X, or every distribution to date. */
  amount: D;
  /** The GP commitment's line: its share of every distribution, outside the tiers (F3). */
  gpCommitment: D;
  lps: {
    capital: D;
    pref: D;
    /** The LPs' share of the catch-up tier: 1 − s of each dollar. */
    catchUp: D;
    /** The LPs' share of the carry tier, every step together. */
    carryTier: D;
    total: D;
  };
  gp: {
    catchUp: D;
    /** The GP's carry, by step, in the terms' order. */
    carry: StepCarry[];
    /** Catch-up plus carry: the GP's carry in all (FA1). */
    total: D;
  };
}

/** F12, when X is final or at the NAV point. */
export interface Clawback {
  /** The GP's catch-up and carry to date, X's included (FA1). */
  carryPaid: D;
  /** What one run of the tiers on the fund's totals gives the GP. */
  entitlement: D;
  /** Carry paid less the entitlement, when that's positive; otherwise zero (one way only). */
  owed: D;
  /** The pref that run has: on paid-in less every distribution that ran the tiers, never below zero. Null without a pref. */
  prefOnFundTotals: D | null;
}

/**
 * One LP's amounts in a split (F20): its share of the LPs' paid-in, of their total from X and to date, and of the
 * clawback owed back to them. Every LP is on the same terms (F19), so these are the LPs' amounts divided by
 * commitment, and they bend exactly where the LPs' do.
 */
export interface LpAmounts {
  name: string;
  commitment: D;
  /** Its commitment over all the LPs' commitments (F19). */
  share: D;
  /** Its share of the LPs' paid-in, `lpsPaidIn`. */
  paidIn: D;
  /** Its share of the LPs' total from X, `distribution.lps.total`. */
  distribution: D;
  /** Its share of the LPs' total to date, X included, `toDate.lps.total`. */
  toDate: D;
  /** Its share of the clawback owed, which comes back to the LPs: zero when nothing is; null without a clawback. */
  clawback: D | null;
}

export interface Split {
  x: D;
  /** X itself, by tier. */
  distribution: Tiers;
  /** The fund to date, X included, by tier. */
  toDate: Tiers;
  /** The LPs' paid-in capital to date: every call, less the GP commitment's part (F3, F5). */
  lpsPaidIn: D;
  gpCommitmentPaidIn: D;
  /** F6's pref accrued to D on the LPs' unreturned capital, paid or not. Null without a pref. */
  prefAccrued: D | null;
  /**
   * F10's LP multiple, net DPI: the LPs' distributions to date, X's included, after carry, over their paid-in capital
   * to date. The multiple carry steps are measured on.
   */
  lpMultiple: D;
  /** Null unless X is final or at the NAV point. */
  clawback: Clawback | null;
  /** Each LP's amounts, in the input's order (F20); empty when the fund has no LPs. */
  byLp: LpAmounts[];
}

const YEAR = 365; // Actual/365 (F6)

function emptyTiers(steps: CarryStep[]): Tiers {
  return {
    amount: ZERO,
    gpCommitment: ZERO,
    lps: { capital: ZERO, pref: ZERO, catchUp: ZERO, carryTier: ZERO, total: ZERO },
    gp: { catchUp: ZERO, carry: steps.map((s) => ({ rate: s.rate, fromLpMultiple: s.fromLpMultiple, amount: ZERO, lps: ZERO })), total: ZERO },
  };
}

function addTiers(a: Tiers, b: Tiers): Tiers {
  return {
    amount: a.amount.plus(b.amount),
    gpCommitment: a.gpCommitment.plus(b.gpCommitment),
    lps: {
      capital: a.lps.capital.plus(b.lps.capital),
      pref: a.lps.pref.plus(b.lps.pref),
      catchUp: a.lps.catchUp.plus(b.lps.catchUp),
      carryTier: a.lps.carryTier.plus(b.lps.carryTier),
      total: a.lps.total.plus(b.lps.total),
    },
    gp: {
      catchUp: a.gp.catchUp.plus(b.gp.catchUp),
      carry: a.gp.carry.map((s, i) => ({ ...s, amount: s.amount.plus(b.gp.carry[i]!.amount), lps: s.lps.plus(b.gp.carry[i]!.lps) })),
      total: a.gp.total.plus(b.gp.total),
    },
  };
}

/** Where a run of the tiers starts: what's still owed, and the fund's standing so far. */
export interface Start {
  capitalDue: D;
  prefDue: D;
  /** The LPs' distributions to date from the tiers (F10's numerator). */
  lps: D;
  /** The GP's catch-up and carry to date. */
  gp: D;
  /** Everything that has run the tiers beyond capital, LPs' and GP's (F8). */
  profit: D;
  paidIn: D;
}

/** F10, F11: the step whose multiple the LPs have reached. A step applies from its multiple on. */
export function stepReached(carry: CarryStep[], lps: D, paidIn: D): number {
  let k = 0;
  carry.forEach((s, i) => {
    if (s.fromLpMultiple && lps.gte(s.fromLpMultiple.times(paidIn))) k = i;
  });
  return k;
}

/** Runs `amount` down the four tiers from `start`: capital, pref, catch-up, carry (F5, F6, F8, F9). */
function runTiers(fund: Fund, amount: D, start: Start): Tiers {
  const out = emptyTiers(fund.terms.carry);
  out.amount = amount;
  let left = amount;
  let { lps, gp, profit } = start;

  // F5, tier 1: LPs get back all their paid-in capital to date first.
  const capital = D.min(left, start.capitalDue);
  out.lps.capital = capital;
  left = left.minus(capital);
  lps = lps.plus(capital);

  // F6, tier 2: the pref accrued and unpaid, all to LPs. Capital comes first.
  if (fund.terms.pref && left.gt(ZERO)) {
    const pref = D.min(left, D.max(ZERO, start.prefDue));
    out.lps.pref = pref;
    left = left.minus(pref);
    lps = lps.plus(pref);
    profit = profit.plus(pref);
  }

  // F8, tier 3: the GP takes s of each dollar until its carry to date is c, the first carry rate, of all profit to
  // date. Each dollar raises the profit by 1 and the GP's carry by s, so the shortfall c × profit − carry closes by
  // s − c a dollar.
  if (fund.terms.catchUp && left.gt(ZERO)) {
    const s = fund.terms.catchUp.gpShare;
    const c = fund.terms.carry[0]!.rate;
    const shortfall = c.times(profit).minus(gp);
    if (shortfall.gt(ZERO)) {
      const dollars = D.min(left, shortfall.div(s.minus(c)));
      out.gp.catchUp = dollars.times(s);
      out.lps.catchUp = dollars.minus(out.gp.catchUp);
      left = left.minus(dollars);
      gp = gp.plus(out.gp.catchUp);
      lps = lps.plus(out.lps.catchUp);
      profit = profit.plus(dollars);
    }
  }

  // F9 to F11, tier 4: carry at the step the LPs have reached; a higher rate only on profit above its threshold. The
  // LPs keep 1 − rate of each dollar, so the next step's multiple is (multiple × paid-in − LPs) ÷ (1 − rate) away.
  let k = stepReached(fund.terms.carry, lps, start.paidIn);
  while (left.gt(ZERO)) {
    const rate = fund.terms.carry[k]!.rate;
    const next = fund.terms.carry[k + 1];
    const dollars = next ? D.min(left, next.fromLpMultiple!.times(start.paidIn).minus(lps).div(ONE.minus(rate))) : left;
    const toGp = dollars.times(rate);
    out.gp.carry[k]!.amount = out.gp.carry[k]!.amount.plus(toGp);
    out.gp.carry[k]!.lps = out.gp.carry[k]!.lps.plus(dollars.minus(toGp));
    out.lps.carryTier = out.lps.carryTier.plus(dollars.minus(toGp));
    lps = lps.plus(dollars.minus(toGp));
    left = left.minus(dollars);
    if (next) k++;
  }

  out.lps.total = out.lps.capital.plus(out.lps.pref).plus(out.lps.catchUp).plus(out.lps.carryTier);
  out.gp.total = out.gp.carry.reduce((t, s) => t.plus(s.amount), out.gp.catchUp);
  return out;
}

/** The fund's running balances (F1), every cash flow given replayed, the pref accrued to D. */
interface Ledger {
  lpsPaidIn: D;
  gpCommitmentPaidIn: D;
  capitalReturned: D;
  prefPaid: D;
  /** Σ unreturned capital × days, so the pref is r × this ÷ 365 (F6), one division, nothing rounded between. */
  unreturnedDays: D;
  /** Σ hurdle balance × days, paid-in less everything that ran the tiers, never below zero (F12). */
  hurdleDays: D;
  /** Everything that has run the tiers: each distribution less the GP commitment's share. */
  throughTiers: D;
  toDate: Tiers;
}

function prefOn(fund: Fund, balanceDays: D): D {
  return fund.terms.pref ? fund.terms.pref.rate.times(balanceDays).div(YEAR) : ZERO;
}

/** F3: the GP commitment's part of a call, by its kind. */
function gpCommitmentPart(fund: Fund, kind: string | null, amount: D): D {
  const g = fund.terms.gpCommitment;
  if (!g) return ZERO;
  const pays = kind === "investment" || (kind === "expense" && g.paysExpenses) || (kind === "fee" && g.paysFees);
  return pays ? g.share.times(amount) : ZERO;
}

/** F3 and the tiers: g of the distribution to the GP commitment, the rest down the tiers from where the fund stands. */
function distribute(fund: Fund, ledger: Ledger, amount: D): Tiers {
  const gpCommitment = (fund.terms.gpCommitment?.share ?? ZERO).times(amount);
  const tiers = runTiers(fund, amount.minus(gpCommitment), startOf(fund, ledger));
  return { ...tiers, amount, gpCommitment };
}

/** Where the next distribution's run of the tiers starts, from the running balances. */
function startOf(fund: Fund, ledger: Ledger): Start {
  return {
    capitalDue: ledger.lpsPaidIn.minus(ledger.capitalReturned),
    prefDue: prefOn(fund, ledger.unreturnedDays).minus(ledger.prefPaid),
    lps: ledger.toDate.lps.total,
    gp: ledger.toDate.gp.total,
    profit: ledger.throughTiers.minus(ledger.capitalReturned),
    paidIn: ledger.lpsPaidIn,
  };
}

function after(ledger: Ledger, tiers: Tiers): Ledger {
  return {
    ...ledger,
    capitalReturned: ledger.capitalReturned.plus(tiers.lps.capital),
    prefPaid: ledger.prefPaid.plus(tiers.lps.pref),
    throughTiers: ledger.throughTiers.plus(tiers.amount.minus(tiers.gpCommitment)),
    toDate: addTiers(ledger.toDate, tiers),
  };
}

const ledgers = new WeakMap<Fund, Ledger>();

/**
 * The ledger X runs against (F14): every cash flow in F4's order, the pref accrued to D. Kept for a fund readFund
 * returned, which is frozen; worked from scratch on every call for one built by hand, which can change after use.
 */
function ledgerAtD(fund: Fund): Ledger {
  const known = ledgers.get(fund);
  if (known) return known;
  let ledger: Ledger = {
    lpsPaidIn: ZERO,
    gpCommitmentPaidIn: ZERO,
    capitalReturned: ZERO,
    prefPaid: ZERO,
    unreturnedDays: ZERO,
    hurdleDays: ZERO,
    throughTiers: ZERO,
    toDate: emptyTiers(fund.terms.carry),
  };
  let day: number | null = null;
  const advance = (to: number) => {
    if (day !== null && to > day) {
      const days = to - day;
      const unreturned = ledger.lpsPaidIn.minus(ledger.capitalReturned);
      const hurdle = D.max(ZERO, ledger.lpsPaidIn.minus(ledger.throughTiers));
      ledger = { ...ledger, unreturnedDays: ledger.unreturnedDays.plus(unreturned.times(days)), hurdleDays: ledger.hurdleDays.plus(hurdle.times(days)) };
    }
    day = to;
  };
  for (const flow of fund.cashFlows) {
    advance(dayNumber(flow.date)!);
    if (flow.type === "call") {
      const gp = gpCommitmentPart(fund, flow.kind, flow.amount);
      ledger = { ...ledger, gpCommitmentPaidIn: ledger.gpCommitmentPaidIn.plus(gp), lpsPaidIn: ledger.lpsPaidIn.plus(flow.amount.minus(gp)) };
    } else {
      ledger = after(ledger, distribute(fund, ledger, flow.amount));
    }
  }
  advance(dayNumber(fund.distributionDate)!);
  if (wasRead(fund)) ledgers.set(fund, ledger);
  return ledger;
}

/**
 * Where the fund stands at D, before X (F14): where X's tiers start, and where the run on the fund's totals starts
 * once X is added to it (F12). For the breakpoints; not exported from the package.
 */
export interface StandingAtD {
  /** X's run of the tiers starts here. */
  start: Start;
  /** Everything that ran the tiers before X: where the totals' run is before X adds to it. */
  throughTiers: D;
  /** F6's pref accrued to D, paid or not: what `pref_met` names (FA4). */
  prefAccrued: D;
  /** F12's pref, on the hurdle balance: the totals' run's pref tier. */
  prefOnFundTotals: D;
}

export function standingAtD(fund: Fund): StandingAtD {
  const ledger = ledgerAtD(fund);
  return {
    start: startOf(fund, ledger),
    throughTiers: ledger.throughTiers,
    prefAccrued: prefOn(fund, ledger.unreturnedDays),
    prefOnFundTotals: prefOn(fund, ledger.hurdleDays),
  };
}

/**
 * F20: each LP's share of the LPs' amounts. Each is the LPs' amount times the LP's commitment, divided by all the LPs'
 * commitments: multiplied first, so a share like 11/21 is never rounded before it's used.
 */
function byLp(lps: Lp[], paidIn: D, distribution: Tiers, toDate: Tiers, clawback: Clawback | null): LpAmounts[] {
  const all = lps.reduce((sum, lp) => sum.plus(lp.commitment), ZERO);
  const part = (amount: D, lp: Lp) => amount.times(lp.commitment).div(all);
  return lps.map((lp) => ({
    name: lp.name,
    commitment: lp.commitment,
    share: lp.commitment.div(all),
    paidIn: part(paidIn, lp),
    distribution: part(distribution.lps.total, lp),
    toDate: part(toDate.lps.total, lp),
    clawback: clawback && part(clawback.owed, lp),
  }));
}

/**
 * The split of X, one more distribution on D after every earlier cash flow (F14, F16). `final` defaults to the fund's
 * own: with it, the clawback is worked out too (F12). The NAV point is final by definition: `splitAtNav`.
 */
export function splitAt(fund: Fund, x: D | string, options: { final?: boolean } = {}): Split {
  // FA13: X is an amount from 0 up, an exact string (FC1) or a Decimal.
  // A Decimal from another clone is made the fund's, so every sum with it keeps 40 digits.
  const amount = typeof x === "string" ? exactOrNull(x) : new D(x);
  if (amount === null || !amount.isFinite() || (amount.isNegative() && !amount.isZero())) {
    throw refuse("bad_number", "x", "X must be an exact amount from 0 up");
  }
  const ledger = ledgerAtD(fund);
  const distribution = distribute(fund, ledger, amount);
  const now = after(ledger, distribution);
  const final = options.final ?? fund.final;
  let clawback: Clawback | null = null;
  if (final) {
    // F12: the tiers once on the fund's totals: all LP paid-in as capital, the pref on the hurdle balance, and every
    // distribution that ran the tiers, X included (FA5).
    const totals = runTiers(fund, now.throughTiers, {
      capitalDue: now.lpsPaidIn,
      prefDue: prefOn(fund, now.hurdleDays),
      lps: ZERO,
      gp: ZERO,
      profit: ZERO,
      paidIn: now.lpsPaidIn,
    });
    const carryPaid = now.toDate.gp.total;
    clawback = {
      carryPaid,
      entitlement: totals.gp.total,
      owed: D.max(ZERO, carryPaid.minus(totals.gp.total)),
      prefOnFundTotals: fund.terms.pref ? prefOn(fund, now.hurdleDays) : null,
    };
  }
  return {
    x: amount,
    distribution,
    toDate: now.toDate,
    lpsPaidIn: now.lpsPaidIn,
    gpCommitmentPaidIn: now.gpCommitmentPaidIn,
    prefAccrued: fund.terms.pref ? prefOn(fund, ledger.unreturnedDays) : null,
    lpMultiple: now.toDate.lps.total.div(now.lpsPaidIn),
    clawback,
    // A fund built by hand the way 0.1.0 built one has no `lps`: it has no LPs, as an empty list.
    byLp: byLp(fund.lps ?? [], now.lpsPaidIn, distribution, now.toDate, clawback),
  };
}

/** The split at NAV (F14): "carry if the fund were liquidated at NAV on D", final by definition. Null without a NAV. */
export function splitAtNav(fund: Fund): Split | null {
  return fund.nav ? splitAt(fund, fund.nav, { final: true }) : null;
}
