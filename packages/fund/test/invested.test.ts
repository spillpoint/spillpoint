// Fees on invested capital (F38 to F40) where the cases don't reach: net invested capital at D, the fee day by day on
// small numbers, a switch inside a quarter, each LP by its fee weight, a period with nothing to call that still counts
// by its date (FA66), D's period (F39), a step named on commitments (FA63), and a step built by hand without a basis
// (FA67). Cases 38 to 41 run through the case tests beside the others.

import { describe, expect, it } from "vitest";

import { D, equalization, feeCalls, findBreakpoints, netInvestedCapital, portfolio, readFund, splitAt, toCents } from "../src/index.ts";
import type { Fund } from "../src/index.ts";
import { RUN_CASES, readCaseFile } from "./support/cases.ts";
import type { CaseInputs } from "./support/cases.ts";

/** FA15: two ways of working out one exact amount agree within this. */
const CLOSE = new D("1e-18");

const call = (date: string, amount: string, kind = "investment") => ({ date, type: "call", kind, amount });
const exit = (date: string, amount: string, investment?: string, share?: string) => ({ date, type: "distribution", amount, ...(investment ? { investment } : {}), ...(share ? { share } : {}) });
const writeOff = (date: string, investment: string) => ({ date, type: "write_off", investment });

/** A fraction worked at 40 digits. */
const ratio = (num: string | number, den: string | number) => new D(num).div(den);

/** The schedule's calls as [date, call], each call checked against an exact fraction within FA15. */
function callsAre(fund: Fund, want: [string, D][]) {
  const calls = feeCalls(fund)!;
  expect(calls.map((c) => c.date)).toEqual(want.map(([date]) => date));
  calls.forEach((c, i) => expect(c.call.minus(want[i]![1]).abs().lte(CLOSE), `${c.date}: ${c.call.toString()} against ${want[i]![1].toString()}`).toBe(true));
}

/**
 * F38: A's $600 on 1 Jan; C's $100 on 1 Feb; B's $400 on 1 Mar: $1,100. Half of A sold on 1 May realizes $300: $800.
 * C sold whole on 1 Jun: $700. On 1 Jul A's $200 follow-on comes before the half sale that day (F4), which realizes
 * half of $500: $650. C's escrow release on 1 Aug and the distribution naming no investment on 1 Sep realize nothing. B
 * written off on 1 Oct: $250. Yearly at 2% of invested capital, no listed LPs and no GP commitment.
 */
const INVESTED = {
  as_of: "2021-12-31",
  terms: { carry: "0.2", management_fee: { start: "2021-01-01", frequency: "annual", steps: [{ rate: "0.02", basis: "invested_capital" }] } },
  investments: [
    { name: "A", checks: [{ date: "2021-01-01", amount: "600" }, { date: "2021-07-01", amount: "200" }] },
    { name: "B", checks: [{ date: "2021-03-01", amount: "400" }] },
    { name: "C", checks: [{ date: "2021-02-01", amount: "100" }] },
  ],
  cash_flows: [
    call("2021-01-01", "1300"),
    exit("2021-05-01", "500", "A", "0.5"),
    exit("2021-06-01", "300", "C"),
    exit("2021-07-01", "400", "A", "0.5"),
    exit("2021-08-01", "50", "C"),
    exit("2021-09-01", "100"),
    writeOff("2021-10-01", "B"),
  ],
};

