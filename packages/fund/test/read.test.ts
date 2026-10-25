// Reading a fund's input, and refusing it (F18): every refusal fixture in the fund cases with its kind, term and field
// (FC7), and the reading rules the fixtures don't reach (FA2, FA3, FA12, FA13).

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { D, FundRefusal, equalization, readFund, splitAt } from "../src/index.ts";
import { CASES_DIR, REFUSAL_CASES, applyChange, readCaseFile } from "./support/cases.ts";
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

  it("decides who joins later by the fund's first call, the schedule's included (F25, F30)", () => {
    // Case 30's first entered call moved after Birchwood's close: the schedule's first call, on start, comes before it.
    const fund = read(C30, { set: { "lps[1].close": "2020-08-01", "cash_flows[0].date": "2020-09-01" } });
    expect(equalization(fund)!.closes.map((c) => [c.date, c.joining])).toEqual([["2020-08-01", ["Birchwood Family Office"]]]);
  });
});
