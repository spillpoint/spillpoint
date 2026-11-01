// Opening an OCX workbook, clicked through in a simulated browser (0.6.0, 06g): each OCX case, written as an .xlsx
// from its workbook.json, shows its report first, asks each term the workbook leaves open, and only then opens. Each
// locked case written as OCX, answered as its expected.json says, pays as that case does. A refused workbook, or a
// refusal at Use, offers the summary to share, with nothing from the workbook in it but counts and codes.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OcxWorkbook } from "spillpoint";

import { App } from "../src/App.tsx";
import { ocxReportLines } from "../src/ocxImport.ts";
import { exitOf, lockedMillraceExit, payoutsAtBreakpoints } from "./payouts.ts";
import type { PayoutsAtBreakpoints } from "./payouts.ts";
import { applyOcxChange } from "../../../packages/engine/test/support/ocx.ts";
import type { OcxFixture } from "../../../packages/engine/test/support/ocx.ts";
import { xlsxOf } from "./workbooks.ts";

type Json = Record<string, unknown>;
const cases = resolve(import.meta.dirname, "../../../cases");
const read = <T,>(path: string): T => JSON.parse(readFileSync(resolve(cases, path), "utf8")) as T;
const workbookOf = (name: string) => read<OcxWorkbook>(`${name}/workbook.json`);
const fixtureWorkbook = (dir: string, name: string) => {
  const f = read<OcxFixture>(`${dir}/fixtures/${name}`);
  return applyOcxChange(workbookOf(f.base) as never, f.change) as unknown as OcxWorkbook;
};
const xlsx = (book: OcxWorkbook, name: string) => new File([xlsxOf(book) as Uint8Array<ArrayBuffer>], name, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
const upload = (files: File[]) => fireEvent.change(screen.getByLabelText(/Open a cap table export/), { target: { files } });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const review = () => screen.findByRole("region", { name: /^Importing / });
const group = (name: string | RegExp) => screen.getByRole("group", { name });
const choose = (question: string | RegExp, choice: string | RegExp) => fireEvent.click(within(group(question)).getByRole("radio", { name: choice }));
const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

let downloads: Blob[];
let copied: string[];
beforeEach(() => {
  downloads = [];
  copied = [];
  let made: Blob | null = null;
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: (blob: Blob) => ((made = blob), "blob:saved") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: () => {} });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => void downloads.push(made!));
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => void copied.push(text) } });
});
afterEach(() => vi.restoreAllMocks());

const WORKBOOK_CASES = readdirSync(cases).filter((d) => d.startsWith("ocx-") && existsSync(resolve(cases, d, "workbook.json")));

// The page reads what xlsxOf writes exactly as the case gives it, so a test on the .xlsx is a test on the case.
it.each(WORKBOOK_CASES)("%s's workbook, written as an .xlsx, reads back exactly", async (name) => {
  const { readXlsx } = await import("../src/xlsx.ts");
  expect(await readXlsx(xlsxOf(workbookOf(name)))).toEqual(workbookOf(name));
});