describe("net invested capital (F38)", () => {
  it("is the checks made to D less the cost realized to D, whole-fund, zero without investments", () => {
    expect(netInvestedCapital(readFund(INVESTED)).toString()).toBe("250");
    // At each date up to D, after that date's events (FA65): D moved back to each, its flows cut to D.
    const at = (d: string) => {
      const flows = INVESTED.cash_flows.filter((f) => f.date <= d);
      const investments = INVESTED.investments.map((inv) => ({ ...inv, checks: inv.checks.filter((c) => c.date <= d) })).filter((inv) => inv.checks.length > 0);
      return netInvestedCapital(readFund({ ...INVESTED, as_of: d, cash_flows: flows, investments })).toString();
    };
    expect(["2021-01-01", "2021-01-31", "2021-02-01", "2021-03-01", "2021-05-01", "2021-06-01", "2021-07-01", "2021-09-01", "2021-10-01"].map(at)).toEqual(["600", "600", "700", "1100", "800", "700", "650", "650", "250"]);
  });

  it.each(RUN_CASES)("%s: is what's left of each investment in the table, added up", (dir) => {
    const fund = readFund(readCaseFile<CaseInputs>(dir, "inputs.json").fund);
    const left = portfolio(fund).reduce((t, r) => t.plus(r.costMade).minus(r.costRealized), new D(0));
    expect(netInvestedCapital(fund).minus(left).abs().lte(CLOSE)).toBe(true);
  });

  it("is fresh each time, as the investments table is", () => {
    const fund = readFund(INVESTED);
    expect(netInvestedCapital(fund)).not.toBe(netInvestedCapital(fund));
  });
});

describe("the fee on invested capital (F39)", () => {
  it("is each day's rate times that day's net invested capital, added up, over n × the period's days", () => {
    // 2021's 365 days: 31 at $600, 28 at $700, 61 at $1,100, 31 at $800, 30 at $700, 92 at $650 and 92 at $250, $233,900
    // of dollar-days; at 2% a year, 0.02 × 233,900 / 365 = 4,678 / 365. No `commitments`: the schedule is wholly on
    // invested capital, and without listed LPs and a GP commitment the call is the LPs' fee.
    callsAre(readFund(INVESTED), [["2021-01-01", ratio(4678, 365)]]);
  });

  it("switches inside a quarter, day by day, and the GP commitment pays its share when it pays fees (F3)", () => {
    // 2% of $3,650 of commitments to 14 Feb, then 1% of invested capital, $1,000 from 1 Jan, a 1% GP commitment fee-free.
    // Q1's 90 days: 45 at 2% of $3,650, 45 at 1% of the LPs' 99% of $1,000: (3,285 + 445.5) / 360. Q2's 91 days all at
    // 1%: 9.9 / 4. Paying fees, the call is that over 0.99, and the GP commitment pays 1% of it.
    const input = (paysFees: boolean, firstBasis?: string | null) => ({
      as_of: "2021-06-30",
      terms: {
        carry: "0.2",
        gp_commitment: { share: "0.01", pays_fees: paysFees },
        management_fee: { start: "2021-01-01", steps: [{ rate: "0.02", ...(firstBasis !== undefined ? { basis: firstBasis } : {}) }, { rate: "0.01", from: "2021-02-15", basis: "invested_capital" }], commitments: "3650" },
      },
      investments: [{ name: "A", checks: [{ date: "2021-01-01", amount: "1000" }] }],
      cash_flows: [call("2021-01-01", "1000")],
    });
    callsAre(readFund(input(false)), [["2021-01-01", ratio(37305, 3600)], ["2021-04-01", ratio(99, 40)]]);
    callsAre(readFund(input(true)), [["2021-01-01", ratio(37305, 3600).div("0.99")], ["2021-04-01", ratio(5, 2)]]);
    const q2 = feeCalls(readFund(input(true)))![1]!;
    expect([toCents(q2.lps), toCents(q2.gpCommitment)]).toEqual(["2.48", "0.03"]);
    // FA63: the first step named on commitments is the default, and so is null.
    for (const basis of ["commitments", null]) expect(feeCalls(readFund(input(true, basis)))).toEqual(feeCalls(readFund(input(true))));
  });

  it("gives each LP its fee weight's share: the rate on its share of invested capital by commitment, times its class factor", () => {
    // A on the fund's terms commits 6, B in an Anchor class at 1% against the schedule's 2% commits 2, C at no fee commits
    // 2: fee weights 6, 1 and 0 over commitments of 10. $1,000 invested all year at 2%, a 2% GP commitment paying fees:
    // the LPs' fee is 0.02 × 0.98 × 1,000 × 7/10 = 13.72. A pays 11.76, B 1.96 (half A's rate on its commitment), C
    // nothing; the call is 13.72 / 0.98 = 14, the GP commitment's part 0.28.
    const fund = readFund({
      as_of: "2021-12-31",
      terms: {
        carry: "0.2",
        gp_commitment: { share: "0.02", pays_fees: true },
        lp_classes: [{ name: "Anchor", fee_rate: "0.01" }, { name: "F&F", fee_rate: "0" }],
        management_fee: { start: "2021-01-01", frequency: "annual", steps: [{ rate: "0.02", basis: "invested_capital" }] },
      },
      lps: [{ name: "A", commitment: "6" }, { name: "B", commitment: "2", class: "Anchor" }, { name: "C", commitment: "2", class: "F&F" }],
      investments: [{ name: "X", checks: [{ date: "2021-01-01", amount: "1000" }] }],
      cash_flows: [call("2021-01-01", "1000")],
    });
    const [c] = feeCalls(fund)!;
    const close = (got: D, want: string) => got.minus(want).abs().lte(CLOSE);
    expect(c!.byLp.map((f) => [f.name, close(f.fee, ["11.76", "1.96", "0"][c!.byLp.indexOf(f)]!)])).toEqual([["A", true], ["B", true], ["C", true]]);
    expect([close(c!.lps, "13.72"), close(c!.call, "14"), close(c!.gpCommitment, "0.28")]).toEqual([true, true, true]);
  });

  it("counts D's period's days after D at D's net invested capital: X doesn't move the fees", () => {
    // Quarterly at 2%, $1,000 from 1 Jan, half sold on D, 16 May. Q2's 91 days: 45 at $1,000, then 46 at $500 from D's
    // sale, the days after D at D's: 0.02 × 68,000 / 364. X, the other half, doesn't move it, final or not.
    const input = {
      as_of: "2021-05-16",
      terms: { carry: "0.2", management_fee: { start: "2021-01-01", steps: [{ rate: "0.02", basis: "invested_capital" }] } },
      investments: [{ name: "X", checks: [{ date: "2021-01-01", amount: "1000" }] }],
      cash_flows: [call("2021-01-01", "1000"), exit("2021-05-16", "800", "X", "0.5")],
      distribution_from: { investment: "X" },
    };
    callsAre(readFund(input), [["2021-01-01", new D(5)], ["2021-04-01", ratio(1360, 364)]]);
    expect(feeCalls(readFund({ ...input, final: true }))).toEqual(feeCalls(readFund(input)));
    expect(toCents(splitAt(readFund(input), "0").lpsPaidIn)).toBe(toCents(splitAt(readFund(input), "5000000").lpsPaidIn));
  });
});

