// "Add a round" (0.5.0, 05b3a; R31), clicked through in a simulated browser: a cap table imported or entered directly
// becomes the one a company's rounds start from, its next round is added on the Rounds tab, and the starting table is
// edited on the Cap table tab, the rounds built again on every change. Quillfern imported with a Series B pays as
// 05b1's case 26 does, saved and opened again.

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { buildCapTables, readOcf } from "spillpoint";
import type { OcfFile } from "spillpoint";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App.tsx";
import { buildExit, draftFromExit } from "../src/draft.ts";
import { fromRounds } from "../src/rounds.ts";
import { addEvent, buildRounds, moveEvent, removeEvent, setEvent, startingRounds } from "../src/roundsDraft.ts";
import { ANALYSIS_TIMEOUT, FULL_SEARCH_TIMEOUT } from "./analysis.ts";
import { exitOf, payoutsAtBreakpoints } from "./payouts.ts";

const cases = resolve(import.meta.dirname, "../../../cases");
const caseJson = (path: string) => JSON.parse(readFileSync(resolve(cases, path), "utf8"));
const zip = (name: string) => new File([readFileSync(resolve(import.meta.dirname, "fixtures", name))], name, { type: "application/zip" });
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const openTab = (name: "Payouts" | "Cap table" | "Rounds") => fireEvent.click(screen.getByRole("tab", { name }));
const panel = () => document.getElementById("panel-rounds")!;
const card = (title: RegExp) => within(panel()).getByRole("heading", { level: 3, name: title }).closest("li")!;
const titles = () => within(panel()).getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
const choose = (select: HTMLElement, label: string) => type(select, within(select).getByRole("option", { name: label }).getAttribute("value")!);

let downloads: Blob[];
beforeEach(() => {
  downloads = [];
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: (blob: Blob) => (downloads.push(blob), "blob:saved") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: () => {} });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
const save = async () => {
  click("Save");
  return downloads.at(-1)!.text();
};

/** Quillfern's export, imported and used: edge case 25's cap table. */
async function importQuillfern() {
  render(<App />);
  fireEvent.change(screen.getByLabelText(/Open an OCF export/), { target: { files: [zip("quillfern-macos.zip")] } });
  await screen.findByRole("region", { name: /^Importing / });
  click("Use this cap table");
  await screen.findByText(/^Imported Quillfern Labs, Inc\./);
}

/** Case 26's Series B, typed into the round "Add a round" opens: a new lead, Fund U's pro-rata, the pool to 10%, senior. */
function typeSeriesB() {
  const holders = within(panel()).getByRole("region", { name: "Holders" });
  click("Add a holder");
  const added = within(holders).getAllByLabelText("Holder name").at(-1)!;
  type(added, "Fund W");
  const round = card(/^2\. Series B Preferred, a priced round$/);
  type(within(round).getByLabelText("Date"), "2026-03-31");
  type(within(round).getByLabelText("Pre-money valuation ($)"), "40000000");
  type(within(round).getByLabelText("Option pool after the round (% of the company)"), "10");
  choose(within(round).getByLabelText("Investor"), "Fund W");
  type(within(round).getByLabelText("Amount ($)"), "8000000");
  fireEvent.click(within(round).getByRole("button", { name: "Add an investor" }));
  const second = within(round).getByRole("group", { name: /^Investor 2/ });
  choose(within(second).getByLabelText("Investor"), "Fund U");
  type(within(second).getByLabelText("Amount ($)"), "1500000");
  fireEvent.click(within(second).getByLabelText("Under its pro-rata right"));
  type(within(round).getByLabelText("How it ranks against the earlier series"), "senior");
}

/** Case 26's breakpoints and every holder's payout at each, to the cent, from its locked expected.json. */
function case26(): { breakpoints: string[]; holders: Record<string, Record<string, string>> } {
  const exit = caseJson("edge-26-series-b-on-an-imported-table/expected.json").exit as {
    breakpoints: { exit_value: string }[];
    payouts: { exit_value: string; equilibria: { holder_totals: Record<string, string> }[] }[];
  };
  const breakpoints = exit.breakpoints.map((b) => b.exit_value);
  const holders = Object.fromEntries(exit.payouts.filter((p) => breakpoints.includes(p.exit_value)).map((p) => [p.exit_value, p.equilibria[0]!.holder_totals]));
  return { breakpoints, holders };
}
/** What a saved file pays at its breakpoints, over case 26's range: the same shape as case26(). */
function paid(fileText: string) {
  const { breakpoints, payouts } = payoutsAtBreakpoints({ ...exitOf(fileText), range: ["0", "150000000"] });
  return { breakpoints, holders: Object.fromEntries(Object.entries(payouts).map(([x, p]) => [x, p.holders])) };
}

