// Saved files: what a save writes, that opening it gives back the same cap
// table to the cent, and that a file that can't be read says why. Millrace is
// built from its rounds, so its file keeps the rounds (version 2, M4i).

import examples from "virtual:examples";
import { D } from "spillpoint";
import { describe, expect, it } from "vitest";

import { buildExit, setPrice } from "../src/draft.ts";
import { fileName, fileText, readFile } from "../src/file.ts";
import { exampleContents } from "../src/rounds.ts";
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

  it("writes the agreed format: version 2, a name, the rounds or the cap table, the range, and the view if there is one", () => {
    const built = JSON.parse(fileText("  Millrace Robotics (fictional) ", millraceTable, undefined, millraceRounds));
    expect(Object.keys(built)).toEqual(["format", "version", "name", "holders", "events", "cap_table_after_event", "range"]);
    expect(built).toMatchObject({ format: "spillpoint", version: 2, name: "Millrace Robotics (fictional)", cap_table_after_event: "series_b", range: ["0", "300000000"] });
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
    expect(refusal({ ...good(), version: 3 })).toBe(
      "It was saved by a newer version of spillpoint (file version 3); this page reads files up to version 2. Open it with the newer version.",
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

  it("uses a term the engine doesn't model yet, and says when it will", () => {
    const file = good();
    file.cap_table.securities.push({ id: "w1", name: "Warrant", kind: "warrant" });
    expect(refusal(file)).toBe(
      "Its cap table can't be used. file.cap_table.securities[8]: Warrants (w1). The engine supports this from M5; until then it refuses the input rather than ignoring the term.",
    );
  });

  it("has both a cap table and rounds, or rounds without the event the payouts use", () => {
    expect(refusal({ ...withRounds(), cap_table: good().cap_table })).toBe("It has both a cap table and the events that build one; a file has one or the other.");
    const { cap_table_after_event: _after, ...noAfter } = withRounds();
    expect(refusal(noAfter)).toBe("Its rounds need the holders, the events, and the event whose cap table the payouts use.");
  });

  it("has rounds the engine can't build, or an exit on a cap table with SAFEs still outstanding, in the engine's words", () => {
    expect(refusal({ ...withRounds(), cap_table_after_event: "series_c" })).toBe("Its rounds can't be built. exit.cap_table_after_event: no event series_c in inputs.events");
    expect(refusal({ ...withRounds(), cap_table_after_event: "option_pool" })).toBe(
      "Its rounds can't be built. exit.cap_table_after_event: SAFEs still outstanding at exit: safe_priya, safe_marcus. The engine supports this from M5; until then it refuses the input rather than ignoring the term.",
    );
    const file = withRounds();
    file.events[5].investments[0].amount = "a lot";
    expect(refusal(file)).toBe('Its rounds can\'t be built. inputs.events[5].investments[0].amount: "a lot" is not an exact number (an integer, a decimal, or "a/b")');
  });
});
