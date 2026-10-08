// The cap table editor, clicked through as a founder would, in a simulated
// browser: building a case from scratch, editing an example, the engine's
// messages next to the fields they name, and not losing edits by accident.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { D } from "spillpoint";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App.tsx";
import { dollars } from "../src/format.ts";
import { analysed } from "./analysis.ts";

const headline = () => screen.getByRole("heading", { level: 1 }).textContent;
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
const openTab = (name: "Payouts" | "Cap table") => fireEvent.click(screen.getByRole("tab", { name }));
const card = (heading: string) => screen.getByRole("heading", { name: heading }).closest("section")!;
const status = () => document.querySelector(".editor__status")!.textContent;
const series = (name: string) => screen.getByRole("group", { name });
const startFrom = (value: string) => fireEvent.change(screen.getByLabelText(/Start from/), { target: { value } });
/** Millrace's cap table is built from its rounds, so editing it means dropping them first; the page asks, and the test says yes. */
const editDirectly = () => fireEvent.click(screen.getByRole("button", { name: "Edit the cap table directly" }));
const yesToEditDirectly = () => vi.spyOn(window, "confirm").mockReturnValueOnce(true);

afterEach(() => vi.restoreAllMocks());

describe("building case 6b from scratch", () => {
  // The locked case's expected payouts, from the reference calculator.
  const expected = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../../cases/edge-06b-forced-class/expected.json"), "utf8")).exit;
  const names: Record<string, string> = { founder_a: "Founder A", founder_b: "Founder B", investor_x: "Investor X", investor_y: "Investor Y" };

  function build() {
    render(<App />);
    startFrom("scratch");
    openTab("Cap table");
    const holders = card("Holders");
    type(within(holders).getByRole("textbox", { name: "Holder name" }), "Founder A");
    for (const name of ["Founder B", "Investor X", "Investor Y"]) {
      fireEvent.click(within(holders).getByRole("button", { name: "Add a holder" }));
      type(within(holders).getAllByRole("textbox", { name: "Holder name" }).at(-1)!, name);
    }
    for (const [name, price] of [
      ["Seed-1 Preferred", "1"],
      ["Seed-2 Preferred", "3"],
    ] as const) {
      fireEvent.click(screen.getByRole("button", { name: "Add a preferred series" }));
      const added = series("New preferred series");
      type(within(added).getByLabelText("Original issue price ($ a share)"), price);
      type(within(added).getByLabelText("Name"), name);
    }
    for (const [cell, shares] of [
      ["Founder A, Common Stock", "6,000,000"],
      ["Founder B, Common Stock", "2,000,000"],
      ["Investor X, Seed-1 Preferred", "1,000,000"],
      ["Investor Y, Seed-2 Preferred", "1,000,000"],
    ] as const) {
      type(screen.getByRole("textbox", { name: cell }), shares);
    }
    // Each new series is paid first; the two are pari passu, so both go first.
    fireEvent.change(within(card("Who is paid first")).getByLabelText("Seed-1 Preferred"), { target: { value: "1" } });
    const group = card("Series that convert together");
    fireEvent.click(within(group).getByRole("checkbox", { name: "Seed-1 Preferred" }));
    fireEvent.click(within(group).getByRole("checkbox", { name: "Seed-2 Preferred" }));
    type(within(card("Exit values to explore")).getByRole("textbox", { name: "To" }), "40M");
  }

  it("takes every term the case needs, and the engine accepts it", () => {
    build();
    expect(within(card("Who is paid first")).getByText("Paid first, side by side: Seed-1 Preferred and Seed-2 Preferred.")).toBeTruthy();
    // The group's vote, by default: more than 50% of its as-converted shares (C4).
    expect((screen.getByLabelText("Vote rule") as HTMLSelectElement).value).toBe("more_than");
    expect((screen.getByLabelText("Vote threshold (percent)") as HTMLInputElement).value).toBe("50");
    // At $40M the group has converted: Founder A has 6 of 10 million shares.
    expect(status()).toBe("At $40M, Founder A gets $24M. Every change updates the payouts.");
  });

  it("pays every holder what the case expects, at every listed exit value", () => {
    build();
    openTab("Payouts");
    const box = screen.getByRole("textbox", { name: "Exit value" });
    for (const p of expected.payouts) {
      type(box, p.exit_value);
      fireEvent.keyDown(box, { key: "Enter" });
      const table = screen.getByRole("table");
      for (const [holder, amount] of Object.entries(p.equilibria[0].holder_totals as Record<string, string>)) {
        const row = within(table).getByText(names[holder]!).closest("tr")!;
        expect([p.exit_value, row.textContent]).toEqual([p.exit_value, expect.stringContaining(dollars(new D(amount)))]);
      }
    }
  });

  it("finds the case's breakpoints, with the jump at $30M where the group converts", async () => {
    build();
    openTab("Payouts");
    const list = await analysed();
    const items = within(list).getAllByRole("listitem");
    expect(items.map((i) => i.querySelector(".breakpoints__value")!.textContent!.split(" ")[0])).toEqual(
      expected.breakpoints.map((b: { exact: string }) => dollars(new D(b.exact))),
    );
    const jump = items[1]!;
    expect(within(jump).getByText("Payouts jump")).toBeTruthy();
    // Below $30M the group keeps its preferences and common shares $26M: Founder A has 6 of 8 million common.
    // Above it everyone is common: 6 of 10 million shares of $30M.
    expect(jump.querySelector(".breakpoints__yours")!.textContent).toBe("For you: your payout drops $1,500,000 here, from $19,500,000 to $18,000,000.");
  });
});

