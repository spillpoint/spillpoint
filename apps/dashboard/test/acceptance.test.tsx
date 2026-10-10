// M4k's acceptance test (M4j review): starting from "A blank company, built
// from its rounds", build the engine README's rounds example by hand in the
// editor, clicked through as a founder would, and get the README's numbers:
// the SAFE converting at $0.90 into 1,111,111 shares, the round at $1.730769,
// the same three breakpoints with the same reasons, and the same payouts at
// $20M and $60M to the cent. The README's own test (packages/engine/test/
// readme.test.ts) checks those numbers are what the engine prints for its
// example.
//
// M5k's (M5i review): a founder, a convertible note and a priced round, from
// a blank company, with the payouts after each, never choosing which event
// they use: they follow the last one.

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { D, findBreakpoints, prepare, readExit, readInputs, solve, toCents } from "spillpoint";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { App } from "../src/App.tsx";
import { analysed } from "./analysis.ts";
import { shortDollars } from "../src/format.ts";
import { exitOf } from "./payouts.ts";

const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const panel = () => document.getElementById("panel-rounds")!;
const card = (title: RegExp) => within(panel()).getByRole("heading", { level: 3, name: title }).closest("li")!;
const group = (title: RegExp, name: RegExp) => within(card(title)).getByRole("group", { name });
const holders = () => within(within(panel()).getByRole("heading", { name: "Holders" }).closest("section")!);
const choose = (select: HTMLElement, label: string) => fireEvent.change(select, { target: { value: within(select).getByRole("option", { name: label }).getAttribute("value") } });
const addEvent = (label: string) => {
  choose(within(panel()).getByLabelText("Type of event"), label);
  click("Add it at the end");
};

/** The README's output, by holder name and to the cent. */
const README = {
  breakpoints: ["5999998.36", "14099998.36", "22499998.27"],
  reasons: [
    "The preferences of Series A Preferred and Series A Preferred (from SAFEs) are paid in full here: $5,999,998.36. Above this exit value, the next dollar goes to Common Stock.",
    "Series A Preferred (from SAFEs) converts to common here. Its 1,111,111 as-converted shares are worth $999,999.90 at $0.90 each, the same as its 1x preference of $999,999.90. Below this exit value keeping its preference pays more; above it, converting does.",
    "Series A Preferred converts to common here. Its 2,888,888 as-converted shares are worth $4,999,998.46 at $1.730769 each, the same as its 1x preference of $4,999,998.46. Below this exit value keeping its preference pays more; above it, converting does.",
  ],
  payouts: {
    "20000000": { "Ana (founder)": "13351649.87", "Seed Fund": "1648351.67", "Series A Fund": "4999998.46" },
    "60000000": { "Ana (founder)": "41538464.73", "Seed Fund": "5128205.01", "Series A Fund": "13333330.26" },
  },
};

let downloads: Blob[];
beforeEach(() => {
  downloads = [];
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: (blob: Blob) => (downloads.push(blob), "blob:saved") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: () => {} });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

