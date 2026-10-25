// Classes and later closes on the page (f03c, notes/plan-fund-page.md, "0.3.0: classes and later closes"): the two
// rates on Terms; the classes and each LP's class and close on LPs, with their problems in the page's words; the
// fund-27 refusals, beside their cells and as an opened file's one line; pasting the two new columns; saving and
// opening; and Payouts' classes card, clawback by class, the LPs' Class column and the equalization card.

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { D, findBreakpoints, readFund } from "spillpoint-fund";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App.tsx";
import { readFile } from "../src/file.ts";
import { classesInput, lpsFrom, lpsInput } from "../src/lps.ts";
import { controlFor } from "../src/terms.ts";
import { RUN_CASES } from "./support/cases.ts";

const casesDir = resolve(import.meta.dirname, "../../../packages/fund/cases");
const caseText = (dir: string) => readFileSync(resolve(casesDir, dir, "inputs.json"), "utf8");
const caseFile = (dir: string, file: string) => JSON.parse(readFileSync(resolve(casesDir, dir, file), "utf8"));

// Saving and downloading make a file: kept here instead, with the name it was given.
let downloads: { name: string; blob: Blob }[] = [];
let lastBlob: Blob | null = null;
beforeEach(() => {
  downloads = [];
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: (blob: Blob) => ((lastBlob = blob), "blob:made") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: () => {} });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ name: this.download, blob: lastBlob! });
  });
});
afterEach(() => vi.restoreAllMocks());

