// The payoff curves, the breakpoint list and the slider's marks, as you'd
// click through them on Millrace, in a simulated browser.

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "../src/App.tsx";

const headline = () => screen.getByRole("heading", { level: 1 }).textContent;
const exitBox = () => screen.getByRole("textbox", { name: "Exit value" }) as HTMLInputElement;
const curves = async () => (await screen.findByRole("heading", { name: "Payoff curves" })).closest("section")!;
const breakpointList = async () => (await screen.findByRole("heading", { name: "Breakpoints" })).closest("section")!;

describe("the payoff curves", () => {
  it("draws every holder, with your curve labelled at its end and every value listed", async () => {
    render(<App />);
    const card = await curves();
    expect(within(card).getByRole("img", { name: "Payoff curves by holder, showing the whole range." })).toBeTruthy();
    expect(card.querySelector(".chart__end-label")!.textContent).toBe("Ana Ortiz (you)");
    const legend = within(card).getByRole("list", { name: "Values at $100M" });
    const rows = within(legend).getAllByRole("button");
    expect(rows).toHaveLength(9);
    // Largest first: Cobalt holds Series B, paid its 2x preference and then some.
    expect(rows[0]!.textContent).toBe("Cobalt Family Office LLC$36,383,770");
    expect(within(legend).getByRole("button", { name: /Ana Ortiz \(you\)/ }).textContent).toContain("$9,750,990");
  });

  it("numbers all ten breakpoints along the top", async () => {
    render(<App />);
    const card = await curves();
    const numbers = [...card.querySelectorAll(".recharts-reference-line text")].map((t) => t.textContent);
    expect(numbers).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "$100M"]);
  });

  it("switches to curves by class, with the classes you hold in blue", async () => {
    render(<App />);
    const card = await curves();
    fireEvent.click(within(card).getByRole("button", { name: "By class" }));
    expect(within(card).getByText(/The classes you hold are blue\./)).toBeTruthy();
    expect(card.querySelector(".chart__end-label")!.textContent).toBe("Common Stock");
    expect(within(card).getAllByRole("listitem")).toHaveLength(8);
  });

  it("lifts a curve while you point at its name, and keeps it lifted when you choose it", async () => {
    render(<App />);
    const card = await curves();
    const labels = () => [...card.querySelectorAll(".chart__end-label")].map((l) => l.textContent);
    const cobalt = within(card).getByRole("button", { name: /Cobalt Family Office LLC/ });
    fireEvent.focus(cobalt);
    expect(labels()).toEqual(["Cobalt Family Office LLC", "Ana Ortiz (you)"]);
    fireEvent.blur(cobalt);
    expect(labels()).toEqual(["Ana Ortiz (you)"]);
    fireEvent.click(cobalt);
    fireEvent.blur(cobalt);
    expect(cobalt.getAttribute("aria-pressed")).toBe("true");
    expect(labels()).toEqual(["Cobalt Family Office LLC", "Ana Ortiz (you)"]);
  });

  it("zooms to a typed range, and back to the whole range", async () => {
    render(<App />);
    const card = await curves();
    const from = within(card).getByRole("textbox", { name: /Show from/ });
    const to = within(card).getByRole("textbox", { name: /^to/ });
    fireEvent.change(from, { target: { value: "30M" } });
    fireEvent.keyDown(from, { key: "Enter" });
    fireEvent.change(to, { target: { value: "70M" } });
    fireEvent.keyDown(to, { key: "Enter" });
    expect(within(card).getByRole("img", { name: "Payoff curves by holder, showing $30M to $70M." })).toBeTruthy();
    // Breakpoints 2 to 8 lie between $30M and $70M; the exit value, $100M, is off to the right.
    const numbers = [...card.querySelectorAll(".recharts-reference-line text")].map((t) => t.textContent);
    expect(numbers).toEqual(["2", "3", "4", "5", "6", "7", "8"]);
    fireEvent.click(within(card).getByRole("button", { name: "Show the whole range" }));
    expect(within(card).getByRole("img", { name: "Payoff curves by holder, showing the whole range." })).toBeTruthy();
  });

  it("refuses a range that runs backwards, and says why", async () => {
    render(<App />);
    const card = await curves();
    const from = within(card).getByRole("textbox", { name: /Show from/ });
    fireEvent.change(from, { target: { value: "400M" } });
    fireEvent.keyDown(from, { key: "Enter" });
    expect(within(card).getByText("Type two amounts between $0 and $300M, the first below the second.")).toBeTruthy();
    expect(within(card).getByRole("img", { name: "Payoff curves by holder, showing the whole range." })).toBeTruthy();
  });
});

