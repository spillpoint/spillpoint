// The Terms tab (plan step 4, f01i): the form writes every case's terms exactly, rates typed as percents and written
// without rounding; each change runs the engine again; a refusal shows in plain words under the field its path names,
// while the payouts stay on the last fund the engine accepted and say so.

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { D, findBreakpoints, readFund } from "spillpoint-fund";
import type { Fund } from "spillpoint-fund";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App.tsx";
import { formFrom, multipleFrom, percentOf, rateFrom, termsInput } from "../src/terms.ts";

const casesDir = resolve(import.meta.dirname, "../../../packages/fund/cases");
const caseFile = (dir: string, file: string) => JSON.parse(readFileSync(resolve(casesDir, dir, file), "utf8"));
const RUN_CASES = readdirSync(casesDir).filter((d) => d.startsWith("fund-") && !d.endsWith("refused"));

afterEach(() => vi.restoreAllMocks());

/** A fund's terms with every amount as its exact string, to compare two readings. */
const termsOf = (fund: Fund) => JSON.parse(JSON.stringify(fund.terms, (_, v) => (v instanceof D ? v.toString() : v)));

describe("rates as percents, exactly", () => {
  it("writes a typed percent as the exact rate, moving the point, with nothing rounded", () => {
    const typed = ["20", "7.25%", " 12.5 % ", "100", "0", ".5", "0.0001", "1.2345678901234567890123456789012345678901234567"];
    expect(typed.map(rateFrom)).toEqual(["0.2", "0.0725", "0.125", "1", "0", "0.005", "0.000001", "0.012345678901234567890123456789012345678901234567"]);
    for (const t of ["", "abc", "-5", "5%%", "1e2", "20 percent"]) expect(rateFrom(t), t).toBeNull();
  });

  it("shows a rate as a percent with every place, and reads a multiple with or without its x", () => {
    expect(["0.20", "0.0725", "1", "0.005"].map((r) => percentOf(new D(r)))).toEqual(["20", "7.25", "100", "0.5"]);
    expect(["3", "2.5x", "3.0", " 4 X "].map(multipleFrom)).toEqual(["3", "2.5", "3", "4"]);
    expect(multipleFrom("x")).toBeNull();
  });

  it.each(RUN_CASES)("%s: the form writes the case's terms back exactly, with the same breakpoints", (dir) => {
    const input = caseFile(dir, "inputs.json").fund;
    const fund = readFund(input);
    const again = readFund({ ...input, terms: termsInput(formFrom(fund.terms)) });
    expect(termsOf(again)).toEqual(termsOf(fund));
    expect(findBreakpoints(again).map((b) => b.x.toString())).toEqual(findBreakpoints(fund).map((b) => b.x.toString()));
  });
});

/** The page on an example, on the Terms tab. */
function terms(id?: string) {
  render(<App />);
  if (id) fireEvent.change(screen.getByLabelText("Start from"), { target: { value: id } });
  fireEvent.click(screen.getByRole("tab", { name: "Terms" }));
}
const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const tab = (name: string) => fireEvent.click(screen.getByRole("tab", { name }));
const headline = () => [...screen.getByRole("region", { name: "The answer" }).querySelectorAll("p")].map((p) => p.textContent);
/** The problem under a field: its words, read through the field's own description. */
const problemUnder = (label: string | RegExp) => {
  const field = screen.getByLabelText(label);
  expect(field.getAttribute("aria-invalid")).toBe("true");
  return document.getElementById(field.getAttribute("aria-describedby")!)!.textContent;
};
const breakpointXs = () =>
  within(screen.getByRole("region", { name: "Breakpoints" }))
    .getAllByRole("button")
    .map((b) => b.querySelector(".breakpoints__value")!.firstChild!.textContent!.trim());

