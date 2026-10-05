import { D } from "spillpoint";
import { describe, expect, it } from "vitest";

import { STEPS, logScale, positionOf, valueAt } from "../src/scale.ts";

describe("the log-scale slider", () => {
  const scale = logScale([new D(0), new D(300000000)]);

  it("spans from a thousandth of the range's top to the top", () => {
    expect(scale.min.toString()).toBe("300000");
    expect(scale.max.toString()).toBe("300000000");
  });

  it("puts the ends at the ends, and the geometric middle in the middle", () => {
    expect(positionOf(scale, scale.min)).toBe(0);
    expect(positionOf(scale, scale.max)).toBe(STEPS);
    expect(positionOf(scale, new D(0))).toBe(0);
    // √(300K × 300M) ≈ $9.49M, rounded to three significant digits.
    expect(valueAt(scale, STEPS / 2).toString()).toBe("9490000");
  });

  it("round-trips a position through its value", () => {
    for (const p of [1, 137, 400, 750, 999]) expect(Math.abs(positionOf(scale, valueAt(scale, p)) - p)).toBeLessThanOrEqual(1);
  });

  it("gives tidy values: three significant digits", () => {
    for (const p of [123, 456, 789]) expect(valueAt(scale, p).toSignificantDigits(3).eq(valueAt(scale, p))).toBe(true);
  });
});
