// M2b: the waterfall for given decisions. At every point expected.json
// reports (each listed exit value and each breakpoint, at its exact value),
// the engine runs the waterfall with the decisions recorded there and must
// match every payout line to the cent (SPEC, Rounding). Every point is also
// checked for conservation (E14): the lines, net of strike, add up to the
// exit value, and holder and class totals equal the sums of their lines.

import type { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";

import { D, InputError, payout, prepare } from "../src/index.ts";
import { sameAmount } from "../src/decimal.ts";
import { readInputs } from "../src/case.ts";
import { EXIT_CASES, decisionsFrom, expectedPoints, readCaseFile } from "./support/cases.ts";

const CENT = new D("0.01");

function withinCent(actual: Decimal, expected: string): boolean {
  return actual.minus(expected).abs().lte(CENT);
}

function sum(values: Iterable<Decimal>): Decimal {
  let total = new D(0);
  for (const v of values) total = total.plus(v);
  return total;
}

describe.each(EXIT_CASES)("%s", (name) => {
  const pc = prepare(readInputs(readCaseFile(name, "inputs.json")).capTable);
  const points = expectedPoints(name);

  it.each(points.map((p) => [p.label, p] as const))("pays out $%s to the cent, with the recorded decisions", (_, point) => {
    for (const outcome of point.equilibria) {
      const result = payout(pc, point.exitValue, decisionsFrom(outcome.decisions));

      // Same holder × security lines, each within a cent.
      expect(result.lines.map((l) => `${l.holder} × ${l.security}`)).toEqual(
        outcome.lines.map((l) => `${l.holder} × ${l.security}`),
      );
      result.lines.forEach((line, i) => {
        const expected = outcome.lines[i]!.amount;
        expect(withinCent(line.amount, expected), `${line.holder} × ${line.security}: ${line.amount.toFixed(4)} vs ${expected}`).toBe(true);
      });

      // Conservation: the lines add up to the exit value; totals are the sums of their lines.
      expect(sameAmount(sum(result.lines.map((l) => l.amount)), point.exitValue), "lines add up to the exit value").toBe(true);
      for (const [holder, total] of result.holderTotals) {
        expect(sameAmount(total, sum(result.lines.filter((l) => l.holder === holder).map((l) => l.amount)))).toBe(true);
        expect(withinCent(total, outcome.holder_totals[holder]!), `holder ${holder}`).toBe(true);
      }
      for (const [security, total] of result.classTotals) {
        expect(sameAmount(total, sum(result.lines.filter((l) => l.security === security).map((l) => l.amount)))).toBe(true);
        expect(withinCent(total, outcome.class_totals[security]!), `class ${security}`).toBe(true);
      }
      expect([...result.holderTotals.keys()].sort()).toEqual(Object.keys(outcome.holder_totals).sort());
      expect([...result.classTotals.keys()].sort()).toEqual(Object.keys(outcome.class_totals).sort());

      // The common price per share, as recorded to six places.
      expect(result.commonPrice.toDecimalPlaces(6, D.ROUND_HALF_UP).toFixed(6)).toBe(outcome.common_price_per_share);
    }
  });
});

describe("decisions the waterfall refuses", () => {
  const pc = (name: string) => prepare(readInputs(readCaseFile(name, "inputs.json")).capTable);
  const none = new Set<string>();

  it("a series that doesn't exist", () => {
    expect(() => payout(pc("edge-02-non-participating"), new D(1), { converted: new Set(["series_z"]), exercised: none })).toThrow(
      /series_z is not a preferred series/,
    );
  });

  it("converting uncapped participating preferred, which never converts", () => {
    expect(() => payout(pc("edge-03-participating"), new D(1), { converted: new Set(["seed"]), exercised: none })).toThrow(
      /never converts/,
    );
  });

  it("splitting a conversion group (E11)", () => {
    expect(() => payout(pc("edge-06b-forced-class"), new D(1), { converted: new Set(["seed_1"]), exercised: none })).toThrow(
      InputError,
    );
  });
});