describe("Quillfern imported, a Series B added, saved and opened again (case 26)", () => {
  it("pays as case 26 does, to the cent at every breakpoint, and again once the file is opened", async () => {
    await importQuillfern();
    openTab("Cap table");
    click("Add a round");
    // Straight to the Rounds tab, the new round open: Series B, after the starting table's Series A.
    expect(titles()).toEqual(["1. The cap table it starts from", "2. Series B Preferred, a priced round"]);
    expect(within(card(/^1\./)).getByText("Dec 31, 2025")).toBeTruthy();
    // It has no before, so no "For you" line; the round does.
    expect(card(/^1\./).querySelector(".rounds__yours")).toBeNull();
    typeSeriesB();
    await vi.waitFor(() => expect(within(panel()).queryAllByRole("alert")).toEqual([]), { timeout: ANALYSIS_TIMEOUT });

    const saved = await save();
    const file = JSON.parse(saved);
    // The file keeps the starting table as the company's first event, in the import's issue order (O14).
    expect(file).toMatchObject({ version: 6, cap_table_after_event: "series_b" });
    expect(file.events.map((e: { id: string; type: string }) => [e.id, e.type])).toEqual([["start", "start"], ["series_b", "priced_round"]]);
    expect(file.events[0]).toMatchObject({ date: "2025-12-31", issue_order: ["seed", "series_a"] });
    expect(file.holders).toEqual(caseJson("edge-26-series-b-on-an-imported-table/inputs.json").holders);
    expect(paid(saved)).toEqual(case26());

    // Opened again, it's the same company: the same rounds, and the same payouts.
    fireEvent.change(screen.getByLabelText("Open a saved cap table"), { target: { files: [new File([saved], "quillfern.json", { type: "application/json" })] } });
    await screen.findByText("Opened quillfern.json.");
    openTab("Rounds");
    expect(titles()).toEqual(["1. The cap table it starts from", "2. Series B Preferred, a priced round"]);
    expect(paid(await save())).toEqual(case26());
  });

  it("edits the starting table on the Cap table tab, and builds the round again on it", async () => {
    await importQuillfern();
    openTab("Cap table");
    click("Add a round");
    typeSeriesB();
    openTab("Cap table");
    expect(screen.getByRole("note").textContent).toBe(
      "This is the cap table the company starts from, on Dec 31, 2025. The event after it on the Rounds tab is built on it, and the payouts use the cap table " +
        "after Series B Preferred, a priced round. Change it here and that event is built again.Edit the cap table directly",
    );
    // Fund U's pro-rata counts its Series A as it stands in the starting table: 3,000,000 of 18,462,499.2, with its Seed.
    const proRata = () => within(card(/^2\./)).getByText(/^Fund U may buy up to/).textContent;
    openTab("Rounds");
    expect(proRata()).toMatch(/^Fund U may buy up to \$1,728,910\.03 as pro-rata/);
    openTab("Cap table");
    // A larger Series A stake: 4,360,000 of 19,462,499.2 as converted, times the $9.5M raised.
    type(screen.getByLabelText("Fund U, Series A Preferred"), "4000000");
    openTab("Rounds");
    await vi.waitFor(() => expect(proRata()).toMatch(/^Fund U may buy up to \$2,128,1\d\d\.\d\d as pro-rata/), { timeout: ANALYSIS_TIMEOUT });

    // A problem in the starting table is shown next to its field, and the payouts' "Fix it" goes there.
    openTab("Cap table");
    type(screen.getByLabelText("Fund U, Series A Preferred"), "two million");
    expect(screen.getByLabelText("Fund U, Series A Preferred").getAttribute("aria-invalid")).toBe("true");
    openTab("Payouts");
    click("Fix it");
    expect(document.activeElement).toBe(screen.getByLabelText("Fund U, Series A Preferred"));
  });

  it("keeps the starting table first: it can't be moved or removed, and nothing moves above it", async () => {
    await importQuillfern();
    openTab("Cap table");
    click("Add a round");
    expect((screen.getByRole("button", { name: "Move Series B Preferred, a priced round earlier" }) as HTMLButtonElement).disabled).toBe(true);
    click("Edit The cap table it starts from");
    for (const name of ["Move The cap table it starts from earlier", "Move The cap table it starts from later", "Remove The cap table it starts from"]) {
      expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled, name).toBe(true);
    }
  });

  it("drops the rounds when asked to edit the cap table directly, keeping the table the payouts use", async () => {
    await importQuillfern();
    openTab("Cap table");
    click("Add a round");
    typeSeriesB();
    openTab("Cap table");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    click("Edit the cap table directly");
    expect(window.confirm).toHaveBeenCalledWith(
      "Edit the cap table directly? This drops the 2 events that build it, and what each one worked out on the Rounds tab. " +
        "The cap table the payouts use, after Series B Preferred, a priced round, stays exactly as it is now, and you edit it here in place of the one the company starts from. " +
        "A save will keep the cap table, not the rounds. To get the rounds back, start again from Quillfern Labs, Inc., imported from quillfern-macos.zip.",
    );
    expect(screen.getByLabelText("Fund W, Series B Preferred")).toBeTruthy();
    expect(JSON.parse(await save()).cap_table).toBeTruthy();
  });
});

