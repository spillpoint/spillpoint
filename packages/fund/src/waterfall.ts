// The split of a distribution X on D (F14): this distribution and the fund to
// date by tier, and, when X is final or at the NAV point, the clawback (F12).
// With LPs, each one's share of the LPs' amounts (F20).
//
// European, cumulative (F1): every earlier distribution has run the same tiers
// in date order against the fund's running balances, and X runs them last.
//
// From 0.3.0 the LPs' side runs as one account per class (F23): the LPs on the
// fund's terms form one, and each class with LPs another. Each account has its
// part of every call (investment and expense calls by commitment, fee calls by
// F22's fee weight) and of every distribution (by commitment), each after the
// GP commitment's part (F3), and runs the tiers on its own: its paid-in as
// capital, its pref, its catch-up to its own carry rate, its steps by its own
// multiple. The fund's amounts are the accounts' sums (FA23), the GP
// commitment's line beside them. Each account settles its own clawback (F24).
// A fund without classes has one account, which takes every amount whole, so
// it splits exactly as 0.2.0 split it. Later closes change nothing here: every
// LP is in from the start (F25); equalization.ts works out what moves between
// LPs at each close.
//
// From 0.4.0 the calls are the entered ones and a management fee schedule's
// (F30), in F4's order (fees.ts, FA42), and each fee call counts at its full
// size, every LP's own fee in it (F29): one entered before a later close grows
// by the joiners' back fees, and each account's part is its LPs' fee weights
// times the call's rate per unit of weight (FA43).
//
// From 0.5.0 a fund can pay carry deal by deal (F34, F35). Then tier 1 at each
// distribution runs only until the LPs' capital back to date reaches what's due
// on the investments realized so far (portfolio.ts): their cost, the LPs' part,
// and the LPs' fees and expenses to date times the share of the cost made that's
// realized. Each account's due is its own. Everything else runs as on the whole
// fund, and at the end, X final or the NAV point, everything paid in is due, so
// the clawback is F12's and F24's as before.
//
// Amounts are decimal.js at 40 digits throughout; nothing is rounded here.

import { D, ONE, ZERO, exactOrNull } from "./decimal.ts";
import { dayNumber } from "./dates.ts";
import { refuse } from "./errors.ts";
import { gpCommitmentPart, runFlows } from "./fees.ts";
import type { RunFlow } from "./fees.ts";
import { callWeight, wasRead } from "./input.ts";
import type { CarryStep, Fund, Lp } from "./model.ts";
import { realizedAt, realizedByX } from "./portfolio.ts";
import type { Realized } from "./portfolio.ts";

/** One carry step's part of a split (F16): the GP's carry at this rate, and the LPs' share of the carry tier beside it. */
export interface StepCarry {
  rate: D;
  fromLpMultiple: D | null;
  /** The GP's carry at this step. */
  amount: D;
  /** The LPs' share of the carry tier at this step: 1 − rate of each dollar. The steps' add up to `lps.carryTier`. */
  lps: D;
  /** The account the step belongs to (F26): its class's name, or null for the fund's terms. */
  class: string | null;
}

/** A distribution, or the fund to date, by tier (F16). A tier the fund's terms don't have is zero. */
export interface Tiers {
  /** What was distributed: X, or every distribution to date. An account's: its part of them (F23). */
  amount: D;
  /** The GP commitment's line: its share of every distribution, outside the tiers (F3). Zero in an account's. */
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
    /** The GP's carry, by step: each account's steps in the terms' order, the fund's terms first (F26). */
    carry: StepCarry[];
    /** Catch-up plus carry: the GP's carry in all (FA1). */
    total: D;
  };
}

/** F12, when X is final or at the NAV point. The fund's is its accounts' (F24, FA23). */
export interface Clawback {
  /** The GP's catch-up and carry to date, X's included (FA1). */
  carryPaid: D;
  /** What one run of the tiers on the fund's totals gives the GP. With accounts, each account's own run's, summed. */
  entitlement: D;
  /** Carry paid less the entitlement, when that's positive; otherwise zero (one way only). The fund's sums each account's. */
  owed: D;
  /** The pref that run has: on paid-in less every distribution that ran the tiers, never below zero. Null without a pref. */
  prefOnFundTotals: D | null;
}

