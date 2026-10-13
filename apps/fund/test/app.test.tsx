// The fund page's first step (f01f): the three examples, the X box and the split, each figure held to the locked case's
// expected.json, so the page's numbers can't drift from the engine's or the cases'.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import examples from "virtual:fund-examples";
import { describe, expect, it } from "vitest";

import { D, readFund, splitAt, toCents } from "spillpoint-fund";

import { App } from "../src/App.tsx";

const casesDir = resolve(import.meta.dirname, "../../../packages/fund/cases");
const caseFile = (dir: string, file: string) => JSON.parse(readFileSync(resolve(casesDir, dir, file), "utf8"));

interface Block {
  amount: string;
  gp_commitment?: string;
  lps: { capital: string; pref?: string; catch_up?: string; carry_tier: string; total: string };
  gp: { catch_up?: string; carry: { amount: string }[]; total: string };
}
interface Point {
  x: string;
  distribution: Block;
  to_date: Block;
}

/** "6930000.00" as the page writes it: "$6,930,000.00". */
const money = (s: string) => {
  const [whole, part] = s.split(".") as [string, string];
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${part}`;
};

/** A row of the split table, by its label: the four amounts, X's LPs and GP, then to date's. */
function row(label: string | RegExp): string[] {
  const header = within(screen.getByRole("table")).getByRole("rowheader", { name: label });
  return within(header.closest("tr")!)
    .getAllByRole("cell")
    .map((c) => c.textContent!);
}

/** The point of a case's expected.json at an X. */
function point(dir: string, x: string): Point {
  const p = (caseFile(dir, "expected.json").points as Point[]).find((q) => q.x === x);
  expect(p, `${dir} has a point at ${x}`).toBeDefined();
  return p!;
}

/** Every row of the split, held to the case's point: each tier, each step, the totals and the GP commitment's line. */
function expectSplit(dir: string, x: string) {
  const p = point(dir, x);
  const [now, all] = [p.distribution, p.to_date];
  const inputs = caseFile(dir, "inputs.json").fund;
  const NONE = "—";
  expect(row("Capital")).toEqual([money(now.lps.capital), NONE, money(all.lps.capital), NONE]);
  if (now.lps.pref) expect(row("Pref")).toEqual([money(now.lps.pref), NONE, money(all.lps.pref!), NONE]);
  else expect(within(screen.getByRole("table")).queryByRole("rowheader", { name: "Pref" })).toBeNull();
  if (now.gp.catch_up) expect(row("Catch-up")).toEqual([money(now.lps.catch_up!), money(now.gp.catch_up), money(all.lps.catch_up!), money(all.gp.catch_up!)]);
  // One row a carry step (f01f review, answer 2). The GP's carry at each step is the case's. The cases don't record the
  // LPs' share by step, so it's the engine's, and the steps' LP shares add up to the case's carry tier, to a cent each.
  const engine = splitAt(readFund(inputs), x.replace(/\.00$/, ""));
  const lpSum = [new D(0), new D(0)];
  now.gp.carry.forEach((s, i) => {
    const label = stepLabel(inputs.terms.carry, i);
    const lps = [engine.distribution.gp.carry[i]!.lps, engine.toDate.gp.carry[i]!.lps];
    expect(row(label), label).toEqual([money(toCents(lps[0]!)), money(s.amount), money(toCents(lps[1]!)), money(all.gp.carry[i]!.amount)]);
    lpSum[0] = lpSum[0]!.plus(toCents(lps[0]!));
    lpSum[1] = lpSum[1]!.plus(toCents(lps[1]!));
  });
  const tolerance = new D("0.005").times(now.gp.carry.length);
  expect(lpSum[0]!.minus(now.lps.carry_tier).abs().lte(tolerance)).toBe(true);
  expect(lpSum[1]!.minus(all.lps.carry_tier).abs().lte(tolerance)).toBe(true);
  expect(row("Total")).toEqual([money(now.lps.total), money(now.gp.total), money(all.lps.total), money(all.gp.total)]);
  if (now.gp_commitment) {
    expect(screen.getByText(/The GP commitment's line, outside the tiers/).textContent).toBe(
      `The GP commitment's line, outside the tiers: ${money(now.gp_commitment)} of this distribution, ${money(all.gp_commitment!)} to date.`,
    );
  }
}

/**
 * A step's row label, from the case's input: a band of the LPs' multiple (f01g, from Jordan's look at the page).
 * "Carry at 20% (up to 3.0x)", "Carry at 25% (3.0x to 5.0x)", "Carry at 30% (above 5.0x)"; flat, "Carry at 20%".
 */
function stepLabel(carry: string | { steps: { rate: string; from_lp_multiple?: string }[] }, i: number): string {
  const steps = typeof carry === "string" ? [{ rate: carry }] : carry.steps;
  const x = (m: string) => `${Number(m).toFixed(1)}x`;
  const [from, to] = [steps[i]!.from_lp_multiple, steps[i + 1]?.from_lp_multiple];
  const band = from && to ? ` (${x(from)} to ${x(to)})` : to ? ` (up to ${x(to)})` : from ? ` (above ${x(from)})` : "";
  return `Carry at ${new D(steps[i]!.rate).times(100).toString()}%${band}`;
}

