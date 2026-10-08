// The editor's model: loading an example and building it back changes no
// number the engine reads; typed amounts become exact numbers; and every
// engine error path finds the field it names.

import { D, readExit, readInputs } from "spillpoint";
import type { CapTable } from "spillpoint";
import examples from "virtual:examples";
import { describe, expect, it } from "vitest";

import {
  NotShownYet,
  addHolder,
  addNote,
  addSafe,
  addSecurity,
  buildExit,
  checkBuilt,
  draftFromExit,
  fieldForPath,
  fieldId,
  removeRow,
  scratchDraft,
  setPrice,
  sharesKey,
} from "../src/draft.ts";
import { exampleContents } from "../src/rounds.ts";

/** Millrace's draft, built from its rounds as the page builds it. */
const millraceDraft = () => exampleContents(examples[0]!).draft;
/** Within one part in 10^30 of the case's exact fraction (E14). */
const closeTo = (text: unknown, numerator: string, denominator: string) => new D(String(text)).minus(new D(numerator).div(denominator)).abs().lte("1e-30");

/** A cap table as plain strings, so two can be compared exactly. */
const plain = (ct: CapTable) => JSON.parse(JSON.stringify(ct, (_, v) => (v && typeof v === "object" && "d" in v && "e" in v ? v.toString() : v)));

describe("loading an example into the editor and building it back", () => {
  for (const example of examples) {
    it(`gives the engine exactly the same cap table and range: ${example.label}`, () => {
      // Millrace's cap table is the one the engine builds from its events (M4i).
      const before = example.company ? readInputs({ ...example.company, exit: example.exit }) : readExit(example.exit);
      const after = readExit(buildExit(exampleContents(example).draft).json);
      expect(plain(after.capTable)).toEqual(plain(before.capTable));
      expect(after.range.map(String)).toEqual(before.range.map(String));
    });
  }

  it("shows Millrace's prices to six places, and keeps the exact ones underneath until edited", () => {
    const draft = millraceDraft();
    const seriesA = draft.securities.find((s) => s.name === "Series A Preferred");
    expect(seriesA?.kind === "preferred" && [seriesA.originalIssuePrice, seriesA.conversionPrice]).toEqual(["2.075472", "1.824752"]);
    const built = (d: typeof draft) => (buildExit(d).json.cap_table.securities as Record<string, unknown>[]).find((s) => s.name === "Series A Preferred")!;
    // Underneath are the engine's 40-digit prices, built from the rounds: the locked case's fractions, to within one part in 10^30.
    const exact = built(draft);
    expect(closeTo(exact.original_issue_price, "3900000", "1879091")).toBe(true);
    expect(closeTo(exact.conversion_price, "348161279317506201440070405000", "190799228993502586113800004553")).toBe(true);
    // Once you type in a field, what you typed is used, even if it's the same as what was shown.
    const typed = setPrice(draft, seriesA!.key, "originalIssuePrice", "2.075472");
    expect(built(typed)).toMatchObject({ original_issue_price: "2.075472", conversion_price: exact.conversion_price });
    // A typed fraction is still read exactly.
    expect(built(setPrice(draft, seriesA!.key, "originalIssuePrice", "39/19"))).toMatchObject({ original_issue_price: "39/19" });
    // A conversion price equal to the issue price shows as blank: no anti-dilution adjustment.
    const seriesB = draft.securities.find((s) => s.name === "Series B Preferred");
    expect(seriesB?.kind === "preferred" && seriesB.conversionPrice).toBe("");
    expect(draft.shares[sharesKey(draft.holders[0]!.key, draft.securities[0]!.key)]).toBe("5,500,000");
    expect(draft.pool).toBe("5,101,136");
  });
});

describe("what founders type", () => {
  it("reads grouped share counts, dollar signs, and amounts like 40M", () => {
    const d = scratchDraft();
    const priced = addSecurity(d, "preferred");
    const series = priced.securities.at(-1)!;
    const edited = {
      ...priced,
      securities: priced.securities.map((s) => (s.key === series.key && s.kind === "preferred" ? { ...s, originalIssuePrice: "$1.50", preferenceMultiple: "1.5x" } : s)),
      shares: { ...priced.shares, [sharesKey("k1", series.key)]: " 1,000,000 " },
      range: ["$0", "40M"] as [string, string],
    };
    const { json } = buildExit(edited);
    const built = json.cap_table.securities as Record<string, unknown>[];
    expect(built.at(-1)).toMatchObject({ original_issue_price: "1.5", preference_multiple: "1.5" });
    expect((json.cap_table.positions as Record<string, unknown>[]).at(-1)).toMatchObject({ shares: "1000000" });
    expect(json.range).toEqual(["0", "40000000"]);
  });

  it("gives new rows readable ids from their names, each unique", () => {
    let d = addHolder(addHolder(scratchDraft()));
    d = { ...d, holders: d.holders.map((h, i) => ({ ...h, name: i === 0 ? "Ana Ortiz" : "Ana  Ortiz" })) };
    expect(buildExit(d).json.cap_table.holders).toEqual([
      { id: "ana_ortiz", name: "Ana Ortiz" },
      { id: "ana_ortiz_2", name: "Ana  Ortiz" },
      { id: "ana_ortiz_3", name: "Ana  Ortiz" },
    ]);
  });

  it("puts a new preferred series in a tier of its own, paid first", () => {
    const d = addSecurity(addSecurity(scratchDraft(), "preferred"), "preferred");
    const ids = (d.securities.slice(1) as { key: string }[]).map((s) => s.key);
    expect(buildExit(d).json.cap_table.seniority).toEqual([["new_preferred_series_2"], ["new_preferred_series"]]);
    expect(ids).toHaveLength(2);
  });

  it("removes a holder's shares with the holder, and a class's place in the conversion group with the class", () => {
    let d = addSecurity(scratchDraft(), "preferred");
    const series = d.securities.at(-1)!.key;
    d = { ...d, shares: { ...d.shares, [sharesKey("k1", series)]: "100" }, group: { ...d.group, members: [series] } };
    const withoutSeries = removeRow(d, series);
    expect(withoutSeries.group.members).toEqual([]);
    expect(Object.keys(withoutSeries.shares)).toEqual([sharesKey("k1", "k2")]);
    expect(removeRow(d, "k1").shares).toEqual({});
  });
});