it("builds the README's rounds example by hand, from a blank company, and gets the README's numbers", async () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText(/Start from/), { target: { value: "scratch-rounds" } });
  fireEvent.click(screen.getByRole("tab", { name: "Rounds" }));

  // The holders: the founder, the seed fund and the Series A fund.
  type(holders().getByRole("textbox", { name: "Holder name" }), "Ana (founder)");
  click("Add a holder");
  type(holders().getAllByRole("textbox", { name: "Holder name" })[1]!, "Seed Fund");
  click("Add a holder");
  type(holders().getAllByRole("textbox", { name: "Holder name" })[2]!, "Series A Fund");

  // 1. The founder holds 9,000,000 common.
  click("Edit Common Stock issued");
  type(within(group(/Common Stock issued/, /Holder 1: Ana \(founder\)/)).getByLabelText("Shares"), "9,000,000");

  // 2. A 10% option pool.
  addEvent("An option pool");
  type(within(card(/Option pool created/)).getByLabelText("Percent of the fully diluted shares after it"), "10");

  // 3. A $1,000,000 post-money SAFE capped at $10,000,000.
  addEvent("SAFEs");
  const safe = group(/A SAFE/, /SAFE 1/);
  choose(within(safe).getByLabelText("Holder"), "Seed Fund");
  type(within(safe).getByLabelText("Amount ($)"), "1M");
  expect((within(safe).getByLabelText("Cap") as HTMLSelectElement).value).toBe("post");
  type(within(safe).getByLabelText("Valuation cap ($)"), "10M");

  // 4. A $5,000,000 Series A at a $20,000,000 pre-money valuation, topping the pool up to 10%.
  addEvent("A priced round");
  const round = card(/Series A Preferred, a priced round/);
  type(within(round).getByLabelText("Pre-money valuation ($)"), "20M");
  type(within(round).getByLabelText("Option pool after the round (% of the company)"), "10");
  const investor = group(/Series A Preferred/, /Investor 1/);
  choose(within(investor).getByLabelText("Investor"), "Series A Fund");
  type(within(investor).getByLabelText("Amount ($)"), "5M");
  // The README's Series A: 1x, non-participating, broad-based anti-dilution, as a new series starts.
  expect((within(round).getByLabelText("Preference (× the issue price)") as HTMLInputElement).value).toBe("1");
  expect((within(round).getByLabelText("Anti-dilution") as HTMLSelectElement).value).toBe("broad_based");

  // The README's numbers, on the Series A card.
  expect(within(panel()).queryAllByRole("alert")).toEqual([]);
  const said = [...round.querySelectorAll(".rounds__lines li")].map((li) => li.textContent);
  expect(said[0]).toBe("$5,000,000 at a $20,000,000 pre-money valuation, $25,000,000 post-money: $1.730769 a share.");
  expect(said).toContain("Seed Fund's SAFE converts at its cap price, $0.900000 a share, into 1,111,111 shares of Series A Preferred (from SAFEs).");
  expect(said).toContain("Series A Fund invests $5,000,000 for 2,888,888 shares of Series A Preferred.");

  // The same three breakpoints, with the same reasons, on the Payouts tab.
  fireEvent.click(screen.getByRole("tab", { name: "Payouts" }));
  // The breakpoints are worked out in the background once the last edit settles: wait for them, not a fixed second.
  const items = [...(await analysed()).querySelectorAll("ol.breakpoints > li")];
  expect(items).toHaveLength(3);
  expect(items.map((li) => li.querySelector(".breakpoints__value")!.textContent!.split(" ")[0])).toEqual(["$5,999,998.36", "$14,099,998.36", "$22,499,998.27"]);
  expect(items.map((li) => li.querySelector(".breakpoints__reason")!.textContent)).toEqual(README.reasons);

  // And to the cent, from the saved file: the breakpoints, and the payouts at $20M and $60M.
  click("Save");
  const exit = readExit(exitOf(await downloads[0]!.text()));
  const pc = prepare(exit.capTable);
  expect(findBreakpoints(pc, exit.range).map((b) => toCents(b.exitValue))).toEqual(README.breakpoints);
  for (const [value, expected] of Object.entries(README.payouts)) {
    const totals = solve(pc, new D(value)).answers[0]!.payout.holderTotals;
    const byName = Object.fromEntries(exit.capTable.holders.filter((h) => totals.has(h.id)).map((h) => [h.name, toCents(totals.get(h.id)!)]));
    expect(byName).toEqual(expected);
  }
});

/**
 * The same company written by hand in the engine's own format, apart from
 * the page: what each holder gets at $50M on the cap table after an event.
 */
function engineAt50M(after: "notes" | "series_a"): Map<string, string> {
  const company = {
    holders: [
      { id: "ana", name: "Ana (founder)" },
      { id: "nadia", name: "Nadia" },
      { id: "fund", name: "Fund" },
    ],
    events: [
      { id: "founding", date: null, type: "issue", security: { id: "common", name: "Common Stock", kind: "common" }, issues: [{ holder: "ana", shares: "10000000" }] },
      {
        id: "notes", date: "2025-01-01", type: "notes",
        notes: [
          {
            id: "note", holder: "nadia", principal: "500000", interest_rate: "0.06", interest_method: "simple", issue_date: "2025-01-01", valuation_cap: "8000000",
            cap_type: "pre_money", conversion_base: "with_pool", discount: "0.2", repayment_multiple: "1",
          },
        ],
      },
      {
        id: "series_a", date: "2026-01-01", type: "priced_round",
        series: { id: "series_a", name: "Series A Preferred", kind: "preferred", preference_multiple: "1", participation: "non_participating", cap_multiple: null, anti_dilution: "broad_based" },
        pre_money: "20000000", investments: [{ holder: "fund", amount: "5000000" }], seniority: [["series_a"]], convert_notes: true,
      },
    ],
  };
  const exit = readInputs({ ...company, exit: { cap_table_after_event: after, range: ["0", "100000000"], exit_values: [], exit_date: "2026-01-01" } });
  const totals = solve(prepare(exit.capTable, exit.exitDate), new D("50000000")).answers[0]!.payout.holderTotals;
  return new Map(company.holders.map((h) => [h.name, shortDollars(totals.get(h.id) ?? new D(0))]));
}

