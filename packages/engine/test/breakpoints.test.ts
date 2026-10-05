// M2d: the breakpoint finder. For cases 1–7 and Millrace it must find every
// breakpoint expected.json lists, each within $0.01 of its exact value, with
// the same reason codes, the same subjects (which series, tier or option
// class), and the same jump flags (E13). The wording of the reasons is the
// engine's own.

import { describe, expect, it } from "vitest";

import { D, findBreakpoints, prepare, readCapTable } from "../src/index.ts";
import { readCase } from "../src/input.ts";
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

describe("reason wording for founders (M2d review)", () => {
  const reasonsFor = (name: string) => {
    const exit = readCase(readCaseFile(name, "inputs.json"), capTablesOf(name));
    return findBreakpoints(prepare(exit.capTable), exit.range);
  };

  it.each(M2_CASES)("%s: no assumption codes or jargon in the text", (name) => {
    for (const b of reasonsFor(name)) {
      for (const r of b.reasons) {
        expect(r.text).not.toMatch(/\b[CERX]\d{1,2}\b/);
        expect(r.text).not.toMatch(/original issue price|sharing what's left/);
      }
    }
  });

  it("6b: the vote in two sentences, then what each class gains or loses", () => {
    const jump = reasonsFor("edge-06b-forced-class")[1]!;
    expect(jump.reasons.map((r) => r.text)).toEqual([
      "Seed-1 Preferred and Seed-2 Preferred convert together if holders of more than half their shares vote for it. " +
        "Above $30,000,000 Investor X and Investor Y both do better converting, so the vote passes.",
      "Payouts jump here instead of bending: Common Stock drops from $26,000,000 to $24,000,000 and " +
        "Seed-1 Preferred rises from $1,000,000 to $3,000,000. At exactly $30,000,000 the outcome from below " +
        "still holds; the new one applies just above it.",
    ]);
  });

  it("options lead with the event", () => {
    expect(reasonsFor("millrace")[3]!.reasons[0]!.text).toBe(
      "Options at a $0.05 strike (490,000) come into the money here. Above this, exercising pays, and the strike money joins the proceeds.",
    );
  });

  it("names the one class that takes the residual", () => {
    expect(reasonsFor("edge-02-non-participating")[0]!.reasons[0]!.text).toBe(
      "Seed Preferred's preference is paid in full here: $3,000,000. Above this exit value, the next dollar goes to Common Stock.",
    );
  });

  it("names who shares the residual", () => {
    expect(reasonsFor("millrace")[2]!.reasons[0]!.text).toMatch(
      /the next dollar is shared as common by Common Stock, Series A Preferred and Series B Preferred\.$/,
    );
  });
});

describe("two changes closer than $0.0001 (E18)", () => {
  it("are one breakpoint that keeps both reasons", () => {
    // 1M common; 1M options at $1.00 and 1,000 at $1.000000000025. The first class comes
    // into the money at $1,000,000; with it exercised, a share is worth (E + $1M) ÷ 2M,
    // which reaches the second strike at $1,000,000.00005. The finder reads each stretch
    // $0.0001 above its start, so both changes land in one breakpoint, with both reasons.
    const pc = prepare(
      readCapTable({
        holders: ["f", "a", "b"].map((id) => ({ id, name: id })),
        securities: [
          { id: "common", name: "Common Stock", kind: "common" },
          { id: "oa", name: "Options A", kind: "option", strike: "1" },
          { id: "ob", name: "Options B", kind: "option", strike: "1.000000000025" },
        ],
        seniority: [],
        positions: [
          { holder: "f", security: "common", shares: 1000000 },
          { holder: "a", security: "oa", shares: 1000000 },
          { holder: "b", security: "ob", shares: 1000 },
        ],
        unissued_pool: 0,
      }),
    );
    const found = findBreakpoints(pc, [new D(0), new D(3000000)]);
    expect(found).toHaveLength(1);
    expect(found[0]!.exitValue.toFixed(2)).toBe("1000000.00");
    expect(found[0]!.reasons.map((r) => `${r.code}: ${r.subject.join("+")}`).sort()).toEqual([
      "option_in_the_money: oa",
      "option_in_the_money: ob",
    ]);
  });
});
