// E14: 40-digit decimals, exact inputs, the tie threshold, and cent rounding.

import { describe, expect, it } from "vitest";

import { D, InputError, parseExact, prepare, readCapTable, solve, toCents } from "../src/index.ts";
import { TIE, moreThan, sameAmount } from "../src/decimal.ts";

describe("parseExact (C1)", () => {
  it("reads integers, terminating decimals and fractions", () => {
    expect(parseExact(4500000, "x").toString()).toBe("4500000");
    expect(parseExact("0.25", "x").toString()).toBe("0.25");
    expect(parseExact("552/473", "x").toString()).toBe("1.1670190274841437632135306553911205074");
  });

  it("divides a fraction out to 40 significant digits", () => {
    const third = parseExact("1/3", "x");
    expect(third.toString()).toBe("0." + "3".repeat(40));
    // Multiplying back loses less than a trillionth of a dollar, so it is a tie with 1 (E14).
    expect(sameAmount(third.times(3), new D(1))).toBe(true);
  });

  it("refuses floats, booleans and anything that isn't an exact number", () => {
    expect(() => parseExact(1.5, "shares")).toThrow(InputError);
    expect(() => parseExact(true, "shares")).toThrow(/exact number as a string/);
    expect(() => parseExact("1e6", "x")).toThrow(/not an exact number/);
    expect(() => parseExact("3/0", "x")).toThrow(/divides by zero/);
  });

  it("needs no path: one number on its own, and an error naming it as value", () => {
    expect(parseExact("1.5").toString()).toBe("1.5");
    expect(() => parseExact("1.5.0")).toThrow('value: "1.5.0" is not an exact number (an integer, a decimal, or "a/b")');
  });
});

describe("ties (E14)", () => {
  it("counts amounts closer than $0.000000000001 as equal", () => {
    const a = new D("1000000");
    expect(sameAmount(a, a.plus("1e-13"))).toBe(true);
    expect(moreThan(a.plus("1e-13"), a)).toBe(false);
    expect(moreThan(a.plus(TIE), a)).toBe(true);
    expect(sameAmount(a, a.plus(TIE))).toBe(false);
  });
});

describe("toCents (E10)", () => {
  it("rounds half-up to the cent, on the exact decimal", () => {
    expect(toCents(new D("2.675"))).toBe("2.68");
    expect(toCents(new D("0.005"))).toBe("0.01");
    expect(toCents(new D("0.0049999"))).toBe("0.00");
    expect(toCents(parseExact("552/473", "x").times(1000000))).toBe("1167019.03");
  });

  // 10d: 40-digit arithmetic can leave an amount that's exactly a half cent a hair under it, which half-up straight to
  // the cent showed a cent low on 0.7.0. Two holders of common, A and B, each paid exit value × shares ÷ total.
  const twoHolders = (a: number, b: number) =>
    readCapTable({
      holders: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
      securities: [{ id: "common", name: "Common Stock", kind: "common" }],
      seniority: [],
      positions: [{ holder: "a", security: "common", shares: a }, { holder: "b", security: "common", shares: b }],
      unissued_pool: "0",
    });
  it.each([
    ["203850394.65", 45, 117, "56625109.625", "56625109.63"],
    ["534108039.85", 459, 3, "530639805.825", "530639805.83"],
    ["21408024.33", 33, 129, "4360893.845", "4360893.85"],
    ["21408024.33", 45, 117, "5946673.425", "5946673.43"],
  ])("rounds an exact half cent up, though 40 digits leave it a hair under: $%s, A %i and B %i", (x, a, b, exact, cents) => {
    const paid = solve(prepare(twoHolders(a, b)), new D(x)).answers[0]!.payout.holderTotals.get("a")!;
    // The exact amount is a half cent; the engine's is a hair under it, as on 0.7.0.
    expect(new D(x).times(a).div(a + b).toString()).toBe(exact);
    expect(paid.lt(exact) && new D(exact).minus(paid).lt("1e-30")).toBe(true);
    expect(paid.toDecimalPlaces(2, D.ROUND_HALF_UP).toFixed(2), "half-up straight to the cent: a cent low").not.toBe(cents);
    expect(toCents(paid)).toBe(cents);
  });

  it("rounds to 20 places first: within 10^-20 under a half cent is the half cent, and further under isn't", () => {
    expect(toCents(new D("56625109.62499999999999999999999999999998"))).toBe("56625109.63");
    expect(toCents(new D("-56625109.62499999999999999999999999999998"))).toBe("-56625109.63");
    expect(toCents(new D("0.005").minus("1e-21"))).toBe("0.01");
    expect(toCents(new D("0.005").minus("1e-19"))).toBe("0.00");
    expect(toCents(new D("2.674999"))).toBe("2.67");
  });
});
