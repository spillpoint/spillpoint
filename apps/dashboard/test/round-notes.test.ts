// What a round says about the cap table a company starts from (R31; 0.5.0, 05b3b): a starting series with no
// anti-dilution in a down round, a conversion group its new series aren't in, and how the order its SAFEs and notes
// were issued in was read. Each is checked on the engine's own build, as the Rounds tab shows it.

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { buildCapTables, readOcf } from "spillpoint";
import type { OcfFile } from "spillpoint";
import { describe, expect, it } from "vitest";

import { draftFromExit } from "../src/draft.ts";
import { capTableJson, eventViews, fromRounds } from "../src/rounds.ts";
import type { Line, Rounds } from "../src/rounds.ts";
import { buildRounds, startingRounds } from "../src/roundsDraft.ts";

type Json = Record<string, unknown>;
const cases = resolve(import.meta.dirname, "../../../cases");
const caseJson = (path: string) => JSON.parse(readFileSync(resolve(cases, path), "utf8"));
const text = (line: Line) => (typeof line === "string" ? line : line.text);

/** The Rounds tab's lines for the last event of a company. */
function lastLines(rounds: Rounds): Line[] {
  const built = fromRounds(rounds, ["0", "100000000"]);
  if (!built.ok) throw built.error;
  return eventViews(rounds, built.tables).at(-1)!.lines;
}

/** A company that starts from this table, as "Add a round" starts it, then the events given. */
function startingFrom(table: Json, origin: { date: string; issueOrder: string[] | null } | null, events: Json[], holders: Json[] = []): Rounds {
  const start = buildRounds(startingRounds(draftFromExit({ cap_table: table, range: ["0", "1"] }), origin));
  return { holders: [...start.holders, ...holders], events: [...start.events, ...events], after: String(events.at(-1)!.id) };
}

const quillfern = () => {
  const files: OcfFile[] = readdirSync(resolve(cases, "ocf-12-ledger/package")).map((name) => ({ name, content: caseJson(`ocf-12-ledger/package/${name}`) }));
  return readOcf(files);
};
const fundW = { id: "fund_w", name: "Fund W" };
const round = (preMoney: string, more: Json = {}): Json => ({
  id: "series_b",
  date: "2026-03-31",
  type: "priced_round",
  series: { id: "series_b", name: "Series B Preferred", kind: "preferred", preference_multiple: "1", participation: "non_participating", cap_multiple: null, anti_dilution: "broad_based" },
  pre_money: preMoney,
  investments: [{ holder: "fund_w", amount: "1000000" }],
  seniority: [["series_b"], ["series_a"], ["seed"]],
  ...more,
});