describe("a period with nothing to call (F39, FA40, FA66)", () => {
  // Yearly at 2% of invested capital from 2021, the one check on 1 Mar 2022, sold on 30 Jun 2023. 2021 has nothing
  // invested, and neither has 2024: neither is a call. 2022 has 306 days at $1,000, 2023 has 180.
  const input = {
    as_of: "2024-03-31",
    terms: { carry: "0.2", management_fee: { start: "2021-01-01", frequency: "annual", steps: [{ rate: "0.02", basis: "invested_capital" }] } },
    lps: [{ name: "A", commitment: "1" }, { name: "B", commitment: "1", close: "2021-06-01" }],
    investments: [{ name: "X", checks: [{ date: "2022-03-01", amount: "1000" }] }],
    cash_flows: [call("2022-03-01", "1000"), exit("2023-06-30", "3000", "X")],
  };

  it("isn't a call, so every call is above $0", () => {
    const fund = readFund(input);
    callsAre(fund, [["2022-01-01", ratio(20 * 306, 365)], ["2023-01-01", ratio(20 * 180, 365)]]);
    expect(feeCalls(fund)!.every((c) => c.call.gt(0))).toBe(true);
  });

  it("still counts by its date as the fund's first call: an LP closing in it joins at a later close, owing nothing", () => {
    // 2021's period is the fund's first call by its date, so B, closing on 1 Jun 2021, joins at a later close (F25). No
    // call comes before its close, so its equalization row is all zeros, back fees included.
    const eq = equalization(readFund(input))!;
    expect(eq.closes.map((c) => [c.date, c.joining])).toEqual([["2021-06-01", ["B"]]]);
    expect(eq.lps.map((m) => [m.name, ...[m.capitalPaid, m.capitalReturned, m.interestPaid, m.interestReceived, m.backFees].map(toCents)])).toEqual([
      ["A", "0.00", "0.00", "0.00", "0.00", "0.00"],
      ["B", "0.00", "0.00", "0.00", "0.00", "0.00"],
    ]);
    // Without the schedule, the investment call on 1 Mar 2022 is the first, and B is in from the start.
    expect(equalization(readFund({ ...input, terms: { carry: "0.2" } }))).toBeNull();
  });

  it("counts by its date in stage 3: a distribution after it isn't before the fund's first call", () => {
    // INVESTED with fees from 2020, a year with nothing invested, and a distribution naming no investment on 1 Jun 2020,
    // before the investment call. It's after 2020's period by date, so it isn't refused; on 31 Dec 2019 it would be.
    const flows = (date: string) => INVESTED.cash_flows.map((f, i) => (i === 5 ? exit(date, "100") : f));
    const fee = { ...INVESTED.terms.management_fee, start: "2020-01-01" };
    const fund = readFund({ ...INVESTED, terms: { ...INVESTED.terms, management_fee: fee }, cash_flows: flows("2020-06-01") });
    expect(feeCalls(fund)!.map((c) => c.date)).toEqual(["2021-01-01"]);
    expect(() => readFund({ ...INVESTED, terms: { ...INVESTED.terms, management_fee: fee }, cash_flows: flows("2019-12-31") })).toThrow(
      expect.objectContaining({ kind: "input", term: "distribution_before_call", path: "cash_flows[5]" }),
    );
  });
});

