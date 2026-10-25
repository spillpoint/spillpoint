// Open and save (plan step 7, f01l): a saved file is the input the two tabs write, so the fund in the form is the fund
// in the file; only a fund the engine accepts is saved; a file the page can't use is refused in one line, the current
// fund kept; and unsaved changes are asked about before they're lost.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { D, findBreakpoints, readFund } from "spillpoint-fund";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App.tsx";
import { fileName, readFile } from "../src/file.ts";
import { RUN_CASES } from "./support/cases.ts";

const casesDir = resolve(import.meta.dirname, "../../../packages/fund/cases");
const caseText = (dir: string) => readFileSync(resolve(casesDir, dir, "inputs.json"), "utf8");
const caseFile = (dir: string, file: string) => JSON.parse(readFileSync(resolve(casesDir, dir, file), "utf8"));

/** A fund's values as the engine reads them, every amount as its exact string, and its breakpoints. */
const valuesOf = (input: unknown) => {
  const fund = readFund(input);
  return {
    fund: JSON.parse(JSON.stringify(fund, (_, v) => (v instanceof D ? v.toString() : v))),
    breakpoints: findBreakpoints(fund).map((b) => b.x.toString()),
  };
};

// Saving downloads the file: kept here instead, with the name it was given.
let downloads: { name: string; blob: Blob }[] = [];
let lastBlob: Blob | null = null;
beforeEach(() => {
  downloads = [];
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: (blob: Blob) => ((lastBlob = blob), "blob:saved") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: () => {} });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ name: this.download, blob: lastBlob! });
  });
});
afterEach(() => vi.restoreAllMocks());