describe("a starting series with no anti-dilution, in a down round (O11)", () => {
  it("says nothing adjusts it, and where to give it some: Quillfern's Seed and Series A, imported with none", () => {
    const imported = quillfern();
    // $5M pre-money on Quillfern's 20.4M fully diluted shares: about $0.25 a share, below both series' $1.00.
    const lines = lastLines(startingFrom(imported.cap_table, { date: imported.as_of, issueOrder: imported.issue_order }, [round("5000000")], [fundW])).map(text);
    expect(lines).toContain(
      "Seed Preferred has no anti-dilution, so this down round doesn't adjust it. If its charter gives it some, add it in the starting cap table.",
    );
    expect(lines).toContain(
      "Series A Preferred has no anti-dilution, so this down round doesn't adjust it. If its charter gives it some, add it in the starting cap table.",
    );
  });

  it("says nothing in an up round, nor of a series that has anti-dilution and is adjusted", () => {
    const imported = quillfern();
    const up = lastLines(startingFrom(imported.cap_table, null, [round("40000000")], [fundW])).map(text);
    expect(up.some((l) => /has no anti-dilution/.test(l))).toBe(false);
    // Given broad-based protection in the starting table, the Seed is adjusted instead, and only Series A is noted.
    const table = structuredClone(imported.cap_table) as { securities: Json[] };
    table.securities.find((s) => s.id === "seed")!.anti_dilution = "broad_based";
    const down = lastLines(startingFrom(table, null, [round("5000000")], [fundW])).map(text);
    expect(down.filter((l) => /has no anti-dilution/.test(l))).toEqual([
      "Series A Preferred has no anti-dilution, so this down round doesn't adjust it. If its charter gives it some, add it in the starting cap table.",
    ]);
    expect(down.some((l) => /^Seed Preferred's anti-dilution \(broad-based weighted average\) lowers its conversion price/.test(l))).toBe(true);
  });
});

describe("a starting series with no anti-dilution, and SAFEs or notes converting below it (Jordan, 05b3b answers)", () => {
  // Case 27: an up round at $2.70, but its note and SAFEs convert at $0.61 and $0.68, below the Seed's $0.80. Issued
  // after the Seed, they'd count against it under R25 if it had broad-based anti-dilution; issued before Series A, they
  // wouldn't count against it.
  const inputs = caseJson("edge-27-safes-and-note-convert-on-an-imported-table/inputs.json") as { holders: Json[]; events: (Json & { issue_order?: string[] })[] };
  const case27 = (change: (events: (Json & { issue_order?: string[] })[]) => void = () => {}) => {
    const events = structuredClone(inputs.events);
    change(events);
    return lastLines({ holders: inputs.holders, events, after: "series_b" }).map(text).filter((l) => /has no anti-dilution/.test(l));
  };
  const seed = "Seed Preferred has no anti-dilution, so the SAFEs and the note converting below its $0.80 conversion price don't adjust it. If its charter gives it some, add it in the starting cap table.";

  it("says so for the Seed, and not for Series A, in the order the starting table gives", () => {
    expect(case27()).toEqual([seed]);
  });

  it("with no order given, says so for Series A too: its SAFEs and notes count as issued after both", () => {
    expect(case27((events) => delete events[0]!.issue_order)).toEqual([
      seed,
      "Series A Preferred has no anti-dilution, so the SAFEs and the note converting below its $2.00 conversion price don't adjust it. If its charter gives it some, add it in the starting cap table.",
    ]);
  });

  it("names what converts: only the note, when the SAFEs don't convert", () => {
    const noSafes = (events: Json[]) => {
      events[1]!.convert_safes = false;
      events[1]!.seniority = [["series_b", "series_b_notes"], ["cls-series-a"], ["cls-seed"]];
    };
    expect(case27(noSafes)).toEqual([
      "Seed Preferred has no anti-dilution, so the note converting below its $0.80 conversion price doesn't adjust it. If its charter gives it some, add it in the starting cap table.",
    ]);
  });

  it("says nothing when the round exempts its conversions", () => {
    expect(case27((events) => (events[1]!.anti_dilution_exempts_conversions = true))).toEqual([]);
  });
});

describe("a conversion group in the starting table (Jordan's wording, 05b3)", () => {
  const sixB = () => structuredClone(caseJson("edge-06b-forced-class/inputs.json").exit.cap_table) as Json & { holders: Json[] };
  const seriesA = (more: Json = {}): Json => ({
    id: "series_a",
    date: "2024-01-01",
    type: "priced_round",
    series: { id: "series_a", name: "Series A Preferred", kind: "preferred", preference_multiple: "1", participation: "non_participating", cap_multiple: null, anti_dilution: "none" },
    pre_money: "40000000",
    investments: [{ holder: "investor_x", amount: "5000000" }],
    seniority: [["series_a", "seed_1", "seed_2"]],
    ...more,
  });

  it("says the round's new series isn't in it, and decides on its own at a sale", () => {
    expect(lastLines(startingFrom(sixB(), null, [seriesA()])).map(text)).toContain(
      "Series A Preferred isn't in the group of series that must convert together (Seed-1 Preferred and Seed-2 Preferred), so at a sale it decides on its own " +
        "whether to convert. If its charter puts it in that group, spillpoint can't model that yet.",
    );
  });

  it("names the series its SAFEs convert into too, when the round creates them", () => {
    const table = sixB();
    table.unconverted_safes = [{ id: "safe_1", holder: "investor_y", purchase_amount: "500000", post_money_cap: "10000000", discount: "0" }];
    expect(lastLines(startingFrom(table, null, [seriesA()])).map(text)).toContain(
      "Series A Preferred and Series A Preferred (from SAFEs) aren't in the group of series that must convert together (Seed-1 Preferred and Seed-2 Preferred), " +
        "so at a sale each decides on its own whether to convert. If the charter puts them in that group, spillpoint can't model that yet.",
    );
  });

  it("says nothing without a group", () => {
    const table = sixB();
    delete table.conversion_groups;
    expect(lastLines(startingFrom(table, null, [seriesA()])).map(text).some((l) => /group of series/.test(l))).toBe(false);
  });
});

describe("how the issue order was read, when a down round adjusts a starting series and its SAFE and note convert (R31)", () => {
  // Case 16j from the table after its Seed: the note and the SAFE are still outstanding, and its Series A is a down
  // round that adjusts the Seed's conversion price as they convert.
  const inputs = caseJson("edge-16j-note-and-safe-from-before-the-seed/inputs.json") as { holders: Json[]; events: Json[] };
  const afterSeed = buildCapTables({ holders: inputs.holders, events: inputs.events.slice(0, 4) })[3]!.capTable;
  const company = (issueOrder: string[] | null) => {
    const start = startingFrom(capTableJson(afterSeed), { date: "2022-06-30", issueOrder }, [inputs.events[4]!]);
    return { ...start, holders: inputs.holders };
  };
  const seedDetails = (rounds: Rounds) => {
    const line = lastLines(rounds).find((l) => typeof l !== "string" && /^Seed Preferred's anti-dilution/.test(l.text));
    return typeof line === "string" || !line ? [] : line.details;
  };

  it("as the starting table gives it: the note and the SAFE came before the Seed, so they count in its starting share count", () => {
    const details = seedDetails(company(["note_n", "safe_s", "seed"]));
    expect(details.at(-1)).toBe("Whether each SAFE and note was issued before or after Seed Preferred comes from the starting cap table.");
    expect(details.filter((d) => /was issued before Seed Preferred, so it counts in the starting share count instead/.test(d))).toHaveLength(2);
  });

  it("with no order given: they count as issued after the Seed, and against it", () => {
    const details = seedDetails(company(null));
    expect(details.at(-1)).toBe(
      "The starting cap table doesn't give the order things were issued in, so its SAFEs and notes count as issued after Seed Preferred: they usually bridge to the next round.",
    );
    expect(details.filter((d) => /so it counts against Seed Preferred/.test(d)).length).toBeGreaterThan(0);
  });
});