describe("a schedule with no step on invested capital (F40, FA63)", () => {
  it.each(["fund-29-fee-schedule", "fund-30-fee-step-down", "fund-31-fee-schedule-classes-closes", "fund-36-deal-by-deal-classes-closes"])(
    "%s gives the same answers digit for digit with each step named on commitments",
    (dir) => {
      const input = readCaseFile<CaseInputs>(dir, "inputs.json").fund as { terms: { management_fee: { steps: Record<string, unknown>[] } } };
      const named = structuredClone(input);
      for (const s of named.terms.management_fee.steps) s.basis = "commitments";
      const answers = (fund: Fund) => JSON.stringify([feeCalls(fund), splitAt(fund, "10000000"), splitAt(fund, "10000000", { final: true }), findBreakpoints(fund), equalization(fund)]);
      expect(answers(readFund(named))).toBe(answers(readFund(input)));
    },
  );
});

describe("a fee step built by hand without a basis (FA67)", () => {
  it("is on commitments, so a fund built as 0.5.0 built one splits as it did", () => {
    // Case 31, read, then each step's basis taken off: its fee calls, splits and breakpoints are the same.
    const read = readFund(readCaseFile<CaseInputs>("fund-31-fee-schedule-classes-closes", "inputs.json").fund);
    const fee = read.terms.managementFee!;
    const fund = { ...read, terms: { ...read.terms, managementFee: { ...fee, steps: fee.steps.map(({ basis: _b, ...s }) => s) } } } as unknown as Fund;
    const answers = (f: Fund) => JSON.stringify([feeCalls(f), splitAt(f, "10000000"), findBreakpoints(f), equalization(f)]);
    expect(answers(fund)).toBe(answers(read));
  });
});

