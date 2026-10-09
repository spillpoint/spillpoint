// Millrace built from its rounds (M4i), clicked through in a simulated
// browser: the Rounds tab with each event and the cap table after it, the
// cap table read-only while the rounds build it, editing it directly only
// after saying what goes, and saving and opening the rounds.

import { fireEvent, render, screen, within } from "@testing-library/react";
import examples from "virtual:examples";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { App } from "../src/App.tsx";
import { buildExit } from "../src/draft.ts";
import { buildCapTables, readExit } from "spillpoint";

import { eventViews, exampleContents, fromRounds } from "../src/rounds.ts";
import { lockedMillraceExit, payoutsAtBreakpoints } from "./payouts.ts";

const headline = () => screen.getByRole("heading", { level: 1 }).textContent;
const openTab = (name: "Payouts" | "Cap table" | "Rounds") => fireEvent.click(screen.getByRole("tab", { name }));
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const roundsPanel = () => document.getElementById("panel-rounds")!;
/** The event card headed by this title. */
const event = (title: RegExp) => within(roundsPanel()).getByRole("heading", { level: 3, name: title }).closest("li")!;
/** A line's own words, without the lines under it that explain it. */
const ownText = (li: Element) => [...li.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("");
const lines = (card: HTMLElement) => [...card.querySelectorAll(".rounds__lines li")].map(ownText);

const EDIT_DIRECTLY =
  "Edit the cap table directly? This drops the 10 events that build it, and what each one worked out on the Rounds tab. " +
  "The cap table itself stays exactly as it is now, and you can edit it. A save will keep the cap table, not the rounds. " +
  "To get the rounds back, start again from Millrace Robotics.";

afterEach(() => vi.restoreAllMocks());

describe("Millrace, built from its rounds", () => {
  it("pays what its locked cap table pays, to the cent at every breakpoint", () => {
    expect(payoutsAtBreakpoints(buildExit(exampleContents(examples[0]!).draft).json)).toEqual(payoutsAtBreakpoints(lockedMillraceExit()));
  });

  it("opens on the same answer, and says it's built from its events", () => {
    render(<App />);
    expect(headline()).toBe("At $100M you get $9.75M");
    expect(screen.getByText(/Millrace Robotics, built from its 10 events/)).toBeTruthy();
  });
});

describe("the Rounds tab", () => {
  it("lists the ten events in order, with their dates, and marks the one the payouts use", () => {
    render(<App />);
    openTab("Rounds");
    const titles = within(roundsPanel()).getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual([
      "1. Common Stock issued",
      "2. Common Stock issued",
      "3. SAFEs",
      "4. Option pool created",
      "5. Options granted",
      "6. Seed Preferred, a priced round",
      "7. Options granted",
      "8. Series A Preferred, a priced round",
      "9. Options granted",
      "10. Series B Preferred, a priced round",
    ]);
    expect([...roundsPanel().querySelectorAll(".rounds__date")].map((d) => d.textContent)).toEqual([
      "Feb 1, 2021", "Jun 1, 2021", "Sep 15, 2021", "Oct 1, 2021", "Oct 1, 2021", "Jun 30, 2022", "No date", "Sep 30, 2023", "No date", "Mar 31, 2025",
    ]);
    const after = within(roundsPanel()).getByLabelText("The payouts use the cap table after") as HTMLSelectElement;
    expect(after.value).toBe("series_b");
    expect(within(after).getByRole("option", { selected: true }).textContent).toBe("10. Series B Preferred, a priced round (the last event)");
    expect(within(event(/Series B Preferred/)).getByText("The payouts use the cap table after this event.")).toBeTruthy();
    expect(roundsPanel().querySelectorAll(".rounds__used")).toHaveLength(1);
  });

  it("says what each round worked out: the SAFEs at the Seed, the pro-rata at the Series A, the adjustment at the Series B", () => {
    render(<App />);
    openTab("Rounds");
    expect(lines(event(/Seed Preferred/))).toEqual([
      "$2,500,000 at a $7,500,000 pre-money valuation, $10,000,000 post-money: $0.463515 a share.",
      "Harbor Lane Ventures Fund I invests $2,500,000 for 5,393,570 shares of Seed Preferred.",
      "The pool is topped up by 3,191,337 shares, to 18% of the company after the round. The top-up comes before the new money, so it dilutes only the holders before the round. Investors call this the option pool shuffle.",
      "Priya Shah's SAFE converts at its cap price, $0.384930 a share, into 779,362 shares of Seed Preferred (from SAFEs).",
      "Marcus Lee's SAFE converts at its cap price, $0.384930 a share, into 389,681 shares of Seed Preferred (from SAFEs).",
    ]);
    expect(lines(event(/Series A Preferred/))).toContain(
      "Harbor Lane Ventures Fund I may buy up to $3,444,369.64 as pro-rata: its 28.7% of the company before the round (not counting the unissued pool), times the $12,000,000.00 raised. It takes $3,000,000.00 of it.",
    );
    expect(lines(event(/Series B Preferred/))).toContain(
      "Series A Preferred's anti-dilution (broad-based weighted average) lowers its conversion price from $2.075472 to $1.824752, so each share converts into 1.137399 common. Its preference doesn't change.",
    );
  });

  it("says what each event that changes your stake did to it: Ana's fully diluted share, before and after", () => {
    render(<App />);
    openTab("Rounds");
    const yours = () => [...roundsPanel().querySelectorAll(".rounds__event")].map((card) => card.querySelector(".rounds__yours")?.textContent ?? null);
    // Grants come out of the pool, and SAFEs aren't shares until they convert, so those events don't change it.
    expect(yours()).toEqual([
      "For you: 0.0% → 55.0% fully diluted.",
      "For you: 55.0% → 51.7% fully diluted.",
      null,
      "For you: 51.7% → 46.5% fully diluted.",
      null,
      "For you: 46.5% → 25.5% fully diluted.",
      null,
      // 5,500,000 of the 28,909,090 fully diluted shares after the Series A.
      "For you: 25.5% → 19.0% fully diluted.",
      null,
      "For you: 19.0% → 12.9% fully diluted.",
    ]);
    // It follows the holder you choose on the Payouts tab.
    openTab("Payouts");
    fireEvent.change(screen.getByLabelText(/You are/), { target: { value: "cobalt" } });
    openTab("Rounds");
    expect(yours().filter((line) => line !== null)).toEqual(["For you: 0.0% → 21.7% fully diluted."]);
  });

  it("shows the cap table after an event, with the pool and the SAFEs still waiting to convert", () => {
    render(<App />);
    openTab("Rounds");
    const pool = event(/Option pool created/);
    expect(lines(pool)).toEqual(["1,182,033 shares set aside for options: 10% of the fully diluted shares after it."]);
    const table = within(pool).getByRole("table");
    const rows = within(table)
      .getAllByRole("row")
      .slice(1)
      // A row's first text: the holder's name, without the class shown under it on a phone.
      .map((r) => [...r.querySelectorAll("th, td")].map((c) => c.childNodes[0]?.textContent ?? ""));
    expect(rows).toEqual([
      ["Ana Ortiz", "Common Stock", "5,500,000", "46.5%"],
      ["Dev Patel", "Common Stock", "4,500,000", "38.1%"],
      ["Lena Fischer", "Common Stock", "638,297", "5.4%"],
      ["Unissued option pool", "", "1,182,033", "10.0%"],
      ["Total", "", "", "100.0%"],
    ]);
    expect(within(pool).getByText("Not yet converted: Priya Shah's SAFE, $300,000; Marcus Lee's SAFE, $150,000.")).toBeTruthy();
  });

  it("says there are no rounds for a cap table entered directly", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Start from/), { target: { value: "edge-04-participating-capped" } });
    openTab("Rounds");
    expect(within(roundsPanel()).getByText(/This cap table was entered directly, not built from the company's rounds/)).toBeTruthy();
  });
});

