// Reading the fund cases (packages/fund/cases, FC2 to FC8) for the engine's tests.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { D, toCents } from "../../src/index.ts";
import type { Fund, Split, Tiers } from "../../src/index.ts";

export const CASES_DIR = resolve(import.meta.dirname, "../../cases");
/** Every fund case folder. */
export const CASE_FOLDERS = readdirSync(CASES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith("fund-"))
  .map((d) => d.name)
  .sort();
/**
 * Pending: cases added before the engine reads what they need, which its case tests skip until then. f02b, f03b and
 * f04b each emptied it. From f05a, 0.5.0's investments and carry deal by deal (F33 to F37), cases 33 to 37; f05b empties
 * it. test/pending.test.ts fails if a case folder is neither run nor pending, or if this list names a folder that
 * doesn't exist.
 */
export const PENDING: readonly string[] = [
  "fund-33-portfolio-whole-fund",
  "fund-34-deal-by-deal",
  "fund-35-deal-by-deal-clawback",
  "fund-36-deal-by-deal-classes-closes",
  "fund-37-deals-refused",
];
const ENGINE = CASE_FOLDERS.filter((n) => !PENDING.includes(n));
/** The cases run as a fund: an inputs.json each. */
export const RUN_CASES = ENGINE.filter((n) => existsSync(join(CASES_DIR, n, "inputs.json")));
/** The refusal cases: fixtures each changing a run case's inputs (FC7). */
export const REFUSAL_CASES = ENGINE.filter((n) => existsSync(join(CASES_DIR, n, "fixtures")));

export function readCaseFile<T>(...path: string[]): T {
  return JSON.parse(readFileSync(join(CASES_DIR, ...path), "utf8")) as T;
}

/** An exact string (FC1) at 40 digits: "a/b" is divided out. */
export function exact(s: string): D {
  if (!s.includes("/")) return new D(s);
  const [num, den] = s.split("/") as [string, string];
  return new D(num).div(den);
}

export interface CaseInputs {
  case: string;
  description: string;
  xs: string[];
  fund: Record<string, unknown>;
}

export interface CaseBlock {
  amount: string;
  gp_commitment?: string;
  lps: Record<string, string>;
  /** FC11: with two or more accounts, each step names its account's class (null for the fund's terms) first. */
  gp: { catch_up?: string; carry: { class?: string | null; rate: string; from_lp_multiple?: string; amount: string }[]; total: string };
}

export interface CaseClawback {
  carry_paid: string;
  entitlement: string;
  owed: string;
}

/** FC11: one account's amounts at a point, with two or more accounts. */
export interface CaseAccountPoint {
  class: string | null;
  distribution: CaseBlock;
  to_date: CaseBlock;
  clawback?: CaseClawback;
}

/** FC11: one LP's equalization, at a close or over all of them. */
export interface CaseMoves {
  name: string;
  capital_paid: CaseLpAmount;
  capital_returned: CaseLpAmount;
  interest_paid: CaseLpAmount;
  interest_received: CaseLpAmount;
  /** FC13: from 0.4.0, its back fees, paid to the manager (F29). */
  back_fees: CaseLpAmount;
}

/** FC13: one of a schedule's fee calls (F30, F31). */
export interface CaseFeeCall {
  date: string;
  first_day: string;
  last_day: string;
  call: CaseLpAmount;
  lps: CaseLpAmount;
  gp_commitment?: CaseLpAmount;
  by_lp?: { name: string; fee: CaseLpAmount }[];
}

/** FC9: an LP's amount, to the cent and exact. */
export interface CaseLpAmount {
  amount: string;
  exact: string;
}

export interface CasePoint {
  x: string;
  exact: string;
  tags: string[];
  distribution: CaseBlock;
  to_date: CaseBlock;
  clawback?: CaseClawback;
  /** FC11: each account's own amounts, with two or more accounts. */
  by_account?: CaseAccountPoint[];
  /** FC9: each LP's amounts at this point, when the fund has LPs. */
  by_lp?: { name: string; distribution: CaseLpAmount; to_date: CaseLpAmount; clawback?: CaseLpAmount }[];
}

