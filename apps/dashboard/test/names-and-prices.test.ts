// The two polish items from the 0.5.0 plan (05e; Jordan, after #69): a blank field's message names the field, and a
// round's price is shown to the cent when that's exact.

import { describe, expect, it } from "vitest";

import { blankMessage, exitFieldName } from "../src/blankNames.ts";
import { eventViews, fromRounds } from "../src/rounds.ts";
import type { Line, Rounds } from "../src/rounds.ts";
import { draftFromRounds, locate } from "../src/roundsDraft.ts";

type Json = Record<string, unknown>;
const text = (line: Line) => (typeof line === "string" ? line : line.text);
const blankNumber = (path: string) => `${path}: expected an exact number as a string, got null`;

const series = (id: string, name: string): Json => ({
  id, name, kind: "preferred", preference_multiple: "1", participation: "non_participating", cap_multiple: null, anti_dilution: "none",
});

/** Ana's 10,000,000 common, then a Series B at a $40M pre-money: $4.00 a share exactly. */
const company = (more: Json = {}): Rounds => ({
  holders: [{ id: "ana", name: "Ana" }, { id: "b", name: "B Fund" }, { id: "x", name: "Investor X" }],
  events: [
    { id: "founding", date: null, type: "issue", security: { id: "common", name: "Common Stock", kind: "common" }, issues: [{ holder: "ana", shares: "10000000" }] },
    { id: "safe", date: "2025-01-01", type: "safes", safes: [{ id: "safe_x", holder: "x", purchase_amount: "500000", post_money_cap: "20000000" }] },
    {
      id: "series_b", date: "2026-01-01", type: "priced_round", series: series("series_b", "Series B"),
      pre_money: "40000000", investments: [{ holder: "b", amount: "4000000" }], seniority: [["series_b"]], convert_safes: true, ...more,
    },
  ],
  after: "series_b",
});

