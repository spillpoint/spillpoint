// Saved files: what a save writes, that opening it gives back the same cap
// table to the cent, and that a file that can't be read says why.

import examples from "virtual:examples";
import { describe, expect, it } from "vitest";

import { buildExit, draftFromExit, setPrice } from "../src/draft.ts";
import { fileName, fileText, readFile } from "../src/file.ts";
import { exitOf, payoutsAtBreakpoints } from "./payouts.ts";

const millrace = examples[0]!;

describe("saving and opening again", () => {
  for (const example of examples) {
    it(`gives the same breakpoints and the same payouts to the cent at each: ${example.label}`, () => {
      const saved = fileText(example.label, draftFromExit(example.exit));
      const opened = readFile(saved);
      if (!opened.ok) throw new Error(opened.message);
      expect(payoutsAtBreakpoints(buildExit(opened.draft).json)).toEqual(payoutsAtBreakpoints(example.exit));
      // Saving what was opened writes the same file again.
      expect(fileText(opened.name, opened.draft)).toBe(saved);
    });
  }

  it("saves the exact value of a field nobody edited, and what was typed in one that was", () => {
    const draft = draftFromExit(millrace.exit);
    const seriesA = draft.securities.find((s) => s.name === "Series A Preferred")!;
    const securityA = (text: string) => (exitOf(text).cap_table.securities as Record<string, string>[]).find((s) => s.id === "series_a")!;
    // On screen these show as 2.075472 and 1.824752; the file keeps the exact prices.
    expect(securityA(fileText("Millrace", draft))).toMatchObject({
      original_issue_price: "3900000/1879091",
      conversion_price: "348161279317506201440070405000/190799228993502586113800004553",
    });
    const typed = setPrice(draft, seriesA.key, "originalIssuePrice", "2.075472");
    expect(securityA(fileText("Millrace", typed))).toMatchObject({
      original_issue_price: "2.075472",
      conversion_price: "348161279317506201440070405000/190799228993502586113800004553",
    });
  });

  it("writes the agreed format: version 1, a name, the cap table, the range, and the view if there is one", () => {
    const file = JSON.parse(fileText("  Millrace Robotics (fictional) ", draftFromExit(millrace.exit)));
    expect(Object.keys(file)).toEqual(["format", "version", "name", "cap_table", "range"]);
    expect(file).toMatchObject({ format: "spillpoint", version: 1, name: "Millrace Robotics (fictional)", range: ["0", "300000000"] });
    const viewed = JSON.parse(fileText("Millrace", draftFromExit(millrace.exit), { exitValue: "39424995.32", you: "cobalt" }));
    expect(Object.keys(viewed)).toEqual(["format", "version", "name", "cap_table", "range", "view"]);
    expect(viewed.view).toEqual({ exit_value: "39424995.32", you: "cobalt" });
  });

  it("reads the view back exactly, and opens a file without one with none", () => {
    const view = { exitValue: "39424995.32", you: "cobalt" };
    const opened = readFile(fileText("Millrace", draftFromExit(millrace.exit), view));
    expect(opened.ok && opened.view).toEqual(view);
    const plain = readFile(fileText("Millrace", draftFromExit(millrace.exit)));
    expect(plain.ok && plain.view).toBeNull();
  });

  it("names the file after the cap table", () => {
    expect(fileName("Millrace Robotics (fictional)")).toBe("millrace-robotics-fictional.json");
    expect(fileName("Founders' table, v2")).toBe("founders-table-v2.json");
    expect(fileName("  ")).toBe("cap-table.json");
  });
});

describe("a file that can't be opened", () => {
  const good = () => JSON.parse(fileText("Millrace", draftFromExit(millrace.exit)));
  const refusal = (file: unknown) => {
    const opened = readFile(typeof file === "string" ? file : JSON.stringify(file));
    return opened.ok ? null : opened.message;
  };

  it("isn't JSON, or isn't a spillpoint file", () => {
    expect(refusal("{ not json")).toBe("It isn't a spillpoint file: it isn't valid JSON.");
    expect(refusal({ exit: millrace.exit })).toBe('It isn\'t a spillpoint file: spillpoint files start with "format": "spillpoint".');
  });

  it("comes from a newer version, or has no version", () => {
    expect(refusal({ ...good(), version: 2 })).toBe(
      "It was saved by a newer version of spillpoint (file version 2); this page reads files up to version 1. Open it with the newer version.",
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
});
