// Millrace built from its rounds (M4i), clicked through in a simulated
// browser: the Rounds tab with each event and the cap table after it, the
// cap table read-only while the rounds build it, editing it directly only
// after saying what goes, and saving and opening the rounds.

import { fireEvent, render, screen, within } from "@testing-library/react";
import examples from "virtual:examples";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App.tsx";
import { buildExit } from "../src/draft.ts";
import { exampleContents } from "../src/rounds.ts";
import { lockedMillraceExit, payoutsAtBreakpoints } from "./payouts.ts";

const headline = () => screen.getByRole("heading", { level: 1 }).textContent;
const openTab = (name: "Payouts" | "Cap table" | "Rounds") => fireEvent.click(screen.getByRole("tab", { name }));
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const roundsPanel = () => document.getElementById("panel-rounds")!;
/** The event card headed by this title. */
const event = (title: RegExp) => within(roundsPanel()).getByRole("heading", { level: 3, name: title }).closest("li")!;
const lines = (card: HTMLElement) => [...card.querySelectorAll(".rounds__lines li")].map((li) => li.textContent);

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
      "1 Feb 2021", "1 Jun 2021", "15 Sep 2021", "1 Oct 2021", "1 Oct 2021", "30 Jun 2022", "No date", "30 Sep 2023", "No date", "31 Mar 2025",
    ]);
    expect(within(roundsPanel()).getByText(/The payouts use the cap table after the 10th event: Series B Preferred, a priced round\./)).toBeTruthy();
    expect(within(event(/Series B Preferred/)).getByText("The payouts use the cap table after this event.")).toBeTruthy();
    expect(roundsPanel().querySelectorAll(".rounds__used")).toHaveLength(1);
  });

  it("says what each round worked out: the SAFEs at the Seed, the pro-rata at the Series A, the adjustment at the Series B", () => {
    render(<App />);
    openTab("Rounds");
    expect(lines(event(/Seed Preferred/))).toEqual([
      "$2,500,000 at a $7,500,000 pre-money valuation, $10,000,000 post-money: $0.463515 a share.",
      "Harbor Lane Ventures Fund I invests $2,500,000 for 5,393,570 shares of Seed Preferred.",
      "The pool is topped up by 3,191,337 shares, to 18% of the company after the round. The top-up comes before the new money, so it dilutes only the holders before the round.",
      "Priya Shah's SAFE converts at its cap price, $0.384930 a share, into 779,362 shares of Seed Preferred (from SAFEs).",
      "Marcus Lee's SAFE converts at its cap price, $0.384930 a share, into 389,681 shares of Seed Preferred (from SAFEs).",
    ]);
    expect(lines(event(/Series A Preferred/))).toContain(
      "Harbor Lane Ventures Fund I may buy up to $3,444,369.64 as pro-rata: its 28.7% of the company before the round (not counting the unissued pool), times the $12,000,000 raised. It takes $3,000,000 of it.",
    );
    expect(lines(event(/Series B Preferred/))).toContain(
      "Series A Preferred's anti-dilution (broad-based weighted average) lowers its conversion price from $2.075472 to $1.824752, so each share converts into 1.137399 common. Its preference doesn't change.",
    );
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
    expect(file).toMatchObject({ version: 2, cap_table_after_event: "series_b" });
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
