// The SAFEs tab's trial round and what it says of each SAFE and note (11c; R32, R33): checked against the locked cases.
// - Every conversion in every locked round: the price the page says applies is the engine's conversion price, the
//   lower of the two it gives, and on the side of the price where its cap takes over, where it gives one.
// - edge-15's Series A as a trial on its own table, by its pre-money and by its price: its locked table. Its SAFE's
//   cap takes over at the price worked from the case's own numbers.
// - Larkspur's import with a trial at case 27's Series B price: case 27's locked table.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { D, buildCapTables, parseExact, readOcf } from "spillpoint";
import type { CapTable, CapTableAfterEvent, PreferredSeries } from "spillpoint";
import { describe, expect, it } from "vitest";

import { draftFromExit } from "../src/draft.ts";
import { fromRounds } from "../src/rounds.ts";
import { conversionRows, parsePrice, runTrial, trialBase } from "../src/trial.ts";
import type { TrialTerms } from "../src/trial.ts";

type Json = Record<string, unknown>;
const cases = resolve(import.meta.dirname, "../../../cases");
const caseJson = (name: string, file: string) => JSON.parse(readFileSync(resolve(cases, name, file), "utf8"));
const close = (a: D, b: D) => a.minus(b).abs().lte(new D("1e-30").times(D.max(1, b.abs())));
const exact = (v: unknown) => parseExact(v, "value");

/** A trial's terms, from what a test gives. */
const terms = (t: Partial<TrialTerms>): TrialTerms => ({ by: "price", price: "", preMoney: "", amount: "", poolTarget: "", date: "", rank: "alongside", ...t });

/**
 * A trial's table against a locked one: every holder's every position, the pool, the seniority, each class and its
 * terms, and what the round worked out. The trial's new money comes from "New investors"; the case's from its own
 * investor, `investor`. The round's own series, and those its SAFEs and notes convert into, take "Add a round"'s
 * broad-based anti-dilution, so that one term is the case's only where the case's is too (`antiDilution`).
 */
function expectCaseTable(trial: CapTableAfterEvent, expected: Json, investor: string, roundSeries: string, antiDilution: boolean) {
  const mapped = (id: string) => (id === "new_investors" ? investor : id);
  const ct = trial.capTable;
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
    expect([s.participation, s.preferenceMultiple.toString()]).toEqual([e.participation, String(e.preference_multiple)]);
    const ofTheRound = s.id === roundSeries || s.id.startsWith(`${roundSeries}_`);
    if (antiDilution || !ofTheRound) expect(s.antiDilution, `${s.id} anti-dilution`).toBe(e.anti_dilution);
    else expect(s.antiDilution, `${s.id} anti-dilution, as "Add a round" starts one`).toBe("broad_based");
  });
  const d = trial.details;
  const ed = expected.details as Json;
  if (d.kind !== "priced_round") throw new Error("a priced round");
  expect(close(d.price, exact(ed.price_per_share))).toBe(true);
  expect(close(d.postMoneyValuation, exact(ed.post_money_valuation))).toBe(true);
  expect(d.newShares.map((n) => [mapped(n.holder), n.shares.toNumber()])).toEqual((ed.new_shares as Json[]).map((n) => [n.holder, n.shares]));
  expect(d.poolTopUp.toNumber()).toBe(ed.pool_top_up);
  expect(d.safeConversions.map((c) => [c.safe, c.method, c.shares.toNumber(), c.series])).toEqual(((ed.safe_conversions ?? []) as Json[]).map((c) => [c.safe, c.method, c.shares, c.series]));
  expect(d.noteConversions.map((c) => [c.note, c.method, c.shares.toNumber(), c.series])).toEqual(((ed.note_conversions ?? []) as Json[]).map((c) => [c.note, c.method, c.shares, c.series]));
}

