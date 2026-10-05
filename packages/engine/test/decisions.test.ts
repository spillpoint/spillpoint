// M2c: the engine solves who converts and who exercises. At every point
// expected.json reports (each listed exit value and each breakpoint, at its
// exact value), it must find the decisions recorded there, with no second
// answer, and pay every line to the cent, conserving the exit value (E14).
// Checking every combination (E15's fallback) must give the same answers as
// solving from both ends.

import type { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";

import { D, UnsupportedTermError, prepare, readCapTable, solve } from "../src/index.ts";
import { sameAmount } from "../src/decimal.ts";
import { readCase } from "../src/input.ts";
import type { Answer, Decisions } from "../src/index.ts";
import { M2_CASES, capTablesOf, decisionsFrom, expectedPoints, readCaseFile } from "./support/cases.ts";

const CENT = new D("0.01");
const sorted = (ids: ReadonlySet<string>) => [...ids].sort();
const describeDecisions = (d: Decisions) => ({ converted: sorted(d.converted), exercised: sorted(d.exercised) });

function sum(values: Decimal[]): Decimal {
  return values.reduce((total, v) => total.plus(v), new D(0));
}

describe.each(M2_CASES)("%s", (name) => {
  const pc = prepare(readCase(readCaseFile(name, "inputs.json"), capTablesOf(name)).capTable);

  it.each(expectedPoints(name).map((p) => [p.label, p] as const))("solves $%s: the recorded decisions and payouts", (_, point) => {
    const solution = solve(pc, point.exitValue);
    expect(solution.complete).toBe(true);
    expect(solution.answers).toHaveLength(point.equilibria.length);

    solution.answers.forEach((answer: Answer, i) => {
      const recorded = point.equilibria[i]!;
      expect(describeDecisions(answer.decisions)).toEqual(describeDecisions(decisionsFrom(recorded.decisions)));
      answer.payout.lines.forEach((line, j) => {
        const expected = recorded.lines[j]!;
        expect(`${line.holder} × ${line.security}`).toBe(`${expected.holder} × ${expected.security}`);
        expect(line.amount.minus(expected.amount).abs().lte(CENT), `${line.holder} × ${line.security}`).toBe(true);
      });
      expect(sameAmount(sum(answer.payout.lines.map((l) => l.amount)), point.exitValue), "lines add up to the exit value").toBe(true);
      for (const [holder, total] of answer.payout.holderTotals) {
        expect(sameAmount(total, sum(answer.payout.lines.filter((l) => l.holder === holder).map((l) => l.amount)))).toBe(true);
      }
      for (const [security, total] of answer.payout.classTotals) {
        expect(sameAmount(total, sum(answer.payout.lines.filter((l) => l.security === security).map((l) => l.amount)))).toBe(true);
      }
    });

    // Checking every combination gives the same answers as solving from both ends.
    const everything = solve(pc, point.exitValue, { checkEveryCombination: true });
    expect(everything.answers.map((a) => describeDecisions(a.decisions))).toEqual(
      solution.answers.map((a) => describeDecisions(a.decisions)),
    );
  });
});

describe("options follow the price, and a group decides first (E16, E17)", () => {
  // 1M common; Series A 2M at $2 (1x, $4M) senior to Series B 3M at $2 (1x, $6M);
  // A and B must convert together by more than 50%; 500,000 options at $0.50.
  // At $7.2M, holding the options fixed left no stable answer. With E16 and E17 the group compares:
  //   stays:    A $4M, B $3.2M, common $0, so the options aren't exercised.
  //   converts: ($7.2M + $250,000 strike) ÷ 6.5M shares = $1.146154 a share, so they are; B gets $3,438,461.54.
  // B does better converting and holds 60% of the group, so the group converts.
  const table = (groups: unknown[]) =>
    readCapTable({
      holders: ["f", "x", "y", "e"].map((id) => ({ id, name: id })),
      securities: [
        { id: "common", name: "Common Stock", kind: "common" },
        { id: "a", name: "Series A", kind: "preferred", original_issue_price: "2", preference_multiple: "1", participation: "non_participating", cap_multiple: null },
        { id: "b", name: "Series B", kind: "preferred", original_issue_price: "2", preference_multiple: "1", participation: "non_participating", cap_multiple: null },
        { id: "o", name: "Options ($0.50)", kind: "option", strike: "0.5" },
      ],
      seniority: [["a"], ["b"]],
      conversion_groups: groups,
      positions: [
        { holder: "f", security: "common", shares: 1000000 },
        { holder: "x", security: "a", shares: 2000000 },
        { holder: "y", security: "b", shares: 3000000 },
        { holder: "e", security: "o", shares: 500000 },
      ],
      unissued_pool: 0,
    });

  it("settles on the group converting, with the options exercised", () => {
    const [answer, ...others] = solve(prepare(table([["a", "b"]])), new D(7200000)).answers;
    expect(others).toHaveLength(0);
    expect(describeDecisions(answer!.decisions)).toEqual({ converted: ["a", "b"], exercised: ["o"] });
    const price = new D(7450000).div(6500000);
    expect(sameAmount(answer!.payout.bySecurity.get("b")!, price.times(3000000))).toBe(true);
    expect(sameAmount(answer!.payout.bySecurity.get("o")!, price.minus("0.5").times(500000))).toBe(true);
  });

  it("refuses more than one conversion group", () => {
    expect(() => table([["a"], ["b"]])).toThrow(UnsupportedTermError);
    expect(() => table([["a"], ["b"]])).toThrow(/once a case needs it/);
  });
});

describe("caps (E7)", () => {
  const withCap = (cap: string) =>
    readCapTable({
      holders: [{ id: "x", name: "X" }],
      securities: [
        { id: "common", name: "Common Stock", kind: "common" },
        { id: "p", name: "P", kind: "preferred", original_issue_price: "1", preference_multiple: "2", participation: "participating_capped", cap_multiple: cap },
      ],
      seniority: [["p"]],
      positions: [{ holder: "x", security: "p", shares: 1 }],
    });

  it("refuses a cap below the series' preference", () => {
    expect(() => withCap("1.5")).toThrow(/below the preference/);
  });

  it("allows a cap equal to the preference", () => {
    expect(() => withCap("2")).not.toThrow();
  });
});
