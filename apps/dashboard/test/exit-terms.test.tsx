// M5l: the Exit terms card, on cap tables entered directly and built from
// rounds (M5 plan, item 13), and Paid over time on the Payouts tab (item 14),
// with X8's warning on a payment that lowers a running total.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { D, prepare, readInputs, solve } from "spillpoint";
import examples from "virtual:examples";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App.tsx";
import { shortDollars } from "../src/format.ts";

const casesDir = resolve(import.meta.dirname, "../../../cases");
const caseExit = (name: string) => JSON.parse(readFileSync(resolve(casesDir, name, "inputs.json"), "utf8")).exit;
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
const openTab = (name: "Payouts" | "Cap table" | "Rounds") => fireEvent.click(screen.getByRole("tab", { name }));
const headline = () => screen.getByRole("heading", { level: 1 }).textContent;
const terms = () => screen.getByRole("heading", { name: "Exit terms" }).closest("section")!;
const paidOverTime = () => screen.getByRole("heading", { name: "Paid over time", level: 2 }).closest("section")!;
const choose = (select: HTMLElement, label: string) => fireEvent.change(select, { target: { value: (within(select).getByRole("option", { name: label }) as HTMLOptionElement).value } });

async function openFile(file: Record<string, unknown>, name = "case.json") {
  fireEvent.change(screen.getByLabelText("Open a saved cap table"), { target: { files: [new File([JSON.stringify(file)], name, { type: "application/json" })] } });
  await screen.findByText(`Opened ${name}.`);
}

