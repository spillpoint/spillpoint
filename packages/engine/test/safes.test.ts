// M5g: SAFEs still outstanding at a sale (C8; X1, X9, X13, X14, X16). Cases 12
// to 12h run through every exit test; these check what the cases don't reach:
// the Liquidity Capitalization against each case's reported figure, a SAFE's
// ranking kept from its round to the sale, and the refusals.

import { describe, expect, it } from "vitest";

import { D, UnsupportedTermError, buildCapTables, prepare, readCapTable, solve } from "../src/index.ts";
import { readInputs } from "../src/case.ts";
import { readCaseFile } from "./support/cases.ts";

interface ReportedSafe {
  safe: string;
  liquidity_capitalization?: string;
  liquidity_price?: string;
  conversion_shares?: string;
}

const exact = (fraction: string) => {
  const [n, d = "1"] = fraction.split("/");
  return new D(n!).div(d);
};
const same = (a: D, b: string) => a.minus(exact(b)).abs().lt("1e-30");

describe("the Liquidity Capitalization (X1, X13, X14)", () => {
  // expected.json reports it at the top of the range, where the decisions have settled (C8).
  it.each([
    "edge-12-unconverted-safe",
    "edge-12b-safe-cap-and-discount",
    "edge-12d-safe-alongside-preferred",
    "edge-12e-safe-ranks-with-series-a",
    "edge-12f-two-safes",
    "edge-12g-pre-money-safe-at-a-sale",
  ])("%s: the count, price and shares at the top of the range match the case's report", (name) => {
    const exit = readInputs(readCaseFile(name, "inputs.json"));
    const reported = (readCaseFile(name, "expected.json") as { exit: { unconverted_safes: ReportedSafe[] } }).exit.unconverted_safes;
    const [answer] = solve(prepare(exit.capTable, exit.exitDate), exit.range[1]).answers;
    for (const r of reported) {
      const here = answer!.payout.safes.get(r.safe)!;
      expect(here.converts).toBe(true);
      for (const [got, want] of [
        [here.liquidityCapitalization!, r.liquidity_capitalization!],
        [here.liquidityPrice!, r.liquidity_price!],
        [here.shares!, r.conversion_shares!],
      ] as const) {
        expect(got.minus(exact(want)).abs().lt("1e-30"), `${r.safe}: ${got.toString()} vs ${want}`).toBe(true);
      }
    }
  });
});

describe("a SAFE's ranking, from its round to the sale (X9, C8)", () => {
  // Series A senior to Seed, then a $1M SAFE whose Cash-Out Amount ranks with Series A. 12e settles the
  // ranking on a cap table as it stands; this checks it survives being built from the events.
  const series = (id: string, name: string) => ({ id, name, kind: "preferred", preference_multiple: "1", participation: "non_participating", cap_multiple: null, anti_dilution: "none" });
  const inputs = (ranks: boolean) => ({
    holders: [{ id: "ana", name: "Ana" }, { id: "s", name: "Seed Fund" }, { id: "a", name: "A Fund" }, { id: "x", name: "X" }],
    events: [
      { id: "founding", date: null, type: "issue", security: { id: "common", name: "Common Stock", kind: "common" }, issues: [{ holder: "ana", shares: "8000000" }] },
      { id: "seed", date: "2022-01-01", type: "priced_round", series: series("seed", "Seed Preferred"), pre_money: "8000000", investments: [{ holder: "s", amount: "2000000" }], seniority: [["seed"]] },
      { id: "series_a", date: "2023-01-01", type: "priced_round", series: series("series_a", "Series A Preferred"), pre_money: "20000000", investments: [{ holder: "a", amount: "4000000" }], seniority: [["series_a"], ["seed"]] },
      { id: "safe", date: "2024-01-01", type: "safes", safes: [{ id: "safe_x", holder: "x", purchase_amount: "1000000", post_money_cap: "40000000", ...(ranks ? { cash_out_ranks_with: "series_a" } : {}) }] },
    ],
    exit: { cap_table_after_event: "safe", range: ["0", "10000000"], exit_values: [] },
  });
  const at5M = (ranks: boolean) => {
    const totals = solve(prepare(readInputs(inputs(ranks)).capTable), new D("5000000")).answers[0]!.payout.holderTotals;
    return ["a", "x", "s"].map((h) => totals.get(h)!.toFixed(2));
  };

  it("keeps cash_out_ranks_with on the cap table buildCapTables builds", () => {
    const { holders, events } = inputs(true);
    expect(buildCapTables({ holders, events }).at(-1)!.capTable.unconvertedSafes![0]!.cashOutRanksWith).toBe("series_a");
  });

  it("pays it with Series A: at $5M the senior tier, $4M and the SAFE's $1M, is paid in full and the Seed gets nothing", () => {
    expect(at5M(true)).toEqual(["4000000.00", "1000000.00", "0.00"]);
    // By default it joins the most junior tier, the Seed's: the $1M left is shared $2M to $1M.
    expect(at5M(false)).toEqual(["4000000.00", "333333.33", "666666.67"]);
  });
});

