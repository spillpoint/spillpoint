// The engine against every point of every fund case, to the cent (FC8): X and the fund to date by tier, the GP
// commitment's line, the paid-in and the pref to D, and, when final or at the NAV point, the clawback. With LPs, each
// LP's amounts (F20, FC9), to the cent and within FA15 of exact.

import { describe, expect, it } from "vitest";

import { D, readFund, splitAt, splitAtNav, toCents } from "../src/index.ts";
import type { LpAmounts, Split } from "../src/index.ts";
import { RUN_CASES, absentTiersAreZero, asCaseBlock, exact, readCaseFile } from "./support/cases.ts";
import type { CaseExpected, CaseInputs, CaseLpAmount, CasePoint } from "./support/cases.ts";
import { randomFund, seeded } from "./support/random.ts";

/** FA15: two ways of working out one exact amount agree within this. */
const CLOSE = new D("1e-18");

/** An LP's amount as the engine has it against the case's: equal to the cent, and within FA15 of the exact value. */
function sameAmount(got: D, want: CaseLpAmount, what: string) {
  expect(toCents(got), what).toBe(want.amount);
  expect(got.minus(exact(want.exact)).abs().lte(CLOSE), `${what}: ${got.toString()} against ${want.exact}`).toBe(true);
}

/** F20: each LP's amounts in a split, against the case's `lps` and the point's `by_lp` (FC9). */
function sameLps(split: Split, expected: CaseExpected, p: CasePoint) {
  if (!expected.lps) {
    expect(split.byLp, p.x).toEqual([]);
    return;
  }
  expect(split.byLp.map((lp) => lp.name), p.x).toEqual(expected.lps.map((lp) => lp.name));
  split.byLp.forEach((lp: LpAmounts, i) => {
    const want = expected.lps![i]!;
    const at = p.by_lp![i]!;
    const what = `${p.x} ${lp.name}`;
    expect(lp.commitment.eq(exact(want.commitment)), `${what} commitment`).toBe(true);
    expect(lp.share.minus(exact(want.share)).abs().lte(CLOSE), `${what} share`).toBe(true);
    sameAmount(lp.paidIn, want.paid_in, `${what} paid in`);
    sameAmount(lp.distribution, at.distribution, `${what} from X`);
    sameAmount(lp.toDate, at.to_date, `${what} to date`);
    // F20: its share of the clawback when final, and at the NAV point; null where the split has none.
    if (at.clawback) sameAmount(lp.clawback!, at.clawback, `${what} clawback`);
    else expect(lp.clawback, `${what} clawback`).toBeNull();
  });
}