/**
 * F35, F36, from 0.5.0: what's due before carry on X, deal by deal: one account's own. Its LPs' part of the cost
 * realized, by commitment (FA60); at the end, X final or the NAV point, its capital called for investments and never
 * invested (FA49); and its fees and expenses to date times realized over made, all of them at the end (FA51).
 */
export interface AccountDue {
  /** The LPs' part of the cost realized: (1 − g) of it, by commitment. At the end, of the cost made. */
  cost: D;
  /** At the end, the LPs' part of the capital called for investments and never invested; zero before the end. */
  uninvested: D;
  /** The LPs' fees and expenses to date, their own (F29), times the cost realized over the cost made; all at the end. */
  feesAndExpenses: D;
  /** `cost` + `uninvested` + `feesAndExpenses`: tier 1 runs until the LPs' capital back to date reaches it. At the end, their paid-in. */
  total: D;
}

/** F36: the fund's due on X, deal by deal: the accounts' sums, beside the fund's cost made and realized. */
export interface Due {
  /** Every check to D, whole-fund. */
  costMade: D;
  /** Exited or written off, whole-fund, X's realization included: at the end, everything (FA58). */
  costRealized: D;
  cost: D;
  uninvested: D;
  feesAndExpenses: D;
  total: D;
}

/**
 * One LP's amounts in a split (F20): its part of its account's paid-in, of its total from X and to date, and of the
 * clawback owed back to the account (F23, F24). Within an account its LPs share by commitment, so these bend exactly
 * where its account's do.
 */
export interface LpAmounts {
  name: string;
  commitment: D;
  /** Its commitment over all the LPs' commitments (F19): its share of every distribution. */
  share: D;
  /** Its part of its account's LPs' paid-in. */
  paidIn: D;
  /** Its part of its account's LPs' total from X. */
  distribution: D;
  /** Its part of its account's LPs' total to date, X included. */
  toDate: D;
  /** Its part of its account's clawback owed, which comes back to its LPs: zero when nothing is; null without a clawback. */
  clawback: D | null;
  /** F22: its class's name, or null. */
  class: string | null;
  /** F25: its close as the input gives it, or null. */
  close: string | null;
}

/** One account's own split (F26): a class's, or the fund's terms'. */
export interface AccountSplit {
  /** Its class's name, or null for the fund's terms. */
  class: string | null;
  /** Its part of X, by tier with its own steps. */
  distribution: Tiers;
  /** Its to date, X included, by tier. */
  toDate: Tiers;
  /** Its LPs' paid-in. */
  paidIn: D;
  /** F6's pref accrued to D on its own unreturned capital, paid or not. Null without a pref. */
  prefAccrued: D | null;
  /** F10: its LPs' distributions to date after carry, over its paid-in. Null when it has nothing paid in (FA38). */
  lpMultiple: D | null;
  /** F24: its own clawback, when X is final or at the NAV point; null otherwise. */
  clawback: Clawback | null;
  /** F35, F36, from 0.5.0: deal by deal, its own due before carry on X; null on the whole fund. */
  due: AccountDue | null;
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
   * to date. The multiple carry steps are measured on; with accounts, each measures its own (`byAccount`).
   */
  lpMultiple: D;
  /** Null unless X is final or at the NAV point. */
  clawback: Clawback | null;
  /** F35, F36, from 0.5.0: deal by deal, what's due before carry on X; null on the whole fund. */
  due: Due | null;
  /** Each LP's amounts, in the input's order (F20); empty when the fund has no LPs. */
  byLp: LpAmounts[];
  /** Each account's own split, the fund's terms first (F26), with two or more accounts; empty otherwise. */
  byAccount: AccountSplit[];
}

const YEAR = 365; // Actual/365 (F6)

/** What one account's run of the tiers takes from the terms: the fund's pref and catch-up, its own carry (F22). */
export interface RunTerms {
  carry: CarryStep[];
  pref: { rate: D } | null;
  catchUp: { gpShare: D } | null;
  class: string | null;
}

