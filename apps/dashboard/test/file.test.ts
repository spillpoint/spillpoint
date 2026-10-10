// Saved files: what a save writes, that opening it gives back the same cap
// table to the cent, and that a file that can't be read says why. Millrace is
// built from its rounds, so its file keeps the rounds (version 2, M4i). Since
// version 3 (M5k) a file can carry the sale's date, and a cap table can have
// SAFEs and notes still outstanding.

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import examples from "virtual:examples";
import { D, findBreakpoints, prepare, readExit, readInputs, solve } from "spillpoint";
import type { CapTable } from "spillpoint";
import { describe, expect, it } from "vitest";

import { buildExit, setPrice } from "../src/draft.ts";
import { fileName, fileText, readFile } from "../src/file.ts";
import { exampleContents } from "../src/rounds.ts";
import { FULL_SEARCH_TIMEOUT } from "./analysis.ts";
import { exitOf, lockedMillraceExit, payoutsAtBreakpoints } from "./payouts.ts";

const millrace = examples[0]!;
const contents = exampleContents(millrace);
/** Millrace's cap table after "Edit the cap table directly": the table its rounds built, with no rounds. */
const millraceTable = contents.draft;
const millraceRounds = contents.rounds!;
const closeTo = (text: unknown, numerator: string, denominator: string) => new D(String(text)).minus(new D(numerator).div(denominator)).abs().lte("1e-30");