describe.each(WORKBOOK_CASES)("%s, from an .xlsx", (name) => {
  it("shows the report first, named for the workbook, and asks each blank", async () => {
    const expected = read<{ result: { to_fill: unknown[]; report: { notes: unknown[] } } }>(`${name}/expected.json`).result;
    render(<App />);
    upload([xlsx(workbookOf(name), `${name}.xlsx`)]);
    const panel = await review();
    expect(within(panel).getByRole("heading", { level: 2 }).textContent).toBe(`Importing ${name}`);
    // Nothing is used yet.
    expect(screen.queryByRole("tab", { name: "Payouts" })).toBeNull();
    // A line for each note, none of them a bare code.
    const lines = within(panel).getAllByRole("listitem").filter((li) => li.closest(".import__lines"));
    expect(lines).toHaveLength(expected.report.notes.length);
    for (const li of lines) expect(li.textContent, li.textContent ?? "").not.toMatch(/^[a-z_]+( \(|$)/);
    if (expected.to_fill.length > 0) expect(within(panel).getByRole("heading", { name: "What OCX leaves open" })).toBeTruthy();
  });
});

/** Answers a locked case's blanks on the page as its expected.json gives them (C18), seniority by the choice it needs. */
function answerLocked(expected: { answers: { security?: string; field: string; value: unknown }[]; result: { cap_table: Json } }) {
  const securities = (expected.result.cap_table as { securities: Json[] }).securities;
  for (const a of expected.answers) {
    if (a.field === "strike") {
      const s = securities.find((x) => x.id === a.security)!;
      choose(`Do all the ${s.kind === "option" ? "options" : "warrants"} in "${String(s.name)}" have the same strike?`, "Yes, one strike");
      type(`The strike for "${String(s.name)}", a share`, String(a.value));
    } else if (a.field === "seniority") {
      const tiers = a.value as string[][];
      const question = "Which series is paid first at a sale?";
      if (tiers.length === 1) choose(question, /^All pari passu/);
      else if (tiers.every((t) => t.length === 1)) choose(question, /^Stacked, latest round senior/);
      else {
        choose(question, "Arrange them by hand");
        for (const [i, tier] of tiers.entries()) {
          for (const id of tier) {
            const s = securities.find((x) => x.id === id)!;
            const select = within(group(question)).getByRole("combobox", { name: `${String(s.name)}'s tier` });
            fireEvent.change(select, { target: { value: String(i + 1) } });
          }
        }
      }
    }
  }
}

/** A payout comparison with the locked case's ids in place of the import's (C18's `renamed`). */
function renamedKeys(p: PayoutsAtBreakpoints, renamed: Record<string, string>): PayoutsAtBreakpoints {
  const back = new Map(Object.entries(renamed).map(([locked, imported]) => [imported, locked]));
  const keys = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [back.get(k) ?? k, v]));
  return { breakpoints: p.breakpoints, payouts: Object.fromEntries(Object.entries(p.payouts).map(([x, v]) => [x, { holders: keys(v.holders), classes: keys(v.classes) }])) };
}

const LOCKED = WORKBOOK_CASES.filter((name) => "locked_case" in read<Json>(`${name}/expected.json`));

describe.each(LOCKED)("%s, answered on the page", (name) => {
  it("opens, and pays as its locked case does, to the cent", async () => {
    const expected = read<{ locked_case: string; renamed: Record<string, string>; answers: { security?: string; field: string; value: unknown }[]; result: { cap_table: Json } }>(
      `${name}/expected.json`,
    );
    render(<App />);
    upload([xlsx(workbookOf(name), `${name}.xlsx`)]);
    await review();
    answerLocked(expected);
    click("Use this cap table");
    expect(await screen.findByText(`Imported ${name} from ${name}.xlsx. It isn't saved yet: Save keeps it as a spillpoint file.`)).toBeTruthy();
    click("Save");
    const saved = await downloads[0]!.text();
    const locked =
      expected.locked_case === "millrace"
        ? (lockedMillraceExit() as Json)
        : { ...read<{ exit: Json }>(`${expected.locked_case}/inputs.json`).exit, exit_values: [] };
    const ours = payoutsAtBreakpoints({ ...exitOf(saved), range: locked.range });
    expect(renamedKeys(ours, expected.renamed)).toEqual(payoutsAtBreakpoints(locked));
  });
});

