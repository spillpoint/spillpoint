// What the split keeps for a fund: kept for one readFund returned, which is frozen; worked from scratch on every call
// for one built by hand, which can change after use (f01b review).

import { describe, expect, it } from "vitest";

import { D, equalization, feeCalls, findBreakpoints, readFund, splitAt, toCents } from "../src/index.ts";
import type { CashFlow, FeeCall, Fund } from "../src/index.ts";
import { readCaseFile } from "./support/cases.ts";
import type { CaseInputs } from "./support/cases.ts";

const call = (index: number, date: string, amount: string): CashFlow => ({ index, date, type: "call", kind: "investment", amount: new D(amount) });

it("works a fund built by hand from scratch, so a change after a split shows in the next one", () => {
  // One $5,000,000 call and 20% carry: at $12,500,000 the GP has 20% of $7,500,000.
  const fund: Fund = {
    asOf: "2026-03-01",
    terms: { carry: [{ rate: new D("0.2"), fromLpMultiple: null }], pref: null, catchUp: null, gpCommitment: null, feeRate: null, equalizationRate: null, lpClasses: [], managementFee: null },
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

it("splits a fund built by hand as 0.2.0 built one, without the classes' and closes' fields, as one without them", () => {
  // FA33: two LPs with neither a class nor a close, terms without the two rates or classes. A $5,000,000 call, 20%
  // carry: at $12,500,000 the GP has $1,500,000 and the LPs $11,000,000, 70% and 30%.
  const lp = (name: string, commitment: string) => ({ name, commitment: new D(commitment) });
  const fund = {
    asOf: "2026-03-01",
    terms: { carry: [{ rate: new D("0.2"), fromLpMultiple: null }], pref: null, catchUp: null, gpCommitment: null },
    cashFlows: [call(0, "2022-03-01", "5000000")],
    distributionDate: "2026-03-01",
    final: false,
    nav: null,
    lps: [lp("Alder", "7"), lp("Birch", "3")],
  } as unknown as Fund;
  const split = splitAt(fund, "12500000");
  expect(toCents(split.distribution.gp.total)).toBe("1500000.00");
  expect(split.byLp.map((l) => [toCents(l.distribution), l.class, l.close])).toEqual([["7700000.00", null, null], ["3300000.00", null, null]]);
  expect(split.byAccount).toEqual([]);
  expect(equalization(fund)).toBeNull();
});

it("splits a fund built by hand as 0.3.0 built one, without managementFee, as one without a schedule", () => {
  // FA33's rule from 0.4.0: a later close in a fund built without the schedule's field. A $5,000,000 investment call and
  // a $100,000 fee call before Birch joins, 20% carry. Alder, the only LP in, paid all $100,000 of the fee call: $100,000
  // over its weight of 7. Birch's back fees are that times its 3, $42,857.14, and the call counts at $142,857.14 (F29),
  // so the LPs' paid-in is $5,142,857.14.
  const lp = (name: string, commitment: string, close: string | null) => ({ name, commitment: new D(commitment), class: null, close });
  const fee: CashFlow = { index: 1, date: "2022-03-01", type: "call", kind: "fee", amount: new D("100000") };
  const fund = {
    asOf: "2026-03-01",
    terms: { carry: [{ rate: new D("0.2"), fromLpMultiple: null }], pref: null, catchUp: null, gpCommitment: null, feeRate: null, equalizationRate: new D("0.08"), lpClasses: [] },
    cashFlows: [call(0, "2022-03-01", "5000000"), fee],
    distributionDate: "2026-03-01",
    final: false,
    nav: null,
    lps: [lp("Alder", "7", null), lp("Birch", "3", "2022-09-01")],
  } as unknown as Fund;
  expect(toCents(splitAt(fund, "12500000").lpsPaidIn)).toBe("5142857.14");
  expect(feeCalls(fund)).toBeNull();
  expect(equalization(fund)!.lps.map((m) => [m.name, toCents(m.capitalPaid), toCents(m.backFees)])).toEqual([["Alder", "0.00", "0.00"], ["Birch", "1500000.00", "42857.14"]]);
});

it("keeps what it works out for a fund readFund returned, which can't change", () => {
  const fund = readFund({ as_of: "2026-03-01", terms: {}, cash_flows: [{ date: "2022-03-01", type: "call", kind: "investment", amount: "5000000" }] });
  expect(toCents(splitAt(fund, "12500000").distribution.gp.total)).toBe("1500000.00");
  expect(() => (fund.cashFlows as CashFlow[]).push(call(1, "2023-01-01", "1000000"))).toThrow(TypeError);
  expect(toCents(splitAt(fund, "12500000").distribution.gp.total)).toBe("1500000.00");
});

describe("hands back fresh fee calls each time, so what a caller does to them changes nothing it keeps (F31)", () => {
  // Case 31: sixteen quarterly calls, and Dogwood's back fees for the three before its close.
  const input = readCaseFile<CaseInputs>("fund-31-fee-schedule-classes-closes", "inputs.json").fund;
  /** Everything a fund gives: its fee calls, splits at three X's and final, its breakpoints and its equalization. */
  const answers = (fund: Fund) => {
    const splits = ["0", "10000000", "40000000"].map((x) => splitAt(fund, x));
    return JSON.parse(JSON.stringify([feeCalls(fund), splits, splitAt(fund, "10000000", { final: true }), findBreakpoints(fund), equalization(fund)]));
  };
  const fresh = answers(readFund(input));

  /** Every level of what feeCalls returns: the list, a call's dates and amounts, its LPs' list, an LP's fee, a D's digits. */
  function editAll(calls: FeeCall[]) {
    const [first, second, third] = calls as [FeeCall, FeeCall, FeeCall];
    Object.assign(first, { date: "2000-01-01", firstDay: "2000-01-01", lastDay: "2000-03-31", call: new D(999), lps: new D(999), gpCommitment: new D(1) });
    Object.assign(first.byLp[2]!, { name: "Someone else", fee: new D(1) });
    first.byLp.push({ name: "Extra", fee: new D(40000) });
    second.byLp.pop();
    second.byLp.reverse();
    third.call.d[0] = 7;
    third.byLp[2]!.fee.d[0] = 7;
    calls.splice(3, 2);
    calls.push({ ...first });
  }

  it("when they're asked for before the first split", () => {
    const fund = readFund(input);
    editAll(feeCalls(fund)!);
    expect(answers(fund)).toEqual(fresh);
  });

  it("when they're asked for after a split, the breakpoints and the equalization", () => {
    const fund = readFund(input);
    answers(fund);
    editAll(feeCalls(fund)!);
    expect(answers(fund)).toEqual(fresh);
  });

  it("as a new list of new calls each time", () => {
    const fund = readFund(input);
    const [a, b] = [feeCalls(fund)!, feeCalls(fund)!];
    expect(a).not.toBe(b);
    expect(a[0]).not.toBe(b[0]);
    expect(a[0]!.byLp).not.toBe(b[0]!.byLp);
    expect(a[0]!.call).not.toBe(b[0]!.call);
    expect(a).toEqual(b);
  });
});
