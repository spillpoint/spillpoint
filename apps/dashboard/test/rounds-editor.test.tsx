// Editing Millrace's rounds (M4j), clicked through in a simulated browser:
// opening an event, changes reaching the payouts, the engine's messages next
// to the fields they name, lines added and removed, holders, seniority,
// pay-to-play, and what a save keeps; and since M5k, SAFEs and notes still
// outstanding, from the events as typed. Since 03i, SAFEs and notes in a round
// that triggers anti-dilution: each piece's line, and the settings that apply.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { D, buildCapTables, prepare, readInputs, solve } from "spillpoint";
import examples from "virtual:examples";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App.tsx";
import { ANALYSIS_TIMEOUT } from "./analysis.ts";
import { shortDollars } from "../src/format.ts";

const headline = () => screen.getByRole("heading", { level: 1 }).textContent;
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
const openTab = (name: "Payouts" | "Cap table" | "Rounds") => fireEvent.click(screen.getByRole("tab", { name }));
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const panel = () => document.getElementById("panel-rounds")!;
/** The event card headed by this title. */
const card = (title: RegExp) => within(panel()).getByRole("heading", { level: 3, name: title }).closest("li")!;
const lines = (title: RegExp) => [...card(title).querySelectorAll(".rounds__lines li")].map((li) => li.textContent);
const group = (title: RegExp, name: RegExp) => within(card(title)).getByRole("group", { name });
const edit = (title: string) => click(`Edit ${title}`);
/** Adds an event of this type at the end of the list. */
const addEvent = (label: string) => {
  const select = within(panel()).getByLabelText("Type of event");
  fireEvent.change(select, { target: { value: within(select).getByRole("option", { name: label }).getAttribute("value") } });
  click("Add it at the end");
};

/** What Ana gets at $100M on Millrace with its inputs changed: the engine on the case's own files, independently of the page. */
function anaAt100M(change: (events: Record<string, unknown>[]) => void): string {
  const inputs = structuredClone({ holders: examples[0]!.company!.holders, events: examples[0]!.company!.events, exit: examples[0]!.exit }) as {
    holders: unknown[];
    events: Record<string, unknown>[];
    exit: unknown;
  };
  change(inputs.events);
  const pc = prepare(readInputs(inputs).capTable);
  return `At $100M you get ${shortDollars(solve(pc, new D("100000000")).answers[0]!.payout.holderTotals.get("ana")!)}`;
}

let downloads: Blob[];
beforeEach(() => {
  downloads = [];
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: (blob: Blob) => (downloads.push(blob), "blob:saved") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: () => {} });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
const savedFile = async () => {
  click("Save");
  return JSON.parse(await downloads.at(-1)!.text());
};

