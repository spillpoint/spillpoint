// The LPs on the page (f02c, notes/plan-fund-page.md, "0.2.0: the LPs"): the LPs tab, with its problems in the page's
// words and pasting from a spreadsheet; the fund-21 refusals, beside their cells and as an opened file's one line; the
// LPs' card on Payouts, its rows held to the cases; the CSV; and saving and opening a fund with LPs.

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App.tsx";
import { readFile } from "../src/file.ts";
import { openFile, status } from "./support/files.ts";

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
const summaryLine = () => document.querySelector(".lps__summary")!.textContent;
const names = () => screen.queryAllByLabelText(/^LP \d+'s name$/).map((e) => (e as HTMLInputElement).value);
const commitments = () => screen.queryAllByLabelText(/^LP \d+'s commitment$/).map((e) => (e as HTMLInputElement).value);
/** The problem under a field: its words, read through the field's own description. */
const problemUnder = (label: string | RegExp) => {
  const field = screen.getByLabelText(label);
  expect(field.getAttribute("aria-invalid"), `${label} is marked`).toBe("true");
  return document.getElementById(field.getAttribute("aria-describedby")!)!.textContent;
};
const saved = async () => JSON.parse(await downloads.at(-1)!.blob.text());
/** The LPs' card's rows: each row's header and its cells, as shown. */
const card = () => screen.queryByRole("region", { name: /^Each LP at / });
const cardRows = () =>
  [...within(card()!).getByRole("table").querySelectorAll("tr")].map((tr) => [...tr.querySelectorAll("th, td")].map((c) => c.textContent));

/** "666666.66" as the page writes it: "$666,666.66". */
const money = (s: string) => {
  const [whole, part] = s.split(".") as [string, string];
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${part}`;
};

describe("the LPs tab", () => {
  it("lists a fund's LPs in the input's order, with the line under the table", () => {
    render(<App />);
    pick("fund-17-lps-three");
    tab("LPs");
    expect(names()).toEqual(["Alder Endowment", "Birchwood Family Office", "Cedar Fund of Funds"]);
    expect(commitments()).toEqual(["$5,000,000", "$3,500,000", "$1,500,000"]);
    expect(summaryLine()).toBe("3 LPs, $10,000,000 committed. Commitments only divide what the LPs get between them; they aren't checked against the calls.");
  });

  it("adds an LP with its name focused, and the card has it at its share", () => {
    render(<App />);
    pick("fund-17-lps-three");
    tab("LPs");
    fireEvent.click(screen.getByRole("button", { name: "Add an LP" }));
    expect(document.activeElement).toBe(screen.getByLabelText("LP 4's name"));
    type("LP 4's name", "Delta Pension");
    type("LP 4's commitment", "2M");
    expect(summaryLine()).toMatch(/^4 LPs, \$12,000,000 committed\. /);
    tab("Payouts");
    expect(cardRows().slice(1, 5).map((r) => [r[0], r[1]])).toEqual([
      ["Alder Endowment", "41.67%"],
      ["Birchwood Family Office", "29.17%"],
      ["Cedar Fund of Funds", "12.50%"],
      ["Delta Pension", "16.67%"],
    ]);
  });

  it("with every LP removed, has no LPs: the line says so, Payouts has no card, and a save writes no lps", async () => {
    render(<App />);
    pick("fund-17-lps-three");
    tab("LPs");
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: "Remove LP 1" }));
    expect(summaryLine()).toBe("No LPs: Payouts shows the LPs together. Add one to see each LP's share.");
    tab("Payouts");
    expect(card()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await saved()).fund).not.toHaveProperty("lps");
  });

  it("words each problem under its cell, says so on Payouts, and Show me goes to the cell", () => {
    render(<App />);
    pick("fund-17-lps-three");
    tab("LPs");
    type("LP 2's name", "  ");
    expect(problemUnder("LP 2's name")).toBe("Write the LP's name.");
    tab("Payouts");
    const notice = screen.getByText(/^Your last change to the LPs has a problem/).closest(".notice")!;
    expect(notice.textContent).toContain("Write the LP's name.");
    fireEvent.click(within(notice as HTMLElement).getByRole("button", { name: "Fix it" }));
    expect(document.activeElement).toBe(screen.getByLabelText("LP 2's name"));
    type("LP 2's name", "Birchwood Family Office");
    for (const commitment of ["lots", "0", "-5", ""]) {
      type("LP 3's commitment", commitment);
      expect(problemUnder("LP 3's commitment"), commitment).toBe("Write a commitment in dollars, more than zero: 5000000 or 5M.");
    }
    type("LP 3's commitment", "1.5M");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("trims a name as it reads it: a repeat once trimmed is refused at the later LP, and the box shows it trimmed once left", async () => {
    render(<App />);
    pick("fund-17-lps-three");
    tab("LPs");
    type("LP 1's name", "Birchwood Family Office ");
    expect(problemUnder("LP 2's name")).toBe("An LP above already has this name; each LP needs its own.");
    type("LP 1's name", "  Alder Endowment  ");
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.blur(screen.getByLabelText("LP 1's name"));
    expect(names()[0]).toBe("Alder Endowment");
    type("LP 2's name", " Birch ");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await saved()).fund.lps.map((lp: { name: string }) => lp.name)).toEqual(["Alder Endowment", "Birch", "Cedar Fund of Funds"]);
  });
});

describe("pasting LPs from a spreadsheet", () => {
  const paste = (text: string) => {
    fireEvent.click(screen.getByRole("button", { name: "Paste rows from a spreadsheet" }));
    fireEvent.change(screen.getByLabelText("The LPs, pasted"), { target: { value: text } });
  };
  const preview = () => document.querySelector(".paste__summary")!.textContent;
  const unread = () => [...document.querySelectorAll(".paste__unread li")].map((li) => li.textContent);

  it("reads name then commitment, skips a header, lists each row it can't read, and adds nothing until Add them", () => {
    render(<App />);
    tab("LPs");
    paste(
      [
        "Name\tCommitment",
        "Alder\t$5,000,000.00",
        "Birch\t3.5M",
        " Cedar \t1500000\t\t\textra",
        "Birch\t1",
        "Delta\t(500,000)",
        "Echo\t$ -",
        "Fox\t",
        "\t5",
        "Golf\tlots",
      ].join("\n"),
    );
    expect(preview()).toBe("3 LPs, $10,000,000 committed; they'll be the table's first.");
    expect(unread()).toEqual([
      "Row 5: 'Birch' is already in this paste, in row 3.",
      "Row 6: '(500,000)' is negative. A commitment is more than zero.",
      "Row 7: '$ -' isn't an amount more than zero.",
      "Row 8: has no commitment.",
      "Row 9: has no name.",
      "Row 10: 'lots' isn't an amount.",
    ]);
    expect(names()).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Add them" }));
    expect(names()).toEqual(["Alder", "Birch", "Cedar"]);
    expect(commitments()).toEqual(["$5,000,000", "$3,500,000", "$1,500,000"]);
  });

  it("adds after the LPs already there, refusing a name the table has, and empty rows give way", () => {
    render(<App />);
    pick("fund-17-lps-three");
    tab("LPs");
    fireEvent.click(screen.getByRole("button", { name: "Add an LP" }));
    paste("Alder Endowment\t1\nDelta\t2000000");
    expect(preview()).toBe("1 LP, $2,000,000 committed; adds them to the 3 here.");
    expect(unread()).toEqual(["Row 1: 'Alder Endowment' is already an LP in the table."]);
    fireEvent.click(screen.getByRole("button", { name: "Add them" }));
    expect(names()).toEqual(["Alder Endowment", "Birchwood Family Office", "Cedar Fund of Funds", "Delta"]);
  });

  it("takes many cells pasted into a cell to the box, and Escape closes it as Cancel does", () => {
    render(<App />);
    pick("fund-17-lps-three");
    tab("LPs");
    fireEvent.paste(screen.getByLabelText("LP 1's name"), { clipboardData: { getData: () => "Delta\t2M\nEcho\t1M\n" } });
    expect((screen.getByLabelText("The LPs, pasted") as HTMLTextAreaElement).value).toBe("Delta\t2M\nEcho\t1M\n");
    expect(names()[0]).toBe("Alder Endowment");
    fireEvent.keyDown(screen.getByLabelText("The LPs, pasted"), { key: "Escape" });
    expect(screen.queryByLabelText("The LPs, pasted")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Paste rows from a spreadsheet" }));
    expect(names()).toHaveLength(3);
  });
});

describe("the fund-21 refusals, in the page's words", () => {
  const dir = "fund-21-lps-refused";
  const fixtures = readdirSync(resolve(casesDir, dir, "fixtures")).sort();
  const fixture = (file: string) => caseFile(`${dir}/fixtures`, file) as { base: string; change: { set: { lps: unknown } } };
  const amounts = 'isn\'t a number the page can use: amounts and rates are exact strings, like "8000000" or "0.2", amounts more than zero and nothing negative.';
  const WORDS: Record<string, string> = {
    "lp-blank-name.json": "The name in row 1 of its LPs isn't a value it can take.",
    "lp-commitment-a-number.json": `The commitment in row 1 of its LPs ${amounts}`,
    "lp-name-not-text.json": "The name in row 1 of its LPs isn't a value it can take.",
    "lp-name-repeated.json": "The name in row 3 of its LPs: an LP above already has this name; each LP needs its own.",
    "lp-negative-commitment.json": `The commitment in row 1 of its LPs ${amounts}`,
    "lp-no-commitment.json": "The commitment in row 2 of its LPs is missing.",
    "lp-no-name.json": "The name in row 1 of its LPs is missing.",
    "lp-not-an-object.json": "Row 1 of its LPs isn't a value it can take.",
    "lp-side-letter-carry.json": "This file has a term the page doesn't model: `carry` on an LP (row 1 of its LPs). An LP's terms are its class's, or the fund's.",
    "lp-zero-commitment.json": `The commitment in row 1 of its LPs ${amounts}`,
    "lps-not-a-list.json": "Its list of LPs isn't a value it can take.",
  };

  it("has words for every fixture", () => {
    expect(Object.keys(WORDS).sort()).toEqual(fixtures);
  });

  it.each(fixtures)("%s, opened as a file, is refused in one line", (file) => {
    const f = fixture(file);
    const result = readFile(JSON.stringify({ ...caseFile(f.base, "inputs.json").fund, lps: f.change.set.lps }));
    expect(result.ok ? "opened" : result.message).toBe(WORDS[file]);
  });

  // The six the form can make: each LP's name and commitment typed into the tab, as the fixture has them.
  const FORM: Record<string, [string, string]> = {
    "lp-no-name.json": ["LP 1's name", "Write the LP's name."],
    "lp-no-commitment.json": ["LP 2's commitment", "Write a commitment in dollars, more than zero: 5000000 or 5M."],
    "lp-blank-name.json": ["LP 1's name", "Write the LP's name."],
    "lp-zero-commitment.json": ["LP 1's commitment", "Write a commitment in dollars, more than zero: 5000000 or 5M."],
    "lp-negative-commitment.json": ["LP 1's commitment", "Write a commitment in dollars, more than zero: 5000000 or 5M."],
    "lp-name-repeated.json": ["LP 3's name", "An LP above already has this name; each LP needs its own."],
  };

  it.each(Object.keys(FORM))("%s, typed into the LPs tab, shows beside its cell", async (file) => {
    const f = fixture(file);
    render(<App />);
    await openFile(caseText(f.base), "inputs.json");
    tab("LPs");
    (f.change.set.lps as { name?: string; commitment?: string }[]).forEach((lp, i) => {
      fireEvent.click(screen.getByRole("button", { name: "Add an LP" }));
      type(`LP ${i + 1}'s name`, lp.name ?? "");
      type(`LP ${i + 1}'s commitment`, lp.commitment ?? "");
    });
    const [cell, words] = FORM[file]!;
    expect(problemUnder(cell)).toBe(words);
  });
});

