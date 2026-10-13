// The engine against every point of every fund case, to the cent (FC8): X and the fund to date by tier, the GP
// commitment's line, the paid-in and the pref to D, and, when final or at the NAV point, the clawback.

import { describe, expect, it } from "vitest";

import { D, readFund, splitAt, splitAtNav, toCents } from "../src/index.ts";
import { RUN_CASES, absentTiersAreZero, asCaseBlock, readCaseFile } from "./support/cases.ts";
import type { CaseExpected, CaseInputs } from "./support/cases.ts";

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

  const nav = expected.points.find((p) => p.tags.includes("nav"));
  if (nav) {
    it("splits at NAV as at the NAV point, final", () => {
      const split = splitAtNav(fund)!;
      expect(asCaseBlock(fund, split.distribution)).toEqual(nav.distribution);
      expect(split.clawback && toCents(split.clawback.owed)).toBe(nav.clawback!.owed);
    });
  } else {
    it("has no NAV split without a NAV", () => {
      expect(splitAtNav(fund)).toBeNull();
    });
  }
});