describe("opening an event", () => {
  it("shows its fields in place, and Done closes them", () => {
    render(<App />);
    openTab("Rounds");
    const button = screen.getByRole("button", { name: "Edit Seed Preferred, a priced round" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    const seed = card(/Seed Preferred/);
    expect((within(seed).getByLabelText("Pre-money valuation ($)") as HTMLInputElement).value).toBe("7500000");
    expect((within(group(/Seed Preferred/, /Investor 1: Harbor Lane Ventures Fund I/)).getByLabelText("Amount ($)") as HTMLInputElement).value).toBe("2500000");
    // The first round has no earlier series to rank against.
    expect(within(seed).queryByLabelText("How it ranks against the earlier series")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Done Seed Preferred, a priced round" }));
    expect(within(seed).queryByLabelText("Pre-money valuation ($)")).toBeNull();
  });

  it("shows discounts and interest as percentages", () => {
    render(<App />);
    openTab("Rounds");
    edit("SAFEs");
    expect((within(group(/SAFEs/, /SAFE 1: Priya Shah/)).getByLabelText("Discount (%)") as HTMLInputElement).value).toBe("0");
    expect((within(group(/SAFEs/, /SAFE 1: Priya Shah/)).getByLabelText("Cap") as HTMLSelectElement).value).toBe("post");
  });
});

describe("a change to the rounds", () => {
  it("that a later round can't take is caught there: a $10M Seed leaves Harbor Lane's $3M above its Series A pro-rata", () => {
    render(<App />);
    openTab("Rounds");
    edit("Seed Preferred, a priced round");
    type(within(card(/Seed Preferred/)).getByLabelText("Pre-money valuation ($)"), "10M");
    expect(within(card(/Series A Preferred/)).getByRole("alert").textContent).toMatch(
      /^This event has a problem, so the payouts can't update: Harbor Lane Ventures Fund I's pro-rata investment of \$3,000,000\.00 is more than its pro-rata entitlement of \$[\d,]+\.\d\d/,
    );
  });

  it("goes straight to the payouts: the Seed at a $7M pre-money valuation", () => {
    render(<App />);
    openTab("Rounds");
    edit("Seed Preferred, a priced round");
    type(within(card(/Seed Preferred/)).getByLabelText("Pre-money valuation ($)"), "7M");
    expect(lines(/Seed Preferred/)[0]).toMatch(/^\$2,500,000 at a \$7,000,000 pre-money valuation, \$9,500,000 post-money: \$0\.\d{6} a share\.$/);
    openTab("Payouts");
    expect(headline()).toBe(anaAt100M((events) => (events[5]!.pre_money = "7000000")));
    expect(headline()).not.toBe("At $100M you get $9.75M");
    expect(screen.getByText("Not saved")).toBeTruthy();
  });

  it("puts the engine's message next to the field, keeps the payouts, won't save, and takes you back to the field", async () => {
    render(<App />);
    openTab("Rounds");
    edit("Seed Preferred, a priced round");
    const amount = within(group(/Seed Preferred/, /Investor 1/)).getByLabelText("Amount ($)");
    type(amount, "a lot");
    const message = '"a lot" is not an exact number (an integer, a decimal, or "a/b")';
    expect(amount.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(`${amount.id}-error`)!.textContent).toBe(message);
    expect(within(card(/Seed Preferred/)).getByRole("alert").textContent).toBe(`This event has a problem, so the payouts can't update: ${message}`);

    openTab("Payouts");
    expect(screen.getByText(/Your last change to the rounds has a problem, so these payouts are from before it\./)).toBeTruthy();
    expect(headline()).toBe("At $100M you get $9.75M");
    click("Save");
    expect(downloads).toEqual([]);
    expect(screen.getAllByRole("alert").map((a) => a.textContent)).toContain(`Not saved: the rounds have a problem to fix first. ${message}`);

    click("Fix it");
    expect(screen.getByRole("tab", { name: "Rounds" }).getAttribute("aria-selected")).toBe("true");
    await vi.waitFor(() => expect(document.activeElement).toBe(amount), { timeout: ANALYSIS_TIMEOUT });
    type(amount, "2.5M");
    expect(within(card(/Seed Preferred/)).queryByRole("alert")).toBeNull();
    openTab("Payouts");
    expect(headline()).toBe("At $100M you get $9.75M");
  });

  it("saves a percentage as an exact fraction, and keeps every other field as it was", async () => {
    render(<App />);
    openTab("Rounds");
    edit("SAFEs");
    type(within(group(/SAFEs/, /SAFE 1: Priya Shah/)).getByLabelText("Discount (%)"), "6.5");
    const file = await savedFile();
    const original = examples[0]!.company!.events as Record<string, unknown>[];
    expect(file.events[2].safes[0]).toEqual({ ...(original[2]!.safes as object[])[0], discount: "0.065" });
    expect(file.events.filter((_: unknown, i: number) => i !== 2)).toEqual(original.filter((_, i) => i !== 2));
  });
});

describe("lines within an event", () => {
  it("adds an investor to the Series A, and removes it", () => {
    render(<App />);
    openTab("Rounds");
    edit("Series A Preferred, a priced round");
    click("Add an investor");
    const added = group(/Series A Preferred/, /Investor 3: Ana Ortiz/);
    // Blank until an amount is typed: the engine says what's missing.
    expect(within(added).getByLabelText("Amount ($)").getAttribute("aria-invalid")).toBe("true");
    type(within(added).getByLabelText("Amount ($)"), "1M");
    expect(lines(/Series A Preferred/)).toContain(lines(/Series A Preferred/).find((l) => l?.startsWith("Ana Ortiz invests $1,000,000 for ")));
    openTab("Payouts");
    expect(headline()).toBe(anaAt100M((events) => (events[7]!.investments as object[]).push({ holder: "ana", amount: "1000000" })));
    openTab("Rounds");
    click("Remove Investor 3: Ana Ortiz");
    openTab("Payouts");
    expect(headline()).toBe("At $100M you get $9.75M");
  });
});

describe("holders", () => {
  it("adds one, names them in an event, and can't remove them while they're named", async () => {
    render(<App />);
    openTab("Rounds");
    const holders = () => within(screen.getByRole("heading", { name: "Holders", hidden: false }).closest("section")!);
    click("Add a holder");
    const names = holders().getAllByRole("textbox", { name: "Holder name" });
    type(names.at(-1)!, "Bea Novak");
    expect((holders().getByRole("button", { name: "Remove Bea Novak" }) as HTMLButtonElement).disabled).toBe(false);
    expect((holders().getByRole("button", { name: "Remove Ana Ortiz" }) as HTMLButtonElement).disabled).toBe(true);
    const why = holders().getByRole("button", { name: "Remove Ana Ortiz" }).getAttribute("aria-describedby")!;
    expect(document.getElementById(why)!.textContent).toBe("Named in an event, so it can't be removed until it's taken out of it.");

    edit("Series B Preferred, a priced round");
    click("Add an investor");
    const added = group(/Series B Preferred/, /Investor 2/);
    fireEvent.change(within(added).getByLabelText("Investor"), { target: { value: within(added).getByRole("option", { name: "Bea Novak" }).getAttribute("value") } });
    type(within(added).getByLabelText("Amount ($)"), "500000");
    expect((holders().getByRole("button", { name: "Remove Bea Novak" }) as HTMLButtonElement).disabled).toBe(true);
    const file = await savedFile();
    expect(file.holders.at(-1)).toEqual({ id: "bea_novak", name: "Bea Novak" });
    expect(file.events[9].investments[1]).toEqual({ holder: "bea_novak", amount: "500000" });
  });
});

describe("how a round ranks", () => {
  it("reads Millrace's Series A as senior, and puts it alongside the Seed when chosen", async () => {
    render(<App />);
    openTab("Rounds");
    edit("Series A Preferred, a priced round");
    const rank = within(card(/Series A Preferred/)).getByLabelText("How it ranks against the earlier series") as HTMLSelectElement;
    expect(rank.value).toBe("senior");
    expect(within(rank).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Alongside Seed Preferred and the rest of its tier (pari passu)",
      "Senior to every earlier series",
    ]);
    fireEvent.change(rank, { target: { value: "alongside" } });
    const file = await savedFile();
    expect(file.events[7].seniority).toEqual([["series_a", "seed", "seed_shadow"]]);
    openTab("Payouts");
    expect(headline()).toBe(anaAt100M((events) => (events[7]!.seniority = [["series_a", "seed", "seed_shadow"]])));
  });
});

describe("pay-to-play", () => {
  it("asks the earlier series' holders to buy in, and converts those who don't", () => {
    render(<App />);
    openTab("Rounds");
    edit("Series B Preferred, a priced round");
    const seriesB = card(/Series B Preferred/);
    fireEvent.click(within(seriesB).getByLabelText(/Holders of earlier series must buy their share of an amount/));
    // The most senior earlier series is named to start with.
    expect((within(seriesB).getByRole("checkbox", { name: "Series A Preferred" }) as HTMLInputElement).checked).toBe(true);
    expect((within(seriesB).getByRole("checkbox", { name: "Seed Preferred" }) as HTMLInputElement).checked).toBe(false);
    type(within(seriesB).getByLabelText("Amount offered to them ($)"), "1M");
    type(within(seriesB).getByLabelText("Common for each Series A Preferred share, if it doesn't buy"), "0.1");
    const said = lines(/Series B Preferred/);
    expect(said).toContain("Pay-to-play: $1,000,000 is offered to the holders of Series A Preferred, each in proportion to what it holds.");
    expect(said.some((l) => l?.startsWith("Ridgeline Capital Fund III buys $0 of its "))).toBe(true);
    openTab("Payouts");
    expect(headline()).toBe(
      anaAt100M((events) => (events[9]!.pay_to_play = { series: ["series_a"], offered_amount: "1000000", conversion_ratio: { series_a: "0.1" } })),
    );
  });
});

it("builds the same cap tables from what the editor saves as from the case", async () => {
  render(<App />);
  openTab("Rounds");
  edit("Seed Preferred, a priced round");
  const file = await savedFile();
  expect(buildCapTables({ holders: file.holders, events: file.events })).toEqual(buildCapTables(examples[0]!.company!));
});

describe("adding, moving and removing events (M4k)", () => {
  /** What Ana gets at $100M with Millrace's events changed and the payouts on the cap table after `after`, by the engine alone. */
  function anaAfter(change: (events: Record<string, unknown>[]) => Record<string, unknown>[], after: string): string {
    const inputs = structuredClone({ holders: examples[0]!.company!.holders, events: examples[0]!.company!.events }) as { holders: unknown[]; events: Record<string, unknown>[] };
    const exit = { ...(examples[0]!.exit as object), cap_table_after_event: after };
    const pc = prepare(readInputs({ holders: inputs.holders, events: change(inputs.events), exit }).capTable);
    return `At $100M you get ${shortDollars(solve(pc, new D("100000000")).answers[0]!.payout.holderTotals.get("ana")!)}`;
  }
  const titles = () => within(panel()).getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

  it("starts a blank company with one event, which can't be removed", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Start from/), { target: { value: "scratch-rounds" } });
    expect(screen.getByText(/^Your own company, built from its 1 event$/)).toBeTruthy();
    expect(headline()).toBe("At $50M you get $50M");
    openTab("Rounds");
    expect(titles()).toEqual(["1. Common Stock issued"]);
    edit("Common Stock issued");
    expect(screen.getByRole("button", { name: "Remove Common Stock issued" }).matches(":disabled")).toBe(true);
  });

  it("adds each type at the end, open at its first field, and names what's blank plainly", async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Start from/), { target: { value: "scratch-rounds" } });
    openTab("Rounds");
    addEvent("An option pool");
    const pool = card(/Option pool created/);
    await vi.waitFor(() => expect(document.activeElement).toBe(within(pool).getByLabelText("Date")), { timeout: ANALYSIS_TIMEOUT });
    expect(within(pool).getByRole("alert").textContent).toBe("This event has a problem, so the payouts can't update: Fill this in: it can't be blank.");
    expect(within(pool).getByText((_, el) => el?.textContent === "Not built yet: the engine builds it once this event's problem is fixed.")).toBeTruthy();
    type(within(pool).getByLabelText("Percent of the fully diluted shares after it"), "10");
    expect(within(pool).queryByRole("alert")).toBeNull();
    for (const label of ["Shares issued", "Shares issued for a percentage of the company", "Options granted", "SAFEs", "Convertible notes", "A priced round"]) addEvent(label);
    expect(titles()).toEqual([
      "1. Common Stock issued",
      "2. Option pool created",
      "3. Common Stock issued",
      "4. Common Stock issued",
      "5. Options granted",
      "6. A SAFE",
      "7. A convertible note",
      "8. Series A Preferred, a priced round",
    ]);
  });

  it("marks every blank field a new event needs at once, and only those (M4 review's polish)", async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Start from/), { target: { value: "scratch-rounds" } });
    openTab("Rounds");
    addEvent("A priced round");
    const round = card(/Series A Preferred, a priced round/);
    const invalid = () => within(round).queryAllByRole("textbox").filter((el) => el.getAttribute("aria-invalid") === "true").map((el) => (el as HTMLInputElement).labels?.[0]?.textContent);
    // The pre-money valuation and the investment are needed; the pool target, blank for no top-up, isn't.
    await vi.waitFor(() => expect(invalid()).toEqual(["Pre-money valuation ($)", "Amount ($)"]), { timeout: ANALYSIS_TIMEOUT });
    type(within(round).getByLabelText("Pre-money valuation ($)"), "8M");
    expect(invalid()).toEqual(["Amount ($)"]);
    type(within(round).getByLabelText("Amount ($)"), "2M");
    expect(invalid()).toEqual([]);
  });

  it("moves an event, and the payouts follow: Series A's grants after the Series B", async () => {
    render(<App />);
    openTab("Rounds");
    const grants = within(panel()).getAllByRole("button", { name: "Edit Options granted" })[2]!;
    fireEvent.click(grants);
    click("Move Options granted later");
    expect(titles().slice(8)).toEqual(["9. Series B Preferred, a priced round", "10. Options granted"]);
    // Now last, it can't move later: the keyboard is left on "Move earlier".
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Move Options granted earlier" })), { timeout: ANALYSIS_TIMEOUT });
    // The payouts followed the last event, now the grants.
    const after = within(panel()).getByLabelText("The payouts use the cap table after") as HTMLSelectElement;
    expect(within(after).getByRole("option", { selected: true }).textContent).toBe("10. Options granted (the last event)");
    openTab("Payouts");
    expect(headline()).toBe(anaAfter((events) => [...events.slice(0, 8), events[9]!, events[8]!], "grants_a_to_b"));
    expect(headline()).not.toBe("At $100M you get $9.75M");
  });

  it("catches a move the rounds can't take: the Seed's grants before the Seed are more than the pool", () => {
    render(<App />);
    openTab("Rounds");
    fireEvent.click(within(panel()).getAllByRole("button", { name: "Edit Options granted" })[1]!);
    click("Move Options granted earlier");
    expect(within(card(/6\. Options granted/)).getByRole("alert").textContent).toBe(
      "This event has a problem, so the payouts can't update: A grant of 1,100,000 options is more than the 692,033 left in the unissued pool",
    );
    openTab("Payouts");
    expect(headline()).toBe("At $100M you get $9.75M");
  });

  it("removes an event after asking: Lena's 6%", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<App />);
    openTab("Rounds");
    fireEvent.click(within(panel()).getAllByRole("button", { name: "Edit Common Stock issued" })[1]!);
    const remove = within(card(/2\. Common Stock issued/)).getByRole("button", { name: "Remove Common Stock issued" });
    fireEvent.click(remove);
    expect(confirm).toHaveBeenCalledWith("Remove event 2, Common Stock issued? What it did goes, and the events after it are built again without it.");
    expect(titles()).toHaveLength(10);
    fireEvent.click(remove);
    expect(titles()).toHaveLength(9);
    await vi.waitFor(() => expect(document.activeElement).toBe(within(panel()).getByLabelText("Type of event")), { timeout: ANALYSIS_TIMEOUT });
    openTab("Payouts");
    expect(headline()).toBe(anaAfter((events) => events.filter((e) => e.id !== "early_hire"), "series_b"));
  });

  it("uses an earlier event's cap table when chosen, and keeps it when events are added", () => {
    render(<App />);
    openTab("Rounds");
    const after = within(panel()).getByLabelText("The payouts use the cap table after") as HTMLSelectElement;
    fireEvent.change(after, { target: { value: "series_a" } });
    expect(within(card(/Series A Preferred/)).getByText("The payouts use the cap table after this event.")).toBeTruthy();
    openTab("Payouts");
    const atSeriesA = anaAfter((events) => events, "series_a");
    expect(headline()).toBe(atSeriesA);
    openTab("Rounds");
    addEvent("An option pool");
    type(within(card(/11\. Option pool created/)).getByLabelText("Percent of the fully diluted shares after it"), "5");
    expect(after.value).toBe("series_a");
    openTab("Payouts");
    expect(headline()).toBe(atSeriesA);
  });
});