describe("the breakpoint list", () => {
  it("lists all ten with their reasons, and marks the eight that change Ana's payout", async () => {
    render(<App />);
    const list = await breakpointList();
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(10);
    expect(items[0]!.textContent).toContain("$20,000,000");
    expect(items[0]!.textContent).toContain("Series B Preferred's preference is paid in full here");
    // Ana holds only common: nothing reaches her until Seed's preference is paid at breakpoint 3.
    const yours = items.map((item) => within(item).queryByText("Changes your payout") !== null);
    expect(yours).toEqual([false, false, true, true, true, true, true, true, true, true]);
  });

  it("follows the holder you choose", async () => {
    render(<App />);
    const list = await breakpointList();
    fireEvent.change(screen.getByLabelText(/You are/), { target: { value: "cobalt" } });
    const items = within(list).getAllByRole("listitem");
    // Cobalt holds Series B: paid first up to its preference at $20M, then it waits until it shares as common.
    expect(within(items[0]!).queryByText("Changes your payout")).not.toBeNull();
    expect(within(items[1]!).queryByText("Changes your payout")).toBeNull();
  });

  it("moves the exit value to a breakpoint you choose", async () => {
    render(<App />);
    const list = await breakpointList();
    fireEvent.click(within(list).getByRole("button", { name: /\$136,069,894/ }));
    expect(exitBox().value).toBe("$136,069,894");
    expect(headline()).toMatch(/^At \$136M you get /);
    expect(within(within(list).getAllByRole("listitem")[8]!).getByText("The exit value is here")).toBeTruthy();
  });
});

describe("the slider's marks", () => {
  it("says what a mark is", async () => {
    render(<App />);
    expect(await screen.findByText(/^Each mark is a breakpoint: an exit value where someone's payout bends or jumps\./)).toBeTruthy();
  });

  it("has a mark for each breakpoint, named by its number and exit value", async () => {
    render(<App />);
    await breakpointList();
    const marks = screen.getAllByRole("button", { name: /^Breakpoint \d+, at / });
    expect(marks).toHaveLength(10);
    expect(marks[2]!.getAttribute("aria-label")).toBe("Breakpoint 3, at $39,424,995");
  });

  it("shows a mark's exit value and reason when you focus it or point at it", async () => {
    render(<App />);
    await breakpointList();
    const mark = screen.getByRole("button", { name: "Breakpoint 3, at $39,424,995" });
    fireEvent.focus(mark);
    const tip = screen.getByRole("tooltip");
    expect(tip.textContent).toContain("Breakpoint 3: $39,424,995");
    expect(tip.textContent).toContain("are paid in full here");
    expect(mark.getAttribute("aria-describedby")).toBe(tip.id);
    fireEvent.blur(mark);
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.mouseEnter(screen.getByRole("button", { name: /^Breakpoint 10, at / }));
    expect(screen.getByRole("tooltip").textContent).toContain("Series A Preferred converts to common here");
  });

  it("moves the exit value to a mark you choose", async () => {
    render(<App />);
    await breakpointList();
    fireEvent.click(screen.getByRole("button", { name: "Breakpoint 3, at $39,424,995" }));
    expect(exitBox().value).toBe("$39,424,995");
    // Exactly at breakpoint 3, Seed's preference has taken every dollar: common's share starts just above.
    expect(headline()).toBe("At $39.4M you get $0");
  });
});
