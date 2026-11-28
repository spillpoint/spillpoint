// One way to model the next round (11c2): on a cap table entered directly or imported, "Add a round" on the Rounds tab
// shows what its SAFEs and notes convert into, and removing the round takes it back. Clicked through in a simulated
// browser on an import (Larkspur, with case 27's Series B by its price per share) and a cap table entered directly
// (edge-12b's). The Payouts tab's line points there while SAFEs or notes are outstanding.

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App.tsx";
import { manySafesAndStrikes } from "../../../packages/engine/test/support/many-safes.ts";

const cases = resolve(import.meta.dirname, "../../../cases");
const caseJson = (name: string, file: string) => JSON.parse(readFileSync(resolve(cases, name, file), "utf8"));
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const openTab = (name: "Payouts" | "Cap table" | "Rounds") => fireEvent.click(screen.getByRole("tab", { name }));
const selected = () => screen.getAllByRole("tab").find((t) => t.getAttribute("aria-selected") === "true")!.textContent;
const rounds = () => document.getElementById("panel-rounds")!;
const payouts = () => document.getElementById("panel-payouts")!;
/** Who gets what, as the Payouts tab shows it, read while another tab is open. */
const payoutTable = () => payouts().querySelector("table")!.textContent;
const card = (title: RegExp) => within(rounds()).getByRole("heading", { level: 3, name: title }).closest("li")!;
const titles = () => within(rounds()).queryAllByRole("heading", { level: 3 }).map((h) => h.textContent);
const choose = (select: HTMLElement, label: string) => type(select, within(select).getByRole("option", { name: label }).getAttribute("value")!);
/** A line's own words, without the lines under it that explain it. */
const ownText = (li: Element) => [...li.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("");
/** The lines under the round's line that starts so: what its terms give at the round's price. */
const explained = (round: HTMLElement, starts: string) => {
  const line = [...round.querySelectorAll(".rounds__lines > li")].find((li) => ownText(li).startsWith(starts))!;
  return [...line.querySelectorAll(".rounds__details > li")].map((li) => li.textContent);
};

beforeEach(() => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: () => "blob:saved" });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: () => {} });
});
afterEach(() => vi.restoreAllMocks());

/** Larkspur's export, its blanks answered as case 27 fills them, a sale date, and "Use this cap table". */
async function importLarkspur() {
  render(<App />);
  const files = readdirSync(resolve(cases, "ocf-01-larkspur/package")).map(
    (f) => new File([readFileSync(resolve(cases, "ocf-01-larkspur/package", f))], f, { type: "application/json" }),
  );
  fireEvent.change(screen.getByLabelText(/Open a cap table export/), { target: { files } });
  const review = await screen.findByRole("region", { name: /^Importing / });
  fireEvent.click(within(within(review).getByRole("group", { name: "Does Seed Preferred participate?" })).getByLabelText(/^Non-participating/));
  type(within(review).getByLabelText("Investor N's note's repayment multiple at a sale"), "1");
  type(within(review).getByLabelText("When is the sale?"), "2026-06-30");
  click("Use this cap table");
  await screen.findByText(/^Imported Larkspur Instruments, Inc\. from 8 files\./);
}

/** edge-12b's cap table, opened as a saved file: one SAFE, a $10,000,000 post-money cap and a 20% discount. */
async function openEdge12b() {
  render(<App />);
  const exit = caseJson("edge-12b-safe-cap-and-discount", "inputs.json").exit;
  const file = JSON.stringify({ format: "spillpoint", version: 7, name: "Edge 12b", cap_table: exit.cap_table, range: exit.range });
  fireEvent.change(screen.getByLabelText("Open a saved cap table"), { target: { files: [new File([file], "edge-12b.json", { type: "application/json" })] } });
  await screen.findByText("Opened edge-12b.json.");
}