describe.each(RUN_CASES)("%s", (dir) => {
  const inputs = readCaseFile<CaseInputs>(dir, "inputs.json");
  const expected = readCaseFile<CaseExpected>(dir, "expected.json");
  const fund = readFund(inputs.fund);

  it("reads the fund, final or not as the case is", () => {
    expect(fund.final).toBe(expected.final);
  });

  it.each(expected.points.map((p) => [p.x, p] as const))("splits %s as the case does", (_, p) => {
    // F14: the NAV point is final by definition.
    const final = expected.final || p.tags.includes("nav");
    const split = splitAt(fund, p.exact, { final });
    expect(asCaseBlock(fund, split.distribution)).toEqual(p.distribution);
    expect(asCaseBlock(fund, split.toDate)).toEqual(p.to_date);
    expect(absentTiersAreZero(fund, split)).toBe(true);

    expect(toCents(split.lpsPaidIn)).toBe(expected.lps_paid_in);
    if (expected.gp_commitment_paid_in) expect(toCents(split.gpCommitmentPaidIn)).toBe(expected.gp_commitment_paid_in);
    else expect(split.gpCommitmentPaidIn.isZero()).toBe(true);
    expect(split.prefAccrued && toCents(split.prefAccrued)).toBe(expected.pref_accrued_to_d ?? null);
    // F10: the LP multiple is the LPs' to date over their paid-in, exactly, and reproduces the case's LP total to the
    // cent. The cases don't record the multiple itself (FC4).
    expect(split.lpMultiple.times(split.lpsPaidIn).minus(split.toDate.lps.total).abs().lte("1e-25")).toBe(true);
    expect(split.lpMultiple.times(expected.lps_paid_in).minus(p.to_date.lps.total!).abs().lte("0.005")).toBe(true);
    // Each step's LP share is the GP's × (1 − rate) ÷ rate, and the steps' add up to the carry tier, for X and to date
    // (f01f review, answer 2).
    for (const t of [split.distribution, split.toDate]) {
      for (const s of t.gp.carry) {
        if (s.rate.gt(0)) expect(s.lps.minus(s.amount.times(D.sub(1, s.rate)).div(s.rate)).abs().lte("1e-20"), `${p.x} at ${s.rate}`).toBe(true);
      }
      expect(t.gp.carry.reduce((sum, s) => sum.plus(s.lps), new D(0)).minus(t.lps.carryTier).abs().lte("1e-20")).toBe(true);
    }

    if (!p.clawback) {
      expect(split.clawback).toBeNull();
      return;
    }
    const c = split.clawback!;
    expect({ carry_paid: toCents(c.carryPaid), entitlement: toCents(c.entitlement), owed: toCents(c.owed) }).toEqual(p.clawback);
    expect(c.prefOnFundTotals && toCents(c.prefOnFundTotals)).toBe(expected.pref_on_fund_totals ?? null);
  });

  it.each(expected.points.map((p) => [p.x, p] as const))("gives each LP its amounts at %s as the case does (F20)", (_, p) => {
    const final = expected.final || p.tags.includes("nav");
    sameLps(splitAt(fund, p.exact, { final }), expected, p);
  });

  const nav = expected.points.find((p) => p.tags.includes("nav"));
  if (nav) {
    it("splits at NAV as at the NAV point, final", () => {
      const split = splitAtNav(fund)!;
      expect(asCaseBlock(fund, split.distribution)).toEqual(nav.distribution);
      expect(split.clawback && toCents(split.clawback.owed)).toBe(nav.clawback!.owed);
      sameLps(split, expected, nav);
    });
  } else {
    it("has no NAV split without a NAV", () => {
      expect(splitAtNav(fund)).toBeNull();
    });
  }
});

describe("each LP's amounts on random funds (F20)", () => {
  it("add up to the LPs' own, in the commitments' proportions, on 200 funds with 1 to 9 LPs", () => {
    const rand = seeded(20261018);
    const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
    // Whole, decimal and fraction commitments, as F17 reads any exact number.
    const commitment = () => [String(int(1, 50) * 100_000), `${int(1, 999)}.${int(1, 99)}`, `${int(1, 100)}/${int(1, 13)}`][int(0, 2)]!;
    for (let i = 0; i < 200; i++) {
      const input = randomFund(rand);
      const lps = Array.from({ length: int(1, 9) }, (_, j) => ({ name: `LP ${j}`, commitment: commitment() }));
      const fund = readFund({ ...input, lps });
      const all = fund.lps.reduce((t, lp) => t.plus(lp.commitment), new D(0));
      for (const x of ["0", String(int(1, 400) * 100_000), `${int(1, 9999)}/7`]) {
        const split = splitAt(fund, x);
        const sums: [string, (lp: LpAmounts) => D | null, D | null][] = [
          ["paid in", (lp) => lp.paidIn, split.lpsPaidIn],
          ["from X", (lp) => lp.distribution, split.distribution.lps.total],
          ["to date", (lp) => lp.toDate, split.toDate.lps.total],
          ["clawback", (lp) => lp.clawback, split.clawback?.owed ?? null],
        ];
        for (const [what, of, total] of sums) {
          if (total === null) {
            expect(split.byLp.every((lp) => of(lp) === null), `${i} ${what}`).toBe(true);
            continue;
          }
          const sum = split.byLp.reduce((t, lp) => t.plus(of(lp)!), new D(0));
          expect(sum.minus(total).abs().lte(CLOSE), `${i} at ${x}: ${what}`).toBe(true);
          for (const lp of split.byLp) expect(of(lp)!.minus(total.times(lp.share)).abs().lte(CLOSE), `${i} ${lp.name} ${what}`).toBe(true);
        }
        expect(split.byLp.reduce((t, lp) => t.plus(lp.share), new D(0)).minus(1).abs().lte(CLOSE)).toBe(true);
        expect(split.byLp.map((lp) => lp.commitment.div(all).eq(lp.share))).not.toContain(false);
      }
    }
  });
});