describe("editing an example", () => {
  it("changes the answer: case 4 with Seed's cap cut from 3x to 2x", () => {
    render(<App />);
    startFrom("edge-04-participating-capped");
    expect(headline()).toBe("At $40M you get $23.3M");
    openTab("Cap table");
    type(within(series("Seed Preferred")).getByLabelText("Cap (× the issue price, preference included)"), "2");
    // Capped at $6M, Seed converts instead: 2 of 10 million shares of $40M is $8M. Founder A has 6 of the 10 million.
    expect(status()).toBe("At $40M, Founder A gets $24M. Every change updates the payouts.");
    openTab("Payouts");
    expect(headline()).toBe("At $40M you get $24M");
    expect(screen.getByText(/Simple example: one series, capped participation, with your changes/)).toBeTruthy();
  });

  it("shows how the payments are ordered, and keeps participating preferred out of a conversion group", () => {
    render(<App />);
    openTab("Cap table");
    expect(
      within(card("Who is paid first")).getByText(
        "Paid first: Series B Preferred. Then: Series A Preferred. Then, side by side: Seed Preferred and Seed Preferred (from SAFEs).",
      ),
    ).toBeTruthy();
    const seriesB = within(card("Series that convert together")).getByRole("checkbox", { name: /Series B Preferred/ }) as HTMLInputElement;
    expect(seriesB.disabled).toBe(true);
  });

  it("keeps the exit value inside a narrower range", () => {
    render(<App />);
    openTab("Cap table");
    type(within(card("Exit values to explore")).getByRole("textbox", { name: "To" }), "50M");
    openTab("Payouts");
    expect(headline()).toMatch(/^At \$50M you get /);
  });
});

describe("prices", () => {
  it("show as decimals, with no fractions on screen until you type one", () => {
    yesToEditDirectly();
    render(<App />);
    openTab("Cap table");
    editDirectly();
    const seriesA = series("Series A Preferred");
    const issue = within(seriesA).getByLabelText("Original issue price ($ a share)") as HTMLInputElement;
    expect(issue.value).toBe("2.075472");
    expect((within(seriesA).getByLabelText("Conversion price ($ a share)") as HTMLInputElement).value).toBe("1.824752");
    expect(within(seriesA).queryByText(/About \$/)).toBeNull();
    // The exact prices are still the ones used: the answer hasn't moved.
    expect(status()).toBe("At $100M, Ana Ortiz gets $9.75M. Every change updates the payouts.");
    type(issue, "39/19");
    expect(within(seriesA).getByText("About $2.05263 a share")).toBeTruthy();
  });
});

