// M5f: management carve-outs (C6, X6, X7, X17). Cases 10 and 10b run through
// every exit test; these check what the cases don't reach: reading one, the
// refusals, and a carve-out alongside the preferences with no preferred.

import { describe, expect, it } from "vitest";

import { D, findBreakpoints, prepare, readCapTable, solve } from "../src/index.ts";

/** 1M common, a flat 10% carve-out, all to m. */
function table(carveOut: Record<string, unknown>, preferred = false) {
  return {
    holders: [{ id: "x", name: "X" }, { id: "y", name: "Y" }, { id: "m", name: "M" }],
    securities: [
      { id: "common", name: "Common Stock", kind: "common" },
      ...(preferred
        ? [{ id: "p", name: "Preferred", kind: "preferred", original_issue_price: "1", preference_multiple: "1", participation: "non_participating", cap_multiple: null }]
        : []),
    ],
    seniority: preferred ? [["p"]] : [],
    positions: [{ holder: "x", security: "common", shares: 1000000 }, ...(preferred ? [{ holder: "y", security: "p", shares: 1000000 }] : [])],
    unissued_pool: 0,
    carve_out: { tiers: [{ from: "0", to: null, percent: "10" }], allocation: [{ holder: "m", percent: "100" }], ...carveOut },
  };
}

describe("reading a carve-out (C6)", () => {
  it("reads marginal tiers, the timing, and the recipients' shares", () => {
    const ct = readCapTable(
      table({ timing: "alongside_preferences", tiers: [{ from: "0", to: "1000000", percent: "10" }, { from: "1000000", to: null, percent: "5" }] }, true),
    );
    expect(ct.carveOut!.timing).toBe("alongside_preferences");
    expect(ct.carveOut!.tiers.map((t) => [t.from.toString(), t.to?.toString() ?? null, t.rate.toString()])).toEqual([
      ["0", "1000000", "0.1"],
      ["1000000", null, "0.05"],
    ]);
  });

  it.each([
    ["a tier that doesn't start at 0", { tiers: [{ from: "5", to: null, percent: "10" }] }, "carve_out.tiers[0].from: tiers start at 0 and run on without gaps: this one should start at 0"],
    ["a gap between tiers", { tiers: [{ from: "0", to: "100", percent: "10" }, { from: "200", to: null, percent: "5" }] }, "this one should start at 100"],
    ["a tier after one with no end", { tiers: [{ from: "0", to: null, percent: "10" }, { from: "100", to: null, percent: "5" }] }, "carve_out.tiers[1]: comes after a tier with no upper end"],
    ["a rate over 100%", { tiers: [{ from: "0", to: null, percent: "120" }] }, "carve_out.tiers[0].percent: can't be more than 100"],
    ["shares that don't add up to 100%", { allocation: [{ holder: "m", percent: "60" }] }, "the recipients' percentages add up to 60, not 100"],
    ["a recipient who isn't a holder", { allocation: [{ holder: "z", percent: "100" }] }, "carve_out.allocation[0].holder: z is not a listed holder"],
    ["a timing it doesn't know", { timing: "after_preferences" }, "carve_out.timing: must be before_preferences or alongside_preferences"],
  ])("refuses %s", (_, change, message) => {
    expect(() => readCapTable(table(change))).toThrow(message);
  });
});

describe("paying it (X7)", () => {
  it("pays it first when it is alongside the preferences but there are none", () => {
    const [answer] = solve(prepare(readCapTable(table({ timing: "alongside_preferences" }))), new D(1000000)).answers;
    expect(answer!.payout.lines.map((l) => [l.holder, l.security, l.amount.toString()])).toEqual([
      ["x", "common", "900000"],
      ["m", "carve_out", "100000"],
    ]);
    expect(answer!.payout.curved).toBe(false);
  });

  it("alongside the preferences, curves until their tier is paid in full, then runs straight", () => {
    // A $1M preference and a flat 10% carve-out share the tier: the carve-out gets E × 0.1E ÷ (0.1E + $1M), a curve,
    // until E = $1M + 0.1E, $10M/9. Then the preference converts once 0.9E/2 > $1M, E > $20M/9 (X17).
    const pc = prepare(readCapTable(table({ timing: "alongside_preferences" }, true)));
    const found = findBreakpoints(pc, [new D(0), new D(5000000)]);
    expect(found.map((b) => [b.exitValue.toFixed(2), b.curveBelow, b.curveAbove])).toEqual([
      ["1111111.11", true, false],
      ["2222222.22", false, false],
    ]);
    const [answer] = solve(pc, new D(1000000)).answers;
    expect(answer!.payout.bySecurity.get("carve_out")!.minus(new D(1000000).div(11)).abs().lt("1e-30")).toBe(true);
  });
});