/** The page, opened on case 8 from the list: the review note's checks use it. */
function openCase8() {
  render(<App />);
  fireEvent.change(screen.getByLabelText("Start from"), { target: { value: "fund-08-carry-steps" } });
}

/** The headline's lines: the terms, the answer, and the LPs' side when there is one. */
const headline = () => [...screen.getByRole("region", { name: "The answer" }).querySelectorAll("p")].map((p) => p.textContent);

/** A fact under the table, by its label. */
const fact = (label: string | RegExp) => screen.getByText(label, { selector: "dt" }).nextElementSibling!.textContent;

describe("the fund page", () => {
  it("offers four examples, read from the locked cases at build time, a flat 20% fund first", () => {
    expect(examples.map((e) => e.id)).toEqual(["fund-03-gp-commitment", "fund-08-carry-steps", "fund-13-clawback-steps", "fund-12-spv"]);
    for (const e of examples) expect(e.fund).toEqual(caseFile(e.id, "inputs.json").fund);
    render(<App />);
    const picker = screen.getByLabelText("Start from") as HTMLSelectElement;
    expect([...picker.options].map((o) => o.textContent)).toEqual([
      "A fund: 20% carry and a 2% GP commitment (fictional)",
      "A VC fund with premium carry: 20%, then 25% from 3x and 30% from 5x (fictional)",
      "A late call and a clawback (fictional)",
      "An SPV: one company, the exit as its last distribution (fictional)",
    ]);
    expect(picker.value).toBe("fund-03-gp-commitment");
  });

  it("opens on case 3 at $20,000,000, flat 20%, its carry one row", () => {
    render(<App />);
    expect((screen.getByLabelText(/^Distribution on 1 Apr 2026/) as HTMLInputElement).value).toBe("$20,000,000");
    expect(headline()).toEqual([
      "Carry 20%; no pref; GP commitment 2%, fee-free.",
      "At a $20M distribution on 1 Apr 2026, the GP's carry is $1.83M.",
      "The LPs get $17.8M and the GP commitment $400K.",
    ]);
    expectSplit("fund-03-gp-commitment", "20000000.00");
    expect(row("Carry at 20%")).toEqual(["$7,320,800.00", "$1,830,200.00", "$7,320,800.00", "$1,830,200.00"]);
  });

  it("opens case 8, picked from the list, at $40,000,000, with the answer first, in neutral words", () => {
    openCase8();
    expect((screen.getByLabelText(/^Distribution on 30 Sep 2026/) as HTMLInputElement).value).toBe("$40,000,000");
    expect(headline()).toEqual([
      "Carry 20%, 25% from 3.0x and 30% from 5.0x; no pref; GP commitment 1%, fee-free.",
      // At NAV, the fund's life, as if liquidated there (f01i review, answer 1).
      "If the fund were liquidated at NAV, $40M on 30 Sep 2026, the GP would end with $6.81M of carry.",
      "Of the $40M, the LPs get $32.8M and the GP commitment $400K.",
    ]);
    // Away from NAV, this distribution.
    fireEvent.change(screen.getByLabelText(/^Distribution on/), { target: { value: "34500000" } });
    expect(headline().slice(1)).toEqual(["At a $34.5M distribution on 30 Sep 2026, the GP's carry is $5.45M.", "The LPs get $28.7M and the GP commitment $345K."]);
  });

  it("splits case 8 at $40,000,000 as the case does, X alone and the fund to date, each step a band of the LPs' multiple", () => {
    openCase8();
    expect(screen.getByRole("heading", { name: "The split at $40,000,000" })).toBeDefined();
    expectSplit("fund-08-carry-steps", "40000000.00");
    // The figures the review note asks Jordan to check, written out.
    expect(row("Total")).toEqual(["$32,793,750.00", "$6,806,250.00", "$36,753,750.00", "$6,806,250.00"]);
    expect(row("Carry at 20% (up to 3.0x)")).toEqual(["$21,780,000.00", "$5,445,000.00", "$21,780,000.00", "$5,445,000.00"]);
    expect(row("Carry at 25% (3.0x to 5.0x)")).toEqual(["$4,083,750.00", "$1,361,250.00", "$4,083,750.00", "$1,361,250.00"]);
    expect(row("Carry at 30% (above 5.0x)")).toEqual(["$0.00", "$0.00", "$0.00", "$0.00"]);
  });

  it("gives the paid-in, the pref accrued and the LPs' net multiple under the split, from the engine", () => {
    openCase8();
    expect(fact("Distributed")).toBe("$40,000,000.00 now, $44,000,000.00 to date");
    expect(fact("The LPs' paid-in")).toBe("$10,890,000.00");
    expect(fact("The GP commitment's paid-in")).toBe("$100,000.00");
    // $36,753,750 to date on $10,890,000 paid in: 3.375, to two places rounded down (f01f review, answer 4).
    expect(fact("The LPs' net multiple to date")).toBe("3.37x");
    // Case 8 has no pref, so no pref accrued.
    expect(screen.queryByText(/The pref accrued/)).toBeNull();
  });

  it("says why amounts are to the cent and not as paid", () => {
    render(<App />);
    expect(screen.getByText(/^Amounts are to the cent/).textContent).toBe(
      `Amounts are to the cent. "The LPs" is every LP together, not one payment, so nothing here is rounded down as it would be paid; each row is rounded on its own and can differ from its total by a cent.`,
    );
  });

  it("splits at a typed X: $34.5M, case 8's 3.0x breakpoint", () => {
    openCase8();
    fireEvent.change(screen.getByLabelText(/^Distribution on/), { target: { value: "$34.5M" } });
    expect(screen.getByRole("heading", { name: "The split at $34,500,000" })).toBeDefined();
    expectSplit("fund-08-carry-steps", "34500000.00");
    expect(fact("The LPs' net multiple to date")).toBe("3.00x");
  });

  it("rounds the multiple down, so a fraction of a cent below the 5.0x step reads 4.99x, not a step the LPs haven't reached", () => {
    openCase8();
    fireEvent.change(screen.getByLabelText(/^Distribution on/), { target: { value: "63833333.33" } });
    expect(fact("The LPs' net multiple to date")).toBe("4.99x");
    expect(row("Carry at 30% (above 5.0x)")).toEqual(["$0.00", "$0.00", "$0.00", "$0.00"]);
  });

  it("says beside the box when the text isn't an amount, and keeps the last split that worked", () => {
    openCase8();
    const box = screen.getByLabelText(/^Distribution on/);
    fireEvent.change(box, { target: { value: "forty million" } });
    expect(screen.getByRole("alert").textContent).toBe(
      "Write an amount in dollars, 0 or more: 40000000, 40,000,000 or $40M. Showing $40,000,000, the last amount that worked.",
    );
    expect(box.getAttribute("aria-invalid")).toBe("true");
    expectSplit("fund-08-carry-steps", "40000000.00");
    fireEvent.change(box, { target: { value: "20,000,000" } });
    expect(screen.queryByRole("alert")).toBeNull();
    expectSplit("fund-08-carry-steps", "20000000.00");
  });

  it("opens case 13 at $0, where the clawback is the story, and case 12 at its NAV, $6,000,000, each as its case splits them", () => {
    render(<App />);
    const picker = screen.getByLabelText("Start from");
    fireEvent.change(picker, { target: { value: "fund-13-clawback-steps" } });
    const box = screen.getByLabelText(/^Distribution on 1 Jan 2025/) as HTMLInputElement;
    expect(box.value).toBe("$0");
    // A final fund's headline is the GP's carry over the fund's life (f01i): at $0, there's nothing of this distribution to give.
    expect(headline()).toEqual([
      "Carry 20% and 30% from 2.0x; no pref; no GP commitment.",
      "If nothing more is distributed after 1 Jan 2025, the GP ends with $2M of carry: it gives back $2.75M.",
    ]);
    expectSplit("fund-13-clawback-steps", "0.00");
    // The headline beside the carry, never without the clawback (f01h).
    fireEvent.change(box, { target: { value: "15000000" } });
    expect(headline().slice(1)).toEqual([
      "If $15M on 1 Jan 2025 is the last distribution, the GP ends with $5M of carry: it gets $1M now and gives back $750K.",
      "Of the $15M, the LPs get $14M.",
    ]);
    expectSplit("fund-13-clawback-steps", "15000000.00");
    expect(fact("The LPs' net multiple to date")).toBe("1.96x");

    fireEvent.change(picker, { target: { value: "fund-12-spv" } });
    expect(headline().slice(1)).toEqual(["If $6M on 1 May 2026 is the last distribution, the GP ends with $792K of carry.", "Of the $6M, the LPs get $5.21M."]);
    expectSplit("fund-12-spv", "6000000.00");
    expect(screen.queryByText(/GP commitment's paid-in/)).toBeNull();
  });

  it("puts the cards in the main page's order: the answer, X and its slider, the chart, the split, the clawback when there is one, the breakpoints", () => {
    render(<App />);
    const cards = () =>
      [...screen.getByRole("tabpanel", { name: "Payouts" }).querySelectorAll(":scope > section")].map((s) => s.getAttribute("aria-label") ?? s.querySelector("h2")!.textContent);
    expect(cards()).toEqual(["The answer", "The distribution", "Who gets what as X grows", "The split at $20,000,000", "Breakpoints"]);
    // The chart and the split are both about this distribution; the clawback, about the fund's life, comes after them (f01i).
    fireEvent.change(screen.getByLabelText("Start from"), { target: { value: "fund-13-clawback-steps" } });
    expect(cards()).toEqual(["The answer", "The distribution", "Who gets what as X grows", "The split at $0", "The clawback", "Breakpoints"]);
  });

  it("names spillpoint-fund's version and the commit in the footer", () => {
    render(<App />);
    expect(screen.getByRole("contentinfo").textContent).toMatch(/^spillpoint-fund 0\.0\.0 \([0-9a-f]{7}(, modified)?\)$/);
  });
});