describe("when the engine says no", () => {
  it("puts its message next to the field, and keeps the payouts from before the change", () => {
    yesToEditDirectly();
    render(<App />);
    openTab("Cap table");
    editDirectly();
    const cap = within(series("Series A Preferred")).getByLabelText("Cap (× the issue price, preference included)");
    type(cap, "1");
    // The engine's words, without the assumption code (E7) it gives developers.
    const message = "The cap (1x) is below the preference (1.25x); a cap counts the preference, so it can't be lower";
    expect(cap.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(cap.getAttribute("aria-describedby")!)!.textContent).toBe(message);
    expect(status()).toBe(`The payouts can't update until this is fixed: ${message} Go to the field`);

    openTab("Payouts");
    expect(screen.getByText(/Your last change to the cap table has a problem, so these payouts are from before it\./)).toBeTruthy();
    expect(headline()).toBe("At $100M you get $9.75M");
    fireEvent.click(screen.getByRole("button", { name: "Fix it" }));
    expect(screen.getByRole("tab", { name: "Cap table" }).getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(cap);

    type(cap, "2.75");
    expect(status()).toBe("At $100M, Ana Ortiz gets $9.75M. Every change updates the payouts.");
  });

  it("names the cell when a share count is wrong", () => {
    yesToEditDirectly();
    render(<App />);
    openTab("Cap table");
    editDirectly();
    const cell = screen.getByRole("textbox", { name: "Ana Ortiz, Common Stock" });
    type(cell, "5,500,000.5");
    expect(cell.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Ana Ortiz, Common Stock: Share counts must be whole and not negative")).toBeTruthy();
  });

  it("refuses a price that isn't a number, in the engine's words", () => {
    yesToEditDirectly();
    render(<App />);
    openTab("Cap table");
    editDirectly();
    const price = within(series("Seed Preferred")).getByLabelText("Original issue price ($ a share)");
    type(price, "about a dollar");
    expect(document.getElementById(price.getAttribute("aria-describedby")!.split(" ").at(-1)!)!.textContent).toBe(
      '"about a dollar" is not an exact number (an integer, a decimal, or "a/b")',
    );
  });
});

describe("not losing edits by accident", () => {
  it("asks before removing a holder with shares, and removes the shares with them", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(true).mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<App />);
    openTab("Cap table");
    editDirectly();
    const remove = within(card("Holders")).getByRole("button", { name: "Remove Ana Ortiz" });
    fireEvent.click(remove);
    expect(confirm).toHaveBeenLastCalledWith("Remove Ana Ortiz? Its 5,500,000 shares go too.");
    expect(within(card("Holders")).getAllByRole("textbox", { name: "Holder name" })).toHaveLength(9);
    fireEvent.click(remove);
    expect(within(card("Holders")).getAllByRole("textbox", { name: "Holder name" })).toHaveLength(8);
    openTab("Payouts");
    expect(within(screen.getByRole("table")).queryByText("Ana Ortiz")).toBeNull();
    // "You" moves to whoever now holds the most common stock.
    expect((screen.getByLabelText(/You are/) as HTMLSelectElement).value).toBe("dev");
  });

  it("asks before starting over when there are changes, and not when there aren't", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(true).mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<App />);
    startFrom("edge-04-participating-capped");
    expect(confirm).not.toHaveBeenCalled();
    startFrom("millrace");
    openTab("Cap table");
    editDirectly();
    type(within(card("Holders")).getAllByRole("textbox", { name: "Holder name" })[0]!, "Ana O.");
    startFrom("edge-04-participating-capped");
    expect(confirm).toHaveBeenCalledWith("Start over? Your unsaved changes to this cap table will be lost.");
    expect((screen.getByLabelText(/Start from/) as HTMLSelectElement).value).toBe("millrace");
    expect(screen.getByText(/Millrace Robotics, with your changes/)).toBeTruthy();
    startFrom("edge-04-participating-capped");
    expect(screen.getByText("Simple example: one series, capped participation")).toBeTruthy();
  });

  it("starts from a blank cap table: one founder with all the common stock", () => {
    render(<App />);
    startFrom("scratch");
    expect(within(screen.getByLabelText(/Start from/)).getByRole("option", { selected: true }).textContent).toBe("A blank cap table");
    expect(screen.getByText("Your own cap table, started blank")).toBeTruthy();
    expect(headline()).toBe("At $50M you get $50M");
  });
});

