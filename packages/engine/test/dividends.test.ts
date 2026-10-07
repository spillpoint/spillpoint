// M5e: cumulative dividends (X2, X4, X5). Cases 9, 9b and 9c run through every
// exit test; these check what the cases don't reach: the dates, the refusals,
// and a warrant's shares carrying no dividends.

import { describe, expect, it } from "vitest";

import { anniversary, compoundingPeriods } from "../src/dates.ts";
import { D, InputError, UnsupportedTermError, buildCapTables, payout, prepare, readCapTable, readExit } from "../src/index.ts";
import { readInputs } from "../src/case.ts";
import { readCaseFile } from "./support/cases.ts";

/** 1M common and 1M preferred at $1, 1x non-participating, with a 10% cumulative dividend. */
function table(dividend: Record<string, unknown>, extra: { securities?: unknown[]; positions?: unknown[] } = {}) {
  return {
    holders: [{ id: "x", name: "X" }, { id: "y", name: "Y" }, { id: "l", name: "L" }],
    securities: [
      { id: "common", name: "Common Stock", kind: "common" },
      {
        id: "p", name: "Preferred", kind: "preferred", original_issue_price: "1", preference_multiple: "1",
        participation: "non_participating", cap_multiple: null, cumulative_dividend: { rate: "0.1", accrual_start: "2024-02-29", ...dividend },
      },
      ...(extra.securities ?? []),
    ],
    seniority: [["p"]],
    positions: [{ holder: "x", security: "common", shares: 1000000 }, { holder: "y", security: "p", shares: 1000000 }, ...(extra.positions ?? [])],
    unissued_pool: 0,
  };
}

const exitOn = (dividend: Record<string, unknown>, exitDate: string | null) =>
  readExit({ cap_table: table(dividend), range: ["0", "5000000"], exit_values: [], ...(exitDate ? { exit_date: exitDate } : {}) });

describe("dates (X2, X5)", () => {
  it("puts a 29 February start's anniversaries on 28 February in other years", () => {
    expect([1, 2, 3, 4].map((n) => anniversary("2024-02-29", n))).toEqual(["2025-02-28", "2026-02-28", "2027-02-28", "2028-02-29"]);
  });

  it("counts full years on the anniversaries, then the days after the last one", () => {
    expect(compoundingPeriods("2022-03-31", "2026-09-30")).toEqual({ years: 4, stubDays: 183 });
    expect(compoundingPeriods("2024-02-29", "2026-08-28")).toEqual({ years: 2, stubDays: 181 });
    expect(compoundingPeriods("2024-02-29", "2025-02-27")).toEqual({ years: 0, stubDays: 364 });
  });
});

describe("what accrues", () => {
  it("matches each dividend case's accrual to 30 digits", () => {
    for (const name of ["edge-09-cumulative-dividends", "edge-09b-compounding-dividends", "edge-09c-dividends-paid-on-conversion"]) {
      const exit = readInputs(readCaseFile(name, "inputs.json"));
      const expected = (readCaseFile(name, "expected.json") as { exit: { accrued_dividends: { total: string }[] } }).exit.accrued_dividends[0]!.total;
      const [num, den = "1"] = expected.split("/");
      const accrued = prepare(exit.capTable, exit.exitDate).dividends.get("seed")!;
      expect(accrued.minus(new D(num!).div(den)).abs().lt("1e-30")).toBe(true);
    }
  });

  it("compounds a full year at exactly the rate, even one with 366 days", () => {
    const exit = exitOn({ method: "compounding", accrual_start: "2023-03-01" }, "2024-03-01");
    expect(prepare(exit.capTable, exit.exitDate).dividends.get("p")!.toString()).toBe("100000");
  });

  it("compounds from a 29 February start: two years at 10%, then 181 days simple on $1.21", () => {
    const exit = exitOn({ method: "compounding" }, "2026-08-28");
    const expected = new D("1.21").times(new D("0.1").times(181).plus(365)).div(365).minus(1).times(1000000);
    expect(prepare(exit.capTable, exit.exitDate).dividends.get("p")!.minus(expected).abs().lt("1e-30")).toBe(true);
  });

  it("gives a warrant's shares no dividends: they weren't outstanding while they accrued (X5)", () => {
    // 365 days at 10% on 1M shares: $100,000. A warrant for 500,000 more at $0.10, exercised, adds
    // $500,000 of preference and no dividends: the tier claims $1,600,000.
    const exit = readExit({
      cap_table: table({ accrual_start: "2023-01-01" }, {
        securities: [{ id: "w", name: "Warrant", kind: "warrant", strike: "0.1", underlying: "p" }],
        positions: [{ holder: "l", security: "w", shares: 500000 }],
      }),
      range: ["0", "5000000"],
      exit_values: [],
      exit_date: "2024-01-01",
    });
    const pc = prepare(exit.capTable, exit.exitDate);
    const p = payout(pc, new D(1000000), { converted: new Set(), exercised: new Set(["w"]) });
    expect(p.tiers[0]!.claim.toString()).toBe("1600000");
  });
});

