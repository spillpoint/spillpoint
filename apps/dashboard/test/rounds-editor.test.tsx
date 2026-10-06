// Editing Millrace's rounds (M4j), clicked through in a simulated browser:
// opening an event, changes reaching the payouts, the engine's messages next
// to the fields they name, lines added and removed, holders, seniority,
// pay-to-play, and what a save keeps.

import { fireEvent, render, screen, within } from "@testing-library/react";
import { D, buildCapTables, prepare, readInputs, solve } from "spillpoint";
import examples from "virtual:examples";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App.tsx";
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
    await vi.waitFor(() => expect(document.activeElement).toBe(amount));
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
  const addEvent = (label: string) => {
    const select = within(panel()).getByLabelText("Type of event");
    fireEvent.change(select, { target: { value: within(select).getByRole("option", { name: label }).getAttribute("value") } });
    click("Add it at the end");
  };
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
    await vi.waitFor(() => expect(document.activeElement).toBe(within(pool).getByLabelText("Date")));
    expect(within(pool).getByRole("alert").textContent).toBe("This event has a problem, so the payouts can't update: Fill this in: it can't be blank.");
    expect(within(pool).getByText("Not built yet: the engine builds it once the problem above is fixed.")).toBeTruthy();
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

  it("moves an event, and the payouts follow: Series A's grants after the Series B", async () => {
    render(<App />);
    openTab("Rounds");
    const grants = within(panel()).getAllByRole("button", { name: "Edit Options granted" })[2]!;
    fireEvent.click(grants);
    click("Move Options granted later");
    expect(titles().slice(8)).toEqual(["9. Series B Preferred, a priced round", "10. Options granted"]);
    // Now last, it can't move later: the keyboard is left on "Move earlier".
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Move Options granted earlier" })));
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
    await vi.waitFor(() => expect(document.activeElement).toBe(within(panel()).getByLabelText("Type of event")));
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
