// The engine's fee calls against every fund case with a schedule (F30, F31, FC13): each call's date and the days it
// covers, the call, the LPs' part, the GP commitment's, and each LP's fee, to the cent and within FA15 of exact. A fund
// without a schedule has none. Then what the schedule does that the cases don't reach: FA39, FA40, FA42, FA46.

import { describe, expect, it } from "vitest";

import { D, equalization, feeCalls, readFund, splitAt, toCents } from "../src/index.ts";
import { RUN_CASES, exact, readCaseFile } from "./support/cases.ts";
import type { CaseExpected, CaseInputs, CaseLpAmount } from "./support/cases.ts";

/** FA15: two ways of working out one exact amount agree within this. */
const CLOSE = new D("1e-18");

function sameAmount(got: D, want: CaseLpAmount, what: string) {
  expect(toCents(got), what).toBe(want.amount);
  expect(got.minus(exact(want.exact)).abs().lte(CLOSE), `${what}: ${got.toString()} against ${want.exact}`).toBe(true);
}

describe.each(RUN_CASES)("%s", (dir) => {
  const fund = readFund(readCaseFile<CaseInputs>(dir, "inputs.json").fund);
  const expected = readCaseFile<CaseExpected>(dir, "expected.json");
  const calls = feeCalls(fund);

  if (!expected.fee_calls) {
    it("has no fee calls of its own: no schedule", () => {
      expect(fund.terms.managementFee).toBeNull();
      expect(calls).toBeNull();
    });
    return;
  }

  it("has every one of the schedule's calls, in date order, with the days it covers (F30, FA39)", () => {
    expect(calls!.map((c) => [c.date, c.firstDay, c.lastDay])).toEqual(expected.fee_calls!.map((c) => [c.date, c.first_day, c.last_day]));
  });

  it("gives each call, the LPs' part, the GP commitment's and each LP's fee as the case does (F3, F30, FC13)", () => {
    calls!.forEach((c, i) => {
      const want = expected.fee_calls![i]!;
      sameAmount(c.call, want.call, `${c.date} call`);
      sameAmount(c.lps, want.lps, `${c.date} LPs`);
      // FC13: the case gives the GP commitment's part only when the fund has one; the engine has zero without.
      if (want.gp_commitment) sameAmount(c.gpCommitment, want.gp_commitment, `${c.date} GP commitment`);
      else expect(c.gpCommitment.isZero(), `${c.date} GP commitment`).toBe(true);
      expect(c.byLp.map((f) => f.name), c.date).toEqual((want.by_lp ?? []).map((f) => f.name));
      c.byLp.forEach((f, j) => sameAmount(f.fee, want.by_lp![j]!.fee, `${c.date} ${f.name}`));
    });
  });

  it("adds up: the call is the LPs' part and the GP commitment's, the LPs' part their fees (F30)", () => {
    for (const c of calls!) {
      expect(c.call.minus(c.lps).minus(c.gpCommitment).abs().lte(CLOSE), c.date).toBe(true);
      if (c.byLp.length > 0) expect(c.byLp.reduce((t, f) => t.plus(f.fee), new D(0)).minus(c.lps).abs().lte(CLOSE), c.date).toBe(true);
    }
  });
});

/** A fund with a schedule and two LPs: Alder from the start, Birch at a later close. Changed below, one thing at a time. */
function schedule(change: { terms?: Record<string, unknown>; fee?: Record<string, unknown>; flows?: unknown[]; lps?: unknown[]; asOf?: string } = {}) {
  return readFund({
    as_of: change.asOf ?? "2022-12-31",
    terms: { carry: "0.2", equalization_rate: "0.08", management_fee: { start: "2022-02-15", steps: [{ rate: "0.02" }], ...change.fee }, ...change.terms },
    cash_flows: change.flows ?? [{ date: "2022-02-15", type: "call", kind: "investment", amount: "3000000" }],
    lps: change.lps ?? [
      { name: "Alder", commitment: "6000000" },
      { name: "Birch", commitment: "4000000", close: "2022-06-01" },
    ],
  });
}

