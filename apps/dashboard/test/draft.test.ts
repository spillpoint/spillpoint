// The editor's model: loading an example and building it back changes no
// number the engine reads; typed amounts become exact numbers; and every
// engine error path finds the field it names.

import { readExit } from "spillpoint";
import type { CapTable } from "spillpoint";
import examples from "virtual:examples";
import { describe, expect, it } from "vitest";

import { addHolder, addSecurity, buildExit, checkBuilt, draftFromExit, fieldForPath, fieldId, removeRow, scratchDraft, sharesKey } from "../src/draft.ts";

/** A cap table as plain strings, so two can be compared exactly. */
const plain = (ct: CapTable) => JSON.parse(JSON.stringify(ct, (_, v) => (v && typeof v === "object" && "d" in v && "e" in v ? v.toString() : v)));

describe("loading an example into the editor and building it back", () => {
  for (const example of examples) {
    it(`gives the engine exactly the same cap table and range: ${example.label}`, () => {
      const before = readExit(example.exit);
      const after = readExit(buildExit(draftFromExit(example.exit)).json);
      expect(plain(after.capTable)).toEqual(plain(before.capTable));
      expect(after.range.map(String)).toEqual(before.range.map(String));
    });
  }

  it("keeps Millrace's exact prices, shown as typed", () => {
    const draft = draftFromExit(examples[0]!.exit);
    const seriesA = draft.securities.find((s) => s.name === "Series A Preferred");
    expect(seriesA?.kind === "preferred" && seriesA.originalIssuePrice).toBe("3900000/1879091");
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

describe("where an engine error lands", () => {
  const draft = draftFromExit(examples[0]!.exit);
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

  it("gives the engine's message without its path, next to the field", () => {
    const capped = {
      ...draft,
      securities: draft.securities.map((s) => (s.key === seriesA.key && s.kind === "preferred" ? { ...s, capMultiple: "1" } : s)),
    };
    expect(checkBuilt(buildExit(capped))).toEqual({
      ok: false,
      field: fieldId.capMultiple(seriesA.key),
      message: "The cap (1x) is below the preference (1.25x); a cap counts the preference, so it can't be lower (E7)",
    });
  });
});