describe("dividends paid on conversion (X5)", () => {
  it("leave a converted series a claim for them in its tier", () => {
    // 365 days at 10%: $100,000. Converted at $3M: $100,000 in the tier, then half of $2.9M.
    const exit = exitOn({ accrual_start: "2023-01-01", on_conversion: "paid" }, "2024-01-01");
    const p = payout(prepare(exit.capTable, exit.exitDate), new D(3000000), { converted: new Set(["p"]), exercised: new Set() });
    expect([p.tiers[0]!.claim.toString(), p.bySecurity.get("p")!.toString()]).toEqual(["100000", "1550000"]);
  });
});

describe("refusals", () => {
  it("needs an exit date on or after every accrual start", () => {
    expect(() => exitOn({}, null)).toThrow("exit.exit_date: Preferred accrues cumulative dividends, so the exit needs an exit_date");
    expect(() => exitOn({}, "2024-02-28")).toThrow("exit.exit_date: 2024-02-28 is before Preferred's dividends start to accrue, 2024-02-29");
    expect(() => exitOn({}, "29 Feb 2025")).toThrow("exit.exit_date: expected a date as YYYY-MM-DD");
    expect(() => prepare(readCapTable(table({})))).toThrow(InputError);
  });

  it("refuses the other reading, dividends added to what converts, until a case settles it", () => {
    let error: unknown;
    try {
      exitOn({ on_conversion: "added_to_conversion" }, "2025-01-01");
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(UnsupportedTermError);
    expect(error).toMatchObject({ term: "dividends_added_to_conversion", milestone: "later" });
  });

  it("refuses a method or a conversion rule it doesn't know", () => {
    expect(() => exitOn({ method: "monthly" }, "2025-01-01")).toThrow("cumulative_dividend.method: must be simple or compounding");
    expect(() => exitOn({ on_conversion: "kept" }, "2025-01-01")).toThrow("cumulative_dividend.on_conversion: must be forfeited or paid");
  });

  it("refuses dividends on a series issued in a company's rounds", () => {
    const company = {
      holders: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
      events: [
        { id: "f", date: null, type: "issue", security: { id: "common", name: "Common Stock", kind: "common" }, issues: [{ holder: "a", shares: 1000000 }] },
        {
          id: "r", date: "2024-01-01", type: "priced_round", pre_money: "1000000", investments: [{ holder: "b", amount: "100000" }],
          pool_target_unissued_percent_post: "0", seniority: [["seed"]],
          series: {
            id: "seed", name: "Seed Preferred", kind: "preferred", preference_multiple: "1", participation: "non_participating",
            cap_multiple: null, anti_dilution: "none", cumulative_dividend: { rate: "0.08", accrual_start: "2024-01-01" },
          },
        },
      ],
    };
    expect(() => buildCapTables(company)).toThrow(UnsupportedTermError);
    expect(() => buildCapTables(company)).toThrow(/inputs\.events\[1\]\.series\.cumulative_dividend: Cumulative dividends on a series issued in a company's rounds/);
  });
});
