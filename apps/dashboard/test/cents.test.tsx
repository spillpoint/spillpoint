// Payouts to the cent: every payout in the who-gets-what table and its total, half-up as the engine's toCents and the
// locked cases round, with a quiet line when the rounded payouts don't add up to the exit value; and the exit value's
// box to the cent once it has cents.

import { fireEvent, render, screen, within } from "@testing-library/react";
import { D, prepare, readInputs, solve, toCents } from "spillpoint";
import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { App } from "../src/App.tsx";
import { dollarsAndCents } from "../src/format.ts";

const box = () => screen.getByRole("textbox", { name: "Exit value" }) as HTMLInputElement;
const goTo = (amount: string) => {
  fireEvent.change(box(), { target: { value: amount } });
  fireEvent.keyDown(box(), { key: "Enter" });
};
const note = () => [...document.querySelectorAll(".footnote")].map((p) => p.textContent).find((t) => t?.startsWith("Each payout is rounded")) ?? null;

/** Millrace's payouts by holder at an exit value, to the cent, as the engine's toCents gives them. */
function millraceCents(x: string): string[] {
  const exit = readInputs(JSON.parse(readFileSync(resolve(import.meta.dirname, "../../../cases/millrace/inputs.json"), "utf8")));
  return [...solve(prepare(exit.capTable, exit.exitDate), new D(x)).answers[0]!.payout.holderTotals.values()].map(toCents);
}

describe("the who-gets-what table, to the cent", () => {
  it("shows each payout and the total to the cent, as the engine's toCents rounds them", () => {
    render(<App />);
    goTo("62400000");
    const table = screen.getByRole("table");
    const shown = within(table)
      .getAllByRole("row")
      .slice(1, -1)
      .map((r) => r.querySelectorAll("td")[0]!.textContent);
    for (const cents of millraceCents("62400000")) expect(shown).toContain(dollarsAndCents(new D(cents)));
    expect(within(table).getByText("Total").closest("tr")!.querySelectorAll("td")[0]!.textContent).toBe("$62,400,000.00");
  });

  it("says so, quietly, when the rounded payouts don't add up to the exit value", () => {
    render(<App />);
    // Some exit value where they don't: the payouts' cents, added up, against the exit value.
    const off = ["62400001", "62400002", "62400003", "62400004", "62400005", "62400006", "62400007"].find(
      (x) => !millraceCents(x).reduce((t, c) => t.plus(c), new D(0)).eq(x),
    )!;
    const sum = millraceCents(off).reduce((t, c) => t.plus(c), new D(0));
    goTo(off);
    const cents = sum.minus(off).abs().times(100).toNumber();
    expect(note()).toBe(`Each payout is rounded to the cent, so together they come to ${dollarsAndCents(sum)}, ${cents === 1 ? "1 cent" : `${cents} cents`} from the total.`);
  });

  it("says nothing when they do", () => {
    render(<App />);
    const even = ["62400000", "62400010", "62400020", "62400030"].find((x) => millraceCents(x).reduce((t, c) => t.plus(c), new D(0)).eq(x))!;
    goTo(even);
    expect(note()).toBeNull();
  });
});

describe("the exit value's box", () => {
  it("keeps cents once an amount with cents is typed, and whole dollars otherwise", () => {
    render(<App />);
    goTo("62,400,000.55");
    expect(box().value).toBe("$62,400,000.55");
    goTo("62.4M");
    expect(box().value).toBe("$62,400,000");
  });
});
