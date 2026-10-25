// The fund package's exports, and the names of their fields, are deliberate: these lists change only on purpose. f01e's
// naming review settled them for 0.1.0 (notes/review-f01e.md), f02b added the LPs' for 0.2.0 (notes/review-f02b.md),
// f03b the classes' and later closes' for 0.3.0 (notes/review-f03b.md), and f04b the management fees' for 0.4.0
// (notes/review-f04b.md).

import { expect, it } from "vitest";

import * as fund from "../src/index.ts";
import { FundRefusal, equalization, feeCalls, findBreakpoints, readFund, splitAt } from "../src/index.ts";
import { RUN_CASES, readCaseFile } from "./support/cases.ts";
import type { CaseInputs } from "./support/cases.ts";

it("exports exactly the fund engine's API", () => {
  // From 0.3.0: equalization (F25). From 0.4.0: feeCalls (F31).
  expect(Object.keys(fund).sort()).toEqual(["D", "FundRefusal", "equalization", "feeCalls", "findBreakpoints", "readFund", "splitAt", "splitAtNav", "toCents"]);
});

const keys = (o: object) => Object.keys(o).sort();
const read = (dir: string) => readFund(readCaseFile<CaseInputs>(dir, "inputs.json").fund);

it("names a fund's fields as the naming review settled, mirroring the input", () => {
  // Case 8 has a GP commitment and steps, case 6 a pref and a catch-up.
  const f8 = read("fund-08-carry-steps");
  const f6 = read("fund-06-full-catch-up");
  expect(keys(f8)).toEqual(["asOf", "cashFlows", "distributionDate", "final", "lps", "nav", "terms"]);
  expect(keys(f8.terms)).toEqual(["carry", "catchUp", "equalizationRate", "feeRate", "gpCommitment", "lpClasses", "managementFee", "pref"]);
  expect(keys(f8.terms.carry[1]!)).toEqual(["fromLpMultiple", "rate"]);
  expect(keys(f8.terms.gpCommitment!)).toEqual(["paysExpenses", "paysFees", "share"]);
  expect(keys(f6.terms.pref!)).toEqual(["rate"]);
  expect(keys(f6.terms.catchUp!)).toEqual(["gpShare"]);
  expect(keys(f8.cashFlows[0]!)).toEqual(["amount", "date", "index", "kind", "type"]);
  // From 0.2.0: the LPs, as the input lists them (F19).
  expect(f8.lps).toEqual([]);
  // From 0.3.0: each LP's class and close, null when absent, and the classes and the two rates (F22, F25).
  expect(keys(read("fund-17-lps-three").lps[0]!)).toEqual(["class", "close", "commitment", "name"]);
  expect([f8.terms.feeRate, f8.terms.equalizationRate, f8.terms.lpClasses]).toEqual([null, null, []]);
  const f22 = read("fund-22-classes-fee-carry");
  expect(keys(f22.terms.lpClasses[0]!)).toEqual(["carry", "feeRate", "name"]);
  expect(keys(f22.terms.lpClasses[0]!.carry![0]!)).toEqual(["fromLpMultiple", "rate"]);
  expect(f22.lps.map((lp) => [lp.class, lp.close])).toEqual([[null, null], [null, null], ["Friends and family", null]]);
  expect(read("fund-26-closes-and-classes").lps.map((lp) => lp.close)).toEqual([null, "2022-04-01", "2022-10-01"]);
  // From 0.4.0: the schedule, null without one, its default frequency filled in and the first step's date null (F30).
  expect(f8.terms.managementFee).toBeNull();
  const f29 = read("fund-29-fee-schedule").terms.managementFee!;
  expect(keys(f29)).toEqual(["commitments", "frequency", "start", "steps"]);
  expect([f29.start, f29.commitments?.toString(), keys(f29.steps[0]!), f29.steps.map((s) => [s.rate.toString(), s.from])]).toEqual(["2021-02-15", "40000000", ["from", "rate"], [["0.02", null], ["0.015", "2026-02-15"]]]);
  const f30 = read("fund-30-fee-step-down").terms.managementFee!;
  expect([f30.frequency, f30.commitments]).toEqual(["semiannual", null]);
  // Case 31 gives no frequency: quarterly.
  expect(read("fund-31-fee-schedule-classes-closes").terms.managementFee!.frequency).toBe("quarterly");
});