describe("SAFEs and notes still outstanding (M5k)", () => {
  /** Cases 12 and 13a's company, typed in from a blank cap table: two founders, an employee's options and a pool, and Investor X. */
  function company() {
    render(<App />);
    startFrom("scratch");
    openTab("Cap table");
    const holders = card("Holders");
    type(within(holders).getByRole("textbox", { name: "Holder name" }), "Founder A");
    for (const name of ["Founder B", "Employee C", "Investor X"]) {
      fireEvent.click(within(holders).getByRole("button", { name: "Add a holder" }));
      type(within(holders).getAllByRole("textbox", { name: "Holder name" }).at(-1)!, name);
    }
    fireEvent.click(screen.getByRole("button", { name: "Add an option class" }));
    type(screen.getByLabelText("Strike price ($ a share)"), "5");
    type(within(card("Classes of stock")).getAllByLabelText("Class name").at(-1)!, "Options ($5 strike)");
    type(screen.getByRole("textbox", { name: "Founder A, Common Stock" }), "6,000,000");
    type(screen.getByRole("textbox", { name: "Founder B, Common Stock" }), "3,000,000");
    type(screen.getByRole("textbox", { name: "Employee C, Options ($5 strike)" }), "500,000");
    type(screen.getByLabelText("Unissued option pool (shares)"), "1,000,000");
    type(screen.getByLabelText("To"), "40M");
  }

  /** Every holder's payout on the page, at each of the locked case's listed exit values, against its expected.json. */
  function paysAsExpected(name: string) {
    const expected = JSON.parse(readFileSync(resolve(import.meta.dirname, `../../../cases/${name}/expected.json`), "utf8")).exit;
    const names: Record<string, string> = { founder_a: "Founder A", founder_b: "Founder B", employee_c: "Employee C", investor_x: "Investor X" };
    openTab("Payouts");
    const box = screen.getByRole("textbox", { name: "Exit value" });
    const listed = expected.payouts.filter((p: { tags: string[] }) => p.tags.includes("listed"));
    expect(listed.length).toBeGreaterThan(5);
    for (const p of listed) {
      type(box, p.exit_value);
      fireEvent.keyDown(box, { key: "Enter" });
      const table = screen.getByRole("table");
      for (const [holder, amount] of Object.entries(p.equilibria[0].holder_totals as Record<string, string>)) {
        const row = within(table).getByText(names[holder]!).closest("tr")!;
        expect([p.exit_value, row.textContent]).toEqual([p.exit_value, expect.stringContaining(dollars(new D(amount)))]);
      }
    }
  }

  it("takes case 12's SAFE, typed in, and pays what the case expects", () => {
    company();
    const outstanding = card("SAFEs and notes still outstanding");
    fireEvent.click(within(outstanding).getByRole("button", { name: "Add a SAFE" }));
    const safe = within(outstanding).getByRole("group", { name: "SAFE 1: Founder A" });
    fireEvent.change(within(safe).getByLabelText("Holder"), { target: { value: (within(safe).getByRole("option", { name: "Investor X" }) as HTMLOptionElement).value } });
    expect(within(outstanding).getByRole("group", { name: "SAFE 1: Investor X" })).toBe(safe);
    // Blank amounts are the engine's to ask for, next to the field.
    expect(status()).toBe("The payouts can't update until this is fixed: Fill this in: it can't be blank. Go to the field");
    type(within(safe).getByLabelText("Amount ($)"), "1M");
    expect((within(safe).getByLabelText("Cap") as HTMLSelectElement).value).toBe("post");
    type(within(safe).getByLabelText("Valuation cap ($)"), "10M");
    expect(status()).toMatch(/Every change updates the payouts\.$/);
    // No sale date: a SAFE accrues nothing, so none is asked for.
    expect(screen.queryByLabelText("Date of the sale")).toBeNull();
    paysAsExpected("edge-12-unconverted-safe");
    // A SAFE holds no shares, so it has none of the company; the class view names it as the reasons do.
    fireEvent.click(screen.getByRole("button", { name: "By class" }));
    const row = within(screen.getByRole("table")).getByRole("rowheader", { name: /^Investor X's SAFE/ }).closest("tr")!;
    expect(row.textContent).toContain("no shares until it converts");
    expect(screen.getByText(/SAFEs still outstanding hold no shares until they convert, so it leaves them out\./)).toBeTruthy();
  });

  it("takes case 13a's note, typed in, asks for the sale's date, and pays what the case expects", () => {
    company();
    const outstanding = card("SAFEs and notes still outstanding");
    fireEvent.click(within(outstanding).getByRole("button", { name: "Add a convertible note" }));
    const note = within(outstanding).getByRole("group", { name: "Note 1: Founder A" });
    fireEvent.change(within(note).getByLabelText("Holder"), { target: { value: (within(note).getByRole("option", { name: "Investor X" }) as HTMLOptionElement).value } });
    type(within(note).getByLabelText("Principal ($)"), "1,000,000");
    type(within(note).getByLabelText("Simple interest (% a year)"), "6");
    type(within(note).getByLabelText("Issued"), "2022-01-01");
    type(within(note).getByLabelText("Pre-money valuation cap ($)"), "8M");
    expect((within(note).getByLabelText("The cap divides by") as HTMLSelectElement).value).toBe("with_pool");
    type(within(note).getByLabelText("Repaid at a sale (× principal and interest)"), "2");
    // Interest runs to the sale, so the page asks for its date, next to the field.
    const date = screen.getByLabelText("Date of the sale");
    expect(status()).toBe("The payouts can't update until this is fixed: Fill this in: a convertible note accrues interest up to the date of the sale. Go to the field");
    fireEvent.click(screen.getByRole("button", { name: "Go to the field" }));
    expect(document.activeElement).toBe(date);
    type(date, "2021-12-31");
    expect(within(date.closest(".field")!).getByText(/^2021-12-31 is before note.* was issued, 2022-01-01$/)).toBeTruthy();
    type(date, "2024-01-01");
    expect(status()).toMatch(/Every change updates the payouts\.$/);
    paysAsExpected("edge-13a-note-with-pool");
  });

  it("asks before removing a holder with a SAFE, and removes the SAFE with them", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    company();
    const outstanding = card("SAFEs and notes still outstanding");
    fireEvent.click(within(outstanding).getByRole("button", { name: "Add a SAFE" }));
    const safe = within(outstanding).getByRole("group", { name: "SAFE 1: Founder A" });
    fireEvent.change(within(safe).getByLabelText("Holder"), { target: { value: (within(safe).getByRole("option", { name: "Investor X" }) as HTMLOptionElement).value } });
    const remove = within(card("Holders")).getByRole("button", { name: "Remove Investor X" });
    fireEvent.click(remove);
    expect(confirm).toHaveBeenCalledWith("Remove Investor X? Its SAFE goes too.");
    expect(within(outstanding).queryAllByRole("group")).toHaveLength(1);
    fireEvent.click(remove);
    expect(within(outstanding).queryAllByRole("group")).toHaveLength(0);
  });
});

describe("the tabs", () => {
  it("switch with the arrow keys", () => {
    render(<App />);
    const payouts = screen.getByRole("tab", { name: "Payouts" });
    fireEvent.keyDown(payouts, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Cap table" }).getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Cap table" }));
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("go back with the left arrow, and to the first and last with Home and End", () => {
    render(<App />);
    const tab = (name: string) => screen.getByRole("tab", { name });
    const selected = () => screen.getAllByRole("tab").find((t) => t.getAttribute("aria-selected") === "true")!.textContent;
    fireEvent.keyDown(tab("Payouts"), { key: "End" });
    expect(selected()).toBe("Rounds");
    fireEvent.keyDown(tab("Rounds"), { key: "ArrowLeft" });
    expect(selected()).toBe("Cap table");
    fireEvent.keyDown(tab("Cap table"), { key: "ArrowLeft" });
    expect(selected()).toBe("Payouts");
    fireEvent.keyDown(tab("Payouts"), { key: "ArrowLeft" });
    expect(selected()).toBe("Rounds");
    fireEvent.keyDown(tab("Rounds"), { key: "Home" });
    expect(selected()).toBe("Payouts");
    expect(document.activeElement).toBe(tab("Payouts"));
  });
});