const saved = async () => JSON.parse(await downloads.at(-1)!.blob.text());
const save = () => fireEvent.click(screen.getByRole("button", { name: "Save" }));
const status = () => document.querySelector(".file-status")?.textContent;
const pickerText = () => (screen.getByLabelText("Start from") as HTMLSelectElement).selectedOptions[0]!.textContent;
const xBox = () => (screen.getByLabelText(/^Distribution on/) as HTMLInputElement).value;
const notSaved = () => screen.queryByText("Not saved") !== null;
const answer = () => screen.getByRole("region", { name: "The answer" }).querySelector(".headline__answer")!.textContent;
async function openFile(text: string, name: string) {
  fireEvent.change(screen.getByLabelText("Open a saved fund"), { target: { files: [new File([text], name, { type: "application/json" })] } });
  await vi.waitFor(() => expect(status()).toMatch(/^(Opened|Couldn't open) /));
}
const tab = (name: string) => fireEvent.click(screen.getByRole("tab", { name }));
const set = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("the fund in the form is the fund in the file", () => {
  it.each(RUN_CASES)("%s: its inputs.json opens, named by its case id, and saves back with the same values", async (dir) => {
    render(<App />);
    await openFile(caseText(dir), "inputs.json");
    expect(status()).toBe("Opened inputs.json.");
    expect(pickerText()).toBe(`${dir}, opened from inputs.json`);
    // No view: X opens at $0.
    expect(xBox()).toBe("$0");
    save();
    expect(status()).toBe(`Saved as ${dir}.json, in your downloads.`);
    const file = await saved();
    expect([file.format, file.version, file.name, file.view]).toEqual(["spillpoint-fund", 1, dir, { x: "0" }]);
    expect(valuesOf(file.fund)).toEqual(valuesOf(caseFile(dir, "inputs.json").fund));
  });
});

describe("saving and opening", () => {
  it("saves the clawback example at $15,000,000; a term changed, the saved file brings back its terms and X", async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Start from"), { target: { value: "fund-19-lps-clawback" } });
    set(/^Distribution on/, "15000000");
    // Moving X isn't a change.
    expect(notSaved()).toBe(false);
    save();
    expect(downloads.map((d) => d.name)).toEqual(["a-late-call-a-clawback-and-two-lps.json"]);
    expect(status()).toBe("Saved as a-late-call-a-clawback-and-two-lps.json, in your downloads.");
    const text = await downloads[0]!.blob.text();
    const file = JSON.parse(text);
    expect([file.name, file.view]).toEqual(["A late call, a clawback and two LPs", { x: "15000000" }]);
    expect(valuesOf(file.fund)).toEqual(valuesOf(caseFile("fund-19-lps-clawback", "inputs.json").fund));

    tab("Terms");
    set("Step 1's carry rate", "25");
    expect(notSaved()).toBe(true);
    expect(pickerText()).toBe("An example, with your changes");
    // "Open a file" asks first, with changes unsaved.
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: "Open a file" }));
    expect(confirm).toHaveBeenCalledWith("Open a file? Your unsaved changes to this fund will be lost.");

    await openFile(text, "a-late-call-a-clawback-and-two-lps.json");
    expect(status()).toBe("Opened a-late-call-a-clawback-and-two-lps.json.");
    expect(pickerText()).toBe("A late call, a clawback and two LPs, opened from a-late-call-a-clawback-and-two-lps.json");
    expect((screen.getByLabelText("Step 1's carry rate") as HTMLInputElement).value).toBe("20");
    expect(notSaved()).toBe(false);
    tab("Payouts");
    expect(xBox()).toBe("$15,000,000");
    expect(answer()).toBe("If $15M on 1 Jan 2025 is the last distribution, the GP ends with $5M of carry: it gets $1M now and gives back $750K.");
  });

  it("opens case 11's inputs.json as case 11: its breakpoints", async () => {
    render(<App />);
    await openFile(caseText("fund-11-clawback-pref"), "inputs.json");
    expect(pickerText()).toBe("fund-11-clawback-pref, opened from inputs.json");
    const xs = within(screen.getByRole("region", { name: "Breakpoints" }))
      .getAllByRole("button")
      .map((b) => b.querySelector(".breakpoints__value")!.firstChild!.textContent!.trim().replace(/[$,]/g, ""));
    expect(xs).toEqual(caseFile("fund-11-clawback-pref", "expected.json").breakpoints.map((b: { x: string }) => b.x));
  });

  it('names the file after the fund\'s name, which a blank fund starts as "My fund"', async () => {
    render(<App />);
    tab("Terms");
    expect((screen.getByLabelText("Name of this fund") as HTMLInputElement).value).toBe("A fund: 20% carry and a 2% GP commitment");
    set("Name of this fund", "Acme Fund II");
    expect(notSaved()).toBe(true);
    save();
    expect(downloads.map((d) => d.name)).toEqual(["acme-fund-ii.json"]);
    expect((await saved()).name).toBe("Acme Fund II");
    expect(notSaved()).toBe(false);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.change(screen.getByLabelText("Start from"), { target: { value: "blank" } });
    expect((screen.getByLabelText("Name of this fund") as HTMLInputElement).value).toBe("My fund");
    expect(fileName("My fund")).toBe("my-fund.json");
  });

  it("asks before leaving the page with unsaved changes, and not once they're saved", () => {
    render(<App />);
    const leave = () => {
      const e = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    };
    expect(leave()).toBe(false);
    tab("Terms");
    set("Carry rate", "25");
    expect(leave()).toBe(true);
    save();
    expect(leave()).toBe(false);
  });
});

describe("only a fund the engine accepts is saved", () => {
  it("doesn't save a blank fund with a blank amount, and says why", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Start from"), { target: { value: "blank" } });
    tab("Cash flows");
    set("As of", "2025-01-01");
    set("Row 1's date", "2020-01-01");
    save();
    expect(downloads).toEqual([]);
    expect(status()).toBe(
      "Not saved: the cash flows have a problem to fix first. Write an amount in dollars, more than zero: 250000 or 250000.50.",
    );
  });

  it("doesn't save terms with a problem, and says which tab", () => {
    render(<App />);
    tab("Terms");
    set("Carry rate", "100");
    save();
    expect(downloads).toEqual([]);
    expect(status()).toBe("Not saved: the terms have a problem to fix first. A carry rate must be below 100%.");
  });
});