const pick = (id: string) => fireEvent.change(screen.getByLabelText("Start from"), { target: { value: id } });
const tab = (name: string) => fireEvent.click(screen.getByRole("tab", { name }));
const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
/** A picker set to the option with this text: the LPs' class pickers hold a class by its row, not its name. */
const choose = (label: string | RegExp, text: string) => {
  const select = screen.getByLabelText(label) as HTMLSelectElement;
  const option = [...select.options].find((o) => o.textContent === text);
  expect(option, `${text} in ${label}`).toBeDefined();
  fireEvent.change(select, { target: { value: option!.value } });
};
const chosen = (label: string | RegExp) => (screen.getByLabelText(label) as HTMLSelectElement).selectedOptions[0]!.textContent;
const value = (label: string | RegExp) => (screen.getByLabelText(label) as HTMLInputElement).value;
const status = () => document.querySelector(".file-status")?.textContent;
const save = () => fireEvent.click(screen.getByRole("button", { name: "Save" }));
const saved = async () => JSON.parse(await downloads.at(-1)!.blob.text());
/** The problem under a field: its words, read through the field's own description. */
const problemUnder = (label: string | RegExp) => {
  const field = screen.getByLabelText(label);
  expect(field.getAttribute("aria-invalid"), `${label} is marked`).toBe("true");
  return document.getElementById(field.getAttribute("aria-describedby")!)!.textContent;
};
async function openFile(text: string, name = "inputs.json") {
  fireEvent.change(screen.getByLabelText("Open a saved fund"), { target: { files: [new File([text], name, { type: "application/json" })] } });
  await vi.waitFor(() => expect(status()).toMatch(/^(Opened|Couldn't open) /));
}
/** A card's table, as shown: each row's header and cells. The one table, not the copy measured out of sight. */
const rowsOf = (table: Element) => [...table.querySelectorAll("tr")].map((tr) => [...tr.querySelectorAll("th, td")].map((c) => c.textContent));
const card = (name: string | RegExp) => screen.queryByRole("region", { name });
const cardTable = (name: string | RegExp) => rowsOf(within(card(name)!).getAllByRole("table")[0]!);
/** The split's row labels, as shown. */
const splitLabels = () => within(within(card(/^The split at/)!).getByRole("table")).getAllByRole("rowheader").map((h) => h.textContent);
const headlineTerms = () => document.querySelector(".headline__terms")!.textContent;
const cards = () => [...document.querySelectorAll("#panel-payouts section[aria-labelledby], #panel-payouts section[aria-label]")].filter((s) => s.parentElement!.closest("section") === null).map((s) => s.getAttribute("aria-label") ?? document.getElementById(s.getAttribute("aria-labelledby")!)!.textContent);

describe("the forms round trip with classes and closes", () => {
  it.each(RUN_CASES)("%s: the LPs tab writes the case's classes and LPs back exactly, with the same breakpoints", (dir) => {
    const input = caseFile(dir, "inputs.json").fund;
    const fund = readFund(input);
    const { lp_classes: _, ...terms } = input.terms;
    const again = readFund({ ...input, terms: { ...terms, ...classesInput(lpsFrom(fund)) }, lps: undefined, ...lpsInput(lpsFrom(fund)) });
    const exactly = (f: typeof fund) => JSON.parse(JSON.stringify({ classes: f.terms.lpClasses, lps: f.lps }, (_, v) => (v instanceof D ? v.toString() : v)));
    expect(exactly(again)).toEqual(exactly(fund));
    expect(findBreakpoints(again).map((b) => b.x.toString())).toEqual(findBreakpoints(fund).map((b) => b.x.toString()));
  });
});

describe("the Terms tab's two rates", () => {
  it("start blank, and blank leaves them out of a saved file", async () => {
    render(<App />);
    tab("Terms");
    expect([value("Management fee rate"), value("Equalization interest rate")]).toEqual(["", ""]);
    expect(screen.getByText("Needed only when a class has its own fee rate. It divides the fee calls between the classes.")).toBeDefined();
    expect(screen.getByText("Needed when an LP joins at a later close; 0 for none.")).toBeDefined();
    save();
    const terms = (await saved()).fund.terms;
    expect(terms).not.toHaveProperty("fee_rate");
    expect(terms).not.toHaveProperty("equalization_rate");
  });

  it("show case 26's as percents, and save them as the case has them, 0% of equalization kept", async () => {
    render(<App />);
    pick("fund-26-closes-and-classes");
    tab("Terms");
    expect([value("Management fee rate"), value("Equalization interest rate")]).toEqual(["2", "6"]);
    type("Equalization interest rate", "0");
    save();
    expect((await saved()).fund.terms).toMatchObject({ fee_rate: "0.02", equalization_rate: "0" });
  });
});

describe("the LPs tab's classes", () => {
  it("lists case 26's class and each LP's class and close, with the line under the classes", () => {
    render(<App />);
    pick("fund-26-closes-and-classes");
    tab("LPs");
    expect([value("Class 1's name"), value("Class 1's fee rate"), chosen("Class 1's carry"), value("Class 1's carry rate")]).toEqual(["Friends and family", "0", "Flat", "0"]);
    expect([1, 2, 3].map((n) => [chosen(`LP ${n}'s class`), value(`LP ${n}'s close`)])).toEqual([
      ["Fund terms", ""],
      ["Fund terms", "2022-04-01"],
      ["Friends and family", "2022-10-01"],
    ]);
    expect(screen.getByText("A class changes only the fee rate and the carry; the pref, the catch-up and the GP commitment are the fund's.")).toBeDefined();
  });

  it("has no Class column without classes, and a Close column always", () => {
    render(<App />);
    pick("fund-17-lps-three");
    tab("LPs");
    expect(screen.queryByLabelText("LP 1's class")).toBeNull();
    expect(value("LP 1's close")).toBe("");
    expect(screen.queryByLabelText("Class 1's name")).toBeNull();
  });

  it("adds a class with its name focused, on the fund's carry; renaming it keeps its LPs; removing it moves them to Fund terms and says so", async () => {
    render(<App />);
    pick("fund-26-closes-and-classes");
    tab("LPs");
    fireEvent.click(screen.getByRole("button", { name: "Add a class" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Class 2's name"));
    expect(chosen("Class 2's carry")).toBe("The fund's carry");
    // A class with no name yet is its row in the pickers.
    choose("LP 1's class", "Class 2");
    type("Class 2's name", "Anchor");
    expect(chosen("LP 1's class")).toBe("Anchor");
    type("Class 2's name", "Anchor LPs");
    expect(chosen("LP 1's class")).toBe("Anchor LPs");
    save();
    const fund = (await saved()).fund;
    expect(fund.terms.lp_classes).toEqual([{ name: "Friends and family", fee_rate: "0", carry: "0" }, { name: "Anchor LPs" }]);
    expect(fund.lps[0]).toEqual({ name: "Alder Endowment", commitment: "5000000", class: "Anchor LPs" });
    fireEvent.click(screen.getByRole("button", { name: "Remove class 1" }));
    expect(chosen("LP 3's class")).toBe("Fund terms");
    expect(screen.getByRole("status", { name: "" }).textContent).toBe("Removed Friends and family: Cedar Holdings moves to Fund terms.");
    // The line goes at the next change.
    type("LP 2's name", "Birchwood");
    expect(screen.queryByText(/^Removed /)).toBeNull();
  });

  it("says each LP a removed class moved, and nothing when it had none", () => {
    render(<App />);
    pick("fund-26-closes-and-classes");
    tab("LPs");
    choose("LP 1's class", "Friends and family");
    fireEvent.click(screen.getByRole("button", { name: "Remove class 1" }));
    expect(screen.getByText(/^Removed /).textContent).toBe("Removed Friends and family: Alder Endowment and Cedar Holdings move to Fund terms.");
    fireEvent.click(screen.getByRole("button", { name: "Add a class" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove class 1" }));
    expect(screen.queryByText(/^Removed /)).toBeNull();
    expect(screen.queryByLabelText("LP 1's class")).toBeNull();
  });

  it("starts a class's own carry from the fund's, flat or in steps, and keeps what was typed for a way back", async () => {
    render(<App />);
    pick("fund-17-lps-three");
    tab("LPs");
    fireEvent.click(screen.getByRole("button", { name: "Add a class" }));
    type("Class 1's name", "Seed");
    choose("Class 1's carry", "In steps");
    // Case 17's steps: 20%, then 25% from 3x and 30% from 5x.
    expect([value("Class 1, step 1's carry rate"), value("Class 1, step 2's carry rate"), value("Class 1, step 2 starts from an LP multiple of")]).toEqual(["20", "25", "3"]);
    type("Class 1, step 1's carry rate", "15");
    choose("Class 1's carry", "Flat");
    expect(value("Class 1's carry rate")).toBe("15");
    choose("Class 1's carry", "The fund's carry");
    expect(screen.queryByLabelText("Class 1's carry rate")).toBeNull();
    choose("Class 1's carry", "Flat");
    expect(value("Class 1's carry rate")).toBe("15");
    save();
    expect((await saved()).fund.terms.lp_classes).toEqual([{ name: "Seed", carry: "0.15" }]);
  });

  it("trims a class's name as it reads it, so an LP's class and a saved file have it trimmed", async () => {
    render(<App />);
    pick("fund-17-lps-three");
    tab("LPs");
    fireEvent.click(screen.getByRole("button", { name: "Add a class" }));
    type("Class 1's name", "  Seed ");
    choose("LP 2's class", "Seed");
    fireEvent.blur(screen.getByLabelText("Class 1's name"));
    expect(value("Class 1's name")).toBe("Seed");
    save();
    const fund = (await saved()).fund;
    expect([fund.terms.lp_classes, fund.lps[1].class]).toEqual([[{ name: "Seed" }], "Seed"]);
  });
});

describe("the fund-27 refusals, in the page's words", () => {
  const dir = "fund-27-classes-refused";
  const fixtures = readdirSync(resolve(casesDir, dir, "fixtures")).sort();
  const fixture = (file: string) => caseFile(`${dir}/fixtures`, file) as { base: string; change: { set?: Record<string, unknown>; del?: string } };
  const amounts = 'isn\'t a number the page can use: amounts and rates are exact strings, like "8000000" or "0.2", amounts more than zero and nothing negative.';
  const WORDS: Record<string, string> = {
    "class-blank-name.json": "The name in row 1 of its LP classes isn't a value it can take.",
    "class-carry-not-below-catch-up.json": "The carry in row 1 of its LP classes: the GP's share of the catch-up must be above the first carry rate, or the catch-up never ends.",
    "class-carry-not-below-one.json": "The carry in row 1 of its LP classes: a carry rate must be below 100%.",
    "class-carry-steps-out-of-order.json": "Carry step 2 in row 1 of its LP classes: carry steps need rising rates, each from a higher LP multiple above 1.0x, and none on the first step.",
    "class-fee-rate-negative.json": `The fee rate in row 1 of its LP classes ${amounts}`,
    "class-fee-rate-without-fund-rate.json": "Its management fee rate is missing: it's needed when a class has its own fee rate.",
    "class-name-repeated.json": "The name in row 2 of its LP classes: a class above already has this name; each class needs its own.",
    "class-no-name.json": "The name in row 1 of its LP classes is missing.",
    "class-not-an-object.json": "Row 1 of its LP classes isn't a value it can take.",
    "class-own-pref.json": "This file has a term the page doesn't model: `pref` on an LP class (row 1 of its LP classes). A class changes only the fee rate and the carry.",
    "classes-not-a-list.json": "Its list of LP classes isn't a value it can take.",
    "equalization-rate-negative.json": `Its equalization interest rate ${amounts}`,
    "fee-call-without-payers.json": "Row 2 of its cash flows: no LP in the fund on this date pays this call, as none had closed yet or none of them pays fees.",
    "first-call-without-payers.json": "Row 1 of its cash flows: no LP in the fund on this date pays this call, as none had closed yet or none of them pays fees.",
    "fund-fee-rate-zero.json": 'Its management fee rate isn\'t a number the page can use: it\'s a rate above 0, written as an exact string like "0.02".',
    "later-close-without-rate.json": "Its equalization interest rate is missing: it's needed when an LP joins at a later close.",
    "lp-class-not-text.json": "The class in row 3 of its LPs isn't a value it can take.",
    "lp-class-unknown.json": "The class in row 3 of its LPs: this LP's class isn't one of the fund's classes.",
    "lp-close-after-distribution.json": "The close in row 3 of its LPs: an LP's close must come before the fund's first distribution.",
    "lp-close-bad-date.json": "The close in row 3 of its LPs isn't a date that exists, written YYYY-MM-DD.",
  };

  /** The fixture's change, made to its base's input: `set` and `del` at dotted paths with [i], appending at a list's end (FC12). */
  function changed(file: string): unknown {
    const f = fixture(file);
    const input = structuredClone(caseFile(f.base, "inputs.json").fund);
    const steps = (path: string) => path.split(/\.|\[(\d+)\]/).filter((s) => s !== undefined && s !== "").map((s) => (/^\d+$/.test(s) ? Number(s) : s));
    const walk = (path: string) => {
      const keys = steps(path);
      let at: Record<string | number, unknown> = input;
      for (const k of keys.slice(0, -1)) at = at[k] as Record<string | number, unknown>;
      return [at, keys.at(-1)!] as const;
    };
    for (const [path, v] of Object.entries(f.change.set ?? {})) {
      const [at, key] = walk(path);
      at[key] = v;
    }
    if (f.change.del) {
      const [at, key] = walk(f.change.del);
      delete at[key];
    }
    return input;
  }

  it("has words for every fixture", () => {
    expect(Object.keys(WORDS).sort()).toEqual(fixtures);
  });

  it.each(fixtures)("%s, opened as a file, is refused in one line", (file) => {
    const result = readFile(JSON.stringify(changed(file)));
    expect(result.ok ? "opened" : result.message).toBe(WORDS[file]);
  });

  // The fourteen the form can make, each made on its base's tabs as the fixture has it, and where its words show.
  const FORM: Record<string, { make: () => void; under: string; words: string }> = {
    "class-blank-name.json": { make: () => (tab("LPs"), type("Class 1's name", "  ")), under: "Class 1's name", words: "Write the class's name." },
    "class-no-name.json": { make: () => (tab("LPs"), type("Class 1's name", "")), under: "Class 1's name", words: "Write the class's name." },
    "class-carry-not-below-catch-up.json": {
      make: () => {
        tab("Terms");
        fireEvent.click(screen.getByRole("radio", { name: "Partial" }));
        type("The GP's share", "50");
        tab("LPs");
        type("Class 1's carry rate", "50");
      },
      under: "Class 1's carry rate",
      words: "This class's carry rate must be below the GP's share of the catch-up, 50%, or its catch-up never ends.",
    },
    "class-carry-not-below-one.json": { make: () => (tab("LPs"), type("Class 1's carry rate", "100")), under: "Class 1's carry rate", words: "A carry rate must be below 100%." },
    "class-carry-steps-out-of-order.json": {
      make: () => {
        tab("LPs");
        choose("Class 1's carry", "In steps");
        type("Class 1, step 1's carry rate", "20");
        fireEvent.click(screen.getByRole("button", { name: "Add a step to class 1's carry" }));
        type("Class 1, step 2's carry rate", "15");
        type("Class 1, step 2 starts from an LP multiple of", "3");
      },
      under: "Class 1, step 2's carry rate",
      words: "This step's rate must be above 20%, the rate of the step before it.",
    },
    "class-fee-rate-negative.json": {
      make: () => (tab("LPs"), type("Class 1's fee rate", "-1")),
      under: "Class 1's fee rate",
      words: "Write the class's fee rate as a percent, 0 or more: 0 or 1.5; or leave it blank for the fund's fees.",
    },
    "class-fee-rate-without-fund-rate.json": { make: () => (tab("Terms"), type("Management fee rate", "")), under: "Management fee rate", words: "Needed: a class has its own fee rate." },
    "class-name-repeated.json": {
      make: () => {
        tab("LPs");
        fireEvent.click(screen.getByRole("button", { name: "Add a class" }));
        type("Class 2's name", "Friends and family");
        choose("Class 2's carry", "Flat");
        type("Class 2's carry rate", "10");
      },
      under: "Class 2's name",
      words: "A class above already has this name; each class needs its own.",
    },
    "equalization-rate-negative.json": {
      make: () => (tab("Terms"), type("Equalization interest rate", "-8")),
      under: "Equalization interest rate",
      words: "Write the equalization interest rate as a percent a year, 0 or more: 8 or 0.",
    },
    "fee-call-without-payers.json": {
      make: () => {
        tab("LPs");
        choose("LP 1's class", "Friends and family");
        choose("LP 2's class", "Friends and family");
        tab("Cash flows");
      },
      under: "Row 2's date",
      words: "No LP in the fund on this date pays this call: none had closed yet, or none of them pays fees.",
    },
    "first-call-without-payers.json": {
      make: () => {
        tab("LPs");
        type("LP 1's close", "2021-02-01");
        type("LP 2's close", "2021-02-01");
        tab("Cash flows");
      },
      under: "Row 1's date",
      words: "No LP in the fund on this date pays this call: none had closed yet, or none of them pays fees.",
    },
    "fund-fee-rate-zero.json": { make: () => (tab("Terms"), type("Management fee rate", "0")), under: "Management fee rate", words: "Write the management fee rate as a percent, above 0: 2 or 1.5." },
    "later-close-without-rate.json": {
      make: () => (tab("Terms"), type("Equalization interest rate", "")),
      under: "Equalization interest rate",
      words: "Needed: an LP joins at a later close. Write 0 for none.",
    },
    "lp-close-after-distribution.json": {
      make: () => (tab("LPs"), type("LP 3's close", "2024-07-01")),
      under: "LP 3's close",
      words: "An LP's close must come before the fund's first distribution.",
    },
  };

  it("makes fourteen in the form; the other six only a file can make", () => {
    expect(Object.keys(FORM)).toHaveLength(14);
    expect(fixtures.filter((f) => !(f in FORM))).toEqual([
      "class-not-an-object.json",
      "class-own-pref.json",
      "classes-not-a-list.json",
      "lp-class-not-text.json",
      "lp-class-unknown.json",
      "lp-close-bad-date.json",
    ]);
  });

  it.each(Object.keys(FORM))("%s, made in the form, shows beside its cell, and its tab says so", async (file) => {
    const f = fixture(file);
    render(<App />);
    await openFile(caseText(f.base));
    const { make, under, words } = FORM[file]!;
    make();
    expect(problemUnder(under)).toBe(words);
    // The form's refusal is at the fixture's path: the words shown are the ones for the control that path names.
    const field = caseFile(dir, "expected.json").fixtures[file].refused.field as string;
    expect(screen.getByLabelText(under).getAttribute("aria-describedby")).toBe(`${controlFor(field)}-problem`);
    tab("Payouts");
    expect(screen.getByText(/^Your last change to the/).closest(".notice")!.textContent).toContain(words);
  });
});

describe("pasting LPs with a class and a close", () => {
  const paste = (text: string) => {
    fireEvent.click(screen.getByRole("button", { name: "Paste rows from a spreadsheet" }));
    fireEvent.change(screen.getByLabelText("The LPs, pasted"), { target: { value: text } });
  };
  const preview = () => document.querySelector(".paste__summary")!.textContent;
  const unread = () => [...document.querySelectorAll(".paste__unread li")].map((li) => li.textContent);

  it("reads a class by its name, trimmed, and a close as the cash flows' dates, with the rows it can't read", () => {
    render(<App />);
    pick("fund-26-closes-and-classes");
    tab("LPs");
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: "Remove LP 1" }));
    paste(
      [
        "Name\tCommitment\tClass\tClose",
        "Alder\t5M\t\t",
        "Birch\t2.5M\tFund terms\t1 Apr 2022",
        "Cedar\t2.5M\t Friends and family \t2022-10-01",
        "Delta\t1M\tFriends & family\t",
        "Echo\t1M\t\tQ3 2021",
      ].join("\n"),
    );
    expect(preview()).toBe("3 LPs, $10,000,000 committed, 1 in a class and 2 with a close; they'll be the table's first.");
    expect(unread()).toEqual(["Row 5: 'Friends & family' isn't one of the fund's classes.", "Row 6: 'Q3 2021' isn't a date."]);
    fireEvent.click(screen.getByRole("button", { name: "Add them" }));
    expect([1, 2, 3].map((n) => [value(`LP ${n}'s name`), chosen(`LP ${n}'s class`), value(`LP ${n}'s close`)])).toEqual([
      ["Alder", "Fund terms", ""],
      ["Birch", "Fund terms", "2022-04-01"],
      ["Cedar", "Friends and family", "2022-10-01"],
    ]);
  });

  it("asks which comes first when the closes could be read either way, and says how they were read", () => {
    render(<App />);
    pick("fund-26-closes-and-classes");
    tab("LPs");
    paste("Delta\t1M\t\t4/1/2022\nEcho\t1M\t\t5/2/2022");
    expect(screen.getByRole("group", { name: "Which comes first in this paste's dates?" })).toBeDefined();
    expect(screen.getByText("Dates read month first, as chosen above.")).toBeDefined();
    fireEvent.click(screen.getByRole("radio", { name: /^Day first/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add them" }));
    expect([value("LP 4's close"), value("LP 5's close")]).toEqual(["2022-01-04", "2022-02-05"]);
  });

  it("settles the order from a close that reads only one way, as the cash flows' paste does", () => {
    render(<App />);
    pick("fund-26-closes-and-classes");
    tab("LPs");
    paste("Delta\t1M\t\t4/1/2022\nEcho\t1M\t\t25/1/2022");
    expect(screen.queryByRole("group", { name: "Which comes first in this paste's dates?" })).toBeNull();
    expect(screen.getByText("Dates read day first, as 25/1/2022 in row 2 can only be read that way.")).toBeDefined();
  });
});

describe("saving and opening classes and closes", () => {
  it("opens case 26's file into the tabs, and saves its rates, classes, classes and closes back as the case has them", async () => {
    render(<App />);
    await openFile(caseText("fund-26-closes-and-classes"));
    expect(status()).toBe("Opened inputs.json.");
    save();
    const fund = (await saved()).fund;
    const input = caseFile("fund-26-closes-and-classes", "inputs.json").fund;
    expect([fund.terms.fee_rate, fund.terms.equalization_rate, fund.terms.lp_classes, fund.lps]).toEqual([
      input.terms.fee_rate,
      input.terms.equalization_rate,
      input.terms.lp_classes,
      input.lps,
    ]);
  });

  it("opens a fund whose classes' and closes' fields are null or empty, and saves it without them", async () => {
    const base = caseFile("fund-17-lps-three", "inputs.json").fund;
    const none = {
      ...base,
      terms: { ...base.terms, fee_rate: null, equalization_rate: null, lp_classes: [] },
      lps: base.lps.map((lp: object) => ({ ...lp, class: null, close: null })),
    };
    render(<App />);
    await openFile(JSON.stringify(none));
    expect(status()).toBe("Opened inputs.json.");
    save();
    const fund = (await saved()).fund;
    expect(Object.keys(fund.terms).sort()).toEqual(Object.keys(base.terms).sort());
    expect(Object.keys(fund.terms)).not.toContain("lp_classes");
    expect(fund.lps).toEqual(base.lps);
  });

  it("trims a file's class names and LPs' classes, so 'Seed ' and 'Seed' are one class", async () => {
    const base = caseFile("fund-28-classes-clawback-steps", "inputs.json").fund;
    const spaced = { ...base, terms: { ...base.terms, lp_classes: [{ name: "Seed LPs ", carry: "0.15" }] }, lps: [base.lps[0], { ...base.lps[1], class: " Seed LPs" }] };
    render(<App />);
    await openFile(JSON.stringify(spaced));
    expect(status()).toBe("Opened inputs.json.");
    save();
    const fund = (await saved()).fund;
    expect([fund.terms.lp_classes, fund.lps[1].class]).toEqual([[{ name: "Seed LPs", carry: "0.15" }], "Seed LPs"]);
  });
});

describe("Payouts with classes and later closes", () => {
  it("has case 26's cards in order at $5,200,000: the classes card after the split, the equalization card after the LPs'", () => {
    render(<App />);
    pick("fund-26-closes-and-classes");
    expect((screen.getByLabelText(/^Distribution on/) as HTMLInputElement).value).toBe("$5,200,000");
    expect(cards()).toEqual([
      "The answer",
      "The distribution",
      "Who gets what as X grows",
      "The split at $5,200,000",
      "Each class at $5,200,000",
      "Each LP at $5,200,000",
      "Equalization at the later closes",
      "Breakpoints",
    ]);
    expect(headlineTerms()).toBe("Carry 20%; no pref; no GP commitment. Friends and family: carry 0%, no fees.");
  });

  it("names each carry row's class with two or more accounts: case 28", async () => {
    render(<App />);
    await openFile(caseText("fund-28-classes-clawback-steps"));
    expect(splitLabels()).toEqual(["Capital", "Fund terms: carry at 20% (up to 2.0x)", "Fund terms: carry at 30% (above 2.0x)", "Seed LPs: carry at 15%", "Total"]);
    expect(headlineTerms()).toBe("Carry 20% and 30% from 2.0x; no pref; no GP commitment. Seed LPs: carry 15%.");
  });

  it("labels the carry from the split's own steps, unnamed, when every LP is in one class, with no classes card", async () => {
    const base = caseFile("fund-28-classes-clawback-steps", "inputs.json").fund;
    render(<App />);
    await openFile(JSON.stringify({ ...base, lps: base.lps.map((lp: object) => ({ ...lp, class: "Seed LPs" })) }));
    expect(splitLabels()).toEqual(["Capital", "Carry at 15%", "Total"]);
    expect(card(/^Each class at/)).toBeNull();
    expect(cardTable(/^Each LP at/)[0]).toEqual(["LP", "Class", "Share", "Paid in", "This distribution", "To date", "Share of the clawback"]);
  });

  it("gives each class's owed under the fund's in the clawback card: case 28 at $0", async () => {
    render(<App />);
    await openFile(caseText("fund-28-classes-clawback-steps"));
    const clawback = card("The clawback")!;
    expect(clawback.querySelector(".clawback__sentence")!.textContent).toBe(
      "If this is the fund's last distribution, the GP has been paid $4,225,000.00 of carry, has earned $1,850,000.00 on the fund's totals, and owes $2,375,000.00 back to the LPs.",
    );
    expect(rowsOf(within(clawback).getByRole("table", { name: "Owed back by class, each on its own totals" })).slice(0)).toEqual([
      ["Fund terms", "$1,925,000.00"],
      ["Seed LPs", "$450,000.00"],
    ]);
    expect(clawback.querySelector(".card__intro")!.textContent).toMatch(/one run of the waterfall for each class, on its own totals\.$/);
    expect(cardTable(/^Each class at/).map((r) => [r[0], r.at(-1)])).toEqual([
      ["Class", "Owed back"],
      ["Fund terms", "$1,925,000.00"],
      ["Seed LPs", "$450,000.00"],
    ]);
  });

  it("follows the NAV split at NAV in the classes card, its Owed back with it: case 22", async () => {
    render(<App />);
    await openFile(caseText("fund-22-classes-fee-carry"));
    expect(cardTable(/^Each class at/)[0]!.at(-1)).toBe("LP multiple");
    fireEvent.click(screen.getByRole("button", { name: "Set X to NAV" }));
    expect(cardTable(/^Each class at/)[0]!.at(-1)).toBe("Owed back");
  });

  it("has a Class column in the LPs' card, blank for Fund terms, and in its CSV after the name: case 26", async () => {
    render(<App />);
    pick("fund-26-closes-and-classes");
    expect(cardTable(/^Each LP at/).map((r) => r.slice(0, 2))).toEqual([
      ["LP", "Class"],
      ["Alder Endowment", ""],
      ["Birchwood Family Office", ""],
      ["Cedar Holdings", "Friends and family"],
      ["Left over from rounding down", ""],
      ["Total", ""],
    ]);
    fireEvent.click(within(card(/^Each LP at/)!).getByRole("button", { name: "Download as CSV" }));
    const text = (await downloads.at(-1)!.blob.text()).replace(/^﻿/, "");
    expect(text.split("\r\n").slice(0, 4)).toEqual([
      "LP,Class,Share,Paid in,This distribution,To date",
      "Alder Endowment,,50.00%,2666666.66,2600000.00,2600000.00",
      "Birchwood Family Office,,25.00%,1333333.33,1300000.00,1300000.00",
      "Cedar Holdings,Friends and family,25.00%,1250000.00,1300000.00,1300000.00",
    ]);
  });

  it("shows case 26's equalization card over both closes as Jordan gave it, and downloads it as CSV", async () => {
    render(<App />);
    pick("fund-26-closes-and-classes");
    const eq = card("Equalization at the later closes")!;
    expect(eq.querySelector(".card__intro")!.textContent).toBe("Interest at 6% a year, simple, on the days from each call to the close (Actual/365).");
    const blocks = within(eq).getAllByRole("region");
    expect(blocks.map((b) => b.querySelector("h3")!.textContent)).toEqual(["1 Apr 2022: Birchwood Family Office joins", "1 Oct 2022: Cedar Holdings joins", "All the closes together"]);
    expect(rowsOf(within(blocks[2]!).getAllByRole("table")[0]!)).toEqual([
      ["LP", "Paid in", "Got back", "Interest paid", "Interest received"],
      ["Alder Endowment", "$0.00", "$1,533,333.33", "$0.00", "$32,876.71"],
      ["Birchwood Family Office", "$700,000.00", "$416,666.66", "$10,356.16", "$11,260.27"],
      ["Cedar Holdings", "$1,250,000.00", "$0.00", "$33,780.82", "$0.00"],
      ["Left over from rounding down", "$0.00", "$0.01", "$0.01", "$0.01"],
      ["Total", "$1,950,000.00", "$1,950,000.00", "$44,136.99", "$44,136.99"],
    ]);
    expect(eq.textContent).toContain("Equalization is outside the waterfall: it moves money between LPs at each close and changes nothing above.");
    fireEvent.click(within(eq).getByRole("button", { name: "Download as CSV" }));
    const file = downloads.at(-1)!;
    expect(file.name).toBe("two-later-closes-and-a-friends-and-family-class-equalization.csv");
    expect(status()).toBe("Downloaded as two-later-closes-and-a-friends-and-family-class-equalization.csv, in your downloads.");
    const lines = (await file.blob.text()).replace(/^﻿/, "").split("\r\n");
    expect(lines.slice(-6)).toEqual([
      "All closes,Alder Endowment,0.00,1533333.33,0.00,32876.71",
      "All closes,Birchwood Family Office,700000.00,416666.66,10356.16,11260.27",
      "All closes,Cedar Holdings,1250000.00,0.00,33780.82,0.00",
      "All closes,Left over from rounding down,0.00,0.01,0.01,0.01",
      "All closes,Total,1950000.00,1950000.00,44136.99,44136.99",
      "",
    ]);
  });

  it("has no equalization card without a later close, and no classes card with one account: case 25's one close, case 17", async () => {
    render(<App />);
    pick("fund-17-lps-three");
    expect(card("Equalization at the later closes")).toBeNull();
    await openFile(caseText("fund-25-later-close"));
    expect(card(/^Each class at/)).toBeNull();
    expect(within(card("Equalization at the later closes")!).getAllByRole("region").map((b) => b.querySelector("h3")!.textContent)).toEqual([
      "15 Jul 2021: Cedar Holdings joins",
      "All the closes together",
    ]);
  });
});