it("names a split's fields as the naming review settled", () => {
  const split = splitAt(read("fund-10-clawback"), "1000000");
  expect(keys(split)).toEqual(["byAccount", "byLp", "clawback", "distribution", "gpCommitmentPaidIn", "lpMultiple", "lpsPaidIn", "prefAccrued", "toDate", "x"]);
  expect(keys(split.distribution)).toEqual(["amount", "gp", "gpCommitment", "lps"]);
  expect(keys(split.distribution.lps)).toEqual(["capital", "carryTier", "catchUp", "pref", "total"]);
  expect(keys(split.distribution.gp)).toEqual(["carry", "catchUp", "total"]);
  // The LPs' share at each step, added before 0.1.0 (f01f review, answer 2).
  // From 0.3.0: the account each step belongs to (F26).
  expect(keys(split.distribution.gp.carry[0]!)).toEqual(["amount", "class", "fromLpMultiple", "lps", "rate"]);
  expect(keys(split.clawback!)).toEqual(["carryPaid", "entitlement", "owed", "prefOnFundTotals"]);
  // From 0.2.0: each LP's amounts (F20).
  expect(split.byLp).toEqual([]);
  const withLps = splitAt(read("fund-19-lps-clawback"), "0");
  expect(keys(withLps.byLp[0]!)).toEqual(["class", "clawback", "close", "commitment", "distribution", "name", "paidIn", "share", "toDate"]);
  // From 0.3.0: each account's own split, with two or more (F26).
  expect(withLps.byAccount).toEqual([]);
  const accounts = splitAt(read("fund-24-classes-clawback"), "0").byAccount;
  expect(accounts.map((a) => a.class)).toEqual([null, "Friends and family"]);
  expect(keys(accounts[0]!)).toEqual(["class", "clawback", "distribution", "lpMultiple", "paidIn", "prefAccrued", "toDate"]);
});

it("names the equalization's fields as f03b settled", () => {
  expect(equalization(read("fund-24-classes-clawback"))).toBeNull();
  const eq = equalization(read("fund-26-closes-and-classes"))!;
  expect(keys(eq)).toEqual(["closes", "lps", "rate"]);
  expect(keys(eq.closes[0]!)).toEqual(["date", "joining", "lps"]);
  // From 0.4.0: each LP's back fees (F31).
  expect(keys(eq.lps[0]!)).toEqual(["backFees", "capitalPaid", "capitalReturned", "interestPaid", "interestReceived", "name"]);
});

it("names the fee calls' fields as f04b proposes", () => {
  expect(feeCalls(read("fund-26-closes-and-classes"))).toBeNull();
  const calls = feeCalls(read("fund-31-fee-schedule-classes-closes"))!;
  expect(keys(calls[0]!)).toEqual(["byLp", "call", "date", "firstDay", "gpCommitment", "lastDay", "lps"]);
  expect(keys(calls[0]!.byLp[0]!)).toEqual(["fee", "name"]);
  expect(feeCalls(read("fund-29-fee-schedule"))![0]!.byLp).toEqual([]);
});

it("names a breakpoint's and a refusal's fields as the naming review settled", () => {
  const all = RUN_CASES.flatMap((dir) => findBreakpoints(read(dir)));
  expect(keys(all[0]!)).toEqual(["reasons", "x"]);
  const fields = new Map(all.flatMap((b) => b.reasons).map((r) => [r.code, keys(r).join(", ")]));
  // From 0.3.0: every reason's class, the account it's about (F27).
  expect(Object.fromEntries([...fields].sort())).toEqual({
    capital_returned: "amount, class, code, text",
    carry_step: "class, code, lpMultiple, rate, text",
    catch_up_done: "carry, class, code, text",
    clawback_changes: "change, class, code, fundTotals, text",
    clawback_cleared: "class, code, text",
    pref_met: "amount, class, code, rate, text",
  });
  let refusal: unknown;
  try {
    readFund({});
  } catch (e) {
    refusal = e;
  }
  expect(refusal).toBeInstanceOf(FundRefusal);
  expect(keys(refusal as object).filter((k) => k !== "stack")).toEqual(["kind", "name", "path", "term"]);
});
