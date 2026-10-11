// Files the page saved before 0.7.0 (07d2). 0.7.0 names the series a round's SAFEs convert into `<series>_safes`,
// where it was `<series>_shadow` (07b), and an older file names it wherever a round refers to it, so saved files move
// to version 7, renaming it as they open. The two fixtures were saved by the page at v0.6.0 (fixtures/README.md):
// the Millrace example as it opens, and a company built on the page, its Series A converting two SAFEs at two prices
// and a Series B after it. results-0.6.0.json is what 0.6.0's engine paid on each, as the page opened it.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { D, findBreakpoints, prepare, readExit, solve } from "spillpoint";
import { describe, expect, it } from "vitest";

import { VERSION, fileText, readFile } from "../src/file.ts";
import { exitOf } from "./payouts.ts";

const fixture = (name: string) => readFileSync(resolve(import.meta.dirname, "fixtures", name), "utf8");
interface Recorded {
  breakpoints: { exitValue: string; jumps: boolean; reasons: { code: string; subject: string[] }[] }[];
  payouts: Record<string, { holders: Record<string, string>; classes: Record<string, string> }>;
}
const recorded = JSON.parse(fixture("results-0.6.0.json")) as Record<string, Recorded>;
/** 0.6.0's id for a series from SAFEs, as 0.7.0 names it. */
const renamed = (id: string) => id.replace(/_shadow(_\d+)?$/, "_safes$1");
const totals = (m: Map<string, D>) => Object.fromEntries([...m].map(([k, v]) => [k, v.toString()]));

/** A file as the page opens it and saves it back. */
function savedBack(text: string): string {
  const opened = readFile(text);
  if (!opened.ok) throw new Error(opened.message);
  return fileText(opened.name, opened.draft, opened.view ?? undefined, opened.rounds, opened.origin);
}

it("saves files as version 7", () => {
  expect(VERSION).toBe(7);
});

describe.each(["millrace-saved-0.6.0.json", "company-saved-0.6.0.json"])("%s, saved by the page at v0.6.0", (name) => {
  const text = fixture(name);
  const want = recorded[name]!;

  it("names a series from SAFEs as 0.6.0 did", () => {
    expect(text).toMatch(/_shadow/);
    expect(JSON.parse(text).version).toBe(6);
  });

  it("opens, and gives every breakpoint and payout 0.6.0 gave, to all 40 digits", () => {
    const exit = readExit(exitOf(text));
    const pc = prepare(exit.capTable, exit.exitDate);
    const found = findBreakpoints(pc, exit.range).map((b) => ({ exitValue: b.exitValue.toString(), jumps: b.jumps, reasons: b.reasons.map((r) => ({ code: r.code, subject: r.subject })) }));
    expect(found).toEqual(want.breakpoints.map((b) => ({ ...b, reasons: b.reasons.map((r) => ({ ...r, subject: r.subject.map(renamed) })) })));
    for (const [x, p] of Object.entries(want.payouts)) {
      const { payout } = solve(pc, new D(x)).answers[0]!;
      expect(totals(payout.holderTotals), `${x}: holders`).toEqual(p.holders);
      expect(totals(payout.classTotals), `${x}: classes`).toEqual(Object.fromEntries(Object.entries(p.classes).map(([k, v]) => [renamed(k), v])));
    }
  });

  it("saves back as version 7, with no _shadow left, and opens again to the same", () => {
    const saved = savedBack(text);
    expect(JSON.parse(saved).version).toBe(7);
    expect(saved).not.toMatch(/_shadow/);
    expect(saved).toMatch(/_safes/);
    expect(exitOf(saved)).toEqual(exitOf(text));
    expect(savedBack(saved)).toBe(saved);
  });
});

describe("what the migration leaves alone", () => {
  it("opens a version 6 file saved since 0.7.0's names, already with _safes, unchanged", () => {
    const current = { ...JSON.parse(savedBack(fixture("company-saved-0.6.0.json"))), version: 6 };
    const opened = readFile(JSON.stringify(current));
    if (!opened.ok) throw new Error(opened.message);
    expect(opened.rounds!.events).toEqual(current.events);
  });

  it("leaves a series the file declares itself, though its id ends in _shadow: a holder's Seed Shadow", () => {
    const file = {
      format: "spillpoint", version: 6, name: "Declared",
      holders: [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "c", name: "C" }],
      events: [
        { id: "founding", date: null, type: "issue", security: { id: "common", name: "Common Stock", kind: "common" }, issues: [{ holder: "a", shares: "1000000" }] },
        {
          id: "earlier", date: null, type: "issue",
          security: { id: "seed_shadow", name: "Seed Shadow", kind: "preferred", original_issue_price: "1", preference_multiple: "1", participation: "non_participating" },
          issues: [{ holder: "b", shares: "100000" }],
        },
        {
          id: "seed", date: null, type: "priced_round",
          series: { id: "seed", name: "Seed Preferred", kind: "preferred", preference_multiple: "1", participation: "non_participating", cap_multiple: null, anti_dilution: "none" },
          pre_money: "5000000", investments: [{ holder: "c", amount: "1000000" }], pool_target_unissued_percent_post: null,
          seniority: [["seed", "seed_shadow"]],
        },
      ],
      cap_table_after_event: "seed", range: ["0", "20000000"],
    };
    const opened = readFile(JSON.stringify(file));
    if (!opened.ok) throw new Error(opened.message);
    expect(opened.rounds!.events.at(-1)!.seniority).toEqual([["seed", "seed_shadow"]]);
    expect(savedBack(JSON.stringify(file))).toContain('"seed_shadow"');
  });

  it("opens a version 6 file with no rounds as before", () => {
    const file = {
      format: "spillpoint", version: 6, name: "Entered",
      cap_table: {
        holders: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
        securities: [
          { id: "common", name: "Common Stock", kind: "common" },
          { id: "seed", name: "Seed Preferred", kind: "preferred", original_issue_price: "1.5", preference_multiple: "1", participation: "non_participating" },
        ],
        seniority: [["seed"]],
        positions: [{ holder: "a", security: "common", shares: 8000000 }, { holder: "b", security: "seed", shares: 2000000 }],
      },
      range: ["0", "60000000"],
    };
    const asSix = readFile(JSON.stringify(file));
    const asSeven = readFile(JSON.stringify({ ...file, version: 7 }));
    if (!asSix.ok || !asSeven.ok) throw new Error("both should open");
    expect(asSix.draft).toEqual(asSeven.draft);
    expect(JSON.parse(savedBack(JSON.stringify(file))).cap_table).toEqual(JSON.parse(savedBack(JSON.stringify({ ...file, version: 7 }))).cap_table);
  });
});