/**
 * One class's account (F23). `whole` when it's the only one: it takes every call and distribution whole, so a fund
 * without classes runs exactly as before. Otherwise its part of each is the LPs' part times its weight over all the
 * LPs', multiplied first, so no share is rounded before it's used.
 */
export interface Account {
  class: string | null;
  /** Its LPs, in the input's order. */
  lps: Lp[];
  terms: RunTerms;
  whole: boolean;
  /** Its LPs' commitments, and all the LPs': its part of distributions, investment and expense calls. */
  commitment: D;
  allCommitments: D;
  /** Its LPs' fee weights, and all the LPs': its part of fee calls (F22). */
  feeWeight: D;
  allFeeWeights: D;
}

const accountsKept = new WeakMap<Fund, Account[]>();

/**
 * F23: the accounts, the fund's terms first, then each class an LP names in `lp_classes`' order (F26, FA22). A fund
 * without listed LPs has one, the whole LPs' side; so does one whose LPs are all on the fund's terms, or all in one
 * class. A fund built by hand without 0.3.0's fields has none of them.
 */
export function accountsOf(fund: Fund): Account[] {
  const known = accountsKept.get(fund);
  if (known) return known;
  const lps = fund.lps ?? [];
  const classes = fund.terms.lpClasses ?? [];
  const classOf = (lp: Lp) => lp.class ?? null;
  const groups: { cls: string | null; lps: Lp[] }[] = [{ cls: null, lps: lps.filter((lp) => classOf(lp) === null) }];
  for (const c of classes) groups.push({ cls: c.name, lps: lps.filter((lp) => classOf(lp) === c.name) });
  const used = lps.length === 0 ? [groups[0]!] : groups.filter((g) => g.lps.length > 0);
  const sum = (xs: D[]) => xs.reduce((t, x) => t.plus(x), ZERO);
  const allCommitments = sum(lps.map((lp) => lp.commitment));
  const allFeeWeights = sum(lps.map((lp) => callWeight(fund, lp, "fee")));
  const out = used.map((g): Account => {
    const cls = g.cls === null ? undefined : classes.find((c) => c.name === g.cls);
    return {
      class: g.cls,
      lps: g.lps,
      terms: { carry: cls?.carry ?? fund.terms.carry, pref: fund.terms.pref, catchUp: fund.terms.catchUp, class: g.cls },
      whole: used.length === 1,
      commitment: sum(g.lps.map((lp) => lp.commitment)),
      allCommitments,
      feeWeight: sum(g.lps.map((lp) => callWeight(fund, lp, "fee"))),
      allFeeWeights,
    };
  });
  if (wasRead(fund)) accountsKept.set(fund, out);
  return out;
}

/** F23: an account's part of the LPs' part of a distribution, by commitment. */
function distributionPart(account: Account, amount: D): D {
  return account.whole ? amount : amount.times(account.commitment).div(account.allCommitments);
}

/**
 * F23, F29: an account's part of a call's LPs' part, every LP in from the start. Investment and expense calls by
 * commitment. A fee call by fee weight: the call's rate per unit of weight, what the LPs who paid it as made paid over
 * their weights, times the account's LPs' weights, multiplied first (FA43).
 */
function callPart(account: Account, flow: RunFlow): D {
  if (account.whole) return flow.lps;
  if (flow.kind !== "fee") return flow.lps.times(account.commitment).div(account.allCommitments);
  if (!flow.paidBy.isZero()) return flow.paid.times(account.feeWeight).div(flow.paidBy);
  // No LP pays fees, in a fund built by hand that readFund would refuse (call_without_payers, F28, F32): an entered
  // fee call counts as 0.3.0 counted it, and a schedule's calls are $0 (FA48).
  return account.allFeeWeights.isZero() ? ZERO : flow.lps.times(account.feeWeight).div(account.allFeeWeights);
}

