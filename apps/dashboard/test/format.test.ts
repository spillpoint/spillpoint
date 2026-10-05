import { D } from "spillpoint";
import { describe, expect, it } from "vitest";

import { dollars, parseDollars, percent, shortDollars } from "../src/format.ts";

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
