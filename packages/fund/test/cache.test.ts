// What the split keeps for a fund: kept for one readFund returned, which is frozen; worked from scratch on every call
// for one built by hand, which can change after use (f01b review).

import { expect, it } from "vitest";

import { D, readFund, splitAt, toCents } from "../src/index.ts";
import type { CashFlow, Fund } from "../src/index.ts";

const call = (index: number, date: string, amount: string): CashFlow => ({ index, date, type: "call", kind: "investment", amount: new D(amount) });

it("works a fund built by hand from scratch, so a change after a split shows in the next one", () => {
  // One $5,000,000 call and 20% carry: at $12,500,000 the GP has 20% of $7,500,000.
  const fund: Fund = {
    asOf: "2026-03-01",
    terms: { carry: [{ rate: new D("0.2"), fromLpMultiple: null }], pref: null, catchUp: null, gpCommitment: null },
    cashFlows: [call(0, "2022-03-01", "5000000")],
    distributionDate: "2026-03-01",
    final: false,
    nav: null,
    lps: [],
  };
  expect(toCents(splitAt(fund, "12500000").distribution.gp.total)).toBe("1500000.00");

  // A second call of $1,000,000: $6,500,000 is above capital now, so the GP has $1,300,000, as a fresh read gives.
  fund.cashFlows.push(call(1, "2023-01-01", "1000000"));
  expect(toCents(splitAt(fund, "12500000").distribution.gp.total)).toBe("1300000.00");
  const read = readFund({
    as_of: "2026-03-01",
    terms: { carry: "0.2" },
    cash_flows: [
      { date: "2022-03-01", type: "call", kind: "investment", amount: "5000000" },
      { date: "2023-01-01", type: "call", kind: "investment", amount: "1000000" },
    ],
  });
  expect(toCents(splitAt(read, "12500000").distribution.gp.total)).toBe("1300000.00");
});

it("splits a fund built by hand as 0.1.0 built one, with no lps, as a fund with no LPs", () => {
  const fund = {
    asOf: "2026-03-01",
    terms: { carry: [{ rate: new D("0.2"), fromLpMultiple: null }], pref: null, catchUp: null, gpCommitment: null },
    cashFlows: [call(0, "2022-03-01", "5000000")],
    distributionDate: "2026-03-01",
    final: false,
    nav: null,
  } as unknown as Fund;
  const split = splitAt(fund, "12500000");
  expect(toCents(split.distribution.gp.total)).toBe("1500000.00");
  expect(split.byLp).toEqual([]);
});

it("keeps what it works out for a fund readFund returned, which can't change", () => {
  const fund = readFund({ as_of: "2026-03-01", terms: {}, cash_flows: [{ date: "2022-03-01", type: "call", kind: "investment", amount: "5000000" }] });
  expect(toCents(splitAt(fund, "12500000").distribution.gp.total)).toBe("1500000.00");
  expect(() => (fund.cashFlows as CashFlow[]).push(call(1, "2023-01-01", "1000000"))).toThrow(TypeError);
  expect(toCents(splitAt(fund, "12500000").distribution.gp.total)).toBe("1500000.00");
});
