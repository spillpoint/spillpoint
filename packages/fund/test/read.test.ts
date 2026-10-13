// Reading a fund's input, and refusing it (F18): every refusal fixture in the fund cases with its kind, term and field
// (FC7), and the reading rules the fixtures don't reach (FA2, FA3, FA12, FA13).

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { D, FundRefusal, readFund, splitAt } from "../src/index.ts";
import { CASES_DIR, REFUSAL_CASES, applyChange, readCaseFile } from "./support/cases.ts";
import type { CaseInputs } from "./support/cases.ts";

function refusal(input: unknown): { kind: string; term: string; field: string } {
  try {
    readFund(input);
  } catch (e) {
    expect(e).toBeInstanceOf(FundRefusal);
    const r = e as FundRefusal;
    return { kind: r.kind, term: r.term, field: r.field };
  }
  throw new Error("not refused");
}

interface Fixture {
  base: string;
  about: string;
  change: { set?: Record<string, unknown>; del?: string | string[] };
}

describe.each(REFUSAL_CASES)("%s", (dir) => {
  const expected = readCaseFile<{ fixtures: Record<string, { refused: { kind: string; term: string; field: string } }> }>(dir, "expected.json");
  const files = readdirSync(join(CASES_DIR, dir, "fixtures")).sort();

  it.each(files)("refuses %s with the case's kind, term and field", (file) => {
    const fixture = readCaseFile<Fixture>(dir, "fixtures", file);
    const base = readCaseFile<CaseInputs>(fixture.base, "inputs.json");
    expect(refusal(applyChange(base.fund, fixture.change))).toEqual(expected.fixtures[file]!.refused);
  });
});

/** Case 6's input, which the fixtures change: 20% carry, an 8% pref, a full catch-up, one call. */
const BASE = readCaseFile<CaseInputs>("fund-06-full-catch-up", "inputs.json").fund;
const change = (c: Fixture["change"]) => applyChange(BASE, c);

describe("reading", () => {
  it("reads case 6's terms and defaults", () => {
    const fund = readFund(BASE);
    expect(fund.distributionDate).toBe("2025-01-01"); // FA11: as_of
    expect(fund.final).toBe(false);
    expect(fund.nav).toBeNull();
    expect(fund.carry.map((s) => [s.rate.toString(), s.fromLpMultiple])).toEqual([["0.2", null]]);
    expect(fund.prefRate?.toString()).toBe("0.08");
    expect(fund.catchUpShare?.toString()).toBe("1");
    expect(fund.gpCommitment).toBeNull();
    // Read once and never changed, so the split can keep what it works out for it.
    expect([Object.isFrozen(fund), Object.isFrozen(fund.cashFlows), Object.isFrozen(fund.cashFlows[0]), Object.isFrozen(fund.carry[0])]).toEqual([true, true, true, true]);
  });

  it("gives carry of 20% when the terms don't, and a GP commitment fee-free, paying expenses (F3, F9)", () => {
    const fund = readFund({ as_of: "2025-01-01", terms: { gp_commitment: { share: "0.01" } }, cash_flows: BASE.cash_flows });
    expect(fund.carry[0]!.rate.toString()).toBe("0.2");
    expect(fund.gpCommitment).toMatchObject({ paysFees: false, paysExpenses: true });
  });

  it("reads null as left out, except carry (FA3)", () => {
    const fund = readFund(change({ set: { "terms.gp_commitment": null, nav: null, final: null, distribution_date: null, "terms.pref.compounding": null }, del: "terms.catch_up" }));
    expect([fund.gpCommitment, fund.nav, fund.final, fund.catchUpShare, fund.distributionDate]).toEqual([null, null, false, null, "2025-01-01"]);
    expect(refusal(change({ set: { "terms.carry": null } }))).toEqual({ kind: "input", term: "bad_number", field: "terms.carry" });
  });

  it("reads a simple pref named as one (F7)", () => {
    expect(readFund(change({ set: { "terms.pref.compounding": "simple" } })).prefRate?.toString()).toBe("0.08");
  });

  it("orders cash flows by date, calls before distributions, distributions as listed (F4, FA12)", () => {
    const fund = readFund({
      as_of: "2024-01-01",
      terms: {},
      cash_flows: [
        { date: "2023-01-01", type: "distribution", amount: "2" },
        { date: "2023-01-01", type: "distribution", amount: "1" },
        { date: "2023-01-01", type: "call", kind: "fee", amount: "3" },
        { date: "2020-01-01", type: "call", kind: "investment", amount: "10" },
      ],
    });
    expect(fund.cashFlows.map((f) => f.index)).toEqual([3, 2, 0, 1]);
  });
});