describe("Hollis Mill's questions (ocx-06)", () => {
  const open = async () => {
    render(<App />);
    upload([xlsx(workbookOf("ocx-06-hollis-mill"), "hollis-mill.xlsx")]);
    return review();
  };

  it.each([
    ["options", "Common Stock Options"],
    ["warrants", "Warrants for Common Stock"],
  ])("asks whether a column of %s has one strike before its strike, and says at once that no stops it (OX14)", async (what, column) => {
    await open();
    const question = `Do all the ${what} in "${column}" have the same strike?`;
    const stop =
      `"${column}" holds ${what} at more than one strike, and spillpoint can read only one strike for a column, so it can't import this workbook. ` +
      "Enter the cap table by hand instead, or export it with each strike in a column of its own.";
    // The strike isn't asked until the column is said to have one.
    expect(screen.queryByLabelText(`The strike for "${column}", a share`)).toBeNull();
    choose(question, "No, more than one");
    // Said under the question as soon as "No" is picked, before anything else is filled in.
    expect(within(group(question)).getByRole("alert").textContent).toBe(stop);
    click("Use this cap table");
    expect(screen.getAllByRole("alert").map((a) => a.textContent)).toEqual([stop, stop]);
    expect(screen.queryByRole("tab", { name: "Payouts" })).toBeNull();
  });

  it("requires seniority, which starts with no order set (0.6.0 plan, answer 7)", async () => {
    await open();
    for (const radio of within(group("Which series is paid first at a sale?")).getAllByRole("radio")) expect((radio as HTMLInputElement).checked).toBe(false);
    click("Use this cap table");
    expect(within(group("Which series is paid first at a sale?")).getByText("Choose one.")).toBeTruthy();
  });

  it("fills every blank in from the answers: strikes, the note's terms, seniority, and the sale's date", async () => {
    await open();
    choose('Do all the options in "Common Stock Options" have the same strike?', "Yes, one strike");
    type('The strike for "Common Stock Options", a share', "0.1");
    choose('Do all the options in "Non-Plan Awards" have the same strike?', "Yes, one strike");
    type('The strike for "Non-Plan Awards", a share', "0.25");
    choose('Do all the warrants in "Warrants for Common Stock" have the same strike?', "Yes, one strike");
    type('The strike for "Warrants for Common Stock", a share', "0.5");
    const note = 'The note "Convertible notes, $8,000,000 cap, 20% discount (1)"';
    type(`${note}: simple interest (% a year)`, "6");
    type(`${note}: when was it issued?`, "2024-01-15");
    choose(`${note}: what does its cap divide by?`, "The company's shares, options and unissued pool");
    type(`${note}: repayment multiple at a sale`, "1.5");
    choose("Which series is paid first at a sale?", /^Stacked, latest round senior: Series A Preferred, then Series Seed Preferred/);
    type("When is the sale?", "2026-06-30");
    click("Use this cap table");
    await screen.findByText(/^Imported hollis-mill from hollis-mill.xlsx/);
    click("Save");
    const ct = exitOf(await downloads[0]!.text()).cap_table as Json & { securities: Json[]; unconverted_notes: Json[] };
    expect(ct.securities.filter((s) => s.kind === "option" || s.kind === "warrant").map((s) => [s.id, s.strike])).toEqual([
      ["options_1", "0.1"], ["options_2", "0.25"], ["warrants_1", "0.5"],
    ]);
    expect(ct.unconverted_notes[0]).toMatchObject({ interest_rate: "0.06", issue_date: "2024-01-15", conversion_base: "with_pool", repayment_multiple: "1.5" });
    expect(ct.seniority).toEqual([["series_a_preferred"], ["series_seed_preferred"]]);
  });
});

