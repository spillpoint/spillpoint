// The fund package's exports, and the names of their fields, are deliberate: these lists change only on purpose. f01e's
// naming review settled them for 0.1.0 (notes/review-f01e.md), and f02b added the LPs' for 0.2.0 (notes/review-f02b.md).

import { expect, it } from "vitest";

import * as fund from "../src/index.ts";
import { FundRefusal, findBreakpoints, readFund, splitAt } from "../src/index.ts";
import { RUN_CASES, readCaseFile } from "./support/cases.ts";
import type { CaseInputs } from "./support/cases.ts";

it("exports exactly the fund engine's API", () => {
  expect(Object.keys(fund).sort()).toEqual(["D", "FundRefusal", "findBreakpoints", "readFund", "splitAt", "splitAtNav", "toCents"]);
});

const keys = (o: object) => Object.keys(o).sort();
const read = (dir: string) => readFund(readCaseFile<CaseInputs>(dir, "inputs.json").fund);

it("names a fund's fields as the naming review settled, mirroring the input", () => {
  // Case 8 has a GP commitment and steps, case 6 a pref and a catch-up.
  const f8 = read("fund-08-carry-steps");
  const f6 = read("fund-06-full-catch-up");
  expect(keys(f8)).toEqual(["asOf", "cashFlows", "distributionDate", "final", "lps", "nav", "terms"]);
  expect(keys(f8.terms)).toEqual(["carry", "catchUp", "gpCommitment", "pref"]);
  expect(keys(f8.terms.carry[1]!)).toEqual(["fromLpMultiple", "rate"]);
  expect(keys(f8.terms.gpCommitment!)).toEqual(["paysExpenses", "paysFees", "share"]);
  expect(keys(f6.terms.pref!)).toEqual(["rate"]);
  expect(keys(f6.terms.catchUp!)).toEqual(["gpShare"]);
  expect(keys(f8.cashFlows[0]!)).toEqual(["amount", "date", "index", "kind", "type"]);
  // From 0.2.0: the LPs, as the input lists them (F19).
  expect(f8.lps).toEqual([]);
  expect(keys(read("fund-17-lps-three").lps[0]!)).toEqual(["commitment", "name"]);
});

it("names a split's fields as the naming review settled", () => {
  const split = splitAt(read("fund-10-clawback"), "1000000");
  expect(keys(split)).toEqual(["byLp", "clawback", "distribution", "gpCommitmentPaidIn", "lpMultiple", "lpsPaidIn", "prefAccrued", "toDate", "x"]);
  expect(keys(split.distribution)).toEqual(["amount", "gp", "gpCommitment", "lps"]);
  expect(keys(split.distribution.lps)).toEqual(["capital", "carryTier", "catchUp", "pref", "total"]);
  expect(keys(split.distribution.gp)).toEqual(["carry", "catchUp", "total"]);
  // The LPs' share at each step, added before 0.1.0 (f01f review, answer 2).
  expect(keys(split.distribution.gp.carry[0]!)).toEqual(["amount", "fromLpMultiple", "lps", "rate"]);
  expect(keys(split.clawback!)).toEqual(["carryPaid", "entitlement", "owed", "prefOnFundTotals"]);
  // From 0.2.0: each LP's amounts (F20).
  expect(split.byLp).toEqual([]);
  const withLps = splitAt(read("fund-19-lps-clawback"), "0");
  expect(keys(withLps.byLp[0]!)).toEqual(["clawback", "commitment", "distribution", "name", "paidIn", "share", "toDate"]);
});

it("names a breakpoint's and a refusal's fields as the naming review settled", () => {
  const all = RUN_CASES.flatMap((dir) => findBreakpoints(read(dir)));
  expect(keys(all[0]!)).toEqual(["reasons", "x"]);
  const fields = new Map(all.flatMap((b) => b.reasons).map((r) => [r.code, keys(r).join(", ")]));
  expect(Object.fromEntries([...fields].sort())).toEqual({
    capital_returned: "amount, code, text",
    carry_step: "code, lpMultiple, rate, text",
    catch_up_done: "carry, code, text",
    clawback_changes: "change, code, fundTotals, text",
    clawback_cleared: "code, text",
    pref_met: "amount, code, rate, text",
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
