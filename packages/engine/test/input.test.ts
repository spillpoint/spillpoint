// Reading exit inputs: every case in M2's scope reads cleanly, every case
// outside it is refused with the term and the milestone that adds it, and
// malformed inputs fail with a clear error.

import { describe, expect, it } from "vitest";

import { InputError, UnsupportedTermError, readCapTable, readExit } from "../src/index.ts";
import { readInputs } from "../src/case.ts";
import type { Milestone, PreferredSeries } from "../src/index.ts";
import { ALL_CASES, EXIT_CASES, capTablesOf, readCaseFile } from "./support/cases.ts";

interface CaseExit {
  exit?: { cap_table?: { holders: unknown[]; positions: unknown[] }; exit_values: string[] };
}

describe("the exit cases the engine runs", () => {
  it("are edge cases 1 through 13g, 23 and Millrace, with 11b: every exit case but those refused until 03e", () => {
    expect(EXIT_CASES).toEqual([
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
      "edge-08-preferred-warrant",
      "edge-09-cumulative-dividends",
      "edge-09b-compounding-dividends",
      "edge-09c-dividends-paid-on-conversion",
      "edge-10-carve-out",
      "edge-10b-carve-out-alongside-preferences",
      "edge-11-earnout",
      "edge-11b-earnout-negative-take",
      "edge-12-unconverted-safe",
      "edge-12b-safe-cap-and-discount",
      "edge-12c-safe-discount-only",
      "edge-12d-safe-alongside-preferred",
      "edge-12e-safe-ranks-with-series-a",
      "edge-12f-two-safes",
      "edge-12g-pre-money-safe-at-a-sale",
      "edge-12h-mfn-safe",
      "edge-13a-note-with-pool",
      "edge-13b-note-without-pool",
      "edge-13c-note-common-only",
      "edge-13d-note-cap-and-discount",
      "edge-13e-note-discount-only",
      "edge-13f-note-alongside-preferred",
      "edge-13g-two-notes",
      "edge-23-dividends-from-a-round",
      "millrace",
    ]);
  });

  it.each(EXIT_CASES)("%s reads cleanly", (name) => {
    const inputs = readCaseFile(name, "inputs.json") as CaseExit;
    const exit = readInputs(inputs);
    expect(exit.exitValues.map((v) => v.toString())).toEqual(inputs.exit?.exit_values);
    if (inputs.exit?.cap_table) {
      expect(exit.capTable.holders).toHaveLength(inputs.exit.cap_table.holders.length);
      expect(exit.capTable.positions).toHaveLength(inputs.exit.cap_table.positions.length);
    }
  });

  it("runs Millrace's exit on the post–Series B cap table it builds from the rounds (C2, M4e)", () => {
    const exit = readInputs(readCaseFile("millrace", "inputs.json"));
    const seriesA = exit.capTable.securities.find((s) => s.id === "series_a") as PreferredSeries;
    // Series A's conversion price fell from $2.075472 to $1.824752 in the down round.
    expect(seriesA.conversionRatio.toFixed(10)).toBe("1.1373992577");
    expect(exit.capTable.seniority).toEqual([["series_b"], ["series_a"], ["seed", "seed_shadow"]]);
    expect(exit.range.map((v) => v.toString())).toEqual(["0", "300000000"]);
  });

  it("reads the same exit on the cap table expected.json records, given it by event (C2)", () => {
    const inputs = readCaseFile("millrace", "inputs.json") as { exit: unknown };
    const recorded = readExit(inputs.exit, capTablesOf("millrace"));
    const built = readInputs(inputs);
    expect(recorded.capTable.positions).toEqual(built.capTable.positions);
    expect(recorded.capTable.unissuedPool).toEqual(built.capTable.unissuedPool);
    // The recorded prices are exact fractions read to 40 digits; the built ones are computed to 40 digits.
    const ratio = (t: typeof built) => (t.capTable.securities.find((s) => s.id === "series_a") as PreferredSeries).conversionRatio;
    expect(ratio(recorded).minus(ratio(built)).abs().lte("1e-30")).toBe(true);
    expect(() => readExit(inputs.exit)).toThrow("exit.cap_table_after_event: this exit runs on the cap table after event series_b; supply it");
  });

  it("refuses an exit after an event the case doesn't have", () => {
    const inputs = readCaseFile("millrace", "inputs.json") as { exit: { cap_table_after_event: string } };
    inputs.exit.cap_table_after_event = "series_c";
    expect(() => readInputs(inputs)).toThrow("exit.cap_table_after_event: no event series_c in inputs.events");
  });

  it("reads an exit after an event that leaves SAFEs outstanding, with the SAFEs on its cap table (C2, C8; M5g)", () => {
    const inputs = readCaseFile("millrace", "inputs.json") as { exit: { cap_table_after_event: string } };
    inputs.exit.cap_table_after_event = "option_pool";
    expect(readInputs(inputs).capTable.unconvertedSafes!.map((f) => f.id)).toEqual(["safe_priya", "safe_marcus"]);
  });

  it("reads both forms of a conversion group (C4, E11)", () => {
    const [b] = readInputs(readCaseFile("edge-06b-forced-class", "inputs.json")).capTable.conversionGroups;
    const [c] = readInputs(readCaseFile("edge-06c-forced-class-at-least", "inputs.json")).capTable.conversionGroups;
    expect([b?.voteThreshold.toString(), b?.voteRule]).toEqual(["0.5", "more_than"]);
    expect([c?.voteThreshold.toString(), c?.voteRule]).toEqual(["0.5", "at_least"]);
  });
});