// 10f: the first real Carta export, 0.4/0.5, had no `Participating (Y/N)`. Without a participation column, the review
// says so and asks each preferred series' participation; answered, it opens as the workbook with the column does (OX14).
describe("Hollis Mill without a participation column (10f)", () => {
  const cell = (address: string, text: string) => ({ address, kind: "text" as const, text, formula: false });
  const removed = (column: string) => [6, 7, 8].map((row) => ({ op: "clear" as const, tab: "Context", address: `${column}${row}` }));
  it.each([
    ["without Participating (Y/N)", removed("H"), "Participating (Y/N)"],
    ["without Participation Cap", removed("I"), "Participation Cap"],
    ["with Participating (Y/N) renamed", [{ op: "set" as const, tab: "Context", cell: cell("H6", "Participating") }], "Participating (Y/N)"],
  ])("%s: says so, asks each preferred series' participation, and opens with the answers", async (_, change, column) => {
    render(<App />);
    upload([xlsx(applyOcxChange(workbookOf("ocx-06-hollis-mill") as never, change) as unknown as OcxWorkbook, "hollis-mill.xlsx")]);
    const panel = await review();
    expect(within(panel).getByText(`The workbook's Financing History has no "${column}" column, so whether each preferred series participates is asked for below.`)).toBeTruthy();
    for (const series of ["Series Seed Preferred", "Series A Preferred"]) {
      for (const radio of within(group(`Does ${series} participate?`)).getAllByRole("radio")) expect((radio as HTMLInputElement).checked, series).toBe(false);
    }
    choose("Does Series Seed Preferred participate?", /^Non-participating/);
    choose("Does Series A Preferred participate?", "Participating, with a cap");
    type("Series A Preferred's participation cap, as a multiple of its issue price", "3");
    for (const [what, column, strike] of [["options", "Common Stock Options", "0.1"], ["options", "Non-Plan Awards", "0.25"], ["warrants", "Warrants for Common Stock", "0.5"]]) {
      choose(`Do all the ${what} in "${column}" have the same strike?`, "Yes, one strike");
      type(`The strike for "${column}", a share`, strike!);
    }
    const note = 'The note "Convertible notes, $8,000,000 cap, 20% discount (1)"';
    type(`${note}: simple interest (% a year)`, "6");
    type(`${note}: when was it issued?`, "2024-01-15");
    choose(`${note}: what does its cap divide by?`, "The company's shares, options and unissued pool");
    type(`${note}: repayment multiple at a sale`, "1.5");
    choose("Which series is paid first at a sale?", /^Stacked, latest round senior/);
    type("When is the sale?", "2026-06-30");
    click("Use this cap table");
    await screen.findByText(/^Imported hollis-mill from hollis-mill.xlsx/);
    click("Save");
    const ct = exitOf(await downloads[0]!.text()).cap_table as Json & { securities: Json[] };
    // As the workbook with both columns reads: Seed non-participating, Series A capped at 3x.
    const want = read<{ result: { cap_table: { securities: Json[] } } }>("ocx-06-hollis-mill/expected.json").result.cap_table.securities.filter((s) => s.kind === "preferred");
    expect(ct.securities.filter((s) => s.kind === "preferred").map((s) => [s.id, s.participation, s.cap_multiple ?? null])).toEqual(want.map((s) => [s.id, s.participation, s.cap_multiple ?? null]));
  });
});

it("says nothing depends on a missing participation column when there's no preferred stock (10f)", () => {
  const result = {
    as_of: "2025-06-30",
    cap_table: { holders: [], securities: [{ id: "common_stock", name: "Common Stock", kind: "common" }] },
    issue_order: [],
    to_fill: [],
    report: { read: {}, not_needed: {}, notes: [{ code: "no_participation_column" as const, subject: "Participating (Y/N)" }] },
  };
  expect(ocxReportLines(result as never, { dateSystem: 1900, sheets: [] })).toEqual([
    `The workbook's Financing History has no "Participating (Y/N)" column. It has no preferred stock, so nothing depends on it.`,
  ]);
});

