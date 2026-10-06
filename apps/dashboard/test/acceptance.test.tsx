// M4k's acceptance test (M4j review): starting from "A blank company, built
// from its rounds", build the engine README's rounds example by hand in the
// editor, clicked through as a founder would, and get the README's numbers:
// the SAFE converting at $0.90 into 1,111,111 shares, the round at $1.730769,
// the same three breakpoints with the same reasons, and the same payouts at
// $20M and $60M to the cent. The README's own test (packages/engine/test/
// readme.test.ts) checks those numbers are what the engine prints for its
// example.

import { fireEvent, render, screen, within } from "@testing-library/react";
import { D, findBreakpoints, prepare, readExit, solve, toCents } from "spillpoint";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { App } from "../src/App.tsx";
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
  const list = await screen.findByRole("heading", { name: "Breakpoints" });
  const items = await vi.waitFor(() => {
    const found = [...list.closest("section")!.querySelectorAll("ol.breakpoints > li")];
    expect(found).toHaveLength(3);
    return found;
  });
  expect(items.map((li) => li.querySelector(".breakpoints__value")!.textContent!.split(" ")[0])).toEqual(["$5,999,998", "$14,099,998", "$22,499,998"]);
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