describe("the cap table, while the rounds build it", () => {
  it("is read-only, says why, and keeps the name and the range editable", () => {
    render(<App />);
    openTab("Cap table");
    expect(screen.getByText(/This cap table is built from the 10 events on the Rounds tab, so it can't be edited here\./)).toBeTruthy();
    expect((screen.getByRole("textbox", { name: "Ana Ortiz, Common Stock" }) as HTMLInputElement).matches(":disabled")).toBe(true);
    expect(within(screen.getByRole("group", { name: "Series A Preferred" })).getByLabelText("Original issue price ($ a share)").matches(":disabled")).toBe(true);
    // The editor's buttons are off too (and hidden by the stylesheet, which this simulated browser doesn't load).
    expect(screen.getByRole("button", { name: "Add a holder" }).matches(":disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Remove Ana Ortiz" }).matches(":disabled")).toBe(true);
    expect((screen.getByLabelText("Name of this cap table") as HTMLInputElement).matches(":disabled")).toBe(false);
    expect((screen.getByRole("textbox", { name: "To" }) as HTMLInputElement).matches(":disabled")).toBe(false);
  });

  it("asks before editing it directly, says what goes, and keeps the rounds if you say no", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    render(<App />);
    openTab("Cap table");
    click("Edit the cap table directly");
    expect(confirm).toHaveBeenCalledWith(EDIT_DIRECTLY);
    expect(screen.getByRole("button", { name: "Edit the cap table directly" })).toBeTruthy();
    expect(screen.queryByText("Not saved")).toBeNull();
  });

  it("drops the rounds and keeps the cap table, with the same payouts, if you say yes", () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    render(<App />);
    openTab("Cap table");
    click("Edit the cap table directly");
    expect(screen.queryByRole("button", { name: "Edit the cap table directly" })).toBeNull();
    expect((screen.getByRole("textbox", { name: "Ana Ortiz, Common Stock" }) as HTMLInputElement).matches(":disabled")).toBe(false);
    expect(screen.getByText(/Millrace Robotics, with your changes/)).toBeTruthy();
    expect(screen.getByText("Not saved")).toBeTruthy();
    openTab("Rounds");
    expect(within(roundsPanel()).getByText(/This cap table was entered directly/)).toBeTruthy();
    openTab("Payouts");
    expect(headline()).toBe("At $100M you get $9.75M");
  });
});

