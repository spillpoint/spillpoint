// M2d: the breakpoint finder. For cases 1–7 and Millrace it must find every
// breakpoint expected.json lists, each within $0.01 of its exact value, with
// the same reason codes, the same subjects (which series, tier or option
// class), and the same jump flags (E13). The wording of the reasons is the
// engine's own.

import { describe, expect, it } from "vitest";

import { D, findBreakpoints, prepare, readCapTable, readCase } from "../src/index.ts";
import type { Breakpoint } from "../src/index.ts";
import { M2_CASES, capTablesOf, readCaseFile } from "./support/cases.ts";

interface ExpectedBreakpoint {
  exit_value: string;
  exact: string;
  payouts_jump?: boolean;
  reasons: { code: string; security?: string; securities?: string[] }[];
}

const CENT = new D("0.01");

/** A reason as "code: subject", the subject being the securities it concerns. A group is named by its series joined with "+". */
function engineReasons(b: Breakpoint): string[] {
  return b.reasons.map((r) => `${r.code}: ${[...r.subject].sort().join("+")}`).sort();
}

function expectedReasons(b: ExpectedBreakpoint): string[] {
  return b.reasons
    .map((r) => `${r.code}: ${(r.securities ?? (r.security ? r.security.split("+") : [])).slice().sort().join("+")}`)
    .sort();
}

describe.each(M2_CASES)("%s", (name) => {
  const exit = readCase(readCaseFile(name, "inputs.json"), capTablesOf(name));
  const expected = (readCaseFile(name, "expected.json") as { exit: { breakpoints: ExpectedBreakpoint[] } }).exit.breakpoints;
  const found = findBreakpoints(prepare(exit.capTable), exit.range);

  it("finds the same breakpoints, each within a cent", () => {
    expect(found).toHaveLength(expected.length);
    found.forEach((b, i) => {
      const exact = new D(expected[i]!.exact.split("/")[0]!).div(expected[i]!.exact.split("/")[1] ?? "1");
      expect(b.exitValue.minus(exact).abs().lte(CENT), `${b.exitValue.toFixed(4)} vs ${expected[i]!.exit_value}`).toBe(true);
    });
  });

  it("gives the same reasons and jump flags", () => {
    found.forEach((b, i) => {
      expect(engineReasons(b), expected[i]!.exit_value).toEqual(expectedReasons(expected[i]!));
      expect(b.jumps, expected[i]!.exit_value).toBe(expected[i]!.payouts_jump ?? false);
      for (const r of b.reasons) expect(r.text.length).toBeGreaterThan(30);
    });
  });
});

describe("a pivotal voter indifferent over a range (E13, sharpened in the M2c review)", () => {
  // s1 ($7.5M, 1x) and s0 ($15M, 3x, capped at 4x) share the senior tier; s2 ($9M, 3x)
  // is junior; s0 and s2 convert together by at least 50%, half each. Below $7.5M s2's
  // holder gets nothing either way; just above, converting pays it, so it carries the
  // vote. Its two outcomes separate rather than cross, and the jump sits at exactly $7.5M.
  // The full list matches the reference calculator's on the same range.
  const pc = prepare(
    readCapTable({
      holders: ["f", "h0", "h1", "h2"].map((id) => ({ id, name: id })),
      securities: [
        { id: "common", name: "Common Stock", kind: "common" },
        { id: "s0", name: "S0", kind: "preferred", original_issue_price: "5", preference_multiple: "3", participation: "participating_capped", cap_multiple: "4" },
        { id: "s1", name: "S1", kind: "preferred", original_issue_price: "3", preference_multiple: "1", participation: "non_participating", cap_multiple: null },
        { id: "s2", name: "S2", kind: "preferred", original_issue_price: "3", preference_multiple: "3", participation: "non_participating", cap_multiple: null },
      ],
      seniority: [["s1", "s0"], ["s2"]],
      conversion_groups: [{ series: ["s0", "s2"], vote_threshold_percent: "50", vote_rule: "at_least" }],
      positions: [
        { holder: "f", security: "common", shares: 4000000 },
        { holder: "h0", security: "s0", shares: 1000000 },
        { holder: "h1", security: "s1", shares: 2500000 },
        { holder: "h2", security: "s2", shares: 1000000 },
      ],
      unissued_pool: 0,
    }),
  );

  it("places the jump at exactly $7.5M, with the reference's other breakpoints", () => {
    const found = findBreakpoints(pc, [new D(0), new D(126000000)]);
    expect(found.map((b) => [b.exitValue.toFixed(2), b.jumps])).toEqual([
      ["7500000.00", true],
      ["25500000.00", true],
      ["31500000.00", false],
      ["46500000.00", false],
      ["61500000.00", false],
      ["76500000.00", true],
    ]);
    expect(found[0]!.exitValue.minus(7500000).abs().lt("1e-12")).toBe(true);
  });
});

describe("the range", () => {
  it("reports only breakpoints strictly inside it (SPEC)", () => {
    // Edge case 2: the preference is paid at $3M and Seed converts at $15M.
    const exit = readCase(readCaseFile("edge-02-non-participating", "inputs.json"));
    const pc = prepare(exit.capTable);
    const at = (lo: number, hi: number) => findBreakpoints(pc, [new D(lo), new D(hi)]).map((b) => b.exitValue.toFixed(2));
    expect(at(0, 20000000)).toEqual(["3000000.00", "15000000.00"]);
    expect(at(3000000, 15000000)).toEqual([]);
    expect(at(3000000, 15000001)).toEqual(["15000000.00"]);
  });
});
