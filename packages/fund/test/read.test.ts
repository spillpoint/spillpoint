// Reading a fund's input, and refusing it (F18): every refusal fixture in the fund cases with its kind, term and field
// (FC7), and the reading rules the fixtures don't reach (FA2, FA3, FA12, FA13).

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { D, FundRefusal, equalization, findBreakpoints, readFund, splitAt } from "../src/index.ts";
import { CASES_DIR, PENDING_FIXTURES, REFUSAL_CASES, applyChange, readCaseFile } from "./support/cases.ts";
import type { CaseInputs } from "./support/cases.ts";

function refusal(input: unknown): { kind: string; term: string; field: string } {
  try {
    readFund(input);
  } catch (e) {
    expect(e).toBeInstanceOf(FundRefusal);
    const r = e as FundRefusal;
    // The case files call the path `field` (FC7).
    return { kind: r.kind, term: r.term, field: r.path };
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
  // A pending fixture's expectation is ahead of the engine (support/cases.ts).
  const files = readdirSync(join(CASES_DIR, dir, "fixtures"))
    .sort()
    .filter((file) => !PENDING_FIXTURES.includes(`${dir}/fixtures/${file}`));

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
    expect(fund.terms.carry.map((s) => [s.rate.toString(), s.fromLpMultiple])).toEqual([["0.2", null]]);
    expect(fund.terms.pref?.rate.toString()).toBe("0.08");
    expect(fund.terms.catchUp?.gpShare.toString()).toBe("1");
    expect(fund.terms.gpCommitment).toBeNull();
    // Read once and never changed, so the split can keep what it works out for it.
    expect([Object.isFrozen(fund), Object.isFrozen(fund.cashFlows), Object.isFrozen(fund.cashFlows[0]), Object.isFrozen(fund.terms.carry[0])]).toEqual([true, true, true, true]);
  });

  it("gives carry of 20% when the terms don't, and a GP commitment fee-free, paying expenses (F3, F9)", () => {
    const fund = readFund({ as_of: "2025-01-01", terms: { gp_commitment: { share: "0.01" } }, cash_flows: BASE.cash_flows });
    expect(fund.terms.carry[0]!.rate.toString()).toBe("0.2");
    expect(fund.terms.gpCommitment).toMatchObject({ paysFees: false, paysExpenses: true });
  });

  it("reads null as left out, except carry (FA3)", () => {
    const fund = readFund(change({ set: { "terms.gp_commitment": null, nav: null, final: null, distribution_date: null, "terms.pref.compounding": null }, del: "terms.catch_up" }));
    expect([fund.terms.gpCommitment, fund.nav, fund.final, fund.terms.catchUp, fund.distributionDate]).toEqual([null, null, false, null, "2025-01-01"]);
    expect(refusal(change({ set: { "terms.carry": null } }))).toEqual({ kind: "input", term: "bad_number", field: "terms.carry" });
  });

  it("reads a simple pref named as one (F7)", () => {
    expect(readFund(change({ set: { "terms.pref.compounding": "simple" } })).terms.pref?.rate.toString()).toBe("0.08");
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

describe("the LPs (F19, F21, FA17 to FA19)", () => {
  const lps = (list: unknown) => ({ ...BASE, lps: list });
  const lp = (name: unknown, commitment: unknown = "1000000") => ({ name, commitment });

  it("reads them in the input's order, names as written, commitments exact, frozen with the rest", () => {
    const fund = readFund(lps([lp("Alder ", "5000000"), lp("alder", "3.5"), lp("Alder", "10/3")]));
    expect(fund.lps.map((l) => [l.name, l.commitment.toString()])).toEqual([
      ["Alder ", "5000000"],
      ["alder", "3.5"],
      ["Alder", new D(10).div(3).toString()],
    ]);
    expect([Object.isFrozen(fund.lps), Object.isFrozen(fund.lps[0])]).toEqual([true, true]);
  });

  it("reads none when they're left out, null or an empty list", () => {
    for (const fund of [readFund(BASE), readFund(lps(null)), readFund(lps([]))]) expect(fund.lps).toEqual([]);
  });

  it.each([
    ["a list that's an object", {}, "bad_field", "lps"],
    ["an LP that's null", [lp("Alder"), null], "bad_field", "lps[1]"],
    ["a null name", [lp(null)], "missing_field", "lps[0].name"],
    ["a null commitment", [lp("Alder", null)], "missing_field", "lps[0].commitment"],
    ["neither, the name first", [{}], "missing_field", "lps[0].name"],
    ["a name of true", [lp(true)], "bad_field", "lps[0].name"],
    ["a name that's a list", [lp(["Alder"])], "bad_field", "lps[0].name"],
    ["a commitment in exponent form", [lp("Alder", "1e6")], "bad_number", "lps[0].commitment"],
    ["a commitment with commas", [lp("Alder", "1,000,000")], "bad_number", "lps[0].commitment"],
    ["a commitment divided by zero", [lp("Alder", "1/0")], "bad_number", "lps[0].commitment"],
    ["a blank commitment", [lp("Alder", "")], "bad_number", "lps[0].commitment"],
  ] as const)("refuses %s", (_, list, term, field) => {
    expect(refusal(lps(list))).toEqual({ kind: "input", term, field });
  });

  it("refuses any other field as unsupported, null included, the first in the file's order (FA18)", () => {
    expect(refusal(lps([{ ...lp("Alder"), carry: null }]))).toEqual({ kind: "unsupported", term: "carry", field: "lps[0].carry" });
    expect(refusal(lps([{ mgmt_fee: "0.015", carry: "0.15" }]))).toEqual({ kind: "unsupported", term: "mgmt_fee", field: "lps[0].mgmt_fee" });
  });

  it.each([["", "empty"], [" ", "a space"], ["\u00a0", "a no-break space"], ["\ufeff\t", "a byte-order mark and a tab"], ["\u2003\u3000\n", "wide spaces and a line feed"]])(
    "refuses a name of %j, blank (FA17)",
    (name) => {
      expect(refusal(lps([lp(name)]))).toEqual({ kind: "input", term: "bad_field", field: "lps[0].name" });
    },
  );

  it.each([["\u001c"], ["\u0085"], ["\u200b"]])("reads a name of %j, which trim doesn't take off, though Python's isspace may (FA17)", (name) => {
    expect(readFund(lps([lp(name)])).lps[0]!.name).toBe(name);
  });

  it("refuses a name an earlier LP has, compared exactly as written (F19, FA17)", () => {
    expect(refusal(lps([lp("Alder"), lp("Birch"), lp("Birch")]))).toEqual({ kind: "input", term: "lp_name_repeated", field: "lps[2].name" });
  });

  it("checks the LPs after everything else in the input (FA19)", () => {
    const sideLetter = [{ ...lp("Alder"), carry: "0.15" }];
    expect(refusal({ ...BASE, as_of: "soon", lps: sideLetter })).toEqual({ kind: "input", term: "bad_date", field: "as_of" });
    expect(refusal({ ...BASE, distribution_date: "2019-01-01", lps: "x" })).toEqual({ kind: "input", term: "cash_flow_after_distribution_date", field: "cash_flows[0]" });
    expect(refusal(change({ set: { "terms.hurdle_irr": "0.08", lps: sideLetter } }))).toEqual({ kind: "unsupported", term: "hurdle_irr", field: "terms.hurdle_irr" });
  });

  it("checks one LP through before the next, in F21's order (FA19)", () => {
    expect(refusal(lps([lp("Alder"), lp("Alder"), lp("Birch", "0")]))).toEqual({ kind: "input", term: "lp_name_repeated", field: "lps[1].name" });
    expect(refusal(lps([{ name: "", commitment: "0", carry: "0.15" }]))).toEqual({ kind: "unsupported", term: "carry", field: "lps[0].carry" });
    expect(refusal(lps([lp("", "0")]))).toEqual({ kind: "input", term: "bad_field", field: "lps[0].name" });
    expect(refusal(lps([lp("Alder"), lp("Alder", "0")]))).toEqual({ kind: "input", term: "bad_number", field: "lps[1].commitment" });
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
      expect([(e as FundRefusal).term, (e as FundRefusal).path]).toEqual(["bad_number", "x"]);
    }
  });
});

describe("classes and later closes (F22, F25, F28, FA21 to FA31)", () => {
  /** Case 22's input: a friends-and-family class beside the fund's terms, Cedar in it. */
  const C22 = readCaseFile<CaseInputs>("fund-22-classes-fee-carry", "inputs.json").fund;
  /** Case 25's input: Cedar closing after the first calls, with an 8% equalization rate. */
  const C25 = readCaseFile<CaseInputs>("fund-25-later-close", "inputs.json").fund;
  const refused = (base: Record<string, unknown>, c: Fixture["change"]) => refusal(applyChange(base, c));
  const input = (term: string, field: string) => ({ kind: "input", term, field });

  it("reads the classes, each LP's class and close, and the two rates, frozen with the rest", () => {
    const fund = readFund(C22);
    expect([fund.terms.feeRate?.toString(), fund.terms.equalizationRate]).toEqual(["0.02", null]);
    const [ff] = fund.terms.lpClasses;
    expect([ff!.name, ff!.feeRate?.toString(), ff!.carry!.map((s) => [s.rate.toString(), s.fromLpMultiple])]).toEqual(["Friends and family", "0", [["0", null]]]);
    expect(fund.lps.map((lp) => lp.class)).toEqual([null, null, "Friends and family"]);
    expect([Object.isFrozen(fund.terms.lpClasses), Object.isFrozen(ff), Object.isFrozen(ff!.carry)]).toEqual([true, true, true]);
    // A class without terms of its own pays the fund's: null fee rate and carry.
    const plain = readFund(applyChange(C22, { set: { "terms.lp_classes[0]": { name: "Friends and family" } } }));
    expect([plain.terms.lpClasses[0]!.feeRate, plain.terms.lpClasses[0]!.carry]).toEqual([null, null]);
    expect(readFund(C25).lps.map((lp) => lp.close)).toEqual([null, null, "2021-07-15"]);
  });

  it("reads null as left out for the new fields, but refuses a class's null carry (FA24)", () => {
    const fund = readFund(applyChange(C22, { set: { "terms.equalization_rate": null, "terms.lp_classes[0].fee_rate": null, "lps[0].class": null, "lps[0].close": null } }));
    expect([fund.terms.equalizationRate, fund.terms.lpClasses[0]!.feeRate, fund.lps[0]!.class, fund.lps[0]!.close]).toEqual([null, null, null, null]);
    for (const none of [null, []]) expect(readFund(applyChange(C22, { set: { "terms.lp_classes": none, "lps[2].class": null } })).terms.lpClasses).toEqual([]);
    expect(refused(C22, { set: { "terms.lp_classes[0].carry": null } })).toEqual(input("bad_number", "terms.lp_classes[0].carry"));
    expect(refused(C22, { set: { "terms.fee_rate": null } })).toEqual(input("missing_field", "terms.fee_rate"));
  });

  it("refuses a class's unsupported key by itself, the first in the file's order, its carry's among them (FA25)", () => {
    const steps = { name: "F&F", carry: { steps: [{ rate: "0", hurdle: "x" }] }, pref: { rate: "0.06" } };
    expect(refused(C22, { set: { "terms.lp_classes[0]": steps } })).toEqual({ kind: "unsupported", term: "hurdle", field: "terms.lp_classes[0].carry.steps[0].hurdle" });
    const pref = { name: "F&F", pref: { rate: "0.06" }, carry: { tiers: [] } };
    expect(refused(C22, { set: { "terms.lp_classes[0]": pref } })).toEqual({ kind: "unsupported", term: "pref", field: "terms.lp_classes[0].pref" });
    // Stage 1 comes first: an unsupported class key before a bad fund carry.
    expect(refused(C22, { set: { "terms.carry": "2", "terms.lp_classes[0].mgmt_fee": "1" } })).toEqual({ kind: "unsupported", term: "mgmt_fee", field: "terms.lp_classes[0].mgmt_fee" });
  });

  it("checks each class through before the next, after the fund's own terms (F28, FA25)", () => {
    expect(refused(C22, { set: { terms: { carry: "0.2", lp_classes: [{ name: "A", fee_rate: "-1" }] } } })).toEqual(input("bad_number", "terms.lp_classes[0].fee_rate"));
    expect(refused(C22, { set: { "terms.lp_classes": [{ name: "A", carry: "2" }, { name: "A" }] } })).toEqual(input("carry_rate_not_below_one", "terms.lp_classes[0].carry"));
    expect(refused(C22, { set: { "terms.lp_classes": [{ name: "A" }, { name: "A", carry: "2" }] } })).toEqual(input("lp_class_name_repeated", "terms.lp_classes[1].name"));
    expect(refused(C22, { set: { "terms.fee_rate": "-1", "terms.lp_classes[0].name": "" } })).toEqual(input("bad_number", "terms.fee_rate"));
    expect(refused(C22, { set: { "terms.equalization_rate": "x", "terms.lp_classes[0].name": "" } })).toEqual(input("bad_number", "terms.equalization_rate"));
    expect(refused(C22, { set: { "terms.fee_rate": { rate: "0.02" } } })).toEqual(input("bad_number", "terms.fee_rate"));
  });

  it("compares class names exactly as written, blank as trim takes it (FA27)", () => {
    for (const cls of ["Friends and family ", "friends and family", "Friends & family"]) expect(refused(C22, { set: { "lps[2].class": cls } })).toEqual(input("lp_class_unknown", "lps[2].class"));
    for (const name of ["", " ", "﻿"]) expect(refused(C22, { set: { "terms.lp_classes[0].name": name } })).toEqual(input("bad_field", "terms.lp_classes[0].name"));
    expect(refused(C22, { set: { "terms.lp_classes[0].name": ["F&F"] } })).toEqual(input("bad_field", "terms.lp_classes[0].name"));
  });

  it("checks an LP's class and close after F21's checks, each LP through before the next (F28, FA25)", () => {
    expect(refused(C22, { set: { "lps[2].class": "X", "lps[2].commitment": "0" } })).toEqual(input("bad_number", "lps[2].commitment"));
    expect(refused(C22, { set: { "lps[2].class": "X", "lps[2].close": "soon" } })).toEqual(input("lp_class_unknown", "lps[2].class"));
    expect(refused(C22, { set: { "lps[0].close": "soon", "lps[2].class": "X" } })).toEqual(input("bad_date", "lps[0].close"));
    expect(refused(C22, { set: { "lps[2].class": true } })).toEqual(input("bad_field", "lps[2].class"));
    expect(refused(C22, { set: { "terms.lp_classes": null, "terms.fee_rate": null } })).toEqual(input("lp_class_unknown", "lps[2].class"));
  });

  it("refuses a close on D with no distribution before it (FA31), and reads one the day before", () => {
    const noDist = applyChange(C22, { set: { cash_flows: (C22.cash_flows as unknown[]).slice(0, 3), "terms.equalization_rate": "0" } }) as Record<string, unknown>;
    expect(refusal(applyChange(noDist, { set: { "lps[2].close": "2026-06-30" } }))).toEqual(input("lp_close_after_distribution", "lps[2].close"));
    expect(readFund(applyChange(noDist, { set: { "lps[2].close": "2026-06-29" } })).lps[2]!.close).toBe("2026-06-29");
  });

  it("checks what the LPs need last: a later close's rate, then each call by date for a payer (F28, FA21)", () => {
    expect(refused(C25, { del: "terms.equalization_rate", set: { "lps[0].close": "x" } })).toEqual(input("bad_date", "lps[0].close"));
    // The first fee call by date, whatever its place in the list, when every LP pays no fees.
    const late = { "cash_flows[1]": { date: "2023-01-01", type: "call", kind: "fee", amount: "100" }, "cash_flows[2]": { date: "2022-06-01", type: "call", kind: "fee", amount: "100" } };
    expect(refused(C22, { set: { ...late, "lps[0].class": "Friends and family", "lps[1].class": "Friends and family" } })).toEqual(input("call_without_payers", "cash_flows[2]"));
    // An LP closing on a call's date is in for it.
    readFund(applyChange(C25, { set: { "lps[0].close": "2021-01-15", "lps[1].close": "2021-01-15" } }));
    // Without listed LPs, nothing here applies: the LPs' side pays every call (F23).
    readFund(applyChange(C22, { set: { lps: null } }));
  });
});

describe("the management fee schedule (F29, F30, F32, FA39 to FA41)", () => {
  // Case 29: a schedule without listed LPs. Case 30: two LPs, half-yearly, a step. Case 25: entered fee calls, a later close.
  const C25 = readCaseFile<CaseInputs>("fund-25-later-close", "inputs.json").fund;
  const C29 = readCaseFile<CaseInputs>("fund-29-fee-schedule", "inputs.json").fund;
  const C30 = readCaseFile<CaseInputs>("fund-30-fee-step-down", "inputs.json").fund;
  const refused = (base: Record<string, unknown>, c: Fixture["change"]) => refusal(applyChange(base, c));
  const input = (term: string, field: string) => ({ kind: "input", term, field });
  const read = (base: Record<string, unknown>, c: Fixture["change"]) => readFund(applyChange(base, c));

  it("reads it as given, frozen with the rest, and none without it", () => {
    const fee = readFund(C30).terms.managementFee!;
    expect([fee.start, fee.frequency, fee.commitments, fee.steps.map((s) => [s.rate.toString(), s.from])]).toEqual(["2020-07-01", "semiannual", null, [["0.02", null], ["0.015", "2022-03-01"]]]);
    expect([Object.isFrozen(fee), Object.isFrozen(fee.steps), Object.isFrozen(fee.steps[1])]).toEqual([true, true, true]);
    expect(readFund(C25).terms.managementFee).toBeNull();
    // It isn't in the cash flows, which stay the input's (FA42).
    expect(readFund(C30).cashFlows.map((f) => f.kind)).toEqual(["investment", "investment", null, null]);
  });

  it("reads null as left out for the schedule, the frequency, commitments and the first step's date (FA41)", () => {
    expect(read(C30, { set: { "terms.management_fee": null } }).terms.managementFee).toBeNull();
    expect(read(C30, { set: { "terms.management_fee.frequency": null } }).terms.managementFee!.frequency).toBe("quarterly");
    expect(read(C30, { set: { "terms.management_fee.commitments": null, "terms.management_fee.steps[0].from": null } }).terms.managementFee!.commitments).toBeNull();
    for (const path of ["start", "steps", "steps[0].rate", "steps[1].from"]) {
      expect(refused(C30, { set: { [`terms.management_fee.${path}`]: null } })).toEqual(input("missing_field", `terms.management_fee.${path}`));
    }
  });

  it("takes the frequency as one of its three words exactly (FA41)", () => {
    for (const word of ["Quarterly", "quarterly ", "semi-annual", 4]) expect(refused(C30, { set: { "terms.management_fee.frequency": word } })).toEqual(input("bad_field", "terms.management_fee.frequency"));
    expect(read(C30, { set: { "terms.management_fee.frequency": "annual" } }).terms.managementFee!.frequency).toBe("annual");
  });

  it("compares commitments with the LPs' total as a number, exactly as the input writes them (F32, FA41)", () => {
    expect(read(C30, { set: { "terms.management_fee.commitments": "25000000.00" } }).terms.managementFee!.commitments!.toString()).toBe("25000000");
    // Thirds total 1 exactly, though each is rounded at 40 digits; a 1 short in the 40th digit isn't their total.
    const thirds = { lps: [0, 1, 2].map((i) => ({ name: `LP ${i}`, commitment: "1/3" })) };
    read(C30, { set: { ...thirds, "terms.management_fee.commitments": "1" } });
    expect(refused(C30, { set: { ...thirds, "terms.management_fee.commitments": "0.9999999999999999999999999999999999999999" } })).toEqual(input("fee_commitments_mismatch", "terms.management_fee.commitments"));
    expect(refused(C30, { set: { "terms.management_fee.commitments": 25000000 } })).toEqual(input("bad_number", "terms.management_fee.commitments"));
  });

  it("takes later rates in any order, a step up after a step to 0 included, but no rate of 1 or more (FA46)", () => {
    const steps = [{ rate: "0.02" }, { rate: "0", from: "2021-01-01" }, { rate: "0.025", from: "2022-01-01" }];
    expect(read(C30, { set: { "terms.management_fee.steps": steps } }).terms.managementFee!.steps.map((s) => s.rate.toString())).toEqual(["0.02", "0", "0.025"]);
    expect(refused(C30, { set: { "terms.management_fee.steps[1].rate": "1.5" } })).toEqual(input("bad_number", "terms.management_fee.steps[1].rate"));
    expect(refused(C30, { set: { "terms.management_fee.steps[1].rate": 0.015 } })).toEqual(input("bad_number", "terms.management_fee.steps[1].rate"));
  });

  it("counts the schedule's calls as the fund's calls, and refuses a fund with none when it starts after D (F4, FA39)", () => {
    const fund = read(C29, { set: { cash_flows: [] } });
    expect(fund.cashFlows).toEqual([]);
    // One step, so a later start keeps the steps in order.
    const later = { "terms.management_fee.start": "2031-01-01", "terms.management_fee.steps": [{ rate: "0.02" }] };
    expect(refused(C29, { set: { ...later, cash_flows: [] } })).toEqual(input("no_calls", "cash_flows"));
    // A start after D, with entered calls, isn't refused: nothing to call yet.
    expect(read(C29, { set: later }).terms.managementFee!.start).toBe("2031-01-01");
  });

  it("needs an equalization rate only when an investment or expense call comes before a later close (F29, FA26)", () => {
    // Case 25 with its first investment call moved to Cedar's close: only the fee call is before it, so no rate is needed.
    const feeOnly = { "cash_flows[0].date": "2021-07-15" };
    expect(read(C25, { set: feeOnly, del: "terms.equalization_rate" }).terms.equalizationRate).toBeNull();
    expect(refused(C25, { set: { ...feeOnly, "cash_flows[1].kind": "expense" }, del: "terms.equalization_rate" })).toEqual(input("missing_field", "terms.equalization_rate"));
    // With a schedule, Birchwood joining after its first call owes back fees but needs no rate.
    expect(read(C30, { set: { "lps[1].close": "2020-08-01", "cash_flows[0].date": "2020-08-01" } }).terms.equalizationRate).toBeNull();
  });

  it("refuses a schedule no listed LP pays at the schedule, as an entered fee call nobody pays is at the call (F28, F32)", () => {
    // Both LPs in a class at a fee rate of 0: each of the schedule's calls would be $0. Only the fee weights count, not
    // who is in at each call's date, and a schedule that calls nothing yet, starting after D, is refused the same (FA39).
    const classes = [{ name: "F&F", fee_rate: "0" }, { name: "Anchor", fee_rate: "0.01" }, { name: "Seed", carry: "0.1" }];
    const nobody = { "terms.lp_classes": classes, "lps[0].class": "F&F", "lps[1].class": "F&F" };
    const at = input("call_without_payers", "terms.management_fee");
    expect(refused(C30, { set: nobody })).toEqual(at);
    // In words of its own, not an entered call's: a schedule's calls have no date at which nobody was in.
    expect(() => read(C30, { set: nobody })).toThrow("terms.management_fee: no listed LP pays this schedule's fees: every one is in a class at a fee rate of 0");
    expect(refused(C30, { set: { ...nobody, "terms.management_fee.start": "2027-06-01", "terms.management_fee.steps": [{ rate: "0.02" }] } })).toEqual(at);
    // One LP paying, on the fund's terms or in a class at a fee rate above 0 or with none of its own: it reads.
    read(C30, { set: { "terms.lp_classes": classes, "lps[0].class": "F&F" } });
    for (const cls of ["Anchor", "Seed"]) read(C30, { set: { ...nobody, "lps[1].class": cls } });
    // Stage 5's order: the equalization rate, then commitments, then this, then each entered call's payers. Both LPs
    // closing on 1 Aug 2020, after the investment call of 1 Jul, leave that call without payers too.
    const late = { ...nobody, "lps[0].close": "2020-08-01", "lps[1].close": "2020-08-01" };
    expect(refused(C30, { set: late })).toEqual(input("missing_field", "terms.equalization_rate"));
    expect(refused(C30, { set: { ...nobody, "terms.management_fee.commitments": "1" } })).toEqual(input("fee_commitments_mismatch", "terms.management_fee.commitments"));
    expect(refused(C30, { set: { ...late, "terms.equalization_rate": "0.08" } })).toEqual(at);
    expect(refused(C30, { set: { ...late, "terms.equalization_rate": "0.08", "lps[1].class": "Anchor" } })).toEqual(input("call_without_payers", "cash_flows[0]"));
  });

  it("decides who joins later by the fund's first call, the schedule's included (F25, F30)", () => {
    // Case 30's first entered call moved after Birchwood's close: the schedule's first call, on start, comes before it.
    const fund = read(C30, { set: { "lps[1].close": "2020-08-01", "cash_flows[0].date": "2020-09-01" } });
    expect(equalization(fund)!.closes.map((c) => [c.date, c.joining])).toEqual([["2020-08-01", ["Birchwood Family Office"]]]);
  });
});

describe("investments and carry deal by deal (F33, F34, F37, FA52 to FA56)", () => {
  // A small fund of its own: $1,000 of investment calls for two investments, A's $600 and B's $400, a $100 fee call, A's
  // exit, and X from B.
  const call = (date: string, amount: string, kind = "investment") => ({ date, type: "call", kind, amount });
  const writeOff = (date: string, investment: string) => ({ date, type: "write_off", investment });
  const DEALS = {
    as_of: "2024-01-01",
    terms: { carry: "0.2", carry_basis: "deal_by_deal" },
    investments: [
      { name: "A", checks: [{ date: "2020-01-01", amount: "600" }] },
      { name: "B", checks: [{ date: "2020-01-01", amount: "400" }] },
    ],
    cash_flows: [call("2020-01-01", "1000"), call("2020-01-01", "100", "fee"), { date: "2021-01-01", type: "distribution", amount: "900", investment: "A" }],
    distribution_from: { investment: "B" },
  };
  const refused = (c: Fixture["change"], base: Record<string, unknown> = DEALS) => refusal(applyChange(base, c));
  const input = (term: string, field: string) => ({ kind: "input", term, field });
  const read = (c: Fixture["change"] = {}, base: Record<string, unknown> = DEALS) => readFund(applyChange(base, c));

  it("reads them as the input gives them, frozen with the rest, and none without them", () => {
    const fund = read({ set: { "cash_flows[3]": writeOff("2022-01-01", "B"), "distribution_from.share": "1/2" } });
    expect(fund.terms.carryBasis).toBe("deal_by_deal");
    expect(fund.investments.map((i) => [i.name, i.checks.map((c) => [c.date, c.amount.toString()])])).toEqual([
      ["A", [["2020-01-01", "600"]]],
      ["B", [["2020-01-01", "400"]]],
    ]);
    expect([fund.distributionFrom!.investment, fund.distributionFrom!.share.toString()]).toEqual(["B", "0.5"]);
    const [investmentCall, , exit, writtenOff] = fund.cashFlows;
    expect([investmentCall!.investment, investmentCall!.share]).toEqual([null, null]);
    expect([exit!.investment, exit!.share!.toString()]).toEqual(["A", "1"]);
    expect([writtenOff!.type, writtenOff!.investment, writtenOff!.kind, writtenOff!.amount, writtenOff!.share]).toEqual(["write_off", "B", null, null, null]);
    expect([fund.investments, fund.investments[0]!.checks[0], fund.distributionFrom].every((o) => Object.isFrozen(o))).toBe(true);
    // Without them: the whole fund, no investments, no X's source, and every distribution without an investment.
    const plain = readFund(BASE);
    expect([plain.terms.carryBasis, plain.investments, plain.distributionFrom]).toEqual(["whole_fund", [], null]);
    expect(plain.cashFlows.map((f) => [f.investment, f.share?.toString() ?? null])).toEqual([[null, null]]);
  });

  it("orders one date's cash flows calls, write-offs, then distributions, each as listed (F4, F33)", () => {
    const day = "2022-01-01";
    const fund = read({
      set: {
        "cash_flows[2]": { date: day, type: "distribution", amount: "50", investment: "A" },
        "cash_flows[3]": writeOff(day, "B"),
        "cash_flows[4]": { date: day, type: "distribution", amount: "40", investment: "A" },
        "cash_flows[5]": writeOff(day, "A"),
        "cash_flows[6]": call(day, "10", "expense"),
      },
    });
    expect(fund.cashFlows.filter((f) => f.date === day).map((f) => f.index)).toEqual([6, 3, 5, 2, 4]);
  });

  it("reads null as left out, and refuses a null that leaves out what's needed (FA52)", () => {
    expect(read({ set: { "terms.carry_basis": null } }).terms.carryBasis).toBe("whole_fund");
    expect(refused({ set: { investments: null } })).toEqual(input("missing_field", "investments"));
    expect(refused({ set: { investments: [] } })).toEqual(input("missing_field", "investments"));
    expect(refused({ set: { distribution_from: null } })).toEqual(input("missing_field", "distribution_from"));
    expect(refused({ set: { "cash_flows[2].investment": null } })).toEqual(input("missing_field", "cash_flows[2].investment"));
    const fund = read({
      set: {
        "cash_flows[2].share": null,
        "distribution_from.share": null,
        "cash_flows[0].investment": null,
        "cash_flows[0].share": null,
        "cash_flows[3]": { ...writeOff("2022-01-01", "B"), amount: null, share: null, kind: null },
      },
    });
    expect([fund.cashFlows[2]!.share!.toString(), fund.distributionFrom!.share.toString(), fund.cashFlows[3]!.type]).toEqual(["1", "1", "write_off"]);
    for (const path of ["investments[0].name", "investments[0].checks", "investments[0].checks[0].date", "investments[0].checks[0].amount", "distribution_from.investment"]) {
      expect(refused({ set: { [path]: null } }), path).toEqual(input("missing_field", path));
    }
    expect(refused({ set: { "cash_flows[3]": { ...writeOff("2022-01-01", "B"), investment: null } } })).toEqual(input("missing_field", "cash_flows[3].investment"));
  });

  it("keeps names as written and compares them exactly, blank as trim takes it (FA52, FA17)", () => {
    expect(refused({ set: { "cash_flows[2].investment": "A " } })).toEqual(input("investment_unknown", "cash_flows[2].investment"));
    expect(refused({ set: { "investments[1].name": "　" } })).toEqual(input("bad_field", "investments[1].name"));
    expect(read({ set: { "investments[1].name": " B", "distribution_from.investment": " B" } }).investments[1]!.name).toBe(" B");
    // An investment may share a name with an LP.
    read({ set: { lps: [{ name: "A", commitment: "1" }] } });
  });

  it("checks a cash flow through in FA53's order", () => {
    const wo = writeOff("2022-01-01", "B");
    expect(refused({ set: { "cash_flows[3]": { ...wo, amount: "5", note: "x" } } })).toEqual(input("unknown_field", "cash_flows[3].note"));
    expect(refused({ set: { "cash_flows[3]": { ...wo, share: "1", amount: "5" } } })).toEqual(input("unknown_field", "cash_flows[3].share"));
    expect(refused({ set: { "cash_flows[3]": { ...wo, date: "x", amount: "5" } } })).toEqual(input("bad_date", "cash_flows[3].date"));
    expect(refused({ set: { "cash_flows[3]": { date: "2022-01-01", type: "write_off" } } })).toEqual(input("missing_field", "cash_flows[3].investment"));
    expect(refused({ set: { "cash_flows[2].investment": "", "cash_flows[2].share": "2" } })).toEqual(input("bad_field", "cash_flows[2].investment"));
    expect(refused({ set: { "cash_flows[2].share": "2", "cash_flows[2].amount": "x" } })).toEqual(input("bad_number", "cash_flows[2].share"));
    expect(refused({ set: { "cash_flows[2]": { date: "2021-01-01", type: "distribution", amount: "900", share: "2" } } })).toEqual(input("missing_field", "cash_flows[2].investment"));
    // A call's investment and share are unknown in the file's order among its other unknown fields.
    expect(refused({ set: { "cash_flows[0]": { ...call("2020-01-01", "1000"), share: "1", note: "x" } } })).toEqual(input("unknown_field", "cash_flows[0].share"));
    // A type that isn't one of the three is refused after the fields every cash flow needs: an amount unless the type is
    // a write-off's.
    expect(refused({ set: { "cash_flows[3]": { date: "2022-01-01", type: "writeoff", investment: "B" } } })).toEqual(input("missing_field", "cash_flows[3].amount"));
    expect(refused({ set: { "cash_flows[3]": { date: "2022-01-01", type: "writeoff", investment: "B", amount: "1" } } })).toEqual(input("bad_field", "cash_flows[3].type"));
  });

  it("checks an investment and X's source through in FA53's order, after nav", () => {
    expect(refused({ set: { "investments[0]": { checks: [], sector: "x" } } })).toEqual(input("unknown_field", "investments[0].sector"));
    expect(refused({ set: { "investments[0]": { sector: null } } })).toEqual(input("unknown_field", "investments[0].sector"));
    expect(refused({ set: { "investments[0]": { checks: "x" } } })).toEqual(input("missing_field", "investments[0].name"));
    expect(refused({ set: { "investments[0].name": 1, "investments[0].checks": [] } })).toEqual(input("bad_field", "investments[0].name"));
    expect(refused({ set: { "investments[0].checks": { date: "2020-01-01", amount: "600" } } })).toEqual(input("bad_field", "investments[0].checks"));
    expect(refused({ set: { "investments[0].checks": [{ date: "2020-01-01", amount: "-1" }, { date: "x" }] } })).toEqual(input("bad_number", "investments[0].checks[0].amount"));
    expect(refused({ set: { "investments[0].checks[0]": { amount: "x", shares: "1" } } })).toEqual(input("unknown_field", "investments[0].checks[0].shares"));
    expect(refused({ set: { "investments[0].checks[0]": { amount: "x" } } })).toEqual(input("missing_field", "investments[0].checks[0].date"));
    expect(refused({ set: { "investments[0].checks[0].amount": 600 } })).toEqual(input("bad_number", "investments[0].checks[0].amount"));
    // The name repeated is checked once the investment's checks are read.
    expect(refused({ set: { "investments[1].name": "A", "investments[1].checks[0].date": "x" } })).toEqual(input("bad_date", "investments[1].checks[0].date"));
    expect(refused({ set: { distribution_from: { share: "x", note: "y" } } })).toEqual(input("unknown_field", "distribution_from.note"));
    expect(refused({ set: { distribution_from: { investment: " ", share: "x" } } })).toEqual(input("bad_field", "distribution_from.investment"));
    expect(refused({ set: { "distribution_from.share": "0" } })).toEqual(input("bad_number", "distribution_from.share"));
    expect(refused({ set: { nav: "-1", investments: "x" } })).toEqual(input("bad_number", "nav"));
  });

  it("names the first check of a date whose checks together run past the investment calls (F37, FA53)", () => {
    // A's $600 and B's $500 on one date pass $1,000, and A is named, though $600 alone wouldn't. A fee call doesn't fund a check.
    expect(refused({ set: { "investments[1].checks[0].amount": "500" } })).toEqual(input("investments_exceed_calls", "investments[0].checks[0].amount"));
    expect(refused({ set: { "cash_flows[1].amount": "5000", "investments[1].checks[0].amount": "500" } })).toEqual(input("investments_exceed_calls", "investments[0].checks[0].amount"));
    // A call on a check's date funds it, calls coming before checks on one date (F33); a day later doesn't.
    const late = { "investments[1].checks[0].date": "2020-06-01", "investments[1].checks[0].amount": "500", "cash_flows[3]": call("2020-06-01", "100") };
    read({ set: late });
    expect(refused({ set: { ...late, "cash_flows[3]": call("2020-06-02", "100") } })).toEqual(input("investments_exceed_calls", "investments[1].checks[0].amount"));
  });

  it("adds up the checks and the calls exactly as the input writes them, fractions and all (F37, FA41, FA53)", () => {
    // Jordan's fund (f05b2 review): checks of 11000038/11, 1760006/11 and $840,003 come to exactly the $2,000,007 called.
    // Added at 40 digits, the first two land a hair above 1,160,004, and the three run past the call.
    const exactlyCalled = {
      as_of: "2020-06-30",
      terms: { carry_basis: "deal_by_deal" },
      investments: [
        { name: "A", checks: [{ date: "2018-01-01", amount: "11000038/11" }] },
        { name: "B", checks: [{ date: "2018-02-01", amount: "1760006/11" }] },
        { name: "C", checks: [{ date: "2018-03-01", amount: "840003" }] },
      ],
      cash_flows: [call("2018-01-01", "2000007")],
      distribution_from: { investment: "A" },
    };
    const fund = readFund(exactlyCalled);
    expect(fund.investments.reduce((t, i) => t.plus(i.checks[0]!.amount), new D(0)).gt("2000007")).toBe(true);
    // A cent's millionth more than the calls is still refused, at the check that runs past them.
    expect(refused({ set: { "investments[2].checks[0].amount": "840003.00000001" } }, exactlyCalled)).toEqual(input("investments_exceed_calls", "investments[2].checks[0].amount"));
    // A call written as a fraction is exact too: 1760006/11 called for B's check alone.
    read({ set: { "cash_flows[0]": call("2018-01-01", "1760006/11"), investments: [{ name: "B", checks: [{ date: "2018-02-01", amount: "1760006/11" }] }], "distribution_from.investment": "B" } }, exactlyCalled);
  });

  it("refuses any pref deal by deal, whatever its shape, last in stage 1 (FA54)", () => {
    const unsupported = { kind: "unsupported", term: "deal_by_deal_pref", field: "terms.pref" };
    for (const pref of [{ rate: "0.08" }, "0.08", {}]) expect(refused({ set: { "terms.pref": pref } })).toEqual(unsupported);
    read({ set: { "terms.pref": null } });
    expect(refused({ set: { "terms.pref": { rate: "0.08" }, "terms.carry_basis": "Deal by deal" } })).toEqual(input("bad_field", "terms.carry_basis"));
    expect(refused({ set: { "terms.carry_basis": { deal: true } } })).toEqual(input("bad_field", "terms.carry_basis"));
    expect(refused({ set: { "terms.catch_up": { gp_share: "1" } } })).toEqual(input("catch_up_without_pref", "terms.catch_up"));
    expect(refused({ set: { "terms.pref": { rate: "0.08", compounding: "annual" } } })).toEqual({ kind: "unsupported", term: "compounded_pref", field: "terms.pref.compounding" });
  });

  it("checks the investments on the whole fund as deal by deal, and doesn't need them (FA55)", () => {
    const whole = applyChange(DEALS, { set: { "terms.carry_basis": "whole_fund", "cash_flows[2]": { date: "2021-01-01", type: "distribution", amount: "900" } }, del: "distribution_from" }) as Record<string, unknown>;
    expect(readFund(whole).distributionFrom).toBeNull();
    expect(refused({ set: { distribution_from: { investment: "Z" } } }, whole)).toEqual(input("investment_unknown", "distribution_from.investment"));
    expect(refused({ set: { "cash_flows[3]": writeOff("2019-06-01", "A") } }, whole)).toEqual(input("investment_not_made", "cash_flows[3]"));
    expect(refused({ set: { "investments[0].checks[0].date": "2025-01-01" } }, whole)).toEqual(input("cash_flow_after_distribution_date", "investments[0].checks[0]"));
    expect(refused({ set: { "investments[0].checks[0].amount": "601" } }, whole)).toEqual(input("investments_exceed_calls", "investments[0].checks[0].amount"));
  });

  it("doesn't count a write-off as a distribution (FA56)", () => {
    // Before the first call, a write-off is refused for its investment, not as distribution_before_call.
    const moved = { "cash_flows[0].date": "2020-02-01", "cash_flows[1].date": "2020-02-01", "investments[0].checks[0].date": "2020-02-01", "investments[1].checks[0].date": "2020-02-01" };
    const early = { ...moved, "cash_flows[3]": writeOff("2020-01-15", "A") };
    expect(refused({ set: early })).toEqual(input("investment_not_made", "cash_flows[3]"));
    expect(refused({ set: { ...early, "investments[0].checks[0].date": "2020-01-10" } })).toEqual(input("investments_exceed_calls", "investments[0].checks[0].amount"));
    // Nor does one limit a later close, which stays before the first distribution: A's exit on 2021-01-01.
    const closes = { "terms.equalization_rate": "0", lps: [{ name: "L", commitment: "1" }, { name: "M", commitment: "1", close: "2020-12-01" }], "cash_flows[3]": writeOff("2020-06-01", "B") };
    read({ set: closes });
    expect(refused({ set: { ...closes, "lps[1].close": "2021-01-01" } })).toEqual(input("lp_close_after_distribution", "lps[1].close"));
  });

  it("checks stage 3 in F37's order", () => {
    // 0.4.0's checks first, a write-off among the cash flows after D; then a check after D; then each distribution and
    // write-off in the input's order, its three checks together; then X's investment; then the cost made.
    expect(refused({ set: { "cash_flows[3]": writeOff("2025-01-01", "Z"), "cash_flows[4]": { date: "2025-01-01", type: "distribution", amount: "1" } } })).toEqual(
      input("cash_flow_after_distribution_date", "cash_flows[3]"),
    );
    expect(refused({ set: { "cash_flows[2].investment": "Z", "distribution_from.investment": "Z" } })).toEqual(input("investment_unknown", "cash_flows[2].investment"));
    expect(refused({ set: { "distribution_from.investment": "Z", "investments[0].checks[0].amount": "700" } })).toEqual(input("investment_unknown", "distribution_from.investment"));
    expect(refused({ set: { "cash_flows[3]": writeOff("2019-12-01", "B"), "cash_flows[2].investment": "Z" } })).toEqual(input("investment_unknown", "cash_flows[2].investment"));
  });

  it("reads a distribution or a write-off on its investment's first check's date, checks coming first on one date (F33)", () => {
    read({ set: { "cash_flows[2].date": "2020-01-01", "cash_flows[3]": writeOff("2020-01-01", "B") } });
    expect(refused({ set: { "cash_flows[3]": writeOff("2019-12-31", "B") } })).toEqual(input("investment_not_made", "cash_flows[3]"));
  });

  it("splits one on the whole fund as if it had no investments, with nothing due (F34)", () => {
    // F34: on the whole fund the investments, the tags and the write-offs change no amount.
    const whole = read({ set: { "terms.carry_basis": "whole_fund", "cash_flows[3]": writeOff("2022-01-01", "B"), final: true } });
    const bare = read({ set: { "terms.carry_basis": null, "cash_flows[2].investment": null, final: true }, del: ["investments", "distribution_from"] });
    for (const x of ["0", "200", "1000", "5000"]) {
      const [a, b] = [splitAt(whole, x), splitAt(bare, x)];
      expect(JSON.stringify([a.distribution, a.toDate, a.clawback, a.lpsPaidIn]), x).toBe(JSON.stringify([b.distribution, b.toDate, b.clawback, b.lpsPaidIn]));
      expect([a.due, b.due], x).toEqual([null, null]);
    }
    expect(findBreakpoints(whole)).toEqual(findBreakpoints(bare));
  });
});