export interface CaseExpected {
  case: string;
  final: boolean;
  lps_paid_in: string;
  gp_commitment_paid_in?: string;
  pref_accrued_to_d?: string;
  pref_on_fund_totals?: string;
  /** FC9: each LP's commitment, share and paid-in, when the fund has LPs; FC11: its class and later close. */
  lps?: { name: string; class?: string; close?: string; commitment: string; share: string; paid_in: CaseLpAmount }[];
  /** FC11: each account, with two or more. */
  accounts?: { class: string | null; commitment: string; share: string; fee_share: string; paid_in: string; pref_accrued_to_d?: string; pref_on_fund_totals?: string }[];
  /** FC13: with a schedule, its fee calls (F31). */
  fee_calls?: CaseFeeCall[];
  /** FC11: with a later close; FC13: the rate null when none is given (FA45). */
  equalization?: { rate: string | null; closes: { date: string; joining: string[]; lps: CaseMoves[] }[]; lps: CaseMoves[] };
  points: CasePoint[];
}

/** A rate or multiple as FC1 writes it: "0.2", "3". */
function rate(x: D): string {
  return x.toString();
}

/**
 * The engine's tiers in the case file's shape (FC4), every amount to the cent (FC8). A tier the fund's terms don't have
 * isn't listed, as the case files leave it out; the engine has it at zero, which `absentTiersAreZero` checks. With
 * `named`, each step gives its account's class first (FC11); an account's own block has no GP commitment's line.
 */
export function asCaseBlock(fund: Fund, t: Tiers, options: { named?: boolean; account?: boolean } = {}): CaseBlock {
  const lps: Record<string, string> = { capital: toCents(t.lps.capital), carry_tier: toCents(t.lps.carryTier), total: toCents(t.lps.total) };
  if (fund.terms.pref) lps.pref = toCents(t.lps.pref);
  if (fund.terms.catchUp) lps.catch_up = toCents(t.lps.catchUp);
  const carry = t.gp.carry.map((s) => ({
    ...(options.named ? { class: s.class } : {}),
    rate: rate(s.rate),
    ...(s.fromLpMultiple ? { from_lp_multiple: rate(s.fromLpMultiple) } : {}),
    amount: toCents(s.amount),
  }));
  return {
    amount: toCents(t.amount),
    ...(fund.terms.gpCommitment && !options.account ? { gp_commitment: toCents(t.gpCommitment) } : {}),
    lps,
    gp: { ...(fund.terms.catchUp ? { catch_up: toCents(t.gp.catchUp) } : {}), carry, total: toCents(t.gp.total) },
  };
}

/** A tier the terms don't have pays nothing. */
export function absentTiersAreZero(fund: Fund, split: Split): boolean {
  return [split.distribution, split.toDate].every(
    (t) =>
      (fund.terms.pref !== null || t.lps.pref.isZero()) &&
      (fund.terms.catchUp !== null || (t.lps.catchUp.isZero() && t.gp.catchUp.isZero())) &&
      (fund.terms.gpCommitment !== null || t.gpCommitment.isZero()),
  );
}

const PATH = /([^.[\]]+)|\[(\d+)\]/g;

function steps(path: string): (string | number)[] {
  return [...path.matchAll(PATH)].map((m) => (m[2] !== undefined ? Number(m[2]) : m[1]!));
}

/** FC7: `set` replaces the value at each path, `del` removes the value at a path, on a copy of the base's input. */
export function applyChange(base: Record<string, unknown>, change: { set?: Record<string, unknown>; del?: string | string[] }): unknown {
  const out = structuredClone(base) as Record<string | number, unknown>;
  const walk = (path: (string | number)[]) => path.reduce<Record<string | number, unknown>>((o, k) => o[k] as Record<string | number, unknown>, out);
  for (const [path, value] of Object.entries(change.set ?? {})) {
    const s = steps(path);
    walk(s.slice(0, -1))[s.at(-1)!] = structuredClone(value);
  }
  const dels = typeof change.del === "string" ? [change.del] : (change.del ?? []);
  for (const path of dels) {
    const s = steps(path);
    const parent = walk(s.slice(0, -1));
    const last = s.at(-1)!;
    if (Array.isArray(parent) && typeof last === "number") parent.splice(last, 1);
    else delete parent[last];
  }
  return out;
}