/** Larkspur's export, with `extra` files, its blanks answered as case 27 fills them, and a sale date; the cap table used. */
async function importLarkspur(extra: { file: string; safeCap: "Pre-money" | "Post-money" } | null = null) {
  render(<App />);
  const files = readdirSync(resolve(cases, "ocf-01-larkspur/package")).map(
    (f) => new File([readFileSync(resolve(cases, "ocf-01-larkspur/package", f))], f, { type: "application/json" }),
  );
  if (extra) files.push(new File([readFileSync(resolve(cases, extra.file))], extra.file.split("/").at(-1)!, { type: "application/json" }));
  fireEvent.change(screen.getByLabelText(/Open an OCF export/), { target: { files } });
  const panel = await screen.findByRole("region", { name: /^Importing / });
  fireEvent.click(within(within(panel).getByRole("group", { name: "Does Seed Preferred participate?" })).getByLabelText(/^Non-participating/));
  if (extra) fireEvent.click(within(within(panel).getByRole("group", { name: "Is this SAFE's cap pre-money or post-money?" })).getByLabelText(extra.safeCap));
  type(within(panel).getByLabelText("Investor N's note's repayment multiple at a sale"), "1");
  type(within(panel).getByLabelText("When is the sale?"), "2026-06-30");
  click("Use this cap table");
}

/** Case 27's Series B, typed into the round "Add a round" opens: Investor Z's $8M, the pool to 10%, senior. */
function typeCase27SeriesB() {
  const holders = within(panel()).getByRole("region", { name: "Holders" });
  click("Add a holder");
  type(within(holders).getAllByLabelText("Holder name").at(-1)!, "Investor Z");
  const round = card(/^2\. Series B Preferred, a priced round$/);
  type(within(round).getByLabelText("Date"), "2025-12-01");
  type(within(round).getByLabelText("Pre-money valuation ($)"), "50000000");
  type(within(round).getByLabelText("Option pool after the round (% of the company)"), "10");
  choose(within(round).getByLabelText("Investor"), "Investor Z");
  type(within(round).getByLabelText("Amount ($)"), "8000000");
  type(within(round).getByLabelText("How it ranks against the earlier series"), "senior");
}

/** Case 27's breakpoints and every holder's payout at each, to the cent, by holder name: the page names Investor Z's id itself. */
function case27(): { breakpoints: string[]; holders: Record<string, Record<string, string>> } {
  const names = new Map((caseJson("edge-27-safes-and-note-convert-on-an-imported-table/inputs.json").holders as { id: string; name: string }[]).map((h) => [h.id, h.name]));
  const exit = caseJson("edge-27-safes-and-note-convert-on-an-imported-table/expected.json").exit as {
    breakpoints: { exit_value: string }[];
    payouts: { exit_value: string; equilibria: { holder_totals: Record<string, string> }[] }[];
  };
  const breakpoints = exit.breakpoints.map((b) => b.exit_value);
  const holders = Object.fromEntries(
    exit.payouts
      .filter((p) => breakpoints.includes(p.exit_value))
      .map((p) => [p.exit_value, Object.fromEntries(Object.entries(p.equilibria[0]!.holder_totals).map(([id, v]) => [names.get(id)!, v]))]),
  );
  return { breakpoints, holders };
}
/** What a saved file pays at its breakpoints over case 27's range, by holder name. */
function paidByName(fileText: string) {
  const names = new Map((JSON.parse(fileText).holders as { id: string; name: string }[]).map((h) => [h.id, h.name]));
  const { breakpoints, payouts } = payoutsAtBreakpoints({ ...exitOf(fileText), range: ["0", "200000000"] });
  return { breakpoints, holders: Object.fromEntries(Object.entries(payouts).map(([x, p]) => [x, Object.fromEntries(Object.entries(p.holders).map(([id, v]) => [names.get(id)!, v]))])) };
}