describe("cases outside the engine's scope are refused, never skipped", () => {
  // Since M5i every exit case runs. The 0.3.0 work's cases come first (03a) and the engine after (03e).
  const refused: [string, string, Milestone][] = [
    ["edge-12i-discount-safe-with-capped-participation", "uncapped_safe_with_capped_participation", "later"],
    ["edge-13h-discount-note-with-capped-participation", "uncapped_note_with_capped_participation", "later"],
    ["edge-24-carve-out-on-the-sale", "carve_out_on_the_exit", "later"],
  ];
  const roundCases = ALL_CASES.filter((n) => /^edge-(1[4-8]|19|2[0-2])/.test(n));

  it("covers every case outside the scope", () => {
    expect(refused.map(([n]) => n).concat(roundCases, EXIT_CASES).sort()).toEqual(ALL_CASES);
  });

  it.each(roundCases)("%s has no exit: buildCapTables builds its cap tables", (name) => {
    expect(() => readInputs(readCaseFile(name, "inputs.json"))).toThrow("inputs: a round case with no exit to run; buildCapTables builds its cap tables");
  });

  // it.each takes no empty table, so the per-case check runs only while some case is refused.
  if (refused.length > 0) {
    it.each(refused)("%s is refused for %s (%s)", (name, term, milestone) => {
      let error: unknown;
      try {
        readInputs(readCaseFile(name, "inputs.json"));
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(UnsupportedTermError);
      expect(error).toMatchObject({ term, milestone });
      expect((error as Error).message).toMatch(milestone === "later" ? /supports this once a case needs it/ : new RegExp(`supports this from ${milestone}`));
    });
  }
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

  it("reads a warrant for common or a preferred series, and refuses one for anything else (C4, E12)", () => {
    const warrant = (underlying: string) =>
      table((t) => (t.securities as unknown[]).push({ id: "w", name: "Warrant", kind: "warrant", strike: "0.5", underlying }));
    expect(readCapTable(warrant("seed")).securities[2]).toMatchObject({ kind: "warrant", underlying: "seed" });
    expect(readCapTable(warrant("common")).securities[2]).toMatchObject({ kind: "warrant", underlying: "common" });
    expect(() => readCapTable(warrant("series_z"))).toThrow("cap_table.securities[2].underlying: series_z is not common or a preferred series");
    const misspelt = table((t) => (t.securities as unknown[]).push({ id: "w", name: "Warrant", kind: "warrant", strike: "0.5", underlying: "common", expiry: "2030" }));
    expect(() => readCapTable(misspelt)).toThrow(/expiry: unknown field/);
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