describe("the LPs' card on Payouts", () => {
  /** Each LP's row as the card should show it: the case's exact amount, rounded down to the cent. */
  const down = (exact: string) => {
    const [num, den = "1"] = exact.split("/") as [string, string?];
    const [whole, frac = ""] = num.split(".") as [string, string?];
    const cents = (BigInt(whole + frac) * 100n) / (BigInt(den) * 10n ** BigInt(frac.length));
    return money(`${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`);
  };

  it("shows case 17 at $40,000,000 as the case does, each LP rounded down, then the leftover and the total", () => {
    render(<App />);
    pick("fund-17-lps-three");
    const expected = caseFile("fund-17-lps-three", "expected.json");
    const p = expected.points.find((q: { x: string }) => q.x === "40000000.00");
    expect(screen.getByRole("heading", { name: "Each LP at $40,000,000" })).toBeDefined();
    const rows = cardRows();
    expect(rows[0]).toEqual(["LP", "Share", "Paid in", "This distribution", "To date"]);
    expect(rows.slice(1, 4)).toEqual(
      expected.lps.map((lp: { name: string; paid_in: { exact: string } }, i: number) => [
        lp.name,
        ["50.00%", "35.00%", "15.00%"][i],
        down(lp.paid_in.exact),
        down(p.by_lp[i].distribution.exact),
        down(p.by_lp[i].to_date.exact),
      ]),
    );
    expect(rows[4]).toEqual(["Left over from rounding down", "—", "$0.00", "$0.00", "$0.00"]);
    expect(rows[5]).toEqual(["Total", "100%", money(expected.lps_paid_in), money(p.distribution.lps.total), money(p.to_date.lps.total)]);
    expect(card()!.textContent).toContain("Each LP's amount is rounded down to the cent, as it would be paid; the leftover row is what rounding down leaves.");
    // The split's line points to the card for each LP's amount as paid.
    expect(screen.getByRole("region", { name: /^The split at/ }).textContent).toContain("each LP's amount, rounded down as it would be paid, is in the card below");
  });

  it("has a column for each LP's share of the clawback when the split is final and something is owed: case 19 at $0", () => {
    render(<App />);
    pick("fund-19-lps-clawback");
    const rows = cardRows();
    expect(rows[0]!.at(-1)).toBe("Share of the clawback");
    expect(rows.slice(1).map((r) => [r[0], r.at(-1)])).toEqual([
      ["Alder Endowment", "$1,925,000.00"],
      ["Birchwood Family Office", "$825,000.00"],
      ["Left over from rounding down", "$0.00"],
      ["Total", "$2,750,000.00"],
    ]);
  });

  it("follows the NAV split at NAV, its clawback included, for a fund that isn't final", async () => {
    render(<App />);
    const fund = { ...caseFile("fund-19-lps-clawback", "inputs.json").fund, final: false, nav: "10000000" };
    await openFile(JSON.stringify(fund), "nav.json");
    type(/^Distribution on/, "12000000");
    expect(cardRows()[0]!.at(-1)).toBe("To date");
    fireEvent.click(screen.getByRole("button", { name: "Set X to NAV" }));
    expect(cardRows()[0]!.at(-1)).toBe("Share of the clawback");
    expect(cardRows()[1]!.at(-1)).toBe("$525,000.00");
  });

  it("isn't there for a fund without LPs", () => {
    render(<App />);
    expect(card()).toBeNull();
    expect(screen.getByRole("region", { name: /^The split at/ }).textContent).toContain('"The LPs" is every LP together, not one payment');
  });

  it("downloads as CSV, named after the fund, X and D: case 18 at $2,000,000", async () => {
    render(<App />);
    await openFile(caseText("fund-18-lps-thirds"), "inputs.json");
    type(/^Distribution on/, "2000000");
    expect(cardRows().slice(1).map((r) => r.slice(0, 3))).toEqual([
      ["Alder", "33.33%", "$1,666,666.66"],
      ["Birch", "33.33%", "$1,666,666.66"],
      ["Cedar", "33.33%", "$1,666,666.66"],
      ["Left over from rounding down", "—", "$0.02"],
      ["Total", "100%", "$5,000,000.00"],
    ]);
    fireEvent.click(within(card()!).getByRole("button", { name: "Download as CSV" }));
    const file = downloads.at(-1)!;
    expect(file.name).toBe("fund-18-lps-thirds-lps-at-2000000-on-2026-03-01.csv");
    expect(file.blob.type).toBe("text/csv;charset=utf-8");
    // The byte-order mark first, so Excel reads the file as UTF-8.
    expect([...new Uint8Array(await file.blob.arrayBuffer()).slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = (await file.blob.text()).replace(/^﻿/, "");
    expect(text.split("\r\n").slice(1, 6)).toEqual([
      "Alder,33.33%,1666666.66,666666.66,666666.66",
      "Birch,33.33%,1666666.66,666666.66,666666.66",
      "Cedar,33.33%,1666666.66,666666.66,666666.66",
      "Left over from rounding down,,0.02,0.02,0.02",
      "Total,100%,5000000.00,2000000.00,2000000.00",
    ]);
    expect(status()).toBe("Downloaded as fund-18-lps-thirds-lps-at-2000000-on-2026-03-01.csv, in your downloads.");
  });
});

describe("saving and opening a fund with LPs", () => {
  it("saves the LPs in fund.lps, as the case has them", async () => {
    render(<App />);
    pick("fund-17-lps-three");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await saved()).fund.lps).toEqual(caseFile("fund-17-lps-three", "inputs.json").fund.lps);
  });

  it("trims a file's LP names as it opens it, so a name with spaces opens and saves trimmed", async () => {
    render(<App />);
    const fund = { ...caseFile("fund-01-one-call", "inputs.json").fund, lps: [{ name: " Alder\t", commitment: "1000000" }] };
    await openFile(JSON.stringify(fund), "spaces.json");
    expect(status()).toBe("Opened spaces.json.");
    tab("LPs");
    expect(names()).toEqual(["Alder"]);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await saved()).fund.lps).toEqual([{ name: "Alder", commitment: "1000000" }]);
  });

  it("refuses a file whose names repeat once trimmed, and keeps the fund it had", async () => {
    render(<App />);
    const fund = { ...caseFile("fund-01-one-call", "inputs.json").fund, lps: [{ name: "Alder", commitment: "1" }, { name: "Alder ", commitment: "1" }] };
    await openFile(JSON.stringify(fund), "twice.json");
    expect(status()).toBe("Couldn't open twice.json. The name in row 2 of its LPs: an LP above already has this name; each LP needs its own.");
    expect((screen.getByLabelText("Start from") as HTMLSelectElement).value).toBe("fund-03-gp-commitment");
  });
});
