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
 * Pending: spillpoint-fund 0.2.0's cases, the LPs (F19 to F21), added in f02a before the engine reads them. The
 * engine's case tests skip them until f02b, which empties this list. test/pending.test.ts fails if a case folder is
 * neither run nor pending, or if this list names a folder that doesn't exist. test/cases.test.ts checks the pending
 * cases' files meanwhile.
 */
export const PENDING: readonly string[] = ["fund-17-lps-three", "fund-18-lps-thirds", "fund-19-lps-clawback", "fund-20-lps-spv", "fund-21-lps-refused"];
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
  gp: { catch_up?: string; carry: { rate: string; from_lp_multiple?: string; amount: string }[]; total: string };
}

export interface CasePoint {
  x: string;
  exact: string;
  tags: string[];
  distribution: CaseBlock;
  to_date: CaseBlock;
  clawback?: { carry_paid: string; entitlement: string; owed: string };
}

export interface CaseExpected {
  case: string;
  final: boolean;
  lps_paid_in: string;
  gp_commitment_paid_in?: string;
  pref_accrued_to_d?: string;
  pref_on_fund_totals?: string;
  points: CasePoint[];
}

/** A rate or multiple as FC1 writes it: "0.2", "3". */
function rate(x: D): string {
  return x.toString();
}

/**
 * The engine's tiers in the case file's shape (FC4), every amount to the cent (FC8). A tier the fund's terms don't have
 * isn't listed, as the case files leave it out; the engine has it at zero, which `absentTiersAreZero` checks.
 */
export function asCaseBlock(fund: Fund, t: Tiers): CaseBlock {
  const lps: Record<string, string> = { capital: toCents(t.lps.capital), carry_tier: toCents(t.lps.carryTier), total: toCents(t.lps.total) };
  if (fund.terms.pref) lps.pref = toCents(t.lps.pref);
  if (fund.terms.catchUp) lps.catch_up = toCents(t.lps.catchUp);
  const carry = t.gp.carry.map((s) => ({
    rate: rate(s.rate),
    ...(s.fromLpMultiple ? { from_lp_multiple: rate(s.fromLpMultiple) } : {}),
    amount: toCents(s.amount),
  }));
  return {
    amount: toCents(t.amount),
    ...(fund.terms.gpCommitment ? { gp_commitment: toCents(t.gpCommitment) } : {}),
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
