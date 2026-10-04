// E14: 40-digit decimals, exact inputs, the tie threshold, and cent rounding.

import { describe, expect, it } from "vitest";

import { D, InputError, TIE, moreThan, parseExact, sameAmount, toCents } from "../src/index.js";

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
});