describe("saving and opening again", () => {
  for (const example of examples) {
    it(`gives the same breakpoints and the same payouts to the cent at each: ${example.label}`, () => {
      const { draft, rounds } = exampleContents(example);
      const saved = fileText(example.label, draft, undefined, rounds);
      const opened = readFile(saved);
      if (!opened.ok) throw new Error(opened.message);
      expect(payoutsAtBreakpoints(buildExit(opened.draft).json)).toEqual(payoutsAtBreakpoints(buildExit(draft).json));
      // Saving what was opened writes the same file again.
      expect(fileText(opened.name, opened.draft, undefined, opened.rounds)).toBe(saved);
    });
  }

  it("keeps Millrace's rounds, which build the same payouts as its locked cap table, to the cent at every breakpoint", () => {
    const saved = fileText("Millrace", millraceTable, undefined, millraceRounds);
    expect(payoutsAtBreakpoints(exitOf(saved))).toEqual(payoutsAtBreakpoints(lockedMillraceExit()));
    const opened = readFile(saved);
    // The events come back exactly as they were written.
    expect(opened.ok && opened.rounds).toEqual(millraceRounds);
  });

  it("saves the exact value of a field nobody edited, and what was typed in one that was", () => {
    const seriesA = millraceTable.securities.find((s) => s.name === "Series A Preferred")!;
    const securityA = (text: string) => (JSON.parse(text).cap_table.securities as Record<string, string>[]).find((s) => s.id === "series_a")!;
    // On screen these show as 2.075472 and 1.824752; the file keeps the engine's prices, the case's fractions to 40 digits.
    const saved = securityA(fileText("Millrace", millraceTable));
    expect(closeTo(saved.original_issue_price, "3900000", "1879091")).toBe(true);
    expect(closeTo(saved.conversion_price, "348161279317506201440070405000", "190799228993502586113800004553")).toBe(true);
    const typed = setPrice(millraceTable, seriesA.key, "originalIssuePrice", "2.075472");
    expect(securityA(fileText("Millrace", typed))).toMatchObject({ original_issue_price: "2.075472", conversion_price: saved.conversion_price });
  });

  it("writes the agreed format: version 6, a name, the rounds or the cap table, the range, the sale's date if given, and the view if there is one", () => {
    const built = JSON.parse(fileText("  Millrace Robotics (fictional) ", millraceTable, undefined, millraceRounds));
    expect(Object.keys(built)).toEqual(["format", "version", "name", "holders", "events", "cap_table_after_event", "range"]);
    expect(built).toMatchObject({ format: "spillpoint", version: 6, name: "Millrace Robotics (fictional)", cap_table_after_event: "series_b", range: ["0", "300000000"] });
    const dated = JSON.parse(fileText("Millrace", { ...millraceTable, exitDate: "2026-06-30" }, { exitValue: "39424995.32", you: "cobalt" }));
    expect(Object.keys(dated)).toEqual(["format", "version", "name", "cap_table", "range", "exit_date", "view"]);
    expect(dated.exit_date).toBe("2026-06-30");
    expect(built.events).toEqual(millrace.company!.events);
    const entered = JSON.parse(fileText("Millrace", millraceTable));
    expect(Object.keys(entered)).toEqual(["format", "version", "name", "cap_table", "range"]);
    const viewed = JSON.parse(fileText("Millrace", millraceTable, { exitValue: "39424995.32", you: "cobalt" }, millraceRounds));
    expect(Object.keys(viewed)).toEqual(["format", "version", "name", "holders", "events", "cap_table_after_event", "range", "view"]);
    expect(viewed.view).toEqual({ exit_value: "39424995.32", you: "cobalt" });
  });

  it("reads the view back exactly, and opens a file without one with none", () => {
    const view = { exitValue: "39424995.32", you: "cobalt" };
    const opened = readFile(fileText("Millrace", millraceTable, view, millraceRounds));
    expect(opened.ok && opened.view).toEqual(view);
    const plain = readFile(fileText("Millrace", millraceTable, undefined, millraceRounds));
    expect(plain.ok && plain.view).toBeNull();
  });

  it("opens a version 2 file, saved before the sale's date, as it was", () => {
    const v2 = { ...JSON.parse(fileText("Millrace", millraceTable, undefined, millraceRounds)), version: 2 };
    const opened = readFile(JSON.stringify(v2));
    if (!opened.ok) throw new Error(opened.message);
    expect(opened.rounds).toEqual(millraceRounds);
    expect(opened.draft.exitDate).toBe("");
    expect(payoutsAtBreakpoints(buildExit(opened.draft).json)).toEqual(payoutsAtBreakpoints(lockedMillraceExit()));
  });

  it("opens a version 5 file, saved before starting tables, as it was: its rounds, and a cap table entered directly (05b3)", () => {
    for (const rounds of [millraceRounds, null]) {
      const v5 = { ...JSON.parse(fileText("Millrace", millraceTable, undefined, rounds)), version: 5 };
      const opened = readFile(JSON.stringify(v5));
      if (!opened.ok) throw new Error(opened.message);
      expect(opened.rounds).toEqual(rounds);
      expect(payoutsAtBreakpoints(buildExit(opened.draft).json)).toEqual(payoutsAtBreakpoints(lockedMillraceExit()));
      // Saved again, it's version 6, otherwise the same.
      expect(JSON.parse(fileText(opened.name, opened.draft, undefined, opened.rounds))).toEqual({ ...v5, version: 6 });
    }
  });

  it("keeps an import's date and issue order beside a cap table entered directly, only when given (05b3b)", () => {
    const origin = { date: "2025-12-31", issueOrder: ["seed", "series_a", "series_b"] };
    const saved = JSON.parse(fileText("Millrace", millraceTable, undefined, null, origin));
    expect(Object.keys(saved)).toEqual(["format", "version", "name", "cap_table", "as_of", "issue_order", "range"]);
    const opened = readFile(JSON.stringify(saved));
    expect(opened.ok && opened.origin).toEqual(origin);
    // Only the date, or nothing: each is written only when present.
    expect(Object.keys(JSON.parse(fileText("Millrace", millraceTable, undefined, null, { date: "2025-12-31", issueOrder: null })))).toContain("as_of");
    expect(Object.keys(JSON.parse(fileText("Millrace", millraceTable)))).not.toContain("as_of");
    // With rounds, they're in the first event, never beside it.
    expect(Object.keys(JSON.parse(fileText("Millrace", millraceTable, undefined, millraceRounds, origin)))).not.toContain("issue_order");
  });

  it("refuses an import's date or issue order it can't read, or beside rounds (05b3b)", () => {
    const refusal = (file: unknown) => {
      const opened = readFile(JSON.stringify(file));
      return opened.ok ? null : opened.message;
    };
    const table = JSON.parse(fileText("Millrace", millraceTable));
    expect(refusal({ ...table, as_of: "Dec 31" })).toBe("Its import's date isn't readable: it should be a date, like 2025-12-31.");
    expect(refusal({ ...table, issue_order: "seed" })).toBe("Its issue order isn't readable: it should be a list of its series', SAFEs' and notes' ids.");
    const rounds = JSON.parse(fileText("Millrace", millraceTable, undefined, millraceRounds));
    expect(refusal({ ...rounds, as_of: "2025-12-31" })).toBe("Its rounds keep the import's date and issue order in their first event, so they can't be beside them too.");
  });

  it("opens a version 1 file, saved before rounds, as it was", () => {
    const v1 = { ...JSON.parse(fileText("Millrace", millraceTable)), version: 1 };
    const opened = readFile(JSON.stringify(v1));
    if (!opened.ok) throw new Error(opened.message);
    expect(opened.rounds).toBeNull();
    expect(payoutsAtBreakpoints(buildExit(opened.draft).json)).toEqual(payoutsAtBreakpoints(lockedMillraceExit()));
  });

  it("names the file after the cap table", () => {
    expect(fileName("Millrace Robotics (fictional)")).toBe("millrace-robotics-fictional.json");
    expect(fileName("Founders' table, v2")).toBe("founders-table-v2.json");
    expect(fileName("  ")).toBe("cap-table.json");
  });
});