describe("refusing beyond the fixtures (F18, FA2)", () => {
  it.each([
    ["an unknown top-level field", { set: { currency: "USD" } }, "unknown_field", "currency"],
    ["a missing as_of", { del: "as_of" }, "missing_field", "as_of"],
    ["a final that isn't a boolean", { set: { final: "yes" } }, "bad_field", "final"],
    ["a month 13", { set: { distribution_date: "2025-13-01" } }, "bad_date", "distribution_date"],
    ["year 0", { set: { as_of: "0000-01-01" } }, "bad_date", "as_of"],
    ["29 February in a year without one", { set: { "cash_flows[0].date": "2019-02-29" } }, "bad_date", "cash_flows[0].date"],
    ["a negative NAV", { set: { nav: "-1" } }, "bad_number", "nav"],
    ["a zero amount", { set: { "cash_flows[0].amount": "0" } }, "bad_number", "cash_flows[0].amount"],
    ["a divide by zero", { set: { "cash_flows[0].amount": "5/0" } }, "bad_number", "cash_flows[0].amount"],
    ["a flow type that isn't one", { set: { "cash_flows[0].type": "transfer" } }, "bad_field", "cash_flows[0].type"],
    ["a call without a kind", { del: "cash_flows[0].kind" }, "missing_field", "cash_flows[0].kind"],
    ["a zero pref rate", { set: { "terms.pref.rate": "0" } }, "bad_number", "terms.pref.rate"],
    ["a catch-up share above 1", { set: { "terms.catch_up.gp_share": "1.5" } }, "bad_number", "terms.catch_up.gp_share"],
    ["a catch-up share of 0", { set: { "terms.catch_up.gp_share": "0" } }, "catch_up_share_not_above_carry", "terms.catch_up.gp_share"],
    ["a carry rate as a JSON number", { set: { "terms.carry": 0.2 } }, "bad_number", "terms.carry"],
    ["a negative carry rate", { set: { "terms.carry": "-0.1" } }, "bad_number", "terms.carry"],
    ["a first step with a multiple", { set: { "terms.carry": { steps: [{ rate: "0.2", from_lp_multiple: "2" }] } } }, "steps_out_of_order", "terms.carry.steps[0]"],
    ["a later step without one", { set: { "terms.carry": { steps: [{ rate: "0.2" }, { rate: "0.3" }] } } }, "missing_field", "terms.carry.steps[1].from_lp_multiple"],
    ["steps with falling multiples", { set: { "terms.carry": { steps: [{ rate: "0.1" }, { rate: "0.2", from_lp_multiple: "3" }, { rate: "0.3", from_lp_multiple: "2" }] } } }, "steps_out_of_order", "terms.carry.steps[2]"],
    ["no steps", { set: { "terms.carry": { steps: [] } } }, "bad_field", "terms.carry.steps"],
    ["a GP commitment flag that isn't a boolean", { set: { "terms.gp_commitment": { share: "0.01", pays_fees: 1 } } }, "bad_field", "terms.gp_commitment.pays_fees"],
    ["a distribution with a kind", { set: { cash_flows: [BASE.cash_flows as unknown[]].flat().concat([{ date: "2021-01-01", type: "distribution", kind: "fee", amount: "1" }]) } }, "unknown_field", "cash_flows[1].kind"],
  ] as const)("refuses %s", (_, c, term, field) => {
    expect(refusal(change(c as Fixture["change"]))).toEqual({ kind: "input", term, field });
  });

  it("refuses a term v1 doesn't model, by its own key, before anything else (FA2)", () => {
    expect(refusal(change({ set: { "terms.catch_up.lookback": "1" } }))).toEqual({ kind: "unsupported", term: "lookback", field: "terms.catch_up.lookback" });
    expect(refusal(change({ set: { as_of: "soon", "terms.american": true } }))).toEqual({ kind: "unsupported", term: "american", field: "terms.american" });
    const step = { steps: [{ rate: "0.2", hurdle: "0.08" }] };
    expect(refusal(change({ set: { "terms.carry": step } }))).toEqual({ kind: "unsupported", term: "hurdle", field: "terms.carry.steps[0].hurdle" });
  });

  it("refuses carry of 100% for itself, before the catch-up it also breaks (FA2)", () => {
    expect(refusal(change({ set: { "terms.carry": "1" } })).term).toBe("carry_rate_not_below_one");
  });

  it("refuses an input that isn't an object", () => {
    expect(refusal([])).toEqual({ kind: "input", term: "bad_field", field: "" });
  });
});

describe("X (FA13)", () => {
  const fund = readFund(BASE);

  it("is an exact amount from 0 up, given as a string or a Decimal", () => {
    expect(splitAt(fund, "0").distribution.lps.total.isZero()).toBe(true);
    expect(splitAt(fund, "1022320000/73").distribution.lps.pref.toFixed(2)).toBe("4004383.56");
    expect(splitAt(fund, new D("12000000")).distribution.lps.pref.toString()).toBe("2000000");
  });

  it.each(["-1", "1e6", "12,000", ""])("refuses %j as bad_number at x", (x) => {
    expect(() => splitAt(fund, x)).toThrow(FundRefusal);
    try {
      splitAt(fund, x);
    } catch (e) {
      expect([(e as FundRefusal).term, (e as FundRefusal).field]).toEqual(["bad_number", "x"]);
    }
  });
});