describe("a round's price, to the cent when that's exact", () => {
  it("says $4.00 a share, not $4.000000, and keeps six places where the price isn't exact", () => {
    const full = company({ convert_safes: false });
    const rounds = { ...full, events: full.events.filter((e) => e.id !== "safe") };
    const built = fromRounds(rounds, ["0", "100000000"]);
    if (!built.ok) throw built.error;
    const lines = eventViews(rounds, built.tables).at(-1)!.lines.map(text);
    expect(lines[0]).toBe("$4,000,000 at a $40,000,000 pre-money valuation, $44,000,000 post-money: $4.00 a share.");

    // The SAFE's $20M post-money cap over the 10,000,000 shares and its own: not a whole number of cents.
    const withSafe = fromRounds(company(), ["0", "100000000"]);
    if (!withSafe.ok) throw withSafe.error;
    const said = eventViews(company(), withSafe.tables).at(-1)!.lines.map(text);
    expect(said.find((l) => l.startsWith("Investor X's SAFE"))).toMatch(/^Investor X's SAFE converts at its cap price, \$\d\.\d{6} a share,/);
  });
});

describe("a blank field, named", () => {
  const d = draftFromRounds(company());

  it("names a round's field by its series: Jordan's example", () => {
    expect(locate(d, "inputs.events[2].pre_money", blankNumber("inputs.events[2].pre_money"))).toMatchObject({
      message: "Series B's pre-money valuation can't be blank.",
      blank: true,
    });
  });

  it("names a line's field by its holder, and an event's own field by the event", () => {
    const named = (path: string) => locate(d, path, blankNumber(path)).message;
    expect(named("inputs.events[2].investments[0].amount")).toBe("B Fund's investment in Series B can't be blank.");
    expect(named("inputs.events[1].safes[0].purchase_amount")).toBe("Investor X's SAFE amount can't be blank.");
    expect(named("inputs.events[1].safes[0].post_money_cap")).toBe("Investor X's SAFE valuation cap can't be blank.");
    expect(named("inputs.events[0].issues[0].shares")).toBe("Ana's shares can't be blank.");
    expect(named("inputs.events[1].date")).toBe("The SAFE's date can't be blank.");
    expect(named("inputs.events[2].series.preference_multiple")).toBe("Series B's preference can't be blank.");
  });

  it("gives a name ending in s a bare apostrophe (Jordan, 05e review)", () => {
    const partners = company();
    partners.holders = partners.holders.map((h) => (h.id === "b" ? { ...h, name: "Harbor Lane Partners" } : h));
    (partners.events[2] as Json).series = series("series_b", "Seed Units");
    const p = draftFromRounds(partners);
    const named = (path: string) => locate(p, path, blankNumber(path)).message;
    expect(named("inputs.events[2].investments[0].amount")).toBe("Harbor Lane Partners' investment in Seed Units can't be blank.");
    expect(named("inputs.events[2].pre_money")).toBe("Seed Units' pre-money valuation can't be blank.");
    const unnamed = company();
    (unnamed.events[2] as Json).series = series("series_b", "");
    const u = draftFromRounds(unnamed);
    expect(locate(u, "inputs.events[2].pre_money", blankNumber("inputs.events[2].pre_money")).message).toBe("The new series' pre-money valuation can't be blank.");
    const table: Json = {
      cap_table: {
        holders: [{ id: "a", name: "Atlas Ventures" }],
        securities: [{ id: "w", name: "Seed Warrant", kind: "warrant" }, { id: "s", name: "Founders Shares", kind: "preferred" }],
        unconverted_safes: [{ id: "safe", holder: "a", purchase_amount: null }],
      },
    };
    expect(exitFieldName(table, "exit.cap_table.unconverted_safes[0].purchase_amount")).toBe("Atlas Ventures' SAFE amount");
    expect(exitFieldName(table, "exit.cap_table.securities[1].original_issue_price")).toBe("Founders Shares' original issue price");
    expect(exitFieldName(table, "exit.cap_table.securities[0].strike")).toBe("Seed Warrant's strike price");
  });

  it("asks what a warrant buys", () => {
    const table: Json = { cap_table: { securities: [{ id: "w", name: "Seed Warrant", kind: "warrant" }] } };
    expect(blankMessage(exitFieldName(table, "exit.cap_table.securities[0].underlying"))).toBe("What Seed Warrant buys can't be blank.");
  });

  it("says what it said before where it can't name the field, and isn't a blank for any other message", () => {
    expect(locate(d, "inputs.events[2].seniority", blankNumber("inputs.events[2].seniority")).message).toBe("Fill this in: it can't be blank.");
    const other = locate(d, "inputs.events[2].pre_money", 'inputs.events[2].pre_money: "a lot" is not an exact number');
    expect(other.message).toBe('"a lot" is not an exact number');
    expect(other.blank).toBeUndefined();
  });

  it("names the Cap table tab's fields by their holder, class or position", () => {
    const json: Json = {
      cap_table: {
        holders: [{ id: "ana", name: "Ana" }, { id: "x", name: "Investor X" }, { id: "n", name: "Nadia" }],
        securities: [
          { id: "common", name: "Common Stock", kind: "common" },
          { id: "seed", name: "Seed Preferred", kind: "preferred", cumulative_dividend: { rate: "" } },
          { id: "options", name: "Options at $0.10", kind: "option" },
        ],
        positions: [{ holder: "ana", security: "common", shares: "" }],
        unconverted_safes: [{ id: "safe", holder: "x", purchase_amount: null }],
        unconverted_notes: [{ id: "note", holder: "n", principal: null }],
      },
      range: ["0", ""],
      payment_schedules: [{ id: "s", payments: [{ label: "Earnout", amount: null }] }],
    };
    const named = (path: string) => exitFieldName(json, path);
    expect(named("exit.cap_table.securities[1].original_issue_price")).toBe("Seed Preferred's original issue price");
    expect(named("exit.cap_table.securities[1].cumulative_dividend.rate")).toBe("Seed Preferred's cumulative dividend rate");
    expect(named("exit.cap_table.securities[2].strike")).toBe("Options at $0.10's strike price");
    expect(named("exit.cap_table.positions[0].shares")).toBe("Ana's Common Stock shares");
    expect(named("exit.cap_table.unconverted_safes[0].purchase_amount")).toBe("Investor X's SAFE amount");
    expect(named("exit.cap_table.unconverted_notes[0].principal")).toBe("Nadia's note principal");
    expect(named("exit.cap_table.unconverted_notes[0].holder")).toBe("note 1's holder");
    expect(named("exit.range[1]")).toBe("the highest exit value");
    expect(named("exit.payment_schedules[0].payments[0].amount")).toBe("the Earnout payment's amount");
    expect(named("exit.cap_table.seniority")).toBeNull();
  });
});