describe("a file the page can't use is refused in one line, the current fund kept", () => {
  /** Case 8's input, written as a saved fund file. */
  const savedFund = (fund: unknown, extra: Record<string, unknown> = {}) =>
    JSON.stringify({ format: "spillpoint-fund", version: 1, name: "A fund", fund, view: { x: "40000000" }, ...extra });
  const case8 = () => caseFile("fund-08-carry-steps", "inputs.json").fund;

  it("refuses a term the page doesn't model, in plain words, and keeps the fund it had", async () => {
    render(<App />);
    const before = [pickerText(), answer()];
    await openFile(savedFund({ ...case8(), terms: { ...case8().terms, hurdle_irr: "0.08" } }), "hurdle.json");
    expect(status()).toBe("Couldn't open hurdle.json. This file has a term the page doesn't model: hurdle_irr.");
    expect(document.querySelector(".file-status code")!.textContent).toBe("hurdle_irr");
    expect([pickerText(), answer()]).toEqual(before);
  });

  it("refuses a cap table saved from the main page, and says where to open it", async () => {
    render(<App />);
    await openFile(JSON.stringify({ format: "spillpoint", version: 7, name: "Millrace Robotics", cap_table: {}, range: ["0", "1"] }), "millrace.json");
    expect(status()).toBe("Couldn't open millrace.json. This is a cap table file. Open it on the main page.");
  });

  it("refuses each other file it can't use, naming the row or term", () => {
    const refused = (text: string) => {
      const r = readFile(text);
      return r.ok ? "opened" : r.message;
    };
    const flows = case8().cash_flows;
    expect(refused("{ not json")).toBe("It isn't a fund file: it isn't valid JSON.");
    expect(refused(savedFund(case8(), { version: 2 }))).toBe("It was made by a newer spillpoint (file version 2); this page reads files up to version 1.");
    expect(refused(savedFund(case8(), { version: "one" }))).toBe("Its version number is missing or unreadable, so it's not clear how to read it.");
    expect(refused(savedFund(case8(), { notes: "x" }))).toBe("It has a field this page doesn't read: notes.");
    expect(refused(JSON.stringify({ format: "something", fund: case8() }))).toBe('It isn\'t a fund file: its format is "something", not "spillpoint-fund".');
    expect(refused(JSON.stringify({ hello: "world" }))).toMatch(/^It isn't a fund file: a fund file starts with "format": "spillpoint-fund"/);
    expect(refused(savedFund({ ...case8(), cash_flows: flows.map((f: object, i: number) => (i === 4 ? { ...f, date: "2020-06-01" } : f)) }))).toBe(
      "Row 5 of its cash flows: this distribution is before the fund's first call.",
    );
    expect(refused(savedFund({ ...case8(), cash_flows: flows.map((f: object, i: number) => (i === 1 ? { ...f, amount: "lots" } : f)) }))).toBe(
      'The amount in row 2 of its cash flows isn\'t a number the page can use: amounts and rates are exact strings, like "8000000" or "0.2", amounts more than zero and nothing negative.',
    );
    expect(refused(savedFund({ ...case8(), terms: { carry: "1" } }))).toBe("Its carry: a carry rate must be below 100%.");
    expect(refused(savedFund({ ...case8(), terms: { pref: { rate: "0.08", compounding: "annual" } } }))).toBe(
      "This file has a term the page doesn't model: a pref compounded, not simple (`terms.pref.compounding`).",
    );
    expect(refused(savedFund(case8(), { view: { x: 40000000 } }))).toBe('Its X isn\'t readable: it should be an amount from 0 up, written as a string, like "15000000".');
    expect(refused(savedFund(case8(), { view: { x: "-1" } }))).toBe('Its X isn\'t readable: it should be an amount from 0 up, written as a string, like "15000000".');
  });

  it("says when a file's fractions are kept to 40 digits, and a save writes them that way", async () => {
    render(<App />);
    const fund = { ...case8(), cash_flows: case8().cash_flows.map((f: object, i: number) => (i === 3 ? { ...f, amount: "10000000/3" } : f)) };
    await openFile(savedFund(fund), "frac.json");
    expect(status()).toBe("Opened frac.json. Its fractions, like 10000000/3, are kept to 40 digits, and a save writes them that way.");
    save();
    expect((await saved()).fund.cash_flows[3].amount).toBe("3333333.333333333333333333333333333333333");
    // The engine read the fraction to 40 digits, so the values are the same as the file's.
    expect(valuesOf((await saved()).fund)).toEqual(valuesOf(fund));
    // A file with none says nothing more.
    await openFile(savedFund(case8()), "plain.json");
    expect(status()).toBe("Opened plain.json.");
  });

  it('opens a bare input as "My fund", and a saved file\'s X', () => {
    const bare = readFile(JSON.stringify(case8()));
    expect(bare.ok && [bare.name, bare.x]).toEqual(["My fund", null]);
    const file = readFile(savedFund(case8()));
    expect(file.ok && [file.name, file.x!.toString()]).toEqual(["A fund", "40000000"]);
  });
});