describe("where an engine error about a SAFE, a note or the sale's date lands (M5k)", () => {
  it("finds the SAFE's or note's field, the card for a message about them all, and the date", () => {
    const d = addNote(addSafe(scratchDraft()));
    const [safe] = d.safes;
    const [note] = d.notes;
    const { fields } = buildExit(d);
    expect(fieldForPath(fields, "exit.cap_table.unconverted_safes[0].post_money_cap")).toBe(fieldId.safeCap(safe!.key));
    expect(fieldForPath(fields, "exit.cap_table.unconverted_safes[0].id")).toBe(fieldId.safe(safe!.key));
    expect(fieldForPath(fields, "exit.cap_table.unconverted_notes[0].issue_date")).toBe(fieldId.noteIssued(note!.key));
    expect(fieldForPath(fields, "exit.cap_table.unconverted_notes")).toBe(fieldId.outstanding);
    expect(fieldForPath(fields, "exit.exit_date")).toBe(fieldId.exitDate);
  });

  it("gives new SAFEs and notes ids of their own, apart from every class's", () => {
    let d = addNote(addSafe(addSafe(scratchDraft())));
    d = { ...d, securities: d.securities.map((s) => ({ ...s, name: "Safe" })) };
    const ct = buildExit(d).json.cap_table;
    expect((ct.securities as { id: string }[]).map((s) => s.id)).toEqual(["safe"]);
    expect((ct.unconverted_safes as { id: string }[]).map((f) => f.id)).toEqual(["safe_2", "safe_3"]);
    expect((ct.unconverted_notes as { id: string }[]).map((n) => n.id)).toEqual(["note"]);
  });

  it("leaves SAFEs, notes and the date out of a cap table without them, so the examples build exactly as before", () => {
    const { json } = buildExit(scratchDraft());
    expect(Object.keys(json.cap_table)).toEqual(["holders", "securities", "seniority", "conversion_groups", "positions"]);
    expect(Object.keys(json)).toEqual(["cap_table", "range", "exit_values"]);
  });
});

describe("warrants and cumulative dividends (M5k2)", () => {
  const capTable = (securities: Record<string, unknown>[]) => ({
    cap_table: {
      holders: [{ id: "a", name: "A" }],
      securities: [{ id: "common", name: "Common Stock", kind: "common" }, ...securities],
      seniority: [["seed"]],
      positions: [{ holder: "a", security: "common", shares: "100" }],
    },
    range: ["0", "1000000"],
  });
  const seed = { id: "seed", name: "Seed Preferred", kind: "preferred", original_issue_price: "1", preference_multiple: "1", participation: "non_participating", cap_multiple: null };
  const warrant = { id: "w", name: "Warrant for Seed", kind: "warrant", strike: "0.5", underlying: "seed" };

  it("reads a warrant for a series listed after it, and builds it back", () => {
    const d = draftFromExit(capTable([warrant, seed]));
    const seedKey = d.securities.find((s) => s.kind === "preferred")!.key;
    expect(d.securities.find((s) => s.kind === "warrant")).toMatchObject({ underlying: seedKey });
    expect((buildExit(d).json.cap_table.securities as Record<string, unknown>[])[1]).toEqual(warrant);
  });

  it("leaves a warrant asking which class it buys once its series is removed, rather than give it another", () => {
    const d = draftFromExit(capTable([seed, warrant]));
    const removed = removeRow(d, d.securities.find((s) => s.kind === "preferred")!.key);
    expect(removed.securities.find((s) => s.kind === "warrant")).toMatchObject({ underlying: "" });
    const checked = checkBuilt(buildExit({ ...removed }));
    const w = removed.securities.find((s) => s.kind === "warrant")!;
    expect(checked).toMatchObject({ ok: false, field: fieldId.underlying(w.key), message: "Fill this in: it can't be blank." });
  });

  it("puts a dividend's messages next to its fields, and asks for the sale's date by the series' name", () => {
    const d = draftFromExit(capTable([{ ...seed, cumulative_dividend: { rate: "0.08", accrual_start: "2022-03-31" } }]));
    const s = d.securities.find((x) => x.kind === "preferred")!;
    expect(checkBuilt(buildExit(d))).toMatchObject({ ok: false, field: fieldId.exitDate, message: "Fill this in: Seed Preferred's cumulative dividends accrue up to the date of the sale." });
    const dated = { ...d, exitDate: "2026-03-31" };
    expect(checkBuilt(buildExit(dated)).ok).toBe(true);
    const blankRate = { ...dated, securities: dated.securities.map((x) => (x.kind === "preferred" ? { ...x, dividend: { ...x.dividend!, rate: "" } } : x)) };
    expect(checkBuilt(buildExit(blankRate))).toMatchObject({ ok: false, field: fieldId.dividendRate(s.key), message: "Fill this in: it can't be blank." });
    expect(checkBuilt(buildExit({ ...d, exitDate: "2022-03-30" }))).toMatchObject({ field: fieldId.exitDate, message: "2022-03-30 is before Seed Preferred's dividends start to accrue, 2022-03-31" });
  });
});

