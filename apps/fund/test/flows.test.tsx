// The Cash flows tab (plan step 5, f01j): the form writes every case's cash flows exactly; a fund typed in from blank
// gives its case's numbers; a refusal shows in the cell its path names, a cash flow's own in its row, while the payouts
// stay on the last fund the engine accepted; and the problems come one at a time in the engine's order (FA2), on
// either tab.

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { D, findBreakpoints, readFund } from "spillpoint-fund";
import type { Fund } from "spillpoint-fund";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/App.tsx";
import { flowsFrom, flowsInput, sortByDate } from "../src/flows.ts";

const casesDir = resolve(import.meta.dirname, "../../../packages/fund/cases");
const caseFile = (dir: string, file: string) => JSON.parse(readFileSync(resolve(casesDir, dir, file), "utf8"));
const RUN_CASES = readdirSync(casesDir).filter((d) => d.startsWith("fund-") && !d.endsWith("refused"));

afterEach(() => vi.restoreAllMocks());

/** Everything the engine read but the terms, with every amount as its exact string. */
const flowsOf = (fund: Fund) =>
  JSON.parse(JSON.stringify({ asOf: fund.asOf, d: fund.distributionDate, final: fund.final, nav: fund.nav, flows: fund.cashFlows }, (_, v) => (v instanceof D ? v.toString() : v)));

describe("the form writes the cash flows exactly", () => {
  it.each(RUN_CASES)("%s: as the case has them, with the same breakpoints", (dir) => {
    const input = caseFile(dir, "inputs.json").fund;
    const fund = readFund(input);
    const again = readFund({ ...flowsInput(flowsFrom(fund)), terms: input.terms });
    expect(flowsOf(again)).toEqual(flowsOf(fund));
    expect(findBreakpoints(again).map((b) => b.x.toString())).toEqual(findBreakpoints(fund).map((b) => b.x.toString()));
  });

  it("keeps every place of an amount, so a sub-cent call and NAV are the file's, not rounded to the cent", () => {
    const input = caseFile("fund-08-carry-steps", "inputs.json").fund;
    const exact = { ...input, nav: "40000000.001", cash_flows: input.cash_flows.map((f: { amount: string }, i: number) => (i === 0 ? { ...f, amount: "8000000.005" } : f)) };
    const form = flowsFrom(readFund(exact));
    expect([form.rows[0]!.amount, form.nav]).toEqual(["$8,000,000.005", "$40,000,000.001"]);
    const written = flowsInput(form) as { nav: string; cash_flows: { amount: string }[] };
    expect([written.cash_flows[0]!.amount, written.nav]).toEqual(["8000000.005", "40000000.001"]);
    expect(flowsOf(readFund({ ...written, terms: input.terms }))).toEqual(flowsOf(readFund(exact)));
  });

  it("sorts by date and keeps the order shown within a date, since same-day distributions run in that order (F4)", () => {
    const row = (id: number, date: string, amount: string) => ({ id, date, type: "distribution" as const, kind: "investment" as const, amount });
    const form = { asOf: "", distributionDate: "", final: false, nav: "", rows: [row(1, "2025-01-01", "1"), row(2, "", "2"), row(3, "2024-01-01", "3"), row(4, "2025-01-01", "4")] };
    expect(sortByDate(form).rows.map((r) => r.id)).toEqual([3, 1, 4, 2]);
  });
});

/** The page, on an example or the blank fund. */
function open(id?: string) {
  render(<App />);
  if (id) fireEvent.change(screen.getByLabelText("Start from"), { target: { value: id } });
}
const tab = (name: string) => fireEvent.click(screen.getByRole("tab", { name }));
const set = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const problemAt = (label: string | RegExp) => {
  const field = screen.getByLabelText(label);
  expect(field.getAttribute("aria-invalid")).toBe("true");
  return document.getElementById(field.getAttribute("aria-describedby")!)!.textContent;
};
const breakpointXs = () =>
  within(screen.getByRole("region", { name: "Breakpoints" }))
    .getAllByRole("button")
    .map((b) => b.querySelector(".breakpoints__value")!.firstChild!.textContent!.trim());