/** Case 27's Series B, by its exact price per share, typed into the round "Add a round" opens: Investor Z's $8M, the pool to 10%, senior. */
const CASE_27_PRICE = String(caseJson("edge-27-safes-and-note-convert-on-an-imported-table", "expected.json").cap_tables.at(-1).details.price_per_share);
function typeCase27SeriesB() {
  const holders = within(rounds()).getByRole("region", { name: "Holders" });
  click("Add a holder");
  type(within(holders).getAllByLabelText("Holder name").at(-1)!, "Investor Z");
  const round = card(/^2\. Series B Preferred, a priced round$/);
  type(within(round).getByLabelText("Date"), "2025-12-01");
  choose(within(round).getByLabelText("The round is given by"), "Its price per share");
  type(within(round).getByLabelText("Price per share ($)"), CASE_27_PRICE);
  type(within(round).getByLabelText("Option pool after the round (% of the company)"), "10");
  choose(within(round).getByLabelText("Investor"), "Investor Z");
  type(within(round).getByLabelText("Amount ($)"), "8,000,000");
  type(within(round).getByLabelText("How it ranks against the earlier series"), "senior");
  return round;
}

describe("an import: Larkspur, its two SAFEs and its note", () => {
  it("points from the Payouts tab to the Rounds tab, which says a round added there shows what they convert into", async () => {
    await importLarkspur();
    const line = within(payouts()).getByText(/^Two SAFEs and a convertible note are outstanding on this cap table\./);
    expect(line.textContent).toBe(
      "Two SAFEs and a convertible note are outstanding on this cap table. To see what they would convert into at the next round, add one on the Rounds tab.",
    );
    fireEvent.click(within(line).getByRole("button", { name: "Rounds tab" }));
    expect(selected()).toBe("Rounds");
    expect(within(rounds()).getByText(/^This cap table was imported, not built from the company's rounds/)).toBeTruthy();
    expect(within(rounds()).getByText(/^To see what its two SAFEs and its convertible note convert into, add the next round\./).textContent).toBe(
      "To see what its two SAFEs and its convertible note convert into, add the next round. Its summary here gives each one's cap price and discount price, " +
        "which applies, and the shares and series it gets. This cap table becomes the one the round starts from. Remove the round, and you're back to this cap table, with no rounds.",
    );
    await vi.waitFor(() => expect(document.activeElement?.textContent).toBe("Add a round"));
  });

  it("adds case 27's Series B by its price per share, and its summary explains each SAFE and the note", async () => {
    await importLarkspur();
    openTab("Rounds");
    click("Add a round");
    expect(titles()).toEqual(["1. The cap table it starts from", "2. Series B Preferred, a priced round"]);
    const round = typeCase27SeriesB();
    await vi.waitFor(() => expect(within(rounds()).queryAllByRole("alert")).toEqual([]));

    const said = [...round.querySelectorAll(".rounds__lines > li")].map(ownText);
    // The pre-money the price implies, case 27's $50,000,000 (R32).
    expect(said[0]).toBe(
      "$8,000,000 at $2.700764 a share. The price implies a $50,000,000 pre-money valuation, $58,000,000 post-money, on the fully diluted shares the round is priced on.",
    );
    expect(said).toContainEqual(expect.stringMatching(/^Investor X's SAFE converts at its cap price, \$\d\.\d{6} a share, into 367,202 shares of Series B Preferred \(from SAFEs\)\.$/));
    const x = explained(round, "Investor X's SAFE");
    expect(x[2]).toBe("It converts at the lower of the two, the cap price on a tie.");
    // The SAFEs' cap price can move with the price, since the note beside them counts in their capitalization (R33).
    expect(x.at(-1)).toMatch(/^Its cap price can move with the round's price here: the company capitalization counts the notes and other SAFEs converting beside it/);
    const note = explained(round, "Investor N's note");
    // Case 27's note: a $10,000,000 cap on its 16,451,250 base shares, with the pool (its expected.json's base_shares).
    expect(note[0]).toBe("Its cap price is $0.607857: its $10,000,000 cap ÷ the 16,451,250 shares just before the round, counting the unissued pool, as the note's terms count them.");
    expect(note.find((l) => l!.startsWith("Its $"))).toMatch(/^Its \$[\d,]+\.\d\d of interest is \d+(\.\d+)?% a year, simple, from \w+ \d+, \d{4} to the round's date, Dec 1, 2025, each day counting as 1\/365 of a year\.$/);
    expect(note).toContainEqual(expect.stringMatching(/^Its 440,082 shares, rounded down to whole shares, are \d+\.\d\d% of the company after the round, fully diluted\.$/));
    // Its base, the shares just before the round, is the same at any price: its cap takes over at its cap price ÷ (1 − its discount).
    expect(note.at(-1)).toMatch(/^At \$\d+\.\d+ a share or more, its cap sets its price; below that, (its discount does|it converts at the round's own price)\.$/);
    expect(round.textContent).not.toMatch(/\b(good|bad|better|worse|should|recommend|deal|fair|favou?rable|advice)\b/i);

    // Each conversion's line shows; its working is in a section closed until opened (Jordan's answer 2, 11c2).
    const sections = [...round.querySelectorAll<HTMLDetailsElement>("details.rounds__working")];
    expect(sections.map((d) => [d.querySelector("summary")!.textContent, d.open])).toEqual([
      ["How it converts", false],
      ["How it converts", false],
      ["How it converts", false],
    ]);
    // The anti-dilution note stays a line of its own, not folded.
    expect(said.at(-1)).toMatch(/^Seed Preferred has no anti-dilution/);
    fireEvent.click(sections[2]!.querySelector("summary")!);
    expect(sections.map((d) => d.open)).toEqual([false, false, true]);
  });

  it("goes back to the imported cap table when the round is removed, with no rounds, and adds the same round again", async () => {
    await importLarkspur();
    const before = payoutTable();
    openTab("Rounds");
    click("Add a round");
    typeCase27SeriesB();
    await vi.waitFor(() => expect(payoutTable()).not.toBe(before));

    // "Add a round" opened it for editing, where its Remove button is.
    click("Remove Series B Preferred, a priced round");
    expect(window.confirm).toHaveBeenLastCalledWith(
      "Remove event 2, Series B Preferred, a priced round? What it did goes, and you're back to the cap table the round started from, with no rounds.",
    );
    // No rounds: the Rounds tab offers a round again, the Payouts tab is the import's own, its line back.
    expect(titles()).toEqual([]);
    expect(within(rounds()).getByText(/^This cap table was imported/)).toBeTruthy();
    expect(screen.getByText(/^Larkspur Instruments, Inc\., imported from 8 files/).textContent).not.toMatch(/built from/);
    expect(payoutTable()).toBe(before);
    expect(within(payouts()).getByText(/^Two SAFEs and a convertible note are outstanding/)).toBeTruthy();
    // The import's date and issue order are kept: a round added again starts from the same table, dated as it was.
    click("Add a round");
    expect(titles()).toEqual(["1. The cap table it starts from", "2. Series B Preferred, a priced round"]);
    expect(within(card(/^1\./)).getByText("Jun 30, 2025")).toBeTruthy();
  });
});

describe("a cap table entered directly: edge-12b's", () => {
  it("says what its SAFE converts into at the round's price, and where its cap takes over: its cap price ÷ (1 − its discount)", async () => {
    await openEdge12b();
    openTab("Rounds");
    expect(within(rounds()).getByText(/^This cap table was entered directly/)).toBeTruthy();
    expect(within(rounds()).getByText(/^To see what its SAFE converts into, add the next round\./).textContent).toMatch(/^[^.]+\. Its summary here gives its cap price and discount price,/);
    click("Add a round");
    const round = card(/^2\. Series A Preferred, a priced round$/);
    choose(within(round).getByLabelText("The round is given by"), "Its price per share");
    type(within(round).getByLabelText("Price per share ($)"), "$1.00");
    type(within(round).getByLabelText("Amount ($)"), "$5M");
    await vi.waitFor(() => expect(within(rounds()).queryAllByRole("alert")).toEqual([]));
    // Capitalization: 9,000,000 common, 500,000 options and the 1,000,000 pool, ÷ (1 − $1,000,000 ÷ $10,000,000), 11,666,666.67.
    const x = explained(round, "Investor X's SAFE");
    expect(x.slice(0, 3)).toEqual([
      "Its cap price is $0.857143: its $10,000,000 cap ÷ the company capitalization just before the round, 11,666,666.67 shares. As the YC post-money SAFE counts it, that includes the SAFEs themselves and the pool before this round's increase, and leaves out the new money.",
      "Its discount price is $0.80: the round's $1.00 less its 20% discount.",
      "It converts at the lower of the two, the cap price on a tie.",
    ]);
    expect([...round.querySelectorAll(".rounds__lines > li")].map(ownText)).toContain(
      "Investor X's SAFE converts at its discount price, $0.80 a share, into 1,250,000 shares of Series A Preferred (from SAFEs).",
    );
    expect(x.at(-1)).toBe("At $1.071429 a share or more, its cap sets its price; below that, its discount does.");
    // At $2.00, above that, its cap does.
    type(within(round).getByLabelText("Price per share ($)"), "2");
    await vi.waitFor(() => expect(explained(card(/^2\./), "Investor X's SAFE converts at its cap price")).toHaveLength(6));
  });

  it("names a price per share left blank, and switching back to the pre-money starts that blank", async () => {
    await openEdge12b();
    openTab("Rounds");
    click("Add a round");
    const round = card(/^2\./);
    type(within(round).getByLabelText("Amount ($)"), "5000000");
    choose(within(round).getByLabelText("The round is given by"), "Its price per share");
    await vi.waitFor(() => expect(within(round).getAllByText("Series A Preferred's price per share can't be blank.").length).toBeGreaterThan(0));
    type(within(round).getByLabelText("Price per share ($)"), "1");
    await vi.waitFor(() => expect(within(rounds()).queryAllByRole("alert")).toEqual([]));
    choose(within(round).getByLabelText("The round is given by"), "Its pre-money valuation");
    expect((within(round).getByLabelText("Pre-money valuation ($)") as HTMLInputElement).value).toBe("");
    expect(within(round).queryByLabelText("Price per share ($)")).toBeNull();
    await vi.waitFor(() => expect(within(round).getAllByText("Series A Preferred's pre-money valuation can't be blank.").length).toBeGreaterThan(0));
    // The amount typed stays.
    expect((within(round).getByLabelText("Amount ($)") as HTMLInputElement).value).toBe("5000000");
  });
});

describe("a round converting 26 SAFEs", () => {
  it("shows one line for each SAFE, its working closed until opened", async () => {
    // 10j's made-up table of 26 post-money SAFEs at two caps, with one option strike, so its payouts work out in about a
    // second here, where they run on the test's own thread. Jordan's three-cap table is checked in conversions.test.ts.
    render(<App />);
    const table = manySafesAndStrikes(26, 1, "each its own");
    const file = JSON.stringify({ format: "spillpoint", version: 7, name: "26 SAFEs", cap_table: table.cap_table, range: table.range });
    fireEvent.change(screen.getByLabelText("Open a saved cap table"), { target: { files: [new File([file], "26-safes.json", { type: "application/json" })] } });
    await screen.findByText("Opened 26-safes.json.");
    expect(within(payouts()).getByText(/^26 SAFEs are outstanding on this cap table\./)).toBeTruthy();
    openTab("Rounds");
    click("Add a round");
    const round = card(/^2\./);
    type(within(round).getByLabelText("Pre-money valuation ($)"), "30M");
    type(within(round).getByLabelText("Amount ($)"), "10M");
    await vi.waitFor(() => expect(within(rounds()).queryAllByRole("alert")).toEqual([]));
    fireEvent.click(within(round).getByRole("button", { name: /^Done / }));

    const lines = [...card(/^2\./).querySelectorAll(".rounds__lines > li")];
    const safes = lines.filter((li) => /^SAFE Investor \d+'s SAFE converts at its cap price, \$[\d.]+ a share, into [\d,]+ shares of Series B Preferred \(from SAFEs\)( \d)?\.$/.test(ownText(li)));
    expect(safes).toHaveLength(26);
    // Each its own line, its working there but closed: the round reads as its lines.
    expect(safes.map((li) => li.querySelector<HTMLDetailsElement>(":scope > details.rounds__working")?.open)).toEqual(Array(26).fill(false));
    expect(card(/^2\./).querySelectorAll("details[open]")).toHaveLength(0);
  });
});

describe("a company built from its rounds", () => {
  it("has no line pointing to the Rounds tab: its rounds are already there", () => {
    render(<App />);
    expect(within(payouts()).queryByText(/outstanding on this cap table/)).toBeNull();
  });

  it("has three tabs, the SAFEs tab gone", () => {
    render(<App />);
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Payouts", "Cap table", "Rounds"]);
  });
});
