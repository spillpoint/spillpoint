// How the fund page writes and reads amounts, dates, rates and multiples: exact, no floats, to the cent as the cases
// are (FC8, FA14).

import { D } from "spillpoint-fund";
import { describe, expect, it } from "vitest";

import { cents, dateText, lpMultipleText, parseDollars, percentText, short, stepMultiple, xText } from "../src/format.ts";

describe("format", () => {
  it("writes amounts to the cent, half away from zero, an exact half cent as exact math has it", () => {
    expect(cents(new D("32793750"))).toBe("$32,793,750.00");
    expect(cents(new D("1.005"))).toBe("$1.01");
    expect(cents(new D("699291.3849999999999999999999999999999999"))).toBe("$699,291.39");
    expect(cents(new D("0"))).toBe("$0.00");
  });

  it("writes X in whole dollars unless it has cents", () => {
    expect(xText(new D("40000000"))).toBe("$40,000,000");
    expect(xText(new D(191500000).div(3))).toBe("$63,833,333.33");
  });

  it("writes headline amounts to three significant digits", () => {
    expect([short(new D("6806250")), short(new D("32793750")), short(new D("400000")), short(new D("812")), short(new D("0"))]).toEqual(["$6.81M", "$32.8M", "$400K", "$812", "$0"]);
  });

  it("reads typed amounts exactly, and nothing that isn't one", () => {
    expect(parseDollars("40000000")!.toString()).toBe("40000000");
    expect(parseDollars("$40M")!.toString()).toBe("40000000");
    expect(parseDollars("34.5m")!.toString()).toBe("34500000");
    expect(parseDollars(" 40,000,000 ")!.toString()).toBe("40000000");
    expect(parseDollars("250k")!.toString()).toBe("250000");
    expect(parseDollars("0.1")!.toString()).toBe("0.1");
    for (const bad of ["", "forty", "-5", "1e6", "$", "4 0"]) expect(parseDollars(bad), bad).toBeNull();
  });

  it("writes dates, rates and multiples as the page shows them", () => {
    expect(dateText("2026-09-30")).toBe("30 Sep 2026");
    expect(dateText("2025-01-01")).toBe("1 Jan 2025");
    expect([percentText(new D("0.2")), percentText(new D("0.075"))]).toEqual(["20%", "7.5%"]);
    expect([stepMultiple(new D("3")), stepMultiple(new D("2.25"))]).toEqual(["3.0x", "2.25x"]);
    expect([lpMultipleText(new D("3.375")), lpMultipleText(new D("1.9625")), lpMultipleText(new D("3"))]).toEqual(["3.38x", "1.96x", "3.00x"]);
  });
});