describe("where an engine error lands", () => {
  const draft = millraceDraft();
  const { fields } = buildExit(draft);
  const seriesA = draft.securities.find((s) => s.name === "Series A Preferred")!;
  const index = draft.securities.indexOf(seriesA);

  it("finds the field a path names, or the nearest one above it", () => {
    expect(fieldForPath(fields, `exit.cap_table.securities[${index}].cap_multiple`)).toBe(fieldId.capMultiple(seriesA.key));
    expect(fieldForPath(fields, `exit.cap_table.securities[${index}].id`)).toBe(fieldId.securityName(seriesA.key));
    expect(fieldForPath(fields, "exit.cap_table.conversion_groups[0].series[1]")).toBe(fieldId.group);
    expect(fieldForPath(fields, "exit.range")).toBe(fieldId.rangeHigh);
    expect(fieldForPath(fields, "exit.exit_values[0]")).toBeNull();
  });

  it("gives the engine's message without its path or assumption code, and keeps both in the error for developers", () => {
    const capped = {
      ...draft,
      securities: draft.securities.map((s) => (s.key === seriesA.key && s.kind === "preferred" ? { ...s, capMultiple: "1" } : s)),
    };
    const checked = checkBuilt(buildExit(capped));
    expect(checked).toMatchObject({
      ok: false,
      field: fieldId.capMultiple(seriesA.key),
      message: "The cap (1x) is below the preference (1.25x); a cap counts the preference, so it can't be lower",
    });
    expect(!checked.ok && checked.error.message).toBe(
      `exit.cap_table.securities[${index}].cap_multiple: the cap (1x) is below the preference (1.25x); a cap counts the preference, so it can't be lower (E7)`,
    );
  });
});

describe("a cap table the page can't show in full (M5d review)", () => {
  // The page's own guard, whatever the engine reads: a kind it doesn't know is
  // never treated as common stock, and a term it doesn't carry is never dropped.
  const exit = (security: Record<string, unknown>) => ({
    cap_table: {
      holders: [{ id: "a", name: "A" }],
      securities: [{ id: "common", name: "Common Stock", kind: "common" }, security],
      seniority: [],
      positions: [{ holder: "a", security: "common", shares: "100" }],
      unissued_pool: "0",
    },
    range: ["0", "1000000"],
  });

  it("refuses a made-up kind of security", () => {
    expect(() => draftFromExit(exit({ id: "g", name: "Gizmo shares", kind: "gizmo" }))).toThrow(
      new NotShownYet('It has Gizmo shares, a kind of security ("gizmo") this page doesn\'t know. It won\'t open the cap table rather than treat it as something it isn\'t.'),
    );
  });

  it("refuses a field nobody models, on a security or a carve-out, for the engine's message to name", () => {
    const refused = (input: unknown) => {
      try {
        draftFromExit(input);
      } catch (e) {
        return e;
      }
      return null;
    };
    // A field nobody models: the page's check says so, and the engine's message, read first, names it.
    expect(refused(exit({ id: "w", name: "Warrant", kind: "warrant", strike: "1", underlying: "common", expiry: "2030-01-01" }))).toMatchObject({ name: "NotShownYet", known: false });
    const carved = exit({ id: "c2", name: "More common", kind: "common" }) as { cap_table: Record<string, unknown> };
    carved.cap_table.carve_out = { tiers: [{ from: "0", to: null, percent: "5", vesting: "4 years" }], allocation: [{ holder: "a", percent: "100" }] };
    expect(refused(carved)).toMatchObject({ name: "NotShownYet", known: false, message: 'It has "vesting" on its management carve-out, which this page doesn\'t show yet. It won\'t open a cap table it can\'t show in full.' });
  });
});