describe("a preferred series' one-click answers (06d review)", () => {
  it("fills in nothing until clicked, then sets the conversion price to the issue price, and 1x non-participating", async () => {
    render(<App />);
    upload([xlsx(workbookOf("ocx-02-ferncliff-preferred"), "ferncliff.xlsx")]);
    await review();
    const price = screen.getByLabelText("Series Seed Preferred's conversion price, a share") as HTMLInputElement;
    const multiple = screen.getByLabelText("Series Seed Preferred's liquidation preference, as a multiple of its issue price") as HTMLInputElement;
    const participation = within(group("Does Series Seed Preferred participate?")).getAllByRole("radio") as HTMLInputElement[];
    // Never preset.
    expect([price.value, multiple.value, ...participation.map((r) => String(r.checked))]).toEqual(["", "", "false", "false", "false"]);
    click("Conversion price = issue price");
    expect(price.value).toBe("1");
    click("1x, non-participating");
    expect(multiple.value).toBe("1");
    expect(participation.map((r) => r.checked)).toEqual([true, false, false]);
  });

  it("copies the issue price you typed, when the workbook gives none (ocx-04's preferred-prices-differ)", async () => {
    render(<App />);
    upload([xlsx(fixtureWorkbook("ocx-04-to-fill", "preferred-prices-differ.json"), "ferncliff.xlsx")]);
    await review();
    type("Series Seed Preferred's original issue price, a share", "0.95");
    click("Conversion price = issue price");
    expect((screen.getByLabelText("Series Seed Preferred's conversion price, a share") as HTMLInputElement).value).toBe("0.95");
  });
});

describe("the summary to share (O15)", () => {
  /** What the workbook holds that's the company's own: its holders' names, its rows' numbers, and the name in its titles. */
  const ownTexts = (book: OcxWorkbook) => {
    const holders = book.sheets.find((s) => s.name === "Stakeholder View")!.cells.filter((c) => /^A([3-9]|1[01])$/.test(c.address)).map((c) => c.text);
    return [...holders, "Alder Gate", "SAFE-2", "SAFE-1", "CS-1", "EP-1", "W-1", "Common Seed", "CAD"];
  };

  it("opens a refused workbook's summary first, copies exactly that, and holds nothing from the workbook", async () => {
    const book = fixtureWorkbook("ocx-03-refused", "currency.json");
    render(<App />);
    upload([xlsx(book, "alder-gate.xlsx")]);
    expect((await screen.findByRole("alert")).textContent).toMatch(/^Couldn't import it: it uses something spillpoint doesn't model yet/);
    click("Copy a summary to share");
    const shown = within(screen.getByRole("group", { name: "The summary to share" })).getByText(/an OCX import, in counts and codes/).textContent!;
    expect(shown).toContain("Import: refused, unsupported currency");
    click("Copy");
    await screen.findByText("Copied.");
    expect(copied).toEqual([shown]);
    for (const text of ownTexts(book)) expect(shown, text).not.toContain(text);
    for (const amount of ["200000", "8000000", "5000000"]) expect(shown).not.toContain(amount);
  });

  it("adds how Use stopped, and each answer's kind, never its value", async () => {
    render(<App />);
    upload([xlsx(workbookOf("ocx-02-ferncliff-preferred"), "ferncliff.xlsx")]);
    await review();
    click("Conversion price = issue price");
    type("Series Seed Preferred's liquidation preference, as a multiple of its issue price", "1");
    choose("Does Series Seed Preferred participate?", "Participating, with a cap");
    type("Series Seed Preferred's participation cap, as a multiple of its issue price", "0.37");
    choose("Which series is paid first at a sale?", /^All pari passu/);
    click("Use this cap table");
    expect((await screen.findByRole("alert")).textContent).toMatch(/^This cap table can't be used yet\./);
    click("Copy a summary to share");
    const shown = within(screen.getByRole("group", { name: "The summary to share" })).getByText(/an OCX import, in counts and codes/).textContent!;
    expect(shown).toContain("Use: stopped, InputError");
    expect(shown).toContain(
      "Answers: conversion_price=number, preference_multiple=number, participation=participating_capped, cap_multiple=number, seniority=pari_passu",
    );
    expect(shown).not.toContain("0.37");
  });
});

it("opens one workbook at a time", async () => {
  render(<App />);
  upload([xlsx(workbookOf("ocx-01-alder-gate"), "a.xlsx"), new File(["{}"], "Manifest.ocf.json", { type: "application/json" })]);
  expect((await screen.findByRole("alert")).textContent).toBe("Open an OCX workbook on its own: one .xlsx, with no other files.");
});
