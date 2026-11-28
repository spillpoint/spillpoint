// What a priced round's summary on the Rounds tab says of each SAFE and note it converts (11c, 11c2; R32, R33),
// checked against the locked cases, through the Rounds tab's own path: the rounds as the editor holds them, built.
// - Every conversion in every locked round: the price the page says applies is the engine's conversion price, the
//   lower of the two it gives, and on the side of the price where its cap takes over, where it gives one.
// - edge-15's Series A given by its price per share, as the round's form writes it: its locked table. Its SAFE's cap
//   takes over at the price worked from the case's own numbers, and the round's summary says so.
// - Larkspur's import with case 27's Series B added as a round, by its price per share: case 27's locked table.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { D, buildCapTables, parseExact, readOcf } from "spillpoint";
import type { CapTable, CapTableAfterEvent, PreferredSeries } from "spillpoint";
import { describe, expect, it } from "vitest";

import { conversionRows, outstandingWords } from "../src/conversions.ts";
import { draftFromExit } from "../src/draft.ts";
import { eventViews, fromRounds } from "../src/rounds.ts";
import type { Line, Rounds } from "../src/rounds.ts";
import { addEvent, buildRounds, draftFromRounds, setEvent, startingRounds } from "../src/roundsDraft.ts";
import type { RoundsDraft } from "../src/roundsDraft.ts";
import { seniorityFor } from "../src/RoundsEditor.tsx";
import { threeCapsTable } from "../../../packages/engine/test/support/many-safes.ts";

type Json = Record<string, unknown>;
const cases = resolve(import.meta.dirname, "../../../cases");
const caseJson = (name: string, file: string) => JSON.parse(readFileSync(resolve(cases, name, file), "utf8"));
const close = (a: D, b: D) => a.minus(b).abs().lte(new D("1e-30").times(D.max(1, b.abs())));
const exact = (v: unknown) => parseExact(v, "value");
const built = (rounds: Rounds) => {
  const r = fromRounds(rounds, ["0", "200000000"]);
  if (!r.ok) throw r.error;
  return r.tables;
};

/**
 * A table the page built against a locked one: every holder's every position, the pool, the seniority, each class and
 * its terms, and what the round worked out. The page names a holder added on the Rounds tab itself, so `holders` maps
 * the page's ids to the case's.
 */
function expectCaseTable(table: CapTableAfterEvent, expected: Json, holders: Map<string, string> = new Map()) {
  const mapped = (id: string) => holders.get(id) ?? id;
  const ct = table.capTable;
  const want = expected.cap_table as Json & { positions: Json[]; securities: Json[]; seniority: string[][]; unissued_pool: number };
  expect(ct.positions.map((p) => [mapped(p.holder), p.security, p.shares.toNumber()])).toEqual(want.positions.map((p) => [p.holder, p.security, p.shares]));
  expect(ct.unissuedPool.toNumber()).toBe(want.unissued_pool);
  expect(ct.seniority).toEqual(want.seniority);
  expect(ct.securities.map((s) => [s.id, s.name, s.kind])).toEqual(want.securities.map((s) => [s.id, s.name, s.kind]));
  ct.securities.forEach((s, i) => {
    const e = want.securities[i]!;
    if (s.kind !== "preferred") return;
    expect(close(s.originalIssuePrice, exact(e.original_issue_price)), `${s.id} issue price`).toBe(true);
    expect(close(s.conversionPrice, exact(e.conversion_price)), `${s.id} conversion price`).toBe(true);
    expect([s.participation, s.preferenceMultiple.toString(), s.antiDilution]).toEqual([e.participation, String(e.preference_multiple), e.anti_dilution]);
  });
  const d = table.details;
  const ed = expected.details as Json;
  if (d.kind !== "priced_round") throw new Error("a priced round");
  expect(close(d.price, exact(ed.price_per_share))).toBe(true);
  expect(close(d.postMoneyValuation, exact(ed.post_money_valuation))).toBe(true);
  expect(d.newShares.map((n) => [mapped(n.holder), n.shares.toNumber()])).toEqual((ed.new_shares as Json[]).map((n) => [n.holder, n.shares]));
  expect(d.poolTopUp.toNumber()).toBe(ed.pool_top_up);
  expect(d.safeConversions.map((c) => [c.safe, c.method, c.shares.toNumber(), c.series])).toEqual(((ed.safe_conversions ?? []) as Json[]).map((c) => [c.safe, c.method, c.shares, c.series]));
  expect(d.noteConversions.map((c) => [c.note, c.method, c.shares.toNumber(), c.series])).toEqual(((ed.note_conversions ?? []) as Json[]).map((c) => [c.note, c.method, c.shares, c.series]));
}

