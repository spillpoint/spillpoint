// Save and Open, clicked through in a simulated browser: the file a save
// downloads, opening it again, and never losing unsaved changes by accident.

import { fireEvent, render, screen, within } from "@testing-library/react";
import { D } from "spillpoint";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App.tsx";
import { exitOf, lockedMillraceExit, payoutsAtBreakpoints } from "./payouts.ts";

const headline = () => screen.getByRole("heading", { level: 1 }).textContent;
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
const openTab = (name: "Payouts" | "Cap table") => fireEvent.click(screen.getByRole("tab", { name }));
const series = (name: string) => screen.getByRole("group", { name });
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
/** Millrace is built from its rounds; editing its cap table means dropping them, which asks first. */
const editDirectly = () => {
  vi.spyOn(window, "confirm").mockReturnValueOnce(true);
  click("Edit the cap table directly");
};
const closeTo = (text: unknown, numerator: string, denominator: string) => new D(String(text)).minus(new D(numerator).div(denominator)).abs().lte("1e-30");

/** What each Save downloads: the browser's download is replaced by a list of files. */
let downloads: { name: string; blob: Blob }[];

beforeEach(() => {
  downloads = [];
  let made: Blob | null = null;
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: (blob: Blob) => ((made = blob), "blob:saved") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: () => {} });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ name: this.download, blob: made! });
  });
});
afterEach(() => vi.restoreAllMocks());

const saved = (i: number) => downloads[i]!.blob.text();

async function openFile(name: string, text: string) {
  fireEvent.change(screen.getByLabelText("Open a saved cap table"), { target: { files: [new File([text], name, { type: "application/json" })] } });
}

/** Leaving or reloading the page: true if the page asks first. */
function leavingAsks(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe("saving Millrace and opening it again", () => {
  it("gives identical payouts to the cent at every breakpoint", async () => {
    render(<App />);
    click("Save");
    expect(downloads.map((d) => d.name)).toEqual(["millrace-robotics-fictional.json"]);
    expect(screen.getByRole("status").textContent).toBe("Saved as millrace-robotics-fictional.json, in your downloads.");
    const first = await saved(0);

    await openFile("millrace-robotics-fictional.json", first);
    expect(await screen.findByText("Opened millrace-robotics-fictional.json.")).toBeTruthy();
    expect(screen.getByText(/Millrace Robotics \(fictional\), opened from millrace-robotics-fictional\.json/)).toBeTruthy();
    // The file kept the view: Ana at $100M.
    expect(headline()).toBe("At $100M you get $9.75M");

    // The table as opened, saved again: the same file, and the same payouts as the example.
    click("Save");
    const second = await saved(1);
    expect(second).toBe(first);
    // The file keeps the rounds, and they build what Millrace's locked cap table pays.
    expect(JSON.parse(first)).toMatchObject({ version: 6, cap_table_after_event: "series_b" });
    expect(payoutsAtBreakpoints(exitOf(second))).toEqual(payoutsAtBreakpoints(lockedMillraceExit()));
  });

  it("keeps the exact prices of fields nobody edited, not the six places on screen", async () => {
    render(<App />);
    openTab("Cap table");
    editDirectly();
    expect((within(series("Series A Preferred")).getByLabelText("Original issue price ($ a share)") as HTMLInputElement).value).toBe("2.075472");
    click("Save");
    const seriesA = JSON.parse(await saved(0)).cap_table.securities.find((s: { id: string }) => s.id === "series_a");
    // The engine's 40-digit price, built from the rounds: the locked case's fraction to within one part in 10^30.
    expect(closeTo(seriesA.original_issue_price, "3900000", "1879091")).toBe(true);
    // Typing in the field, even back to the same digits, saves what was typed: delete the last digit, then put it back.
    const issue = within(series("Series A Preferred")).getByLabelText("Original issue price ($ a share)");
    type(issue, "2.07547");
    type(issue, "2.075472");
    click("Save");
    expect(JSON.parse(await saved(1)).cap_table.securities.find((s: { id: string }) => s.id === "series_a").original_issue_price).toBe("2.075472");
  });

  it("names the file after the cap table", () => {
    render(<App />);
    openTab("Cap table");
    type(screen.getByLabelText("Name of this cap table"), "Founders' table, v2");
    click("Save");
    expect(downloads[0]!.name).toBe("founders-table-v2.json");
  });
});

describe("the view: where you were looking", () => {
  it("reopens to the same exit value and holder", async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/You are/), { target: { value: "cobalt" } });
    const box = screen.getByRole("textbox", { name: "Exit value" });
    type(box, "62.4M");
    fireEvent.keyDown(box, { key: "Enter" });
    const before = headline();
    expect(before).toMatch(/^At \$62\.4M you get /);
    click("Save");
    const file = await saved(0);
    expect(JSON.parse(file).view).toEqual({ exit_value: "62400000", you: "cobalt" });

    // Move on: someone else, somewhere else. Then open the file.
    fireEvent.change(screen.getByLabelText(/You are/), { target: { value: "ana" } });
    type(box, "20M");
    fireEvent.keyDown(box, { key: "Enter" });
    await openFile("millrace.json", file);
    expect(await screen.findByText("Opened millrace.json.")).toBeTruthy();
    expect((screen.getByLabelText(/You are/) as HTMLSelectElement).value).toBe("cobalt");
    expect(headline()).toBe(before);
  });

  it("is optional: a file without one opens halfway up its range, on the largest common holder", async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/You are/), { target: { value: "cobalt" } });
    click("Save");
    const { view: _view, ...withoutView } = JSON.parse(await saved(0));
    await openFile("no-view.json", JSON.stringify(withoutView));
    expect(await screen.findByText("Opened no-view.json.")).toBeTruthy();
    expect((screen.getByLabelText(/You are/) as HTMLSelectElement).value).toBe("ana");
    expect(headline()).toMatch(/^At \$150M you get /);
  });

  it("isn't an unsaved change: moving the exit value or choosing who you are doesn't ask before leaving", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/You are/), { target: { value: "cobalt" } });
    const box = screen.getByRole("textbox", { name: "Exit value" });
    type(box, "62.4M");
    fireEvent.keyDown(box, { key: "Enter" });
    expect(screen.queryByText("Not saved")).toBeNull();
    expect(leavingAsks()).toBe(false);
  });
});