describe("saving and opening rounds", () => {
  let downloads: Blob[];
  beforeEach(() => {
    downloads = [];
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: (blob: Blob) => (downloads.push(blob), "blob:saved") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: () => {} });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });
  const open = (name: string, text: string) =>
    fireEvent.change(screen.getByLabelText("Open a saved cap table"), { target: { files: [new File([text], name, { type: "application/json" })] } });

  it("saves the rounds, and opening the file brings them back", async () => {
    render(<App />);
    click("Save");
    const file = JSON.parse(await downloads[0]!.text());
    expect(file).toMatchObject({ version: 6, cap_table_after_event: "series_b" });
    expect(file.cap_table).toBeUndefined();
    expect(file.events).toEqual(examples[0]!.company!.events);

    fireEvent.change(screen.getByLabelText(/Start from/), { target: { value: "edge-04-participating-capped" } });
    open("millrace.json", JSON.stringify(file));
    expect(await screen.findByText("Opened millrace.json.")).toBeTruthy();
    expect(screen.getByText(/opened from millrace\.json, built from its 10 events/)).toBeTruthy();
    expect(headline()).toBe("At $100M you get $9.75M");
    openTab("Rounds");
    expect(within(roundsPanel()).getAllByRole("heading", { level: 3 })).toHaveLength(10);
    // Opened from a file, the way back to the rounds is the file.
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    openTab("Cap table");
    click("Edit the cap table directly");
    expect(confirm.mock.calls[0]![0]).toMatch(/To get the rounds back, open the file again\.$/);
  });

  it("saves the cap table, not the rounds, once it's edited directly", async () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    render(<App />);
    openTab("Cap table");
    click("Edit the cap table directly");
    click("Save");
    const file = JSON.parse(await downloads[0]!.text());
    expect(Object.keys(file)).toEqual(["format", "version", "name", "cap_table", "range", "view"]);
  });
});

describe("a warrant for preferred on the Rounds tab (M5k2)", () => {
  it("counts as converted in the fully diluted share, at its series' ratio (R29)", () => {
    const company = structuredClone(examples[0]!.company!) as { holders: Record<string, unknown>[]; events: Record<string, unknown>[] };
    company.events.push({ id: "warrants", date: null, type: "issue_warrants", warrants: [{ holder: "lena", shares: "100000", strike: "1", underlying: "series_a" }] });
    const rounds = { holders: company.holders, events: company.events, after: "warrants" };
    const tables = buildCapTables(company);
    const view = eventViews(rounds, tables).at(-1)!;
    const ct = tables.at(-1)!.capTable;
    const seriesA = ct.securities.find((s) => s.id === "series_a")!;
    const ratio = seriesA.kind === "preferred" ? seriesA.conversionRatio : null;
    const row = view.rows.find((r) => r.security.startsWith("Warrants for Series A Preferred"))!;
    // Every row's share and the pool's add up to the whole, and the warrant's is its 100,000 × Series A's 1.137399.
    const total = view.rows.reduce((sum, r) => sum.plus(r.fullyDiluted), view.pool.fullyDiluted);
    expect(total.minus(1).abs().lt("1e-30")).toBe(true);
    const all = ct.positions.reduce((sum, p) => {
      const s = ct.securities.find((x) => x.id === p.security)!;
      return sum.plus(s.kind === "preferred" ? p.shares.times(s.conversionRatio) : s.kind === "warrant" && s.underlying !== "common" ? p.shares.times(ratio!) : p.shares);
    }, ct.unissuedPool);
    expect(row.fullyDiluted.minus(ratio!.times(100000).div(all)).abs().lt("1e-30")).toBe(true);
  });
});

describe("a sale the engine refuses on a table built from rounds (05b2)", () => {
  it("still builds the rounds, and leaves the refusal to the cap table's reading, as before", () => {
    // 16j's table after its Seed keeps a pre-money SAFE beside preferred, which a sale refuses (X14). Since 05b2 the
    // engine's readInputs says so too; the page still builds the rounds, and reading the cap table refuses it.
    const inputs = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../../cases/edge-16j-note-and-safe-from-before-the-seed/inputs.json"), "utf8"));
    const built = fromRounds({ holders: inputs.holders, events: inputs.events, after: "seed" }, ["0", "100000000"], { exit_date: "2023-01-01" });
    expect(built.ok).toBe(true);
    expect(() => readExit(buildExit(built.ok ? built.draft : null!).json)).toThrow(/A pre-money SAFE at a sale alongside preferred stock/);
  });
});