let downloads: Blob[];
beforeEach(() => {
  downloads = [];
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: (blob: Blob) => (downloads.push(blob), "blob:saved") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: () => {} });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("a carve-out on Millrace, built from its rounds (M5l review)", () => {
  /** What Ana gets at $100M with a flat carve-out added to the cap table the engine builds from Millrace's events, apart from the page. */
  function anaWithCarveOut(percent: string, events = examples[0]!.company!.events as Record<string, unknown>[]): string {
    const company = { holders: examples[0]!.company!.holders, events };
    const exit = readInputs({ ...company, exit: { cap_table_after_event: "series_b", range: ["0", "300000000"], exit_values: [] } });
    const carveOut = { timing: "before_preferences" as const, tiers: [{ from: new D(0), to: null, rate: new D(percent).div(100) }], allocation: [{ holder: "dev", share: new D(1) }] };
    const totals = solve(prepare({ ...exit.capTable, carveOut }), new D("100000000")).answers[0]!.payout.holderTotals;
    return `At $100M you get ${shortDollars(totals.get("ana")!)}`;
  }

  it("adds one in the Exit terms card, though the cap table can't be edited, and the payouts take it in", () => {
    render(<App />);
    openTab("Cap table");
    // The cap table itself is the rounds': locked. The sale's terms aren't.
    expect(screen.getByText(/so it can't be edited here/)).toBeTruthy();
    const card = terms();
    expect(within(card).getByRole("button", { name: "Add a carve-out" }).matches(":disabled")).toBe(false);
    fireEvent.click(within(card).getByRole("button", { name: "Add a carve-out" }));
    type(within(card).getByLabelText("Percent of the exit value in it (%)"), "5");
    choose(within(card).getByLabelText("Recipient 1"), "Dev Patel");
    openTab("Payouts");
    expect(screen.queryByText(/has a problem/)).toBeNull();
    expect(headline()).toBe(anaWithCarveOut("5"));
    expect(headline()).not.toBe("At $100M you get $9.75M");
  });

  it("keeps it when the rounds change, and saves it with the sale's terms (file version 5)", async () => {
    render(<App />);
    openTab("Cap table");
    fireEvent.click(within(terms()).getByRole("button", { name: "Add a carve-out" }));
    type(within(terms()).getByLabelText("Percent of the exit value in it (%)"), "5");
    choose(within(terms()).getByLabelText("Recipient 1"), "Dev Patel");
    // A change to the Series B: the cap table is built again, and the carve-out stays, still Dev's.
    openTab("Rounds");
    fireEvent.click(screen.getByRole("button", { name: "Edit Series B Preferred, a priced round" }));
    const seriesB = within(document.getElementById("panel-rounds")!).getByRole("heading", { level: 3, name: /Series B Preferred/ }).closest("li")!;
    type(within(within(seriesB).getByRole("group", { name: /Investor 1/ })).getByLabelText("Amount ($)"), "12M");
    expect(within(document.getElementById("panel-rounds")!).queryAllByRole("alert")).toEqual([]);
    openTab("Cap table");
    expect((within(terms()).getByLabelText("Recipient 1") as HTMLSelectElement).selectedOptions[0]!.textContent).toBe("Dev Patel");
    openTab("Payouts");
    const changed = (examples[0]!.company!.events as Record<string, unknown>[]).map((e) =>
      e.id === "series_b" ? { ...e, investments: [{ holder: "cobalt", amount: "12000000" }] } : e,
    );
    expect(headline()).toBe(anaWithCarveOut("5", changed));

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const file = JSON.parse(await downloads.at(-1)!.text());
    expect(Object.keys(file)).toEqual(["format", "version", "name", "holders", "events", "cap_table_after_event", "range", "carve_out", "view"]);
    expect(file.carve_out).toEqual({ timing: "before_preferences", tiers: [{ from: "0", to: null, percent: "5" }], allocation: [{ holder: "dev", percent: "100" }] });
    await openFile(file, "millrace-with-carve-out.json");
    expect(headline()).toBe(anaWithCarveOut("5", changed));
  });
});

describe("the Rounds tab points to the sale's terms (M5l review)", () => {
  it("says where they are, and its link opens the Cap table tab at the Exit terms card", async () => {
    render(<App />);
    openTab("Rounds");
    const line = screen.getByText(/^The sale's terms/);
    expect(line.textContent).toBe("The sale's terms (date, management carve-out, earnout or escrow) are on the Cap table tab, under Exit terms.");
    fireEvent.click(within(line).getByRole("button", { name: "Exit terms" }));
    expect(screen.getByRole("tab", { name: "Cap table" }).getAttribute("aria-selected")).toBe("true");
    await vi.waitFor(() => expect(document.activeElement).toBe(terms()));
  });
});

describe("paid over time (M5 plan, item 14)", () => {
  it("shows each payment's takes for both of case 11's schedules, to the cent", async () => {
    render(<App />);
    const exit = caseExit("edge-11-earnout");
    await openFile({ format: "spillpoint", version: 4, name: "Case 11", cap_table: exit.cap_table, range: exit.range, payment_schedules: exit.payment_schedules });
    const expected = JSON.parse(readFileSync(resolve(casesDir, "edge-11-earnout/expected.json"), "utf8")).exit.payment_schedules;
    const names: Record<string, string> = { founder_a: "Founder A", founder_b: "Founder B", investor_x: "Investor X", investor_y: "Investor Y" };
    const section = paidOverTime();
    for (const schedule of expected) {
      const table = within(within(section).getByRole("heading", { name: schedule.description }).closest(".payments") as HTMLElement).getByRole("table");
      for (const [holder, name] of Object.entries(names)) {
        const cells = [...within(table).getByRole("rowheader", { name: new RegExp(`^${name}`) }).closest("tr")!.querySelectorAll("td")].map((td) => td.textContent);
        const takes = schedule.payments.map((p: { holder_totals: Record<string, string> }) => `$${Number(p.holder_totals[holder]).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
        expect([schedule.id, name, cells.slice(0, -1)]).toEqual([schedule.id, name, takes]);
      }
    }
    // Neither schedule lowers anyone's running total.
    expect(within(section).queryByRole("note")).toBeNull();
  });

  it("warns on a payment that lowers a running total: case 6b's company, $29M at closing and a $2M earnout (X8)", async () => {
    render(<App />);
    const exit = caseExit("edge-06b-forced-class");
    await openFile({ format: "spillpoint", version: 4, name: "Case 6b", cap_table: exit.cap_table, range: exit.range });
    openTab("Cap table");
    fireEvent.click(within(terms()).getByRole("button", { name: "Add a payment schedule" }));
    const schedule = within(terms()).getByRole("group", { name: "Schedule 1" });
    type(within(schedule).getAllByLabelText("Amount ($)")[0]!, "29M");
    type(within(schedule).getAllByLabelText("Amount ($)")[1]!, "2M");
    expect(within(schedule).getByText("In all, $31,000,000.")).toBeTruthy();
    openTab("Payouts");
    const section = paidOverTime();
    // At $29M the group stays preferred; at $31M in all it converts, so the founders give some of the closing back.
    expect(within(section).getByRole("note").textContent).toBe(
      "The payment “Earnout” lowers what Founder A and Founder B have been paid so far. Founder A gives back $150,000.00 and Founder B gives back $50,000.00. " +
        "At $31,000,000 paid in all, Seed-1 Preferred and Seed-2 Preferred convert, unlike at $29,000,000. " +
        "Each payment's takes are worked out on everything paid so far, as if it had all been paid at closing, so a later payment can take back part of an earlier one.",
    );
    const row = (name: string) => [...within(section).getByRole("rowheader", { name: new RegExp(`^${name}`) }).closest("tr")!.querySelectorAll("td")].map((td) => td.textContent);
    expect(row("Founder A")).toEqual(["$18,750,000.00", "−$150,000.00 (lowers the running total)", "$18,600,000.00"]);
    expect(row("Founder B")).toEqual(["$6,250,000.00", "−$50,000.00 (lowers the running total)", "$6,200,000.00"]);
    expect(row("Investor X")).toEqual(["$1,000,000.00", "$2,100,000.00", "$3,100,000.00"]);
    expect(row("Investor Y")).toEqual(["$3,000,000.00", "$100,000.00", "$3,100,000.00"]);
  });
});

describe("case 11b, opened as a file with exactly its inputs (0.3.0 work, 03j)", () => {
  it("warns that the earnout lowers what the founders have been paid so far (X8)", async () => {
    const exit = caseExit("edge-11b-earnout-negative-take");
    render(<App />);
    await openFile({ format: "spillpoint", version: 5, name: "Case 11b", cap_table: exit.cap_table, range: exit.range, payment_schedules: exit.payment_schedules });
    // At $29M the Seeds keep their preferences; at the cumulative $31M they convert together, so the earnout is paid
    // where it would have gone at closing, and the founders' running totals fall: $150,000 and $50,000 (11b's derivation).
    const warning = document.querySelector(".payments__warning")!;
    expect(warning.textContent).toBe(
      "The payment “earnout” lowers what Founder A and Founder B have been paid so far. Founder A gives back $150,000.00 and Founder B gives back $50,000.00. " +
        "At $31,000,000 paid in all, Seed-1 Preferred and Seed-2 Preferred convert, unlike at $29,000,000. " +
        "Each payment's takes are worked out on everything paid so far, as if it had all been paid at closing, so a later payment can take back part of an earlier one.",
    );
  });
});