/** The split's totals at X: this distribution's LPs and GP, then the fund to date's. */
const totals = () => within(screen.getByRole("rowheader", { name: "Total" }).closest("tr")!).getAllByRole("cell").map((c) => c.textContent);
const money = (s: string) => {
  const [whole, part] = s.split(".") as [string, string];
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${part}`;
};
/** A row filled in: its date, type, kind for a call, and amount. */
function fillRow(n: number, date: string, type: "call" | "distribution", kind: string | null, amount: string) {
  set(`Row ${n}'s date`, date);
  set(`Row ${n}'s type`, type);
  if (kind) set(`Row ${n}'s kind`, kind);
  set(`Row ${n}'s amount`, amount);
}

describe("a fund typed in from blank", () => {
  it("starts with no payouts, and says what it needs first", () => {
    open("blank");
    expect((screen.getByLabelText("Start from") as HTMLSelectElement).value).toBe("blank");
    expect(screen.getByRole("status").textContent).toBe("No payouts yet. Choose the fund's as-of date. Fix it");
    fireEvent.click(screen.getByRole("button", { name: "Fix it" }));
    expect(document.activeElement).toBe(screen.getByLabelText("As of"));
  });

  it("gives case 6's three breakpoints, $10,000,000, $14,004,383.56 and $15,005,479.45, and its split at each point", () => {
    open("blank");
    tab("Cash flows");
    set("As of", "2025-01-01");
    fillRow(1, "2020-01-01", "call", "investment", "10000000");
    tab("Terms");
    fireEvent.click(screen.getByRole("checkbox", { name: "A preferred return" }));
    fireEvent.click(screen.getByRole("radio", { name: "Full" }));
    tab("Payouts");
    expect(breakpointXs()).toEqual(["$10,000,000.00", "$14,004,383.56", "$15,005,479.45"]);
    // The blank fund stays the blank fund as it's filled in.
    expect((screen.getByLabelText("Start from") as HTMLSelectElement).value).toBe("blank");
    // Typed in, and not saved yet: the line says so.
    expect(document.querySelector(".example-label")!.textContent).toBe("This fund: $10M paid in over 1 call and nothing distributed before X. X isn't its last distribution.Not saved");
    for (const p of caseFile("fund-06-full-catch-up", "expected.json").points) {
      set(/^Distribution on/, p.x);
      expect(totals(), p.x).toEqual([money(p.distribution.lps.total), money(p.distribution.gp.total), money(p.to_date.lps.total), money(p.to_date.gp.total)]);
    }
  });

  it("gives case 8's numbers without its third step from example A, typed in by hand", () => {
    open("blank");
    tab("Cash flows");
    set("As of", "2026-09-30");
    fillRow(1, "2021-01-15", "call", "investment", "$8,000,000");
    for (const [date, type, kind, amount] of [
      ["2021-01-15", "call", "fee", "495,000"],
      ["2022-01-15", "call", "fee", "$495,000.00"],
      ["2022-06-01", "call", "investment", "2M"],
      ["2024-05-01", "distribution", null, "4000000"],
    ] as const) {
      fireEvent.click(screen.getByRole("button", { name: "Add a cash flow" }));
      fillRow(screen.getAllByLabelText(/^Row \d+'s date$/).length, date, type, kind, amount);
    }
    tab("Terms");
    fireEvent.click(screen.getByRole("radio", { name: "In steps" }));
    fireEvent.click(screen.getByRole("button", { name: "Add a step" }));
    set("Step 2's carry rate", "25");
    set("Step 2 starts from an LP multiple of", "3");
    fireEvent.click(screen.getByRole("checkbox", { name: "A GP commitment" }));
    tab("Payouts");
    expect(breakpointXs()).toEqual(["$7,000,000.00", "$34,500,000.00"]);
    // Below 5.0x, where case 8's third step starts, every point is case 8's.
    const below = caseFile("fund-08-carry-steps", "expected.json").points.filter((p: { x: string }) => new D(p.x).lt("63833333.33"));
    expect(below.map((p: { x: string }) => p.x)).toEqual(["7000000.00", "20000000.00", "34500000.00", "40000000.00", "50000000.00"]);
    for (const p of below) {
      set(/^Distribution on/, p.x);
      expect(totals(), p.x).toEqual([money(p.distribution.lps.total), money(p.distribution.gp.total), money(p.to_date.lps.total), money(p.to_date.gp.total)]);
    }
  });
});

describe("a refusal, in the cell its path names", () => {
  it("refuses a distribution dated before the first call in its row, and the payouts keep the last good fund", () => {
    open("fund-08-carry-steps");
    tab("Cash flows");
    set("Row 5's date", "2020-06-01");
    expect(problemAt("Row 5's date")).toBe("This distribution is before the fund's first call.");
    // In its own row, under the cash flow.
    const row = screen.getByLabelText("Row 5's date").closest("tr")!;
    expect(row.nextElementSibling!.textContent).toBe("This distribution is before the fund's first call.");
    tab("Payouts");
    expect(screen.getByRole("status").textContent).toBe(
      "Your last change to the cash flows has a problem, so these payouts are from the fund before it. This distribution is before the fund's first call. Fix it",
    );
    expect(breakpointXs()).toEqual(["$7,000,000.00", "$34,500,000.00", "$63,833,333.33"]);
    fireEvent.click(screen.getByRole("button", { name: "Fix it" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Row 5's date"));
  });

  it("asks for an amount when one is blank, isn't more than zero, or has a comma out of place", () => {
    open("fund-08-carry-steps");
    tab("Cash flows");
    set("Row 2's amount", "");
    expect(problemAt("Row 2's amount")).toBe("Write an amount in dollars, more than zero: 250000 or 250000.50.");
    set("Row 2's amount", "0");
    expect(problemAt("Row 2's amount")).toBe("Write an amount in dollars, more than zero: 250000 or 250000.50.");
    for (const bad of ["lots", "1,5M", "495.000,00"]) {
      set("Row 2's amount", bad);
      expect(problemAt("Row 2's amount"), bad).toBe("Write an amount in dollars, more than zero: 250000 or 250000.50.");
    }
    set("Row 2's amount", "$495,000.00");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("refuses a cash flow after D in its row, and a NAV it can't read in its field", () => {
    open("fund-08-carry-steps");
    tab("Cash flows");
    set("Distribution date (D)", "2024-01-01");
    expect(problemAt("Row 5's date")).toBe("This cash flow is after the distribution date, 1 Jan 2024.");
    set("Distribution date (D)", "2026-12-31");
    set("NAV on D", "forty million");
    expect(problemAt("NAV on D")).toBe("Write NAV in dollars, 0 or more: 40000000 or $40M; or leave it empty.");
    set("NAV on D", "");
    tab("Payouts");
    // D moved and NAV gone: this distribution, on the new D, with no NAV button.
    expect(screen.getByRole("region", { name: "The answer" }).querySelector(".headline__answer")!.textContent).toBe(
      "At a $40M distribution on 31 Dec 2026, the GP's carry is $6.81M.",
    );
    expect(screen.queryByRole("button", { name: "Set X to NAV" })).toBeNull();
  });

  it("says a fund needs a call under the table, where its path names, and Show me goes to Add a cash flow", () => {
    open("fund-12-spv");
    tab("Cash flows");
    fireEvent.click(screen.getByRole("button", { name: "Remove row 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove row 1" }));
    const panel = screen.getByRole("tabpanel", { name: "Cash flows" });
    expect(within(panel).getByRole("alert").textContent).toBe("A fund needs at least one call. Add one with “Add a cash flow”.");
    fireEvent.click(within(panel).getByRole("button", { name: "Show me" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Add a cash flow" }));
  });

  it("shows the engine's first problem, whichever tab it's on (FA2): the as-of date before the terms", () => {
    open("blank");
    tab("Terms");
    set("Carry rate", "twenty");
    const panel = screen.getByRole("tabpanel", { name: "Terms" });
    expect(within(panel).getByRole("status").textContent).toBe("The fund can't run as it is. Choose the fund's as-of date. Show me");
    fireEvent.click(within(panel).getByRole("button", { name: "Show me" }));
    expect(screen.getByRole("tab", { name: "Cash flows" }).getAttribute("aria-selected")).toBe("true");
    set("As of", "2025-01-01");
    tab("Terms");
    expect(problemAt("Carry rate")).toBe("Write the carry rate as a percent, 0 or more: 20 or 27.5.");
  });
});

describe("the rows and the facts about D", () => {
  it("adds a row with its date focused, sorts by date, and removes a row", () => {
    open("fund-08-carry-steps");
    tab("Cash flows");
    fireEvent.click(screen.getByRole("button", { name: "Add a cash flow" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Row 6's date"));
    // The row above is a distribution, so the new one is too (f01j review, answer 2).
    expect((screen.getByLabelText("Row 6's type") as HTMLSelectElement).value).toBe("distribution");
    fillRow(6, "2021-06-01", "call", "fee", "100000");
    fireEvent.click(screen.getByRole("button", { name: "Add a cash flow" }));
    expect([(screen.getByLabelText("Row 7's type") as HTMLSelectElement).value, (screen.getByLabelText("Row 7's kind") as HTMLSelectElement).value]).toEqual(["call", "fee"]);
    expect([(screen.getByLabelText("Row 7's date") as HTMLInputElement).value, (screen.getByLabelText("Row 7's amount") as HTMLInputElement).value]).toEqual(["", ""]);
    fireEvent.click(screen.getByRole("button", { name: "Remove row 7" }));
    fireEvent.click(screen.getByRole("button", { name: "Sort by date" }));
    expect([1, 2, 3, 4, 5, 6].map((n) => (screen.getByLabelText(`Row ${n}'s date`) as HTMLInputElement).value)).toEqual([
      "2021-01-15",
      "2021-01-15",
      "2021-06-01",
      "2022-01-15",
      "2022-06-01",
      "2024-05-01",
    ]);
    expect(document.querySelector(".example-label")!.textContent).toMatch(/^This fund, with your changes: \$11.1M paid in over 5 calls/);
    fireEvent.click(screen.getByRole("button", { name: "Remove row 3" }));
    expect(document.querySelector(".example-label")!.textContent).toMatch(/^This fund, with your changes: \$11M paid in over 4 calls/);
    // Under the table: the order same-day distributions run in.
    expect(screen.getByText(/^On one date, calls run before distributions/).textContent).toContain("distributions run in the order shown here");
  });

  it("makes X the last distribution when the box is ticked, as case 12 is", () => {
    open("fund-08-carry-steps");
    tab("Cash flows");
    fireEvent.click(screen.getByRole("checkbox", { name: "This is the fund's last distribution" }));
    expect(document.querySelector(".example-label")!.textContent).toMatch(/X is its last distribution\.Not saved$/);
    tab("Payouts");
    expect(screen.getByRole("region", { name: "The answer" }).querySelector(".headline__answer")!.textContent).toBe(
      "If $40M on 30 Sep 2026 is the last distribution, the GP ends with $6.81M of carry.",
    );
    expect(screen.getByRole("region", { name: "The clawback" })).toBeDefined();
  });

  it("asks before another fund replaces a blank one with changes", () => {
    open("blank");
    tab("Cash flows");
    set("As of", "2025-01-01");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.change(screen.getByLabelText("Start from"), { target: { value: "fund-03-gp-commitment" } });
    expect(confirm).toHaveBeenCalledWith("Start over? Your unsaved changes to this fund will be lost.");
    expect((screen.getByLabelText("As of") as HTMLInputElement).value).toBe("2025-01-01");
  });
});