/** A round given by its price per share, as the round's form switches it: its pre-money gone, its price in its place (R32). */
function byPrice(d: RoundsDraft, key: string, price: string): RoundsDraft {
  const { pre_money: _pre, ...rest } = d.events.find((e) => e.key === key)!.json;
  return setEvent(d, key, { ...rest, price_per_share: price });
}

describe("each SAFE's and note's two prices, against every locked round (R4, R23, R24)", () => {
  const roundCases = readdirSync(cases).filter((n) => existsSync(resolve(cases, n, "inputs.json")) && (caseJson(n, "inputs.json").events ?? []).some((e: Json) => e.type === "priced_round"));
  const rounds = roundCases.flatMap((name) => {
    const inputs = caseJson(name, "inputs.json");
    return (inputs.events as Json[]).flatMap((e, i) => (e.type === "priced_round" ? [[name, String(e.id), i] as const] : []));
  });

  it("covers the 67 priced rounds in the locked cases", () => {
    expect(rounds).toHaveLength(67);
  });

  it.each(rounds)("%s, %s: the price that applies is the engine's, the lower of the two", (name, _round, i) => {
    const inputs = caseJson(name, "inputs.json");
    const tables = buildCapTables(inputs);
    const event = inputs.events[i] as Json;
    const before: CapTable = tables[i - 1]!.capTable;
    const d = tables[i]!.details;
    if (d.kind !== "priced_round") throw new Error("a priced round");
    const target = event.pool_target_unissued_percent_post == null ? new D(0) : new D(String(event.pool_target_unissued_percent_post)).div(100);
    for (const r of conversionRows(before, target, d, tables[i]!.capTable)) {
      const applies = r.method === "cap" ? r.capPrice! : r.discountPrice;
      expect(close(applies, r.conversionPrice), `${r.id}: ${applies.toString()} against the engine's ${r.conversionPrice.toString()}`).toBe(true);
      // The lower of the two, the cap on a tie.
      if (r.capPrice && r.method === "cap") expect(r.capPrice.lte(r.discountPrice) || close(r.capPrice, r.discountPrice), r.id).toBe(true);
      if (r.capPrice && r.method === "discount") expect(r.discountPrice.lt(r.capPrice), r.id).toBe(true);
      // R33: where the price at which the cap takes over is given, the round is on the side of it the method says.
      if (r.capTakesOver) expect(d.price.gte(r.capTakesOver) || close(d.price, r.capTakesOver), r.id).toBe(r.method === "cap");
      // What it converts into, and the preference that series carries on it: the shares at its own price, × its multiple.
      const series = tables[i]!.capTable.securities.find((s) => s.id === r.series) as PreferredSeries;
      expect(close(r.preference, r.shares.times(r.conversionPrice).times(series.preferenceMultiple))).toBe(true);
    }
  });

  it.each(roundCases)("%s: every round's summary explains every SAFE and note it converts", (name) => {
    const inputs = caseJson(name, "inputs.json");
    const rounds = { holders: inputs.holders, events: inputs.events, after: String(inputs.events.at(-1).id) };
    const tables = buildCapTables(inputs);
    eventViews(rounds, tables).forEach((view, i) => {
      const d = tables[i]!.details;
      if (d.kind !== "priced_round") return;
      const explained = view.lines.filter((l): l is Exclude<Line, string> => typeof l !== "string" && /^.+'s (SAFE|note) converts /.test(l.text));
      expect(explained).toHaveLength(d.safeConversions.length + d.noteConversions.length);
      // Nothing about whether the round is a good one.
      for (const l of explained) expect(l.details.join(" ")).not.toMatch(/\b(good|bad|better|worse|should|recommend|deal|fair|favou?rable|advice)\b/i);
    });
  });
});

describe("edge-15's Series A, given by its price per share", () => {
  const inputs = caseJson("edge-15-safe-discount-beats-cap", "inputs.json");
  const expected = caseJson("edge-15-safe-discount-beats-cap", "expected.json").cap_tables.at(-1);
  const seriesA = inputs.events.at(-1) as Json;
  const rounds = { holders: inputs.holders, events: inputs.events, after: String(seriesA.id) };

  it("builds its locked table from its own pre-money, and from the price it solves to, as the round's form writes it", () => {
    const d = draftFromRounds(rounds);
    const priced = buildRounds(byPrice(d, d.events.at(-1)!.key, String(expected.details.price_per_share)));
    expect(priced.events.at(-1)).toMatchObject({ price_per_share: expected.details.price_per_share });
    expect(priced.events.at(-1)).not.toHaveProperty("pre_money");
    for (const r of [buildRounds(d), priced]) expectCaseTable(built(r).at(-1)!, expected);
  });

  it("says its SAFE's cap takes over at its cap ÷ its Company Capitalization ÷ (1 − its discount), from the case's own numbers", () => {
    // From the case's files, not the engine: Investor S's $18,000,000 post-money cap and 20% discount (inputs.json), and
    // the round's Company Capitalization, 225,000,000/29 shares (expected.json). $2.90.
    const safe = (inputs.events.find((e: Json) => e.id === "safe").safes as Json[])[0]!;
    const fromCase = exact(safe.post_money_cap).div(exact(expected.details.company_capitalization)).div(new D(1).minus(exact(safe.discount)));
    expect(fromCase.toString()).toBe("2.9");
    const tables = built(rounds);
    const d = tables.at(-1)!.details;
    if (d.kind !== "priced_round") throw new Error("a priced round");
    const [row] = conversionRows(tables.at(-2)!.capTable, new D(String(seriesA.pool_target_unissued_percent_post)).div(100), d, tables.at(-1)!.capTable);
    expect(row!.capTakesOver!.eq(fromCase)).toBe(true);
    // At the round's $2.50 its discount price, $2.00, is below its cap price, $2.32: the discount applies, as the case has it.
    expect([row!.method, row!.discountPrice.toString(), row!.capPrice!.toString()]).toEqual(["discount", "2", "2.32"]);

    // The round's summary, under the SAFE's line.
    const line = eventViews(rounds, tables).at(-1)!.lines.find((l): l is Exclude<Line, string> => typeof l !== "string" && l.text.startsWith("Investor S's SAFE"))!;
    // Its shares from the case's expected.json, 300,000, and its $600,000 purchase from its inputs.json: $2.00 a share.
    const shares = (expected.details.safe_conversions as Json[])[0]!.shares as number;
    expect([shares, exact(safe.purchase_amount).div(shares).toString()]).toEqual([300000, "2"]);
    expect(line.text).toBe("Investor S's SAFE converts at its discount price, $2.00 a share, into 300,000 shares of Series A Preferred (from SAFEs).");
    expect(line.details).toEqual([
      "Its cap price is $2.32: its $18,000,000 cap ÷ the company capitalization just before the round, 7,758,620.69 shares. As the YC post-money SAFE counts it, that includes the SAFEs themselves and the pool before this round's increase, and leaves out the new money.",
      "Its discount price is $2.00: the round's $2.50 less its 20% discount.",
      "It converts at the lower of the two, the cap price on a tie.",
      expect.stringMatching(/^Its 300,000 shares, rounded down to whole shares, are \d+\.\d\d% of the company after the round, fully diluted\.$/),
      "Series A Preferred (from SAFEs) has the round's terms, with its own $2.00 as its issue price, so its preference on these shares is $600,000.00, 1x what they converted at.",
      "At $2.90 a share or more, its cap sets its price; below that, its discount does.",
    ]);
  });
});

describe("Larkspur's import with case 27's Series B added as a round, by its price per share", () => {
  const files = readdirSync(resolve(cases, "ocf-01-larkspur/package")).map((f) => ({ name: f, content: caseJson("ocf-01-larkspur/package", f) }));
  const imported = readOcf(files);
  // Its two blanks, answered as case 27 fills them.
  const table = imported.cap_table as Json & { securities: Json[]; unconverted_notes: Json[] };
  const filled = {
    ...table,
    securities: table.securities.map((s) => (s.id === "cls-seed" ? { ...s, participation: "non_participating", cap_multiple: null } : s)),
    unconverted_notes: table.unconverted_notes.map((n) => ({ ...n, repayment_multiple: "1" })),
  };
  const case27 = caseJson("edge-27-safes-and-note-convert-on-an-imported-table", "inputs.json");
  const expected = caseJson("edge-27-safes-and-note-convert-on-an-imported-table", "expected.json").cap_tables.at(-1);

  it("is case 27's starting table, imported", () => {
    const start = case27.events[0];
    expect([imported.as_of, imported.issue_order]).toEqual([start.date, start.issue_order]);
  });

  it(`builds case 27's locked table, as "Add a round" and the round's form make it`, () => {
    // "Add a round": the import starts the company's rounds, with its date and issue order (R31, O14), and a priced round
    // follows it. On it, as a founder types it: Investor Z added as a holder, the round given by its price per share at
    // case 27's exact price, its date, the pool to 10%, Investor Z's $8,000,000, senior to every earlier series.
    const first = startingRounds(draftFromExit({ cap_table: filled, range: ["0", "200000000"] }), { date: imported.as_of, issueOrder: imported.issue_order });
    const start = built(buildRounds(first)).at(-1)!.capTable;
    const investor = `r${first.nextKey}`;
    const withZ: RoundsDraft = { ...first, holders: [...first.holders, { key: investor, fileId: null, name: "Investor Z" }], nextKey: first.nextKey + 1 };
    const added = addEvent(withZ, "priced_round", start);
    const round = added.events.at(-1)!;
    const typed = setEvent(added, round.key, {
      ...round.json,
      date: "2025-12-01",
      pool_target_unissued_percent_post: "10",
      investments: [{ holder: investor, amount: "8,000,000" }],
      seniority: seniorityFor("senior", String((round.json.series as Json).id), start.seniority),
    });
    const rounds = buildRounds(byPrice(typed, round.key, String(expected.details.price_per_share)));
    const zId = rounds.holders.find((h) => h.name === "Investor Z")!.id as string;
    const tables = built(rounds);
    expectCaseTable(tables.at(-1)!, expected, new Map([[zId, "sh-investor-z"]]));

    // The SAFEs' cap price moves with the price here, since the note converting beside them counts in their Company
    // Capitalization; the note's doesn't, so its cap takes over at its cap price ÷ (1 − its discount) (R33).
    const d = tables.at(-1)!.details;
    if (d.kind !== "priced_round") throw new Error("a priced round");
    const rows = conversionRows(start, new D("0.1"), d, tables.at(-1)!.capTable);
    expect(rows.map((r) => [r.id, r.method, r.shares.toNumber(), r.notExact])).toEqual([
      ["safe-x1", "cap", 367202, "others_beside"],
      ["safe-s3", "cap", 367202, "others_beside"],
      ["note-n1", "cap", 440082, null],
    ]);
    // Its round's first line says the pre-money its price implies: case 27's $50,000,000.
    expect(eventViews(rounds, tables).at(-1)!.lines[0]).toBe(
      "$8,000,000 at $2.700764 a share. The price implies a $50,000,000 pre-money valuation, $58,000,000 post-money, on the fully diluted shares the round is priced on.",
    );
  });

  it("names what's outstanding on the import, for the lines that point to the Rounds tab", () => {
    const start = built(buildRounds(startingRounds(draftFromExit({ cap_table: filled, range: ["0", "1"] }), null))).at(-1)!.capTable;
    expect(outstandingWords(start)).toEqual({ what: "Two SAFEs and a convertible note", its: "its two SAFEs and its convertible note", many: true });
  });
});

describe("a round converting Jordan's 26 SAFEs from 10j", () => {
  it("gives each SAFE one line, with its working folded under it", () => {
    // 26 post-money SAFEs at $6M, $10.5M and $29M caps, 7 with a 20% discount, beside 12 option strikes and a warrant:
    // made up in packages/engine's tests, no one's table. "Add a round" on it, at a $30M pre-money with $10M of new money.
    const table = threeCapsTable();
    const first = startingRounds(draftFromExit({ cap_table: table.cap_table, range: table.range }), null);
    const start = built(buildRounds(first)).at(-1)!.capTable;
    const added = addEvent(first, "priced_round", start);
    const round = added.events.at(-1)!;
    const typed = setEvent(added, round.key, { ...round.json, pre_money: "30M", investments: [{ holder: first.holders[0]!.key, amount: "10M" }] });
    const rounds = buildRounds(typed);
    const tables = built(rounds);
    const lines = eventViews(rounds, tables).at(-1)!.lines;
    const safes = lines.filter((l): l is Exclude<Line, string> => typeof l !== "string" && /^SAFE Investor \d+'s SAFE converts /.test(l.text));
    expect(safes).toHaveLength(26);
    // Each folded as "How it converts", and with only post-money SAFEs converting, each with the price where its cap takes over (R33).
    expect(new Set(safes.map((l) => l.fold))).toEqual(new Set(["How it converts"]));
    expect(safes.every((l) => /^At \$[\d.]+ a share or more, its cap sets its price; below that, (its discount does|it converts at the round's own price)\.$/.test(l.details.at(-1)!))).toBe(true);
    // The 7 with a discount say their discount price; the 19 without say the round's own.
    expect(safes.filter((l) => l.details.some((d) => /^Its discount price is \$[\d.]+: the round's \$[\d.]+ less its 20% discount\.$/.test(d)))).toHaveLength(7);
  });
});
