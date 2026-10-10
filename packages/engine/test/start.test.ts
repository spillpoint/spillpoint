// A starting cap table (R31, C17; 0.5.0, 05b2): a company's first event can be the cap table it stands at, and later
// events build on it as on the table after any other event. The split test checks that promise on every locked round
// case, with no new expected values: the table after each event, given as a starting table, must rebuild the rest.

import { describe, expect, it } from "vitest";

import { InputError, UnsupportedTermError, buildCapTables, findBreakpoints, prepare, readCapTable, readInputs } from "../src/index.ts";
import type { CapTableAfterEvent, PreferredSeries } from "../src/index.ts";
import { ALL_CASES, FROM_A_STARTING_TABLE, OCF_CASES, OCX_CASES, readCaseFile } from "./support/cases.ts";
import { capTableJson } from "./support/write.ts";

type Json = Record<string, unknown>;
interface Inputs {
  holders: Json[];
  events: Json[];
  exit?: Json;
}

/** The round cases that start from founding: each one's events build every table. */
const FROM_FOUNDING = ALL_CASES.filter(
  (name) => !OCF_CASES.includes(name) && !OCX_CASES.includes(name) && !FROM_A_STARTING_TABLE.includes(name) && (readCaseFile(name, "inputs.json") as Partial<Inputs>).events,
);
const inputsOf = (name: string) => readCaseFile(name, "inputs.json") as Inputs;

/** What the table after event k holds that a series' "issued before" test (R25) reads: its series, SAFEs and notes. */
function rankedIds(t: CapTableAfterEvent): string[] {
  const ct = t.capTable;
  return [
    ...ct.securities.filter((s) => s.kind === "preferred").map((s) => s.id),
    ...(ct.unconvertedSafes ?? []).map((f) => f.id),
    ...(ct.unconvertedNotes ?? []).map((n) => n.id),
  ];
}

/**
 * The order they were issued in, earliest first, as a starting table gives it: by the event that first issued each.
 * Within one event, series come before SAFEs and notes, so a SAFE issued alongside a series doesn't count as before it.
 */
function issueOrder(built: CapTableAfterEvent[], k: number): string[] {
  const firstSeen = (id: string) => built.findIndex((t) => rankedIds(t).includes(id));
  return rankedIds(built[k]!)
    .map((id, position) => ({ id, position, at: firstSeen(id) }))
    .sort((a, b) => a.at - b.at || a.position - b.position)
    .map((x) => x.id);
}

function startFrom(t: CapTableAfterEvent, order: string[] | null): Json {
  return { id: "start", ...(t.date != null ? { date: t.date } : {}), type: "start", cap_table: capTableJson(t.capTable), ...(order ? { issue_order: order } : {}) };
}

/** A built table as plain data: every number as the engine holds it, written in full. */
const plain = (t: CapTableAfterEvent) => JSON.parse(JSON.stringify({ ...t, capTable: capTableJson(t.capTable) })) as Json;

/** The tables after event k rebuilt from the table after it, and whether each later one came out the same. */
function split(name: string, k: number, withOrder: boolean): { rebuilt: CapTableAfterEvent[]; built: CapTableAfterEvent[] } {
  const inputs = inputsOf(name);
  const built = buildCapTables({ holders: inputs.holders, events: inputs.events });
  const start = startFrom(built[k]!, withOrder ? issueOrder(built, k) : null);
  return { rebuilt: buildCapTables({ holders: inputs.holders, events: [start, ...inputs.events.slice(k + 1)] }), built };
}

describe("the split test: every round case, started again from the table after each of its events", () => {
  const splits = FROM_FOUNDING.flatMap((name) => inputsOf(name).events.slice(0, -1).map((ev, k) => [name, String(ev.id), k] as const));

  it("covers every round case built from founding, at every event but the last", () => {
    expect(FROM_FOUNDING).toHaveLength(39);
    expect(splits.length).toBe(148);
  });

  it.each(splits)("%s, from the table after %s, rebuilds every later table and round exactly", (name, _, k) => {
    const { rebuilt, built } = split(name, k, true);
    expect(plain(rebuilt[0]!).capTable).toEqual(plain(built[k]!).capTable);
    expect(rebuilt).toHaveLength(built.length - k);
    for (let j = k + 1; j < built.length; j++) expect(plain(rebuilt[j - k]!), built[j]!.event).toEqual(plain(built[j]!));
  });

  it("without the order, only 16j from the table after its Seed comes out different", () => {
    const differ = splits.filter(([name, , k]) => {
      const { rebuilt, built } = split(name, k, false);
      return built.slice(k + 1).some((t, j) => JSON.stringify(plain(rebuilt[j + 1]!)) !== JSON.stringify(plain(t)));
    });
    expect(differ.map(([name, after]) => [name, after])).toEqual([["edge-16j-note-and-safe-from-before-the-seed", "seed"]]);
  });
});