it("builds a founder, a note and a round from a blank company, with payouts after each, never choosing which event they use", async () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText(/Start from/), { target: { value: "scratch-rounds" } });
  fireEvent.click(screen.getByRole("tab", { name: "Rounds" }));
  const after = () => (within(panel()).getByLabelText("The payouts use the cap table after") as HTMLSelectElement).value;
  const headline = () => screen.getByRole("heading", { level: 1 }).textContent;

  // The founder, with the blank company's 10,000,000 common, a noteholder and an investor.
  type(holders().getByRole("textbox", { name: "Holder name" }), "Ana (founder)");
  click("Add a holder");
  type(holders().getAllByRole("textbox", { name: "Holder name" })[1]!, "Nadia");
  click("Add a holder");
  type(holders().getAllByRole("textbox", { name: "Holder name" })[2]!, "Fund");

  // A $500,000 note from Nadia: 6% simple interest, a $8M pre-money cap and a 20% discount, issued Jan 1, 2025.
  addEvent("Convertible notes");
  type(within(card(/A convertible note/)).getByLabelText("Date"), "2025-01-01");
  const note = group(/A convertible note/, /Note 1/);
  choose(within(note).getByLabelText("Holder"), "Nadia");
  type(within(note).getByLabelText("Principal ($)"), "500,000");
  type(within(note).getByLabelText("Simple interest (% a year)"), "6");
  type(within(note).getByLabelText("Issued"), "2025-01-01");
  type(within(note).getByLabelText("Pre-money valuation cap ($)"), "8M");
  type(within(note).getByLabelText("Discount (%)"), "20");
  expect(within(panel()).queryAllByRole("alert")).toEqual([]);
  // The payouts follow the last event, so the note is outstanding at the sale, and the note's event says so.
  expect(after()).toBe("notes");
  expect(within(card(/A convertible note/)).getByText("Nadia's convertible note isn't converted by any later round, so it will be outstanding at the sale.")).toBeTruthy();

  // Its interest runs to the sale, so the payouts ask for the sale's date; "Fix it" goes to the field.
  fireEvent.click(screen.getByRole("tab", { name: "Payouts" }));
  const payouts = document.getElementById("panel-payouts")!;
  expect(within(payouts).getByText(/Fill this in: a convertible note accrues interest up to the date of the sale\./)).toBeTruthy();
  fireEvent.click(within(payouts).getByRole("button", { name: "Fix it" }));
  const date = screen.getByLabelText("Date of the sale");
  await waitFor(() => expect(document.activeElement).toBe(date));
  type(date, "2026-01-01");

  // At $50M the note converts at its cap and Ana gets what the engine gives on the same company, written by hand.
  fireEvent.click(screen.getByRole("tab", { name: "Payouts" }));
  const atNote = engineAt50M("notes");
  expect(headline()).toBe(`At $50M you get ${atNote.get("Ana (founder)")}`);
  click("By class");
  expect(within(payouts).getByRole("rowheader", { name: /^Nadia's convertible note/ })).toBeTruthy();
  expect(within(payouts).getByText(/Nadia's convertible note converts to common here\./)).toBeTruthy();

  // A $5M Series A at a $20M pre-money valuation on Jan 1, 2026. It starts converting the note, as it would the SAFEs.
  fireEvent.click(screen.getByRole("tab", { name: "Rounds" }));
  addEvent("A priced round");
  const round = card(/Series A Preferred, a priced round/);
  expect((within(round).getByLabelText("Converts the convertible notes still outstanding") as HTMLInputElement).checked).toBe(true);
  type(within(round).getByLabelText("Date"), "2026-01-01");
  type(within(round).getByLabelText("Pre-money valuation ($)"), "20M");
  const investor = group(/Series A Preferred/, /Investor 1/);
  choose(within(investor).getByLabelText("Investor"), "Fund");
  type(within(investor).getByLabelText("Amount ($)"), "5M");
  expect(within(panel()).queryAllByRole("alert")).toEqual([]);

  // A year at 6% is $30,000; $530,000 at the cap price, $8M ÷ 10,000,000 shares = $0.80, is 662,500 shares.
  const said = [...round.querySelectorAll(".rounds__lines li")].map((li) => li.textContent);
  expect(said).toContain("Nadia's note converts $530,000.00 ($500,000.00 and $30,000.00 interest) at its cap price, $0.80 a share, into 662,500 shares of Series A Preferred (from notes).");
  // The payouts moved to the round by themselves, and the note isn't outstanding at the sale any more.
  expect(after()).toBe("series_a");
  expect(within(round).getByText("The payouts use the cap table after this event.")).toBeTruthy();
  expect(within(card(/A convertible note/)).queryByText(/outstanding at the sale/)).toBeNull();

  fireEvent.click(screen.getByRole("tab", { name: "Payouts" }));
  const atRound = engineAt50M("series_a");
  expect(headline()).toBe(`At $50M you get ${atRound.get("Ana (founder)")}`);
  expect(atRound.get("Ana (founder)")).not.toBe(atNote.get("Ana (founder)"));
  await analysed();
});
