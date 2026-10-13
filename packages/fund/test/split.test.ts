// The engine against every point of every fund case, to the cent (FC8): X and the fund to date by tier, the GP
// commitment's line, the paid-in and the pref to D, and, when final or at the NAV point, the clawback.

import { describe, expect, it } from "vitest";

import { readFund, splitAt, splitAtNav, toCents } from "../src/index.ts";
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
    expect(split.prefToD && toCents(split.prefToD)).toBe(expected.pref_accrued_to_d ?? null);

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