describe("the issue order (R25, R31)", () => {
  it("with none given, a starting table's SAFEs and notes count as issued after its series", () => {
    // 16j's note and SAFE were issued before its Seed, so in the down Series A they count in the Seed's A, not against
    // it. Started from the table after the Seed with no order, they count against it, and the Seed's price moves.
    const name = "edge-16j-note-and-safe-from-before-the-seed";
    const seedPrice = (t: CapTableAfterEvent) => (t.capTable.securities.find((s) => s.id === "seed") as PreferredSeries).conversionPrice;
    const withOrder = split(name, 3, true);
    const without = split(name, 3, false);
    expect(issueOrder(withOrder.built, 3)).toEqual(["note_n", "safe_s", "seed"]);
    expect(seedPrice(withOrder.rebuilt[1]!).eq(seedPrice(withOrder.built[4]!))).toBe(true);
    expect(seedPrice(without.rebuilt[1]!).eq(seedPrice(without.built[4]!))).toBe(false);
  });

  it("must list each series, SAFE and note in the starting table once", () => {
    const inputs = inputsOf("edge-16j-note-and-safe-from-before-the-seed");
    const built = buildCapTables(inputs);
    const at = (order: string[]) => () => buildCapTables({ holders: inputs.holders, events: [startFrom(built[3]!, order)] });
    expect(at(["note_n", "safe_s", "seed"])).not.toThrow();
    for (const order of [["note_n", "seed"], ["note_n", "safe_s", "seed", "seed"], ["note_n", "safe_s", "seed", "common"], ["note_n", "safe_s", "series_z"]]) {
      expect(at(order), order.join(",")).toThrow(/issue_order: must list each preferred series, SAFE and note in the starting table once: note_n, safe_s, seed/);
    }
  });
});

/** Case 27's starting table, its note without its cap: beside SAFEs, a setup a sale refuses (X18). */
function withUncappedNote(capTable: Json): Json {
  const notes = capTable.unconverted_notes as Json[];
  return { ...capTable, unconverted_notes: notes.map((n) => ({ ...n, valuation_cap: null })) };
}

