// The split on a phone (f01m2): under 480 pixels it's two tables, one above the other, "This distribution" then "The
// fund to date", each tier's name on its own line above its two amounts, so nothing scrolls sideways. Where nothing is
// laid out, as here, the window's width is the media query's answer, set by the test.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App.tsx";

const casesDir = resolve(import.meta.dirname, "../../../packages/fund/cases");
const caseFile = (dir: string, file: string) => JSON.parse(readFileSync(resolve(casesDir, dir, file), "utf8"));

/** A window of a phone's width, or not; "change" listeners hear when it turns. */
function windowWidth(narrow: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: narrow,
    media: "(max-width: 479px)",
    addEventListener: (_: string, f: () => void) => listeners.add(f),
    removeEventListener: (_: string, f: () => void) => listeners.delete(f),
  };
  vi.stubGlobal("matchMedia", (media: string) => ({ ...query, media, get matches() { return query.matches; } }));
  return {
    turn(to: boolean) {
      query.matches = to;
      act(() => listeners.forEach((f) => f()));
    },
  };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** A phone table's rows: each tier's name, then its two amounts. */
const halves = () =>
  [...document.querySelectorAll<HTMLTableElement>("table.split--narrow")].map((table) => ({
    caption: table.caption!.textContent,
    columns: [...table.querySelectorAll("thead tr:last-child th")].map((th) => th.textContent),
    rows: [...table.querySelectorAll("tbody, tfoot")].map((g) => [g.querySelector("th")!.textContent, ...[...g.querySelectorAll("td")].map((td) => td.textContent)]),
  }));

const money = (s: string) => {
  const [whole, part] = s.split(".") as [string, string];
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${part}`;
};

describe("the split by its card's width (f01n)", () => {
  it("is two tables wherever the one table wouldn't fit its card, at any window width, and one where it would", () => {
    // A 500-pixel card, and a table that needs 700; the card's observer is the test's to fire.
    let room = 500;
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => room);
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.tagName === "TABLE" ? Math.max(room, 700) : room;
    });
    const watchers: (() => void)[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(f: (entries: { contentRect: { width: number } }[]) => void) {
          // Every observer on the page hears the new width: the split's card, and the charts'.
          watchers.push(() => f([{ contentRect: { width: room } }]));
        }
        observe() {}
        disconnect() {}
      },
    );
    render(<App />);
    fireEvent.change(screen.getByLabelText("Start from"), { target: { value: "fund-08-carry-steps" } });
    expect(halves().map((h) => h.caption)).toEqual(["This distribution", "The fund to date"]);
    // The card grows past what the table needs: one table, and nothing measured out of sight.
    room = 800;
    act(() => watchers.forEach((w) => w()));
    expect(halves()).toEqual([]);
    expect(document.querySelector(".split__measure")).toBeNull();
    room = 650;
    act(() => watchers.forEach((w) => w()));
    expect(halves()).toHaveLength(2);
  });
});

describe("the split on a phone", () => {
  it("is two tables for case 8 at $40,000,000, one above the other, with the case's amounts", () => {
    windowWidth(true);
    render(<App />);
    fireEvent.change(screen.getByLabelText("Start from"), { target: { value: "fund-08-carry-steps" } });
    const p = caseFile("fund-08-carry-steps", "expected.json").points.find((q: { x: string }) => q.x === "40000000.00");
    const tiers = ["Capital", "Carry at 20% (up to 3.0x)", "Carry at 25% (3.0x to 5.0x)", "Carry at 30% (above 5.0x)", "Total"];
    const [now, toDate] = halves();
    expect([now!.caption, toDate!.caption]).toEqual(["This distribution", "The fund to date"]);
    expect(now!.columns).toEqual(["LPs", "GP"]);
    expect(now!.rows.map((r) => r[0])).toEqual(tiers);
    // The GP's carry at 20% now, and the GP's total to date: the two Jordan reads at 320 pixels.
    expect(now!.rows[1]).toEqual(["Carry at 20% (up to 3.0x)", "$21,780,000.00", money(p.distribution.gp.carry[0].amount)]);
    expect(toDate!.rows[4]).toEqual(["Total", money(p.to_date.lps.total), money(p.to_date.gp.total)]);
    expect([now!.rows[1]![2], toDate!.rows[4]![2]]).toEqual(["$5,445,000.00", "$6,806,250.00"]);
    expect(now!.rows[0]).toEqual(["Capital", money(p.distribution.lps.capital), "—"]);
    expect(toDate!.rows[0]).toEqual(["Capital", money(p.to_date.lps.capital), "—"]);
    // The one table is there only to be measured: out of sight, and hidden from assistive technology.
    const measured = [...document.querySelectorAll("table.split:not(.split--narrow):not(.flows)")];
    expect(measured).toHaveLength(1);
    expect(measured[0]!.closest("[aria-hidden=true]")).not.toBeNull();
    expect(screen.getAllByRole("table").filter((table) => !table.classList.contains("flows"))).toHaveLength(2);
  });

  it("shows a pref's and a catch-up's rows too, and turns back into one table as the window widens", () => {
    const window = windowWidth(true);
    render(<App />);
    fireEvent.click(screen.getByRole("tab", { name: "Terms" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "A preferred return" }));
    fireEvent.click(screen.getByRole("radio", { name: "Full" }));
    fireEvent.click(screen.getByRole("tab", { name: "Payouts" }));
    expect(halves()[0]!.rows.map((r) => r[0])).toEqual(["Capital", "Pref", "Catch-up", "Carry at 20%", "Total"]);
    window.turn(false);
    expect(halves()).toEqual([]);
    expect(screen.getByRole("table")).toBeDefined();
    expect(document.querySelector(".split__measure")).toBeNull();
    window.turn(true);
    expect(halves()).toHaveLength(2);
  });
});