describe("Larkspur imported, its SAFEs and note converted in a Series B (case 27; 05b3b)", () => {
  it(
    "pays as case 27 does, to the cent at every breakpoint, and again once the file is opened",
    async () => {
      // Since 05c2 the engine reads Larkspur at a sale, its SAFEs beside its note (X18, E20): it opens with payouts.
      await importLarkspur();
      await screen.findByText(/^Imported Larkspur Instruments, Inc\. from 8 files\./);
      await screen.findByRole("heading", { name: "Breakpoints" }, { timeout: FULL_SEARCH_TIMEOUT });
      openTab("Cap table");
      click("Add a round");
      expect(titles()).toEqual(["1. The cap table it starts from", "2. Series B Preferred, a priced round"]);
      const round = card(/^2\./);
      // A new round converts the SAFEs and notes still outstanding, as case 27's Series B does.
      expect((within(round).getByLabelText("Converts the SAFEs still outstanding") as HTMLInputElement).checked).toBe(true);
      expect((within(round).getByLabelText("Converts the convertible notes still outstanding") as HTMLInputElement).checked).toBe(true);
      typeCase27SeriesB();
      await vi.waitFor(() => expect(within(panel()).queryAllByRole("alert")).toEqual([]), { timeout: ANALYSIS_TIMEOUT });
      const saved = await save();
      const file = JSON.parse(saved);
      expect(file.events.map((e: { id: string; type: string }) => [e.id, e.type])).toEqual([["start", "start"], ["series_b", "priced_round"]]);
      expect(file.events[0]).toMatchObject({ date: "2025-06-30", issue_order: ["cls-seed", "safe-x1", "safe-s3", "note-n1", "cls-series-a"] });
      expect(paidByName(saved)).toEqual(case27());

      fireEvent.change(screen.getByLabelText("Open a saved cap table"), { target: { files: [new File([saved], "larkspur.json", { type: "application/json" })] } });
      await screen.findByText("Opened larkspur.json.");
      expect(paidByName(await save())).toEqual(case27());
    },
    FULL_SEARCH_TIMEOUT,
  );
});

describe("a cap table the engine can't use at a sale (05b3b)", () => {
  it("opens the Rounds tab at a round that converts its SAFEs and notes, and the Payouts tab says why until one does", async () => {
    // Larkspur with a third SAFE answered as pre-money: a pre-money SAFE beside preferred stock, a sale's limit (X14).
    await importLarkspur({ file: "ocf-04-to-fill/fixtures/safe-cap-without-timing.ocf.json", safeCap: "Pre-money" });
    expect(screen.getByRole("alert").textContent).toBe(
      "This cap table can't be used at a sale yet: spillpoint can't yet work out a sale while a pre-money SAFE is outstanding beside preferred stock.",
    );
    click("Use it to add a round");
    await screen.findByText(/^Imported Larkspur Instruments, Inc\. from 9 files, with a round to convert its SAFEs and notes\./);
    expect(titles()).toEqual(["1. The cap table it starts from", "2. Series B Preferred, a priced round"]);
    const round = card(/^2\./);
    expect((within(round).getByLabelText("Converts the SAFEs still outstanding") as HTMLInputElement).checked).toBe(true);
    expect((within(round).getByLabelText("Converts the convertible notes still outstanding") as HTMLInputElement).checked).toBe(true);
    openTab("Payouts");
    expect(document.querySelector("#panel-payouts .notice")!.textContent).toBe(
      "The payouts can't be worked out yet. spillpoint can't yet work out a sale while a pre-money SAFE is outstanding beside preferred stock. " +
        "Once a round on the Rounds tab converts the SAFEs and notes, the payouts use the cap table after it.",
    );
  });
});

