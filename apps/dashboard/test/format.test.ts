import { D } from "spillpoint";
import { describe, expect, it } from "vitest";

import { dollars, parseDollars, percent, priceText, shortDollars, withoutCodes } from "../src/format.ts";

describe("money for founders", () => {
  it("writes whole dollars for tables", () => {
    expect(dollars(new D("9750989.67"))).toBe("$9,750,990");
    expect(dollars(new D("0"))).toBe("$0");
  });

  it("writes three significant digits for headlines", () => {
    expect(shortDollars(new D("9750989.67"))).toBe("$9.75M");
    expect(shortDollars(new D("39424995.32"))).toBe("$39.4M");
    expect(shortDollars(new D("100000000"))).toBe("$100M");
    expect(shortDollars(new D("19999999.79"))).toBe("$20M");
    expect(shortDollars(new D("450000"))).toBe("$450K");
    expect(shortDollars(new D("1500000000"))).toBe("$1.5B");
    expect(shortDollars(new D("812.4"))).toBe("$812");
  });

  it("writes a share to one decimal place", () => {
    expect(percent(new D("0.0975099"))).toBe("9.8%");
    expect(percent(new D("1"))).toBe("100.0%");
  });

  it("reads typed amounts in the forms people type", () => {
    for (const [typed, value] of [
      ["100000000", "100000000"],
      ["$100M", "100000000"],
      ["100m", "100000000"],
      ["1.5B", "1500000000"],
      ["250,000", "250000"],
      ["250k", "250000"],
      ["$39.4M", "39400000"],
      [" $9,750,990 ", "9750990"],
    ] as const) {
      expect(parseDollars(typed)?.toString(), typed).toBe(new D(value).toString());
    }
    for (const bad of ["", "abc", "-5", "$", "1.2.3", "5 million"]) expect(parseDollars(bad), bad).toBeNull();
  });
});

describe("prices in the editor", () => {
  it("shows a price too long to read to six decimal places", () => {
    // Millrace's Series A, as its rounds produced them.
    expect(priceText("3900000/1879091")).toBe("2.075472");
    expect(priceText("348161279317506201440070405000/190799228993502586113800004553")).toBe("1.824752");
    expect(priceText("0.38493003162")).toBe("0.384930");
  });

  it("leaves a price of six places or fewer as written", () => {
    expect(priceText("1.5")).toBe("1.5");
    expect(priceText("0.05")).toBe("0.05");
    expect(priceText("3")).toBe("3");
    expect(priceText("3/2")).toBe("1.5");
    expect(priceText("about a dollar")).toBe("about a dollar");
  });
});

describe("engine messages on the page", () => {
  it("drop assumption codes, which are for developers", () => {
    expect(withoutCodes("the cap (1x) is below the preference (1.25x); a cap counts the preference, so it can't be lower (E7)")).toBe(
      "the cap (1x) is below the preference (1.25x); a cap counts the preference, so it can't be lower",
    );
    expect(withoutCodes("1.5 is not a whole number; write exact non-integers as strings (C1)")).toBe("1.5 is not a whole number; write exact non-integers as strings");
    expect(withoutCodes("Convertible notes still outstanding at exit (X3, X10–X12). The engine supports this from M5")).toBe(
      "Convertible notes still outstanding at exit. The engine supports this from M5",
    );
    expect(withoutCodes("More than one conversion group (E17: the order in which groups decide isn't settled)")).toBe(
      "More than one conversion group (the order in which groups decide isn't settled)",
    );
    expect(withoutCodes("Warrants (w1; E12)")).toBe("Warrants (w1)");
    expect(withoutCodes('solving from "everyone converts" went round in a circle (E15).')).toBe('solving from "everyone converts" went round in a circle.');
  });

  it("keep everything else in brackets", () => {
    expect(withoutCodes("the cap (1x) is below the preference (1.25x)")).toBe("the cap (1x) is below the preference (1.25x)");
    expect(withoutCodes("Options ($0.05 strike)")).toBe("Options ($0.05 strike)");
  });
});
