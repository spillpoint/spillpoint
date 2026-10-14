import { D, buildCapTables, prepare, readCapTable, solve } from "spillpoint";
import { describe, expect, it } from "vitest";

import { dollars, dollarsAndCents, exitValueText, halfUp, halfUpSignificant, parseDollars, percent, priceText, shortDollars, strikeText, withoutCodes } from "../src/format.ts";

describe("half-up for reading, 20 places first (ASSUMPTIONS E10, P2; 10d)", () => {
  // Two holders of common, A and B, each paid exit value × shares ÷ total. Each of A's amounts is exactly a half cent,
  // and 40-digit arithmetic leaves it a hair under: on 0.7.0 the page showed each a cent low.
  const twoHolders = (a: number, b: number) =>
    readCapTable({
      holders: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
      securities: [{ id: "common", name: "Common Stock", kind: "common" }],
      seniority: [],
      positions: [{ holder: "a", security: "common", shares: a }, { holder: "b", security: "common", shares: b }],
      unissued_pool: "0",
    });
  it.each([
    ["203850394.65", 45, 117, "$56,625,109.63"],
    ["534108039.85", 459, 3, "$530,639,805.83"],
    ["21408024.33", 33, 129, "$4,360,893.85"],
    ["21408024.33", 45, 117, "$5,946,673.43"],
  ])("shows an exact half cent rounded up: $%s, A %i and B %i", (x, a, b, shown) => {
    const amount = solve(prepare(twoHolders(a, b)), new D(x)).answers[0]!.payout.holderTotals.get("a")!;
    expect(dollarsAndCents(amount)).toBe(shown);
    expect(exitValueText(amount)).toBe(shown);
    const cents = new D(shown.replace(/[$,]/g, ""));
    expect(amount.toDecimalPlaces(2, D.ROUND_HALF_UP).eq(cents.minus("0.01")), "a hair under: half-up straight to the cent is a cent low").toBe(true);
  });

  it("rounds to 20 places, then as shown, whatever it shows", () => {
    const hair = new D("1e-30");
    expect(halfUp(new D("0.005").minus(hair), 2).toFixed(2)).toBe("0.01");
    expect(halfUp(new D("0.005").minus("1e-19"), 2).toFixed(2)).toBe("0.00");
    expect(halfUp(new D("-0.005").plus(hair), 2).toFixed(2)).toBe("-0.01");
    expect(dollars(new D("1234.5").minus(hair))).toBe("$1,235");
    expect(shortDollars(new D("9745000").minus(hair))).toBe("$9.75M");
    expect(halfUpSignificant(new D("9.745").minus(hair), 3).toString()).toBe("9.75");
    expect(percent(new D("0.1235").minus(hair))).toBe("12.4%");
  });
});

describe("money for founders", () => {
  it("writes a strike as the engine's class names do: to the cent at least, every further place kept, never rounded", () => {
    expect(strikeText("0.1")).toBe("$0.10");
    expect(strikeText("1")).toBe("$1.00");
    expect(strikeText(5)).toBe("$5.00");
    expect(strikeText("0.0125")).toBe("$0.0125");
    expect(strikeText("0.123456789")).toBe("$0.123456789");
    expect(strikeText(new D("0.25"))).toBe("$0.25");
    // Each as the engine names the class a grant at it makes, a strike typed as a fraction included.
    for (const strike of ["0.1", "5", "0.0125", "1/3"]) {
      const built = buildCapTables({
        holders: [{ id: "a", name: "A" }],
        events: [
          { id: "founding", date: null, type: "issue", security: { id: "common", name: "Common Stock", kind: "common" }, issues: [{ holder: "a", shares: 1000 }] },
          { id: "pool", date: null, type: "create_pool", percent: "10" },
          { id: "grant", date: null, type: "grant_options", grants: [{ holder: "a", shares: 10, strike }] },
        ],
      });
      expect(built.at(-1)!.capTable.securities.find((s) => s.kind === "option")!.name).toBe(`Options (${strikeText(strike)} strike)`);
    }
  });

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
    expect(withoutCodes("Notes with a post-money cap (R23). The engine doesn't model this, so it refuses the input rather than ignoring the term.")).toBe(
      "Notes with a post-money cap. The engine doesn't model this, so it refuses the input rather than ignoring the term.",
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
