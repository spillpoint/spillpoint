// M5g: SAFEs still outstanding at a sale (C8; X1, X9, X13, X14, X16). Cases 12
// to 12h run through every exit test; these check what the cases don't reach:
// the Liquidity Capitalization against each case's reported figure, and the
// refusals.

import { describe, expect, it } from "vitest";

import { D, UnsupportedTermError, prepare, readCapTable, solve } from "../src/index.ts";
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
    [
      "a SAFE with no cap alongside capped participating preferred (X9)",
      table([{ id: "x", holder: "s", purchase_amount: "100000", discount: "0.2" }], { ...seed, participation: "participating_capped", cap_multiple: "2" }),
      "uncapped_safe_with_capped_participation",
    ],
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

  it.each([
    ["an unknown holder", table([post("x", "z")]), "cap_table.unconverted_safes[0].holder: unknown holder z"],
    ["an id already used", table([post("common", "s")]), "cap_table.unconverted_safes[0].id: common is already used"],
    ["a ranking that isn't a series in the tiers", table([{ ...post("x", "s"), cash_out_ranks_with: "series_z" }], seed), "series_z is not a preferred series in the seniority tiers"],
    ["both caps", table([{ ...post("x", "s"), pre_money_cap: "900000" }]), "a SAFE has a post-money cap or a pre-money cap, not both"],
  ])("refuses %s, as malformed", (_, ct, message) => {
    expect(() => readCapTable(ct)).toThrow(message);
  });
});
