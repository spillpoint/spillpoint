// The rounds as the editor holds them (M4j): every locked round case comes
// back from the editor exactly as written; percentages become exact
// fractions; typed amounts become the engine's numbers; an engine error
// finds the field it names; and which SAFEs and notes are outstanding, read
// from the events as typed, is what the engine builds (M5k).

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { buildCapTables } from "spillpoint";
import { describe, expect, it } from "vitest";

import type { Rounds } from "../src/rounds.ts";
import {
  addEvent, addHolder, asFraction, buildRounds, convertibles, draftFromRounds, eventFieldId, eventsNaming, holderFieldId, locate, outstandingAtSale,
  outstandingBefore, setEvent,
} from "../src/roundsDraft.ts";

const casesDir = resolve(import.meta.dirname, "../../../cases");
const roundsOf = (name: string): Rounds => {
  const inputs = JSON.parse(readFileSync(resolve(casesDir, name, "inputs.json"), "utf8"));
  const last = inputs.events.at(-1).id;
  return { holders: inputs.holders, events: inputs.events, after: inputs.exit?.cap_table_after_event ?? last };
};
const ROUND_CASES = readdirSync(casesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((name) => JSON.parse(readFileSync(resolve(casesDir, name, "inputs.json"), "utf8")).events);

describe("loading rounds into the editor and building them back", () => {
  it.each(ROUND_CASES)("gives back %s exactly as written", (name) => {
    const rounds = roundsOf(name);
    expect(buildRounds(draftFromRounds(rounds))).toEqual(rounds);
  });

  it("holds discounts and interest rates as the percentages people type", () => {
    const safe = draftFromRounds(roundsOf("edge-15-safe-discount-beats-cap")).events.find((e) => e.json.type === "safes")!;
    expect((safe.json.safes as Record<string, unknown>[])[0]).toMatchObject({ discount: "20" });
    const note = draftFromRounds(roundsOf("edge-19a-note-converts-with-pool")).events.find((e) => e.json.type === "notes")!;
    expect((note.json.notes as Record<string, unknown>[])[0]).toMatchObject({ interest_rate: "6", discount: "20" });
  });

  it("names holders by the editor's keys, and gives a new one an id from its name", () => {
    const d = addHolder(draftFromRounds(roundsOf("millrace")));
    const fresh = d.holders.at(-1)!;
    const renamed = { ...d, holders: d.holders.map((h) => (h.key === fresh.key ? { ...h, name: "Bea Novak" } : h)) };
    expect(buildRounds(renamed).holders.at(-1)).toEqual({ id: "bea_novak", name: "Bea Novak" });
    expect(eventsNaming(renamed, fresh.key)).toBe(0);
    // Ana is named in the founding issue only.
    expect(eventsNaming(renamed, renamed.holders[0]!.key)).toBe(1);
  });
});

describe("what people type", () => {
  it("turns percentages into exact fractions, never through floating point", () => {
    expect(asFraction("6.5")).toBe("0.065");
    expect(asFraction("6.5%")).toBe("0.065");
    expect(asFraction("20")).toBe("0.2");
    // 0.1 + 0.2 in floating point is 0.30000000000000004; exactly, it's 0.3.
    expect(asFraction("30.000000000000001")).toBe("0.30000000000000001");
    expect(asFraction("")).toBe("");
    expect(asFraction("a fifth")).toBe("a fifth");
  });

  it("reads typed amounts, share counts, percentages and multiples as the engine's numbers", () => {
    const d = draftFromRounds(roundsOf("millrace"));
    const seed = d.events.find((e) => e.json.id === "seed")!;
    const founding = d.events.find((e) => e.json.id === "founding")!;
    const edited = setEvent(
      setEvent(d, seed.key, { ...seed.json, pre_money: "$7.5M", pool_target_unissued_percent_post: "18%", series: { ...(seed.json.series as object), preference_multiple: "1x" } }),
      founding.key,
      { ...founding.json, issues: [{ holder: d.holders[0]!.key, shares: "5,500,000" }, (founding.json.issues as unknown[])[1]] },
    );
    const built = buildRounds(edited);
    const builtSeed = built.events.find((e) => e.id === "seed")!;
    expect(builtSeed).toMatchObject({ pre_money: "7500000", pool_target_unissued_percent_post: "18", series: { preference_multiple: "1" } });
    expect(built.events[0]!.issues).toEqual([{ holder: "ana", shares: "5500000" }, { holder: "dev", shares: 4500000 }]);
  });

  it("leaves out a field typed blank: a SAFE with no discount, an event with no date", () => {
    const d = draftFromRounds(roundsOf("edge-15-safe-discount-beats-cap"));
    const safe = d.events.find((e) => e.json.type === "safes")!;
    const blank = setEvent(d, safe.key, { ...safe.json, date: "", safes: [{ ...(safe.json.safes as Record<string, unknown>[])[0], discount: "" }] });
    const built = buildRounds(blank).events.find((e) => e.type === "safes")!;
    expect(built.date).toBeNull();
    expect((built.safes as Record<string, unknown>[])[0]!.discount).toBeNull();
  });
});

describe("where the engine's message goes", () => {
  const d = draftFromRounds(roundsOf("millrace"));
  const seed = d.events[5]!;

  it("finds the event and the field a path names, and the fields above it", () => {
    expect(locate(d, "inputs.events[5].investments[0].amount", 'inputs.events[5].investments[0].amount: "a lot" is not an exact number (an integer, a decimal, or "a/b")')).toEqual({
      message: '"a lot" is not an exact number (an integer, a decimal, or "a/b")',
      event: seed.key,
      fields: [eventFieldId(seed.key, "investments[0].amount"), eventFieldId(seed.key, "investments[0]"), eventFieldId(seed.key, "investments")],
    });
    expect(eventFieldId(seed.key, "series.preference_multiple")).toBe(`ev-${seed.key}-series-preference_multiple`);
  });

  it("finds a holder, and keeps the path of a message that names no field", () => {
    expect(locate(d, "inputs.holders[2].name", "inputs.holders[2].name: expected a non-empty string").fields).toEqual([holderFieldId(d.holders[2]!.key)]);
    expect(locate(d, "exit.cap_table_after_event", "exit.cap_table_after_event: no event x in inputs.events")).toEqual({
      message: "exit.cap_table_after_event: No event x in inputs.events",
      event: null,
      fields: [],
    });
  });
});

describe("SAFEs and notes, read from the events as typed (M5k)", () => {
  /** The ids of the SAFEs and notes the page says are outstanding after each event. */
  const predicted = (d: ReturnType<typeof draftFromRounds>) => {
    const rowId = (c: ReturnType<typeof convertibles>[number]) => {
      const e = d.events.find((x) => x.key === c.event)!;
      return String((e.json[c.kind === "safe" ? "safes" : "notes"] as Record<string, unknown>[])[c.row]!.id);
    };
    const at = (key: string | null) => (key === null ? Infinity : d.events.findIndex((e) => e.key === key));
    return d.events.map((_, k) => convertibles(d).filter((c) => at(c.event) <= k && at(c.convertedBy) > k).map(rowId).sort());
  };

  it.each(ROUND_CASES)("%s: the SAFEs and notes outstanding after each event are the ones the engine builds", (name) => {
    const rounds = roundsOf(name);
    const engine = buildCapTables({ holders: rounds.holders, events: rounds.events }).map((t) => [...t.unconvertedSafes, ...t.unconvertedNotes].map((x) => x.id).sort());
    expect(predicted(draftFromRounds(rounds))).toEqual(engine);
  });

  it("follows each round's choice: SAFEs convert unless it says not to, notes only when it says so", () => {
    const d = draftFromRounds(roundsOf("edge-19a-note-converts-with-pool"));
    const round = d.events.find((e) => e.json.type === "priced_round")!;
    expect(convertibles(d).map((c) => [c.kind, c.convertedBy])).toEqual([["note", round.key]]);
    const declined = setEvent(d, round.key, { ...round.json, convert_notes: false });
    expect(convertibles(declined).map((c) => c.convertedBy)).toEqual([null]);
    // Still outstanding just before that round, so the round can still choose to convert it.
    expect(outstandingBefore(declined, round.key)).toHaveLength(1);
    expect(outstandingAtSale(declined)).toHaveLength(1);
  });

  it("is outstanding at the sale when the payouts use a cap table from before the round that converts it", () => {
    const d = draftFromRounds(roundsOf("millrace"));
    expect(outstandingAtSale(d)).toEqual([]);
    const early = { ...d, after: "option_pool" };
    const seed = d.events.find((e) => e.json.id === "seed")!;
    expect(outstandingAtSale(early).map((c) => c.convertedBy)).toEqual([seed.key, seed.key]);
  });

  it("starts a new priced round converting the notes still outstanding, as it does the SAFEs", () => {
    const d = addEvent(draftFromRounds(roundsOf("millrace")), "priced_round", []);
    expect(d.events.at(-1)!.json.convert_notes).toBe(true);
    expect(d.events.at(-1)!.json.convert_safes).toBeUndefined();
  });
});