describe("a starting table", () => {
  const inputs = inputsOf("edge-27-safes-and-note-convert-on-an-imported-table");
  const start = inputs.events[0] as Json & { cap_table: Json };
  const company = (events: Json[], holders = inputs.holders) => () => buildCapTables({ holders, events });

  it("may hold SAFEs and notes a sale refuses, since a later round converts them", () => {
    // A note with no cap beside SAFEs (X18): a sale refuses it, a starting table doesn't.
    const uncapped = withUncappedNote(start.cap_table);
    expect(() => readCapTable(uncapped)).toThrow(UnsupportedTermError);
    expect(company([{ ...start, cap_table: uncapped }])).not.toThrow();
    const [t] = buildCapTables({ holders: inputs.holders, events: [start] });
    expect(t!.unconvertedSafes.map((f) => f.id)).toEqual(["safe-x1", "safe-s3"]);
    expect(t!.unconvertedNotes.map((n) => n.id)).toEqual(["note-n1"]);
    expect(t!.details).toEqual({ kind: "start" });
  });

  it("may not carry a carve-out: that's a term of the sale (C6)", () => {
    const carveOut = { timing: "before_preferences", tiers: [{ from: "0", to: null, percent: "5" }], allocation: [{ holder: "sh-founder-a", percent: "100" }] };
    expect(company([{ ...start, cap_table: { ...start.cap_table, carve_out: carveOut } }])).toThrow(
      "inputs.events[0].cap_table.carve_out: a starting cap table may not carry a carve-out: that's a term of the sale, given on the exit (C6)",
    );
  });

  it("must be the first event", () => {
    const founding = { id: "founding", type: "issue", security: { id: "cls-common", name: "Common Stock", kind: "common" }, issues: [{ holder: "sh-founder-a", shares: 1 }] };
    expect(company([founding, start])).toThrow("inputs.events[1].type: a starting cap table must be the first event");
  });

  it("names only holders the company lists, by the same names", () => {
    expect(company([start], inputs.holders.filter((h) => h.id !== "sh-lender-l"))).toThrow("sh-lender-l isn't listed in the company's holders");
    const renamed = inputs.holders.map((h) => (h.id === "sh-lender-l" ? { ...h, name: "Lender M" } : h));
    expect(company([start], renamed)).toThrow("sh-lender-l is Lender M in the company's holders");
  });

  it("keeps its conversion group through the events after it", () => {
    const table = (readCaseFile("edge-06b-forced-class", "inputs.json") as { exit: { cap_table: Json } }).exit.cap_table;
    const holders = table.holders as Json[];
    const issue = { id: "more", type: "issue", security: { id: "common", name: "Common Stock", kind: "common" }, issues: [{ holder: "founder_a", shares: 1000 }] };
    const built = buildCapTables({ holders, events: [{ id: "start", type: "start", cap_table: table }, issue] });
    expect(built[1]!.capTable.conversionGroups.map((g) => g.series)).toEqual([["seed_1", "seed_2"]]);
  });

  it("refuses an unknown field, as every event does", () => {
    expect(company([{ ...start, as_of: "2025-06-30" }])).toThrow(InputError);
  });
});

it("case 27's RSUs, with no strike, come in where common starts to be paid, in your 05b1 wording", () => {
  const exit = readInputs(readCaseFile("edge-27-safes-and-note-convert-on-an-imported-table", "inputs.json"));
  const at = findBreakpoints(prepare(exit.capTable, exit.exitDate), exit.range).find((b) => b.reasons.some((r) => r.subject.includes("rsus")))!;
  expect(at.exitValue.toFixed(2)).toBe("15692504.14");
  expect(at.reasons.find((r) => r.code === "option_in_the_money")!.text).toBe(
    "Common starts to be paid here, so the 30,000 options with no strike, such as RSUs, start paying: above this exit value each gets what a common share does.",
  );
});

describe("a sale on a table built from rounds is held to the limits a sale puts on SAFEs and notes (X12–X15, X18)", () => {
  const refusal = (name: string, after: string, exitDate: string, change: (inputs: Inputs) => Inputs = (i) => i) => {
    const inputs = change(inputsOf(name));
    try {
      readInputs({ ...inputs, exit: { cap_table_after_event: after, range: ["0", "100000000"], exit_values: [], exit_date: exitDate } });
      return null;
    } catch (e) {
      if (!(e instanceof UnsupportedTermError)) throw e;
      return [e.term, e.path];
    }
  };

  it("as a table given in full is: 16j's pre-money SAFE, still outstanding beside its Seed", () => {
    expect(refusal("edge-16j-note-and-safe-from-before-the-seed", "seed", "2023-01-01")).toEqual([
      "pre_money_safe_with_preferred", "exit.cap_table_after_event.unconverted_safes",
    ]);
  });

  it("and on a starting table: 27's SAFEs beside its note with no cap, sold before its Series B converts them", () => {
    const uncapped = (inputs: Inputs): Inputs => {
      const [first, ...rest] = inputs.events as [Json & { cap_table: Json }, ...Json[]];
      return { ...inputs, events: [{ ...first, cap_table: withUncappedNote(first.cap_table) }, ...rest] };
    };
    expect(refusal("edge-27-safes-and-note-convert-on-an-imported-table", "start", "2025-06-30", uncapped)).toEqual([
      "note_with_safe_or_carve_out", "exit.cap_table_after_event.unconverted_notes",
    ]);
  });

  it("but not 27's SAFEs beside its note as they are, a note with a cap beside post-money SAFEs (X18; 05c2)", () => {
    expect(refusal("edge-27-safes-and-note-convert-on-an-imported-table", "start", "2025-06-30")).toBeNull();
  });
});