describe("F40's refusals where fund-41 doesn't reach", () => {
  /** The refusal reading `input` gives, as [kind, term, path]. */
  function refused(input: unknown): [string, string, string] {
    try {
      readFund(input);
    } catch (e) {
      const r = e as { kind: string; term: string; path: string };
      return [r.kind, r.term, r.path];
    }
    throw new Error("read");
  }
  const withStep = (step: Record<string, unknown>) => ({ ...INVESTED, terms: { ...INVESTED.terms, management_fee: { ...INVESTED.terms.management_fee, steps: [step] } } });
  const at = "terms.management_fee.steps[0]";

  it("refuses a step's basis in any form but the two words, exactly as written, after the rate and before the from (FA63)", () => {
    for (const bad of [" invested_capital", "Commitments", "invested capital", true, 0, ["invested_capital"], { basis: "commitments" }]) {
      expect(refused(withStep({ rate: "0.02", basis: bad })), JSON.stringify(bad)).toEqual(["input", "bad_field", `${at}.basis`]);
    }
    expect(refused(withStep({ rate: "0.02", basis: "nav", from: "2021-01-01" }))).toEqual(["input", "bad_field", `${at}.basis`]);
    expect(refused(withStep({ rate: "1", basis: "nav" }))).toEqual(["input", "bad_number", `${at}.rate`]);
    expect(refused(withStep({ rate: "0", basis: "nav" }))).toEqual(["input", "bad_number", `${at}.rate`]);
    expect(refused(withStep({ rate: "0.02", basis: "invested_capital", from: "2021-01-01" }))).toEqual(["input", "steps_out_of_order", at]);
    // Still unsupported: a step's other keys, named by the key, before every field (stage 1).
    expect(refused(withStep({ rate: "x", basis: "nav", waiver: "0.5" }))).toEqual(["unsupported", "waiver", `${at}.waiver`]);
  });

  it("needs investments for a step on invested capital whatever its date, at the end of stage 2 (F40, FA64)", () => {
    const plain = {
      as_of: "2021-12-31",
      terms: { carry: "0.2", management_fee: { start: "2021-01-01", steps: [{ rate: "0.02" }, { rate: "0.01", from: "2030-01-01", basis: "invested_capital" }], commitments: "100" } },
      cash_flows: [call("2021-01-01", "100")],
    };
    expect(refused(plain)).toEqual(["input", "missing_field", "investments"]);
    expect(refused({ ...plain, investments: [] })).toEqual(["input", "missing_field", "investments"]);
    expect(refused({ ...plain, investments: null })).toEqual(["input", "missing_field", "investments"]);
    // After distribution_from's own refusals, before stage 3's.
    expect(refused({ ...plain, distribution_from: { investment: "" } })).toEqual(["input", "bad_field", "distribution_from.investment"]);
    expect(refused({ ...plain, cash_flows: [call("2021-01-01", "100"), call("2022-06-01", "1")] })).toEqual(["input", "missing_field", "investments"]);
    // On commitments, the later step needs nothing more.
    const onCommitments = { ...plain, terms: { ...plain.terms, management_fee: { ...plain.terms.management_fee, steps: [{ rate: "0.02" }, { rate: "0.01", from: "2030-01-01", basis: "commitments" }] } } };
    expect(() => readFund(onCommitments)).not.toThrow();
  });

  it("needs commitments without listed LPs only for a step on commitments, whatever its date (F40, FA64)", () => {
    const fee = INVESTED.terms.management_fee;
    const withFee = (more: Record<string, unknown>, lps?: unknown[]) => ({ ...INVESTED, terms: { ...INVESTED.terms, management_fee: { ...fee, ...more } }, ...(lps ? { lps } : {}) });
    // Wholly on invested capital: none needed; given, checked (F32) and unused, a term given but not needed (FA26).
    expect(feeCalls(readFund(withFee({ commitments: "5000" })))).toEqual(feeCalls(readFund(INVESTED)));
    expect(refused(withFee({ commitments: "0" }))).toEqual(["input", "bad_number", "terms.management_fee.commitments"]);
    // A step on commitments dated after D still needs them.
    expect(refused(withFee({ steps: [...fee.steps, { rate: "0.01", from: "2030-01-01" }] }))).toEqual(["input", "missing_field", "terms.management_fee.commitments"]);
    // With listed LPs, `commitments` given is still their total, whatever the basis (F32).
    const lps = [{ name: "A", commitment: "3" }, { name: "B", commitment: "1" }];
    expect(refused(withFee({ commitments: "5" }, lps))).toEqual(["input", "fee_commitments_mismatch", "terms.management_fee.commitments"]);
    expect(() => readFund(withFee({ commitments: "4" }, lps))).not.toThrow();
  });
});
