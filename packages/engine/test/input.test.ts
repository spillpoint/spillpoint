// Reading exit inputs: every case in M2's scope reads cleanly, every case
// outside it is refused with the term and the milestone that adds it, and
// malformed inputs fail with a clear error.

import { describe, expect, it } from "vitest";

import { InputError, UnsupportedTermError, readCapTable } from "../src/index.ts";
import { readCase } from "../src/input.ts";
import type { Milestone, PreferredSeries } from "../src/index.ts";
import { ALL_CASES, M2_CASES, capTablesOf, readCaseFile } from "./support/cases.ts";

interface CaseExit {
  exit?: { cap_table?: { holders: unknown[]; positions: unknown[] }; exit_values: string[] };
}

describe("cases in M2's scope", () => {
  it("are edge cases 1 through 7 and Millrace", () => {
    expect(M2_CASES).toEqual([
      "edge-01-common-only",
      "edge-02-non-participating",
      "edge-03-participating",
      "edge-04-participating-capped",
      "edge-05a-stacked",
      "edge-05b-pari-passu",
      "edge-06a-per-series",
      "edge-06b-forced-class",
      "edge-06c-forced-class-at-least",
      "edge-06d-voter-indifferent-over-a-range",
      "edge-07-option-strikes",
      "millrace",
    ]);
  });

  it.each(M2_CASES)("%s reads cleanly", (name) => {
    const inputs = readCaseFile(name, "inputs.json") as CaseExit;
    const exit = readCase(inputs, capTablesOf(name));
    expect(exit.exitValues.map((v) => v.toString())).toEqual(inputs.exit?.exit_values);
    if (inputs.exit?.cap_table) {
      expect(exit.capTable.holders).toHaveLength(inputs.exit.cap_table.holders.length);
      expect(exit.capTable.positions).toHaveLength(inputs.exit.cap_table.positions.length);
    }
  });

  it("reads Millrace's exit from the post–Series B cap table (C2)", () => {
    const exit = readCase(readCaseFile("millrace", "inputs.json"), capTablesOf("millrace"));
    const seriesA = exit.capTable.securities.find((s) => s.id === "series_a") as PreferredSeries;
    // Series A's conversion price fell from $2.075472 to $1.824752 in the down round.
    expect(seriesA.conversionRatio.toFixed(10)).toBe("1.1373992577");
    expect(exit.capTable.seniority).toEqual([["series_b"], ["series_a"], ["seed", "seed_shadow"]]);
    expect(exit.range.map((v) => v.toString())).toEqual(["0", "300000000"]);
  });

  it("reads both forms of a conversion group (C4, E11)", () => {
    const [b] = readCase(readCaseFile("edge-06b-forced-class", "inputs.json")).capTable.conversionGroups;
    const [c] = readCase(readCaseFile("edge-06c-forced-class-at-least", "inputs.json")).capTable.conversionGroups;
    expect([b?.voteThreshold.toString(), b?.voteRule]).toEqual(["0.5", "more_than"]);
    expect([c?.voteThreshold.toString(), c?.voteRule]).toEqual(["0.5", "at_least"]);
  });
});

describe("cases outside M2's scope are refused, never skipped", () => {
  const refused: [string, string, Milestone][] = [
    ["edge-08-preferred-warrant", "warrant", "M5"],
    ["edge-09-cumulative-dividends", "cumulative_dividend", "M5"],
    ["edge-10-carve-out", "carve_out", "M5"],
    ["edge-11-earnout", "payment_schedules", "M5"],
    ["edge-12-unconverted-safe", "unconverted_safe", "M5"],
    ["edge-13a-note-with-pool", "unconverted_note", "M5"],
    ["edge-13b-note-without-pool", "unconverted_note", "M5"],
    ["edge-13c-note-common-only", "unconverted_note", "M5"],
    ...ALL_CASES.filter((n) => /^edge-(1[4-8]|19|2[01])/.test(n)).map((n): [string, string, Milestone] => [n, "rounds", "M4"]),
  ];

  it("covers every case outside the scope", () => {
    expect(refused.map(([n]) => n).concat(M2_CASES).sort()).toEqual(ALL_CASES);
  });

  it.each(refused)("%s is refused for %s (%s)", (name, term, milestone) => {
    let error: unknown;
    try {
      readCase(readCaseFile(name, "inputs.json"), capTablesOf(name));
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(UnsupportedTermError);
    expect(error).toMatchObject({ term, milestone });
    expect((error as Error).message).toMatch(new RegExp(`supports this from ${milestone}`));
  });
});

describe("malformed inputs fail with a clear error", () => {
  function table(change: (t: Record<string, unknown>) => void) {
    const t: Record<string, unknown> = {
      holders: [
        { id: "a", name: "A" },
        { id: "x", name: "X" },
      ],
      securities: [
        { id: "common", name: "Common Stock", kind: "common" },
        {
          id: "seed",
          name: "Seed Preferred",
          kind: "preferred",
          original_issue_price: "1.5",
          preference_multiple: "1",
          participation: "non_participating",
          cap_multiple: null,
        },
      ],
      seniority: [["seed"]],
      positions: [
        { holder: "a", security: "common", shares: 8000000 },
        { holder: "x", security: "seed", shares: 2000000 },
      ],
      unissued_pool: 0,
    };
    change(t);
    return t;
  }
  const seed = (t: Record<string, unknown>) => (t.securities as Record<string, unknown>[])[1]!;

  it("accepts the unchanged table", () => {
    expect(readCapTable(table(() => {})).positions).toHaveLength(2);
  });

  it.each([
    ["an unknown field", (t: Record<string, unknown>) => (t.preferences = []), /cap_table\.preferences: unknown field/],
    ["a misspelt series field", (t: Record<string, unknown>) => (seed(t).participaton = "x"), /seed.*participaton|participaton: unknown field/],
    ["a series missing from the seniority tiers", (t: Record<string, unknown>) => (t.seniority = []), /seed must appear in exactly one tier/],
    ["a cap without capped participation", (t: Record<string, unknown>) => (seed(t).cap_multiple = "3"), /cap multiple goes with participating_capped/],
    ["fractional shares", (t: Record<string, unknown>) => ((t.positions as Record<string, unknown>[])[0]!.shares = "10.5"), /whole/],
    ["a float share count", (t: Record<string, unknown>) => ((t.positions as Record<string, unknown>[])[0]!.shares = 10.5), /not a whole number/],
    ["an unknown holder", (t: Record<string, unknown>) => ((t.positions as Record<string, unknown>[])[0]!.holder = "z"), /unknown holder z/],
    ["a stated ratio that disagrees with its prices", (t: Record<string, unknown>) => (seed(t).conversion_ratio = "1.1"), /doesn't equal original issue price ÷ conversion price/],
    ["a group member that can't convert", (t: Record<string, unknown>) => {
      seed(t).participation = "participating";
      t.conversion_groups = [["seed"]];
    }, /uncapped participating preferred never converts/],
  ])("rejects %s", (_, change, message) => {
    expect(() => readCapTable(table(change))).toThrow(InputError);
    expect(() => readCapTable(table(change))).toThrow(message);
  });
});
