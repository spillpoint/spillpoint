// More than one stable answer (05c5; Jordan, after #73): where the series, warrants and notes have more than one
// stable answer, and they pay holders differently, the engine stops with a plain message naming them, and never reports
// just one. Two of 05c4's random tables, where two non-participating series at the same price sit beside post-money
// SAFEs: each one's conversion joins the SAFEs' count, so the SAFEs convert and dilute it, and the other keeps its
// preference.

import { describe, expect, it } from "vitest";

import { D, NoAnswerError, findBreakpoints, prepare, readExit, solve } from "../src/index.ts";
import { RANDOM_1_121, RANDOM_1_149, RANDOM_1_185 } from "./support/two-answers.ts";

type Json = Record<string, unknown>;

const prepared = (table: Json) => {
  const exit = readExit(table);
  return { exit, pc: prepare(exit.capTable, exit.exitDate) };
};
const stop = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(NoAnswerError);
    return (e as Error).message;
  }
  throw new Error("expected the engine to stop");
};
const message = (at: string, names: string) =>
  `At ${at}: ${names} are at the same price, so with the SAFEs outstanding either could convert here, and the documents ` +
  "don't say which. spillpoint doesn't pick one. Adding a round that converts the SAFEs avoids this.";

describe("two series at the same price beside SAFEs (random-1-149)", () => {
  it("stops at $11,047,000, where 0.5.0's search from both ends agreed on one answer", () => {
    const { pc } = prepared(RANDOM_1_149);
    expect(stop(() => solve(pc, new D(11047000)))).toBe(message("$11,047,000", "Series 0 Preferred and Series 1 Preferred"));
  });

  it("stops the breakpoint search where the second answer first appears", () => {
    const { exit, pc } = prepared(RANDOM_1_149);
    expect(stop(() => findBreakpoints(pc, exit.range))).toBe(message("$10,896,153.85", "Series 0 Preferred and Series 1 Preferred"));
  });

  it("says each could be the one that converts where the prices differ a little, at $1.00 and $1.01", () => {
    const table = structuredClone(RANDOM_1_149) as { cap_table: { securities: Json[] } };
    const seriesB = table.cap_table.securities.find((s) => s.id === "series_1")!;
    Object.assign(seriesB, { original_issue_price: "1.01", conversion_price: "1.01" });
    const { exit, pc } = prepared(table);
    expect(stop(() => findBreakpoints(pc, exit.range))).toBe(
      "At $10,994,615.38: Series 0 Preferred and Series 1 Preferred could each be the one that converts here, with the SAFEs outstanding, " +
        "and the documents don't say which. spillpoint doesn't pick one. Adding a round that converts the SAFEs avoids this.",
    );
  });
});

describe("a second answer between the readings the search takes (random-1-185)", () => {
  // From about $10.10M to $10.14M only: the search's own readings, for its breakpoints, fall either side. It follows
  // which sets of choices are stable between them, so it reads the second answer anyway.
  it("stops the breakpoint search there", () => {
    const { exit, pc } = prepared(RANDOM_1_185);
    expect(stop(() => findBreakpoints(pc, exit.range))).toBe(message("$10,102,051.28", "Series 0 Preferred and Series 1 Preferred"));
  });

  it("stops at an exit value inside it", () => {
    const { pc } = prepared(RANDOM_1_185);
    expect(stop(() => solve(pc, new D(10125000)))).toBe(message("$10,125,000", "Series 0 Preferred and Series 1 Preferred"));
  });
});

describe("a second answer that begins inside a stretch the search checks (random-1-121)", () => {
  // The search checks each stretch at its middle, here $12,083,333.33, inside the second answer. It follows which sets
  // of choices are stable first, so it says where the second answer begins, as the reference does (05c6).
  it("stops the breakpoint search where the second answer begins", () => {
    const { exit, pc } = prepared(RANDOM_1_121);
    expect(stop(() => findBreakpoints(pc, exit.range))).toBe(message("$12,055,555.56", "Series 0 Preferred and Series 1 Preferred"));
  });

  it("has one answer a cent below", () => {
    const { pc } = prepared(RANDOM_1_121);
    expect(solve(pc, new D("12055555.55")).answers).toHaveLength(1);
    expect(stop(() => solve(pc, new D("12055555.57")))).toBe(message("$12,055,555.57", "Series 0 Preferred and Series 1 Preferred"));
  });
});