describe("a file that can't be opened", () => {
  const good = () => JSON.parse(fileText("Millrace", millraceTable));
  const withRounds = () => JSON.parse(fileText("Millrace", millraceTable, undefined, millraceRounds));
  const refusal = (file: unknown) => {
    const opened = readFile(typeof file === "string" ? file : JSON.stringify(file));
    return opened.ok ? null : opened.message;
  };

  it("isn't JSON, or isn't a spillpoint file", () => {
    expect(refusal("{ not json")).toBe("It isn't a spillpoint file: it isn't valid JSON.");
    expect(refusal({ exit: millrace.exit })).toBe('It isn\'t a spillpoint file: spillpoint files start with "format": "spillpoint".');
  });

  it("comes from a newer version, or has no version", () => {
    expect(refusal({ ...good(), version: 7 })).toBe(
      "It was saved by a newer version of spillpoint (file version 7); this page reads files up to version 6. Open it with the newer version.",
    );
    const { version: _version, ...unversioned } = good();
    expect(refusal(unversioned)).toBe("Its version number is missing or unreadable, so it's not clear how to read it.");
  });

  it("has a view that doesn't fit its cap table", () => {
    const view = (v: unknown) => refusal({ ...good(), view: v });
    expect(view({ exit_value: "400000000", you: "ana" })).toBe("Its view's exit value, $400M, is outside its range, $0 to $300M.");
    expect(view({ exit_value: "100000000", you: "zoe" })).toBe("Its view says you are zoe, who isn't in its cap table.");
    expect(view({ exit_value: "100000000" })).toBe("Its view needs both an exit value and the holder you are.");
    expect(view({ exit_value: "about $100M", you: "ana" })).toBe('Its view\'s exit value, "about $100M", isn\'t an exact number.');
    expect(view({ exit_value: "100000000", you: "ana", tab: "editor" })).toBe("Its view has a field spillpoint doesn't read: tab.");
  });

  it("has a field spillpoint doesn't read", () => {
    expect(refusal({ ...good(), exit_value: "100000000" })).toBe("It has a field spillpoint doesn't read: exit_value.");
  });

  it("has a cap table the engine refuses, in the engine's words without assumption codes", () => {
    const file = good();
    file.cap_table.securities.find((s: { id: string }) => s.id === "series_a").cap_multiple = "1";
    expect(refusal(file)).toBe(
      "Its cap table can't be used. file.cap_table.securities[5].cap_multiple: the cap (1x) is below the preference (1.25x); a cap counts the preference, so it can't be lower",
    );
  });

  it("uses a term the engine doesn't model yet, in the engine's words", () => {
    const file = good();
    file.cap_table.conversion_groups = [["seed", "series_a"], ["series_b"]];
    expect(refusal(file)).toMatch(
      /^Its cap table can't be used\. file\.cap_table\.conversion_groups: More than one conversion group .*The engine supports this once a case needs it; until then it refuses the input rather than ignoring the term\.$/,
    );
  });

  it("has a SAFE or a note with a field nobody models, in the engine's words", () => {
    const safe = good();
    safe.cap_table.unconverted_safes = [{ id: "safe_z", holder: "ana", purchase_amount: "100000", post_money_cap: "10000000", mfn: true }];
    expect(refusal(safe)).toBe(
      "Its cap table can't be used. file.cap_table.unconverted_safes[0].mfn: unknown field; the engine reads only id, holder, purchase_amount, post_money_cap, pre_money_cap, discount, cash_out_ranks_with",
    );
    const note = good();
    note.cap_table.unconverted_notes = [
      { id: "note_z", holder: "ana", principal: "100000", interest_rate: "0.06", issue_date: "2023-01-01", valuation_cap: "8000000", repayment_multiple: "2", maturity: "2025-01-01" },
    ];
    note.exit_date = "2026-01-01";
    expect(refusal(note)).toMatch(/^Its cap table can't be used\. file\.cap_table\.unconverted_notes\[0\]\.maturity: unknown field; the engine reads only id, holder, principal, /);
  });

  it("has a note but no sale date, or a sale date before the note was issued", () => {
    const note = good();
    note.cap_table.unconverted_notes = [{ id: "note_z", holder: "ana", principal: "100000", interest_rate: "0.06", issue_date: "2023-01-01", valuation_cap: "8000000", repayment_multiple: "2" }];
    expect(refusal(note)).toBe("Its cap table can't be used. file.exit_date: note_z accrues interest, so the exit needs an exit_date");
    expect(refusal({ ...note, exit_date: "2022-12-31" })).toBe("Its cap table can't be used. file.exit_date: 2022-12-31 is before note_z was issued, 2023-01-01");
  });

  it("has a security of a kind the page doesn't know: refused, never treated as common", () => {
    const file = good();
    file.cap_table.securities.push({ id: "bond_x", name: "Bond X", kind: "bond" });
    expect(refusal(file)).toBe(
      'It has Bond X, a kind of security ("bond") this page doesn\'t know. It won\'t open the cap table rather than treat it as something it isn\'t.',
    );
  });

  it("has a field nobody models, in the engine's words", () => {
    const file = good();
    file.cap_table.securities.find((s: { id: string }) => s.id === "series_a").vesting = "4 years";
    expect(refusal(file)).toBe(
      "Its cap table can't be used. file.cap_table.securities[5].vesting: unknown field; the engine reads only id, name, kind, original_issue_price, " +
        "conversion_price, conversion_ratio, preference_multiple, participation, cap_multiple, anti_dilution, anti_dilution_a, cumulative_dividend, approx",
    );
  });

  it("has both a cap table and rounds, or rounds without the event the payouts use", () => {
    expect(refusal({ ...withRounds(), cap_table: good().cap_table })).toBe("It has both a cap table and the events that build one; a file has one or the other.");
    const { cap_table_after_event: _after, ...noAfter } = withRounds();
    expect(refusal(noAfter)).toBe("Its rounds need the holders, the events, and the event whose cap table the payouts use.");
  });

  it("has rounds the engine can't build, in the engine's words", () => {
    expect(refusal({ ...withRounds(), cap_table_after_event: "series_c" })).toBe("Its rounds can't be built. exit.cap_table_after_event: no event series_c in inputs.events");
    const file = withRounds();
    file.events[5].investments[0].amount = "a lot";
    expect(refusal(file)).toBe('Its rounds can\'t be built. inputs.events[5].investments[0].amount: "a lot" is not an exact number (an integer, a decimal, or "a/b")');
  });
});

const casesDir = resolve(import.meta.dirname, "../../../cases");
const caseInputs = (name: string) => JSON.parse(readFileSync(resolve(casesDir, name, "inputs.json"), "utf8"));
/** A cap table as plain strings, so two can be compared exactly. */
const plain = (ct: CapTable) => JSON.parse(JSON.stringify(ct, (_, v) => (v && typeof v === "object" && "d" in v && "e" in v ? v.toString() : v)));

/**
 * A locked exit case, saved as a file and opened: the page gives the engine
 * exactly the case's cap table and sale date, the same payouts at every
 * breakpoint, and saving it again writes the same file. A case built from its
 * events opens as its rounds, exiting on the table the case names (C2).
 */
function opensExactly(name: string) {
  const inputs = caseInputs(name);
  const { exit } = inputs;
  const contents = inputs.events ? { holders: inputs.holders, events: inputs.events, cap_table_after_event: exit.cap_table_after_event } : { cap_table: exit.cap_table };
  const file = {
    format: "spillpoint", version: 4, name, ...contents, range: exit.range,
    ...(exit.exit_date ? { exit_date: exit.exit_date } : {}),
    ...(exit.payment_schedules ? { payment_schedules: exit.payment_schedules } : {}),
  };
  const opened = readFile(JSON.stringify(file));
  if (!opened.ok) throw new Error(opened.message);
  const expected = inputs.events ? readInputs(inputs) : readExit(exit);
  const built = readExit(buildExit(opened.draft).json);
  expect(plain(built.capTable)).toEqual(plain(expected.capTable));
  expect(built.exitDate).toBe(expected.exitDate);
  expect(JSON.parse(JSON.stringify(built.paymentSchedules ?? null))).toEqual(JSON.parse(JSON.stringify(expected.paymentSchedules ?? null)));
  if (!inputs.events) expect(payoutsAtBreakpoints(buildExit(opened.draft).json)).toEqual(payoutsAtBreakpoints(exit));
  const saved = fileText(opened.name, opened.draft, undefined, opened.rounds);
  const again = readFile(saved);
  expect(again.ok && fileText(again.name, again.draft, undefined, again.rounds)).toBe(saved);
  return opened.draft;
}

describe("SAFEs and notes still outstanding at the sale (M5k)", () => {
  // 12i and 13h (0.3.0 work, 03a), a SAFE and a note with no cap beside capped participating preferred, since 03e.
  // 12j, 13i and 13j, the SAFEs' greater-of last (E20) and SAFEs beside a note (X18), since 05c2.
  const cases = readdirSync(casesDir).filter((name) => /^edge-1[23]/.test(name));
  const fileOf = (name: string) => {
    const exit = JSON.parse(readFileSync(resolve(casesDir, name, "inputs.json"), "utf8")).exit;
    return JSON.stringify({ format: "spillpoint", version: 6, name, cap_table: exit.cap_table, range: exit.range, ...(exit.exit_date ? { exit_date: exit.exit_date } : {}) });
  };

  it("covers every case with a SAFE or a note at a sale: 12 to 12j, and 13a to 13j", () => {
    expect(cases).toHaveLength(20);
  });

  it("refuses a file with a note beside a SAFE with no post-money cap, in plain words (X18)", () => {
    const file = JSON.parse(fileOf("edge-13i-note-beside-a-safe"));
    const safe = file.cap_table.unconverted_safes[0];
    file.cap_table.unconverted_safes[0] = { ...safe, post_money_cap: null, pre_money_cap: safe.post_money_cap };
    const opened = readFile(JSON.stringify(file));
    expect(opened.ok ? "opened" : opened.message).toMatch(/^Its cap table can't be used\. .*A convertible note at a sale alongside a carve-out, or alongside a SAFE unless/);
  });

  // Larkspur's two (12j and 13j) are each a full breakpoint search the size of case 27's.
  it.each(cases)("%s opens as a file, and gives the engine exactly the case's cap table, sale date and payouts", (name) => {
    const draft = opensExactly(name);
    expect(draft.safes.length + draft.notes.length).toBeGreaterThan(0);
  }, FULL_SEARCH_TIMEOUT);

  it("keeps a SAFE's ranking on a cap table built from rounds: its cash is paid with Series A, not the Seed", () => {
    const series = (id: string, name: string) => ({ id, name, kind: "preferred", preference_multiple: "1", participation: "non_participating", cap_multiple: null, anti_dilution: "none" });
    const file = {
      format: "spillpoint", version: 3, name: "Two tiers and a SAFE",
      holders: [{ id: "ana", name: "Ana" }, { id: "s", name: "Seed Fund" }, { id: "a", name: "A Fund" }, { id: "x", name: "X" }],
      events: [
        { id: "founding", date: null, type: "issue", security: { id: "common", name: "Common Stock", kind: "common" }, issues: [{ holder: "ana", shares: "8000000" }] },
        { id: "seed", date: "2022-01-01", type: "priced_round", series: series("seed", "Seed Preferred"), pre_money: "8000000", investments: [{ holder: "s", amount: "2000000" }], seniority: [["seed"]] },
        { id: "series_a", date: "2023-01-01", type: "priced_round", series: series("series_a", "Series A Preferred"), pre_money: "20000000", investments: [{ holder: "a", amount: "4000000" }], seniority: [["series_a"], ["seed"]] },
        { id: "safe", date: "2024-01-01", type: "safes", safes: [{ id: "safe_x", holder: "x", purchase_amount: "1000000", post_money_cap: "40000000", cash_out_ranks_with: "series_a" }] },
      ],
      cap_table_after_event: "safe",
      range: ["0", "10000000"],
    };
    const opened = readFile(JSON.stringify(file));
    if (!opened.ok) throw new Error(opened.message);
    const seriesA = opened.draft.securities.find((s) => s.name === "Series A Preferred")!;
    expect(opened.draft.safes[0]!.ranksWith).toBe(seriesA.key);
    // At $5M the senior tier, A Fund's $4M and X's $1M, is paid in full and the Seed gets nothing.
    // Ranked by default, with the Seed, X would get $333,333.33 and Seed Fund $666,666.67.
    const exit = readExit(buildExit(opened.draft).json);
    const totals = solve(prepare(exit.capTable), new D("5000000")).answers[0]!.payout.holderTotals;
    expect([totals.get("a")!.toFixed(2), totals.get("x")!.toFixed(2), totals.get("s")!.toFixed(2)]).toEqual(["4000000.00", "1000000.00", "0.00"]);
  });

  it("opens rounds whose payouts use a cap table with SAFEs still outstanding, with the SAFEs", () => {
    const file = { ...JSON.parse(fileText("Millrace", millraceTable, undefined, millraceRounds)), cap_table_after_event: "option_pool" };
    const opened = readFile(JSON.stringify(file));
    if (!opened.ok) throw new Error(opened.message);
    const name = (key: string) => opened.draft.holders.find((h) => h.key === key)?.name;
    expect(opened.draft.safes.map((f) => [name(f.holder), f.purchaseAmount, f.cap, f.capAmount])).toEqual([
      ["Priya Shah", "300000", "post", "5000000"],
      ["Marcus Lee", "150000", "post", "5000000"],
    ]);
  });

  it("shows a loaded rate as a percentage, and gives the engine back the same number", () => {
    const file = JSON.parse(fileText("Millrace", millraceTable));
    file.cap_table.unconverted_safes = [{ id: "safe_z", holder: "ana", purchase_amount: "100000", post_money_cap: "50000000", discount: "1/3" }];
    const opened = readFile(JSON.stringify(file));
    if (!opened.ok) throw new Error(opened.message);
    expect(opened.draft.safes[0]!.discount).toMatch(/^33\.3333/);
    const saved = (d: typeof opened.draft) => readExit(buildExit(d).json).capTable.unconvertedSafes![0]!.discount;
    expect(saved(opened.draft).eq(readExit({ cap_table: file.cap_table, range: file.range, exit_values: [] }).capTable.unconvertedSafes![0]!.discount)).toBe(true);
    expect(saved({ ...opened.draft, safes: [{ ...opened.draft.safes[0]!, discount: "20" }] }).toString()).toBe("0.2");
  });
});

describe("warrants and cumulative dividends (M5k2)", () => {
  it.each(["edge-08-preferred-warrant", "edge-09-cumulative-dividends", "edge-09b-compounding-dividends", "edge-09c-dividends-paid-on-conversion", "edge-23-dividends-from-a-round"])(
    "%s opens as a file, and gives the engine exactly the case's cap table, sale date and payouts",
    (name) => {
      const draft = opensExactly(name);
      expect(draft.securities.some((s) => s.kind === "warrant" || (s.kind === "preferred" && s.dividend !== null))).toBe(true);
    },
  );

  it("shows case 9's dividends as a percentage, and case 8's warrant as one for the Seed", () => {
    const nine = opensExactly("edge-09-cumulative-dividends");
    expect(nine.securities.find((s) => s.kind === "preferred")).toMatchObject({ dividend: { rate: "8", method: "simple", accrualStart: "2022-03-31", onConversion: "forfeited" } });
    const eight = opensExactly("edge-08-preferred-warrant");
    const seed = eight.securities.find((s) => s.kind === "preferred")!;
    expect(eight.securities.find((s) => s.kind === "warrant")).toMatchObject({ strike: "0.5", underlying: seed.key });
  });

  it("opens case 22's rounds, with Lender L's warrants for common", () => {
    const inputs = caseInputs("edge-22-warrants-issued");
    const file = { format: "spillpoint", version: 3, name: "Case 22", holders: inputs.holders, events: inputs.events, cap_table_after_event: "series_a", range: ["0", "40000000"] };
    const opened = readFile(JSON.stringify(file));
    if (!opened.ok) throw new Error(opened.message);
    expect(opened.draft.securities.find((s) => s.kind === "warrant")).toMatchObject({ name: "Warrants for Common Stock ($0.5 strike)", strike: "0.5", underlying: "common" });
  });
});

describe("management carve-outs (M5k3)", () => {
  it.each(["edge-10-carve-out", "edge-10b-carve-out-alongside-preferences"])("%s opens as a file, and gives the engine exactly the case's cap table and payouts", (name) => {
    const draft = opensExactly(name);
    expect(draft.carveOut).not.toBeNull();
  });

  it("holds case 10b's carve-out as typed: alongside the preferences, two tiers, 60% to Founder A and 40% to Manager M", () => {
    const draft = opensExactly("edge-10b-carve-out-alongside-preferences");
    const name = (key: string) => draft.holders.find((h) => h.key === key)?.name;
    expect(draft.carveOut!.timing).toBe("alongside_preferences");
    expect(draft.carveOut!.tiers.map((t) => [t.to, t.percent])).toEqual([["10000000", "10"], ["20000000", "5"]]);
    expect(draft.carveOut!.allocation.map((a) => [name(a.holder), a.percent])).toEqual([["Founder A", "60"], ["Manager M", "40"]]);
  });

  it("refuses a carve-out with a field nobody models, in the engine's words", () => {
    const file = JSON.parse(fileText("Millrace", millraceTable));
    file.cap_table.carve_out = { timing: "before_preferences", tiers: [{ from: "0", to: null, percent: "5" }], allocation: [{ holder: "ana", percent: "100" }], vesting: "4 years" };
    const opened = readFile(JSON.stringify(file));
    expect(opened.ok ? null : opened.message).toBe("Its cap table can't be used. file.cap_table.carve_out.vesting: unknown field; the engine reads only timing, tiers, allocation");
  });
});

describe("the sale's terms in a file (M5l)", () => {
  it("opens case 11 with both its payment schedules, exactly", () => {
    const draft = opensExactly("edge-11-earnout");
    expect(draft.schedules.map((x) => [x.fileId, x.payments.map((p) => `${p.label} ${p.amount}`)])).toEqual([
      ["schedule_a", ["closing 2000000", "earnout 3000000"]],
      ["schedule_b", ["closing 10000000", "earnout 10000000"]],
    ]);
  });

  const carve_out = { timing: "before_preferences", tiers: [{ from: "0", to: null, percent: "5" }], allocation: [{ holder: "dev", percent: "100" }] };

  it("keeps a carve-out with the rounds' sale terms, and gives it to the engine as a term of the sale (C6, 0.3.0)", () => {
    const file = { ...JSON.parse(fileText("Millrace", millraceTable, undefined, millraceRounds)), carve_out };
    const opened = readFile(JSON.stringify(file));
    if (!opened.ok) throw new Error(opened.message);
    const json = buildExit(opened.draft).json;
    expect([json.carve_out, json.cap_table.carve_out]).toEqual([carve_out, undefined]);
    expect(JSON.parse(fileText(opened.name, opened.draft, undefined, opened.rounds)).carve_out).toEqual(carve_out);
  });

  it("keeps a carve-out with the sale's terms for a cap table entered directly too (file version 5)", () => {
    const file = { ...JSON.parse(fileText("Millrace", millraceTable)), carve_out };
    const opened = readFile(JSON.stringify(file));
    if (!opened.ok) throw new Error(opened.message);
    const saved = JSON.parse(fileText(opened.name, opened.draft));
    expect(Object.keys(saved)).toEqual(["format", "version", "name", "cap_table", "range", "carve_out"]);
    expect([saved.carve_out, saved.cap_table.carve_out]).toEqual([carve_out, undefined]);
  });

  it("opens a version 4 file with its carve-out in its cap table, moved to the sale's terms (Jordan's answer 1)", () => {
    const v4 = { ...JSON.parse(fileText("Millrace", millraceTable)), version: 4 };
    v4.cap_table.carve_out = carve_out;
    const opened = readFile(JSON.stringify(v4));
    if (!opened.ok) throw new Error(opened.message);
    expect(opened.draft.carveOut!.tiers.map((t) => t.percent)).toEqual(["5"]);
    const saved = JSON.parse(fileText(opened.name, opened.draft));
    expect([saved.version, saved.carve_out, saved.cap_table.carve_out]).toEqual([6, carve_out, undefined]);
    // A version 4 rounds file already kept its carve-out beside the rounds, and opens as it was.
    const rounds = { ...JSON.parse(fileText("Millrace", millraceTable, undefined, millraceRounds)), version: 4, carve_out };
    const reopened = readFile(JSON.stringify(rounds));
    expect(reopened.ok && JSON.parse(fileText(reopened.name, reopened.draft, undefined, reopened.rounds)).carve_out).toEqual(carve_out);
  });

  it("refuses a carve-out in both the cap table and the sale's terms, in the engine's words: which governs would be a guess", () => {
    const file = { ...JSON.parse(fileText("Millrace", millraceTable)), carve_out };
    file.cap_table.carve_out = carve_out;
    const opened = readFile(JSON.stringify(file));
    expect(opened.ok ? null : opened.message).toBe("Its cap table can't be used. file.carve_out: the carve-out is on both the cap table and the exit; give it once");
  });

  it("says which of the sale's terms a rounds file can't use", () => {
    const file = { ...JSON.parse(fileText("Millrace", millraceTable, undefined, millraceRounds)), payment_schedules: [{ id: "s", payments: [] }] };
    const opened = readFile(JSON.stringify(file));
    expect(opened.ok ? null : opened.message).toMatch(/^Its payment schedule can't be used\. file\.payment_schedules\[0\]\.payments: /);
  });

  it("opens a version 3 file, saved before payment schedules, as it was", () => {
    const v3 = { ...JSON.parse(fileText("Millrace", millraceTable, undefined, millraceRounds)), version: 3 };
    const opened = readFile(JSON.stringify(v3));
    expect(opened.ok && opened.draft.schedules).toEqual([]);
  });
});