describe("the carry", () => {
  it("refuses a carry of 100% under the carry rate, and keeps the payouts on the last good fund, saying so", () => {
    terms();
    type("Carry rate", "100");
    expect(problemUnder("Carry rate")).toBe("A carry rate must be below 100%.");
    tab("Payouts");
    expect(screen.getByRole("status").textContent).toBe(
      "Your last change to the terms has a problem, so these payouts are from the fund before it. A carry rate must be below 100%. Fix it",
    );
    expect(headline()).toEqual([
      "Carry 20%; no pref; GP commitment 2%, fee-free.",
      "At a $20M distribution on 1 Apr 2026, the GP's carry is $1.83M.",
      "The LPs get $17.8M and the GP commitment $400K.",
    ]);
    // "Fix it" goes to the field.
    fireEvent.click(screen.getByRole("button", { name: "Fix it" }));
    expect(screen.getByRole("tab", { name: "Terms" }).getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(screen.getByLabelText("Carry rate"));
    // 25% runs: 25% of the $9,151,000 above capital, of the 98% that runs the tiers.
    type("Carry rate", "25");
    expect(screen.queryByRole("status")).toBeNull();
    tab("Payouts");
    expect(headline()[1]).toBe("At a $20M distribution on 1 Apr 2026, the GP's carry is $2.29M.");
  });

  it("says what it can't read, under its field, in the engine's order", () => {
    terms();
    type("Carry rate", "twenty");
    expect(problemUnder("Carry rate")).toBe("Write the carry rate as a percent, 0 or more: 20 or 27.5.");
    tab("Payouts");
    expect(headline()[0]).toBe("Carry 20%; no pref; GP commitment 2%, fee-free.");
  });

  it("runs case 8 at a flat 20%: one breakpoint, $7,000,000, and $6,534,000.00 of carry at $40,000,000", () => {
    terms("fund-08-carry-steps");
    fireEvent.click(screen.getByRole("radio", { name: "Flat" }));
    expect((screen.getByLabelText("Carry rate") as HTMLInputElement).value).toBe("20");
    tab("Payouts");
    expect(breakpointXs()).toEqual(["$7,000,000.00"]);
    const carry = within(screen.getByRole("rowheader", { name: "Carry at 20%" }).closest("tr")!).getAllByRole("cell");
    expect(carry[1]!.textContent).toBe("$6,534,000.00");
    expect(headline()[1]).toBe("If the fund were liquidated at NAV, $40M on 30 Sep 2026, the GP would end with $6.53M of carry.");
    // The fund isn't case 8 any more: the list says so, and the line under it.
    expect((screen.getByLabelText("Start from") as HTMLSelectElement).selectedOptions[0]!.textContent).toBe("An example, with your changes");
    expect(document.querySelector(".example-label")!.textContent).toMatch(/^This fund, with your changes: \$11M paid in over 4 calls/);
    // Back to steps: case 8's three come back.
    tab("Terms");
    fireEvent.click(screen.getByRole("radio", { name: "In steps" }));
    tab("Payouts");
    expect(breakpointXs()).toEqual(["$7,000,000.00", "$34,500,000.00", "$63,833,333.33"]);
  });

  it("adds a step, words each problem with it under its row, and removes it", () => {
    terms("fund-08-carry-steps");
    fireEvent.click(screen.getByRole("button", { name: "Add a step" }));
    expect(problemUnder("Step 4's carry rate")).toBe("Write the carry rate as a percent, 0 or more: 20 or 27.5.");
    type("Step 4's carry rate", "35");
    expect(problemUnder("Step 4 starts from an LP multiple of")).toBe("Write the LP multiple this step starts from: 3 or 2.5.");
    // F9: each step from a higher multiple, at a higher rate. The engine names the step; the page says which rule.
    type("Step 4 starts from an LP multiple of", "4");
    expect(problemUnder("Step 4's carry rate")).toBe("This step must start from an LP multiple above 5.0x, where the step before it starts.");
    type("Step 4 starts from an LP multiple of", "7x");
    type("Step 4's carry rate", "25");
    expect(problemUnder("Step 4's carry rate")).toBe("This step's rate must be above 30%, the rate of the step before it.");
    type("Step 4's carry rate", "35");
    tab("Payouts");
    expect(breakpointXs()).toHaveLength(4);
    expect(within(screen.getByRole("region", { name: "Breakpoints" })).getByText("LPs reach 7.0x: carry is 35% from here.")).toBeDefined();
    tab("Terms");
    fireEvent.click(screen.getByRole("button", { name: "Remove step 4" }));
    tab("Payouts");
    expect(breakpointXs()).toEqual(["$7,000,000.00", "$34,500,000.00", "$63,833,333.33"]);
  });
});

describe("a term turned on", () => {
  it("starts at its usual value, focused and selected, so it's typed straight over", () => {
    terms();
    const selected = (label: string) => {
      const field = screen.getByLabelText(label) as HTMLInputElement;
      return [document.activeElement === field, field.value.slice(field.selectionStart!, field.selectionEnd!)];
    };
    fireEvent.click(screen.getByRole("checkbox", { name: "A preferred return" }));
    expect(selected("Rate a year, simple")).toEqual([true, "8"]);
    fireEvent.click(screen.getByRole("radio", { name: "Partial" }));
    expect(selected("The GP's share")).toEqual([true, "50"]);
    fireEvent.click(screen.getByRole("checkbox", { name: "A GP commitment" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "A GP commitment" }));
    expect(selected("Its share of the fund")).toEqual([true, "2"]);
  });
});

describe("the pref and the catch-up", () => {
  it("brings in the catch-up with a pref, at none, and takes it away without one", () => {
    terms();
    expect(screen.queryByRole("group", { name: "Catch-up" })).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "A preferred return" }));
    expect((screen.getByLabelText("Rate a year, simple") as HTMLInputElement).value).toBe("8");
    const catchUp = screen.getByRole("group", { name: "Catch-up" });
    expect(within(catchUp).getByRole("radio", { name: "None (a hard hurdle)" })).toHaveProperty("checked", true);
    tab("Payouts");
    expect(headline()[0]).toBe("Carry 20%; pref 8%, no catch-up; GP commitment 2%, fee-free.");
    tab("Terms");
    fireEvent.click(within(screen.getByRole("group", { name: "Catch-up" })).getByRole("radio", { name: "Full" }));
    tab("Payouts");
    expect(headline()[0]).toBe("Carry 20%; pref 8%, full catch-up; GP commitment 2%, fee-free.");
    tab("Terms");
    fireEvent.click(screen.getByRole("checkbox", { name: "A preferred return" }));
    expect(screen.queryByRole("group", { name: "Catch-up" })).toBeNull();
    tab("Payouts");
    expect(headline()[0]).toBe("Carry 20%; no pref; GP commitment 2%, fee-free.");
  });

  it("refuses a partial catch-up of 20% beside its share: it must be above the carry rate", () => {
    terms();
    fireEvent.click(screen.getByRole("checkbox", { name: "A preferred return" }));
    fireEvent.click(screen.getByRole("radio", { name: "Partial" }));
    expect((screen.getByLabelText("The GP's share") as HTMLInputElement).value).toBe("50");
    type("The GP's share", "20");
    expect(problemUnder("The GP's share")).toBe("The GP's share of the catch-up must be above the carry rate, 20%, or the catch-up never ends.");
    type("The GP's share", "80");
    tab("Payouts");
    expect(headline()[0]).toBe("Carry 20%; pref 8%, 80% catch-up; GP commitment 2%, fee-free.");
  });

  it("refuses a pref of 0% and a share it can't read, in the page's words", () => {
    terms();
    fireEvent.click(screen.getByRole("checkbox", { name: "A preferred return" }));
    type("Rate a year, simple", "0");
    expect(problemUnder("Rate a year, simple")).toBe("Write the pref as a percent a year, above 0: 8 or 7.5.");
    type("Rate a year, simple", "7.25%");
    fireEvent.click(screen.getByRole("radio", { name: "Partial" }));
    type("The GP's share", "half");
    expect(problemUnder("The GP's share")).toBe("Write the GP's share of the catch-up as a percent, up to 100: 50 or 80.");
  });
});