describe("what is refused, never skipped", () => {
  const table = (safes: Record<string, unknown>[], preferred: Record<string, unknown> | null = null) => ({
    holders: [{ id: "a", name: "A" }, { id: "s", name: "S" }, { id: "t", name: "T" }],
    securities: [{ id: "common", name: "Common Stock", kind: "common" }, ...(preferred ? [preferred] : [])],
    seniority: preferred ? [["p"]] : [],
    positions: [{ holder: "a", security: "common", shares: 1000000 }],
    unissued_pool: 0,
    unconverted_safes: safes,
  });
  const seed = { id: "p", name: "Seed", kind: "preferred", original_issue_price: "1", preference_multiple: "1", participation: "non_participating", cap_multiple: null };
  const post = (id: string, holder: string) => ({ id, holder, purchase_amount: "100000", post_money_cap: "1000000", discount: "0" });

  it.each([
    ["two SAFEs where one has no cap (X13)", table([post("x", "s"), { id: "y", holder: "t", purchase_amount: "100000", discount: "0.2" }]), "several_safes"],
    ["two SAFEs where one is pre-money (X14)", table([post("x", "s"), { id: "y", holder: "t", purchase_amount: "100000", pre_money_cap: "900000" }]), "several_safes"],
    ["a pre-money SAFE alongside preferred (X14)", table([{ id: "x", holder: "s", purchase_amount: "100000", pre_money_cap: "900000" }], seed), "pre_money_safe_with_preferred"],
  ])("refuses %s, until a case settles it", (_, ct, term) => {
    let error: unknown;
    try {
      readCapTable(ct);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(UnsupportedTermError);
    expect(error).toMatchObject({ term, milestone: "later" });
  });

  it("pays a SAFE with no cap beside capped participating preferred: its worth comes out first, then the cap applies (X9, 12i)", () => {
    // 1,000,000 common; a 1,000,000-share Seed at $1.00, participating to a 2x cap; a $100,000 SAFE, 20% discount, no
    // cap. At $3,500,000 the Seed keeps its $1,000,000 preference, leaving $2,500,000. Converting at the common price
    // less 20% is worth exactly $100,000 ÷ 0.8 = $125,000, so the SAFE takes that first. The other $2,375,000 would
    // give the Seed $1,187,500 more, past its cap, so it stops at $2,000,000 and common gets $1,375,000: $1.375 a
    // share, so the SAFE's shares are $100,000 ÷ (0.8 × $1.375) = 90,909.09. (Sharing the whole residual at one
    // price first, as before 03e, would have paid the SAFE $142,857.14.) Converting the Seed would pay it only
    // ($3,500,000 − $125,000) ÷ 2 = $1,687,500, so it keeps its preference.
    const ct = readCapTable({
      holders: [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "s", name: "S" }],
      securities: [{ id: "common", name: "Common Stock", kind: "common" }, { ...seed, participation: "participating_capped", cap_multiple: "2" }],
      seniority: [["p"]],
      positions: [{ holder: "a", security: "common", shares: 1000000 }, { holder: "b", security: "p", shares: 1000000 }],
      unissued_pool: 0,
      unconverted_safes: [{ id: "x", holder: "s", purchase_amount: "100000", discount: "0.2" }],
    });
    const [answer] = solve(prepare(ct, null), new D(3500000)).answers;
    const paid = answer!.payout.bySecurity;
    expect([...answer!.decisions.converted]).toEqual(["x"]);
    expect([paid.get("p")!, paid.get("common")!, paid.get("x")!].map((v) => v.toString())).toEqual(["2000000", "1375000", "125000"]);
    expect(answer!.payout.atCap).toEqual(["p"]);
    expect(answer!.payout.commonPrice.toString()).toBe("1.375");
    expect(same(answer!.payout.safes.get("x")!.shares!, "1000000/11")).toBe(true);
  });

  it.each([
    ["an unknown holder", table([post("x", "z")]), "cap_table.unconverted_safes[0].holder: unknown holder z"],
    ["an id already used", table([post("common", "s")]), "cap_table.unconverted_safes[0].id: common is already used"],
    ["a ranking that isn't a series in the tiers", table([{ ...post("x", "s"), cash_out_ranks_with: "series_z" }], seed), "series_z is not a preferred series in the seniority tiers"],
    ["both caps", table([{ ...post("x", "s"), pre_money_cap: "900000" }]), "a SAFE has a post-money cap or a pre-money cap, not both"],
  ])("refuses %s, as malformed", (_, ct, message) => {
    expect(() => readCapTable(ct)).toThrow(message);
  });
});