function emptyTiers(terms: RunTerms): Tiers {
  return {
    amount: ZERO,
    gpCommitment: ZERO,
    lps: { capital: ZERO, pref: ZERO, catchUp: ZERO, carryTier: ZERO, total: ZERO },
    gp: { catchUp: ZERO, carry: terms.carry.map((s) => ({ rate: s.rate, fromLpMultiple: s.fromLpMultiple, amount: ZERO, lps: ZERO, class: terms.class })), total: ZERO },
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

/** F23: the fund's tiers, the accounts' summed, their steps listed one after another, the fund's terms first (F26). */
function sumTiers(parts: Tiers[], amount: D, gpCommitment: D): Tiers {
  const total = (f: (t: Tiers) => D) => parts.reduce((s, t) => s.plus(f(t)), ZERO);
  return {
    amount,
    gpCommitment,
    lps: {
      capital: total((t) => t.lps.capital),
      pref: total((t) => t.lps.pref),
      catchUp: total((t) => t.lps.catchUp),
      carryTier: total((t) => t.lps.carryTier),
      total: total((t) => t.lps.total),
    },
    gp: { catchUp: total((t) => t.gp.catchUp), carry: parts.flatMap((t) => t.gp.carry.map((s) => ({ ...s }))), total: total((t) => t.gp.total) },
  };
}

/** Where a run of the tiers starts: what's still owed, and the account's standing so far. */
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
function runTiers(terms: RunTerms, amount: D, start: Start): Tiers {
  const out = emptyTiers(terms);
  out.amount = amount;
  let left = amount;
  let { lps, gp, profit } = start;

  // F5, tier 1: LPs get back all their paid-in capital to date first.
  const capital = D.min(left, start.capitalDue);
  out.lps.capital = capital;
  left = left.minus(capital);
  lps = lps.plus(capital);

  // F6, tier 2: the pref accrued and unpaid, all to LPs. Capital comes first.
  if (terms.pref && left.gt(ZERO)) {
    const pref = D.min(left, D.max(ZERO, start.prefDue));
    out.lps.pref = pref;
    left = left.minus(pref);
    lps = lps.plus(pref);
    profit = profit.plus(pref);
  }

  // F8, tier 3: the GP takes s of each dollar until its carry to date is c, the account's first carry rate (F22), of
  // all profit to date. Each dollar raises the profit by 1 and the GP's carry by s, so the shortfall c × profit − carry
  // closes by s − c a dollar.
  if (terms.catchUp && left.gt(ZERO)) {
    const s = terms.catchUp.gpShare;
    const c = terms.carry[0]!.rate;
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
  let k = stepReached(terms.carry, lps, start.paidIn);
  while (left.gt(ZERO)) {
    const rate = terms.carry[k]!.rate;
    const next = terms.carry[k + 1];
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

/** One account's running balances (F1), every cash flow given replayed, the pref accrued to D. */
interface Ledger {
  lpsPaidIn: D;
  capitalReturned: D;
  prefPaid: D;
  /** Σ unreturned capital × days, so the pref is r × this ÷ 365 (F6), one division, nothing rounded between. */
  unreturnedDays: D;
  /** Σ hurdle balance × days, paid-in less everything that ran the tiers, never below zero (F12). */
  hurdleDays: D;
  /** Everything that has run the account's tiers: its part of each distribution, after the GP commitment's share. */
  throughTiers: D;
  /** F35, FA51: its part of every fee and expense call, as the waterfall counts them, in its paid-in. */
  feesAndExpenses: D;
  toDate: Tiers;
}

/** The fund's ledgers at D: each account's, and the GP commitment's line beside them (F3). */
interface FundLedger {
  accounts: Ledger[];
  gpCommitmentPaidIn: D;
  /** Every distribution to date, and the GP commitment's share of each, summed distribution by distribution. */
  distributed: D;
  gpCommitmentDistributed: D;
  /** F35, FA49: the LPs' part of every investment call to date, whole-fund. */
  lpsInvestmentCalls: D;
}

function prefOn(terms: RunTerms, balanceDays: D): D {
  return terms.pref ? terms.pref.rate.times(balanceDays).div(YEAR) : ZERO;
}

/** F3: the GP commitment's share of a distribution, outside the tiers. */
function gpCommitmentShare(fund: Fund, amount: D): D {
  return (fund.terms.gpCommitment?.share ?? ZERO).times(amount);
}

/**
 * Where the account's next run of the tiers starts, from its running balances. F5: tier 1 is all its paid-in not yet
 * back. F35, deal by deal: only what's due not yet back, and when what's due is less than what's back already, nothing,
 * with nothing already returned taken back.
 */
function startOf(terms: RunTerms, ledger: Ledger, due: AccountDue | null): Start {
  return {
    capitalDue: due ? D.max(ZERO, due.total.minus(ledger.capitalReturned)) : ledger.lpsPaidIn.minus(ledger.capitalReturned),
    prefDue: prefOn(terms, ledger.unreturnedDays).minus(ledger.prefPaid),
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
    throughTiers: ledger.throughTiers.plus(tiers.amount),
    toDate: addTiers(ledger.toDate, tiers),
  };
}

/** F23: the account's part of a distribution's LPs' part, down its own tiers from where it stands. */
function distribute(account: Account, ledger: Ledger, lpsPart: D, due: AccountDue | null): Tiers {
  return runTiers(account.terms, distributionPart(account, lpsPart), startOf(account.terms, ledger, due));
}

/** F34: carry deal by deal. A fund built by hand without 0.5.0's `carryBasis` is on the whole fund (FA61). */
function dealByDeal(fund: Fund): boolean {
  return fund.terms.carryBasis === "deal_by_deal";
}

/**
 * FA60: the LPs' part of the cost is (1 − g) of every check, whatever the GP commitment pays of fees and expenses; an
 * account's part of that by commitment (F23).
 */
function lpsCost(fund: Fund, account: Account, cost: D): D {
  return distributionPart(account, ONE.minus(fund.terms.gpCommitment?.share ?? ZERO).times(cost));
}

/** F35: one account's due before carry, with the fund's cost made and realized at that moment, its balances as they stand. */
function accountDue(fund: Fund, account: Account, ledger: Ledger, at: Realized): AccountDue {
  const cost = lpsCost(fund, account, at.realized);
  // F35, FA51: fees and expenses to date, the account's own, times realized over made, by cost: multiplied first. With
  // nothing made, in a fund built by hand that readFund would refuse, nothing is realized either (FA62).
  const feesAndExpenses = at.made.isZero() ? ZERO : ledger.feesAndExpenses.times(at.realized).div(at.made);
  return { cost, uninvested: ZERO, feesAndExpenses, total: cost.plus(feesAndExpenses) };
}

/**
 * FA49: at the end, X final or the NAV point, the fund ends, so all an account's paid-in is due: the cost made (FA58),
 * all its fees and expenses, and its capital called for investments and never invested, which comes back as capital,
 * as on the whole fund. That last is its part of the LPs' investment calls less their part of the cost made, worked
 * out once, so it's exactly zero when every dollar called was invested; `total` is exactly the paid-in, and the three
 * add up to it within FA15.
 */
function accountDueAtEnd(fund: Fund, account: Account, ledger: Ledger, at: Realized, lpsInvestmentCalls: D): AccountDue {
  const g = fund.terms.gpCommitment?.share ?? ZERO;
  const uninvested = distributionPart(account, lpsInvestmentCalls.minus(ONE.minus(g).times(at.made)));
  return { cost: lpsCost(fund, account, at.made), uninvested, feesAndExpenses: ledger.feesAndExpenses, total: ledger.lpsPaidIn };
}

/** F35: each account's due on X, deal by deal, from where it stands at D; null on the whole fund. */
function duesOnX(fund: Fund, final: boolean): AccountDue[] | null {
  if (!dealByDeal(fund)) return null;
  const at = realizedByX(fund, final);
  const ledger = ledgerAtD(fund);
  return accountsOf(fund).map((account, i) =>
    final ? accountDueAtEnd(fund, account, ledger.accounts[i]!, at, ledger.lpsInvestmentCalls) : accountDue(fund, account, ledger.accounts[i]!, at),
  );
}

const ledgers = new WeakMap<Fund, FundLedger>();

/**
 * The ledgers X runs against (F14): every cash flow in F4's order, the schedule's calls among them (FA42), the pref
 * accrued to D. Kept for a fund readFund returned, which is frozen; worked from scratch on every call for one built by
 * hand, which can change after use.
 */
function ledgerAtD(fund: Fund): FundLedger {
  const known = ledgers.get(fund);
  if (known) return known;
  const accounts = accountsOf(fund);
  const deals = dealByDeal(fund);
  let books: Ledger[] = accounts.map((a) => ({
    lpsPaidIn: ZERO,
    capitalReturned: ZERO,
    prefPaid: ZERO,
    unreturnedDays: ZERO,
    hurdleDays: ZERO,
    throughTiers: ZERO,
    feesAndExpenses: ZERO,
    toDate: emptyTiers(a.terms),
  }));
  let gpCommitmentPaidIn = ZERO;
  let distributed = ZERO;
  let gpCommitmentDistributed = ZERO;
  let lpsInvestmentCalls = ZERO;
  let day: number | null = null;
  const advance = (to: number) => {
    if (day !== null && to > day) {
      const days = to - day;
      books = books.map((b) => {
        const unreturned = b.lpsPaidIn.minus(b.capitalReturned);
        const hurdle = D.max(ZERO, b.lpsPaidIn.minus(b.throughTiers));
        return { ...b, unreturnedDays: b.unreturnedDays.plus(unreturned.times(days)), hurdleDays: b.hurdleDays.plus(hurdle.times(days)) };
      });
    }
    day = to;
  };
  for (const flow of runFlows(fund)) {
    advance(flow.day);
    if (flow.type === "call") {
      gpCommitmentPaidIn = gpCommitmentPaidIn.plus(flow.gpCommitment);
      if (flow.kind === "investment") lpsInvestmentCalls = lpsInvestmentCalls.plus(flow.lps);
      books = books.map((b, i) => {
        const part = callPart(accounts[i]!, flow);
        // F35, FA51: fee and expense calls, a schedule's among them, are the fees and expenses in what's due.
        return { ...b, lpsPaidIn: b.lpsPaidIn.plus(part), feesAndExpenses: flow.kind === "investment" ? b.feesAndExpenses : b.feesAndExpenses.plus(part) };
      });
    } else {
      const gpc = gpCommitmentShare(fund, flow.amount);
      distributed = distributed.plus(flow.amount);
      gpCommitmentDistributed = gpCommitmentDistributed.plus(gpc);
      // F35, FA50: deal by deal, what's due by this distribution, its own realization included. Never the end's: the
      // fund ends only with X (FA49).
      const at = deals ? realizedAt(fund, flow.index!) : null;
      books = books.map((b, i) => after(b, distribute(accounts[i]!, b, flow.amount.minus(gpc), at && accountDue(fund, accounts[i]!, b, at))));
    }
  }
  advance(dayNumber(fund.distributionDate)!);
  const ledger: FundLedger = { accounts: books, gpCommitmentPaidIn, distributed, gpCommitmentDistributed, lpsInvestmentCalls };
  if (wasRead(fund)) ledgers.set(fund, ledger);
  return ledger;
}

/**
 * Where one account stands at D, before X (F14): where X's tiers start, and where the run on its totals starts once
 * X is added to it (F12, F24). For the breakpoints; not exported from the package.
 */
export interface StandingAtD {
  account: Account;
  /** X's run of the tiers starts here. */
  start: Start;
  /** Everything that ran the account's tiers before X: where its totals' run is before X adds to it. */
  throughTiers: D;
  /** F6's pref accrued to D, paid or not: what `pref_met` names (FA4). */
  prefAccrued: D;
  /** F12's pref, on the hurdle balance: the totals' run's pref tier. */
  prefOnFundTotals: D;
  /** F35, deal by deal: its due on X, the fund's own X final or not; null on the whole fund. `capital_returned` names it (FA57). */
  due: AccountDue | null;
}

export function standingsAtD(fund: Fund): StandingAtD[] {
  const ledger = ledgerAtD(fund);
  const dues = duesOnX(fund, fund.final);
  return accountsOf(fund).map((account, i) => {
    const book = ledger.accounts[i]!;
    const due = dues && dues[i]!;
    return {
      account,
      start: startOf(account.terms, book, due),
      throughTiers: book.throughTiers,
      prefAccrued: prefOn(account.terms, book.unreturnedDays),
      prefOnFundTotals: prefOn(account.terms, book.hurdleDays),
      due,
    };
  });
}

/**
 * F23: the dollars of X it takes to put `throughTiers` through one account's tiers: X less the GP commitment's share,
 * times the account's part of a distribution. For the breakpoints, which turn an account's tier sizes into dollars of X.
 */
export function throughTiersToX(fund: Fund, account: Account, throughTiers: D): D {
  const oneLessG = ONE.minus(fund.terms.gpCommitment?.share ?? ZERO);
  return account.whole ? throughTiers.div(oneLessG) : throughTiers.times(account.allCommitments).div(account.commitment.times(oneLessG));
}

/** The other way: each dollar of X puts this much through the account's tiers. */
export function perDollarOfX(fund: Fund, account: Account): D {
  const oneLessG = ONE.minus(fund.terms.gpCommitment?.share ?? ZERO);
  return account.whole ? oneLessG : oneLessG.times(account.commitment).div(account.allCommitments);
}

/**
 * F10: an account's LPs' distributions to date after carry, over its paid-in. FA38: an account with nothing paid in (a
 * class paying no fees, in a fund whose calls are all fee calls) has no multiple to give, so null; its carry is still
 * at its top rate from its first dollar, every step's threshold being a multiple of nothing (F11). The fund's own
 * multiple always has one: `call_without_payers` sees that the LPs together pay part of every call, from 0.4.0 a
 * schedule's too (F32).
 */
function multipleOf(lps: D, paidIn: D): D | null {
  return paidIn.isZero() ? null : lps.div(paidIn);
}

/** One account's split of X: its part, by tier, its to date, and its clawback when final. */
interface AccountRun {
  distribution: Tiers;
  toDate: Tiers;
  paidIn: D;
  prefAccrued: D;
  clawback: Clawback | null;
  due: AccountDue | null;
}

/**
 * F23, F24: X's LPs' part down each account's tiers, and, when final, each account's clawback on its own totals. Deal
 * by deal, X's tier 1 runs to its due on X (F35); when final, that's all its paid-in, so its clawback is F12's.
 */
export function runAccounts(fund: Fund, lpsPart: D, final: boolean): AccountRun[] {
  const ledger = ledgerAtD(fund);
  const dues = duesOnX(fund, final);
  return accountsOf(fund).map((account, i) => {
    const book = ledger.accounts[i]!;
    const due = dues && dues[i]!;
    const distribution = distribute(account, book, lpsPart, due);
    const now = after(book, distribution);
    let clawback: Clawback | null = null;
    if (final) {
      // F12, F24: the tiers once on the account's totals: all its paid-in as capital, the pref on its hurdle balance,
      // and every distribution that ran its tiers, X included (FA5).
      const totals = runTiers(account.terms, now.throughTiers, {
        capitalDue: now.lpsPaidIn,
        prefDue: prefOn(account.terms, now.hurdleDays),
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
        prefOnFundTotals: account.terms.pref ? prefOn(account.terms, now.hurdleDays) : null,
      };
    }
    return { distribution, toDate: now.toDate, paidIn: now.lpsPaidIn, prefAccrued: prefOn(account.terms, book.unreturnedDays), clawback, due };
  });
}

/** F24, FA23: the fund's clawback, its accounts' summed; the owed sums each account's, each floored at zero first. */
function fundClawback(fund: Fund, runs: AccountRun[]): Clawback | null {
  if (runs.some((r) => r.clawback === null)) return null;
  if (runs.length === 1) return runs[0]!.clawback;
  const total = (f: (c: Clawback) => D) => runs.reduce((s, r) => s.plus(f(r.clawback!)), ZERO);
  return {
    carryPaid: total((c) => c.carryPaid),
    entitlement: total((c) => c.entitlement),
    owed: total((c) => c.owed),
    prefOnFundTotals: fund.terms.pref ? total((c) => c.prefOnFundTotals!) : null,
  };
}

/** F36: the fund's due on X, deal by deal, its accounts' summed; null on the whole fund. */
function fundDue(fund: Fund, runs: AccountRun[], final: boolean): Due | null {
  if (runs.some((r) => r.due === null)) return null;
  const at = realizedByX(fund, final);
  const total = (f: (d: AccountDue) => D) => runs.reduce((s, r) => s.plus(f(r.due!)), ZERO);
  return {
    costMade: at.made,
    costRealized: at.realized,
    cost: total((d) => d.cost),
    uninvested: total((d) => d.uninvested),
    feesAndExpenses: total((d) => d.feesAndExpenses),
    total: total((d) => d.total),
  };
}

/**
 * F20, F23: each LP's part of its account's amounts. Each is the account's amount times the LP's commitment, divided by
 * the account's commitments: multiplied first, so a share like 11/21 is never rounded before it's used. Its `share`
 * is F19's, its commitment over all the LPs'.
 */
function byLp(fund: Fund, runs: AccountRun[]): LpAmounts[] {
  const accounts = accountsOf(fund);
  const lps = fund.lps ?? [];
  const all = lps.reduce((sum, lp) => sum.plus(lp.commitment), ZERO);
  return lps.map((lp) => {
    const i = accounts.findIndex((a) => a.lps.includes(lp));
    const account = accounts[i]!;
    const run = runs[i]!;
    const part = (amount: D) => amount.times(lp.commitment).div(account.commitment);
    return {
      name: lp.name,
      commitment: lp.commitment,
      share: lp.commitment.div(all),
      paidIn: part(run.paidIn),
      distribution: part(run.distribution.lps.total),
      toDate: part(run.toDate.lps.total),
      clawback: run.clawback && part(run.clawback.owed),
      class: lp.class ?? null,
      close: lp.close ?? null,
    };
  });
}

/**
 * The split of X, one more distribution on D after every earlier cash flow (F14, F16). `final` defaults to the fund's
 * own: with it, the clawback is worked out too (F12, F24). The NAV point is final by definition: `splitAtNav`.
 */
export function splitAt(fund: Fund, x: D | string, options: { final?: boolean } = {}): Split {
  // FA13: X is an amount from 0 up, an exact string (FC1) or a Decimal.
  // A Decimal from another clone is made the fund's, so every sum with it keeps 40 digits.
  const amount = typeof x === "string" ? exactOrNull(x) : new D(x);
  if (amount === null || !amount.isFinite() || (amount.isNegative() && !amount.isZero())) {
    throw refuse("bad_number", "x", "X must be an exact amount from 0 up");
  }
  const ledger = ledgerAtD(fund);
  const final = options.final ?? fund.final;
  const gpCommitment = gpCommitmentShare(fund, amount);
  const runs = runAccounts(fund, amount.minus(gpCommitment), final);
  const distributed = ledger.distributed.plus(amount);
  const distribution = sumTiers(runs.map((r) => r.distribution), amount, gpCommitment);
  const toDate = sumTiers(runs.map((r) => r.toDate), distributed, ledger.gpCommitmentDistributed.plus(gpCommitment));
  const lpsPaidIn = runs.reduce((s, r) => s.plus(r.paidIn), ZERO);
  const accounts = accountsOf(fund);
  return {
    x: amount,
    distribution,
    toDate,
    lpsPaidIn,
    gpCommitmentPaidIn: ledger.gpCommitmentPaidIn,
    prefAccrued: fund.terms.pref ? runs.reduce((s, r) => s.plus(r.prefAccrued), ZERO) : null,
    lpMultiple: toDate.lps.total.div(lpsPaidIn),
    clawback: fundClawback(fund, runs),
    due: fundDue(fund, runs, final),
    byLp: byLp(fund, runs),
    byAccount:
      runs.length < 2
        ? []
        : runs.map((r, i) => ({
            class: accounts[i]!.class,
            distribution: r.distribution,
            toDate: r.toDate,
            paidIn: r.paidIn,
            prefAccrued: fund.terms.pref ? r.prefAccrued : null,
            lpMultiple: multipleOf(r.toDate.lps.total, r.paidIn),
            clawback: r.clawback,
            due: r.due,
          })),
  };
}

/** The split at NAV (F14): "carry if the fund were liquidated at NAV on D", final by definition. Null without a NAV. */
export function splitAtNav(fund: Fund): Split | null {
  return fund.nav ? splitAt(fund, fund.nav, { final: true }) : null;
}