describe("an imported cap table saved before a round is added (05b3b, Jordan's answer 1)", () => {
  it("keeps the import's date and issue order, so a round added once it's reopened starts from the same table", async () => {
    await importQuillfern();
    const saved = JSON.parse(await save());
    expect(saved).toMatchObject({ as_of: "2025-12-31", issue_order: ["seed", "series_a"] });
    expect(Object.keys(saved)).toEqual(["format", "version", "name", "cap_table", "as_of", "issue_order", "range", "view"]);
    fireEvent.change(screen.getByLabelText("Open a saved cap table"), {
      target: { files: [new File([JSON.stringify(saved)], "quillfern.json", { type: "application/json" })] },
    });
    await screen.findByText("Opened quillfern.json.");
    openTab("Cap table");
    click("Add a round");
    expect(within(card(/^1\./)).getByText("Dec 31, 2025")).toBeTruthy();
    // With the round filled in, it saves, its starting table dated and ordered as the import was.
    typeSeriesB();
    await vi.waitFor(() => expect(within(panel()).queryAllByRole("alert")).toEqual([]), { timeout: ANALYSIS_TIMEOUT });
    expect(JSON.parse(await save()).events[0]).toMatchObject({ id: "start", date: "2025-12-31", issue_order: ["seed", "series_a"] });
  });
});

describe("a cap table entered directly", () => {
  it("starts a company's rounds with no date and no issue order, and its first round is Series A", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Start from/), { target: { value: "scratch" } });
    openTab("Rounds");
    click("Add a round");
    expect(titles()).toEqual(["1. The cap table it starts from", "2. Series A Preferred, a priced round"]);
    expect(within(card(/^1\./)).getByText("No date")).toBeTruthy();
  });
});

describe("the starting table, as the page holds it", () => {
  const files: OcfFile[] = readdirSync(resolve(cases, "ocf-12-ledger/package")).map((name) => ({ name, content: caseJson(`ocf-12-ledger/package/${name}`) }));
  const imported = readOcf(files);
  const quillfern = () => draftFromExit({ cap_table: imported.cap_table, range: ["0", "100000000"] });

  it("gives a grant at a strike an imported option class already has to that class (0.5.0 plan, answers)", () => {
    const start = startingRounds(quillfern(), { date: imported.as_of, issueOrder: imported.issue_order });
    const withGrant = addEvent(start, "grant_options", null);
    const grant = withGrant.events.at(-1)!;
    const employeeD = withGrant.holders.find((h) => h.fileId === "employee_d")!.key;
    const rounds = setEvent(withGrant, grant.key, { ...grant.json, grants: [{ holder: employeeD, shares: "1000", strike: "0.10" }] });
    const { holders, events } = buildRounds(rounds);
    const after = buildCapTables({ holders, events }).at(-1)!.capTable;
    expect(after.securities.filter((s) => s.kind === "option").map((s) => s.id)).toEqual(["options_0.1", "options_0.25"]);
    expect(after.positions.find((p) => p.holder === "employee_d" && p.security === "options_0.1")!.shares.toNumber()).toBe(201000);
  });

  it("carries a conversion group through the rounds after it", () => {
    const exit = caseJson("edge-06b-forced-class/inputs.json").exit;
    const start = startingRounds(draftFromExit(exit), null);
    const issued = addEvent(start, "issue", null);
    const issue = issued.events.at(-1)!;
    const rounds = setEvent(issued, issue.key, { ...issue.json, issues: [{ holder: issued.holders[0]!.key, shares: "1000" }] });
    const built = fromRounds(buildRounds(rounds), ["0", "50000000"]);
    if (!built.ok) throw built.error;
    expect(buildExit(built.draft).json.cap_table.conversion_groups).toEqual([{ series: ["seed_1", "seed_2"], vote_threshold_percent: "50", vote_rule: "more_than" }]);
  });

  it("keeps an import's issue order to what the table holds: a series added counts as issued before its SAFEs and notes", () => {
    const table = quillfern();
    const start = startingRounds({ ...table, securities: table.securities.filter((s) => s.fileId !== "seed") }, { date: imported.as_of, issueOrder: ["seed", "series_a", "gone"] });
    expect(buildRounds(start).events[0]!.issue_order).toEqual(["series_a"]);
  });

  it("can't be moved or removed, in the model too", () => {
    const start = startingRounds(quillfern(), null);
    const next = addEvent(start, "priced_round", null);
    const [first, second] = next.events;
    expect(moveEvent(next, second!.key, -1)).toBe(next);
    expect(moveEvent(next, first!.key, 1)).toBe(next);
    expect(removeEvent(next, first!.key)).toBe(next);
  });
});
