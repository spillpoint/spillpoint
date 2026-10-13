// Numbers (F17) and showing them to the cent (FC8, FA14).

import { describe, expect, it } from "vitest";

import { D, toCents } from "../src/index.ts";

describe("toCents", () => {
  it("rounds half away from zero", () => {
    expect(toCents(new D("1.005"))).toBe("1.01");
    expect(toCents(new D("1.0049"))).toBe("1.00");
    expect(toCents(new D("-1.005"))).toBe("-1.01");
  });

  it("rounds an exact half cent up although 40 digits land a hair below it (FA14)", () => {
    // A random fund's carry, exactly 699,291.385, as the engine works it out at 40 digits.
    expect(toCents(new D("699291.3849999999999999999999999999999999"))).toBe("699291.39");
    // A value that really is below the half cent still rounds down.
    expect(toCents(new D("699291.38499999999"))).toBe("699291.38");
  });

  it("divides at 40 significant digits (F17)", () => {
    expect(new D(2).div(3).toString()).toBe(`0.${"6".repeat(39)}7`);
  });
});