describe("SAFEs and notes in the rounds (M5k)", () => {
  const unbuilt = (title: RegExp) => card(title).querySelector(".rounds__unbuilt")?.textContent;

  it("shows a round's SAFEs-and-notes section while an earlier note can't be built yet, and names the event each unbuilt one waits on", async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Start from/), { target: { value: "scratch-rounds" } });
    openTab("Rounds");
    addEvent("Convertible notes");
    addEvent("A priced round");
    // The note is blank, so the engine stops there; the round still offers to convert it, ticked to begin with.
    const round = card(/Series A Preferred, a priced round/);
    expect((within(round).getByLabelText("Converts the convertible notes still outstanding") as HTMLInputElement).checked).toBe(true);
    expect(within(round).queryByLabelText("Converts the SAFEs still outstanding")).toBeNull();
    expect(unbuilt(/A convertible note/)).toBe("Not built yet: the engine builds it once this event's problem is fixed.");
    expect(unbuilt(/Series A Preferred, a priced round/)).toBe("Not built yet: the engine builds it once the problem in event 2, A convertible note, is fixed.");
    // The link goes to the note's problem.
    fireEvent.click(within(round).getByRole("button", { name: "event 2, A convertible note" }));
    expect(document.activeElement).toBe(within(card(/A convertible note/)).getByRole("alert"));
  });

  it("says on a note's event that it will be outstanding at the sale when no round converts it", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Start from/), { target: { value: "scratch-rounds" } });
    openTab("Rounds");
    addEvent("Convertible notes");
    addEvent("A priced round");
    const atSale = () => card(/A convertible note/).querySelector(".rounds__at-sale")?.textContent ?? null;
    expect(atSale()).toBeNull();
    fireEvent.click(within(card(/Series A Preferred, a priced round/)).getByLabelText("Converts the convertible notes still outstanding"));
    expect(atSale()).toBe("Founder's convertible note isn't converted by any later round, so it will be outstanding at the sale.");
  });

  it("says on Millrace's SAFEs that they'll be outstanding at a sale on a cap table from before the Seed, and pays them", async () => {
    render(<App />);
    openTab("Rounds");
    fireEvent.change(within(panel()).getByLabelText("The payouts use the cap table after"), { target: { value: "option_pool" } });
    expect([...card(/3\. SAFEs/).querySelectorAll(".rounds__at-sale")].map((p) => p.textContent)).toEqual([
      "Priya Shah's SAFE converts in event 6, after the cap table the payouts use (event 4), so it will be outstanding at the sale.",
      "Marcus Lee's SAFE converts in event 6, after the cap table the payouts use (event 4), so it will be outstanding at the sale.",
    ]);
    openTab("Payouts");
    const payouts = document.getElementById("panel-payouts")!;
    expect(within(payouts).queryByText(/has a problem/)).toBeNull();
    click("By class");
    expect(within(payouts).getByRole("rowheader", { name: /^Priya Shah's SAFE/ })).toBeTruthy();
    expect(within(payouts).getByRole("rowheader", { name: /^Marcus Lee's SAFE/ })).toBeTruthy();
    await screen.findByRole("heading", { name: "Breakpoints" }, { timeout: ANALYSIS_TIMEOUT });
  });
});

describe("warrants and dividends in the rounds (M5k2)", () => {
  /** What Ana gets at $100M on Millrace with its events changed, the payouts after `after`, by the engine alone. */
  function anaAt(change: (events: Record<string, unknown>[]) => Record<string, unknown>[], after: string, exitDate?: string): string {
    const company = structuredClone(examples[0]!.company!) as { holders: unknown[]; events: Record<string, unknown>[] };
    const exit = readInputs({
      holders: company.holders,
      events: change(company.events),
      exit: { cap_table_after_event: after, range: ["0", "300000000"], exit_values: [], ...(exitDate ? { exit_date: exitDate } : {}) },
    });
    return `At $100M you get ${shortDollars(solve(prepare(exit.capTable, exit.exitDate), new D("100000000")).answers[0]!.payout.holderTotals.get("ana")!)}`;
  }

  it("adds warrants for common at the end, and the payouts follow", () => {
    render(<App />);
    openTab("Rounds");
    addEvent("Warrants issued");
    const warrants = card(/Warrants issued/);
    const line = group(/Warrants issued/, /Warrant 1/);
    fireEvent.change(within(line).getByLabelText("Holder"), { target: { value: (within(line).getByRole("option", { name: "Lena Fischer" }) as HTMLOptionElement).value } });
    type(within(line).getByLabelText("Shares"), "500,000");
    type(within(line).getByLabelText("Strike ($ a share)"), "1");
    expect((within(line).getByLabelText("It buys") as HTMLSelectElement).value).toBe("common");
    expect(within(panel()).queryAllByRole("alert")).toEqual([]);
    expect(lines(/Warrants issued/)).toEqual(["Lena Fischer: warrants for 500,000 common shares at $1 a share, not from the pool."]);
    expect(within(warrants).getByText("The payouts use the cap table after this event.")).toBeTruthy();
    openTab("Payouts");
    const expected = anaAt((events) => [...events, { id: "warrants", date: null, type: "issue_warrants", warrants: [{ holder: "lena", shares: "500000", strike: "1", underlying: "common" }] }], "warrants");
    expect(headline()).toBe(expected);
    expect(headline()).not.toBe("At $100M you get $9.75M");
  });

  it("offers a warrant for a series an earlier round issued", () => {
    render(<App />);
    openTab("Rounds");
    addEvent("Warrants issued");
    const buys = within(group(/Warrants issued/, /Warrant 1/)).getByLabelText("It buys");
    expect(within(buys).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Common stock", "Seed Preferred", "Series A Preferred", "Series B Preferred", "Seed Preferred (from SAFEs)",
    ]);
  });

  it("gives Series B 8% dividends from its round's date, asks for the sale's date, and pays what the engine pays", () => {
    render(<App />);
    openTab("Rounds");
    edit("Series B Preferred, a priced round");
    const round = card(/Series B Preferred/);
    fireEvent.click(within(round).getByLabelText("Cumulative dividends"));
    type(within(round).getByLabelText("Rate (% of the issue price a year)"), "8");
    expect(within(panel()).queryAllByRole("alert")).toEqual([]);
    expect(lines(/Series B Preferred/).at(-1)).toMatch(/^Series B Preferred accrues cumulative dividends of 8% a year on its \$\d\.\d{6} issue price, simple, from Mar 31, 2025; if it converts, it gives them up\.$/);
    // The rounds build; the cap table now needs the sale's date.
    openTab("Payouts");
    expect(within(document.getElementById("panel-payouts")!).getByText(/Fill this in: Series B Preferred's cumulative dividends accrue up to the date of the sale\./)).toBeTruthy();
    openTab("Cap table");
    type(screen.getByLabelText("Date of the sale"), "2027-03-31");
    openTab("Payouts");
    const dividend = { rate: "0.08", method: "simple", on_conversion: "forfeited" };
    const expected = anaAt(
      (events) => events.map((e) => (e.id === "series_b" ? { ...e, series: { ...(e.series as object), cumulative_dividend: dividend } } : e)),
      "series_b",
      "2027-03-31",
    );
    expect(headline()).toBe(expected);
    // Two years, 730 days, at 8% on Series B's 9,241,189 shares at $1.082112 (the locked case's 12003689592480000/11092836539841877): $1,599,999.98.
    expect(screen.getByText(/^Series B Preferred has accrued \$1,599,999\.98 of cumulative dividends by Mar 31, 2027, the date of the sale\./)).toBeTruthy();
  });
});

describe("SAFEs and notes in a round that triggers anti-dilution (R25; 0.3.0 work, 03i)", () => {
  /** A locked round case, opened as a file, its payouts on the last event. */
  async function openCase(name: string) {
    const inputs = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../../cases", name, "inputs.json"), "utf8")) as { holders: unknown[]; events: { id: string }[] };
    const file = { format: "spillpoint", version: 5, name, holders: inputs.holders, events: inputs.events, cap_table_after_event: inputs.events.at(-1)!.id, range: ["0", "50000000"] };
    render(<App />);
    fireEvent.change(screen.getByLabelText("Open a saved cap table"), { target: { files: [new File([JSON.stringify(file)], "case.json", { type: "application/json" })] } });
    await screen.findByText("Opened case.json.");
    openTab("Rounds");
  }
  const POOL_IN_A = "Anti-dilution base includes the unused option pool (smaller adjustments for earlier investors)";
  const EXEMPT = "SAFE and note conversions in this round don't count toward anti-dilution (a charter carve-out or waiver)";
  const setting = (title: RegExp, label: string) => within(card(title)).queryByLabelText(label) as HTMLInputElement | null;

  it("says, piece by piece, why 16i's note adjusts the Seed in a round priced above it", async () => {
    await openCase("edge-16i-discounted-note-in-an-up-round");
    expect(lines(/Series A Preferred, a priced round/)).toEqual(
      expect.arrayContaining([
        "New money at $1.13 a share: above Seed Preferred's $1.00, so it doesn't count.",
        "Investor N's note converts at $0.91 a share: below $1.00, so it counts against Seed Preferred.",
      ]),
    );
  });

  it("says 16j's note and SAFE were issued before the Seed, and 16h's SAFE is exempt, so each counts in the starting share count", async () => {
    await openCase("edge-16j-note-and-safe-from-before-the-seed");
    expect(lines(/Series A Preferred, a priced round/)).toEqual(
      expect.arrayContaining([
        "New money at $0.63 a share: below Seed Preferred's $1.00, so it counts against Seed Preferred.",
        "Investor S's SAFE was issued before Seed Preferred, so it counts in the starting share count instead.",
        "Investor N's note was issued before Seed Preferred, so it counts in the starting share count instead.",
      ]),
    );
  });

  it("shows 16h's exemption as on, and its SAFE as exempt under the round's setting", async () => {
    await openCase("edge-16h-safe-conversion-exempt");
    expect(lines(/Series A Preferred, a priced round/)).toContain("Investor S's SAFE is exempt under this round's setting, so it counts in the starting share count instead.");
    edit("Series A Preferred, a priced round");
    expect(setting(/Series A Preferred, a priced round/, EXEMPT)?.checked).toBe(true);
  });

  it("shows each setting only where it applies: the pool for broad-based, the exemption for conversions beside anti-dilution", async () => {
    await openCase("edge-16g-safe-converts-in-a-down-round");
    edit("Seed Preferred, a priced round");
    // The first round: no earlier series has anti-dilution.
    expect([setting(/Seed Preferred, a priced round/, POOL_IN_A), setting(/Seed Preferred, a priced round/, EXEMPT)]).toEqual([null, null]);
    edit("Series A Preferred, a priced round");
    const seriesA = /Series A Preferred, a priced round/;
    expect([setting(seriesA, POOL_IN_A)?.checked, setting(seriesA, EXEMPT)?.checked]).toEqual([false, false]);
    // Without the SAFE converting, there's nothing to exempt.
    fireEvent.click(within(card(seriesA)).getByLabelText("Converts the SAFEs still outstanding"));
    expect(setting(seriesA, EXEMPT)).toBeNull();
    expect(setting(seriesA, POOL_IN_A)).not.toBeNull();
  });

  it("hides the pool setting where no series is broad-based: 16c's full ratchet", async () => {
    await openCase("edge-16c-full-ratchet");
    edit("Series B Preferred, a priced round");
    expect([setting(/Series B Preferred, a priced round/, POOL_IN_A), setting(/Series B Preferred, a priced round/, EXEMPT)]).toEqual([null, null]);
  });
});