describe("the GP commitment", () => {
  it("with both flags turned, is case 4: its breakpoint, $10,651,020.41, and its carry at $20,000,000", () => {
    terms();
    fireEvent.click(screen.getByRole("checkbox", { name: "Pays its share of fees" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Pays its share of expenses" }));
    tab("Payouts");
    expect(headline()[0]).toBe("Carry 20%; no pref; GP commitment 2%, paying its share of fees, not paying its share of expenses.");
    const expected = caseFile("fund-04-gp-commitment-pays-fees", "expected.json");
    expect(breakpointXs()).toEqual(["$10,651,020.41"]);
    expect(expected.breakpoints.map((b: { x: string }) => b.x)).toEqual(["10651020.41"]);
    const total = within(screen.getByRole("rowheader", { name: "Total" }).closest("tr")!).getAllByRole("cell");
    expect(total[1]!.textContent).toBe("$1,832,400.00");
    expect(expected.points.find((p: { x: string }) => p.x === "20000000.00").distribution.gp.total).toBe("1832400.00");
  });

  it("writes a share exactly as typed, and refuses one of 100%", () => {
    terms();
    type("Its share of the fund", "7.25");
    tab("Payouts");
    expect(headline()[0]).toBe("Carry 20%; no pref; GP commitment 7.25%, fee-free.");
    tab("Terms");
    type("Its share of the fund", "100");
    expect(problemUnder("Its share of the fund")).toBe("The GP commitment's share must be below 100%.");
    fireEvent.click(screen.getByRole("checkbox", { name: "A GP commitment" }));
    tab("Payouts");
    expect(headline()[0]).toBe("Carry 20%; no pref; no GP commitment.");
  });
});

describe("starting over", () => {
  it("asks before an example replaces your changes, and keeps them if you say no", () => {
    terms();
    type("Carry rate", "25");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.change(screen.getByLabelText("Start from"), { target: { value: "fund-12-spv" } });
    expect(confirm).toHaveBeenCalledWith("Start over? Your changes to this fund will be lost.");
    expect((screen.getByLabelText("Carry rate") as HTMLInputElement).value).toBe("25");
    confirm.mockReturnValue(true);
    fireEvent.change(screen.getByLabelText("Start from"), { target: { value: "fund-12-spv" } });
    expect((screen.getByLabelText("Start from") as HTMLSelectElement).value).toBe("fund-12-spv");
    expect((screen.getByLabelText("Carry rate") as HTMLInputElement).value).toBe("20");
    expect(document.querySelector(".example-label")!.textContent).toMatch(/^This fund: /);
  });
});