describe("the schedule", () => {
  it("calls the first period from start, pro rata by its days, and each later one whole (F30)", () => {
    // 2% a year on $10,000,000 is $50,000 a quarter; from 15 Feb, 45 of the quarter's 90 days: $25,000.
    const calls = feeCalls(schedule())!;
    expect(calls.map((c) => [c.date, c.lastDay, toCents(c.call)])).toEqual([
      ["2022-02-15", "2022-03-31", "25000.00"],
      ["2022-04-01", "2022-06-30", "50000.00"],
      ["2022-07-01", "2022-09-30", "50000.00"],
      ["2022-10-01", "2022-12-31", "50000.00"],
    ]);
    expect(calls.map((c) => c.byLp.map((f) => toCents(f.fee)))).toEqual([["15000.00", "10000.00"], ["30000.00", "20000.00"], ["30000.00", "20000.00"], ["30000.00", "20000.00"]]);
  });

  it("gives a joiner its own fees before its close as back fees, with no interest, and moves no fee between LPs (F29, FA44)", () => {
    // Birch joins on 1 Jun: its fees for the first two calls, $10,000 and $20,000. The investment call rebalances, with
    // interest, and the LPs' paid-in counts every fee call at its full size.
    const fund = schedule();
    const eq = equalization(fund)!;
    expect(eq.lps.map((m) => [m.name, toCents(m.capitalPaid), toCents(m.capitalReturned), toCents(m.backFees)])).toEqual([
      ["Alder", "0.00", "1200000.00", "0.00"],
      ["Birch", "1200000.00", "0.00", "30000.00"],
    ]);
    expect(toCents(splitAt(fund, "0").lpsPaidIn)).toBe("3175000.00");
  });

  it("takes a fee call on a close's date from the LPs in that day, the joiner included: no back fee (FA44)", () => {
    // Birch joins on 1 Apr, the second call's date: its back fees are only the first call's, $10,000.
    const fund = schedule({ lps: [{ name: "Alder", commitment: "6000000" }, { name: "Birch", commitment: "4000000", close: "2022-04-01" }] });
    expect(equalization(fund)!.lps.map((m) => toCents(m.backFees))).toEqual(["0.00", "10000.00"]);
  });

  it("needs no equalization rate when only fee calls come before the later close, and gives a null rate (F29, FA45)", () => {
    // The investment call is on Birch's close: only the schedule's first two calls come before it.
    const fund = schedule({
      terms: { equalization_rate: null },
      flows: [{ date: "2022-06-01", type: "call", kind: "investment", amount: "3000000" }],
    });
    const eq = equalization(fund)!;
    expect(eq.rate).toBeNull();
    expect(eq.lps.map((m) => [toCents(m.capitalPaid), toCents(m.interestPaid), toCents(m.interestReceived), toCents(m.backFees)])).toEqual([
      ["0.00", "0.00", "0.00", "0.00"],
      ["0.00", "0.00", "0.00", "30000.00"],
    ]);
  });

  it("calls nothing when it starts after D, and isn't refused for it (FA39)", () => {
    const fund = schedule({ fee: { start: "2023-02-15" } });
    expect(feeCalls(fund)).toEqual([]);
    expect(toCents(splitAt(fund, "0").lpsPaidIn)).toBe("3000000.00");
  });

  it("makes no call for a period whose every day is at a rate of 0, and starts again at a later step's rate (FA40, FA46)", () => {
    // 0 from 1 Apr to 30 Sep, then 3% from 1 Oct: no calls for the second and third quarters, the fourth at the higher rate.
    const fund = schedule({ fee: { steps: [{ rate: "0.02" }, { rate: "0", from: "2022-04-01" }, { rate: "0.03", from: "2022-10-01" }] } });
    expect(feeCalls(fund)!.map((c) => [c.date, toCents(c.call)])).toEqual([
      ["2022-02-15", "25000.00"],
      ["2022-10-01", "75000.00"],
    ]);
  });

  it("works a step inside a period by its days (F30)", () => {
    // 2% to 14 Nov, 1% from 15 Nov: 45 days at 2% and 47 at 1%, over 4 × 92 days, on $10,000,000.
    const fund = schedule({ fee: { steps: [{ rate: "0.02" }, { rate: "0.01", from: "2022-11-15" }] } });
    const last = feeCalls(fund)!.at(-1)!;
    expect(last.call.minus(new D("10000000").times(new D("0.02").times(45).plus(new D("0.01").times(47))).div(368)).abs().lte(CLOSE)).toBe(true);
    expect(toCents(last.call)).toBe("37228.26");
  });

  it("puts its call after its date's entered calls and before that date's distributions (F4, FA42)", () => {
    // A distribution on the schedule's second call's date returns that call's capital too: $3,075,000 of capital out,
    // not $3,025,000. Both LPs in from the start, since a close can't come after a distribution.
    const fund = schedule({
      flows: [
        { date: "2022-02-15", type: "call", kind: "investment", amount: "3000000" },
        { date: "2022-04-01", type: "distribution", amount: "3100000" },
      ],
      lps: [{ name: "Alder", commitment: "6000000" }, { name: "Birch", commitment: "4000000" }],
    });
    const split = splitAt(fund, "0");
    expect(toCents(split.toDate.lps.capital)).toBe("3075000.00");
  });

  it("pays fees for the GP commitment when it does: the call over (1 − g), g of it its part (F3, F30)", () => {
    const fund = schedule({ terms: { gp_commitment: { share: "0.02", pays_fees: true } } });
    const first = feeCalls(fund)![0]!;
    expect([toCents(first.lps), toCents(first.gpCommitment), toCents(first.call)]).toEqual(["25000.00", "510.20", "25510.20"]);
  });

  it("is the fund's rate for a class's: a class's fee steps down in proportion (F22, F30)", () => {
    // Birch in a class at 1%, half the schedule's 2%: half Alder's fee per dollar, before and after a step to 1.5%.
    const fund = schedule({
      terms: { lp_classes: [{ name: "Anchor", fee_rate: "0.01" }] },
      fee: { steps: [{ rate: "0.02" }, { rate: "0.015", from: "2022-07-01" }] },
      lps: [{ name: "Alder", commitment: "6000000" }, { name: "Birch", commitment: "4000000", class: "Anchor" }],
    });
    expect(feeCalls(fund)!.slice(1, 3).map((c) => c.byLp.map((f) => toCents(f.fee)))).toEqual([
      ["30000.00", "10000.00"],
      ["22500.00", "7500.00"],
    ]);
  });
});