describe("what isn't saved, and what can't be opened", () => {
  it("won't save a cap table with a problem, and says why", () => {
    render(<App />);
    openTab("Cap table");
    editDirectly();
    type(within(series("Series A Preferred")).getByLabelText("Cap (× the issue price, preference included)"), "1");
    click("Save");
    expect(downloads).toEqual([]);
    expect(screen.getAllByRole("alert").map((a) => a.textContent)).toContain(
      "Not saved: the cap table has a problem to fix first. The cap (1x) is below the preference (1.25x); a cap counts the preference, so it can't be lower",
    );
  });

  it("refuses a file it can't read, and keeps the cap table that's open", async () => {
    render(<App />);
    await openFile("notes.json", "{ not json");
    expect((await screen.findByText(/^Couldn't open notes\.json\./)).textContent).toBe("Couldn't open notes.json. It isn't a spillpoint file: it isn't valid JSON.");
    expect(headline()).toBe("At $100M you get $9.75M");
  });
});

describe("unsaved changes", () => {
  it("are marked, and leaving the page asks first until they're saved", () => {
    render(<App />);
    expect(leavingAsks()).toBe(false);
    openTab("Cap table");
    type(screen.getByLabelText("Name of this cap table"), "Millrace, cap cut");
    expect(screen.getByText("Not saved")).toBeTruthy();
    expect(leavingAsks()).toBe(true);
    click("Save");
    expect(screen.queryByText("Not saved")).toBeNull();
    expect(leavingAsks()).toBe(false);
  });

  it("are asked about before opening a file over them", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const picker = vi.spyOn(HTMLInputElement.prototype, "click");
    render(<App />);
    click("Open");
    expect(confirm).not.toHaveBeenCalled();
    expect(picker).toHaveBeenCalledTimes(1);
    openTab("Cap table");
    type(screen.getByLabelText("Name of this cap table"), "Changed");
    click("Open");
    expect(confirm).toHaveBeenCalledWith("Open a file? Your unsaved changes to this cap table will be lost.");
    expect(picker).toHaveBeenCalledTimes(1);
  });

  it("are no longer unsaved once saved, so starting over doesn't ask", () => {
    const confirm = vi.spyOn(window, "confirm");
    render(<App />);
    openTab("Cap table");
    type(screen.getByLabelText("Name of this cap table"), "Changed");
    click("Save");
    fireEvent.change(screen.getByLabelText(/Start from/), { target: { value: "edge-04-participating-capped" } });
    expect(confirm).not.toHaveBeenCalled();
    expect(headline()).toBe("At $40M you get $23.3M");
  });
});