describe("each SAFE's and note's two prices, against every locked round (R4, R23, R24)", () => {
  const roundCases = readdirSync(cases).filter((n) => existsSync(resolve(cases, n, "inputs.json")) && (caseJson(n, "inputs.json").events ?? []).some((e: Json) => e.type === "priced_round"));
  const rounds = roundCases.flatMap((name) => {
    const inputs = caseJson(name, "inputs.json");
    return (inputs.events as Json[]).flatMap((e, i) => (e.type === "priced_round" ? [[name, String(e.id), i] as const] : []));
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
});

describe("edge-15's Series A as a trial on its own table", () => {
  const inputs = caseJson("edge-15-safe-discount-beats-cap", "inputs.json");
  const expected = caseJson("edge-15-safe-discount-beats-cap", "expected.json").cap_tables.at(-1);
  const seriesA = inputs.events.at(-1) as Json;
  const rounds = { holders: inputs.holders, events: inputs.events.slice(0, -1), after: "safe" };
  const draft = (() => {
    const r = fromRounds(rounds, ["0", "100000000"]);
    if (!r.ok) throw r.error;
    return r.draft;
  })();
  const base = (() => {
    const b = trialBase(draft, null, rounds);
    if (!b.ok) throw new Error(b.message);
    return b.base;
  })();
  const at = (t: Partial<TrialTerms>) => {
    const trial = runTrial(base, terms({ amount: String((seriesA.investments as Json[])[0]!.amount), poolTarget: String(seriesA.pool_target_unissued_percent_post), ...t }));
    if (!trial.ok) throw new Error(trial.message);
    return trial;
  };

  it("builds its locked table from its pre-money, and from the price it solves to", () => {
    for (const trial of [at({ by: "pre_money", preMoney: String(seriesA.pre_money) }), at({ by: "price", price: String(expected.details.price_per_share) })]) {
      expectCaseTable(trial.tables.at(-1)!, expected, "investor_x", "series_a", false);
    }
  });

  it("says its SAFE's cap takes over at its cap ÷ its Company Capitalization ÷ (1 − its discount), from the case's own numbers", () => {
    // From the case's files, not the engine: Investor S's $18,000,000 post-money cap and 20% discount (inputs.json), and
    // the round's Company Capitalization, 225,000,000/29 shares (expected.json). $2.90.
    const safe = (inputs.events.find((e: Json) => e.id === "safe").safes as Json[])[0]!;
    const fromCase = exact(safe.post_money_cap).div(exact(expected.details.company_capitalization)).div(new D(1).minus(exact(safe.discount)));
    expect(fromCase.toString()).toBe("2.9");
    const trial = at({ by: "pre_money", preMoney: String(seriesA.pre_money) });
    const [row] = conversionRows(base.capTable, new D(String(seriesA.pool_target_unissued_percent_post)).div(100), trial.round, trial.tables.at(-1)!.capTable);
    expect(row!.capTakesOver!.eq(fromCase)).toBe(true);
    // At the round's $2.50 its discount price, $2.00, is below its cap price, $2.32: the discount applies, as the case has it.
    expect([row!.method, row!.discountPrice.toString(), row!.capPrice!.toString()]).toEqual(["discount", "2", "2.32"]);
  });
});

describe("Larkspur's import with a trial at case 27's Series B price", () => {
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

  it("builds case 27's locked table", () => {
    const draft = draftFromExit({ cap_table: filled, range: ["0", "200000000"] });
    const base = trialBase(draft, { date: imported.as_of, issueOrder: imported.issue_order }, null);
    if (!base.ok) throw new Error(base.message);
    const trial = runTrial(base.base, terms({ by: "price", price: String(expected.details.price_per_share), amount: "8000000", poolTarget: "10", date: "2025-12-01", rank: "senior" }));
    if (!trial.ok) throw new Error(trial.message);
    expectCaseTable(trial.tables.at(-1)!, expected, "sh-investor-z", "series_b", true);
    // The SAFEs' cap price moves with the price here, since the note converting beside them counts in their Company
    // Capitalization; the note's doesn't, so its cap takes over at its cap price ÷ (1 − its discount) (R33).
    const rows = conversionRows(base.base.capTable, new D("0.1"), trial.round, trial.tables.at(-1)!.capTable);
    expect(rows.map((r) => [r.id, r.method, r.shares.toNumber(), r.notExact])).toEqual([
      ["safe-x1", "cap", 367202, "others_beside"],
      ["safe-s3", "cap", 367202, "others_beside"],
      ["note-n1", "cap", 440082, null],
    ]);
  });
});

describe("what the trial takes", () => {
  it("reads a price as typed, a fraction included, and nothing that isn't one above zero", () => {
    expect(["1.50", "$1.082112", " 3/2 ", "1,000.5", ".5"].map(parsePrice)).toEqual(["1.50", "1.082112", "3/2", "1000.5", "0.5"]);
    expect(["", "0", "abc", "-1", "1/0", "2/"].map(parsePrice)).toEqual([null, null, null, null, null, null]);
  });
});
